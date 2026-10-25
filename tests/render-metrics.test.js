import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderMetrics} from '../src/environment/RenderMetrics.js';
test('ordinary gameplay skips diagnostic traversal while retaining adaptive sampling',()=>{
 const previous=globalThis.location;globalThis.location={search:''};
 try{
  let ratio=1,samples=0;const renderer={getPixelRatio:()=>ratio,setPixelRatio:v=>ratio=v,info:{}};
  const metrics=new RenderMetrics(renderer);metrics.resolution.sample=(median,current,count)=>{samples++;assert.equal(median,16);assert.equal(count,1);return current-.1;};
  metrics.beginFrame();assert.equal(metrics.cpuStart,undefined);
  metrics.previous=1985;metrics.update(2001,{},'high',{traverseVisible(){throw Error('Diagnostics traversed scene outside inspect mode');}});
  assert.equal(samples,1);assert.equal(ratio,.9);assert.deepEqual(metrics.samples,[]);
 }finally{if(previous===undefined)delete globalThis.location;else globalThis.location=previous;}
});
