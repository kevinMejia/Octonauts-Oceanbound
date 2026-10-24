import * as T from 'three';
import {towVisualBlend} from '../rescue/towVisualMath.js';
const descendsFrom=(node,ancestor)=>{for(let parent=node;parent;parent=parent.parent)if(parent===ancestor)return true;return false;};
const named=(root,name)=>{let result=null;root.traverse(node=>{if(!result&&(node.userData?.name===name||node.name===name))result=node;});return result;};
// A reversible, additive shoulder overlay. Existing clips remain the base pose.
export class TowPose{
 constructor(id,scene,motionRoot,config){
  this.config=config;this.profile=config.characters[id]??{};this.motionRoot=motionRoot;this.weight=0;this.time=0;this.applied=false;
  this.bodyBase=new T.Quaternion();this.bodyPosition=new T.Vector3();this.bodyWorld=new T.Quaternion();this.bodyOffset=new T.Quaternion();this.euler=new T.Euler();this.joints=[];
  const rig=named(scene,this.profile.rig)??scene,definitions=this.profile.joints??[];
  for(const def of definitions){const bone=named(rig,def.bone),tip=named(rig,def.tip);if(!bone||!tip||!bone.parent)continue;const point=motionRoot.worldToLocal(bone.getWorldPosition(new T.Vector3())),axis=tip.position.clone().normalize();if(axis.lengthSq()<.01)axis.set(0,1,0);const followers=(def.followers??[]).map(name=>named(rig,name)).filter(node=>node&&!descendsFrom(node,bone)).map(node=>({node,position:new T.Vector3(),rotation:new T.Quaternion(),scale:new T.Vector3(),world:new T.Matrix4(),local:new T.Matrix4()}));this.joints.push({bone,axis,followers,before:new T.Matrix4(),deltaMatrix:new T.Matrix4(),side:def.side??(Math.sign(point.x)||1),base:new T.Quaternion(),parent:new T.Quaternion(),delta:new T.Quaternion(),target:new T.Quaternion(),currentDirection:new T.Vector3(),desired:new T.Vector3()});}
 }
 restore(){if(!this.applied)return;for(const joint of this.joints){joint.bone.quaternion.copy(joint.base);for(const follower of joint.followers){follower.node.position.copy(follower.position);follower.node.quaternion.copy(follower.rotation);follower.node.scale.copy(follower.scale);}}this.motionRoot.quaternion.copy(this.bodyBase);this.motionRoot.position.copy(this.bodyPosition);this.applied=false;}
 update(dt,attached,speed=0){
  this.weight=towVisualBlend(this.weight,attached,dt,this.config);if(this.weight===0)return;this.time+=dt;
  const strength=Math.min(1,Math.max(0,speed)/8),w=this.weight;this.bodyBase.copy(this.motionRoot.quaternion);this.bodyPosition.copy(this.motionRoot.position);
  this.bodyOffset.setFromEuler(this.euler.set(this.config.bodyPitch*strength*w,0,Math.sin(this.time*1.4)*this.config.bodyRoll*w));this.motionRoot.quaternion.multiply(this.bodyOffset);this.motionRoot.position.y+=Math.sin(this.time*1.6)*this.config.bodyBob*w;this.motionRoot.getWorldQuaternion(this.bodyWorld);
  for(const joint of this.joints){joint.bone.updateWorldMatrix(true,false);joint.before.copy(joint.bone.matrixWorld).invert();for(const follower of joint.followers){follower.position.copy(follower.node.position);follower.rotation.copy(follower.node.quaternion);follower.scale.copy(follower.node.scale);follower.node.updateWorldMatrix(true,false);follower.world.copy(follower.node.matrixWorld);}
   joint.base.copy(joint.bone.quaternion);joint.bone.parent.getWorldQuaternion(joint.parent).invert();const direction=this.profile.reachDirection??this.config.reachDirection;
   joint.desired.set(joint.side*direction[0],direction[1],direction[2]).normalize().applyQuaternion(this.bodyWorld).applyQuaternion(joint.parent);joint.currentDirection.copy(joint.axis).applyQuaternion(joint.base).normalize();joint.delta.setFromUnitVectors(joint.currentDirection,joint.desired);joint.target.copy(joint.delta).multiply(joint.base);joint.bone.quaternion.copy(joint.base).slerp(joint.target,w*(this.profile.reachWeight??this.config.reachWeight)*(.85+.15*strength));
   // Blender's hand IK controls are independent roots in GLB. Carry those roots
   // with the same shoulder transform so palms and attached accessories stay connected.
   joint.bone.updateWorldMatrix(true,false);joint.deltaMatrix.multiplyMatrices(joint.bone.matrixWorld,joint.before);
   for(const follower of joint.followers){follower.node.parent.updateWorldMatrix(true,false);follower.local.copy(follower.node.parent.matrixWorld).invert().multiply(joint.deltaMatrix).multiply(follower.world);follower.local.decompose(follower.node.position,follower.node.quaternion,follower.node.scale);}
  }this.applied=true;
 }
 dispose(){this.restore();this.weight=0;this.joints.length=0;}
}
