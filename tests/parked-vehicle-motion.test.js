import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {vehicles,vehicleById} from '../src/config/vehicleConfig.js';
import {VehicleUnlocks} from '../src/vehicles/VehicleUnlocks.js';
import {VehicleFleet} from '../src/vehicles/VehicleFleet.js';
import {DiscoveryFleet} from '../src/vehicles/DiscoveryFleet.js';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';
import {CollisionWorld} from '../src/collision/CollisionWorld.js';
import {hullFloor} from '../src/collision/collisionMath.js';
import {SurfaceGrid} from '../src/effects/interactionMath.js';
import {parkedMass} from '../src/vehicles/ParkedVehicleMotion.js';
import {parkedVehicleConfig as config} from '../src/config/parkedVehicleConfig.js';

async function fixture(id='gup-a',{locked=false,ground=()=>0}={}){
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},unlocks=new VehicleUnlocks(vehicles,storage),scene=new T.Scene(),grid=new SurfaceGrid(),surfaces={grid,count:0,solidCount:0,add(s){s.co=Math.cos(s.angle??0);s.si=Math.sin(s.angle??0);s.radius=Math.max(s.rx,s.rz);grid.add(s);this.count++;if(s.solid)this.solidCount++;}};
 const model=id=>({definition:vehicleById(id),group:new T.Group()}),initial=model('gup-b');scene.add(initial.group);let world;
 const fleet=new VehicleFleet({initialId:'gup-b',initialVehicle:initial,load:async id=>model(id),canSelect:id=>unlocks.isUnlocked(id),install:(next,old,id)=>{scene.remove(old.group);scene.add(next.group);world.switched(id);}});
 world=new DiscoveryFleet({registry:vehicles,fleet,unlocks,surfaces,scene,onDiscover(){}});world.placement.ground=ground;if(!locked)unlocks.setOverride(id,true);await world.initialize();const r=world.records.get(id);await world.ensure(r);const native={...r.pose};
 const pose=world.placement.find({x:20,y:0,z:7.9,heading:0,groundClearance:r.groundClearance},r.parkDefinition,{parking:true,ignoreId:id,maxRadius:0});assert(pose);world.setPose(r,pose);
 const sub=new SubmarineController();sub.collisionProxy=vehicleById('gup-b').collision;sub.definition=vehicleById('gup-b');Object.assign(sub.position,{x:r.pose.x,y:r.pose.y+(r.parkDefinition.collision.centerY??0)-(sub.collisionProxy.centerY??0),z:r.pose.z-r.parkDefinition.collision.halfLength-sub.collisionProxy.halfLength-.12});sub.position.y=Math.max(sub.position.y,hullFloor(sub,sub.position.x,sub.position.z,ground));Object.assign(sub.previousPosition,sub.position);
 const contact={surface:'parked-gup',parkedId:id,impact:12,nx:0,ny:0,nz:-1,x:r.pose.x,y:sub.position.y,z:r.pose.z-r.parkDefinition.collision.halfLength};
 return {world,r,sub,contact,unlocks,fleet,surfaces,scene,values,native};
}
function settle(f,hz=60,seconds=4){for(let i=0;i<hz*seconds;i++)f.world.motion.update(1/hz,f.sub);}

