import test from 'node:test';
import assert from 'node:assert/strict';
import {VehicleUnlocks,UNLOCK_KEY} from '../src/vehicles/VehicleUnlocks.js';
import {vehicles} from '../src/config/vehicleConfig.js';
import {octopodConfig as base} from '../src/config/octopodConfig.js';
const home={...base.position,y:base.position.y+base.finalRewardHeight};
const away={...home,z:home.z+base.finalRewardRadius+1};
function fixture(){const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},u=new VehicleUnlocks(vehicles,storage);return {u,storage};}
function findOthers(u){for(const v of vehicles)if(!v.finalReward)u.unlock(v.id);}
test('final vehicle waits for every other earned GUP and return to base, then notifies once',()=>{
 const {u}=fixture(),events=[];u.subscribe(id=>events.push(id));
 assert.equal(u.checkFinal(home),false);findOthers(u);assert(!u.isUnlocked('gup-x'));assert(!events.includes('gup-x'));
 assert.equal(u.checkFinal(away),false);assert.equal(u.checkFinal(home),true);assert(u.isUnlocked('gup-x'));
 for(let i=0;i<5;i++){assert.equal(u.checkFinal(home),false);assert.equal(u.checkFinal(away),false);}
 assert.equal(events.filter(id=>id==='gup-x').length,1);
});
test('pending return survives reload without premature reward; earned saves stay earned',()=>{
 const {u,storage}=fixture();findOthers(u);const reload=new VehicleUnlocks(vehicles,storage);
 assert(!reload.isUnlocked('gup-x'));assert.equal(reload.checkFinal(away),false);assert.equal(reload.checkFinal(home),true);
 const earned=new VehicleUnlocks(vehicles,storage);assert(earned.isUnlocked('gup-x'));assert.equal(earned.checkFinal(home),false);
});
test('old all-found saves wait for base and old GUP-X saves retain access',()=>{
 const {storage}=fixture();storage.setItem(UNLOCK_KEY,JSON.stringify({unlocked:vehicles.filter(v=>!v.finalReward).map(v=>v.id)}));
 const u=new VehicleUnlocks(vehicles,storage);assert(!u.ids.has('gup-x'));assert(u.checkFinal(home));
 storage.setItem(UNLOCK_KEY,JSON.stringify({unlocked:['gup-x']}));assert(new VehicleUnlocks(vehicles,storage).isUnlocked('gup-x'));
});
test('settings overrides do not count as found progress; reset clears pending eligibility',()=>{
 const {u}=fixture();for(const v of vehicles)if(!v.finalReward)u.setOverride(v.id,true);
 assert.equal(u.checkFinal(home),false);u.setOverride('gup-x',true);assert(u.isUnlocked('gup-x'));assert(!u.ids.has('gup-x'));u.setOverride('gup-x',false);
 findOthers(u);u.reset();assert.equal(u.checkFinal(home),false);assert(!u.isUnlocked('gup-x'));
});
test('return volume includes ground and docking heights but excludes high flyovers and malformed poses',()=>{
 for(const p of [undefined,{}, {...home,x:NaN},{...home,y:Infinity},{...home,y:home.y+base.finalRewardHeightRange+1},away]){const {u}=fixture();findOthers(u);assert.equal(u.checkFinal(p),false);}
 for(const p of [{...home,y:base.position.y+1},home,{...home,x:home.x+base.finalRewardRadius}]){const {u}=fixture();findOthers(u);assert.equal(u.checkFinal(p),true);}
});
test('blocked storage still awards once for this dive on return',()=>{
 const u=new VehicleUnlocks(vehicles,{getItem(){throw Error();},setItem(){throw Error();}});findOthers(u);assert(!u.isUnlocked('gup-x'));assert(u.checkFinal(home));assert.equal(u.saved,false);assert.equal(u.checkFinal(home),false);
});

test('finding GUP-A last still requires moving back to the Octopod clearing',()=>{
 const {u}=fixture();for(const v of vehicles)if(!v.finalReward&&v.id!=='gup-a')u.unlock(v.id);
 u.unlock('gup-a');const offset=vehicles.find(v=>v.id==='gup-a').discovery.spawn.offset;
 assert.equal(u.checkFinal({x:home.x+offset[0],y:2,z:home.z+offset[2]}),false);
 assert(!u.isUnlocked('gup-x'));assert.equal(u.checkFinal({...home,z:home.z+38}),true);
});
