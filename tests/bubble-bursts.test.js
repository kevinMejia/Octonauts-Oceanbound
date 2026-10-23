import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BubbleBursts,bubbleAudioConfig} from '../src/audio/BubbleBursts.js';
function fixture(seed=7){
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const events=[];
 const context={state:'running',currentTime:0,createGain:()=>({connect(){},disconnect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){}}}),createBufferSource:()=>{const source={loop:true,playbackRate:{setValueAtTime(v){source.rate=v;}},connect(){},disconnect(){},start(time,offset,duration){events.push({time,offset,duration,source});},stop(){}};return source;}};
 const buffer={duration:1,sampleRate:100,numberOfChannels:1,getChannelData:()=>new Float32Array(100).fill(1.3)};
 const bubbles=new BubbleBursts(context,{},buffer,{random});const run=(seconds,intensity,moving=true)=>{for(let i=0;i<seconds*60;i++){context.currentTime+=1/60;for(const e of events)if(!e.done&&context.currentTime>=e.time+e.duration/e.source.rate){e.done=true;e.source.onended();}bubbles.update(1/60,{intensity,moving});}};
 return {context,events,bubbles,run};
}
test('bubbles stay silent at rest and use bounded non-looping segments with pitch variation',()=>{
 const {events,bubbles,run}=fixture();run(20,0,false);assert.equal(events.length,0);run(20,1);assert.ok(events.length>10);
 for(const event of events){assert.equal(event.source.loop,false);assert.ok(event.duration<.3);assert.ok(event.source.rate>=.92&&event.source.rate<=1.08);}
 for(let i=1;i<events.length;i++)assert.notEqual(events[i].offset,events[i-1].offset);
 const spacings=events.slice(1).map((e,i)=>Math.round((e.time-events[i].time)*60));assert.ok(new Set(spacings).size>5);assert.ok(new Set(events.map(e=>e.source.rate)).size>5);
 bubbles.dispose();assert.equal(bubbles.voices.size,0);
});
test('faster movement schedules more events while silence leaves existing tails intact',()=>{
 const slow=fixture(),fast=fixture();slow.run(60,.1);fast.run(60,1);assert.ok(fast.events.length>slow.events.length*1.7);
 const count=fast.events.length;fast.run(5,0,false);assert.equal(fast.events.length,count);assert.equal(fast.bubbles.voices.size,0);
});
test('overlap cap, suspension and long frames cannot create a catch-up burst',()=>{
 const {bubbles,context,events}=fixture();bubbles.intensity=1;for(let i=0;i<10;i++)bubbles.burst();assert.equal(events.length,bubbleAudioConfig.maxSimultaneousBubbles);
 bubbles.suspend();assert.equal(bubbles.voices.size,0);context.state='suspended';bubbles.update(50,{intensity:1,moving:true});assert.equal(events.length,3);
 context.state='running';bubbles.update(50,{intensity:1,moving:true});assert.equal(events.length,4);bubbles.dispose();bubbles.update(50,{intensity:1,moving:true});assert.equal(events.length,4);
});
