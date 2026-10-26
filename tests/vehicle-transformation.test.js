import {test} from 'node:test';import assert from 'node:assert/strict';
import './fixtures/loadRescueNavigation.js';
import * as T from '../vendor/three.module.js';
import {VehicleFleet} from '../src/vehicles/VehicleFleet.js';
import {PauseState} from '../src/game/PauseState.js';
import {heightAt} from '../src/environment/terrainMath.js';
const {VehicleTransformation}=await import('../src/effects/VehicleTransformation.js');
const {vehicleTransformationConfig:config}=await import('../src/config/vehicleTransformationConfig.js');

test('fleet prepares before the cover hook and keeps the original until cover; cancelled cover never installs',async()=>{
 let release,installed=0,prepared=false;const old={id:'old'},next={id:'next'},fleet=new VehicleFleet({initialId:'old',initialVehicle:old,load:async()=>next,prepare:async()=>prepared=true,install:()=>installed++});
 const pending=fleet.select('next',()=>true,()=>{assert(prepared);assert.equal(fleet.activeVehicle,old);return new Promise(r=>release=r);});await new Promise(r=>setImmediate(r));assert.equal(installed,0);fleet.cancel();release();assert.equal(await pending,false);assert.equal(installed,0);assert.equal(fleet.activeVehicle,old);
 await fleet.select('next',()=>true,()=>{assert(prepared);assert.equal(fleet.activeVehicle,old);});assert.equal(installed,1);assert.equal(fleet.activeVehicle,next);
 let hooks=0;await fleet.select('next',()=>true,()=>hooks++);assert.equal(hooks,0);
});
function fixture(quality='low',height=0){
 const scene=new T.Scene();scene.fog=new T.FogExp2(0x08789f,.005);const camera=new T.PerspectiveCamera();camera.position.set(0,10,-20);let updates=0;
 const collision={radius:2,halfLength:3,halfHeight:1,terrainClearance:1,centerY:.2},game={scene,camera,quality,sub:{position:{x:0,y:heightAt(0,0)+1+height,z:0},collisionProxy:collision,heading:0},input:{clear(){}},pause:new PauseState(),chase:{update(){updates++;}},renderer:{compileAsync:async()=>{}},discovery:{safeSwitch:()=>({x:0,y:heightAt(0,0)+1,z:0})}};
 const effect=new VehicleTransformation(game),next={definition:{id:'next',collision:{...collision,radius:5,halfLength:6}}};return {effect,game,next,get updates(){return updates;}};
}
test('terrain-based sediment, bounded quality pools, cover/reveal timing and reusable idle resources',async()=>{
 const previous=globalThis.document;globalThis.document={querySelector:()=>null};
 try{for(const quality of ['low','high'])for(const height of [0,20]){
  const {effect:e,game,next}=fixture(quality,height);await e.prepare(next);assert.equal(e.sand,height===0);assert.equal(e.bubbles.items.length,quality==='low'?config.lowBubbles:config.bubbles);assert(!e.bubbleMesh.material.fragmentShader.includes('gl_PointCoord'));assert(e.bubbleMesh.material.fragmentShader.includes('vUv'));assert.equal(e.cloudMesh.material.transparent,true);const uuid=e.bubbleMesh.geometry.uuid,material=e.cloudMesh.material.uuid;
  const covered=e.cover();assert(game.pause.paused);assert.throws(()=>e.cover(),/already active/);for(let i=0;i<10;i++)e.update(.04);assert.equal(await covered,true);assert(e.active&&!e.revealing);assert(e.cloudMesh.count>0&&e.bubbleMesh.count>0);const sand=e.clouds.items.filter(p=>p.sand);assert.equal(sand.length>0,height===0);assert(sand.every(p=>p.y>=heightAt(p.x,p.z)));
  const finish=e.finished;e.reveal();for(let i=0;i<26;i++)e.update(.04);assert.equal(await finish,true);assert.equal(e.active,false);assert.equal(game.pause.paused,false);assert.equal(e.bubbles.active+e.clouds.active,0);assert.equal(e.bubbleMesh.count+e.cloudMesh.count,0);assert(!e.bubbleMesh.visible&&!e.cloudMesh.visible);assert.equal(game.chase.transitioning,false);
  await e.prepare(next);assert.equal(e.bubbleMesh.geometry.uuid,uuid);assert.equal(e.cloudMesh.material.uuid,material);const cancel=e.cover();e.update(.1);e.cancel();assert.equal(await cancel,false);assert.equal(game.pause.paused,false);e.dispose();assert.equal(game.scene.children.length,0);
 }}finally{globalThis.document=previous;}
});
test('other menus hold the transformation; disposal releases only its own pause and GPU resources',async()=>{
 const previous=globalThis.document;let open=true;globalThis.document={querySelector:()=>open?{}:null};
 try{const {effect:e,game,next}=fixture();await e.prepare(next);const other=game.pause.acquire('other'),covered=e.cover();e.update(.2);assert.equal(e.elapsed,0);assert.equal(e.started,false);open=false;e.update(.2);assert(e.started);let disposed=0;for(const m of [e.bubbleMesh,e.cloudMesh]){m.geometry.addEventListener('dispose',()=>disposed++);m.material.addEventListener('dispose',()=>disposed++);}e.dispose();assert.equal(await covered,false);assert.equal(disposed,4);assert(game.pause.paused);other();assert.equal(game.pause.paused,false);}finally{globalThis.document=previous;}
});
