import {cameraConfig} from '../config/worldConfig.js';
import {cameraDefaults,loadCameraSettings,saveCameraSettings} from './cameraPreferences.js';
export function installSettings(){
 let storage;try{storage=window.localStorage;}catch{}
 Object.assign(cameraConfig,loadCameraSettings(storage));
 const toggle=document.querySelector('#menuToggle'),menu=document.querySelector('#gameMenu'),dialog=document.querySelector('#settingsDialog');
 const clear=()=>window.explorer?.input?.clear();
 const closeMenu=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{clear();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#navigation'))closeMenu();});
 document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!dialog.open){closeMenu();toggle.focus();}});
 const sync=()=>{for(const key of ['distance','height']){document.querySelector('#camera-'+key).value=cameraConfig[key];document.querySelector('#value-'+key).value=cameraConfig[key].toFixed(1)+' m';}};
 document.querySelector('#openSettings').onclick=()=>{closeMenu();clear();sync();dialog.showModal();};
 document.querySelector('#closeSettings').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{clear();toggle.focus();});
 for(const key of ['distance','height'])document.querySelector('#camera-'+key).addEventListener('input',e=>{cameraConfig[key]=Number(e.target.value);sync();document.querySelector('#settingsSaved').textContent=saveCameraSettings(storage,cameraConfig)?'Saved on this device.':'Applied for this session.';});
 document.querySelector('#resetCamera').onclick=()=>{Object.assign(cameraConfig,cameraDefaults);sync();document.querySelector('#settingsSaved').textContent=saveCameraSettings(storage,cameraConfig)?'Default camera restored and saved.':'Default camera restored for this session.';};
 sync();
}
