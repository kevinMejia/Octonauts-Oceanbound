import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateOrbitRecenter} from '../src/camera/cameraMath.js';
const config={autoRecenterEnabled:true,recenterDelay:1.5,recenterSmoothTime:.65,recenterAngleTolerance:.01};
const state=()=>({active:false,x:0,y:0});
test('orbit remains fully manual through dragging and the release delay',()=>{
 const orbit={x:1,y:.3,last:10},s=state();updateOrbitRecenter(orbit,true,1,40,config,s);assert.equal(orbit.x,1);
 orbit.last=40;updateOrbitRecenter(orbit,false,.1,41.49,config,s);assert.equal(orbit.x,1);updateOrbitRecenter(orbit,false,.05,41.55,config,s);assert.ok(orbit.x<1&&orbit.x>.98);
});
test('return settles without overshoot and follows the shortest equivalent orbit',()=>{
 const orbit={x:Math.PI*8+.8,y:-.4,last:0},s=state();let previous=1;for(let i=0;i<150;i++){updateOrbitRecenter(orbit,false,1/60,2+i/60,config,s);assert.ok(orbit.x>=0&&orbit.x<=previous);assert.ok(orbit.y<=0);previous=orbit.x;}assert.equal(orbit.x,0);assert.equal(orbit.y,0);
});
test('new drag cancels return velocity immediately and restarts the release timer',()=>{
 const orbit={x:1,y:.3,last:0},s=state();updateOrbitRecenter(orbit,false,.5,2,config,s);assert.ok(s.x<0);orbit.x+=.4;const manual=orbit.x;updateOrbitRecenter(orbit,true,.05,3,config,s);assert.equal(orbit.x,manual);assert.equal(s.x,0);
 orbit.last=3;updateOrbitRecenter(orbit,false,.1,4,config,s);assert.equal(orbit.x,manual);updateOrbitRecenter(orbit,false,.1,5,config,s);assert.ok(orbit.x<manual);
});
test('recenter is frame-rate independent and can be disabled',()=>{
 const run=hz=>{const orbit={x:1,y:.3,last:0},s=state();for(let i=0;i<hz;i++)updateOrbitRecenter(orbit,false,1/hz,2+i/hz,config,s);return orbit.x;};assert.ok(Math.abs(run(30)-run(120))<1e-10);
 const orbit={x:1,y:.3,last:0};updateOrbitRecenter(orbit,false,1,5,{...config,autoRecenterEnabled:false},state());assert.equal(orbit.x,1);
});
