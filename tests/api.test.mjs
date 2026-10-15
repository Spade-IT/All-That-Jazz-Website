import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {buildApp} from '../server/app.mjs';
import {setAdmin} from '../server/auth.mjs';
import {migrate} from '../server/migrate.mjs';
import {seed} from '../scripts/seed.mjs';
import {testDatabase,testConfig,login,draft,testEmail,testPassword} from './helpers.mjs';
let db,config,app;
before(async()=>{db=await testDatabase();config=await testConfig();await setAdmin(db,testEmail,testPassword);});
after(async()=>{await db.close();await fs.rm(config.uploads,{recursive:true,force:true});});
beforeEach(async()=>{for(const t of ['sessions','login_attempts','stalls','enquiries','assets','audit_log'])await db.query('DELETE FROM '+t);app=await buildApp({db,config});});
afterEach(async()=>{await app.close();});
async function create(headers,data=draft){const r=await app.inject({method:'POST',url:'/api/admin/stalls',headers,payload:data});assert.equal(r.statusCode,201,r.body);return r.json();}
async function publish(headers,r){const out=await app.inject({method:'POST',url:`/api/admin/stalls/${r.id}/publish`,headers,payload:{revision:r.revision}});assert.equal(out.statusCode,200,out.body);return out.json();}
test('public pages, security headers, readiness, SEO, and source isolation',async()=>{
 for(const url of ['/','/contact.html','/privacy.html','/admin/','/health/ready','/assets/favicon.svg','/assets/social-preview.png']){const r=await app.inject(url);assert.equal(r.statusCode,200,`${url}: ${r.body.slice(0,120)}`);assert.equal(r.headers['x-content-type-options'],'nosniff');}
 const html=(await app.inject('/')).body;assert.match(html,/http:\/\/localhost:3000\/assets\/social-preview.png/);assert.doesNotMatch(html,/__PUBLIC_ORIGIN__/);
 assert.match((await app.inject('/robots.txt')).body,/Disallow: \/admin/);assert.match((await app.inject('/sitemap.xml')).body,/contact.html/);
 for(const url of ['/server/app.mjs','/package.json','/.env','/.git/config'])assert.ok([403,404].includes((await app.inject(url)).statusCode),url);
 assert.equal((await app.inject('/not-a-page')).statusCode,404);
});
test('migrations and seed are repeatable without overwriting content',async()=>{
 await migrate(db);assert.equal(await seed(db),true);assert.equal(await seed(db),false);const rows=(await app.inject('/api/venue')).json().stalls;assert.equal(rows.length,5);assert.ok(rows.every(x=>x.id&&x.template));
});
test('admin access, login origin, cookies, CSRF, and logout revocation',async()=>{
 assert.equal((await app.inject('/api/admin/stalls')).statusCode,401);
 assert.equal((await app.inject({method:'POST',url:'/api/auth/login',headers:{origin:'https://evil.example'},payload:{email:testEmail,password:testPassword}})).statusCode,403);
 const h=await login(app);assert.equal((await app.inject({url:'/api/admin/session',headers:h})).statusCode,200);
 assert.equal((await app.inject({method:'POST',url:'/api/admin/stalls',headers:{cookie:h.cookie,origin:config.origin},payload:draft})).statusCode,403);
 assert.equal((await app.inject({method:'POST',url:'/api/admin/stalls',headers:{...h,origin:'https://evil.example'},payload:draft})).statusCode,403);
 assert.equal((await app.inject({method:'POST',url:'/api/auth/logout',headers:h,payload:{}})).statusCode,200);
 assert.equal((await app.inject({url:'/api/admin/session',headers:h})).statusCode,401);
});
test('production sessions use secure host-only cookies and HSTS',async()=>{
 const secureApp=await buildApp({db,config:{...config,origin:'https://events.example.com',secure:true,mode:'production'}});
 try{const r=await secureApp.inject({method:'POST',url:'/api/auth/login',headers:{origin:'https://events.example.com'},payload:{email:testEmail,password:testPassword}});assert.equal(r.statusCode,200,r.body);const c=r.headers['set-cookie'];assert.match(c,/__Host-atj_session=/);assert.match(c,/HttpOnly/);assert.match(c,/Secure/);assert.match(c,/SameSite=Strict/);assert.ok(r.headers['strict-transport-security']);}finally{await secureApp.close();}
});
test('saving an edited draft never changes the published snapshot',async()=>{
 const h=await login(app);let row=await create(h);assert.deepEqual((await app.inject('/api/venue')).json().stalls,[]);
 row=await publish(h,row);const updated={...draft,name:'Private replacement title'};
 let r=await app.inject({method:'PUT',url:`/api/admin/stalls/${row.id}`,headers:h,payload:{revision:row.revision,draft:updated}});assert.equal(r.statusCode,200,r.body);row=r.json();
 assert.equal((await app.inject('/api/venue')).json().stalls[0].name,draft.name);
 assert.equal((await app.inject(`/api/admin/preview/${row.id}`)).statusCode,401);
 assert.equal((await app.inject({url:`/api/admin/preview/${row.id}`,headers:h})).json().stalls[0].name,updated.name);
 await publish(h,row);assert.equal((await app.inject('/api/venue')).json().stalls[0].name,updated.name);
});
test('optimistic revisions reject stale saves; a live position cannot be double-booked',async()=>{
 const h=await login(app);let first=await publish(h,await create(h));const second=await create(h,{...draft,name:'Second stall'});
 let r=await app.inject({method:'POST',url:`/api/admin/stalls/${second.id}/publish`,headers:h,payload:{revision:second.revision}});assert.equal(r.statusCode,409);
 r=await app.inject({method:'PUT',url:`/api/admin/stalls/${first.id}`,headers:h,payload:{revision:1,draft}});assert.equal(r.statusCode,409);
 const preview=(await app.inject({url:`/api/admin/preview/${second.id}`,headers:h})).json();assert.equal(preview.stalls.length,1);assert.equal(preview.stalls[0].id,second.id);
 r=await app.inject({method:'DELETE',url:`/api/admin/stalls/${first.id}`,headers:h,payload:{revision:first.revision}});assert.equal(r.statusCode,409);
 first=(await app.inject({method:'POST',url:`/api/admin/stalls/${first.id}/unpublish`,headers:h,payload:{revision:first.revision}})).json();
 await publish(h,second);assert.equal((await app.inject('/api/venue')).json().stalls[0].id,second.id);
 assert.equal((await app.inject({method:'DELETE',url:`/api/admin/stalls/${first.id}`,headers:h,payload:{revision:first.revision}})).statusCode,200);
});
test('duplication creates a separate draft and validation blocks invalid settings and asset IDs',async()=>{
 const h=await login(app),row=await publish(h,await create(h));let r=await app.inject({method:'POST',url:`/api/admin/stalls/${row.id}/duplicate`,headers:h,payload:{revision:row.revision}});assert.equal(r.statusCode,201);assert.equal(r.json().published,null);assert.notEqual(r.json().id,row.id);
 for(const bad of [{color:'red; background: url(x)'},{template:'arbitrary-code'},{slot:'outside'},{sourceUrl:'javascript:alert(1)'},{unexpected:true},{coverId:randomUUID()}]){r=await app.inject({method:'POST',url:'/api/admin/stalls',headers:h,payload:{...draft,...bad}});assert.equal(r.statusCode,400,r.body);}
});
function multipartBuffer(buffer,type='image/png',filename='image.png'){const boundary='ATJTESTBOUNDARY';return {body:Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`),buffer,Buffer.from(`\r\n--${boundary}--\r\n`)]),type:`multipart/form-data; boundary=${boundary}`};}
test('image uploads are decoded, normalised, and private until published',async()=>{
 const h=await login(app);const bytes=await sharp({create:{width:4,height:3,channels:4,background:'#bea9ff'}}).png().toBuffer();const f=multipartBuffer(bytes);let r=await app.inject({method:'POST',url:'/api/admin/assets',headers:{...h,'content-type':f.type},payload:f.body});assert.equal(r.statusCode,201,r.body);const image=r.json();assert.equal(image.width,4);assert.equal((await app.inject(image.url)).statusCode,404);assert.equal((await app.inject({url:image.url,headers:h})).headers['content-type'],'image/webp');await publish(h,await create(h,{...draft,coverId:image.id}));assert.equal((await app.inject(image.url)).statusCode,200);
 const fake=multipartBuffer(Buffer.from('<svg onload="alert(1)"></svg>'),'image/png');r=await app.inject({method:'POST',url:'/api/admin/assets',headers:{...h,'content-type':fake.type},payload:fake.body});assert.equal(r.statusCode,400);
});
test('enquiries require consent and origin, are idempotent, and stay private',async()=>{
 const p={name:'Test Client',company:'Test Co',email:'client@example.test',eventType:'Corporate event',timeframe:'November',brief:'We are planning a corporate event.',website:'',consent:true,idempotencyKey:randomUUID()};
 assert.equal((await app.inject({method:'POST',url:'/api/enquiries',payload:p})).statusCode,403);
 assert.equal((await app.inject({method:'POST',url:'/api/enquiries',headers:{origin:config.origin},payload:{...p,consent:false}})).statusCode,400);
 const send=()=>app.inject({method:'POST',url:'/api/enquiries',headers:{origin:config.origin},payload:p});const a=await send(),b=await send();assert.equal(a.statusCode,201,a.body);assert.equal(a.json().reference,b.json().reference);
 assert.equal((await app.inject('/api/admin/enquiries')).statusCode,401);const h=await login(app);let r=(await app.inject({url:'/api/admin/enquiries',headers:h})).json();assert.equal(r.total,1);const id=r.enquiries[0].id;
 assert.equal((await app.inject({method:'PATCH',url:`/api/admin/enquiries/${id}`,headers:h,payload:{status:'contacted'}})).statusCode,200);
 assert.equal((await app.inject({method:'DELETE',url:`/api/admin/enquiries/${id}`,headers:h})).statusCode,200);assert.equal((await app.inject({url:'/api/admin/enquiries',headers:h})).json().total,0);
});
test('CSV export neutralises spreadsheet formulas and audit events exclude private content',async()=>{
 await db.query('INSERT INTO enquiries(id,idempotency_key,name,company,email,event_type,timeframe,brief) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),randomUUID(),'=1+1','Company','a@example.test','Conference','','Private brief text']);
 const h=await login(app);await create(h);const csv=await app.inject({url:'/api/admin/enquiries.csv',headers:h});assert.match(csv.body,/"'=1\+1"/);assert.match(csv.headers['content-disposition'],/attachment/);const log=(await app.inject({url:'/api/admin/audit',headers:h})).json();assert.ok(log.events.some(e=>e.action==='stall_created'));assert.doesNotMatch(JSON.stringify(log),/Private brief text/);
});
test('password changes and admin resets invalidate existing sessions',async()=>{
 const h=await login(app);const newPassword='A replacement testing passphrase 2026!';const r=await app.inject({method:'POST',url:'/api/admin/password',headers:h,payload:{current:testPassword,next:newPassword}});assert.equal(r.statusCode,200,r.body);assert.equal((await app.inject({url:'/api/admin/session',headers:h})).statusCode,401);await setAdmin(db,testEmail,testPassword,true);assert.ok(await login(app));
});
test('login attempts are throttled and invalid credentials do not create sessions',async()=>{
 for(let i=0;i<10;i++){const r=await app.inject({method:'POST',url:'/api/auth/login',headers:{origin:config.origin},payload:{email:testEmail,password:'wrong'}});assert.equal(r.statusCode,401,r.body);}const r=await app.inject({method:'POST',url:'/api/auth/login',headers:{origin:config.origin},payload:{email:testEmail,password:'wrong'}});assert.equal(r.statusCode,429);assert.equal(Number((await db.query('SELECT count(*) AS n FROM sessions')).rows[0].n),0);
});
