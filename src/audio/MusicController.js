export const musicConfig=Object.freeze({url:new URL('../../assets/audio/oceanbound-background.mp3',import.meta.url).href,crossfade:4,fadeIn:3,fadeOut:2,level:.35});
// Stream two media elements rather than decode two three-minute PCM buffers.
// Loop timing follows the outgoing media clock, never an accumulated wall-clock deadline.
export class MusicController{
 constructor(context,destination,{host=window,config={}}={}){
  this.context=context;this.host=host;this.config={...musicConfig,...config};this.enabled=true;this.suspended=false;this.started=false;this.disposed=false;this.current=0;this.transition=null;this.pending=false;this.generation=0;
  this.gate=context.createGain();this.gate.gain.value=0;this.gate.connect(destination);
  this.slots=[0,1].map(()=>{const media=new host.Audio();media.preload='auto';media.playsInline=true;media.src=this.config.url;
   const source=context.createMediaElementSource(media),gain=context.createGain();gain.gain.value=0;source.connect(gain);gain.connect(this.gate);
   media.addEventListener('error',()=>{this.error='Background music could not be loaded.';});
   media.addEventListener('ended',()=>this.tick());return {media,source,gain};});
  this.timer=host.setInterval(()=>this.tick(),100);
 }
 ramp(param,value,duration){const now=this.context.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}param.linearRampToValueAtTime(value,now+duration);}
 play(slot){try{return Promise.resolve(slot.media.play());}catch(error){return Promise.reject(error);}}
 unlock(){
  if(this.disposed)return;
  // Prime both elements in the gesture on iOS; all priming audio is routed through zero gains.
  if(!this.primed){this.primed=true;const standby=this.slots[1];this.play(standby).then(()=>{if(!this.transition&&this.current!==1)standby.media.pause();}).catch(()=>{});}
  this.suspended=false;if(this.enabled)this.resume();
 }
 resume(){
  if(this.disposed||this.suspended||!this.enabled)return;
  this.host.clearTimeout(this.pauseTimer);
  // The outgoing recording may finish during a disable fade. Continue the incoming
  // recording rather than asking play() to restart the ended outgoing element.
  if(this.transition&&this.slots[this.current].media.ended){const outgoing=this.slots[this.current];outgoing.media.pause();outgoing.media.currentTime=0;outgoing.gain.gain.setValueAtTime(0,this.context.currentTime);this.current=this.transition.next;this.transition=null;this.slots[this.current].gain.gain.setValueAtTime(this.config.level,this.context.currentTime);}
  const slot=this.slots[this.current];
  if(this.started&&!slot.media.paused)return;
  const generation=++this.generation;
  this.play(slot).then(()=>{
   if(this.disposed||generation!==this.generation||this.suspended||!this.enabled){if(this.disposed||this.suspended||!this.enabled)slot.media.pause();return;}
   if(!this.transition)slot.gain.gain.setValueAtTime(this.config.level,this.context.currentTime);this.started=true;this.ramp(this.gate.gain,1,this.config.fadeIn);
   if(this.transition)this.play(this.slots[this.transition.next]).catch(()=>{});
  }).catch(()=>{/* A later gesture retries interrupted or blocked playback. */});
 }
 setEnabled(value){this.enabled=!!value;if(this.enabled){this.ramp(this.gate.gain,1,this.config.fadeIn);this.resume();}else{
  this.ramp(this.gate.gain,0,this.config.fadeOut);this.host.clearTimeout(this.pauseTimer);
  this.pauseTimer=this.host.setTimeout(()=>{if(!this.enabled)for(const slot of this.slots)slot.media.pause();},this.config.fadeOut*1000);
 }}
 suspend(){this.suspended=true;this.generation++;for(const slot of this.slots)slot.media.pause();this.ramp(this.gate.gain,0,0);}
 tick(){
  if(this.disposed||this.suspended||!this.enabled||!this.started||this.context.state!=='running')return;
  const outgoing=this.slots[this.current],media=outgoing.media;
  if(this.transition){
   const incoming=this.slots[this.transition.next];
   // Drive the blend with actual playback progress (also handles buffering without timing drift).
   const progress=Math.max(0,Math.min(1,(media.currentTime-this.transition.start)/this.transition.duration));
   const now=this.context.currentTime;outgoing.gain.gain.setTargetAtTime(this.config.level*Math.cos(progress*Math.PI/2),now,.03);incoming.gain.gain.setTargetAtTime(this.config.level*Math.sin(progress*Math.PI/2),now,.03);
   if(progress>=1||media.ended){outgoing.media.pause();outgoing.media.currentTime=0;outgoing.gain.gain.setValueAtTime(0,now);incoming.gain.gain.setValueAtTime(this.config.level,now);this.current=this.transition.next;this.transition=null;}
   return;
  }
  if((media.paused&&!media.ended)||!Number.isFinite(media.duration)||media.duration<=0||this.pending)return;
  const overlap=Math.min(Math.max(0,this.config.crossfade),media.duration/4);
  if(overlap===0){media.loop=true;return;}
  if(media.duration-media.currentTime>overlap)return;
  const next=1-this.current,incoming=this.slots[next];
  if(incoming.media.readyState<3)return; // Leave outgoing audio intact while the next copy buffers.
  const generation=this.generation;this.pending=true;incoming.media.currentTime=0;incoming.gain.gain.setValueAtTime(0,this.context.currentTime);
  this.play(incoming).then(()=>{
   this.pending=false;if(generation!==this.generation||this.disposed||this.suspended||!this.enabled){incoming.media.pause();return;}
   this.transition={next,start:media.currentTime,duration:Math.max(.05,media.duration-media.currentTime)};
  }).catch(()=>{this.pending=false;});
 }
 dispose(){this.disposed=true;this.generation++;this.host.clearInterval(this.timer);this.host.clearTimeout(this.pauseTimer);for(const slot of this.slots){slot.media.pause();slot.media.removeAttribute('src');slot.media.load();slot.source.disconnect();slot.gain.disconnect();}this.gate.disconnect();}
}
