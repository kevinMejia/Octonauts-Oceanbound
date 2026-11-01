import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMission} from '../src/missions/missionTiming.js';
import {DolphinRescueState} from '../src/missions/dolphinRescueMath.js';
import {dolphinRescueConfig as c} from '../src/config/dolphinRescueConfig.js';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';
import {vehicleById} from '../src/config/vehicleConfig.js';
const close=(a,b,tolerance=1e-8)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function run(hz,controls={thrust:0,turn:0,rise:0,boost:false},seconds=4){
 const state=new DolphinRescueState(),sub=new SubmarineController(),v=vehicleById('gup-b');sub.selectVehicle(v.id,v.movement,v);sub.ground=()=>0;sub.position.y=11;sub.position.z=-430;sub.turbo.charge=100;
 for(let frame=0;frame<hz*seconds;frame++)advanceMission(1/hz,dt=>{state.update(dt,sub.position.x);sub.update(dt,controls);});
 return {state,sub};
}
test('dolphins retain 4 real-time m/s across 60, 30, 20, 10, 6 and 4 FPS',()=>{
 for(const hz of [60,30,20,10,6,4])close(run(hz).state.distance,16);
});
test('normal and turbo acceleration retain speed, travel and charge across slow frames',()=>{
 for(const boost of [false,true]){
  const controls={thrust:1,turn:.3,rise:0,boost},baseline=run(60,controls);
  for(const hz of [30,20,10,6,4]){const result=run(hz,controls);close(result.sub.speed,baseline.sub.speed);close(result.sub.heading,baseline.sub.heading);close(result.sub.position.x,baseline.sub.position.x,1e-5);close(result.sub.position.z,baseline.sub.position.z,1e-5);close(result.sub.turbo.charge,baseline.sub.turbo.charge);close(result.state.distance,baseline.state.distance);}
 }
});
test('catch-up keeps all physics steps small and discards long-stall debt',()=>{
 let count=0,total=0;close(advanceMission(3,dt=>{assert(dt<=c.timing.maxStep);count++;total+=dt;}),.25);assert.equal(count,15);close(total,.25);
 let next=0;advanceMission(1/60,dt=>{next+=dt;});close(next,1/60);
});
test('invalid/zero elapsed time cannot move the mission',()=>{
 for(const dt of [0,-1,NaN,Infinity])assert.equal(advanceMission(dt,()=>assert.fail('unexpected step')),0);
});
test('terminal mission state stops catch-up in the same frame',()=>{
 let calls=0;const advanced=advanceMission(.2,()=>{calls++;return calls<3;});assert.equal(calls,3);close(advanced,.05);
});
test('slow rendered frames preserve the existing 150-second scripted success and failure',()=>{
 for(const hz of [60,10,4]){
  const success=new DolphinRescueState(),failure=new DolphinRescueState();
  for(let frame=0;frame<151*hz;frame++){
   if(success.status==='running')advanceMission(1/hz,dt=>{for(const o of success.obstacles)if(o.active)o.x=8;success.update(dt);return success.status==='running';});
   if(failure.status==='running')advanceMission(1/hz,dt=>{failure.update(dt);return failure.status==='running';});
  }
  assert.equal(success.status,'complete');close(success.time,150,1e-6);assert.equal(success.strikes,0);assert.equal(failure.status,'failed');assert.equal(failure.strikes,3);
 }
});
