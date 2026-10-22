import {test} from 'node:test';import assert from 'node:assert/strict';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';
import {heightAt,random} from '../src/environment/terrainMath.js';
const zero={thrust:0,turn:0,rise:0};
function run(s,input,seconds){for(let i=0;i<seconds*60;i++)s.update(1/60,input);}
test('forward, reverse, steering and vertical thrust',()=>{const s=new SubmarineController();run(s,{...zero,thrust:1},3);assert(s.position.z>20);run(s,{...zero,thrust:-1},5);assert(s.speed<-4.9);run(s,{...zero,turn:1},2);assert(s.heading>1);run(s,{...zero,rise:1},2);assert(s.position.y>14);run(s,{...zero,rise:-1},2);assert(s.vertical<-4);});
test('hover stabilizes without gravity',()=>{const s=new SubmarineController();run(s,{...zero,rise:1},1);run(s,zero,5);const y=s.position.y;run(s,zero,5);assert(Math.abs(s.position.y-y)<.001);});
test('hull clearance and surface clamp',()=>{const s=new SubmarineController();run(s,{...zero,rise:-1,thrust:1},120);assert(s.position.y>=heightAt(s.position.x,s.position.z)+1.7);run(s,{...zero,rise:1},120);assert.equal(s.position.y,43.5);});
test('soft finite bounds hold over sustained travel',()=>{const s=new SubmarineController();run(s,{...zero,thrust:1},1000);assert(s.position.z<=788);assert(s.position.z>700);});
test('seeded scenery and smooth terrain are deterministic',()=>{const a=random(7),b=random(7);for(let i=0;i<100;i++)assert.equal(a(),b());for(let i=-800;i<800;i+=3)assert(Math.abs(heightAt(i,3)-heightAt(i+.1,3))<.05);});
