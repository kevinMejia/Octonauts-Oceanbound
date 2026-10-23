import {environmentConfig as config} from '../config/environmentConfig.js';
import {heightAt,noise,random} from './terrainMath.js';
import {worldConfig} from '../config/worldConfig.js';
import {insideOctopodClearing} from '../config/octopodConfig.js';
// Reefs frame the winding sand channels; centers and all local variation are seeded.
export function reefLayout(){
 const rng=random(worldConfig.seed+403),centers=[[-11,-2],[13,7],[-16,-13],[19,-17],[-18,18],[21,29],[-29,48],[30,66],[-18,85],[39,104],[-45,115]];
 for(let z=-750;z<=750;z+=config.reefSpacing)for(let x=-750;x<=750;x+=config.reefSpacing){const px=x+(rng()-.5)*30,pz=z+(rng()-.5)*30;const channel=19*Math.sin(pz*.014);if(Math.abs(px-channel)<12||Math.hypot(px,pz)<35||noise(px/110,pz/110)<.4||rng()<.25)continue;centers.push([px,pz]);}
 // More reef pockets in the opening panorama, while leaving the central sand route open.
 for(let i=0;i<config.openingPocketAttempts;i++){const a=rng()*Math.PI*2,r=40+rng()*170,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.abs(x-19*Math.sin(z*.014))>14&&centers.every(p=>Math.hypot(x-p[0],z-p[1])>14))centers.push([x,z]);}
 const records=[],rocks=[];let cluster=null;
 const add=(kind,x,z,scale,variant)=>{const record={cluster,kind:kind+variant,x,y:heightAt(x,z)-.06,z,scale,angle:rng()*Math.PI*2};records.push(record);return record;};
 for(const [cx,cz] of centers){cluster='reef-'+cx+','+cz;
  const hill=heightAt(cx,cz),large=hill>3&&rng()>.6,scale=large?1.8+rng():.75+rng()*.8;
  const rock=add('rock',cx,cz,scale,large?2:Math.floor(rng()*3));rocks.push({...rock,radius:scale*1.6});
  for(let k=0;k<12;k++){const a=rng()*Math.PI*2,r=scale*1.25+rng()*2.7;const kind=['branch','branch','tube','brain','branch','seaweed','kelp','tube','branch','brain','tube','branch'][k];add(kind,cx+Math.cos(a)*r,cz+Math.sin(a)*r,(.65+rng()*.8)*(large?1.15:1),Math.floor(rng()*3));}
  for(let k=0;k<10;k++){const a=rng()*Math.PI*2,r=2+rng()*5.5;add(k<5?'grass':'seaweed',cx+Math.cos(a)*r,cz+Math.sin(a)*r,.7+rng()*.65,Math.floor(rng()*3));}
  for(let k=0;k<3;k++){const a=rng()*Math.PI*2,r=4+rng()*5;add(k===0?'shell':'rock',cx+Math.cos(a)*r,cz+Math.sin(a)*r,k===0?.8+rng():.15+rng()*.25,Math.floor(rng()*3));}
 }
 cluster=null;
 // Occasional shells and stones in otherwise open sand, rather than a repeated carpet.
 for(let i=0;i<config.openSandDecorations;i++){const x=(rng()-.5)*1540,z=(rng()-.5)*1540;add(i%3===0?'shell':i%3===1?'grass':'rock',x,z,i%3===2?.12+rng()*.2:.5+rng()*.4,Math.floor(rng()*3));}
 return {records:records.filter(r=>!insideOctopodClearing(r.x,r.z,r.scale*4)),rocks:rocks.filter(r=>!insideOctopodClearing(r.x,r.z,r.radius)),centers};
}
