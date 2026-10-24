import {installGraphicsSettings} from './GraphicsSettings.js';
import {audioDefaults,volumeKeys} from '../audio/AudioSettings.js';
import {cameraConfig} from '../config/worldConfig.js';
import {cameraFields,cameraDefaults,loadCameraSettings,saveCameraSettings} from './cameraPreferences.js';

export function installSettings(){
 let storage;try{storage=window.localStorage;}catch{}
 Object.assign(cameraConfig,loadCameraSettings(storage));
 const toggle=document.querySelector('#menuToggle'),dialog=document.querySelector('#settingsDialog');
 const audioPanel=document.querySelector('#audioPanel'),cameraPanel=document.querySelector('#cameraPanel');
 const status=document.querySelector('#settingsSaved');
 const title=document.querySelector('#settingsTitle');title.tabIndex=-1;
 const clear=()=>window.explorer?.input?.clear();
 let keyboardFocus=false,closeTimer;
 document.addEventListener('keydown',e=>{if(['Tab','Enter','Space','Escape'].includes(e.code)){keyboardFocus=true;if(document.activeElement===toggle)toggle.dataset.keyboardFocus='';}},true);
 document.addEventListener('pointerdown',()=>{keyboardFocus=false;delete toggle.dataset.keyboardFocus;},true);
 toggle.addEventListener('focus',()=>{if(keyboardFocus)toggle.dataset.keyboardFocus='';});
 toggle.addEventListener('blur',()=>{delete toggle.dataset.keyboardFocus;});

 // Keep native range/checkbox behavior and accessibility, with reusable monitor rows.
 const range=(parent,id,title,min,max,step)=>{
  const row=document.createElement('div');row.className='setting-row';
  const label=document.createElement('label'),output=document.createElement('output'),input=document.createElement('input');
  input.id=id;input.type='range';input.min=min;input.max=max;input.step=step;label.htmlFor=id;label.textContent=title;output.htmlFor=id;output.id='value-'+id;label.append(output);
  row.append(label,input);parent.append(row);return {input,output};
 };
 const check=(parent,id,title,change)=>{
  const label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');
  label.className='setting-check';input.type='checkbox';input.id=id;text.textContent=title;label.append(input,text);parent.append(label);input.addEventListener('change',()=>change(input.checked));return input;
 };
 const fill=input=>input.style.setProperty('--range',`${100*(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))}%`);
 const intro=(parent,title,text)=>{const h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.className='section-description';p.textContent=text;parent.append(h,p);};
 const grid=parent=>{const element=document.createElement('div');element.className='settings-grid';parent.append(element);return element;};
 const resetButton=(parent,title,change)=>{const button=document.createElement('button');button.className='settings-reset';button.type='button';button.textContent=title;button.addEventListener('click',change);parent.append(button);return button;};
 const audioNames={master:'Master Volume',music:'Background Music',propeller:'GUP Propeller',bubbles:'Underwater Bubbles',ambience:'Ocean Ambience',turbo:'Turbo'};
 intro(audioPanel,'Sounds of the ocean','Find your balance for the next dive.');
 const audioGrid=grid(audioPanel),audioControls={};
 const syncAudio=()=>{const settings=window.explorer?.audio?.settings??audioDefaults;for(const key of volumeKeys){const {input,output}=audioControls[key];input.value=Math.round(settings[key]*100);output.value=input.value+'%';fill(input);}mute.checked=settings.muted;musicEnabled.checked=settings.musicEnabled;};
 const audioStatus=()=>{status.textContent=window.explorer?.audio?.saved?'Audio settings saved on this device.':'Audio settings applied for this session.';};
 for(const key of volumeKeys){const control=audioControls[key]=range(audioGrid,'audio-'+key,audioNames[key],0,100,1);if(key==='master')control.input.parentElement.classList.add('setting-wide');control.input.addEventListener('input',()=>{window.explorer?.audio?.setChannelVolume(key,Number(control.input.value)/100);syncAudio();audioStatus();});}
 const switches=grid(audioPanel);
 const musicEnabled=check(switches,'audio-music-enabled','Enable music',value=>{window.explorer?.audio?.setMusicEnabled(value);syncAudio();audioStatus();});
 const mute=check(switches,'audio-muted','Mute all audio',value=>{window.explorer?.audio?.setMuted(value);syncAudio();audioStatus();});
 resetButton(audioPanel,'Reset audio defaults',()=>{window.explorer?.audio?.resetSettings();syncAudio();audioStatus();});

 intro(cameraPanel,'Your view of the ocean','Adjust your view while you explore.');
 const cameraGrid=grid(cameraPanel),cameraControls={};
 const advanced=document.createElement('details');advanced.className='camera-advanced';const summary=document.createElement('summary');summary.textContent='Advanced camera tuning';advanced.append(summary);cameraPanel.append(advanced);const advancedGrid=grid(advanced);
 const syncCamera=()=>{for(const [key,field] of Object.entries(cameraFields)){const {input,output}=cameraControls[key];if(field.length===1)input.checked=cameraConfig[key];else{input.value=cameraConfig[key];output.value=Number(cameraConfig[key].toFixed(3))+field[4];fill(input);}}};
 const saveCamera=()=>{syncCamera();status.textContent=saveCameraSettings(storage,cameraConfig)?'Camera settings saved on this device.':'Camera settings applied for this session.';};
 for(const [key,field] of Object.entries(cameraFields)){
  const parent=['distance','height'].includes(key)?cameraGrid:advancedGrid;
  if(field.length===1){const input=check(parent,'camera-'+key,field[0],value=>{cameraConfig[key]=value;saveCamera();});cameraControls[key]={input};}
  else{const control=cameraControls[key]=range(parent,'camera-'+key,field[0],field[1],field[2],field[3]);control.input.addEventListener('input',()=>{cameraConfig[key]=Number(control.input.value);saveCamera();});}
 }
 resetButton(cameraPanel,'Reset camera defaults',()=>{Object.assign(cameraConfig,cameraDefaults);syncCamera();status.textContent=saveCameraSettings(storage,cameraConfig)?'Default camera restored and saved.':'Default camera restored for this session.';}).id='resetCamera';

 // Reset gameplay discoveries; preserve browser and preference storage.
 const gameplayTab=document.createElement('button'),gameplayPanel=document.createElement('section');
 gameplayTab.id='gameplayTab';gameplayTab.type='button';gameplayTab.role='tab';gameplayTab.setAttribute('aria-selected','false');gameplayTab.setAttribute('aria-controls','gameplayPanel');gameplayTab.tabIndex=-1;gameplayTab.textContent='Gameplay';
 gameplayPanel.id='gameplayPanel';gameplayPanel.role='tabpanel';gameplayPanel.setAttribute('aria-labelledby','gameplayTab');gameplayPanel.hidden=true;
 dialog.querySelector('.settings-tabs').append(gameplayTab);dialog.querySelector('.monitor-content').append(gameplayPanel);
 intro(gameplayPanel,'Start a fresh adventure','Reset GUP and animal discoveries and restart in GUP-B at the Octopod. Audio and camera preferences stay saved.');
 const confirmation=document.createElement('div');confirmation.hidden=true;confirmation.setAttribute('role','group');confirmation.setAttribute('aria-label','Confirm gameplay reset');
 const warning=document.createElement('p');warning.textContent='Reset all GUP and animal discoveries? Your unlocked fleet and Creature Collection progress will be cleared and the game will restart. This cannot be undone.';confirmation.append(warning);
 const reset=resetButton(gameplayPanel,'Reset gameplay progress',()=>{confirmation.hidden=false;reset.hidden=true;confirm.focus();});reset.id='resetGameplay';
 const cancel=resetButton(confirmation,'Keep my progress',()=>{confirmation.hidden=true;reset.hidden=false;reset.focus();});cancel.id='cancelGameplayReset';
 const confirm=resetButton(confirmation,'Yes, reset and restart',()=>{
  const game=window.explorer;if(!game?.ready)return;
  confirm.disabled=cancel.disabled=true;game.input.clear();
  try{game.unlocks.reset();game.marineDiscovery.reset();game.marineCollection.updateCounter();if(!game.unlocks.saved||!game.marineDiscovery.saved)throw Error('Save unavailable');location.reload();}
  catch{status.textContent='Progress could not be saved. Please allow site storage and try again.';confirm.disabled=cancel.disabled=false;}
 });confirm.id='confirmGameplayReset';gameplayPanel.append(confirmation);
 dialog.addEventListener('close',()=>{confirmation.hidden=true;reset.hidden=false;});
 const syncGraphics=installGraphicsSettings(dialog,storage,status);
 const tabs=[...dialog.querySelectorAll('[role=tab]')];for(const tab of tabs){tab.style.minWidth='0';tab.style.flex='1';tab.style.padding='0 8px';}
 const selectTab=tab=>{for(const button of tabs){const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;document.getElementById(button.getAttribute('aria-controls')).hidden=!selected;}dialog.querySelector('.monitor-content').scrollTop=0;};
 for(const tab of tabs){tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs[(tabs.indexOf(tab)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];selectTab(next);next.focus();});}
 const close=()=>{if(!dialog.open||dialog.classList.contains('is-closing'))return;dialog.classList.add('is-closing');clear();closeTimer=setTimeout(()=>dialog.close(),200);};
 toggle.onclick=()=>{if(dialog.open){close();return;}clearTimeout(closeTimer);dialog.classList.remove('is-closing');clear();syncCamera();syncAudio();syncGraphics();toggle.setAttribute('aria-expanded','true');dialog.showModal();title.focus({preventScroll:true});};
 document.querySelector('#closeSettings').onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('close',()=>{clearTimeout(closeTimer);dialog.classList.remove('is-closing');toggle.setAttribute('aria-expanded','false');clear();toggle.focus();});
 syncCamera();syncAudio();
}
