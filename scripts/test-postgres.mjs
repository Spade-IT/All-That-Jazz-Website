import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
if(!process.env.ATJ_TEST_DATABASE_URL)throw new Error('Set ATJ_TEST_DATABASE_URL to a dedicated, disposable PostgreSQL test database (never production).');
const files=(await fs.readdir('tests')).filter(n=>n.endsWith('.test.mjs')).map(n=>'tests/'+n);
const child=spawn(process.execPath,['--test','--test-concurrency=1',...files],{stdio:'inherit',env:{...process.env,ATJ_TEST_DRIVER:'postgres'}});
child.on('exit',code=>{process.exitCode=code||0;});
