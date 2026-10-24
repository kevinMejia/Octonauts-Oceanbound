import * as T from 'three';
import {letterOutlines} from './letterOutlines.js';

function texture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
 const glow=ctx.createRadialGradient(64,64,0,64,64,64);glow.addColorStop(0,'rgba(255,255,255,1)');glow.addColorStop(.16,'rgba(255,255,255,.8)');glow.addColorStop(.5,'rgba(255,255,255,.25)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,128,128);
 if(kind==='star'){ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?8:58,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle='#fff4d9';ctx.fill();}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;
}
function path(contour,Shape){
 const shape=new Shape(),toward=(a,b)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]),t=Math.min(.025/d,.22);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
 contour.forEach((p,i)=>{const before=toward(p,contour[(i+contour.length-1)%contour.length]),after=toward(p,contour[(i+1)%contour.length]);i?shape.lineTo(...before):shape.moveTo(...before);shape.quadraticCurveTo(...p,...after);});shape.closePath();return shape;
}

// Shared vector geometry, two tiny generated textures, no lights or bloom pass.
export class LetterVisuals{
 constructor(config){this.config=config;this.geometries=new Map();this.references=new Map();this.haloMap=texture('halo');this.starMap=texture('star');}
 create(letter,index){
  const c=this.config,a=c.appearance;
  if(!this.geometries.has(letter)){
   const contours=letterOutlines[letter],shape=path(contours[0],T.Shape);for(const hole of contours.slice(1))shape.holes.push(path(hole,T.Path));
   const geometry=new T.ExtrudeGeometry(shape,{depth:a.extrusionDepth,steps:1,bevelEnabled:a.bevelEnabled,bevelThickness:.018,bevelSize:a.bevelSize,bevelSegments:2,curveSegments:4});geometry.translate(0,0,-a.extrusionDepth/2);geometry.scale(c.height,c.height,c.height);geometry.computeBoundingBox();const box=geometry.boundingBox;geometry.translate(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,0);geometry.computeVertexNormals();geometry.computeBoundingBox();
   const positions=geometry.attributes.position,colors=new Float32Array(positions.count*3),width=geometry.boundingBox.max.x,height=geometry.boundingBox.max.y;
   for(let i=0;i<positions.count;i++){const x=positions.getX(i)/width,y=positions.getY(i)/height,shade=.79+.27*Math.max(0,1-Math.hypot(x*.8,y*.75));colors[i*3]=colors[i*3+1]=colors[i*3+2]=shade;}
   geometry.setAttribute('color',new T.BufferAttribute(colors,3));this.geometries.set(letter,geometry);
  }
  this.references.set(letter,(this.references.get(letter)??0)+1);
  const color=new T.Color(c.colors[index%c.colors.length]),side=color.clone().multiplyScalar(.48),root=new T.Group();
  const face=new T.MeshStandardMaterial({color,vertexColors:true,emissive:color,emissiveIntensity:a.emissiveIntensity,metalness:0,roughness:.32}),sides=new T.MeshStandardMaterial({color:side,emissive:side,emissiveIntensity:.12,metalness:0,roughness:.38});
  const body=new T.Mesh(this.geometries.get(letter),[face,sides]);root.add(body);
  const outline=new T.Mesh(body.geometry,new T.MeshBasicMaterial({color:a.darkOutline,side:T.BackSide,toneMapped:false}));outline.scale.set(1.035,1.025,1.06);root.add(outline);
  const halo=new T.Sprite(new T.SpriteMaterial({map:this.haloMap,color,transparent:true,opacity:a.glowIntensity,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));halo.scale.setScalar(c.haloSize);halo.visible=a.glowEnabled;root.add(halo);
  const positions=new Float32Array(c.sparkleCount*3),colors=new Float32Array(c.sparkleCount*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const sparkles=new T.Points(geometry,new T.PointsMaterial({map:this.starMap,vertexColors:true,size:c.sparkleSize,transparent:true,opacity:1,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));sparkles.frustumCulled=false;sparkles.visible=c.particles.enabled;root.add(sparkles);root.userData.letterVisual={letter,halo,sparkles,color,disposed:false};return root;
 }
 animate(root,time,phase){
  const {halo,sparkles,color}=root.userData.letterVisual,c=this.config;halo.material.opacity=c.appearance.glowIntensity*(.85+.15*Math.sin(time*1.9+phase));
  const positions=sparkles.geometry.attributes.position,colors=sparkles.geometry.attributes.color;
  for(let i=0;i<positions.count;i++){
   const orbit=c.particles.orbitEnabled&&i<c.particles.orbitCount,a=(orbit?time*(.22+i%3*.05):0)+i*2.39996+phase,r=1.5+(i%4)*.25;
   positions.setXYZ(i,Math.cos(a)*r,Math.sin(a*1.3+i)*2.1+(orbit?0:Math.sin(time*.6+i)*.12),Math.sin(a)*.8);
   const intensity=.35+.65*Math.pow(.5+.5*Math.sin(time*(2+i%3)+i*1.7),3),warm=i%3===0;
   colors.setXYZ(i,(warm?1:color.r)*intensity,(warm?.91:color.g)*intensity,(warm?.75:color.b)*intensity);
  }
  positions.needsUpdate=true;colors.needsUpdate=true;
 }
 release(root){
  const v=root.userData.letterVisual;if(v.disposed)return;v.disposed=true;root.visible=false;root.removeFromParent();
  for(const child of root.children){for(const material of Array.isArray(child.material)?child.material:[child.material])material.dispose();}
  v.sparkles.geometry.dispose();const count=this.references.get(v.letter)-1;this.references.set(v.letter,count);if(!count){this.geometries.get(v.letter).dispose();this.geometries.delete(v.letter);}
 }
 dispose(){for(const geometry of this.geometries.values())geometry.dispose();this.geometries.clear();this.references.clear();this.haloMap.dispose();this.starMap.dispose();}
}
