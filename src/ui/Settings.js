import {audioDefaults,volumeKeys} from '../audio/AudioSettings.js';
import {cameraConfig} from '../config/worldConfig.js';
import {cameraFields,cameraDefaults,loadCameraSettings,saveCameraSettings} from './cameraPreferences.js';
export function installSettings(){
 let storage;try{storage=window.localStorage;}catch{}
 Object.assign(cameraConfig,loadCameraSettings(storage));
 const toggle=document.querySelector('#menuToggle'),menu=document.querySelector('#gameMenu'),dialog=document.querySelector('#settingsDialog');
 // Keep the badge's focus ring exclusive to keyboard navigation, including
 // programmatic focus restoration after closing the settings dialog.
 let keyboardFocus=false;
 document.addEventListener('keydown',e=>{if(['Tab','Enter','Space','Escape'].includes(e.code)){keyboardFocus=true;if(document.activeElement===toggle)toggle.dataset.keyboardFocus='';}},true);
 document.addEventListener('pointerdown',()=>{keyboardFocus=false;delete toggle.dataset.keyboardFocus;},true);
 toggle.addEventListener('focus',()=>{if(keyboardFocus)toggle.dataset.keyboardFocus='';});
 toggle.addEventListener('blur',()=>{delete toggle.dataset.keyboardFocus;});
 const clear=()=>window.explorer?.input?.clear();
 const closeMenu=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{clear();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#navigation'))closeMenu();});
 document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!dialog.open){closeMenu();toggle.focus();}});
 const audioSection=document.createElement('details');audioSection.className='camera-advanced audio-settings';
 const audioSummary=document.createElement('summary');audioSummary.textContent='Audio Settings';audioSection.append(audioSummary);
 const audioInputs={},audioOutputs={},audioNames={master:'Master Volume',music:'Background Music',propeller:'GUP-B Propeller',bubbles:'Underwater Bubbles',ambience:'Ocean Ambience'};
 const syncSound=()=>{const settings=window.explorer?.audio?.settings??audioDefaults;for(const key of volumeKeys){audioInputs[key].value=Math.round(settings[key]*100);audioOutputs[key].value=audioInputs[key].value+'%';}mute.checked=settings.muted;musicEnabled.checked=settings.musicEnabled;};
 const soundStatus=()=>{document.querySelector('#settingsSaved').textContent=window.explorer?.audio?.saved?'Audio settings saved on this device.':'Audio settings applied for this session.';};
 for(const key of volumeKeys){const label=document.createElement('label'),input=document.createElement('input'),output=document.createElement('output');
  label.htmlFor=input.id='audio-'+key;label.textContent=audioNames[key];output.htmlFor=input.id;label.append(output);input.type='range';input.min=0;input.max=100;input.step=1;
  input.addEventListener('input',()=>{window.explorer?.audio?.setChannelVolume(key,Number(input.value)/100);syncSound();soundStatus();});audioInputs[key]=input;audioOutputs[key]=output;audioSection.append(label,input);
 }
 const checkbox=(text,id,change)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';label.htmlFor=input.id=id;label.textContent=text;input.addEventListener('change',()=>{change(input.checked);syncSound();soundStatus();});audioSection.append(label,input);return input;};
 const musicEnabled=checkbox('Enable music','audio-music-enabled',value=>window.explorer?.audio?.setMusicEnabled(value));
 const mute=checkbox('Mute all audio','audio-muted',value=>window.explorer?.audio?.setMuted(value));
 const resetAudio=document.createElement('button');resetAudio.type='button';resetAudio.className='reset-audio';resetAudio.textContent='Reset to Defaults';resetAudio.addEventListener('click',()=>{window.explorer?.audio?.resetSettings();syncSound();soundStatus();});audioSection.append(resetAudio);
 dialog.insertBefore(audioSection,dialog.querySelector('h3'));syncSound();
 const advanced=document.createElement('details');advanced.className='camera-advanced';const summary=document.createElement('summary');summary.textContent='Camera tuning';advanced.append(summary);
 for(const [key,field] of Object.entries(cameraFields)){if(['distance','height'].includes(key))continue;const label=document.createElement('label'),input=document.createElement('input');label.htmlFor=input.id='camera-'+key;label.textContent=field[0];input.type=field.length===1?'checkbox':'range';if(field.length>1){input.min=field[1];input.max=field[2];input.step=field[3];const output=document.createElement('output');output.id='value-'+key;label.append(output);}advanced.append(label,input);}
 dialog.insertBefore(advanced,document.querySelector('#resetCamera'));
 const sync=()=>{for(const [key,field] of Object.entries(cameraFields)){const input=document.querySelector('#camera-'+key);if(field.length===1)input.checked=cameraConfig[key];else{input.value=cameraConfig[key];document.querySelector('#value-'+key).value=Number(cameraConfig[key].toFixed(3))+field[4];}}};
 document.querySelector('#openSettings').onclick=()=>{closeMenu();clear();sync();syncSound();dialog.showModal();};
 document.querySelector('#closeSettings').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{clear();toggle.focus();});
 for(const [key,field] of Object.entries(cameraFields))document.querySelector('#camera-'+key).addEventListener('input',e=>{cameraConfig[key]=field.length===1?e.target.checked:Number(e.target.value);sync();document.querySelector('#settingsSaved').textContent=saveCameraSettings(storage,cameraConfig)?'Saved on this device.':'Applied for this session.';});
 document.querySelector('#resetCamera').onclick=()=>{Object.assign(cameraConfig,cameraDefaults);sync();document.querySelector('#settingsSaved').textContent=saveCameraSettings(storage,cameraConfig)?'Default camera restored and saved.':'Default camera restored for this session.';};
 sync();
}
