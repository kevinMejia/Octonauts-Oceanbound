import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {rescueNavigationState,smoothRescueBearing} from '../navigation/rescueNavigation.js';

function fallbackArrow(){
 const shape=new T.Shape();[[-.28,-.72],[.28,-.72],[.28,.08],[.7,.08],[0,.92],[-.7,.08],[-.28,.08]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const geometry=new T.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:2,steps:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,-.12,0);
 return new T.Mesh(geometry,[new T.MeshStandardMaterial({color:0x20e3d4,emissive:0x006f76,emissiveIntensity:.2,roughness:.35}),new T.MeshStandardMaterial({color:0x086577,roughness:.4})]);
}
export class RescueNavigation{
 static async create(root){
  let arrow;try{arrow=(await new GLTFLoader().loadAsync(new URL('../../assets/models/rescue-arrow.glb',import.meta.url).href)).scene;}catch(error){console.warn('Rescue arrow unavailable; using lightweight geometry',error);arrow=fallbackArrow();}
  return new RescueNavigation(root,arrow);
 }
 constructor(root,arrow){
  this.root=root;this.active=null;this.angle=null;this.lastDistance=null;
  this.section=document.createElement('section');this.section.id='rescueHud';this.section.setAttribute('aria-hidden','true');this.section.inert=true;
  this.section.innerHTML='<div class="rescue-content"><p class="rescue-caption" role="status"></p><div class="rescue-arrow-screen"><canvas class="rescue-arrow" aria-hidden="true"></canvas></div><p class="rescue-distance" aria-label="Distance to Octopod"></p></div>';
  root.append(this.section);this.caption=this.section.querySelector('.rescue-caption');this.distance=this.section.querySelector('.rescue-distance');this.canvas=this.section.querySelector('canvas');this.context=this.canvas.getContext('2d',{alpha:false});
  this.scene=new T.Scene();this.scene.background=new T.Color('#07525f');this.scene.add(new T.HemisphereLight(0xd6ffff,0x013341,1.6));const light=new T.DirectionalLight(0xffffff,1.8);light.position.set(-2,4,3);this.scene.add(light);
  this.pivot=new T.Group();this.pivot.scale.setScalar(1.2);this.pivot.add(arrow);this.scene.add(this.pivot);
  this.camera=new T.OrthographicCamera(-1.5,1.5,.95,-.95,.1,20);this.camera.position.set(0,4,5);this.camera.lookAt(0,0,0);
  this.viewport=new T.Vector4();this.scissor=new T.Vector4();this.drawingSize=new T.Vector2();
 }
 setMission(mission){
  if(this.active?.id===mission?.id)return;this.active=mission;this.angle=null;this.lastDistance=null;
  this.root.classList.toggle('has-rescue',!!mission);clearTimeout(this.layoutTimer);
  if(mission)document.body.classList.add('rescue-navigation-active');else this.layoutTimer=setTimeout(()=>document.body.classList.remove('rescue-navigation-active'),matchMedia('(prefers-reduced-motion:reduce)').matches?0:240);this.section.setAttribute('aria-hidden',String(!mission));this.section.inert=!mission;
  if(mission)this.caption.textContent=mission.name+' - Return to Octopod';
 }
 update(dt,mission,sub,target){
  this.setMission(mission);if(!mission)return;
  const state=rescueNavigationState(sub.position,sub.heading,target);this.angle=smoothRescueBearing(this.angle,state.relative,dt);this.pivot.rotation.y=-this.angle*Math.PI/180;
  const distance=Math.round(state.distance);if(distance!==this.lastDistance){this.distance.textContent=distance+' m';this.lastDistance=distance;}
  this.section.dataset.relative=String(state.relative);this.section.dataset.distance=String(distance);
 }
 render(renderer){
  if(!this.active||!this.context||document.body.classList.contains('starting'))return;
  const rect=this.canvas.getBoundingClientRect(),clip=this.section.getBoundingClientRect(),ratio=renderer.getPixelRatio();
  const left=Math.max(0,rect.left,clip.left),right=Math.min(innerWidth,rect.right,clip.right),top=Math.max(0,rect.top,clip.top),bottom=Math.min(innerHeight,rect.bottom,clip.bottom);
  if(rect.width<=0||rect.height<=0||right<=left||bottom<=top)return;
  const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  const aspect=rect.width/rect.height;this.camera.left=-.95*aspect;this.camera.right=.95*aspect;this.camera.updateProjectionMatrix();
  renderer.getViewport(this.viewport);renderer.getScissor(this.scissor);const scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear,autoReset=renderer.info.autoReset;
  try{
   renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(left,innerHeight-bottom,right-left,bottom-top);renderer.setScissorTest(true);renderer.autoClear=true;renderer.info.autoReset=false;
   renderer.render(this.scene,this.camera);
   // Copy a tiny GPU canvas region into the DOM HUD; no second WebGL renderer,
   // render target allocation, or CPU pixel-array readback is needed.
   this.context.drawImage(renderer.domElement,Math.round(rect.left*ratio),Math.round(rect.top*ratio),width,height,0,0,width,height);
  }finally{renderer.setViewport(this.viewport);renderer.setScissor(this.scissor);renderer.setScissorTest(scissorTest);renderer.autoClear=autoClear;renderer.info.autoReset=autoReset;}
 }
 dispose(){
  this.setMission(null);clearTimeout(this.layoutTimer);document.body.classList.remove('rescue-navigation-active');const geometries=new Set(),materials=new Set();this.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const material of [].concat(o.material))materials.add(material);}});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();this.pivot.clear();this.scene.clear();this.section.remove();this.canvas.width=this.canvas.height=0;this.context=null;
 }
}
