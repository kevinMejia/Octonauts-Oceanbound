import test from 'node:test';
import assert from 'node:assert/strict';
import {TurboSound} from '../src/audio/TurboSound.js';
import {AudioManager} from '../src/audio/AudioManager.js';
import {audioDefaults,loadAudioSettings,saveAudioSettings,AUDIO_KEY} from '../src/audio/AudioSettings.js';

function fixture(){
 const sources=[],bus={};const context={state:'running',createBufferSource(){const source={loop:true,connect(destination){assert.equal(destination,bus);},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;}};
 const sound=new TurboSound(context,bus,{});return {sound,context,sources};
}
test('turbo sample plays once, never loops, and refuses overlapping voices',()=>{
 const {sound,sources}=fixture();assert.equal(sound.play(),true);assert.equal(sources[0].loop,false);assert.equal(sources[0].started,true);
 assert.equal(sound.play(),false);assert.equal(sources.length,1);sources[0].onended();assert.equal(sound.play(),true);assert.equal(sources.length,2);
 sound.suspend();assert.equal(sources[1].stopped,true);assert.equal(sound.voice,null);
});
test('AudioManager triggers turbo on successful activation edge, not button intent or ongoing boost',()=>{
 const {sound,context,sources}=fixture();const audio=Object.create(AudioManager.prototype);
 Object.assign(audio,{context,settings:{...audioDefaults},previousSpeed:0,paused:false,channels:{},turboActive:false,turboSound:sound});
 const sub={speed:0,vertical:0,turbo:{active:false}},input={thrust:1,rise:0,boost:true};
 audio.update(.016,sub,input);assert.equal(sources.length,0);
 sub.turbo.active=true;audio.update(.016,sub,input);assert.equal(sources.length,1);
 sources[0].onended();for(let i=0;i<60;i++)audio.update(.016,sub,input);assert.equal(sources.length,1);
 sub.turbo.active=false;audio.update(.016,sub,input);sub.turbo.active=true;audio.update(.016,sub,input);assert.equal(sources.length,2);
});
test('mute, zero Turbo volume and unavailable audio skip playback without a delayed catch-up',()=>{
 for(const mode of ['muted','zero','suspended','not-loaded','paused']){
  const {sound,context,sources}=fixture();const audio=Object.create(AudioManager.prototype);
  Object.assign(audio,{context,settings:{...audioDefaults},previousSpeed:0,paused:mode==='paused',channels:{},turboActive:false,turboSound:mode==='not-loaded'?undefined:sound});
  if(mode==='muted')audio.settings.muted=true;if(mode==='zero')audio.settings.turbo=0;if(mode==='suspended')context.state='suspended';
  const sub={speed:0,vertical:0,turbo:{active:true}},input={thrust:1,rise:0};audio.update(.016,sub,input);assert.equal(sources.length,0);
  audio.settings.muted=false;audio.settings.turbo=.65;audio.paused=false;audio.context.state='running';audio.turboSound=sound;
  audio.update(.016,sub,input);assert.equal(sources.length,0);
 }
});
test('Turbo volume migrates, clamps, persists, and keeps existing audio preferences',()=>{
 const values=new Map([[AUDIO_KEY,JSON.stringify({master:.2,bubbles:.4,muted:true})]]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const settings=loadAudioSettings(storage);assert.equal(settings.turbo,.65);assert.equal(settings.master,.2);assert.equal(settings.muted,true);
 settings.turbo=.23;saveAudioSettings(storage,settings);assert.equal(loadAudioSettings(storage).turbo,.23);
 storage.setItem(AUDIO_KEY,JSON.stringify({...settings,turbo:4}));assert.equal(loadAudioSettings(storage).turbo,1);
});
test('collision audio follows mute and the same existing master context',()=>{
 const audio=Object.create(AudioManager.prototype);let plays=0;
 Object.assign(audio,{paused:false,settings:{...audioDefaults},context:{state:'running'},impacts:{play(){plays++;}}});
 audio.playCollision({impact:5});assert.equal(plays,1);audio.settings.muted=true;audio.playCollision({impact:5});assert.equal(plays,1);
 audio.settings.muted=false;audio.paused=true;audio.playCollision({impact:5});assert.equal(plays,1);
});
