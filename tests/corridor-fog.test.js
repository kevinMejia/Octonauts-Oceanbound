import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {dolphinRescueConfig} from '../src/config/dolphinRescueConfig.js';
const url=new URL('../src/missions/CorridorFog.js',import.meta.url),source=(await readFile(url,'utf8')).replace("from 'three'",`from '${new URL('../vendor/three.module.js',import.meta.url)}'`);
const {CorridorFog,corridorFogScale}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const profile=dolphinRescueConfig.environment.forwardFog;
test('forward path is clearer while both side banks retain full native fog',()=>{
 for(const x of [-6,-2,0,2,6])assert.equal(corridorFogScale(x,profile),.55);
 for(const x of [-100,-15,-14,14,15,100])assert.equal(corridorFogScale(x,profile),1);
 let previous=.55;for(let x=6;x<=14;x+=.25){const scale=corridorFogScale(x,profile);assert(scale>=previous&&scale<=1);assert.equal(scale,corridorFogScale(-x,profile));previous=scale;}
 const fog=(distance,scale)=>1-Math.exp(-((.024*scale*distance)**2));assert(fog(60,.55)<fog(60,1));assert(fog(500,.55)>.999);
});
test('fog hook retains prior shading and native fog with instanced world-space placement',()=>{
 const material=new T.MeshStandardMaterial(),before=shader=>{shader.uniforms.existing={value:7};},key=()=> 'existing-profile';material.onBeforeCompile=before;material.customProgramCacheKey=key;
 const root=new T.Group();root.add(new T.Mesh(new T.BoxGeometry(),material),new T.InstancedMesh(new T.BoxGeometry(),material,2));const fog=new CorridorFog(profile);fog.apply(root);assert.equal(fog.records.length,1);
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);assert.equal(shader.uniforms.existing.value,7);assert.equal(shader.uniforms.uCorridorFog.value.w,.55);assert(shader.vertexShader.includes('instanceMatrix*corridorFogPosition'));assert(shader.fragmentShader.includes('fogDensity * fogDensity * corridorFogScale * corridorFogScale'));assert.equal(material.customProgramCacheKey(),'existing-profile|dolphin-corridor-fog-1');
 fog.setDensityScale(1);assert.equal(shader.uniforms.uCorridorFog.value.w,1);fog.dispose();assert.equal(material.onBeforeCompile,before);assert.equal(material.customProgramCacheKey,key);assert.equal(fog.records.length,0);
 const again=new CorridorFog(profile);again.apply(root);const second={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(second);assert.equal(second.uniforms.uCorridorFog,shader.uniforms.uCorridorFog);assert.equal(second.uniforms.uCorridorFog.value.w,.55);again.dispose();
});
test('custom particle shaders and fog-disabled materials remain untouched',()=>{
 const materials=[new T.ShaderMaterial(),new T.MeshBasicMaterial({fog:false})],root=new T.Group();for(const material of materials)root.add(new T.Mesh(new T.BoxGeometry(),material));const hooks=materials.map(m=>m.onBeforeCompile),fog=new CorridorFog(profile);fog.apply(root);assert.equal(fog.records.length,0);for(const [i,m] of materials.entries())assert.equal(m.onBeforeCompile,hooks[i]);fog.dispose();
});

