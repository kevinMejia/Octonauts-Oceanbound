import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {vehicles} from '../src/config/vehicleConfig.js';
import {VehicleUnlocks,UNLOCK_KEY} from '../src/vehicles/VehicleUnlocks.js';
import {VehicleFleet} from '../src/vehicles/VehicleFleet.js';
import {DiscoveryFleet} from '../src/vehicles/DiscoveryFleet.js';
import {FleetPlacement,fleetAnchor} from '../src/vehicles/fleetPlacement.js';
import {SurfaceGrid} from '../src/effects/interactionMath.js';
import {hullFrame,sweepHull} from '../src/collision/collisionMath.js';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';

const storage=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
test('B is always available, invalid unlock data is ignored and future GUPs default locked',()=>{
 for(const raw of [null,'broken','{}','{"unlocked":["gup-a","unknown",null,3]}']){
  const saved=storage();if(raw)saved.setItem(UNLOCK_KEY,raw);const state=new VehicleUnlocks(vehicles,saved);
  assert.equal(state.isUnlocked('gup-b'),true);assert.equal(state.isUnlocked('gup-r'),false);assert.equal(state.isUnlocked('unknown'),false);
 }
 const saved=storage(),state=new VehicleUnlocks(vehicles,saved);saved.setItem('audio','keep');assert.equal(state.unlock('gup-a'),true);assert.equal(state.unlock('gup-a'),false);
 const next=new VehicleUnlocks([...vehicles,{id:'future-gup'}],saved);assert.equal(next.isUnlocked('gup-a'),true);assert.equal(next.isUnlocked('future-gup'),false);assert.equal(saved.getItem('audio'),'keep');
});
test('blocked storage preserves session unlocks and notifies once',()=>{
 const state=new VehicleUnlocks(vehicles,{getItem(){throw Error();},setItem(){throw Error();}});let changes=0;state.subscribe(()=>changes++);
 state.unlock('gup-r');state.unlock('gup-r');assert.equal(state.saved,false);assert.equal(state.isUnlocked('gup-r'),true);assert.equal(changes,1);
});
test('locked vehicles cannot be selected through Fleet, including a pending unlock reset',async()=>{
 const state=new VehicleUnlocks(vehicles,storage());let installed=0,release;
 const fleet=new VehicleFleet({initialId:'gup-b',initialVehicle:{},canSelect:id=>state.isUnlocked(id),load:async()=>({}),prepare:()=>new Promise(r=>release=r),install:()=>installed++});
 await assert.rejects(fleet.select('gup-a'),/Discover/);assert.equal(fleet.cache.has('gup-a'),false);
 state.unlock('gup-a');const pending=fleet.select('gup-a');await new Promise(r=>setTimeout(r,0));state.reset();release();assert.equal(await pending,false);assert.equal(installed,0);assert.equal(fleet.activeId,'gup-b');
});
function makeSurfaces(){const grid=new SurfaceGrid();return {grid,count:0,solidCount:0,add(s){s.co=Math.cos(s.angle??0);s.si=Math.sin(s.angle??0);s.radius=Math.max(s.rx,s.rz);grid.add(s);this.count++;if(s.solid)this.solidCount++;}};}
async function fixture(registry=vehicles.slice(0,3)){
 const scene=new T.Scene(),surfaces=makeSurfaces(),unlocks=new VehicleUnlocks(vehicles,storage()),loaded=new Map();let discoveries=0,blocked=false,world;
 const model=id=>{const vehicle={id,group:new T.Group()};vehicle.group.add(new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()));loaded.set(id,vehicle);return vehicle;};
 const initial=model('gup-b');scene.add(initial.group);
 const fleet=new VehicleFleet({initialId:'gup-b',initialVehicle:initial,load:async id=>model(id),canSelect:id=>unlocks.isUnlocked(id),install:(next,old,id)=>{scene.remove(old.group);scene.add(next.group);world.switched(id);}});
 await fleet.get('gup-a');await fleet.get('gup-r');if(registry.some(v=>v.id==='gup-x'))await fleet.get('gup-x');
 world=new DiscoveryFleet({registry,fleet,unlocks,surfaces,scene,onDiscover(){discoveries++;},blocked:()=>blocked});await world.initialize();
 return {scene,surfaces,unlocks,fleet,world,loaded,get discoveries(){return discoveries;},block:value=>blocked=value};
}
test('cached vehicles are parked or active with no cloned groups, and switching returns the old GUP home',async()=>{
 const f=await fixture();assert.equal(f.scene.children.length,3);assert.equal(f.world.records.get('gup-b').parked,false);assert.equal(f.world.records.get('gup-a').parked,true);
 for(const id of ['gup-a','gup-r','gup-b','gup-a']){
  f.unlocks.unlock(id);await f.fleet.select(id);assert.equal(f.world.records.get(id).parked,false);assert.equal(f.scene.children.length,3);
  for(const record of f.world.records.values()){
   assert.equal(record.vehicle,f.loaded.get(record.id));assert.equal(f.scene.children.filter(g=>g===record.vehicle.group).length,1);
   assert.equal(record.proxies.every(p=>p.solid),record.id!==id);
   if(record.id!==id)assert.deepEqual(record.vehicle.group.position.toArray(),[record.pose.x,record.pose.y,record.pose.z]);
  }
 }
 assert.equal(f.loaded.size,3);assert.equal(f.surfaces.grid.cells.size>0,true);
});
test('contact unlocks once, modal blocking prevents simultaneous triggers, and closure never relocks',async()=>{
 const f=await fixture(),r=f.world.records.get('gup-a'),sub=new SubmarineController();sub.collisionProxy=vehicles[1].collision;
 const approach=()=>{Object.assign(sub.position,{x:r.pose.x,y:r.pose.y+.5,z:r.pose.z+3});Object.assign(sub.previousPosition,{...sub.position,z:r.pose.z+8});};
 approach();f.block(true);assert.equal(f.world.update(sub),false);assert.equal(f.discoveries,0);f.block(false);
 assert.equal(f.world.update(sub),true);assert.equal(f.discoveries,1);assert.equal(f.unlocks.isUnlocked('gup-a'),true);assert.equal(f.world.activeDiscovery,'gup-a');
 assert.equal(f.world.update(sub),false);f.world.finishDiscovery();approach();assert.equal(f.world.update(sub),false);assert.equal(f.discoveries,1);assert.equal(f.fleet.activeId,'gup-b');assert.equal(r.proxies.some(p=>p.triggerEnabled),false);
 const home=fleetAnchor(vehicles[0],true);assert.equal(r.pose.x,home.x);assert.equal(r.pose.z,home.z);
});
test('relative anchors follow the Octopod and safe placement respects solids and a returning vehicle slot',()=>{
 const a=fleetAnchor(vehicles[0],false,{x:300,y:0,z:200});assert.equal(a.x,324);assert.equal(a.z,248);
 const surfaces=makeSurfaces();surfaces.add({x:180,y:4,z:137,rx:3,ry:5,rz:3,solid:true});const placement=new FleetPlacement(surfaces.grid);
 const pose=placement.find({x:180,y:3,z:137,heading:0},vehicles[1]);assert.ok(pose);assert.ok(Math.hypot(pose.x-180,pose.z-137)>=4);assert.ok(placement.clear(pose,vehicles[1]));
 surfaces.add({x:200,y:4,z:137,rx:3,ry:5,rz:3,parkedId:'old-gup',solid:false});
 const next=placement.find({x:200,y:3,z:137,heading:0},vehicles[1],{returningId:'old-gup'});assert.ok(Math.hypot(next.x-200,next.z-137)>=4);
});
test('moving parking proxies updates their existing spatial cells without rebuilding the world index',()=>{
 const grid=new SurfaceGrid(),p={x:0,z:0,radius:1,solid:true},q={x:100,z:0,radius:1,solid:true};grid.add(p);grid.add(q);const cells=grid.cells,out=[];
 p.x=30;grid.move(p);assert.equal(grid.cells,cells);assert.equal(grid.query(0,0,2,out).length,0);assert.deepEqual(grid.query(30,0,2,out),[p]);assert.deepEqual(grid.query(100,0,2,out),[q]);
});

