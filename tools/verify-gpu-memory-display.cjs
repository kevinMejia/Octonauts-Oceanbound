const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
for(const quality of ['high','low']){
 const p=await browser.newPage(quality==='low'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5173/?quality='+quality+'&benchmark');await p.waitForFunction(()=>window.explorer?.ready,null,{timeout:180000});
 const result=await p.evaluate(async()=>{
 const g=explorer;g.renderer.setAnimationLoop(null);const {estimateResidentTextureMemory:estimate}=await import('/src/ui/gpuTextureMemory.js'),r=g.discovery.records.get('gup-a'),snapshot=()=>JSON.stringify({camera:[g.camera.position.toArray(),g.camera.quaternion.toArray()],sub:{...g.sub.position},objects:g.scene.children.map(o=>[o.uuid,o.visible,o.position.toArray(),o.quaternion.toArray()])});
 const state=snapshot();for(let i=0;i<5;i++)estimate(g);const times=[];for(let i=0;i<40;i++){const t=performance.now();estimate(g);times.push(performance.now()-t);}if(snapshot()!==state)throw Error('Sampling modified game state');
 const before=estimate(g);if(!(before.bytes>0)||before.unknownTextures)throw Error('Unexpected estimate');
 g.discovery.release(r.vehicle);r.evicted=true;r.vehicle.group.visible=false;const released=estimate(g);if(!(released.bytes<before.bytes))throw Error('Released texture bytes not removed');
 await g.prepareVehicle(r.vehicle);g.renderScene();const restored=estimate(g);if(restored.bytes!==before.bytes)throw Error('Restored texture estimate mismatch');
 if(g.renderer.getContext().getError()!==0)throw Error('GL error while estimating');times.sort((a,b)=>a-b);
 return {before,released,restored,scanMs:{mean:times.reduce((a,b)=>a+b,0)/times.length,median:times[20],p95:times[37],max:times.at(-1)},unchangedState:true};
 });assert.deepEqual(errors,[]);results.push({quality,...result,errors});console.log(quality,result);await p.close();
}
await browser.close();fs.mkdirSync('docs/performance-audit/gpu-memory-display-data',{recursive:true});fs.writeFileSync('docs/performance-audit/gpu-memory-display-data/verification.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
