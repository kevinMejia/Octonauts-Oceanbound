import {RescueProgress} from '../rescue/RescueProgress.js';
import {hullGap} from '../rescue/towMath.js';
import {rescueConfig} from '../config/rescueConfig.js';
import {crewConfig} from '../config/crewConfig.js';
export const CREW_SAVE_KEY='oceanbound.crew-discoveries.v1'; // Retain the key; version-1 returns migrate as rescued.
const point=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
export class CrewDiscovery{
 constructor({registry=crewConfig.characters,storage,config=rescueConfig,blocked=()=>false,onDiscover=()=>{},onTow=()=>true,onRescued=()=>{},onReset=()=>{}}={}){
  this.config=config;this.records=new Map();this.positions=new Map();this.pending=null;this.active=null;this.frame={};Object.assign(this,{blocked,onDiscover,onTow,onRescued,onReset});
  for(const d of registry){const radius=d.discovery?.radius??config.discoveryRadius;if(!d.id||this.records.has(d.id)||!d.name||!point(d.discovery?.position)||!(radius>0)||!Number.isFinite(radius))throw Error('Invalid crew discovery: '+d.id);this.records.set(d.id,d);}
  this.progress=new RescueProgress(registry,storage,CREW_SAVE_KEY);
 }
 get saved(){return this.progress.saved;}
 get count(){return [...this.records.keys()].filter(id=>this.isDiscovered(id)).length;}
 get rescuedCount(){return [...this.records.keys()].filter(id=>this.isRescued(id)).length;}
 isDiscovered(id){return this.records.has(id)&&this.progress.ids.has(id);}
 isRescued(id){return this.records.has(id)&&this.progress.rescued.has(id);}
 state(id){return this.isRescued(id)?'rescued':this.active===id?'towing':this.isDiscovered(id)?'discovered':'undiscovered';}
 setPosition(id,p){if(!this.records.has(id)||!point(p))return false;this.positions.set(id,{x:p.x,y:p.y,z:p.z});return true;}
 update(player){
  if(!this.config.enabled||this.config.maxActiveRescues<1||!this.config.towing.enabled||this.pending||this.active||this.blocked()||!point(player.position??player))return false;
  for(const d of this.records.values()){
   if(this.isRescued(d.id))continue;const p=this.positions.get(d.id);if(!p||hullGap(player,p,this.frame)>(d.discovery.radius??this.config.discoveryRadius))continue;
   if(this.isDiscovered(d.id))return this.begin(d.id); // Resume a previously found, undelivered character without replaying its panel.
   this.pending=d.id;this.progress.discover(d.id);
   try{this.onDiscover(d,{...p});}catch(error){this.pending=null;console.warn('Crew discovery panel unavailable',error);}
   return true;
  }return false;
 }
 begin(id){if(this.active||this.pending||!this.isDiscovered(id)||this.isRescued(id))return false;this.active=id;try{if(this.onTow(this.records.get(id))===false){this.active=null;return false;}}catch(error){this.active=null;console.warn('Crew tow unavailable',error);return false;}return true;}
 finish(){const id=this.pending;if(!id)return false;this.pending=null;return this.begin(id);}
 complete(id){if(this.active!==id||this.isRescued(id))return false;this.active=null;this.progress.rescue(id);this.onRescued(this.records.get(id));return true;}
 reset(){this.pending=null;this.active=null;this.progress.reset();this.onReset();return this.saved;}
}
