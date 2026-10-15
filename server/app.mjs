import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import staticFiles from '@fastify/static';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {ZodError,z} from 'zod';
import {authHooks,passwordHash,verifyPassword} from './auth.mjs';
import {stallSchema,enquirySchema,loginSchema,saveSchema,revisionSchema,validId,fail,csvCell,slotNames,templates,validatePassword} from './validation.mjs';

export function publicRecord(row, draft=false) {
 const data=draft?row.draft:row.published;
 return {...data,id:row.id,coverUrl:data.coverId?`/media/${data.coverId}.webp`:null,logoUrl:data.logoId?`/media/${data.logoId}.webp`:null};
}
const liveSQL="SELECT id,published FROM stalls WHERE published IS NOT NULL ORDER BY (published->>'sortOrder')::int,created_at";
async function audit(tx,req,action,id=null){await tx.query('INSERT INTO audit_log(admin_id,action,object_id) VALUES($1,$2,$3)',[req.admin.id,action,id]);}
async function checkedRow(tx,id,revision){const row=(await tx.query('SELECT * FROM stalls WHERE id=$1 FOR UPDATE',[validId(id)])).rows[0];if(!row)fail(404,'Stall not found');if(row.revision!==revision)fail(409,'This stall changed in another session. Reload it before saving.');return row;}
async function checkAssets(tx,data){for(const id of [data.coverId,data.logoId].filter(Boolean))if(!(await tx.query('SELECT id FROM assets WHERE id=$1',[id])).rows.length)fail(400,'An image is missing. Select another image.');}

