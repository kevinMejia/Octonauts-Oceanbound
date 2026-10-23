import {marineLifeConfig as c} from '../config/marineLifeConfig.js';
import {heightAt,random} from './terrainMath.js';
import {insideOctopodClearing} from '../config/octopodConfig.js';
export function nearbySchools(x,z,range){const out=[];
 const add=(px,pz,seed,id)=>{if(Math.abs(px)>760||Math.abs(pz)>760||insideOctopodClearing(px,pz,18)||Math.hypot(px-x,pz-z)>range+20)return;out.push({x:px,z:pz,seed,id,speed:.8+(seed%97)/240});};
 c.anchors.forEach(([px,pz],i)=>add(px,pz,71233+i*379,'reef-'+i));
 const size=c.cellSize,reach=Math.ceil(range/size)+1,cx=Math.floor(x/size),cz=Math.floor(z/size);
 for(let ix=cx-reach;ix<=cx+reach;ix++)for(let iz=cz-reach;iz<=cz+reach;iz++){const seed=(Math.imul(ix,73856093)^Math.imul(iz,19349663)^71123)>>>0,r=random(seed),px=(ix+.2+r()*.6)*size,pz=(iz+.2+r()*.6)*size;if(c.anchors.some(([ax,az])=>Math.hypot(px-ax,pz-az)<30))continue;add(px,pz,seed,'cell-'+ix+','+iz);}
 return out.sort((a,b)=>(a.x-x)**2+(a.z-z)**2-((b.x-x)**2+(b.z-z)**2));
}

// Sparse, jittered kelp meadows extend movement beyond the authored opening.
export function kelpMeadows(){const out=[],rng=random(88119);for(let z=-735;z<750;z+=78)for(let x=-735;x<750;x+=78){if(rng()<.3)continue;const px=x+(rng()-.5)*50,pz=z+(rng()-.5)*50;if(insideOctopodClearing(px,pz,10)||Math.hypot(px-180,pz-205)<120||(px>-60&&px<65&&pz>-25&&pz<145))continue;for(let i=0;i<3;i++){const a=rng()*Math.PI*2,r=1+rng()*3,wx=px+Math.sin(a)*r,wz=pz+Math.cos(a)*r;out.push({kind:(i===2?'seaweed':'kelp')+i,x:wx,y:heightAt(wx,wz)-.1,z:wz,scale:1.5+rng()*.9,angle:a});}}return out;}
