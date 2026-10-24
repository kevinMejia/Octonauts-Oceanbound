import {test} from 'node:test';

import assert from 'node:assert/strict';

import {MarineDiscovery,marineAnimals,MARINE_SAVE_KEY} from '../src/marine/MarineDiscovery.js';

const animal={id:'test-only',commonName:'Test',scientificName:'Test species',modelPath:'/test.glb',thumbnailPath:'/test.png',fact:'A test fact.',habitat:'reef',position:{x:0,y:0,z:0},discoveryRadius:10};

test('shipping registry has eleven species and empty registries still do no work',()=>{assert.equal(marineAnimals.length,11);const d=new MarineDiscovery({registry:[],blocked:()=>{throw Error('unnecessary work');}});assert.equal(d.update({x:0,y:0,z:0}),false);assert.equal(d.count,0);});

test('registered proximity saves before callback, triggers once and reloads',()=>{const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};let calls=0;const d=new MarineDiscovery({registry:[animal],storage,onDiscover:a=>{assert.equal(a.id,animal.id);assert.ok(values.get(MARINE_SAVE_KEY));calls++;}});assert.equal(d.update({x:11,y:0,z:0}),false);assert.equal(d.update({x:10,y:0,z:0}),true);assert.equal(d.update({x:0,y:0,z:0}),false);assert.equal(calls,1);assert.equal(new MarineDiscovery({registry:[animal],storage}).count,1);assert.equal(d.setPosition('ambient-fish',{x:0,y:0,z:0}),false);});

test('pause blocks triggers, moving centers work, storage failures are safe',()=>{let paused=true;const d=new MarineDiscovery({registry:[animal],blocked:()=>paused,storage:{getItem(){throw Error();},setItem(){throw Error();}}});assert.equal(d.update(animal.position),false);paused=false;d.setPosition(animal.id,{x:100,y:0,z:0});assert.equal(d.update(animal.position),false);assert.equal(d.update({x:100,y:0,z:0}),true);assert.equal(d.saved,false);assert.equal(d.count,1);});

test('malformed saves and duplicate definitions are handled',()=>{for(const value of ['bad','null','{"version":1,"ids":{}}'])assert.equal(new MarineDiscovery({registry:[animal],storage:{getItem:()=>value}}).count,0);assert.throws(()=>new MarineDiscovery({registry:[animal,animal]}));});

test('new registry entries preserve old IDs without collecting unknown IDs',()=>{const storage={getItem:()=>JSON.stringify({version:1,ids:['test-only','retired']}),setItem(){}};const d=new MarineDiscovery({registry:[animal,{...animal,id:'future'}],storage});assert.equal(d.count,1);assert.equal(d.isDiscovered('retired'),false);d.save();assert.ok(d.ids.has('retired'));});


test('four stable species define isolated visuals, facts and bounded habitat routes',()=>{
 assert.deepEqual(marineAnimals.slice(0,4).map(a=>a.id),['octopus','bottlenose-dolphin','whale-shark','giant-manta-ray']);
 const d=new MarineDiscovery();assert.equal(d.records.size,11);
 for(const a of marineAnimals){assert.equal(a.visual.source,'procedural');assert.ok(a.behavior.radius>0&&a.behavior.speed>0);assert.ok(a.position.y<46);assert.ok(a.scientificName.includes(' '));}
 assert.throws(()=>new MarineDiscovery({registry:[{...animal,visual:{source:'unknown'}}]}));
 assert.doesNotThrow(()=>new MarineDiscovery({registry:[{...marineAnimals[0],visual:{source:'glb',modelPath:'/future.glb'}}]}));
});
