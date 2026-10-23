import {SurfaceGrid} from '../effects/interactionMath.js';
import {ellipsoidEntry,terrainEntry} from './cameraMath.js';
import {heightAt} from '../environment/terrainMath.js';
export class CameraObstacles{
 constructor(surfaces,base=[]){this.grid=new SurfaceGrid(16);this.near=[];
  for(const cells of surfaces.grid.cells.values())for(const s of cells){if(!['rock','coral'].includes(s.surface))continue;const r=s.radius;this.add({...s,rx:s.rx??r,ry:s.ry??r,rz:s.rz??r});}
  for(const s of base)this.add(s);
 }
 add(s){this.grid.add({...s,radius:Math.max(s.rx,s.rz)});}
 limit(a,b,c){let t=terrainEntry(a,b,heightAt,c);const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);this.grid.query((a.x+b.x)/2,(a.z+b.z)/2,length/2+c.collisionRadius,this.near);for(const s of this.near)t=Math.min(t,ellipsoidEntry(a,b,s,c.collisionRadius));return t<1?Math.max(0,t-c.collisionPadding/Math.max(.01,length)):1;}
}
