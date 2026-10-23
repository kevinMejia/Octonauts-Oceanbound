import {navigationState,shortestAngle} from './navigationMath.js';
export function targetState(position,heading,target,threshold=0){const state=navigationState(position,{x:0,z:-1},target);return {...state,relative:shortestAngle(heading,state.bearing),proximity:threshold>0?Math.max(0,1-Math.hypot(target.x-position.x,(target.y??position.y)-position.y,target.z-position.z)/threshold):0};}
// Labels may move to avoid collisions; leaders always retain the exact bearing.
export function layoutMarkers(markers,radius,{left=-Infinity,right=Infinity,top=-Infinity,bottom=Infinity}={}){
 const placed=[];
 for(const marker of markers){const a=marker.relative*Math.PI/180,ax=Math.sin(a)*radius,ay=-Math.cos(a)*radius;let x=ax,y=ay;
  const fits=()=>x>=left+8&&x<=right-8&&y>=top+8&&y<=bottom-8&&!placed.some(p=>Math.hypot(p.x-x,p.y-y)<17);
  if(!fits()){
   let found=false;
   for(let column=0;column<8&&!found;column++)for(let row=0;row<Math.max(2,Math.floor(radius*2/18));row++){
    x=Math.max(left+8,-radius-18-column*18);y=Math.max(top+8,-radius+22+row*18);if(fits()){found=true;break;}
   }
  }
  placed.push({...marker,x,y,ax,ay});
 }return placed;
}
