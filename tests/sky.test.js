import test from 'node:test';import assert from 'node:assert/strict';
import './fixtures/loadRescueNavigation.js';import * as T from '../vendor/three.module.js';
const {SkyEnvironment}=await import('../src/environment/SkyEnvironment.js');
import {DayNightCycle} from '../src/environment/DayNightCycle.js';
test('sky consumes one clock, follows translation without rotation, supports land and disposes',()=>{
 const scene=new T.Scene(),sky=new SkyEnvironment(scene,{cloudSpeed:.03,moon:false}),camera=new T.PerspectiveCamera(),settings={cycleEnabled:true,cycleDuration:5,timeOfDay:'automatic',automaticHeadlights:true},clock=new DayNightCycle(settings);
 camera.position.set(120,83,-90);camera.rotation.set(.6,1,0);const phase=clock.timeOfDay;
 sky.update(0,clock,camera);assert.equal(clock.timeOfDay,phase);assert.deepEqual(sky.mesh.position.toArray(),camera.position.toArray());assert.equal(sky.mesh.rotation.y,0);assert.equal(sky.uniforms.showMoon.value,0);assert.equal(sky.uniforms.cloudSpeed.value,.03);
 const first=sky.sunDirection.clone();for(let i=1;i<=150;i++){clock.update(1);sky.update(i,clock,camera);}assert(first.dot(sky.sunDirection)<-.99);assert(clock.night>.99);assert(sky.uniforms.daylight.value<.01);
 sky.update(151,clock,camera,{visible:false,opacity:0});assert(!sky.mesh.visible);sky.update(152,clock,camera);assert(sky.mesh.visible);assert.equal(sky.uniforms.opacity.value,1);
 let geometry=0,material=0;sky.mesh.geometry.addEventListener('dispose',()=>geometry++);sky.mesh.material.addEventListener('dispose',()=>material++);sky.dispose();assert.equal(scene.children.length,0);assert.equal(geometry,1);assert.equal(material,1);
});
test('sky overrides ease toward fixed sun and moon positions without advancing clock',()=>{
 const scene=new T.Scene(),sky=new SkyEnvironment(scene),camera=new T.PerspectiveCamera(),clock={timeOfDay:.45,daylight:0,settings:{timeOfDay:'night'}};
 sky.update(0,clock,camera);assert(sky.sunDirection.y<-.9);clock.settings.timeOfDay='day';clock.daylight=1;sky.update(.016,clock,camera);assert(sky.sunDirection.y<-.9);sky.update(10,clock,camera);assert(sky.sunDirection.y>.9);assert.equal(clock.timeOfDay,.45);sky.dispose();
});
