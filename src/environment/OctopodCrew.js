import * as T from 'three';
import {crewLoader} from './CrewAssets.js';
import {crewConfig as config,crewModelURL} from '../config/crewConfig.js';
import {FleetPlacement} from '../vehicles/fleetPlacement.js';
// Each existing model belongs either to its world location or its original bridge slot.
export class OctopodCrew{
 static async load(octopod){
  const params=new URLSearchParams(location.search);if(!octopod||!config.enabled||params.has('inspect')&&params.get('crew')==='off')return null;
  const instance=new OctopodCrew();instance.group=new T.Group();instance.group.name='Octopod bridge crew';instance.world=new T.Group();instance.world.name='Octonaut discovery locations';instance.records=new Map();instance.mixers=[];
  const loader=crewLoader();
  const assets=await Promise.all(config.characters.map(c=>loader.loadAsync(crewModelURL(c)).catch(error=>{
   console.warn('Crew replacement failed; using original visual',c.id,error);
   return loader.loadAsync(crewModelURL({...c,visual:{modelPath:'../../assets/models/characters/'+c.id+'.glb'}})).then(asset=>({...asset,original:true}));
  })));
  for(let i=0;i<assets.length;i++){
   const {scene,animations}=assets[i],c=config.characters[i],visual=assets[i].original?{idleClip:c.id+'_Idle'}:(c.visual??{}),model=new T.Group();
   model.name=c.id;model.position.set(c.x,c.y,c.z);model.rotation.y=c.heading;model.scale.setScalar(config.scale);
   scene.name=c.id+' visual';const visualRoot=new T.Group();visualRoot.name=c.id+' asset transform';visualRoot.add(scene);visualRoot.scale.setScalar(visual.scale??1);visualRoot.rotation.y=visual.orientation??0;visualRoot.updateMatrixWorld(true);
   // Normalize replacement origins once, independently of gameplay/home transforms.
   const floor=new T.Box3().setFromObject(visualRoot).min.y,offset=visual.offset??[0,0,0];visualRoot.position.set(offset[0],offset[1]-floor,offset[2]);model.add(visualRoot);
   scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;if(o.isSkinnedMesh)o.frustumCulled=false;});
   instance.group.add(model);const mixer=new T.AnimationMixer(scene),idle=animations.find(clip=>clip.name===visual.idleClip)??animations.find(clip=>/idle/i.test(clip.name))??animations[0];
   if(idle&&!visual.static)mixer.clipAction(idle).play();mixer.setTime(c.phase);instance.mixers.push(mixer);
   instance.records.set(c.id,{definition:c,model,content:scene,visualRoot,mixer,home:true,worldPosition:new T.Vector3()});
  }
  octopod.model.add(instance.group);octopod.model.parent.add(instance.world);return instance;
 }
 initialize(game,discovery){
  this.discovery=discovery;const placement=new FleetPlacement(game.interactions.surfaces.grid);
  for(const record of this.records.values()){
   const d=record.definition,model=record.model;model.position.set(0,0,0);model.rotation.set(0,0,0);
   // Reuse the existing model-thumbnail renderer; restore the same instance below.
   record.portrait=d.portraitPath;
   if(!record.portrait){const time=record.mixer.time;try{record.mixer.setTime(d.visual?.portraitTime??0);record.portrait=game.marineAnimals.thumbnail(model,true);}finally{record.mixer.setTime(time);}}
   const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());record.height=d.gameplaySize?.height??size.y;record.radius=d.gameplaySize?.radius??Math.max(size.x,size.z)/2;
   const proxy={collision:{radius:record.radius+.15,halfLength:record.radius+.15,halfHeight:record.height/2,centerY:record.height/2,terrainClearance:.08,surfaceClearance:record.height+.3}};
   record.spawn=placement.find({...d.discovery.position,heading:d.discovery.heading??0,groundClearance:.08,heightOffset:0},proxy,{parking:true,returningId:'*',maxRadius:d.discovery.maxPlacementRadius??16});
   if(!record.spawn)throw Error('No safe Octonaut discovery location: '+d.id);
   discovery.setPosition(d.id,{...record.spawn,y:record.spawn.y+record.height/2});
  }
  this.sync();
 }
 sync(){
  for(const r of this.records.values()){
   const d=r.definition;r.home=this.discovery.isRescued(d.id);if(this.discovery.active===d.id)continue;
   const p=r.home?{x:d.x,y:d.y,z:d.z,heading:d.heading}:r.spawn;
   (r.home?this.group:this.world).add(r.model);r.model.position.set(p.x,p.y,p.z);r.model.rotation.set(0,p.heading??0,0);r.model.visible=true;r.model.updateMatrixWorld(true);
  }
 }
 update(dt,camera){
  for(const r of this.records.values()){r.model.getWorldPosition(r.worldPosition);r.worldPosition.y+=r.height/2||1.5;r.model.visible=camera.position.distanceTo(r.worldPosition)<config.renderDistance;if(r.model.visible)r.mixer.update(dt);}
 }
}
