import {cameraShakeConfig} from '../config/cameraShakeConfig.js';
import {CollisionShake} from './CollisionShake.js';
import {gameplaySettings} from '../ui/gameplayPreferences.js';
import * as T from 'three';
import {cameraConfig as c} from '../config/cameraConfig.js';
import {worldConfig as w} from '../config/worldConfig.js';
import {heightAt} from '../environment/terrainMath.js';
import {smoothFactor,speedFraming,aspectDistance,updateOrbitRecenter} from './cameraMath.js';
import {terrainArmHeight,terrainViewHeight} from './groundCameraMath.js';
const radians=Math.PI/180;
export class ChaseCamera{
 constructor(camera,obstacles,ground=heightAt){this.camera=camera;this.obstacles=obstacles;this.ground=ground;this.groundProfile=null;this.groundFocusHeight=0;this.groundSteer=0;this.groundViewLift=0;this.groundPredictionPivot=new T.Vector3();this.groundPredictionEnd=new T.Vector3();this.groundViewNear=new T.Vector3();this.groundViewFar=new T.Vector3();this.groundSafeEye=new T.Vector3();this.initial=true;this.recenter={active:false,x:0,y:0};
  this.shake=new CollisionShake(gameplaySettings);this.shakeOffset=new T.Vector3();this.shakeInverse=new T.Quaternion();this.baseRotation=new T.Quaternion();this.basePosition=new T.Vector3();this.hasBase=false;
  this.pivot=new T.Vector3();this.desired=new T.Vector3();this.focus=new T.Vector3();this.target=new T.Vector3();this.look=new T.Matrix4();this.rotation=new T.Quaternion();this.up=new T.Vector3(0,1,0);
 }
 // Ground profile stays in the shared chase/orbit controller. Only GUP-X opts in.
 updateGround(dt,sub,o,distance,speed,g){
  const p=sub.position,ground=this.ground,floor=ground(p.x,p.z),reset=this.initial||this.groundProfile!==g;
  const angle=sub.heading+c.horizontalAngle*radians+o.x;
  const elevation=Math.max(c.minOrbitElevation*radians,Math.min(c.maxOrbitElevation*radians,Math.atan2(c.height*(this.profile.heightMultiplier??1),distance)+o.y));
  const near=Math.max(0,1-(p.y-floor)/c.nearFloorDistance);
  this.pivot.set(p.x,p.y+g.pivotHeight,p.z);
  this.desired.set(p.x-Math.sin(angle)*distance,Math.min(w.surface-1,p.y+Math.tan(elevation)*distance+near*c.nearFloorLift),p.z-Math.cos(angle)*distance);
  this.desired.y=terrainArmHeight(this.pivot,this.desired,ground,g);
  const sy=Math.sin(sub.heading),cy=Math.cos(sub.heading),ahead=g.lookAhead+speed*g.speedLookAhead;
  const support=sub.floorContact?.touching===true?1:sub.floorContact?.touching===false?0:Math.max(0,1-Math.max(0,p.y-floor-(sub.collisionProxy?.terrainClearance??.65))/g.airborneFadeHeight);
  const rise=Math.max(-g.maxLookDrop,Math.min(g.maxLookRise,ground(p.x+sy*ahead,p.z+cy*ahead)-floor));
  const focusHeight=g.lookHeight+rise*g.terrainLookWeight*support;
  const steer=Math.max(-1,Math.min(1,sub.steer??0))*Math.max(-1,Math.min(1,sub.speed/g.steerFullSpeed))*g.steerLookAhead;
  const baseHeight=this.desired.y;
  let viewHeight=baseHeight;
  if(support>.5){
   this.groundViewNear.set(p.x+sy*g.terrainViewNear,0,p.z+cy*g.terrainViewNear);this.groundViewNear.y=ground(this.groundViewNear.x,this.groundViewNear.z)+g.terrainViewTargetHeight;
   this.groundViewFar.set(p.x+sy*g.terrainViewFar,0,p.z+cy*g.terrainViewFar);this.groundViewFar.y=ground(this.groundViewFar.x,this.groundViewFar.z)+g.terrainViewTargetHeight;
   viewHeight=this.groundViewHeight(this.desired,ground,g);
  }
  const viewLift=viewHeight-baseHeight,maxLiftChange=g.terrainViewRiseRate*Math.max(0,dt);
  this.groundViewLift=reset?viewLift:this.groundViewLift+Math.max(-maxLiftChange,Math.min(maxLiftChange,viewLift-this.groundViewLift));
  this.desired.y+=this.groundViewLift;
  // Look a short distance along travel before a crest reaches the low pivot.
  // This reserves height early instead of waiting for a final safety correction.
  const prediction=Math.max(-g.maxTerrainPrediction,Math.min(g.maxTerrainPrediction,sub.speed*g.terrainPrediction))*support;
  if(prediction){
   const dx=sy*prediction,dz=cy*prediction;
   this.groundPredictionPivot.set(this.pivot.x+dx,this.pivot.y+ground(p.x+dx,p.z+dz)-floor,this.pivot.z+dz);
   this.groundPredictionEnd.set(this.desired.x+dx,this.desired.y,this.desired.z+dz);
   this.desired.y=terrainArmHeight(this.groundPredictionPivot,this.groundPredictionEnd,ground,g);
  }
  const response=smoothFactor(g.focusResponse,dt);
  this.groundFocusHeight=reset?focusHeight:this.groundFocusHeight+(focusHeight-this.groundFocusHeight)*response;
  this.groundSteer=reset?steer:this.groundSteer+(steer-this.groundSteer)*response;
  this.focus.set(p.x+sy*ahead+cy*this.groundSteer,p.y+this.groundFocusHeight,p.z+cy*ahead-sy*this.groundSteer);
  if(reset){this.camera.position.copy(this.desired);this.target.copy(this.focus);}
  else{
   const horizontal=smoothFactor(g.horizontalResponse,dt);
   this.camera.position.x+=(this.desired.x-this.camera.position.x)*horizontal;this.camera.position.z+=(this.desired.z-this.camera.position.z)*horizontal;
   this.camera.position.y+=(this.desired.y-this.camera.position.y)*smoothFactor(g.verticalResponse,dt);
   this.target.x+=(this.focus.x-this.target.x)*response;this.target.z+=(this.focus.z-this.target.z)*response;
   // Follow actual hull elevation, including synthetic airborne motion; damp only
   // the terrain bias so support terrain cannot pull the target off the vehicle.
   this.target.y=this.focus.y;
  }
  // A turn can put the smoothed arm across a hill even when its destination is
  // clear. Safety raises immediately; extra height releases through Y damping.
  this.camera.position.y=terrainArmHeight(this.pivot,this.camera.position,ground,g);
  if(support>.5)this.camera.position.y=this.groundViewHeight(this.camera.position,ground,g,true,dt);
  let limit=1;
  if(c.collisionEnabled&&this.obstacles){limit=this.obstacles.limit(this.pivot,this.camera.position,c,false);this.camera.position.lerpVectors(this.pivot,this.camera.position,limit);}
  // A solid pull-in changes the eye-to-road rays. Try a vertical recovery only
  // when both its swept movement and the resulting hull arm clear solid proxies.
  if(limit<1&&support>.5){
   const eye=this.camera.position,safe=this.groundSafeEye.copy(eye);
   safe.y=terrainArmHeight(this.pivot,safe,ground,g);safe.y=this.groundViewHeight(safe,ground,g,true,dt);
   if(safe.y>eye.y+.001){
    const vertical=this.obstacles.limit(eye,safe,c,false);safe.y=eye.y+(safe.y-eye.y)*vertical;
    if(this.obstacles.limit(this.pivot,safe,c,false)===1)eye.copy(safe);
   }
  }
  this.groundProfile=g;return limit;
 }
 groundViewHeight(end,ground,g,immediate=false,dt=0){
  const near=terrainViewHeight(this.groundViewNear,end,ground,g),far=terrainViewHeight(this.groundViewFar,end,ground,g);
  const max=this.pivot.y+Math.hypot(end.x-this.pivot.x,end.z-this.pivot.z)*Math.tan(g.maxTerrainViewAngle*radians);
  // Across a sharp crest the far road can be physically hidden behind its ridge.
  // Reserve bounded height smoothly instead of chasing an unbounded sight-line
  // solution into an overhead view. Only reachable final rays raise immediately.
  const reachable=Math.max(end.y,near<=max?near:end.y,far<=max?far:end.y);
  return immediate?Math.min(reachable,end.y+g.terrainViewRiseRate*Math.max(0,dt)):Math.max(end.y,Math.min(max,Math.max(near,far)));
 }
 clearShake(){if(this.hasBase){this.camera.position.copy(this.basePosition);this.camera.quaternion.copy(this.baseRotation);}this.shake.reset();}
 // Restore the unshaken pose before follow smoothing so offsets never accumulate.
 update(dt,sub,input){if(this.hasBase){this.camera.position.copy(this.basePosition);this.camera.quaternion.copy(this.baseRotation);}const o=input.orbit,p=sub.position;
  updateOrbitRecenter(o,!!input.drag,dt,performance.now()/1000,c,this.recenter);
  const ground=this.profile?.ground,speed=speedFraming(sub.speed,c),distance=Math.max(ground?.minDistance??0,c.distance*(this.profile?.distanceMultiplier??1))*aspectDistance(this.camera.aspect,c)*(1+speed*(ground?.speedDistanceIncrease??c.speedDistanceIncrease));
  let limit=1;if(ground){limit=this.updateGround(dt,sub,o,distance,speed,ground);}
  else{this.groundProfile=null;
  const floor=heightAt(p.x,p.z),near=Math.max(0,1-(p.y-floor)/c.nearFloorDistance);
  const elevation=Math.max(c.minOrbitElevation*radians,Math.min(c.maxOrbitElevation*radians,Math.atan2(c.height*(this.profile?.heightMultiplier??1),distance)+o.y));
  const angle=sub.heading+c.horizontalAngle*radians+o.x,height=Math.tan(elevation)*distance+near*c.nearFloorLift;
  this.pivot.set(p.x,p.y+.6,p.z);
  this.desired.set(p.x-Math.sin(angle)*distance,p.y+height,p.z-Math.cos(angle)*distance);
  this.desired.y=Math.min(w.surface-1,this.desired.y);
  this.focus.set(p.x+Math.sin(sub.heading)*c.lookAhead,p.y+Math.max(.4,Math.min(2,c.height-(c.distance+c.lookAhead)*Math.tan(c.downwardAngle*radians)+c.framingLift)),p.z+Math.cos(sub.heading)*c.lookAhead);
  if(this.initial){this.camera.position.copy(this.desired);this.target.copy(this.focus);}
  else{this.camera.position.lerp(this.desired,smoothFactor(c.positionSmoothing,dt));this.target.lerp(this.focus,smoothFactor(c.rotationSmoothing,dt));}
  // Check the smoothed path as well: turns must not cut through a reef corner.
  if(c.collisionEnabled&&this.obstacles){limit=this.obstacles.limit(this.pivot,this.camera.position,c);this.camera.position.lerpVectors(this.pivot,this.camera.position,limit);}
  this.camera.position.y=Math.max(heightAt(this.camera.position.x,this.camera.position.z)+c.terrainClearance,Math.min(w.surface-1,this.camera.position.y));
  }
  // At forced close range, aim at the hull rather than beyond its bow.
  // This keeps the vehicle readable when a structure restricts camera space.
  const close=Math.max(0,1-this.camera.position.distanceTo(this.pivot)/(c.distance*.65));
  this.focus.copy(this.target);if(close>0){this.focus.x+=(p.x-this.focus.x)*close;this.focus.y+=(p.y+.4-this.focus.y)*close;this.focus.z+=(p.z-this.focus.z)*close;}
  this.look.lookAt(this.camera.position,this.focus,this.up);this.rotation.setFromRotationMatrix(this.look);
  // Ground position and terrain aim are already damped: derive world-up rotation
  // once, without a second lagging rotation spring. Swimming keeps its response.
  if(ground||this.initial||limit<.98)this.camera.quaternion.copy(this.rotation);else this.camera.quaternion.slerp(this.rotation,smoothFactor(c.rotationSmoothing,dt));
  this.camera.fov+=(c.fov+speed*c.speedFovIncrease-this.camera.fov)*smoothFactor(c.fovSmoothing,dt);this.camera.updateProjectionMatrix();this.initial=false;
  if(this.inspect){this.output??=document.body.appendChild(Object.assign(document.createElement('output'),{id:'cameraMetrics',hidden:true}));this.output.dataset.metrics=JSON.stringify({position:this.camera.position.toArray(),focus:this.target.toArray(),fov:this.camera.fov,distance:this.camera.position.distanceTo(this.pivot),limit,orbitX:o.x,orbitY:o.y,speed:sub.speed,sub:{...p},heading:sub.heading,candidates:this.obstacles?.near.length??0});}
  this.basePosition.copy(this.camera.position);this.baseRotation.copy(this.camera.quaternion);this.hasBase=true;this.shake.update(dt);
  if(this.shake.amount){
   const shake=this.shake,offset=this.shakeOffset.set(shake.nx,shake.ny,shake.nz);
   if(Math.abs(shake.ny)<.7){
    // Head-on recoil alone is almost invisible. Retain impact direction but ensure
    // a small screen-plane component, including in portrait and after orbiting.
    this.shakeInverse.copy(this.camera.quaternion).invert();offset.applyQuaternion(this.shakeInverse);
    offset.x=(offset.x<0?-1:1)*Math.max(.6,Math.abs(offset.x));
    offset.normalize().applyQuaternion(this.camera.quaternion);
   }
   // Floor landings retain their world-space vertical direction; all offsets stay capped.
   this.camera.position.addScaledVector(offset,shake.amount);
   // Restore this temporary rotation before the next follow/orbit update as well.
   // Angular recoil remains visible regardless of camera distance or screen size.
   const angle=shake.recoil*(shake.strength/cameraShakeConfig.maxIntensity)*Math.min(1,Math.max(0,shake.settings.shakeIntensity))*cameraShakeConfig.maxRotation;
   this.camera.rotateX(angle*(Math.abs(shake.ny)>.7?.45:.65));
   if(Math.abs(shake.ny)<.7)this.camera.rotateZ(angle*.75);
  }
 }
}
