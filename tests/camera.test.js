import {test} from 'node:test';import assert from 'node:assert/strict';
import {recenterAngle,smoothFactor,speedFraming,aspectDistance,ellipsoidEntry,terrainEntry} from '../src/camera/cameraMath.js';
import {cameraConfig as c} from '../src/config/cameraConfig.js';
const point=(x,y=2,z=0)=>({x,y,z});
test('camera smoothing responds consistently across frame rates',()=>{const run=hz=>{let x=0;for(let i=0;i<hz;i++)x+=(10-x)*smoothFactor(7,1/hz);return x;};assert(Math.abs(run(30)-run(120))<1e-10);assert.equal(smoothFactor(7,0),0);});
test('speed framing is subtle, continuous and bounded; portrait retains hull room',()=>{assert.equal(speedFraming(0,c),0);assert.equal(speedFraming(10,c),0);assert.equal(speedFraming(100,c),1);assert(speedFraming(16,c)>.4);assert.equal(aspectDistance(2,c),1);assert.equal(aspectDistance(.56,c),c.portraitDistanceMax);});
test('camera sweeps hit rock, coral and rotated structure proxies without mesh rays',()=>{const obstacle={x:5,y:2,z:0,rx:1,ry:2,rz:3,angle:0};assert(Math.abs(ellipsoidEntry(point(0),point(10),obstacle)-.4)<1e-8);assert.equal(ellipsoidEntry(point(0,8),point(10,8),obstacle),1);assert(ellipsoidEntry(point(0),point(10),obstacle,.65)<.4);assert(Math.abs(ellipsoidEntry(point(0),point(10),{...obstacle,angle:Math.PI/2})-.2)<1e-8);assert.equal(ellipsoidEntry(point(5),point(10),obstacle),1);});
test('terrain segment detects a hill between clear endpoints and downward orbit',()=>{const hill=(x,z)=>x>4&&x<6?3:0;const t=terrainEntry(point(0),point(10),hill,c);assert(t>.39&&t<.41);assert.equal(terrainEntry(point(0,6),point(10,6),hill,c),1);const down=terrainEntry(point(0,3),point(10,-3),()=>0,c);assert(down>.35&&down<.38);});

test('recenter takes the short route after multiple complete orbits',()=>{assert(Math.abs(recenterAngle(Math.PI*4+.2,1.8,0)-.2)<1e-10);assert(recenterAngle(Math.PI+1,1.8,.1)<0);});
