import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AudioManager} from '../src/audio/AudioManager.js';

test('cached window effects replace each other, respect mute and play during UI pause',()=>{
 const sources=[],gains=[];
 const audio=Object.create(AudioManager.prototype);
 audio.settings={master:.8,muted:false};audio.playAuthorized=true;audio.document={hidden:false};audio.paused=true;audio.master={};
 audio.windowBuffers={windowOpen:{id:'open'},windowClose:{id:'close'}};
 audio.context={state:'running',createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;},createGain(){const gain={gain:{value:0},connect(target){this.target=target;},disconnect(){}};gains.push(gain);return gain;}};
 audio.playWindow(true);assert.equal(sources.length,1);assert.equal(sources[0].buffer,audio.windowBuffers.windowOpen);assert.equal(sources[0].started,true);assert.equal(gains[0].target,audio.master);assert.equal(gains[0].gain.value,.25);
 audio.playWindow(false);assert.equal(sources[0].stopped,true);assert.equal(sources[1].buffer,audio.windowBuffers.windowClose);
 sources[0].onended();assert.equal(audio.windowSound.source,sources[1]);
 audio.settings.muted=true;audio.playWindow(true);assert.equal(sources.length,2);
 audio.settings.muted=false;audio.settings.master=0;audio.playWindow(true);assert.equal(sources.length,2);
 audio.settings.master=.8;audio.document.hidden=true;audio.playWindow(true);assert.equal(sources.length,2);
 audio.document.hidden=false;audio.windowBuffers={};audio.playWindow(true);assert.equal(sources.length,2);
 audio.stopWindowSound();assert.equal(sources[1].stopped,true);assert.equal(audio.windowSound,null);
});
