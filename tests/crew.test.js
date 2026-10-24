import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {crewConfig as c,crewModelURL} from '../src/config/crewConfig.js';
function model(id){const b=readFileSync(new URL('../assets/models/characters/'+id+'.glb',import.meta.url));assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);return JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));}
test('eight reusable crew exports contain a palette skin, limb rig and an eight-second idle',()=>{for(const {id} of c.characters){const g=model(id);assert.equal(g.meshes.length,1);assert.equal(g.meshes[0].primitives.length,1);assert.equal(g.skins.length,1);const names=g.skins[0].joints.map(i=>g.nodes[i].name);for(const n of ['Head','Torso','Arm_L','Arm_R','Hand_L','Leg_L','Leg_R','Foot_L','Blink_L','Blink_R'])assert(names.includes(n),id+' '+n);assert(g.animations.some(a=>a.name===id+'_Idle'));assert(g.animations[0].channels.some(a=>a.target.path==='scale'));const lengths=g.animations[0].samplers.map(s=>g.accessors[s.input].max[0]);assert(Math.max(...lengths)>=8);assert(existsSync(new URL('../assets/blender/characters/'+id+'.blend',import.meta.url)));}});
test('bridge crew stand on the existing deck inside the glazed footprint',()=>{assert.equal(c.characters.length,8);for(const p of c.characters){assert(p.y>=20.09&&p.y<20.2);assert(Math.hypot(p.x,p.z)<7);assert.equal(c.scale,1);}});

test('visual assets are configured independently of crew identity and resolve under project hosting',()=>{
 for(const d of c.characters){assert(d.visual.modelPath.endsWith(d.id+'.glb'));assert(d.visual.scale>0);assert.equal(d.visual.orientation,Math.PI);assert.equal(d.visual.offset.length,3);assert(d.gameplaySize.height>0);assert(d.gameplaySize.radius>0);assert(existsSync(new URL(d.visual.modelPath,new URL('../src/config/crewConfig.js',import.meta.url))));}
 assert(c.characters.every(d=>!d.visual.placeholder));
 const url=crewModelURL({...c.characters[0],visual:{modelPath:'../../assets/models/characters/replacement.glb'}},'https://example.com/Octonauts-Oceanbound/src/config/crewConfig.js?v=42');assert.equal(url,'https://example.com/Octonauts-Oceanbound/assets/models/characters/replacement.glb?v=42');
});

test('imported crew retain rigs and every nonempty source action in self-contained GLBs',()=>{
 const audit=JSON.parse(readFileSync(new URL('../docs/characters/source-audit.json',import.meta.url)));
 for(const d of c.characters){
  const b=readFileSync(new URL(d.visual.modelPath,new URL('../src/config/crewConfig.js',import.meta.url)));
  const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
  assert(g.skins?.length>0,d.id+' rig');
  const source=audit.find(r=>r.folder.toLowerCase()===d.id),names=new Set(g.animations?.map(a=>a.name));
  for(const [name,keys] of Object.entries(source.animationKeys))if(keys)assert(names.has(name),d.id+' '+name);
  for(const image of g.images??[])assert(image.bufferView!==undefined&&!image.uri,d.id+' embedded image');
  const triangles=g.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+g.accessors[p.indices].count/3,0);
  assert(triangles<50000,d.id+' runtime triangle budget');
 }
});
