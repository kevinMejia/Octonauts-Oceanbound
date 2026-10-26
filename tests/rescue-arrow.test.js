import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {RescueNavigation,GLTFLoader,RescueSystem} from './fixtures/loadRescueNavigation.js';
import {ChaseCamera} from './fixtures/loadChaseCamera.js';
import {rescueConfig} from '../src/config/rescueConfig.js';
import {vehicles} from '../src/config/vehicleConfig.js';
import {positionRescueArrow,rescueHullTop,rescueNavigationState,smoothRescueBearing} from '../src/navigation/rescueNavigation.js';
const config=rescueConfig.navigation;
class Element{
 constructor(){this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};this.children=[];this.dataset={};this.attributes={};this.textContent='';this.isConnected=true;}
 set innerHTML(value){this.html=value;this.caption=new Element();this.distance=new Element();}
 querySelector(selector){return selector==='.rescue-caption'?this.caption:selector==='.rescue-distance'?this.distance:null;}
 setAttribute(name,value){this.attributes[name]=value;}
 append(child){this.children.push(child);}
 remove(){this.isConnected=false;}
}
globalThis.document={body:new Element(),createElement:()=>new Element()};globalThis.matchMedia=()=>({matches:true});
const bytes=await readFile(new URL('../assets/models/rescue-arrow.glb',import.meta.url));
const {scene:asset}=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));
const mission={id:'barnacles',name:'Captain Barnacles'},target={x:200,y:20,z:-100};
const state=(definition=vehicles[0])=>({definition,vehicleId:definition.id,collisionProxy:definition.collision,position:{x:0,y:12,z:0},previousPosition:{x:0,y:12,z:0},heading:0,pitch:0,bank:0,speed:0,vertical:0,steer:0,collisionDrift:{x:0,z:0}});
const setup=(options=config,onChange=()=>{})=>{const world=new T.Scene(),root=new Element(),arrow=asset.clone(true);arrow.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=o.material.clone();}});const nav=new RescueNavigation(root,arrow,world,options,onChange);return {world,root,arrow,nav};};
const direction=nav=>new T.Vector3(0,0,-1).applyQuaternion(nav.pivot.quaternion);
const towards=(nav,t)=>new T.Vector3(t.x-nav.pivot.position.x,0,t.z-nav.pivot.position.z).normalize();
const settle=(nav,s,t=target)=>{for(let i=0;i<180;i++)nav.update(1/60,mission,s,t);};

test('production arrow is one world-scene object; original asset materials and -Z tip stay intact',()=>{
 const v=setup();assert.equal(v.nav.pivot.parent,v.world);assert.equal(v.nav.pivot.visible,false);assert.equal(v.root.children.length,1);assert.ok(!v.nav.section.html.includes('canvas'));assert.equal(v.nav.camera,undefined);
 let minZ=Infinity,tipX=0;asset.updateMatrixWorld(true);asset.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);if(p.z<minZ){minZ=p.z;tipX=p.x;}}});
 assert.ok(minZ<-.8&&Math.abs(tipX)<.1);const before=[];asset.traverse(o=>{if(o.isMesh)before.push(o.material.color.getHex());});const after=[];v.arrow.traverse(o=>{if(o.isMesh)after.push(o.material.color.getHex());});assert.deepEqual(after,before);v.nav.dispose();
});

test('all registered GUPs use heading-only ahead placement and actual oriented hull clearance',()=>{
 assert.ok(vehicles.length>=9);
 for(const definition of vehicles){const v=setup(),s=state(definition);s.heading=1.1;s.pitch=-40*Math.PI/180;s.bank=.35;v.nav.update(0,mission,s,target);
  assert.ok(Math.abs(v.nav.pivot.position.x-s.position.x-Math.sin(s.heading)*config.forwardOffset)<1e-10);
  assert.ok(Math.abs(v.nav.pivot.position.z-s.position.z-Math.cos(s.heading)*config.forwardOffset)<1e-10);
  const rotation=new T.Matrix4().makeRotationFromEuler(new T.Euler(s.pitch,s.heading,s.bank,'YXZ'));let top=-Infinity;
  const c=s.collisionProxy;for(const x of [-c.radius,c.radius])for(const y of [c.centerY-c.halfHeight,c.centerY+c.halfHeight])for(const z of [-c.halfLength,c.halfLength])top=Math.max(top,new T.Vector3(x,y,z).applyMatrix4(rotation).y);
  assert.ok(Math.abs(top-rescueHullTop(s))<1e-10,definition.id);assert.ok(Math.abs(v.nav.pivot.position.y-s.position.y-top-config.height)<1e-10);
  assert.equal(v.nav.pivot.rotation.x,0);assert.equal(v.nav.pivot.rotation.z,0);assert.ok(direction(v.nav).dot(towards(v.nav,target))>1-1e-12);v.nav.dispose();
 }
});

