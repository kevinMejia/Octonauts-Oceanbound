import {worldConfig} from '../config/worldConfig.js';
import {submarineConfig} from '../config/submarineConfig.js';
export function surfaceLevel(body){return worldConfig.surface-(body.collisionProxy?.centerY??0)-submarineConfig.surface.floatDepth;}
// A local surface constraint, not a second controller or a fluid/flight solver.
export function surfaceVertical(body,velocity,rise,dt){
 const c=submarineConfig.surface,offset=body.position.y-surfaceLevel(body);
 if(rise<0||offset<-c.releaseDepth){body.surfaceActive=false;body.surfaceVelocity=0;return velocity;}
 if(dt<=0)return velocity;
 if(!body.surfaceActive){
  if(offset<0&&offset+velocity*dt<0)return velocity;
  body.surfaceActive=true;body.surfaceVelocity=Math.max(-c.maxReturnSpeed,Math.min(c.breachSpeed,velocity));
 }
 // Exact critical damping avoids a frame-rate-dependent spring or repeated bouncing.
 const omega=c.returnResponse,e=Math.exp(-omega*dt),j=body.surfaceVelocity+omega*offset;
 const next=(offset+j*dt)*e,displacement=next-offset,limited=Math.max(-c.maxReturnSpeed*dt,Math.min(c.breachSpeed*dt,displacement));
 body.surfaceVelocity=Math.abs(limited-displacement)>1e-9?limited/dt:(body.surfaceVelocity-omega*j*dt)*e;
 return limited/dt;
}
