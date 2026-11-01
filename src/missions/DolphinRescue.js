import * as T from 'three';
import {dolphinRescueConfig as config} from '../config/dolphinRescueConfig.js';
import {octopodConfig} from '../config/octopodConfig.js';
import {vehicleById} from '../config/vehicleConfig.js';
import {collisionConfig} from '../config/collisionConfig.js';
import {createAnimalVisual} from '../marine/AnimalVisual.js';
import {SubmarineController} from '../vehicles/SubmarineController.js';
import {InteractionSurfaces} from '../effects/InteractionSurfaces.js';
import {CollisionWorld} from '../collision/CollisionWorld.js';
import {CameraObstacles} from '../camera/CameraObstacles.js';
import {focusGameplay} from '../ui/focusGameplay.js';
import {DolphinBay} from './DolphinBay.js';
import {DolphinRescueState,pushDebris,clamp} from './dolphinRescueMath.js';
const missionGround=()=>0;
const symbol='<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M6 29C16 11 31 10 44 19L57 19 51 24 60 27 47 29C40 37 29 36 24 32L16 42 18 30 6 29ZM30 15 27 4 39 15ZM8 28 1 18 2 32 9 33Z" fill="currentColor"/><path d="M42 22h2" stroke="#074c64" stroke-width="3" stroke-linecap="round"/></svg>';
// Registered mission owns its transient scene and controller, never exploration saves.
export class DolphinRescue{
 constructor(game){
  this.game=game;this.id=config.id;this.active=false;this.busy=false;this.projected=new T.Vector3();this.anchor=new T.Vector3().fromArray(config.entry.offset).add(new T.Vector3(octopodConfig.position.x,octopodConfig.position.y,octopodConfig.position.z));
  this.marker=document.createElement('button');this.marker.id='dolphinRescueEntry';this.marker.type='button';this.marker.hidden=true;this.marker.setAttribute('aria-label','Dolphin Rescue mission near the Octopod');this.marker.innerHTML=symbol+'<span>Dolphin Rescue</span>';document.body.append(this.marker);this.marker.onclick=()=>this.openBriefing();
  this.hud=document.createElement('section');this.hud.id='dolphinRescueHud';this.hud.hidden=true;this.hud.setAttribute('aria-label','Dolphin Rescue mission');this.hud.innerHTML='<div class="dolphin-heading"><b>DOLPHIN RESCUE</b><button type="button" id="dolphinExit">Exit</button></div><div class="dolphin-safety"><span class="dolphin-icons" aria-label="Three dolphins">'+symbol.repeat(3)+'</span><span id="dolphinSafety">All three swimming safely</span><b id="dolphinStrikes">0/3</b></div><progress id="dolphinProgress" max="100" value="0" aria-label="Mission progress"></progress><p id="dolphinObjective" role="status" aria-live="polite"></p>';document.body.append(this.hud);this.hud.querySelector('#dolphinExit').onclick=()=>this.openExit();this.progress=this.hud.querySelector('progress');this.objective=this.hud.querySelector('#dolphinObjective');this.strikes=this.hud.querySelector('#dolphinStrikes');this.safety=this.hud.querySelector('#dolphinSafety');
  this.dialog=document.createElement('dialog');this.dialog.id='dolphinRescueDialog';this.dialog.setAttribute('aria-labelledby','dolphinMissionTitle');this.dialog.innerHTML='<div class="dolphin-dialog-emblem">'+symbol+'</div><p class="dolphin-eyebrow">OCTONAUTS • KWAZII’S MISSION</p><h2 id="dolphinMissionTitle">Dolphin Rescue</h2><p id="dolphinMissionDescription"></p><p id="dolphinMissionHint"></p><div class="dolphin-dialog-actions"><button id="dolphinLaunch" type="button">Launch mission</button><button id="dolphinReturn" type="button">Back to ocean</button></div>';document.body.append(this.dialog);this.title=this.dialog.querySelector('h2');this.description=this.dialog.querySelector('#dolphinMissionDescription');this.hint=this.dialog.querySelector('#dolphinMissionHint');this.launchButton=this.dialog.querySelector('#dolphinLaunch');this.returnButton=this.dialog.querySelector('#dolphinReturn');this.launchButton.onclick=()=>this.active?this.restart():this.launch();this.returnButton.onclick=()=>this.active?this.leave():this.closeDialog();this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.active&&this.state.status!=='running')this.leave();else this.closeDialog();});this.dialog.addEventListener('close',()=>{this.release?.();this.release=null;this.game.input.clear();focusGameplay();});
 }
 updateEntry(){
  const g=this.game,p=g.sub.position,eye=g.camera.position;this.marker.hidden=this.active||this.busy||g.pause.paused||!!document.querySelector('dialog[open]')||Math.hypot(p.x-this.anchor.x,p.z-this.anchor.z)>config.entry.maxDistance;
  if(this.marker.hidden)return;this.projected.copy(this.anchor).project(g.camera);const visible=this.projected.z>-1&&this.projected.z<1&&Math.abs(this.projected.x)<.91&&Math.abs(this.projected.y)<.85;
  this.marker.hidden=!visible;if(visible){const rect=g.renderer.domElement.getBoundingClientRect();this.marker.style.left=rect.left+(this.projected.x*.5+.5)*rect.width+'px';this.marker.style.top=rect.top+(-this.projected.y*.5+.5)*rect.height+'px';}
 }
 showDialog(title,description,hint,launch,back){this.title.textContent=title;this.description.textContent=description;this.hint.textContent=hint;this.launchButton.textContent=launch;this.returnButton.textContent=back;this.launchButton.hidden=false;if(!this.dialog.open){this.release=this.game.pause.acquire(config.id);this.dialog.showModal();}this.game.audio?.playWindow?.(true);}
 closeDialog(){if(this.busy)return;this.dialog.close();}
 openBriefing(){if(this.active||this.busy)return;this.launchButton.onclick=()=>this.launch();this.showDialog(config.name,'Protect the dolphins! Clear the path ahead.','Three spinner dolphins are swimming in their sleep. Pilot the GUP-B and push drifting litter to either side. A gentle current carries everyone forward. Two bumps are allowed; a third ends the mission. About 2½ minutes. Use your usual steering, forward/reverse and depth controls.','Launch mission','Back to ocean');}
 openExit(){if(!this.active||this.busy)return;this.showDialog('Return to the Octopod?','Your ocean adventure will be waiting exactly where you left it.','The mission pauses while this window is open.','Keep swimming','Return to Octopod');this.launchButton.onclick=()=>this.closeDialog();}
 async launch(){
  if(this.busy||this.active)return;this.busy=true;this.launchButton.disabled=true;this.description.textContent='Preparing the polluted bay…';const g=this.game;
  try{
   const vehicle=await g.vehicles.get('gup-b');await g.prepareVehicle(vehicle);vehicle.definition=vehicleById('gup-b');
   this.bay=new DolphinBay(g);this.state=new DolphinRescueState();this.visuals=await Promise.all(this.state.dolphins.map(()=>createAnimalVisual({scale:config.escort.scale,visual:{type:'dolphin'}})));
   // The shared dolphin geometry gets closed eyelids and spinner markings only here.
   for(const [i,v] of this.visuals.entries()){
    v.group.name='Sleeping spinner dolphin '+(i+1);const lid=new T.MeshStandardMaterial({color:0x294e62,roughness:.8});v.lidMaterial=lid;
    for(const sign of [-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.14,8,5),lid);eye.position.set(sign*.43,.25,1.85);eye.scale.set(1,.12,.7);v.group.add(eye);}
    // Cover the procedural open eye pair with skin-colored sleepy lids.
    for(const mesh of v.group.children){if(mesh.isMesh&&[0xf2ffff,0x102a38].includes(mesh.material?.color?.getHex())&&mesh.position.z>1.5){mesh.scale.y*=.12;}}
    this.bay.group.add(v.group);
   }
   const shared=new Set([g.headlights.light,g.headlights.target]);for(const value of Object.values(g.atmosphere)){if(value?.isObject3D)shared.add(value);else for(const key of ['points','mesh','group'])if(value?.[key]?.isObject3D)shared.add(value[key]);}
   this.saved={sub:g.sub,gup:g.gup,vehicle,parent:vehicle.group.parent,position:vehicle.group.position.clone(),quaternion:vehicle.group.quaternion.clone(),visible:vehicle.group.visible,scene:g.scene.children.map(o=>[o,o.visible]),ground:g.chase.ground,profile:g.chase.profile,obstacles:g.chase.obstacles,orbit:{...g.input.orbit},vents:g.atmosphere.propulsion.vents,nearVents:g.atmosphere.propulsion.nearVents,nextVentCheck:g.atmosphere.propulsion.nextVentCheck,turboVisible:g.turboEffects.group.visible};
   for(const [o] of this.saved.scene)if(!shared.has(o))o.visible=false;
   g.scene.add(this.bay.group);this.bay.group.add(vehicle.group);vehicle.group.visible=true;g.turboEffects.group.visible=false;g.sub=new SubmarineController();g.sub.ground=missionGround;g.sub.collisionProxy=vehicle.definition.collision;g.sub.selectVehicle('gup-b',{...vehicle.definition.movement,maxSpeed:6,cruisingSpeed:4},vehicle.definition);g.sub.exhaust=vehicle.definition.exhaust;g.sub.turbo.setInfinite(false);g.gup=vehicle;g.audio.setVehicle(vehicle.definition.audio);
   this.surfaces=new InteractionSurfaces(null,{layout:{records:[]}},{});this.collisionWorld=new CollisionWorld(this.surfaces,missionGround);g.sub.collisionWorld=this.collisionWorld;this.collisionWorld.onImpact=contact=>{if(contact.obstacle?.debris){if(pushDebris(contact.obstacle.debris,contact,this.state.time)){g.chase.shake.impact(contact);this.syncObstacle(contact.obstacle.debris);}}};
   this.obstacleMeshes=this.state.obstacles.map(()=>{const mesh=this.bay.obstacle('box');mesh.visible=false;this.bay.group.add(mesh);return mesh;});this.proxies=this.state.obstacles.map(o=>({debris:o,x:0,y:0,z:0,rx:1,ry:1,rz:1,radius:1,angle:0,co:1,si:0,solid:false,surface:'rock',color:[.6,.65,.55],registered:false}));
   // One cheap ellipsoid per bank segment protects both hull and orbit camera.
   for(let z=config.route.startZ-80;z<config.route.startZ+config.route.length-config.route.cleanDistance;z+=24)for(const side of [-1,1])this.surfaces.add({x:side*24,y:7,z,rx:10,ry:11,rz:14,surface:'rock',solid:true});
   g.chase.ground=missionGround;g.chase.obstacles=new CameraObstacles(this.surfaces,missionGround);g.chase.profile=config.camera;g.atmosphere.propulsion.vents=[];g.atmosphere.propulsion.nearVents=[];this.active=true;document.body.classList.add('dolphin-mission-active');this.marker.hidden=true;this.hud.hidden=false;this.resetPose();this.syncVisuals(0);this.closeLoadingDialog();g.needsPausedRender=true;
  }catch(error){this.active=false;document.body.classList.remove('dolphin-mission-active');this.hud.hidden=true;console.error('Dolphin Rescue unavailable',error);if(this.saved)this.restoreWorld();this.disposeMission();this.description.textContent='The mission could not load. Your ocean is safe. Please try again.';}
  finally{this.busy=false;this.launchButton.disabled=false;this.launchButton.onclick=()=>this.active?this.restart():this.launch();}
 }
 closeLoadingDialog(){this.dialog.close();}
 resetPose(){const g=this.game,s=g.sub,r=config.route;Object.assign(s.position,{x:0,y:r.depth,z:r.startZ+r.lead});Object.assign(s.previousPosition,s.position);s.heading=0;s.speed=s.vertical=s.heave=s.steer=s.pitch=s.bank=0;s.collisionDrift.x=s.collisionDrift.z=0;g.input.clear();Object.assign(g.input.orbit,{x:0,y:0,last:-100});g.chase.clearShake();g.chase.initial=true;g.gup.update(0,s);g.chase.update(0,s,g.input);}
 syncObstacle(o){const p=this.proxies[o.id],mesh=this.obstacleMeshes[o.id];mesh.visible=o.active;if(!o.active){if(p.registered){this.surfaces.grid.remove(p);this.surfaces.count--;this.surfaces.solidCount--;p.registered=false;}p.solid=false;return;}
  if(mesh.userData.generation!==o.generation){mesh.geometry=this.bay.geometries.get(o.kind);mesh.userData.generation=o.generation;mesh.scale.setScalar(o.radius/(o.kind==='tire'?1.25:o.kind==='container'?.98:o.kind==='crate'?1.1:1));}
  mesh.position.set(o.x,o.y,o.z);mesh.rotation.set(.1*Math.sin(this.state.time+o.id),o.angle,.07*Math.sin(this.state.time*.8+o.id));
  Object.assign(p,{debris:o,x:o.x,y:o.y,z:o.z,rx:o.radius,ry:o.halfHeight,rz:o.radius,radius:o.radius,solid:true});if(p.registered)this.surfaces.grid.move(p);else{this.surfaces.add(p);p.registered=true;}
 }
 syncVisuals(dt){const s=this.state;for(const o of s.obstacles)this.syncObstacle(o);for(const [i,d] of s.dolphins.entries()){const v=this.visuals[i];v.group.position.set(d.x,d.y+Math.sin(d.reaction*15)*d.reaction*.3,d.z);v.group.rotation.set(Math.sin(s.time*1.3+d.phase)*.025,Math.atan2(d.x-d.previous.x,Math.max(.01,d.z-d.previous.z))*.5,Math.sin(s.time*.8+d.phase)*.035);v.animate(s.time+d.phase,dt);}this.bay.update(this.game.sub.position.z);this.updateHud();}
 updateHud(){const s=this.state;this.progress.value=s.progress*100;this.strikes.textContent='Collisions: '+s.strikes+'/3';this.safety.textContent=s.strikes?'Three dolphins • '+(3-s.strikes)+' safety chances':'All three swimming safely';const text=s.time<s.noticeUntil?s.notice:'Push litter outside the dolphins’ path';if(this.objective.textContent!==text)this.objective.textContent=text;this.hud.dataset.strikes=s.strikes;}
 update(dt,time){
  const g=this.game,s=this.state;if(!this.active)return;g.metrics.beginFrame();
  if(s.status==='running'){
   this.state.update(dt,g.sub.position.x);for(const o of s.obstacles)this.syncObstacle(o);
   const controls=g.input.read(),sub=g.sub;
   // Reuse all GUP kinematics. The mission's current is a constant environmental
   // drift; subtract it afterward so controller collision impulses do not accrue.
   const current=config.route.speed,decay=Math.exp(-collisionConfig.driftDrag*dt);sub.collisionDrift.z+=current/decay;sub.update(dt,{...controls,boost:false});sub.collisionDrift.z-=current;
   sub.position.x=clamp(sub.position.x,-config.route.playerHalfWidth,config.route.playerHalfWidth);sub.position.y=clamp(sub.position.y,config.route.minDepth,config.route.maxDepth);sub.position.z=clamp(sub.position.z,s.z+config.route.minLead,s.z+config.route.maxLead);
   g.audio.playCollision(sub.collisionContact);g.audio.update(dt,sub,controls);g.gup.update(dt,sub);g.chase.update(dt,sub,g.input);
   if(s.status!=='running')this.finish();
  }
  this.syncVisuals(dt);g.atmosphere.update(time,dt,g.sub,g.gup.group,g.camera,g.renderer.getPixelRatio());g.metrics.beginRender();g.renderScene(dt,true);g.metrics.endRender();g.metrics.update(performance.now(),g.profile,g.quality,g.scene);
 }
 finish(){const success=this.state.status==='complete';this.game.sub.speed=0;this.game.input.clear();if(success){this.game.audio.playRescue();const p=this.state.dolphins[0];this.game.atmosphere.propulsion.discoveryBurst(p.x,p.y,p.z);}this.showDialog(success?'Mission Complete!':'Mission Failed',success?'All three dolphins are safe!':'Three bumps! Let’s try clearing the path again.',''+this.state.cleared+' obstacles cleared • '+Math.round(this.state.progress*100)+'% of the bay crossed',success?'Replay mission':'Try again','Return to Octopod');this.launchButton.onclick=()=>this.restart();}
 restart(){if(!this.active||this.busy)return;for(const o of this.state.obstacles){o.active=false;this.syncObstacle(o);}this.state.reset();this.resetPose();this.syncVisuals(0);this.dialog.close();this.game.needsPausedRender=true;}
 restoreWorld(){const g=this.game,s=this.saved;if(!s)return;g.sub=s.sub;g.gup=s.gup;if(s.parent)s.parent.add(s.vehicle.group);else s.vehicle.group.removeFromParent();s.vehicle.group.position.copy(s.position);s.vehicle.group.quaternion.copy(s.quaternion);s.vehicle.group.visible=s.visible;for(const [o,visible] of s.scene)o.visible=visible;g.chase.ground=s.ground;g.chase.profile=s.profile;g.chase.obstacles=s.obstacles;g.chase.clearShake();g.chase.initial=true;Object.assign(g.input.orbit,s.orbit);g.input.clear();g.turboEffects.group.visible=s.turboVisible;g.atmosphere.propulsion.vents=s.vents;g.atmosphere.propulsion.nearVents=s.nearVents;g.atmosphere.propulsion.nextVentCheck=s.nextVentCheck;g.audio.setVehicle(g.gup.definition.audio);g.gup.update(0,g.sub);g.chase.update(0,g.sub,g.input);g.turboMeter.update(g.sub.turbo.charge);this.saved=null;}
 disposeMission(){for(const v of this.visuals??[])v.dispose();this.visuals=null;this.bay?.dispose();this.bay=null;this.obstacleMeshes=null;this.proxies=null;}
 leave(){if(this.busy||!this.active)return;this.active=false;this.restoreWorld();this.disposeMission();document.body.classList.remove('dolphin-mission-active');this.hud.hidden=true;this.dialog.close();this.game.needsPausedRender=true;this.game.renderScene();this.updateEntry();focusGameplay();}
}