test('new fleet entries are locked, lazy, uniquely parked and use bounds-based collision proxies',()=>{
 const ids=new Set(),homes=new Set();for(const v of vehicles){assert.ok(!ids.has(v.id));ids.add(v.id);const key=v.parking.spawn.offset.join(',');assert.ok(!homes.has(key));homes.add(key);assert.ok(v.collision.radius>0&&v.collision.halfLength>0);if(!['gup-a','gup-b','gup-r'].includes(v.id)){assert.equal(v.preloadAtStart,!!v.finalReward);assert.equal(v.unlockedByDefault,false);assert.equal(v.discovery.enabled,!v.finalReward);}}
});
test('nearby new GUPs load once, distant parked GPU resources release once, and active vehicles remain visible',async()=>{
 const f=await fixture(),definition={...vehicles[0],id:'future',parking:{...vehicles[0].parking,spawn:{offset:[90,0,50]}},discovery:{...vehicles[0].discovery,spawn:{offset:[120,0,100]}}};let releases=0;
 const world=new DiscoveryFleet({registry:[definition],fleet:f.fleet,unlocks:f.unlocks,surfaces:f.surfaces,scene:f.scene,onDiscover(){},release:()=>releases++});
 const sub=new SubmarineController();sub.collisionProxy=vehicles[1].collision;const r=world.records.get('future');Object.assign(sub.position,{x:r.pose.x,y:r.pose.y+20,z:r.pose.z+40});Object.assign(sub.previousPosition,sub.position);world.update(sub);await new Promise(r=>setTimeout(r,0));assert.ok(r.vehicle);const model=r.vehicle;world.update(sub);assert.equal(r.vehicle,model);
 Object.assign(sub.position,{x:900,z:900});Object.assign(sub.previousPosition,sub.position);world.visibilityAt=0;world.update(sub);assert.equal(model.group.visible,false);assert.equal(releases,1);world.visibilityAt=0;world.update(sub);assert.equal(releases,1);
 world.switched('future');world.visibilityAt=0;world.update(sub);assert.equal(model.group.visible,true);
});

