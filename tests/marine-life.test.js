import {test} from 'node:test';import assert from 'node:assert/strict';
import {schoolPath,schoolAvoidance} from '../src/environment/fishMath.js';
import {marineLifeConfig as c} from '../src/config/marineLifeConfig.js';
import {waterConfig} from '../src/config/waterConfig.js';
test('school path stays confined, moves smoothly and yields finite headings over long sessions',()=>{const a={},b={};for(let time=0;time<600;time+=.2){assert.equal(schoolPath(time,a),a);schoolPath(time+.016,b);assert(Math.abs(a.x-c.center.x)<=c.radiusX+1e-8);assert(Math.abs(a.z-c.center.z)<=c.radiusZ+1e-8);assert(Number.isFinite(a.heading));assert(Math.hypot(a.x-b.x,a.z-b.z)/.016<2);}});
test('school gently moves away from an approaching sub and ignores distant travel',()=>{const out={};schoolAvoidance(10,10,{x:8,z:10},out);assert(out.x>0&&out.z===0);assert(Math.hypot(out.x,out.z)<=c.avoidanceOffset);schoolAvoidance(10,10,{x:-100,z:100},out);assert.equal(Math.hypot(out.x,out.z),0);schoolAvoidance(10,10,{x:10,z:10},out);assert(Number.isFinite(out.x+out.z));});
test('shared fish, visitor and bubble pools have explicit smaller mobile budgets',()=>{assert(c.lowCount<c.count&&c.count<=32);assert(waterConfig.bubbles.lowParticles<waterConfig.bubbles.maxParticles);assert(waterConfig.bubbles.maxParticles<=256);assert(waterConfig.vents.positions.length>=6);assert(c.lowMaxFish<c.maxFish&&c.maxFish<=192);assert(c.lowSchoolSlots<c.schoolSlots);});

import {nearbySchools} from '../src/environment/marineLayout.js';
test('marine schools cover opening and distant exploration with deterministic anchors',()=>{for(const [x,z] of [[180,195],[0,70],[-400,-300],[500,600]]){const a=nearbySchools(x,z,105);assert(a.length>=5);assert.deepEqual(a,nearbySchools(x,z,105));assert(new Set(a.map(g=>g.id)).size===a.length);assert(Math.hypot(a[0].x-x,a[0].z-z)<60);}});

import {kelpMeadows} from '../src/environment/marineLayout.js';
test('tall kelp meadows are repeatable, grounded and stay inside world bounds',()=>{const a=kelpMeadows();assert.deepEqual(a,kelpMeadows());assert(a.length>300&&a.length<1500);assert(a.every(r=>Math.abs(r.x)<800&&Math.abs(r.z)<800&&r.scale>=1.5&&Number.isFinite(r.y)));});

import {octopodGrass} from '../src/environment/marineLayout.js';
import {octopodConfig} from '../src/config/octopodConfig.js';
test('base grass is deterministic, low and leaves feet and sandy approach clear',()=>{const patches=octopodGrass();assert.deepEqual(patches,octopodGrass());assert(patches.length>200&&patches.length<450);for(const p of patches){const dx=(p.x-octopodConfig.position.x)/octopodConfig.scale,dz=(p.z-octopodConfig.position.z)/octopodConfig.scale;assert(Math.hypot(dx,dz)>=11);assert(!(dz>6&&Math.abs(dx)<7));assert(p.kind.startsWith('grass')&&p.scale<=1.1*octopodConfig.scale);}});
test('small base schools remain below the pods and outside the support footprint',()=>{const groups=nearbySchools(180,100,100).filter(g=>g.base);assert.equal(groups.length,3);for(const g of groups){const out={};for(let t=0;t<100;t+=.3){schoolPath(t,out,g);assert(Math.hypot(out.x-180,out.z-100)>20);assert(Math.abs(out.x-g.x)<=3&&Math.abs(out.z-g.z)<=2);}}});
