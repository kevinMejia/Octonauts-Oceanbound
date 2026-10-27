import test from 'node:test';
import assert from 'node:assert/strict';
import {reefOverpassLayout} from '../src/environment/reefOverpassLayout.js';
import {overpassEnabled} from '../src/config/reefOverpassConfig.js';
import {SurfaceGrid} from '../src/effects/interactionMath.js';
import {InteractionSurfaces} from '../src/effects/InteractionSurfaces.js';
import {FleetPlacement} from '../src/vehicles/fleetPlacement.js';
import {vehicles} from '../src/config/vehicleConfig.js';
import {heightAt} from '../src/environment/terrainMath.js';
const empty=()=>new InteractionSurfaces(null,{layout:{records:[]}},{});
test('one deterministic placement, rejects unsafe terrain and blocked candidates',()=>{
 const s=empty(),a=reefOverpassLayout(s),b=reefOverpassLayout(s);assert.deepEqual(a,b);assert.equal(a.rocks.length,15);assert.equal(reefOverpassLayout(s,()=>100*Math.random()),null);
 assert.equal(reefOverpassLayout({grid:{query:()=>[{x:500,z:500,radius:1000,solid:true}]}}),null);
});
test('flag defaults enabled and developer override disables construction',()=>{assert.equal(overpassEnabled({}),true);assert.equal(overpassEnabled({location:{search:'?reefOverpass=off'}}),false);});
test('every hull clears bidirectional center passage and upper route; solid support/span block',()=>{
 const s=empty(),a=reefOverpassLayout(s);a.rocks.forEach(r=>s.add(r));const placement=new FleetPlacement(s.grid);
 for(const v of vehicles)for(const heading of [0,Math.PI])for(let dz=-65;dz<=65;dz+=2){const pose={x:a.x,y:heightAt(a.x,a.z+dz)+5,z:a.z+dz,heading};assert.ok(placement.clear(pose,v),v.id+' below '+dz);assert.ok(placement.clear({...pose,y:a.y+34},v),v.id+' above');}
 for(const r of a.rocks){assert.equal(placement.clear({x:r.x,y:r.y,z:r.z,heading:0},vehicles[0]),false);}
});
import {TrackedGroundController} from '../src/vehicles/TrackedGroundController.js';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';
import {CollisionWorld} from '../src/collision/CollisionWorld.js';
test('GUP-X drives both ways over existing sloped seabed through passage',()=>{
 const surfaces=empty(),a=reefOverpassLayout(surfaces);a.rocks.forEach(r=>surfaces.add(r));const world=new CollisionWorld(surfaces),v=vehicles.find(v=>v.id==='gup-x');
 for(const direction of [-1,1]){const s=new SubmarineController();s.collisionProxy=v.collision;s.groundController=new TrackedGroundController(v.ground);s.collisionWorld=world;s.heading=direction===1?0:Math.PI;Object.assign(s.position,{x:a.x,y:heightAt(a.x,a.z-direction*60)+2,z:a.z-direction*60});s.groundController.align(s);for(let i=0;i<1500;i++)s.update(1/60,{thrust:1,turn:0,vertical:0,boost:false});assert.ok(direction*(s.position.z-a.z)>55,'tracked route '+direction);}
});