test('world bearing is independent of vehicle facing, and points from actual arrow origin',()=>{
 const v=setup(),s=state();for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI*8+.2]){s.heading=heading;settle(v.nav,s);assert.ok(direction(v.nav).dot(towards(v.nav,target))>.999999);assert.equal(v.nav.pivot.rotation.x,0);assert.equal(v.nav.pivot.rotation.z,0);}
 assert.equal(v.nav.distance.textContent,Math.round(Math.hypot(target.x-s.position.x,target.y-s.position.y,target.z-s.position.z))+' m');v.nav.dispose();
});

test('bearing crosses north/rear seams by the shortest path without a spin; coincident target stays stable',()=>{
 const v=setup(),s=state();v.nav.update(0,mission,s,{x:.02,y:20,z:-100});const initial=v.nav.angle;
 v.nav.update(1/60,mission,s,{x:-.02,y:20,z:-100});assert.ok(Math.abs(v.nav.angle-initial)<.1);
 v.nav.angle=179;v.nav.update(1/60,mission,s,{x:-.02,y:20,z:100});assert.ok(v.nav.angle>179&&v.nav.angle<181);
 const angle=v.nav.angle;
 v.nav.update(1/60,mission,s,{x:v.nav.pivot.position.x,y:40,z:v.nav.pivot.position.z});assert.equal(v.nav.angle,angle);v.nav.dispose();
});

test('turbo, reverse and sharp continuous turns keep marker ahead without translation lag',()=>{
 const v=setup(),s=state(vehicles.find(v=>v.id==='gup-x'));v.nav.update(0,mission,s,target);
 const objects=[v.nav.position,v.nav.state,v.nav.pivot,v.arrow],geometry=[];v.arrow.traverse(o=>{if(o.isMesh)geometry.push(o.geometry);});
 for(let i=0;i<600;i++){s.heading+=.025;s.speed=i<300?27.36:-4.8;s.position.x+=Math.sin(s.heading)*s.speed/60;s.position.z+=Math.cos(s.heading)*s.speed/60;v.nav.update(1/60,mission,s,target);
  const dx=v.nav.pivot.position.x-s.position.x,dz=v.nav.pivot.position.z-s.position.z;assert.ok(dx*Math.sin(s.heading)+dz*Math.cos(s.heading)>config.forwardOffset*.97);assert.ok(Math.hypot(dx,dz)<=config.forwardOffset+1e-10);
 }
 assert.equal(v.nav.position,objects[0]);assert.equal(v.nav.state,objects[1]);assert.equal(v.nav.pivot,objects[2]);assert.equal(v.nav.presentation.children[0],objects[3]);const after=[];v.arrow.traverse(o=>{if(o.isMesh)after.push(o.geometry);});assert.deepEqual(after,geometry);v.nav.dispose();
});

test('uneven slopes, fast vertical swim and synthetic flight retain safe gap with reduced bump motion',()=>{
 for(const definition of vehicles){const v=setup(),s=state(definition);v.nav.update(0,mission,s,target);let last=v.nav.pivot.position.y,maxIdle=0;
  for(let i=0;i<600;i++){const t=i/60;s.position.y=12+8*Math.sin(t*.8)+.08*Math.sin(t*35);s.pitch=definition.type==='ground'?.7*Math.sin(t):.3*Math.sin(t);s.bank=.2*Math.sin(t*2);v.nav.update(1/60,mission,s,target);
   assert.ok(v.nav.pivot.position.y>=s.position.y+rescueHullTop(s)+config.minClearance-1e-10,definition.id);
   if(i>10)assert.ok(Math.abs(v.nav.pivot.position.y-last)<.65,definition.id);last=v.nav.pivot.position.y;
  }
  s.pitch=s.bank=0;s.position.y=12;settle(v.nav,s);
  for(let i=0;i<240;i++){s.position.y=12+.08*Math.sin(i/60*35);v.nav.update(1/60,mission,s,target);if(i>60)maxIdle=Math.max(maxIdle,Math.abs(v.nav.pivot.position.y-(12+rescueHullTop(s)+config.height)));}
  assert.ok(maxIdle<.03,definition.id);v.nav.dispose();
 }
});

