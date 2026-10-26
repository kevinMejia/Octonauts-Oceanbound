import {test} from 'node:test';import assert from 'node:assert/strict';
import {airBlend,surfaceHeight} from '../src/effects/waterMath.js';
import {worldConfig} from '../src/config/worldConfig.js';
import {waterConfig} from '../src/config/waterConfig.js';
test('camera medium follows local animated surface continuously',()=>{for(const time of [0,1,40])for(const x of [-780,0,780]){const h=surfaceHeight(x,17,time);assert(Math.abs(h-worldConfig.surface)<=waterConfig.surface.waveHeight*1.5);assert.equal(airBlend(h,x,17,time),.5);assert.equal(airBlend(h-3,x,17,time),0);assert.equal(airBlend(h+3,x,17,time),1);let last=0;for(let y=h-3;y<h+3;y+=.01){const value=airBlend(y,x,17,time);assert(value>=last);assert(value-last<.006);last=value;}}});
