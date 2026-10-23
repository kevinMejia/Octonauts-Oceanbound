import {test} from 'node:test';
import assert from 'node:assert/strict';
import {audioDefaults,AUDIO_KEY,loadAudioSettings,saveAudioSettings} from '../src/audio/AudioSettings.js';
import {MusicController} from '../src/audio/MusicController.js';
import {AudioManager} from '../src/audio/AudioManager.js';
test('audio defaults, legacy migration, validation and blocked storage are isolated',()=>{
 assert.deepEqual(loadAudioSettings(),audioDefaults);
 const values=new Map([['oceanbound.masterVolume','.27'],['unrelated','keep']]);const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(loadAudioSettings(storage).master,.27);
 storage.setItem(AUDIO_KEY,JSON.stringify({master:2,music:-1,propeller:'loud',muted:true,bubbles:null}));const loaded=loadAudioSettings(storage);
 assert.equal(loaded.master,1);assert.equal(loaded.music,0);assert.equal(loaded.propeller,.65);assert.equal(loaded.bubbles,.5);assert.equal(loaded.muted,true);
 assert.ok(saveAudioSettings(storage,audioDefaults));assert.deepEqual(loadAudioSettings(storage),audioDefaults);assert.equal(values.get('unrelated'),'keep');
 assert.deepEqual(loadAudioSettings({getItem:()=>'{broken'}),audioDefaults);assert.equal(saveAudioSettings({setItem(){throw Error();}},loaded),false);
});
function fixture(){
 const ramps=[];const gain=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v,t){this.value=v;ramps.push([v,t]);}});
 const node=()=>({gain:gain(),connect(){},disconnect(){}});const context={state:'running',currentTime:0,createGain:node,createMediaElementSource:node};
 class Media{constructor(){this.paused=true;this.currentTime=0;this.duration=172.14;this.readyState=4;this.ended=false;this.calls=0;}play(){this.calls++;this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}removeAttribute(){}load(){}}
 const timeouts=new Map();let next=0;const host={Audio:Media,setInterval:()=>1,clearInterval(){},setTimeout:fn=>{timeouts.set(++next,fn);return next;},clearTimeout:id=>timeouts.delete(id)};
 const music=new MusicController(context,node(),{host});return {music,host,context,ramps,timeouts};
}
test('music begins at zero with a three-second fade and resumes at its position',async()=>{
 const {music,ramps,timeouts}=fixture();music.unlock();await Promise.resolve();assert.equal(music.slots[0].media.currentTime,0);assert.equal(music.slots[1].media.paused,true);assert.deepEqual(ramps.at(-1),[1,3]);
 music.slots[0].media.currentTime=64;music.setEnabled(false);assert.deepEqual(ramps.at(-1),[0,2]);for(const fn of timeouts.values())fn();assert.equal(music.slots[0].media.paused,true);
 music.setEnabled(true);await Promise.resolve();assert.equal(music.slots[0].media.currentTime,64);assert.equal(music.slots[0].media.paused,false);
 music.suspend();music.unlock();await Promise.resolve();assert.equal(music.slots[0].media.currentTime,64);music.dispose();
});
test('two full recordings overlap by four seconds across repeated loops without resetting incoming playback',async()=>{
 const {music}=fixture();music.unlock();await Promise.resolve();
 for(let loop=0;loop<4;loop++){
  const index=music.current,out=music.slots[index],incoming=music.slots[1-index];out.media.currentTime=168.14;music.tick();await Promise.resolve();assert.ok(music.transition);assert.equal(incoming.media.currentTime,0);
  out.media.currentTime=170.14;incoming.media.currentTime=2;music.tick();assert.ok(Math.abs(out.gain.gain.value-incoming.gain.gain.value)<.00001);
  out.media.currentTime=172.14;incoming.media.currentTime=4;out.media.ended=true;music.tick();assert.equal(music.current,1-index);assert.equal(incoming.media.currentTime,4);assert.equal(out.media.paused,true);out.media.ended=false;
 }music.dispose();
});
test('volume preferences never overwrite dynamic envelopes or restart music',()=>{
 const audio=Object.create(AudioManager.prototype);audio.host={};audio.settings={...audioDefaults};audio.volume=.8;audio.paused=false;audio.sceneMusicEnabled=true;audio.channelGains={};let changes=0;audio.music={enabled:true,setEnabled(){changes++;}};audio.context={};audio.master={gain:{}};audio.smooth=()=>{};
 audio.channels={propeller:{gain:{gain:{value:.12}}}};audio.setChannelVolume('propeller',.2);assert.equal(audio.channels.propeller.gain.gain.value,.12);assert.equal(audio.settings.propeller,.2);assert.equal(changes,0);
 audio.setMuted(true);assert.equal(audio.settings.muted,true);audio.resetSettings();assert.deepEqual(audio.settings,audioDefaults);
});
test('buffering defers transition and suspension prevents duplicate handoff',async()=>{
 const {music}=fixture();music.unlock();await Promise.resolve();music.slots[0].media.currentTime=169;music.slots[1].media.readyState=1;music.tick();assert.equal(music.transition,null);
 music.slots[1].media.readyState=4;music.tick();music.suspend();await Promise.resolve();assert.equal(music.transition,null);assert.equal(music.slots[1].media.paused,true);music.dispose();
});

test('re-enabling after the outgoing track ends during fade continues the incoming recording',async()=>{
 const {music,timeouts}=fixture();music.unlock();await Promise.resolve();music.slots[0].media.currentTime=169;music.tick();await Promise.resolve();music.setEnabled(false);
 music.slots[0].media.currentTime=172.14;music.slots[0].media.ended=true;music.slots[1].media.currentTime=3.14;
 for(const fn of timeouts.values())fn();music.setEnabled(true);await Promise.resolve();assert.equal(music.current,1);assert.equal(music.slots[1].media.currentTime,3.14);assert.equal(music.transition,null);music.dispose();
});
