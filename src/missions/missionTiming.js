import {dolphinRescueConfig} from '../config/dolphinRescueConfig.js';
// Recover ordinary slow frames without passing a large delta to swept physics.
// Excess stall time is deliberately dropped, never queued for a later frame.
export function advanceMission(elapsed,step,timing=dolphinRescueConfig.timing){
 const duration=Number.isFinite(elapsed)?Math.max(0,Math.min(elapsed,timing.maxFrameTime)):0;
 const count=Math.ceil(duration/timing.maxStep),dt=count?duration/count:0;let advanced=0;
 for(let i=0;i<count;i++){const running=step(dt);advanced+=dt;if(running===false)break;}
 return advanced;
}
