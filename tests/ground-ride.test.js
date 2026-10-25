import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundRide} from '../src/vehicles/GroundRide.js';
import {gupXGround} from '../src/config/groundVehicleConfig.js';
test('visual tread vibration follows actual travel, fades at rest and never changes physics',()=>{
 const ride=new GroundRide(),s={position:{x:0,y:2,z:0},pitch:.1,bank:0,groundController:{config:gupXGround}};
 ride.update(.016,s);assert.equal(ride.y,0);
 let peak=0;
 for(let i=0;i<120;i++){s.position.z+=.12;const before=JSON.stringify(s);ride.update(.016,s);assert.equal(JSON.stringify(s),before);peak=Math.max(peak,Math.abs(ride.y));}
 assert.ok(peak>.01&&peak<.06);
 for(let i=0;i<120;i++)ride.update(.016,s);
 assert.equal(ride.y,0);assert.equal(ride.pitch,0);assert.equal(ride.roll,0);
});
test('swimming vehicles and zero-time vehicle switches have no suspension offsets',()=>{
 const ride=new GroundRide(),s={position:{x:0,y:2,z:0},pitch:0,bank:0};
 ride.update(.016,s);assert.equal(ride.y,0);
 s.groundController={config:gupXGround};ride.update(.016,s);s.position.x=4;ride.update(.016,s);assert.ok(ride.amount>0);
 ride.update(0,s);assert.equal(ride.y,0);assert.equal(ride.amount,0);
});
