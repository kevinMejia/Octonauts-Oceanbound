const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,...(process.env.FLEET_IPHONE_CHROME?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1'}:{})}),page=await context.newPage(),errors=[],requests={};let navigations=0,crashes=0;
  page.on('pageerror',e=>errors.push(String(e)));page.on('crash',()=>crashes++);page.on('framenavigated',f=>{if(f===page.mainFrame())navigations++;});page.on('request',r=>{const id=r.url().match(/\/models\/(gup-[a-z](?:-high)?)\.glb/);if(id)requests[id[1]]=(requests[id[1]]??0)+1;});
  await page.goto('http://localhost:5173/?quality=low&discoveryDebug');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.tap('#startup-play');await page.evaluate(()=>{explorer.marineDiscovery.blocked=()=>true;});await page.waitForTimeout(800);
  const sample=()=>page.evaluate(async()=>{const {vehicleImages}=await import('/src/vehicles/VehicleTextures.js');const handles=new Set();let vehicleGpuBytes=0;for(const r of explorer.discovery.records.values())r.vehicle?.group.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])for(const t of Object.values(m)){if(!t?.isTexture)continue;const handle=explorer.renderer.properties.get(t).__webglTexture;if(!handle||handles.has(handle))continue;handles.add(handle);vehicleGpuBytes+=t.image.width*t.image.height*4*(t.generateMipmaps?4/3:1);}});return {vehicleGpuBytes,images:vehicleImages.snapshot(),gpu:{...explorer.renderer.info.memory},active:explorer.vehicles.activeId,unlocked:[...explorer.unlocks.ids],contextLost:explorer.renderer.getContext().isContextLost(),glError:explorer.renderer.getContext().getError()};});
  const samples=[await sample()];
  for(const id of ['gup-a','gup-r','gup-c','gup-d','gup-e','gup-f','gup-q']){
   await page.evaluate(async id=>{const g=explorer,r=g.discovery.records.get(id);g.qaEnsurePause=g.pause.acquire('qa-approach');await g.discovery.ensure(r);Object.assign(g.sub.position,r.pose);Object.assign(g.sub.previousPosition,g.sub.position);g.sub.speed=g.sub.vertical=0;g.qaEnsurePause();g.discovery.update(g.sub);},id);
   await page.waitForSelector('#discoveryDialog[open]');await page.tap('#discoveryVehicle');await page.waitForFunction(id=>explorer.vehicles.activeId===id,id);await page.waitForFunction(()=>!explorer.discoveryModal.dialog.open);samples.push(await sample());console.log('Discovery',id,'decoded bytes',samples.at(-1).images.decodedBytes);
  }
  // Repeated switching and leaving/returning to the base exercise disposed GPU textures.
  for(let cycle=0;cycle<3;cycle++){
   await page.evaluate(async()=>{const g=explorer;g.qaRelease=g.pause.acquire('qa-cycle');for(const id of ['gup-a','gup-c','gup-q','gup-e','gup-r','gup-b']){Object.assign(g.sub.position,{x:300,y:30,z:250});await g.vehicles.select(id);}g.qaRelease();Object.assign(g.sub.position,{x:600,y:30,z:600});g.discovery.visibilityAt=0;g.discovery.update(g.sub);});await page.waitForTimeout(100);
   await page.evaluate(()=>{const g=explorer;Object.assign(g.sub.position,{x:180,y:25,z:165});g.sub.speed=0;g.chase.initial=true;g.discovery.visibilityAt=0;g.discovery.update(g.sub);});
   await page.waitForFunction(()=>[...explorer.discovery.records.values()].every(r=>r.id===explorer.vehicles.activeId||!r.evicted&&!r.restoring),null,{timeout:60000});samples.push(await sample());
  }
  assert.ok(samples.every(s=>s.images.decodedBytes===0));assert.ok(samples.every(s=>s.images.peakDecodedBytes<=512*512*4));assert.ok(samples.every(s=>!s.contextLost&&s.glError===0));assert.ok(samples.every(s=>s.images.maxTextureSize===512));assert.ok(samples.every(s=>s.vehicleGpuBytes<192*1024*1024));assert.equal(navigations,1);assert.equal(crashes,0);assert.ok(Object.values(requests).every(n=>n===1));
  await page.screenshot({path:'.local-assets/fleet-memory-home.png'});
  // Force a recoverable WebGL loss while another pause owner holds the game.
  await page.evaluate(()=>{const g=explorer;g.qaHold=g.pause.acquire('qa-other-menu');g.qaContextExtension=g.renderer.getContext().getExtension('WEBGL_lose_context');g.qaBefore={...g.sub.position};g.qaContextExtension.loseContext();});
  await page.waitForFunction(()=>explorer.graphicsRecovering===true);await page.waitForTimeout(250);await page.evaluate(()=>{const g=explorer,compile=g.renderer.compileAsync;g.renderer.compileAsync=async()=>{g.renderer.compileAsync=compile;throw Error('QA restoration retry');};g.qaContextExtension.restoreContext();});await page.waitForSelector('#status button',{timeout:60000});await page.tap('#status button');await page.waitForFunction(()=>!explorer.graphicsRecovering,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>explorer.pause.paused),true);assert.equal(await page.evaluate(()=>JSON.stringify(explorer.sub.position)===JSON.stringify(explorer.qaBefore)),true);assert.equal(navigations,1);assert.deepEqual(errors,[]);await page.evaluate(()=>explorer.qaHold());samples.push(await sample());
  // Safari <17 uses HTMLImageElement in the existing loader. Exercise that path
  // through a user-agent override; this is not a real Safari browser test.
  const fallback=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Version/16.6 Mobile/15E148 Safari/604.1'}),phone=await fallback.newPage();phone.on('pageerror',e=>errors.push(String(e)));await phone.goto('http://localhost:5173/?quality=low');await phone.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await phone.tap('#startup-play');await phone.waitForTimeout(700);assert.equal(await phone.evaluate(async()=>{const {vehicleImages}=await import('/src/vehicles/VehicleTextures.js');return vehicleImages.snapshot().decodedBytes;}),0);assert.deepEqual(errors,[]);
  fs.writeFileSync('.local-assets/fleet-memory-results.json',JSON.stringify({samples,navigations,crashes,requests,errors,contextRecovery:true,contextRecoveryRetry:true,htmlImageFallback:true,physicalSafariTested:false},null,2));console.log(JSON.stringify({navigations,crashes,requests,errors,first:samples[0],last:samples.at(-1),contextRecovery:true,contextRecoveryRetry:true,htmlImageFallback:true}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
