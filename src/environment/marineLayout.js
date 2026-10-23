import {marineLifeConfig as c} from '../config/marineLifeConfig.js';
import {random} from './terrainMath.js';
import {insideOctopodClearing} from '../config/octopodConfig.js';
export function nearbySchools(x,z,range){const out=[];
 const add=(px,pz,seed,id)=>{if(Math.abs(px)>760||Math.abs(pz)>760||insideOctopodClearing(px,pz,18)||Math.hypot(px-x,pz-z)>range+20)return;out.push({x:px,z:pz,seed,id,speed:.8+(seed%97)/240});};
 c.anchors.forEach(([px,pz],i)=>add(px,pz,71233+i*379,'reef-'+i));
 const size=c.cellSize,reach=Math.ceil(range/size)+1,cx=Math.floor(x/size),cz=Math.floor(z/size);
 for(let ix=cx-reach;ix<=cx+reach;ix++)for(let iz=cz-reach;iz<=cz+reach;iz++){const seed=(Math.imul(ix,73856093)^Math.imul(iz,19349663)^71123)>>>0,r=random(seed),px=(ix+.2+r()*.6)*size,pz=(iz+.2+r()*.6)*size;if(c.anchors.some(([ax,az])=>Math.hypot(px-ax,pz-az)<30))continue;add(px,pz,seed,'cell-'+ix+','+iz);}
 return out.sort((a,b)=>(a.x-x)**2+(a.z-z)**2-((b.x-x)**2+(b.z-z)**2));
}
