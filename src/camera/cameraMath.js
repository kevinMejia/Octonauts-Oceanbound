export const recenterAngle=(angle,rate,dt)=>Math.atan2(Math.sin(angle),Math.cos(angle))*Math.exp(-Math.max(0,dt)*rate);
export const smoothFactor=(rate,dt)=>1-Math.exp(-Math.max(0,rate)*Math.max(0,dt));
export function speedFraming(speed,c){const t=Math.max(0,Math.min(1,(Math.abs(speed)-c.speedStart)/(c.speedFull-c.speedStart)));return t*t*(3-2*t);}
export function aspectDistance(aspect,c){return Math.max(1,Math.min(c.portraitDistanceMax,Math.sqrt(1.45/Math.max(.25,aspect))));}
// Sphere sweep against oriented expanded ellipsoids; no decorative mesh rays.
// Ignore proxies containing the pivot: pulling inward would deepen penetration.
export function ellipsoidEntry(a,b,c,radius=0){
 const co=Math.cos(c.angle??0),si=Math.sin(c.angle??0),dx=a.x-c.x,dz=a.z-c.z;
 const rx=c.rx+radius,ry=c.ry+radius,rz=c.rz+radius;
 const x=(co*dx-si*dz)/rx,y=(a.y-c.y)/ry,z=(si*dx+co*dz)/rz;
 const wx=b.x-a.x,wz=b.z-a.z,u=(co*wx-si*wz)/rx,v=(b.y-a.y)/ry,w=(si*wx+co*wz)/rz;
 const A=u*u+v*v+w*w,B=2*(x*u+y*v+z*w),C=x*x+y*y+z*z-1;
 if(C<=0||A<1e-12)return 1;const d=B*B-4*A*C;if(d<0)return 1;
 const t=(-B-Math.sqrt(d))/(2*A);return t>=0&&t<=1?t:1;
}
export function terrainEntry(a,b,heightAt,c){
 const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),steps=Math.min(c.maxTerrainSamples,Math.max(1,Math.ceil(length/c.terrainSampleSpacing)));
 let previous=0;
 for(let i=1;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
  if(y<heightAt(x,z)+c.terrainClearance){let lo=previous,hi=t;for(let n=0;n<7;n++){const m=(lo+hi)/2;if(a.y+(b.y-a.y)*m<heightAt(a.x+(b.x-a.x)*m,a.z+(b.z-a.z)*m)+c.terrainClearance)hi=m;else lo=m;}return lo;}
  previous=t;
 }return 1;
}
