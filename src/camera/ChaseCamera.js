import * as T from 'three';
import {cameraConfig as c,worldConfig as w} from '../config/worldConfig.js';
import {heightAt} from '../environment/terrainMath.js';
export class ChaseCamera{
 constructor(camera){this.camera=camera;this.target=new T.Vector3();this.initial=true;}
 update(dt,sub,input){const o=input.orbit;if(!input.drag&&performance.now()/1000-o.last>c.returnDelay){o.x*=Math.exp(-dt*c.returnRate);o.y*=Math.exp(-dt*c.returnRate);}const p=new T.Vector3(sub.position.x,sub.position.y,sub.position.z),a=sub.heading+o.x;const desired=p.clone().add(new T.Vector3(-Math.sin(a)*c.distance,c.height+o.y*9,-Math.cos(a)*c.distance));desired.y=Math.max(heightAt(desired.x,desired.z)+1.2,Math.min(w.surface-1,desired.y));if(this.initial){this.camera.position.copy(desired);this.target.copy(p);this.initial=false;}this.camera.position.lerp(desired,1-Math.exp(-dt*c.follow));this.camera.position.y=Math.max(this.camera.position.y,heightAt(this.camera.position.x,this.camera.position.z)+1.2);this.target.lerp(p,1-Math.exp(-dt*8));this.camera.lookAt(this.target);}
}
