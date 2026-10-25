import test from 'node:test';
import assert from 'node:assert/strict';
import {CollisionShake} from '../src/camera/CollisionShake.js';
import {gameplayDefaults,loadGameplaySettings,saveGameplaySettings} from '../src/ui/gameplayPreferences.js';
import {CollisionWorld} from '../src/collision/CollisionWorld.js';
import {SurfaceGrid} from '../src/effects/interactionMath.js';
import {vehicles} from '../src/config/vehicleConfig.js';
const hit=(impact=6,ny=0)=>({fresh:true,impact,nx:ny?0:1,ny,nz:0});
const make=()=>new CollisionShake({cameraShake:true,shakeIntensity:.3});
test('impact strength scales smoothly and stays capped, including overlaps',()=>{
 const light=make(),hard=make();light.impact(hit(.8));hard.impact(hit(100));
 light.update(.025);hard.update(.025);assert.ok(Math.abs(hard.x)>Math.abs(light.x));assert.ok(Math.abs(hard.x)<=.32*.3);
 const strength=hard.strength;hard.impact(hit(200));assert.equal(hard.strength,strength);
 for(let i=0;i<30;i++)hard.update(.016);
 assert.equal(hard.x,0);assert.equal(hard.y,0);
});
test('resting, insignificant and nonphysical contacts do not shake',()=>{
 const s=make();for(const c of [null,hit(.1),{...hit(20),fresh:false}])s.impact(c);
 s.update(.02);assert.equal(s.x,0);
});
test('floor impacts recoil vertically and live preferences apply immediately',()=>{
 const s=make();s.impact(hit(8,1));s.update(.02);assert.ok(s.y>0);assert.equal(s.x,0);
 const y=s.y;s.settings.shakeIntensity=.6;s.update(0);assert.equal(s.y,y*2);
 s.settings.cameraShake=false;s.update(0);assert.equal(s.y,0);
 s.settings.cameraShake=true;s.update(.01);assert.equal(s.y,0);
 s.impact(hit());s.reset();s.update(.01);assert.equal(s.x,0);
});
test('shake preferences persist and validate alongside old gameplay saves',()=>{
 let data;const storage={setItem:(key,value)=>data=value,getItem:()=>data};
 assert.equal(gameplayDefaults.cameraShake,true);assert.equal(gameplayDefaults.shakeIntensity,.3);
 saveGameplaySettings(storage,{...gameplayDefaults,cameraShake:false,shakeIntensity:.75});
 assert.equal(loadGameplaySettings(storage).cameraShake,false);assert.equal(loadGameplaySettings(storage).shakeIntensity,.75);
 data='{"shakeIntensity":9}';assert.equal(loadGameplaySettings(storage).shakeIntensity,1);
 data='{"shakeIntensity":"bad"}';assert.equal(loadGameplaySettings(storage).shakeIntensity,.3);
});
test('shared collision observer captures inward impacts for every GUP without changing physics',()=>{
 for(const definition of vehicles){
  const grid=new SurfaceGrid(),rock={x:0,y:10,z:0,rx:8,ry:8,rz:.05,angle:0,radius:8,solid:true,surface:'rock'};grid.add(rock);
  const world=new CollisionWorld({grid,count:1,solidCount:1},()=>-100),shake=make();
  let count=0;world.onImpact=contact=>{count++;shake.impact(contact);};
  const sub={position:{x:0,y:10,z:10},previousPosition:{x:0,y:10,z:-10},heading:0,pitch:0,bank:0,speed:20,vertical:0,collisionDrift:{x:0,z:0},collisionProxy:definition.collision};
  world.resolve(sub,.05);shake.update(.02);
  assert.ok(count>0,definition.id);assert.ok(shake.z!==0,definition.id);assert.ok(sub.speed<=0,definition.id);
 }
});