export async function buildApp({db,config,logger=false}) {
 await fs.mkdir(config.uploads,{recursive:true});
 const app=Fastify({logger,bodyLimit:64*1024,trustProxy:config.trustProxy,requestTimeout:30000});
 await app.register(cookie);
 await app.register(rateLimit,{global:false});
 await app.register(multipart,{limits:{fileSize:8*1024*1024,files:1,fields:0,parts:1}});
 const auth=authHooks(db,config);
 app.addHook('onRequest',async(req,reply)=>{
  reply.header('X-Content-Type-Options','nosniff').header('Referrer-Policy','strict-origin-when-cross-origin').header('X-Frame-Options','SAMEORIGIN')
   .header('Permissions-Policy','camera=(), microphone=(), geolocation=()')
   .header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");
  if(config.secure)reply.header('Strict-Transport-Security','max-age=31536000');
  if(req.url.startsWith('/api/')||req.url.startsWith('/admin'))reply.header('Cache-Control','no-store');
 });
 app.setErrorHandler((err,req,reply)=>{
  if(err instanceof ZodError)return reply.code(400).send({error:'Please check the highlighted fields.',fields:err.issues.map(i=>({field:i.path.join('.'),message:i.message}))});
  if(err.code==='23505')return reply.code(409).send({error:'That venue position is already published. Unpublish the other stall or choose a free position.'});
  if(err.code==='FST_REQ_FILE_TOO_LARGE'||err.code==='FST_ERR_CTP_BODY_TOO_LARGE')return reply.code(413).send({error:'The upload is too large (maximum 8 MB).'});
  const status=err.statusCode>=400&&err.statusCode<500?err.statusCode:500;
  if(status===500)req.log.error({err:{name:err.name,code:err.code}},'Request failed');
  reply.code(status).send({error:status===500?'Something went wrong. Please try again.':err.message});
 });
 app.get('/health/live',async()=>({status:'ok'}));
 app.get('/health/ready',async(req,reply)=>{try{await db.query('SELECT name FROM schema_migrations LIMIT 1');return {status:'ready'};}catch{return reply.code(503).send({status:'unavailable'});}});
 app.get('/api/venue',async()=>({stalls:(await db.query(liveSQL)).rows.map(r=>publicRecord(r))}));
 app.post('/api/auth/login',{preHandler:auth.origin,config:{rateLimit:{max:15,timeWindow:'15 minutes'}}},async(req,reply)=>{const p=loginSchema.parse(req.body);return auth.login(req,reply,p.email.toLowerCase(),p.password);});
 app.get('/api/admin/session',{preHandler:auth.requireAdmin},async req=>({email:req.admin.email,csrf:req.admin.csrf,slots:slotNames,templates}));
 app.post('/api/auth/logout',{preHandler:auth.mutation},async(req,reply)=>{await db.query('DELETE FROM sessions WHERE token_hash=$1',[req.admin.token_hash]);reply.clearCookie(auth.cookieName,{...auth.options,maxAge:undefined});return {ok:true};});
 app.post('/api/admin/password',{preHandler:auth.mutation,config:{rateLimit:{max:5,timeWindow:'15 minutes'}}},async(req,reply)=>{
  const p=z.object({current:z.string().max(256),next:z.string().min(14).max(256)}).strict().parse(req.body);
  const user=(await db.query('SELECT password_hash FROM admins WHERE id=$1',[req.admin.id])).rows[0];
  if(!await verifyPassword(p.current,user.password_hash))fail(400,'Current password is incorrect');
  const digest=await passwordHash(validatePassword(p.next));
  await db.transaction(async tx=>{await tx.query('UPDATE admins SET password_hash=$1 WHERE id=$2',[digest,req.admin.id]);await tx.query('DELETE FROM sessions WHERE admin_id=$1',[req.admin.id]);await audit(tx,req,'password_changed');});
  reply.clearCookie(auth.cookieName,{...auth.options,maxAge:undefined});return {ok:true};
 });
 app.get('/api/admin/stalls',{preHandler:auth.requireAdmin},async()=>({stalls:(await db.query('SELECT * FROM stalls ORDER BY updated_at DESC')).rows}));
 app.post('/api/admin/stalls',{preHandler:auth.mutation},async(req,reply)=>{
  const draft=stallSchema.parse(req.body),id=randomUUID();
  const row=await db.transaction(async tx=>{await checkAssets(tx,draft);const r=(await tx.query('INSERT INTO stalls(id,draft) VALUES($1,$2::jsonb) RETURNING *',[id,JSON.stringify(draft)])).rows[0];await audit(tx,req,'stall_created',id);return r;});return reply.code(201).send(row);
 });
 app.get('/api/admin/stalls/:id',{preHandler:auth.requireAdmin},async req=>{const r=(await db.query('SELECT * FROM stalls WHERE id=$1',[validId(req.params.id)])).rows[0];if(!r)fail(404,'Stall not found');return r;});
 app.put('/api/admin/stalls/:id',{preHandler:auth.mutation},async req=>{const p=saveSchema.parse(req.body);return db.transaction(async tx=>{await checkedRow(tx,req.params.id,p.revision);await checkAssets(tx,p.draft);const row=(await tx.query('UPDATE stalls SET draft=$1::jsonb,revision=revision+1,updated_at=now() WHERE id=$2 RETURNING *',[JSON.stringify(p.draft),req.params.id])).rows[0];await audit(tx,req,'draft_saved',req.params.id);return row;});});
 app.post('/api/admin/stalls/:id/publish',{preHandler:auth.mutation},async req=>{const p=revisionSchema.parse(req.body);return db.transaction(async tx=>{const row=await checkedRow(tx,req.params.id,p.revision);const draft=stallSchema.parse(row.draft);await checkAssets(tx,draft);const published=(await tx.query('UPDATE stalls SET published=$1::jsonb,published_at=now(),revision=revision+1,updated_at=now() WHERE id=$2 RETURNING *',[JSON.stringify(draft),row.id])).rows[0];await audit(tx,req,'stall_published',row.id);return published;});});
 app.post('/api/admin/stalls/:id/unpublish',{preHandler:auth.mutation},async req=>{const p=revisionSchema.parse(req.body);return db.transaction(async tx=>{await checkedRow(tx,req.params.id,p.revision);const row=(await tx.query('UPDATE stalls SET published=NULL,published_at=NULL,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[req.params.id])).rows[0];await audit(tx,req,'stall_unpublished',req.params.id);return row;});});
 app.post('/api/admin/stalls/:id/duplicate',{preHandler:auth.mutation},async(req,reply)=>{const p=revisionSchema.parse(req.body);const row=await db.transaction(async tx=>{const old=await checkedRow(tx,req.params.id,p.revision);const id=randomUUID(),data={...old.draft,name:(old.draft.name+' · Copy').slice(0,100)};const r=(await tx.query('INSERT INTO stalls(id,draft) VALUES($1,$2::jsonb) RETURNING *',[id,JSON.stringify(data)])).rows[0];await audit(tx,req,'stall_duplicated',id);return r;});return reply.code(201).send(row);});
 app.delete('/api/admin/stalls/:id',{preHandler:auth.mutation},async req=>{const p=revisionSchema.parse(req.body);return db.transaction(async tx=>{const row=await checkedRow(tx,req.params.id,p.revision);if(row.published)fail(409,'Unpublish this stall before deleting it');await tx.query('DELETE FROM stalls WHERE id=$1',[row.id]);await audit(tx,req,'stall_deleted',row.id);return {ok:true};});});
 app.get('/api/admin/preview/:id',{preHandler:auth.requireAdmin},async req=>{
  const draft=(await db.query('SELECT * FROM stalls WHERE id=$1',[validId(req.params.id)])).rows[0];if(!draft)fail(404,'Stall not found');
  const live=(await db.query(liveSQL)).rows.filter(r=>r.id!==draft.id&&r.published.slot!==draft.draft.slot);
  return {preview:true,stalls:[...live.map(r=>publicRecord(r)),publicRecord(draft,true)].sort((a,b)=>a.sortOrder-b.sortOrder)};
 });
 app.get('/api/admin/assets',{preHandler:auth.requireAdmin},async()=>({assets:(await db.query('SELECT * FROM assets ORDER BY created_at DESC LIMIT 200')).rows.map(a=>({...a,url:`/media/${a.id}.webp`}))}));
 app.post('/api/admin/assets',{preHandler:auth.mutation},async(req,reply)=>{
  const file=await req.file();if(!file)fail(400,'Select a PNG, JPEG, or WebP image');
  const bytes=await file.toBuffer();if(file.file.truncated)fail(413,'Image exceeds 8 MB');
  let result;try{const source=sharp(bytes,{limitInputPixels:25000000,animated:false});const meta=await source.metadata();if(!['png','jpeg','webp'].includes(meta.format))fail(400,'Only PNG, JPEG, or WebP images are supported');if((meta.pages||1)>1)fail(400,'Use a still image');result=await source.rotate().resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});}catch(e){if(e.statusCode)throw e;fail(400,'This image could not be decoded; use a valid PNG, JPEG, or WebP');}
  const id=randomUUID(),filename=id+'.webp',target=path.join(config.uploads,filename);await fs.writeFile(target,result.data,{flag:'wx',mode:0o640});
  try{const a=await db.transaction(async tx=>{const row=(await tx.query('INSERT INTO assets(id,original_name,filename,width,height,bytes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,path.basename(file.filename).slice(0,200),filename,result.info.width,result.info.height,result.data.length,req.admin.id])).rows[0];await audit(tx,req,'image_uploaded',id);return row;});return reply.code(201).send({...a,url:`/media/${id}.webp`});}catch(e){await fs.unlink(target).catch(()=>{});throw e;}
 });
 app.get('/media/:filename',async(req,reply)=>{
  const match=/^([a-f0-9-]{36})\.webp$/.exec(req.params.filename);if(!match)fail(404,'Image not found');const id=validId(match[1]);
  const asset=(await db.query('SELECT filename FROM assets WHERE id=$1',[id])).rows[0];if(!asset)fail(404,'Image not found');
  const published=(await db.query("SELECT id FROM stalls WHERE published->>'coverId'=$1 OR published->>'logoId'=$1 LIMIT 1",[id])).rows.length>0;
  if(!published&&!await auth.session(req))fail(404,'Image not found');
  reply.header('Cache-Control',published?'public, max-age=300':'private, no-store');
  try{return reply.type('image/webp').send(await fs.readFile(path.join(config.uploads,asset.filename)));}catch{fail(404,'Image not found');}
 });
 app.post('/api/enquiries',{preHandler:auth.origin,config:{rateLimit:{max:5,timeWindow:'1 hour'}}},async(req,reply)=>{
  const p=enquirySchema.parse(req.body);if(p.website)return reply.code(202).send({ok:true,reference:'received'});
  const id=randomUUID();const r=(await db.query('INSERT INTO enquiries(id,idempotency_key,name,company,email,event_type,timeframe,brief) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING id',[id,p.idempotencyKey,p.name,p.company,p.email.toLowerCase(),p.eventType,p.timeframe,p.brief])).rows[0];
  return reply.code(201).send({ok:true,reference:r.id.slice(0,8)});
 });
 app.get('/api/admin/enquiries',{preHandler:auth.requireAdmin},async req=>{
  const p=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),status:z.enum(['all','new','contacted','closed']).default('all')}).parse(req.query);
  const where=p.status==='all'?'':' WHERE status=$1',args=p.status==='all'?[]:[p.status];
  const total=Number((await db.query('SELECT count(*) AS n FROM enquiries'+where,args)).rows[0].n);
  const enquiries=(await db.query(`SELECT * FROM enquiries${where} ORDER BY created_at DESC LIMIT 25 OFFSET $${args.length+1}`,[...args,(p.page-1)*25])).rows;
  return {enquiries,total,page:p.page,pages:Math.max(1,Math.ceil(total/25))};
 });
 app.patch('/api/admin/enquiries/:id',{preHandler:auth.mutation},async req=>{const p=z.object({status:z.enum(['new','contacted','closed'])}).strict().parse(req.body);return db.transaction(async tx=>{const r=(await tx.query('UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING *',[p.status,validId(req.params.id)])).rows[0];if(!r)fail(404,'Enquiry not found');await audit(tx,req,'enquiry_status_changed',r.id);return r;});});
 app.delete('/api/admin/enquiries/:id',{preHandler:auth.mutation},async req=>db.transaction(async tx=>{const r=await tx.query('DELETE FROM enquiries WHERE id=$1 RETURNING id',[validId(req.params.id)]);if(!r.rows.length)fail(404,'Enquiry not found');await audit(tx,req,'enquiry_deleted',req.params.id);return {ok:true};}));
 app.get('/api/admin/enquiries.csv',{preHandler:auth.requireAdmin},async(req,reply)=>{
  const rows=(await db.query('SELECT name,company,email,event_type,timeframe,brief,status,created_at FROM enquiries ORDER BY created_at DESC LIMIT 10000')).rows;
  const columns=['name','company','email','event_type','timeframe','brief','status','created_at'];
  return reply.header('Content-Disposition','attachment; filename="atj-enquiries.csv"').type('text/csv; charset=utf-8').send('\ufeff'+[columns.map(csvCell).join(','),...rows.map(r=>columns.map(c=>csvCell(r[c] instanceof Date?r[c].toISOString():r[c])).join(','))].join('\r\n'));
 });
 app.get('/api/admin/audit',{preHandler:auth.requireAdmin},async()=>({events:(await db.query('SELECT l.*,a.email FROM audit_log l LEFT JOIN admins a ON a.id=l.admin_id ORDER BY l.id DESC LIMIT 100')).rows}));
 // HTML is served through the same origin as API and cookies. Never expose the repository root.
 async function html(name,reply){const text=await fs.readFile(path.join(config.publicDir,name),'utf8');return reply.header('Cache-Control','no-cache').type('text/html').send(text.replaceAll('__PUBLIC_ORIGIN__',config.origin).replaceAll('__RETENTION_DAYS__',String(config.retentionDays)));}
 for(const url of ['/','/index.html'])app.get(url,async(req,reply)=>html('index.html',reply));
 app.get('/contact.html',async(req,reply)=>html('contact.html',reply));
 app.get('/privacy.html',async(req,reply)=>html('privacy.html',reply));
 for(const url of ['/admin','/admin/'])app.get(url,async(req,reply)=>html('admin/index.html',reply));
 app.get('/robots.txt',async(req,reply)=>reply.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api/admin/\nDisallow: /*?preview=\nSitemap: ${config.origin}/sitemap.xml\n`));
 app.get('/sitemap.xml',async(req,reply)=>reply.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/','/contact.html'].map(p=>`<url><loc>${config.origin}${p}</loc></url>`).join('')}</urlset>`));
 await app.register(staticFiles,{root:config.publicDir,index:false,maxAge:0,dotfiles:'deny'});
 app.setNotFoundHandler((req,reply)=>{if(req.url.startsWith('/api/'))return reply.code(404).send({error:'Not found'});return reply.code(404).type('text/html').send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found · All That Jazz</title><link rel="stylesheet" href="/admin/admin.css"><main class="not-found"><p class="eyebrow">ALL THAT JAZZ / 404</p><h1>This room is<br>off the map.</h1><a class="primary" href="/">Back to the experience ↗</a></main></html>');});
 return app;
}
