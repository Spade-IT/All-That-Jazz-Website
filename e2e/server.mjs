// Test-only server: isolated PostgreSQL schema or in-memory PGlite, loopback only.
// It is not part of the production Docker image and never connects to production by default.
import fs from 'node:fs/promises';
import {testDatabase,testConfig,testEmail,testPassword} from '../tests/helpers.mjs';
import {buildApp} from '../server/app.mjs';
import {setAdmin} from '../server/auth.mjs';
import {seed} from '../scripts/seed.mjs';
const db=await testDatabase(),config=await testConfig({origin:'http://127.0.0.1:3410',host:'127.0.0.1',port:3410});
await setAdmin(db,testEmail,testPassword);await seed(db);
const app=await buildApp({db,config});
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await app.close();await db.close();await fs.rm(config.uploads,{recursive:true,force:true});process.exit(0);});
await app.listen({host:config.host,port:config.port});