test('real collision contacts retain the parked owner and ordinary impacts clear that owner',()=>{
 const grid=new SurfaceGrid(),world=new CollisionWorld({grid,count:0,solidCount:0},()=>-100),sub=new SubmarineController();sub.collisionProxy=vehicleById('gup-b').collision;world.frame={zx:0,zy:0,zz:1,yx:0,yy:1,yz:0};
 world.record(sub,{surface:'parked-gup',parkedId:'gup-a'},0,0,-1,8,0);assert.equal(world.contact.parkedId,'gup-a');world.record(sub,{surface:'rock'},0,0,-1,10,0);assert.equal(world.contact.parkedId,null);
});
test('a bump moves one existing model and its grid proxies, then sleeps without storage writes',async()=>{
 const f=await fixture(),start={...f.r.pose},proxies=[...f.r.proxies],uuid=f.r.vehicle.group.uuid,registry=f.surfaces.grid.cells,saved=JSON.stringify([...f.values]),solids=f.surfaces.solidCount;assert(f.world.push(f.contact,f.sub));settle(f);
 assert(f.r.pose.z>start.z+.3);assert.equal(f.r.vehicle.group.uuid,uuid);assert.deepEqual(f.r.vehicle.group.position.toArray(),[f.r.pose.x,f.r.pose.y,f.r.pose.z]);assert(proxies.every((p,i)=>p===f.r.proxies[i]));assert.equal(f.surfaces.grid.cells,registry);assert.equal(f.surfaces.solidCount,solids);assert.equal(JSON.stringify([...f.values]),saved);assert.equal(f.world.motion.moving.size,0);assert.equal(f.r.pushState.vz,0);assert(f.r.proxies.some(p=>Math.floor(p.z/8)!==Math.floor((p.z-(f.r.pose.z-start.z))/8)));
 let moves=0;const set=f.world.setPose.bind(f.world);f.world.setPose=(...args)=>{moves++;return set(...args);};settle(f);assert.equal(moves,0);
});
test('locked, missing, active, vertical and malformed contacts cannot push a parked vehicle',async()=>{
 const f=await fixture('gup-a',{locked:true});assert.equal(f.world.push(f.contact,f.sub),false);f.unlocks.setOverride('gup-a',true);assert.equal(f.world.push({...f.contact,parkedId:'missing'},f.sub),false);assert.equal(f.world.push({...f.contact,impact:NaN},f.sub),false);assert.equal(f.world.push({...f.contact,nx:0,nz:0,ny:1},f.sub),false);f.r.parked=false;assert.equal(f.world.push(f.contact,f.sub),false);assert.equal(f.world.motion.moving.size,0);
});
test('volume-based weight makes GUP-X harder to push, with bounded speed and per-target cooldown',async()=>{
 const light=await fixture(),heavy=await fixture('gup-x');assert(parkedMass(heavy.r.definition)>parkedMass(light.r.definition));assert(light.world.push(light.contact,light.sub));assert(heavy.world.push(heavy.contact,heavy.sub));assert(heavy.r.pushState.vz<light.r.pushState.vz);assert.equal(light.world.push(light.contact,light.sub),false);settle(light);settle(heavy);assert(heavy.r.pose.z-7.9<light.r.pose.z-7.9);
 assert(light.world.push({...light.contact,impact:1e5,x:light.r.pose.x+20},light.sub));assert(Math.hypot(light.r.pushState.vx,light.r.pushState.vz)<=config.maxSpeed+1e-9);assert(Math.abs(light.r.pushState.spin)<=config.maxSpin);
});
test('off-centre bumps turn gently and drag converges similarly at 30 and 120 Hz',async()=>{
 const a=await fixture(),b=await fixture();a.contact.x+=1;b.contact.x+=1;a.world.push(a.contact,a.sub);b.world.push(b.contact,b.sub);settle(a,30);settle(b,120);assert(Math.abs(a.r.pose.heading)>.01);assert(Math.abs(a.r.pose.z-b.r.pose.z)<.005);assert(Math.abs(a.r.pose.heading-b.r.pose.heading)<.002);
});
test('parked motion stops at static scenery and another parked GUP rather than interpenetrating',async()=>{
 const f=await fixture(),start=f.r.pose.z;f.surfaces.add({x:f.r.pose.x,y:2,z:start+f.r.parkDefinition.collision.halfLength+.16,rx:20,ry:10,rz:.05,surface:'rock',solid:true});f.world.push(f.contact,f.sub);settle(f);assert(f.r.pose.z<start+.15);assert(f.world.placement.clear(f.r.pose,f.r.parkDefinition,f.r.id,null));
 const other=await fixture();other.unlocks.setOverride('gup-x',true);const r=other.world.records.get('gup-x');await other.world.ensure(r);other.world.setPose(r,{x:other.r.pose.x,y:.69,z:other.r.pose.z+other.r.parkDefinition.collision.halfLength+r.parkDefinition.collision.halfLength+.15,heading:0});const resting={...r.pose};other.world.push(other.contact,other.sub);settle(other);assert(other.world.placement.clear(other.r.pose,other.r.parkDefinition,other.r.id,null));assert.deepEqual(r.pose,resting);
});
test('ground support follows slopes; remote or selected GUPs stop; session poses survive switching only',async()=>{
 const f=await fixture('gup-x',{ground:(x,z)=>z*.1});f.world.push(f.contact,f.sub);settle(f);assert(f.r.pose.z>7.9);assert(Math.abs(f.r.pose.pitch+Math.atan(.1))<.001);assert(f.r.pose.y>=hullFloor({...f.sub,position:f.r.pose,heading:f.r.pose.heading,pitch:f.r.pose.pitch,bank:f.r.pose.bank,collisionProxy:f.r.pushState.body.collisionProxy},f.r.pose.x,f.r.pose.z,f.world.placement.ground));
 const saved={...f.r.pose};f.world.push(f.contact,f.sub);await f.fleet.select('gup-x');assert.equal(f.world.motion.moving.size,0);await f.fleet.select('gup-b');assert.deepEqual(f.r.pose,saved);const fresh=await fixture('gup-x',{ground:(x,z)=>z*.1});assert(fresh.r.pose.z<f.r.pose.z);
 const distant=await fixture();distant.world.push(distant.contact,distant.sub);distant.sub.position.x+=200;settle(distant);assert.equal(distant.world.motion.moving.size,0);assert.equal(distant.r.pose.z,7.9);
});
test('a parked hull cannot translate into the active player hull',async()=>{
 const f=await fixture(),start=f.r.pose.z;f.sub.position.z=start+f.r.parkDefinition.collision.halfLength+f.sub.collisionProxy.halfLength+.1;f.world.push(f.contact,f.sub);settle(f);assert(f.r.pose.z-start<.15);assert(f.world.motion.clearsPlayer(f.r,f.r.pose,f.sub));
});
test('all eight parked GUPs can wake and settle with fixed proxies/models and no dormant pose work',async()=>{
 const f=await fixture(),records=[];let i=0;
 for(const definition of vehicles.filter(v=>v.id!=='gup-b')){
  f.unlocks.setOverride(definition.id,true);const r=f.world.records.get(definition.id);await f.world.ensure(r);f.world.setPose(r,{x:20+i%4*12,y:r.groundClearance+r.heightLift,z:20+Math.floor(i/4)*12,heading:0,pitch:0,bank:0});records.push({r,pose:{...r.pose},model:r.vehicle.group.uuid,proxies:[...r.proxies]});i++;
 }
 Object.assign(f.sub.position,{x:30,y:2,z:0});for(const {r} of records)assert(f.world.push({...f.contact,parkedId:r.id,x:r.pose.x,z:r.pose.z-2},f.sub));assert.equal(f.world.motion.moving.size,8);const count=f.surfaces.count,solids=f.surfaces.solidCount;settle(f);
 assert.equal(f.world.motion.moving.size,0);assert.equal(f.surfaces.count,count);assert.equal(f.surfaces.solidCount,solids);assert.equal(f.scene.children.length,9);for(const {r,pose,model,proxies} of records){assert(r.pose.z>pose.z);assert.equal(r.vehicle.group.uuid,model);assert(proxies.every((p,i)=>p===r.proxies[i]));assert(f.world.placement.clear(r.pose,r.parkDefinition,r.id,null));}
});
