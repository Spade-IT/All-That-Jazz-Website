import {scrypt as nativeScrypt,randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {validatePassword,fail} from './validation.mjs';
const scrypt=promisify(nativeScrypt);
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function equal(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);}
export async function passwordHash(password){validatePassword(password);const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64,{N:65536,r:8,p:1,maxmem:128*1024*1024});return `scrypt$${salt}$${key.toString('hex')}`;}
export async function verifyPassword(password,stored){try{const [scheme,salt,digest]=stored.split('$');if(scheme!=='scrypt')return false;const key=await scrypt(password,salt,64,{N:65536,r:8,p:1,maxmem:128*1024*1024});return equal(key.toString('hex'),digest);}catch{return false;}}
export async function setAdmin(db,email,password,reset=false){
 const digest=await passwordHash(password);email=email.trim().toLowerCase();
 return db.transaction(async tx=>{const existing=(await tx.query('SELECT id FROM admins WHERE email=$1',[email])).rows[0];
  if(existing&&!reset)fail(409,'Admin already exists; use --reset-password to replace their password');
  if(existing){await tx.query('UPDATE admins SET password_hash=$1 WHERE id=$2',[digest,existing.id]);await tx.query('DELETE FROM sessions WHERE admin_id=$1',[existing.id]);return existing.id;}
  const id=randomUUID();await tx.query('INSERT INTO admins(id,email,password_hash) VALUES($1,$2,$3)',[id,email,digest]);return id;
 });
}
export function authHooks(db,config){
 const cookieName=config.secure?'__Host-atj_session':'atj_session';
 const options={path:'/',httpOnly:true,sameSite:'strict',secure:config.secure,maxAge:config.sessionHours*3600};
 async function session(req){const token=req.cookies[cookieName];if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
  return (await db.query('SELECT s.csrf,s.token_hash,a.id,a.email FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hash(token)])).rows[0]||null;
 }
 async function requireAdmin(req){req.admin=await session(req);if(!req.admin)fail(401,'Please sign in');}
 async function origin(req){if(req.headers.origin!==config.origin)fail(403,'Request origin is not allowed');}
 async function mutation(req){await origin(req);await requireAdmin(req);if(!equal(req.headers['x-csrf-token'],req.admin.csrf))fail(403,'Invalid CSRF token; reload and try again');}
 async function login(req,reply,email,password){
  const keys=[hash('email:'+email),hash('ip:'+req.ip)];
  for(const key of keys){const count=Number((await db.query("SELECT count(*) AS n FROM login_attempts WHERE key_hash=$1 AND created_at>now()-interval '15 minutes'",[key])).rows[0].n);if(count>=10)fail(429,'Too many sign-in attempts. Try again in 15 minutes.');}
  for(const key of keys)await db.query('INSERT INTO login_attempts(key_hash) VALUES($1)',[key]);
  const user=(await db.query('SELECT * FROM admins WHERE email=$1',[email])).rows[0];
  // Always execute scrypt, including when the account does not exist.
  const dummy='scrypt$00000000000000000000000000000000$'+'00'.repeat(64);
  if(!await verifyPassword(password,user?.password_hash||dummy)||!user)fail(401,'Email or password is incorrect');
  const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
  await db.transaction(async tx=>{if(req.cookies[cookieName])await tx.query('DELETE FROM sessions WHERE token_hash=$1',[hash(req.cookies[cookieName])]);
   await tx.query('INSERT INTO sessions(token_hash,admin_id,csrf,expires_at) VALUES($1,$2,$3,$4)',[hash(token),user.id,csrf,new Date(Date.now()+config.sessionHours*3600000)]);
   await tx.query('DELETE FROM login_attempts WHERE key_hash=$1',[keys[0]]);
   await tx.query('INSERT INTO audit_log(admin_id,action) VALUES($1,$2)',[user.id,'sign_in']);
  });reply.setCookie(cookieName,token,options);return {email:user.email,csrf};
 }
 return {session,requireAdmin,mutation,origin,login,cookieName,options};
}
