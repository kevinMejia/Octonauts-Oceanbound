import test from 'node:test';
import assert from 'node:assert/strict';
import {VehicleImageCache} from '../src/vehicles/VehicleImageCache.js';

function png(width=2560,height=2560){const bytes=new Uint8Array(24);const view=new DataView(bytes.buffer);view.setUint32(16,width);view.setUint32(20,height);return bytes;}
function fixture(){let decodes=0,closes=0;const cache=new VehicleImageCache({hash:async b=>Array.from(b).join(','),decode:async()=>{decodes++;return {width:2560,height:2560,close(){closes++;}};},makeSource:data=>({data})});return {cache,get decodes(){return decodes;},get closes(){return closes;}};}
test('parsing repeated vehicle images shares a source without decoding full-size pixels',async()=>{
 const f=fixture(),a=await f.cache.get(png()),b=await f.cache.get(png());assert.equal(a,b);assert.equal(a.source,b.source);assert.equal(f.decodes,0);assert.equal(f.cache.snapshot().decodedBytes,0);
});
test('upload releases decoded images; returning models reuse compressed bytes and preserve resolution',async()=>{
 const f=fixture(),entry=await f.cache.get(png());let source;await f.cache.withImage(entry,()=>{source=entry.source.data;assert.equal(f.cache.decodedBytes,2560*2560*4);assert.equal(source.width,2560);});assert.equal(f.closes,1);assert.equal(f.cache.decodedBytes,0);assert.deepEqual(entry.source.data,{width:2560,height:2560});
 await f.cache.withImage(entry,()=>assert.notEqual(entry.source.data,source));assert.equal(f.decodes,2);assert.equal(f.closes,2);assert.equal(f.cache.entries.size,1);
});
test('concurrent uploads cannot close a shared image while another upload owns it',async()=>{
 const f=fixture(),entry=await f.cache.get(png()),seen=[];
 await Promise.all([f.cache.withImage(entry,()=>{seen.push(entry.source.data);assert.equal(f.closes,0);}),f.cache.withImage(entry,()=>{seen.push(entry.source.data);assert.equal(f.closes,0);})]);assert.equal(seen[0],seen[1]);assert.equal(f.decodes,1);assert.equal(f.closes,1);assert.equal(f.cache.decodedBytes,0);
});
test('decode and upload failures release resources and allow a later retry',async()=>{
 const f=fixture(),entry=await f.cache.get(png());await assert.rejects(f.cache.withImage(entry,()=>{throw Error('context lost');}),/context lost/);assert.equal(f.closes,1);assert.equal(f.cache.decodedBytes,0);
 const original=f.cache.decode;f.cache.decode=async()=>{throw Error('decode failed');};await assert.rejects(f.cache.withImage(entry,()=>{}),/decode failed/);assert.equal(entry.users,0);assert.equal(entry.pending,null);f.cache.decode=original;await f.cache.withImage(entry,()=>{});assert.equal(f.closes,2);
});
test('GPU release versions and context restoration invalidate uploads independently per renderer',()=>{
 const f=fixture(),a={},b={},texture={version:1};f.cache.markUploaded(a,texture);assert.equal(f.cache.uploaded(a,texture),true);assert.equal(f.cache.uploaded(b,texture),false);texture.version++;assert.equal(f.cache.uploaded(a,texture),false);f.cache.markUploaded(a,texture);f.cache.resetUploads(a);assert.equal(f.cache.uploaded(a,texture),false);
});
