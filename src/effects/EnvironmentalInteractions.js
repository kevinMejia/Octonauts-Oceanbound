import {particleLightTint} from '../environment/particleLighting.js';
import {uploadActivePrefix} from '../environment/bufferUpdates.js';
import {vegetationInteraction} from './vegetationInteraction.js';
import * as T from 'three';
import {mergeGeometries} from '../../vendor/BufferGeometryUtils.js';
import {interactionConfig as config} from '../config/interactionConfig.js';
import {heightAt,random} from '../environment/terrainMath.js';
import {sandResponse,ParticlePool,stepParticle,clamp} from './interactionMath.js';
import {InteractionSurfaces} from './InteractionSurfaces.js';
const vertex=`attribute vec4 cloud; attribute vec4 shade; attribute vec2 details;
varying vec2 vUv;varying vec4 vShade;varying float vSeed;varying float vHeight;
#include <fog_pars_vertex>
void main(){vUv=uv;vShade=shade;vSeed=details.x;vec3 center=instanceMatrix[3].xyz;
vec2 q=position.xy*cloud.x;float c=cos(cloud.y),s=sin(cloud.y);q=mat2(c,-s,s,c)*q;
vec3 world=center+cameraPosition*0.;world+=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0])*q.x+vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1])*q.y;
vHeight=world.y-details.y;vec4 mvPosition=viewMatrix*vec4(world,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const fragment=`uniform vec3 particleLightTint;uniform float time;varying vec2 vUv;varying vec4 vShade;varying float vSeed;varying float vHeight;
#include <fog_pars_fragment>
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
void main(){vec2 p=vUv*2.-1.;vec2 drift=vec2(time*.025,vSeed);float n=noise(p*2.8+drift)*.65+noise(p*6.3-drift)*.35;
float edge=1.-smoothstep(.23,.98,length(p)+(.5-n)*.35);float alpha=edge*(.32+.68*n)*vShade.a*smoothstep(0.,.25,vHeight);if(alpha<.002)discard;
gl_FragColor=vec4(vShade.rgb*particleLightTint,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`;
function branchGeometry(){const parts=[];for(const [x,y,a,len] of [[0,0,0,1],[.12,.13,-.8,.6],[-.1,.25,.65,.5]]){const g=new T.CylinderGeometry(.04,.08,len,5);g.rotateZ(a);g.translate(x,y,0);parts.push(g);}return mergeGeometries(parts);}
export {vertex as sedimentVertexShader,fragment as sedimentFragmentShader};
export class EnvironmentalInteractions{
 static async create(scene,quality,habitat,decor,base=[]){const proxies=await fetch(new URL('../../assets/models/reef-formations/interactions.json',import.meta.url).href).then(r=>{if(!r.ok)throw new Error('Interaction surfaces unavailable');return r.json();});return new EnvironmentalInteractions(scene,quality,new InteractionSurfaces(habitat,decor,proxies,base));}
 constructor(scene,quality,surfaces){this.inspect=new URLSearchParams(location.search).has('inspect');this.sorted=[];this.enabled=config.enabled&&!(new URLSearchParams(location.search).has('inspect')&&new URLSearchParams(location.search).get('effects')==='off');this.surfaces=surfaces;const low=(config.qualityLevel==='auto'?quality:config.qualityLevel)==='low';this.rng=random(7229);this.clouds=new ParticlePool(low?config.sediment.lowClouds:config.sediment.maxClouds);this.grains=new ParticlePool(low?config.sediment.lowParticles:config.sediment.maxParticles);this.fragments=new ParticlePool(low?config.debris.lowFragments:config.debris.maxFragments);this.dummy=new T.Object3D();this.color=new T.Color();this.time=0;this.emission=0;this.lastImpact=-10;this.lastReef=-10;this.touching=false;this.events={sand:0,rock:0,coral:0};this.bounds=new T.Box3();this.frustum=new T.Frustum();this.clip=new T.Matrix4();
 const geometry=new T.PlaneGeometry(1,1);geometry.setAttribute('cloud',new T.InstancedBufferAttribute(new Float32Array(this.clouds.items.length*4),4));geometry.setAttribute('shade',new T.InstancedBufferAttribute(new Float32Array(this.clouds.items.length*4),4));geometry.setAttribute('details',new T.InstancedBufferAttribute(new Float32Array(this.clouds.items.length*2),2));
 const material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{particleLightTint,time:{value:0},fogColor:{value:scene.fog.color.clone()},fogDensity:{value:scene.fog.density}},fog:true,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true});this.cloudMesh=new T.InstancedMesh(geometry,material,this.clouds.items.length);this.cloudMesh.name='Pooled seabed sediment';
 const make=(geo,count,name)=>{const m=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:0xffffff,roughness:.95}),count);m.name=name;m.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(m);m.count=0;m.frustumCulled=false;return m;};this.chips=make(new T.IcosahedronGeometry(1,0),this.fragments.items.length,'Pooled rock and coral chips');this.branches=make(branchGeometry(),this.fragments.items.length,'Pooled coral branches');this.sand=make(new T.IcosahedronGeometry(1,0),this.grains.items.length,'Pooled heavy sand grains');scene.add(this.cloudMesh);this.cloudMesh.frustumCulled=false;this.cloudMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.cloudMesh.count=0;
 this.ground=(x,z,y)=>this.surfaces.ground(x,z,y);
 }
 spawn(pool,x,y,z,size,life,vx,vy,vz,color,branch=false,surface='rock'){const p=pool.spawn();if(!p)return null;Object.assign(p,{x,y,z,size,life,age:0,vx,vy,vz,r:color[0],g:color[1],b:color[2],angle:this.rng()*6.28,spin:(this.rng()-.5)*(surface==='coral'?1.6:3),seed:this.rng()*40,branch,surface,settled:false,floor:heightAt(x,z),alpha:.2});return p;}
 cloud(x,y,z,strength,vx=0,vz=0,dust=false){strength=clamp(strength);const r=this.rng,a=r()*6.28,spread=.3+r()*.7,p=this.spawn(this.clouds,x,y,z,(dust?.45:.8)+strength*.6,config.sediment.cloudLifetime*(.75+r()*.4),Math.sin(a)*spread-vx*.08,.5+r()*.25,Math.cos(a)*spread-vz*.08,dust?[.32,.35,.3]:[.42,.32,.17]);if(p)p.alpha=(dust?.18:.60)*(.6+strength*.5);}
 burst(x,y,z,strength,vx,vz){this.events.sand++;for(let i=0;i<3+Math.floor(strength*6);i++){const a=this.rng()*6.28,r=this.rng()*(.6+strength);this.cloud(x+Math.sin(a)*r,y+.18,z+Math.cos(a)*r,strength,vx,vz);}for(let i=0;i<5+strength*12;i++){const a=this.rng()*6.28,v=.5+this.rng()*strength*2;this.spawn(this.grains,x,y+.2,z,.018+this.rng()*.025,2+this.rng()*2,Math.sin(a)*v,.3+this.rng()*.7,Math.cos(a)*v,[.6,.5,.31]);}}
 reef(surface,x,y,z,nx,ny,nz,speed){const c=config.debris;if(!c.enabled||speed<c.collisionThreshold||this.time-this.lastReef<c.contactCooldown)return;this.lastReef=this.time;const coral=surface?.surface==='coral',strength=clamp(speed/10),count=Math.max(1,Math.round((coral?c.coralFragmentCount:c.rockFragmentCount)*strength));this.events[coral?'coral':'rock']++;for(let i=0;i<count;i++)this.spawn(this.fragments,x,y,z,(coral?.1:.08)+this.rng()*(coral?.18:.15),c.fragmentLifetime*(.8+this.rng()*.3),nx*(.3+strength)+(this.rng()-.5)*.8,Math.max(.1,ny*.5)+this.rng()*.4,nz*(.3+strength)+(this.rng()-.5)*.8,coral?surface.color:[.15,.21,.21],coral&&surface.branch,coral?'coral':'rock');this.cloud(x,y,z,strength,0,0,true);}
 update(dt,sub,collisionContact,camera){if(!this.enabled)return;this.time+=dt;vegetationInteraction.position.value.set(sub.position.x,sub.position.y,sub.position.z);vegetationInteraction.strength.value+=(clamp(Math.abs(sub.speed)/5)-vegetationInteraction.strength.value)*(1-Math.exp(-dt*5));const p=sub.position,vx=Math.sin(sub.heading)*sub.speed,vz=Math.cos(sub.heading)*sub.speed,speed=Math.abs(sub.speed),contact=sub.floorContact;
 const rockContact=collisionContact&&collisionContact.surface!=='sand'?collisionContact:null;
 if(contact&&config.sediment.enabled&&!rockContact){const response=sandResponse(contact.clearance,speed,contact.touching,contact.impact);if(contact.touching&&!this.touching&&(speed>.45||contact.impact>.65)&&this.time-this.lastImpact>.6){this.burst(p.x,contact.floor+.2,p.z,.15+response.burst,vx,vz);this.lastImpact=this.time;}
 const tracked=sub.groundController?.config;this.emission+=response.rate*(tracked?tracked.sediment*(1+Math.abs(sub.steer))*(sub.turbo.active?tracked.turboSediment:1):1)*dt;while(this.emission>=1){this.emission--;const back=Math.sign(sub.speed||1),x=p.x-Math.sin(sub.heading)*2.8*back+(tracked?(this.rng()>.5?1:-1)*tracked.trackSpacing/2:(this.rng()-.5)*1.3)*Math.cos(sub.heading),z=p.z-Math.cos(sub.heading)*2.8*back+(this.rng()-.5)*1.3;this.cloud(x,heightAt(x,z)+.45,z,speed/12,vx,vz);if(contact.touching)this.spawn(this.grains,x,heightAt(x,z)+.15,z,.025,2,(this.rng()-.5),.25,(this.rng()-.5),[.6,.5,.31]);}
 }else this.emission=0;this.touching=!!contact?.touching;
 if(rockContact?.fresh)this.reef(rockContact,rockContact.x,rockContact.y,rockContact.z,rockContact.nx,rockContact.ny,rockContact.nz,rockContact.impact);
 for(const pool of [this.clouds,this.grains,this.fragments])for(const item of pool.items){if(item.life>0&&Math.hypot(item.x-p.x,item.z-p.z)>config.renderDistance)item.life=0;stepParticle(item,dt,this.time,this.ground,pool===this.clouds,pool===this.grains);}
 this.render(camera);if(this.inspect){this.output??=document.body.appendChild(Object.assign(document.createElement('output'),{id:'interactionMetrics',hidden:true}));this.output.dataset.metrics=JSON.stringify({position:[p.x,p.y,p.z],heading:sub.heading,events:this.events,clouds:this.clouds.active,grains:this.grains.active,fragments:this.fragments.active,nearSurfaces:this.surfaces.near.length,clearance:contact?.clearance,touching:contact?.touching,coral:rockContact?.surface==='coral',rock:!!rockContact});}
 }
 render(camera){this.clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.clip);const g=this.cloudMesh.geometry,list=this.sorted;list.length=0;for(const p of this.clouds.items)if(p.life>0)list.push(p);list.sort((a,b)=>camera.position.distanceToSquared(b)-camera.position.distanceToSquared(a));this.bounds.makeEmpty();let n=0;
 for(const p of list){const age=p.age/p.life,size=p.size+p.age*config.sediment.cloudExpansion;this.dummy.position.set(p.x,p.y,p.z);this.dummy.updateMatrix();this.cloudMesh.setMatrixAt(n,this.dummy.matrix);g.attributes.cloud.setXYZW(n,size*2.6,p.angle,0,0);g.attributes.shade.setXYZW(n,p.r,p.g,p.b,p.alpha*Math.min(1,p.age*5)*(1-age)**1.4);g.attributes.details.setXY(n,p.seed,p.floor);this.bounds.expandByPoint(this.dummy.position);n++;}this.cloudMesh.count=n;uploadActivePrefix(this.cloudMesh.instanceMatrix,n);for(const name of ['cloud','shade','details'])uploadActivePrefix(g.attributes[name],n);this.cloudMesh.material.uniforms.time.value=this.time;this.cloudMesh.visible=n>0&&this.frustum.intersectsBox(this.bounds.expandByScalar(6));
 this.drawFragments(this.fragments,this.chips,false);this.drawFragments(this.fragments,this.branches,true);this.drawFragments(this.grains,this.sand,false);
 }
 drawFragments(pool,mesh,branch){let n=0;this.bounds.makeEmpty();for(const p of pool.items){if(p.life<=0||p.branch!==branch)continue;this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(p.angle,p.angle*.7,p.angle*.3);const fade=clamp((p.life-p.age)/.8);this.dummy.scale.set(p.size*fade,p.size*(branch?1.7:.65)*fade,p.size*fade);this.dummy.updateMatrix();mesh.setMatrixAt(n,this.dummy.matrix);this.color.setRGB(p.r,p.g,p.b);mesh.setColorAt(n++,this.color);this.bounds.expandByPoint(this.dummy.position);}mesh.count=n;mesh.visible=n>0&&this.frustum.intersectsBox(this.bounds.expandByScalar(1));uploadActivePrefix(mesh.instanceMatrix,n);if(mesh.instanceColor)uploadActivePrefix(mesh.instanceColor,n);}
}
