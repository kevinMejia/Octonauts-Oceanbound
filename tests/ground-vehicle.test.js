import test from 'node:test';
import assert from 'node:assert/strict';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';
import {TrackedGroundController} from '../src/vehicles/TrackedGroundController.js';
import {vehicleById,vehicles} from '../src/config/vehicleConfig.js';
import {VehicleUnlocks} from '../src/vehicles/VehicleUnlocks.js';
import {hullFloor} from '../src/collision/collisionMath.js';
import {CollisionWorld} from '../src/collision/CollisionWorld.js';
import {SurfaceGrid} from '../src/effects/interactionMath.js';
import {towAnchor} from '../src/rescue/towMath.js';
const input={thrust:0,turn:0,rise:0,boost:false};
function make(ground=()=>0){const s=new SubmarineController(),v=vehicleById('gup-x');s.collisionProxy=v.collision;s.selectVehicle(v.id,v.movement,v);s.groundController=new TrackedGroundController(v.ground,ground);s.position={x:0,y:.65,z:0};s.groundController.align(s);return s;}
function run(s,controls,seconds=3,hz=60){for(let i=0;i<seconds*hz;i++)s.update(1/hz,{...input,...controls});}
test('tracked drive accelerates, brakes, reverses, steers and ignores vertical input',()=>{const s=make();run(s,{thrust:1,rise:1});assert(s.speed>10);assert(Math.abs(s.position.y-.65)<1e-8);run(s,{thrust:-1,brakeReverse:true},6);assert(s.speed<-3.7);const h=s.heading;run(s,{thrust:-1,turn:1});assert(s.heading<h);run(s,{},5);assert(Math.abs(s.speed)<.001);assert.equal(s.vertical,0);});
test('ground turbo uses shared energy and infinite reward',()=>{const s=make();run(s,{thrust:1,boost:true},4);assert(s.speed>19);assert(s.turbo.charge<70);s.turbo.setInfinite(true);run(s,{thrust:1,boost:true},30);assert.equal(s.turbo.charge,100);assert(s.turbo.active);assert(Math.abs(s.position.y-.65)<1e-8);});
test('slope pitch, clearance, steep rejection and frame independence',()=>{const slope=(x,z)=>z*.15;const s=make(slope);run(s,{thrust:1});assert(s.pitch<0);assert(s.position.y>=hullFloor(s,s.position.x,s.position.z,slope)-.001);const steep=make((x,z)=>Math.max(0,z-3)*2);run(steep,{thrust:1,boost:true},10);assert(steep.position.z<3.1);const a=make(),b=make();run(a,{thrust:1,turn:.3},3,30);run(b,{thrust:1,turn:.3},3,120);assert(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)<.05);});
test('swept obstacles block turbo without lift and track speeds reflect steering',()=>{const s=make(),grid=new SurfaceGrid();grid.add({x:0,y:1,z:15,rx:8,ry:5,rz:1,radius:8,solid:true,surface:'rock'});s.collisionWorld=new CollisionWorld({grid,count:1,solidCount:1},()=>0);run(s,{thrust:1,boost:true,rise:1},5);assert(s.position.z<12);assert(s.position.y<1);assert.equal(s.vertical,0);const turn=make();run(turn,{thrust:1,turn:.7});assert.notEqual(turn.groundController.leftSpeed,turn.groundController.rightSpeed);});
test('effective availability keeps override separate from earned progress and reload',()=>{const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},u=new VehicleUnlocks(vehicles,storage);assert(!u.isUnlocked('gup-x'));u.setOverride('gup-x',true);assert(u.isUnlocked('gup-x'));assert(!u.ids.has('gup-x'));u.unlock('gup-a');u.setOverride('gup-x',false);assert(!u.isUnlocked('gup-x'));for(const v of vehicles.filter(v=>!v.finalReward))u.unlock(v.id);assert(!u.ids.has('gup-x'));u.checkFinal({x:180,y:20,z:100});assert(u.ids.has('gup-x'));const reload=new VehicleUnlocks(vehicles,storage);assert(reload.isUnlocked('gup-x'));reload.setOverride('gup-x',false);assert(reload.isUnlocked('gup-x'));reload.reset();assert(!reload.isUnlocked('gup-x'));});
test('ground switching preserves shared turbo state and restores swimming and rear tow point',()=>{const s=make();s.turbo.charge=42;s.towAttachment=vehicleById('gup-x').towing.attachment;const anchor=towAnchor(s);assert(anchor.z<s.position.z);const b=vehicleById('gup-b');s.selectVehicle(b.id,b.movement,b);assert(!s.groundController);run(s,{rise:1},2);assert(s.position.y>5);const x=vehicleById('gup-x');s.selectVehicle(x.id,x.movement,x);assert.equal(s.turbo.charge,42);assert(s.position.y<1);});

