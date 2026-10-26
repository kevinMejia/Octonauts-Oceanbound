const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
// Existing optional browser harness; no package installation is required by the game.
(async()=>{const browser=await chromium.launch({...(process.env.NAV_TEST_BROWSER?{executablePath:process.env.NAV_TEST_BROWSER}:{channel:process.env.NAV_TEST_CHANNEL??'msedge'}),headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.NAV_TEST_URL??'http://localhost:5173/')+'?quality=low');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');await page.waitForSelector('#startup',{state:'detached'});
 await page.evaluate(()=>{const g=explorer;g.pause.acquire('navigation-test');g.crewDiscovery.progress.discover('barnacles');if(!g.crewDiscovery.begin('barnacles'))throw Error('Tow did not start');});
 assert.match(await page.locator('.rescue-caption').textContent(),/Captain Barnacles - Return to Octopod/);assert.equal(await page.locator('#rescueHud canvas').count(),0);
 const bearings=await page.evaluate(async()=>{const T=await import('three'),g=explorer,n=g.rescueNavigation,c=g.rescue.centre,results=[];
  if(n.pivot.parent!==g.scene||g.scene.children.filter(o=>o===n.pivot).length!==1)throw Error('Missing or duplicated world arrow');
  for(const [name,x,z,heading] of [['north',c.x,c.z+100,Math.PI],['east',c.x-100,c.z,Math.PI],['west',c.x+100,c.z,Math.PI],['turned-away',c.x,c.z+100,0]]){
   Object.assign(g.sub.position,{x,y:c.y,z});g.sub.heading=heading;n.ready=false;n.update(0,g.rescue.active,g.sub,c);
   const actual=new T.Vector3(0,0,-1).applyQuaternion(n.pivot.quaternion),desired=new T.Vector3(c.x-n.pivot.position.x,0,c.z-n.pivot.position.z).normalize();
   if(actual.dot(desired)<.999999||n.pivot.rotation.x!==0||n.pivot.rotation.z!==0)throw Error('Wrong absolute '+name+' bearing');results.push({name,position:n.pivot.position.toArray(),yaw:n.pivot.rotation.y,distance:n.distance.textContent});
  }return results;});assert(bearings.every(v=>v.distance==='100 m'));
 const vehicleChecks=await page.evaluate(async()=>{const g=explorer,n=g.rescueNavigation,{vehicles}=await import(new URL('src/config/vehicleConfig.js',location.href).href),{rescueHullTop}=await import(new URL('src/navigation/rescueNavigation.js',location.href).href),results=[];
  for(const definition of vehicles){g.unlocks.setOverride(definition.id,true);await g.vehicles.select(definition.id);g.sub.pitch=definition.type==='ground'?-.7:.25;g.sub.bank=.2;n.update(0,g.rescue.active,g.sub,g.rescue.centre);
   const gap=n.pivot.position.y-g.sub.position.y-rescueHullTop(g.sub);if(gap<n.config.minClearance||!n.pivot.visible||n.pivot.parent!==g.scene)throw Error('Wrong placement for '+definition.id);results.push({id:definition.id,gap});}
  await g.vehicles.select('gup-b');return results;});assert(vehicleChecks.length>=9);
 fs.mkdirSync('.local-assets',{recursive:true});
 for(const size of [{width:1280,height:800},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  await page.setViewportSize(size);await page.evaluate(()=>{const g=explorer;Object.assign(g.sub.position,{x:g.rescue.centre.x,y:20,z:g.rescue.centre.z+100});g.sub.pitch=g.sub.bank=0;g.sub.heading=Math.PI;g.rescueNavigation.ready=false;g.rescueNavigation.update(0,g.rescue.active,g.sub,g.rescue.centre);g.gup.update(0,g.sub);g.chase.initial=true;g.chase.update(0,g.sub,g.input);g.renderScene();});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:'.local-assets/rescue-navigation-'+size.width+'x'+size.height+'.png'});
  assert(await page.evaluate(()=>explorer.rescueNavigation.pivot.visible));assert.equal(await page.locator('#rescueHud canvas').count(),0);
 }
 const lifecycle=await page.evaluate(()=>{const g=explorer,n=g.rescueNavigation,pivot=n.pivot;g.rescue.stop();if(pivot.visible)throw Error('Stop did not hide arrow synchronously');g.crewDiscovery.reset();
  g.crewDiscovery.progress.discover('kwazii');if(!g.crewDiscovery.begin('kwazii'))throw Error('Second escort did not start');if(n.pivot!==pivot||!pivot.visible)throw Error('Arrow not reused');g.crewDiscovery.reset();if(pivot.visible)throw Error('Reset did not hide arrow');
  g.crewDiscovery.progress.discover('peso');if(!g.crewDiscovery.begin('peso'))throw Error('Delivery escort did not start');Object.assign(g.sub.position,g.rescue.centre);Object.assign(g.rescue.active.motion.position,g.rescue.centre);g.rescue.active.recoveryGrace=0;g.rescue.update(0);if(g.rescue.active||pivot.visible)throw Error('Completion did not hide arrow');
  return{hidden:!pivot.visible,speedMultiplier:g.sub.towingSpeedMultiplier,duplicateCount:g.scene.children.filter(o=>o===pivot).length};});assert.equal(lifecycle.speedMultiplier,1);assert.equal(lifecycle.duplicateCount,1);
 const disposal=await page.evaluate(()=>{const g=explorer,n=g.rescueNavigation,others=g.scene.children.filter(o=>o!==n.pivot),resources=new Set();n.pivot.traverse(o=>{if(o.isMesh){resources.add(o.geometry);for(const m of [].concat(o.material))resources.add(m);}});let released=0;for(const r of resources)r.addEventListener('dispose',()=>released++);n.dispose();return{released,expected:resources.size,sceneIntact:others.every(o=>o.parent===g.scene),connected:n.section.isConnected};});assert.equal(disposal.released,disposal.expected);assert(disposal.sceneIntact&&!disposal.connected);assert.deepEqual(errors,[]);
 fs.writeFileSync('.local-assets/rescue-navigation-results.json',JSON.stringify({bearings,vehicleChecks,lifecycle,errors},null,2));console.log('PASS: one world-space arrow, absolute bearing, all registered vehicles, viewport captures, lifecycle and owned disposal.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
