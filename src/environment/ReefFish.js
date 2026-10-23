import {nearbySchools} from './marineLayout.js';
import {MarineVisitors} from './MarineVisitors.js';
import * as T from 'three';
import {marineLifeConfig as c} from '../config/marineLifeConfig.js';
import {heightAt,random} from './terrainMath.js';
import {worldConfig} from '../config/worldConfig.js';
import {schoolPath,schoolAvoidance} from './fishMath.js';
function fishGeometry(){const vertices=[],colors=[],indices=[];
 const add=(x,y,z,color)=>{vertices.push(x,y,z);colors.push(...color);return vertices.length/3-1;};
 const tri=(a,b,d)=>indices.push(a,b,d),rings=11,sides=12;
 // Tapered oval body, a dark tropical band behind the eye and white muzzle.
 for(let i=0;i<rings;i++){const t=i/(rings-1),z=-.6+t*1.3,r=Math.sin(t*Math.PI)**.65*.95+.04;
  for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,light=.72+.28*Math.max(0,Math.sin(a)),band=t>.64&&t<.79;const col=band?[.055,.085,.11]:[light,light,light];add(Math.cos(a)*r*.16,Math.sin(a)*r*.31,z,col);}
 }
 for(let i=0;i<rings-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;tri(a,b,a+sides);tri(b,b+sides,a+sides);}
 const fin=(points,color)=>{const start=vertices.length/3;for(const p of points)add(...p,color);for(let i=1;i<points.length-1;i++)tri(start,start+i,start+i+1);};
 // Forked vertical tail and small swept dorsal/pectoral fins.
 fin([[0,.05,-.52],[0,.35,-1.02],[0,.03,-.87],[0,-.34,-1.02],[0,-.05,-.52]],[.8,.88,.96]);
 fin([[0,.24,-.35],[0,.51,-.19],[0,.27,.22]],[.75,.85,.94]);
 for(const sign of [-1,1])fin([[sign*.12,-.02,.15],[sign*.38,-.11,-.12],[sign*.13,-.12,-.24]],[.75,.85,.94]);
 // Small sculpted eyes, merged into the same geometry and draw call.
 for(const sign of [-1,1]){const eye=new T.SphereGeometry(.055,7,5);eye.scale(.45,1,1);eye.translate(sign*.135,.075,.43);const offset=vertices.length/3,p=eye.attributes.position;for(let i=0;i<p.count;i++)add(p.getX(i),p.getY(i),p.getZ(i),[.012,.025,.04]);for(const id of eye.index.array)indices.push(offset+id);eye.dispose();}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
