import * as T from '../../vendor/three.module.js';

const channels=new Map([[T.RedFormat,1],[T.RedIntegerFormat,1],[T.AlphaFormat,1],[T.LuminanceFormat,1],[T.RGFormat,2],[T.RGIntegerFormat,2],[T.LuminanceAlphaFormat,2],[T.RGBAFormat,4],[T.RGBAIntegerFormat,4],[T.DepthFormat,1]]);
const types=new Map([[T.UnsignedByteType,1],[T.ByteType,1],[T.ShortType,2],[T.UnsignedShortType,2],[T.HalfFloatType,2],[T.IntType,4],[T.UnsignedIntType,4],[T.FloatType,4]]);
const packed=new Map([[T.UnsignedShort4444Type,2],[T.UnsignedShort5551Type,2],[T.UnsignedInt248Type,4],[T.UnsignedInt5999Type,4]]);
// Payload estimate only: driver allocation, buffers, renderbuffers and unreachable
// renderer-internal textures are not exposed here. Never query or mutate GL state.
export function textureBytes(texture){
 if(texture.isCompressedTexture){
  if(!texture.mipmaps?.length||texture.mipmaps.some(m=>!m.data))return null;
  return texture.mipmaps.reduce((bytes,m)=>bytes+m.data.byteLength,0);
 }
 const bytesPerPixel=packed.get(texture.type)??channels.get(texture.format)*types.get(texture.type);
 if(!Number.isFinite(bytesPerPixel))return null;
 const faces=Array.isArray(texture.image)?texture.image:[texture.image];let bytes=0;
 for(const face of faces){
  const image=face?.image??face;let w=image?.width,h=image?.height,d=image?.depth??1;
  if(![w,h,d].every(n=>Number.isInteger(n)&&n>0))return null;
  if(texture.mipmaps?.length){
   for(const mip of texture.mipmaps)bytes+=mip.width*mip.height*(mip.depth??d)*bytesPerPixel;
  }else{
   do{bytes+=w*h*d*bytesPerPixel;if(!texture.generateMipmaps||w===1&&h===1&&(!texture.isData3DTexture||d===1))break;w=Math.max(1,Math.floor(w/2));h=Math.max(1,Math.floor(h/2));if(texture.isData3DTexture)d=Math.max(1,Math.floor(d/2));}while(true);
  }
 }
 return bytes;
}
export function estimateResidentTextureMemory(game){
 const properties=game?.renderer?.properties;if(!properties||!game.scene)return null;
 const textures=new Set(),materials=new Set(),roots=new Set(),allocations=new Map();
 const add=value=>{if(value?.isTexture)textures.add(value);else if(Array.isArray(value))for(const item of value)if(item?.isTexture)textures.add(item);};
 const uniforms=value=>{if(!value)return;for(const uniform of Object.values(value))add(uniform?.value);};
 const target=value=>{if(value){add(value.textures??value.texture);add(value.depthTexture);}};
 const visit=root=>{if(!root)return;for(let parent=root;parent;parent=parent.parent)if(roots.has(parent))return;roots.add(root);add(root.environment);add(root.background);root.traverse(object=>{
  add(object.skeleton?.boneTexture);add(object.morphTexture);target(object.shadow?.map);target(object.shadow?.mapPass);
  if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material]){if(materials.has(material))continue;materials.add(material);for(const value of Object.values(material))add(value);uniforms(material.uniforms);}
 });};
 visit(game.scene);visit(game.rescueNavigation?.scene);
 for(const record of game.discovery?.records?.values()??[])visit(record.vehicle?.group);
 add(game.terrain?.occlusion);add(game.decor?.occlusion);uniforms(game.terrain?.shader?.uniforms);target(game.atmosphere?.reflection);
 for(const texture of textures){
  if(properties.has&&!properties.has(texture))continue;
  const handle=properties.get(texture).__webglTexture;if(!handle)continue;
  const bytes=textureBytes(texture),previous=allocations.get(handle);
  allocations.set(handle,bytes===null?(previous??null):Math.max(previous??0,bytes));
 }
 let bytes=0,unknownTextures=0;for(const value of allocations.values()){if(value===null)unknownTextures++;else bytes+=value;}
 return {bytes,textures:allocations.size,unknownTextures};
}
