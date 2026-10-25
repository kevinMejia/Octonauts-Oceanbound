const {chromium}=require('playwright'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const revision=fs.readFileSync('docs/performance-audit/phase-2-baseline-revision.txt','utf8').trim();
(async()=>{
 const mobile=process.argv.includes('--mobile'),browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*?phase2Reference',route=>route.fulfill({contentType:'text/javascript',body:execFileSync('git',['show',revision+':'+new URL(route.request().url()).pathname.slice(1)],{encoding:'utf8'})}));
 await page.goto('http://127.0.0.1:5173/?quality='+(mobile?'low':'high')+'&benchmark');await page.waitForFunction(()=>window.explorer?.ready,{timeout:180000});
 const result=await page.evaluate(async()=>{
  const g=window.explorer;g.renderer.setAnimationLoop(null);const T=await import('/vendor/three.module.js'),low=g.quality==='low';
  const pairs=[],{towVisualConfig}=await import('/src/config/towVisualConfig.js');
  for(const [file,name,args] of [
   ['environment/ReefFish','ReefFish',[low,g.interactions.surfaces]],
   ['effects/PropulsionWater','PropulsionWater',[low]],
   ['effects/EnvironmentalInteractions','EnvironmentalInteractions',[g.quality,g.interactions.surfaces]],
   ['effects/TowWater','TowWater',[towVisualConfig.water,low]]
  ]){
   const Old=(await import('/src/'+file+'.js?phase2Reference'))[name],Current=(await import('/src/'+file+'.js'))[name];
   const scene=()=>{const s=new T.Scene();s.fog=g.scene.fog;return s;};
   const old=new Old(scene(),...args),current=new Current(scene(),...args);pairs.push({name,old,current});
   if(name==='PropulsionWater')for(const item of [old,current])item.setVents(g.interactions.surfaces,g.decor);
  }
  const compareMesh=(a,b)=>{
   for(const key of ['count','visible'])if(a[key]!==b[key])throw Error('Mesh '+key+' mismatch');
   const attributes=o=>({...o.geometry.attributes,matrix:o.instanceMatrix,colorInstance:o.instanceColor});
   for(const [key,attr] of Object.entries(attributes(a))){const other=attributes(b)[key];if(!attr&&!other)continue;if(!attr||!other||attr.array.length!==other.array.length)throw Error('Attribute mismatch '+key);for(let i=0;i<attr.array.length;i++)if(attr.array[i]!==other.array[i])throw Error('Buffer mismatch '+key+' at '+i);}
   if(a.geometry.drawRange.count!==b.geometry.drawRange.count)throw Error('Draw range mismatch');
  };
  let comparisons=0;
  for(let frame=0;frame<240;frame++){
   const time=frame/60;Object.assign(g.sub.position,{x:frame<160?0:600,y:18,z:65});g.sub.speed=frame%80<40?20:0;g.sub.heading=frame*.01;g.gup.update(1/60,g.sub);g.camera.position.set(frame<160?0:600,22,45);g.camera.lookAt(g.sub.position.x,18,65);g.camera.updateMatrixWorld();
   for(const {name,old,current} of pairs){
    for(const item of [old,current]){
     if(name==='ReefFish')item.update(1/60,time,g.sub,g.camera);
     if(name==='PropulsionWater'){if(frame===30||frame===120)item.discoveryBurst(0,18,65);item.update(1/60,time,g.sub,g.gup.group,g.camera,1,frame>120&&frame<140);}
     if(name==='TowWater')item.update(1/60,{position:{x:frame*.1,y:18,z:65},previous:{x:frame*.1-.1,y:18,z:65},height:2},1,g.camera,1,time);
     if(name==='EnvironmentalInteractions'){if(frame%40===0){item.burst(0,17,65,1,0,0);item.time+=1;item.reef({surface:'coral',color:[.3,.5,.4],branch:frame%80===0},0,18,65,0,1,0,10);}item.update(1/60,g.sub,null,g.camera);}
    }
    if(name==='ReefFish'){compareMesh(old.mesh,current.mesh);for(let i=0;i<2;i++)compareMesh(old.visitors.meshes[i],current.visitors.meshes[i]);}
    if(name==='PropulsionWater'||name==='TowWater')compareMesh(old.points,current.points);
    if(name==='EnvironmentalInteractions')for(const key of ['cloudMesh','sand','chips','branches'])compareMesh(old[key],current[key]);
    comparisons++;
   }
  }
  // Confirm frozen local transforms still inherit a moving parent, and no crew
  // node was frozen when the immutable Octopod geometry was loaded.
  const frozen=[];g.octopod.model.traverse(o=>{if(!o.matrixAutoUpdate)frozen.push(o);});
  let frozenCrew=0;g.crew.group.traverse(o=>{if(!o.matrixAutoUpdate)frozenCrew++;});if(frozenCrew)throw Error('Crew transform frozen');
  const originalPosition=g.octopod.model.position.clone();g.octopod.model.position.x+=3;g.scene.updateMatrixWorld(true);
  const before=frozen.map(o=>o.matrixWorld.elements.slice());for(const o of frozen)o.matrixAutoUpdate=true;g.scene.updateMatrixWorld(true);
  for(let i=0;i<frozen.length;i++)if(before[i].some((v,j)=>v!==frozen[i].matrixWorld.elements[j]))throw Error('Static parent inheritance mismatch');
  for(const o of frozen)o.matrixAutoUpdate=false;g.octopod.model.position.copy(originalPosition);
  let terrainFrozen=0;for(const chunk of g.terrain.chunks){const before=chunk.matrix.elements.slice();chunk.updateMatrix();if(before.some((v,j)=>v!==chunk.matrix.elements[j]))throw Error('Terrain local matrix mismatch');if(!chunk.matrixAutoUpdate)terrainFrozen++;}
  return {quality:g.quality,pairedSystemFrames:comparisons,frozenOctopodMeshes:frozen.length,frozenTerrainChunks:terrainFrozen,frozenCrew};
 });
 result.errors=errors;if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync('docs/performance-audit/phase-2-data/equivalence-'+(mobile?'low':'high')+'.json',JSON.stringify(result,null,2));console.log(result);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
