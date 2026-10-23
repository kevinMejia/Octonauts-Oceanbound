export class MarineCollection {
 constructor(game,discovery){
  this.game=game;this.discovery=discovery;
  this.button=document.createElement('button');this.button.id='creatureCollection';this.button.textContent='Creature Collection';this.button.setAttribute('aria-haspopup','dialog');this.button.setAttribute('aria-controls','marineDialog');this.button.setAttribute('aria-expanded','false');document.querySelector('#navigation').append(this.button);
  this.dialog=document.createElement('dialog');this.dialog.id='marineDialog';this.dialog.setAttribute('aria-labelledby','marineTitle');
  this.dialog.innerHTML=`<div class="monitor-screen"><div class="monitor-header"><div><p class="monitor-eyebrow">OCTOPOD MARINE LIFE SCANNER</p><h2 id="marineTitle">CREATURE COLLECTION</h2></div><button type="button" class="marine-close" aria-label="Close creature scanner">×</button></div><div class="monitor-content marine-content"></div><div class="monitor-footer"><p class="marine-save"></p><span>EXPLORE · RESCUE · PROTECT</span></div></div>`;
  document.body.append(this.dialog);this.content=this.dialog.querySelector('.marine-content');this.button.onclick=()=>this.open();this.dialog.querySelector('.marine-close').onclick=()=>this.dialog.close();
  this.dialog.addEventListener('close',()=>{document.body.classList.remove('marine-open');this.game.input.clear();this.release?.();this.release=null;this.button.setAttribute('aria-expanded','false');this.returnFocus?.focus({preventScroll:true});});
 }
 open(animal,location){
  if(this.dialog.open)return;this.returnFocus=document.activeElement;this.render(animal);this.release=this.game.pause.acquire('marine-scanner');this.game.input.clear();
  try{this.dialog.showModal();document.body.classList.add('marine-open');this.button.setAttribute('aria-expanded','true');this.dialog.querySelector('button').focus({preventScroll:true});if(location){this.game.atmosphere.propulsion.discoveryBurst(location.x,location.y,location.z);this.game.needsPausedRender=true;}}
  catch(error){this.release?.();this.release=null;document.body.classList.remove('marine-open');throw error;}
 }
 render(animal){
  this.content.replaceChildren();this.dialog.querySelector('#marineTitle').textContent=animal?'CREATURE DISCOVERED!':'CREATURE COLLECTION';
  this.dialog.querySelector('.marine-save').textContent=this.discovery.saved?'Discoveries save on this device.':'Progress is available for this dive. Device storage is unavailable.';
  if(animal){this.details(animal,true);return;}
  const progress=document.createElement('p');progress.textContent=`${this.discovery.count} of ${this.discovery.records.size} creatures discovered`;this.content.append(progress);
  if(!this.discovery.records.size){const empty=document.createElement('p');empty.className='marine-empty';empty.textContent='New creatures are coming soon!';this.content.append(empty);return;}
  const grid=document.createElement('div');grid.className='marine-grid';this.content.append(grid);
  for(const a of this.discovery.records.values()){
   const card=document.createElement('button');card.type='button';card.className='marine-card';
   if(this.discovery.isDiscovered(a.id)){this.image(a,card);const name=document.createElement('strong');name.textContent=a.commonName;const fact=document.createElement('p');fact.textContent=a.fact;card.append(name,fact);card.onclick=()=>{this.content.replaceChildren();this.details(a,false);};}
   else{card.textContent='? — Not Discovered';card.disabled=true;}grid.append(card);
  }
 }
 image(animal,parent){const image=document.createElement('img');image.src=animal.thumbnailPath;image.alt=animal.commonName;image.draggable=false;image.onerror=()=>{image.remove();};parent.append(image);}
 details(animal,celebrating){
  const name=document.createElement('h3');name.textContent=animal.commonName+(celebrating?' DISCOVERED!':'');this.content.append(name);this.image(animal,this.content);
  const scientific=document.createElement('p');scientific.textContent=animal.scientificName;const fact=document.createElement('p');fact.textContent=animal.fact;this.content.append(scientific,fact);
  if(!celebrating)for(const text of animal.additionalFacts??[]){const p=document.createElement('p');p.textContent=text;this.content.append(p);}
  const button=document.createElement('button');button.type='button';button.className='marine-continue';button.textContent=celebrating?'CONTINUE EXPLORING':'BACK TO COLLECTION';button.onclick=()=>celebrating?this.dialog.close():this.render();this.content.append(button);
 }
}
