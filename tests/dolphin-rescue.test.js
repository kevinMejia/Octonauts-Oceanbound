import test from 'node:test';
import assert from 'node:assert/strict';
import {DolphinRescueState,pushDebris,routeClear} from '../src/missions/dolphinRescueMath.js';
import {dolphinRescueConfig as c} from '../src/config/dolphinRescueConfig.js';
const step=(s,seconds,fn=()=>{})=>{for(let i=0;i<seconds*60;i++){fn(s);s.update(1/60,8);}};
test('dolphins continuously progress in a bounded, separated formation independently of the GUP',()=>{
 const s=new DolphinRescueState();step(s,5);assert.equal(s.spawned,0);assert(s.distance>19.9);assert.equal(s.dolphins.length,3);
 for(const d of s.dolphins){assert(Math.abs(d.x)<c.escort.halfWidth);assert(d.z>c.route.startZ+13);}
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(Math.hypot(s.dolphins[i].x-s.dolphins[j].x,s.dolphins[i].z-s.dolphins[j].z)>3);
});
test('sleeping dolphins hold straight fixed lanes and depth for the whole route',()=>{
 const s=new DolphinRescueState();
 for(let frame=0;frame<150*60;frame++){
  for(const o of s.obstacles)if(o.active)o.x=8;s.update(1/60);
  for(const [i,d] of s.dolphins.entries()){const [x,z]=c.escort.formation[i];assert.equal(d.x,x);assert.equal(d.y,c.route.depth);assert(Math.abs(d.z-(c.route.startZ+z+c.route.speed*s.time))<1e-6);}
 }
 assert.equal(s.status,'complete');assert.equal(s.strikes,0);
});
test('a debris strike never pushes dolphins off their straight course',()=>{
 const s=new DolphinRescueState();s.hit({struck:false},s.dolphins[0]);s.update(1/60);
 for(const [i,d] of s.dolphins.entries()){assert.equal(d.x,c.escort.formation[i][0]);assert.equal(d.y,c.route.depth);assert(Math.abs(d.z-c.route.startZ-c.escort.formation[i][1]-c.route.speed/60)<1e-8);}
 assert(s.dolphins[0].reaction>0);assert.equal(s.strikes,1);
});
test('configured 150-second distance journey completes only after the clean-water section',()=>{
 const s=new DolphinRescueState();step(s,149,s=>{for(const o of s.obstacles)if(o.active)o.x=8;});assert.equal(s.status,'running');assert(s.progress>.99);step(s,2,s=>{for(const o of s.obstacles)if(o.active)o.x=8;});assert.equal(s.status,'complete');assert.equal(s.progress,1);assert(s.spawned>12);assert(s.obstacles.length<=6);
 const distance=s.distance;step(s,5);assert.equal(s.distance,distance);
});
test('a single obstruction registers one strike for the entire dolphin group; third obstruction fails',()=>{
 const s=new DolphinRescueState();for(let i=0;i<3;i++){const o={struck:false};s.time+=2;assert(s.hit(o,s.dolphins[0]));assert.equal(s.hit(o,s.dolphins[1]),false);assert.equal(s.strikes,i+1);}
 assert.equal(s.status,'failed');const d=s.distance;step(s,3);assert.equal(s.distance,d);
});
test('uncleared litter actually intersects the moving dolphins, with a forgiving global cooldown',()=>{
 const s=new DolphinRescueState();step(s,50);assert.equal(s.status,'failed');assert.equal(s.strikes,3);assert(s.dolphins.some(d=>d.reaction>0));
});
test('cleared route threshold uses the whole object extent and vertical corridor',()=>{
 const o={x:5,y:c.route.depth,radius:1.4,halfHeight:1};assert.equal(routeClear(o),false);o.x=5.3;assert.equal(routeClear(o),true);o.x=0;o.y+=3;assert.equal(routeClear(o),true);
});
test('GUP contact pushes in applied direction, respects mass/cooldown, then drag settles',()=>{
 const s=new DolphinRescueState();s.spawn();const o=s.obstacles[0];o.x=0;const heavy={...o,mass:3};const contact={nx:-1,nz:0,impact:2};assert(pushDebris(o,contact,0));assert(pushDebris(heavy,contact,0));assert(o.vx>heavy.vx);assert.equal(pushDebris(o,contact,.05),false);assert(o.x<1);s.nextSpawn=Infinity;step(s,15);assert(o.vx<.01);assert(o.x>1);assert(Math.abs(o.vz)<.01);
});
test('initial teaching object is lightweight, schedule alternates sides, pool remains bounded and replay resets',()=>{
 const s=new DolphinRescueState();step(s,6.1);assert.equal(s.spawned,1);assert.equal(s.obstacles[0].kind,'box');assert.equal(s.obstacles[0].mass,.65);assert(s.obstacles[0].x>0);step(s,11,s=>{for(const o of s.obstacles)if(o.active)o.x=8;});assert.equal(s.spawned,2);assert(s.obstacles.find(o=>o.active&&o.side<0));
 step(s,140,s=>{for(const o of s.obstacles)if(o.active)o.x=8;});assert(s.obstacles.filter(o=>o.active).length<=c.debris.capacity);s.reset();assert.equal(s.strikes,0);assert.equal(s.distance,0);assert.equal(s.spawned,0);assert.equal(s.status,'running');assert(s.obstacles.every(o=>!o.active));
});

