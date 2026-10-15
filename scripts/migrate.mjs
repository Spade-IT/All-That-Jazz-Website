import fs from 'node:fs';
import {getConfig} from '../server/config.mjs';
import {connectDatabase} from '../server/db.mjs';
import {migrate} from '../server/migrate.mjs';
const cfg=getConfig().db;
if(process.env.DB_OWNER_PASSWORD_FILE){cfg.user='atj_owner';cfg.password=fs.readFileSync(process.env.DB_OWNER_PASSWORD_FILE,'utf8').trim();}
const db=connectDatabase(cfg);
try{await migrate(db);console.log('Database migrations are current.');}finally{await db.close();}
