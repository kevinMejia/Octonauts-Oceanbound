const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
for(const quality of ['high','low']){
 const page=await browser.newPage(quality==='low'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/SceneryWarmup.js',route=>{
 const source=fs.readFileSync('src/environment/SceneryWarmup.js','utf8').replace('export async function warmNearbyScenery','async function performWarmup');
 const verify=String.raw`
function snapshot(g){return JSON.stringify({
 camera:[g.camera.position.toArray(),g.camera.quaternion.toArray(),g.camera.projectionMatrix.toArray()],
 sub:{...g.sub.position},
 children:g.scene.children.map(o=>[o.uuid,o.visible,o.frustumCulled,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray()]),
 target:g.renderer.getRenderTarget()?.uuid??null,face:g.renderer.getActiveCubeFace(),level:g.renderer.getActiveMipmapLevel(),
 viewport:g.renderer.getViewport(new Vector4()).toArray(),scissor:g.renderer.getScissor(new Vector4()).toArray(),scissorTest:g.renderer.getScissorTest(),
 shadow:[g.renderer.shadowMap.enabled,g.renderer.shadowMap.type,g.renderer.shadowMap.autoUpdate,g.renderer.shadowMap.needsUpdate]
});}
export async function warmNearbyScenery(g){
 const before=snapshot(g),render=g.renderer.render;let passes=0;
 g.renderer.render=function(...args){
  if(getComputedStyle(g.renderer.domElement).visibility!=='hidden'||!document.body.classList.contains('starting'))throw Error('Warm-up exposed gameplay canvas');
  if(g.renderer.shadowMap.autoUpdate||g.renderer.shadowMap.needsUpdate)throw Error('Warm-up updates shadows');
  passes++;return render.apply(this,args);
 };
 try{await performWarmup(g);}finally{g.renderer.render=render;}
 if(before!==snapshot(g))throw Error('Warm-up changed camera, scene visibility/transforms or render state');
 window.sceneryWarmCheck={passes,restored:true,canvasHidden:true};
}
`;
 return route.fulfill({contentType:'text/javascript',body:source+verify});
 });
 await page.goto('http://127.0.0.1:5173/?quality='+quality+'&benchmark');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});
 const startup=await page.evaluate(()=>({check:window.sceneryWarmCheck,ready:explorer.ready,paused:explorer.pause.paused,playedAudio:!!explorer.audio.context}));if(!startup.check?.restored||!startup.paused||startup.playedAudio)throw Error('Startup state failed');
 await page.click('#startup-play');await page.keyboard.down('KeyW');await page.waitForTimeout(350);await page.keyboard.up('KeyW');
 const gameplay=await page.evaluate(async()=>{
 const g=window.explorer;g.renderer.setAnimationLoop(null);const T=await import('/vendor/three.module.js'),{warmNearbyScenery}=await import('/src/environment/SceneryWarmup.js?comparison');
 const snapshot=()=>JSON.stringify({camera:[g.camera.position.toArray(),g.camera.quaternion.toArray()],sub:{...g.sub.position},objects:g.scene.children.map(o=>[o.uuid,o.visible,o.frustumCulled,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray()]),viewport:g.renderer.getViewport(new T.Vector4()).toArray(),scissor:g.renderer.getScissor(new T.Vector4()).toArray(),scissorTest:g.renderer.getScissorTest(),shadow:[g.renderer.shadowMap.enabled,g.renderer.shadowMap.autoUpdate,g.renderer.shadowMap.needsUpdate]});
 const read=()=>{const pixels=new Uint8Array(innerWidth*innerHeight*4);g.renderer.getContext().readPixels(0,0,innerWidth,innerHeight,g.renderer.getContext().RGBA,g.renderer.getContext().UNSIGNED_BYTE,pixels);return pixels;};
 g.renderScene();const before=read();g.renderScene();const repeat=read();const state=snapshot();await warmNearbyScenery(g);if(snapshot()!==state)throw Error('Repeat warm-up failed to restore state');g.renderScene();const after=read();let changed=0,repeatChanged=0;for(let i=0;i<after.length;i++){if(before[i]!==after[i])changed++;if(before[i]!==repeat[i])repeatChanged++;}
 const crew=[...g.crew.records.values()].find(r=>!r.home);g.rescue.start({id:crew.definition.id,name:crew.definition.name,model:crew.model,height:crew.height,radius:crew.radius});g.rescue.update(1/60,false);g.renderScene();const escort=!!g.rescue.active;g.rescue.stop();
 const letter=g.wordHunt.records.find(r=>!g.wordHunt.progress.ids.has(r.id));Object.assign(g.sub.position,letter.root.position);Object.assign(g.sub.previousPosition,g.sub.position);g.wordHunt.update(0,g.sub);const collection=g.wordHunt.progress.ids.has(letter.id);
 const obstacle=g.octopod.colliders[0];Object.assign(g.sub.position,{x:obstacle.x,y:obstacle.y,z:obstacle.z});g.sub.update(1/60,{thrust:1,turn:0,rise:0,boost:false});const collisionHits=g.collisions.metrics.hits;
 if(!escort||!collection||!collisionHits)throw Error('Gameplay smoke failed');
 return {repeatWarmStateRestored:true,changedChannels:changed,unchangedRepeatChannels:repeatChanged,escort,collection,collisionHits};
 });
 if(errors.length)throw Error(errors.join('\n'));results.push({quality,startup,gameplay,errors});console.log(results.at(-1));await page.close();
}
await browser.close();fs.mkdirSync('docs/performance-audit/scenery-warmup-data',{recursive:true});fs.writeFileSync('docs/performance-audit/scenery-warmup-data/verification.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
