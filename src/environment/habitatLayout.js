import {habitatConfig as config} from '../config/habitatConfig.js';
import {worldConfig} from '../config/worldConfig.js';
import {heightAt,random} from './terrainMath.js';
export const passageCenter=z=>6*Math.sin(z*.035);
export function insideHabitat(x,z){const b=config.bounds;return x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ;}
export function habitatLayout(manifest){
 const rng=random(worldConfig.seed+config.seedOffset);return config.placements.flatMap(([type,side,offset,distance,scale,yaw],index)=>{
  const retain=rng();if(type==='patch'&&retain>config.density)return [];
  const z=distance*config.spacing+(rng()-.5)*.6,x=passageCenter(z)+side*offset+(rng()-.5)*.6,s=scale*config.formationScale,angle=yaw+(rng()-.5)*.06;
  const bounds=manifest.formations[type].boundsBlender,rx=(bounds[1][0]-bounds[0][0])*.38*s,rz=(bounds[1][1]-bounds[0][1])*.38*s;
  const heights=[heightAt(x,z)];for(let i=0;i<8;i++){const a=i*Math.PI/4,dx=Math.cos(a)*rx,dz=Math.sin(a)*rz;heights.push(heightAt(x+Math.cos(angle)*dx+Math.sin(angle)*dz,z-Math.sin(angle)*dx+Math.cos(angle)*dz));}
  heights.sort((a,b)=>a-b);const y=heights[2]-(type==='patch'?.18:.4);
  return [{type,x,y,z,scale:s,angle,index}];
 });
}
export function habitatColliders(layout,manifest){return layout.flatMap(p=>manifest.formations[p.type].colliders.map(c=>{const co=Math.cos(p.angle),si=Math.sin(p.angle);return {x:p.x+(co*c.center[0]+si*c.center[2])*p.scale,y:p.y+c.center[1]*p.scale,z:p.z+(-si*c.center[0]+co*c.center[2])*p.scale,rx:c.radii[0]*p.scale,ry:c.radii[1]*p.scale,rz:c.radii[2]*p.scale,angle:p.angle};}));}
// Expanded ellipsoid constraints: foundation stones only, no coral triangle collision.
export function resolveReefCollision(position,colliders,radius=config.collisionRadius,halfHeight=1.1){let hits=0;for(let pass=0;pass<3;pass++){let moved=false;for(const c of colliders){const dx=position.x-c.x,dz=position.z-c.z;if(Math.abs(dx)>c.rx+c.rz+radius||Math.abs(dz)>c.rx+c.rz+radius)continue;const co=Math.cos(c.angle),si=Math.sin(c.angle);let x=co*dx-si*dz,y=position.y-c.y,z=si*dx+co*dz;const rx=c.rx+radius,ry=c.ry+halfHeight,rz=c.rz+radius;let q=x*x/(rx*rx)+y*y/(ry*ry)+z*z/(rz*rz);if(q>=1)continue;if(q<1e-9){x=rx;y=z=0;q=1;}const factor=1.002/Math.sqrt(q);x*=factor;y*=factor;z*=factor;position.x=c.x+co*x+si*z;position.y=c.y+y;position.z=c.z-si*x+co*z;moved=true;hits++;}if(!moved)break;}return hits;}
