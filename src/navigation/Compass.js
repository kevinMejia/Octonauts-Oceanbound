import * as T from 'three';
import {compassConfig as config,octopodConfig as base} from '../config/octopodConfig.js';
import {navigationState,shortestAngle,wrapDegrees} from './navigationMath.js';
import {gameplaySettings,compassSizeValue} from '../ui/gameplayPreferences.js';
import {crewMarkerLabel,crewMarkerColors,targetState} from './compassMarkers.js';
const write=(node,key,value)=>{if(node.getAttribute(key)!==value)node.setAttribute(key,value);};
const text=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
export class Compass{
 constructor(){this.element=document.createElement('aside');this.element.id='compass';write(this.element,'aria-label','World navigation compass');this.element.innerHTML=`<div class="compass-pointer" aria-hidden="true">▾</div><div class="compass-dial"><span class="north">N</span><span class="east">E</span><span class="south">S</span><span class="west">W</span></div><div class="base-bearing"><span title="Octopod"><img alt="Octopod" src="${new URL('../../assets/icons/octopod-compass.svg',import.meta.url).href}"></span></div><b class="compass-heading"></b><small class="base-distance"></small>`;document.body.append(this.element);this.element.hidden=!config.enabled;this.setSize(gameplaySettings.compassSize);this.dial=this.element.querySelector('.compass-dial');this.marker=this.element.querySelector('.base-bearing');this.cardinals=[...this.dial.querySelectorAll('span')];this.label=this.element.querySelector('.compass-heading');this.distance=this.element.querySelector('.base-distance');this.dial.hidden=!config.showCardinalDirections;this.marker.hidden=!(base.enabled&&base.navigationMarkerEnabled&&config.showOctopodMarker);this.distance.hidden=!(base.enabled&&config.showDistance);this.targets=[];this.markerLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');this.markerLayer.classList.add('compass-targets');this.markerLayer.setAttribute('aria-hidden','true');this.element.prepend(this.markerLayer);this.forward=new T.Vector3();this.orientation=new T.Quaternion();
 }
 setSize(value){const scale=compassSizeValue(value)/100;if(this.sizeScale===scale)return;this.sizeScale=scale;this.element.style.setProperty('--compass-size',config.size*scale+'px');this.element.style.setProperty('--compass-landscape-size',config.landscapeSize*scale+'px');this.compassRect=null;if(this.lastPosition)this.updateTargets(this.lastPosition);}
 setRescue(active){this.element.classList.toggle('rescue-active',!!active);this.marker.hidden=!(base.enabled&&base.navigationMarkerEnabled&&(active||config.showOctopodMarker));}
 connectDiscovery(discovery,unlocks){
  this.unsubscribe?.();this.discovery=discovery;this.unlocks=unlocks;
  this.clearTargets('gup');
  for(const record of discovery.records.values()){
   const d=record.definition;if(!d.discovery?.enabled)continue;
   this.addTarget('gup',record,d.compassLabel??d.name.replace(/^GUP[- ]?/i,''),d.compassColor??'#e8ffff',()=>!unlocks.isUnlocked(d.id));
  }
  this.unsubscribe=unlocks.subscribe(()=>this.syncTargets());this.syncTargets();
 }
 clearTargets(kind){for(const t of this.targets)if(t.kind===kind)t.node.remove();this.targets=this.targets.filter(t=>t.kind!==kind);}
 addTarget(kind,record,label,color,undiscovered){
  const node=document.createElementNS('http://www.w3.org/2000/svg','g'),text=document.createElementNS(node.namespaceURI,'text'),title=document.createElementNS(node.namespaceURI,'title');
  text.textContent=label;text.setAttribute('fill',color);text.style.color=color;title.textContent=record.definition.name;node.dataset.kind=kind;node.dataset.target=record.definition.id;node.append(title,text);this.markerLayer.append(node);this.targets.push({id:record.definition.id,kind,record,node,text,undiscovered});
 }
 connectCrew(discovery){
  this.clearTargets('crew');const registry=[...discovery.records.values()];
  for(const [i,d] of registry.entries())this.addTarget('crew',{definition:d,get pose(){return discovery.positions.get(d.id);}},crewMarkerLabel(d,registry),d.compassColor??crewMarkerColors[i%crewMarkerColors.length],()=>!discovery.isDiscovered(d.id));
  this.syncTargets();
 }
 connectAnimals(discovery,animals){
  this.clearTargets('animal');
  for(const d of discovery.records.values()){
   const record={definition:{...d,name:d.commonName},get pose(){return discovery.positions?.get(d.id)??d.position;}};
   this.addTarget('animal',record,'','#b4f5ef',()=>!discovery.isDiscovered(d.id));
   const target=this.targets[this.targets.length-1],icon=document.createElementNS(this.markerLayer.namespaceURI,'image');
   icon.setAttribute('href',animals.thumbnails.get(d.id)??d.thumbnailPath??d.visual?.thumbnailPath??'');
   icon.setAttribute('x','-11');icon.setAttribute('y','-11');icon.setAttribute('width','22');icon.setAttribute('height','22');
   target.text.replaceWith(icon);target.text=icon;
  }
  this.syncTargets();
 }
 syncTargets(){
  for(const t of this.targets){const enabled=gameplaySettings[t.kind==='animal'?'showAnimalIcons':t.kind==='crew'?'showOctonautLetters':'showGupLetters'];t.visible=enabled&&t.undiscovered()&&!!t.record.pose&&['x','y','z'].every(k=>Number.isFinite(t.record.pose[k]));const display=t.visible?'':'none';if(t.node.style.display!==display)t.node.style.display=display;if(!t.visible)t.node.classList.remove('nearby');}
 }

