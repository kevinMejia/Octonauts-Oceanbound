const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5173/?quality=low');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});
 const initial=await page.evaluate(()=>explorer.marineAnimals.records.filter(r=>r.members?.length>1).map(r=>({id:r.definition.id,points:r.points.map(p=>p.toArray()),variation:r.members.map(m=>m.variation),headings:r.members.map(m=>m.swimmer?.heading??m.heading)})));
 for(const group of initial){assert.equal(new Set(group.points.map(p=>p[2].toFixed(2))).size,group.points.length,group.id);assert.equal(new Set(group.headings.map(p=>p.toFixed(2))).size,group.points.length,group.id);}
 const result=await page.evaluate(async()=>{const g=explorer,release=g.pause.acquire('group-test'),{heightAt}=await import('/src/environment/terrainMath.js'),groups=g.marineAnimals.records.filter(r=>r.members?.length>1),records=groups.map(r=>({id:r.definition.id,minSpacing:Infinity,minTravel:Infinity,maxSpacing:0,headingSpread:0,stopped:r.members.map(()=>0),reacted:r.members.map(()=>false)})),durations=[],far={x:700,y:30,z:700},near=[];let last=groups.map(r=>r.points.map(p=>p.clone())),travel=groups.map(r=>r.points.map(()=>0));
 for(let i=0;i<6000;i++){const start=performance.now();g.marineAnimals.update(.05,far,true);durations.push(performance.now()-start);
  for(let k=0;k<groups.length;k++){const r=groups[k],c=r.groupConfig,out=records[k],d=r.definition;
   for(let j=0;j<r.points.length;j++){const p=r.points[j];const moved=p.distanceTo(last[k][j]);travel[k][j]+=moved;if(moved<.001)out.stopped[j]++;last[k][j].copy(p);if(r.independent&&j)out.headingSpread=Math.max(out.headingSpread,Math.abs(Math.sin(r.members[j].swimmer.heading-r.members[0].swimmer.heading)));
    if(p.y<heightAt(p.x,p.z)+d.behavior.clearance-.01||p.y>42)throw Error('Depth '+d.id);
    const limit=r.independent?r.movement.config.habitatRadius:d.behavior.radius+c.spawnRadius+c.driftRadius+1;
    if(Math.hypot(p.x-d.position.x,p.z-d.position.z)>limit+.1)throw Error('Habitat '+d.id);
    for(let n=0;n<j;n++){const spacing=p.distanceTo(r.points[n]);out.minSpacing=Math.min(out.minSpacing,spacing);out.maxSpacing=Math.max(out.maxSpacing,spacing);if(spacing<c.spawnMinSeparation-.01)throw Error('Separation '+d.id+': '+spacing);}
    if(i%20===0)for(const s of g.interactions.surfaces.grid.query(p.x,p.z,d.behavior.footprint,near)){const height=r.independent?r.members[j].swimmer.config.bodyHeight:Math.max(1,d.scale);if(s.solid&&Math.abs(p.y-s.y)<(s.ry??s.radius)+height&&Math.hypot(p.x-s.x,p.z-s.z)<Math.max(s.rx??s.radius,s.rz??s.radius)+d.behavior.footprint-.01)throw Error('Solid intersection '+d.id);}
   }
  }
 }
 for(let k=0;k<groups.length;k++){records[k].minTravel=Math.min(...travel[k]);records[k].travelByMember=travel[k];}
 const sharks=groups.find(r=>r.independent);for(let j=0;j<sharks.members.length;j++){const m=sharks.members[j];m.swimmer.cooldown=0;const p={...m.swimmer.position,x:m.swimmer.position.x-15};for(let i=0;i<10;i++){g.marineAnimals.update(.05,p,true);records.find(r=>r.id===sharks.definition.id).reacted[j]||=m.swimmer.escapeLeft>0;}}
 for(const r of groups){const saved=g.marineDiscovery.groupPositions.get(r.definition.id);for(let i=0;i<r.points.length;i++)if(saved[i].distanceTo(r.points[i])>.001)throw Error('Discovery point stale');}
 durations.sort((a,b)=>a-b);release();return {groups:records,p95UpdateMs:durations[Math.floor(durations.length*.95)],meanUpdateMs:durations.reduce((a,b)=>a+b,0)/durations.length};});
 for(const g of result.groups){assert(g.minTravel>5,JSON.stringify(g));if(g.id==='hammerhead-shark'){assert(g.reacted.every(Boolean));assert(g.minTravel>1000,JSON.stringify(g));assert(g.headingSpread>.5);assert(g.maxSpacing-g.minSpacing>10);}}assert.deepEqual(errors,[]);
 await page.evaluate(()=>explorer.pause.acquire('screenshots'));await page.click('#startup-play');await page.waitForSelector('#startup',{state:'detached'});
 for(const id of ['jellyfish','hammerhead-shark','pufferfish']){await page.evaluate(id=>{const g=explorer;g.pause.acquire('snapshot');const r=g.marineAnimals.records.find(r=>r.definition.id===id),p=r.points.reduce((v,p)=>v.add(p),r.points[0].clone().set(0,0,0)).multiplyScalar(1/r.points.length);g.camera.position.set(p.x+10,p.y+13,p.z+35);g.camera.lookAt(p);g.gup.group.visible=false;g.renderer.render(g.scene,g.camera);},id);await page.screenshot({path:'.local-assets/group-'+id+'.png'});}
 const emulated=[];
 for(const [name,viewport] of [['iPhone',{width:390,height:844}],['iPad',{width:820,height:1180}]]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'}),device=await context.newPage();device.on('pageerror',e=>errors.push(e.message));await device.goto('http://localhost:5173/?quality=low');await device.waitForSelector('#startup-play:not([hidden])',{timeout:180000});
  const sample=await device.evaluate(()=>{const g=explorer,durations=[];for(let i=0;i<600;i++){const start=performance.now();g.marineAnimals.update(1/60,{x:180,y:20,z:195},true);durations.push(performance.now()-start);}durations.sort((a,b)=>a-b);return {p95UpdateMs:durations[570],counts:g.marineAnimals.records.filter(r=>r.members).map(r=>r.members.length)};});assert.deepEqual(sample.counts,[3,4,6,2,1,3,1]);await device.tap('#startup-play');await device.tap('#creatureCollection');assert.match(await device.locator('.marine-content').innerText(),/0 of 11/);emulated.push({name,...sample});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('.local-assets/group-randomization-results.json',JSON.stringify({initial,...result,emulated,errors},null,2));console.log(JSON.stringify({...result,emulated,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
