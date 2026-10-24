import {navigationState,shortestAngle,wrapDegrees} from './navigationMath.js';
// The controller's local forward is +Z. Relative bearings increase to the right.
export function rescueNavigationState(position,heading,target){
 const state=navigationState(position,{x:Math.sin(heading),z:Math.cos(heading)},target);
 return {...state,distance:Math.hypot(target.x-position.x,target.y-position.y,target.z-position.z)};
}
export function smoothRescueBearing(current,target,dt){return current===null?target:current+shortestAngle(wrapDegrees(current),target)*(1-Math.exp(-12*Math.max(0,Math.min(dt,.1))));}
