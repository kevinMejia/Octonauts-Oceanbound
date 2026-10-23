import {resolveReefCollision} from './habitatLayout.js';
import {heightAt} from './terrainMath.js';
import {submarineConfig} from '../config/submarineConfig.js';
export function resolveOctopodCollision(position,colliders,heading=0){const hits=resolveReefCollision(position,colliders);if(!hits)return 0;
 const clampFloor=()=>{let floor=heightAt(position.x,position.z);for(const sign of [-1,1])floor=Math.max(floor,heightAt(position.x+Math.sin(heading)*3*sign,position.z+Math.cos(heading)*3*sign));position.y=Math.max(position.y,floor+submarineConfig.minTerrainClearance);};clampFloor();
 // Overlapping support proxies can trap the hull against the sand plane. Resolve
 // remaining intersections horizontally at the valid height instead of burying it.
 for(let pass=0;pass<12;pass++){let moved=false;for(const c of colliders){const rx=c.rx+2.2,ry=c.ry+1.1,rz=c.rz+2.2,dy=position.y-c.y;const remaining=1-dy*dy/(ry*ry);if(remaining<=0)continue;let dx=position.x-c.x,dz=position.z-c.z;const horizontal=dx*dx/(rx*rx)+dz*dz/(rz*rz);if(horizontal>=remaining)continue;if(horizontal<1e-10){dx=rx*Math.sqrt(remaining)*1.005;dz=0;}else{const factor=Math.sqrt(remaining/horizontal)*1.005;dx*=factor;dz*=factor;}position.x=c.x+dx;position.z=c.z+dz;moved=true;}clampFloor();if(!moved)break;}return hits;}