 updateTargets(position){
  this.lastPosition=position;this.syncTargets();
  if(!this.compassRect||this.viewportWidth!==innerWidth||this.viewportHeight!==innerHeight){this.viewportWidth=innerWidth;this.viewportHeight=innerHeight;this.compassRect=this.element.getBoundingClientRect();this.markerLayer.setAttribute('viewBox',`${-this.compassRect.width/2} ${-this.compassRect.height/2} ${this.compassRect.width} ${this.compassRect.height}`);}
  const radius=this.compassRect.width/2-1;
  for(const t of this.targets)if(t.visible){
   const state=targetState(position,wrapDegrees(this.angle),t.record.pose,t.record.definition.discovery?.compassHighlightDistance??config.discoveryHighlightDistance),relative=state.relative.toFixed(2);
   // Match the base: rotate the bearing around the center and counter-rotate
   // the artwork, keeping every letter upright on the compass rim.
   write(t.node,'transform',`rotate(${relative})`);if(t.kind==='animal')write(t.text,'transform',`translate(0 ${-radius}) rotate(${-relative})`);else{write(t.text,'x','0');write(t.text,'y',String(-radius));write(t.text,'transform',`rotate(${-relative} 0 ${-radius})`);}
   t.node.classList.toggle('nearby',state.proximity>0);const proximity=state.proximity.toFixed(1);if(t.proximity!==proximity){t.proximity=proximity;t.node.style.setProperty('--proximity',proximity);}write(t.node,'data-bearing',state.bearing.toFixed(2));write(t.node,'data-relative',relative);
  }
 }

 dispose(){this.unsubscribe?.();this.element.remove();}
 update(dt,vehicle){if(!config.enabled)return;vehicle.getWorldQuaternion(this.orientation);this.forward.set(0,0,1).applyQuaternion(this.orientation);const p=vehicle.position,state=navigationState(p,this.forward,base.position);this.angle??=state.heading;this.angle+=shortestAngle(wrapDegrees(this.angle),state.heading)*(1-Math.exp(-dt*config.smoothing));this.dial.style.transform=`rotate(${-this.angle}deg)`;const relative=shortestAngle(wrapDegrees(this.angle),state.bearing);this.marker.style.transform=`rotate(${relative}deg)`;this.marker.firstElementChild.style.transform=`rotate(${-relative}deg)`;for(const span of this.cardinals)span.style.transform=`rotate(${this.angle}deg)`;text(this.label,Math.round(wrapDegrees(this.angle))%360+'°');this.updateTargets(p);text(this.distance,'Octopod '+Math.round(state.distance)+' m · game');write(this.element,'aria-label',`Heading ${Math.round(state.heading)} degrees. Octopod ${Math.round(state.distance)} game metres away.`);write(this.element,'data-heading',state.heading.toFixed(2));write(this.element,'data-bearing',state.bearing.toFixed(2));}
}