import {heightAt} from '../src/environment/terrainMath.js';
import {gupXGround} from '../src/config/groundVehicleConfig.js';
test('tracked steering pivots at rest and can turn away from a blocked wall',()=>{
 const s=make(),grid=new SurfaceGrid();grid.add({x:0,y:1,z:15,rx:8,ry:5,rz:1,radius:8,solid:true,surface:'rock'});s.collisionWorld=new CollisionWorld({grid,count:1,solidCount:1},()=>0);
 run(s,{thrust:1},5);const z=s.position.z;assert(z<12);run(s,{turn:1},3);assert(s.heading>1.5);assert(s.groundController.leftSpeed>0);assert(s.groundController.rightSpeed<0);run(s,{thrust:1},2);assert(Math.hypot(s.position.x,s.position.z-z)>2);assert.equal(s.vertical,0);
 const idle=make();run(idle,{turn:1},2);assert(idle.heading>1);assert(Math.hypot(idle.position.x,idle.position.z)<1e-8);
});
test('actual starting-biome hillside climbs with the real terrain collision solver',()=>{
 const s=make(heightAt),x=136,z=127,e=.1;Object.assign(s.position,{x,z});s.heading=Math.atan2(heightAt(x+e,z)-heightAt(x-e,z),heightAt(x,z+e)-heightAt(x,z-e));s.groundController.align(s);
 s.collisionWorld=new CollisionWorld({grid:new SurfaceGrid(),count:0,solidCount:0},heightAt);const y=s.position.y;
 run(s,{thrust:1},3);assert(Math.hypot(s.position.x-x,s.position.z-z)>8);assert(s.position.y>y+3);assert.equal(s.vertical,0);
});
test('40 degree sand is traversable, but over-limit cliffs remain blocked under turbo',()=>{
 for(const boost of [false,true]){const slope=Math.tan(40*Math.PI/180),h=(x,z)=>z*slope,s=make(h);s.collisionWorld=new CollisionWorld({grid:new SurfaceGrid(),count:0,solidCount:0},h);run(s,{thrust:1,boost},3);assert(s.position.z>10);assert(s.position.y>=hullFloor(s,s.position.x,s.position.z,h)-.001);assert.equal(s.vertical,0);}
 const cliff=make((x,z)=>Math.max(0,z-3)*Math.tan(gupXGround.maxSlope+.15));run(cliff,{thrust:1,boost:true},4);assert(cliff.position.z<3.2);
});

test('GUP-X reaches its increased driving and turbo maxima with shared registry tuning',()=>{
 const v=vehicleById('gup-x'),s=make();assert.equal(v.movement.maxSpeed,gupXGround.maxSpeed);assert.equal(v.preloadAtStart,true);
 run(s,{thrust:1},6);assert(Math.abs(s.speed-14.4)<.01);
 run(s,{thrust:-1,brakeReverse:true},8);assert(Math.abs(s.speed+4.8)<.01);
 s.turbo.setInfinite(true);run(s,{thrust:1,boost:true},6);assert(Math.abs(s.speed-27.36)<.01);assert.equal(s.vertical,0);
});

test('moving turns are substantially tighter while parked pivoting stays controlled',()=>{for(const boost of [false,true]){const s=make();s.speed=boost?gupXGround.maxSpeed*1.9:gupXGround.maxSpeed;s.steer=1;let travelled=0;for(let i=0;i<120;i++){const x=s.position.x,z=s.position.z;s.update(1/60,{...input,thrust:1,turn:1,boost});travelled+=Math.hypot(s.position.x-x,s.position.z-z);}const radius=travelled/s.heading;assert(radius<(boost?21:12),`turn radius ${radius}`);assert(s.groundController.leftSpeed>s.groundController.rightSpeed);}const pivot=make();pivot.steer=1;run(pivot,{turn:1},2);assert(Math.abs(pivot.heading-1.6)<1e-8);assert(Math.hypot(pivot.position.x,pivot.position.z)<1e-8);});
test('reverse mirrors both steering directions, braking keeps forward steering until backing',()=>{for(const turn of [-1,1]){const forward=make(),reverse=make();forward.speed=4.8;reverse.speed=-4.8;forward.steer=reverse.steer=turn;forward.update(1/60,{...input,thrust:1,turn});reverse.update(1/60,{...input,thrust:-1,turn});assert(forward.heading*turn>0);assert(reverse.heading*turn<0);assert(reverse.groundController.leftSpeed<0&&reverse.groundController.rightSpeed<0);const braking=make();braking.speed=5;braking.steer=turn;braking.update(1/60,{...input,thrust:-1,brakeReverse:true,turn});assert(braking.speed>0);assert(braking.heading*turn>0);run(braking,{thrust:-1,brakeReverse:true,turn},3);const h=braking.heading;assert(braking.speed<0);braking.update(1/60,{...input,thrust:-1,turn});assert((braking.heading-h)*turn<0);}});
