import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
export class GupB{
 static async load(){const gltf=await new GLTFLoader().loadAsync(new URL('../../assets/models/gup-b.glb',import.meta.url).href);return new GupB(gltf.scene);}
 constructor(model){this.group=new T.Group();this.group.add(model);model.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m.name.startsWith('Hull')){m.roughness=.3;m.envMapIntensity=.85;}if(m.name==='Blue bubble canopy'){m.roughness=.16;m.envMapIntensity=1.2;m.opacity=.38;m.depthWrite=false;}});this.propeller=model.getObjectByName('Propeller');}
 update(dt,s){this.group.position.set(s.position.x,s.position.y,s.position.z);this.group.rotation.set(s.pitch,s.heading,s.bank,'YXZ');if(this.propeller)this.propeller.rotation.z+=dt*(2+Math.abs(s.speed)*5);}
}
