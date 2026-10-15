import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const window={matchMedia:()=>({matches:false})};const context=vm.createContext({window,console,Math,Float32Array,Set,Map,performance:{now:()=>0},cancelAnimationFrame:()=>{},requestAnimationFrame:()=>1});
for(const name of ['engine','world','spacewar'])vm.runInContext(fs.readFileSync(new URL(`src/${name}.js`,import.meta.url),'utf8'),context);
const e=new window.ATJEngine({},{});
e.avatar.x=5;e.avatar.z=13.1;const blocked=e._clampPoint({x:5,z:12.5});assert(blocked.z>=12.98,'front wall must block walking');
e.avatar.x=0;e.avatar.z=13.1;const door=e._clampPoint({x:0,z:12.5});assert.equal(door.z,12.5,'doorway must allow walking');
const route=e._safePath({x:6,z:16},{x:10,z:8});assert(route.some(p=>p.x===0&&p.z===13.5));assert(route.some(p=>p.x===0&&p.z===11.7));
e.width=1280;e.height=720;e.setView('first');assert.equal(e.view,'first');assert.equal(e.eye[1],2.05);assert(Array.from(e.vp).every(Number.isFinite));e.setView('follow');assert.equal(e.view,'follow');
// Verify V3 smart wall cutaway alpha when avatar is inside and camera is outside
e.avatar.x=0;e.avatar.z=8.0;e.eye=[0,8,20];e._updateWallCutaways(1,true);
assert(e.wallAlpha.front<0.3,'front wall must cutaway when blocking camera view of avatar inside');
assert.equal(e.wallAlpha.roof,0,'roof must fade out when avatar is inside');
// Verify V3 interior obstacle sliding collision
const deskClamp=e._clampPoint({x:-2.0,z:13.0});assert(deskClamp.x<=-3.38||deskClamp.x>=-0.78||deskClamp.z<=12.38||deskClamp.z>=13.52,'reception desk must deflect walking');
const calls=[];const groups=new Set();const api=Object.fromEntries(['box','cylinder','sphere','beam','disc'].map(k=>[k,(...args)=>calls.push(args)]));api.setGroup=name=>groups.add(name);
const w=window.ATJWorld.build(api);assert(w.roof);assert(w.zones.some(z=>z.id==='spacewar'));assert(w.zones.some(z=>z.id==='tetris'));assert(w.spawn.z>12.6);
for(const gName of ['wall_front','wall_back','wall_left','wall_right','occluders','emissive','anim_orb','anim_ring'])assert(groups.has(gName),`missing V3 group ${gName}`);
const g=Object.create(window.ATJSpaceWar.prototype);Object.assign(g,{x:240,lives:3,score:0,wave:1,bullets:[{x:100,y:100}],enemies:[{x:100,y:100,v:0}],particles:[],cooldown:1,spawnTimer:1,invincible:0,keys:new Set(),status:()=>{},pause:()=>{},_burst:window.ATJSpaceWar.prototype._burst});g.update(0);assert.equal(g.score,10);assert.equal(g.enemies.length,0);assert.equal(g.bullets.length,0);assert(g.particles.length>0,'explosion particles must spawn on hit');
g.enemies=[{x:240,y:385,v:0}];g.update(0);assert.equal(g.lives,2);
g.keys.add('a');g.x=18;g.update(.04);assert.equal(g.x,18);g.keys.clear();g.keys.add(' ');g.cooldown=0;g.update(0);assert.equal(g.bullets.length,1);
console.log('PASS house walls, doorway, cross-door routes, FPP camera, V3 cutaway walls, obstacle sliding, animated groups, arcade zones, and Space War.');
