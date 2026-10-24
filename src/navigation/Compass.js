import * as T from 'three';
import {compassConfig as config,octopodConfig as base} from '../config/octopodConfig.js';
import {navigationState,shortestAngle,wrapDegrees} from './navigationMath.js';
import {targetState} from './compassMarkers.js';
export class Compass{
 constructor(){this.element=document.createElement('aside');this.element.id='compass';this.element.setAttribute('aria-label','World navigation compass');this.element.innerHTML=`<div class="compass-pointer" aria-hidden="true">▾</div><div class="compass-dial"><span class="north">N</span><span class="east">E</span><span class="south">S</span><span class="west">W</span></div><div class="base-bearing"><span title="Octopod"><img alt="Octopod" src="${new URL('../../assets/icons/octopod-compass.svg',import.meta.url).href}"></span></div><b class="compass-heading"></b><small class="base-distance"></small>`;document.body.append(this.element);this.element.hidden=!config.enabled;this.element.style.setProperty('--compass-size',config.size+'px');this.dial=this.element.querySelector('.compass-dial');this.marker=this.element.querySelector('.base-bearing');this.cardinals=[...this.dial.querySelectorAll('span')];this.label=this.element.querySelector('.compass-heading');this.distance=this.element.querySelector('.base-distance');this.dial.hidden=!config.showCardinalDirections;this.marker.hidden=!(base.enabled&&base.navigationMarkerEnabled&&config.showOctopodMarker);this.distance.hidden=!(base.enabled&&config.showDistance);this.targets=[];this.markerLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');this.markerLayer.classList.add('compass-targets');this.markerLayer.setAttribute('aria-hidden','true');this.element.prepend(this.markerLayer);this.forward=new T.Vector3();this.orientation=new T.Quaternion();
 }
 setRescue(active){this.element.classList.toggle('rescue-active',!!active);this.marker.hidden=!(base.enabled&&base.navigationMarkerEnabled&&(active||config.showOctopodMarker));}
 connectDiscovery(discovery,unlocks){
  this.unsubscribe?.();this.discovery=discovery;this.unlocks=unlocks;
  for(const t of this.targets)t.node.remove();this.targets=[];
  for(const record of discovery.records.values()){
   const d=record.definition;if(!d.discovery?.enabled)continue;
   const node=document.createElementNS('http://www.w3.org/2000/svg','g'),text=document.createElementNS(node.namespaceURI,'text');
   text.textContent=d.compassLabel??d.name.replace(/^GUP[- ]?/i,'');text.setAttribute('fill',d.compassColor??'#e8ffff');text.style.color=d.compassColor??'#e8ffff';node.append(text);this.markerLayer.append(node);this.targets.push({id:d.id,record,node,text});
  }
  const sync=()=>{for(const t of this.targets){t.visible=!unlocks.isUnlocked(t.id)&&!!t.record.pose&&['x','y','z'].every(k=>Number.isFinite(t.record.pose[k]));t.node.style.display=t.visible?'':'none';if(!t.visible)t.node.classList.remove('nearby');}};
  this.unsubscribe=unlocks.subscribe(sync);sync();
 }
 updateTargets(position){
  if(this.viewportWidth!==innerWidth||this.viewportHeight!==innerHeight){this.viewportWidth=innerWidth;this.viewportHeight=innerHeight;this.compassRect=this.element.getBoundingClientRect();this.markerLayer.setAttribute('viewBox',`${-this.compassRect.width/2} ${-this.compassRect.height/2} ${this.compassRect.width} ${this.compassRect.height}`);}
  const radius=this.compassRect.width/2-1;
  for(const t of this.targets)if(t.visible){
   const state=targetState(position,wrapDegrees(this.angle),t.record.pose,t.record.definition.discovery.compassHighlightDistance??config.discoveryHighlightDistance),relative=state.relative.toFixed(2);
   // Match the base: rotate the bearing around the center and counter-rotate
   // the artwork, keeping every letter upright on the compass rim.
   const write=(node,key,value)=>{if(node.getAttribute(key)!==value)node.setAttribute(key,value);};
   write(t.node,'transform',`rotate(${relative})`);write(t.text,'x','0');write(t.text,'y',String(-radius));write(t.text,'transform',`rotate(${-relative} 0 ${-radius})`);
   t.node.classList.toggle('nearby',state.proximity>0);const proximity=state.proximity.toFixed(1);if(t.proximity!==proximity){t.proximity=proximity;t.node.style.setProperty('--proximity',proximity);}t.node.dataset.bearing=state.bearing.toFixed(2);t.node.dataset.relative=relative;t.node.dataset.target=t.id;
  }
 }

 dispose(){this.unsubscribe?.();this.element.remove();}
 update(dt,vehicle){if(!config.enabled)return;vehicle.getWorldQuaternion(this.orientation);this.forward.set(0,0,1).applyQuaternion(this.orientation);const p=vehicle.position,state=navigationState(p,this.forward,base.position);this.angle??=state.heading;this.angle+=shortestAngle(wrapDegrees(this.angle),state.heading)*(1-Math.exp(-dt*config.smoothing));this.dial.style.transform=`rotate(${-this.angle}deg)`;const relative=shortestAngle(wrapDegrees(this.angle),state.bearing);this.marker.style.transform=`rotate(${relative}deg)`;this.marker.firstElementChild.style.transform=`rotate(${-relative}deg)`;for(const span of this.cardinals)span.style.transform=`rotate(${this.angle}deg)`;this.label.textContent=Math.round(wrapDegrees(this.angle))%360+'°';this.updateTargets(p);this.distance.textContent='Octopod '+Math.round(state.distance)+' m · game';this.element.setAttribute('aria-label',`Heading ${Math.round(state.heading)} degrees. Octopod ${Math.round(state.distance)} game metres away.`);this.element.dataset.heading=state.heading.toFixed(2);this.element.dataset.bearing=state.bearing.toFixed(2);}
}
