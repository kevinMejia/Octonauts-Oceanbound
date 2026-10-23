import * as T from 'three';
import {worldConfig as world} from '../config/worldConfig.js';
import {environmentConfig as config} from '../config/environmentConfig.js';
import {heightAt,noise} from './terrainMath.js';
function texture(name,color=false){const t=new T.TextureLoader().load(new URL('../../assets/textures/'+name,import.meta.url).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=4;return t;}
export class OceanTerrain{
 constructor(scene,profile=config.profiles.high){
  this.chunks=[];this.profile=profile;
  const material=this.material=new T.MeshStandardMaterial({map:texture('sand-color.jpg',true),normalMap:texture('sand-normal.png'),normalScale:new T.Vector2(config.sandRippleScale,config.sandRippleScale),roughnessMap:texture('sand-roughness.png'),roughness:1,vertexColors:true});
  const white=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;this.occlusion=white;this.caustic=texture('caustics.png');
  material.onBeforeCompile=s=>{
   s.uniforms.uReefOcclusion={value:this.occlusion};s.uniforms.uOceanTime={value:0};s.uniforms.uCausticMap={value:this.caustic};s.uniforms.uCausticStrength={value:config.causticStrength};this.shader=s;
   s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSandWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSandWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
   s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSandWorld;uniform float uOceanTime;uniform sampler2D uReefOcclusion;uniform sampler2D uCausticMap;uniform float uCausticStrength;');
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float grain=fract(sin(dot(vSandWorld.xz,vec2(127.1,311.7)))*43758.5453);
    diffuseColor.rgb*=.965+grain*.07;
    diffuseColor.rgb*=.57+.43*texture2D(uReefOcclusion,vSandWorld.xz/1600.+.5).r;
   `).replace('#include <opaque_fragment>',`float a=texture2D(uCausticMap,vSandWorld.xz*.075+vec2(sin(vSandWorld.z*.22+uOceanTime*.18),cos(vSandWorld.x*.19-uOceanTime*.13))*.06+vec2(uOceanTime*.007,-uOceanTime*.004)).r;
    float b=texture2D(uCausticMap,vSandWorld.xz*.087+vec2(cos(vSandWorld.z*.17-uOceanTime*.14),sin(vSandWorld.x*.24+uOceanTime*.12))*.05+vec2(-uOceanTime*.005,uOceanTime*.006)).r;
    float caustic=(a*.65+b*.35)*uCausticStrength;
    outgoingLight+=diffuseColor.rgb*vec3(1.,1.,.77)*caustic;
    #include <opaque_fragment>`);
  };
  const width=config.terrainChunkSize,segments=profile.terrainSegments;
  for(let z=-world.size/2;z<world.size/2;z+=width)for(let x=-world.size/2;x<world.size/2;x+=width){
   const g=new T.PlaneGeometry(width,width,segments,segments);g.rotateX(-Math.PI/2);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,colors=[];const col=new T.Color();
   for(let i=0;i<p.count;i++){const wx=p.getX(i)+x+width/2,wz=p.getZ(i)+z+width/2;p.setY(i,heightAt(wx,wz));uv.setXY(i,wx/8,wz/8);const normal=new T.Vector3(heightAt(wx-.2,wz)-heightAt(wx+.2,wz),.4,heightAt(wx,wz-.2)-heightAt(wx,wz+.2)).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);const variation=.83+noise(wx/18,wz/18)*.17;col.setRGB(variation,variation,variation*.98);colors.push(col.r,col.g,col.b);}
   g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();const mesh=new T.Mesh(g,material);mesh.position.set(x+width/2,0,z+width/2);mesh.receiveShadow=true;scene.add(mesh);this.chunks.push(mesh);
  }
 }
 setOcclusion(texture){this.occlusion=texture;if(this.shader)this.shader.uniforms.uReefOcclusion.value=texture;}
 update(time,position){if(this.shader)this.shader.uniforms.uOceanTime.value=time;if(position)for(const c of this.chunks)c.visible=Math.hypot(c.position.x-position.x,c.position.z-position.z)<this.profile.drawDistance+75;}
}
