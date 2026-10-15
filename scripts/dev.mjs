import {spawn} from 'node:child_process';
import {watch} from 'node:fs';
import {root} from '../server/config.mjs';
const runBuild=()=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,['scripts/build.mjs'],{cwd:root,stdio:'inherit'});p.on('exit',c=>c===0?resolve():reject(new Error('Build failed')));});
await runBuild();
let timer,running=false,again=false;
async function rebuild(){if(running){again=true;return;}running=true;try{await runBuild();}catch(e){console.error(e.message);}finally{running=false;if(again){again=false;rebuild();}}}
const watcher=watch(root+'/public',{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(rebuild,180);});
const server=spawn(process.execPath,['--watch','--env-file=.env.development','server/start.mjs'],{cwd:root,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{watcher.close();server.kill(signal);});
server.on('exit',c=>{watcher.close();process.exitCode=c||0;});
