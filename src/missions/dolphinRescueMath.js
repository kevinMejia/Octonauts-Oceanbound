import {dolphinRescueConfig as defaults} from '../config/dolphinRescueConfig.js';
import {random} from '../environment/terrainMath.js';
import {sweepSurface} from '../effects/interactionMath.js';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function routeClear(o,c=defaults){return Math.abs(o.x)-o.radius>c.escort.halfWidth+c.debris.clearPadding||Math.abs(o.y-c.route.depth)>o.halfHeight+c.escort.radius;}
export function pushDebris(o,contact,time,c=defaults){
 if(!o.active||time-o.lastHit<c.debris.hitCooldown)return false;
 const n=Math.hypot(contact.nx,contact.ny??0,contact.nz);if(n<.2)return false;
 const nx=-contact.nx/n,ny=-(contact.ny??0)/n,nz=-contact.nz/n,closing=Math.max(0,contact.impact)+Math.max(0,-o.vx*nx-(o.vy??0)*ny-o.vz*nz);
 if(closing<c.debris.minImpact)return false;
 o.lastHit=time;o.pushed=true;
 const impulse=closing*(1+c.debris.restitution)*c.debris.pushScale/(1+o.mass);
 o.vx+=nx*impulse;o.vy=(o.vy??0)+ny*impulse;o.vz+=nz*impulse;const speed=Math.hypot(o.vx,o.vy,o.vz);
 if(speed>c.debris.maxSpeed){o.vx*=c.debris.maxSpeed/speed;o.vy*=c.debris.maxSpeed/speed;o.vz*=c.debris.maxSpeed/speed;}
 // Depenetration follows the actual contact normal, never an automatic lane clear.
 o.x+=nx*.12;o.y+=ny*.12;o.z+=nz*.12;o.spin=clamp(o.spin+nx*.7,-1,1);return true;
}
export class DolphinRescueState{
 constructor(config=defaults){this.config=config;this.reset();}
 reset(){const c=this.config;this.rng=random(c.seed);this.time=0;this.distance=0;this.strikes=0;this.cleared=0;this.spawned=0;this.status='running';this.nextSpawn=c.route.introSeconds;this.lastCollision=-Infinity;this.notice='Protect the dolphins! Clear the path ahead.';this.noticeUntil=7;
  this.dolphins=c.escort.formation.map(([x,z],i)=>({x,y:c.route.depth,z:c.route.startZ+z,previous:{x,y:c.route.depth,z:c.route.startZ+z},phase:i*1.9,reaction:0}));
  this.obstacles=Array.from({length:c.debris.capacity},(_,id)=>({id,active:false,generation:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,spin:0,angle:0,lastHit:-Infinity}));
 }
 get progress(){return clamp(this.distance/this.config.route.length,0,1);}
 get z(){return this.config.route.startZ+this.distance;}
 spawn(){const c=this.config,stage=c.debris.stages.find(s=>this.progress<s.until)??c.debris.stages.at(-1),o=this.obstacles.find(o=>!o.active);if(!o)return false;
  const type=c.debris.types[this.spawned===0?0:Math.floor(this.rng()*stage.types)],side=this.spawned%2?-1:1;
  Object.assign(o,type,{active:true,generation:o.generation+1,x:side*c.debris.spawnSide,y:c.route.depth,z:this.z+c.route.speed*stage.reaction,vx:0,vy:0,vz:0,spin:0,angle:this.rng()*.6,pushed:false,cleared:false,struck:false,side,targetX:(this.rng()-.5)*1.8,lastHit:-Infinity});this.spawned++;return true;
 }
 update(dt){
  if(this.status!=='running'||!(dt>0))return;const c=this.config;dt=Math.min(dt,.05);this.time+=dt;this.distance=Math.min(c.route.length,this.distance+c.route.speed*dt);
  for(const [i,d] of this.dolphins.entries()){Object.assign(d.previous,{x:d.x,y:d.y,z:d.z});const [x,z]=c.escort.formation[i];d.x=x;d.y=c.route.depth;d.z=this.z+z;d.reaction=Math.max(0,d.reaction-dt);}
  if(this.time>=this.nextSpawn&&this.distance<c.route.length-c.route.cleanDistance){const stage=c.debris.stages.find(s=>this.progress<s.until)??c.debris.stages.at(-1);if(this.spawn())this.nextSpawn=this.time+stage.interval;}
  const drag=Math.exp(-c.debris.drag*dt);
  for(const o of this.obstacles){if(!o.active)continue;
   if(!o.pushed){const dx=o.targetX-o.x;o.vx=Math.sign(dx)*Math.min(Math.abs(dx)/dt,c.debris.driftSpeed);o.x+=o.vx*dt;o.angle+=o.side*.08*dt;}
   else{o.x+=o.vx*(1-drag)/c.debris.drag;o.y=Math.max(o.halfHeight,o.y+o.vy*(1-drag)/c.debris.drag);o.vy=o.y<=o.halfHeight?Math.max(0,o.vy):o.vy*drag;o.z+=o.vz*(1-drag)/c.debris.drag;o.vx*=drag;o.vz*=drag;o.angle+=o.spin*dt;o.spin*=Math.exp(-c.debris.angularDrag*dt);}
   if(o.pushed&&!o.cleared&&routeClear(o,c)){o.cleared=true;this.cleared++;this.notice='Path clear! Keep protecting the dolphins.';this.noticeUntil=this.time+2;}
   if(!routeClear(o,c)&&!o.struck){for(const d of this.dolphins){if(Math.abs(d.y-o.y)>o.halfHeight+c.escort.radius)continue;if(sweepSurface(d.previous,d,{...o,radius:o.radius},c.escort.radius)){this.hit(o,d);break;}}}
   if(o.z<this.z-c.debris.despawnBehind||Math.abs(o.x)>c.environment.bankStart+4)o.active=false;
  }
  if(this.status==='running'&&this.distance>=c.route.length)this.status='complete';
 }
 hit(o,d){const c=this.config;if(o.struck||this.status!=='running')return false;o.struck=true;d.reaction=.9;
  if(this.time-this.lastCollision<c.escort.collisionCooldown)return false;this.lastCollision=this.time;this.strikes++;this.notice='Careful, Kwazii! Push the litter to the sides.';this.noticeUntil=this.time+3;if(this.strikes>=c.escort.maxStrikes)this.status='failed';return true;
 }
}
