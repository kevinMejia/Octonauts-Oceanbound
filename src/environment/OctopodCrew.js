import {CrewActivities} from '../crew/CrewActivities.js';
import {crewActivityConfig as activityConfig} from '../config/crewActivityConfig.js';
import * as T from 'three';
import {crewLoader} from './CrewAssets.js';
import {crewConfig as config,crewModelURL} from '../config/crewConfig.js';
import {FleetPlacement} from '../vehicles/fleetPlacement.js';
// Gameplay roots retain their world/rescue ownership; rescued crew use local bridge activities.
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
   const floor=new T.Box3().setFromObject(visualRoot).min.y,offset=visual.offset??[0,0,0];visualRoot.position.set(offset[0],offset[1]-floor,offset[2]);const motionRoot=new T.Group();motionRoot.name=c.id+' ambient body motion';motionRoot.add(visualRoot);model.add(motionRoot);
   scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;if(o.isSkinnedMesh)o.frustumCulled=false;});
   instance.group.add(model);const mixer=new T.AnimationMixer(scene),idle=animations.find(clip=>clip.name===visual.idleClip)??animations.find(clip=>/idle/i.test(clip.name))??animations[0];
   const idleAction=idle&&!visual.static?mixer.clipAction(idle).play():null,walk=animations.find(clip=>/walk|locomotion/i.test(clip.name)&&clip.duration>.1),walkAction=walk?mixer.clipAction(walk):null;mixer.setTime(c.phase);instance.mixers.push(mixer);
   instance.records.set(c.id,{definition:c,model,content:scene,visualRoot,motionRoot,mixer,idleAction,walkAction,walking:false,home:true,worldPosition:new T.Vector3()});
  }
  octopod.model.add(instance.group);octopod.model.parent.add(instance.world);return instance;
 }
 initialize(game,discovery){
  this.discovery=discovery;this.activities=new CrewActivities(activityConfig);this.activitySphere=new T.Sphere(new T.Vector3(),activityConfig.walkableRadius+2);this.activityFrustum=new T.Frustum();this.activityMatrix=new T.Matrix4();this.activityCenter=new T.Vector3();const placement=new FleetPlacement(game.interactions.surfaces.grid);
  for(const record of this.records.values()){
   const d=record.definition,model=record.model;model.position.set(0,0,0);model.rotation.set(0,0,0);
   // Reuse the existing model-thumbnail renderer; restore the same instance below.
   record.portrait=d.portraitPath;
   if(!record.portrait){const time=record.mixer.time;try{record.mixer.setTime(d.visual?.portraitTime??0);record.portrait=game.marineAnimals.thumbnail(model,true);}finally{record.mixer.setTime(time);}}
   const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());record.height=d.gameplaySize?.height??size.y;record.radius=d.gameplaySize?.radius??Math.max(size.x,size.z)/2;record.activityRadius=Math.max(record.radius,Math.max(size.x,size.z)/2);
   const proxy={collision:{radius:record.radius+.15,halfLength:record.radius+.15,halfHeight:record.height/2,centerY:record.height/2,terrainClearance:.08,surfaceClearance:record.height+.3}};
   record.spawn=placement.find({...d.discovery.position,heading:d.discovery.heading??0,groundClearance:.08,heightOffset:0},proxy,{parking:true,returningId:'*',maxRadius:d.discovery.maxPlacementRadius??16});
   if(!record.spawn)throw Error('No safe Octonaut discovery location: '+d.id);
   discovery.setPosition(d.id,{...record.spawn,y:record.spawn.y+record.height/2});
  }
  this.sync();
 }
 sync(){
  const home=[];
  for(const r of this.records.values()){
   const d=r.definition;r.home=this.discovery.isRescued(d.id);if(this.discovery.active===d.id)continue;
   if(r.home){
    if(r.model.parent!==this.group||!this.activities.actors.has(d.id)){this.group.add(r.model);r.model.position.set(d.x,d.y,d.z);r.model.rotation.set(0,d.heading,0);}
    home.push({id:d.id,position:r.model.position,heading:r.model.rotation.y,radius:r.activityRadius});
   }else{this.world.add(r.model);r.model.position.set(r.spawn.x,r.spawn.y,r.spawn.z);r.model.rotation.set(0,r.spawn.heading??0,0);r.motionRoot.position.set(0,0,0);r.motionRoot.rotation.set(0,0,0);if(r.walking&&r.walkAction){r.walkAction.stop();r.idleAction?.reset().play();}r.walking=false;}
   r.model.visible=true;r.model.updateMatrixWorld(true);
  }
  this.activities.sync(home);
  for(const r of this.records.values())if(r.home){const a=this.activities.actors.get(r.definition.id);if(a)r.model.position.set(a.position.x,a.position.y,a.position.z);}
 }
 activityVisible(camera){
  let parent=this.group;while(parent&&!parent.isScene){if(!parent.visible)return false;parent=parent.parent;}if(!parent?.visible)return false;
  this.activityCenter.set(0,activityConfig.floorY+1.8,0);this.group.localToWorld(this.activityCenter);
  if(camera.position.distanceTo(this.activityCenter)>activityConfig.activeDistance)return false;
  camera.updateMatrixWorld();this.activityMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.activityFrustum.setFromProjectionMatrix(this.activityMatrix);this.activitySphere.center.copy(this.activityCenter);return this.activityFrustum.intersectsSphere(this.activitySphere);
 }
 update(dt,camera){
  const active=this.activityVisible(camera);this.activities.update(dt,active);
  for(const r of this.records.values()){
   const actor=r.home?this.activities.actors.get(r.definition.id):null;
   if(actor){
    r.model.position.set(actor.position.x,actor.position.y,actor.position.z);r.model.rotation.y=actor.heading;
    const walking=activityConfig.enabled&&actor.state==='WALKING';if(r.walkAction&&walking!==r.walking){if(walking){r.idleAction?.fadeOut(.2);r.walkAction.reset().fadeIn(.2).play();}else{r.walkAction.fadeOut(.2);r.idleAction?.reset().fadeIn(.2).play();}}r.walking=walking;
    if(activityConfig.enabled){const phase=this.activities.time*1.7+actor.phase,step=actor.travelTime*activityConfig.walkBobFrequency,amount=activityConfig.idleAnimationIntensity,intensity=amount/.035;
     r.motionRoot.position.y=walking&&!r.walkAction?Math.abs(Math.sin(step))*amount:(1+Math.sin(phase))*amount*.2;
     r.motionRoot.rotation.set((walking?.008:actor.activityType==='computer'?.025+Math.sin(phase)*.01:0)*intensity,(walking?0:Math.sin(phase*.6)*.015)*intensity,(walking&&!r.walkAction?Math.sin(step)*.018:Math.sin(phase)*.006)*intensity);
    }else{r.motionRoot.position.set(0,0,0);r.motionRoot.rotation.set(0,0,0);}
   }
   r.model.getWorldPosition(r.worldPosition);r.worldPosition.y+=r.height/2||1.5;r.model.visible=camera.position.distanceTo(r.worldPosition)<config.renderDistance;if(r.model.visible&&(!r.home||active))r.mixer.update(dt);
  }
 }
 dispose(){this.activities?.dispose();for(const r of this.records.values()){r.mixer.stopAllAction();r.mixer.uncacheRoot(r.content);}this.group.removeFromParent();this.world.removeFromParent();this.group.clear();this.world.clear();this.records.clear();this.mixers.length=0;}
}
