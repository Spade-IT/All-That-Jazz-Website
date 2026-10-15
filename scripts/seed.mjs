import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {getConfig,root} from '../server/config.mjs';
import {connectDatabase} from '../server/db.mjs';
import {stallSchema} from '../server/validation.mjs';
export async function seed(db) {
 const items=JSON.parse(await fs.readFile(root+'/data/seed.json','utf8'));
 return db.transaction(async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(19472105)');
  if(Number((await tx.query('SELECT count(*) AS n FROM stalls')).rows[0].n)>0)return false;
  for(const old of items){const {id,number,...fields}=old;const p=stallSchema.parse(fields);await tx.query('INSERT INTO stalls(id,draft,published,published_at) VALUES($1,$2::jsonb,$2::jsonb,now())',[randomUUID(),JSON.stringify(p)]);}
  return true;
 });
}
if(process.argv[1]===new URL(import.meta.url).pathname){const db=connectDatabase(getConfig().db);try{console.log(await seed(db)?'Loaded the five original project stalls.':'No changes: stalls already exist.');}finally{await db.close();}}
