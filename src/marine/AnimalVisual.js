import * as T from 'three';

// All procedural meshes face +Z. Gameplay only sees group/animate/dispose.
export async function createAnimalVisual(definition){
 if(definition.visual?.source==='glb'){
  const {vehicleLoader}=await import('../vehicles/VehicleTextures.js');
  const gltf=await vehicleLoader().loadAsync(definition.visual.modelPath??definition.modelPath);
  const group=new T.Group();group.add(gltf.scene);group.scale.setScalar(definition.scale??1);
  const r=definition.orientation??{};gltf.scene.rotation.set(r.x??0,r.y??0,r.z??0);
  const mixer=new T.AnimationMixer(gltf.scene),clip=gltf.animations.find(a=>a.name===definition.animation?.clip)??gltf.animations[0];
  if(clip)mixer.clipAction(clip).setEffectiveTimeScale(definition.animation?.speed??1).play();
  return {group,animate:(time,dt)=>mixer.update(dt),dispose(){mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);dispose(group);}};
 }
 const kind=definition.visual.type,group=new T.Group(),moving=[];
 const sphere=new T.SphereGeometry(1,16,10);
 const material=color=>new T.MeshStandardMaterial({color,roughness:.72,flatShading:true,side:T.DoubleSide});
 const skin=material(kind==='octopus'?0xef854c:kind==='dolphin'?0x79a9bb:kind==='whale-shark'?0x386b85:0x234b6b),belly=material(0xd5e9e6),white=material(0xf2ffff),black=material(0x102a38);
 const ellipsoid=(parent,mat,x,y,z,sx,sy,sz)=>{const mesh=new T.Mesh(sphere,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;};
 const fin=(parent,points,mat=skin)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();const m=new T.Mesh(g,mat);parent.add(m);return m;};
 const eye=(x,y,z,r=.16)=>{ellipsoid(group,white,x,y,z,r,r,r);ellipsoid(group,black,x,y,z+r*.8,r*.52,r*.62,r*.4);};
 if(kind==='octopus'){
  ellipsoid(group,skin,0,.65,0,1.05,1.22,.95);ellipsoid(group,skin,0,-.1,0,1.05,.5,1);
  eye(-.43,.65,.83,.25);eye(.43,.65,.83,.25);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,arm=new T.Group();arm.rotation.y=a;group.add(arm);
   const curve=new T.CatmullRomCurve3([new T.Vector3(.65,-.15,0),new T.Vector3(1.15,-.65,0),new T.Vector3(1.9,-.7,.12),new T.Vector3(2.2,-.35,.3)]);
   arm.add(new T.Mesh(new T.TubeGeometry(curve,10,.15,5,false),skin));moving.push(arm);
  }
 }else if(kind==='manta'){
  ellipsoid(group,skin,0,0,0,1.15,.3,1.7);ellipsoid(group,belly,0,-.16,.05,.95,.15,1.4);
  for(const side of [-1,1]){const wing=new T.Group();group.add(wing);
   fin(wing,[[side*.65,0,1.25],[side*4.4,0,-.3],[side*.8,0,-1.5]]);
   fin(wing,[[side*.65,-.035,1.25],[side*4.4,-.035,-.3],[side*.8,-.035,-1.5]],belly);moving.push(wing);
   const horn=ellipsoid(group,skin,side*.6,0,1.65,.15,.13,.6);horn.rotation.y=-side*.25;
  }
  ellipsoid(group,skin,0,-.02,-2.6,.055,.055,1.9);eye(-.7,.18,1.2,.13);eye(.7,.18,1.2,.13);
 }else{
  const shark=kind==='whale-shark',length=shark?3.3:2.1;
  ellipsoid(group,skin,0,0,0,shark?1.1:.62,shark?.8:.65,length);
  ellipsoid(group,belly,0,-(shark?.44:.32),.25,shark?.9:.5,shark?.3:.28,length*.86);
  if(shark){ellipsoid(group,skin,0,.03,2.15,1.12,.48,1.2);ellipsoid(group,black,0,-.12,3.18,.73,.055,.035);}
  else{ellipsoid(group,skin,0,-.12,2.03,.28,.2,.8);ellipsoid(group,skin,0,.12,1.36,.52,.5,.65);}
  fin(group,[[0,.4,.3],[0,shark?1.8:1.5,-.5],[0,.4,-1.15]]);
  for(const side of [-1,1])fin(group,[[side*.4,-.15,1],[side*(shark?2.5:1.55),-.5,-.7],[side*.45,-.25,-.7]]);
  const tail=new T.Group();tail.position.z=-length*.88;group.add(tail);moving.push(tail);
  ellipsoid(tail,skin,0,0,-.45,shark?.4:.22,shark?.4:.2,.85);
  if(shark){fin(tail,[[0,0,-.6],[0,1.65,-1.8],[0,.18,-1.3]]);fin(tail,[[0,0,-.6],[0,-1.1,-1.65],[0,-.12,-1.3]]);}
  else for(const side of [-1,1])fin(tail,[[0,0,-.65],[side*1.2,.02,-1.3],[side*.15,0,-1.5]]);
  eye(-(shark?.83:.42),.24,shark?2.7:1.75,shark?.13:.15);eye(shark?.83:.42,.24,shark?2.7:1.75,shark?.13:.15);
  if(shark){const spots=new T.InstancedMesh(sphere,white,52),dummy=new T.Object3D();let i=0;
   for(let row=0;row<4;row++)for(let col=0;col<13;col++){const z=-2.45+col*.4,x=(row-1.5)*.43,y=.8*Math.sqrt(Math.max(.05,1-(x/1.1)**2-(z/3.3)**2))+.035;dummy.position.set(x,y,z);dummy.scale.set(.085,.035,.09);dummy.updateMatrix();spots.setMatrixAt(i++,dummy.matrix);}group.add(spots);}
 }
 group.scale.setScalar(definition.scale??1);
 return {group,animate(time){
  for(let i=0;i<moving.length;i++){const m=moving[i];if(kind==='octopus')m.rotation.z=Math.sin(time*1.5+i*.8)*.1;
   else if(kind==='manta')m.rotation.z=Math.sin(time*1.6)*.2*(i===0?1:-1);
   else if(kind==='dolphin')m.rotation.x=Math.sin(time*3)*.18;
   else m.rotation.y=Math.sin(time*1.3)*.17;}
 },dispose:()=>dispose(group)};
}
function dispose(group){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const item of [...geometries,...materials,...textures])item.dispose();}
