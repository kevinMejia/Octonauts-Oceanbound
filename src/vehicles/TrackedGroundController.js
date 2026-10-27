import {damageConfig} from '../config/damageConfig.js';
import {heightAt} from '../environment/terrainMath.js';
import {hullFloor} from '../collision/collisionMath.js';
import {worldConfig} from '../config/worldConfig.js';
import {gupXGround} from '../config/groundVehicleConfig.js';
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
// Operates on the shared controller state so towing, pickups and collisions keep
// their existing contracts. Never reads vertical input or accumulates lift.
export class TrackedGroundController{
 constructor(config=gupXGround,ground=heightAt){this.config=config;this.ground=ground;this.leftSpeed=0;this.rightSpeed=0;}
 align(s,dt=0){const c=this.config,p=s.position,h=this.ground,sy=Math.sin(s.heading),cy=Math.cos(s.heading),l=c.sampleLength,r=c.sampleWidth;
  const front=h(p.x+sy*l,p.z+cy*l),back=h(p.x-sy*l,p.z-cy*l),left=h(p.x+cy*r,p.z-sy*r),right=h(p.x-cy*r,p.z+sy*r);
  s.pitch=damp(s.pitch,-Math.atan2(front-back,2*l),c.pitchResponse,dt||1);
  s.bank=damp(s.bank,Math.atan2(left-right,2*r),c.rollResponse,dt||1);
  const floor=hullFloor(s,p.x,p.z,h);p.y=Math.max(floor,damp(p.y,floor,c.terrainSmoothing,dt||1));
  // Ground recovery is constrained to the support plane: no hovering after a switch.
  p.y=Math.min(p.y,floor+c.maxStep);s.vertical=0;
  Object.assign(s.floorContact,{clearance:0,touching:true,impact:0,floor:h(p.x,p.z)});
 }
 update(s,dt,input){const count=Math.max(1,Math.ceil(dt/this.config.substep)),step=dt/count;for(let i=0;i<count;i++)this.step(s,step,input);}
 step(s,dt,input){const c=this.config,p=s.position;Object.assign(s.previousPosition,p);
  const thrust=input.brakeReverse&&s.speed>.15?0:input.thrust;
  s.turbo.request(input.boost&&!s.emergency);s.turbo.step(dt,thrust>0);
  const limit=s.emergency?damageConfig.emergencySpeed:1;const target=thrust*(thrust>=0?(input.cruise?c.maxSpeed*.8:c.maxSpeed)*s.turbo.multiplier:c.maxReverseSpeed)*(s.towingSpeedMultiplier??1)*limit;
  s.speed=damp(s.speed,target,input.brakeReverse&&s.speed>.15?c.braking:thrust?c.acceleration*(s.turbo.active?c.turboAcceleration:1):c.drag,dt);
  if(s.emergency)s.speed=Math.max(-c.maxReverseSpeed*limit,Math.min(c.maxSpeed*limit,s.speed));
  s.steer=damp(s.steer,input.turn,c.steering,dt);
  // Differential tracks can pivot even when forward motion is blocked.
  const speed=Math.abs(s.speed),turn=s.steer*Math.max(c.pivotTurnSpeed*(1-Math.min(1,speed/c.maxSpeed)),Math.min(c.turnSpeed,speed/c.turnRadius))*(1-(1-c.highSpeedSensitivity)*Math.min(1,speed/c.maxSpeed));
  s.heading+=turn*dt;
  const x=p.x,z=p.z,sy=Math.sin(s.heading),cy=Math.cos(s.heading),edge=worldConfig.size/2-12;
  let dx=sy*s.speed*dt,dz=cy*s.speed*dt;
  const distance=Math.hypot(dx,dz),rise=this.ground(x+dx,z+dz)-this.ground(x,z),slope=Math.atan2(rise,distance||1);
  if(Math.abs(slope)>c.maxSlope||Math.abs(rise)>c.maxStep){dx=dz=0;s.speed=0;}
  else if(rise>0){const traction=Math.max(.25,1-Math.tan(slope)*c.hillClimb);dx*=traction;dz*=traction;}
  p.x=Math.max(-edge,Math.min(edge,x+dx));p.z=Math.max(-edge,Math.min(edge,z+dz));
  this.align(s,dt);s.collisionDrift.x=s.collisionDrift.z=0;
  s.collisionWorld?.resolve(s,dt);
  // Collision impulses never launch a tracked vehicle, and a slide may not climb a cliff.
  const moved=Math.hypot(p.x-x,p.z-z),change=this.ground(p.x,p.z)-this.ground(x,z);
  if(Math.abs(change)>c.maxStep||Math.abs(Math.atan2(change,moved||1))>c.maxSlope){p.x=x;p.z=z;s.speed=0;}
  this.align(s,dt);s.collisionDrift.x=s.collisionDrift.z=0;
  const actual=((p.x-x)*sy+(p.z-z)*cy)/Math.max(dt,.00001);
  const angular=turn;
  this.leftSpeed=actual+angular*c.trackSpacing/2;this.rightSpeed=actual-angular*c.trackSpacing/2;
 }
}
