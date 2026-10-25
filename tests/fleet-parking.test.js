import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vehicles} from '../src/config/vehicleConfig.js';
import {fleetAnchor,FleetPlacement} from '../src/vehicles/fleetPlacement.js';
import {SurfaceGrid} from '../src/effects/interactionMath.js';
import {octopodConfig} from '../src/config/octopodConfig.js';
import {fleetParkingRadius,withOctopodBerth} from '../src/config/fleetParkingConfig.js';
import {importedVehicles} from '../src/config/importedVehicles.js';
test('collected GUPs have distinct radial berths with an open approach and outward headings',()=>{
 const points=vehicles.filter(v=>!v.finalReward).map(v=>fleetAnchor(v,true)),base=octopodConfig.position;
 for(const p of points){assert.ok(Math.abs(Math.hypot(p.x-base.x,p.z-base.z)-fleetParkingRadius)<.001);assert.ok(Math.abs(Math.sin(p.heading)-(p.x-base.x)/fleetParkingRadius)<.001);assert.ok(Math.abs(p.x-base.x)>13);}
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z)>14);
 const shifted=fleetAnchor(vehicles[0],true,{x:500,y:0,z:500});assert.equal(shifted.x,500+vehicles[0].parking.spawn.offset[0]);
});
test('discovery locations, imported definitions and future custom berths stay independent',()=>{
 for(const original of importedVehicles)assert.deepEqual(vehicles.find(v=>v.id===original.id).discovery,original.discovery);
 assert.deepEqual(vehicles[0].discovery.spawn.offset,[24,0,48]);assert.deepEqual(vehicles[2].discovery.spawn.offset,[-68,0,-38]);
 const custom={id:'future',parking:{spawn:{relativeTo:'world',offset:[1,2,3]}}};assert.equal(withOctopodBerth(custom),custom);
});
test('every reserved berth clears the real Octopod and all other GUP hulls',()=>{
 const grid=new SurfaceGrid(),base=octopodConfig.position,data=JSON.parse(readFileSync(new URL('../assets/models/octopod-collision.json',import.meta.url)));
 for(const c of data.colliders)grid.add({x:base.x+c.center[0],y:base.y+c.center[1],z:base.z+c.center[2],rx:c.radii[0],ry:c.radii[1],rz:c.radii[2],radius:Math.max(c.radii[0],c.radii[2]),angle:0,co:1,si:0,solid:true});
 const placement=new FleetPlacement(grid),poses=[];
 for(const definition of vehicles){const anchor=fleetAnchor(definition,true),pose=placement.find(anchor,definition,{parking:true,ignoreId:definition.id,returningId:'*',maxRadius:0});assert.ok(pose,'Unobstructed berth '+definition.id);poses.push({definition,pose});
  const c=definition.collision,depth=Math.min(c.radius,c.halfLength),l=Math.max(0,c.halfLength-depth);
  for(let i=-1;i<=1;i++)grid.add({x:pose.x+Math.sin(pose.heading)*l*i,y:pose.y+(c.centerY??0),z:pose.z+Math.cos(pose.heading)*l*i,rx:c.radius,ry:c.halfHeight,rz:depth,radius:c.radius,angle:pose.heading,co:Math.cos(pose.heading),si:Math.sin(pose.heading),solid:true,parkedId:definition.id});
 }
 for(const {definition,pose} of poses)assert.ok(placement.clear(pose,definition,definition.id,'*'),definition.id);
});

test('GUP-X berth sits on clear, level sand with room for its full footprint',()=>{
 const v=vehicles.find(v=>v.id==='gup-x'),p=fleetAnchor(v,true),base=octopodConfig.position;
 assert(Math.hypot(p.x-base.x,p.z-base.z)+v.collision.radius<octopodConfig.sceneryClearance);
 assert.equal(fleetAnchor(v,false).heading,Math.PI);assert.equal(p.heading,Math.PI);
 const placement=new FleetPlacement(new SurfaceGrid()),pose=placement.find(p,v,{parking:true,maxRadius:0});assert(pose);assert(Math.abs(pose.pitch)<1e-8);assert(Math.abs(pose.bank)<1e-8);assert(Math.abs(pose.y-.69)<1e-8);
 for(const other of vehicles.filter(v=>v.id!=='gup-x')){const q=fleetAnchor(other,true);assert(Math.hypot(p.x-q.x,p.z-q.z)>14);}
});
test('ground parking follows a slope instead of keeping its body level',()=>{
 const v=vehicles.find(v=>v.id==='gup-x'),h=(x,z)=>z*.2,placement=new FleetPlacement(new SurfaceGrid(),h);
 const p=placement.find({x:0,y:0,z:0,heading:0,groundClearance:.65},v,{parking:true,maxRadius:0});assert(p);assert(Math.abs(p.pitch+Math.atan(.2))<.001);assert(Math.abs(p.bank)<1e-8);assert(p.y<.75);
});
