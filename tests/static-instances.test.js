import test from 'node:test';
import assert from 'node:assert/strict';
import {writeStaticInstance,finishStaticInstances} from '../src/environment/staticInstances.js';
function fixture(){
 const attribute=()=>({version:0,ranges:[],addUpdateRange(start,count){this.ranges.push({start,count});},set needsUpdate(v){if(v)this.version++;}});
 const mesh={userData:{},instanceMatrix:attribute(),instanceColor:attribute(),matrices:[],colors:[],setMatrixAt(i,m){this.matrices[i]=m;},setColorAt(i,c){this.colors[i]=c.value;}};
 return {mesh,color:{setRGB(r){this.value=r;}},a:{matrix:'A',tint:.9},b:{matrix:'B',tint:1}};
}
test('unchanged visible slots do not rewrite or reupload static data',()=>{
 const {mesh,color,a,b}=fixture();for(let frame=0;frame<100;frame++){writeStaticInstance(mesh,0,a,color);writeStaticInstance(mesh,1,b,color);finishStaticInstances(mesh,2);}
 assert.equal(mesh.instanceMatrix.version,1);assert.equal(mesh.instanceColor.version,1);assert.deepEqual(mesh.matrices,['A','B']);assert.deepEqual(mesh.colors,[.9,1]);
 assert.deepEqual(mesh.instanceMatrix.ranges,[{start:0,count:32}]);
});
test('culling, empty batches, reappearance and reordered LOD slots retain exact data',()=>{
 const {mesh,color,a,b}=fixture();writeStaticInstance(mesh,0,a,color);writeStaticInstance(mesh,1,b,color);finishStaticInstances(mesh,2);
 finishStaticInstances(mesh,0);assert.equal(mesh.count,0);assert.equal(mesh.instanceMatrix.version,1);
 writeStaticInstance(mesh,0,b,color);finishStaticInstances(mesh,1);assert.equal(mesh.matrices[0],'B');assert.equal(mesh.colors[0],1);
 writeStaticInstance(mesh,0,a,color);writeStaticInstance(mesh,1,b,color);finishStaticInstances(mesh,2);assert.deepEqual(mesh.matrices,['A','B']);assert.deepEqual(mesh.colors,[.9,1]);assert.equal(mesh.count,2);
});
test('matrix-only habitat batches and pending upload ranges work before rendering',()=>{
 const {mesh,a,b}=fixture();mesh.instanceColor=null;writeStaticInstance(mesh,0,a);finishStaticInstances(mesh,1);writeStaticInstance(mesh,1,b);finishStaticInstances(mesh,2);
 assert.deepEqual(mesh.instanceMatrix.ranges,[{start:0,count:16},{start:16,count:16}]);assert.equal(mesh.instanceMatrix.version,2);
});
