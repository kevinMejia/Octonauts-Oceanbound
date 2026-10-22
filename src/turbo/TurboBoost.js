import {turboBoostConfig} from '../config/turboConfig.js';

// Session charge is independent of the current vehicle and its handling tuning.
export class TurboBoost {
 constructor(config=turboBoostConfig){this.config=config;this.charge=0;this.active=false;this.requested=false;this.exhausted=false;}
 get multiplier(){return this.active?1+Math.max(0,this.config.speedBoostPercent)/100:1;}
 get remaining(){return this.active?this.charge/Math.max(.001,this.config.drainPerSecond):0;}
 collect(){if(!this.config.enabled)return false;this.charge=Math.min(100,this.charge+this.config.pickupCharge);return true;}
 request(held){this.requested=!!held;if(!held){this.active=false;this.exhausted=false;}}
 step(dt,accelerating=false){
  dt=Math.max(0,Number.isFinite(dt)?dt:0);
  this.active=!!(this.config.enabled&&this.requested&&!this.exhausted&&accelerating&&this.charge>0);
  if(this.active){this.charge=Math.max(0,this.charge-this.config.drainPerSecond*dt);if(!this.charge){this.active=false;this.exhausted=true;}}
  else if(this.config.enabled)this.charge=Math.min(100,this.charge+this.config.rechargePerSecond*dt);
 }
 stop(){this.request(false);}
 reset(){this.charge=0;this.stop();}
}

export class TurboPickupTimer {
 constructor(){this.remaining=0;}
 get available(){return this.remaining<=0;}
 collect(seconds){if(!this.available)return false;this.remaining=Math.max(.001,seconds);return true;}
 step(dt){this.remaining=Math.max(0,this.remaining-dt);}
}

// Swept sphere collection in all three dimensions avoids tunnelling at turbo speed.
export function crossesPickup(from,to,pickup,radius){
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,den=dx*dx+dy*dy+dz*dz;
 const t=den?Math.max(0,Math.min(1,((pickup.x-from.x)*dx+(pickup.y-from.y)*dy+(pickup.z-from.z)*dz)/den)):0;
 return Math.hypot(from.x+dx*t-pickup.x,from.y+dy*t-pickup.y,from.z+dz*t-pickup.z)<=radius;
}
