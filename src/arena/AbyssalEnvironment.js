import * as T from 'three';
import {meshShip,meshFluke,meshManta,meshChunk,meshCoral,kelpColumn,rseed,rnd,rr} from '../../vendor/abyssal-garden/procedural.js';
import {abyssalArenaConfig as config} from '../config/abyssalArenaConfig.js';
import {DensityField} from './DensityField.js';

function geometry(packed){const f=new Float32Array(packed.vb),n=new Int8Array(packed.vb),p=new Float32Array(packed.nv*3),normal=new Float32Array(p.length);for(let i=0;i<packed.nv;i++)for(let j=0;j<3;j++){p[i*3+j]=f[i*4+j];normal[i*3+j]=n[i*16+12+j]/127;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(p,3));geo.setAttribute('normal',new T.BufferAttribute(normal,3));geo.setIndex(new T.BufferAttribute(packed.ib,1));geo.computeBoundingSphere();return geo;}
export class AbyssalEnvironment{
 async load(scene,quality){
  const profile=config.profiles[quality];this.group=new T.Group();scene.add(this.group);this.time={value:0};
  const url=name=>new URL('../../assets/abyssal/'+name,import.meta.url).href;
  const response=await Promise.all(['terrain.json','positions.bin','indices.bin','density.bin'].map(async name=>{const r=await fetch(url(name));if(!r.ok)throw new Error('Arena asset missing: '+name);return name.endsWith('json')?r.json():r.arrayBuffer();}));
  this.field=new DensityField(response[0],new Int8Array(response[3]));const terrain=new T.BufferGeometry();terrain.setAttribute('position',new T.BufferAttribute(new Float32Array(response[1]),3));terrain.setIndex(new T.BufferAttribute(new Uint32Array(response[2]),1));terrain.computeVertexNormals();
  const rock=new T.MeshStandardMaterial({color:0x738678,roughness:.96,side:T.DoubleSide});rock.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 arenaWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\narenaWorld=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 arenaWorld;').replace('#include <color_fragment>','#include <color_fragment>\nfloat strata=sin(arenaWorld.y*3.+sin(arenaWorld.x*.4))*0.08; diffuseColor.rgb*=.9+strata; diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.2,.12,.32),smoothstep(50.,90.,arenaWorld.z)*.5);');};
  this.terrain=new T.Mesh(terrain,rock);this.terrain.name='Abyssal Garden baked canyon terrain';this.group.add(this.terrain);
  const add=(g,color,x,y,z,scale=1,angle=0)=>{const o=new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.82,side:T.DoubleSide}));o.position.set(x,y,z);o.scale.setScalar(scale);o.rotation.y=angle;this.group.add(o);return o;};
  // Original set-piece meshes, with placement from upstream makeWorld.
  add(geometry(meshShip().build()),0x705a36,48,19,18,1,2.55);
  add(geometry(meshFluke()),0xb2b6a0,-5,this.field.floor(-5,-4)-.6,-4,1,1.2);
  const coral=geometry(meshCoral(0,true).build()),coralCount=quality==='low'?30:100;rseed(71);const corals=new T.InstancedMesh(coral,new T.MeshStandardMaterial({color:0xb758a4,roughness:.8,side:T.DoubleSide}),coralCount),dummy=new T.Object3D();for(let i=0;i<coralCount;i++){const x=rr(-18,24),z=rr(65,108);dummy.position.set(x,this.field.floor(x,z),z);dummy.scale.setScalar(rr(.4,1.4));dummy.rotation.set(0,rr(0,6.28),0);dummy.updateMatrix();corals.setMatrixAt(i,dummy.matrix);}this.group.add(corals);
  const rocks=new T.InstancedMesh(geometry(meshChunk(7,quality==='low'?1:2).build()),rock,profile.rocks);rseed(5);for(let i=0;i<profile.rocks;i++){const x=rr(-140,140),z=rr(-140,140);dummy.position.set(x,this.field.floor(x,z),z);dummy.scale.set(rr(.3,1.5),rr(.3,1),rr(.3,1.5));dummy.rotation.set(rr(0,3),rr(0,6),0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}this.group.add(rocks);
  // Upstream column generator supplies leaf lengths, yaw, tilt, height and type.
  const leaves=[];rseed(1);for(let i=0;i<profile.columns;i++){const basin=i%3===0,cx=basin?0:i%2?-60:72,cz=basin?-86:i%2?-4:-26,x=cx+rr(-25,25),z=cz+rr(-24,24),y=this.field.floor(x,z);if(y>30)continue;leaves.push(...kelpColumn(x,y,z,Math.min(rr(14,30),42-y),i%2,profile.leaves));}
  const leafGeo=new T.PlaneGeometry(1,1,1,3);leafGeo.translate(0,.5,0);const leafMat=new T.MeshStandardMaterial({color:0x7b8b27,roughness:.7,side:T.DoubleSide});leafMat.onBeforeCompile=s=>{s.uniforms.arenaTime=this.time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float arenaTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(arenaTime*.7+instanceMatrix[3].x*.2+instanceMatrix[3].y*.3)*position.y*position.y*.16;');};
  const kelp=new T.InstancedMesh(leafGeo,leafMat,leaves.length);for(const [i,l] of leaves.entries()){dummy.position.set(l[0],l[1],l[2]);dummy.rotation.set(l[5],l[4],l[8]===1?0:Math.PI*.4);dummy.scale.set(l[6]*2,l[3],1);dummy.updateMatrix();kelp.setMatrixAt(i,dummy.matrix);}kelp.name='Upstream procedural kelp columns';this.group.add(kelp);this.leafCount=leaves.length;
  const rayGeo=geometry(meshManta().build());this.mantas=[];for(let i=0;i<4;i++)this.mantas.push(add(rayGeo,0x315466,0,35,0,3+i*.25));
  // Cheap shaft volumes; upstream WebGPU volumetric/bloom pipeline is not ported.
  const shaftMat=new T.MeshBasicMaterial({color:0x8af1cc,transparent:true,opacity:.025,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});for(let i=0;i<8;i++){const ray=new T.Mesh(new T.CylinderGeometry(.15,3,44,6,1,true),shaftMat);ray.position.set(-30+i*11,24,-10+i*9);ray.rotation.z=-.23;this.group.add(ray);}
  const surface=new T.Mesh(new T.PlaneGeometry(384,384),new T.MeshBasicMaterial({color:0x46cbb5,transparent:true,opacity:.15,side:T.DoubleSide,depthWrite:false}));surface.rotation.x=-Math.PI/2;surface.position.y=46;this.group.add(surface);
 }
 update(time){this.time.value=time;this.mantas.forEach((m,i)=>{const a=time*.035+i*1.8;m.position.set(Math.sin(a)*65,33+Math.sin(time*.3+i),Math.cos(a)*65);m.rotation.set(0,a+Math.PI/2,Math.sin(time*.8+i)*.08);});}
 dispose(){const geometries=new Set(),materials=new Set();this.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());this.group.removeFromParent();}
}
