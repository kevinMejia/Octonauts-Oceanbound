import {collisionConfig} from '../config/collisionConfig.js';
// One-shot voices share AudioManager's context and master bus, with a strict cap.
export class ImpactSounds{
 constructor(context,master,buffer,config=collisionConfig.audio){this.context=context;this.master=master;this.buffer=buffer;this.config=config;this.last=-Infinity;this.voices=new Set();this.played=0;}
 play(contact){
  const c=this.config,now=this.context.currentTime;
  if(!contact||contact.fresh===false||contact.impact<c.threshold||now-this.last<c.cooldown||this.voices.size>=c.maxVoices)return false;
  const strength=Math.min(1,(contact.impact-c.threshold)/(c.fullImpact-c.threshold));
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffer;
  gain.gain.value=c.maxGain*(.2+.8*strength)*(c.surfaces[contact.surface]??1);source.connect(gain);gain.connect(this.master);
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(source);};
  this.voices.add(source);this.last=now;this.played++;source.start();return true;
 }
 suspend(){for(const source of this.voices){source.stop();source.onended();source.onended=null;}this.voices.clear();}
}
