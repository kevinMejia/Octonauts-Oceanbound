const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://localhost:5173/dist/?quality=low');
 await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});
 await page.click('#startup-play');
 await page.evaluate(()=>explorer.pause.set('shake-qa',true));
 const result=await page.evaluate(async()=>{
  const g=explorer,c=g.chase,s=c.shake;
  const {gameplaySettings}=await import('/dist/src/ui/gameplayPreferences.js');
  const input={orbit:{x:0,y:0,last:-1},drag:false};
  c.clearShake();c.initial=true;c.update(0,g.sub,input);
  const base=g.camera.position.clone(),rotation=g.camera.quaternion.clone();
  s.impact({fresh:true,impact:12,nx:0,ny:1,nz:0});c.update(.025,g.sub,input);
  if(!(g.camera.position.y>c.basePosition.y))throw Error('Missing vertical jolt');
  if(g.camera.quaternion.angleTo(c.baseRotation)<=1e-6)throw Error('Missing rotational recoil');
  for(let i=0;i<30;i++)c.update(.016,g.sub,input);
  if(g.camera.position.distanceTo(base)>1e-6||g.camera.quaternion.angleTo(rotation)>1e-6)throw Error('Camera drift');
  input.orbit.x=1;c.update(.05,g.sub,input);
  if(g.camera.position.distanceTo(base)<.01)throw Error('Orbit stopped');
  s.impact({fresh:true,impact:12,nx:1,ny:0,nz:0});c.update(.025,g.sub,input);
  const before=c.basePosition.clone();c.clearShake();
  if(g.camera.position.distanceTo(before)>1e-9||g.camera.quaternion.angleTo(c.baseRotation)>1e-6||s.strength!==0)throw Error('Clear failed');
  // One million scalar updates exercise the hot path without rendering noise.
  const begin=performance.now();for(let i=0;i<1000000;i++)s.update(1/60);
  return {drift:g.camera.position.distanceTo(before),millionUpdatesMs:performance.now()-begin,defaults:{enabled:gameplaySettings.cameraShake,intensity:gameplaySettings.shakeIntensity}};
 });
 await page.click('#menuToggle');await page.click('#gameplayTab');
 assert.equal(await page.isChecked('#cameraShake'),true);
 await page.locator('#shakeIntensity').evaluate(el=>{el.value='72';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.uncheck('#cameraShake');
 assert.deepEqual(await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('oceanbound.gameplay.v1'));return [p.cameraShake,p.shakeIntensity,explorer.chase.shake.y];}),[false,.72,0]);
 await page.screenshot({path:'.local-assets/camera-shake-settings.png'});
 await page.reload();await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');await page.click('#menuToggle');await page.click('#gameplayTab');
 assert.equal(await page.isChecked('#cameraShake'),false);assert.equal(await page.inputValue('#shakeIntensity'),'72');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#shakeIntensity').isVisible(),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result));console.log('Camera restoration, orbit, desktop/mobile settings and reload persistence passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
