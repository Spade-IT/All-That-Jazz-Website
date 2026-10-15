import fs from 'node:fs/promises';
import {z} from 'zod';
import {getConfig} from '../server/config.mjs';
import {connectDatabase} from '../server/db.mjs';
import {setAdmin} from '../server/auth.mjs';
const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];
if(!args.includes('--email')){console.error('Usage: npm run admin:create -- --email you@company.com [--password-file /private/file] [--reset-password]');process.exit(1);}
const email=z.email().parse(arg('--email'));
async function hiddenPrompt(){
 if(!process.stdin.isTTY)throw new Error('Use --password-file for non-interactive admin creation');
 process.stdout.write('Password (14+ characters, hidden): ');process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{let value='';const done=()=>{process.stdin.setRawMode(false);process.stdin.pause();process.stdin.removeListener('data',listen);process.stdout.write('\n');};function listen(chunk){for(const ch of chunk.toString()){if(ch==='\u0003'){done();reject(new Error('Cancelled'));return;}if(ch==='\r'||ch==='\n'){done();resolve(value);return;}if(ch==='\u007f'||ch==='\b')value=value.slice(0,-1);else if(ch>=' ')value+=ch;}}process.stdin.on('data',listen);});
}
const password=args.includes('--password-file')?(await fs.readFile(arg('--password-file'),'utf8')).trimEnd():await hiddenPrompt();
const db=connectDatabase(getConfig().db);try{await setAdmin(db,email,password,args.includes('--reset-password'));console.log('Admin account is ready. Sign in at /admin.');}finally{await db.close();}
