// Optional QA instrumentation: no HUD or timer queries in ordinary gameplay.
export class RenderMetrics{
 constructor(renderer){this.renderer=renderer;this.samples=[];this.cpu=[];this.gpu=[];this.pending=[];this.previous=null;this.lastReport=0;this.slowWindows=0;if(new URLSearchParams(location.search).has('inspect')){this.output=document.createElement('output');this.output.id='renderMetrics';this.output.hidden=true;document.body.append(this.output);this.gl=renderer.getContext();this.timer=this.gl.getExtension('EXT_disjoint_timer_query_webgl2');}}
 beginFrame(){this.cpuStart=performance.now();}
 beginRender(){if(this.timer&&this.pending.length<3){this.query=this.gl.createQuery();this.gl.beginQuery(this.timer.TIME_ELAPSED_EXT,this.query);}}
 endRender(){if(this.query){this.gl.endQuery(this.timer.TIME_ELAPSED_EXT);this.pending.push(this.query);this.query=null;}}
 update(now,profile,quality,scene){
  if(this.previous!==null)this.samples.push(now-this.previous);this.previous=now;if(this.cpuStart!==undefined)this.cpu.push(performance.now()-this.cpuStart);
  if(this.timer){while(this.pending.length&&this.gl.getQueryParameter(this.pending[0],this.gl.QUERY_RESULT_AVAILABLE)){const q=this.pending.shift();if(!this.gl.getParameter(this.timer.GPU_DISJOINT_EXT))this.gpu.push(this.gl.getQueryParameter(q,this.gl.QUERY_RESULT)/1e6);this.gl.deleteQuery(q);}}
  if(now-this.lastReport<2000)return;this.lastReport=now;
  const percentile=(a,p)=>{const b=a.slice().sort((a,b)=>a-b);return b.length?+b[Math.floor((b.length-1)*p)].toFixed(2):null;};const median=percentile(this.samples,.5),info=this.renderer.info;
  let activeMeshes=0,geometryBytes=0;const geometries=new Set();scene?.traverseVisible(o=>{if(o.isMesh&&(!o.isInstancedMesh||o.count>0))activeMeshes++;if(o.geometry&&(!o.isInstancedMesh||o.count>0))geometries.add(o.geometry);});for(const g of geometries){geometryBytes+=g.index?.array.byteLength??0;for(const a of Object.values(g.attributes))geometryBytes+=a.array?.byteLength??a.data?.array.byteLength??0;}
  const data={quality,viewport:[innerWidth,innerHeight],medianFrameMs:median,p95FrameMs:percentile(this.samples,.95),medianFps:median?+(1000/median).toFixed(1):0,meanFps:this.samples.length?+(1000*this.samples.length/this.samples.reduce((a,b)=>a+b,0)).toFixed(1):0,cpuSubmitMedianMs:percentile(this.cpu,.5),gpuMedianMs:percentile(this.gpu,.5),gpuTimerSupported:!!this.timer,drawCalls:info.render.calls,triangles:info.render.triangles,activeMeshes,geometries:info.memory.geometries,textures:info.memory.textures,visibleGeometryBufferMiB:+(geometryBytes/1048576).toFixed(2),jsHeapMiB:performance.memory?+(performance.memory.usedJSHeapSize/1048576).toFixed(2):null,pixelRatio:this.renderer.getPixelRatio()};if(this.output)this.output.dataset.metrics=JSON.stringify(data);this.samples=[];this.cpu=[];this.gpu=[];
  if(median>29)this.slowWindows++;else this.slowWindows=0;if(this.slowWindows>=3&&this.renderer.getPixelRatio()>.85){this.renderer.setPixelRatio(Math.max(.85,this.renderer.getPixelRatio()-.2));this.slowWindows=0;}
 }
}
