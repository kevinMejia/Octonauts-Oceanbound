// CPU translation of Abyssal Garden W_DENS, with JS noise helpers from its source.
import {MESAS,ARCHES,fbm} from '../../vendor/abyssal-garden/procedural.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ss=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*t;
const smax=(a,b,k)=>Math.max(a,b)+Math.pow(Math.max(k-Math.abs(a-b),0)/k,2)*k*.25,smin=(a,b,k)=>-smax(-a,-b,k);
const seg=(x,y,z,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/Math.max(dx*dx+dy*dy+dz*dz,.0001),0,1);return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t,z-a[2]-dz*t);};
const CLEARS=[[0,-45,0,35,22,10],[0,-86,0,-86,46,12],[42,24,74,6,22,10],[72,-26,72,-26,26,10],[-60,-36,-60,36,13,8],[-60,42,-18,46,12,8],[4,58,8,100,24,10],[-34,-74,-56,-46,11,8]];
export function density(x,y,z){
 const wx=fbm(x*.04+11,y*.04+11,z*.04+11,3)-.5,wy=fbm(x*.04+47,y*.04+47,z*.04+47,3)-.5,wz=fbm(x*.04+83,y*.04+83,z*.04+83,3)-.5,qx=x+wx*15,qz=z+wz*15;
 const g0=-45.5+7*(fbm(qx*.011,qz*.011,3,4)-.5)+1.6*(fbm(qx*.07,qz*.07,9,3)-.5),tn=3*(fbm(qx*.09,qz*.09,2,3)-.5);let dm=-1000,de=1000;
 for(const m of MESAS){const yr=clamp((y-g0)/(m[5]-g0),0,1.3);let e=seg(qx,0,qz,[m[0],0,m[1]],[m[2],0,m[3]])-m[4];e-=m[6]*ss(.3,.92,yr)+3*(1-yr)**2-m[7]*ss(0,.5,yr)*(1-ss(.5,1,yr));dm=smax(dm,smin(-e,m[5]+tn-y,3),2.5);de=Math.min(de,e);}
 let clr=0;for(const m of CLEARS)clr=Math.max(clr,1-ss(0,m[5],seg(qx,0,qz,[m[0],0,m[1]],[m[2],0,m[3]])-m[4]));
 const ring=ss(156,172,Math.hypot(x,z)+wx*14),plat=Math.max(ss(.5,.565,fbm(qx*.0125,qz*.0125,1.7,4))*(1-clr),ring),th=g0+plat*mix(26+17*fbm(qx*.03,qz*.03,5,2),60,ring);let d=smax(g0+4.5*ss(10,0,de)-y,dm,3);d=smax(d,(th-y)*.7,3);
 for(const a of ARCHES){const rx=x+wx*3-a[0],ry=(y+wy*3-a[1])/a[6],rz=z+wz*3-a[2],cs=Math.cos(a[3]),sn=Math.sin(a[3]);d=smax(d,a[5]-Math.hypot(Math.hypot(cs*rx+sn*rz,ry)-a[4],-sn*rx+cs*rz),1.5);}
 // Fine Worley erosion is omitted at the 2m bake resolution; openings remain carved.
 d+=(.5+ .5*ss(.5,5,y-g0))*(fbm(x*.3,y*.3,z*.3,3)-.5)*2.2;
 for(const h of [[19,-21,-23,2.5,19,-21,-7],[9,-37,108,4.2,9,-34,136]])d=smin(d,seg(x+wx*2,y+wy*2,z+wz*2,h.slice(0,3),h.slice(4))-h[3],2);
 return Math.min(d,3-y);
}
