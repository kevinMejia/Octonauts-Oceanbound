import * as T from 'three';
import {waterConfig} from '../config/waterConfig.js';
import {worldConfig} from '../config/worldConfig.js';

// Camera-facing light ribbons: one draw call, no shadow map or render target.
export class SunRays{
 constructor(scene,low=false){
  const config=waterConfig.sunRays,count=config.enabled?(low?config.lowCount:config.count):0;
  const plane=new T.PlaneGeometry(1,1,1,8),geometry=new T.InstancedBufferGeometry();geometry.setIndex(plane.index);geometry.setAttribute('position',plane.attributes.position);geometry.setAttribute('uv',plane.attributes.uv);plane.dispose();
  const anchors=[[-55,-55,4.5,.2],[5,-40,6.5,1.4],[55,-15,4,2.8],[-25,25,5,3.7],[40,55,7,4.5],[-60,70,4.5,5.8]];
  geometry.setAttribute('ray',new T.InstancedBufferAttribute(new Float32Array(anchors.slice(0,count).flat()),4));geometry.instanceCount=count;
  this.material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,forceSinglePass:true,blending:T.AdditiveBlending,uniforms:{time:{value:0},origin:{value:new T.Vector2()},surface:{value:worldConfig.surface},intensity:{value:low?config.lowIntensity:config.intensity},fogDensity:{value:scene.fog?.density??.0054}},
   vertexShader:`attribute vec4 ray;uniform float time,surface;uniform vec2 origin;varying vec2 vUv;varying float vDepth,vDistance,vPhase;
   void main(){vUv=uv;vPhase=ray.w;vec2 anchor=mod(ray.xy-origin+100.,200.)-100.+origin;
    vec3 direction=normalize(vec3(42.,-78.,-40.)),top=vec3(anchor.x,surface,anchor.y),center=top+direction*24.;
    vec3 side=cross(direction,normalize(cameraPosition-center));side/=max(length(side),.001);
    float width=ray.z*(1.+uv.y*.5);vec3 world=top+direction*(uv.y*48.)+side*((uv.x-.5)*width+sin(time*.14+ray.w+uv.y*3.)*.5);
    vec4 view=modelViewMatrix*vec4(world,1.);vDepth=-view.z;vDistance=length(center.xz-origin);gl_Position=projectionMatrix*view;
   }`,
   fragmentShader:`uniform float time,intensity,fogDensity;varying vec2 vUv;varying float vDepth,vDistance,vPhase;
   void main(){float edge=pow(max(0.,1.-abs(vUv.x-.5)*2.),2.4);
    float ends=smoothstep(0.,.08,vUv.y)*(1.-smoothstep(.42,1.,vUv.y));
    float distanceFade=1.-smoothstep(68.,92.,vDistance);float nearFade=smoothstep(3.,12.,vDepth);
    float fog=exp(-fogDensity*fogDensity*vDepth*vDepth);float shimmer=.91+.09*sin(time*.3+vPhase+vUv.y*5.);
    float alpha=edge*ends*distanceFade*nearFade*fog*intensity*shimmer;if(alpha<.001)discard;
    gl_FragColor=vec4(vec3(.57,.88,.81),alpha);
    #include <colorspace_fragment>
   }`});
  this.mesh=new T.Mesh(geometry,this.material);this.mesh.name='Soft underwater sun rays';this.mesh.frustumCulled=false;this.mesh.renderOrder=1;this.mesh.visible=count>0;scene.add(this.mesh);
 }
 update(time,position,fogDensity){this.material.uniforms.time.value=time;this.material.uniforms.origin.value.set(position.x,position.z);this.material.uniforms.fogDensity.value=fogDensity;}
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();}
}