test('position/bearing smoothing is configurable and comparable at varying frame rates',()=>{
 const run=hz=>{const v=setup(),s=state();v.nav.update(0,mission,s,target);s.heading=.8;s.position.y+=1;
  for(let i=0;i<hz;i++)v.nav.update(1/hz,mission,s,target);const result={p:v.nav.pivot.position.clone(),angle:v.nav.angle};v.nav.dispose();return result;};
 const a=run(30),b=run(120);assert.ok(a.p.distanceTo(b.p)<1e-9);assert.ok(Math.abs(a.angle-b.angle)<.002);
 const v=setup({...config,positionSmoothing:0,rotationSmoothing:0,scale:2,height:3,forwardOffset:2.5}),s=state();v.nav.update(0,mission,s,target);const p=v.nav.pivot.position.clone(),angle=v.nav.angle;s.heading=1;s.position.y+=1;v.nav.update(.1,mission,s,{x:400,y:0,z:0});assert.deepEqual(v.nav.pivot.position.toArray(),p.toArray());assert.equal(v.nav.angle,angle);assert.equal(v.nav.pivot.scale.x,2);v.nav.dispose();
 assert.equal(smoothRescueBearing(20,40,0,12),20);
});

test('mission start, vehicle switch and cancellation reset placement and hide synchronously without duplicates',()=>{
 const v=setup(),s=state();v.nav.setMission(mission);assert.equal(v.nav.pivot.visible,false);v.nav.update(0,mission,s,target);assert.equal(v.nav.pivot.visible,true);
 const first=v.nav.pivot;s.definition=vehicles.find(v=>v.id==='gup-x');s.vehicleId=s.definition.id;s.collisionProxy=s.definition.collision;s.position.y=40;s.heading=2;v.nav.update(0,mission,s,target);
 assert.equal(v.nav.pivot.position.y,40+rescueHullTop(s)+config.height);assert.equal(v.nav.pivot,first);assert.equal(v.world.children.filter(x=>x===first).length,1);
 for(let i=0;i<5;i++){v.nav.setMission(null);assert.equal(v.nav.pivot.visible,false);assert.equal(v.root.classes.has('has-rescue'),false);v.nav.update(0,mission,s,target);assert.equal(v.nav.pivot,first);assert.equal(v.world.children.length,1);}v.nav.setMission(null);assert.equal(v.nav.pivot.visible,false);v.nav.dispose();
});

test('real rescue stop, reset and completion hide navigation immediately and complete only once',()=>{
 const v=setup(),s=state(),system=Object.create(RescueSystem.prototype);let completed=0;
 Object.assign(system,{config:{...rescueConfig,completion:{showEffect:false,showMessage:false}},active:null,time:0,noticeLeft:0,notices:[],noticePanel:{classList:{remove(){}}},centre:{x:0,y:12,z:0},notice:{hidden:true},rope:{hide(){},update(){}},water:{clear(){}},onDelivered:()=>completed++});
 system.game={sub:s,rescueNavigation:v.nav,compass:{setRescue(){}},audio:{playRescue(){}},renderer:{getPixelRatio:()=>1}};system.rebind=()=>v.nav.update(0,system.active,s,system.centre);
 const model=new T.Group();model.position.set(0,11.2,0);const payload={id:'barnacles',name:'Captain Barnacles',height:1.8,radius:.4,model};
 assert.equal(system.start(payload),true);assert.equal(v.nav.pivot.visible,true);system.stop();assert.equal(v.nav.pivot.visible,false);assert.equal(s.towingSpeedMultiplier,1);
 assert.equal(system.start(payload),true);system.reset();assert.equal(v.nav.pivot.visible,false);assert.equal(system.notice.hidden,true);
 assert.equal(system.start(payload),true);system.constrain=()=>{};system.adjustTarget=()=>{};system.water.update=()=>{};system.update(1/60);assert.equal(completed,1);assert.equal(v.nav.pivot.visible,false);system.update(1/60);assert.equal(completed,1);v.nav.dispose();
});

