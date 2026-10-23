import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CollisionWorld} from '../src/collision/CollisionWorld.js';
import {hullFloor,hullFrame,sweepHull} from '../src/collision/collisionMath.js';
import {SurfaceGrid} from '../src/effects/interactionMath.js';
import {InteractionSurfaces,coralCores} from '../src/effects/InteractionSurfaces.js';
import {SubmarineController} from '../src/vehicles/SubmarineController.js';
import {vehicleById} from '../src/config/vehicleConfig.js';
import {heightAt} from '../src/environment/terrainMath.js';
import {ImpactSounds} from '../src/audio/ImpactSounds.js';
import {habitatLayout,habitatColliders,passageCenter} from '../src/environment/habitatLayout.js';

const flat=()=>-100;
function world(obstacles=[],ground=flat){const grid=new SurfaceGrid();for(const s of obstacles){s.solid=true;s.surface??='rock';s.angle??=0;s.radius=Math.max(s.rx,s.rz);grid.add(s);}return new CollisionWorld({grid,count:obstacles.length,solidCount:obstacles.length},ground);}
function body(id='gup-b'){const sub=new SubmarineController();sub.collisionProxy=vehicleById(id).collision;sub.movement=vehicleById(id).movement;return sub;}
function move(sub,w,a,b,speed=20){Object.assign(sub.previousPosition,a);Object.assign(sub.position,b);sub.speed=speed;w.resolve(sub,.05);return sub;}
const obstacle=()=>({x:0,y:10,z:0,rx:6,ry:6,rz:.06});

