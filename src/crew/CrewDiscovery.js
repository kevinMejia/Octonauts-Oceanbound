import {VehicleUnlocks} from '../vehicles/VehicleUnlocks.js';
import {crewConfig} from '../config/crewConfig.js';
export const CREW_SAVE_KEY='oceanbound.crew-discoveries.v1';
const point=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));

// Reuse existing discovery persistence, with a separate key and one pending encounter.
export class CrewDiscovery{
 constructor({registry=crewConfig.characters,storage,blocked=()=>false,onDiscover=()=>{},onReturn=()=>{},onReset=()=>{}}={}){
  this.records=new Map();this.positions=new Map();this.pending=null;this.blocked=blocked;this.onDiscover=onDiscover;this.onReturn=onReturn;this.onReset=onReset;
  for(const d of registry){if(!d.id||this.records.has(d.id)||!d.name||!point(d.discovery?.position)||!(d.discovery.radius>0)||!Number.isFinite(d.discovery.radius))throw Error('Invalid crew discovery: '+d.id);this.records.set(d.id,d);}
  this.progress=new VehicleUnlocks(registry.map(d=>({id:d.id,unlockedByDefault:d.startsUnlocked===true})),storage,CREW_SAVE_KEY);
 }
 get saved(){return this.progress.saved;}
 get count(){return [...this.records.keys()].filter(id=>this.isDiscovered(id)).length;}
 isDiscovered(id){return this.records.has(id)&&this.progress.isUnlocked(id);}
 setPosition(id,p){if(!this.records.has(id)||!point(p))return false;this.positions.set(id,{x:p.x,y:p.y,z:p.z});return true;}
 update(player){
  if(this.pending||this.blocked()||!point(player))return false;
  for(const d of this.records.values()){
   if(this.isDiscovered(d.id))continue;const p=this.positions.get(d.id);if(!p)continue;
   if(Math.hypot(player.x-p.x,player.y-p.y,player.z-p.z)>d.discovery.radius)continue;
   this.pending=d.id;this.progress.unlock(d.id);
   try{this.onDiscover(d,{...p});}catch(error){this.finish();console.warn('Crew discovery panel unavailable',error);}
   return true;
  }return false;
 }
 finish(){const id=this.pending;if(!id)return false;this.pending=null;this.onReturn(this.records.get(id));return true;}
 reset(){this.pending=null;this.progress.reset();this.onReset();return this.saved;}
}
