import * as T from 'three';
import {heightAt} from './terrainMath.js';
import {worldConfig} from '../config/worldConfig.js';

// One merged animal and one draw; flipper animation runs in the vertex shader.
function turtleGeometry(){
 const positions=[],colors=[],weights=[],indices=[];
 const part=(geometry,color,weight=0)=>{const start=positions.length/3,p=geometry.attributes.position;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));colors.push(...(typeof color==='function'?color(p.getX(i),p.getY(i),p.getZ(i)):color));weights.push(weight);}for(const i of geometry.index.array)indices.push(start+i);geometry.dispose();};
 const ellipsoid=(x,y,z,sx,sy,sz,color)=>{const g=new T.SphereGeometry(1,20,12);g.scale(sx,sy,sz);g.translate(x,y,z);part(g,color);};
 // Domed carapace, pale plastron and patterned scutes, with a clear shell rim.
 ellipsoid(0,0,0,1.03,.24,1.36,[.43,.49,.22]);
 ellipsoid(0,.14,0,.96,.53,1.27,(x,y,z)=>{const a=Math.atan2(z/1.27,x/.96),r=Math.hypot(x/.96,z/1.27),seam=Math.abs(Math.sin(a*5))<.13||Math.abs(r-.6)<.055;return seam?[.24,.33,.13]:[.39+.07*Math.cos(a*3),.48+.04*Math.sin(a*2),.21];});
 ellipsoid(0,-.12,0,.88,.25,1.2,[.75,.73,.43]);
 ellipsoid(0,.06,1.36,.30,.25,.47,[.43,.58,.29]);
 ellipsoid(0,.13,1.72,.35,.28,.43,[.49,.63,.33]);
 for(const side of [-1,1]){ellipsoid(side*.28,.24,1.86,.075,.075,.07,[.055,.075,.045]);ellipsoid(side*.30,.26,1.89,.025,.025,.025,[.88,.95,.79]);}
 ellipsoid(0,-.03,-1.35,.10,.10,.32,[.42,.55,.27]);
 // Broad tapered front flippers and smaller rear paddles, each smooth and closed.
 for(const side of [-1,1])for(const rear of [false,true]){const g=new T.SphereGeometry(1,12,8),p=g.attributes.position;for(let i=0;i<p.count;i++){const u=(p.getX(i)+1)/2,reach=rear?.85:1.65;p.setXYZ(i,side*(.68+u*reach),-.02+p.getY(i)*.10*(1-u*.6), (rear?-.84:.68)-u*(rear?.55:.75)+p.getZ(i)*(rear?.30:.40)*(1-u*.65));}part(g,[.46,.59,.29],side*(rear?.55:1));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('flipper',new T.Float32BufferAttribute(weights,1));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export class SeaTurtle{
 constructor(scene){this.time={value:0};const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.72,envMapIntensity:.25});material.onBeforeCompile=s=>{s.uniforms.uTurtleTime=this.time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uTurtleTime; attribute float flipper;').replace('#include <begin_vertex>',`#include <begin_vertex>
 float stroke=sin(uTurtleTime*1.55);float reach=max(0.,abs(position.x)-.68);transformed.y+=abs(flipper)*reach*stroke*.38;transformed.z+=abs(flipper)*reach*cos(uTurtleTime*1.55)*.08;`);};material.customProgramCacheKey=()=> 'sea-turtle-flippers-v1';this.mesh=new T.Mesh(turtleGeometry(),material);this.mesh.name='Sea turtle';this.mesh.scale.setScalar(1.35);scene.add(this.mesh);this.y=null;}
 update(dt,time,groups,camera){this.time.value=time;let ax=181,az=168;if(Math.hypot(camera.position.x-ax,camera.position.z-az)>110){const g=groups[0];if(!g){this.mesh.visible=false;return;}ax=g.x;az=g.z;}const t=time*.065,x=ax+Math.sin(t)*10,z=az+Math.cos(t)*7,ground=heightAt(x,z),y=Math.min(worldConfig.surface-3,ground+6+Math.sin(time*.3)*.5);if(this.y===null||Math.abs(this.mesh.position.x-x)>50)this.y=y;this.y+=(y-this.y)*(1-Math.exp(-dt*2));this.mesh.position.set(x,Math.max(ground+2,this.y),z);this.mesh.rotation.set(Math.sin(time*.3)*.05,Math.atan2(Math.cos(t)*10,-Math.sin(t)*7),Math.sin(time*.4)*.05);this.mesh.visible=Math.hypot(camera.position.x-x,camera.position.z-z)<110;}
}
