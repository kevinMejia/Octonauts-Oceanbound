import {loadGraphicsMode,saveGraphicsMode} from './graphicsPreferences.js';
import {graphicsSelection} from '../config/environmentConfig.js';

export function installGraphicsSettings(dialog,storage,status){
 const tab=document.createElement('button');tab.id='graphicsTab';tab.type='button';tab.role='tab';tab.textContent='Graphics';tab.tabIndex=-1;tab.setAttribute('aria-selected','false');tab.setAttribute('aria-controls','graphicsPanel');
 const panel=document.createElement('section');panel.id='graphicsPanel';panel.role='tabpanel';panel.hidden=true;panel.setAttribute('aria-labelledby','graphicsTab');
 panel.innerHTML=`<h3>Your ocean, your way</h3><p class="section-description">Choose richer scenery or a lighter dive. Auto balances the view for your device.</p><p id="graphicsCurrent" class="graphics-current"></p><div class="setting-row"><label for="graphicsMode">Graphics mode</label><select id="graphicsMode" aria-describedby="graphicsModeDescription graphicsRestartNote"><option value="auto">Auto</option><option value="performance">Performance</option><option value="beautiful">Beautiful</option></select></div><p id="graphicsModeDescription" class="section-description"></p><p id="graphicsRestartNote" class="section-description">Restart at the Octopod to apply. Your discoveries and preferences stay saved.</p><button id="applyGraphics" class="settings-reset" type="button">Apply and restart</button>`;
 dialog.querySelector('.settings-tabs').append(tab);dialog.querySelector('.monitor-content').append(panel);
 const select=panel.querySelector('#graphicsMode'),apply=panel.querySelector('#applyGraphics'),description=panel.querySelector('#graphicsModeDescription');
 const descriptions={auto:'Starts with a suitable preset and adjusts resolution during play to keep your dive smooth.',performance:'Lighter scenery, fewer particles, softer sun rays and no real-time shadows.',beautiful:'Soft sun shadows, richer lighting, stronger sun rays and more distant scenery.'};
 const active=()=>window.explorer?.graphics??graphicsSelection();
 const update=()=>{description.textContent=descriptions[select.value];apply.disabled=select.value===active().mode&&!active().override;};
 const sync=()=>{select.value=active().mode??loadGraphicsMode(storage);panel.querySelector('#graphicsCurrent').textContent='This dive: '+(active().quality==='high'?'Beautiful':'Performance')+(active().adaptive?' · Auto resolution':'');update();};
 select.addEventListener('change',update);
 apply.addEventListener('click',()=>{
  if(!saveGraphicsMode(storage,select.value)){status.textContent='Graphics settings could not be saved. Allow site storage and try again.';return;}
  window.explorer?.input?.clear();apply.disabled=true;
  const url=new URL(location.href);url.searchParams.delete('quality');location.replace(url.href);
 });
 sync();return sync;
}
