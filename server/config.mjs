import fs from 'node:fs';
import path from 'node:path';
export const root = path.resolve(import.meta.dirname, '..');
export function getConfig(env = process.env) {
  const mode = env.NODE_ENV || 'development';
  const origin = new URL(env.PUBLIC_ORIGIN || 'http://localhost:3000');
  if (!['http:','https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('PUBLIC_ORIGIN must be an http(s) origin without a path or credentials');
  const local = ['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
  if (mode === 'production' && origin.protocol !== 'https:' && !(local && env.ALLOW_INSECURE_LOCAL === '1')) throw new Error('Production requires HTTPS; only a loopback origin may use ALLOW_INSECURE_LOCAL=1');
  const password = env.DB_PASSWORD_FILE ? fs.readFileSync(env.DB_PASSWORD_FILE,'utf8').trim() : env.DB_PASSWORD;
  const retentionDays=Number(env.ENQUIRY_RETENTION_DAYS || 365);
  if(!Number.isInteger(retentionDays)||retentionDays<1||retentionDays>3650)throw new Error('ENQUIRY_RETENTION_DAYS must be 1–3650');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return {mode, origin:origin.origin, secure:origin.protocol === 'https:', port, host:env.HOST || '0.0.0.0', trustProxy:env.TRUST_PROXY === '1' ? 1 : false,
    uploads:path.resolve(env.UPLOAD_DIR || path.join(root,'var/uploads')), publicDir:path.join(root,'dist'),
    db:env.DATABASE_URL ? {connectionString:env.DATABASE_URL} : {host:env.DB_HOST || '127.0.0.1',port:Number(env.DB_PORT || 5432),database:env.DB_NAME || 'atj',user:env.DB_USER || 'atj',password},
    logLevel:env.LOG_LEVEL || 'info', sessionHours:12, retentionDays};
}
