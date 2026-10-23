import {waterConfig} from '../config/waterConfig.js';
import {applyWaterCaustics} from './waterCaustics.js';
import {bendVegetation} from '../effects/vegetationInteraction.js';
import {reefStoneTextures} from './reefTextures.js';
import {DRACOLoader} from '../../vendor/DRACOLoader.js';
import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {habitatConfig as config} from '../config/habitatConfig.js';
import {environmentConfig} from '../config/environmentConfig.js';
import {habitatLayout,habitatColliders} from './habitatLayout.js';
export class ReefHabitat{
 async load(scene,profile){
  this.profile=profile;this.batches=[];this.shaders=[];this.frustum=new T.Frustum();this.clip=new T.Matrix4();this.sphere=new T.Sphere();
  const response=await fetch(new URL('../../assets/models/reef-formations/manifest.json',import.meta.url).href);if(!response.ok)throw new Error('Reef formation manifest unavailable');this.manifest=await response.json();this.layout=habitatLayout(this.manifest);this.colliders=habitatColliders(this.layout,this.manifest);
  const draco=new DRACOLoader();draco.setDecoderPath(new URL('../../vendor/draco/',import.meta.url).toString());draco.setWorkerLimit(2);const loader=new GLTFLoader().setDRACOLoader(draco);const {color:rockMap,normal:rockNormal}=reefStoneTextures();
  const palette={};
  for(const type of ['large','garden','patch','wall']){
   const {scene:asset}=await loader.loadAsync(new URL('../../assets/models/reef-formations/'+type+'.glb',import.meta.url).href);asset.updateMatrixWorld(true);const meshes=new Map();asset.traverse(o=>{if(o.isMesh)meshes.set(o.name,o);});
   const records=this.layout.filter(p=>p.type===type);for(const p of records){const o=new T.Object3D();o.position.set(p.x,p.y,p.z);o.rotation.y=p.angle;o.scale.setScalar(p.scale);o.updateMatrix();p.matrix=o.matrix.clone();}
   for(const layer of ['rock','coral','vegetation']){
    if(!palette[layer]){const material=meshes.get(type+'_'+layer).material.clone();material.roughness=.85;
     if(layer==='rock'){material.map=rockMap;material.normalMap=rockNormal;material.normalScale=new T.Vector2(.55,.55);material.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vReefStone;').replace('#include <begin_vertex>','#include <begin_vertex>\nvReefStone=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vReefStone;').replace('#include <color_fragment>','#include <color_fragment>\nfloat crust=smoothstep(.18,.7,sin(vReefStone.x*.85+sin(vReefStone.z*.6))*sin(vReefStone.y*.9+vReefStone.z*.3));diffuseColor.rgb*=mix(vec3(1.),vec3(1.28,.76,1.16),crust*.5);');};}
     if(layer==='vegetation'){material.side=T.DoubleSide;material.onBeforeCompile=s=>{s.uniforms.uHabitatTime={value:0};this.shaders.push(s);bendVegetation(s,'clamp(1.-uv.y,0.,1.)');s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uHabitatTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uHabitatTime*.7+position.y*1.4+instanceMatrix[3].x)*max(0.,1.-uv.y)*.11;transformed.z+=cos(uHabitatTime*.5+position.x)*max(0.,1.-uv.y)*.075;');};}if(layer==='rock'||layer==='coral'&&profile===environmentConfig.profiles.high)applyWaterCaustics(material,waterConfig.caustics.reefIntensity,profile===environmentConfig.profiles.low);palette[layer]=material;
    }
    const make=low=>{const src=meshes.get(type+'_'+layer+(low?'_low':''));if(!src)throw new Error('Missing '+type+' '+layer+' layer');const geometry=src.geometry;geometry.applyMatrix4(src.matrixWorld);const color=geometry.getAttribute('color');if(color&&color.array.BYTES_PER_ELEMENT>1){const bytes=new Uint8Array(color.array.length);for(let i=0;i<bytes.length;i++)bytes[i]=Math.round(Math.max(0,Math.min(1,color.array[i]))*255);geometry.setAttribute('color',new T.Uint8BufferAttribute(bytes,color.itemSize,true));}const mesh=new T.InstancedMesh(geometry,palette[layer],records.length);mesh.count=0;mesh.name='Habitat '+type+' '+layer+(low?' LOD':'');mesh.frustumCulled=false;mesh.castShadow=layer==='rock';mesh.receiveShadow=true;scene.add(mesh);return mesh;};this.batches.push({records,high:profile===environmentConfig.profiles.high?make(false):null,low:make(true)});
   }
  }
  draco.dispose();
 }
 update(time,position,camera){for(const s of this.shaders)s.uniforms.uHabitatTime.value=time;camera.updateMatrixWorld();this.clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.clip);
  for(const b of this.batches){let high=0,low=0;for(const p of b.records){const d=Math.hypot(position.x-p.x,position.z-p.z);if(d>config.renderDistance+18)continue;this.sphere.center.set(p.x,p.y+4,p.z);this.sphere.radius=(p.type==='wall'?17:15)*p.scale;if(!this.frustum.intersectsSphere(this.sphere))continue;const detailed=b.high&&d<config.detailDistance;const mesh=detailed?b.high:b.low;mesh.setMatrixAt(detailed?high++:low++,p.matrix);}b.low.count=low;b.low.instanceMatrix.needsUpdate=true;if(b.high){b.high.count=high;b.high.instanceMatrix.needsUpdate=true;}}
 }
}
