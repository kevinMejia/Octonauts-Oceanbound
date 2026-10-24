import {rescueConfig} from '../config/rescueConfig.js';
import {octopodConfig} from '../config/octopodConfig.js';
import {worldConfig} from '../config/worldConfig.js';
import {heightAt} from '../environment/terrainMath.js';
import {hullFloor} from '../collision/collisionMath.js';
import {CollisionWorld} from '../collision/CollisionWorld.js';
import {FleetPlacement} from '../vehicles/fleetPlacement.js';
import {TowMotion,hullGap,towAnchor,delivered} from './towMath.js';
import {TowRope} from './TowRope.js';
export class RescueSystem{
 constructor(game,{config=rescueConfig,onDelivered=()=>{}}={}){
  this.game=game;this.config=config;this.onDelivered=onDelivered;this.active=null;this.time=0;this.noticeLeft=0;this.near=[];this.rope=new TowRope(game.scene,config.towing);this.collisions=new CollisionWorld(game.interactions.surfaces);this.placement=new FleetPlacement(game.interactions.surfaces.grid);
  const p=octopodConfig.position,o=config.deliveryOffset;this.centre={x:p.x+o[0],y:p.y+o[1],z:p.z+o[2]};
  this.hud=game.rescueNavigation.section;
  this.notice=document.createElement('div');this.notice.id='rescueNotice';this.notice.hidden=true;this.notice.setAttribute('role','status');this.notice.setAttribute('aria-live','polite');document.body.append(this.notice);
  this.constrain=(motion,sub,dt)=>this.constrainMotion(motion,sub,dt);this.adjustTarget=(motion)=>this.liftTarget(motion);this.ground=heightAt;
 }
 start(payload){
  if(this.active||!this.config.enabled||this.config.maxActiveRescues<1||!this.config.towing.enabled||!payload.model||!(payload.height>0)||!(payload.radius>=0))return false;
  const model=payload.model,position={x:model.position.x,y:model.position.y+payload.height*(this.config.towing.attachmentHeightRatio??.45),z:model.position.z};
  const motion=new TowMotion(this.config.towing,position,payload);motion.heading=model.rotation.y;
  const proxy={radius:Math.max(.4,payload.radius)+.08,halfLength:Math.max(.4,payload.radius)+.08,halfHeight:Math.max(motion.chest,payload.height-motion.chest),centerY:0,terrainClearance:motion.chest+this.config.towing.terrainClearance,surfaceClearance:payload.height-motion.chest+.15};
  this.active={...payload,motion,blocked:0,recoveryGrace:0,body:{position:motion.position,previousPosition:motion.previous,collisionProxy:proxy,heading:motion.heading,pitch:0,bank:0,speed:0,vertical:0,collisionDrift:{x:0,z:0}}};
  this.notice.hidden=true;this.noticeLeft=0;this.game.sub.towingSpeedMultiplier=this.config.towing.speedMultiplier;this.game.compass.setRescue(this.config.hud.highlightOctopod);this.game.rescueNavigation.setMission(this.config.hud.enabled?this.active:null);this.rebind();try{this.game.audio?.playRescue?.(true);}catch{}return true;
 }
 liftTarget(motion){
  const t=motion.target,p=motion.position,proxy=this.active.body.collisionProxy,ceiling=worldConfig.surface-proxy.surfaceClearance;t.y=Math.max(t.y,heightAt(t.x,t.z)+proxy.terrainClearance);
  const dx=t.x-p.x,dz=t.z-p.z,n=dx*dx+dz*dz;
  for(const s of this.game.interactions.surfaces.grid.query((p.x+t.x)/2,(p.z+t.z)/2,Math.hypot(dx,dz)/2+proxy.radius,this.near)){
   if(!s.solid)continue;const f=n?Math.max(0,Math.min(1,((s.x-p.x)*dx+(s.z-p.z)*dz)/n)):0,r=Math.max(s.rx,s.rz)+proxy.radius;
   if(Math.hypot(p.x+dx*f-s.x,p.z+dz*f-s.z)>r||Math.min(p.y,t.y)-proxy.halfHeight>s.y+s.ry||Math.max(p.y,t.y)+proxy.halfHeight<s.y-s.ry)continue;
   const above=s.y+s.ry+proxy.halfHeight+.2;if(above<ceiling)t.y=Math.max(t.y,above);
  }t.y=Math.min(t.y,ceiling);
 }
 constrainMotion(motion,sub,dt){
  if(dt<=0)return;const a=this.active,b=a.body,p=motion.position,f=motion.frame,c=sub.collisionProxy,x=p.x-sub.position.x,y=p.y-sub.position.y,z=p.z-sub.position.z,lx=x*f.xx+y*f.xy+z*f.xz,ly=x*f.yx+y*f.yy+z*f.yz-(c.centerY??0),lz=x*f.zx+y*f.zy+z*f.zz;
  // Keep the passenger outside the moving GUP during initial pickup and sharp turns.
  if(Math.abs(lx)<c.radius+motion.radius+.2&&Math.abs(lz)<c.halfLength+motion.radius+.2&&Math.abs(ly)<c.halfHeight+b.collisionProxy.halfHeight){const shift=(motion.side*(c.radius+motion.radius+.2)-lx);p.x+=f.xx*shift;p.y+=f.xy*shift;p.z+=f.xz*shift;}
  b.heading=motion.heading;b.speed=0;b.collisionDrift.x=(p.x-motion.previous.x)/dt;b.collisionDrift.z=(p.z-motion.previous.z)/dt;b.vertical=(p.y-motion.previous.y)/dt;
  this.collisions.resolve(b,dt);p.y=Math.max(hullFloor(b),Math.min(worldConfig.surface-b.collisionProxy.surfaceClearance,p.y));
  const moved=Math.hypot(p.x-motion.previous.x,p.y-motion.previous.y,p.z-motion.previous.z);a.blocked=moved<.01&&Math.abs(sub.speed)>1?a.blocked+dt:0;
  if(Math.hypot(p.x-motion.anchor.x,p.y-motion.anchor.y,p.z-motion.anchor.z)>this.config.towing.maxStretch||a.blocked>this.config.towing.recoveryDelay)this.recover();
 }
 recover(){
  const a=this.active;if(!a)return false;const m=a.motion,sub=this.game.sub,f=m.frame,origin={x:m.anchor.x-f.zx*this.config.towing.ropeLength,y:Math.max(m.anchor.y,m.target.y),z:m.anchor.z-f.zz*this.config.towing.ropeLength,heading:m.heading};
  // Event-only safety recovery for a large switch or blocked tow; never a normal-frame teleport.
  const pose=this.placement.find(origin,{collision:a.body.collisionProxy},{returningId:'*',maxRadius:8});if(!pose||hullGap(sub,pose,m.frame)<m.radius+.15)return false;
  Object.assign(m.position,{x:pose.x,y:pose.y,z:pose.z});Object.assign(m.previous,m.position);a.blocked=0;a.recoveryGrace=.5;return true;
 }
 rebind(){
  if(!this.active)return;const m=this.active.motion;towAnchor(this.game.sub,m.anchor,m.frame);
  if(Math.hypot(m.position.x-m.anchor.x,m.position.y-m.anchor.y,m.position.z-m.anchor.z)>this.config.towing.maxStretch||hullGap(this.game.sub,m.position,m.frame)<m.radius)this.recover();this.update(0,false);
 }
 stop(){this.active=null;this.rope.hide();this.game.rescueNavigation.setMission(null);this.game.sub.towingSpeedMultiplier=1;this.game.compass.setRescue(false);}
 reset(){this.stop();this.notice.hidden=true;this.noticeLeft=0;}
 update(dt,allowDelivery=true){
  this.time+=dt;if(this.noticeLeft>0){this.noticeLeft-=dt;if(this.noticeLeft<=0)this.notice.hidden=true;}
  const a=this.active;if(!a)return;a.recoveryGrace=Math.max(0,a.recoveryGrace-dt);const m=a.motion;m.update(dt,this.game.sub,this.constrain,this.adjustTarget);const p=m.position;
  a.model.position.set(p.x,p.y-m.chest,p.z);a.model.rotation.set(0,m.heading,Math.sin(this.time*1.1)*.025);a.model.visible=true;
  this.rope.update(m.anchor,p,this.time,this.game.sub.speed,this.ground);
  this.game.rescueNavigation.update(dt,this.config.hud.enabled?a:null,this.game.sub,this.centre);
  if(allowDelivery&&a.recoveryGrace<=0&&delivered(this.game.sub.position,p,this.centre,this.config.deliveryRadius)){
   const id=a.id,name=a.name;this.stop();this.onDelivered(id);try{this.game.audio?.playRescue?.();}catch{}
   if(this.config.completion.showEffect){this.game.atmosphere.propulsion.discoveryBurst(p.x,p.y,p.z);}
   if(this.config.completion.showMessage){this.notice.textContent=name+' Rescued!';this.notice.hidden=false;this.noticeLeft=this.config.completion.messageSeconds;}
  }
 }
}
