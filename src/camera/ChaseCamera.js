import {cameraShakeConfig} from '../config/cameraShakeConfig.js';
import {CollisionShake} from './CollisionShake.js';
import {gameplaySettings} from '../ui/gameplayPreferences.js';
import * as T from 'three';
import {cameraConfig as c} from '../config/cameraConfig.js';
import {worldConfig as w} from '../config/worldConfig.js';
import {heightAt} from '../environment/terrainMath.js';
import {smoothFactor,speedFraming,aspectDistance,updateOrbitRecenter} from './cameraMath.js';
const radians=Math.PI/180;
export class ChaseCamera{
 constructor(camera,obstacles){this.camera=camera;this.obstacles=obstacles;this.initial=true;this.recenter={active:false,x:0,y:0};
  this.shake=new CollisionShake(gameplaySettings);this.shakeOffset=new T.Vector3();this.shakeInverse=new T.Quaternion();this.baseRotation=new T.Quaternion();this.basePosition=new T.Vector3();this.hasBase=false;
  this.pivot=new T.Vector3();this.desired=new T.Vector3();this.focus=new T.Vector3();this.target=new T.Vector3();this.look=new T.Matrix4();this.rotation=new T.Quaternion();this.up=new T.Vector3(0,1,0);
 }
 clearShake(){if(this.hasBase){this.camera.position.copy(this.basePosition);this.camera.quaternion.copy(this.baseRotation);}this.shake.reset();}
 // Restore the unshaken pose before follow smoothing so offsets never accumulate.
 update(dt,sub,input){if(this.hasBase){this.camera.position.copy(this.basePosition);this.camera.quaternion.copy(this.baseRotation);}const o=input.orbit,p=sub.position;
  updateOrbitRecenter(o,!!input.drag,dt,performance.now()/1000,c,this.recenter);
  const speed=speedFraming(sub.speed,c),distance=c.distance*(this.profile?.distanceMultiplier??1)*aspectDistance(this.camera.aspect,c)*(1+speed*c.speedDistanceIncrease);
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
  let limit=1;if(c.collisionEnabled&&this.obstacles){limit=this.obstacles.limit(this.pivot,this.camera.position,c);this.camera.position.lerpVectors(this.pivot,this.camera.position,limit);}
  this.camera.position.y=Math.max(heightAt(this.camera.position.x,this.camera.position.z)+c.terrainClearance,Math.min(w.surface-1,this.camera.position.y));
  // At forced close range, aim at the hull rather than beyond its bow.
  // This keeps the vehicle readable when a structure restricts camera space.
  const close=Math.max(0,1-this.camera.position.distanceTo(this.pivot)/(c.distance*.65));
  this.focus.copy(this.target);if(close>0){this.focus.x+=(p.x-this.focus.x)*close;this.focus.y+=(p.y+.4-this.focus.y)*close;this.focus.z+=(p.z-this.focus.z)*close;}
  this.look.lookAt(this.camera.position,this.focus,this.up);this.rotation.setFromRotationMatrix(this.look);
  // World-up horizon ignores hull roll/pitch. Pull inward immediately; restore
  // distance with normal exponential follow after the obstruction clears.
  if(this.initial||limit<.98)this.camera.quaternion.copy(this.rotation);else this.camera.quaternion.slerp(this.rotation,smoothFactor(c.rotationSmoothing,dt));
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
