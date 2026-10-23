import {SurfaceGrid,sweepSurface} from './interactionMath.js';
import {heightAt} from '../environment/terrainMath.js';
export class InteractionSurfaces{
 constructor(habitat,decor,proxies){this.grid=new SurfaceGrid();this.rockGrid=new SurfaceGrid();this.near=[];this.groundNear=[];const add=s=>{this.grid.add(s);if(s.surface==='rock')this.rockGrid.add(s);};
  for(const p of habitat?.layout??[]){const co=Math.cos(p.angle),si=Math.sin(p.angle);for(const s of proxies[p.type])add({x:p.x+(co*s.center[0]+si*s.center[2])*p.scale,y:p.y+s.center[1]*p.scale,z:p.z+(-si*s.center[0]+co*s.center[2])*p.scale,radius:s.radius*p.scale,surface:s.surface,color:s.color,branch:s.branch});}
  for(const c of habitat?.colliders??[])add({...c,radius:Math.max(c.rx,c.rz),surface:'rock'});
  // Existing scattered scenery outside the habitat also exposes cached mesh bounds.
  for(const r of decor.layout.records){const b=decor.surfaceBounds?.get(r.kind);if(!b)continue;add({x:r.x,y:r.y+b.y*r.scale,z:r.z,radius:Math.max(b.radius,b.rx??0,b.rz??0)*r.scale,surface:b.surface,loose:true,rx:b.rx*r.scale,ry:b.ry*r.scale,rz:b.rz*r.scale,angle:r.angle,color:b.color,branch:r.kind.startsWith('branch')});}
 }
 query(a,b){return this.grid.query(b.x,b.z,5+Math.hypot(b.x-a.x,b.z-a.z),this.near);}
 contact(a,b,heading=0){let best=null;let score=Infinity;const dx=Math.sin(heading)*2,dz=Math.cos(heading)*2;for(const s of this.near){if(s.surface!=='coral')continue;let hit=false;for(let sign=-1;sign<=1;sign++)if(sweepSurface(a,b,s,1.1,dx*sign,dz*sign))hit=true;if(!hit)continue;const d=Math.hypot(b.x-s.x,b.y-s.y,b.z-s.z)-s.radius;if(d<score){score=d;best=s;}}return best;}
 looseRock(a,b){for(const s of this.near)if(s.surface==='rock'&&s.loose&&sweepSurface(a,b,s,1.1)){const dx=b.x-s.x,dy=b.y-s.y,dz=b.z-s.z,l=Math.hypot(dx,dy,dz)||1;return {nx:dx/l,ny:dy/l,nz:dz/l};}return null;}
 ground(x,z,y){let floor=heightAt(x,z);for(const c of this.rockGrid.query(x,z,.2,this.groundNear)){if(c.surface!=='rock'||!c.rx)continue;const co=Math.cos(c.angle),si=Math.sin(c.angle),dx=x-c.x,dz=z-c.z,lx=co*dx-si*dz,lz=si*dx+co*dz,q=lx*lx/(c.rx*c.rx)+lz*lz/(c.rz*c.rz);if(q<1){const top=c.y+c.ry*Math.sqrt(1-q);if(top<y+.3)floor=Math.max(floor,top);}}return floor;}
}
