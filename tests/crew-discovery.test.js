import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CrewDiscovery,CREW_SAVE_KEY} from '../src/crew/CrewDiscovery.js';
import {crewConfig} from '../src/config/crewConfig.js';
import {rescueConfig} from '../src/config/rescueConfig.js';
const registry=crewConfig.characters;
function fixture(options={}){const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},d=new CrewDiscovery({storage,...options});for(const c of registry)d.setPosition(c.id,c.discovery.position);return {d,storage,values};}
test('eight crew start undiscovered with a close configurable radius',()=>{const {d}=fixture();assert.equal(d.records.size,8);assert.equal(d.count,0);assert.equal(d.rescuedCount,0);assert.equal(rescueConfig.discoveryRadius,2.5);assert.throws(()=>new CrewDiscovery({registry:[registry[0],registry[0]]}),/Invalid crew/);});
test('discovery pauses one encounter, closing starts towing, and only completion rescues',()=>{
 let blocked=true,panels=0,tows=0,returns=0;const {d,values}=fixture({blocked:()=>blocked,onDiscover:()=>panels++,onTow:()=>tows++,onRescued:()=>returns++}),p=registry[0].discovery.position;
 assert(!d.update(p));blocked=false;assert(!d.update({...p,x:p.x+3}));assert(!d.update({...p,y:p.y+5}));assert(d.update({...p,x:p.x+2}));assert(values.has(CREW_SAVE_KEY));assert.equal(panels,1);assert.equal(d.state('barnacles'),'discovered');assert(!d.update(registry[1].discovery.position));assert.equal(d.rescuedCount,0);
 assert(d.finish());assert(!d.finish());assert.equal(tows,1);assert.equal(returns,0);assert.equal(d.state('barnacles'),'towing');assert(!d.update(registry[1].discovery.position));assert(!d.complete('kwazii'));assert(d.complete('barnacles'));assert(!d.complete('barnacles'));assert.equal(returns,1);assert.equal(d.state('barnacles'),'rescued');assert(!d.update(p));
});
test('unfinished reload keeps discovery and resumes towing without replaying the panel',()=>{
 const {d,storage}=fixture();d.update(registry[0].discovery.position);d.finish();let panels=0,tows=0;const reloaded=fixture({storage,onDiscover:()=>panels++,onTow:()=>tows++}).d;
 assert.equal(reloaded.count,1);assert.equal(reloaded.rescuedCount,0);assert.equal(reloaded.active,null);assert.equal(reloaded.state('barnacles'),'discovered');assert(reloaded.update(registry[0].discovery.position));assert.equal(tows,1);assert.equal(panels,0);
});
test('version-1 automatic returns migrate as completed rescues and resetting cannot resurrect them',()=>{
 const {storage,values}=fixture();values.set(CREW_SAVE_KEY,JSON.stringify({version:1,unlocked:['barnacles','kwazii','peso','unknown']}));values.set('audio','keep');let resets=0;const {d}=fixture({storage,onReset:()=>resets++});assert.equal(d.rescuedCount,3);assert.equal(d.count,3);assert.equal(JSON.parse(values.get(CREW_SAVE_KEY)).version,2);assert(!d.isDiscovered('unknown'));assert(d.reset());assert.equal(resets,1);assert.equal(d.count,0);assert.equal(d.rescuedCount,0);assert.equal(new CrewDiscovery({storage}).count,0);assert.equal(values.get('audio'),'keep');
});
test('malformed/blocked storage is safe, default unlocked crew are rescued, and visual swaps keep progress',()=>{
 for(const raw of ['bad','null','{"version":2,"discovered":{}}'])assert.equal(new CrewDiscovery({storage:{getItem:()=>raw}}).count,0);
 const {d}=fixture({storage:{getItem(){throw Error();},setItem(){throw Error();}}});assert(d.update(registry[0].discovery.position));assert.equal(d.saved,false);d.finish();assert(d.complete('barnacles'));assert.equal(d.rescuedCount,1);assert.equal(d.reset(),false);
 const {storage,values}=fixture();values.set(CREW_SAVE_KEY,JSON.stringify({version:2,discovered:['barnacles'],rescued:['barnacles']}));const swapped=registry.map(c=>({...c,visual:{modelPath:'replacement.glb'}}));assert.equal(new CrewDiscovery({registry:swapped,storage}).rescuedCount,1);assert.equal(new CrewDiscovery({registry:[{...registry[0],startsUnlocked:true}]}).rescuedCount,1);
});
test('panel failure never auto-completes rescue and a failed tow remains retryable',t=>{
 t.mock.method(console,'warn',()=>{});const {d}=fixture({onDiscover(){throw Error('UI unavailable');},onTow:()=>false});assert(d.update(registry[0].discovery.position));assert.equal(d.pending,null);assert.equal(d.rescuedCount,0);assert.equal(d.active,null);assert(!d.update(registry[0].discovery.position));assert.equal(d.count,1);
});
