// Local QA only. Uses the bundled Playwright runtime; adds no game dependency.
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5173/?quality=high&benchmark&inspect');
 await page.waitForFunction(()=>window.explorer?.ready,{timeout:180000});
 console.log('ready');
 const result=await page.evaluate(async()=>{
  const g=window.explorer;g.renderer.setAnimationLoop(null);g.releaseStartup();document.body.classList.remove('starting');document.querySelector('#startup').remove();
  const stats=a=>{const b=a.slice().sort((a,b)=>a-b);return {mean:a.reduce((s,v)=>s+v,0)/a.length,median:b[Math.floor(b.length*.5)],p95:b[Math.floor(b.length*.95)]};};
  const scenarios=[['octopod',g.sub.position.x,g.sub.position.y,g.sub.position.z],['reef',0,18,65],['high-speed',0,25,160],['animals',g.marineAnimals.records[0].definition.position.x,25,g.marineAnimals.records[0].definition.position.z],['particles',0,18,65],['collision',0,5,45],['letter',g.wordHunt.records[0].point.x,g.wordHunt.records[0].point.y,g.wordHunt.records[0].point.z],['escort',100,24,170]];
  const results=[];let time=0;
  for(const [name,x,y,z] of scenarios){
   Object.assign(g.sub.position,{x,y,z});Object.assign(g.sub.previousPosition,g.sub.position);g.sub.heading=0;g.sub.speed=name==='high-speed'?20:0;g.chase.initial=true;g.gup.update(0,g.sub);g.chase.update(0,g.sub,g.input);
   if(name==='escort'){const r=[...g.crew.records.values()].find(r=>!r.home);if(r)g.rescue.start({id:r.definition.id,name:r.definition.name,model:r.model,height:r.height,radius:r.radius});}
   const costs={},frames=[];let last;let mutations=0;const observer=new MutationObserver(records=>mutations+=records.length);observer.observe(document.querySelector('#compass'),{subtree:true,attributes:true,childList:true,characterData:true});
   const measure=(key,fn,record)=>{const t=performance.now();fn();if(record)(costs[key]??=[]).push(performance.now()-t);};
   for(let i=0;i<150;i++){
    await new Promise(requestAnimationFrame);const now=performance.now(),record=i>=30;if(record&&last)frames.push(now-last);last=now;time+=1/60;
    if(name==='particles'&&i%30===0)g.interactions.burst(x,y,z,1,0,0);
    measure('physics',()=>g.sub.update(1/60,{thrust:name==='high-speed'?1:0,turn:0,rise:0,boost:name==='high-speed'}),record);
    g.gup.update(1/60,g.sub);g.chase.update(1/60,g.sub,g.input);
    measure('animals',()=>g.marineAnimals.update(1/60,g.sub.position),record);
    measure('compass',()=>g.compass.update(1/60,g.gup.group),record);
    measure('habitat',()=>g.habitat.update(time,g.sub.position,g.camera),record);
    measure('decor',()=>g.decor.update(time,g.sub.position,g.camera),record);
    measure('terrain',()=>g.terrain.update(time,g.sub.position),record);
    measure('effects',()=>g.interactions.update(1/60,g.sub,g.sub.collisionContact,g.camera),record);
    measure('water',()=>g.atmosphere.update(time,1/60,g.sub,g.gup.group,g.camera,1),record);
    measure('fish',()=>g.fish.update(1/60,time,g.sub,g.camera),record);
    measure('crew',()=>g.crew.update(1/60,g.camera),record);
    measure('rescue',()=>g.rescue.update(1/60,false),record);
    measure('wordHunt',()=>g.wordHunt.update(1/60,g.sub),record);
    measure('render',()=>g.renderScene(),record);
   }
   observer.disconnect();results.push({name,frameMs:stats(frames),costMs:Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,stats(v)])),compassMutations:mutations,render:{...g.renderer.info.render},memory:{...g.renderer.info.memory},collision:{...g.collisions.metrics},heap:performance.memory?.usedJSHeapSize});
   if(name==='escort')g.rescue.stop();
  }
  return {userAgent:navigator.userAgent,renderer:g.renderer.getContext().getParameter(g.renderer.getContext().RENDERER),viewport:[innerWidth,innerHeight],pixelRatio:g.renderer.getPixelRatio(),results};
 });
 result.errors=errors;fs.mkdirSync('docs/performance-audit',{recursive:true});fs.writeFileSync(process.argv[2]??'docs/performance-audit/baseline.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
