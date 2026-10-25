const {chromium}=require('playwright'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const baseline='beffc11bc6e969359b350dc919565cc00a703693';
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),profiles=[];
for(const quality of ['high','low']){
 const page=await browser.newPage(quality==='low'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/DiscoveryFleet.js?residencyReference',r=>r.fulfill({contentType:'text/javascript',body:execFileSync('git',['show',baseline+':src/vehicles/DiscoveryFleet.js'],{encoding:'utf8'})}));
 await page.goto('http://127.0.0.1:5173/?quality='+quality+'&benchmark');await page.waitForFunction(()=>window.explorer?.ready,null,{timeout:180000});
 const result=await page.evaluate(async repeats=>{
 const g=window.explorer;g.renderer.setAnimationLoop(null);const {DiscoveryFleet:Current}=await import('/src/vehicles/DiscoveryFleet.js'),{DiscoveryFleet:Reference}=await import('/src/vehicles/DiscoveryFleet.js?residencyReference'),{vehicleImages}=await import('/src/vehicles/VehicleTextures.js');
 const r=g.discovery.records.get('gup-a'),gl=g.renderer.getContext(),now=performance.now.bind(performance),originalPrepare=g.discovery.prepare,originalRelease=g.discovery.release,runs=[];
 const arrays=new Set();r.vehicle.group.traverse(o=>{if(o.geometry){for(const a of Object.values(o.geometry.attributes))arrays.add(a.array);if(o.geometry.index)arrays.add(o.geometry.index.array);}});
 let counters=null,preparing=false;const bufferData=gl.bufferData,texImage=gl.texImage2D,texSubImage=gl.texSubImage2D,texStorage=gl.texStorage2D;
 gl.bufferData=function(target,data){if(counters&&arrays.has(data)){counters.bufferAllocations++;counters.bufferBytes+=data.byteLength;}return bufferData.apply(this,arguments);};
 gl.texImage2D=function(){if(counters&&preparing)counters.texImage2DCalls++;return texImage.apply(this,arguments);};
 const resident=()=>{const handles=new Set();let bytes=0;r.vehicle.group.traverse(o=>{for(const m of [].concat(o.material??[]))for(const t of Object.values(m)){if(!t?.isTexture)continue;const handle=g.renderer.properties.get(t).__webglTexture;if(handle&&!handles.has(handle)){handles.add(handle);bytes+=t.image.width*t.image.height*4*(t.generateMipmaps?4/3:1);}}});return {textureHandles:handles.size,estimatedTextureBytes:bytes,geometries:g.renderer.info.memory.geometries,textures:g.renderer.info.memory.textures};};
 gl.texSubImage2D=function(){if(counters&&preparing)counters.texSubImage2DCalls++;return texSubImage.apply(this,arguments);};
 gl.texStorage2D=function(){if(counters&&preparing)counters.texStorage2DCalls++;return texStorage.apply(this,arguments);};
 const counter=()=>({releases:0,prepares:0,texImage2DCalls:0,texSubImage2DCalls:0,texStorage2DCalls:0,bufferAllocations:0,bufferBytes:0,prepareMs:[],updateMs:[]});
 for(let repeat=0;repeat<repeats;repeat++)for(const name of repeat%2?['current','reference']:['reference','current']){
 counters=null;await originalPrepare(r.vehicle);r.evicted=false;r.restoring=false;r.outsideSince=undefined; // setup outside the measured phases
 const world=Object.assign(Object.create((name==='current'?Current:Reference).prototype),g.discovery,{records:new Map([[r.id,r]]),blocked:()=>true,visibilityAt:0}),sub={position:{x:r.pose.x+159,y:30,z:r.pose.z}};
 world.prepare=async vehicle=>{counters.prepares++;const start=now();preparing=true;try{await originalPrepare(vehicle);}finally{preparing=false;counters.prepareMs.push(now()-start);}};
 world.release=vehicle=>{counters.releases++;originalRelease(vehicle);};
 let clock=1000000;
 const step=async distance=>{clock+=601;sub.position.x=r.pose.x+distance;const descriptor=Object.getOwnPropertyDescriptor(performance,'now');Object.defineProperty(performance,'now',{configurable:true,value:()=>clock});const start=now();try{world.update(sub);}finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete performance.now;counters.updateMs.push(now()-start);}const until=now()+60000;while(r.restoring){if(now()>until)throw Error('Preparation timeout');await new Promise(resolve=>setTimeout(resolve,0));}g.camera.position.set(r.pose.x+distance, r.pose.y+25,r.pose.z+20);g.camera.lookAt(r.pose.x,r.pose.y,r.pose.z);g.renderScene();return {distance,visible:r.vehicle.group.visible,distanceVisible:r.distanceVisible,evicted:r.evicted,resident:resident()};};
 counters=counter();await step(159);counters=counter();const samples=[];for(let i=0;i<6;i++){samples.push(await step(161));samples.push(await step(159));}const boundary={...counters,samples};
 counters=counter();const linger=[];for(let i=0;i<7;i++)linger.push(await step(161));const afterLinger=await step(159),expiry={...counters,samples:linger,afterReturn:afterLinger};
 counters=counter();const far=await step(181),returned=await step(159),departure={...counters,far,returned};
 if(boundary.samples.some(s=>s.visible!==(s.distance<160)||s.distanceVisible!==(s.distance<160)))throw Error('Visibility changed');
 if(!expiry.samples.at(-1).evicted||!departure.far.evicted||!departure.returned.visible)throw Error('Eviction/return failed');
 if(vehicleImages.snapshot().decodedBytes!==0||gl.getError()!==0||gl.isContextLost())throw Error('Memory/context failure');
 runs.push({name,repeat,boundary,expiry,departure,images:vehicleImages.snapshot()});
 }
 gl.bufferData=bufferData;gl.texImage2D=texImage;gl.texSubImage2D=texSubImage;gl.texStorage2D=texStorage;return {quality:g.quality,runs};
 },Number(process.env.RESIDENCY_REPEATS??3));result.errors=errors;if(errors.length)throw Error(errors.join('\n'));profiles.push(result);console.log(quality,'completed');await page.close();
}
await browser.close();const path=process.argv[2]??'docs/performance-audit/fleet-residency-data/results.json';fs.mkdirSync(require('node:path').dirname(path),{recursive:true});fs.writeFileSync(path,JSON.stringify({baseline,profiles}));
})().catch(e=>{console.error(e);process.exit(1)});