test('wide GUP hulls retain their measured front clearance while sweeping side impacts',()=>{
 const frame=hullFrame({heading:0},{}),hit={},a={x:0,y:0,z:0};
 const front={x:0,y:0,z:4.3,rx:.2,ry:.2,rz:.2};assert.equal(sweepHull(a,0,0,0,front,frame,3.5,1,0,hit,0,2.4),false);
 const side={x:5,y:0,z:0,rx:.2,ry:2,rz:2};assert.equal(sweepHull(a,10,0,0,side,frame,3.5,1,0,hit,0,2.4),true);assert.ok(hit.t<.2);
});

test('returning parked models stay hidden through GPU restoration, including an unlock sync',async()=>{
 const f=await fixture(),r=f.world.records.get('gup-a'),sub=new SubmarineController();sub.collisionProxy=vehicles[1].collision;Object.assign(sub.position,{x:900,y:20,z:900});Object.assign(sub.previousPosition,sub.position);f.world.update(sub);assert.equal(r.evicted,true);assert.equal(r.vehicle.group.visible,false);
 let finish;f.world.prepare=vehicle=>vehicle===r.vehicle?new Promise(resolve=>finish=resolve):Promise.resolve();Object.assign(sub.position,{x:r.pose.x,y:r.pose.y+20,z:r.pose.z+30});Object.assign(sub.previousPosition,sub.position);f.world.visibilityAt=0;f.world.update(sub);assert.equal(r.restoring,true);f.world.sync();assert.equal(r.vehicle.group.visible,false);finish();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(r.evicted,false);assert.equal(r.vehicle.group.visible,true);
});

