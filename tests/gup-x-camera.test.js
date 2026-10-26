import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {ChaseCamera} from './fixtures/loadChaseCamera.js';
import {CameraObstacles} from '../src/camera/CameraObstacles.js';
import {terrainArmHeight} from '../src/camera/groundCameraMath.js';
import {terrainEntry} from '../src/camera/cameraMath.js';
import {cameraConfig as c,gupXCamera as g} from '../src/config/cameraConfig.js';
import {vehicleById,vehicles} from '../src/config/vehicleConfig.js';
import {heightAt} from '../src/environment/terrainMath.js';
import {hullFloor,hullFrame} from '../src/collision/collisionMath.js';
const definition=vehicleById('gup-x'),flat=()=>0;
const input=()=>({orbit:{x:0,y:0,last:1e9},drag:false});
function state(ground=flat,x=0,z=0,heading=0){
 const s={position:{x,y:0,z},heading,speed:0,steer:0,pitch:0,bank:0,collisionProxy:definition.collision,floorContact:{touching:true}};
 align(s,ground);return s;
}
function align(s,h){
 const p=s.position,sy=Math.sin(s.heading),cy=Math.cos(s.heading),l=2.7,r=1.8;
 s.pitch=-Math.atan2(h(p.x+sy*l,p.z+cy*l)-h(p.x-sy*l,p.z-cy*l),2*l);
 s.bank=Math.atan2(h(p.x+cy*r,p.z-sy*r)-h(p.x-cy*r,p.z+sy*r),2*r);
 p.y=hullFloor(s,p.x,p.z,h);
}
function setup(ground=flat,aspect=16/9,solids=[]){
 const camera=new T.PerspectiveCamera(65,aspect,.1,1500);
 const obstacles=new CameraObstacles({grid:{query(x,z,r,out){out.length=0;out.push(...solids);}}});
 const chase=new ChaseCamera(camera,obstacles,ground);chase.profile=definition.camera;
 return {camera,chase,input:input()};
}
function visible(camera,s,label='hull'){
 camera.updateMatrixWorld();const f=hullFrame(s,{}),p=s.position,b=s.collisionProxy;
 for(const x of [-b.radius,b.radius])for(const y of [b.centerY-b.halfHeight,b.centerY+b.halfHeight])for(const z of [-b.halfLength,b.halfLength]){
  const v=new T.Vector3(p.x+x*f.xx+y*f.yx+z*f.zx,p.y+x*f.xy+y*f.yy+z*f.zy,p.z+x*f.xz+y*f.yz+z*f.zz).project(camera);
  assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z>-1&&v.z<1,`${label}: projected hull ${v.toArray()}`);
 }
}
function clear(chase,h,label='terrain'){
 const a=chase.pivot,b=chase.camera.position;
 for(let i=1;i<=150;i++){const t=i/150,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;
  assert.ok(y>=h(x,z)+g.terrainClearance-.025,`${label}: arm buried at ${t}`);
 }
}
function aheadReadable(camera,s,h,label='terrain ahead'){
 camera.updateMatrixWorld();const eye=camera.position,p=s.position;
 for(const d of [2,3.5,5,10])for(const side of d>=5?[-.75,0,.75]:[0]){
  const target=new T.Vector3(p.x+Math.sin(s.heading)*d+Math.cos(s.heading)*side,0,p.z+Math.cos(s.heading)*d-Math.sin(s.heading)*side);target.y=h(target.x,target.z)+.2;
  const projected=target.clone().project(camera);
  assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,`${label}: forward ground outside view at ${d}m`);
  for(let i=1;i<200;i++){const t=i/200,x=eye.x+(target.x-eye.x)*t,z=eye.z+(target.z-eye.z)*t,y=eye.y+(target.y-eye.y)*t;
   assert.ok(y>=h(x,z)+.025,`${label}: forward ground occluded at ${d}m, ray ${t}, clearance ${y-h(x,z)}`);
  }
 }
}
test('only GUP-X opts into the ground profile; heading/world-up ignores pitch and roll',()=>{
 assert.deepEqual(vehicles.filter(v=>v.camera?.ground).map(v=>v.id),['gup-x']);
 const a=setup(),b=setup(),s=state();a.chase.update(1/60,s,a.input);
 s.pitch=1.1;s.bank=-.9;b.chase.update(1/60,s,b.input);
 assert.deepEqual(a.camera.position.toArray(),b.camera.position.toArray());assert.deepEqual(a.camera.quaternion.toArray(),b.camera.quaternion.toArray());
 const right=new T.Vector3(1,0,0).applyQuaternion(a.camera.quaternion);assert.ok(Math.abs(right.y)<1e-10);
});
test('gentle and 40 degree uphill/downhill retain arm length, hull visibility and terrain clearance',()=>{
 for(const degrees of [10,40])for(const direction of [-1,1])for(const aspect of [16/9,844/390,375/667]){
  const h=(x,z)=>z*Math.tan(degrees*Math.PI/180),s=state(h,0,0,direction<0?Math.PI:0),v=setup(h,aspect);
  v.chase.update(1/60,s,v.input);clear(v.chase,h);visible(v.camera,s);
  assert.ok(Math.hypot(v.camera.position.x-s.position.x,v.camera.position.z-s.position.z)>23);
  assert.ok(v.chase.target.y>=s.position.y+.5&&v.chase.target.y<=s.position.y+3.1);
 }
});
test('actual 36 degree downhill regression no longer collapses a 24.9m arm to 1.7m',()=>{
 for(const heading of [2.1663852594,2.1663852594+Math.PI]){
  const s=state(heightAt,132,132,heading),v=setup(heightAt);v.chase.update(1/60,s,v.input);
  clear(v.chase,heightAt);visible(v.camera,s);assert.ok(v.camera.position.distanceTo(v.chase.pivot)>23);
  assert.equal(terrainEntry(v.chase.pivot,v.camera.position,heightAt,c),1);
 }
 const s=state(heightAt,136,127,Math.atan2(heightAt(136.1,127)-heightAt(135.9,127),heightAt(136,127.1)-heightAt(136,126.9))),v=setup(heightAt);
 v.chase.update(1/60,s,v.input);clear(v.chase,heightAt);visible(v.camera,s);
});
test('actual curved downhill terrain ahead remains readable, including after follow smoothing and solid clipping',()=>{
 for(const heading of [2.1663852594,Math.PI/2,Math.PI*.75])for(const aspect of [16/9,844/390,375/667]){
  const s=state(heightAt,132,132,heading),v=setup(heightAt,aspect);v.chase.update(0,s,v.input);
  aheadReadable(v.camera,s,heightAt);visible(v.camera,s);clear(v.chase,heightAt);
  assert.ok(Math.abs(Math.asin(v.camera.getWorldDirection(new T.Vector3()).y))<50*Math.PI/180);
  for(let i=0;i<120;i++){
   s.speed=4;s.heading+=.001;s.steer=.15;s.position.x+=Math.sin(s.heading)*s.speed/60;s.position.z+=Math.cos(s.heading)*s.speed/60;align(s,heightAt);
   v.chase.update(1/60,s,v.input);aheadReadable(v.camera,s,heightAt);visible(v.camera,s);clear(v.chase,heightAt);
  }
 }
 const s=state(heightAt,132,132,2.1663852594),sy=Math.sin(s.heading),cy=Math.cos(s.heading),x=s.position.x-sy*14,z=s.position.z-cy*14;
 const rock={x,y:heightAt(x,z)+5,z,rx:5,ry:10,rz:5,solid:true},v=setup(heightAt,16/9,[rock]);
 v.chase.update(1/60,s,v.input);clear(v.chase,heightAt);visible(v.camera,s);aheadReadable(v.camera,s,heightAt);
 assert.equal(v.chase.obstacles.limit(v.chase.pivot,v.camera.position,c,false),1);
});
test('terrain height solver catches an intervening hill and has a fixed sample budget',()=>{
 const a={x:0,y:2,z:0},b={x:0,y:3,z:24};let calls=0;
 const h=(x,z)=>{calls++;return 8*Math.exp(-(((z-12)/2)**2));};
 b.y=terrainArmHeight(a,b,h,g);assert.ok(b.y>15);assert.ok(calls<=g.maxTerrainSamples);
 for(let i=1;i<=240;i++){const t=i/240;assert.ok(a.y+(b.y-a.y)*t>=h(0,b.z*t)+g.terrainClearance-.03);}
});
test('sharp crests and deep valleys remain clear and framed without arm collapse or oscillation at rest',()=>{
 for(const sign of [-1,1]){
  const h=(x,z)=>sign*.8*Math.abs(z),s=state(h,0,-30),v=setup(h);let last=null,maxMove=0,maxTurn=0;
  for(let i=0;i<=480;i++){
   s.position.z=-30+i/8;s.speed=7.5;align(s,h);v.chase.update(1/60,s,v.input);clear(v.chase,h);visible(v.camera,s);
   assert.ok(Math.hypot(v.camera.position.x-s.position.x,v.camera.position.z-s.position.z)>21);
   if(last){maxMove=Math.max(maxMove,v.camera.position.distanceTo(last.position));maxTurn=Math.max(maxTurn,v.camera.quaternion.angleTo(last.rotation));}
   last={position:v.camera.position.clone(),rotation:v.camera.quaternion.clone()};
  }
  assert.ok(maxMove<.8,`height change ${maxMove}`);assert.ok(maxTurn<.06,`rotation change ${maxTurn}`);
  s.speed=0;let priorY=v.camera.position.y,direction=0,reversals=0,lastDelta=0;
  for(let i=0;i<180;i++){v.chase.update(1/60,s,v.input);const delta=v.camera.position.y-priorY;
   if(Math.abs(delta)>.0001){const next=Math.sign(delta);if(direction&&next!==direction)reversals++;direction=next;}
   priorY=v.camera.position.y;lastDelta=delta;
  }
  assert.ok(reversals<=1,`resting oscillations ${reversals}`);assert.ok(Math.abs(lastDelta)<.001);
 }
});
test('turbo crests and valleys retain bounded motion at 20/30/60Hz without an overhead visibility swing',()=>{
 for(const hz of [20,30,60])for(const sign of [-1,1]){
  const h=(x,z)=>sign*.8*Math.abs(z),s=state(h,0,-30),v=setup(h,375/667);let last=null,maxY=0,maxAngle=0;
  for(let i=0;i<=Math.ceil(60/27.36*hz);i++){
   s.position.z=-30+i*27.36/hz;s.speed=27.36;align(s,h);v.chase.update(1/hz,s,v.input);clear(v.chase,h);visible(v.camera,s);
   if(last){maxY=Math.max(maxY,Math.abs(v.camera.position.y-last.position.y));maxAngle=Math.max(maxAngle,v.camera.quaternion.angleTo(last.rotation));}
   last={position:v.camera.position.clone(),rotation:v.camera.quaternion.clone()};
  }
  assert.ok(maxY<1+1.15*27.36/hz,`${hz}Hz turbo height step ${maxY}`);
  assert.ok(maxAngle<1.8/hz,`${hz}Hz turbo rotation step ${maxAngle}`);
 }
});
test('stop/reverse and steering on slopes have bounded prediction and no camera-side flip',()=>{
 const h=(x,z)=>z*.7,s=state(h),v=setup(h);
 for(let i=0;i<360;i++){
  s.speed=i<120?14:i<240?-4.8:0;s.steer=i<240?.7:1;s.heading+=i<240?.003:0;
  s.position.x+=Math.sin(s.heading)*s.speed/60;s.position.z+=Math.cos(s.heading)*s.speed/60;align(s,h);
  v.chase.update(1/60,s,v.input);clear(v.chase,h);visible(v.camera,s);
  assert.ok((v.camera.position.x-s.position.x)*Math.sin(s.heading)+(v.camera.position.z-s.position.z)*Math.cos(s.heading)<-18);
  assert.ok(Math.abs(v.chase.groundSteer)<=g.steerLookAhead);
 }
 assert.ok(Math.abs(v.chase.groundSteer)<.001);
});
test('synthetic airborne arc and uneven landing keep actual hull framed without support-height target jumps',()=>{
 const h=(x,z)=>.15*z+.3*Math.sin(z),s=state(h),v=setup(h);let last=null,maxTurn=0;
 for(let i=0;i<300;i++){
  const t=i/60;s.position.z=t*8;align(s,h);const air=t>1&&t<3?5*Math.sin((t-1)*Math.PI/2):0;
  s.position.y+=air;s.floorContact.touching=air===0;s.speed=8;v.chase.update(1/60,s,v.input);clear(v.chase,h);visible(v.camera,s);
  assert.ok(v.chase.target.y-s.position.y>=g.lookHeight-.55&&v.chase.target.y-s.position.y<=g.lookHeight+1.4);
  if(last)maxTurn=Math.max(maxTurn,last.angleTo(v.camera.quaternion));last=v.camera.quaternion.clone();
 }
 assert.ok(maxTurn<.04,`airborne rotation ${maxTurn}`);
});
test('manual orbit is retained during slope changes and recenter returns smoothly to follow',()=>{
 const h=(x,z)=>z*.7,s=state(h),v=setup(h);v.input.drag=true;v.input.orbit.x=1.3;v.input.orbit.y=-.2;
 for(let i=0;i<120;i++){s.position.z+=.1;align(s,h);v.chase.update(1/60,s,v.input);clear(v.chase,h);visible(v.camera,s);}
 assert.equal(v.input.orbit.x,1.3);assert.equal(v.input.orbit.y,-.2);
 v.input.drag=false;v.input.orbit.last=performance.now()/1000;
 v.chase.update(.1,s,v.input);assert.equal(v.input.orbit.x,1.3);
 v.input.orbit.last=-100;let last=1.3;
 for(let i=0;i<180;i++){v.chase.update(1/60,s,v.input);assert.ok(v.input.orbit.x<=last&&v.input.orbit.x>=0);last=v.input.orbit.x;clear(v.chase,h);visible(v.camera,s);}
 assert.equal(v.input.orbit.x,0);assert.equal(v.input.orbit.y,0);
});
test('moving slope/turn trajectory is comparable at 30, 60 and 120Hz; zero dt is stable',()=>{
 const h=(x,z)=>.55*z+2*Math.sin(z/8);
 const run=hz=>{const s=state(h),v=setup(h);v.chase.update(0,s,v.input);
  for(let i=1;i<=4*hz;i++){const t=i/hz;s.heading=.25*Math.sin(t);s.position.x=3*Math.sin(t*.5);s.position.z=t*8;s.speed=8;s.steer=.25*Math.cos(t);align(s,h);v.chase.update(1/hz,s,v.input);}
  return v;
 };
 const a=run(30),b=run(60),d=run(120);
 for(const v of [a,b]){assert.ok(v.camera.position.distanceTo(d.camera.position)<.2);assert.ok(v.camera.quaternion.angleTo(d.camera.quaternion)<.015);}
 const s=state(h),v=setup(h);v.chase.update(0,s,v.input);const p=v.camera.position.toArray();v.chase.update(0,s,v.input);assert.deepEqual(v.camera.position.toArray(),p);
});
test('mixed frame times remain finite and close to the fixed-rate slope trajectory',()=>{
 const h=(x,z)=>.6*z+Math.sin(z/4),run=variable=>{
  const s=state(h),v=setup(h);v.chase.update(0,s,v.input);let t=0,i=0;
  while(t<4){const dt=Math.min(4-t,variable?[1/20,1/120,1/30,1/60][i++%4]:1/120);t+=dt;
   s.position.z=t*10;s.position.x=Math.sin(t);s.heading=.15*Math.sin(t);s.speed=10;align(s,h);
   v.chase.update(dt,s,v.input);clear(v.chase,h);visible(v.camera,s);
  }return v;
 };
 const fixed=run(false),mixed=run(true);assert.ok(fixed.camera.position.distanceTo(mixed.camera.position)<.25);
 assert.ok(fixed.camera.quaternion.angleTo(mixed.camera.quaternion)<.02);
});
test('saved offset extremes keep the hull framed; speed distance is bounded and terrain work is capped per frame',()=>{
 const saved={distance:c.distance,height:c.height};
 try{
  for(const distance of [6,40])for(const height of [1,20])for(const direction of [-1,1]){
   c.distance=distance;c.height=height;const h=(x,z)=>.8*z,s=state(h,0,0,direction<0?Math.PI:0),v=setup(h,375/667);
   v.chase.update(1/60,s,v.input);clear(v.chase,h);visible(v.camera,s);
  }
  c.distance=40;c.height=20;let calls=0;
  const h=(x,z)=>{calls++;return heightAt(x,z);},s=state(h,132,132,2.1663852594),v=setup(h,375/667);
  s.speed=27.36;calls=0;v.chase.update(1/60,s,v.input);
  assert.ok(calls<=3*g.maxTerrainSamples+4*g.maxTerrainViewSamples+5,`frame terrain calls ${calls}`);
  const sy=Math.sin(s.heading),cy=Math.cos(s.heading),x=s.position.x-sy*14,z=s.position.z-cy*14;
  const constrained=setup(h,375/667,[{x,y:heightAt(x,z)+10,z,rx:5,ry:20,rz:5,solid:true}]);
  calls=0;constrained.chase.update(1/60,s,constrained.input);
  assert.ok(calls<=4*g.maxTerrainSamples+6*g.maxTerrainViewSamples+5,`solid-constrained frame terrain calls ${calls}`);
 }finally{Object.assign(c,saved);}
 const a=setup(),b=setup(),s=state();a.chase.update(0,s,a.input);s.speed=100;b.chase.update(0,s,b.input);
 const distance=v=>Math.hypot(v.camera.position.x,v.camera.position.z);
 assert.ok(Math.abs(distance(b)/distance(a)-(1+g.speedDistanceIncrease))<1e-12);
});
test('solid structures still contract the ground camera and recover after clearance',()=>{
 const rock={x:0,y:5,z:-16,rx:9,ry:9,rz:2,solid:true},solids=[rock],v=setup(flat,16/9,solids),s=state();
 v.chase.update(1/60,s,v.input);assert.ok(v.camera.position.distanceTo(v.chase.pivot)<20);visible(v.camera,s);
 solids.length=0;for(let i=0;i<120;i++)v.chase.update(1/60,s,v.input);
 assert.ok(v.camera.position.distanceTo(v.chase.pivot)>24);clear(v.chase,flat);visible(v.camera,s);
});
test('underwater GUP-B/A/R poses, targets and FOV match pre-change production snapshots',()=>{
 const snapshots=JSON.parse(readFileSync(new URL('./fixtures/underwater-camera-baseline.json',import.meta.url)));
 for(const expected of snapshots){
  const camera=new T.PerspectiveCamera(65,16/9,.1,1500),obstacles=new CameraObstacles({grid:{query(x,z,r,out){out.length=0;out.push({x:0,y:10,z:-8,rx:3,ry:3,rz:3,solid:true});}}}),chase=new ChaseCamera(camera,obstacles);
  chase.profile=vehicleById(expected.id).camera;const s={position:{x:0,y:8,z:0},heading:.2,speed:16,pitch:.5,bank:.3},controls={orbit:{x:expected.orbit?.8:0,y:expected.orbit?-.15:0,last:1e9},drag:expected.orbit};
  for(let i=0;i<45;i++){s.position.x=i*.12;s.position.y=8+Math.sin(i*.06);s.position.z=i*.19;s.heading=.2+i*.008;chase.update(1/60,s,controls);}
  for(const [actual,wanted] of [[camera.position.toArray(),expected.position],[camera.quaternion.toArray(),expected.quaternion],[chase.target.toArray(),expected.target]])actual.forEach((n,i)=>assert.ok(Math.abs(n-wanted[i])<1e-12,expected.id));
  assert.equal(camera.fov,expected.fov);
 }
});
