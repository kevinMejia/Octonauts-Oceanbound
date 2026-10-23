// Short (~0.2s) segments allow a little overlap at the .18s minimum interval.
// Offsets reuse distinct portions of the supplied one-second recording; no loop.
// Future clips can be supplied as additional {buffer,offset,duration} variations.
export const bubbleAudioConfig=Object.freeze({enabled:true,minInterval:.18,maxInterval:2.5,minPlaybackRate:.92,maxPlaybackRate:1.08,minVolumeMultiplier:.65,maxVolumeMultiplier:1,maxSimultaneousBubbles:3,minimumMovementThreshold:.35,attack:.025,release:.055,maxEventGain:.035,segments:[{offset:.015,duration:.22},{offset:.25,duration:.21},{offset:.47,duration:.25},{offset:.64,duration:.22}]});
const clamp=n=>Math.max(0,Math.min(1,n));
export class BubbleBursts{
 constructor(context,destination,buffer,{random=Math.random,config={},variations}={}){
  this.context=context;this.destination=destination;this.random=random;this.config={...bubbleAudioConfig,...config};this.voices=new Set();this.intensity=0;this.wait=.6+random();this.last=-1;this.disposed=false;
  this.variations=(variations??this.config.segments.map(segment=>({...segment,buffer}))).filter(v=>v.offset>=0&&v.offset<v.buffer.duration).map(v=>({...v,duration:Math.min(v.duration,v.buffer.duration-v.offset)})).filter(v=>v.duration>.05);
  // The source exceeds full scale near its strongest event. Attenuate peaks only;
  // never amplify quieter segments or alter the original recording.
  for(const v of this.variations){let peak=1;for(let channel=0;channel<v.buffer.numberOfChannels;channel++){const samples=v.buffer.getChannelData(channel);for(let i=Math.floor(v.offset*v.buffer.sampleRate);i<Math.min(samples.length,Math.ceil((v.offset+v.duration)*v.buffer.sampleRate));i++)peak=Math.max(peak,Math.abs(samples[i]));}v.headroom=1/peak;}
 }
 between(a,b){return a+(b-a)*this.random();}
 interval(){const c=this.config,low=c.minInterval+(c.maxInterval-c.minInterval)*.55*(1-this.intensity),high=c.maxInterval-(c.maxInterval-c.minInterval)*.65*this.intensity;return this.between(low,Math.max(low,high))*(this.random()<.15?1.5:1);}
 update(dt,{intensity,moving}){
  if(this.disposed||this.context.state!=='running')return;
  this.intensity+=(clamp(intensity)-this.intensity)*(1-Math.exp(-Math.max(0,dt)/.35));
  if(!this.config.enabled||!moving||!this.variations.length){this.wait=Math.max(this.wait,.2);return;}
  this.wait-=Math.max(0,dt);if(this.wait>0)return;
  this.wait=this.interval(); // Never catch up missed events in a frame or after tab suspension.
  if(this.voices.size>=this.config.maxSimultaneousBubbles)return;
  this.burst();
 }
 burst(){
  const c=this.config,n=this.variations.length;if(!n||this.disposed||this.voices.size>=c.maxSimultaneousBubbles)return;
  let index=Math.floor(this.random()*(n-(this.last>=0&&n>1?1:0)));if(n>1&&this.last>=0&&index>=this.last)index++;this.last=index;
  const v=this.variations[index],source=this.context.createBufferSource(),gain=this.context.createGain(),now=this.context.currentTime;
  const rate=this.between(c.minPlaybackRate,c.maxPlaybackRate),duration=v.duration/rate,level=c.maxEventGain*(.25+.75*this.intensity)*this.between(c.minVolumeMultiplier,c.maxVolumeMultiplier)*v.headroom;
  source.buffer=v.buffer;source.loop=false;source.playbackRate.setValueAtTime(rate,now);source.connect(gain);gain.connect(this.destination);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+Math.min(c.attack,duration/3));gain.gain.setValueAtTime(level,now+duration-Math.min(c.release,duration/3));gain.gain.linearRampToValueAtTime(0,now+duration);
  const voice={source,gain};this.voices.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};source.start(now,v.offset,v.duration);source.stop(now+duration+.005);
 }
 suspend(){for(const voice of this.voices){voice.source.stop();voice.source.disconnect();voice.gain.disconnect();}this.voices.clear();this.wait=.6+this.random();this.intensity=0;}
 dispose(){this.disposed=true;this.suspend();}
}
