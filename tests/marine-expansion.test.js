import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marineAnimals,MarineDiscovery,MARINE_SAVE_KEY} from '../src/marine/MarineDiscovery.js';
const originalIds=['octopus','bottlenose-dolphin','whale-shark','giant-manta-ray'];
const addedIds=['hammerhead-shark','seahorse','jellyfish','spotted-eagle-ray','moray-eel','pufferfish','humpback-whale'];
test('collection has eleven distinct species, correct groups, and no turtle',()=>{
 assert.deepEqual(marineAnimals.map(a=>a.id),[...originalIds,...addedIds]);assert.equal(new Set(marineAnimals.map(a=>a.id)).size,11);
 assert.deepEqual(marineAnimals.slice(4).map(a=>a.group.count),[3,4,6,2,1,3,1]);assert.equal(marineAnimals.slice(4).reduce((n,a)=>n+a.group.count,0),20);
});
test('old four entries remain exactly unchanged',()=>{
 const expected=JSON.parse(readFileSync(new URL('./fixtures/original-marine-animals.json',import.meta.url),'utf8'));
 assert.deepEqual(marineAnimals.slice(0,4),expected);
});
test('old discoveries survive expansion and any group member unlocks just one species',()=>{
 let data=JSON.stringify({version:1,ids:originalIds}),calls=0;
 const storage={getItem:()=>data,setItem:(key,value)=>{assert.equal(key,MARINE_SAVE_KEY);data=value;}};
 const discovery=new MarineDiscovery({storage,onDiscover:(animal,position)=>{calls++;assert.equal(animal.id,'seahorse');assert.equal(position.x,120);}});
 assert.equal(discovery.count,4);assert.equal(discovery.setGroupPositions('ambient-fish',[{x:0,y:0,z:0}]),false);
 assert.equal(discovery.setGroupPositions('seahorse',[]),false);
 const members=[{x:100,y:20,z:0},{x:120,y:20,z:0}];assert.equal(discovery.setGroupPositions('seahorse',members),true);
 assert.equal(discovery.update({x:120,y:20,z:0}),true);assert.equal(discovery.update({x:100,y:20,z:0}),false);assert.equal(calls,1);assert.equal(discovery.count,5);
 assert.equal(new MarineDiscovery({storage}).count,5);assert.deepEqual([...new MarineDiscovery({storage}).ids],[...originalIds,'seahorse']);
});
