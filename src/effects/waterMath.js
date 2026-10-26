import {worldConfig} from '../config/worldConfig.js';
const configSeaLevel=worldConfig.surface;
import {waterConfig as config} from '../config/waterConfig.js';
import {clamp} from './interactionMath.js';
export function bubbleRate(speed,boost=false){const c=config.bubbles;if(!c.enabled||Math.abs(speed)<.35)return 0;return c.emissionRate*clamp((Math.abs(speed)-.35)/12,0,1.3)*c.speedMultiplier*(boost?c.boostMultiplier:1);}
export function flowRate(speed){return config.motion.enabled?clamp((Math.abs(speed)-config.motion.speedThreshold)*.65,0,6):0;}
export function wrapWater(value,anchor,extent){return anchor+(((value-anchor+extent)%(extent*2)+extent*2)%(extent*2))-extent;}
export function depthLight(y,surface,falloff=config.caustics.depthFalloff){return Math.exp(-Math.max(0,surface-y)*falloff);}
// Distinct buoyant bubble motion: never reuse sinking sediment/debris integration.
export function stepBubble(p,dt,time,surface){if(p.life<=0)return;p.age+=dt;if(p.age>=p.life||p.y>=surface-.15){p.life=0;return;}const drag=Math.exp(-dt*1.5);p.vx=p.vx*drag+Math.sin(time*.65+p.seed)*dt*.1;p.vz=p.vz*drag+Math.cos(time*.5+p.seed)*dt*.09;p.vy+=(config.bubbles.buoyancy*(.8+p.seed%1*.5)-p.vy)*(1-Math.exp(-dt*2));p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}

// Same bounded waves as the surface vertex shader; camera medium follows local water.
export function surfaceHeight(x,z,time){const c=config.surface;return configSeaLevel+c.waveHeight*(Math.sin(x*c.waveScale+time*c.waveSpeed)+.5*Math.sin(z*c.waveScale*1.3-time*c.waveSpeed*.8));}
export function airBlend(y,x,z,time){const t=clamp((y-surfaceHeight(x,z,time))/config.surface.transitionRange*.5+.5);return t*t*(3-2*t);}
