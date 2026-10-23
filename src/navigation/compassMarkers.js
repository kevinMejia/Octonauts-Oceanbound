import {navigationState,shortestAngle} from './navigationMath.js';
export function targetState(position,heading,target,threshold=0){const state=navigationState(position,{x:0,z:-1},target);return {...state,relative:shortestAngle(heading,state.bearing),proximity:threshold>0?Math.max(0,1-Math.hypot(target.x-position.x,(target.y??position.y)-position.y,target.z-position.z)/threshold):0};}
