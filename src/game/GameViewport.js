import {viewportConfig} from '../config/viewportConfig.js';

// One owner for the game surface and projection. Callbacks always measure live;
// a new event cancels the previous settling work rather than replaying old sizes.
export class GameViewport{
 constructor(renderer,camera,onChange,{host=window,root=document.body,config=viewportConfig}={}){
  this.renderer=renderer;this.camera=camera;this.onChange=onChange;this.host=host;this.root=root;this.config=config;this.timers=[];this.frame=null;this.disposed=false;this.generation=0;
  this.previousWidth=root.style.width;this.previousHeight=root.style.height;
  this.schedule=()=>{this.cancel();const generation=this.generation;this.queue();for(const delay of config.settleDelays)this.timers.push(host.setTimeout(()=>{if(generation===this.generation)this.queue();},delay));};
  this.visibility=()=>{if(!host.document.hidden)this.schedule();};
  this.listeners=[[host,'resize',this.schedule],[host,'orientationchange',this.schedule],[host,'pageshow',this.schedule],[host.visualViewport,'resize',this.schedule],[host.document,'visibilitychange',this.visibility]];
  for(const [target,type,handler] of this.listeners)target?.addEventListener(type,handler);
  this.measure();
 }
 queue(){if(this.disposed||this.frame!==null)return;this.frame=this.host.requestAnimationFrame(()=>{this.frame=null;this.measure();});}
 measure(){
  if(this.disposed)return;const host=this.host,v=host.visualViewport;
  // Zoom is not a layout resize. Preserve the existing layout viewport when zoomed.
  const visual=v&&Math.abs(v.scale-1)<.01;
  const width=Math.round(visual?v.width:host.innerWidth),height=Math.round(visual?v.height:host.innerHeight);
  if(!(width>0&&height>0)||this.width===width&&this.height===height)return;
  this.width=width;this.height=height;this.root.style.width=width+'px';this.root.style.height=height+'px';
  this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.onChange();
 }
 cancel(){this.generation++;for(const timer of this.timers)this.host.clearTimeout(timer);this.timers=[];if(this.frame!==null)this.host.cancelAnimationFrame(this.frame);this.frame=null;}
 dispose(){this.disposed=true;this.cancel();for(const [target,type,handler] of this.listeners)target?.removeEventListener(type,handler);this.root.style.width=this.previousWidth;this.root.style.height=this.previousHeight;}
}
