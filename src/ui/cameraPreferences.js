import {cameraConfig} from '../config/worldConfig.js';
export const cameraDefaults={distance:cameraConfig.distance,height:cameraConfig.height};
export function cameraValues(value={}){
 const finite=(n,fallback,min,max)=>typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
 return {distance:finite(value?.distance,cameraDefaults.distance,6,40),height:finite(value?.height,cameraDefaults.height,1,20)};
}
export function loadCameraSettings(storage){try{return cameraValues(JSON.parse(storage.getItem('oceanbound.camera.v1')??'{}'));}catch{return {...cameraDefaults};}}
export function saveCameraSettings(storage,value){try{storage.setItem('oceanbound.camera.v1',JSON.stringify(cameraValues(value)));return true;}catch{return false;}}
