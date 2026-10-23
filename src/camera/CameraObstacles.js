import {ellipsoidEntry,terrainEntry} from './cameraMath.js';
import {heightAt} from '../environment/terrainMath.js';
export class CameraObstacles{
 constructor(surfaces){this.grid=surfaces.grid;this.near=[];}
 limit(a,b,c){let t=terrainEntry(a,b,heightAt,c);const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);this.grid.query((a.x+b.x)/2,(a.z+b.z)/2,length/2+c.collisionRadius,this.near,'solid');for(const s of this.near)if(s.solid)t=Math.min(t,ellipsoidEntry(a,b,s,c.collisionRadius));return t<1?Math.max(0,t-c.collisionPadding/Math.max(.01,length)):1;}
}
