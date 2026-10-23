// A gentle one-shot using the existing bubble recording and Bubbles volume bus.
// A dedicated authored unlock recording can be passed here later, unchanged.
export class DiscoverySound{
 constructor(context,destination,buffer){Object.assign(this,{context,destination,buffer});this.voice=null;this.played=0;let peak=1;for(let i=0;i<buffer.numberOfChannels;i++)for(const sample of buffer.getChannelData(i))peak=Math.max(peak,Math.abs(sample));this.level=.12/peak;}
 play(){
  if(this.context.state!=='running')return ()=>{};this.suspend();const source=this.context.createBufferSource(),gain=this.context.createGain(),now=this.context.currentTime,duration=Math.min(.85,this.buffer.duration),voice={source,gain};
  source.buffer=this.buffer;source.loop=false;source.playbackRate.setValueAtTime(.94,now);source.playbackRate.linearRampToValueAtTime(1.08,now+duration);source.connect(gain);gain.connect(this.destination);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.level,now+Math.min(.06,duration/4));gain.gain.setValueAtTime(this.level,now+duration*.48);gain.gain.linearRampToValueAtTime(0,now+duration);
  this.voice=voice;source.onended=()=>{source.disconnect();gain.disconnect();if(this.voice===voice)this.voice=null;};source.start(now,0,duration);source.stop(now+duration);this.played++;
  return ()=>{if(this.voice===voice)this.suspend();};
 }
 suspend(){if(!this.voice)return;const {source,gain}=this.voice;this.voice=null;source.onended=null;try{source.stop();}catch{}source.disconnect();gain.disconnect();}
}
