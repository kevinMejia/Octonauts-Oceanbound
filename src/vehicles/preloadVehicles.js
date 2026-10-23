import {vehicles} from '../config/vehicleConfig.js';

// Share the selector's model promises: preloading never installs or selects a GUP.
// Sequential decoding avoids two large imported models competing on mobile.
// Optional failures are settled individually, leaving the default vehicle usable.
export async function preloadVehicles(fleet,{onProgress=()=>{},ids=vehicles.filter(v=>v.id!==fleet.activeId).map(v=>v.id),prepare=true}={}){
 const results=[];const unique=[...new Set(ids)];const total=unique.length;
 for(const id of unique){
  onProgress({id,status:'loading',completed:results.length,total});
  let result;
  try{
   const vehicle=await fleet.get(id);
   if(prepare)await fleet.prepare(vehicle);
   result={id,status:'fulfilled',value:vehicle};
  }catch(reason){result={id,status:'rejected',reason};}
  results.push(result);
  onProgress({id,status:result.status,completed:results.length,total,error:result.reason});
 }
 return results;
}
