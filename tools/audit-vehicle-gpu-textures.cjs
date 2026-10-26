const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({headless:true,channel:'msedge'}),profiles=[];
for(const quality of ['low','high']){
const p=await b.newPage(quality==='low'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto('http://127.0.0.1:5173/?quality='+quality+'&benchmark');await p.waitForFunction(()=>window.explorer?.ready,null,{timeout:180000});
const result=await p.evaluate(async()=>{
 const g=explorer;g.renderer.setAnimationLoop(null);const {vehicleImages}=await import('/src/vehicles/VehicleTextures.js'),{textureBytes}=await import('/src/ui/gpuTextureMemory.js');
 for(const [id,r] of g.discovery.records){g.unlocks.unlock(id);await g.discovery.ensure(r);}g.discovery.sync();g.discovery.blocked=()=>true;g.discovery.visibilityAt=0;g.discovery.update(g.sub);
 const deadline=performance.now()+120000;while([...g.discovery.records.values()].some(r=>r.restoring)){if(performance.now()>deadline)throw Error('Preparation timeout');await new Promise(r=>setTimeout(r,10));}g.renderScene();
 const entries=new Map([...vehicleImages.entries.values()].map(e=>[e.source,e.key])),handles=new Map(),sources=new Map(),materials=[],meshes=[];let sequence=0;
 const cacheFields=['wrapS','wrapT','wrapR','magFilter','minFilter','anisotropy','internalFormat','format','type','generateMipmaps','premultiplyAlpha','flipY','unpackAlignment','colorSpace'];
 for(const [id,r] of g.discovery.records){
 const seenMaterials=new Set();r.vehicle.group.traverse(o=>{if(!o.isMesh)return;meshes.push({vehicle:id,name:o.name,visible:o.visible,vertices:o.geometry.attributes.position.count,groups:o.geometry.groups,materials:[].concat(o.material).map(m=>m.uuid)});
 for(const m of [].concat(o.material)){
 if(seenMaterials.has(m))continue;seenMaterials.add(m);
 const record={vehicle:id,uuid:m.uuid,name:m.name,visible:m.visible,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest,emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity,textures:[]};
 for(const [slot,t] of Object.entries(m)){
 if(!t?.isTexture)continue;const handle=g.renderer.properties.get(t).__webglTexture;if(!handles.has(handle))handles.set(handle,++sequence);
 const source=entries.get(t.source)??'untracked:'+t.source.uuid,settings=Object.fromEntries(cacheFields.map(k=>[k,t[k]??null])),key=JSON.stringify(settings),bytes=textureBytes(t);
 const tex={slot,uuid:t.uuid,name:t.name,source,width:t.image?.width,height:t.image?.height,settings,handle:handle?handles.get(handle):null,bytes};
 record.textures.push(tex);const sourceKey=source+'|'+key;if(!sources.has(sourceKey))sources.set(sourceKey,{source,settings,handles:new Set(),bytes,vehicles:new Set(),slots:new Set()});const group=sources.get(sourceKey);if(handle)group.handles.add(handles.get(handle));group.vehicles.add(id);group.slots.add(slot);
 }materials.push(record);
 }});
 }
 const usedMaterials=new Set();for(const mesh of meshes){if(mesh.materials.length===1)usedMaterials.add(mesh.materials[0]);else for(const group of mesh.groups)if(group.count>0)usedMaterials.add(mesh.materials[group.materialIndex]);}
 const meshSummary={meshes:meshes.length,hiddenMeshes:meshes.filter(m=>!m.visible).length,multiMaterialMeshes:meshes.filter(m=>m.materials.length>1).length,unusedMaterialSlots:materials.filter(m=>!usedMaterials.has(m.uuid)).length};
 const groups=[...sources.values()].map(s=>({...s,handles:[...s.handles],vehicles:[...s.vehicles],slots:[...s.slots]})),native=new Map();for(const m of materials)for(const t of m.textures)if(t.handle)native.set(t.handle,t.bytes);
 return {quality:g.quality,materials:materials.map(m=>({...m,textures:m.textures.map(t=>({slot:t.slot,source:t.source,handle:t.handle}))})),meshSummary,sourceGroups:groups,duplicateCompatibleGroups:groups.filter(g=>g.handles.length>1),estimatedBytes:[...native.values()].reduce((a,b)=>a+b,0),nativeHandles:native.size,images:vehicleImages.snapshot(),glError:g.renderer.getContext().getError()};
});result.errors=errors;if(errors.length)throw Error(errors.join('\n'));profiles.push(result);console.log(quality,'MiB',result.estimatedBytes/1048576,'compatible duplicate groups',result.duplicateCompatibleGroups.length);await p.close();
}await b.close();fs.mkdirSync('docs/performance-audit/vehicle-textures-data',{recursive:true});for(const profile of profiles)fs.writeFileSync('docs/performance-audit/vehicle-textures-data/runtime-'+profile.quality+'.json',JSON.stringify(profile));})().catch(e=>{console.error(e);process.exit(1)});
