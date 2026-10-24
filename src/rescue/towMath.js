import {hullFrame} from '../collision/collisionMath.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function hullGap(player,target,frame={}){
 const p=player.position??player,c=player.collisionProxy;if(!c)return Math.hypot(p.x-target.x,p.y-target.y,p.z-target.z);
 hullFrame(player,frame);const x=target.x-p.x,y=target.y-p.y,z=target.z-p.z;
 // Match the existing oriented hull bounds, including pitch/bank and centre offset.
 const lx=x*frame.xx+y*frame.xy+z*frame.xz,ly=x*frame.yx+y*frame.yy+z*frame.yz-(c.centerY??0),lz=x*frame.zx+y*frame.zy+z*frame.zz;
 return Math.hypot(Math.max(0,Math.abs(lx)-c.radius),Math.max(0,Math.abs(ly)-c.halfHeight),Math.max(0,Math.abs(lz)-c.halfLength));
}
export function towAnchor(sub,out={},frame={}){
 hullFrame(sub,frame);const c=sub.collisionProxy??{halfLength:3,centerY:0},a=sub.towAttachment,x=a?.[0]??0,y=a?.[1]??c.centerY??0,z=a?.[2]??(-c.halfLength-.12),p=sub.position;
 out.x=p.x+frame.xx*x+frame.yx*y+frame.zx*z;out.y=p.y+frame.xy*x+frame.yy*y+frame.zy*z;out.z=p.z+frame.xz*x+frame.yz*y+frame.zz*z;return out;
}
export function delivered(vehicle,payload,centre,radius){return Math.hypot(vehicle.x-centre.x,vehicle.y-centre.y,vehicle.z-centre.z)<=radius&&Math.hypot(payload.x-centre.x,payload.y-centre.y,payload.z-centre.z)<=radius;}
export class TowMotion{
 constructor(config,position,{height=3,radius=1}={}){this.config=config;this.position={...position};this.previous={...position};this.target={...position};this.anchor={...position};this.frame={};this.height=height;this.radius=radius;this.chest=height*(config.attachmentHeightRatio??.45);this.time=0;this.heading=0;this.side=Math.sign(config.lateralOffset??0)||1;}
 update(dt,sub,constrain,adjustTarget){
  const c=this.config;this.time+=dt;Object.assign(this.previous,this.position);towAnchor(sub,this.anchor,this.frame);
  const f=this.frame,a=this.anchor,side=(c.lateralOffset??0)+Math.sin(this.time*1.7)*c.lateralSway,bob=Math.sin(this.time*1.23)*c.verticalBob;
  const target=this.target;target.x=a.x-f.zx*c.ropeLength+f.xx*side;target.y=a.y-f.zy*c.ropeLength+bob;target.z=a.z-f.zz*c.ropeLength+f.xz*side;
  const p=this.position,v=sub.position,h=sub.collisionProxy??{radius:2,halfLength:3,halfHeight:1},x=p.x-v.x,y=p.y-v.y,z=p.z-v.z,lx=x*f.xx+y*f.xy+z*f.xz,lz=x*f.zx+y*f.zy+z*f.zz,clear=h.radius+this.radius+.45;
  // Guide a newly attached passenger around the hull, rather than through its centre.
  if(lz>-h.halfLength-this.radius){this.side=lx>.1?1:lx<-.1?-1:this.side;const around=Math.abs(lx)<clear*.85?lz:-h.halfLength-c.ropeLength;target.x=v.x+f.xx*this.side*clear+f.zx*around;target.z=v.z+f.xz*this.side*clear+f.zz*around;}
  if(adjustTarget)adjustTarget(this,sub,dt);
  const blend=1-Math.exp(-(c.followSmoothness+Math.abs(sub.speed??0)/Math.max(1,c.ropeLength))*dt);const dx=(target.x-p.x)*blend,dy=(target.y-p.y)*blend,dz=(target.z-p.z)*blend,distance=Math.hypot(dx,dy,dz),limit=(Math.abs(sub.speed??0)+c.catchUpSpeed)*dt,scale=distance>limit&&distance?limit/distance:1;p.x+=dx*scale;p.y+=dy*scale;p.z+=dz*scale;
  if(constrain)constrain(this,sub,dt);
  const desired=Math.atan2(a.x-p.x,a.z-p.z);this.heading+=Math.atan2(Math.sin(desired-this.heading),Math.cos(desired-this.heading))*(1-Math.exp(-4*dt));return p;
 }
}
