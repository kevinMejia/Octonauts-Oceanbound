import {AnalogStick} from './AnalogStick.js';
import {installGameTouchGuards} from './GameTouchGestures.js';
import {TurboInput} from '../turbo/TurboInput.js';
export class Input{
 constructor(canvas){
  this.keys=new Set();this.pointers=new Map();this.orbit={x:0,y:0,last:-100};this.drag=null;this.turbo=new TurboInput();
  this.removeGuards=installGameTouchGuards();
  this.stick=new AnalogStick(document.querySelector('#joystick'));
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'];
  addEventListener('keydown',e=>{if(!codes.includes(e.code))return;e.preventDefault();if(!this.keys.has(e.code)&&['KeyW','ArrowUp'].includes(e.code))this.turbo.press(e.code);this.keys.add(e.code);});
  addEventListener('keyup',e=>{this.keys.delete(e.code);this.turbo.release(e.code);});
  for(const b of document.querySelectorAll('[data-action]')){
   b.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);const alreadyHeld=[...this.pointers.values()].includes(b.dataset.action);this.pointers.set(e.pointerId,b.dataset.action);if(b.dataset.action==='forward'&&!alreadyHeld)this.turbo.press('touch-forward');b.classList.add('pressed');};
   const release=e=>{this.pointers.delete(e.pointerId);if(![...this.pointers.values()].includes(b.dataset.action)){b.classList.remove('pressed');if(b.dataset.action==='forward')this.turbo.release('touch-forward');}};
   b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
  }
  canvas.onpointerdown=e=>{if(this.drag||e.button!==0)return;e.preventDefault();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(this.drag?.id!==e.pointerId)return;e.preventDefault();this.orbit.x-=(e.clientX-this.drag.x)*.005;this.orbit.y=Math.max(-.22,Math.min(.8,this.orbit.y+(e.clientY-this.drag.y)*.004));this.orbit.last=performance.now()/1000;this.drag.x=e.clientX;this.drag.y=e.clientY;};
  const end=e=>{if(this.drag?.id===e.pointerId)this.drag=null;};canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
  addEventListener('blur',()=>this.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});addEventListener('orientationchange',()=>this.clear());
 }
 clear(){this.keys.clear();this.pointers.clear();this.stick.clear();this.turbo.clear();this.drag=null;document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
 read(){const held=(a,...codes)=>[...this.pointers.values()].includes(a)||codes.some(k=>this.keys.has(k));const forward=held('forward','KeyW','ArrowUp'),back=held('back','KeyS','ArrowDown');const turn=+held('left','KeyA','ArrowLeft')-held('right','KeyD','ArrowRight');const rise=+held('up','Space')-held('down','ShiftLeft','ShiftRight');return {thrust:back?-1:+forward,brakeReverse:back,turn:turn||this.stick.axes.turn,rise:rise||this.stick.axes.rise,boost:!back&&this.turbo.held};}
}
