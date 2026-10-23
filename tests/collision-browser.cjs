const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://localhost:5173/dist/?collisionDebug');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});assert.equal(await page.evaluate(()=>!!explorer.audio.context),false);
 await page.click('#startup-play');await page.evaluate(()=>explorer.audio.loading);await page.waitForTimeout(900);
 assert.equal(await page.evaluate(()=>explorer.audio.context.state),'running');assert.equal(await page.evaluate(()=>!!explorer.audio.turboSound&&!!explorer.audio.impacts&&!!explorer.audio.bubbles&&Object.keys(explorer.audio.channels).length===2),true);
 await page.evaluate(()=>{explorer.sub.turbo.charge=100;});await page.keyboard.down('w');await page.waitForTimeout(70);await page.keyboard.up('w');await page.waitForTimeout(60);await page.keyboard.down('w');
 await page.waitForFunction(()=>explorer.sub.turbo.active);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>explorer.audio.turboSound.played),1);await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>explorer.audio.turboSound.played),1);await page.keyboard.up('w');
 await page.click('#menuToggle');await page.evaluate(()=>{const a=explorer.audio,original=a.smooth.bind(a);a.smooth=(param,value,seconds)=>{if(param===a.channelGains.turbo.gain)a.lastTurboTarget=value;return original(param,value,seconds);};});await page.locator('#audio-turbo').evaluate(el=>{el.value=23;el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('oceanbound.audio.v1')).turbo),.23);assert.equal(await page.evaluate(()=>explorer.audio.lastTurboTarget),.23);await page.screenshot({path:'.local-assets/collision-audio-panel.png'});await page.click('#closeSettings');await page.waitForTimeout(250);
 const data=await page.evaluate(async()=>{
  const g=explorer;g.pause.set('qa',true);
  const {resolveReefCollision}=await import('/src/environment/habitatLayout.js');const {resolveOctopodCollision}=await import('/src/environment/octopodCollision.js');const {hullFloor}=await import('/src/collision/collisionMath.js');
  const all=Array.from(g.interactions.surfaces.grid.cells.values()).flat(),solid=all.filter(s=>s.solid);
  const stats={registered:all.length,solids:solid.length,bySurface:{},gridShared:g.collisions.grid===g.chase.obstacles.grid&&g.interactions.surfaces.rockGrid===g.collisions.grid};for(const s of solid)stats.bySurface[s.surface]=(stats.bySurface[s.surface]||0)+1;
  const saved={...g.sub.position},probes=[],contacts={};let effectContact=null;
  for(const type of ['rock','coral','octopod']){
   let found=null;
   for(const s of solid.filter(s=>s.surface===type)){
    if(s.ry<.85)continue;const vehicle=new g.sub.constructor();vehicle.collisionProxy=g.sub.collisionProxy;vehicle.movement=g.sub.movement;vehicle.heading=0;
    const y=Math.max(hullFloor(vehicle,s.x,s.z)+.1,s.y+s.ry*.25-(vehicle.collisionProxy.centerY||0));
    Object.assign(vehicle.previousPosition,{x:s.x,y,z:s.z-s.rz-vehicle.collisionProxy.halfLength-2});Object.assign(vehicle.position,{x:s.x,y,z:s.z+s.rz+vehicle.collisionProxy.halfLength+2});vehicle.speed=40;g.collisions.resolve(vehicle,.05);
    if(vehicle.collisionContact?.surface===type){contacts[type]={...vehicle.collisionContact};found={type,impact:vehicle.collisionContact.impact,position:{...vehicle.position},candidates:g.collisions.metrics.candidates};if(type==='coral'){effectContact={...vehicle.collisionContact};Object.assign(g.sub.position,vehicle.position);}break;}
   }
   if(!found)throw Error('No actual '+type+' contact');probes.push(found);
  }
  if(effectContact){g.interactions.lastReef=-10;g.interactions.update(.016,g.sub,effectContact,g.camera);}
  g.interactions.lastReef=-10;g.interactions.update(.016,g.sub,contacts.rock,g.camera);
  g.interactions.touching=false;g.interactions.lastImpact=-10;Object.assign(g.sub.floorContact,{clearance:0,touching:true,impact:5,floor:g.sub.position.y-1.7});g.interactions.update(.016,g.sub,null,g.camera);
  g.audio.setPaused(false);g.audio.impacts.last=-Infinity;const beforeImpacts=g.audio.impacts.played;g.audio.playCollision(contacts.rock);if(g.audio.impacts.played!==beforeImpacts+1)throw Error('Collision sound did not start');g.audio.setPaused(true);
  const effects={...g.interactions.events};
  const micro=[],rock=g.decor.showcaseColliders[0],locations=[{name:'dense reef',x:g.habitat.layout[0].x,y:g.habitat.layout[0].y+4,z:g.habitat.layout[0].z},{name:'scattered rocks',x:rock.x,y:rock.y+rock.ry*.5,z:rock.z},{name:'Octopod',x:180,y:17.5,z:110}];
  function summary(times){times.sort((a,b)=>a-b);return {median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)]};}
  for(const location of locations){
   const sub=new g.sub.constructor();sub.collisionProxy=g.sub.collisionProxy;sub.heading=.5;const w=new g.collisions.constructor(g.interactions.surfaces),old=[],next=[];let candidates=0,maxCandidates=0;const oldProxy={radius:2.2,halfHeight:1.1,halfLength:3,terrainClearance:1.7,surfaceClearance:2.5};
   const batchSize=32,positions=Array.from({length:batchSize},()=>({x:0,y:0,z:0})),p={x:0,y:0,z:0};
   for(let batch=0;batch<130;batch++){
    for(let i=0;i<batchSize;i++){const phase=(batch*batchSize+i)*.07;Object.assign(positions[i],{x:location.x+Math.sin(phase)*6,y:location.y,z:location.z+Math.cos(phase)*6});}
    let begin=performance.now();for(const point of positions){Object.assign(p,point);resolveReefCollision(p,g.habitat.colliders,2.2,1.1);resolveOctopodCollision(p,g.decor.showcaseColliders,.5,oldProxy);if(Math.hypot(p.x-180,p.z-100)<36)resolveOctopodCollision(p,g.octopod.colliders,.5,oldProxy);}const oldTime=(performance.now()-begin)/batchSize;
    begin=performance.now();for(const point of positions){Object.assign(sub.previousPosition,{x:point.x-.12,y:point.y,z:point.z-.2});Object.assign(sub.position,point);sub.speed=12;sub.vertical=0;sub.collisionDrift.x=sub.collisionDrift.z=0;w.resolve(sub,1/60);if(batch>=10){candidates+=w.metrics.candidates;maxCandidates=Math.max(maxCandidates,w.metrics.candidates);}}const newTime=(performance.now()-begin)/batchSize;
    if(batch>=10){old.push(oldTime);next.push(newTime);}
   }
   micro.push({location:location.name,batches:next.length,batchSize,legacyMs:summary(old),sweptMs:summary(next),averageCandidates:candidates/(next.length*batchSize),maxCandidates});
  }
  // Render one real coral-area debug view using the same game scene and renderer.
  const probe=probes.find(p=>p.type==='coral');Object.assign(g.sub.position,probe.position);g.gup.update(0,g.sub);g.chase.initial=true;g.chase.update(0,g.sub,g.input);g.decor.lastUpdate=-1;g.decor.update(20,g.sub.position,g.camera);g.habitat.update(20,g.sub.position,g.camera);Object.assign(g.sub.previousPosition,g.sub.position);g.collisions.resolve(g.sub,.016);g.collisionDebug.next=0;g.collisionDebug.update(g.sub);g.renderer.render(g.scene,g.camera);
  return {stats,probes,effects,micro,legacyStaticLists:{reef:g.habitat.colliders.length,showcase:g.decor.showcaseColliders.length,octopod:g.octopod.colliders.length},turboBufferDuration:g.audio.turboSound.buffer.duration,collisionBufferDuration:g.audio.impacts.buffer.duration};
 });
 assert.equal(data.stats.gridShared,true);assert.ok(data.effects.coral>0&&data.effects.rock>0&&data.effects.sand>0);fs.mkdirSync('docs/collisions',{recursive:true});await page.screenshot({path:'docs/collisions/nearby-debug.png'});
 // Real selector switching changes only the active hull, never the environment grid.
 for(const [id,index] of [['gup-a',0],['gup-r',2],['gup-b',1]]){await page.click('#vehicleToggle');await page.evaluate(index=>explorer.vehicleSelector.highlight(index),index);await page.click('#confirmVehicle');await page.waitForFunction(id=>explorer.vehicles.activeId===id,id);await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>explorer.sub.collisionProxy===explorer.vehicles.activeVehicle.definition.collision),true);}
 assert.deepEqual(errors,[]);
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(String(e)));await phone.goto('http://localhost:5173/dist/');await phone.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await phone.tap('#startup-play');await phone.evaluate(()=>explorer.audio.loading);await phone.waitForTimeout(900);assert.equal(await phone.evaluate(()=>explorer.audio.context.state),'running');await phone.tap('#menuToggle');assert.equal(await phone.locator('#audio-turbo').isVisible(),true);await phone.locator('#audio-turbo').evaluate(el=>{el.value=31;el.dispatchEvent(new Event('input',{bubbles:true}));});await phone.waitForTimeout(600);await phone.screenshot({path:'docs/collisions/mobile-audio.png'});assert.equal(await phone.evaluate(()=>explorer.audio.settings.turbo),.31);assert.equal(await phone.evaluate(()=>!!explorer.collisionDebug),false);
 assert.deepEqual(errors,[]);fs.writeFileSync('docs/collisions/browser-results.json',JSON.stringify({...data,browserErrors:errors,mobile:'Chromium touch emulation; physical iPhone Safari not tested'},null,2));console.log(JSON.stringify(data));await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
