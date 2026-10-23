import {interactionConfig as config} from '../config/interactionConfig.js';
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function sandResponse(clearance,speed,contact,impact=0){
 const c=config.sediment,near=clamp(1-clearance/c.proximityDistance);
 return {rate:c.enabled?near*near*clamp((speed-.45)/7)*c.proximityIntensity*c.speedInfluence*c.density*(contact?13:8):0,
  burst:c.enabled&&contact?clamp(impact/6,0,1)*c.impactIntensity:0};
}
// Fixed cells contain surface proxies, not render objects. Query visits only local cells.
export class SurfaceGrid{
 constructor(size=8){this.size=size;this.cells=new Map();this.maxRadius=0;}
 add(p){this.maxRadius=Math.max(this.maxRadius,p.radius);const key=Math.floor(p.x/this.size)+','+Math.floor(p.z/this.size);if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(p);p.gridKey=key;}
 remove(p){const cell=this.cells.get(p.gridKey);if(!cell)return;const index=cell.indexOf(p);if(index>=0)cell.splice(index,1);if(!cell.length)this.cells.delete(p.gridKey);}
 move(p){this.remove(p);this.add(p);}
 query(x,z,radius,out,kind){out.length=0;const s=this.size,r=radius+this.maxRadius;for(let i=Math.floor((x-r)/s);i<=Math.floor((x+r)/s);i++)for(let j=Math.floor((z-r)/s);j<=Math.floor((z+r)/s);j++){const cell=this.cells.get(i+','+j);if(cell)for(const p of cell)if((!kind||(kind==='solid'?p.solid:kind==='discovery'?p.triggerEnabled:kind==='fleet-load'?p.loadCandidate:p.surface===kind))&&(x-p.x)**2+(z-p.z)**2<(radius+p.radius)**2)out.push(p);}return out;}
}
export function sweepSurface(a,b,s,radius=1.35,offsetX=0,offsetZ=0){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=dx*dx+dy*dy+dz*dz;const t=l?clamp(((s.x-a.x-offsetX)*dx+(s.y-a.y)*dy+(s.z-a.z-offsetZ)*dz)/l):0;const x=a.x+offsetX+dx*t-s.x,y=a.y+dy*t-s.y,z=a.z+offsetZ+dz*t-s.z,d=Math.hypot(x,y,z);return d<s.radius+radius;}
export class ParticlePool{
 constructor(capacity){this.items=Array.from({length:capacity},()=>({life:0,age:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:0,angle:0,spin:0,r:1,g:1,b:1,alpha:0,floor:0,seed:0,branch:false,surface:'rock',settled:false}));this.cursor=0;}
 spawn(){for(let n=0;n<this.items.length;n++){const i=(this.cursor+n)%this.items.length;if(this.items[i].life<=0){this.cursor=(i+1)%this.items.length;return this.items[i];}}return null;}
 get active(){return this.items.reduce((n,p)=>n+(p.life>0),0);}
}
// Cosmetic underwater motion; no rigid bodies. Floor callback can include nearby rocks.
export function stepParticle(p,dt,time,ground,cloud=false,grain=false){
 if(p.life<=0)return;p.age+=dt;if(p.age>=p.life){p.life=0;return;}
 if(!p.settled){const coral=p.surface==='coral',waterDrag=coral?config.debris.coralDrag:config.debris.rockDrag,drag=Math.exp(-dt*(cloud?1.1:grain?3:waterDrag)),drift=cloud?.07:coral?.11:.04;p.vx=p.vx*drag+Math.sin(time*.4+p.seed)*dt*drift;p.vz=p.vz*drag+Math.cos(time*.33+p.seed)*dt*drift;
 p.vy+=(cloud?(p.age<1.2?.12:-config.sediment.settlingSpeed):grain?-.7:-(coral?config.debris.coralSinkAcceleration:config.debris.rockSinkAcceleration))*dt;p.vy*=Math.exp(-dt*(cloud?.7:grain?2:waterDrag));p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.angle+=p.spin*dt;
 const floor=ground(p.x,p.z,p.y);p.floor=floor;if(p.y<floor+(cloud?.12:.04)){p.y=floor+(cloud?.12:.04);if(cloud)p.vy=Math.max(0,p.vy);else{p.vy=0;p.settled=true;}}
 }
}
