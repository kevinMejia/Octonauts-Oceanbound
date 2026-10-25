import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Mesh,PlaneGeometry,MeshBasicMaterial,DirectionalLight,PerspectiveCamera,Vector4} from '../vendor/three.module.js';
import {warmNearbyScenery} from '../src/environment/SceneryWarmup.js';

function fixture(count=2){
 const scene=new Scene(),geometry=new PlaneGeometry(),material=new MeshBasicMaterial();
 const chunks=Array.from({length:count},(_,i)=>{const mesh=new Mesh(geometry,material);mesh.name='terrain-'+i;mesh.frustumCulled=i%2===0;scene.add(mesh);return mesh;});
 const far=new Mesh(geometry,material);far.position.x=1000;far.name='far';scene.add(far);chunks.push(far);
 const other=new Mesh(geometry,material);other.name='vehicle';scene.add(other);
 const light=new DirectionalLight(),hiddenLight=new DirectionalLight();hiddenLight.visible=false;scene.add(light,hiddenLight);
 const camera=new PerspectiveCamera();camera.position.set(4,6,8);
 const target={},viewport=new Vector4(2,3,320,240),scissor=new Vector4(5,7,100,200),renders=[];
 let currentTarget=target,scissorTest=false;
 const assign=(v,args)=>args[0]?.isVector4?v.copy(args[0]):v.set(...args);
 const renderer={
  shadowMap:{enabled:true,autoUpdate:true,needsUpdate:true},
  getRenderTarget:()=>currentTarget,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>1,
  setRenderTarget:(value,face,level)=>{currentTarget=value;renderer.lastTarget=[value,face,level];},
  getViewport:out=>out.copy(viewport),getScissor:out=>out.copy(scissor),getScissorTest:()=>scissorTest,
  setViewport:(...args)=>assign(viewport,args),setScissor:(...args)=>assign(scissor,args),setScissorTest:value=>scissorTest=value,
  getContext:()=>({isContextLost:()=>false}),
  render(){
   assert.equal(currentTarget,null);assert.equal(scissorTest,true);assert.deepEqual(viewport.toArray(),[0,0,1,1]);
   assert.equal(renderer.shadowMap.autoUpdate,false);assert.equal(renderer.shadowMap.needsUpdate,false);assert.equal(renderer.shadowMap.enabled,true);
   assert.equal(light.visible,true);assert.equal(hiddenLight.visible,false);
   const visible=scene.children.filter(o=>o.isMesh&&o.visible);
   assert.ok(visible.every(o=>o.name.startsWith('terrain-')&&!o.frustumCulled));renders.push(visible.map(o=>o.name));
  }
 };
 const terrain={chunks,update(_time,position){for(const c of chunks)c.visible=Math.hypot(c.position.x-position.x,c.position.z-position.z)<85;}};
 const game={renderer,scene,camera,terrain,sub:{position:{x:0,y:20,z:0}}};
 const initial=scene.children.map(o=>({object:o,visible:o.visible,culling:o.frustumCulled,position:o.position.toArray()}));
 const restored=()=>{for(const s of initial){assert.equal(s.object.visible,s.visible);assert.equal(s.object.frustumCulled,s.culling);assert.deepEqual(s.object.position.toArray(),s.position);}assert.deepEqual(viewport.toArray(),[2,3,320,240]);assert.deepEqual(scissor.toArray(),[5,7,100,200]);assert.equal(scissorTest,false);assert.deepEqual(renderer.shadowMap,{enabled:true,autoUpdate:true,needsUpdate:true});assert.deepEqual(renderer.lastTarget,[target,2,1]);assert.deepEqual(camera.position.toArray(),[4,6,8]);};
 return {game,renders,restored,geometry,material};
}

test('warm-up submits only nearby terrain and restores render/scene state',async()=>{
 const f=fixture();await warmNearbyScenery(f.game);assert.equal(f.renders.length,1);assert.equal(f.renders[0].length,2);f.restored();f.geometry.dispose();f.material.dispose();
});
test('warm-up yields between bounded batches without adding resources',async t=>{
 const previous=globalThis.requestAnimationFrame;let yields=0;globalThis.requestAnimationFrame=fn=>{yields++;setImmediate(fn);};t.after(()=>{globalThis.requestAnimationFrame=previous;});
 const f=fixture(26),geometries=f.game.terrain.chunks.map(m=>m.geometry);await warmNearbyScenery(f.game);
 assert.deepEqual(f.renders.map(r=>r.length),[12,12,2]);assert.equal(yields,2);assert.deepEqual(f.game.terrain.chunks.map(m=>m.geometry),geometries);f.restored();f.geometry.dispose();f.material.dispose();
});
test('render failure and context loss both restore state before propagating',async()=>{
 for(const lost of [false,true]){
  const f=fixture();if(lost)f.game.renderer.getContext=()=>({isContextLost:()=>true});else f.game.renderer.render=()=>{throw new Error('render failed');};
  await assert.rejects(warmNearbyScenery(f.game),lost?/Graphics context unavailable/:/render failed/);f.restored();f.geometry.dispose();f.material.dispose();
 }
});
