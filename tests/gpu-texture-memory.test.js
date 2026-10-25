import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {textureBytes,estimateResidentTextureMemory} from '../src/ui/gpuTextureMemory.js';

const texture=(w,h,options={})=>Object.assign(new T.Texture({width:w,height:h}),options);
test('texture payload estimate handles exact mip sizes, non-power-of-two and scalar formats',()=>{
 assert.equal(textureBytes(texture(4,4)),84);
 assert.equal(textureBytes(texture(3,5)),72);
 assert.equal(textureBytes(texture(4,4,{type:T.HalfFloatType,generateMipmaps:false})),128);
 assert.equal(textureBytes(texture(4,4,{type:T.FloatType,format:T.RedFormat,generateMipmaps:false})),64);
 assert.equal(textureBytes(texture(4,4,{format:T.DepthStencilFormat,type:T.UnsignedInt248Type,generateMipmaps:false})),64);
 assert.equal(textureBytes(texture(Infinity,4)),null);
 assert.equal(textureBytes(texture(4,4,{format:-1})),null);
});
test('cube faces, array layers, explicit and compressed mip chains count their own storage',()=>{
 const cube=new T.CubeTexture(Array.from({length:6},()=>({width:4,height:4})));assert.equal(textureBytes(cube),504);
 const array=new T.DataArrayTexture(new Uint8Array(4*4*3*4),4,4,3);assert.equal(textureBytes(array),192);
 const explicit=texture(4,4,{mipmaps:[{width:4,height:4},{width:2,height:2}]});assert.equal(textureBytes(explicit),80);
 const compressed=new T.CompressedTexture([{width:4,height:4,data:new Uint8Array(16)},{width:2,height:2,data:new Uint8Array(16)}],4,4,T.RGBA_S3TC_DXT5_Format);assert.equal(textureBytes(compressed),32);
});
test('resident handles deduplicate shared maps and count hidden cached models, then drop on disposal',()=>{
 const scene=new T.Scene(),map=texture(4,4),shared=texture(4,4),unresident=texture(8,8),cached=texture(2,2,{generateMipmaps:false}),hidden=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial({map}));hidden.visible=false;scene.add(hidden);
 scene.add(new T.Mesh(hidden.geometry,new T.MeshBasicMaterial({map:shared,alphaMap:unresident})));
 const parked=new T.Group();parked.add(new T.Mesh(hidden.geometry,new T.MeshBasicMaterial({map:cached})));
 const properties=new WeakMap(),handle={};properties.set(map,{__webglTexture:handle});properties.set(shared,{__webglTexture:handle});properties.set(cached,{__webglTexture:{}});
 const game={scene,renderer:{properties},discovery:{records:new Map([['cached',{vehicle:{group:parked}}]])}};
 assert.deepEqual(estimateResidentTextureMemory(game),{bytes:100,textures:2,unknownTextures:0});
 properties.delete(map);properties.delete(shared);assert.deepEqual(estimateResidentTextureMemory(game),{bytes:16,textures:1,unknownTextures:0});
 properties.delete(cached);assert.deepEqual(estimateResidentTextureMemory(game),{bytes:0,textures:0,unknownTextures:0});
});
test('uniforms, environment, bone and shadow textures are included without GL queries',()=>{
 const scene=new T.Scene(),map=texture(2,2,{generateMipmaps:false}),bone=texture(2,2,{type:T.FloatType,generateMipmaps:false}),environment=texture(2,2,{type:T.HalfFloatType,generateMipmaps:false});
 const mesh=new T.Mesh(new T.BoxGeometry(),new T.ShaderMaterial({uniforms:{maps:{value:[map]}}}));mesh.skeleton={boneTexture:bone};scene.add(mesh);scene.environment=environment;
 const light=new T.DirectionalLight();light.shadow.map=new T.WebGLRenderTarget(2,2);scene.add(light);
 const properties=new WeakMap();for(const t of [map,bone,environment,light.shadow.map.texture])properties.set(t,{__webglTexture:{}});
 const value=estimateResidentTextureMemory({scene,renderer:{properties}});
 assert.equal(value.bytes,128);assert.equal(value.textures,4);
 assert.equal(estimateResidentTextureMemory({}),null);
});
