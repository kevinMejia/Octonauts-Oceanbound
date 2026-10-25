import test from 'node:test';
import assert from 'node:assert/strict';
import {PerformanceDisplay,summarizeFrames} from '../src/ui/PerformanceDisplay.js';
test('frame summary reports reciprocal mean FPS, tail timing and frames over 50 ms',()=>{
 assert.equal(summarizeFrames([]),null);
 const s=summarizeFrames([10,10,20,60]);assert.equal(s.fps,40);assert.equal(s.mean,25);assert.equal(s.p95,20);assert.equal(s.stutters,1);
});
test('disabled display does no sampling; pauses exclude resume gaps; history stays bounded',()=>{
 const display=new PerformanceDisplay();display.frame(100,true);assert.equal(display.previous,null);
 display.enabled=true;display.output={textContent:''};
 display.frame(100,true);display.frame(120,true);assert.equal(display.samples.length,1);
 display.frame(1000,false);assert.equal(display.previous,null);assert.equal(display.samples.length,0);
 display.frame(9000,true);assert.equal(display.samples.length,0);
 for(let i=1;i<=700;i++)display.frame(9000+i,true);
 assert.equal(display.samples.length,512);assert.equal(display.samples[0].ms,1);
 display.frame(20000,false);display.frame(30000,true);display.frame(30016,true);assert.equal(display.samples.length,1);assert.equal(display.samples[0].ms,16);
 display.setEnabled(false);assert.equal(display.output.hidden,true);assert.equal(display.samples.length,0);
});

test('memory scan runs at most every two seconds and never while disabled',()=>{
 let scans=0;const game={scene:{traverse(){scans++;}},renderer:{properties:new WeakMap()}},display=new PerformanceDisplay();
 display.frame(500,true,game);assert.equal(scans,0);
 display.enabled=true;display.output={textContent:''};display.frame(0,true,game);display.frame(500,true,game);
 assert.equal(scans,1);assert.match(display.output.textContent,/GPU textures ~0.0 MiB/);
 display.frame(1000,true,game);display.frame(2499,true,game);assert.equal(scans,1);
 display.frame(2500,true,game);assert.equal(scans,1);display.frame(3000,true,game);assert.equal(scans,2);
 display.setEnabled(false);display.frame(5000,true,game);assert.equal(scans,2);
});
