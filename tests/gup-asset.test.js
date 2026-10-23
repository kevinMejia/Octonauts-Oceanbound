import {test} from 'node:test';
import assert from 'node:assert/strict';
import {useImportedGup,collectModelStats} from '../src/vehicles/gupAsset.js';
test('full-resolution model is the public default while the original remains selectable',()=>{
 for(const hostname of ['localhost','127.0.0.1','192.168.1.20','kevinmejia.github.io','example.com']){
  assert.equal(useImportedGup({hostname,search:''}),true);
  assert.equal(useImportedGup({hostname,search:'?gup=high'}),true);
  assert.equal(useImportedGup({hostname,search:'?gup=original'}),false);
 }
});
test('model statistics count indexed/unindexed geometry and distinct shared materials/textures',()=>{
 const texture={isTexture:true,name:'shared',image:{width:1024,height:1024}},material={map:texture,emissiveMap:texture};const other={map:texture};
 const nodes=[{isMesh:true,geometry:{index:{count:300}},material},{isMesh:true,geometry:{attributes:{position:{count:60}}},material:[material,other]},{isMesh:false}];
 const result=collectModelStats({traverse:fn=>nodes.forEach(fn)});assert.equal(result.triangles,120);assert.equal(result.materials,2);assert.equal(result.meshes,2);assert.equal(result.textures.length,1);assert.ok(Math.abs(result.textureMemoryEstimateMiB-16/3)<.001);
});
