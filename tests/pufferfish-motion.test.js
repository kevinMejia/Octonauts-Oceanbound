import test from 'node:test';
import assert from 'node:assert/strict';
import {pufferfishPose} from '../src/marine/pufferfishMotion.js';
import {marineAnimals} from '../src/marine/AnimalRegistry.js';
const definition=marineAnimals.find(a=>a.id==='pufferfish'),config=definition.behavior;
test('only pufferfish use individual orbits and keep their existing habitat',()=>{
 assert.deepEqual(marineAnimals.filter(a=>a.behavior.memberMotion==='orbit').map(a=>a.id),['pufferfish']);assert.deepEqual(definition.position,{x:44,y:15,z:145});assert.equal(definition.group.count,3);
});
test('pufferfish orbit one another without overlap or leaving the existing formation envelope',()=>{
 const poses=Array.from({length:3},()=>({}));let minDistance=Infinity;
 for(let t=0;t<240;t+=.05){for(let i=0;i<3;i++){const p=pufferfishPose(t,i,3,config,poses[i]);assert.ok(Math.hypot(p.x,p.z)<definition.group.spacing);assert.ok(Math.abs(p.y)<=.25);}
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=poses[i],b=poses[j];minDistance=Math.min(minDistance,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));}
 }assert.ok(minDistance>definition.group.spacing*.65);
});
test('each fish faces its actual swimming direction and changes places around the group',()=>{
 for(let i=0;i<3;i++)for(let t=0;t<40;t+=.1){const a=pufferfishPose(t,i,3,config),b=pufferfishPose(t+.001,i,3,config),dx=b.x-a.x,dz=b.z-a.z;assert.ok((Math.sin(a.heading)*dx+Math.cos(a.heading)*dz)/Math.hypot(dx,dz)>.999);}
 const first=pufferfishPose(0,0,3,config),later=pufferfishPose(12,0,3,config);assert.ok(first.x*later.x<0);
 const out={};assert.equal(pufferfishPose(4,1,3,config,out),out);assert.deepEqual(pufferfishPose(4,1,3,config),out);
});
