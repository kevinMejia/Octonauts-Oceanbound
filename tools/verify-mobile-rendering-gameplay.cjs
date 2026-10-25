const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
 for(const [mode,tentacles] of [['original','batched'],['mobile','batched'],['original','original'],['','batched']]){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/?quality=low&benchmark&glass='+mode+'&tentacles='+tentacles);await page.waitForFunction(()=>window.explorer?.ready,{timeout:180000});await page.click('#startup-play');await page.keyboard.down('KeyW');await page.waitForTimeout(500);await page.keyboard.up('KeyW');
  const result=await page.evaluate(async mode=>{
   const g=window.explorer;g.renderer.setAnimationLoop(null);const T=await import('/vendor/three.module.js'),{JellyfishTentacles}=await import('/src/marine/JellyfishTentacles.js');
   const vehicles=await Promise.all(g.vehicles.cache.values());let transmission=0,facing=0;for(const v of vehicles)v.group.traverse(o=>{for(const m of [].concat(o.material??[])){if(m.transmission>0)transmission++;if(m.userData.oceanboundFacingAlpha)facing++;}});
   if(!facing||(mode!=='original'?transmission!==0:transmission===0))throw Error('Startup glass mode failed');
   const r=[...g.crew.records.values()].find(r=>!r.home);g.rescue.start({id:r.definition.id,name:r.definition.name,model:r.model,height:r.height,radius:r.radius});g.rescue.update(1/60,false);g.renderScene();const escort=!!g.rescue.active;g.rescue.stop();
   const letter=g.wordHunt.records.find(r=>!g.wordHunt.progress.ids.has(r.id));Object.assign(g.sub.position,letter.root.position);Object.assign(g.sub.previousPosition,g.sub.position);g.wordHunt.update(0,g.sub);const collection=g.wordHunt.progress.ids.has(letter.id);
   const obstacle=g.octopod.colliders[0];Object.assign(g.sub.position,{x:obstacle.x,y:obstacle.y,z:obstacle.z});g.sub.update(1/60,{thrust:1,turn:0,rise:0,boost:false});const collisionHits=g.collisions.metrics.hits;
   g.unlocks.setOverride('gup-x',true);await g.vehicles.select('gup-x');g.sub.update(1/60,{thrust:1,turn:0,rise:0,boost:false});g.gup.update(1/60,g.sub);g.renderScene();const groundSwitch=!!g.sub.groundController;
   let fallbacks=0;for(const type of ['transparent','offset']){const root=new T.Group(),pivot=new T.Group(),geometry=new T.SphereGeometry(),material=new T.MeshStandardMaterial({transparent:type==='transparent'}),mesh=new T.Mesh(geometry,material);if(type==='offset')mesh.position.x=1;pivot.add(mesh);root.add(pivot);const batch=new JellyfishTentacles(root,[{pivot,mesh}]);if(batch.enabled||batch.batches.length||!mesh.visible)throw Error('Unsafe batch did not fall back');fallbacks++;geometry.dispose();material.dispose();}
   const {createExpandedVisual}=await import('/src/marine/ExpandedVisuals.js');const visual=createExpandedVisual(g.marineAnimals.records.find(r=>r.definition.id==='jellyfish').definition);let disposed=0;for(const b of visual.tentacles.batches)b.mesh.addEventListener('dispose',()=>disposed++);visual.dispose();if(disposed!==2)throw Error('Instance cleanup failed');
   if(!escort||!collection||!collisionHits||!groundSwitch)throw Error('Gameplay smoke failed');return {mode,transmission,facing,escort,collection,collisionHits,groundSwitch,fallbacks,disposed};
  },mode);
  const batching=await page.evaluate(()=>window.explorer.marineAnimals.records.find(r=>r.definition.id==='jellyfish').members.every(m=>m.visual.tentacles.enabled));if(batching!==(tentacles==='batched'))throw Error('Batching comparison mode failed');result.tentacles=tentacles;result.errors=errors;if(errors.length)throw Error(errors.join('\n'));results.push(result);await page.close();
 }
 fs.writeFileSync('docs/performance-audit/mobile-rendering-data/gameplay.json',JSON.stringify(results,null,2));console.log(results);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
