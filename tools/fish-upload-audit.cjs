const {chromium}=require('playwright'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const baseline='9014d409b706e7141ac949fd8d6398cf7e95ea82';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
 for(const low of [false,true]){
 const page=await browser.newPage({viewport:low?{width:390,height:844}:{width:1280,height:720}});
 await page.route('**/fish-audit',r=>r.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>'}));
 await page.route('**/ReefFish.js?fishReference',r=>r.fulfill({contentType:'text/javascript',body:execFileSync('git',['show',baseline+':src/environment/ReefFish.js'],{encoding:'utf8'})}));
 await page.goto('http://127.0.0.1:5173/fish-audit');
 const data=await page.evaluate(async low=>{
 const T=await import('/vendor/three.module.js'),{ReefFish:Current}=await import('/src/environment/ReefFish.js'),{ReefFish:Reference}=await import('/src/environment/ReefFish.js?fishReference');
 const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(innerWidth,innerHeight);const gl=renderer.getContext(),sub={position:{x:180,y:25,z:205}},camera=new T.PerspectiveCamera(60,innerWidth/innerHeight,.1,650),surfaces={rockGrid:{query:()=>[]}};
 const create=Class=>{const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0x445566,2));return {scene,fish:new Class(scene,low,surfaces)};};
 const locate=(i,moving)=>{const x=moving?180+Math.sin(i/90)*110:180,z=moving?205+Math.cos(i/120)*100:205;Object.assign(sub.position,{x,y:25,z});camera.position.set(x,35,z+30);camera.lookAt(x,18,z);};
 const dispose=o=>{o.scene.traverse(n=>{if(n.isInstancedMesh)n.dispose();n.geometry?.dispose();for(const m of [].concat(n.material??[]))m.dispose();});};
 const gpuBuffers=new WeakMap(),bufferData=gl.bufferData,bufferSubData=gl.bufferSubData;
 gl.bufferData=function(target,array){if(ArrayBuffer.isView(array))gpuBuffers.set(array,gl.getParameter(gl.ARRAY_BUFFER_BINDING));return bufferData.apply(this,arguments);};
 gl.bufferSubData=function(target,offset,array){gpuBuffers.set(array,gl.getParameter(gl.ARRAY_BUFFER_BINDING));return bufferSubData.apply(this,arguments);};
 const verifyGPU=o=>{for(const attr of [o.fish.mesh.instanceMatrix,o.fish.mesh.instanceColor,o.fish.mesh.geometry.attributes.swimPhase]){
 if(!attr||!o.fish.mesh.count)continue;const buffer=gpuBuffers.get(attr.array);if(!buffer)throw Error('Missing GPU buffer');const read=new Float32Array(o.fish.mesh.count*attr.itemSize);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,read);for(let j=0;j<read.length;j++)if(read[j]!==attr.array[j])throw Error('GPU content mismatch '+j);
 }};
 const a=create(Current),b=create(Reference);let compared=0,gpuChecks=0;
 const drawPair=()=>{renderer.render(a.scene,camera);verifyGPU(a);renderer.render(b.scene,camera);verifyGPU(b);gpuChecks++;};
 for(let i=0;i<720;i++){
 locate(i,true);a.fish.update(1/60,i/60,sub,camera);b.fish.update(1/60,i/60,sub,camera);
 if(a.fish.mesh.count!==b.fish.mesh.count)throw Error('Count mismatch');
 for(const [x,y] of [[a.fish.mesh.instanceMatrix,b.fish.mesh.instanceMatrix],[a.fish.mesh.instanceColor,b.fish.mesh.instanceColor],[a.fish.mesh.geometry.attributes.swimPhase,b.fish.mesh.geometry.attributes.swimPhase]]){
 if(!x&&!y)continue;for(let j=0;j<a.fish.mesh.count*x.itemSize;j++)if(x.array[j]!==y.array[j])throw Error('Buffer mismatch '+i+':'+j);
 }compared++;if(i%30===0)drawPair();
 }
 // Force changes in high slots, then shrink and grow without intermediate draws.
 for(const o of [a,b]){
  locate(0,false);o.fish.refresh(20,sub,camera);o.fish.nextRefresh=Infinity;
  const groups=[...o.fish.groups];o.fish.update(1/60,20,sub,camera);renderer.render(o.scene,camera);
  groups.at(-1).records.at(-1).phase+=.25;groups.at(-1).seed+=1;
  o.fish.update(1/60,20.01,sub,camera);
  o.fish.groups=groups.slice(0,1);o.fish.update(1/60,20.02,sub,camera);
  o.fish.groups=[];o.fish.update(1/60,20.03,sub,camera);
  o.fish.groups=groups;o.fish.update(1/60,20.04,sub,camera);
  renderer.render(o.scene,camera);verifyGPU(o);gpuChecks++;
 }
 // Exact same-state framebuffer comparison for the two fish/visitor/turtle scenes.
 const readPixels=()=>{const pixels=new Uint8Array(innerWidth*innerHeight*4);gl.readPixels(0,0,innerWidth,innerHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
 renderer.render(a.scene,camera);const imageA=readPixels();renderer.render(b.scene,camera);const imageB=readPixels();let changedChannels=0;for(let i=0;i<imageA.length;i++)if(imageA[i]!==imageB[i])changedChannels++;
 if(changedChannels)throw Error('Framebuffer changed: '+changedChannels);
 gl.bufferData=bufferData;gl.bufferSubData=bufferSubData;dispose(a);dispose(b);
 const runs=[];let active=null,counts=null;
 const original=gl.bufferSubData;
 gl.bufferSubData=function(target,offset,array,start=0,count){if(active&&counts){const key=array===active.mesh.instanceMatrix.array?'matrix':array===active.mesh.instanceColor?.array?'color':array===active.mesh.geometry.attributes.swimPhase.array?'phase':null;if(key){counts[key].requests++;counts[key].bytes+=(count===undefined||count===0?array.length-start:count)*array.BYTES_PER_ELEMENT;}}return original.apply(this,arguments);};
 const stats=values=>{const s=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,p95:s[Math.floor((s.length-1)*.95)]};};
 for(let repeat=0;repeat<3;repeat++)for(const name of repeat%2?['current','reference']:['reference','current'])for(const moving of [false,true]){
 const o=create(name==='current'?Current:Reference);active=o.fish;const cpu=[],render=[];
 for(let i=0;i<660;i++){
 locate(i,moving);counts=i>=60?(counts??{matrix:{requests:0,bytes:0},color:{requests:0,bytes:0},phase:{requests:0,bytes:0}}):null;
 const t=performance.now();o.fish.update(1/60,i/60,sub,camera);const after=performance.now();renderer.render(o.scene,camera);const end=performance.now();if(i>=60){cpu.push(after-t);render.push(end-after);}if(i%30===0)await new Promise(requestAnimationFrame);
 }
 runs.push({repeat,name,scenario:moving?'travel':'stationary',frames:cpu.length,updateMs:stats(cpu),renderSubmitMs:stats(render),uploads:counts});counts=null;dispose(o);
 }
 gl.bufferSubData=original;renderer.dispose();return {low,compared,gpuChecks,changedChannels,runs};
 },low);results.push(data);await page.close();
 }await browser.close();const out=process.argv[2]??'docs/performance-audit/fish-upload-data/results.json';fs.mkdirSync(require('node:path').dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({baseline,results},null,2));console.log('Saved '+out);
})().catch(e=>{console.error(e);process.exit(1)});
