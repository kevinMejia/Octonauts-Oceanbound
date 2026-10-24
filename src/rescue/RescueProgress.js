// Generic rescue progression. Active tows are deliberately session-only: reload restores
// undelivered payloads at their authored locations, preserving their discovered state.
export class RescueProgress{
 constructor(registry,storage,key){
  this.registry=registry;this.storage=storage;this.key=key;this.ids=new Set();this.rescued=new Set();this.saved=true;this.known=new Set(registry.map(d=>d.id));
  for(const d of registry)if(d.startsUnlocked){this.ids.add(d.id);this.rescued.add(d.id);}
  const known=id=>typeof id==='string'&&registry.some(d=>d.id===id);
  try{const raw=JSON.parse(storage?.getItem(key)??'null');
   if(raw?.version===2){for(const id of Array.isArray(raw.discovered)?raw.discovered:[])if(known(id))this.ids.add(id);for(const id of Array.isArray(raw.rescued)?raw.rescued:[])if(known(id)){this.ids.add(id);this.rescued.add(id);}}
   else if((raw?.version===1&&Array.isArray(raw.unlocked))||Array.isArray(raw)){
    for(const id of Array.isArray(raw)?raw:raw.unlocked)if(known(id)){this.ids.add(id);this.rescued.add(id);}this.save();
   }
  }catch{/* Corrupt or blocked storage does not block this adventure. */}
 }
 save(){try{if(!this.storage)throw Error();this.storage.setItem(this.key,JSON.stringify({version:2,discovered:[...this.ids],rescued:[...this.rescued]}));this.saved=true;}catch{this.saved=false;}return this.saved;}
 discover(id){if(!this.known.has(id)||this.ids.has(id))return false;this.ids.add(id);this.save();return true;}
 rescue(id){if(!this.known.has(id)||this.rescued.has(id))return false;this.ids.add(id);this.rescued.add(id);this.save();return true;}
 reset(){this.ids.clear();this.rescued.clear();for(const d of this.registry)if(d.startsUnlocked){this.ids.add(d.id);this.rescued.add(d.id);}return this.save();}
}
