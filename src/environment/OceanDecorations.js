import {resolveOctopodCollision} from './octopodCollision.js';
import {showcaseLayout,inShowcase} from './showcaseLayout.js';
import {waterConfig} from '../config/waterConfig.js';
import {applyWaterCaustics} from './waterCaustics.js';
import {bendVegetation} from '../effects/vegetationInteraction.js';
import {habitatEnabled} from '../config/habitatConfig.js';
import {reefStoneTextures} from './reefTextures.js';
import {insideHabitat} from './habitatLayout.js';
import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {heightAt} from './terrainMath.js';
import {reefLayout} from './reefLayout.js';
import {environmentConfig as config} from '../config/environmentConfig.js';
export class OceanDecorations{
 async load(scene,profile=config.profiles.high){
  this.sway=[];this.batches=[];this.profile=profile;this.layout=reefLayout();if(habitatEnabled()){this.layout.records=this.layout.records.filter(r=>!insideHabitat(r.x,r.z));this.layout.rocks=this.layout.rocks.filter(r=>!insideHabitat(r.x,r.z));}const showcaseManifest=await fetch(new URL('../../assets/models/showcase-rocks.json',import.meta.url).href).then(r=>{if(!r.ok)throw new Error('Showcase composition unavailable');return r.json();});const showcase=showcaseLayout(showcaseManifest);this.showcaseColliders=showcase.rocks;this.layout.records=this.layout.records.filter(r=>!inShowcase(r.x,r.z)).concat(showcase.records);this.layout.rocks=this.layout.rocks.filter(r=>!inShowcase(r.x,r.z)).concat(showcase.rocks);this.lastPosition=null;this.lastUpdate=-1;this.frustum=new T.Frustum();this.clip=new T.Matrix4();this.sphere=new T.Sphere();
  const {scene:assets}=await new GLTFLoader().loadAsync(new URL('../../assets/models/underwater-environment.glb',import.meta.url).href);assets.updateMatrixWorld(true);
  const {scene:showcaseAssets}=await new GLTFLoader().loadAsync(new URL('../../assets/models/showcase-rocks.glb',import.meta.url).href);assets.add(showcaseAssets);assets.updateMatrixWorld(true);const {color:rockMap,normal:rockNormal}=reefStoneTextures();
  const sources=new Map();assets.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const mat=o.material.clone();mat.roughness=.88;
   if(o.name.startsWith('rock')){mat.map=rockMap;mat.normalMap=rockNormal;mat.normalScale=new T.Vector2(.6,.6);}
   if(/kelp|seaweed|grass/.test(o.name)){mat.side=T.DoubleSide;mat.onBeforeCompile=s=>{s.uniforms.uReefTime={value:0};this.sway.push(s);bendVegetation(s);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uReefTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uReefTime*.65+position.y*1.6+instanceMatrix[3].x)*max(0.,position.y)*.075;transformed.z+=cos(uReefTime*.48+position.y*1.3+instanceMatrix[3].z)*max(0.,position.y)*.055;');};}
   if(/rock|branch|brain|tube/.test(o.name)&&(profile===config.profiles.high||o.name.startsWith('rock')))applyWaterCaustics(mat,waterConfig.caustics.reefIntensity,profile===config.profiles.low);
   sources.set(o.name,{geo,mat});
  });
  this.surfaceBounds=new Map();for(const [name,src] of sources){if(name.endsWith('_low'))continue;src.geo.computeBoundingBox();const b=src.geo.boundingBox,attr=src.geo.getAttribute('color'),color=attr?[attr.getX(0),attr.getY(0),attr.getZ(0)]:[.3,.5,.3];this.surfaceBounds.set(name,{y:(b.max.y+b.min.y)/2,rx:(b.max.x-b.min.x)*.47,ry:(b.max.y-b.min.y)*.47,rz:(b.max.z-b.min.z)*.47,radius:Math.max(b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z)*.4,surface:/branch|brain|tube/.test(name)?'coral':/rock/.test(name)?'rock':'vegetation',color});}
  const byKind=new Map(),dummy=new T.Object3D();
  for(let i=0;i<this.layout.records.length;i++){const r=this.layout.records[i];if(profile.reefFraction<1&&/grass|seaweed/.test(r.kind)&&i%3===0)continue;
   dummy.position.set(r.x,r.y,r.z);const normal=new T.Vector3(heightAt(r.x-.3,r.z)-heightAt(r.x+.3,r.z),.6,heightAt(r.x,r.z-.3)-heightAt(r.x,r.z+.3)).normalize();if(r.upright)dummy.quaternion.identity();else dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);dummy.rotateY(r.angle);dummy.scale.setScalar(r.scale);dummy.updateMatrix();r.matrix=dummy.matrix.clone();r.tint=.91+.09*Math.sin(r.x*17+r.z*11);
   if(!byKind.has(r.kind))byKind.set(r.kind,[]);byKind.get(r.kind).push(r);
  }
  this.assetTriangles=0;
  for(const [kind,records] of byKind){const make=low=>{const src=sources.get(kind+(low?'_low':''));if(!src)throw new Error('Missing reef mesh '+kind);const mesh=new T.InstancedMesh(src.geo,src.mat,records.length);mesh.name='Reef '+kind+(low?' mobile/distant':' close detail');mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=/rock|branch/.test(kind);mesh.receiveShadow=true;scene.add(mesh);return mesh;};const high=profile===config.profiles.high?make(false):null,low=make(true);this.batches.push({kind,records,high,low});}
  sources.forEach(s=>this.assetTriangles+=(s.geo.index?.count??s.geo.attributes.position.count)/3);this.color=new T.Color();this.createOcclusion();
 }
 collide(sub){return resolveOctopodCollision(sub.position,this.showcaseColliders??[],sub.heading);}
 createOcclusion(){
  this.occlusion?.dispose();
  const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,size,size);
  for(const r of this.layout.rocks){const x=(r.x/1600+.5)*size,y=(.5-r.z/1600)*size,radius=Math.max(2.5,r.radius*1.4)*size/1600;const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,'rgba(0,0,0,.7)');gradient.addColorStop(.45,'rgba(0,0,0,.4)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);}
  this.occlusion=new T.CanvasTexture(canvas);this.occlusion.colorSpace=T.NoColorSpace;
 }
 update(time,position,camera){
  for(const s of this.sway)s.uniforms.uReefTime.value=time;
  if(!position||this.lastPosition&&time-this.lastUpdate<.1&&Math.hypot(position.x-this.lastPosition.x,position.z-this.lastPosition.z)<4)return;
  this.lastUpdate=time;this.lastPosition={...position};if(camera){camera.updateMatrixWorld();this.clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.clip);}
  for(const b of this.batches){let nearCount=0,farCount=0;const limit=/grass|shell|seaweed|kelp/.test(b.kind)?this.profile.vegetationDistance:/branch|brain|tube/.test(b.kind)?this.profile.coralDistance:this.profile.drawDistance;
   for(const r of b.records){const distance=Math.hypot(r.x-position.x,r.z-position.z);if(distance>limit)continue;if(camera){this.sphere.center.set(r.x,r.y+1,r.z);this.sphere.radius=r.scale*(b.kind.startsWith('rock')?5:3)+2;if(!this.frustum.intersectsSphere(this.sphere))continue;}const detailed=b.high&&distance<50,mesh=detailed?b.high:b.low,index=detailed?nearCount++:farCount++;mesh.setMatrixAt(index,r.matrix);this.color.setRGB(r.tint,r.tint,r.tint);mesh.setColorAt(index,this.color);}
   b.low.count=farCount;b.low.instanceMatrix.needsUpdate=true;if(b.low.instanceColor)b.low.instanceColor.needsUpdate=true;
   if(b.high){b.high.count=nearCount;b.high.instanceMatrix.needsUpdate=true;if(b.high.instanceColor)b.high.instanceColor.needsUpdate=true;}
  }
 }
}
