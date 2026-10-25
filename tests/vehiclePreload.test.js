import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VehicleFleet} from '../src/vehicles/VehicleFleet.js';
import {preloadVehicles} from '../src/vehicles/preloadVehicles.js';
const makeFleet=(load,prepare=async()=>{})=>new VehicleFleet({initialId:'gup-b',initialVehicle:{id:'gup-b'},load,prepare,install:()=>{}});
test('startup preloads A/R/X sequentially, prepares shaders, and never selects or replaces B',async()=>{
 const calls=[],events=[],fleet=makeFleet(async id=>{calls.push('load '+id);return {id}},async v=>calls.push('prepare '+v.id));
 const results=await preloadVehicles(fleet,{onProgress:e=>events.push(e)});
 assert.deepEqual(calls,['load gup-a','prepare gup-a','load gup-r','prepare gup-r','load gup-x','prepare gup-x']);
 assert.deepEqual(results.map(r=>r.status),['fulfilled','fulfilled','fulfilled']);
 assert.equal(fleet.activeId,'gup-b');assert.equal(fleet.generation,0);
 assert.deepEqual(events.map(e=>[e.id,e.status,e.completed,e.total]),[['gup-a','loading',0,3],['gup-a','fulfilled',1,3],['gup-r','loading',1,3],['gup-r','fulfilled',2,3],['gup-x','loading',2,3],['gup-x','fulfilled',3,3]]);
 await fleet.select('gup-a');await fleet.select('gup-r');await fleet.select('gup-x');assert.equal(calls.filter(c=>c.startsWith('load')).length,3);
});
test('optional preload failure allows other GUPs to finish and failed downloads retry on selection',async()=>{
 let attempts=0;const fleet=makeFleet(async id=>{if(id==='gup-a'&&attempts++===0)throw Error('network');return {id}});
 const results=await preloadVehicles(fleet);assert.deepEqual(results.map(r=>r.status),['rejected','fulfilled','fulfilled']);assert.equal(results[0].reason.message,'network');assert.equal(fleet.activeId,'gup-b');
 assert.equal(await fleet.select('gup-a'),true);assert.equal(attempts,2);
});
test('preloading shares an already pending download and optionally skips shader work',async()=>{
 let resolve,loads=0,prepares=0;const pending=new Promise(r=>resolve=r),fleet=makeFleet(()=>{loads++;return pending},async()=>prepares++);
 const first=fleet.get('gup-a'),preload=preloadVehicles(fleet,{ids:['gup-a','gup-a'],prepare:false});resolve({id:'gup-a'});
 const results=await preload;assert.equal(results.length,1);assert.equal(results[0].value,await first);assert.equal(loads,1);assert.equal(prepares,0);
});
test('shader preparation failure leaves decoded model cached and does not block the next preload',async()=>{
 let loads=0;const fleet=makeFleet(async id=>{loads++;return {id}},async v=>{if(v.id==='gup-a')throw Error('shader')});
 const results=await preloadVehicles(fleet);assert.deepEqual(results.map(r=>r.status),['rejected','fulfilled','fulfilled']);assert.equal((await fleet.get('gup-a')).id,'gup-a');assert.equal(loads,3);assert.equal(fleet.activeId,'gup-b');
});
