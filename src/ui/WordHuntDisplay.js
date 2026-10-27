// One reusable panel and one elapsed-time deadline; no stale timeout callbacks.
export class WordHuntDisplay{
 constructor(config,host=document){
  this.config=config;this.host=host;this.age=Infinity;this.animations=[];this.opacity=0;this.root=host.createElement('aside');this.root.id='wordHuntNotice';this.root.setAttribute('role','status');this.root.setAttribute('aria-live','polite');this.root.setAttribute('aria-atomic','true');
  const make=(tag,className,text)=>{const node=host.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
  const top=make('div','hunt-heading');this.title=make('span','hunt-title','LETTER DISCOVERED!');const icon=make('span','hunt-icon','✦');icon.setAttribute('aria-hidden','true');this.counter=make('span','hunt-counter');top.append(icon,this.title,this.counter);
  this.word=make('div','hunt-word');this.bursts=[];this.spans=config.letters.map(l=>{const slot=make('span','hunt-slot'),letter=make('span','hunt-letter',l.letter),sparks=[];slot.append(letter);for(let i=0;i<4;i++){const spark=make('i','hunt-spark');spark.setAttribute('aria-hidden','true');slot.append(spark);sparks.push(spark);}this.bursts.push(sparks);this.word.append(slot);return letter;});
  const bottom=make('div','hunt-footer'),bolt=make('span','hunt-lightning','ϟ');bolt.setAttribute('aria-hidden','true');this.reward=make('span','hunt-hint','Collect all 9 to unlock Infinite Turbo');bottom.append(bolt,this.reward);this.root.append(top,this.word,bottom);(host.getElementById?.('gameplayNotifications')??host.body).append(this.root);this.hide();
  // Measure only when shown or HUD/viewport sizes change, never each frame.
  this.layout=()=>this.position();const win=host.defaultView;win?.addEventListener('resize',this.layout);win?.visualViewport?.addEventListener('resize',this.layout);
  if(win?.ResizeObserver){this.observer=new win.ResizeObserver(this.layout);for(const id of ['navigation','compass','turboHud','vehicleToggle','creatureCollection']){const hud=host.getElementById(id);if(hud)this.observer.observe(hud);}this.observer.observe(this.root);}
  if(win?.MutationObserver){this.hudObserver=new win.MutationObserver(this.layout);this.hudObserver.observe(host.body,{attributes:true,attributeFilter:['class']});}
 }
 position(){
  if(this.root.parentElement?.id==='gameplayNotifications'||this.root.hidden||!this.root.getBoundingClientRect)return;this.root.style.top='';const transform=this.root.style.transform;this.root.style.transform='translateX(-50%)';const panel=this.root.getBoundingClientRect();let top=panel.top;
  for(const id of ['navigation','compass','turboHud','vehicleToggle','creatureCollection']){const hud=this.host.getElementById(id);if(!hud||hud.hidden)continue;const r=hud.getBoundingClientRect();if(r.width&&r.left<panel.right+8&&r.right>panel.left-8)top=Math.max(top,r.bottom+12);}
  this.root.style.top=top+'px';this.root.style.transform=transform;
 }
 cancelAnimations(){for(const animation of this.animations)animation.cancel();this.animations=[];}
 hide(){this.root.hidden=true;this.root.style.display='none';this.root.style.opacity='0';this.opacity=0;this.cancelAnimations();}
 animateLetter(index,complete){
  const span=this.spans[index];if(!span.animate||this.host.defaultView?.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  this.animations.push(span.animate([{transform:'scale(1.4)',filter:'brightness(1.25)',textShadow:'0 0 9px currentColor'},{transform:'scale(.96)',offset:.6,filter:'brightness(1.1)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:complete?600:520,easing:'cubic-bezier(.2,.8,.3,1)'}));
  this.bursts[index].forEach((spark,i)=>{const x=[-17,17,-12,12][i],y=[-16,-12,15,17][i];spark.style.color=span.style.color;this.animations.push(spark.animate([{opacity:0,transform:'translate(0,0) scale(.3)'},{opacity:1,offset:.18},{opacity:0,transform:`translate(${x}px,${y}px) scale(.2)`}],{duration:550,delay:complete?index*25:0,easing:'ease-out'}));});
 }
 show(progress,newId){
  this.reducedMotion=this.host.defaultView?.matchMedia('(prefers-reduced-motion:reduce)').matches;const visible=!this.root.hidden;this.cancelAnimations();this.entryOpacity=visible?this.opacity:0;this.age=0;this.complete=progress.infiniteTurbo;this.duration=this.complete?4:3;this.root.hidden=false;this.root.style.display='block';this.root.setAttribute('data-complete',String(this.complete));
  this.title.textContent=this.complete?'OCTONAUTS COMPLETE!':'LETTER DISCOVERED!';this.counter.textContent=`${progress.count} / ${this.config.letters.length}`;this.reward.textContent=this.complete?'INFINITE TURBO UNLOCKED!':`Collect all ${this.config.letters.length} to unlock Infinite Turbo`;
  this.spans.forEach((span,i)=>{const id=this.config.letters[i].id,found=progress.ids.has(id);span.setAttribute('data-collected',String(found));span.style.color=found?this.config.visuals.colors[i]:'#344e60';if(found&&(id===newId||this.complete))this.animateLetter(i,this.complete);});
  this.position();this.update(0);
 }
 update(dt){
  if(this.root.hidden)return;this.age+=Math.max(0,dt);const entrance=1-Math.pow(1-Math.min(1,this.age/.25),3),exit=Math.max(0,Math.min(1,(this.age-this.duration)/.25));this.opacity=(this.entryOpacity+(1-this.entryOpacity)*entrance)*(1-exit);this.root.style.opacity=String(this.opacity);this.root.style.transform=`translateX(-50%) translateY(${this.reducedMotion?0:-10*(1-entrance)*(1-this.entryOpacity)-8*exit}px)`;
  if(this.age>=this.duration+.25)this.hide();
 }
 reset(){this.age=Infinity;this.hide();}
 dispose(){this.hide();this.observer?.disconnect();this.hudObserver?.disconnect();const win=this.host.defaultView;win?.removeEventListener('resize',this.layout);win?.visualViewport?.removeEventListener('resize',this.layout);this.root.remove();}
}
