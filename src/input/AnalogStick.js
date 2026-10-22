// Circular clamp preserves diagonal magnitude; dead zone avoids accidental drift.
export function stickAxes(dx,dy,radius=58,deadZone=.12){
 const length=Math.hypot(dx,dy),fraction=Math.min(1,length/radius);
 const amount=Math.max(0,(fraction-deadZone)/(1-deadZone));
 return {turn:amount?-dx/length*amount:0,rise:amount?-dy/length*amount:0,
  x:length?dx/length*fraction*radius:0,y:length?dy/length*fraction*radius:0};
}
export class AnalogStick{
 constructor(element){this.element=element;this.pointer=null;this.axes={turn:0,rise:0};
  element.addEventListener('pointerdown',e=>{if(this.pointer!==null||e.button!==0)return;e.preventDefault();this.pointer=e.pointerId;element.setPointerCapture(e.pointerId);this.move(e);});
  element.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();this.move(e);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>{if(e.pointerId===this.pointer)this.clear();});
 }
 move(e){const r=this.element.getBoundingClientRect();this.axes=stickAxes(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.36);this.element.style.setProperty('--stick-x',this.axes.x+'px');this.element.style.setProperty('--stick-y',this.axes.y+'px');this.element.classList.add('engaged');

 }
 clear(){const id=this.pointer;this.pointer=null;this.axes={turn:0,rise:0};this.element.style.setProperty('--stick-x','0px');this.element.style.setProperty('--stick-y','0px');this.element.classList.remove('engaged');if(id!==null&&this.element.hasPointerCapture(id))this.element.releasePointerCapture(id);}
}

