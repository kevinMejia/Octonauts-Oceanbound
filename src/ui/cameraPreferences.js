import {cameraConfig} from '../config/worldConfig.js';
export const cameraFields={
 distance:['Distance behind (Z)',6,40,.1,' m'],height:['Height above (Y)',1,20,.1,' m'],
 horizontalAngle:['Side angle',-30,30,1,'°'],downwardAngle:['Downward viewing angle',5,30,1,'°'],
 fov:['Field of view',50,80,1,'°'],positionSmoothing:['Position response',3,15,.5,' /s'],rotationSmoothing:['Rotation response',4,20,.5,' /s'],
 orbitSensitivity:['Orbit sensitivity',.002,.01,.001,''],returnDelay:['Recenter delay',0,8,.5,' s'],
 speedDistanceIncrease:['High-speed extra distance',0,.2,.01,''],speedFovIncrease:['High-speed extra FOV',0,6,.5,'°'],
 collisionEnabled:['Avoid camera obstructions'],
};
export const cameraDefaults=Object.fromEntries(Object.keys(cameraFields).map(k=>[k,cameraConfig[k]]));
export function cameraValues(value={}){
 const finite=(n,fallback,min,max)=>typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
 return Object.fromEntries(Object.entries(cameraFields).map(([key,field])=>[key,field.length===1?(typeof value?.[key]==='boolean'?value[key]:cameraDefaults[key]):finite(value?.[key],cameraDefaults[key],field[1],field[2])]));
}
export function loadCameraSettings(storage){try{return cameraValues(JSON.parse(storage.getItem('oceanbound.camera.v1')??'{}'));}catch{return {...cameraDefaults};}}
export function saveCameraSettings(storage,value){try{storage.setItem('oceanbound.camera.v1',JSON.stringify(cameraValues(value)));return true;}catch{return false;}}
