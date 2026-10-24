import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AudioManager} from '../src/audio/AudioManager.js';

test('cached rescue effects replace each other, respect mute and play during UI pause',()=>{
 const sources=[],gains=[];
 const audio=Object.create(AudioManager.prototype);
 audio.settings={master:.8,muted:false};audio.playAuthorized=true;audio.document={hidden:false};audio.paused=true;audio.master={};
 audio.rescueBuffers={lasso:{id:'open'},rescue:{id:'close'}};
 audio.context={state:'running',createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;},createGain(){const gain={gain:{value:0},connect(target){this.target=target;},disconnect(){}};gains.push(gain);return gain;}};
 audio.playRescue(true);assert.equal(sources.length,1);assert.equal(sources[0].buffer,audio.rescueBuffers.lasso);assert.equal(sources[0].started,true);assert.equal(gains[0].target,audio.master);assert.equal(gains[0].gain.value,.25);
 audio.playRescue(false);assert.equal(sources[0].stopped,true);assert.equal(sources[1].buffer,audio.rescueBuffers.rescue);
 sources[0].onended();assert.equal(audio.rescueSound.source,sources[1]);
 audio.settings.muted=true;audio.playRescue(true);assert.equal(sources.length,2);
 audio.settings.muted=false;audio.settings.master=0;audio.playRescue(true);assert.equal(sources.length,2);
 audio.settings.master=.8;audio.document.hidden=true;audio.playRescue(true);assert.equal(sources.length,2);
 audio.document.hidden=false;audio.rescueBuffers={};audio.playRescue(true);assert.equal(sources.length,2);
 audio.stopRescueSound();assert.equal(sources[1].stopped,true);assert.equal(audio.rescueSound,null);
});

// Resolve the browser import map for the real rescue module without a WebGL renderer.
const {registerHooks}=await import('node:module');
const hook=registerHooks({resolve(specifier,context,next){return next(specifier==='three'?new URL('../vendor/three.module.js',import.meta.url).href:specifier,context);}});
const {RescueSystem}=await import('../src/rescue/RescueSystem.js');
hook.deregister();
const {rescueConfig}=await import('../src/config/rescueConfig.js');

test('attachment feedback happens once after rope binding and never on rejected starts or rebinds',()=>{
 const system=Object.create(RescueSystem.prototype),events=[];
 system.config=rescueConfig;system.notice={};system.game={sub:{},compass:{setRescue(){}},rescueNavigation:{setMission(){}},audio:{playRescue:value=>events.push(value?'lasso':'rescue')}};
 system.rebind=()=>events.push('rope');
 const payload={id:'kwazii',height:2,radius:.5,model:{position:{x:0,y:0,z:0},rotation:{y:0}}};
 assert.equal(system.start({...payload,model:null}),false);assert.deepEqual(events,[]);
 assert.equal(system.start(payload),true);assert.deepEqual(events,['rope','lasso']);
 assert.equal(system.start(payload),false);system.rebind();assert.deepEqual(events,['rope','lasso','rope']);
});

test('delivery feedback happens once with a payload, independently of optional visual effects',()=>{
 const system=Object.create(RescueSystem.prototype),events=[],position={x:0,y:20,z:0};
 system.config={...rescueConfig,completion:{showEffect:false,showMessage:false}};system.time=0;system.noticeLeft=0;system.centre=position;
 system.game={sub:{position,speed:0},rescueNavigation:{update(){}},audio:{playRescue:()=>events.push('rescue')}};
 system.rope={update(){}};system.stop=()=>{system.active=null;};system.onDelivered=id=>events.push(id);
 system.update(.016);assert.deepEqual(events,[]);
 system.active={id:'kwazii',name:'Kwazii',recoveryGrace:0,motion:{position,update(){},chest:1,heading:0},model:{position:{set(){}},rotation:{set(){}}}};
 system.update(.016);system.update(.016);assert.deepEqual(events,['kwazii','rescue']);
});
