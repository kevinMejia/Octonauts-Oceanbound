export const UNLOCK_KEY='oceanbound.fleet.v1';
export class VehicleUnlocks{
 constructor(registry,storage){
  this.registry=registry;this.storage=storage;this.listeners=new Set();this.ids=new Set(registry.filter(v=>v.unlockedByDefault===true).map(v=>v.id));this.saved=true;
  try{const raw=JSON.parse(storage?.getItem(UNLOCK_KEY)??'null');const ids=Array.isArray(raw)?raw:raw?.unlocked;
   if(Array.isArray(ids))for(const id of ids)if(typeof id==='string'&&registry.some(v=>v.id===id))this.ids.add(id);
  }catch{/* Missing, corrupt or unavailable storage must never stop a dive. */}
 }
 isUnlocked(id){return this.ids.has(id);}
 save(){try{if(!this.storage)throw Error();this.storage.setItem(UNLOCK_KEY,JSON.stringify({version:1,unlocked:[...this.ids]}));this.saved=true;}catch{this.saved=false;}}
 unlock(id){if(!this.registry.some(v=>v.id===id)||this.ids.has(id))return false;this.ids.add(id);this.save();for(const listener of this.listeners)listener(id);return true;}
 subscribe(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 reset(){this.ids=new Set(this.registry.filter(v=>v.unlockedByDefault===true).map(v=>v.id));this.save();for(const listener of this.listeners)listener(null);}
}
