import {cameraConfig as camera} from '../config/cameraConfig.js';
import {AnalogStick} from './AnalogStick.js';
import {installGameTouchGuards} from './GameTouchGestures.js';
import {TurboInput} from '../turbo/TurboInput.js';
export class Input{
 constructor(canvas){
  this.keys=new Set();this.pointers=new Map();this.orbit={x:0,y:0,last:-100};this.drag=null;this.turbo=new TurboInput();
  this.removeGuards=installGameTouchGuards();
  this.stick=new AnalogStick(document.querySelector('#joystick'));
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'];
  addEventListener('keydown',e=>{if(document.body.classList.contains('starting')||document.querySelector('dialog[open]')||e.target.closest?.('input,textarea,select,dialog')||(e.code==='Space'&&e.target.closest?.('button'))||!codes.includes(e.code))return;e.preventDefault();if(!this.keys.has(e.code)&&['KeyW','ArrowUp'].includes(e.code))this.turbo.press(e.code);this.keys.add(e.code);});
  addEventListener('keyup',e=>{this.keys.delete(e.code);this.turbo.release(e.code);});
  for(const b of document.querySelectorAll('[data-action]')){
   b.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);const alreadyHeld=[...this.pointers.values()].includes(b.dataset.action);this.pointers.set(e.pointerId,b.dataset.action);if(b.dataset.action==='forward'&&!alreadyHeld)this.turbo.press('touch-forward');b.classList.add('pressed');};
   const release=e=>{this.pointers.delete(e.pointerId);if(![...this.pointers.values()].includes(b.dataset.action)){b.classList.remove('pressed');if(b.dataset.action==='forward')this.turbo.release('touch-forward');}};
   b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
  }
  canvas.onpointerdown=e=>{if(this.drag||e.button!==0)return;e.preventDefault();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(this.drag?.id!==e.pointerId)return;e.preventDefault();this.orbit.x-=(e.clientX-this.drag.x)*camera.orbitSensitivity;this.orbit.y=Math.max(-1.2,Math.min(1.2,this.orbit.y+(e.clientY-this.drag.y)*camera.verticalSensitivity));this.orbit.last=performance.now()/1000;this.drag.x=e.clientX;this.drag.y=e.clientY;};
  const end=e=>{if(this.drag?.id===e.pointerId){this.drag=null;this.orbit.last=performance.now()/1000;}};canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
  addEventListener('blur',()=>this.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});addEventListener('orientationchange',()=>this.clear());
 }
 clear(){if(this.drag)this.orbit.last=performance.now()/1000;this.keys.clear();this.pointers.clear();this.stick.clear();this.turbo.clear();this.drag=null;document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
 read(){if(document.querySelector('dialog[open]'))return {thrust:0,turn:0,rise:0,boost:false};const held=(a,...codes)=>[...this.pointers.values()].includes(a)||codes.some(k=>this.keys.has(k));const forward=held('forward','KeyW','ArrowUp'),back=held('back','KeyS','ArrowDown');const turn=+held('left','KeyA','ArrowLeft')-held('right','KeyD','ArrowRight');const rise=+held('up','Space')-held('down','ShiftLeft','ShiftRight');return {thrust:back?-1:+forward,brakeReverse:back,turn:turn||this.stick.axes.turn,rise:rise||this.stick.axes.rise,boost:!back&&this.turbo.held};}
}
