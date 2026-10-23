import {marineLifeConfig as c} from '../config/marineLifeConfig.js';
// Analytic, bounded schooling path; no pairwise flock or physics searches.
export function schoolPath(time,out,anchor=c.center,phase=0){const t=time*c.speed*(anchor.speed??1)+phase;out.x=anchor.x+Math.sin(t)*(anchor.radiusX??c.radiusX);out.z=anchor.z+Math.sin(t*.83+.8)*(anchor.radiusZ??c.radiusZ);out.heading=Math.atan2(Math.cos(t)*(anchor.radiusX??c.radiusX),Math.cos(t*.83+.8)*(anchor.radiusZ??c.radiusZ)*.83);return out;}
export function schoolAvoidance(x,z,sub,out){const dx=x-sub.x,dz=z-sub.z,d=Math.hypot(dx,dz),strength=Math.max(0,1-d/c.avoidanceDistance);out.x=dx/(d||1)*strength*c.avoidanceOffset;out.z=dz/(d||1)*strength*c.avoidanceOffset;return out;}
