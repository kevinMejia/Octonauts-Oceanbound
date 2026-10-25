import {focusGameplay} from './focusGameplay.js';
import {vehicles,vehicleById,vehicleThumbnailURL,wrapVehicleIndex,carouselNeighbors} from '../config/vehicleConfig.js';
export class VehicleSelector{
 constructor(game){
  this.game=game;this.activeId=game.vehicles.activeId;this.index=vehicles.findIndex(v=>v.id===this.activeId);this.operation=0;this.busy=false;
  this.hud=document.createElement('button');this.hud.id='vehicleToggle';this.hud.type='button';this.hud.setAttribute('aria-haspopup','dialog');this.hud.setAttribute('aria-controls','vehicleSelector');this.hud.setAttribute('aria-expanded','false');
  this.hudImage=document.createElement('img');this.hudImage.alt='';this.hudImage.draggable=false;this.hud.append(this.hudImage);game.compass.element.append(this.hud);
  this.dialog=document.createElement('dialog');this.dialog.id='vehicleSelector';this.dialog.setAttribute('aria-labelledby','vehicleSelectorTitle');this.dialog.setAttribute('aria-describedby','vehicleSelectorSubtitle');
  this.dialog.innerHTML=`<header class="vehicle-selector-header"><img src="./assets/img/Octopus%20Badge%20Icon.png" alt="" class="selector-emblem"><div><h2 id="vehicleSelectorTitle">SELECT A VEHICLE</h2><p id="vehicleSelectorSubtitle">Choose your GUP and get ready to explore!</p></div></header><div class="vehicle-carousel"><div class="vehicle-viewport" role="group" aria-label="Vehicle carousel"></div></div><div class="vehicle-dots" role="group" aria-label="Browse vehicles"></div><button type="button" id="confirmVehicle">SELECT</button><p id="vehicleSelectionStatus" role="status" aria-live="polite"></p>`;
  document.body.append(this.dialog);this.viewport=this.dialog.querySelector('.vehicle-viewport');this.status=this.dialog.querySelector('#vehicleSelectionStatus');this.confirmButton=this.dialog.querySelector('#confirmVehicle');
  this.cards=carouselNeighbors(this.index,vehicles.length).map(({offset})=>{const card=document.createElement('button');card.type='button';card.className='vehicle-card '+(offset<0?'slot-left':offset>0?'slot-right':'slot-center');const image=document.createElement('img');image.alt='';image.draggable=false;const lock=document.createElement('span');lock.className='vehicle-lock';lock.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h2v11H5V10Zm2 0h6V7a3 3 0 0 0-6 0Z"/></svg> LOCKED';const name=document.createElement('span');name.className='vehicle-name';card.append(image,lock,name);card.addEventListener('click',()=>{if(performance.now()<(this.ignoreClickUntil??0))return;this.highlight(Number(card.dataset.index));});this.viewport.append(card);return {card,image,lock,name,offset};});
  const dots=this.dialog.querySelector('.vehicle-dots');this.dots=vehicles.map((definition,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Show '+definition.name);button.addEventListener('click',()=>this.highlight(index));dots.append(button);return button;});
  // Only PNG thumbnails are prefetched; full models load on confirmation.
  this.thumbnails=vehicles.map(definition=>{const image=new Image();image.src=vehicleThumbnailURL(definition);return image;});
  this.hud.onclick=()=>this.open();this.confirmButton.onclick=()=>this.confirm();
  // Dismiss only a gesture that starts and ends on the backdrop, never a card swipe.
  const outside=event=>{const r=this.dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  this.dialog.addEventListener('pointerdown',event=>{this.outsidePointer=event.button===0&&outside(event)?event.pointerId:null;});
  this.dialog.addEventListener('pointerup',event=>{const dismiss=this.outsidePointer===event.pointerId&&outside(event);this.outsidePointer=null;if(dismiss)this.close();});
  this.dialog.addEventListener('pointercancel',()=>{this.outsidePointer=null;});
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.dialog.addEventListener('close',()=>{this.game.audio?.playWindow?.(false);this.didClose();});
  this.dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();this.browse(e.key==='ArrowRight'?1:-1);}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();this.confirm();}});
  this.viewport.addEventListener('pointerdown',e=>{if(e.button!==0||this.busy)return;this.swipe={id:e.pointerId,x:e.clientX,y:e.clientY,captured:false};});
  this.viewport.addEventListener('pointermove',e=>{const s=this.swipe;if(!s||s.id!==e.pointerId)return;if(Math.abs(e.clientX-s.x)>12&&Math.abs(e.clientX-s.x)>Math.abs(e.clientY-s.y)*1.25){s.captured=true;this.viewport.setPointerCapture(e.pointerId);}});
  this.viewport.addEventListener('pointerup',e=>{const s=this.swipe;this.swipe=null;if(!s||s.id!==e.pointerId)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.25){this.ignoreClickUntil=performance.now()+350;this.browse(dx<0?1:-1);}if(this.viewport.hasPointerCapture(e.pointerId))this.viewport.releasePointerCapture(e.pointerId);});
  this.viewport.addEventListener('pointercancel',()=>{this.swipe=null;});this.unsubscribe=game.unlocks.subscribe(()=>this.render());this.updateHUD();this.render();
 }
 updateHUD(){const definition=vehicleById(this.game.vehicles.activeId);this.activeId=definition.id;this.hudImage.src=vehicleThumbnailURL(definition);this.hud.setAttribute('aria-label','Choose a vehicle. Current vehicle: '+definition.name);this.hud.title='Choose your GUP';}
 render(){
  for(const {card,image,lock,name,offset} of this.cards){const index=wrapVehicleIndex(this.index+offset,vehicles.length),definition=vehicles[index];const locked=!this.game.unlocks.isUnlocked(definition.id);card.classList.toggle('is-locked',locked);lock.hidden=!locked;card.dataset.index=index;card.dataset.vehicle=definition.id;card.setAttribute('aria-label',definition.name+(locked?', locked':'')+(offset===0?', highlighted':' — browse'));card.setAttribute('aria-pressed',String(offset===0));card.disabled=this.busy;image.src=vehicleThumbnailURL(definition);name.textContent=definition.name;}
  this.dots.forEach((dot,index)=>{dot.setAttribute('aria-current',String(index===this.index));dot.disabled=this.busy;});const locked=!this.game.unlocks.isUnlocked(vehicles[this.index].id);this.confirmButton.disabled=this.busy||locked;this.confirmButton.textContent=locked?'LOCKED':'SELECT';if(locked){this.status.textContent='Find this GUP near the Octopod.';this.status.dataset.locked='true';}else if(this.status.dataset.locked){this.status.textContent='';delete this.status.dataset.locked;}this.dialog.setAttribute('aria-busy',String(this.busy));
 }
 highlight(index){if(this.busy)return;const direction=index>=this.index?1:-1;this.index=wrapVehicleIndex(index,vehicles.length);this.status.textContent='';this.render();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)this.viewport.animate([{opacity:.65,transform:`translateX(${direction*10}px)`},{opacity:1,transform:'translateX(0)'}],{duration:180,easing:'ease-out'});}
 browse(direction){if(this.dialog.open&&!this.busy)this.highlight(wrapVehicleIndex(this.index+direction,vehicles.length));}
 open(){if(this.dialog.open)return;this.index=vehicles.findIndex(v=>v.id===this.game.vehicles.activeId);this.busy=false;this.status.textContent='';this.dialog.classList.remove('is-closing');this.releasePause=this.game.pause.acquire('vehicle-selector');this.game.input.clear();document.body.classList.add('vehicle-selector-open');this.hud.setAttribute('aria-expanded','true');this.render();try{this.dialog.showModal();this.game.audio?.playWindow?.(true);this.confirmButton.focus();}catch(error){this.didClose();throw error;}}
 async confirm(){
  if(!this.dialog.open||this.busy||!this.game.unlocks.isUnlocked(vehicles[this.index].id))return;const definition=vehicles[this.index],operation=++this.operation;this.busy=true;this.status.textContent='Getting '+definition.name+' ready…';this.render();
  try{const applied=await this.game.vehicles.select(definition.id,()=>operation===this.operation&&this.dialog.open&&!this.dialog.classList.contains('is-closing'));if(!applied)return;this.updateHUD();this.close();}
  catch(error){if(operation!==this.operation)return;console.warn('Vehicle selection failed:',definition.id,error);this.status.textContent='Could not load '+definition.name+'. Your '+vehicleById(this.game.vehicles.activeId).name+' is safe. Try again or close.';}
  finally{if(operation===this.operation){this.busy=false;this.render();}}
 }
 close(){if(!this.dialog.open||this.dialog.classList.contains('is-closing'))return;this.operation++;this.game.vehicles.cancel();this.dialog.classList.add('is-closing');this.closeTimer=setTimeout(()=>this.dialog.close(),180);}
 didClose(){clearTimeout(this.closeTimer);this.operation++;this.game.vehicles.cancel();this.busy=false;this.swipe=null;this.outsidePointer=null;this.dialog.classList.remove('is-closing');document.body.classList.remove('vehicle-selector-open');this.hud.setAttribute('aria-expanded','false');this.game.input.clear();this.releasePause?.();this.releasePause=null;this.updateHUD();
  focusGameplay();}

 dispose(){this.unsubscribe?.();if(this.dialog.open)this.dialog.close();this.didClose();this.dialog.remove();this.hud.remove();}
}
