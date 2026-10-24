const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const quality of ['low','high']){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
  await page.goto('http://localhost:5173/?quality='+quality);await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');await page.waitForTimeout(600);
  const sample=await page.evaluate(()=>{const g=explorer;g.qaPause=g.pause.acquire('sun-ray-test');const rays=g.atmosphere.sunRays.mesh;g.renderer.render(g.scene,g.camera);const on={calls:g.renderer.info.render.calls,textures:g.renderer.info.memory.textures};rays.visible=false;g.renderer.render(g.scene,g.camera);const off={calls:g.renderer.info.render.calls,textures:g.renderer.info.memory.textures};rays.visible=true;g.renderer.render(g.scene,g.camera);return {on,off,count:rays.geometry.instanceCount,shadows:g.renderer.shadowMap.enabled,gl:g.renderer.getContext().getError()};});
  assert.equal(sample.on.calls-sample.off.calls,1);assert.equal(sample.on.textures,sample.off.textures);assert.equal(sample.count,quality==='low'?3:6);assert.equal(sample.shadows,quality==='high');assert.equal(sample.gl,0);assert.deepEqual(errors,[]);console.log(quality,JSON.stringify(sample));await page.close();
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1)});
