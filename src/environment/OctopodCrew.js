import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {crewConfig as config} from '../config/crewConfig.js';
import {FleetPlacement} from '../vehicles/fleetPlacement.js';
// Each existing model belongs either to its world location or its original bridge slot.
export class OctopodCrew{
 static async load(octopod){
  const params=new URLSearchParams(location.search);if(!octopod||!config.enabled||params.has('inspect')&&params.get('crew')==='off')return null;
  const instance=new OctopodCrew();instance.group=new T.Group();instance.group.name='Octopod bridge crew';instance.world=new T.Group();instance.world.name='Octonaut discovery locations';instance.records=new Map();instance.mixers=[];
  const assets=await Promise.all(config.characters.map(c=>new GLTFLoader().loadAsync(new URL('../../assets/models/characters/'+c.id+'.glb',import.meta.url).href)));
  for(let i=0;i<assets.length;i++){
   const {scene,animations}=assets[i],c=config.characters[i];scene.name=c.id;scene.position.set(c.x,c.y,c.z);scene.rotation.y=c.heading;scene.scale.setScalar(config.scale);
   scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;if(o.isSkinnedMesh)o.frustumCulled=false;o.material.roughness=.72;o.material.envMapIntensity=.25;});
   instance.group.add(scene);const mixer=new T.AnimationMixer(scene);for(const clip of animations)mixer.clipAction(clip).play();mixer.setTime(c.phase);instance.mixers.push(mixer);
   instance.records.set(c.id,{definition:c,model:scene,mixer,home:true,worldPosition:new T.Vector3()});
  }
  octopod.model.add(instance.group);octopod.model.parent.add(instance.world);return instance;
 }
 initialize(game,discovery){
  this.discovery=discovery;const placement=new FleetPlacement(game.interactions.surfaces.grid);
  for(const record of this.records.values()){
   const d=record.definition,model=record.model;model.position.set(0,0,0);model.rotation.set(0,0,0);
   // Reuse the existing model-thumbnail renderer; restore the same instance below.
   record.portrait=d.portraitPath??game.marineAnimals.thumbnail(model,true);
   const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());record.height=size.y;
   const proxy={collision:{radius:Math.max(size.x,size.z)/2+.15,halfLength:Math.max(size.x,size.z)/2+.15,halfHeight:size.y/2,centerY:size.y/2,terrainClearance:.08,surfaceClearance:size.y+.3}};
   record.spawn=placement.find({...d.discovery.position,heading:d.discovery.heading??0,groundClearance:.08,heightOffset:0},proxy,{parking:true,returningId:'*',maxRadius:d.discovery.maxPlacementRadius??16});
   if(!record.spawn)throw Error('No safe Octonaut discovery location: '+d.id);
   discovery.setPosition(d.id,{...record.spawn,y:record.spawn.y+record.height/2});
  }
  this.sync();
 }
 sync(){
  for(const r of this.records.values()){
   const d=r.definition;r.home=this.discovery.isDiscovered(d.id)&&this.discovery.pending!==d.id;
   const p=r.home?{x:d.x,y:d.y,z:d.z,heading:d.heading}:r.spawn;
   (r.home?this.group:this.world).add(r.model);r.model.position.set(p.x,p.y,p.z);r.model.rotation.set(0,p.heading??0,0);r.model.visible=true;r.model.updateMatrixWorld(true);
  }
 }
 update(dt,camera){
  for(const r of this.records.values()){r.model.getWorldPosition(r.worldPosition);r.worldPosition.y+=r.height/2||1.5;r.model.visible=camera.position.distanceTo(r.worldPosition)<config.renderDistance;if(r.model.visible)r.mixer.update(dt);}
 }
}
