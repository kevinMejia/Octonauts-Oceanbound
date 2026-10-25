import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vehicleById} from '../src/config/vehicleConfig.js';
const bytes=readFileSync(new URL('../assets/models/gup-x.glb',import.meta.url));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
test('GUP-X uses the real source export with embedded textures and original geometry',()=>{
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
 const root=gltf.nodes.find(n=>n.extras?.creator==='Keeks_Q');assert(root);assert.equal(root.extras.runtimeLength,8);
 const triangles=gltf.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+gltf.accessors[p.indices].count/3,0),0);
 assert.equal(triangles,1193209);assert.equal(root.extras.sourceTriangles,triangles);
 assert(gltf.images.length>0);assert(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));
 // CI checks the tracked runtime export. Authoring downloads are deliberately
 // untracked; tools/import_gup_x.py checks their hashes during local export.
});
test('independent authored tread morphs bind to the real asset and ground offset clears its lower hull',()=>{
 const v=vehicleById('gup-x');for(const side of ['left','right']){
  const node=gltf.nodes.find(n=>n.name===v.tracks[side+'Morph']);assert(node);
  assert(Math.abs(node.extras.treadPitch-v.tracks.pitch)<1e-9);
  for(const p of gltf.meshes[node.mesh].primitives)assert.equal(p.targets.length,v.tracks.morphSteps);
 }
 assert.equal(v.tracks.direction,-1);assert.equal(v.scale,1);assert.equal(v.orientation,0);
 assert(v.ground.groundClearance+v.groundOffset-3.441996060641895/2>0);
 assert(v.collision.radius>=6.016080090799481/2);assert(v.collision.halfLength>=4);
});
