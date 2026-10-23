import {cameraConfig} from '../config/worldConfig.js';
import {cameraFields,cameraDefaults,loadCameraSettings,saveCameraSettings} from './cameraPreferences.js';
export function installSettings(){
 let storage;try{storage=window.localStorage;}catch{}
 Object.assign(cameraConfig,loadCameraSettings(storage));
 const toggle=document.querySelector('#menuToggle'),menu=document.querySelector('#gameMenu'),dialog=document.querySelector('#settingsDialog');
 const clear=()=>window.explorer?.input?.clear();
 const closeMenu=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{clear();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#navigation'))closeMenu();});
 document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!dialog.open){closeMenu();toggle.focus();}});
 const soundLabel=document.createElement('label');soundLabel.htmlFor='master-volume';soundLabel.textContent='Sound volume';
 const soundOutput=document.createElement('output');soundLabel.append(soundOutput);
 const soundVolume=document.createElement('input');soundVolume.id='master-volume';soundVolume.type='range';soundVolume.min=0;soundVolume.max=100;soundVolume.step=1;
 const syncSound=()=>{soundVolume.value=Math.round((window.explorer?.audio?.volume??.65)*100);soundOutput.value=soundVolume.value+'%';};
 soundVolume.addEventListener('input',()=>{window.explorer?.audio?.setVolume(Number(soundVolume.value)/100);syncSound();});
 dialog.insertBefore(soundLabel,dialog.querySelector('h3'));dialog.insertBefore(soundVolume,dialog.querySelector('h3'));syncSound();
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
