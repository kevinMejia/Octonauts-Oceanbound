const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
 await page.goto('http://localhost:5173/?quality=low');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');
 await page.evaluate(()=>{localStorage.removeItem('oceanbound.marine-discoveries.v1');explorer.marineDiscovery.ids.clear();});
 assert.equal(await page.evaluate(()=>explorer.marineAnimals.records.length),4);
 await page.click('#creatureCollection');assert.match(await page.locator('.marine-content').innerText(),/0 of 4/);assert.equal(await page.locator('.marine-locked img').count(),4);
 fs.mkdirSync('.local-assets',{recursive:true});await page.waitForTimeout(250);await page.screenshot({path:'.local-assets/marine-locked.png'});await page.click('.marine-close');
 for(const id of ['octopus','bottlenose-dolphin','whale-shark','giant-manta-ray']){
  await page.evaluate(id=>{const g=explorer,r=g.marineAnimals.records.find(r=>r.definition.id===id);Object.assign(g.sub.position,r.visual.group.position);Object.assign(g.sub.previousPosition,g.sub.position);g.sub.speed=g.sub.vertical=0;},id);
  await page.waitForSelector('#marineDialog[open]');assert.match(await page.locator('#marineTitle').innerText(),/CREATURE DISCOVERED/);
  assert.ok(await page.locator('.marine-content>img').evaluate(img=>img.complete&&img.naturalWidth===256));
  await page.waitForTimeout(250);await page.screenshot({path:'.local-assets/marine-'+id+'.png'});
  assert.equal(await page.evaluate(()=>explorer.pause.paused),true);await page.click('.marine-continue');await page.waitForFunction(()=>!explorer.marineCollection.dialog.open);
  assert.equal(await page.evaluate(id=>explorer.marineDiscovery.isDiscovered(id),id),true);
 }
 await page.click('#creatureCollection');assert.match(await page.locator('.marine-content').innerText(),/4 of 4/);assert.equal(await page.locator('.marine-locked').count(),0);await page.waitForTimeout(250);await page.screenshot({path:'.local-assets/marine-unlocked.png'});
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);const box=await page.locator('#marineDialog').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1);}
 await page.click('.marine-close');await page.reload();await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');assert.equal(await page.evaluate(()=>explorer.marineDiscovery.count),4);
 const models=await page.evaluate(()=>explorer.marineAnimals.records.map(r=>({id:r.definition.id,children:r.visual.group.children.length,position:r.visual.group.position.toArray()})));const motion=await page.evaluate(()=>{const g=explorer,release=g.pause.acquire('marine-test'),results=[];
 for(const r of g.marineAnimals.records){const before=r.visual.group.position.clone();for(let i=0;i<600;i++){g.marineAnimals.update(.05,r.visual.group.position);const p=r.visual.group.position,d=r.definition;if(Math.abs(p.x-d.position.x)>d.behavior.radius+.01||Math.abs(p.z-d.position.z)>d.behavior.radius*.65+.01||p.y<r.floor+d.behavior.clearance-.01||p.y>40)throw Error('Unsafe route: '+d.id);}
 results.push({id:r.definition.id,moved:before.distanceTo(r.visual.group.position)>1,parent:r.visual.group.parent===g.scene});}release();return results;});assert.ok(motion.every(r=>r.moved&&r.parent));assert.equal(models.length,4);assert.ok(models.every(m=>m.children>0));assert.deepEqual(errors,[]);console.log(JSON.stringify({discovered:4,reloaded:true,mobileBounds:true,models,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
