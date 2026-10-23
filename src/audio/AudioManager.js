import {submarineConfig as config} from '../config/submarineConfig.js';
import {audioDefaults,loadAudioSettings,saveAudioSettings,volumeKeys} from './AudioSettings.js';
import {MusicController} from './MusicController.js';
import {bubbleRate} from '../effects/waterMath.js';
const safeStorage=host=>{try{return host.localStorage;}catch{return undefined;}};
const clamp=value=>Math.max(0,Math.min(1,value));
export const audioAssets={propeller:new URL('../../assets/audio/gup-b-propeller.mp3',import.meta.url).href,bubbles:new URL('../../assets/audio/underwater-bubbles.mp3',import.meta.url).href,ambience:new URL('../../assets/audio/underwater-ambience.mp3',import.meta.url).href};
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
 constructor({host=window,document:doc=document}={}){
  this.host=host;this.document=doc;this.channels={};this.previousSpeed=0;this.settings=loadAudioSettings(safeStorage(host));this.volume=this.settings.master;this.channelGains={};this.paused=false;this.sceneMusicEnabled=true;this.active=false;this.disposed=false;this.errors={};
  this.gesture=()=>this.unlock();
  this.visibility=()=>{if(doc.hidden){this.suspend();}else if(this.active)this.unlock();};
  this.hide=()=>this.suspend();this.show=()=>{if(this.active&&!doc.hidden)this.unlock();};
  for(const event of ['pointerdown','touchend','keydown'])doc.addEventListener(event,this.gesture,{capture:true,passive:true});
  doc.addEventListener('visibilitychange',this.visibility);host.addEventListener('pagehide',this.hide);host.addEventListener('pageshow',this.show);
 }
 smooth(param,value,seconds=.18){const now=this.context.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}param.setTargetAtTime(value,now,seconds);}
 unlock(){
  if(this.disposed||this.document.hidden)return;
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
 async load(){await Promise.all(Object.entries(audioAssets).map(async([name,url])=>{
  try{const response=await this.host.fetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.arrayBuffer();
   // Callback form also works on older iPhone Safari versions.
   const buffer=await new Promise((resolve,reject)=>this.context.decodeAudioData(data,resolve,reject));if(this.disposed)return;
   const gain=this.context.createGain(),source=this.context.createBufferSource();gain.gain.value=0;gain.connect(this.channelGains[name]);source.buffer=loopBuffer(this.context,buffer);source.loop=true;source.connect(gain);source.start();this.channels[name]={gain,source};
  }catch(error){this.errors[name]=String(error);console.warn(`Oceanbound audio unavailable: ${url}`,error);}
 }));}
 setVolume(value){this.setChannelVolume('master',value);}
 setChannelVolume(name,value){if(!volumeKeys.includes(name)||!Number.isFinite(Number(value)))return;this.settings[name]=clamp(Number(value));this.volume=this.settings.master;this.applySettings();}
 setMuted(value){this.settings.muted=!!value;this.applySettings();}
 setMusicEnabled(value){this.settings.musicEnabled=!!value;this.applySettings();}
 resetSettings(){this.settings={...audioDefaults};this.volume=this.settings.master;this.applySettings();}
 applySettings(){this.saved=saveAudioSettings(safeStorage(this.host),this.settings);if(!this.context)return;
  this.smooth(this.master.gain,this.settings.muted?0:this.volume,.08);
  for(const [name,gain] of Object.entries(this.channelGains))this.smooth(gain.gain,this.settings[name],.08);
  const enabled=this.settings.musicEnabled&&!this.paused&&this.sceneMusicEnabled;if(this.music&&this.music.enabled!==enabled)this.music.setEnabled(enabled);
 }
 // Hooks for a future pause/scene system. Opening settings does not pause or restart music.
 setPaused(value){this.paused=!!value;this.applySettings();}
 setSceneMusicEnabled(value){this.sceneMusicEnabled=!!value;this.applySettings();}
 suspend(){this.music?.suspend();if(!this.context)return;this.master.gain.cancelScheduledValues(this.context.currentTime);this.master.gain.setValueAtTime(0,this.context.currentTime);Promise.resolve(this.context.suspend()).catch(()=>{});}
 update(dt,sub,input){const targets=audioTargets(sub,input,this.previousSpeed,dt);this.previousSpeed=targets.speed;if(this.context?.state!=='running')return;
  for(const [name,channel] of Object.entries(this.channels)){this.smooth(channel.gain.gain,this.paused?0:targets[name],name==='ambience'?.8:.2);if(name==='propeller')this.smooth(channel.source.playbackRate,targets.rate,.25);}
 }
 dispose(){this.disposed=true;this.music?.dispose();for(const event of ['pointerdown','touchend','keydown'])this.document.removeEventListener(event,this.gesture,true);this.document.removeEventListener('visibilitychange',this.visibility);this.host.removeEventListener('pagehide',this.hide);this.host.removeEventListener('pageshow',this.show);for(const channel of Object.values(this.channels)){channel.source.stop();channel.source.disconnect();channel.gain.disconnect();}for(const gain of Object.values(this.channelGains))gain.disconnect();this.context?.close().catch(()=>{});}
}
