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
 constructor(scene,low,surfaces){this.inspect=new URLSearchParams(location.search).has('inspect');this.surfaces=surfaces;this.near=[];this.path={};this.avoid={x:0,z:0};this.goal={};this.dummy=new T.Object3D();this.color=new T.Color();this.range=low?c.lowRenderDistance:c.renderDistance;const count=c.enabled?(low?c.lowCount:c.count):0,rng=random(71233);this.records=Array.from({length:count},()=>({side:(rng()-.5)*c.spread*2,fore:(rng()-.5)*c.spread*2.6,vertical:(rng()-.5)*2,phase:rng()*Math.PI*2,scale:.7+rng()*.45,y:20}));
  const geometry=fishGeometry();geometry.setAttribute('swimPhase',new T.InstancedBufferAttribute(Float32Array.from(this.records,r=>r.phase),1));
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:0,side:T.DoubleSide,envMapIntensity:.3});
  this.time={value:0};material.onBeforeCompile=s=>{s.uniforms.uFishTime=this.time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uFishTime;attribute float swimPhase;').replace('#include <begin_vertex>',`#include <begin_vertex>
 float tail=1.-smoothstep(-.65,.15,position.z);transformed.x+=sin(uFishTime*${c.tailSpeed.toFixed(2)}+swimPhase+position.z*3.)*tail*tail*${c.tailAmplitude.toFixed(3)};`);};material.customProgramCacheKey=()=> 'reef-fish-tail-v1';
  this.mesh=new T.InstancedMesh(geometry,material,count);this.mesh.name='One schooling reef fish group';this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.boundingSphere=new T.Sphere(new T.Vector3(c.center.x,23,c.center.z),30);this.mesh.visible=count>0;scene.add(this.mesh);
  const palette=['#ffd75b','#5bdae2','#ffad59'];for(let i=0;i<count;i++){this.color.set(palette[i%palette.length]);this.mesh.setColorAt(i,this.color);}
 }
 floor(x,z){let floor=heightAt(x,z);for(const rock of this.surfaces.rockGrid.query(x,z,.5,this.near)){if(!rock.rx)continue;const co=Math.cos(rock.angle??0),si=Math.sin(rock.angle??0),dx=x-rock.x,dz=z-rock.z,u=co*dx-si*dz,v=si*dx+co*dz,q=u*u/(rock.rx*rock.rx)+v*v/(rock.rz*rock.rz);if(q<1)floor=Math.max(floor,rock.y+rock.ry*Math.sqrt(1-q));}return floor;}
 update(dt,time,sub,camera){if(!this.records.length)return;schoolPath(time,this.path);schoolAvoidance(this.path.x,this.path.z,sub.position,this.goal);const blend=1-Math.exp(-dt*2);this.avoid.x+=(this.goal.x-this.avoid.x)*blend;this.avoid.z+=(this.goal.z-this.avoid.z)*blend;const px=this.path.x+this.avoid.x,pz=this.path.z+this.avoid.z;this.mesh.visible=Math.hypot(camera.position.x-px,camera.position.z-pz)<this.range;if(!this.mesh.visible)return;
  const angle=this.path.heading,co=Math.cos(angle),si=Math.sin(angle);this.time.value=time;
  for(let i=0;i<this.records.length;i++){const r=this.records[i],x=px+co*r.side+si*r.fore,z=pz-si*r.side+co*r.fore,ground=this.floor(x,z),desired=Math.min(worldConfig.surface-2,ground+c.heightAboveSand+r.vertical+Math.sin(time*.8+r.phase)*.35);r.y=Math.max(ground+1,Math.min(worldConfig.surface-2,r.y+(desired-r.y)*(1-Math.exp(-dt*3))));this.dummy.position.set(x,r.y,z);this.dummy.rotation.set(0,angle+Math.sin(time*.65+r.phase)*.1,Math.sin(time*.8+r.phase)*.045);this.dummy.scale.setScalar(r.scale);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);}
  this.mesh.instanceMatrix.needsUpdate=true;
  if(this.inspect){this.output??=document.body.appendChild(Object.assign(document.createElement('output'),{id:'fishMetrics',hidden:true}));this.output.dataset.metrics=JSON.stringify({count:this.records.length,center:{x:px,z:pz},heading:angle,avoidance:{...this.avoid},visible:this.mesh.visible,trianglesPerFish:this.mesh.geometry.index.count/3});}
 }
}
