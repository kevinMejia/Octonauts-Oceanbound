import {DiscoveryParticles,discoveryColors,discoveryTiming} from './discoveryCelebrationMath.js';

const MAX_PIXELS=1200000;
export class DiscoveryCelebration{
 constructor(dialog,image,{host=window,doc=document}={}){
  Object.assign(this,{dialog,image,host,doc});this.active=false;this.frame=null;this.starts=0;this.renderedFrames=0;
  this.tick=now=>this.animate(now);this.resize=()=>this.measure(true);this.scroll=()=>this.measure();
  this.visibility=()=>{this.dialog.classList.toggle('tab-hidden',this.doc.hidden);if(this.doc.hidden){this.cancelFrame();this.last=null;}else this.schedule();};this.motionChanged=()=>this.stop();
 }
 start(){
  if(this.active)return false;this.active=true;this.starts++;this.motion=this.host.matchMedia('(prefers-reduced-motion:reduce)');
  if(this.motion.matches)return true;
  try{
   this.dialog.classList.add('discovery-celebrating','discovery-fx-live');this.canvases=['back','front'].map(layer=>{const c=this.doc.createElement('canvas');c.className='discovery-fx discovery-fx-'+layer;c.setAttribute('aria-hidden','true');(layer==='back'?this.doc.body:this.dialog).append(c);return c;});
   this.contexts=this.canvases.map(c=>c.getContext('2d',{alpha:true}));if(this.contexts.some(c=>!c))throw Error('Canvas unavailable');
   this.model=new DiscoveryParticles({compact:this.host.innerWidth<600||this.host.matchMedia('(any-pointer:coarse)').matches});this.measure(true);this.model.start(this.bounds);this.makeSprites();this.last=null;
   this.host.addEventListener('resize',this.resize);this.host.visualViewport?.addEventListener('resize',this.resize);this.dialog.addEventListener('scroll',this.scroll,true);this.doc.addEventListener('visibilitychange',this.visibility);
   if(this.host.ResizeObserver){this.observer=new this.host.ResizeObserver(()=>this.measure());this.observer.observe(this.dialog);}
   if(this.motion.addEventListener)this.motion.addEventListener('change',this.motionChanged);else this.motion.addListener?.(this.motionChanged);
   this.schedule();return true;
  }catch(error){this.stop();console.warn('Discovery decoration unavailable',error);return false;}
 }
 measure(resize=false){
  if(!this.canvases)return;const modal=this.dialog.getBoundingClientRect(),image=this.image.getBoundingClientRect(),close=this.dialog.querySelector('#closeDiscovery').getBoundingClientRect(),width=this.host.innerWidth,height=this.host.innerHeight;
  this.bounds={width,height,modal,image,close};if(this.model?.bounds)this.model.resize(this.bounds);
  if(resize){this.ratio=Math.min(this.host.devicePixelRatio||1,1.5,Math.sqrt(MAX_PIXELS/(width*height)));for(const c of this.canvases){c.width=Math.max(1,Math.round(width*this.ratio));c.height=Math.max(1,Math.round(height*this.ratio));c.style.width=width+'px';c.style.height=height+'px';}}
  // The front layer escapes the bezel clip without altering the approved frame.
  // Counter-transform its viewport while the parent dialog gently bounces.
  const scale=modal.width/this.dialog.offsetWidth||1,front=this.canvases[1];front.style.left=(-modal.left/scale-this.dialog.clientLeft)+'px';front.style.top=(-modal.top/scale-this.dialog.clientTop)+'px';front.style.transform='scale('+1/scale+')';
 }
 sprite(size,paint){const c=this.doc.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);return c;}
 makeSprites(){
  this.bubble=this.sprite(128,(c,n)=>{const r=n*.43,x=n/2,y=n/2,g=c.createRadialGradient(x-r*.25,y-r*.3,r*.05,x,y,r);g.addColorStop(0,'#efffff40');g.addColorStop(.65,'#8bdeef08');g.addColorStop(.88,'#a4efff40');g.addColorStop(1,'#e0ffffaa');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle='#dcffffba';c.lineWidth=1.6;c.stroke();c.strokeStyle='#ffffffed';c.lineWidth=3;c.lineCap='round';c.beginPath();c.arc(x,y,r*.78,Math.PI*1.08,Math.PI*1.42);c.stroke();c.fillStyle='#ffffffcc';c.beginPath();c.ellipse(x-r*.32,y-r*.38,r*.11,r*.065,-.7,0,Math.PI*2);c.fill();});
  this.sparks=discoveryColors.spark.map(color=>this.sprite(48,(c,n)=>{const g=c.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);g.addColorStop(0,'#ffffff');g.addColorStop(.18,color);g.addColorStop(.45,color+'70');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,n,n);}));
 }
 schedule(){if(this.active&&this.model&&!this.doc.hidden&&this.frame===null)this.frame=this.host.requestAnimationFrame(this.tick);}
 cancelFrame(){if(this.frame!==null)this.host.cancelAnimationFrame(this.frame);this.frame=null;}
 animate(now){
  this.frame=null;if(!this.active||this.doc.hidden)return;if(this.last!==null&&now-this.last<(this.model.time>=3?30:12)){this.schedule();return;}const dt=this.last===null?0:Math.min(.05,(now-this.last)/1000);this.last=now;this.model.update(dt);
  if(this.model.time<.95)this.measure();this.draw();this.renderedFrames++;this.schedule();
 }
 draw(){
  const {width,height,close,image}=this.bounds,time=this.model.time;
  for(let layer=0;layer<2;layer++){
   const c=this.contexts[layer];c.setTransform(this.ratio,0,0,this.ratio,0,0);c.clearRect(0,0,width,height);c.save();
   if(layer===0&&time<discoveryTiming.end){const radius=Math.min(width,height)*.63,g=c.createRadialGradient(width/2,height/2,30,width/2,height/2,radius),fade=Math.min(1,time/.18)*Math.max(0,1-time/3);g.addColorStop(0,'#e7ffea66');g.addColorStop(.45,'#6ff4e840');g.addColorStop(1,'#41cfff00');c.globalAlpha=fade;c.fillStyle=g;c.fillRect(0,0,width,height);}
   if(layer===1){c.beginPath();c.rect(0,0,width,height);c.rect(close.left-12,close.top-12,close.width+24,close.height+24);c.rect(image.left+12,image.top+12,Math.max(0,image.width-24),Math.max(0,image.height-24));c.clip('evenodd');}
   for(const p of this.model.particles){if(p.layer!==(layer?'front':'back'))continue;c.globalAlpha=p.alpha;
    if(p.kind==='bubble'){const size=p.r*2.4;c.drawImage(this.bubble,p.x-size/2,p.y-size/2,size,size);}
    else if(p.kind==='spark'){const size=p.r*6;c.drawImage(this.sparks[p.color],p.x-size/2,p.y-size/2,size,size);}
    else{c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.scale(Math.max(.2,Math.abs(Math.cos(p.phase+p.age*2.3))),1);c.fillStyle=discoveryColors.confetti[p.color];c.beginPath();c.moveTo(-p.r,-p.length/2);c.quadraticCurveTo(p.r*.5,-p.length*.3,p.r,p.length/2);c.lineTo(-p.r*.35,p.length/2);c.quadraticCurveTo(-p.r*1.5,0,-p.r,-p.length/2);c.fill();c.restore();}
   }c.restore();
  }
 }
 stop(){
  this.cancelFrame();this.active=false;this.last=null;this.host.removeEventListener('resize',this.resize);this.host.visualViewport?.removeEventListener('resize',this.resize);this.dialog.removeEventListener('scroll',this.scroll,true);this.doc.removeEventListener('visibilitychange',this.visibility);
  this.observer?.disconnect();this.observer=null;
  if(this.motion?.removeEventListener)this.motion.removeEventListener('change',this.motionChanged);else this.motion?.removeListener?.(this.motionChanged);
  for(const c of this.canvases??[]){c.remove();c.width=c.height=0;}for(const c of [this.bubble,...this.sparks??[]])if(c)c.width=c.height=0;
  this.canvases=this.contexts=this.model=this.bubble=this.sparks=this.bounds=this.motion=null;this.dialog.classList.remove('discovery-celebrating','discovery-fx-live','tab-hidden');
 }
}
