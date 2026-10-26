import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {rescueConfig} from '../config/rescueConfig.js';
import {headingDegrees} from '../navigation/navigationMath.js';
import {rescueNavigationState,smoothRescueBearing,positionRescueArrow} from '../navigation/rescueNavigation.js';

function fallbackArrow(){
 const shape=new T.Shape();[[-.28,-.72],[.28,-.72],[.28,.08],[.7,.08],[0,.92],[-.7,.08],[-.28,.08]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const geometry=new T.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:2,steps:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,-.12,0);
 return new T.Mesh(geometry,[new T.MeshStandardMaterial({color:0x20e3d4,emissive:0x006f76,emissiveIntensity:.2,roughness:.35}),new T.MeshStandardMaterial({color:0x086577,roughness:.4})]);
}
export class RescueNavigation{
 static async create(root,scene,onChange=()=>{}){
  let arrow;try{arrow=(await new GLTFLoader().loadAsync(new URL('../../assets/models/rescue-arrow.glb',import.meta.url).href)).scene;}catch(error){console.warn('Rescue arrow unavailable; using lightweight geometry',error);arrow=fallbackArrow();}
  return new RescueNavigation(root,arrow,scene,rescueConfig.navigation,onChange);
 }
 constructor(root,arrow,scene,config=rescueConfig.navigation,onChange=()=>{}){
  this.root=root;this.scene=scene;this.config=config;this.onChange=onChange;this.presentationReady=false;this.presentationLift=0;this.active=null;this.angle=null;this.lastDistance=null;this.lastRelative=null;this.lastBearing=null;this.vehicle=null;this.ready=false;this.disposed=false;
  this.state={};this.position={offsetX:0,offsetZ:0,x:0,y:0,z:0};
  this.section=document.createElement('section');this.section.id='rescueHud';this.section.setAttribute('aria-hidden','true');this.section.inert=true;
  this.section.innerHTML='<div class="rescue-content"><p class="rescue-caption" role="status"></p><p class="rescue-distance" aria-label="Distance to Octopod"></p></div>';
  root.append(this.section);this.caption=this.section.querySelector('.rescue-caption');this.distance=this.section.querySelector('.rescue-distance');
  const bounds=new T.Box3().setFromObject(arrow);this.boundsCenter=bounds.getCenter(new T.Vector3());this.boundsHalf=bounds.getSize(new T.Vector3()).multiplyScalar(.5);
  this.presentation=new T.Group();this.presentation.name='Rescue arrow readability tilt';this.presentation.add(arrow);
  this.pivot=new T.Group();this.pivot.name='Rescue direction arrow';this.pivot.visible=false;this.pivot.add(this.presentation);scene.add(this.pivot);
 }
 setMission(mission){
  if(this.disposed||this.active===mission)return;this.active=mission;this.angle=null;this.lastDistance=null;this.lastRelative=null;this.lastBearing=null;this.ready=false;this.presentationReady=false;this.presentationLift=0;this.vehicle=null;this.pivot.visible=false;
  this.root.classList.toggle('has-rescue',!!mission);clearTimeout(this.layoutTimer);
  if(mission)document.body.classList.add('rescue-navigation-active');else this.layoutTimer=setTimeout(()=>document.body.classList.remove('rescue-navigation-active'),matchMedia('(prefers-reduced-motion:reduce)').matches?0:240);this.section.setAttribute('aria-hidden',String(!mission));this.section.inert=!mission;
  if(mission)this.caption.textContent=mission.name+' - Return to Octopod';this.onChange();
 }
 update(dt,mission,sub,target){
  if(this.disposed)return;this.setMission(mission);if(!mission)return;
  const vehicle=sub.definition??sub.vehicleId??sub.collisionProxy,reset=!this.ready||this.vehicle!==vehicle;
  if(reset){this.presentationReady=false;this.presentationLift=0;}
  positionRescueArrow(this.position,sub,this.config,dt,reset);this.pivot.position.set(this.position.x,this.position.y,this.position.z);this.pivot.scale.setScalar(this.config.scale);
  // The GLB and fallback tip are local -Z. Their absolute world bearing comes
  // from the rendered arrow, not from vehicle heading or the chase camera.
  const dx=target.x-this.position.x,dz=target.z-this.position.z;
  const bearing=dx*dx+dz*dz>1e-10?headingDegrees(dx,dz):(this.angle??0);
  this.angle=smoothRescueBearing(reset?null:this.angle,bearing,dt,this.config.rotationSmoothing);this.pivot.rotation.set(0,-this.angle*Math.PI/180,0);
  this.vehicle=vehicle;this.ready=true;this.pivot.visible=true;if(reset)this.onChange();
  const state=rescueNavigationState(sub.position,sub.heading,target,this.state),distance=Math.round(state.distance);
  if(distance!==this.lastDistance){this.distance.textContent=distance+' m';this.section.dataset.distance=String(distance);this.lastDistance=distance;}
  if(state.relative!==this.lastRelative){this.section.dataset.relative=String(state.relative);this.lastRelative=state.relative;}
  if(bearing!==this.lastBearing){this.section.dataset.bearing=String(bearing);this.lastBearing=bearing;}
 }
 // Read-only camera position supplies a stable world-up presentation reference.
 // Rx * Rz leaves local -Z's horizontal projection unchanged: the navigation
 // yaw remains truthful even though the broad cyan face is no longer edge-on.
 prepare(camera,dt=0){
  if(this.disposed||!this.active||!this.ready)return;
  const yaw=this.pivot.rotation.y,co=Math.cos(yaw),si=Math.sin(yaw),dx=camera.position.x-this.position.x,dz=camera.position.z-this.position.z;
  const x=co*dx-si*dz,z=si*dx+co*dz,y=camera.position.y-this.position.y-this.presentationLift,horizontal=Math.hypot(x,z);
  const limit=Math.max(0,Math.min(80,this.config.presentationTilt))*Math.PI/180,tilt=Math.min(limit,Math.atan2(horizontal,y));
  const horizontalScale=horizontal>1e-10?Math.sin(tilt)/horizontal:0,nx=x*horizontalScale,nz=z*horizontalScale,ny=Math.cos(tilt);
  const pitch=Math.atan2(nz,ny),roll=-Math.asin(Math.max(-1,Math.min(1,nx))),f=this.presentationReady?1-Math.exp(-Math.max(0,this.config.presentationSmoothing)*Math.max(0,dt)):1;
  const rotation=this.presentation.rotation;rotation.set(rotation.x+(pitch-rotation.x)*f,0,rotation.z+(roll-rotation.z)*f,'XZY');this.presentationReady=true;
  // Conservative support of the cached GLB box after Rx * Rz; no vertex scan or
  // new Box3/vector in the frame loop. Lift the mesh, not the navigation bearing.
  const cp=Math.cos(rotation.x),sp=Math.sin(rotation.x),sr=Math.sin(rotation.z),cr=Math.cos(rotation.z),a=cp*sr,b=cp*cr,c=-sp,center=this.boundsCenter,half=this.boundsHalf;
  const bottom=(a*center.x+b*center.y+c*center.z-Math.abs(a)*half.x-Math.abs(b)*half.y-Math.abs(c)*half.z)*this.config.scale;
  this.presentationLift=Math.max(0,-bottom);this.pivot.position.y=this.position.y+this.presentationLift;
 }
 dispose(){
  if(this.disposed)return;this.setMission(null);clearTimeout(this.layoutTimer);document.body.classList.remove('rescue-navigation-active');const geometries=new Set(),materials=new Set();this.pivot.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const material of [].concat(o.material))materials.add(material);}});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();this.pivot.removeFromParent();this.pivot.clear();this.section.remove();this.disposed=true;this.onChange();
 }
}
