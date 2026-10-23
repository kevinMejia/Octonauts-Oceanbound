import {test} from 'node:test';
import assert from 'node:assert/strict';
import {audioTargets,loopBuffer,UnderwaterAudio} from '../src/audio/UnderwaterAudio.js';
const sub=(speed=0,vertical=0)=>({speed,vertical,turbo:{active:false}});
const input=(thrust=0,rise=0)=>({thrust,rise,brakeReverse:false});
test('ambience stays active at rest and motor follows forward, reverse, depth and braking',()=>{
 const idle=audioTargets(sub(),input(),0,.016);assert.equal(idle.propeller,0);assert.equal(idle.bubbles,0);assert.ok(idle.ambience>0);
 const forward=audioTargets(sub(5),input(1),5,.016),reverse=audioTargets(sub(-5),input(-1),5,.016);
 assert.equal(forward.propeller,reverse.propeller);assert.equal(forward.rate,reverse.rate);assert.equal(forward.bubbles,reverse.bubbles);
 assert.ok(audioTargets(sub(0,2),input(0,1),2,.016).propeller>0);
 assert.equal(audioTargets(sub(5),{...input(-1),brakeReverse:true},5,.016).propeller,0);
 assert.equal(audioTargets(sub(5),input(),5,.016).propeller,0);
});
test('speed, acceleration and boost increase subtle layers within headroom',()=>{
 const slow=audioTargets(sub(2),input(1),2,.05),fast=audioTargets(sub(12),input(1),12,.05),accelerating=audioTargets(sub(12),input(1),11,.05);
 assert.ok(fast.propeller>slow.propeller);assert.ok(fast.rate>slow.rate);assert.ok(fast.bubbles>slow.bubbles);assert.ok(accelerating.bubbles>fast.bubbles);
 const boosted=audioTargets({...sub(25),turbo:{active:true}},input(1),24,.05);assert.ok(boosted.propeller+boosted.bubbles+boosted.ambience<.5);
});
test('loop seam overlaps channels without changing the decoded asset',()=>{
 const samples=Float32Array.from({length:100},(_,i)=>Math.sin(i));const buffer={length:100,sampleRate:100,numberOfChannels:1,getChannelData:()=>samples};let output;
 const result=loopBuffer({createBuffer:(channels,length)=>({length,getChannelData:()=>output??=new Float32Array(length)})},buffer);
 assert.equal(result.length,94);assert.equal(output[0],samples[6]);assert.equal(output[93],samples[5]);assert.equal(samples.length,100);
});
test('audio unlocks once, keeps looping sources, suspends, resumes and cleans up',async()=>{
 const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;}});
 let starts=0,resumes=0,suspends=0;const listeners=new Map();
 const doc={hidden:false,addEventListener:(e,fn)=>listeners.set(e,fn),removeEventListener:e=>listeners.delete(e)};
 class Context{constructor(){this.currentTime=0;this.sampleRate=100;this.state='suspended';}createGain(){return {gain:param(),connect(){},disconnect(){}};}createBufferSource(){return {playbackRate:param(),connect(){},disconnect(){},start(){starts++;},stop(){}};}createBuffer(channels,length){return {length,duration:length/100,sampleRate:100,numberOfChannels:channels,getChannelData:()=>new Float32Array(length)};}decodeAudioData(data,resolve){resolve(this.createBuffer(1,100));}resume(){resumes++;this.state='running';return Promise.resolve();}suspend(){suspends++;this.state='suspended';return Promise.resolve();}close(){return Promise.resolve();}}
 const host={AudioContext:Context,addEventListener(){},removeEventListener(){},localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})};
 const audio=new UnderwaterAudio({host,document:doc});assert.equal(starts,0);audio.unlock();await audio.loading;assert.equal(Object.keys(audio.channels).length,2);assert.ok(audio.bubbles);
 const sources=Object.values(audio.channels).map(c=>c.source);audio.update(.016,sub(5),input(1));audio.update(.016,sub(-5),input(-1));assert.deepEqual(Object.values(audio.channels).map(c=>c.source),sources);
 audio.setVolume(9);assert.equal(audio.volume,1);doc.hidden=true;listeners.get('visibilitychange')();assert.equal(suspends,1);doc.hidden=false;listeners.get('visibilitychange')();assert.equal(resumes,2);audio.dispose();assert.equal(listeners.size,0);
});
test('missing files leave gameplay audio optional',async()=>{
 const audio=Object.create(UnderwaterAudio.prototype);audio.host={fetch:async()=>({ok:false,status:404})};audio.errors={};const warn=console.warn;console.warn=()=>{};try{await audio.load();assert.equal(Object.keys(audio.errors).length,3);}finally{console.warn=warn;}
});
