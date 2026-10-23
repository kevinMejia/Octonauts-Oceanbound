import {preloadVehicles} from '../vehicles/preloadVehicles.js';
import {PauseState} from './PauseState.js';
import {VehicleFleet} from '../vehicles/VehicleFleet.js';
import {loadVehicle,releaseVehicleGPU} from '../vehicles/VehicleManager.js';
import {vehicleById,defaultVehicleId} from '../config/vehicleConfig.js';
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
import {environmentConfig,renderingProfile} from '../config/environmentConfig.js';
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
 async start({onProgress=()=>{}}={}){const task=async(promise)=>{const result=await promise;onProgress(++completed/11);return result;};let completed=0;this.pause=new PauseState(paused=>this.onPauseChanged(paused));this.audio=new AudioManager({requirePlay:true});this.releaseStartup=this.pause.acquire('startup');const canvas=document.querySelector('canvas');this.quality=renderingProfile();const profile=this.profile=environmentConfig.profiles[this.quality];this.renderer=new T.WebGLRenderer({canvas,antialias:!matchMedia('(any-pointer:coarse)').matches,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,profile.pixelRatio));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;const scene=this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(cameraConfig.fov,1,.1,650);const resize=()=>{this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.needsPausedRender=true;};addEventListener('resize',resize);resize();this.terrain=new OceanTerrain(scene,profile);this.renderer.shadowMap.enabled=this.quality==='high';this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.atmosphere=atmosphere(scene,profile,this.renderer);this.decor=new OceanDecorations();this.habitat=habitatEnabled()?new ReefHabitat():null;const [gup,,pickups,,octopod]=await Promise.all([task(GupB.load()),task(this.decor.load(scene,profile)),task(TurboPickups.load(scene)),task(this.habitat?.load(scene,profile)),task(Octopod.load(scene))]);this.octopod=octopod;this.crew=await task(OctopodCrew.load(octopod));this.decor.layout.rocks.push(...(octopod?.colliders??[]).filter(c=>c.y<10).map(c=>({x:c.x,z:c.z,radius:Math.max(c.rx,c.rz)})));this.decor.layout.rocks.push(...(this.habitat?.colliders??[]).map(c=>({x:c.x,z:c.z,radius:Math.max(c.rx,c.rz)})));this.decor.createOcclusion();this.terrain.setOcclusion(this.decor.occlusion);this.interactions=await task(EnvironmentalInteractions.create(scene,this.quality,this.habitat,this.decor));this.atmosphere.propulsion.setVents(this.interactions.surfaces,this.decor);this.fish=new ReefFish(scene,this.quality==='low',this.interactions.surfaces);this.pickups=pickups;this.turboEffects=new TurboEffects(gup.group);this.gup=gup;scene.add(gup.group);this.sub=new SubmarineController();if(octopodConfig.enabled){const spawn=octopodConfig.spawn;Object.assign(this.sub.position,{x:spawn.x,y:spawn.y,z:spawn.z});this.sub.heading=spawn.heading;}this.compass=new Compass();this.input=new Input(canvas);this.turboMeter=new TurboMeter(document.querySelector("#turboCharge"));this.chase=new ChaseCamera(this.camera,new CameraObstacles(this.interactions.surfaces,octopod?.colliders));this.chase.inspect=new URLSearchParams(location.search).has('inspect');document.querySelector('#status').hidden=true;this.metrics=new RenderMetrics(this.renderer);this.configureVehicle(gup,defaultVehicleId);this.vehicles=new VehicleFleet({initialId:defaultVehicleId,initialVehicle:gup,load:loadVehicle,prepare:next=>this.renderer.compileAsync(next.group,this.camera,this.scene),install:(next,previous,id)=>this.installVehicle(next,previous,id)});this.vehicleSelector=new VehicleSelector(this);onProgress(++completed/11);
 await preloadVehicles(this.vehicles,{onProgress:event=>{if(event.status!=='loading'){onProgress(++completed/11);if(event.error)console.warn('Optional vehicle unavailable',event.id,event.error);}}});
 this.gup.update(0,this.sub);this.chase.update(0,this.sub,this.input);await this.renderer.compileAsync(scene,this.camera);this.renderer.render(scene,this.camera);this.needsPausedRender=false;this.ready=true;onProgress(++completed/11);let previous=performance.now(),time=0;this.renderer.setAnimationLoop(now=>{const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;if(this.pause.paused){if(this.needsPausedRender){this.renderer.render(scene,this.camera);this.needsPausedRender=false;}return;}this.metrics.beginFrame();time+=dt;const controls=this.input.read();this.sub.update(dt,controls);this.habitat?.collide(this.sub);this.decor.collide(this.sub);this.octopod?.collide(this.sub);this.audio.update(dt,this.sub,controls);this.pickups.update(dt,this.sub.position,this.sub.turbo);this.gup.update(dt,this.sub);this.compass.update(dt,this.gup.group);this.turboEffects.update(dt,this.sub.turbo.active);const turbo=this.sub.turbo;document.body.classList.toggle("boosting",turbo.active);this.turboMeter.update(turbo.charge);this.chase.update(dt,this.sub,this.input);this.interactions.update(dt,this.sub,this.habitat?.contact,this.camera);this.terrain.update(time,this.sub.position);this.decor.update(time,this.sub.position,this.camera);this.habitat?.update(time,this.sub.position,this.camera);this.atmosphere.update(time,dt,this.sub,this.gup.group,this.camera,this.renderer.getPixelRatio());this.fish.update(dt,time,this.sub,this.camera);this.crew?.update(dt,this.camera);this.metrics.beginRender();this.renderer.render(scene,this.camera);this.metrics.endRender();this.metrics.update(now,profile,this.quality,scene);});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#status').hidden=false;document.querySelector('#status').textContent='Graphics interrupted. Reload to continue your dive.';});}
 onPauseChanged(paused){
  const now=performance.now()/1000;
  if(paused)this.pauseStarted=now;
  else if(this.input?.orbit.last>=0)this.input.orbit.last+=now-(this.pauseStarted??now);
  this.input?.clear();this.audio?.setPaused(paused);this.needsPausedRender=true;
  if(this.metrics){this.metrics.previous=null;this.metrics.samples=[];this.metrics.cpu=[];this.metrics.gpu=[];}
 }
 configureVehicle(vehicle,id){const definition=vehicleById(id);vehicle.definition=definition;this.sub.collisionProxy=definition.collision;this.chase.profile=definition.camera;this.audio.setVehicle(definition.audio);}
 installVehicle(next,previous,id){
  next.update(0,this.sub);this.scene.remove(previous.group);this.gup=next;this.scene.add(next.group);next.group.add(this.turboEffects.group);this.configureVehicle(next,id);
  releaseVehicleGPU(previous);this.needsPausedRender=true;
  // Upload the replacement behind the paused/blurred menu before resuming.
  this.renderer.render(this.scene,this.camera);this.needsPausedRender=false;
 }

}
