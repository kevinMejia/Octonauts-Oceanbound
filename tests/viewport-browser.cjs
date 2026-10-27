const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const portrait of [false,true]){
  const page=await browser.newPage({viewport:portrait?{width:390,height:844}:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:3}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/?quality=low&benchmark');await page.waitForFunction(()=>window.explorer?.ready,{timeout:180000});await page.click('#startup-play');
  await page.evaluate(()=>{const g=explorer;g.pause.acquire('viewport-test');window.resizeCalls=0;const original=g.renderer.setSize.bind(g.renderer);g.renderer.setSize=(...args)=>{resizeCalls++;return original(...args);};});
  async function verify(){return page.evaluate(()=>{const g=explorer,c=g.renderer.domElement,r=c.getBoundingClientRect(),body=document.body.getBoundingClientRect(),v=visualViewport,gl=g.renderer.getContext(),ratio=g.renderer.getPixelRatio();
   const check=(ok,label)=>{if(!ok)throw Error(label);};check(Math.abs(r.width-v.width)<=1&&Math.abs(r.height-v.height)<=1,'canvas viewport');check(Math.abs(body.width-r.width)<=1&&Math.abs(body.height-r.height)<=1,'body canvas');check(Math.abs(g.camera.aspect-r.width/r.height)<.001,'camera aspect');check(gl.drawingBufferWidth===Math.floor(r.width*ratio)&&gl.drawingBufferHeight===Math.floor(r.height*ratio),'buffer DPR');
   for(const id of ['joystick','turboHud','compass','vehicleToggle']){const el=document.getElementById(id);if(!el||el.hidden)continue;const b=el.getBoundingClientRect();check(b.left>=-1&&b.top>=-1&&b.right<=r.width+1&&b.bottom<=r.height+1,id+' bounds');}
   return {width:r.width,height:r.height,ratio,calls:resizeCalls,textures:g.renderer.info.memory.textures,geometries:g.renderer.info.memory.geometries};
  });}
  await verify();let final;
  for(let i=0;i<15;i++){const wide=(i%2===0)===portrait;await page.setViewportSize(wide?{width:844,height:390}:{width:390,height:844});await page.evaluate(()=>dispatchEvent(new Event('orientationchange')));await page.waitForTimeout(1100);final=await verify();}
  for(let i=0;i<8;i++){await page.setViewportSize(i%2?{width:390,height:844}:{width:844,height:390});await page.evaluate(()=>dispatchEvent(new Event('orientationchange')));}
  await page.waitForTimeout(1100);final=await verify();const count=final.calls;await page.waitForTimeout(1200);assert.equal((await verify()).calls,count,'no continuous resizes');
  // Real browser touch dispatch reaches the existing input handler after rotations.
  const button=page.locator('[data-action="forward"]'),box=await button.boundingBox();const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});assert.equal(await page.evaluate(()=>explorer.input.read().thrust),1);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({start:portrait?'portrait':'landscape',transitions:15,rapid:8,final,errors}));await page.close();
 }
 const desktop=await browser.newPage({viewport:{width:1280,height:800}});await desktop.goto('http://localhost:5173/?quality=low');await desktop.waitForFunction(()=>explorer?.ready,{timeout:180000});assert.equal(await desktop.evaluate(()=>explorer.camera.aspect),1.6);await desktop.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});

