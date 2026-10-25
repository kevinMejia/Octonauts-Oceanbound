import {octopodConfig} from '../config/octopodConfig.js';
import {worldConfig} from '../config/worldConfig.js';
import {heightAt} from '../environment/terrainMath.js';
import {hullFloor,hullFrame,sweepHull} from '../collision/collisionMath.js';

export function fleetAnchor(definition,unlocked,base=octopodConfig.position){
 const config=unlocked?definition.parking:(definition.discovery??definition.parking);
 const spawn=config?.spawn??definition.parking?.spawn??definition.discovery?.spawn;
 if(!spawn)return null;
 const offset=spawn.offset??[0,0,0],relative=spawn.relativeTo!=='world';
 return {heightOffset:offset[1],x:(relative?base.x:0)+offset[0],y:(relative?base.y:0)+offset[1],z:(relative?base.z:0)+offset[2],heading:config.rotation??0,groundClearance:config.groundClearance??definition.parking?.groundClearance??definition.collision.terrainClearance};
}
// Event-time searches use the same grid and hull sweep as movement. No mesh rays.
export class FleetPlacement{
 constructor(grid,ground=heightAt){this.grid=grid;this.ground=ground;this.near=[];this.hit={};this.frame={};this.body={position:{x:0,y:0,z:0},heading:0,pitch:0,bank:0};}
 clear(pose,definition,ignoreId,returningId){
  const c=definition.collision,b=this.body;b.position=pose;b.heading=pose.heading??0;b.collisionProxy=c;hullFrame(b,this.frame);
  this.grid.query(pose.x,pose.z,Math.max(c.halfLength,c.radius)+1,this.near);
  const depth=Math.min(c.radius,c.halfLength),l=Math.max(0,c.halfLength-depth);
  for(const s of this.near){if(ignoreId&&s.parkedId===ignoreId||!s.solid&&!(returningId==='*'&&s.parkedId)&&s.parkedId!==returningId)continue;
   for(let i=-1;i<=1;i++)if(sweepHull(pose,0,0,0,s,this.frame,c.radius,c.halfHeight,l*i,this.hit,c.centerY??0,depth)&&this.hit.depth>.002)return false;
  }return true;
 }
 find(origin,definition,{ignoreId,returningId,parking=false,maxRadius=32}={}){
  const body=this.body;body.collisionProxy=parking?{...definition.collision,terrainClearance:origin.groundClearance}:definition.collision;body.heading=origin.heading??0;
  for(let ring=0;ring<=Math.ceil(maxRadius/4);ring++)for(let i=0;i<(ring?12:1);i++){
   const a=i*Math.PI/6,r=ring*4,x=origin.x+Math.sin(a)*r,z=origin.z+Math.cos(a)*r;
   if(Math.abs(x)>worldConfig.size/2-12||Math.abs(z)>worldConfig.size/2-12)continue;
   body.collisionProxy=parking?{...definition.collision,terrainClearance:origin.groundClearance}:definition.collision;
   const floor=hullFloor(body,x,z,this.ground),y=parking?floor+.04+(origin.heightOffset??0):definition.type==='ground'?floor+.05:Math.max(origin.y,floor+.05);
   if(y>worldConfig.surface-definition.collision.surfaceClearance)continue;
   const pose={x,y,z,heading:body.heading};if(this.clear(pose,definition,ignoreId,returningId))return pose;
  }return null;
 }
}
