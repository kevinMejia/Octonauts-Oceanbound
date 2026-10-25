const {chromium}=require('playwright'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const baseline='6fc2b7efeb26009627078a401c5c9416e873dea7';
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),runs=[];
const stages=process.env.WARMUP_STAGES?.split(',')??['reference','current'];
for(const quality of ['high','low'])for(let repeat=0;repeat<3;repeat++)for(const stage of repeat%2?[...stages].reverse():stages){
 const page=await browser.newPage(quality==='low'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/src/game/Game.js',route=>{
 let source=stage==='reference'?execFileSync('git',['show',baseline+':src/game/Game.js'],{encoding:'utf8'}):fs.readFileSync('src/game/Game.js','utf8');
 source=source.replace('await warmNearbyScenery(this);',"window.warmAudit.phase='warmup';window.warmAudit.warmStart=performance.now();await warmNearbyScenery(this);window.warmAudit.warmMs=performance.now()-window.warmAudit.warmStart;window.warmAudit.phase='startup';");
 return route.fulfill({contentType:'text/javascript',body:source});});
 await page.addInitScript(()=>{
 const audit=window.warmAudit={phase:'startup',events:[],buffers:new Map(),at:performance.now()};
 for(const key of ['bufferData','bufferSubData','deleteBuffer','compileShader','texImage2D']){
 const original=WebGL2RenderingContext.prototype[key];WebGL2RenderingContext.prototype[key]=function(...args){
 if(key==='bufferData'){const data=args[1],buffer=this.getParameter(args[0]===this.ELEMENT_ARRAY_BUFFER?this.ELEMENT_ARRAY_BUFFER_BINDING:this.ARRAY_BUFFER_BINDING),bytes=typeof data==='number'?data:data?.byteLength??0;audit.buffers.set(buffer,{bytes,gl:this});audit.events.push({key,phase:audit.phase,bytes,array:data,gl:this});}
 else if(key==='bufferSubData')audit.events.push({key,phase:audit.phase,bytes:(args[4]||args[2].length-(args[3]??0))*args[2].BYTES_PER_ELEMENT,gl:this});
 else if(key==='deleteBuffer')audit.buffers.delete(args[0]);
 else audit.events.push({key,phase:audit.phase,gl:this});
 return original.apply(this,args);
 };
 }
 });
 const start=Date.now();await page.goto('http://127.0.0.1:5173/?quality='+quality+'&benchmark');try{await page.waitForFunction(()=>window.explorer?.ready,null,{timeout:180000});}catch(error){console.error(stage,quality,errors,await page.locator('#startup-message').textContent());throw error;}
 const result=await page.evaluate(async()=>{
 const g=window.explorer,audit=window.warmAudit,gl=g.renderer.getContext();g.renderer.setAnimationLoop(null);
 const owners=new WeakMap();const mark=(mesh,kind)=>{for(const a of Object.values(mesh.geometry?.attributes??{}))owners.set(a.array,kind);if(mesh.geometry?.index)owners.set(mesh.geometry.index.array,kind);if(mesh.instanceMatrix)owners.set(mesh.instanceMatrix.array,kind);if(mesh.instanceColor)owners.set(mesh.instanceColor.array,kind);};
 g.terrain.chunks.forEach(m=>mark(m,'terrain'));for(const b of g.decor.batches)for(const m of [b.low,b.high])if(m)mark(m,'decor');for(const b of g.habitat?.batches??[])for(const m of [b.low,b.high])if(m)mark(m,'habitat');
 const tally=phase=>{const out={};for(const e of audit.events)if(e.gl===gl&&(!phase||e.phase===phase)){const kind=e.key==='bufferData'?(owners.get(e.array)??'other'):'all',key=e.key+':'+kind;out[key]??={calls:0,bytes:0};out[key].calls++;out[key].bytes+=e.bytes??0;}return out;};
 const memory=()=>({bufferBytes:[...audit.buffers.values()].filter(b=>b.gl===gl).reduce((n,b)=>n+b.bytes,0),geometries:g.renderer.info.memory.geometries,textures:g.renderer.info.memory.textures,programs:g.renderer.info.programs.length});
 const startup={elapsedMs:performance.now()-audit.at,warmMs:audit.warmMs??0,counters:tally('startup'),warmCounters:tally('warmup'),memory:memory()};
 const T=await import('/vendor/three.module.js'),camera=g.camera,position={...g.sub.position},base=camera.quaternion.clone(),turns=[];
 // Use normal starting-area distance selection; avoid counting distant terrain that normal play hides.
 g.terrain.update(0,position);
 for(let turn=0;turn<2;turn++){audit.phase='turn'+turn;const frames=[];
 for(let i=0;i<120;i++){const yaw=i/120*Math.PI*2;camera.quaternion.copy(base).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw));camera.updateMatrixWorld();const time=(turn*120+i)/60;
 const t=performance.now();g.decor.update(time,position,camera);g.habitat?.update(time,position,camera);const r=performance.now();g.renderScene();frames.push({selectionMs:r-t,renderSubmitMs:performance.now()-r});if(i%20===0)await new Promise(requestAnimationFrame);}
 turns.push({frames,counters:tally(audit.phase),memory:memory()});
 }
 audit.phase='verification';const state={camera:camera.matrixWorld.toArray(),position:{...g.sub.position},shadow:{enabled:g.renderer.shadowMap.enabled,autoUpdate:g.renderer.shadowMap.autoUpdate},viewport:g.renderer.getViewport(new T.Vector4()).toArray(),scissor:g.renderer.getScissor(new T.Vector4()).toArray(),scissorTest:g.renderer.getScissorTest(),target:g.renderer.getRenderTarget()===null};
 return {startup,turns,state};
 });result.stage=stage;result.repeat=repeat;result.quality=quality;result.wallRunMs=Date.now()-start;result.errors=errors;if(errors.length)throw Error(errors.join('\n'));runs.push(result);console.log(quality,repeat,stage,'warm',result.startup.warmMs.toFixed(1),'ms');await page.close();
}
await browser.close();const out=process.argv[2]??'docs/performance-audit/scenery-warmup-data/results.json';fs.mkdirSync(require('node:path').dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({baseline,runs}));
})().catch(e=>{console.error(e);process.exit(1)});
