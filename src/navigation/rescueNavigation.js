import {headingDegrees,shortestAngle,wrapDegrees} from './navigationMath.js';
// The controller's local forward is +Z. Relative bearings increase to the right.
// Callers in the frame loop supply reusable output; the public default stays compatible.
export function rescueNavigationState(position,heading,target,out={}){
 out.heading=headingDegrees(Math.sin(heading),Math.cos(heading));
 out.bearing=headingDegrees(target.x-position.x,target.z-position.z);
 out.relative=shortestAngle(out.heading,out.bearing);
 out.distance=Math.hypot(target.x-position.x,target.y-position.y,target.z-position.z);return out;
}
export function smoothRescueBearing(current,target,dt,response=12){return current===null?target:current+shortestAngle(wrapDegrees(current),target)*(1-Math.exp(-Math.max(0,response)*Math.max(0,dt)));}
// World-up extent of the existing oriented collision hull, including its centre.
// This affects clearance only: neither the offset nor arrow rotation inherits tilt.
export function rescueHullTop(sub){
 const c=sub.collisionProxy;if(!c)return 1;
 const cp=Math.cos(sub.pitch??0),sp=Math.sin(sub.pitch??0),cb=Math.cos(sub.bank??0),sb=Math.sin(sub.bank??0);
 return (c.centerY??0)*cp*cb+(c.halfHeight??1)*Math.abs(cp*cb)+(c.radius??1)*Math.abs(cp*sb)+(c.halfLength??1)*Math.abs(sp);
}
export function positionRescueArrow(out,sub,config,dt,reset=false){
 const p=sub.position,f=1-Math.exp(-Math.max(0,config.positionSmoothing)*Math.max(0,dt));
 const x=Math.sin(sub.heading)*config.forwardOffset,z=Math.cos(sub.heading)*config.forwardOffset;
 out.offsetX=reset?x:out.offsetX+(x-out.offsetX)*f;out.offsetZ=reset?z:out.offsetZ+(z-out.offsetZ)*f;
 // Vehicle translation feeds forward, so turbo or reverse never leaves the marker behind.
 out.x=p.x+out.offsetX;out.z=p.z+out.offsetZ;
 const roof=p.y+rescueHullTop(sub),desiredY=roof+config.height;
 out.y=reset?desiredY:out.y+(desiredY-out.y)*f;
 // Damping must not put a rising or tilted vehicle through its own indicator.
 out.y=Math.max(roof+Math.min(config.height,config.minClearance),out.y);return out;
}
