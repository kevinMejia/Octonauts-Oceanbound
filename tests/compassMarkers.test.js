import test from 'node:test';import assert from 'node:assert/strict';
import {targetState} from '../src/navigation/compassMarkers.js';import {vehicles} from '../src/config/vehicleConfig.js';
test('destination bearings follow north/east and wrap with vehicle heading',()=>{assert.equal(targetState({x:0,y:0,z:0},0,{x:0,y:0,z:-10}).relative,0);assert.equal(targetState({x:0,y:0,z:0},90,{x:0,y:0,z:-10}).relative,-90);assert.equal(targetState({x:0,y:0,z:0},350,{x:0,y:0,z:-10}).relative,10);});
test('proximity uses 3D position and configured range',()=>{assert.equal(targetState({x:0,y:0,z:0},0,{x:0,y:100,z:0},90).proximity,0);assert.equal(targetState({x:0,y:0,z:0},0,{x:0,y:0,z:45},90).proximity,.5);});
test('all registered GUPs configure artwork-based compass colors',()=>{for(const v of vehicles)assert.match(v.compassColor,/^#[\da-f]{6}$/i);});