test('disposal releases only owned arrow resources and never touches ocean objects or lights',()=>{
 const v=setup(),unrelated=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),light=new T.HemisphereLight();v.world.add(unrelated,light);
 let released=0;const resources=new Set();v.arrow.traverse(o=>{if(o.isMesh){resources.add(o.geometry);for(const m of [].concat(o.material))resources.add(m);}});for(const r of resources)r.addEventListener('dispose',()=>released++);
 let touched=0;unrelated.geometry.addEventListener('dispose',()=>touched++);unrelated.material.addEventListener('dispose',()=>touched++);v.nav.dispose();v.nav.dispose();assert.equal(released,resources.size);assert.equal(touched,0);assert.deepEqual(v.world.children,[unrelated,light]);assert.equal(v.nav.section.isConnected,false);
 unrelated.geometry.dispose();unrelated.material.dispose();
});

test('navigation state accepts reusable output while retaining legacy relative bearing/distance API',()=>{const out={};assert.equal(rescueNavigationState({x:0,y:20,z:0},Math.PI,{x:100,y:20,z:0},out),out);assert.equal(out.relative,90);assert.equal(out.distance,100);});

function facePixels(arrow,camera,width,height){
 let mesh;arrow.traverse(o=>{if(o.isMesh&&o.material.name==='Cyan screen top')mesh=o;});assert.ok(mesh);
 const a=mesh.geometry.attributes.position,index=mesh.geometry.index,points=[];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).project(camera);const p={x:(v.x+1)*width/2,y:(1-v.y)*height/2};points.push(p);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
 let area=0;for(let i=0;i<index.count;i+=3){const a=points[index.getX(i)],b=points[index.getX(i+1)],c=points[index.getX(i+2)];area+=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))/2;}
 return {width:maxX-minX,height:maxY-minY,area,minX,minY,maxX,maxY};
}

test('25 degree tilt keeps a visible cyan GLB face on phone views for every GUP',()=>{
 for(const definition of vehicles)for(const [width,height] of [[844,390],[390,844]]){
  const v=setup(),s=state(definition),camera=new T.PerspectiveCamera(65,width/height,.1,650),chase=new ChaseCamera(camera,null,()=>0);chase.profile=definition.camera;s.pitch=-.7;s.bank=.2;
  v.nav.update(0,mission,s,target);chase.update(0,s,{orbit:{x:0,y:0,last:1e9},drag:false});v.nav.prepare(camera,0);camera.updateMatrixWorld();v.world.updateMatrixWorld(true);
  const pixels=facePixels(v.arrow,camera,width,height);assert.ok(Math.min(pixels.width,pixels.height)>8,definition.id+' '+JSON.stringify(pixels));assert.ok(pixels.area>100,definition.id+' area '+pixels.area);
  const tip=new T.Vector3(0,0,-1).applyQuaternion(v.nav.presentation.quaternion).applyQuaternion(v.nav.pivot.quaternion);tip.y=0;tip.normalize();assert.ok(tip.dot(towards(v.nav,target))>1-1e-10,definition.id);
  const normal=new T.Vector3(0,1,0).applyQuaternion(v.nav.presentation.quaternion);assert.ok(normal.y>=Math.cos(config.presentationTilt*Math.PI/180)-1e-10);
  const box=new T.Box3().setFromObject(v.nav.pivot);assert.ok(box.min.y>=s.position.y+rescueHullTop(s)+config.minClearance-1e-9,definition.id+' mesh clearance');v.nav.dispose();
 }
});

