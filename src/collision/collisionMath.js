import {submarineConfig} from '../config/submarineConfig.js';
import {heightAt} from '../environment/terrainMath.js';

// YXZ, matching GupB.group.rotation. Reused frame also drives debug geometry.
export function hullFrame(sub,out){
 const y=sub.heading,p=sub.pitch||0,b=sub.bank||0,cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p),cb=Math.cos(b),sb=Math.sin(b);
 out.xx=cy*cb+sy*sp*sb;out.xy=cp*sb;out.xz=-sy*cb+cy*sp*sb;
 out.yx=-cy*sb+sy*sp*cb;out.yy=cp*cb;out.yz=sy*sb+cy*sp*cb;
 out.zx=sy*cp;out.zy=-sp;out.zz=cy*cp;
 return out;
}
export function hullFloor(sub,x=sub.position.x,z=sub.position.z,ground=heightAt){
 const c=sub.collisionProxy,r=c?.radius??2.2,l=c?.halfLength??3,clearance=c?.terrainClearance??submarineConfig.minTerrainClearance;
 const sy=Math.sin(sub.heading),cy=Math.cos(sub.heading),pitch=Math.sin(sub.pitch||0)*l,bank=Math.sin(sub.bank||0)*r;
 // Centre, bow, stern and both sides; account for tilted lower hull on dunes.
 return Math.max(ground(x,z),ground(x+sy*l,z+cy*l)+pitch,ground(x-sy*l,z-cy*l)-pitch,
  ground(x+cy*r,z-sy*r)-bank,ground(x-cy*r,z+sy*r)+bank)+clearance;
}
// Shared ellipsoid sweep, expanded by the oriented hull lobe's support extents.
// Returns t, penetration distance and a surface normal in caller-owned storage.
export function sweepHull(a,dx,dy,dz,obstacle,frame,radius,halfHeight,offset,out,centerY=0,halfDepth=radius){
 const co=obstacle.co??Math.cos(obstacle.angle||0),si=obstacle.si??Math.sin(obstacle.angle||0);
 const rx=obstacle.rx+hullSupport(frame,radius,halfHeight,co,0,-si,halfDepth),ry=obstacle.ry+hullSupport(frame,radius,halfHeight,0,1,0,halfDepth),rz=obstacle.rz+hullSupport(frame,radius,halfHeight,si,0,co,halfDepth);
 const ax=a.x+frame.zx*offset+frame.yx*centerY-obstacle.x,ay=a.y+frame.zy*offset+frame.yy*centerY-obstacle.y,az=a.z+frame.zz*offset+frame.yz*centerY-obstacle.z;
 let x=(co*ax-si*az)/rx,y=ay/ry,z=(si*ax+co*az)/rz;
 const u=(co*dx-si*dz)/rx,v=dy/ry,w=(si*dx+co*dz)/rz,A=u*u+v*v+w*w,B=x*u+y*v+z*w,C=x*x+y*y+z*z-1;
 let t=0,depth=0;
 if(C<-.000001){
  // Recover overlapping spawns / larger vehicle switches along the local gradient.
  if(x*x+y*y+z*z<1e-12){x=1;y=z=0;}
  const q=Math.sqrt(x*x+y*y+z*z);depth=(1-q)*Math.min(rx,ry,rz)+.002;
 }else{
  if(A<1e-14||B>=0)return false;
  const disc=B*B-A*C;if(disc<0)return false;t=(-B-Math.sqrt(disc))/A;
  if(t<-.00001||t>1)return false;t=Math.max(0,t);x+=u*t;y+=v*t;z+=w*t;
 }
 let nx=co*x/rx+si*z/rz,ny=y/ry,nz=-si*x/rx+co*z/rz;const n=Math.hypot(nx,ny,nz)||1;
 nx/=n;ny/=n;nz/=n;out.t=t;out.depth=depth;out.nx=nx;out.ny=ny;out.nz=nz;return true;
}

function hullSupport(frame,radius,halfHeight,x,y,z,halfDepth){return Math.sqrt(radius*radius*(x*frame.xx+y*frame.xy+z*frame.xz)**2+halfDepth*halfDepth*(x*frame.zx+y*frame.zy+z*frame.zz)**2+halfHeight*halfHeight*(x*frame.yx+y*frame.yy+z*frame.yz)**2);}
