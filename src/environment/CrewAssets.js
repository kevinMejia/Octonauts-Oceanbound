import {GLTFLoader} from '../../vendor/GLTFLoader.js';

// Share decoded embedded images across crew GLBs, retaining each texture's sampler/UV state.
// These sources live as long as the crew; do not dispose them when moving an entity.
export function crewLoader(){
 const sources=new Map();
 return new GLTFLoader().register(parser=>({name:'OCEANBOUND_CREW_IMAGES',loadTexture(index){
  const sourceIndex=parser.json.textures[index].source,image=parser.json.images?.[sourceIndex];
  if(image?.mimeType!=='image/png'||image.bufferView===undefined||!globalThis.crypto?.subtle)return null;
  return (async()=>{
   const bytes=await parser.getDependency('bufferView',image.bufferView);
   const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   if(!sources.has(key)){
    const pending=parser.loadTextureImage(index,sourceIndex,parser.textureLoader).then(texture=>{if(!texture)throw Error('Crew texture unavailable');return texture.source;});
    sources.set(key,pending);pending.catch(()=>{if(sources.get(key)===pending)sources.delete(key);});
   }
   const source=await sources.get(key);
   const texture=await parser.loadTextureImage(index,sourceIndex,{isImageBitmapLoader:true,load:(_url,onLoad)=>onLoad(source.data)});
   if(!texture)throw Error('Crew texture unavailable');texture.source=source;return texture;
  })();
 }}));
}

