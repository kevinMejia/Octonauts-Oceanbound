const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(process.env.SHAKE_TEST_URL||'http://localhost:5173/dist/?quality=low');
  await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');
  const results=[];
  for(const [name,width,height,intensity] of [['desktop',1280,800,100],['portrait',390,844,100],['portrait-default',390,844,30],['disabled',390,844,0]]){
   await page.setViewportSize({width,height});
   await page.click('#menuToggle');await page.click('#gameplayTab');await page.check('#cameraShake');
   await page.locator('#shakeIntensity').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},intensity);
   await page.click('#closeSettings');await page.waitForTimeout(250);
   await page.evaluate(()=>{
    const g=explorer,s=g.sub;
    if(!g.shakeTestWall){g.shakeTestWall={x:600,y:25,z:600,rx:8,ry:9,rz:.1,angle:0,surface:'rock',solid:true};g.interactions.surfaces.add(g.shakeTestWall);}
    // Drive into a real solid using the normal input, physics, camera and render loop.
    Object.assign(s.position,{x:600,y:25,z:590});s.heading=0;s.pitch=s.bank=s.vertical=0;s.speed=12;s.collisionDrift.x=s.collisionDrift.z=0;
    g.collisions.separation=1;g.chase.clearShake();g.chase.initial=true;g.chase.update(0,s,g.input);
    const qa=window.shakeQA={hits:0,impact:0,frames:0,peakAngle:0,peakOffset:0,peakPixels:0,peakHullOffset:0,peakHullTilt:0,tail:0,shot:null,settings:{...g.chase.shake.settings}};
    if(!g.shakeOriginalImpact)g.shakeOriginalImpact=g.collisions.onImpact;
    g.collisions.onImpact=c=>{g.shakeOriginalImpact(c);if(c.fresh&&c.impact>.65){qa.hits++;qa.impact=Math.max(qa.impact,c.impact);}};
    if(!g.shakeOriginalRender)g.shakeOriginalRender=g.renderScene;
    const point=g.chase.target.clone(),basePoint=point.clone(),shownPoint=point.clone(),savedPosition=g.camera.position.clone(),savedRotation=g.camera.quaternion.clone();
    g.renderScene=function(){
     g.shakeOriginalRender.call(g);
     if(!qa.hits)return;
     qa.frames++;qa.peakHullOffset=Math.max(qa.peakHullOffset,g.gup.impactPivot.position.length());qa.peakHullTilt=Math.max(qa.peakHullTilt,Math.abs(g.gup.impactPivot.rotation.x),Math.abs(g.gup.impactPivot.rotation.z));const angle=g.camera.quaternion.angleTo(g.chase.baseRotation),offset=g.camera.position.distanceTo(g.chase.basePosition);
     qa.peakAngle=Math.max(qa.peakAngle,angle);qa.peakOffset=Math.max(qa.peakOffset,offset);
     shownPoint.copy(point).project(g.camera);
     savedPosition.copy(g.camera.position);savedRotation.copy(g.camera.quaternion);
     g.camera.position.copy(g.chase.basePosition);g.camera.quaternion.copy(g.chase.baseRotation);g.camera.updateMatrixWorld();
     basePoint.copy(point).project(g.camera);
     g.camera.position.copy(savedPosition);g.camera.quaternion.copy(savedRotation);g.camera.updateMatrixWorld();
     const pixels=Math.hypot((shownPoint.x-basePoint.x)*innerWidth/2,(shownPoint.y-basePoint.y)*innerHeight/2);
     if(pixels>qa.peakPixels){qa.peakPixels=pixels;qa.shot=g.renderer.domElement.toDataURL('image/png');}
     qa.tail=angle+offset+g.gup.impactPivot.position.length()+Math.abs(g.gup.impactPivot.rotation.x)+Math.abs(g.gup.impactPivot.rotation.z);
    };
   });
   await page.keyboard.down('w');
   await page.waitForFunction(()=>window.shakeQA?.hits>0,{},{timeout:30000});
   await page.waitForTimeout(650);
   await page.keyboard.up('w');
   await page.waitForTimeout(700);
   const r=await page.evaluate(()=>{const {shot,...data}=window.shakeQA;return {...data,shot};});
   if(intensity){assert(r.peakAngle>.001,name+' missing rendered angular shake');assert(r.peakPixels>2,name+' invisible rendered shake');assert(r.peakHullOffset>.005,name+' missing hull bump');assert(r.peakHullTilt>.001,name+' missing hull tilt');}
   else{assert(r.peakAngle<1e-6);assert.equal(r.peakOffset,0);assert.equal(r.peakPixels,0);assert.equal(r.peakHullOffset,0);assert.equal(r.peakHullTilt,0);}
   assert(r.tail<1e-6,name+' residual shake');
   if(r.shot)fs.writeFileSync('.local-assets/shake-'+name+'.png',Buffer.from(r.shot.split(',')[1],'base64'));
   delete r.shot;results.push({name,...r});
  }
  assert(results[1].peakAngle>results[2].peakAngle*2.5,'Slider failed to scale actual rendered rotation');
  assert.deepEqual(errors,[]);console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
