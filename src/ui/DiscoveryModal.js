import {vehicleThumbnailURL} from '../config/vehicleConfig.js';
export class DiscoveryModal{
 constructor(game){
  this.game=game;this.operation=0;this.busy=false;this.dialog=document.createElement('dialog');this.dialog.id='discoveryDialog';this.dialog.setAttribute('aria-labelledby','discoveryTitle');this.dialog.setAttribute('aria-describedby','discoveryInstruction');
  this.dialog.innerHTML=`<div class="monitor-screen"><div class="discovery-bubbles" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i style="--x:${5+i*11}%;--delay:${-i*.6}s;--size:${7+i%3*5}px"></i>`).join('')}</div><div class="monitor-header"><img src="./assets/img/Octopus%20Badge%20Icon.png" width="44" height="44" alt=""><div><p class="monitor-eyebrow">OCTOPOD SYSTEMS</p><h2 id="discoveryTitle"></h2></div><button id="closeDiscovery" type="button" aria-label="Close discovery">&#10005;</button></div><div class="monitor-content discovery-content"><span class="discovery-status">NEW GUP UNLOCKED</span><button id="discoveryVehicle" type="button"><img alt="" draggable="false"></button><p id="discoveryInstruction">TAP YOUR NEW GUP TO EXPLORE!</p><p id="discoveryError" role="status" aria-live="polite"></p></div><div class="monitor-footer"><p>EXPLORE &#183; RESCUE &#183; PROTECT</p><span>FLEET SYSTEMS</span></div></div>`;
  document.body.append(this.dialog);this.imageButton=this.dialog.querySelector('#discoveryVehicle');this.image=this.imageButton.querySelector('img');this.error=this.dialog.querySelector('#discoveryError');
  this.imageButton.onclick=()=>this.select();this.dialog.querySelector('#closeDiscovery').onclick=()=>this.close();
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.dialog.addEventListener('close',()=>this.didClose());
  this.visibility=()=>this.dialog.classList.toggle('tab-hidden',document.hidden);document.addEventListener('visibilitychange',this.visibility);
 }
 open(definition,location){
  this.definition=definition;this.operation++;this.busy=false;this.imageButton.disabled=false;this.error.textContent='';this.dialog.classList.remove('is-closing');
  this.dialog.querySelector('#discoveryTitle').textContent=definition.name+' DISCOVERED!';this.image.src=vehicleThumbnailURL(definition);this.image.alt=definition.name;this.imageButton.setAttribute('aria-label','Explore in your new '+definition.name);
  this.dialog.querySelector('.discovery-status').textContent=this.game.unlocks.saved?'NEW GUP UNLOCKED':'UNLOCKED FOR THIS DIVE';
  this.releasePause=this.game.pause.acquire('discovery');this.game.input.clear();
  try{this.dialog.showModal();document.body.classList.add('discovery-open');this.imageButton.focus({preventScroll:true});
   if(definition.discovery.effects!==false)this.game.atmosphere.propulsion.discoveryBurst(location.x,location.y+1,location.z);
   this.game.needsPausedRender=true;
  }catch(error){this.didClose();console.warn('Discovery screen unavailable',error);}
 }
 async select(){
  if(this.busy||!this.dialog.open||this.dialog.classList.contains('is-closing'))return;const operation=++this.operation;this.busy=true;this.imageButton.disabled=true;this.error.textContent='Getting your new GUP ready...';
  try{const selected=await this.game.vehicles.select(this.definition.id,()=>this.dialog.open&&operation===this.operation&&!this.dialog.classList.contains('is-closing'));
   if(selected){this.game.vehicleSelector.updateHUD();this.close();}
  }catch(error){if(operation===this.operation)this.error.textContent='Your current GUP is safe. Tap your new GUP to try again, or close to keep exploring.';}
  finally{if(operation===this.operation){this.busy=false;this.imageButton.disabled=false;}}
 }
 close(){if(!this.dialog.open||this.dialog.classList.contains('is-closing'))return;this.operation++;this.game.vehicles.cancel();this.dialog.classList.add('is-closing');this.closeTimer=setTimeout(()=>this.dialog.close(),180);}
 didClose(){clearTimeout(this.closeTimer);this.operation++;this.busy=false;this.imageButton.disabled=false;document.body.classList.remove('discovery-open');this.game.discovery.finishDiscovery();this.game.input.clear();this.releasePause?.();this.releasePause=null;this.game.vehicleSelector.render();this.game.vehicleSelector.updateHUD();this.game.vehicleSelector.hud.focus({preventScroll:true});}
}