test('shared controller traverses the entire flat mission without invisible world terrain',async()=>{
 const {SubmarineController}=await import('../src/vehicles/SubmarineController.js'),{CollisionWorld}=await import('../src/collision/CollisionWorld.js'),{InteractionSurfaces}=await import('../src/effects/InteractionSurfaces.js'),{vehicleById}=await import('../src/config/vehicleConfig.js'),{collisionConfig}=await import('../src/config/collisionConfig.js'),{heightAt}=await import('../src/environment/terrainMath.js');
 const sub=new SubmarineController(),flat=()=>0,definition=vehicleById('gup-b'),surfaces=new InteractionSurfaces(null,{layout:{records:[]}},{});sub.ground=flat;sub.collisionProxy=definition.collision;sub.selectVehicle('gup-b',definition.movement,definition);sub.collisionWorld=new CollisionWorld(surfaces,flat);Object.assign(sub.position,{x:10,y:c.route.depth,z:c.route.startZ});
 let legacyMax=-Infinity;const dt=1/60,decay=Math.exp(-collisionConfig.driftDrag*dt);for(let i=0;i<c.route.length/c.route.speed/dt;i++){sub.collisionDrift.z+=c.route.speed/decay;sub.update(dt,{thrust:0,turn:0,rise:0,boost:false});sub.collisionDrift.z-=c.route.speed;legacyMax=Math.max(legacyMax,heightAt(sub.position.x,sub.position.z));assert.equal(sub.position.y,c.route.depth);assert.equal(sub.collisionContact,null);}
 assert(legacyMax>c.route.depth);assert(Math.abs(sub.position.z-(c.route.startZ+c.route.length))<.01);
});
test('one real GUP bump launches debris away and it clears after contact ends',async()=>{
 const {SubmarineController}=await import('../src/vehicles/SubmarineController.js'),{CollisionWorld}=await import('../src/collision/CollisionWorld.js'),{InteractionSurfaces}=await import('../src/effects/InteractionSurfaces.js'),{vehicleById}=await import('../src/config/vehicleConfig.js');
 const s=new DolphinRescueState();s.spawn();s.nextSpawn=Infinity;const o=s.obstacles[0];Object.assign(o,{x:0,z:0,targetX:0});const surfaces=new InteractionSurfaces(null,{layout:{records:[]}},{}),sub=new SubmarineController(),definition=vehicleById('gup-b');sub.ground=()=>0;sub.collisionProxy=definition.collision;sub.selectVehicle('gup-b',definition.movement,definition);sub.heading=Math.PI/2;Object.assign(sub.position,{x:-5,y:c.route.depth,z:0});const proxy={rx:o.radius,ry:o.halfHeight,rz:o.radius,radius:o.radius,x:o.x,y:o.y,z:o.z,solid:true,surface:'rock'};surfaces.add(proxy);sub.collisionWorld=new CollisionWorld(surfaces,sub.ground);let hits=0,contactX=0;sub.collisionWorld.onImpact=contact=>{if(!hits&&pushDebris(o,contact,s.time)){hits++;contactX=o.x;}};
 const dt=1/60;for(let i=0;i<300&&!hits;i++){s.update(dt);Object.assign(proxy,{x:o.x,z:o.z});surfaces.grid.move(proxy);sub.update(dt,{thrust:1,turn:0,rise:0,boost:false});}
 assert.equal(hits,1);assert(o.vx>0);assert(!routeClear(o));step(s,5);assert(routeClear(o));assert(o.x>contactX+5);assert.equal(hits,1);
});
test('stationary GUP reflects incoming drifting debris; resting overlaps add no energy',()=>{
 const s=new DolphinRescueState();s.spawn();const o=s.obstacles[0];Object.assign(o,{vx:-2.1,vz:0});assert(pushDebris(o,{nx:-1,nz:0,impact:0},0));assert(o.vx>0);
 o.lastHit=-Infinity;o.vx=o.vz=0;assert.equal(pushDebris(o,{nx:-1,nz:0,impact:0},1),false);
});
test('every stage leaves a reaction window ahead of the independently moving dolphins',()=>{
 for(const stage of c.debris.stages)assert(stage.reaction*c.route.speed>Math.max(...c.debris.types.map(t=>t.radius))*2);
});
test('mission camera obstruction sweep uses the flat bay rather than exploration hills',async()=>{
 const {CameraObstacles}=await import('../src/camera/CameraObstacles.js'),{InteractionSurfaces}=await import('../src/effects/InteractionSurfaces.js'),{cameraConfig}=await import('../src/config/cameraConfig.js');
 const surfaces=new InteractionSurfaces(null,{layout:{records:[]}},{}),obstacles=new CameraObstacles(surfaces,()=>0);
 for(let z=c.route.startZ;z<c.route.startZ+c.route.length;z+=2){const pivot={x:0,y:c.route.depth+.6,z},camera={x:-6,y:c.route.depth+10,z:z-34};assert.equal(obstacles.limit(pivot,camera,cameraConfig),1);}
});

test('rising and diving GUP contacts rebound debris vertically as well as sideways',()=>{
 for(const ny of [-1,1]){const s=new DolphinRescueState();s.spawn();s.nextSpawn=Infinity;const o=s.obstacles[0];o.x=0;assert(pushDebris(o,{nx:0,ny,nz:0,impact:3},0));assert(o.vy*ny<0);step(s,2);assert(routeClear(o));assert(o.y>=o.halfHeight);}
});
