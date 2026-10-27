import {GameViewport} from './GameViewport.js';
import {DayNightCycle} from '../environment/DayNightCycle.js';
import {VehicleHeadlights} from '../vehicles/VehicleHeadlights.js';
import {VehicleTransformation} from '../effects/VehicleTransformation.js';
import {warmNearbyScenery} from '../environment/SceneryWarmup.js';
import {performanceDisplay} from '../ui/PerformanceDisplay.js';
import {gameplaySettings} from '../ui/gameplayPreferences.js';
import {WordHunt} from '../wordHunt/WordHunt.js';
import {RescueNavigation} from '../ui/RescueNavigation.js';
import {RescueSystem} from '../rescue/RescueSystem.js';
import {CrewDiscovery} from '../crew/CrewDiscovery.js';
import {CrewDiscoveryModal} from '../ui/CrewDiscoveryModal.js';
import {MarineAnimals} from '../marine/MarineAnimals.js';
import {MarineDiscovery} from '../marine/MarineDiscovery.js';
import {MarineCollection} from '../ui/MarineCollection.js';
import {prepareVehicleTextures,vehicleImages} from '../vehicles/VehicleTextures.js';
import {VehicleUnlocks} from '../vehicles/VehicleUnlocks.js';
import {DiscoveryFleet} from '../vehicles/DiscoveryFleet.js';
import {DiscoveryModal} from '../ui/DiscoveryModal.js';
import {CollisionWorld} from '../collision/CollisionWorld.js';
import {CollisionDebug} from '../collision/CollisionDebug.js';
import {preloadVehicles} from '../vehicles/preloadVehicles.js';
import {PauseState} from './PauseState.js';
import {VehicleFleet} from '../vehicles/VehicleFleet.js';
import {loadVehicle,releaseVehicleGPU} from '../vehicles/VehicleManager.js';
import {vehicles,vehicleById,defaultVehicleId} from '../config/vehicleConfig.js';
import {VehicleSelector} from '../ui/VehicleSelector.js';
import {AudioManager} from '../audio/AudioManager.js';
import {OctopodCrew} from '../environment/OctopodCrew.js';
import {ReefFish} from '../environment/ReefFish.js';
import {TurboMeter} from '../ui/TurboMeter.js';
import {CameraObstacles} from '../camera/CameraObstacles.js';
import {cameraConfig} from '../config/cameraConfig.js';
import {Octopod} from '../environment/Octopod.js';
import {Compass} from '../navigation/Compass.js';
import {octopodConfig} from '../config/octopodConfig.js';
import {EnvironmentalInteractions} from '../effects/EnvironmentalInteractions.js';
import {habitatEnabled} from '../config/habitatConfig.js';
import {ReefHabitat} from '../environment/ReefHabitat.js';
import {RenderMetrics} from '../environment/RenderMetrics.js';
import {environmentConfig,graphicsSelection} from '../config/environmentConfig.js';
import {TurboPickups} from '../turbo/TurboPickups.js';
import {TurboEffects} from '../turbo/TurboEffects.js';
import * as T from 'three';
import {OceanTerrain} from '../environment/OceanTerrain.js';
import {OceanDecorations} from '../environment/OceanDecorations.js';
import {atmosphere} from '../environment/UnderwaterAtmosphere.js';
import {GupB} from '../vehicles/GupB.js';
import {SubmarineController} from '../vehicles/SubmarineController.js';
import {Input} from '../input/Input.js';
import {ChaseCamera} from '../camera/ChaseCamera.js';
export class Game{
 async start({onProgress=()=>{}}={}){const preloadIds=vehicles.filter(v=>v.id!==defaultVehicleId&&v.preloadAtStart===true).map(v=>v.id),startupTasks=9+preloadIds.length;const task=async(promise)=>{const result=await promise;onProgress(++completed/startupTasks);return result;};let completed=0;this.pause=new PauseState(paused=>this.onPauseChanged(paused));this.audio=new AudioManager({requirePlay:true});this.releaseStartup=this.pause.acquire('startup');const canvas=document.querySelector('canvas');this.graphics=graphicsSelection();this.quality=this.graphics.quality;const profile=this.profile=environmentConfig.profiles[this.quality];this.renderer=new T.WebGLRenderer({canvas,antialias:profile.antialias&&!matchMedia('(any-pointer:coarse)').matches,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,profile.pixelRatio));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;const scene=this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(cameraConfig.fov,1,.1,650);this.viewport=new GameViewport(this.renderer,this.camera,()=>{this.needsPausedRender=true;this.wordHunt?.display.position();});this.terrain=new OceanTerrain(scene,profile);this.renderer.shadowMap.enabled=profile.shadows;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.dayNight=new DayNightCycle(gameplaySettings);this.headlights=new VehicleHeadlights(scene);this.atmosphere=atmosphere(scene,profile,this.renderer,this.dayNight);this.decor=new OceanDecorations();this.habitat=habitatEnabled()?new ReefHabitat():null;const [gup,,pickups,,octopod]=await Promise.all([task(GupB.load().then(async vehicle=>{await prepareVehicleTextures(vehicle,this.renderer);return vehicle;})),task(this.decor.load(scene,profile)),task(TurboPickups.load(scene)),task(this.habitat?.load(scene,profile)),task(Octopod.load(scene))]);this.octopod=octopod;this.crew=await task(OctopodCrew.load(octopod));this.decor.layout.rocks.push(...(octopod?.colliders??[]).filter(c=>c.y<10).map(c=>({x:c.x,z:c.z,radius:Math.max(c.rx,c.rz)})));this.decor.layout.rocks.push(...(this.habitat?.colliders??[]).map(c=>({x:c.x,z:c.z,radius:Math.max(c.rx,c.rz)})));this.decor.createOcclusion();this.terrain.setOcclusion(this.decor.occlusion);this.interactions=await task(EnvironmentalInteractions.create(scene,this.quality,this.habitat,this.decor,octopodConfig.collisionEnabled?octopod?.colliders:[]));this.atmosphere.propulsion.setVents(this.interactions.surfaces,this.decor);this.fish=new ReefFish(scene,this.quality==='low',this.interactions.surfaces);this.pickups=pickups;this.turboEffects=new TurboEffects(gup.group);this.gup=gup;scene.add(gup.group);this.sub=new SubmarineController();this.collisions=new CollisionWorld(this.interactions.surfaces);this.sub.collisionWorld=this.collisions;this.collisionDebug=new URLSearchParams(location.search).has('collisionDebug')?new CollisionDebug(scene,this.collisions):null;if(octopodConfig.enabled){const spawn=octopodConfig.spawn;Object.assign(this.sub.position,{x:spawn.x,y:spawn.y,z:spawn.z});this.sub.heading=spawn.heading;}this.compass=new Compass();this.input=new Input(canvas);this.turboMeter=new TurboMeter(document.querySelector("#turboCharge"));this.chase=new ChaseCamera(this.camera,new CameraObstacles(this.interactions.surfaces));this.collisions.onImpact=contact=>{this.chase.shake.impact(contact);this.discovery?.push(contact,this.sub);};this.chase.inspect=new URLSearchParams(location.search).has('inspect');document.querySelector('#status').hidden=true;this.metrics=new RenderMetrics(this.renderer,{adaptive:this.graphics.adaptive,minPixelRatio:profile.minPixelRatio,maxPixelRatio:Math.min(devicePixelRatio,profile.pixelRatio),targetFrameMs:profile.targetFrameMs});this.configureVehicle(gup,defaultVehicleId);let storage;try{storage=localStorage;}catch{}this.wordHunt=new WordHunt(scene,this.interactions.surfaces,storage);this.sub.turbo.setInfinite(this.wordHunt.progress.infiniteTurbo);this.unlocks=new VehicleUnlocks(vehicles,storage);this.unlocks.setOverride('gup-x',gameplaySettings.unlockGupX);this.unlocks.subscribe(id=>{if(id==='gup-x')this.discoveryModal?.enqueue(vehicleById(id));});this.vehicles=new VehicleFleet({initialId:defaultVehicleId,initialVehicle:gup,canSelect:id=>this.unlocks.isUnlocked(id),load:loadVehicle,prepare:next=>this.prepareVehicle(next),install:(next,previous,id)=>this.installVehicle(next,previous,id)});this.vehicleTransformation=new VehicleTransformation(this);this.vehicleSelector=new VehicleSelector(this);onProgress(++completed/startupTasks);
 await preloadVehicles(this.vehicles,{ids:preloadIds,onProgress:event=>{if(event.status!=='loading'){onProgress(++completed/startupTasks);if(event.error)console.warn('Optional vehicle unavailable',event.id,event.error);}}});
 this.marineDiscovery=new MarineDiscovery({storage,blocked:()=>this.pause.paused||!!document.querySelector('dialog[open]'),onDiscover:(animal,position)=>{this.compass.syncTargets();return this.marineCollection.open(animal,position);}});this.marineAnimals=await MarineAnimals.create(this);this.compass.connectAnimals(this.marineDiscovery,this.marineAnimals);this.marineCollection=new MarineCollection(this,this.marineDiscovery);this.discoveryModal=new DiscoveryModal(this);this.discovery=new DiscoveryFleet({prepare:vehicle=>prepareVehicleTextures(vehicle,this.renderer),release:releaseVehicleGPU,registry:vehicles,fleet:this.vehicles,unlocks:this.unlocks,surfaces:this.interactions.surfaces,scene,onDiscover:(definition,location)=>this.discoveryModal.open(definition,location),blocked:()=>this.pause.paused||!!document.querySelector('dialog[open]')});await this.discovery.initialize();this.compass.connectDiscovery(this.discovery,this.unlocks);
 this.rescueNavigation=await RescueNavigation.create(document.querySelector('#gameplayNotifications'),scene,()=>{this.needsPausedRender=true;});
 this.rescue=new RescueSystem(this,{onDelivered:id=>this.crewDiscovery.complete(id)});
 this.crewDiscovery=new CrewDiscovery({registry:this.crew?[...this.crew.records.values()].map(r=>r.definition):[],storage,blocked:()=>this.pause.paused||!!document.querySelector('dialog[open]'),onDiscover:(definition,position)=>{this.compass.syncTargets();return this.crewModal.open(definition,position);},onTow:d=>{const r=this.crew.records.get(d.id);return this.rescue.start({id:d.id,name:d.name,model:r.model,height:r.height,radius:r.radius});},onRescued:()=>this.crew?.sync(),onReset:()=>{this.rescue.reset();this.crew?.sync();}});
 this.crew?.initialize(this,this.crewDiscovery);this.compass.connectCrew(this.crewDiscovery);this.crewModal=new CrewDiscoveryModal(this);

 if(new URLSearchParams(location.search).has('discoveryDebug'))this.discovery.debug={snapshot:()=>this.discovery.snapshot(),reset:async()=>{this.unlocks.reset();await this.vehicles.select(defaultVehicleId);this.discovery.sync();this.vehicleSelector.updateHUD();}};
 this.gup.update(0,this.sub);this.chase.update(0,this.sub,this.input);await this.renderer.compileAsync(scene,this.camera);await warmNearbyScenery(this);this.renderScene();this.needsPausedRender=false;this.ready=true;onProgress(++completed/startupTasks);let previous=performance.now(),time=0;this.renderer.setAnimationLoop(now=>{if(performanceDisplay.enabled)performanceDisplay.frame(now,!document.hidden&&!this.graphicsRecovering&&!this.pause.paused&&!document.querySelector('dialog[open]'),this);const elapsed=Math.max(0,(now-previous)/1000),dt=Math.min(elapsed,.05);this.wordHunt.display.update(Math.max(0,(now-previous)/1000));previous=now;if(document.hidden||this.graphicsRecovering)return;if(this.dayNight.update(elapsed,!this.pause.paused))this.needsPausedRender=true;this.discoveryModal.update();this.vehicleTransformation.update(dt);if(this.pause.paused){const water=this.atmosphere.propulsion;if((this.discoveryModal?.dialog.open||this.marineCollection?.dialog.open||this.crewModal?.dialog.open)&&water.celebrationLeft>0){water.update(dt,time+1.8-water.celebrationLeft,this.sub,this.gup.group,this.camera,this.renderer.getPixelRatio(),true);this.needsPausedRender=true;}if(this.needsPausedRender){this.renderScene();this.needsPausedRender=false;}return;}this.metrics.beginFrame();time+=dt;const controls=this.input.read();this.sub.update(dt,controls);this.rescue.update(dt,!document.querySelector('dialog[open]'));this.marineAnimals.update(dt,this.sub.position);if((this.marineDiscovery.records.size>0&&this.marineDiscovery.update(this.sub.position))||this.discovery.update(this.sub,dt)||this.crewDiscovery.update(this.sub)||(!document.querySelector('dialog[open]')&&this.unlocks.checkFinal(this.sub.position))){this.gup.update(0,this.sub);this.needsPausedRender=true;return;}this.collisionDebug?.update(this.sub);this.audio.playCollision(this.sub.collisionContact);this.audio.update(dt,this.sub,controls);this.wordHunt.update(dt,this.sub);this.pickups.update(dt,this.sub.position,this.sub.turbo);this.gup.update(dt,this.sub);this.compass.update(dt,this.gup.group);this.turboEffects.update(dt,this.sub.turbo.active);const turbo=this.sub.turbo;if(this.boosting!==turbo.active){this.boosting=turbo.active;document.body.classList.toggle("boosting",turbo.active);}this.turboMeter.update(turbo.charge);this.chase.update(dt,this.sub,this.input);this.interactions.update(dt,this.sub,this.sub.collisionContact,this.camera);this.terrain.update(time,this.sub.position);this.decor.update(time,this.sub.position,this.camera);this.habitat?.update(time,this.sub.position,this.camera);this.atmosphere.update(time,dt,this.sub,this.gup.group,this.camera,this.renderer.getPixelRatio());this.fish.update(dt,time,this.sub,this.camera);this.crew?.update(dt,this.camera);this.metrics.beginRender();this.renderScene(dt,true);this.metrics.endRender();this.metrics.update(now,profile,this.quality,scene);});addEventListener('visibilitychange',()=>{previous=performance.now();});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.graphicsRecovering=true;this.releaseGraphicsPause??=this.pause.acquire('graphics');vehicleImages.resetUploads(this.renderer);const status=document.querySelector('#status');status.hidden=false;status.textContent='Restoring your ocean adventure...';status.style.pointerEvents='none';});canvas.addEventListener('webglcontextrestored',()=>this.restoreGraphics());}
 renderScene(dt=0,atmosphereCurrent=false){if(!atmosphereCurrent)this.atmosphere.refresh(this.sub,this.camera);this.headlights.update(this.gup.group,this.gup.definition,this.dayNight.headlight);this.gup.applyImpactShake(this.chase.shake);this.rescueNavigation?.prepare(this.camera,dt);this.renderer.render(this.scene,this.camera);}
 async prepareVehicle(vehicle){
  try{await prepareVehicleTextures(vehicle,this.renderer);await this.renderer.compileAsync(vehicle.group,this.camera,this.scene);this.discovery?.prepared(vehicle);}
  catch(error){releaseVehicleGPU(vehicle);const record=this.discovery?.records.get(vehicle.definition.id);if(record){record.evicted=true;vehicle.group.visible=false;}throw error;}
 }
 async restoreGraphics(){
  if(this.restoringGraphics)return;this.restoringGraphics=true;const status=document.querySelector('#status');
  try{
   // Hidden grace-period vehicles lost their GPU data too; prepare them on return.
   for(const r of this.discovery.records.values())if(r.vehicle&&r.parked&&!r.vehicle.group.visible)r.evicted=true;
   const visible=new Set([this.gup,...[...this.discovery.records.values()].filter(r=>r.vehicle&&r.vehicle.group.visible).map(r=>r.vehicle)]);for(const vehicle of visible)await prepareVehicleTextures(vehicle,this.renderer);await this.renderer.compileAsync(this.scene,this.camera);this.graphicsRecovering=false;this.needsPausedRender=true;status.hidden=true;status.style.pointerEvents='';status.replaceChildren();this.releaseGraphicsPause?.();this.releaseGraphicsPause=null;}
  catch(error){status.hidden=false;status.textContent='Graphics paused. ';status.style.pointerEvents='auto';const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.style.cssText='width:auto;height:auto;padding:12px 18px;font-size:16px;margin-left:12px';retry.onclick=()=>this.restoreGraphics();status.append(retry);console.warn('Graphics recovery unavailable',error);}
  finally{this.restoringGraphics=false;}
 }
 onPauseChanged(paused){
  const now=performance.now()/1000;
  if(paused){this.pauseStarted=now;this.chase?.clearShake();}
  else if(this.input?.orbit.last>=0)this.input.orbit.last+=now-(this.pauseStarted??now);
  this.input?.clear();this.audio?.setPaused(paused);this.needsPausedRender=true;
  if(this.metrics){this.metrics.resolution.reset();this.metrics.previous=null;this.metrics.samples=[];this.metrics.cpu=[];this.metrics.gpu=[];}
 }
 configureVehicle(vehicle,id){this.chase.clearShake();const definition=vehicleById(id);vehicle.definition=definition;this.sub.collisionProxy=definition.collision;this.sub.turbo.stop();this.sub.selectVehicle(id,definition.movement,definition);this.sub.exhaust=definition.exhaust;this.turboEffects.intensity=definition.ground?.turboVisual??1;this.sub.turbo.setInfinite(this.wordHunt?.progress.infiniteTurbo??false);this.turboMeter.update(this.sub.turbo.charge);this.chase.profile=definition.camera;this.audio.setVehicle(definition.audio);this.sub.towAttachment=definition.towing?.attachment;this.rescue?.rebind();vehicle.update(0,this.sub);}
 installVehicle(next,previous,id){
  const pose=this.discovery?.safeSwitch(id,this.sub);if(pose){Object.assign(this.sub.position,{x:pose.x,y:pose.y,z:pose.z});this.sub.heading=pose.heading;this.sub.speed=this.sub.vertical=0;this.sub.collisionDrift.x=this.sub.collisionDrift.z=0;this.input.clear();}
  next.update(0,this.sub);this.scene.remove(previous.group);this.gup=next;this.scene.add(next.group);next.group.add(this.turboEffects.group);this.configureVehicle(next,id);
  this.discovery?.switched(id);if(!this.vehicleTransformation?.active)this.chase.initial=true;this.chase.update(0,this.sub,this.input);if(!this.discovery?.records.has(previous.definition.id))releaseVehicleGPU(previous);this.needsPausedRender=true;
  // The transformation renders on the next covered frame; menus upload before resuming.
  if(!this.vehicleTransformation?.active){this.renderScene();this.needsPausedRender=false;}
 }

}
