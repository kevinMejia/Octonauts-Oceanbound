import test from 'node:test';
import assert from 'node:assert/strict';
import {dolphinSceneryLayout} from '../src/missions/dolphinSceneryLayout.js';
import {dolphinRescueConfig as c} from '../src/config/dolphinRescueConfig.js';
import {DolphinRescueState} from '../src/missions/dolphinRescueMath.js';
const bounds=new Map(c.environment.scenery.kinds.map(kind=>[kind,{minY:-.2,maxY:7,radius:3}]));
test('reef placements are deterministic, bounded, and below the full dolphin route',()=>{
 for(const quality of ['low','high']){
  const records=dolphinSceneryLayout(bounds,quality);assert.deepEqual(records,dolphinSceneryLayout(bounds,quality));
  assert(records.length>200);assert(records.filter(r=>r.solid).length<10);
  const minDolphinY=c.route.depth-.14-c.escort.radius;
  for(const r of records){assert(r.top<=c.environment.scenery.maxHeight);assert(r.top<minDolphinY-4);assert(Math.abs(r.x)-r.radius>c.escort.halfWidth);}
  assert(records.filter(r=>!r.solid).every(r=>Math.abs(r.x)>=c.environment.scenery.edgeMin));
 }
});
test('all three unchanged dolphins finish above scenery through the whole mission',()=>{
 const state=new DolphinRescueState(),reef=dolphinSceneryLayout(bounds);
 for(let i=0;i<151*60&&state.status==='running';i++){
  for(const o of state.obstacles)if(o.active)o.x=8;
  state.update(1/60,Math.sin(i/60)*20);
  for(const d of state.dolphins)for(const r of reef)if(Math.abs(d.z-r.z)<r.radius+c.escort.radius)assert(d.y-c.escort.radius>r.top);
 }
 assert.equal(state.status,'complete');assert.equal(state.dolphins.length,3);assert.equal(state.strikes,0);
});
