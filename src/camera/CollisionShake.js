import {cameraShakeConfig as config} from '../config/cameraShakeConfig.js';
// Scalar state only: the contact observer also captures GUP-X physics substeps.
export class CollisionShake{
 constructor(settings, tuning=config){this.settings=settings;this.config=tuning;this.reset();}
 reset(){this.age=0;this.length=0;this.strength=0;this.wait=0;this.x=this.y=this.z=0;}
 impact(contact){
  const c=this.config;
  if(!c.enabled||!this.settings.cameraShake||this.settings.shakeIntensity<=0||!contact?.fresh||this.wait>0||contact.impact<c.minimumImpactThreshold)return;
  const severity=Math.min(1,(contact.impact-c.minimumImpactThreshold)/12);
  this.strength=c.maxIntensity*(.06+.94*severity);
  this.length=c.duration*(1/3+2/3*severity);this.age=0;this.wait=c.cooldown;
  this.nx=contact.nx;this.ny=contact.ny;this.nz=contact.nz;
 }
 update(dt){
  this.wait=Math.max(0,this.wait-dt);this.age+=dt;
  this.x=this.y=this.z=0;
  if(!this.config.enabled||!this.settings.cameraShake||this.settings.shakeIntensity<=0){this.reset();return;}
  if(this.age>=this.length)return;
  const t=this.age/this.length;
  // Smooth onset and zero velocity at the end; one gentle recoil, no random jitter.
  const wave=Math.sin(t*Math.PI*2)*(1-t)*(1-t);
  const amount=wave*Math.min(this.strength,this.config.maxIntensity)*Math.min(1,Math.max(0,this.settings.shakeIntensity));
  this.x=this.nx*amount;this.y=this.ny*amount;this.z=this.nz*amount;
 }
}