test('selector-prepared models are tracked for parking and GPU release even if selection is cancelled',async()=>{
 const f=await fixture(),definition={...vehicles[0],id:'saved-unlock',parking:{...vehicles[0].parking,spawn:{offset:[90,0,50]}},discovery:{...vehicles[0].discovery,spawn:{offset:[120,0,100]}}};let released=0;
 const world=new DiscoveryFleet({registry:[definition],fleet:f.fleet,unlocks:f.unlocks,surfaces:f.surfaces,scene:f.scene,onDiscover(){},release:()=>released++}),vehicle={definition,group:new T.Group()},sub=new SubmarineController();sub.collisionProxy=vehicles[1].collision;world.prepared(vehicle);const record=world.records.get(definition.id);assert.equal(record.vehicle,vehicle);assert.equal(record.parked,true);assert.equal(vehicle.group.visible,false);assert.equal(f.fleet.activeId,'gup-b');
 Object.assign(sub.position,{x:900,y:30,z:900});Object.assign(sub.previousPosition,sub.position);world.update(sub);assert.equal(released,1);assert.equal(record.evicted,true);world.prepared(vehicle);world.visibilityAt=0;world.update(sub);assert.equal(released,2);assert.equal(f.scene.children.filter(g=>g===vehicle.group).length,1);
});
import {fleetResidencyConfig as residency} from '../src/config/fleetParkingConfig.js';

test('brief visibility-boundary crossings retain GPU data without changing visibility',async t=>{
 let clock=10000;t.mock.method(performance,'now',()=>clock);
 const f=await fixture(),r=f.world.records.get('gup-a');f.block(true);let releases=0,prepares=0;
 f.world.release=v=>{if(v===r.vehicle)releases++;};f.world.prepare=async v=>{if(v===r.vehicle)prepares++;};
 const tick=d=>{clock+=601;f.world.visibilityAt=0;f.world.update({position:{x:r.pose.x+d,y:30,z:r.pose.z}});};
 for(let i=0;i<6;i++){tick(159);assert.equal(r.vehicle.group.visible,true);tick(161);assert.equal(r.vehicle.group.visible,false);assert.equal(r.distanceVisible,false);assert.equal(!!r.evicted,false);}
 tick(159);assert.equal(r.outsideSince,undefined);assert.equal(releases,0);assert.equal(prepares,0);
});
test('hidden retention expires, farther departure releases immediately, active vehicles never evict',async t=>{
 let clock=10000;t.mock.method(performance,'now',()=>clock);
 const f=await fixture(),r=f.world.records.get('gup-a');f.block(true);let releases=0;f.world.release=v=>{if(v===r.vehicle)releases++;};
 const tick=d=>{f.world.visibilityAt=0;f.world.update({position:{x:r.pose.x+d,y:30,z:r.pose.z}});};
 tick(161);assert.equal(!!r.evicted,false);clock+=residency.graceMs-1;tick(161);assert.equal(releases,0);clock++;tick(161);assert.equal(releases,1);assert.equal(r.evicted,true);tick(161);assert.equal(releases,1);
 r.evicted=false;clock+=601;tick(residency.releaseDistance);assert.equal(releases,2);
 r.evicted=false;f.world.switched(r.id);clock+=601;tick(900);assert.equal(releases,2);assert.equal(r.vehicle.group.visible,true);assert.equal(r.outsideSince,undefined);
});
test('return during grace restarts the timer, while a pending restore stays hidden outside view',async t=>{
 let clock=10000;t.mock.method(performance,'now',()=>clock);
 const f=await fixture(),r=f.world.records.get('gup-a');f.block(true);let releases=0,finish;
 f.world.release=v=>{if(v===r.vehicle)releases++;};f.world.prepare=v=>v===r.vehicle?new Promise(resolve=>finish=resolve):Promise.resolve();
 const tick=d=>{f.world.visibilityAt=0;f.world.update({position:{x:r.pose.x+d,y:30,z:r.pose.z}});};
 tick(161);clock+=2500;tick(159);clock+=601;tick(161);clock+=2500;tick(161);assert.equal(releases,0);
 clock+=601;tick(181);assert.equal(r.evicted,true);tick(159);assert.equal(r.restoring,true);tick(161);assert.equal(r.vehicle.group.visible,false);
 finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(!!r.evicted,false);assert.equal(r.vehicle.group.visible,false);
 clock+=residency.graceMs;tick(161);assert.equal(r.evicted,true);assert.equal(releases,2);
});

