import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root} from './config.mjs';
export async function migrate(db) {
 await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
 await db.transaction(async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(19472104)');
  for (const name of (await fs.readdir(path.join(root,'migrations'))).filter(n=>n.endsWith('.sql')).sort()) {
   const sql=await fs.readFile(path.join(root,'migrations',name),'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
   const old=(await tx.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name])).rows[0];
   if(old){if(old.checksum!==checksum)throw new Error('Applied migration changed: '+name);continue;}
   await tx.query(sql);await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);
  }
 });
}
