import {Vector4} from '../../vendor/three.module.js';

// Startup only: populate the existing nearby terrain buffers behind the loading
// screen. A tiny canvas viewport keeps the normal output/tone-mapping shader
// variant; a render target would compile a different variant in this renderer.
export async function warmNearbyScenery({renderer,scene,camera,terrain,sub}){
 const visibility=scene.children.map(object=>[object,object.visible]);
 terrain.update(0,sub.position);
 const chunks=terrain.chunks.filter(chunk=>chunk.visible);
 const culling=chunks.map(chunk=>chunk.frustumCulled);
 const target=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel();
 const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest();
 const shadows=renderer.shadowMap,autoUpdate=shadows.autoUpdate,needsUpdate=shadows.needsUpdate;
 try{
  // Shadow rendering belongs to the following normal startup render.
  shadows.autoUpdate=false;shadows.needsUpdate=false;
  renderer.setRenderTarget(null);renderer.setViewport(0,0,1,1);renderer.setScissor(0,0,1,1);renderer.setScissorTest(true);
  for(const [object] of visibility)if(!object.isLight)object.visible=false;
  for(let first=0;first<chunks.length;first+=12){
   const batch=chunks.slice(first,first+12);
   for(const chunk of batch){chunk.visible=true;chunk.frustumCulled=false;}
   renderer.render(scene,camera);
   for(const chunk of batch)chunk.visible=false;
   if(renderer.getContext().isContextLost())throw new Error('Graphics context unavailable during scenery preparation');
   if(first+12<chunks.length)await new Promise(requestAnimationFrame);
  }
 }finally{
  for(const [object,visible] of visibility)object.visible=visible;
  chunks.forEach((chunk,i)=>chunk.frustumCulled=culling[i]);
  shadows.autoUpdate=autoUpdate;shadows.needsUpdate=needsUpdate;
  renderer.setRenderTarget(target,face,level);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
 }
}
