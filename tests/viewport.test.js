import test from 'node:test';import assert from 'node:assert/strict';
import {GameViewport} from '../src/game/GameViewport.js';
function setup(){
 const host=new EventTarget();host.document=new EventTarget();host.visualViewport=Object.assign(new EventTarget(),{width:844,height:390,scale:1});host.innerWidth=844;host.innerHeight=390;
 let id=0;const timers=new Map(),frames=new Map(),calls=[];
 host.setTimeout=fn=>{timers.set(++id,fn);return id;};host.clearTimeout=id=>timers.delete(id);host.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};host.cancelAnimationFrame=id=>frames.delete(id);
 const root={style:{width:'',height:''}},camera={updateProjectionMatrix(){this.updates=(this.updates||0)+1;}},renderer={setSize:(w,h)=>calls.push([w,h])};let changes=0;
 const viewport=new GameViewport(renderer,camera,()=>changes++,{host,root});
 const flush=()=>{const pending=[...frames.values()];frames.clear();for(const fn of pending)fn();};
 const settle=()=>{const pending=[...timers.values()];timers.clear();for(const fn of pending){fn();flush();}};
 return {host,root,camera,renderer,viewport,calls,timers,frames,flush,settle,changes:()=>changes};
}
test('15 transitions from either orientation converge after late silent viewport changes',()=>{
 for(const portrait of [false,true]){const s=setup(),v=s.host.visualViewport;
  for(let i=0;i<15;i++){const wide=(i%2===0)!==portrait;Object.assign(v,{width:wide?844:390,height:wide?390:844});s.host.dispatchEvent(new Event('orientationchange'));s.flush();
   // Safari settles after the first resize measurement without another window resize.
   v.height-=24;s.settle();assert.deepEqual(s.calls.at(-1),[v.width,v.height]);assert.equal(s.camera.aspect,v.width/v.height);assert.equal(s.root.style.height,v.height+'px');assert.equal(s.timers.size,0);assert.equal(s.frames.size,0);
  }s.viewport.dispose();
 }
});
test('rapid events cancel stale work, coalesce and avoid redundant buffer reallocations',()=>{
 const s=setup();s.host.dispatchEvent(new Event('orientationchange'));const stale=[...s.timers.values()];
 for(let i=0;i<30;i++){Object.assign(s.host.visualViewport,{width:i%2?390:844,height:i%2?844:390});s.host.visualViewport.dispatchEvent(new Event('resize'));s.host.dispatchEvent(new Event('resize'));}
 assert.equal(s.timers.size,4);assert.equal(s.frames.size,1);s.flush();s.settle();const count=s.calls.length;for(const fn of stale)fn();s.flush();assert.equal(s.calls.length,count);assert.deepEqual(s.calls.at(-1),[390,844]);
 s.host.dispatchEvent(new Event('resize'));s.flush();s.settle();assert.equal(s.calls.length,count);assert.equal(s.changes(),count);
 s.viewport.dispose();assert.equal(s.root.style.height,'');s.host.dispatchEvent(new Event('resize'));assert.equal(s.timers.size,0);assert.equal(s.frames.size,0);
});
test('invalid measurements are retried; zoom uses layout viewport; disposal cancels pending work',()=>{
 const s=setup();s.host.visualViewport.height=0;s.host.dispatchEvent(new Event('resize'));s.flush();assert.equal(s.calls.length,1);
 s.host.visualViewport.height=700;s.settle();assert.deepEqual(s.calls.at(-1),[844,700]);
 s.host.visualViewport.scale=2;s.host.dispatchEvent(new Event('resize'));s.flush();assert.deepEqual(s.calls.at(-1),[844,390]);
 s.viewport.dispose();assert.equal(s.timers.size,0);assert.equal(s.frames.size,0);
});
