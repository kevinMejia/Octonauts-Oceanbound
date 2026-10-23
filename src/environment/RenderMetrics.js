// QA telemetry is opt-in via ?inspect=1 and never appears in the gameplay HUD.
export class RenderMetrics{
 constructor(renderer){this.renderer=renderer;this.samples=[];this.previous=null;this.lastReport=0;this.frames=0;this.slowWindows=0;if(new URLSearchParams(location.search).has('inspect')){this.output=document.createElement('output');this.output.id='renderMetrics';this.output.hidden=true;document.body.append(this.output);}}
 update(now,profile,quality){if(this.previous!==null)this.samples.push(now-this.previous);this.previous=now;this.frames++;if(now-this.lastReport<2000)return;this.lastReport=now;const sorted=this.samples.sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length*.5)]??0,p95=sorted[Math.floor(sorted.length*.95)]??0;const info=this.renderer.info.render;const data={quality,medianFrameMs:+median.toFixed(2),p95FrameMs:+p95.toFixed(2),medianFps:median?+(1000/median).toFixed(1):0,drawCalls:info.calls,triangles:info.triangles,pixelRatio:this.renderer.getPixelRatio()};if(this.output)this.output.dataset.metrics=JSON.stringify(data);this.samples=[];
 // Sustained GPU pressure lowers resolution, leaving movement/camera timing unchanged.
 if(median>29)this.slowWindows++;else this.slowWindows=0;if(this.slowWindows>=3&&this.renderer.getPixelRatio()>.85){this.renderer.setPixelRatio(Math.max(.85,this.renderer.getPixelRatio()-.2));this.slowWindows=0;}
 }
}
