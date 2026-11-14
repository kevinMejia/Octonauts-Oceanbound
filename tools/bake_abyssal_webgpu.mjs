// Optional offline bake of the original WGSL terrain; runtime only uses WebGL.
// Requires Playwright and Chromium with WebGPU. No network or running server needed.
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {W_DENS,primBuffer,primitiveCounts} from '../vendor/abyssal-garden/terrain-shader.js';
import {surfaceNets} from '../vendor/abyssal-garden/procedural.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-webgpu']});
try{
 const page=await browser.newPage();
 await page.route('http://localhost/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Offline terrain bake</title>'}));
 await page.goto('http://localhost/bake');
 const nx=193,ny=33,nz=193,step=2,origin=[-192,-58,-192];
 const encoded=await page.evaluate(async({code,primitives,counts,nx,ny,nz,step,origin})=>{
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error('A WebGPU adapter is required for this offline bake.');
  const device=await adapter.requestDevice();device.pushErrorScope('validation');
  const bytes=nx*ny*nz*4,uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),data=new ArrayBuffer(48);
  new Uint32Array(data).set([nx,ny,nz,0]);new Float32Array(data).set([...origin,step],4);new Uint32Array(data).set(counts,8);device.queue.writeBuffer(uniform,0,data);
  const prim=device.createBuffer({size:primitives.length*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(prim,0,new Float32Array(primitives));
  const field=device.createBuffer({size:bytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),read=device.createBuffer({size:bytes,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});
  const module=device.createShaderModule({code}),info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw Error(info.messages.map(m=>m.message).join('\n'));
  const pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
  const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:{buffer:field}},{binding:2,resource:{buffer:prim}}]});
  const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(Math.ceil(nx/4),Math.ceil(ny/4),Math.ceil(nz/4));pass.end();encoder.copyBufferToBuffer(field,0,read,0,bytes);device.queue.submit([encoder.finish()]);
  await read.mapAsync(GPUMapMode.READ);const error=await device.popErrorScope();if(error)throw Error(error.message);
  const buffer=new Uint8Array(read.getMappedRange()),chunks=[];for(let i=0;i<buffer.length;i+=16384)chunks.push(String.fromCharCode(...buffer.subarray(i,i+16384)));
  const result=btoa(chunks.join(''));read.unmap();device.destroy();return result;
 },{code:W_DENS,primitives:Array.from(primBuffer()),counts:primitiveCounts,nx,ny,nz,step,origin});
 const bytes=Buffer.from(encoded,'base64'),density=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4),mesh=surfaceNets(density,nx,ny,nz);
 for(let i=0;i<mesh.pos.length;i++)mesh.pos[i]=origin[i%3]+mesh.pos[i]*step+(i%3===1?46:0);
 const directory=new URL('../assets/abyssal/',import.meta.url);mkdirSync(directory,{recursive:true});
 const metadata={nx,ny,nz,step,origin:[-192,-12,-192],vertices:mesh.pos.length/3,indices:mesh.idx.length,source:'Original upstream W_DENS WebGPU shader, sampled at 2 metre spacing'};
 writeFileSync(new URL('terrain.json',directory),JSON.stringify(metadata));
 writeFileSync(new URL('positions.bin',directory),Buffer.from(mesh.pos.buffer,mesh.pos.byteOffset,mesh.pos.byteLength));
 writeFileSync(new URL('indices.bin',directory),Buffer.from(mesh.idx.buffer,mesh.idx.byteOffset,mesh.idx.byteLength));
 writeFileSync(new URL('density.bin',directory),Int8Array.from(density,v=>Math.round(Math.max(-127,Math.min(127,v*8)))));
 console.log(metadata);
}finally{await browser.close();}
