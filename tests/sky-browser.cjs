const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{for(const quality of ['low','high']){
 const p=await b.newPage({viewport:quality==='low'?{width:390,height:844}:{width:1280,height:800}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://localhost:5173/?quality='+quality);await p.waitForFunction(()=>window.explorer?.ready,{timeout:180000});await p.click('#startup-play');
 const rows=await p.evaluate(async()=>{const g=explorer;g.pause.acquire('sky-test');g.renderer.setAnimationLoop(null);g.sub.position={x:-200,y:46,z:-200};const rows=[],sky=g.atmosphere.sky;let time=10;
  function render(y){g.camera.position.set(-200,y,-220);g.camera.lookAt(-220,y+9,-190);g.atmosphere.update(time,0,g.sub,g.gup.group,g.camera,1);g.renderScene(0,true);}
  render(15);const deepCalls=g.renderer.info.render.calls;assertLocal(!sky.mesh.visible,'deep sky hidden');
  render(53);const warmPrograms=g.renderer.info.programs.length;
  for(const phase of [.25,.5,.75,0]){g.dayNight.settings.timeOfDay='automatic';g.dayNight.timeOfDay=phase;g.dayNight.update(0);g.dayNight.update(8,false);time+=20;render(53);rows.push({phase,daylight:g.dayNight.daylight,sun:sky.sunDirection.toArray(),visible:sky.mesh.visible,opacity:sky.uniforms.opacity.value,headlight:g.dayNight.headlight,programs:g.renderer.info.programs.length});}
  for(const y of [15,40,44,46,48,53,46,44,40,15]){time+=.1;render(y);rows.push({y,visible:sky.mesh.visible,opacity:sky.uniforms.opacity.value});}
  assertLocal(!sky.mesh.visible,'deep return hidden');assertLocal(g.renderer.info.programs.length===warmPrograms,'no transition compilation');
  time+=1;render(53);sky.mesh.visible=false;g.renderer.render(g.scene,g.camera);const off=g.renderer.info.render.calls;sky.mesh.visible=true;g.renderer.render(g.scene,g.camera);assertLocal(g.renderer.info.render.calls===off+1,'one sky draw');
  const gl=g.renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),after=new Uint8Array(pixels.length);
  for(const key of ['showSun','showMoon','showStars'])sky.uniforms[key].value=0;
  g.renderer.render(g.scene,g.camera);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  time+=30;render(53);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,after);
  let cloudPixels=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-after[i])+Math.abs(pixels[i+1]-after[i+1])+Math.abs(pixels[i+2]-after[i+2])>6)cloudPixels++;
  assertLocal(cloudPixels>100,'clouds drift while clock held');for(const key of ['showSun','showMoon','showStars'])sky.uniforms[key].value=1;
  const costs=[];for(const enabled of [false,true]){const samples=[];sky.mesh.visible=enabled;for(let i=0;i<35;i++){const start=performance.now();g.renderer.render(g.scene,g.camera);g.renderer.getContext().finish();if(i>=5)samples.push(performance.now()-start);await new Promise(requestAnimationFrame);}samples.sort((a,b)=>a-b);costs.push({enabled,medianMs:samples[15],calls:g.renderer.info.render.calls,textures:g.renderer.info.memory.textures});}sky.mesh.visible=true;
  return {cloudPixels,costs,rows,deepCalls,skyDraws:1,triangles:sky.mesh.geometry.index.count/3,gl:g.renderer.getContext().getError()};
  function assertLocal(value,message){if(!value)throw Error(message);}
 });assert.equal(rows.gl,0);assert.deepEqual(errors,[]);
 for(const [name,phase] of [['day',.5],['sunset',.75],['night',0]]){await p.evaluate(({phase})=>{const g=explorer;g.dayNight.timeOfDay=phase;g.dayNight.update(10,false);g.atmosphere.update(g.atmosphere.sky.lastTime+20,0,g.sub,g.gup.group,g.camera,1);const d=g.atmosphere.sky.sunDirection,sign=phase===0?-1:1;g.camera.lookAt(g.camera.position.x+d.x*100*sign,g.camera.position.y+d.y*100*sign,g.camera.position.z+d.z*100*sign);g.renderScene(0,true);},{phase});await p.screenshot({path:'docs/sky/'+quality+'-'+name+'.png'});}
 fs.writeFileSync('docs/sky/'+quality+'-results.json',JSON.stringify(rows,null,2));assert.deepEqual(errors,[]);console.log(quality,JSON.stringify(rows));await p.close();
 }}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
