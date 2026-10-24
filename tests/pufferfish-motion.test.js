import test from 'node:test';
import assert from 'node:assert/strict';
import {groupConfigFor} from '../src/config/animalGroupConfig.js';
import {createGroupVariation,looseMemberPose} from '../src/marine/groupVariation.js';
import {marineAnimals} from '../src/marine/AnimalRegistry.js';
const d=marineAnimals.find(a=>a.id==='pufferfish'),c=groupConfigFor(d),members=createGroupVariation(d.id,d.group.count,c);
test('pufferfish retain three existing models and their original habitat',()=>{assert.deepEqual(d.position,{x:44,y:15,z:145});assert.equal(d.group.count,3);assert.equal(d.visual.type,'pufferfish');});
test('pufferfish drift calmly with different depths, headings and clocks',()=>{
 const first=members.map(m=>looseMemberPose(0,m,c));assert(new Set(first.map(p=>p.heading.toFixed(2))).size>1);assert(new Set(first.map(p=>p.y.toFixed(2))).size>1);
 for(let t=0;t<120;t+=.1)for(const m of members){const a=looseMemberPose(t,m,c),b=looseMemberPose(t+.01,m,c);assert(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.008);assert(Math.hypot(a.x-m.offset.x,a.z-m.offset.z)<=c.driftRadius);}
});
