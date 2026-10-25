// Focused same-renderer A/B: animation-preserving tentacle batches and opt-in glass.
const {chromium}=require('playwright'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const root='docs/performance-audit/mobile-rendering-data';
const baseline=fs.readFileSync(root+'/baseline-revision.txt','utf8').trim();
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const quality of ['high','low']){
  const page=await browser.newPage(quality==='low'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*?mobileReference',route=>route.fulfill({contentType:'text/javascript',body:execFileSync('git',['show',baseline+':'+new URL(route.request().url()).pathname.slice(1)],{encoding:'utf8'})}));
  await page.goto('http://127.0.0.1:5173/?quality='+quality+'&benchmark');await page.waitForFunction(()=>window.explorer?.ready,{timeout:180000});
  await page.evaluate(()=>window.explorer.renderer.setAnimationLoop(null));await page.evaluate(require('./rendering-probes.cjs'));
  const result=await page.evaluate(async()=>{
   const g=window.explorer,T=await import('/vendor/three.module.js'),{setVehicleGlass}=await import('/src/vehicles/VehicleGlass.js');
   const {createExpandedVisual:oldCreate}=await import('/src/marine/ExpandedVisuals.js?mobileReference'),{createExpandedVisual:create}=await import('/src/marine/ExpandedVisuals.js');
   const definition=g.marineAnimals.records.find(r=>r.definition.id==='jellyfish').definition;
   let maxMatrixError=0,checks=0;
   for(let variant=0;variant<3;variant++){
    const old=oldCreate(definition,{variant}),current=create(definition,{variant});const oldPivots=old.group.children.filter(o=>o.isGroup&&o.children.length===1);
    for(let frame=0;frame<180;frame++){
     const time=frame/30+variant*.3;for(const item of [old,current]){item.group.position.set(40+Math.sin(time),24,100);item.group.rotation.set(.03,time*.1,.04);item.animate(time);item.group.updateMatrixWorld(true);}
     for(const b of current.tentacles.batches)for(let i=0;i<b.sources.length;i++){
      const source=b.sources[i],index=current.tentacles.sources.indexOf(source),local=new T.Matrix4();b.mesh.getMatrixAt(i,local);const actual=new T.Matrix4().multiplyMatrices(current.group.matrixWorld,local),expected=oldPivots[index].children[0].matrixWorld;
      for(let j=0;j<16;j++)maxMatrixError=Math.max(maxMatrixError,Math.abs(actual.elements[j]-expected.elements[j]));checks++;
      if(b.mesh.material.transparent||b.mesh.geometry.attributes.position.count!==source.mesh.geometry.attributes.position.count)throw Error('Incompatible tentacle batch');
     }
     const bellA=old.group.children[0],bellB=current.group.children[0];if(!bellA.scale.equals(bellB.scale))throw Error('Bell animation changed');
    }
    if(current.tentacles.batches.length!==2)throw Error('Unexpected batch count');old.dispose();current.dispose();
   }
   if(maxMatrixError>1e-6)throw Error('Tentacle transform differs: '+maxMatrixError);
   g.releaseStartup();document.body.classList.remove('starting');document.querySelector('#startup').remove();
   const members=g.marineAnimals.records.find(r=>r.definition.id==='jellyfish').members,vehicles=await Promise.all(g.vehicles.cache.values());
   const originalGlass=[];for(const v of vehicles)v.group.traverse(o=>{for(const m of [].concat(o.material??[]))if(m.transmission>0&&!originalGlass.some(p=>p.material===m))originalGlass.push({material:m,value:m.transmission});});if(!originalGlass.length)throw Error('Default physical glass missing');
   const mode=(batch,glass)=>{for(const m of members)m.visual.tentacles.setEnabled(batch);for(const v of vehicles)setVehicleGlass(v.group,glass);};
   let poseTime=10;const prepare=(x,y,z)=>{Object.assign(g.sub.position,{x,y,z});g.gup.update(0,g.sub);g.terrain.update(10,g.sub.position);g.decor.update(poseTime+=1,g.sub.position,g.camera);g.habitat.update(10,g.sub.position,g.camera);g.atmosphere.update(5,0,g.sub,g.gup.group,g.camera,g.renderer.getPixelRatio());g.fish.update(0,5,g.sub,g.camera);g.crew.update(0,g.camera);};
   const record=g.marineAnimals.records.find(r=>r.definition.id==='jellyfish');g.marineAnimals.update(0,record.definition.position,true);const center=record.visual.group.position;
   g.camera.position.set(center.x+12,center.y+3,center.z+32);g.camera.lookAt(center.x,center.y-1,center.z);prepare(center.x+3,center.y-4,center.z+10);
   const stats=a=>{const sorted=a.slice().sort((a,b)=>a-b);return {mean:a.reduce((s,x)=>s+x,0)/a.length,median:sorted[Math.floor(a.length/2)],p95:sorted[Math.floor(a.length*.95)]};};
   const runs=[];const modes=[['original',false,'original'],['batched',true,'original'],['batched-mobile-glass',true,'mobile']];
   for(let repeat=0;repeat<3;repeat++)for(let n=0;n<3;n++){
    const [name,batch,glass]=modes[(n+repeat)%3];mode(batch,glass);
    for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);g.renderScene();}
    window.renderingProbes.reset();const cpu=[];
    for(let frame=0;frame<60;frame++){await new Promise(requestAnimationFrame);window.renderingProbes.poll();const query=window.renderingProbes.begin(),start=performance.now();for(const m of members)m.visual.animate(2+frame/60+m.phase);g.renderScene();cpu.push(performance.now()-start);window.renderingProbes.end(query);}
    runs.push({repeat,name,cpuAnimationAndRenderMs:stats(cpu),probes:JSON.parse(JSON.stringify(window.renderingProbes.counters))});
   }
   const gl=g.renderer.getContext(),read=()=>{g.renderScene();const bytes=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
   const difference=(a,b)=>{let changed=0,sum=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;sum+=d;max=Math.max(max,d);}return {changedChannels:changed,meanAbsoluteChannelDelta:sum/a.length,maxChannelDelta:max,channels:a.length};};
   const image=bytes=>{const canvas=document.createElement('canvas');canvas.width=gl.drawingBufferWidth;canvas.height=gl.drawingBufferHeight;const ctx=canvas.getContext('2d'),data=ctx.createImageData(canvas.width,canvas.height),stride=canvas.width*4;for(let y=0;y<canvas.height;y++)data.data.set(bytes.subarray(y*stride,(y+1)*stride),(canvas.height-y-1)*stride);ctx.putImageData(data,0,0);return canvas.toDataURL('image/png');};
   const captures=[];
   mode(false,'original');const oldPixels=read(),oldRepeat=read();mode(true,'original');const batchPixels=read();captures.push({name:'jellyfish-original',image:image(oldPixels)},{name:'jellyfish-batched',image:image(batchPixels)});
   const imageComparison={batchVsOriginal:difference(oldPixels,batchPixels),unchangedRepeat:difference(oldPixels,oldRepeat)};
   for(const [name,offset,depth] of [['front',[0,3,-11],22],['side',[11,3,0],22],['above',[4,10,4],22],['deep',[0,2,-8],8],['inside',[0,.6,-.4],22]]){
    const p={x:180,y:depth,z:195};g.camera.position.set(p.x+offset[0],p.y+offset[1],p.z+offset[2]);g.camera.lookAt(p.x,p.y+(name==='inside'?.6:0),p.z+(name==='inside'?-8:0));prepare(p.x,p.y,p.z);
    mode(true,'original');for(let i=0;i<3;i++)g.renderScene();const original=read();mode(true,'mobile');for(let i=0;i<3;i++)g.renderScene();const preview=read();
    captures.push({name:'glass-'+name+'-original',image:image(original)},{name:'glass-'+name+'-mobile',image:image(preview)});
   }
   mode(true,'original');if(originalGlass.some(p=>p.material.transmission!==p.value))throw Error('Glass restore failed');
   return {quality:g.quality,checks,maxMatrixError,runs,imageComparison,captures,defaultGlassRestored:true};
  });
  const imageRoot='.local-assets/mobile-rendering-captures';fs.mkdirSync(imageRoot,{recursive:true});
  for(const capture of result.captures){capture.path=imageRoot+'/'+quality+'-'+capture.name+'.png';fs.writeFileSync(capture.path,Buffer.from(capture.image.split(',')[1],'base64'));delete capture.image;}result.errors=errors;
  fs.writeFileSync(root+'/focused-'+quality+'.json',JSON.stringify(result,null,2));if(errors.length)throw Error(errors.join('\n'));console.log(quality, 'checks',result.checks,'matrix error',result.maxMatrixError,'image',result.imageComparison);await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
