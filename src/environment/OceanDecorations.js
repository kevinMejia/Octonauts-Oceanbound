import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {heightAt} from './terrainMath.js';
import {reefLayout} from './reefLayout.js';
import {environmentConfig as config} from '../config/environmentConfig.js';
export class OceanDecorations{
 async load(scene,profile=config.profiles.high){
  this.sway=[];this.batches=[];this.profile=profile;this.layout=reefLayout();this.lastPosition=null;this.lastUpdate=-1;this.frustum=new T.Frustum();this.clip=new T.Matrix4();this.sphere=new T.Sphere();
  const {scene:assets}=await new GLTFLoader().loadAsync(new URL('../../assets/models/underwater-environment.glb',import.meta.url).href);assets.updateMatrixWorld(true);
  const loader=new T.TextureLoader(),rockMap=loader.load(new URL('../../assets/textures/rock-color.jpg',import.meta.url).href),rockNormal=loader.load(new URL('../../assets/textures/rock-normal.png',import.meta.url).href);rockMap.colorSpace=T.SRGBColorSpace;
  for(const t of [rockMap,rockNormal]){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=4;}
  const sources=new Map();assets.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const mat=o.material.clone();mat.roughness=.88;
   if(o.name.startsWith('rock')){mat.map=rockMap;mat.normalMap=rockNormal;mat.normalScale=new T.Vector2(.6,.6);}
   if(/kelp|seaweed|grass/.test(o.name)){mat.side=T.DoubleSide;mat.onBeforeCompile=s=>{s.uniforms.uReefTime={value:0};this.sway.push(s);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uReefTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uReefTime*.65+position.y*1.6+instanceMatrix[3].x)*max(0.,position.y)*.045;transformed.z+=cos(uReefTime*.48+position.y*1.3+instanceMatrix[3].z)*max(0.,position.y)*.035;');};}
   sources.set(o.name,{geo,mat});
  });
  const byKind=new Map(),dummy=new T.Object3D();
  for(let i=0;i<this.layout.records.length;i++){const r=this.layout.records[i];if(profile.reefFraction<1&&/grass|seaweed/.test(r.kind)&&i%3===0)continue;
   dummy.position.set(r.x,r.y,r.z);const normal=new T.Vector3(heightAt(r.x-.3,r.z)-heightAt(r.x+.3,r.z),.6,heightAt(r.x,r.z-.3)-heightAt(r.x,r.z+.3)).normalize();dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);dummy.rotateY(r.angle);dummy.scale.setScalar(r.scale);dummy.updateMatrix();r.matrix=dummy.matrix.clone();r.tint=.91+.09*Math.sin(r.x*17+r.z*11);
   if(!byKind.has(r.kind))byKind.set(r.kind,[]);byKind.get(r.kind).push(r);
  }
  this.assetTriangles=0;
  for(const [kind,records] of byKind){const make=low=>{const src=sources.get(kind+(low?'_low':''));if(!src)throw new Error('Missing reef mesh '+kind);const mesh=new T.InstancedMesh(src.geo,src.mat,records.length);mesh.name='Reef '+kind+(low?' mobile/distant':' close detail');mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=/rock|branch/.test(kind);mesh.receiveShadow=true;scene.add(mesh);return mesh;};const high=profile===config.profiles.high?make(false):null,low=make(true);this.batches.push({kind,records,high,low});}
  sources.forEach(s=>this.assetTriangles+=(s.geo.index?.count??s.geo.attributes.position.count)/3);this.color=new T.Color();this.createOcclusion();
 }
 createOcclusion(){
  const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,size,size);
  for(const r of this.layout.rocks){const x=(r.x/1600+.5)*size,y=(.5-r.z/1600)*size,radius=Math.max(2.5,r.radius*1.4)*size/1600;const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,'rgba(0,0,0,.7)');gradient.addColorStop(.45,'rgba(0,0,0,.4)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);}
  this.occlusion=new T.CanvasTexture(canvas);this.occlusion.colorSpace=T.NoColorSpace;
 }
 update(time,position,camera){
  for(const s of this.sway)s.uniforms.uReefTime.value=time;
  if(!position||this.lastPosition&&time-this.lastUpdate<.1&&Math.hypot(position.x-this.lastPosition.x,position.z-this.lastPosition.z)<4)return;
  this.lastUpdate=time;this.lastPosition={...position};if(camera){camera.updateMatrixWorld();this.clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.clip);}
  for(const b of this.batches){let nearCount=0,farCount=0;const limit=/grass|shell/.test(b.kind)?this.profile.drawDistance*.65:this.profile.drawDistance;
   for(const r of b.records){const distance=Math.hypot(r.x-position.x,r.z-position.z);if(distance>limit)continue;if(camera){this.sphere.center.set(r.x,r.y+1,r.z);this.sphere.radius=r.scale*(b.kind.startsWith('rock')?5:3)+2;if(!this.frustum.intersectsSphere(this.sphere))continue;}const detailed=b.high&&distance<50,mesh=detailed?b.high:b.low,index=detailed?nearCount++:farCount++;mesh.setMatrixAt(index,r.matrix);this.color.setRGB(r.tint,r.tint,r.tint);mesh.setColorAt(index,this.color);}
   b.low.count=farCount;b.low.instanceMatrix.needsUpdate=true;if(b.low.instanceColor)b.low.instanceColor.needsUpdate=true;
   if(b.high){b.high.count=nearCount;b.high.instanceMatrix.needsUpdate=true;if(b.high.instanceColor)b.high.instanceColor.needsUpdate=true;}
  }
 }
}
