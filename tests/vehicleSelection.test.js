import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VehicleFleet} from '../src/vehicles/VehicleFleet.js';
import {PauseState} from '../src/game/PauseState.js';
import {vehicles,defaultVehicleId,carouselNeighbors,wrapVehicleIndex,vehicleModelURL,vehicleThumbnailURL} from '../src/config/vehicleConfig.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
test('independent pause owners release only their own token, once',()=>{const changes=[],p=new PauseState(v=>changes.push(v)),a=p.acquire('menu'),b=p.acquire('other');a();a();assert.equal(p.paused,true);b();assert.equal(p.paused,false);assert.deepEqual(changes,[true,false]);});
test('registry keeps B default and carousel wraps A/B/R',()=>{assert.equal(defaultVehicleId,'gup-b');assert.deepEqual(vehicles.slice(0,3).map(v=>v.id),['gup-a','gup-b','gup-r']);assert.deepEqual(carouselNeighbors(0,3).map(v=>v.index),[2,0,1]);assert.equal(wrapVehicleIndex(-1,3),2);});
test('fleet caches loads, switches atomically, and reuses the initial B',async()=>{let loads=0;const b={},installed=[],f=new VehicleFleet({initialId:'b',initialVehicle:b,load:async id=>{loads++;return {id}},install:(n,p,id)=>installed.push([n,p,id])});await f.select('a');await f.select('b');await f.select('a');assert.equal(loads,1);assert.equal(installed[1][0],b);assert.equal(installed[0][1],b);assert.equal(f.activeId,'a');});
test('failed load and preparation preserve current model; failed loads retry',async()=>{let attempt=0;const b={},f=new VehicleFleet({initialId:'b',initialVehicle:b,load:async()=>{if(!attempt++)throw Error('missing');return {}},prepare:async()=>{throw Error('shader')},install:()=>assert.fail('must not install')});await assert.rejects(f.select('a'),/missing/);await assert.rejects(f.select('a'),/shader/);assert.equal(attempt,2);assert.equal(f.activeVehicle,b);assert.equal(f.activeId,'b');});
test('closing during load or preparation cancels installation',async()=>{const d=deferred(),f=new VehicleFleet({initialId:'b',initialVehicle:{},load:()=>d.promise,install:()=>assert.fail('cancelled')});const pending=f.select('a');f.cancel();d.resolve({});assert.equal(await pending,false);assert.equal(f.activeId,'b');const prep=deferred();f.prepare=()=>prep.promise;const second=f.select('a');await Promise.resolve();await Promise.resolve();f.cancel();prep.resolve();assert.equal(await second,false);});
test('a slower obsolete load cannot replace a newer selection',async()=>{const a=deferred(),c=deferred(),installed=[],f=new VehicleFleet({initialId:'b',initialVehicle:{},load:id=>id==='a'?a.promise:c.promise,install:(n,p,id)=>installed.push(id)});const pa=f.select('a'),pc=f.select('c');c.resolve({});assert.equal(await pc,true);a.resolve({});assert.equal(await pa,false);assert.deepEqual(installed,['c']);assert.equal(f.activeId,'c');});


test('published fleet URLs preserve GitHub Pages subdirectory and cache version',()=>{
 const moduleURL='https://kevinmejia.github.io/Octonauts-Oceanbound/src/config/vehicleConfig.js?v=release123';
 for(const vehicle of vehicles){
  assert.match(vehicleModelURL(vehicle,moduleURL),/^https:\/\/kevinmejia\.github\.io\/Octonauts-Oceanbound\/assets\/models\/gup-[a-z](?:-high)?\.glb\?v=release123$/);
  assert.equal(vehicleThumbnailURL(vehicle,moduleURL),'https://kevinmejia.github.io/Octonauts-Oceanbound/assets/img/vehicles/'+vehicle.id+'.png?v=release123');
 }
});
