import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscoveryParticles,discoveryTiming} from '../src/ui/discoveryCelebrationMath.js';
import {DiscoverySound} from '../src/audio/DiscoverySound.js';
import {AudioManager} from '../src/audio/AudioManager.js';
import {audioDefaults} from '../src/audio/AudioSettings.js';

const bounds={width:1000,height:800,modal:{left:180,top:100,width:640,height:600},image:{left:210,top:260,width:580,height:300}};
function random(){let n=714;return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
const run=(model,seconds)=>{for(let i=0;i<seconds*100;i++)model.update(.01);};
test('discovery timeline emits each burst once, then leaves only bounded ambient bubbles',()=>{
 const m=new DiscoveryParticles({random:random()});m.start(bounds);assert.equal(m.particles.length,40);assert.deepEqual(m.bursts,{bubbles:1,sparkles:0,confetti:0});assert.ok(m.particles.some(p=>p.layer==='back'));assert.ok(m.particles.some(p=>p.layer==='front'));
 run(m,.68);assert.equal(m.bursts.sparkles,0);run(m,.04);assert.equal(m.bursts.sparkles,1);run(m,.3);assert.equal(m.bursts.confetti,1);run(m,15);assert.deepEqual(m.bursts,{bubbles:1,sparkles:1,confetti:1});assert.ok(m.particles.length<=6);assert.ok(m.particles.every(p=>p.ambient&&p.kind==='bubble'));m.reset();assert.equal(m.particles.length,0);
});
test('bubbles expand, slow and rise; confetti stays buoyant rather than falling with gravity',()=>{
 const m=new DiscoveryParticles({random:random(),compact:true});m.start(bounds);const bubble=m.particles[0],speed=Math.hypot(bubble.vx,bubble.vy);run(m,1.1);assert.ok(Math.hypot(bubble.vx,bubble.vy)<speed);assert.ok(bubble.alpha>0);const confetti=m.particles.find(p=>p.kind==='confetti');assert.ok(confetti);run(m,1);assert.ok(confetti.vy<10);assert.ok(m.particles.length<=m.limit);
});
test('resize repositions existing particles without replaying phases or resetting the clock',()=>{
 const m=new DiscoveryParticles({random:random()});m.start(bounds);run(m,.8);const p=m.particles[0],x=p.x,y=p.y,t=m.time;m.resize({...bounds,width:500,height:400});assert.equal(p.x,x/2);assert.equal(p.y,y/2);assert.equal(m.time,t);assert.equal(m.bursts.sparkles,1);run(m,2.4);assert.equal(m.bursts.sparkles,1);
});
function audioFixture(){const sources=[],gains=[],param=()=>({events:[],setValueAtTime(...args){this.events.push(['set',...args]);},linearRampToValueAtTime(...args){this.events.push(['ramp',...args]);}}),context={state:'running',currentTime:2,createGain(){const gain={gain:param(),connect(destination){this.destination=destination;},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;},createBufferSource(){const source={playbackRate:param(),connect(){},disconnect(){this.disconnected=true;},start(...args){this.started=args;},stop(){this.stopped=true;}};sources.push(source);return source;}},destination={},buffer={duration:1,numberOfChannels:1,getChannelData:()=>Float32Array.from([0,.8,-1.2,.2])};return {sources,gains,context,destination,sound:new DiscoverySound(context,destination,buffer)};}
test('discovery reuses one decoded buffer on the existing volume bus and cleans up each voice',()=>{
 const f=audioFixture(),stopFirst=f.sound.play();assert.equal(f.sources.length,1);assert.equal(f.sources[0].loop,false);assert.equal(f.gains[0].destination,f.destination);assert.ok(f.gains[0].gain.events.some(e=>e[0]==='ramp'&&e[1]===0));assert.ok(f.sources[0].started[2]<=.85);assert.ok(f.sound.level<=.12);
 const stopSecond=f.sound.play();assert.equal(f.sources[0].disconnected,true);stopFirst();assert.notEqual(f.sound.voice,null);stopSecond();assert.equal(f.sound.voice,null);assert.equal(f.sources[1].disconnected,true);
});
test('discovery cannot create delayed or unauthorized audio, but may play during its own modal pause',()=>{
 for(const mode of ['startup','muted','master-zero','bubbles-zero','hidden','suspended','unavailable','normal']){
  let played=0;const a=Object.create(AudioManager.prototype);Object.assign(a,{playAuthorized:mode!=='startup',document:{hidden:mode==='hidden'},context:{state:mode==='suspended'?'suspended':'running'},settings:{...audioDefaults},paused:true,discoverySound:mode==='unavailable'?null:{play(){played++;return ()=>{};}}});
  if(mode==='muted')a.settings.muted=true;if(mode==='master-zero')a.settings.master=0;if(mode==='bubbles-zero')a.settings.bubbles=0;assert.equal(typeof a.playDiscovery(),'function');assert.equal(played,mode==='normal'?1:0);
 }
});
