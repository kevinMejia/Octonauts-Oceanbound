import {startupTipsConfig,startupTipState} from '../config/startupTipsConfig.js';
// One pending timeout handles both the rotation deadline and the text swap.
export class StartupTips{
 constructor(message,{state=()=>startupTipState(),config=startupTipsConfig,random=Math.random,schedule=(fn,delay)=>setTimeout(fn,delay),cancel=id=>clearTimeout(id),reduced=()=>false}={}){
  Object.assign(this,{message,state,config,random,schedule,cancel,reduced});this.queue=[];this.seen=new Set();this.current=null;this.active=false;this.timer=null;this.message.style?.setProperty('--tip-fade-in',config.fadeIn+'ms');
 }
 eligible(){const state=this.state();return this.config.tips.filter(t=>!t.eligible||t.eligible(state));}
 next(){
  const tips=this.eligible(),ids=new Set(tips.map(t=>t.id));this.queue=this.queue.filter(id=>ids.has(id));
  for(const tip of tips)if(!this.seen.has(tip.id)&&!this.queue.includes(tip.id))this.queue.splice(Math.floor(this.random()*(this.queue.length+1)),0,tip.id);
  if(!this.queue.length){this.seen.clear();this.queue=tips.map(t=>t.id);for(let i=this.queue.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.queue[i],this.queue[j]]=[this.queue[j],this.queue[i]];}}
  if(this.queue[0]===this.current&&this.queue.length>1)[this.queue[0],this.queue[1]]=[this.queue[1],this.queue[0]];
  const id=this.queue.shift(),tip=tips.find(t=>t.id===id);if(!tip)return;this.current=id;this.seen.add(id);this.message.textContent=typeof tip.text==='function'?tip.text(this.state()):tip.text;
 }
 refresh(){if(this.active&&!this.eligible().some(t=>t.id===this.current)){this.next();this.message.classList.remove('tip-fading');this.rotate();}}
 wait(delay,callback){this.cancel(this.timer);this.timer=this.schedule(()=>{this.timer=null;if(this.active)callback();},delay);}
 rotate(){this.wait(this.config.interval-this.config.fadeOut,()=>{if(!this.reduced())this.message.classList.add('tip-fading');this.wait(this.config.fadeOut,()=>{this.next();this.message.classList.remove('tip-fading');this.rotate();});});}
 start(){if(this.active)return;this.active=true;this.next();this.rotate();}
 stop(){this.active=false;this.cancel(this.timer);this.timer=null;this.message.classList.remove('tip-fading');}
}
