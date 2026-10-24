import {navigationState,shortestAngle} from './navigationMath.js';
export function targetState(position,heading,target,threshold=0){const state=navigationState(position,{x:0,z:-1},target);return {...state,relative:shortestAngle(heading,state.bearing),proximity:threshold>0?Math.max(0,1-Math.hypot(target.x-position.x,(target.y??position.y)-position.y,target.z-position.z)/threshold):0};}

const crewName=d=>d.name.replace(/^(Captain|Professor)\s+/i,'');
export function crewMarkerLabel(definition,registry){const name=crewName(definition),initial=name[0];return registry.filter(d=>crewName(d)[0]===initial).length>1?name.slice(0,2):initial;}
export const crewMarkerColors=['#ffffff','#ffb659','#ffe373','#a5e9ff','#ff94c7','#adff98','#d7b1ff','#74ffe4'];
