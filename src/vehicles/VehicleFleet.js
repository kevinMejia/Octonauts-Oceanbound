// Cache promises, not per-browse instances. Failed loads can be retried.
export class VehicleFleet{
 constructor({initialId,initialVehicle,load,prepare=async()=>{},install,canSelect=()=>true}){this.canSelect=canSelect;this.activeId=initialId;this.activeVehicle=initialVehicle;this.load=load;this.prepare=prepare;this.install=install;this.cache=new Map([[initialId,Promise.resolve(initialVehicle)]]);this.generation=0;}
 get(id){if(!this.cache.has(id)){const promise=Promise.resolve().then(()=>this.load(id)).catch(error=>{this.cache.delete(id);throw error;});this.cache.set(id,promise);}return this.cache.get(id);}
 async select(id,isCurrent=()=>true,beforeInstall){
  if(!this.canSelect(id))throw new Error('Discover this GUP near the Octopod first.');
  const generation=++this.generation;if(id===this.activeId)return isCurrent();
  const next=await this.get(id);if(generation!==this.generation||!isCurrent())return false;
  await this.prepare(next);if(generation!==this.generation||!isCurrent())return false;
  if(beforeInstall){await beforeInstall(next,this.activeVehicle);if(generation!==this.generation||!isCurrent())return false;}
  if(!this.canSelect(id))return false;const previous=this.activeVehicle;this.install(next,previous,id);this.activeVehicle=next;this.activeId=id;return true;
 }
 cancel(){this.generation++;}
}
