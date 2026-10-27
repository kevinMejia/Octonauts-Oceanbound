import {damageConfig as c} from '../config/damageConfig.js';
import {submarineConfig} from '../config/submarineConfig.js';
import {UNLOCK_KEY} from './VehicleUnlocks.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function fleetStats(registry){const speeds=registry.map(v=>v.movement?.maxSpeed??submarineConfig.maxForwardSpeed*(v.movement?.speedMultiplier??1)),min=Math.min(...speeds),max=Math.max(...speeds);
 return new Map(registry.map((v,i)=>{const relative=max>min?(speeds[i]-min)/(max-min):.5,speed=Math.round(1+9*relative),armor=clamp(Math.round(Number.isFinite(v.durability?.armor)?v.durability.armor:c.maxArmor-(c.maxArmor-c.minArmor)*relative),1,10),override=v.durability?.maxHull,maxHull=Number.isFinite(override)&&override>0?override:c.hullBase+armor*c.hullPerArmor;return [v.id,{speed,armor,maxHull,maxSpeed:speeds[i]}];}));}
export function condition(hull,max){const p=hull/max;return p<=0?4:p<=.25?3:p<=.5?2:p<=.75?1:0;}
export function impactDamage(speed){let damage=0;for(const band of c.impacts)if(speed>=band.speed)damage=band.damage;return damage;}
// Extends the existing fleet document, preserving unlocks and future fields.
export class VehicleDamage{
 constructor(registry,storage){this.storage=storage;this.stats=fleetStats(registry);this.hulls=new Map();this.contacts=new Map();this.listeners=new Set();this.time=0;this.dirty=false;this.saveAge=0;this.repairId=null;let saved;try{saved=JSON.parse(storage?.getItem(UNLOCK_KEY)??'null')?.hulls;}catch{}
 for(const [id,s] of this.stats){const value=saved?.[id];this.hulls.set(id,typeof value==='number'&&Number.isFinite(value)?clamp(value,0,s.maxHull):s.maxHull);}}
 get(id){return this.hulls.get(id)??0;}
 percent(id){return this.get(id)/this.stats.get(id).maxHull*100;}
 set(id,value,reason='testing'){const stats=this.stats.get(id);if(!stats||!Number.isFinite(value))return false;const old=this.get(id),next=clamp(value,0,stats.maxHull);if(old===next)return false;this.hulls.set(id,next);this.dirty=true;for(const fn of this.listeners)fn(id,old,next,reason);if(reason!=='repair'||next===stats.maxHull)this.save();return true;}
 setPercent(id,percent){return this.set(id,this.stats.get(id).maxHull*clamp(percent,0,100)/100);}
 repairAll(){for(const [id,s] of this.stats)this.set(id,s.maxHull);}
 subscribe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 tick(dt){this.time+=Math.min(.05,Math.max(0,dt));this.saveAge+=dt;if(this.dirty&&this.saveAge>=.5)this.save();for(const [key,r] of this.contacts)if(this.time-r.seen>2)this.contacts.delete(key);}
 impact(id,contact,protectedArea=false,relativeSpeed=contact?.impact,groundVehicle=false){if(!contact||protectedArea||contact.surface==='sand'&&(groundVehicle||(contact.ny??1)>=c.terrainSupportNormal&&relativeSpeed<c.terrainSlamSpeed))return 0;const key=contact.obstacle??contact.surface;let r=this.contacts.get(key);const separated=!r||this.time-r.seen>c.rearmSeparation;if(!r){r={seen:-Infinity,hit:-Infinity};this.contacts.set(key,r);}r.seen=this.time;if(!separated||this.time-r.hit<c.contactCooldown)return 0;const damage=impactDamage(relativeSpeed);if(!damage)return 0;r.hit=this.time;this.set(id,this.get(id)-damage,'impact');return damage;}
 stopRepair(){if(this.repairId){this.repairId=null;if(this.dirty)this.save();}}
 repair(id,touching,dt){if(!touching||this.get(id)>=this.stats.get(id).maxHull){this.stopRepair();return false;}const started=this.repairId!==id;this.repairId=id;this.set(id,this.get(id)+this.stats.get(id).maxHull*Math.min(.05,Math.max(0,dt))/c.repairSeconds,'repair');return started;}
 save(){try{if(!this.storage)return;let raw;try{raw=JSON.parse(this.storage.getItem(UNLOCK_KEY)??'null');}catch{}if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={version:1,unlocked:Array.isArray(raw)?raw:[]};raw.hulls=Object.fromEntries(this.hulls);this.storage.setItem(UNLOCK_KEY,JSON.stringify(raw));this.dirty=false;this.saveAge=0;}catch{/* Session Hull remains usable when storage is unavailable. */}}
}