export class ReefFish{
 constructor(scene,low,surfaces){this.inspect=new URLSearchParams(location.search).has('inspect');this.surfaces=surfaces;this.near=[];this.path={};this.goal={};this.dummy=new T.Object3D();this.color=new T.Color();this.range=low?c.lowRenderDistance:c.renderDistance;this.capacity=low?c.lowMaxFish:c.maxFish;this.groupSize=low?c.lowCount:c.count;this.slots=low?c.lowSchoolSlots:c.schoolSlots;this.cache=new Map();this.groups=[];this.nextRefresh=-1;this.visitors=new MarineVisitors(scene,low);const count=this.capacity;
  const geometry=fishGeometry();geometry.setAttribute('swimPhase',new T.InstancedBufferAttribute(new Float32Array(count),1));
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:0,side:T.DoubleSide,envMapIntensity:.3});
  this.time={value:0};material.onBeforeCompile=s=>{s.uniforms.uFishTime=this.time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uFishTime;attribute float swimPhase;').replace('#include <begin_vertex>',`#include <begin_vertex>
 float tail=1.-smoothstep(-.65,.15,position.z);transformed.x+=sin(uFishTime*${c.tailSpeed.toFixed(2)}+swimPhase+position.z*3.)*tail*tail*${c.tailAmplitude.toFixed(3)};`);};material.customProgramCacheKey=()=> 'reef-fish-tail-v1';
  this.mesh=new T.InstancedMesh(geometry,material,count);this.mesh.name='Shared multi-school marine life';this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.count=0;scene.add(this.mesh);
 }
 floor(x,z){let floor=heightAt(x,z);for(const [dx,dz] of [[10,0],[-10,0],[0,10],[0,-10]])floor=Math.max(floor,heightAt(x+dx,z+dz));
  for(const rock of this.surfaces.rockGrid.query(x,z,12,this.near)){if(!rock.rx)continue;if(Math.hypot(x-rock.x,z-rock.z)<12+Math.max(rock.rx,rock.rz))floor=Math.max(floor,rock.y+rock.ry);}return Math.min(worldConfig.surface-9,floor);
 }
 refresh(time,sub){this.nextRefresh=time+.6;const anchors=nearbySchools(sub.position.x,sub.position.z,this.range);this.groups.length=0;
  for(const a of anchors){if(this.groups.length>=this.slots)break;let g=this.cache.get(a.id);if(!g){const rng=random(a.seed);g={...a,phase:rng()*6.28,avoid:{x:0,z:0},floor:0,nextFloor:-1,records:Array.from({length:this.groupSize},()=>({side:(rng()-.5)*c.spread*2,fore:(rng()-.5)*c.spread*2.6,vertical:(rng()-.5)*2,phase:rng()*6.28,scale:.75+rng()*.55,y:null}))};this.cache.set(a.id,g);}this.groups.push(g);}
  if(this.cache.size>64)for(const [key,g] of this.cache){if(!this.groups.includes(g)&&Math.hypot(g.x-sub.position.x,g.z-sub.position.z)>this.range*1.5)this.cache.delete(key);}
 }
 update(dt,time,sub,camera){if(!c.enabled)return;if(time>=this.nextRefresh)this.refresh(time,sub);const palette=['#ffd75b','#62dfe8','#ff9863','#c2e9ed'];this.time.value=time;let n=0,activeSchools=0;
  for(const g of this.groups){schoolPath(time,this.path,g,g.phase);schoolAvoidance(this.path.x,this.path.z,sub.position,this.goal);const blend=1-Math.exp(-dt*2);g.avoid.x+=(this.goal.x-g.avoid.x)*blend;g.avoid.z+=(this.goal.z-g.avoid.z)*blend;const px=this.path.x+g.avoid.x,pz=this.path.z+g.avoid.z;if(Math.hypot(camera.position.x-px,camera.position.z-pz)>this.range)continue;
   if(time>=g.nextFloor){g.floor=this.floor(px,pz);g.nextFloor=time+.35;}g.swimX=px;g.swimZ=pz;activeSchools++;const angle=this.path.heading,co=Math.cos(angle),si=Math.sin(angle),slender=g.seed%3===0;
   for(let i=0;i<g.records.length&&n<this.capacity;i++){const r=g.records[i],x=px+co*r.side+si*r.fore,z=pz-si*r.side+co*r.fore,desired=Math.min(worldConfig.surface-2,g.floor+c.heightAboveSand+r.vertical+(g.seed%4)+Math.sin(time*.8+r.phase)*.45);if(r.y===null)r.y=desired;r.y=Math.max(g.floor+1,Math.min(worldConfig.surface-2,r.y+(desired-r.y)*(1-Math.exp(-dt*3))));this.dummy.position.set(x,r.y,z);this.dummy.rotation.set(0,angle+Math.sin(time*.65+r.phase)*.1,Math.sin(time*.8+r.phase)*.045);this.dummy.scale.set(r.scale*(slender?.7:1),r.scale*(slender?.7:1),r.scale*(slender?1.45:1));this.dummy.updateMatrix();this.mesh.setMatrixAt(n,this.dummy.matrix);this.mesh.geometry.attributes.swimPhase.setX(n,r.phase);this.color.set(palette[(g.seed+i%3)%palette.length]);this.mesh.setColorAt(n,this.color);n++;}
  }
  this.mesh.count=n;this.mesh.visible=n>0;this.mesh.instanceMatrix.needsUpdate=true;this.mesh.geometry.attributes.swimPhase.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;this.visitors.update(time,this.groups,camera);
  if(this.inspect){this.output??=document.body.appendChild(Object.assign(document.createElement('output'),{id:'fishMetrics',hidden:true}));this.output.dataset.metrics=JSON.stringify({count:n,schools:activeSchools,budget:this.capacity,visitors:this.visitors.active,trianglesPerFish:this.mesh.geometry.index.count/3});}
 }
}
