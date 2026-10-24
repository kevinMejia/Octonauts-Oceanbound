// Sampled once per metrics window, never an additional animation loop.
export class AdaptiveResolution{
 constructor({enabled=true,min=.7,max=2,targetFrameMs=20}={}){this.enabled=enabled;this.max=max;this.min=Math.min(min,max);this.target=targetFrameMs;this.reset();}
 reset(){this.slow=0;this.fast=0;this.cooldown=0;}
 sample(frameMs,current,sampleCount=30){
  if(!this.enabled||sampleCount<15||!Number.isFinite(frameMs)||frameMs<=0||frameMs>250){this.slow=this.fast=0;return current;}
  if(this.cooldown>0){this.cooldown--;return current;}
  this.slow=frameMs>this.target*1.2?this.slow+1:0;
  this.fast=frameMs<this.target*.9?this.fast+1:0;
  let next=current;
  if(this.slow>=3)next=Math.max(this.min,current-.15);
  else if(this.fast>=6)next=Math.min(this.max,current+.1);
  if(next!==current){this.slow=this.fast=0;this.cooldown=5;return Math.min(this.max,Math.max(this.min,Math.round(next*100)/100));}
  return current;
 }
}
