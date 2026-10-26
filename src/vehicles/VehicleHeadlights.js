import * as T from 'three';
import {dayNightConfig} from '../config/dayNightConfig.js';
// Exactly one persistent spotlight; no parked lights, beam mesh or shadow pass.
export class VehicleHeadlights{
 constructor(scene){const c=dayNightConfig.headlights;this.light=new T.SpotLight(c.color,0,c.distance,c.angle,c.penumbra,c.decay);this.light.name='Active GUP headlights';this.light.castShadow=false;this.target=new T.Object3D();this.target.name='Active GUP headlight aim';this.light.target=this.target;scene.add(this.light,this.target);this.rotation=new T.Quaternion();this.origin=new T.Vector3();this.aim=new T.Vector3();}
 update(vehicle,definition,strength){if(!vehicle||!definition)return;const c=dayNightConfig.headlights,hull=definition.collision;vehicle.updateWorldMatrix(true,false);vehicle.getWorldQuaternion(this.rotation);vehicle.getWorldPosition(this.origin);
  // Hull dimensions are world metres, so imported model scale cannot stretch the arm.
  this.light.position.set(0,(hull.centerY??0)+hull.halfHeight*c.heightFraction,hull.halfLength+c.nosePadding).applyQuaternion(this.rotation).add(this.origin);
  this.aim.set(0,-c.downward,1).normalize().applyQuaternion(this.rotation);this.target.position.copy(this.light.position).addScaledVector(this.aim,c.distance);this.target.updateMatrixWorld();this.light.intensity=c.intensity*strength;
 }
 dispose(){this.light.removeFromParent();this.target.removeFromParent();this.light.dispose();}
}
