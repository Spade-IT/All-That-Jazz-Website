import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getConfig} from '../server/config.mjs';
import {stallSchema,csvCell} from '../server/validation.mjs';
import {draft} from './helpers.mjs';
test('production rejects insecure public origins except explicit loopback testing',()=>{
 assert.throws(()=>getConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'http://example.com'}));
 assert.throws(()=>getConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'http://example.com',ALLOW_INSECURE_LOCAL:'1'}));
 assert.throws(()=>getConfig({PUBLIC_ORIGIN:'https://example.com/admin'}));
 assert.equal(getConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'http://localhost:8080',ALLOW_INSECURE_LOCAL:'1'}).secure,false);
 assert.equal(getConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'https://example.com'}).secure,true);
});
test('stall validation trims content and disallows active URLs, extra fields and invalid positions',()=>{
 assert.equal(stallSchema.parse({...draft,name:'  New story  '}).name,'New story');
 for(const sourceUrl of ['http://example.com','javascript:alert(1)','https://user:password@example.com'])assert.equal(stallSchema.safeParse({...draft,sourceUrl}).success,false);
 assert.equal(stallSchema.safeParse({...draft,slot:'bogus'}).success,false);
});
test('CSV fields are quoted and formula-like values are neutralised',()=>{
 assert.equal(csvCell('a,"b"'),'"a,""b"""');for(const value of ['=SUM(A1:A2)','+1','@SUM(1)','-4','  =1'])assert.ok(csvCell(value).startsWith('"\''));
});
