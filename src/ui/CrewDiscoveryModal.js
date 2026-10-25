import {focusGameplay} from './focusGameplay.js';
import {DiscoveryCelebration} from './DiscoveryCelebration.js';
export class CrewDiscoveryModal{
 constructor(game){
  this.game=game;this.dialog=document.createElement('dialog');this.dialog.id='crewDialog';this.dialog.setAttribute('aria-labelledby','crewTitle');this.dialog.setAttribute('aria-describedby','crewMessage');
  this.dialog.innerHTML=`<div class="monitor-screen"><div class="monitor-header"><img src="./assets/img/Octopus%20Badge%20Icon.png" width="44" height="44" alt=""><div><p class="monitor-eyebrow">OCTOPOD CREW SCANNER</p><h2 id="crewTitle">OCTONAUT FOUND!</h2></div><button id="closeCrew" type="button" aria-label="Begin rescue and close">×</button></div><div class="monitor-content crew-content"><h3 id="crewName"></h3><img id="crewPortrait" alt=""><p id="crewMessage"></p><button id="returnCrew" type="button">BEGIN RESCUE</button></div><div class="monitor-footer"><p id="crewSaved"></p><span>EXPLORE · RESCUE · PROTECT</span></div></div>`;
  document.body.append(this.dialog);this.celebration=new DiscoveryCelebration(this.dialog,this.dialog.querySelector('#crewPortrait'),{closeSelector:'#closeCrew'});
  for(const id of ['returnCrew','closeCrew'])this.dialog.querySelector('#'+id).onclick=()=>this.dialog.close();
  this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.dialog.close();});
  this.dialog.addEventListener('close',()=>this.didClose());
 }
 open(definition,position){
  if(this.dialog.open)return;
  this.returnFocus=document.activeElement;this.dialog.querySelector('#crewName').textContent=definition.name+' FOUND!';this.dialog.querySelector('#crewMessage').textContent=definition.message;
  const image=this.dialog.querySelector('#crewPortrait');image.src=definition.portraitPath??this.game.crew.records.get(definition.id).portrait;image.alt=definition.name;
  this.dialog.querySelector('#crewSaved').textContent=this.game.crewDiscovery.saved?`${this.game.crewDiscovery.count} of ${this.game.crewDiscovery.records.size} Octonauts found · Tow them home to rescue them`:'Found for this adventure · Device storage unavailable';
  this.release=this.game.pause.acquire('crew-discovery');this.game.input.clear();
  try{this.dialog.showModal();document.body.classList.add('crew-open');this.dialog.querySelector('#returnCrew').focus({preventScroll:true});this.celebration.start();try{this.stopSound=this.game.audio?.playDiscovery?.();}catch{}this.game.atmosphere.propulsion.discoveryBurst(position.x,position.y,position.z);this.game.needsPausedRender=true;}
  catch(error){if(this.dialog.open)this.dialog.close();else this.didClose();throw error;}
 }
 didClose(){this.celebration.stop();this.stopSound?.();this.stopSound=null;this.game.crewDiscovery.finish();document.body.classList.remove('crew-open');this.game.input.clear();this.game.needsPausedRender=true;this.release?.();this.release=null;focusGameplay();}
}
