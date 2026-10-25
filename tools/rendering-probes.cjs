// QA-only instrumentation. All counters observe actual renderer/WebGL calls.
module.exports=async function installRenderingProbes(){
 const g=window.explorer,T=await import('/vendor/three.module.js'),r=g.renderer,gl=r.getContext();
 const labels=new WeakMap(),arrays=new WeakMap();
 const tag=(root,label)=>root?.traverse(o=>labels.set(o,label));
 tag(g.octopod?.model,'octopod');tag(g.crew?.group,'crew');tag(g.crew?.world,'crew');tag(g.gup.group,'vehicle');
 for(const a of g.marineAnimals.records)tag(a.visual.group,'animal:'+a.definition.id);
 for(const b of g.decor.batches)for(const m of [b.high,b.low])tag(m,'decor');
 for(const b of g.habitat.batches)for(const m of [b.high,b.low])tag(m,'habitat');
 for(const c of g.terrain.chunks)tag(c,'terrain');
 tag(g.fish.mesh,'fish');for(const m of g.fish.visitors.meshes)tag(m,'visitors');tag(g.fish.turtle.mesh,'turtle');
 for(const m of [g.interactions.cloudMesh,g.interactions.chips,g.interactions.branches,g.interactions.sand])tag(m,'interactions');
 tag(g.atmosphere.propulsion.points,'propulsion');tag(g.atmosphere.ambient.points,'ambient');
 const classify=o=>labels.get(o)??o.name??'other';
 const register=()=>g.scene.traverse(o=>{
  for(const [key,a] of Object.entries(o.geometry?.attributes??{}))arrays.set(a.array,classify(o)+':'+key);
  if(o.instanceMatrix)arrays.set(o.instanceMatrix.array,classify(o)+':matrix');
  if(o.instanceColor)arrays.set(o.instanceColor.array,classify(o)+':color');
 });
 let counters;const reset=()=>{register();counters={passes:{},objects:{},uploads:{},matrixUpdates:{},gpuMs:[]};};reset();
 const direct=r.renderBufferDirect;r.renderBufferDirect=function(camera,scene,geometry,material,object,group){
  const before={...r.info.render};const result=direct.call(this,camera,scene,geometry,material,object,group);
  const calls=r.info.render.calls-before.calls,triangles=r.info.render.triangles-before.triangles;
  const pass=scene===null?'shadow':scene!==g.scene?'hud':r.getRenderTarget()?'transmission':'main',label=classify(object);
  for(const [map,key] of [[counters.passes,pass],[counters.objects,pass+':'+label]]){map[key]??={calls:0,triangles:0};map[key].calls+=calls;map[key].triangles+=triangles;}
  return result;
 };
 const sub=gl.bufferSubData;gl.bufferSubData=function(target,offset,data,start=0,count){
  const key=arrays.get(data)??'other',bytes=data.BYTES_PER_ELEMENT?((count===undefined||count===0?data.length-start:count)*data.BYTES_PER_ELEMENT):data.byteLength;
  const entry=counters.uploads[key]??={requests:0,bytes:0};entry.requests++;entry.bytes+=bytes;
  return sub.apply(this,arguments);
 };
 const matrix=T.Object3D.prototype.updateMatrix;T.Object3D.prototype.updateMatrix=function(){const key=classify(this);counters.matrixUpdates[key]=(counters.matrixUpdates[key]??0)+1;return matrix.call(this);};
 const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),pending=[];
 const begin=()=>{if(!ext||pending.length>=4)return null;const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);return {q,owner:counters};};
 const end=query=>{if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query);}};
 const poll=()=>{while(pending.length&&gl.getQueryParameter(pending[0].q,gl.QUERY_RESULT_AVAILABLE)){const {q,owner}=pending.shift();if(!gl.getParameter(ext.GPU_DISJOINT_EXT))owner.gpuMs.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}};
 const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 const snapshot=async()=>{
  const state=[],parts=[];g.scene.traverseVisible(o=>{
   state.push([classify(o),o.name,o.type,o.count??null,Array.from(o.matrixWorld.elements)]);
   if(o.isInstancedMesh){parts.push(o.instanceMatrix.array.subarray(0,o.count*16));if(o.instanceColor)parts.push(o.instanceColor.array.subarray(0,o.count*3));}
   if(o.geometry&&['fish','propulsion','interactions'].includes(classify(o)))for(const a of Object.values(o.geometry.attributes)){const n=o.isInstancedMesh?(a.isInstancedBufferAttribute?o.count:a.count):Math.min(a.count,o.geometry.drawRange.count);parts.push(a.array.subarray(0,n*a.itemSize));}
  });
  const byteLength=parts.reduce((n,a)=>n+a.byteLength,0),bytes=new Uint8Array(byteLength);let offset=0;for(const a of parts){bytes.set(new Uint8Array(a.buffer,a.byteOffset,a.byteLength),offset);offset+=a.byteLength;}
  const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  return {transforms:await digest(new TextEncoder().encode(JSON.stringify(state))),activeBuffers:await digest(bytes),pixels:await digest(pixels),visibleNodes:state.length};
 };
 const compareFullUploads=async()=>{
  const read=()=>{const bytes=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
  // Same scene, same simulation time, same renderer: compare the optimized draw
  // with full uploads + enabled local matrix recomposition (baseline semantics).
  const difference=(a,b)=>{let different=0,maxDelta=0,totalDelta=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)different++;maxDelta=Math.max(maxDelta,d);totalDelta+=d;}return {differentChannels:different,maxChannelDelta:maxDelta,meanAbsoluteChannelDelta:totalDelta/a.length,comparedChannels:a.length};};
  g.renderScene();const optimized=read();g.renderScene();const optimizedRepeat=read(),frozen=[];
  g.scene.traverse(o=>{
   if(!o.matrixAutoUpdate){frozen.push(o);o.matrixAutoUpdate=true;}
   const label=classify(o),attributes=o.geometry?.attributes??{};
   const dynamic=label==='fish'?[o.instanceMatrix,o.instanceColor,attributes.swimPhase]:label==='visitors'?[o.instanceMatrix]:label==='propulsion'||label==='Rescue passenger water trail'?[attributes.position,attributes.bubble,attributes.flowDirection]:label==='interactions'?[o.instanceMatrix,o.instanceColor,attributes.cloud,attributes.shade,attributes.details]:[];
   for(const a of dynamic)if(a){a.clearUpdateRanges();a.needsUpdate=true;}
  });
  g.renderScene();const full=read();g.renderScene();const fullRepeat=read();for(const o of frozen)o.matrixAutoUpdate=false;
  return {...difference(optimized,full),unchangedRenderRepeat:difference(optimized,optimizedRepeat),fullUploadRepeat:difference(full,fullRepeat)};
 };
 const meshes=[];g.octopod.model.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,vertices:o.geometry.attributes.position.count,triangles:(o.geometry.index?.count??o.geometry.attributes.position.count)/3,groups:o.geometry.groups.length,materials:[].concat(o.material).map(m=>m.uuid),transparent:[].concat(o.material).some(m=>m.transparent),skinned:!!o.isSkinnedMesh,children:o.children.length});});
 const transmission=[];g.scene.traverse(o=>{for(const m of [].concat(o.material??[]))if(m.transmission>0)transmission.push({object:o.name,material:m.name,factor:m.transmission,side:m.side,transparent:m.transparent});});
 const rendererInfo=gl.getExtension('WEBGL_debug_renderer_info');
 window.renderingProbes={reset,begin,end,poll,snapshot,compareFullUploads,get counters(){return counters;},inventory:{octopod:meshes,transmission,renderer:rendererInfo?gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL):null,gpuTimerSupported:!!ext}};
};
