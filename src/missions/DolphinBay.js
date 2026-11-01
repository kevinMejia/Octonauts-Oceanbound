import * as T from 'three';
import {mergeGeometries} from '../../vendor/BufferGeometryUtils.js';
import {random} from '../environment/terrainMath.js';
import {applyWaterCaustics} from '../environment/waterCaustics.js';
import {dolphinRescueConfig as defaults} from '../config/dolphinRescueConfig.js';

// Small, palette-colored compound meshes match the existing procedural marine art.
// Each type is merged once, then instanced per spatial chunk. No decorative physics.
function litterGeometry(kind){
 const parts=[],dummy=new T.Object3D();
 const part=(g,color,p=[0,0,0],s=[1,1,1],r=[0,0,0])=>{g=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(...r);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);const col=new T.Color(color),colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=col.r;colors[i+1]=col.g;colors[i+2]=col.b;}g.setAttribute('color',new T.BufferAttribute(colors,3));parts.push(g);};
 const box=(color,p,s,r)=>part(new T.BoxGeometry(1,1,1),color,p,s,r);
 if(kind==='box'){
  box(0xaa815a,[0,0,0],[1.65,1.5,1.4]);box(0xd1ae77,[0,.77,0],[1.7,.06,1.5]);box(0x8a6547,[0,0,.712],[.12,1.4,.025]);box(0xead0a1,[.3,.2,.72],[.6,.3,.025]);
 }else if(kind==='crate'){
  box(0x634932,[0,0,0],[1.8,1.6,1.6]);for(const x of [-.75,.75])for(const z of [-.85,.85])box(0xc19b5f,[x,0,z],[.16,1.85,.15]);for(const y of [-.6,0,.6])for(const z of [-.88,.88])box(0xb18a50,[0,y,z],[1.85,.27,.13]);box(0xd1ae74,[0,0,.98],[.16,2.1,.1],[0,0,-.85]);
 }else if(kind==='bottle'){
  part(new T.CylinderGeometry(.32,.4,1.25,8),0x5fa99b,[0,-.1,0]);part(new T.CylinderGeometry(.17,.32,.35,8),0x7abdb0,[0,.7,0]);part(new T.CylinderGeometry(.16,.16,.3,8),0xc4d8b3,[0,1,0]);part(new T.CylinderGeometry(.41,.41,.42,8),0xd2d8c0,[0,-.05,0]);
 }else if(kind==='container'){
  box(0x83b7b2,[0,0,0],[1.8,1.4,1.3]);box(0xc3d8c6,[0,.76,0],[1.95,.16,1.45]);box(0xcac99d,[0,0,.66],[1,.6,.03]);part(new T.TorusGeometry(.28,.08,4,8),0x4f8e8f,[.55,.95,0]);
 }else if(kind==='tire'){
  part(new T.TorusGeometry(.9,.35,6,12),0x34454b);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(0x4a5c60,[Math.cos(a)*1.1,Math.sin(a)*1.1,0],[.2,.14,.74],[0,0,a]);}
 }else if(kind==='boot'){
  box(0x637575,[0,.3,-.1],[.65,1.5,.7],[.1,0,.05]);box(0x4c6263,[0,-.45,.3],[.7,.45,1.4]);box(0x293f49,[0,-.72,.3],[.75,.14,1.45]);
 }else if(kind==='can'){
  part(new T.CylinderGeometry(.48,.48,1,8),0xa8b4a8);for(const y of [-.48,.48])part(new T.TorusGeometry(.47,.05,4,8),0xd1d4b9,[0,y,0],[1,1,1],[Math.PI/2,0,0]);part(new T.CylinderGeometry(.486,.486,.45,8),0x9d6554);
 }else if(kind==='net'){
  for(let i=-3;i<=3;i++){box(0x708b75,[i*.4,0,0],[.035,.05,2.6]);box(0x708b75,[0,0,i*.4],[2.6,.05,.035]);}for(const x of [-1.35,1.35])box(0x9d9b6a,[x,0,0],[.09,.1,2.8]);
 }else if(kind==='rope'){
  for(let i=0;i<3;i++)part(new T.TorusGeometry(.7+i*.15,.065,4,14),0xb5a47a,[0,i*.08,0],[1,1,1],[Math.PI/2,.15,0]);
 }else if(kind==='planks'){
  for(let i=0;i<4;i++)box(i%2?0x8e7752:0xb9a075,[(i-1.5)*.32,i*.1,0],[.28,.17,2.6-i*.3],[0,(i-1.5)*.25,0]);
 }else{box(0xb8bfaa,[0,0,0],[1.7,1.5,1]);box(0x637e81,[0,.15,.52],[1.3,.85,.08]);for(const x of [-.4,.4])part(new T.CylinderGeometry(.15,.15,.1,8),0xdfcc87,[x,-.5,.58],[1,1,1],[Math.PI/2,0,0]);}
 const result=mergeGeometries(parts);for(const g of parts)g.dispose();result.computeBoundingSphere();return result;
}
export class DolphinBay{
 constructor(game,config=defaults){
  this.config=config;this.group=new T.Group();this.group.name='Dolphin Rescue polluted bay';this.chunks=[];this.geometries=new Map();const c=config,e=c.environment,low=game.quality==='low',rng=random(c.seed),dummy=new T.Object3D(),color=new T.Color();
  this.material=new T.MeshStandardMaterial({vertexColors:true,roughness:.88,flatShading:true});applyWaterCaustics(this.material,.6,low);
  const kinds=['box','crate','bottle','container','tire','boot','can','net','rope','planks','household'];for(const kind of kinds)this.geometries.set(kind,litterGeometry(kind));
  const floor=new T.PlaneGeometry(160,c.route.length+400,1,1);floor.rotateX(-Math.PI/2);const positions=floor.attributes.position,uv=floor.attributes.uv,colors=[];for(let i=0;i<positions.count;i++){uv.setXY(i,positions.getX(i)/12,positions.getZ(i)/12);colors.push(.85,.86,.8);}floor.setAttribute('color',new T.Float32BufferAttribute(colors,3));this.floor=new T.Mesh(floor,game.terrain.material);this.floor.position.z=c.route.startZ+c.route.length/2;this.floor.receiveShadow=true;this.group.add(this.floor);
  this.coreGeometry=new T.IcosahedronGeometry(1,1);this.coreMaterial=new T.MeshStandardMaterial({color:0x63766b,roughness:1,flatShading:true});
  const count=e.itemsPerChunk[game.quality],end=c.route.startZ+c.route.length-c.route.cleanDistance;
  for(let z=c.route.startZ-90;z<end;z+=e.chunkLength){
   const chunk=new T.Group();chunk.position.z=z;chunk.name='Static rubbish banks';this.group.add(chunk);this.chunks.push(chunk);
   const fading=Math.min(1,(end-z)/45),records=new Map(kinds.map(k=>[k,[]]));
   for(const side of [-1,1]){
    // Large irregular cores fill the pile volume; recognizable objects cover it.
    for(let i=0;i<4;i++){const core=new T.Mesh(this.coreGeometry,this.coreMaterial);core.position.set(side*(e.bankStart+9+rng()*5),3+rng()*2,i*10);core.scale.set(9+rng()*5,(6+rng()*4)*fading,7+rng()*6);core.rotation.set(rng()*.2,rng(),rng()*.2);chunk.add(core);}
    for(let i=0;i<count;i++){
     const x=e.bankStart+rng()*e.bankWidth,edge=Math.min(1,(x-e.bankStart+3)/8),height=(1-Math.abs((x-e.bankStart)/e.bankWidth-.4))*(e.bankHeight-2)*edge*fading;
     const floating=i<e.floatingPerChunk,kind=kinds[Math.floor(rng()*kinds.length)];
     dummy.position.set(side*x,floating?7+rng()*14:.4+rng()*height,rng()*e.chunkLength);dummy.rotation.set(rng()*2,rng()*Math.PI*2,rng()*1.8);const scale=.65+rng()*1.7;dummy.scale.set(scale*(.8+rng()*.5),scale*(.8+rng()*.5),scale*(.8+rng()*.5));dummy.updateMatrix();records.get(kind).push({matrix:dummy.matrix.clone(),tint:.72+rng()*.4});
    }
   }
   for(const [kind,items] of records){const mesh=new T.InstancedMesh(this.geometries.get(kind),this.material,items.length);mesh.name='Decorative '+kind;for(const [i,item] of items.entries()){mesh.setMatrixAt(i,item.matrix);color.setScalar(item.tint);mesh.setColorAt(i,color);}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();chunk.add(mesh);}
  }
  // Sparse clean-water kelp silhouettes frame the release area, no obstacles.
  this.kelpMaterial=new T.MeshStandardMaterial({color:0x4c9b80,roughness:1});this.kelpGeometry=new T.ConeGeometry(1,6,5);for(let i=0;i<24;i++){const kelp=new T.Mesh(this.kelpGeometry,this.kelpMaterial);kelp.position.set((i%2?1:-1)*(14+rng()*18),2,c.route.startZ+c.route.length-c.route.cleanDistance+15+rng()*150);kelp.scale.set(.6+rng(),.5+rng(),.6+rng());this.group.add(kelp);}
 }
 obstacle(kind){return new T.Mesh(this.geometries.get(kind),this.material);}
 update(z){for(const chunk of this.chunks)chunk.visible=Math.abs(chunk.position.z-z)<this.config.environment.drawDistance;}
 dispose(){this.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});for(const g of this.geometries.values())g.dispose();this.floor.geometry.dispose();this.coreGeometry.dispose();this.kelpGeometry.dispose();this.material.dispose();this.coreMaterial.dispose();this.kelpMaterial.dispose();this.group.removeFromParent();}
}
