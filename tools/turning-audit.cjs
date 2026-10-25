const {chromium}=require('playwright'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
(async()=>{const b=await chromium.launch({headless:true,channel:'msedge'}),out=[];
for(const quality of ['high','low']){
const p=await b.newPage(quality==='low'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.route('**/OceanDecorations.js?turnReference',r=>r.fulfill({contentType:'text/javascript',body:execFileSync('git',['show','62699ed:src/environment/OceanDecorations.js'],{encoding:'utf8'})}));await p.goto('http://127.0.0.1:5173/?quality='+quality+'&benchmark');await p.waitForFunction(()=>window.explorer?.ready,{timeout:180000});
const d=await p.evaluate(async()=>{const g=window.explorer;g.renderer.setAnimationLoop(null);const T=await import('/vendor/three.module.js'),gl=g.renderer.getContext(),counters={};const originals={};
for(const key of ['bufferData','bufferSubData','texImage2D','texSubImage2D','compileShader','linkProgram']){originals[key]=gl[key];gl[key]=function(){counters[key]=(counters[key]??0)+1;return originals[key].apply(this,arguments);};}
const f=new T.Frustum(),m=new T.Matrix4(),sphere=new T.Sphere(),rows=[];let time=0;
for(const [name,x,y,z] of [['octopod',g.sub.position.x,g.sub.position.y,g.sub.position.z],['reef',0,18,65],['showcase',180,25,205]]){
Object.assign(g.sub.position,{x,y,z});g.gup.update(0,g.sub);const turns=[];
for(let turn=0;turn<3;turn++){const frames=[];for(let i=0;i<120;i++){time+=1/60;const yaw=i/120*Math.PI*2;g.camera.position.set(x, y+5,z);g.camera.lookAt(x+Math.sin(yaw)*20,y,z+Math.cos(yaw)*20);g.camera.updateMatrixWorld();for(const key of Object.keys(counters))counters[key]=0;
const start=performance.now();g.decor.update(time,g.sub.position,g.camera);const afterDecor=performance.now();g.habitat?.update(time,g.sub.position,g.camera);const afterHabitat=performance.now();
f.setFromProjectionMatrix(m.multiplyMatrices(g.camera.projectionMatrix,g.camera.matrixWorldInverse));let missing=0,required=0;
for(const batch of g.decor.batches){const limit=/grass|shell|seaweed|kelp/.test(batch.kind)?g.decor.profile.vegetationDistance:/branch|brain|tube/.test(batch.kind)?g.decor.profile.coralDistance:g.decor.profile.drawDistance;const slots=new Set([...(batch.low.userData.staticSlots??[]).slice(0,batch.low.count),...(batch.high?.userData.staticSlots??[]).slice(0,batch.high?.count??0)]);
for(const r of batch.records){if(Math.hypot(r.x-x,r.z-z)>limit)continue;sphere.center.set(r.x,r.y+1,r.z);sphere.radius=r.scale*(batch.kind.startsWith('rock')?5:3)+2;if(f.intersectsSphere(sphere)){required++;if(!slots.has(r))missing++;}}}
const startRender=performance.now();g.renderScene();const end=performance.now();frames.push({missing,required,decorMs:afterDecor-start,habitatMs:afterHabitat-afterDecor,renderMs:end-startRender,...counters});if(i%20===0)await new Promise(requestAnimationFrame);
}turns.push(frames);}rows.push({name,turns});}
// Stable views should still avoid static instance uploads.
for(const key of Object.keys(counters))counters[key]=0;
for(let i=0;i<60;i++){time+=1/60;g.decor.update(time,g.sub.position,g.camera);g.renderScene();}
const stationaryUploads=counters.bufferSubData??0;
const {OceanDecorations:Reference}=await import('/src/environment/OceanDecorations.js?turnReference');
const snapshot=()=>g.decor.batches.flatMap(b=>[b.low,b.high].filter(Boolean).map(mesh=>({count:mesh.count,matrix:[...mesh.instanceMatrix.array.subarray(0,mesh.count*16)],color:[...(mesh.instanceColor?.array.subarray(0,mesh.count*3)??[])]})));
const readPixels=()=>{const pixels=new Uint8Array(innerWidth*innerHeight*4);gl.readPixels(0,0,innerWidth,innerHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
let equalityCases=0,changedChannels=0;
for(let i=0;i<12;i++){
 g.camera.lookAt(g.camera.position.x+Math.sin(i/12*Math.PI*2)*20,g.camera.position.y-5,g.camera.position.z+Math.cos(i/12*Math.PI*2)*20);time+=.2;g.decor.update(time,g.sub.position,g.camera);const before=JSON.stringify(snapshot());g.renderScene();const pixels=i%4===0?readPixels():null;
 g.decor.lastUpdate=-Infinity;Reference.prototype.update.call(g.decor,time,g.sub.position,g.camera);
 if(before!==JSON.stringify(snapshot()))throw Error('Settled visible buffers changed');g.renderScene();if(pixels){const after=readPixels();for(let j=0;j<after.length;j++)if(after[j]!==pixels[j])changedChannels++;}
 equalityCases++;
}
if(stationaryUploads)throw Error('Stationary view unexpectedly uploads static buffers');
for(const [key,value] of Object.entries(originals))gl[key]=value;return {quality:g.quality,rows,verification:{stationaryUploads,equalityCases,changedChannels}};});d.errors=errors;if(errors.length)throw Error(errors.join('\n'));out.push(d);await p.close();}
await b.close();const path=process.argv[2]??'docs/performance-audit/turning-data/baseline.json';fs.mkdirSync(require('node:path').dirname(path),{recursive:true});for(const profile of out)fs.writeFileSync(path.replace(/\.json$/,'-'+profile.quality+'.json'),JSON.stringify(profile));console.log('Saved profiles for '+path);})().catch(e=>{console.error(e);process.exit(1)});
