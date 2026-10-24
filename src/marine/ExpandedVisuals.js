import * as T from 'three';

// Shared per encounter; no textures, downloads, or per-frame geometry changes.
export function createExpandedVisual(d,options={}){
 const shared=options.shared??new Map(),variant=options.variant??0,own=!options.shared;
 const resource=(key,make)=>{if(!shared.has(key))shared.set(key,make());return shared.get(key);};
 const group=new T.Group(),kind=d.visual.type,parts={};
 const sphere=resource('sphere',()=>new T.SphereGeometry(1,14,9));
 const mat=(color,transparent=false)=>resource('material:'+color+transparent,()=>new T.MeshStandardMaterial({color,roughness:.7,flatShading:true,side:T.DoubleSide,...(transparent?{transparent:true,opacity:.48,depthWrite:false,emissive:color,emissiveIntensity:.22}: {})}));
 const colors={hammerhead:0x7397a5,seahorse:[0xf5b940,0xf18e48,0xe8be59][variant%3],jellyfish:[0x9995e9,0x6dcde3,0xe6a2d9][variant%3],'eagle-ray':0x284b65,moray:0x849952,pufferfish:0xf2c65d,humpback:0x354f66};
 const skin=mat(colors[kind]),light=mat(0xdce8dc),white=mat(0xf0ffff),dark=mat(0x172c38);
 const ell=(parent,m,x,y,z,sx,sy,sz)=>{const mesh=new T.Mesh(sphere,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;};
 const fin=(parent,points,m=skin)=>{const key='fin:'+JSON.stringify(points);const geometry=resource(key,()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();return g;});const mesh=new T.Mesh(geometry,m);parent.add(mesh);return mesh;};
 const tube=(parent,points,r,end=r,m=skin)=>{const key='tube:'+JSON.stringify(points)+r+','+end;const geometry=resource(key,()=>{
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),g=new T.TubeGeometry(curve,20,r,6,false),positions=g.attributes.position,center=new T.Vector3();
  for(let i=0;i<=20;i++){curve.getPointAt(i/20,center);const ratio=(r+(end-r)*i/20)/r;for(let j=0;j<=6;j++){const index=i*7+j;positions.setXYZ(index,center.x+(positions.getX(index)-center.x)*ratio,center.y+(positions.getY(index)-center.y)*ratio,center.z+(positions.getZ(index)-center.z)*ratio);}}g.computeVertexNormals();return g;
 });const mesh=new T.Mesh(geometry,m);parent.add(mesh);return mesh;};
 const eyes=(x,y,z,r=.13)=>{for(const sign of [-1,1]){ell(group,white,sign*x,y,z,r,r,r);ell(group,dark,sign*x,y,z+r*.75,r*.55,r*.6,r*.45);}};
 const pivot=(name,x=0,y=0,z=0,parent=group)=>{const node=new T.Group();node.position.set(x,y,z);parent.add(node);parts[name]=node;return node;};
 if(kind==='hammerhead'||kind==='humpback'){
  const whale=kind==='humpback',length=whale?3.6:2.25,width=whale?1:.52;
  ell(group,skin,0,0,0,width,whale?.85:.57,length);ell(group,light,0,-(whale?.44:.3),.3,width*.85,whale?.35:.25,length*.87);
  if(whale){ell(group,skin,0,.1,2.1,.95,.66,1.8);ell(group,skin,0,.63,-.65,.45,.37,.8);eyes(.76,.25,3.05,.1);
   // Three simple ventral grooves read well at normal camera distance.
   for(const x of [-.3,0,.3])tube(group,[[x,-.65,2.7],[x,-.79,1.3],[x,-.62,0]],.025,.018,dark);
  }else{ell(group,skin,0,.05,1.8,1.45,.28,.43);for(const sign of [-1,1])ell(group,skin,sign*1.18,.04,1.85,.35,.3,.48);eyes(1.38,.14,2.05,.14);}
  fin(group,[[0,.4,.15],[0,whale?1.05:1.75,-.7],[0,.45,-1.35]]);
  for(const sign of [-1,1]){const f=pivot('fin'+sign,sign*width*.65,-.15,.9);fin(f,[[0,0,0],[sign*(whale?3.6:1.6),-.25,whale?-1.7:-.95],[sign*.3,-.15,-1.25]],whale?light:skin);}
  const tail=pivot('tail',0,0,-length*.85);tube(tail,[[0,0,.15],[0,0,-.5],[0,0,-1.2]],whale?.42:.27,.12);
  for(const sign of [-1,1])if(whale)fin(tail,[[0,0,-.9],[sign*1.65,.03,-1.7],[sign*.75,0,-2.15],[0,0,-.9],[sign*.75,0,-2.15],[0,0,-1.7]]);
  else fin(tail,[[0,0,-.65],[0,sign*(sign>0?1.45:1),-1.85],[0,sign*.15,-1.25]]);
 }else if(kind==='seahorse'){
  ell(group,skin,0,.1,0,.43,.7,.32);ell(group,light,0,.1,.21,.29,.5,.16);
  tube(group,[[0,.35,0],[0,.95,-.12],[0,1.38,.1],[0,1.32,.38]],.23,.17);
  ell(group,skin,0,1.32,.28,.25,.29,.32);tube(group,[[0,1.3,.45],[0,1.16,.73],[0,1.17,1.03]],.14,.095);eyes(.22,1.42,.45,.115);
  tube(group,[[0,-.38,0],[0,-.95,-.15],[0,-1.45,.15],[0,-1.38,.65],[0,-1.04,.64],[0,-1.02,.37]],.17,.055);
  const dorsal=pivot('dorsal',0,.2,-.3);fin(dorsal,[[0,.45,0],[0,.25,-.4],[0,-.4,-.05]],light);
  fin(group,[[0,.78,-.1],[0,1.15,-.4],[0,1.5,.02]]);
 }else if(kind==='jellyfish'){
  const bell=pivot('bell');const geometry=resource('bell',()=>new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2));const mesh=new T.Mesh(geometry,mat(colors[kind],true));mesh.scale.set(1,.85,1);bell.add(mesh);
  ell(bell,mat(0xded5f8,true),0,.18,0,.72,.22,.72);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,node=pivot('tentacle'+i,Math.cos(a)*.65,.02,Math.sin(a)*.65);tube(node,[[0,0,0],[.12,-.7,0],[-.12,-1.35,.1],[.08,-2.15-i%2*.3,.05]],.045,.025,mat(colors[kind]));}
 }else if(kind==='eagle-ray'){
  ell(group,skin,0,0,0,.72,.24,1.25);ell(group,light,0,-.12,0,.65,.12,1.1);ell(group,skin,0,.03,1.2,.27,.15,.55);eyes(.38,.18,.95,.12);
  for(const sign of [-1,1]){const wing=pivot('wing'+sign);const points=[[sign*.45,0,.95],[sign*3.1,0,-.5],[sign*.55,0,-1.1]];fin(wing,points);fin(wing,points.map(([x,y,z])=>[x,y-.025,z]),light);
   const spots=new T.InstancedMesh(sphere,white,15),dummy=new T.Object3D();let n=0;for(let row=0;row<5;row++)for(let j=0;j<3;j++){dummy.position.set(sign*(.65+row*.33),.04,-.2+(j-1)*(.48-row*.06));dummy.scale.set(.06,.025,.065);dummy.updateMatrix();spots.setMatrixAt(n++,dummy.matrix);}wing.add(spots);
  }tube(group,[[0,0,-.9],[0,0,-2.3],[.12,.05,-4.2]],.06,.018);
 }else if(kind==='moray'){
  const body=pivot('body');tube(body,[[0,0,.7],[.1,-.05,0],[-.35,-.12,-1.1],[.25,-.2,-2.1],[.7,-.22,-3.2]],.34,.045);
  const head=pivot('head',0,0,.7,body);ell(head,skin,0,.04,.25,.32,.32,.7);
  const jaw=pivot('jaw',0,-.12,.05,head);ell(jaw,light,0,-.08,.45,.25,.13,.55);ell(head,dark,0,-.13,.7,.25,.035,.29);
  // Eyes belong to the moving head.
  for(const sign of [-1,1]){ell(head,white,sign*.23,.18,.57,.1,.1,.1);ell(head,dark,sign*.25,.18,.63,.055,.06,.06);}
 }else if(kind==='pufferfish'){
  const body=pivot('body');ell(body,skin,0,0,0,.8,.76,.86);ell(body,light,0,-.32,.18,.65,.45,.63);eyes(.34,.27,.72,.22);ell(group,dark,0,-.06,.87,.105,.09,.07);
  const spikes=new T.InstancedMesh(resource('spike',()=>new T.ConeGeometry(.065,.22,4)),light,24),dummy=new T.Object3D(),up=new T.Vector3(0,1,0),normal=new T.Vector3();
  for(let i=0;i<24;i++){const y=1-2*(i+.5)/24,a=i*2.39996,r=Math.sqrt(1-y*y);normal.set(Math.cos(a)*r,y,Math.sin(a)*r);dummy.position.copy(normal).multiplyScalar(.83);dummy.quaternion.setFromUnitVectors(up,normal);dummy.updateMatrix();spikes.setMatrixAt(i,dummy.matrix);}body.add(spikes);
  for(const sign of [-1,1]){const f=pivot('fin'+sign,sign*.7,-.02,0);fin(f,[[0,.2,0],[sign*.55,0,-.1],[0,-.2,-.3]],light);}
  fin(group,[[0,0,-.7],[-.38,.15,-1.25],[.38,.15,-1.25]]);
 }
 group.scale.setScalar(d.scale??1);
 return {group,animate(time){const wave=Math.sin(time*1.6);
  if(kind==='hammerhead'||kind==='humpback'){parts.tail.rotation[kind==='humpback'?'x':'y']=Math.sin(time*(kind==='humpback'?.8:1.7))*.2;for(const sign of [-1,1])parts['fin'+sign].rotation.z=sign*wave*.035;}
  else if(kind==='seahorse')parts.dorsal.rotation.y=Math.sin(time*18)*.18;
  else if(kind==='jellyfish'){parts.bell.scale.set(1+wave*.09,1-wave*.1,1+wave*.09);for(let i=0;i<7;i++)parts['tentacle'+i].rotation.z=Math.sin(time*1.3+i*.7)*.1;}
  else if(kind==='eagle-ray')for(const sign of [-1,1])parts['wing'+sign].rotation.z=sign*Math.sin(time*1.5)*.23;
  else if(kind==='moray'){parts.body.rotation.y=wave*.14;parts.head.rotation.y=Math.sin(time*.7)*.05;parts.jaw.rotation.x=.08+(1+Math.sin(time*.9))*.08;}
  else{for(const sign of [-1,1])parts['fin'+sign].rotation.y=Math.sin(time*6)*.15;const phase=time%16,puff=phase>13?Math.sin((phase-13)/3*Math.PI)*.12:0;parts.body.scale.setScalar(1+puff);}
 },dispose(){group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});if(own){for(const value of shared.values())value.dispose?.();shared.clear();}}};
}
