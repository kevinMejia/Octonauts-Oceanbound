import {visualConfig} from '../config/visualConfig.js';

const originals=new WeakMap();
export function vehicleGlassMode(host=globalThis){const requested=new URLSearchParams(host.location?.search??'').get('glass');return ['original','mobile'].includes(requested)?requested:visualConfig.mobileGlass.mode;}

// Explicit preview only. Keep original physical transmission as the default;
// tint, environment reflections and the authored facing-alpha shader survive.
export function setVehicleGlass(root,mode){
 const seen=new Set();let changed=0;
 root.traverse(object=>{for(const material of [].concat(object.material??[])){
  if(seen.has(material))continue;seen.add(material);
  if(!originals.has(material)){if(!(material.transmission>0))continue;originals.set(material,{transmission:material.transmission,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});}
  const original=originals.get(material),mobile=mode==='mobile';
  material.transmission=mobile?0:original.transmission;
  material.opacity=mobile?(material.userData.oceanboundFacingAlpha?original.opacity*visualConfig.mobileGlass.facingOpacity:visualConfig.mobileGlass.opacity):original.opacity;
  material.transparent=mobile?true:original.transparent;material.depthWrite=mobile?false:original.depthWrite;
  material.needsUpdate=true;changed++;
 }});return changed;
}
