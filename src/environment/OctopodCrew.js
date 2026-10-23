import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {crewConfig as config} from '../config/crewConfig.js';
// A separate child collection keeps the existing headquarters asset untouched.
export class OctopodCrew{
 static async load(octopod){const params=new URLSearchParams(location.search);if(!octopod||!config.enabled||params.has('inspect')&&params.get('crew')==='off')return null;const instance=new OctopodCrew();instance.group=new T.Group();instance.group.name='Octopod bridge crew';instance.mixers=[];instance.worldPosition=new T.Vector3();
  const assets=await Promise.all(config.characters.map(c=>new GLTFLoader().loadAsync(new URL('../../assets/models/characters/'+c.id+'.glb',import.meta.url).href)));
  for(let i=0;i<assets.length;i++){const {scene,animations}=assets[i],c=config.characters[i];scene.name=c.id;scene.position.set(c.x,c.y,c.z);scene.rotation.y=c.heading;scene.scale.setScalar(config.scale);scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;if(o.isSkinnedMesh){o.frustumCulled=false;}o.material.roughness=.72;o.material.envMapIntensity=.25;});instance.group.add(scene);const mixer=new T.AnimationMixer(scene);for(const clip of animations)mixer.clipAction(clip).play();mixer.setTime(c.phase);instance.mixers.push(mixer);}
  octopod.model.add(instance.group);return instance;
 }
 update(dt,camera){this.group.getWorldPosition(this.worldPosition);this.worldPosition.y+=21;this.group.visible=camera.position.distanceTo(this.worldPosition)<config.renderDistance;if(this.group.visible)for(const mixer of this.mixers)mixer.update(dt);}
}
