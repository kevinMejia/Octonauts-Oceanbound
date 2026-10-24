const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:750}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/?quality=low');await page.waitForSelector('#startup-play:not([hidden])',{timeout:180000});await page.click('#startup-play');
 const result=await page.evaluate(()=>{const g=explorer,release=g.pause.acquire('reef-swim-check'),results=[];
  for(const id of ['octopus','moray-eel']){const r=g.marineAnimals.records.find(r=>r.definition.id===id),group=r.visual.group,resources=new Set();group.traverse(o=>{if(o.geometry)resources.add(o.geometry);});const headings=new Set();let minMovement=Infinity,maxMovement=0;
   for(let window=0;window<20;window++){const start=group.position.clone();for(let frame=0;frame<60;frame++){g.marineAnimals.update(.05,group.position,true);const p=group.position,d=r.definition;if(Math.abs(p.x-d.position.x)>d.behavior.radius+.01||Math.abs(p.z-d.position.z)>d.behavior.radius*.65+.01||p.y<r.floor+d.behavior.clearance||p.y>42)throw Error('Unsafe route '+id);}
    const distance=start.distanceTo(group.position);minMovement=Math.min(minMovement,distance);maxMovement=Math.max(maxMovement,distance);headings.add(group.rotation.y.toFixed(1));
    const trigger=id==='moray-eel'?g.marineDiscovery.groupPositions.get(id)[0]:g.marineDiscovery.positions.get(id);const target=id==='moray-eel'?r.points[0]:group.position;if(Math.hypot(trigger.x-target.x,trigger.y-target.y,trigger.z-target.z)>.001)throw Error('Stale discovery center '+id);
   }
   const after=new Set();group.traverse(o=>{if(o.geometry)after.add(o.geometry);});if(after.size!==resources.size||![...after].every(item=>resources.has(item)))throw Error('Geometry changed '+id);
   results.push({id,minMovement,maxMovement,turns:headings.size,center:r.definition.position});
  }release();return results;
 });for(const r of result){assert.ok(r.minMovement>1,'Visible movement every three seconds: '+r.id);assert.ok(r.turns>5);}assert.deepEqual(errors,[]);console.log(JSON.stringify({result,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
