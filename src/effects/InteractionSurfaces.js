import {collisionConfig} from '../config/collisionConfig.js';
import {SurfaceGrid,sweepSurface} from './interactionMath.js';
import {heightAt} from '../environment/terrainMath.js';
export class InteractionSurfaces{
 constructor(habitat,decor,proxies,base=[]){
  this.grid=new SurfaceGrid();this.rockGrid=this.grid;this.near=[];this.groundNear=[];this.count=0;this.solidCount=0;this.coralTemplates={};
  // Select a bounded compound of substantial coral cores once per authored type.
  // Original radii are retained: never enclose an entire irregular reef in one box.
  for(const type of Object.keys(proxies))this.coralTemplates[type]=coralCores(proxies[type],collisionConfig.coralCoresPerFormation);
  for(const p of habitat?.layout??[]){const co=Math.cos(p.angle),si=Math.sin(p.angle),cores=this.coralTemplates[p.type]??[];
   for(const s of cores)this.add({x:p.x+(co*s.center[0]+si*s.center[2])*p.scale,y:p.y+s.center[1]*p.scale,z:p.z+(-si*s.center[0]+co*s.center[2])*p.scale,radius:s.radius*p.scale,surface:s.surface,color:s.color,branch:s.branch,solid:true,cluster:p.index});
  }
  for(const c of habitat?.colliders??[])this.add({...c,surface:'rock',solid:true});
  for(const s of decor.showcaseColliders??[])this.add({...s,surface:'rock',solid:true});
  const pockets=new Map();
  for(const r of decor.layout.records){
   if(r.module||r.kind.startsWith('branch'))continue;const b=decor.surfaceBounds?.get(r.kind);if(!b||b.surface==='vegetation')continue;
   const s={x:r.x,y:r.y+b.y*r.scale,z:r.z,radius:Math.max(b.radius,b.rx??0,b.rz??0)*r.scale,surface:b.surface,loose:true,rx:b.rx*r.scale,ry:b.ry*r.scale,rz:b.rz*r.scale,angle:r.angle,color:b.color,branch:r.kind.startsWith('branch')};
   s.radius=Math.max(s.rx,s.rz);s.solid=s.surface==='rock'&&Math.max(s.rx,s.rz)>=collisionConfig.minRockRadius;
   if(r.cluster&&s.surface==='coral'&&!s.branch){if(!pockets.has(r.cluster))pockets.set(r.cluster,[]);pockets.get(r.cluster).push(s);}
   if(s.solid)this.add(s);
  }
  // At most two substantial cores per scattered reef pocket; tiny pieces stay cosmetic.
  for(const pocket of pockets.values())for(const s of coralCores(pocket,collisionConfig.coralCoresPerPocket))this.add({...s,solid:true});
  for(const s of base)this.add({...s,surface:'octopod',solid:true});
 }
 add(s){
  s.rx??=s.radius;s.ry??=s.radius;s.rz??=s.radius;s.angle??=0;s.co=Math.cos(s.angle);s.si=Math.sin(s.angle);
  s.radius=Math.max(s.rx,s.rz);this.grid.add(s);this.count++;if(s.solid)this.solidCount++;
 }
 query(a,b){return this.grid.query(b.x,b.z,5+Math.hypot(b.x-a.x,b.z-a.z),this.near);}
 contact(a,b,heading=0){let best=null;let score=Infinity;const dx=Math.sin(heading)*2,dz=Math.cos(heading)*2;for(const s of this.near){if(s.surface!=='coral')continue;let hit=false;for(let sign=-1;sign<=1;sign++)if(sweepSurface(a,b,s,1.1,dx*sign,dz*sign))hit=true;if(!hit)continue;const d=Math.hypot(b.x-s.x,b.y-s.y,b.z-s.z)-s.radius;if(d<score){score=d;best=s;}}return best;}
 looseRock(a,b){for(const s of this.near)if(s.surface==='rock'&&s.loose&&sweepSurface(a,b,s,1.1)){const dx=b.x-s.x,dy=b.y-s.y,dz=b.z-s.z,l=Math.hypot(dx,dy,dz)||1;return {nx:dx/l,ny:dy/l,nz:dz/l};}return null;}
 ground(x,z,y){let floor=heightAt(x,z);for(const c of this.rockGrid.query(x,z,.2,this.groundNear,'rock')){if(c.surface!=='rock'||!c.rx)continue;const co=c.co,si=c.si,dx=x-c.x,dz=z-c.z,lx=co*dx-si*dz,lz=si*dx+co*dz,q=lx*lx/(c.rx*c.rx)+lz*lz/(c.rz*c.rz);if(q<1){const top=c.y+c.ry*Math.sqrt(1-q);if(top<y+.3)floor=Math.max(floor,top);}}return floor;}
}

export function coralCores(sources,limit){
 const candidates=sources.filter(s=>s.surface==='coral'&&!s.branch&&s.radius>=collisionConfig.minCoralRadius).sort((a,b)=>b.radius-a.radius),cores=[];
 for(const s of candidates){const p=s.center??[s.x,s.y,s.z];
  if(cores.some(c=>{const q=c.center??[c.x,c.y,c.z];return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<Math.max(s.radius,c.radius)*1.5;}))continue;
  cores.push(s);if(cores.length>=limit)break;
 }return cores;
}
