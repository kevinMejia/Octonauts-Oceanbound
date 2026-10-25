export const UNLOCK_KEY='oceanbound.fleet.v1';
export class VehicleUnlocks{
 constructor(registry,storage,key=UNLOCK_KEY){
  this.registry=registry;this.storage=storage;this.key=key;this.listeners=new Set();this.overrides=new Set();this.ids=new Set(registry.filter(v=>v.unlockedByDefault===true).map(v=>v.id));this.saved=true;
  try{const raw=JSON.parse(storage?.getItem(key)??'null');const ids=Array.isArray(raw)?raw:raw?.unlocked;
   if(Array.isArray(ids))for(const id of ids)if(typeof id==='string'&&registry.some(v=>v.id===id))this.ids.add(id);
  }catch{/* Missing, corrupt or unavailable storage must never stop a dive. */}
  this.checkFinal();
 }
 checkFinal(){for(const v of this.registry.filter(v=>v.finalReward)){const required=this.registry.filter(r=>r.id!==v.id&&!r.finalReward&&r.requiredForFinal!==false);if(required.length&&required.every(r=>this.ids.has(r.id))&&!this.ids.has(v.id)){this.ids.add(v.id);this.save();for(const listener of this.listeners)listener(v.id);}}}
 setOverride(id,value){if(value)this.overrides.add(id);else this.overrides.delete(id);for(const listener of this.listeners)listener(null);}
 isUnlocked(id){return this.ids.has(id)||this.overrides.has(id);}
 save(){try{if(!this.storage)throw Error();this.storage.setItem(this.key,JSON.stringify({version:1,unlocked:[...this.ids]}));this.saved=true;}catch{this.saved=false;}}
 unlock(id){if(!this.registry.some(v=>v.id===id)||this.ids.has(id))return false;this.ids.add(id);this.save();for(const listener of this.listeners)listener(id);this.checkFinal();return true;}
 subscribe(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 reset(){this.ids=new Set(this.registry.filter(v=>v.unlockedByDefault===true).map(v=>v.id));this.save();for(const listener of this.listeners)listener(null);}
}
