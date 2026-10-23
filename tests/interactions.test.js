import test from 'node:test';
import assert from 'node:assert/strict';
import {sandResponse,SurfaceGrid,sweepSurface,ParticlePool,stepParticle} from '../src/effects/interactionMath.js';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';
import {heightAt} from '../src/environment/terrainMath.js';
import fs from 'node:fs';
test('sand emission requires movement and proximity; impacts scale separately',()=>{
 assert.equal(sandResponse(5,12,false).rate,0);assert.equal(sandResponse(0,.4,true).rate,0);
 assert.ok(sandResponse(.2,12,false).rate>sandResponse(2,12,false).rate);
 assert.ok(sandResponse(0,12,true).rate>sandResponse(0,12,false).rate);
 assert.ok(sandResponse(0,0,true,5).burst>sandResponse(0,0,true,.5).burst);
});
test('floor contact telemetry uses actual three-point hull constraint on dunes',()=>{
 const s=new SubmarineController();s.position={x:17,y:heightAt(17,23)+2,z:23};s.heading=.7;
 for(let i=0;i<120;i++)s.update(1/60,{thrust:0,turn:0,rise:-1,boost:false});
 assert.equal(s.floorContact.touching,true);assert.equal(s.floorContact.clearance,0);
 assert.ok(s.floorContact.impact>0);assert.ok(s.position.y>=heightAt(17,23)+1.7);
});
test('surface grid finds overlapping adjacent-cell proxies without world scans',()=>{
 const g=new SurfaceGrid();const coral={x:8.2,y:3,z:0,radius:1,surface:'coral'};g.add(coral);g.add({x:500,y:0,z:500,radius:1});const out=[];
 assert.deepEqual(g.query(7,0,2,out),[coral]);assert.equal(g.query(-100,0,2,out).length,0);
 assert.equal(sweepSurface({x:0,y:3,z:0},{x:15,y:3,z:0},coral),true);
 assert.equal(sweepSurface({x:0,y:12,z:0},{x:15,y:12,z:0},coral),false);
});
test('pools have hard caps and recycle expired slots',()=>{
 const pool=new ParticlePool(2);const a=pool.spawn();a.life=1;const b=pool.spawn();b.life=1;assert.equal(pool.spawn(),null);
 stepParticle(a,2,2,()=>0);assert.equal(a.life,0);assert.equal(pool.spawn(),a);assert.equal(pool.items.length,2);
});
test('underwater fragments drag, sink and settle above uneven terrain',()=>{
 const p={life:10,age:0,x:0,y:3,z:0,vx:2,vy:0,vz:0,angle:0,spin:1,seed:0,settled:false};
 for(let i=0;i<500;i++)stepParticle(p,.016,i*.016,x=>1+x*.1);
 assert.equal(p.settled,true);assert.ok(p.y>=1+p.x*.1);assert.ok(p.x<2);
});
test('clouds spread with drag, respect terrain and expire',()=>{
 const p={life:4,age:0,x:0,y:.1,z:0,vx:2,vy:.1,vz:0,angle:0,spin:.1,seed:0,settled:false};
 for(let i=0;i<200;i++)stepParticle(p,.016,i*.016,()=>.5,true);
 assert.ok(p.y>=.62);assert.ok(p.x>0&&p.x<3);stepParticle(p,1,5,()=>.5,true);assert.equal(p.life,0);
});
test('authored coral proxies preserve geometry type and linear color metadata',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../assets/models/reef-formations/interactions.json',import.meta.url)));
 for(const kind of ['large','garden','patch','wall']){assert.ok(data[kind].some(p=>p.branch&&p.surface==='coral'));assert.ok(data[kind].some(p=>p.surface==='vegetation'));for(const p of data[kind]){assert.ok(p.radius>0&&p.radius<5);assert.ok(p.color.every(c=>c>=0&&c<=1));}}
});
