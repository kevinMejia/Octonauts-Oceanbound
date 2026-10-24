import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AnimalMovement} from '../src/marine/AnimalMovement.js';
import {movementForAnimal,animalMovementDefaults} from '../src/config/animalMovementConfig.js';
import {marineAnimals} from '../src/marine/AnimalRegistry.js';
import {MarineDiscovery} from '../src/marine/MarineDiscovery.js';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';
import {vehicles} from '../src/config/vehicleConfig.js';
const far={x:700,y:20,z:700};
const manta=()=>new AnimalMovement(movementForAnimal(marineAnimals.find(d=>d.id==='giant-manta-ray')));
test('each deployed GUP starts full; switching and configuring cannot refill spent charge',()=>{
 const s=new SubmarineController();for(const v of vehicles){s.selectVehicle(v.id,v.movement);assert.equal(s.turbo.charge,100);s.turbo.request(true);s.turbo.step(1,true);assert(s.turbo.charge<100);}
 for(const v of vehicles){s.selectVehicle(v.id,v.movement);const charge=s.turbo.charge;assert(charge<100);s.selectVehicle(v.id,v.movement);assert.equal(s.turbo.charge,charge);}
});
test('all patterns remain finite and contained for ten simulated minutes',()=>{
 for(const pattern of ['stationary','patrol','roaming','migration','circular']){
 const c={...animalMovementDefaults,center:{x:0,y:25,z:0},pattern,waypoints:[[-20,0],[0,20],[20,0],[0,-20]]},m=new AnimalMovement(c);let travel=0,last={...m.position};
 for(let i=0;i<2400;i++){m.update(.25,far);travel+=Math.hypot(m.position.x-last.x,m.position.z-last.z);last={...m.position};assert(Math.hypot(last.x,last.z)<=c.habitatRadius+.001);assert(Number.isFinite(m.heading));assert(m.speed<=c.maxSpeed);}
 assert(travel>10,pattern);
 }
});
test('manta cruises above A, escapes above B, and remains slower than R',()=>{
 const m=manta();m.update(10,far);assert(m.speed>8.64&&m.speed<11.2);m.update(.5,{...m.position,x:m.position.x-18});assert(m.escapeLeft>0);assert(m.speed>10.2);assert(m.config.escapeSpeed>12.72&&m.config.escapeSpeed<16.8);
 for(let i=0;i<100;i++)m.update(.05,{...m.position,x:m.position.x-18});assert.equal(m.escapeLeft,0);assert(m.cooldown>0);
});
test('a waiting slow GUP intercepts manta inside the discovery radius without repeated notifications',()=>{
 const m=manta(),d=marineAnimals.find(d=>d.id==='giant-manta-ray');let notices=0;const discovery=new MarineDiscovery({registry:[d],onDiscover:()=>notices++});const waiting={x:m.config.center.x+85,y:28,z:m.config.center.z};let found=false;
 for(let i=0;i<2400;i++){m.update(.05,waiting);discovery.setPosition(d.id,m.position);found=discovery.update(waiting)||found;}
 assert(found);assert.equal(notices,1);assert(discovery.isDiscovered(d.id));assert(m.speed>0);
});
test('passive whale shark ignores proximity, dolphins vary speed and evasion ends',()=>{
 for(const id of ['whale-shark','bottlenose-dolphin']){const m=new AnimalMovement(movementForAnimal(marineAnimals.find(d=>d.id===id)));const speeds=[];for(let i=0;i<1200;i++){m.update(.05,i<100?{...m.position}:far);speeds.push(m.speed);}assert.equal(m.escapeLeft,0);assert(Math.max(...speeds.slice(300))-Math.min(...speeds.slice(300))>.1);if(id==='whale-shark')assert.equal(m.cooldown,0);}
});
test('swept obstacle bounds stop a swimmer crossing a narrow rock',()=>{
 const rock={x:0,y:25,z:25,rx:2,ry:10,rz:2,solid:true},grid={query(x,z,r,out){out.length=0;out.push(rock);return out;}};
 const m=new AnimalMovement({...animalMovementDefaults,center:{x:0,y:25,z:0},routeRadius:0,pattern:'patrol',waypoints:[[0,60]],footprint:2,habitatRadius:100,maxHabitatDistance:100});m.heading=0;
 for(let i=0;i<600;i++){const before={...m.position};m.update(.05,far,{grid});const p=m.position;assert(Math.hypot(p.x-rock.x,p.z-rock.z)>=4-.001);assert(Math.hypot(p.x-before.x,p.z-before.z)<=m.config.maxSpeed*.05+.001);}
 assert(m.position.z>35,'Steering must make progress around the rock');
});

test('cruise requests respect configured cruising speed, and turbo release restores normal maximum',()=>{
 for(const v of vehicles){const s=new SubmarineController();s.selectVehicle(v.id,v.movement);const input={thrust:1,turn:0,rise:0,cruise:true};for(let i=0;i<300;i++)s.update(1/60,input);assert(Math.abs(s.speed-v.movement.cruisingSpeed)<.01);input.cruise=false;input.boost=true;for(let i=0;i<300;i++)s.update(1/60,input);assert(Math.abs(s.speed-v.movement.maxSpeed*1.8)<.01);input.boost=false;for(let i=0;i<300;i++)s.update(1/60,input);assert(Math.abs(s.speed-v.movement.maxSpeed)<.01);}
});

test('R reaches a fleeing manta sooner than A using the same pursuit controls',()=>{
 const times=[];
 for(const id of ['gup-a','gup-r']){const m=manta();m.update(20,far);const s=new SubmarineController(),v=vehicles.find(v=>v.id===id);s.selectVehicle(id,v.movement);s.position={x:m.position.x-Math.sin(m.heading)*40,y:m.position.y,z:m.position.z-Math.cos(m.heading)*40};s.heading=m.heading;let found=Infinity;
  for(let i=0;i<2400;i++){m.update(1/60,s.position);const desired=Math.atan2(m.position.x-s.position.x,m.position.z-s.position.z),error=Math.atan2(Math.sin(desired-s.heading),Math.cos(desired-s.heading));s.update(1/60,{thrust:1,turn:Math.max(-1,Math.min(1,error*3)),rise:0});if(Math.hypot(s.position.x-m.position.x,s.position.y-m.position.y,s.position.z-m.position.z)<=13){found=i/60;break;}}times.push(found);
 }assert(times[1]<10);assert(times[0]>times[1]+10);
});
