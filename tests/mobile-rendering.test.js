import test from 'node:test';import assert from 'node:assert/strict';
import {vehicleGlassMode,setVehicleGlass} from '../src/vehicles/VehicleGlass.js';
import {batchJellyfishTentacles} from '../src/config/visualConfig.js';
test('jellyfish batching defaults on with an explicit original-rendering comparison',()=>{
 assert.equal(batchJellyfishTentacles({location:{search:''}}),true);assert.equal(batchJellyfishTentacles({location:{search:'?tentacles=original'}}),false);assert.equal(batchJellyfishTentacles({location:{search:'?tentacles=batched'}}),true);
});
test('physical glass remains default and comparison modes are explicit',()=>{
 assert.equal(vehicleGlassMode({location:{search:''}}),'original');assert.equal(vehicleGlassMode({location:{search:'?glass=mobile'}}),'mobile');assert.equal(vehicleGlassMode({location:{search:'?glass=original'}}),'original');assert.equal(vehicleGlassMode({location:{search:'?glass=typo'}}),'original');
});
test('glass preview is reversible and preserves shader, texture, color and roughness',()=>{
 const shader=()=>{},map={},glass={transmission:.377,opacity:1,transparent:true,depthWrite:false,userData:{oceanboundFacingAlpha:true},onBeforeCompile:shader,map,color:{r:1},roughness:.2},opaque={transmission:0,opacity:1,userData:{}};
 const root={traverse(fn){fn({material:[glass,opaque]});fn({material:glass});}};
 assert.equal(setVehicleGlass(root,'mobile'),1);assert.equal(glass.transmission,0);assert.equal(glass.opacity,.65);assert.equal(glass.onBeforeCompile,shader);assert.equal(glass.map,map);assert.equal(glass.roughness,.2);assert.equal(opaque.opacity,1);
 setVehicleGlass(root,'original');assert.equal(glass.transmission,.377);assert.equal(glass.transparent,true);assert.equal(glass.depthWrite,false);assert.equal(glass.opacity,1);
});
test('plain transmissive glass becomes transparent in preview and restores opaque-pass ownership',()=>{
 const material={transmission:.5,opacity:1,transparent:false,depthWrite:true,userData:{}};const root={traverse:fn=>fn({material})};
 setVehicleGlass(root,'mobile');assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);assert.equal(material.opacity,.28);
 setVehicleGlass(root,'original');assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(material.opacity,1);
});
