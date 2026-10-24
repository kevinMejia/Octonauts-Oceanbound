import test from 'node:test';
import assert from 'node:assert/strict';
import {groupConfigFor} from '../src/config/animalGroupConfig.js';
import {createGroupVariation,looseMemberPose,neighborSteering} from '../src/marine/groupVariation.js';
import {marineAnimals} from '../src/marine/AnimalRegistry.js';
const groups=marineAnimals.filter(d=>d.group?.count>1);
test('clustered spawns reproduce by species and seed, fit bounds and reserve separation',()=>{
 for(const d of groups){const c=groupConfigFor(d),a=createGroupVariation(d.id,d.group.count,c);assert.deepEqual(a,createGroupVariation(d.id,d.group.count,c));assert.notDeepEqual(a,createGroupVariation(d.id,d.group.count,{...c,seed:c.seed+1}));assert.equal(a.length,d.group.count);
  for(let i=0;i<a.length;i++){const p=a[i].offset;assert(Math.hypot(p.x,p.z)<=c.spawnRadius);assert(Math.abs(p.y)<=c.spawnHeightVariation);for(let j=0;j<i;j++)assert(Math.hypot(p.x-a[j].offset.x,p.z-a[j].offset.z)>=c.spawnMinSeparation+2*c.driftRadius);}
  assert.equal(new Set(a.map(m=>m.speed)).size,d.group.count);assert.equal(new Set(a.map(m=>m.phase)).size,d.group.count);assert.equal(new Set(a.map(m=>m.animationRate)).size,d.group.count);
 }
});
test('pufferfish and six-member jelly group start irregular rather than collinear or in rows',()=>{
 for(const id of ['pufferfish','jellyfish']){const d=groups.find(d=>d.id===id),c=groupConfigFor(d),a=createGroupVariation(id,d.group.count,c).map(m=>looseMemberPose(0,m,c));assert.equal(new Set(a.map(p=>p.z.toFixed(2))).size,d.group.count);assert.equal(new Set(a.map(p=>p.y.toFixed(2))).size,d.group.count);
 const [p,q,r]=a;assert(Math.abs((q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x))>3);}
});
test('ten-minute loose drift stays clustered and separated at all sampled times',()=>{
 for(const d of groups.filter(d=>d.id!=='hammerhead-shark')){const c=groupConfigFor(d),a=createGroupVariation(d.id,d.group.count,c),poses=a.map(()=>({}));let timingDifference=0;
 for(let t=0;t<600;t+=.1){for(let i=0;i<a.length;i++){looseMemberPose(t,a[i],c,poses[i]);assert(Math.hypot(poses[i].x,poses[i].z)<=c.spawnRadius+c.driftRadius);assert(Math.abs(poses[i].y)<=c.spawnHeightVariation+.22);for(let j=0;j<i;j++)assert(Math.hypot(poses[i].x-poses[j].x,poses[i].z-poses[j].z)>=c.spawnMinSeparation);}
 timingDifference=Math.max(timingDifference,Math.abs((poses[0].x-a[0].offset.x)-(poses[1].x-a[1].offset.x)));}assert(timingDifference>.1);}
});
test('sharks vary route phases, directions, radii, speed and handling',()=>{
 const d=groups.find(d=>d.id==='hammerhead-shark'),a=createGroupVariation(d.id,d.group.count,groupConfigFor(d));assert.equal(new Set(a.map(m=>m.direction)).size,2);for(const key of ['routePhase','radius','speed','acceleration','turnSpeed','pause'])assert.equal(new Set(a.map(m=>m[key])).size,3);
});
test('separation steers away, cohesion is optional and impossible packing fails explicitly',()=>{
 const c=groupConfigFor({id:'pufferfish'}),out={};assert.equal(neighborSteering(0,[{x:0,z:0},{x:1,z:0}],{...c,groupCohesion:0},out),out);assert(out.x<0);
 neighborSteering(0,[{x:0,z:0},{x:10,z:0}],{...c,groupCohesion:.1},out);assert(out.x>0);
 assert.throws(()=>createGroupVariation('dense',3,{...c,spawnRadius:1,spawnMinSeparation:10}),/spacing/);
});
