const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
for(const quality of ['high','low']){
 const page=await browser.newPage(quality==='low'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5173/?quality='+quality+'&benchmark');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');
 const before=await page.evaluate(()=>{
 const g=explorer;g.renderer.setAnimationLoop(null);g.residencyHold=g.pause.acquire('residency-test');g.discovery.blocked=()=>true;const r=g.discovery.records.get('gup-a');let clock=1000000;
 g.residencyStep=distance=>{clock+=601;Object.assign(g.sub.position,{x:r.pose.x+distance,y:30,z:r.pose.z});Object.assign(g.sub.previousPosition,g.sub.position);g.discovery.visibilityAt=0;const descriptor=Object.getOwnPropertyDescriptor(performance,'now');Object.defineProperty(performance,'now',{configurable:true,value:()=>clock});try{g.discovery.update(g.sub);}finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete performance.now;}};
 g.residencyHandles=()=>{const handles=new Set();r.vehicle.group.traverse(o=>{for(const m of [].concat(o.material??[]))for(const t of Object.values(m))if(t?.isTexture){const handle=g.renderer.properties.get(t).__webglTexture;if(handle)handles.add(handle);}});return handles.size;};
 g.residencyStep(159);const proxy=r.proxies.map(p=>p.solid);g.residencyStep(161);if(r.vehicle.group.visible||r.evicted||!g.residencyHandles())throw Error('Hidden grace state failed');
 g.residencyContext=g.renderer.getContext().getExtension('WEBGL_lose_context');if(!g.residencyContext)throw Error('Context loss extension unavailable');
 return {hidden:true,retained:true,handles:g.residencyHandles(),proxy,position:r.vehicle.group.position.toArray()};
 });
 await page.evaluate(()=>explorer.residencyContext.loseContext());await page.waitForFunction(()=>explorer.graphicsRecovering===true);await page.waitForTimeout(250);await page.evaluate(()=>explorer.residencyContext.restoreContext());await page.waitForFunction(()=>!explorer.graphicsRecovering,null,{timeout:60000});
 const recovery=await page.evaluate(()=>{const g=explorer,r=g.discovery.records.get('gup-a');if(!r.evicted||r.vehicle.group.visible||g.residencyHandles())throw Error('Hidden resources incorrectly treated as restored');if(!g.pause.paused)throw Error('Other pause owner lost');return {evicted:true,hidden:true,pausePreserved:true};});
 const pending=await page.evaluate(()=>{const g=explorer,r=g.discovery.records.get('gup-a');g.residencyStep(159);return {restoring:r.restoring,visible:r.vehicle.group.visible};});assert.equal(pending.restoring,true);assert.equal(pending.visible,false);
 await page.waitForFunction(()=>{const r=explorer.discovery.records.get('gup-a');return !r.evicted&&!r.restoring&&r.vehicle.group.visible;},null,{timeout:60000});
 const after=await page.evaluate(async()=>{const g=explorer,r=g.discovery.records.get('gup-a'),{vehicleImages}=await import('/src/vehicles/VehicleTextures.js');g.renderScene();if(!g.residencyHandles()||g.renderer.getContext().isContextLost()||vehicleImages.snapshot().decodedBytes!==0)throw Error('Re-entry resource state failed');return {handles:g.residencyHandles(),proxy:r.proxies.map(p=>p.solid),position:r.vehicle.group.position.toArray(),sceneCopies:g.scene.children.filter(o=>o===r.vehicle.group).length,images:vehicleImages.snapshot()};});
 assert.deepEqual(before.proxy,after.proxy);assert.deepEqual(before.position,after.position);assert.equal(after.handles,before.handles);assert.equal(after.sceneCopies,1);assert.deepEqual(errors,[]);
 results.push({quality,before,recovery,pending,after,errors});console.log(quality,'hidden grace -> context loss -> safe re-entry passed');await page.close();
}
await browser.close();fs.mkdirSync('docs/performance-audit/fleet-residency-data',{recursive:true});fs.writeFileSync('docs/performance-audit/fleet-residency-data/context-recovery.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
