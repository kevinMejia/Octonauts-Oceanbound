import * as T from 'three';
import {letterOutlines} from './letterOutlines.js';

function texture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
 const glow=ctx.createRadialGradient(64,64,0,64,64,64);glow.addColorStop(0,'rgba(205,255,255,1)');glow.addColorStop(.16,'rgba(95,245,255,.8)');glow.addColorStop(.5,'rgba(25,210,255,.25)');glow.addColorStop(1,'rgba(0,170,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,128,128);
 if(kind==='star'){ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?8:58,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle='#eaffff';ctx.fill();}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;
}
function path(contour,Shape){
 const shape=new Shape(),toward=(a,b)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]),t=Math.min(.025/d,.22);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
 contour.forEach((p,i)=>{const before=toward(p,contour[(i+contour.length-1)%contour.length]),after=toward(p,contour[(i+1)%contour.length]);i?shape.lineTo(...before):shape.moveTo(...before);shape.quadraticCurveTo(...p,...after);});shape.closePath();return shape;
}

// Shared vector geometry, two tiny generated textures, no lights or bloom pass.
export class LetterVisuals{
 constructor(config){this.config=config;this.geometries=new Map();this.haloMap=texture('halo');this.starMap=texture('star');this.face=new T.MeshStandardMaterial({color:'#d3ffff',emissive:'#48d9ed',emissiveIntensity:config.emissiveIntensity,metalness:.2,roughness:.28});this.sides=['#05a9ca','#ffb844','#ff779b'].map(color=>new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.3,metalness:.35,roughness:.3}));}
 create(letter,index){
  if(!this.geometries.has(letter)){const contours=letterOutlines[letter],shape=path(contours[0],T.Shape);for(const hole of contours.slice(1))shape.holes.push(path(hole,T.Path));const geometry=new T.ExtrudeGeometry(shape,{depth:.12,steps:1,bevelEnabled:true,bevelThickness:.018,bevelSize:.012,bevelSegments:2,curveSegments:4});geometry.translate(0,0,-.06);geometry.scale(this.config.height,this.config.height,this.config.height);geometry.computeVertexNormals();this.geometries.set(letter,geometry);}
  const root=new T.Group(),body=new T.Mesh(this.geometries.get(letter),[this.face,this.sides[index%this.sides.length]]);root.add(body);
  const halo=new T.Sprite(new T.SpriteMaterial({map:this.haloMap,color:'#36e5ff',transparent:true,opacity:.3,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));halo.scale.setScalar(this.config.haloSize);root.add(halo);
  const positions=new Float32Array(this.config.sparkleCount*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));const sparkles=new T.Points(geometry,new T.PointsMaterial({map:this.starMap,color:'#eaffff',size:this.config.sparkleSize,transparent:true,opacity:1,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));sparkles.frustumCulled=false;root.add(sparkles);root.userData.letterVisual={halo,sparkles};return root;
 }
 animate(root,time,phase){const {halo,sparkles}=root.userData.letterVisual;halo.material.opacity=.24+Math.sin(time*1.9+phase)*.07;const positions=sparkles.geometry.attributes.position;for(let i=0;i<positions.count;i++){const a=time*(.22+i%3*.05)+i*2.39996+phase,r=1.5+(i%4)*.3;positions.setXYZ(i,Math.cos(a)*r,Math.sin(a*1.3+i)*2.2,Math.sin(a)*.8);}positions.needsUpdate=true;sparkles.material.opacity=.65+.3*Math.sin(time*3+phase);}
}
