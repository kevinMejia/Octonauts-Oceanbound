import * as T from 'three';
// Fixed, reusable low-poly tube. End rings always match the actual attachment points.
export class TowRope{
 constructor(scene,config){
  this.config=config;this.segments=config.ropeSegments;this.sides=6;this.positions=new Float32Array((this.segments+1)*this.sides*3);const indices=[];
  for(let i=0;i<this.segments;i++)for(let j=0;j<this.sides;j++){const a=i*this.sides+j,b=i*this.sides+(j+1)%this.sides;indices.push(a,b,a+this.sides,b,b+this.sides,a+this.sides);}
  this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));this.geometry.setIndex(indices);this.material=new T.MeshBasicMaterial({color:0xffd27b});this.mesh=new T.Mesh(this.geometry,this.material);this.mesh.name='Rescue towing rope';this.mesh.frustumCulled=false;this.mesh.visible=false;scene.add(this.mesh);
 }
 update(a,b,time,speed,ground){
  const c=this.config,dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,n=Math.hypot(dx,dy,dz)||1,horizontal=Math.hypot(dx,dz),ux=horizontal?dz/horizontal:1,uz=horizontal?-dx/horizontal:0,tx=dx/n,ty=dy/n,tz=dz/n,vx=ty*uz,vy=tz*ux-tx*uz,vz=-ty*ux,taut=Math.min(1,Math.abs(speed)/10),r=c.ropeThickness;
  for(let i=0;i<=this.segments;i++){const t=i/this.segments,envelope=Math.sin(Math.PI*t),wave=Math.sin(time*1.6+t*4)*c.lateralSway*.3*envelope,x=a.x+dx*t+ux*wave,z=a.z+dz*t+uz*wave;
   let y=a.y+dy*t-c.ropeSag*(1-taut*.9)*envelope;if(i&&i<this.segments)y=Math.max(y,ground(x,z)+.08);
   for(let j=0;j<this.sides;j++){const angle=j*Math.PI*2/this.sides,cs=Math.cos(angle)*r,sn=Math.sin(angle)*r,k=(i*this.sides+j)*3;this.positions[k]=x+ux*cs+vx*sn;this.positions[k+1]=y+vy*sn;this.positions[k+2]=z+uz*cs+vz*sn;}
  }
  this.geometry.attributes.position.needsUpdate=true;this.mesh.visible=true;
 }
 hide(){this.mesh.visible=false;}
 dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
