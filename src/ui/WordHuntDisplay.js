// One deadline, no queued timers or fade callbacks that can hide a new discovery.
export class WordHuntDisplay{
 constructor(config,host=document){this.config=config;this.age=Infinity;this.root=host.createElement('div');this.root.id='wordHuntNotice';this.root.hidden=true;this.root.setAttribute('role','status');
  this.root.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none;z-index:30;font-family:Arial,sans-serif;text-align:center;';
  this.word=host.createElement('div');this.word.style.cssText='font-weight:900;font-size:clamp(28px,8vw,80px);letter-spacing:.08em;';
  this.spans=config.letters.map(l=>{const span=host.createElement('span');span.textContent=l.letter;this.word.append(span);return span;});this.reward=host.createElement('div');this.reward.textContent='INFINITE TURBO UNLOCKED!';this.reward.style.cssText='color:#dfffff;font-weight:bold;font-size:clamp(14px,3vw,24px);margin-top:14px;text-shadow:0 0 12px #00dfff;';this.root.append(this.word,this.reward);host.body.append(this.root);this.hide();
 }
 hide(){this.root.hidden=true;this.root.style.display='none';this.root.style.opacity='0';}
 show(progress,newId){this.age=0;this.root.hidden=false;this.root.style.display='flex';this.root.style.opacity='0';this.reward.hidden=!progress.infiniteTurbo;
  this.spans.forEach((span,i)=>{const id=this.config.letters[i].id,found=progress.ids.has(id);span.style.color=found?'#e5ffff':'rgba(50,190,185,.13)';span.style.textShadow=id===newId?'0 0 12px #fff,0 0 28px #00eaff':found?'0 0 10px #32cfff':'none';});
 }
 update(dt){if(this.root.hidden)return;this.age+=dt;this.root.style.opacity=String(Math.max(0,Math.min(1,this.age/.15,(3.4-this.age)/.4)));if(this.age>=3.4)this.hide();}
 reset(){this.age=Infinity;this.hide();}
}
