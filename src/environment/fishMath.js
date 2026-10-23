import {marineLifeConfig as c} from '../config/marineLifeConfig.js';
// Analytic, bounded schooling path; no pairwise flock or physics searches.
export function schoolPath(time,out){const t=time*c.speed;out.x=c.center.x+Math.sin(t)*c.radiusX;out.z=c.center.z+Math.sin(t*.83+.8)*c.radiusZ;out.heading=Math.atan2(Math.cos(t)*c.radiusX,Math.cos(t*.83+.8)*c.radiusZ*.83);return out;}
export function schoolAvoidance(x,z,sub,out){const dx=x-sub.x,dz=z-sub.z,d=Math.hypot(dx,dz),strength=Math.max(0,1-d/c.avoidanceDistance);out.x=dx/(d||1)*strength*c.avoidanceOffset;out.z=dz/(d||1)*strength*c.avoidanceOffset;return out;}
