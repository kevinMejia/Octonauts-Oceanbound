import {collisionConfig as config} from '../config/collisionConfig.js';
import {heightAt} from '../environment/terrainMath.js';
import {hullFloor,hullFrame,sweepHull} from './collisionMath.js';

// A consumer of InteractionSurfaces' one static grid, never a second broad phase.
export class CollisionWorld{
 constructor(surfaces,ground=heightAt){
  this.surfaces=surfaces;this.grid=surfaces.grid;this.ground=ground;this.near=[];this.frame={};
  this.hit={};this.best={};this.separation=1;this.lastSurface=null;
  this.sand={surface:'sand',color:[.6,.5,.31]};
  this.contact={active:false,impact:0,x:0,y:0,z:0,nx:0,ny:0,nz:0,surface:'rock',parkedId:null,color:null,branch:false};
  this.metrics={registered:surfaces.count??0,solids:surfaces.solidCount??0,broadphase:0,candidates:0,tests:0,hits:0,ms:0};
 }
 record(sub,s,nx,ny,nz,impact,offset){
  const c=this.contact;if(c.active&&impact<=c.impact)return;
  c.active=true;c.impact=impact;c.nx=nx;c.ny=ny;c.nz=nz;c.surface=s.surface;c.parkedId=s.parkedId??null;c.color=s.color??this.sand.color;c.branch=!!s.branch;
  const hull=sub.collisionProxy,r=hull?.radius??2.2,h=hull?.halfHeight??1.1;
  const extent=Math.sqrt(r*r*(nx*nx+nz*nz)+h*h*ny*ny);
  const f=this.frame,centerY=s.surface==='sand'?0:hull?.centerY??0;
  c.x=sub.position.x+f.zx*offset+f.yx*centerY-nx*extent;c.y=sub.position.y+f.zy*offset+f.yy*centerY-ny*extent;c.z=sub.position.z+f.zz*offset+f.yz*centerY-nz*extent;
 }
 terrain(sub,dx,dy,dz,out){
  const p=sub.position,ground=this.ground;
  const startFloor=hullFloor(sub,p.x,p.z,ground);
  if(p.y<startFloor-.00001){out.t=0;out.depth=startFloor-p.y;out.nx=0;out.ny=1;out.nz=0;return true;}
  const steps=Math.min(config.maxTerrainSamples,Math.max(1,Math.ceil(Math.hypot(dx,dy,dz)/config.terrainSpacing)));
  let last=0;
  for(let i=1;i<=steps;i++){
   let t=i/steps;if(p.y+dy*t>=hullFloor(sub,p.x+dx*t,p.z+dz*t,ground)-.00001){last=t;continue;}
   let lo=last,hi=t;for(let j=0;j<9;j++){const m=(lo+hi)/2;if(p.y+dy*m<hullFloor(sub,p.x+dx*m,p.z+dz*m,ground))hi=m;else lo=m;}
   t=lo;const x=p.x+dx*t,z=p.z+dz*t,e=.1;
   let nx=-(hullFloor(sub,x+e,z,ground)-hullFloor(sub,x-e,z,ground))/(2*e),nz=-(hullFloor(sub,x,z+e,ground)-hullFloor(sub,x,z-e,ground))/(2*e);
   const n=Math.hypot(nx,1,nz);out.t=t;out.depth=0;out.nx=nx/n;out.ny=1/n;out.nz=nz/n;return true;
  }return false;
 }
 resolve(sub,dt){
  this.metrics.registered=this.surfaces.count;this.metrics.solids=this.surfaces.solidCount;
  const began=performance.now(),p=sub.position,start=sub.previousPosition,c=sub.collisionProxy,r=c?.radius??2.2,h=c?.halfHeight??1.1;
  const depth=Math.min(r,c?.halfLength??3),length=Math.max(0,(c?.halfLength??3)-depth),bound=Math.max(r+length,h),m=this.metrics;
  let dx=p.x-start.x,dy=p.y-start.y,dz=p.z-start.z;
  hullFrame(sub,this.frame);this.contact.active=false;this.contact.impact=0;m.tests=0;m.hits=0;
  this.grid.query((start.x+p.x)/2,(start.z+p.z)/2,Math.hypot(dx,dz)/2+bound+1,this.near,'solid');
  m.broadphase=this.near.length;let count=0;
  const low=Math.min(start.y,p.y)-bound,high=Math.max(start.y,p.y)+bound+(c?.centerY??0);
  for(const s of this.near)if(s.solid&&s.y+s.ry>=low&&s.y-s.ry<=high)this.near[count++]=s;
  this.near.length=count;m.candidates=count;
  p.x=start.x;p.y=start.y;p.z=start.z;
  const sy=Math.sin(sub.heading),cy=Math.cos(sub.heading),drift=sub.collisionDrift;
  let vx=sy*sub.speed+drift.x,vy=sub.vertical,vz=cy*sub.speed+drift.z;
  let slides=0,recoveries=0;
  while(slides<config.maxSlides&&recoveries<config.recoveryPasses){
   let obstacle=null,bestT=2,bestDepth=0;
   const hit=this.hit,best=this.best;
   for(const s of this.near){if(!s.solid)continue;
    for(let lobe=-1;lobe<=1;lobe++){
     if(!length&&lobe!==0)continue;m.tests++;
     if(!sweepHull(p,dx,dy,dz,s,this.frame,r,h,length*lobe,hit,c?.centerY??0,depth))continue;
     if(hit.t<bestT||hit.t===0&&hit.depth>bestDepth){bestT=hit.t;bestDepth=hit.depth;Object.assign(best,hit);best.offset=length*lobe;obstacle=s;}
    }
   }
   if(this.terrain(sub,dx,dy,dz,hit)&&(hit.t<bestT||hit.depth>bestDepth)){
    bestT=hit.t;bestDepth=hit.depth;Object.assign(best,hit);best.offset=0;obstacle=this.sand;
   }
   if(!obstacle){p.x+=dx;p.y+=dy;p.z+=dz;break;}
   let nx=best.nx,ny=best.ny,nz=best.nz;
   if(bestDepth>0){
    // Do not resolve a low support downward into sand. Escape horizontally instead.
    if(ny<0&&p.y+ny*bestDepth<hullFloor(sub,p.x,p.z,this.ground)){
     const n=Math.hypot(nx,nz);nx=n?nx/n:1;ny=0;nz=n?nz/n:0;
    }
    const amount=Math.min(2,bestDepth+config.skin);p.x+=nx*amount;p.y+=ny*amount;p.z+=nz*amount;recoveries++;
   }else{
    p.x+=dx*bestT+nx*config.skin;p.y+=dy*bestT+ny*config.skin;p.z+=dz*bestT+nz*config.skin;
    dx*=1-bestT;dy*=1-bestT;dz*=1-bestT;slides++;
   }
   const inward=vx*nx+vy*ny+vz*nz,impact=Math.max(0,-inward);
   this.record(sub,obstacle,nx,ny,nz,impact,best.offset);m.hits++;
   const bounce=impact>=config.reboundThreshold?config.restitution:0;
   if(inward<0){vx-=nx*inward*(1+bounce);vy-=ny*inward*(1+bounce);vz-=nz*inward*(1+bounce);}
   const into=dx*nx+dy*ny+dz*nz;
   if(into<0){dx-=nx*into*(1+bounce);dy-=ny*into*(1+bounce);dz-=nz*into*(1+bounce);}
  }
  if(this.contact.active){sub.speed=vx*sy+vz*cy;sub.vertical=vy;drift.x=vx-sy*sub.speed;drift.z=vz-cy*sub.speed;}
  if(this.contact.active){this.contact.fresh=this.separation>=.3||this.lastSurface!==this.contact.surface;this.lastSurface=this.contact.surface;this.separation=0;}
  else this.separation+=dt;
  sub.collisionContact=this.contact.active?this.contact:null;
  // Observe each resolved step, including tracked-vehicle substeps, without altering response.
  if(this.contact.active)this.onImpact?.(this.contact);
  m.ms=performance.now()-began;
 }
}
