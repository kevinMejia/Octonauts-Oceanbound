import * as T from 'three';
import {random} from './terrainMath.js';
import {worldConfig} from '../config/worldConfig.js';
import {environmentConfig} from '../config/environmentConfig.js';
export function atmosphere(scene,profile=environmentConfig.profiles.high){
 scene.background=new T.Color('#087a9e');scene.fog=new T.FogExp2('#087a9e',.0072);
 scene.add(new T.HemisphereLight(0xb1e8ec,0x465b55,.85));
 const sun=new T.DirectionalLight(0xfff0d0,3.2);sun.position.set(-42,62,-25);sun.target.position.set(0,0,0);scene.add(sun,sun.target);
 sun.castShadow=profile===environmentConfig.profiles.high;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:150});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;sun.shadow.radius=3;
 // A sky dome suggests the bright surface above and blue absorption at depth.
 const dome=new T.Mesh(new T.SphereGeometry(440,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vDirection;uniform float time;void main(){vec3 d=normalize(vDirection);float up=smoothstep(-.25,.9,d.y);vec3 color=mix(vec3(.015,.18,.30),vec3(.06,.58,.69),up);float sun=pow(max(0.,dot(d,normalize(vec3(-.4,.9,-.25)))),25.);color+=vec3(.32,.48,.43)*sun;gl_FragColor=vec4(color,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')}));dome.renderOrder=-10;scene.add(dome);
 const loader=new T.TextureLoader(),caustic=loader.load(new URL('../../assets/textures/caustics.png',import.meta.url).href);caustic.wrapS=caustic.wrapT=T.RepeatWrapping;
 const surface=new T.Mesh(new T.PlaneGeometry(worldConfig.size,worldConfig.size),new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{time:{value:0},pattern:{value:caustic}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform sampler2D pattern;void main(){vec2 uv=vUv*55.;uv+=vec2(sin(uv.y*.6+time*.13),cos(uv.x*.5-time*.1))*.13;float a=texture2D(pattern,uv+vec2(time*.009,-time*.007)).r;gl_FragColor=vec4(vec3(.3,.8,.9),a*.22);}` }));surface.rotation.x=-Math.PI/2;surface.position.y=worldConfig.surface+.2;scene.add(surface);
 const rng=random(123),p=[];for(let i=0;i<profile.particles;i++)p.push((rng()-.5)*150,rng()*48,(rng()-.5)*150);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));const points=new T.Points(g,new T.PointsMaterial({color:0xc8fff1,size:.045,transparent:true,opacity:.3,depthWrite:false}));scene.add(points);
 points.updateAtmosphere=(time,position)=>{dome.position.set(position.x,12,position.z);surface.material.uniforms.time.value=time;sun.position.set(position.x-42,62,position.z-25);sun.target.position.set(position.x,0,position.z);sun.target.updateMatrixWorld();};
 return points;
}
