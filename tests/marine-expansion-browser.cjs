const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1280,height:850}}),page=await context.newPage(),errors=[];
 await context.addInitScript(()=>{if(!localStorage.getItem('oceanbound.marine-discoveries.v1'))localStorage.setItem('oceanbound.marine-discoveries.v1',JSON.stringify({version:1,ids:['octopus','bottlenose-dolphin','whale-shark','giant-manta-ray']}));});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404')){errors.push(m.text());console.error(m.text());}});
 await page.goto('http://localhost:5173/?quality=low');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');
 await page.evaluate(()=>{explorer.discovery.blocked=()=>true;});
 console.log('Expanded collection loaded');assert.equal(await page.evaluate(()=>explorer.marineDiscovery.count),4);assert.equal(await page.evaluate(()=>explorer.marineAnimals.records.length),11);
 await page.click('#creatureCollection');assert.match(await page.locator('.marine-content').innerText(),/4 of 11/);assert.equal(await page.locator('.marine-locked').count(),7);await page.click('.marine-close');
 fs.mkdirSync('.local-assets',{recursive:true});
 const counts=await page.evaluate(()=>explorer.marineAnimals.records.filter(r=>r.members).map(r=>r.members.length));assert.deepEqual(counts,[3,4,6,2,1,3,1]);
 for(const id of ['hammerhead-shark','seahorse','jellyfish','spotted-eagle-ray','moray-eel','pufferfish','humpback-whale']){
  await page.evaluate(id=>{const g=explorer,r=g.marineAnimals.records.find(r=>r.definition.id===id),p=r.points.at(-1);Object.assign(g.sub.position,p);Object.assign(g.sub.previousPosition,p);g.sub.speed=g.sub.vertical=0;},id);
  console.log('Approached',id);await page.waitForSelector('#marineDialog[open]');const expected=await page.evaluate(id=>explorer.marineDiscovery.records.get(id).commonName,id);assert.match(await page.locator('.marine-content h3').innerText(),new RegExp(expected));
  assert.equal(await page.evaluate(()=>explorer.pause.paused),true);assert.ok(await page.locator('.marine-content>img').evaluate(img=>img.complete&&img.naturalWidth===256));
  await page.waitForTimeout(250);await page.screenshot({path:'.local-assets/expanded-'+id+'.png'});
  await page.click('.marine-continue');await page.waitForFunction(()=>!explorer.marineCollection.dialog.open);assert.equal(await page.evaluate(id=>explorer.marineDiscovery.isDiscovered(id),id),true);
 }
 await page.click('#creatureCollection');assert.match(await page.locator('.marine-content').innerText(),/11 of 11/);assert.equal(await page.locator('.marine-locked').count(),0);
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);const box=await page.locator('#marineDialog').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1);await page.locator('.marine-card').last().click();assert.match(await page.locator('.marine-content h3').innerText(),/Humpback Whale/);await page.click('.marine-continue');}
 await page.click('.marine-close');await page.reload();await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');assert.equal(await page.evaluate(()=>explorer.marineDiscovery.count),11);
 const movement=await page.evaluate(()=>{const g=explorer,release=g.pause.acquire('group-route-check'),results=[];
  for(const r of g.marineAnimals.records.filter(r=>r.members)){const resources=new Set();r.visual.group.traverse(o=>{if(o.geometry)resources.add(o.geometry);});const initial=r.points.map(p=>p.clone());let maxMeshes=0;
   for(let i=0;i<800;i++){g.marineAnimals.update(.05,r.visual.group.position,true);for(let j=0;j<r.members.length;j++){const p=r.points[j],d=r.definition;if(r.movement?(Math.hypot(p.x-r.movement.config.center.x,p.z-r.movement.config.center.z)>r.movement.config.habitatRadius||p.y<r.movement.config.minY||p.y>r.movement.config.maxY):(Math.abs(p.x-d.position.x)>d.behavior.radius+d.group.spacing*2+d.behavior.footprint||Math.abs(p.z-d.position.z)>d.behavior.radius+d.group.spacing*2+d.behavior.footprint||p.y<r.floor+d.behavior.clearance||p.y>42))throw Error('Unsafe group route '+d.id);for(let k=j+1;k<r.points.length;k++)if(p.distanceTo(r.points[k])<d.group.spacing*.65)throw Error('Overlapping group '+d.id);}}
   const after=new Set();r.visual.group.traverse(o=>{if(o.geometry){after.add(o.geometry);maxMeshes++;}});if(after.size!==resources.size||![...after].every(geometry=>resources.has(geometry)))throw Error('Geometry rebuilt '+r.definition.id);
   results.push({id:r.definition.id,count:r.members.length,moved:r.points.some((p,i)=>p.distanceTo(initial[i])>.1),inScene:r.visual.group.parent===g.scene,geometryCount:resources.size,meshes:maxMeshes});
  }release();return results;
 });assert.ok(movement.every(r=>r.moved&&r.inScene));assert.deepEqual(errors,[]);
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1'}),phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto('http://localhost:5173/?quality=low');await phone.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await phone.tap('#startup-play');await phone.tap('#creatureCollection');assert.match(await phone.locator('.marine-content').innerText(),/0 of 11/);assert.equal(await phone.locator('.marine-locked').count(),11);
 const mobileImages=await phone.evaluate(async()=>{const {vehicleImages}=await import('/src/vehicles/VehicleTextures.js');return vehicleImages.snapshot();});assert.equal(mobileImages.maxTextureSize,512);assert.equal(mobileImages.decodedBytes,0);assert.deepEqual(errors,[]);await mobile.close();
 fs.writeFileSync('.local-assets/marine-expansion-results.json',JSON.stringify({total:11,savedReload:true,mobileBounds:true,movement,errors},null,2));console.log(JSON.stringify({total:11,savedReload:true,mobileBounds:true,movement,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
