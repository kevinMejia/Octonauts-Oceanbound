import test from 'node:test';
import assert from 'node:assert/strict';
import {turboWindowConfig as c} from '../src/config/hudConfig.js';
import {turboWindowGeometry} from '../src/ui/turboWindowGeometry.js';
// Independent nearest-point search against the un-offset artwork outline.
function badgeGap(p){const b=c.badge,d=a=>(p.x-b.x-b.rx*Math.cos(a))**2+(p.y-b.y-b.ry*Math.sin(a))**2;let lo=-Math.PI/2,hi=Math.PI/2;for(let i=0;i<80;i++){const a=lo+(hi-lo)/3,z=hi-(hi-lo)/3;if(d(a)<d(z))hi=z;else lo=a;}return Math.sqrt(d((lo+hi)/2));}
test('turbo rim and bezel have the same normal clearance at badge and visible housing edges',()=>{const g=turboWindowGeometry();for(const [part,gap] of [[g.rim,6],[g.well,7.5],[g.mask,9]]){assert.equal(part.top-c.housing.top-c.housing.stroke/2,gap);assert.equal(c.housing.bottom-part.bottom-c.housing.stroke/2,gap);assert.equal(c.housing.right-part.right-c.housing.stroke/2,gap);for(const p of part.left)assert(Math.abs(badgeGap(p)-gap)<1e-7);assert(!/NaN|Infinity/.test(part.d));}});
test('charge clipping rectangle encloses the whole curved window',()=>{const {mask,bounds}=turboWindowGeometry();assert.equal(bounds.y,12);assert.equal(bounds.height,36);assert.equal(bounds.x+bounds.width,252);for(const p of mask.left){assert(p.x>=bounds.x-1e-8);assert(p.x<=bounds.x+bounds.width);assert(p.y>=bounds.y-1e-8&&p.y<=bounds.y+bounds.height+1e-8);}});
