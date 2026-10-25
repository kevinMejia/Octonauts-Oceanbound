import {estimateResidentTextureMemory} from './gpuTextureMemory.js';
export const PERFORMANCE_KEY='oceanbound.performanceDisplay.v1';

// Frame cadence measures delivered gameplay frames, not GPU execution time.
export function summarizeFrames(samples){
 if(!samples.length)return null;
 const sorted=[...samples].sort((a,b)=>a-b),mean=samples.reduce((a,b)=>a+b,0)/samples.length;
 return {fps:1000/mean,mean,p95:sorted[Math.floor((sorted.length-1)*.95)],stutters:samples.filter(ms=>ms>50).length};
}
export class PerformanceDisplay{
 constructor(){this.enabled=false;this.previous=null;this.samples=[];this.lastReport=0;this.memory=null;this.lastMemory=-Infinity;}
 setEnabled(enabled){
  this.enabled=!!enabled;this.reset();this.memory=null;this.lastMemory=-Infinity;
  if(this.enabled&&!this.output){this.output=document.createElement('div');this.output.id='performanceDisplay';this.output.setAttribute('aria-label','Gameplay performance');document.body.append(this.output);}
  if(this.output){this.output.hidden=!this.enabled;this.output.textContent='Performance · waiting for gameplay';}
 }
 reset(){this.previous=null;this.samples.length=0;this.lastReport=0;}
 frame(now,active,game){
  if(!this.enabled)return;
  if(!active){this.reset();if(this.output.textContent!=='Performance · paused')this.output.textContent='Performance · paused';return;}
  if(this.previous!==null){this.samples.push({at:now,ms:now-this.previous});while(this.samples.length>512||this.samples[0]?.at<now-2000)this.samples.shift();}
  this.previous=now;
  if(now-this.lastReport<500||!this.samples.length)return;
  this.lastReport=now;
  if(game&&now-this.lastMemory>=2000){this.memory=estimateResidentTextureMemory(game);this.lastMemory=now;}
  const data=summarizeFrames(this.samples.map(s=>s.ms));
  this.output.textContent=data.fps.toFixed(0)+' FPS · '+data.mean.toFixed(1)+' ms avg\n'+data.p95.toFixed(1)+' ms p95 · '+data.stutters+' frames >50 ms / 2s'+(this.memory?'\nGPU textures ~'+(this.memory.bytes/1048576).toFixed(1)+' MiB'+(this.memory.unknownTextures?' + ?':''):'');
 }
}
export const performanceDisplay=new PerformanceDisplay();
export function installPerformanceDisplay(panel,storage,status){
 let enabled=false;try{enabled=storage?.getItem(PERFORMANCE_KEY)==='true';}catch{}
 performanceDisplay.setEnabled(enabled);
 document.addEventListener('visibilitychange',()=>performanceDisplay.reset());
 const label=document.createElement('label');label.className='setting-check';
 const input=document.createElement('input');input.type='checkbox';input.id='showPerformance';input.checked=enabled;
 const text=document.createElement('span');text.textContent='Show performance display';label.append(input,text);
 const help=document.createElement('p');help.className='section-description';help.textContent='Toggle instantly during play. Shows average FPS, frame times and frames over 50 ms in the last two seconds. Menus and background time are excluded. This measures frame delivery, not GPU time. GPU textures shows a partial resident texture-memory estimate, updated every two seconds. It excludes geometry buffers, untracked render targets and driver memory; it is not total GPU usage.';
 panel.append(label,help);
 input.addEventListener('change',()=>{performanceDisplay.setEnabled(input.checked);let saved=false;try{if(storage){storage.setItem(PERFORMANCE_KEY,String(input.checked));saved=true;}}catch{}status.textContent=saved?'Performance display preference saved.':'Performance display changed for this session.';});
}
