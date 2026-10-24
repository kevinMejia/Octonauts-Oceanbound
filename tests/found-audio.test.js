import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AudioManager} from '../src/audio/AudioManager.js';

test('cached discovery effects replace each other, respect mute and play during UI pause',()=>{
 const sources=[],gains=[];
 const audio=Object.create(AudioManager.prototype);
 audio.settings={master:.8,muted:false};audio.playAuthorized=true;audio.document={hidden:false};audio.paused=true;audio.master={};
 audio.foundBuffers={animal:{id:'open'},gup:{id:'close'}};
 audio.context={state:'running',createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;},createGain(){const gain={gain:{value:0},connect(target){this.target=target;},disconnect(){}};gains.push(gain);return gain;}};
 audio.playFound('animal');assert.equal(sources.length,1);assert.equal(sources[0].buffer,audio.foundBuffers.animal);assert.equal(sources[0].started,true);assert.equal(gains[0].target,audio.master);assert.equal(gains[0].gain.value,.25);
 audio.playFound('gup');assert.equal(sources[0].stopped,true);assert.equal(sources[1].buffer,audio.foundBuffers.gup);
 sources[0].onended();assert.equal(audio.foundSound.source,sources[1]);
 audio.settings.muted=true;audio.playFound('animal');assert.equal(sources.length,2);
 audio.settings.muted=false;audio.settings.master=0;audio.playFound('animal');assert.equal(sources.length,2);
 audio.settings.master=.8;audio.document.hidden=true;audio.playFound('animal');assert.equal(sources.length,2);
 audio.document.hidden=false;audio.foundBuffers={};audio.playFound('animal');assert.equal(sources.length,2);
 audio.stopFoundSound();assert.equal(sources[1].stopped,true);assert.equal(audio.foundSound,null);
});

import {MarineCollection} from '../src/ui/MarineCollection.js';
import {MarineDiscovery} from '../src/marine/MarineDiscovery.js';
import {DiscoveryModal} from '../src/ui/DiscoveryModal.js';
import {vehicles} from '../src/config/vehicleConfig.js';

test('animal first discovery plays with notification; reopening collection and saved animals stays silent',()=>{
 const previous=globalThis.document,events=[];
 globalThis.document={activeElement:null,body:{classList:{add(){},remove(){}}}};
 try{
  const panel=Object.create(MarineCollection.prototype);
  panel.updateCounter=()=>{};panel.render=()=>{};panel.button={setAttribute(){}};
  panel.dialog={open:false,showModal(){this.open=true;events.push('shown');},querySelector:()=>({focus(){}})};
  panel.game={pause:{acquire:()=>()=>{}},input:{clear(){}},audio:{playFound:kind=>events.push(kind)},atmosphere:{propulsion:{discoveryBurst(){}}}};
  const animal={id:'test',commonName:'Test',scientificName:'Test animal',fact:'Fact',habitat:'reef',modelPath:'/test.glb',thumbnailPath:'/test.png',position:{x:0,y:0,z:0},discoveryRadius:5};
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const discovery=new MarineDiscovery({registry:[animal],storage,onDiscover:(a,p)=>panel.open(a,p)});
  discovery.update(animal.position);discovery.update(animal.position);assert.deepEqual(events,['shown','animal']);
  panel.dialog.open=false;panel.open();assert.deepEqual(events,['shown','animal','shown']);
  const reloaded=new MarineDiscovery({registry:[animal],storage,onDiscover:()=>assert.fail('saved animal rediscovered')});assert.equal(reloaded.update(animal.position),false);
 }finally{globalThis.document=previous;}
});

test('GUP notification plays once when shown even with decorative effects disabled',()=>{
 const previous=globalThis.document,events=[];
 globalThis.document={body:{classList:{add(){}}}};
 try{
  const panel=Object.create(DiscoveryModal.prototype);panel.operation=0;
  panel.imageButton={disabled:false,setAttribute(){},focus(){}};panel.image={};panel.error={};
  panel.dialog={open:false,classList:{remove(){}},querySelector:()=>({}),showModal(){this.open=true;events.push('shown');}};
  panel.game={unlocks:{saved:true},pause:{acquire:()=>()=>{}},input:{clear(){}},audio:{playFound:kind=>events.push(kind)}};
  const definition={...vehicles[0],discovery:{effects:false}};
  panel.open(definition);panel.open(definition);assert.deepEqual(events,['shown','gup']);
 }finally{globalThis.document=previous;}
});
