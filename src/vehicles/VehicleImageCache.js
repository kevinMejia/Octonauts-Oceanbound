import {vehicleImageSize} from './vehicleTexturePolicy.js';
// Keep compressed image bytes, not a growing collection of decoded RGBA images.
// Shared sources also let Three reuse GPU textures with identical sampler settings.
export class VehicleImageCache{
 constructor({hash,decode,makeSource,constants={},maxTextureSize=Infinity}){Object.assign(this,{hash,decode,makeSource,constants,maxTextureSize});this.entries=new Map();this.decodedBytes=0;this.peakDecodedBytes=0;this.uploads=new WeakMap();}
 async get(bytes,mime='image/png'){
  const originalKey=await this.hash(bytes),constant=this.constants[originalKey],key=constant?'constant:'+constant:originalKey;
  if(this.entries.has(key))return this.entries.get(key);
  if(constant)bytes=Uint8Array.from(atob(constant),c=>c.charCodeAt(0));
  const view=new DataView(bytes.buffer??bytes,bytes.byteOffset??0,bytes.byteLength),originalWidth=view.getUint32(16),originalHeight=view.getUint32(20),{width,height}=vehicleImageSize(originalWidth,originalHeight,this.maxTextureSize);
  const entry={key,width,height,originalWidth,originalHeight,blob:new Blob([bytes],{type:mime}),source:this.makeSource({width,height}),users:0,image:null,pending:null};
  this.entries.set(key,entry);return entry;
 }
 async withImage(entry,upload){
  entry.users++;
  try{
   if(!entry.image){
    entry.pending??=Promise.resolve().then(()=>this.decode(entry.blob,{width:entry.width,height:entry.height})).then(image=>{entry.image=image;entry.source.data=image;this.decodedBytes+=entry.width*entry.height*4;this.peakDecodedBytes=Math.max(this.peakDecodedBytes,this.decodedBytes);return image;}).finally(()=>{entry.pending=null;});
    await entry.pending;
   }
   return await upload();
  }finally{
   if(--entry.users===0&&entry.image){const image=entry.image;entry.source.data={width:entry.width,height:entry.height};entry.image=null;this.decodedBytes-=entry.width*entry.height*4;if(image.close)image.close();else if(image.getContext){image.width=image.height=0;}else image.removeAttribute?.('src');}
  }
 }
 uploaded(renderer,texture){return this.uploads.get(renderer)?.get(texture)===texture.version;}
 markUploaded(renderer,texture){if(!this.uploads.has(renderer))this.uploads.set(renderer,new WeakMap());this.uploads.get(renderer).set(texture,texture.version);}
 resetUploads(renderer){this.uploads.delete(renderer);}
 snapshot(){return {maxTextureSize:Number.isFinite(this.maxTextureSize)?this.maxTextureSize:null,uniqueImages:this.entries.size,encodedBytes:[...this.entries.values()].reduce((n,e)=>n+e.blob.size,0),decodedBytes:this.decodedBytes,peakDecodedBytes:this.peakDecodedBytes};}
}