const rewardRegistry=()=>[...vehicles.slice(0,3),vehicles.find(v=>v.id==='gup-x')];
test('preloaded GUP-X has no parked scene or grid presence until discovery',async()=>{const f=await fixture(rewardRegistry()),r=f.world.records.get('gup-x');assert(f.fleet.cache.has(r.id));assert(r.vehicle);assert.equal(r.parked,false);assert.equal(r.vehicle.group.visible,false);assert.equal(r.vehicle.group.parent,null);assert.equal(r.proxies.length,0);const count=f.surfaces.count;
 const sub=new SubmarineController();sub.collisionProxy=vehicles[1].collision;Object.assign(sub.position,r.pose);Object.assign(sub.previousPosition,sub.position);for(let i=0;i<3;i++){f.world.visibilityAt=0;f.world.update(sub);assert.equal(r.vehicle.group.visible,false);}const near=[];f.surfaces.grid.query(r.pose.x,r.pose.z,8,near);assert(!near.some(p=>p.parkedId===r.id));assert(f.world.placement.clear(r.pose,r.definition,undefined,'*'));
 f.unlocks.unlock(r.id);assert(r.parked);assert(r.vehicle.group.visible);assert.equal(r.vehicle.group.parent,f.scene);assert.equal(r.proxies.length,3);assert(r.proxies.every(p=>p.solid&&!p.triggerEnabled));assert.equal(f.surfaces.count,count+3);
 await f.fleet.select(r.id);assert.equal(r.parked,false);assert(r.vehicle.group.visible);await f.fleet.select('gup-b');assert(r.parked);assert(r.vehicle.group.visible);assert(r.proxies.every(p=>p.solid));});
test('reset and repeated override toggles never leave invisible GUP-X collision proxies',async()=>{const f=await fixture(rewardRegistry()),r=f.world.records.get('gup-x'),count=f.surfaces.count;for(let i=0;i<3;i++){f.unlocks.setOverride(r.id,true);assert(r.vehicle.group.visible);assert.equal(f.surfaces.count,count+3);f.unlocks.setOverride(r.id,false);assert.equal(r.vehicle.group.parent,null);assert.equal(r.proxies.length,0);assert.equal(f.surfaces.count,count);}f.unlocks.unlock(r.id);f.unlocks.reset();assert.equal(r.vehicle.group.visible,false);assert.equal(r.proxies.length,0);assert.equal(f.surfaces.count,count);});
test('a late graphics restore cannot reveal locked GUP-X after its unlock is removed',async()=>{const f=await fixture(rewardRegistry()),r=f.world.records.get('gup-x');let done;f.world.prepare=()=>new Promise(resolve=>done=resolve);f.unlocks.setOverride(r.id,true);r.evicted=true;f.world.restoreVisible(r);f.unlocks.setOverride(r.id,false);done();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(r.vehicle.group.visible,false);assert.equal(r.vehicle.group.parent,null);assert.equal(r.proxies.length,0);});
