import test from 'node:test';import assert from 'node:assert/strict';
import {uploadActivePrefix} from '../src/environment/bufferUpdates.js';
function attribute(itemSize){return {itemSize,updateRanges:[],version:0,clearUpdateRanges(){this.updateRanges=[];},addUpdateRange(start,count){this.updateRanges.push({start,count});},set needsUpdate(value){if(value)this.version++;}};}
test('active prefix uses element counts for vector, color and matrix attributes',()=>{
 for(const size of [1,2,3,4,16]){const a=attribute(size);uploadActivePrefix(a,7);assert.deepEqual(a.updateRanges,[{start:0,count:7*size}]);assert.equal(a.version,1);}
});
test('deferred uploads use the latest rewritten prefix after shrink, empty and grow',()=>{
 const a=attribute(3),cpu=new Float32Array(30),gpu=new Float32Array(30);
 const update=(count,offset)=>{for(let i=0;i<count*3;i++)cpu[i]=i+offset;uploadActivePrefix(a,count);};
 update(8,10);update(2,20);update(0,0);update(5,30);
 assert.deepEqual(a.updateRanges,[{start:0,count:15}]);
 for(const r of a.updateRanges)gpu.set(cpu.subarray(r.start,r.start+r.count),r.start);
 assert.deepEqual(gpu.subarray(0,15),cpu.subarray(0,15));assert.equal(a.version,3);
});
test('empty buffers do not request full-capacity uploads or unbounded ranges',()=>{
 const a=attribute(16);for(let i=0;i<100;i++)uploadActivePrefix(a,0);assert.equal(a.version,0);assert.deepEqual(a.updateRanges,[]);
 for(let i=1;i<100;i++)uploadActivePrefix(a,i%9+1);assert.equal(a.updateRanges.length,1);
});
