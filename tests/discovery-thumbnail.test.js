import {test} from 'node:test';
import assert from 'node:assert/strict';
import './fixtures/loadRescueNavigation.js';
import * as T from '../vendor/three.module.js';
const {discoveryThumbnail}=await import('../src/ui/DiscoveryThumbnail.js');
const {discoveryPreviewConfig:config}=await import('../src/config/discoveryPreviewConfig.js');

function fixture(fail=false){
 const parent=new T.Group(),before=new T.Group(),root=new T.Group(),after=new T.Group(),model=new T.Mesh(new T.BoxGeometry(3,5,11),new T.MeshStandardMaterial({color:0xff8a24}));root.add(model);model.rotation.y=Math.PI;parent.add(before,root,after);root.position.set(10,20,30);root.rotation.set(.3,1.2,.4);root.scale.setScalar(2);root.visible=false;parent.updateMatrixWorld(true);
 const state={target:{name:'world target'},viewport:new T.Vector4(1,2,300,200),scissor:new T.Vector4(3,4,250,150),scissorTest:true,color:new T.Color(0x123456),alpha:.4},original={...state,viewport:state.viewport.clone(),scissor:state.scissor.clone(),color:state.color.clone()};let disposed=false,captured;
 const renderer={autoClear:false,getRenderTarget:()=>state.target,getViewport:v=>v.copy(state.viewport),getScissor:v=>v.copy(state.scissor),getScissorTest:()=>state.scissorTest,getClearColor:c=>c.copy(state.color),getClearAlpha:()=>state.alpha,setRenderTarget:t=>{state.target=t;if(t?.isWebGLRenderTarget)t.addEventListener('dispose',()=>disposed=true);},setViewport:v=>state.viewport.copy(v),setScissor:v=>state.scissor.copy(v),setScissorTest:v=>state.scissorTest=v,setClearColor:(c,a)=>{state.color.set(c);state.alpha=a;},render(scene,camera){captured={scene,camera,target:state.target};if(fail)throw Error('render failed');},readRenderTargetPixels(target,x,y,w,h,pixels){pixels.fill(80);}};
 return {parent,root,model,renderer,state,original,get disposed(){return disposed;},get captured(){return captured;}};
}
test('shared thumbnail uses neutral lights, sRGB alpha output and fitted per-category cameras without changing materials',()=>{
 const oldDocument=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},drawImage(){}}),toDataURL:()=> 'data:image/png;test'})};
 try{for(const view of Object.values(config.views)){
  const f=fixture(),position=f.root.position.clone(),rotation=f.root.quaternion.clone(),scale=f.root.scale.clone(),color=f.model.material.color.clone();assert.equal(discoveryThumbnail(f.renderer,f.root,view),'data:image/png;test');
  const {camera,scene,target}=f.captured;assert.equal(target.texture.colorSpace,T.SRGBColorSpace);assert.equal(target.width,512);assert.equal(target.texture.format,T.RGBAFormat);assert.equal(scene.children.filter(o=>o.isLight).length,3);assert(scene.children.filter(o=>o.isDirectionalLight).every(o=>o.color.equals(new T.Color(0xffffff))));
  assert(Math.abs(Math.atan2(camera.position.x,camera.position.z)*180/Math.PI-view.yaw)<1e-8);camera.updateMatrixWorld(true);
  const box=new T.Box3(new T.Vector3(-3,-5,-11),new T.Vector3(3,5,11));for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<=(view.edge??config.edge)+1e-9&&Math.abs(p.y)<=(view.edge??config.edge)+1e-9);}
  assert(f.root.position.equals(position)&&f.root.quaternion.equals(rotation)&&f.root.scale.equals(scale));assert.equal(f.parent.children[1],f.root);assert.equal(f.root.visible,false);assert(f.model.material.color.equals(color));assert.equal(f.model.rotation.y,Math.PI);assert.equal(f.state.target,f.original.target);assert(f.state.viewport.equals(f.original.viewport)&&f.state.scissor.equals(f.original.scissor));assert(f.state.color.equals(f.original.color));assert.equal(f.state.alpha,.4);assert.equal(f.state.scissorTest,true);assert.equal(f.renderer.autoClear,false);assert(f.disposed);
 }}finally{globalThis.document=oldDocument;}
});
test('failed thumbnail render restores scene ownership and renderer state and releases its target',()=>{
 const f=fixture(true),position=f.root.position.clone();assert.throws(()=>discoveryThumbnail(f.renderer,f.root),/render failed/);assert.equal(f.root.parent,f.parent);assert.equal(f.parent.children[1],f.root);assert(f.root.position.equals(position));assert.equal(f.root.visible,false);assert.equal(f.state.target,f.original.target);assert(f.state.viewport.equals(f.original.viewport));assert.equal(f.renderer.autoClear,false);assert(f.disposed);
});
test('marine-only cropping removes empty padding with a margin while crew portraits stay square and frontal',()=>{
 const previous=globalThis.document,canvases=[];globalThis.document={createElement:()=>{const canvas={getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},drawImage(...args){canvas.draw=args;}}),toDataURL:()=> 'data:image/png;test'};canvases.push(canvas);return canvas;}};
 try{const f=fixture();f.renderer.readRenderTargetPixels=(target,x,y,w,h,pixels)=>{pixels.fill(0);for(let py=200;py<=300;py++)for(let px=100;px<=400;px++)pixels[(py*w+px)*4+3]=200;};
  discoveryThumbnail(f.renderer,f.root,config.views.marine);const cropped=canvases.at(-1);assert(cropped.width>301&&cropped.width<512);assert(cropped.height>101&&cropped.height<200);assert(cropped.draw[1]<100&&cropped.draw[2]<211);assert(cropped.draw[1]+cropped.width>400&&cropped.draw[2]+cropped.height>311);const camera=f.captured.camera;assert(Math.abs(camera.position.x/camera.position.z-.8)<1e-8);assert(Math.abs(camera.position.y/camera.position.z-.4)<1e-8);
  canvases.length=0;discoveryThumbnail(f.renderer,f.root,config.views.crew);assert.equal(canvases.length,1);assert.equal(canvases[0].width,512);assert.equal(canvases[0].height,512);assert.equal(f.captured.camera.position.x,0);
 }finally{globalThis.document=previous;}
});
