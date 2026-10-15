import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root} from '../server/config.mjs';
let count=0;
async function walk(dir){for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())await walk(p);else if(/\.(mjs|js)$/.test(p)){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);count++;}}}
for(const dir of ['server','scripts','public','tests','e2e'])await walk(path.join(root,dir));
console.log(`Syntax checked ${count} JavaScript files.`);
