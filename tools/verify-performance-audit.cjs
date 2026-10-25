const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const baseline=fs.readFileSync('docs/performance-audit/baseline-revision.txt','utf8').trim();
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const mobile=process.argv.includes('--mobile');
 const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*?auditReference',route=>{
  const path=new URL(route.request().url()).pathname.slice(1);
  return route.fulfill({contentType:'text/javascript',body:execFileSync('git',['show',`${baseline}:${path}`],{encoding:'utf8'})});
 });
 await page.goto('http://127.0.0.1:5173/?quality='+ (mobile?'low':'high') +'&benchmark');
 await page.waitForFunction(()=>window.explorer?.ready,{timeout:180000});
 await page.click('#startup-play');await page.keyboard.down('KeyW');await page.waitForTimeout(1000);await page.keyboard.up('KeyW');
 const result=await page.evaluate(async()=>{
  const g=window.explorer;g.renderer.setAnimationLoop(null);
  const {OceanDecorations}=await import('/src/environment/OceanDecorations.js?auditReference');
  const {ReefHabitat}=await import('/src/environment/ReefHabitat.js?auditReference');
  const {Compass}=await import('/src/navigation/Compass.js?auditReference');
  const reference=(source,prototype)=>Object.assign(Object.create(prototype),source,{lastPosition:null,batches:source.batches.map(b=>({...b,low:b.low.clone(),high:b.high?.clone()}))});
  const decor=reference(g.decor,OceanDecorations.prototype),habitat=reference(g.habitat,ReefHabitat.prototype);
  const tally=source=>source.batches.reduce((sum,b)=>sum+b.low.instanceMatrix.version+(b.high?.instanceMatrix.version??0)+(b.low.instanceColor?.version??0)+(b.high?.instanceColor?.version??0),0);
  const compare=(a,b)=>{for(let i=0;i<a.batches.length;i++)for(const lod of ['high','low']){const x=a.batches[i][lod],y=b.batches[i][lod];if(!x)continue;if(x.count!==y.count)throw Error('Instance count mismatch');for(const key of ['instanceMatrix','instanceColor']){if(!x[key])continue;const n=x.count*(key==='instanceMatrix'?16:3);for(let j=0;j<n;j++)if(x[key].array[j]!==y[key].array[j])throw Error('Instance buffer mismatch');}}};
  const locations=[[0,20,65],[0,20,65],[0,20,65],[0,20,65],[0,20,65],[15,20,65],[40,20,65],[51,20,65],[180,25,180],[500,25,500],[0,20,65]];
  const start={optimized:tally(g.decor)+tally(g.habitat),original:tally(decor)+tally(habitat)};
  let cases=0,time=100;
  for(const [x,y,z] of locations)for(const heading of [0,0,0,Math.PI/2,Math.PI,-Math.PI/2]){
   const p={x,y,z};g.camera.position.set(x,y+5,z-20);g.camera.lookAt(x+Math.sin(heading)*20,y,z+Math.cos(heading)*20);time+=.2;
   g.decor.update(time,p,g.camera);decor.update(time,p,g.camera);g.habitat.update(time,p,g.camera);habitat.update(time,p,g.camera);compare(g.decor,decor);compare(g.habitat,habitat);cases++;
  }
  const updates={optimized:tally(g.decor)+tally(g.habitat)-start.optimized,original:tally(decor)+tally(habitat)-start.original};
  const compass=g.compass;let domCases=0;
  for(let i=0;i<40;i++){
   g.gup.group.position.set(i*3,15,i*2);g.gup.group.rotation.y=i*.1;compass.update(1/60,g.gup.group);
   const expected=compass.element.outerHTML;const originalCompass=Object.assign(Object.create(Compass.prototype),compass);originalCompass.update(0,g.gup.group);
   if(expected!==compass.element.outerHTML)throw Error('Compass DOM differs from original');domCases++;
  }
  const r=[...g.crew.records.values()].find(r=>!r.home);g.rescue.start({id:r.definition.id,name:r.definition.name,model:r.model,height:r.height,radius:r.radius});g.rescue.update(1/60,false);g.renderScene();const escort=!!g.rescue.active;g.rescue.stop();
  const letter=g.wordHunt.records.find(r=>!g.wordHunt.progress.ids.has(r.id));Object.assign(g.sub.position,letter.root.position);Object.assign(g.sub.previousPosition,g.sub.position);g.wordHunt.update(0,g.sub);const collection=g.wordHunt.progress.ids.has(letter.id);
  const obstacle=g.octopod.colliders[0];Object.assign(g.sub.position,{x:obstacle.x,y:obstacle.y,z:obstacle.z});g.sub.update(1/60,{thrust:1,turn:0,rise:0,boost:false});const collisionHits=g.collisions.metrics.hits;
  if(!escort||!collection||!collisionHits)throw Error('Gameplay smoke check failed');
  return {instanceBufferEqualityCases:cases,compassDomEqualityCases:domCases,instanceAttributeVersionIncrements:updates,smoke:{escort,collection,collisionHits},quality:g.quality};
 });
 result.errors=errors;if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(process.env.AUDIT_OUTPUT??('docs/performance-audit/equivalence'+(mobile?'-mobile':'')+'.json'),JSON.stringify(result,null,2));console.log(result);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
