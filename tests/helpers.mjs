import {PGlite} from '@electric-sql/pglite';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import {connectDatabase} from '../server/db.mjs';
import {migrate} from '../server/migrate.mjs';
import {getConfig} from '../server/config.mjs';
export async function testDatabase(){
 if(process.env.ATJ_TEST_DRIVER==='postgres'){
  if(!process.env.ATJ_TEST_DATABASE_URL)throw new Error('ATJ_TEST_DATABASE_URL is required');
  const schema='atj_test_'+randomUUID().replaceAll('-','');const admin=new pg.Pool({connectionString:process.env.ATJ_TEST_DATABASE_URL});
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const db=connectDatabase({connectionString:process.env.ATJ_TEST_DATABASE_URL,options:`-c search_path=${schema}`});
  const close=db.close;db.close=async()=>{await close();await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.end();};
  await migrate(db);return db;
 }
 const engine=new PGlite();
 const wrap=p=>({query:async(sql,args)=>!args&&sql.trim().split(';').filter(x=>x.trim()).length>1?(await p.exec(sql)).at(-1):p.query(sql,args)});
 const db={...wrap(engine),transaction:fn=>engine.transaction(tx=>fn(wrap(tx))),close:()=>engine.close()};
 await migrate(db);return db;
}
export async function testConfig(extra={}){const uploads=await fs.mkdtemp(path.join(os.tmpdir(),'atj-test-'));return {...getConfig({PUBLIC_ORIGIN:'http://localhost:3000'}),uploads,...extra};}
export const draft={name:'A new experience',title:'A moment to remember.',category:'CORPORATE EXPERIENCE',client:'Example brand',year:'2026',place:'Mumbai',summary:'A complete new event story created through the studio.',award:'',mood:'Step into the story.',color:'#bea9ff',template:'elite',slot:'taxi',sourceUrl:'',coverId:null,logoId:null,sortOrder:1};
export const testEmail='editor@example.test',testPassword='A unique testing passphrase 2026!';
export async function login(app,origin='http://localhost:3000'){
 const res=await app.inject({method:'POST',url:'/api/auth/login',headers:{origin},payload:{email:testEmail,password:testPassword}});
 if(res.statusCode!==200)throw new Error(res.body);
 return {cookie:res.cookies[0].name+'='+res.cookies[0].value,'x-csrf-token':res.json().csrf,origin};
}
