import {getConfig} from './config.mjs';
import {connectDatabase} from './db.mjs';
import {buildApp} from './app.mjs';
const config=getConfig(),db=connectDatabase(config.db);
const app=await buildApp({db,config,logger:{level:config.logLevel,redact:['req.headers.cookie','req.headers.authorization','req.body.password']}});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();await db.close();process.exit(0);});
try{await db.query('SELECT name FROM schema_migrations LIMIT 1');await app.listen({port:config.port,host:config.host});}
catch(err){app.log.error({name:err.name,code:err.code},'Startup failed. Check database connectivity and run migrations.');await app.close();await db.close();process.exit(1);}
