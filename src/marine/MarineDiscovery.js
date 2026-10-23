// This registry never reads ambient wildlife or fleet definitions.

import {marineAnimals} from './AnimalRegistry.js';
export {marineAnimals};

export const MARINE_SAVE_KEY = 'oceanbound.marine-discoveries.v1';

const point = p => p && ['x','y','z'].every(k => Number.isFinite(p[k]));

export class MarineDiscovery {

 constructor({registry=marineAnimals,storage,onDiscover=()=>{},blocked=()=>false}={}) {

  this.records=new Map(); this.ids=new Set(); this.storage=storage; this.onDiscover=onDiscover; this.blocked=blocked; this.saved=true;

  for(const animal of registry){

   if(!animal.id || this.records.has(animal.id) || !['commonName','scientificName','fact','habitat'].every(k=>typeof animal[k]==='string'&&animal[k].trim()) || (animal.visual ? !(['procedural','glb'].includes(animal.visual.source)) || (animal.visual.source==='procedural'&&!['octopus','dolphin','whale-shark','manta'].includes(animal.visual.type)) || (animal.visual.source==='glb'&&!(animal.visual.modelPath??animal.modelPath)) : (!animal.modelPath || !animal.thumbnailPath)) || !point(animal.position) || !(animal.discoveryRadius>0) || !Number.isFinite(animal.discoveryRadius))throw new Error('Invalid marine animal configuration: '+animal.id);

   this.records.set(animal.id,Object.freeze({...animal,position:Object.freeze({...animal.position})}));

  }

  try{const data=JSON.parse(storage?.getItem(MARINE_SAVE_KEY)??'null');if(data?.version===1&&Array.isArray(data.ids))for(const id of data.ids)if(typeof id==='string'&&id.length<=128)this.ids.add(id);}catch{ /* Invalid or unavailable storage starts a safe session. */ }

 }

 isDiscovered(id){return this.records.has(id)&&this.ids.has(id);}

 get count(){return [...this.records.keys()].filter(id=>this.ids.has(id)).length;}

 save(){try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(MARINE_SAVE_KEY,JSON.stringify({version:1,ids:[...this.ids]}));this.saved=true;}catch{this.saved=false;}}

 update(position){

  if(!this.records.size||this.blocked()||!point(position))return false;

  for(const animal of this.records.values()){

   if(this.ids.has(animal.id))continue;

   const p=this.positions?.get(animal.id)??animal.position;

   if((position.x-p.x)**2+(position.y-p.y)**2+(position.z-p.z)**2<=animal.discoveryRadius**2){this.ids.add(animal.id);this.save();this.onDiscover(animal,{...p});return true;}

  }return false;

 }

 // Moving models can supply their world-space center; no physics collider needed.

 setPosition(id,position){if(!this.records.has(id)||!point(position))return false;this.positions??=new Map();const current=this.positions.get(id);if(current){current.x=position.x;current.y=position.y;current.z=position.z;}else this.positions.set(id,{x:position.x,y:position.y,z:position.z});return true;}

}
