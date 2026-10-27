import * as T from 'three';
import {mergeGeometries} from '../../vendor/BufferGeometryUtils.js';
import {reefStoneTextures} from './reefTextures.js';
import {reefOverpassLayout} from './reefOverpassLayout.js';
import {reefOverpassConfig as config,overpassEnabled} from '../config/reefOverpassConfig.js';
// Static contours match the existing ellipsoid proxies; shallow grooves stay visual.
export class ReefOverpass{
 constructor(scene,surfaces,coralSource){
  this.surfaces=surfaces;this.colliders=[];if(!overpassEnabled())return;
  this.layout=reefOverpassLayout(surfaces);if(!this.layout){console.warn('Reef overpass: no safe placement');return;}
  const pieces=[];this.colliders=this.layout.rocks;
  for(const [i,r] of this.colliders.entries()){
   const g=new T.SphereGeometry(1,24,16),a=g.attributes.position,colors=[];
   for(let j=0;j<a.count;j++){const px=a.getX(j),py=a.getY(j),pz=a.getZ(j),groove=1-.025*Math.pow(.5+.5*Math.sin(py*32+i+px*3),12),tint=.84+.12*Math.sin(py*23+i)+.035*Math.sin(px*17+pz*9);a.setXYZ(j,px*groove,py*groove,pz*groove);colors.push(tint*.8,tint*.87,tint);}
   g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.scale(r.rx,r.ry,r.rz);g.rotateY(r.angle);g.translate(r.x,r.y,r.z);pieces.push(g);surfaces.add(r);
  }
  const textures=reefStoneTextures();this.geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());this.material=new T.MeshStandardMaterial({map:textures.color,normalMap:textures.normal,normalScale:new T.Vector2(.5,.5),vertexColors:true,roughness:.91});
  this.mesh=new T.Mesh(this.geometry,this.material);this.mesh.name='Single natural reef overpass';this.mesh.receiveShadow=true;scene.add(this.mesh);
  // One static instance batch, shared geometry/material, varied shapes and colors.
  this.coralMaterial=coralSource.mat.clone();this.coralMaterial.vertexColors=false;this.coralMaterial.color.setHex(0xffffff);this.coral=new T.InstancedMesh(coralSource.geo,this.coralMaterial,24);this.coral.name='Overpass ledge coral';const dummy=new T.Object3D(),color=new T.Color(),palette=[0xf085a9,0xffb94a,0x9c69dc,0x45c7bf,0xe46462];
  for(let i=0;i<24;i++){const r=this.colliders[i%(this.colliders.length-2)],a=i*2.399,rad=.25+.38*((i*7%11)/11),dx=Math.cos(a)*r.rx*rad,dz=Math.sin(a)*r.rz*rad;dummy.position.set(r.x+dx,r.y+r.ry*Math.sqrt(1-rad*rad)-.12,r.z+dz);dummy.rotation.set(i*.17,a,0);dummy.scale.set(1+(i%3)*.3,1.1+(i%4)*.4,1+(i%2)*.35);dummy.updateMatrix();this.coral.setMatrixAt(i,dummy.matrix);this.coral.setColorAt(i,color.setHex(palette[i%5]));}this.coral.computeBoundingSphere();scene.add(this.coral);
 }
 update(position){if(!this.mesh)return;const visible=Math.hypot(position.x-this.layout.x,position.z-this.layout.z)<Math.min(config.renderDistance,this.distance??config.renderDistance)+config.footprint;this.mesh.visible=this.coral.visible=visible;}
 dispose(){for(const c of this.colliders){this.surfaces.grid.remove(c);this.surfaces.count--;this.surfaces.solidCount--;}this.colliders=[];for(const mesh of [this.mesh,this.coral])mesh?.removeFromParent();for(const resource of [this.geometry,this.material,this.coralGeometry,this.coralMaterial])resource?.dispose();this.mesh=this.coral=null;}
}
