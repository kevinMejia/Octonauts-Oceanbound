import * as T from 'three';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {constantVehicleImages} from '../config/constantVehicleImages.js';
import {VehicleImageCache} from './VehicleImageCache.js';

async function decode(blob){
 const safari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent),version=Number(navigator.userAgent.match(/Version\/(\d+)/)?.[1]??0);
 if(typeof createImageBitmap==='function'&&(!safari||version>=17))return createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'});
 const url=URL.createObjectURL(blob),image=new Image();try{image.src=url;await image.decode();return image;}finally{URL.revokeObjectURL(url);}
}
export const vehicleImages=new VehicleImageCache({
 hash:async bytes=>globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''):'uncached:'+T.MathUtils.generateUUID(),
 decode,makeSource:image=>new T.Source(image),constants:constantVehicleImages,
});
const sourceEntries=new WeakMap();

export function vehicleLoader(){
 return new GLTFLoader().register(parser=>({name:'OCEANBOUND_SHARED_VEHICLE_IMAGES',loadTexture(index){
  const sourceIndex=parser.json.textures[index].source,image=parser.json.images?.[sourceIndex];
  // Leave other formats/extensions to the established loader.
  if(image?.mimeType!=='image/png'||image.bufferView===undefined)return null;
  return (async()=>{const bytes=await parser.getDependency('bufferView',image.bufferView),entry=await vehicleImages.get(bytes,image.mimeType);sourceEntries.set(entry.source,entry);
  // GLTFLoader builds its usual texture/sampler/UV objects, but defers decoding
  // until GPU preparation. A parsed, hidden model consumes no decoded pixels.
  const loader={isImageBitmapLoader:true,load:(_url,onLoad)=>onLoad(entry.source.data)};
  const texture=await parser.loadTextureImage(index,sourceIndex,loader);if(!texture)throw new Error('Vehicle texture unavailable');texture.source=entry.source;return texture;})();
 }}));
}

let preparation=Promise.resolve();
export function prepareVehicleTextures(vehicle,renderer){
 const next=preparation.then(()=>uploadVehicleTextures(vehicle,renderer));preparation=next.catch(()=>{});return next;
}
async function uploadVehicleTextures(vehicle,renderer){
 const groups=new Map();vehicle.group.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material])for(const texture of Object.values(material)){
  if(!texture?.isTexture||vehicleImages.uploaded(renderer,texture))continue;const entry=sourceEntries.get(texture.source);if(!entry)continue;if(!groups.has(entry))groups.set(entry,new Set());groups.get(entry).add(texture);
 }});
 for(const [entry,textures] of groups)await vehicleImages.withImage(entry,()=>{
  if(renderer.getContext().isContextLost())throw new Error('Graphics context unavailable');
  for(const texture of textures){renderer.initTexture(texture);if(renderer.getContext().isContextLost())throw new Error('Graphics context unavailable');vehicleImages.markUploaded(renderer,texture);}
 });
}