test('all GUPs sweep turbo travel through thin obstacles rather than tunnel',()=>{
 for(const id of ['gup-a','gup-b','gup-r']){const sub=body(id),w=world([obstacle()]);move(sub,w,{x:0,y:10,z:-20},{x:0,y:10,z:20},400);
  assert.ok(sub.position.z<-sub.collisionProxy.halfLength);assert.ok(w.contact.impact>300);assert.ok(sub.speed<=0);assert.ok(sub.speed>-20);
 }
});
test('sliding preserves tangential travel and uses normal impact speed',()=>{
 const s=body(),w=world([{x:0,y:10,z:0,rx:.05,ry:8,rz:20}]);s.heading=Math.PI/4;
 move(s,w,{x:-6,y:10,z:-6},{x:6,y:10,z:6},20);
 assert.ok(s.position.x<0);assert.ok(s.position.z>3);assert.ok(w.contact.impact<20);assert.ok(w.contact.impact>8);assert.ok(Math.abs(s.collisionDrift.z)>1);
 const hit={};assert.equal(sweepHull(s.position,0,0,0,w.near[0],hullFrame(s,{}),2.2,1.1,0,hit),false);
});
test('parallel glancing movement causes no repeated impact',()=>{
 const s=body(),w=world([{x:0,y:10,z:0,rx:.05,ry:8,rz:20}]);
 move(s,w,{x:-2.3,y:10,z:-2},{x:-2.3,y:10,z:2},20);
 assert.equal(s.collisionContact,null);assert.equal(s.position.z,2);
});
test('overlapping starts recover without NaNs and backing away is allowed',()=>{
 const s=body(),w=world([{x:0,y:10,z:0,rx:3,ry:3,rz:3}]);
 move(s,w,{x:0,y:10,z:0},{x:0,y:10,z:0},0);
 for(let i=0;i<6;i++)move(s,w,{...s.position},{...s.position},0);
 assert.ok(Number.isFinite(s.position.z));const frame=hullFrame(s,{}),hit={};
 for(let i=-1;i<=1;i++)assert.equal(sweepHull(s.position,0,0,0,w.near[0],frame,s.collisionProxy.radius,s.collisionProxy.halfHeight,(s.collisionProxy.halfLength-s.collisionProxy.radius)*i,hit,s.collisionProxy.centerY),false);
 const a={...s.position},b={x:a.x*1.5,y:10+(a.y-10)*1.5,z:a.z*1.5};move(s,w,a,b,0);assert.ok(Math.hypot(s.position.x,s.position.y-10,s.position.z)>Math.hypot(a.x,a.y-10,a.z));
});
test('hull shape follows heading, pitch and bank without changing the static grid',()=>{
 const s=body('gup-a'),f=hullFrame(s,{}),w=world([obstacle()]),cells=w.grid.cells;
 assert.equal(f.zz,1);s.heading=Math.PI/2;s.pitch=.3;s.bank=.2;hullFrame(s,f);
 assert.ok(f.zx>.9);assert.ok(f.zy<0);assert.ok(Math.abs(f.xy)>.1);
 s.collisionProxy=vehicleById('gup-r').collision;assert.equal(w.grid.cells,cells);
});
test('each GUP survives high downward speed and uneven seabed without sinking',()=>{
 for(const id of ['gup-a','gup-b','gup-r']){const s=body(id),ground=(x,z)=>.15*x+.1*z,w=world([],ground);
  s.vertical=-100;move(s,w,{x:0,y:15,z:0},{x:2,y:-5,z:2},0);
  assert.ok(s.position.y>=hullFloor(s,s.position.x,s.position.z,ground)-.01);assert.ok(s.vertical>-5);assert.equal(s.collisionContact.surface,'sand');assert.ok(s.collisionContact.impact>90);
  s.collisionWorld=world([],heightAt);s.position={x:17,y:12,z:23};
  for(let i=0;i<600;i++)s.update(1/60,{thrust:1,turn:.1,rise:-1});
  assert.ok(s.position.y>=hullFloor(s)-1e-7);assert.ok(Math.abs(s.vertical)<6);
 }
});
test('terrain sweep sees a ridge between otherwise clear endpoints',()=>{
 const s=body(),w=world([],(x,z)=>z>-.5&&z<.5?4:0);
 move(s,w,{x:0,y:3,z:-7},{x:0,y:3,z:7},100);
 assert.ok(s.position.z<0||s.position.y>=5.7-.01);
});
test('cluster coral count is bounded by templates, not branches or instances',()=>{
 const sources=JSON.parse(fs.readFileSync(new URL('../assets/models/reef-formations/interactions.json',import.meta.url)));
 for(const data of Object.values(sources)){const cores=coralCores(data,4);assert.ok(cores.length>0&&cores.length<=4);assert.ok(cores.every(c=>!c.branch&&c.radius>=.75));}
 const habitat={layout:[{type:'large',index:0,x:0,y:0,z:0,scale:1,angle:0}],colliders:[]};
 const surfaces=new InteractionSurfaces(habitat,{layout:{records:[]}},sources);
 assert.ok(surfaces.solidCount<=4);assert.equal(surfaces.count,surfaces.solidCount);assert.equal(surfaces.grid,surfaces.rockGrid);
 const decoration=new InteractionSurfaces(null,{layout:{records:[{kind:'rock0',x:0,y:0,z:0,scale:.1,angle:0}]},surfaceBounds:new Map([['rock0',{y:1,rx:1,ry:1,rz:1,radius:1,surface:'rock'}]])},{});
 assert.equal(decoration.solidCount,0);
});
test('compound proxies preserve a navigable gap rather than enclosing empty water',()=>{
 for(const id of ['gup-a','gup-b','gup-r']){const s=body(id),w=world([{x:-5,y:10,z:0,rx:1,ry:5,rz:6},{x:5,y:10,z:0,rx:1,ry:5,rz:6}]);
  move(s,w,{x:0,y:10,z:-12},{x:0,y:10,z:12},40);assert.equal(s.position.z,12);assert.equal(s.collisionContact,null);
 }
});
test('the authored reef channel remains open with the new coral cores for every GUP',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../assets/models/reef-formations/manifest.json',import.meta.url))),sources=JSON.parse(fs.readFileSync(new URL('../assets/models/reef-formations/interactions.json',import.meta.url)));
 const layout=habitatLayout(manifest),surfaces=new InteractionSurfaces({layout,colliders:habitatColliders(layout,manifest)},{layout:{records:[]}},sources);
 const w=new CollisionWorld(surfaces);
 for(const id of ['gup-a','gup-b','gup-r'])for(let z=-8;z<134;z+=2)for(const rise of [2.5,8]){
  const s=body(id),x=passageCenter(z),next=passageCenter(z+.2);s.heading=Math.atan2(next-x,.2);
  move(s,w,{x,y:heightAt(x,z)+rise,z},{x:next,y:heightAt(next,z+.2)+rise,z:z+.2},12);
  assert.ok(!s.collisionContact||s.collisionContact.surface==='sand',`${id} channel blocked at ${z}`);
 }
});
test('distant scenery does not increase nearby candidate count',()=>{
 const obstacles=[obstacle()];for(let i=0;i<10000;i++)obstacles.push({x:100+i%100*10,y:10,z:100+Math.floor(i/100)*10,rx:1,ry:1,rz:1});
 const w=world(obstacles),s=body();move(s,w,{x:0,y:10,z:-6},{x:0,y:10,z:-5});assert.equal(w.metrics.candidates,1);assert.ok(w.metrics.tests<=24);
});
test('actual Octopod hub and supports block all GUPs and allow retreat',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../assets/models/octopod-collision.json',import.meta.url)));
 const solids=data.colliders.map(c=>({x:180+c.center[0],y:c.center[1],z:100+c.center[2],rx:c.radii[0],ry:c.radii[1],rz:c.radii[2],surface:'octopod'}));
 for(const id of ['gup-a','gup-b','gup-r']){
  const s=body(id),w=world(solids,heightAt);s.heading=Math.PI;
  move(s,w,{x:180,y:17.5,z:140},{x:180,y:17.5,z:60},100);
  assert.ok(s.position.z>110,`${id} crossed hub`);s.collisionWorld=w;
  const z=s.position.z;for(let i=0;i<120;i++)s.update(1/60,{thrust:-1,turn:0,rise:0});assert.ok(s.position.z>z+2);
 }
 // Low supports must resolve out of solid geometry without burying the hull.
 for(let x=-6;x<=6;x+=3)for(let z=-6;z<=6;z+=3){const s=body(),w=world(solids,heightAt);s.collisionWorld=w;s.position={x:180+x,y:1.7,z:100+z};
  for(let i=0;i<20;i++)s.update(1/60,{thrust:0,turn:0,rise:0});assert.ok(s.position.y>=hullFloor(s)-1e-7);
  const f=hullFrame(s,{}),hit={};let penetrations=0;for(const solid of w.near)for(let lobe=-1;lobe<=1;lobe++)if(sweepHull(s.position,0,0,0,solid,f,s.collisionProxy.radius,s.collisionProxy.halfHeight,(s.collisionProxy.halfLength-s.collisionProxy.radius)*lobe,hit,s.collisionProxy.centerY)&&hit.depth>.04)penetrations++;
  assert.equal(penetrations,0,`support trap at ${x},${z}`);
 }
});
test('sustained turbo pushing does not re-arm impact effects every frame',()=>{
 const s=body('gup-r'),w=world([{...obstacle(),y:10.55,ry:100}],heightAt);s.collisionWorld=w;s.position={x:0,y:10,z:-8};s.turbo.charge=100;
 let fresh=0,contacts=0;
 for(let i=0;i<180;i++){s.update(1/30,{thrust:1,turn:0,rise:0,boost:true});if(s.collisionContact?.surface==='rock'){contacts++;if(s.collisionContact.fresh)fresh++;}}
 assert.ok(contacts>100);assert.ok(fresh<=2,`rearmed ${fresh} times`);
});
test('collision sounds require normal impact, scale gain, and cap cooldown/voices',()=>{
 const sources=[],gains=[],master={};const context={currentTime:0,createBufferSource(){const s={connect(){},disconnect(){},start(){},stop(){}};sources.push(s);return s;},createGain(){const gain={gain:{value:0},connect(bus){assert.equal(bus,master);},disconnect(){}};gains.push(gain);return gain;}};
 const audio=new ImpactSounds(context,master,{});
 assert.equal(audio.play({surface:'rock',impact:1}),false);assert.equal(audio.play({surface:'rock',impact:3}),true);const low=gains[0].gain.value;
 assert.equal(audio.play({surface:'rock',impact:13}),false);context.currentTime=1;
 assert.equal(audio.play({surface:'rock',impact:13}),true);assert.ok(gains[1].gain.value>low);context.currentTime=2;assert.equal(audio.play({surface:'rock',impact:13}),false);
 sources[0].onended();assert.equal(audio.play({surface:'coral',impact:13}),true);audio.suspend();assert.equal(audio.voices.size,0);
});
