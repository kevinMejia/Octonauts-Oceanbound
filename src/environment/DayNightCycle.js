import {dayNightConfig as c} from '../config/dayNightConfig.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function daylightAt(time){const t=((time%1)+1)%1;return smooth(c.dawnStart,c.dawnEnd,t)*(1-smooth(c.sunsetStart,c.sunsetEnd,t));}
// Pure clock, independent of rendering and vehicle type. Normalized time: midnight=0.
export class DayNightCycle{
 constructor(settings){this.settings=settings;this.timeOfDay=c.startTime;this.daylight=settings.timeOfDay==='night'?0:1;this.warmth=0;this.headlight=this.settings.automaticHeadlights?1-this.daylight:0;}
 update(dt,advance=true){
  const s=this.settings,seconds=Number.isFinite(dt)?Math.max(0,dt):0;
  // Integrate rare long frames in bounded steps; normal render frames take one step.
  if(seconds>.1){let remaining=seconds,changed=false;while(remaining>1e-9){const step=Math.min(.1,remaining);changed=this.update(step,advance)||changed;remaining-=step;}return changed;}
  if(advance&&s.cycleEnabled&&s.timeOfDay==='automatic')this.timeOfDay=(this.timeOfDay+seconds/(s.cycleDuration*60))%1;
  const target=s.timeOfDay==='day'?1:s.timeOfDay==='night'?0:daylightAt(this.timeOfDay),before=this.daylight,lightBefore=this.headlight;
  this.daylight+=(target-this.daylight)*(1-Math.exp(-c.overrideResponse*seconds));
  this.warmth=4*this.daylight*(1-this.daylight)*c.twilight.warmth;
  const headlights=s.automaticHeadlights?smooth(.2,.8,1-(before+this.daylight)*.5):0;
  this.headlight+=(headlights-this.headlight)*(1-Math.exp(-c.headlights.response*seconds));
  return Math.abs(before-this.daylight)>1e-6||Math.abs(lightBefore-this.headlight)>1e-6;
 }
 get night(){return 1-this.daylight;}
}
