export const discoveryTiming=Object.freeze({entrance:.2,art:.5,sparkles:.7,confetti:1,ambient:2.6,end:3});
export const discoveryColors=Object.freeze({spark:['#ffd07e','#77f8e5','#8cdeff','#f4ffff'],confetti:['#32c6b5','#4cace1','#ffd372','#ffa65b']});
const mix=(a,b,t)=>a+(b-a)*t;

// Screen-space decoration only: no game clock, physics, or world resources.
export class DiscoveryParticles{
 constructor({random=Math.random,compact=false}={}){this.random=random;this.compact=compact;this.limit=compact?88:126;this.reset();}
 reset(){this.particles=[];this.time=0;this.sparked=false;this.confettied=false;this.ambientWait=0;this.bursts={bubbles:0,sparkles:0,confetti:0};}
 add(p){if(this.particles.length<this.limit)this.particles.push({...p,age:0,alpha:0,phase:this.random()*Math.PI*2});}
 start(bounds){this.reset();this.bounds=bounds;this.bursts.bubbles++;
  for(let i=0;i<(this.compact?28:40);i++){
   const a=this.random()*Math.PI*2,front=i%3===0,area=front?bounds.image:bounds.modal,edge=Math.min((area.width/2+8)/Math.max(.001,Math.abs(Math.cos(a))),(area.height/2+8)/Math.max(.001,Math.abs(Math.sin(a)))),r=edge*(.93+this.random()*.15),speed=160+this.random()*300;
   this.add({kind:'bubble',layer:front?'front':'back',x:area.left+area.width/2+Math.cos(a)*r,y:area.top+area.height/2+Math.sin(a)*r,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.75-45,r:3+this.random()**1.7*21,life:2.35+this.random()*.55,opacity:.3+this.random()*.45});
  }
 }
 imageBurst(kind,count){const b=this.bounds.image,colors=discoveryColors[kind==='spark'?'spark':'confetti'];
  for(let i=0;i<count;i++){const a=this.random()*Math.PI*2,speed=(kind==='spark'?75:40)+this.random()*(kind==='spark'?160:80);
   this.add({kind,layer:'front',x:b.left+b.width/2+Math.cos(a)*b.width*.52,y:b.top+b.height/2+Math.sin(a)*b.height*.53,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.6-18,r:kind==='spark'?1.5+this.random()*2.3:2.2+this.random()*1.7,length:6+this.random()*5,life:kind==='spark'?1.05+this.random()*.65:1.5+this.random()*.45,opacity:kind==='spark'?.85:.7,color:Math.floor(this.random()*colors.length),angle:a,spin:(this.random()-.5)*3});
  }
 }
 ambient(){const b=this.bounds.modal,right=this.random()>.5;
  this.add({kind:'bubble',ambient:true,layer:this.random()>.5?'front':'back',x:(right?b.left+b.width:b.left)+(right?1:-1)*(12+this.random()*24),y:b.top+b.height*(.55+this.random()*.45),vx:(this.random()-.5)*8,vy:-12-this.random()*10,r:3+this.random()*7,life:4.5+this.random()*2,opacity:.28+this.random()*.18});
 }
 update(dt){
  dt=Math.max(0,Math.min(dt,.05));this.time+=dt;
  if(!this.sparked&&this.time>=discoveryTiming.sparkles){this.sparked=true;this.bursts.sparkles++;this.imageBurst('spark',this.compact?26:40);}
  if(!this.confettied&&this.time>=discoveryTiming.confetti){this.confettied=true;this.bursts.confetti++;this.imageBurst('confetti',this.compact?9:13);}
  if(this.time>=discoveryTiming.ambient){this.ambientWait-=dt;if(this.ambientWait<=0){this.ambientWait=.85+this.random()*.45;if(this.particles.filter(p=>p.ambient).length<(this.compact?4:6))this.ambient();}}
  let count=0;
  for(const p of this.particles){
   p.age+=dt;if(p.age>=p.life)continue;const drag=Math.exp(-(p.kind==='bubble'?2.6:p.kind==='spark'?3.8:1.8)*dt);p.vx*=drag;p.vy=mix(p.vy,p.kind==='bubble'?-24:p.kind==='spark'?-12:-9,1-drag);
   p.x+=(p.vx+Math.sin(p.phase+p.age*1.5)*(p.kind==='bubble'?8:4))*dt;p.y+=p.vy*dt;p.angle=(p.angle??0)+(p.spin??0)*dt;
   p.alpha=p.opacity*Math.min(1,p.age/.12)*Math.min(1,(p.life-p.age)/(p.ambient?.8:.65));this.particles[count++]=p;
  }this.particles.length=count;
 }
 resize(bounds){const sx=bounds.width/this.bounds.width,sy=bounds.height/this.bounds.height;for(const p of this.particles){p.x*=sx;p.y*=sy;}this.bounds=bounds;}
}
