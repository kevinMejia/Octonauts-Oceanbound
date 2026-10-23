import * as T from 'three';
// Developer opt-in: ?collisionDebug. Nearby shapes only; one bounded instanced draw.
export class CollisionDebug{
 constructor(scene,world){
  this.world=world;this.near=[];this.capacity=192;this.dummy=new T.Object3D();this.color=new T.Color();
  this.mesh=new T.InstancedMesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({wireframe:true,depthTest:false,transparent:true,opacity:.65}),this.capacity+3);
  this.mesh.name='Nearby collision proxies (developer only)';this.mesh.frustumCulled=false;this.mesh.renderOrder=100;scene.add(this.mesh);
  this.output=document.body.appendChild(Object.assign(document.createElement('output'),{id:'collisionMetrics'}));
  this.output.style.cssText='position:absolute;top:120px;left:16px;max-width:65vw;padding:8px;border-radius:8px;background:#002e48cc;color:white;font:11px monospace;pointer-events:none';this.next=0;
 }
 update(sub){
  this.world.grid.query(sub.position.x,sub.position.z,18,this.near,'solid');
  let n=0;for(const s of this.near){if(!s.solid||n>=this.capacity||Math.abs(s.y-sub.position.y)>18+s.ry)continue;this.dummy.position.set(s.x,s.y,s.z);this.dummy.rotation.set(0,s.angle,0);this.dummy.scale.set(s.rx,s.ry,s.rz);this.dummy.updateMatrix();this.mesh.setMatrixAt(n,this.dummy.matrix);this.color.set(s.surface==='coral'?'#ff79d5':s.surface==='octopod'?'#7bbfff':'#ffbd67');this.mesh.setColorAt(n++,this.color);}
  const c=sub.collisionProxy,r=c?.radius??2.2,h=c?.halfHeight??1.1,l=Math.max(0,(c?.halfLength??3)-r),f=this.world.frame;
  for(let i=-1;i<=1;i++){
   this.dummy.position.set(sub.position.x+(f.zx??0)*l*i+(f.yx??0)*(c?.centerY??0),sub.position.y+(f.zy??0)*l*i+(f.yy??1)*(c?.centerY??0),sub.position.z+(f.zz??1)*l*i+(f.yz??0)*(c?.centerY??0));this.dummy.rotation.set(sub.pitch,sub.heading,sub.bank,'YXZ');this.dummy.scale.set(r,h,r);this.dummy.updateMatrix();this.mesh.setMatrixAt(n,this.dummy.matrix);this.mesh.setColorAt(n++,this.color.set('#83ff8d'));
  }
  this.mesh.count=n;this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor.needsUpdate=true;
  if(performance.now()>this.next){this.next=performance.now()+250;const m=this.world.metrics;this.output.textContent=`COLLISION  ${m.solids}/${m.registered} solid/total | ${m.candidates} nearby | ${m.tests} tests | ${m.ms.toFixed(3)} ms`;this.output.dataset.metrics=JSON.stringify(m);}
 }
}
