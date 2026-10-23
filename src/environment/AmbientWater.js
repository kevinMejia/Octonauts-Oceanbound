import * as T from 'three';
import {waterConfig as config} from '../config/waterConfig.js';
import {worldConfig} from '../config/worldConfig.js';
import {random} from './terrainMath.js';
const vertex=`attribute vec3 waterSeed;uniform vec2 sizeRange;uniform float time,extent,driftSpeed,opacity,pointScale,surface;varying float vAlpha;varying vec3 vColor;
#include <fog_pars_vertex>
void main(){vec3 drift=vec3(sin(time*.17+waterSeed.x)*.6,cos(time*.13+waterSeed.y)*.5,sin(time*.11+waterSeed.z)*.6)*driftSpeed/.035;
vec3 relative=mod(position+drift-cameraPosition+extent,extent*2.)-extent;vec3 world=cameraPosition+relative;float distance=length(relative);
float edge=1.-smoothstep(extent*.65,extent*.98,distance);float nearFade=smoothstep(.8,2.,distance);float waterDepth=max(0.,surface-world.y);
vAlpha=opacity*edge*nearFade*(.65+.35*waterSeed.y)*exp(-waterDepth*.009)*step(world.y,surface-.2);vColor=mix(vec3(.32,.72,.76),vec3(.8,.94,.96),waterSeed.z)*(.78+.22*sin(world.x*.055+world.z*.04+time*.12));
vec4 mvPosition=viewMatrix*vec4(world,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=clamp(mix(sizeRange.x,sizeRange.y,waterSeed.x)*2.*pointScale/max(.1,-mvPosition.z),1.,4.);
#include <fog_vertex>
}`;
const fragment=`varying float vAlpha;varying vec3 vColor;
#include <fog_pars_fragment>
void main(){float alpha=(1.-smoothstep(.2,1.,length(gl_PointCoord*2.-1.)))*vAlpha;if(alpha<.002)discard;gl_FragColor=vec4(vColor,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`;
export class AmbientWater{
 constructor(scene,low=false){const c=config.ambient,count=Math.floor((low?c.lowParticles:c.maxParticles)*Math.max(0,Math.min(1,c.density))),positions=new Float32Array(count*3),seeds=new Float32Array(count*3),rng=random(123);for(let i=0;i<count*3;i++){positions[i]=(rng()-.5)*c.renderDistance*2;seeds[i]=rng();}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('waterSeed',new T.BufferAttribute(seeds,3));this.material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{sizeRange:{value:new T.Vector2(c.minSize,c.maxSize)},time:{value:0},extent:{value:c.renderDistance},driftSpeed:{value:c.driftSpeed},opacity:{value:c.opacity},pointScale:{value:500},surface:{value:worldConfig.surface},fogColor:{value:scene.fog.color.clone()},fogDensity:{value:scene.fog.density}},fog:true,transparent:true,depthWrite:false});this.points=new T.Points(geometry,this.material);this.points.name='Streaming suspended water particles';this.points.frustumCulled=false;this.points.visible=c.enabled&&count>0;scene.add(this.points);this.count=count;
 }
 update(time,camera,pixelRatio){this.material.uniforms.time.value=time;this.material.uniforms.pointScale.value=camera.projectionMatrix.elements[5]*innerHeight*pixelRatio/2;}
}
