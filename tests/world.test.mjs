import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/world.js',import.meta.url),'utf8');
const engine=fs.readFileSync(new URL('../public/engine.js',import.meta.url),'utf8');
const types=['taxi','japan','usa','elite','aimc'];
function build(stalls){const window={ATJVenue:{stalls},matchMedia:()=>({matches:false})};const context=vm.createContext({window,console,Math,Float32Array,Set,Map,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}});vm.runInContext(source,context);vm.runInContext(engine,context);let count=0;const groups=new Set();const api=Object.fromEntries(['box','cylinder','sphere','beam','disc'].map(name=>[name,(...args)=>{count++;for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),name+' geometry contains a non-finite coordinate');}]));api.setGroup=name=>groups.add(name);return {world:window.ATJWorld.build(api),groups,count,Engine:window.ATJEngine};}
test('empty venue contains only the arcade and contact zones; no hidden draft pavilions',()=>{const b=build([]);assert.equal(b.world.zones.length,3);assert.equal(b.world.obstacles.length,0);assert.equal([...b.groups].some(x=>x.startsWith('stall_')),false);});
test('all 25 template/position combinations produce finite geometry and usable zone destinations',()=>{
 for(const template of types)for(const slot of types){const b=build([{id:'test-stall',template,slot,name:'Test stall',color:'#123456'}]);assert.equal(b.world.zones.length,4);assert.equal(b.world.obstacles.length,1);assert.ok(b.groups.has(`stall_${slot}_anim_${template}`));const zone=b.world.zones.find(z=>z.id==='test-stall'),wall=b.world.obstacles[0];assert.ok(!(zone.x>wall.minX&&zone.x<wall.maxX&&zone.z>wall.minZ&&zone.z<wall.maxZ));assert.ok(b.count>100);}
});
test('duplicate templates in different slots keep independent animations, navigation and obstacles',()=>{const b=build(types.map((slot,i)=>({id:'stall-'+i,template:'elite',slot,name:'Stall '+i,color:'#abcdef'})));assert.equal(b.world.zones.length,8);assert.equal(b.world.obstacles.length,5);assert.equal([...b.groups].filter(x=>x.startsWith('stall_')).length,5);});
test('house collision still blocks walls and permits the entrance',()=>{const {Engine}=build([]);const e=new Engine({},{});e.avatar.x=5;e.avatar.z=13.1;assert.ok(e._clampPoint({x:5,z:12.5}).z>=12.98);e.avatar.x=0;assert.equal(e._clampPoint({x:0,z:12.5}).z,12.5);const route=e._safePath({x:6,z:16},{x:10,z:8});assert.ok(route.some(p=>p.x===0&&p.z===13.5));});
