// Circular clamp preserves diagonal magnitude; dead zone avoids accidental drift.
export function stickAxes(dx,dy,radius=58,deadZone=.12){
 const length=Math.hypot(dx,dy),fraction=Math.min(1,length/radius);
 const amount=Math.max(0,(fraction-deadZone)/(1-deadZone));
 return {turn:amount?-dx/length*amount:0,thrust:amount?-dy/length*amount:0,
  x:length?dx/length*fraction*radius:0,y:length?dy/length*fraction*radius:0};
}
export class AnalogStick{
 constructor(element,onForward){this.element=element;this.onForward=onForward;this.pointer=null;this.axes={turn:0,thrust:0};this.forward=false;
  element.addEventListener('pointerdown',e=>{if(this.pointer!==null||e.button!==0)return;e.preventDefault();this.pointer=e.pointerId;element.setPointerCapture(e.pointerId);this.move(e);});
  element.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();this.move(e);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>{if(e.pointerId===this.pointer)this.clear();});
 }
 move(e){const r=this.element.getBoundingClientRect();this.axes=stickAxes(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.36);this.element.style.setProperty('--stick-x',this.axes.x+'px');this.element.style.setProperty('--stick-y',this.axes.y+'px');this.element.classList.add('engaged');
  const forward=this.forward?this.axes.thrust>.15:this.axes.thrust>.3;
  if(forward!==this.forward){this.forward=forward;this.onForward(forward);}
 }
 clear(){const id=this.pointer;this.pointer=null;this.axes={turn:0,thrust:0};this.forward=false;this.onForward(false);this.element.style.setProperty('--stick-x','0px');this.element.style.setProperty('--stick-y','0px');this.element.classList.remove('engaged');if(id!==null&&this.element.hasPointerCapture(id))this.element.releasePointerCapture(id);}
}

