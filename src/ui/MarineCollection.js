export class MarineCollection {

 constructor(game,discovery){

  this.game=game;this.discovery=discovery;

  this.button=document.createElement('button');this.button.id='creatureCollection';this.button.type='button';this.button.innerHTML=`<svg class="creature-fish" viewBox="0 0 44 32" aria-hidden="true" focusable="false"><path d="M12 11 3 6 5 16 3 26 13 21C23 31 36 25 41 16 35 5 22 2 12 11Z" fill="#ffc25a" stroke="#e99829" stroke-width="1.5" stroke-linejoin="round"/><path d="m20 7 4-5 7 3M21 25l5 5 5-4" fill="#ffb340" stroke="#e99829" stroke-linejoin="round"/><path d="M27 8q-6 8 0 17" fill="none" stroke="#e9a23c" stroke-width="1.2"/><ellipse cx="33" cy="12" rx="4" ry="5" fill="#fff4d2"/><ellipse cx="34" cy="12" rx="2.1" ry="3" fill="#194759"/></svg><span class="creature-label">CREATURES</span><span class="creature-counter" aria-hidden="true"></span>`;this.counter=this.button.querySelector('.creature-counter');this.updateCounter();this.button.title='Open Creature Collection';for(const type of ['pointerdown','pointerup'])this.button.addEventListener(type,event=>event.stopPropagation());this.button.setAttribute('aria-haspopup','dialog');this.button.setAttribute('aria-controls','marineDialog');this.button.setAttribute('aria-expanded','false');document.querySelector('#navigation').append(this.button);

  this.dialog=document.createElement('dialog');this.dialog.id='marineDialog';this.dialog.setAttribute('aria-labelledby','marineTitle');

  this.dialog.innerHTML=`<div class="monitor-screen"><div class="monitor-header"><div><p class="monitor-eyebrow">OCTOPOD MARINE LIFE SCANNER</p><h2 id="marineTitle">CREATURE COLLECTION</h2></div><button type="button" class="marine-close" aria-label="Close creature scanner">×</button></div><div class="monitor-content marine-content"></div><div class="monitor-footer"><p class="marine-save"></p><span>EXPLORE · RESCUE · PROTECT</span></div></div>`;

  document.body.append(this.dialog);this.content=this.dialog.querySelector('.marine-content');this.button.onclick=()=>this.open();this.dialog.querySelector('.marine-close').onclick=()=>this.dialog.close();

  this.dialog.addEventListener('close',()=>{document.body.classList.remove('marine-open');this.game.input.clear();this.release?.();this.release=null;this.button.setAttribute('aria-expanded','false');this.returnFocus?.focus({preventScroll:true});});

 }

 updateCounter(){const found=this.discovery.count,total=this.discovery.records.size;this.counter.textContent=`${found}/${total}`;this.button.setAttribute('aria-label',`Creature Collection, ${found} of ${total} creatures discovered`);}

 open(animal,location){
  this.updateCounter();

  if(this.dialog.open)return;this.returnFocus=document.activeElement;this.render(animal);this.release=this.game.pause.acquire('marine-scanner');this.game.input.clear();

  try{this.dialog.showModal();document.body.classList.add('marine-open');this.button.setAttribute('aria-expanded','true');this.dialog.querySelector('button').focus({preventScroll:true});if(location){this.game.atmosphere.propulsion.discoveryBurst(location.x,location.y,location.z);this.game.needsPausedRender=true;}}

  catch(error){this.release?.();this.release=null;document.body.classList.remove('marine-open');throw error;}

 }

 render(animal){
  this.updateCounter();

  this.content.replaceChildren();this.dialog.querySelector('#marineTitle').textContent=animal?'CREATURE DISCOVERED!':'CREATURE COLLECTION';

  this.dialog.querySelector('.marine-save').textContent=this.discovery.saved?'Discoveries save on this device.':'Progress is available for this dive. Device storage is unavailable.';

  if(animal){this.details(animal,true);return;}

  const progress=document.createElement('p');progress.textContent=`${this.discovery.count} of ${this.discovery.records.size} creatures discovered`;this.content.append(progress);

  if(!this.discovery.records.size){const empty=document.createElement('p');empty.className='marine-empty';empty.textContent='New creatures are coming soon!';this.content.append(empty);return;}

  const grid=document.createElement('div');grid.className='marine-grid';this.content.append(grid);

  for(const a of this.discovery.records.values()){

   const card=document.createElement('button');card.type='button';card.className='marine-card';

   if(this.discovery.isDiscovered(a.id)){this.image(a,card);const name=document.createElement('strong');name.textContent=a.commonName;const fact=document.createElement('p');fact.textContent=a.fact;card.append(name,fact);card.onclick=()=>{this.content.replaceChildren();this.details(a,false);};}

   else{this.image(a,card);card.classList.add('marine-locked');const label=document.createElement('span');label.textContent='? — Not Discovered';card.append(label);card.disabled=true;}grid.append(card);

  }

 }

 image(animal,parent){const image=document.createElement('img');image.src=animal.thumbnailPath??animal.visual?.thumbnailPath??this.game.marineAnimals?.thumbnails.get(animal.id)??'';image.alt=animal.commonName;image.draggable=false;image.onerror=()=>{image.remove();};parent.append(image);}

 details(animal,celebrating){

  const name=document.createElement('h3');name.textContent=animal.commonName+(celebrating?' DISCOVERED!':'');this.content.append(name);this.image(animal,this.content);

  const scientific=document.createElement('p');scientific.textContent=animal.scientificName;const fact=document.createElement('p');fact.textContent=animal.fact;this.content.append(scientific,fact);

  if(!celebrating)for(const text of animal.additionalFacts??[]){const p=document.createElement('p');p.textContent=text;this.content.append(p);}

  const button=document.createElement('button');button.type='button';button.className='marine-continue';button.textContent=celebrating?'CONTINUE EXPLORING':'BACK TO COLLECTION';button.onclick=()=>celebrating?this.dialog.close():this.render();this.content.append(button);

 }

}