test('GUP-X uphill regression has a readable cyan face rather than an edge-on phone bar',()=>{
 const definition=vehicles.find(v=>v.id==='gup-x');
 for(const [width,height] of [[844,390],[390,844]]){
  const v=setup(),s=state(definition);Object.assign(s.position,{x:136,y:13.01794,z:127});s.heading=5.304836562702475;s.pitch=-.7;
  const camera=new T.PerspectiveCamera(65,width/height,.1,650);camera.position.set(152.93462,21.57028,110.67796);camera.lookAt(133.5,15,128.5);camera.updateMatrixWorld();
  v.nav.update(0,mission,s,{x:180,y:20,z:100});v.world.updateMatrixWorld(true);const old=facePixels(v.arrow,camera,width,height);v.nav.prepare(camera,0);v.world.updateMatrixWorld(true);const next=facePixels(v.arrow,camera,width,height);
  assert.ok(next.area>old.area*2,JSON.stringify({old,next}));assert.ok(Math.min(next.width,next.height)>12,JSON.stringify(next));assert.ok(next.area>120,JSON.stringify(next));v.nav.dispose();
 }
});

test('presentation ignores camera roll, stays bounded through orbit, and settles smoothly across frame rates',()=>{
 const run=hz=>{const v=setup(),s=state();v.nav.update(0,mission,s,target);const camera=new T.PerspectiveCamera();camera.position.set(0,18,-20);v.nav.prepare(camera,0);camera.position.set(20,15,0);for(let i=0;i<hz;i++)v.nav.prepare(camera,1/hz);return v;};
 const a=run(30),b=run(120);assert.ok(a.nav.presentation.quaternion.angleTo(b.nav.presentation.quaternion)<.001);a.nav.dispose();b.nav.dispose();
 const v=setup(),s=state(),camera=new T.PerspectiveCamera();v.nav.update(0,mission,s,target);camera.position.set(5,15,25);v.nav.prepare(camera,0);const before=v.nav.presentation.quaternion.clone();camera.rotation.z=2;v.nav.prepare(camera,0);assert.ok(before.angleTo(v.nav.presentation.quaternion)<1e-7);
 let last=before;for(let i=0;i<360;i++){camera.position.set(Math.sin(i/60)*22,15,Math.cos(i/60)*22);v.nav.prepare(camera,1/60);assert.ok(last.angleTo(v.nav.presentation.quaternion)<.06);const normal=new T.Vector3(0,1,0).applyQuaternion(v.nav.presentation.quaternion);assert.ok(normal.y>=Math.cos(config.presentationTilt*Math.PI/180)-1e-10);last=v.nav.presentation.quaternion.clone();}
 v.nav.dispose();
});

test('paused-world invalidation is event-only and covers start, stop, reset, completion, and disposal',()=>{
 let dirty=false;const v=setup(config,()=>dirty=true),s=state(),system=Object.create(RescueSystem.prototype);
 Object.assign(system,{config:{...rescueConfig,completion:{showEffect:false,showMessage:false}},active:null,time:0,noticeLeft:0,notices:[],noticePanel:{classList:{remove(){}}},centre:{x:0,y:12,z:0},notice:{hidden:true},rope:{hide(){},update(){}},water:{clear(){},update(){}},onDelivered(){}});
 system.game={sub:s,rescueNavigation:v.nav,compass:{setRescue(){}},audio:{playRescue(){}},renderer:{getPixelRatio:()=>1}};system.rebind=()=>v.nav.update(0,system.active,s,system.centre);
 const model=new T.Group();model.position.set(0,11.2,0);const payload={id:'barnacles',name:'Captain Barnacles',height:1.8,radius:.4,model};
 system.start(payload);assert.equal(dirty,true);dirty=false;for(let i=0;i<30;i++)v.nav.update(1/60,system.active,s,system.centre);assert.equal(dirty,false,'normal follow must not force paused redraws');
 system.stop();assert.equal(dirty,true);assert.equal(v.nav.pivot.visible,false);system.start(payload);dirty=false;system.reset();assert.equal(dirty,true);assert.equal(v.nav.pivot.visible,false);
 system.start(payload);dirty=false;system.constrain=()=>{};system.adjustTarget=()=>{};system.update(0);assert.equal(dirty,true);assert.equal(v.nav.pivot.visible,false);dirty=false;v.nav.dispose();assert.equal(dirty,true);
});
