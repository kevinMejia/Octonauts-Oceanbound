// World north is -Z, east +X. GUP-B's authored forward axis is local +Z.
export const wrapDegrees=d=>((d%360)+360)%360;
export const headingDegrees=(x,z)=>wrapDegrees(Math.atan2(x,-z)*180/Math.PI);
export const shortestAngle=(from,to)=>((to-from+540)%360+360)%360-180;
export function navigationState(position,forward,base){const heading=headingDegrees(forward.x,forward.z),dx=base.x-position.x,dz=base.z-position.z,bearing=headingDegrees(dx,dz);return {heading,bearing,relative:shortestAngle(heading,bearing),distance:Math.hypot(dx,dz)};}
