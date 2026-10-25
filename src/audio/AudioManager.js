import {DiscoverySound} from './DiscoverySound.js';
import {TurboSound} from './TurboSound.js';
import {ImpactSounds} from './ImpactSounds.js';
import {submarineConfig as config} from '../config/submarineConfig.js';
import {audioDefaults,loadAudioSettings,saveAudioSettings,volumeKeys} from './AudioSettings.js';
import {BubbleBursts,bubbleAudioConfig} from './BubbleBursts.js';
import {MusicController} from './MusicController.js';
import {bubbleRate} from '../effects/waterMath.js';
const safeStorage=host=>{try{return host.localStorage;}catch{return undefined;}};
const clamp=value=>Math.max(0,Math.min(1,value));
export const audioAssets={turbo:new URL('../../assets/audio/turbo.mp3',import.meta.url).href,collision:new URL('../../assets/audio/underwater-collision.mp3',import.meta.url).href,propeller:new URL('../../assets/audio/gup-b-propeller.mp3',import.meta.url).href,bubbles:new URL('../../assets/audio/underwater-bubbles.mp3',import.meta.url).href,ambience:new URL('../../assets/audio/underwater-ambience.mp3',import.meta.url).href};
const windowAssets={windowOpen:new URL('../../assets/audio/open windows.mp3',import.meta.url).href,windowClose:new URL('../../assets/audio/close windows.mp3',import.meta.url).href};
const rescueAssets={lasso:new URL('../../assets/audio/lasso.mp3',import.meta.url).href,rescue:new URL('../../assets/audio/rescue.mp3',import.meta.url).href};
const foundAssets={animal:new URL('../../assets/audio/animal found.mp3',import.meta.url).href,gup:new URL('../../assets/audio/gup found.mp3',import.meta.url).href};
export function audioTargets(sub,input,previousSpeed,dt){
 const speed=Math.hypot(sub.speed,sub.vertical),movement=clamp(speed/config.maxForwardSpeed);
 const braking=input.brakeReverse&&sub.speed>.15;
 const motor=clamp(Math.max(braking?0:Math.abs(input.thrust),Math.abs(input.rise)));
 const acceleration=clamp((speed-previousSpeed)/Math.max(dt,.001)/12);
 const emission=clamp(bubbleRate(sub.speed,sub.turbo.active)/Math.max(1,bubbleRate(config.maxForwardSpeed,true)));
 return {speed,propeller:motor*(.065+.14*movement+.025*Number(sub.turbo.active)),rate:.72+.32*motor+.4*movement,bubbles:Math.min(.13,emission*(.055+.045*acceleration+.03*movement)),ambience:.065};
}
// Overlap the recording's tail with its head, avoiding a hard loop boundary.
export function loopBuffer(context,buffer){
 const overlap=Math.min(Math.floor(buffer.sampleRate*.06),Math.floor(buffer.length/4));
 if(overlap<2)return buffer;
 const length=buffer.length-overlap,result=context.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const source=buffer.getChannelData(channel),target=result.getChannelData(channel);
  target.set(source.subarray(overlap));
  for(let i=0;i<overlap;i++){const mix=i/(overlap-1);target[length-overlap+i]=source[length+i]*(1-mix)+source[i]*mix;}
 }
 return result;
}
export class AudioManager{
 constructor({host=window,document:doc=document,requirePlay=false}={}){
  this.playAuthorized=!requirePlay;this.host=host;this.document=doc;this.channels={};this.previousSpeed=0;this.settings=loadAudioSettings(safeStorage(host));this.volume=this.settings.master;this.channelGains={};this.paused=false;this.sceneMusicEnabled=true;this.active=false;this.disposed=false;this.errors={};this.turboActive=false;
  // Optional encoded-data prefetch is silent: no context exists before PLAY.
  this.turboData=this.fetchAudio(audioAssets.turbo).catch(()=>null);
  this.windowBuffers={};this.windowData=Object.fromEntries(Object.entries(windowAssets).map(([name,url])=>[name,this.fetchAudio(url).catch(()=>null)]));
  this.rescueBuffers={};this.rescueData=Object.fromEntries(Object.entries(rescueAssets).map(([name,url])=>[name,this.fetchAudio(url).catch(()=>null)]));
  this.foundBuffers={};this.foundData=Object.fromEntries(Object.entries(foundAssets).map(([name,url])=>[name,this.fetchAudio(url).catch(()=>null)]));
  this.gesture=()=>this.unlock();
  this.visibility=()=>{if(doc.hidden){this.suspend();}else if(this.active)this.unlock();};
  this.hide=()=>this.suspend();this.show=()=>{if(this.active&&!doc.hidden)this.unlock();};
  for(const event of ['pointerdown','touchend','keydown'])doc.addEventListener(event,this.gesture,{capture:true,passive:true});
  doc.addEventListener('visibilitychange',this.visibility);host.addEventListener('pagehide',this.hide);host.addEventListener('pageshow',this.show);
 }
 beginGameplay(){this.playAuthorized=true;this.unlock();}
 smooth(param,value,seconds=.18){const now=this.context.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}param.setTargetAtTime(value,now,seconds);}
 unlock(){
  if(!this.playAuthorized||this.disposed||this.document.hidden)return;
  try{
   if(!this.context){const AudioContext=this.host.AudioContext||this.host.webkitAudioContext;if(!AudioContext)return;
    this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
    for(const name of volumeKeys.filter(key=>key!=='master')){const gain=this.context.createGain();gain.gain.value=this.settings[name];gain.connect(this.master);this.channelGains[name]=gain;}
    if(this.host.Audio&&this.context.createMediaElementSource){this.music=new MusicController(this.context,this.channelGains.music,{host:this.host});this.music.enabled=this.settings.musicEnabled&&!this.paused&&this.sceneMusicEnabled;}
    this.loading=this.load();
   }
   this.active=true;this.music?.unlock();
   // Invoke resume and a silent source synchronously inside the gesture for iOS Safari.
   const resumed=this.context.resume();const silent=this.context.createBufferSource();silent.buffer=this.context.createBuffer(1,1,this.context.sampleRate);silent.connect(this.master);silent.onended=()=>silent.disconnect();silent.start();
   Promise.resolve(resumed).then(()=>{if(!this.document.hidden&&!this.disposed)this.smooth(this.master.gain,this.settings.muted?0:this.volume,.1);}).catch(()=>{});
  }catch{/* Unsupported or interrupted audio must never interrupt gameplay. */}
 }
 async fetchAudio(url){const response=await this.host.fetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.arrayBuffer();}
 async load(){await Promise.all(Object.entries({...audioAssets,...windowAssets,...rescueAssets,...foundAssets}).map(async([name,url])=>{
  try{const data=await (name==='turbo'?this.turboData:(this.windowData?.[name]??this.rescueData?.[name]??this.foundData?.[name]))||await this.fetchAudio(url);
   // Callback form also works on older iPhone Safari versions.
   const buffer=await new Promise((resolve,reject)=>this.context.decodeAudioData(data,resolve,reject));if(this.disposed)return;
   if(name in foundAssets){this.foundBuffers[name]=buffer;return;}
   if(name in rescueAssets){this.rescueBuffers[name]=buffer;return;}
   if(name in windowAssets){this.windowBuffers[name]=buffer;return;}
   if(name==='turbo'){this.turboSound=new TurboSound(this.context,this.channelGains.turbo,buffer);return;}
   if(name==='collision'){this.impacts=new ImpactSounds(this.context,this.master,buffer);return;}
   if(name==='bubbles'){this.bubbles=new BubbleBursts(this.context,this.channelGains.bubbles,buffer);this.discoverySound=new DiscoverySound(this.context,this.channelGains.bubbles,buffer);return;}
   const gain=this.context.createGain(),source=this.context.createBufferSource();gain.gain.value=0;gain.connect(this.channelGains[name]);source.buffer=loopBuffer(this.context,buffer);source.loop=true;source.connect(gain);source.start();this.channels[name]={gain,source};
  }catch(error){this.errors[name]=String(error);console.warn(`Oceanbound audio unavailable: ${url}`,error);}
 }));}
 // UI effects share the master effects path used by collision sounds, even while paused.
 playWindow(open){
  if(!this.playAuthorized||this.disposed||this.document.hidden||this.settings.muted||this.settings.master<=0||this.context?.state!=='running')return;
  const buffer=this.windowBuffers?.[open?'windowOpen':'windowClose'];if(!buffer)return;
  try{
   this.stopWindowSound();
   const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;gain.gain.value=.25;source.connect(gain);gain.connect(this.master);
   const sound={source,gain};this.windowSound=sound;
   source.onended=()=>{source.disconnect();gain.disconnect();if(this.windowSound===sound)this.windowSound=null;};source.start();
  }catch{/* Optional UI audio must never interrupt a window action. */}
 }
 stopWindowSound(){const sound=this.windowSound;if(!sound)return;this.windowSound=null;try{sound.source.stop();}catch{}sound.source.disconnect();sound.gain.disconnect();}
 // Only successful rescue state transitions call this; never queue stale feedback.
 playRescue(attaching=false){
  if(!this.playAuthorized||this.disposed||this.document.hidden||this.settings.muted||this.settings.master<=0||this.context?.state!=='running')return;
  const buffer=this.rescueBuffers?.[attaching?'lasso':'rescue'];if(!buffer)return;
  try{
   this.stopRescueSound();
   const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;gain.gain.value=.25;source.connect(gain);gain.connect(this.master);
   const sound={source,gain};this.rescueSound=sound;
   source.onended=()=>{source.disconnect();gain.disconnect();if(this.rescueSound===sound)this.rescueSound=null;};source.start();
  }catch{/* Optional feedback must never interrupt towing or delivery. */}
 }
 stopRescueSound(){const sound=this.rescueSound;if(!sound)return;this.rescueSound=null;try{sound.source.stop();}catch{}sound.source.disconnect();sound.gain.disconnect();}
 // Called only after a successful first-discovery notification is shown.
 playFound(kind){
  if(!this.playAuthorized||this.disposed||this.document.hidden||this.settings.muted||this.settings.master<=0||this.context?.state!=='running')return ()=>{};
  const buffer=this.foundBuffers?.[kind];if(!buffer)return ()=>{};
  try{
   this.stopFoundSound();
   const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;gain.gain.value=kind==='gup'?.05:.25;source.connect(gain);gain.connect(this.master);
   const sound={source,gain};this.foundSound=sound;
   source.onended=()=>{source.disconnect();gain.disconnect();if(this.foundSound===sound)this.foundSound=null;};source.start();
   return ()=>{if(this.foundSound===sound)this.stopFoundSound();};
  }catch{/* Optional audio must never block a discovery notification. */return ()=>{};}
 }
 stopFoundSound(){const sound=this.foundSound;if(!sound)return;this.foundSound=null;try{sound.source.stop();}catch{}sound.source.disconnect();sound.gain.disconnect();}
 setVolume(value){this.setChannelVolume('master',value);}
 setChannelVolume(name,value){if(!volumeKeys.includes(name)||!Number.isFinite(Number(value)))return;this.settings[name]=clamp(Number(value));this.volume=this.settings.master;this.applySettings();}
 setMuted(value){this.settings.muted=!!value;this.applySettings();}
 setMusicEnabled(value){this.settings.musicEnabled=!!value;this.applySettings();}
 resetSettings(){this.settings={...audioDefaults};this.volume=this.settings.master;this.applySettings();}
 applySettings(){this.saved=saveAudioSettings(safeStorage(this.host),this.settings);if(!this.context)return;
  if(this.settings.muted||this.settings.master<=0){this.stopWindowSound();this.stopRescueSound();this.stopFoundSound();}
  if(this.settings.muted||this.settings.master<=0||this.settings.bubbles<=0)this.discoverySound?.suspend();
  this.smooth(this.master.gain,this.settings.muted?0:this.volume,.08);
  for(const [name,gain] of Object.entries(this.channelGains))this.smooth(gain.gain,this.settings[name],.08);
  const enabled=this.settings.musicEnabled&&!this.paused&&this.sceneMusicEnabled;if(this.music&&this.music.enabled!==enabled)this.music.setEnabled(enabled);
 }
 // Pause/scene hooks. Opening settings does not pause or restart music.
 setPaused(value){this.paused=!!value;if(this.paused){this.impacts?.suspend();this.turboSound?.suspend();}if(this.paused&&this.context){for(const [name,channel] of Object.entries(this.channels))if(name!=='ambience')this.smooth(channel.gain.gain,0,.15);}this.applySettings();}
 playDiscovery(){if(!this.playAuthorized||this.disposed||this.document.hidden||this.settings.muted||this.settings.master<=0||this.settings.bubbles<=0||this.context?.state!=='running')return ()=>{};return this.discoverySound?.play()??(()=>{});}
 playCollision(contact){if(!this.paused&&!this.settings.muted&&this.context?.state==='running')this.impacts?.play(contact);}
 setVehicle(profile){this.vehicleAudio=profile;}
 setSceneMusicEnabled(value){this.sceneMusicEnabled=!!value;this.applySettings();}
 suspend(){this.stopFoundSound();this.stopRescueSound();this.stopWindowSound();this.discoverySound?.suspend();this.turboSound?.suspend();this.impacts?.suspend();this.music?.suspend();this.bubbles?.suspend();if(!this.context)return;this.master.gain.cancelScheduledValues(this.context.currentTime);this.master.gain.setValueAtTime(0,this.context.currentTime);Promise.resolve(this.context.suspend()).catch(()=>{});}
 update(dt,sub,input){
  const turboStarted=sub.turbo.active&&!this.turboActive;this.turboActive=sub.turbo.active;
  if(turboStarted&&!this.paused&&!this.settings.muted&&this.settings.turbo>0&&this.context?.state==='running')this.turboSound?.play();
  const targets=audioTargets(sub,input,this.previousSpeed,dt);this.previousSpeed=targets.speed;targets.propeller*=this.vehicleAudio?.propellerGain??1;targets.bubbles*=this.vehicleAudio?.bubbleGain??1;targets.rate*=this.vehicleAudio?.rateMultiplier??1;if(this.context?.state!=='running')return;
  this.bubbles?.update(dt,{intensity:this.paused?0:targets.bubbles/.1,moving:!this.paused&&targets.bubbles>0&&Math.abs(sub.speed)>=bubbleAudioConfig.minimumMovementThreshold});
  for(const [name,channel] of Object.entries(this.channels)){this.smooth(channel.gain.gain,this.paused?0:targets[name],name==='ambience'?.8:.2);if(name==='propeller')this.smooth(channel.source.playbackRate,targets.rate,.25);}
 }
 dispose(){this.stopFoundSound();this.stopRescueSound();this.stopWindowSound();this.discoverySound?.suspend();this.disposed=true;this.turboSound?.suspend();this.impacts?.suspend();this.music?.dispose();this.bubbles?.dispose();for(const event of ['pointerdown','touchend','keydown'])this.document.removeEventListener(event,this.gesture,true);this.document.removeEventListener('visibilitychange',this.visibility);this.host.removeEventListener('pagehide',this.hide);this.host.removeEventListener('pageshow',this.show);for(const channel of Object.values(this.channels)){channel.source.stop();channel.source.disconnect();channel.gain.disconnect();}for(const gain of Object.values(this.channelGains))gain.disconnect();this.context?.close().catch(()=>{});}
}
