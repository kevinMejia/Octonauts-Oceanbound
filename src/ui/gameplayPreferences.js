import {cameraShakeConfig} from '../config/cameraShakeConfig.js';
export const gameplayDefaults=Object.freeze({cameraShake:cameraShakeConfig.enabled,shakeIntensity:cameraShakeConfig.intensity,unlockGupX:false,showGupLetters:true,showOctonautLetters:true,showAnimalIcons:false,compassSize:100});
export const compassSizeLimits=Object.freeze({min:75,max:150,step:5});
export function compassSizeValue(value){return typeof value==='number'&&Number.isFinite(value)?Math.max(compassSizeLimits.min,Math.min(compassSizeLimits.max,Math.round(value/compassSizeLimits.step)*compassSizeLimits.step)):gameplayDefaults.compassSize;}
export const gameplaySettings={...gameplayDefaults};
export function gameplayValues(value){return Object.fromEntries(Object.entries(gameplayDefaults).map(([key,fallback])=>[key,key==='shakeIntensity'?(typeof value?.[key]==='number'&&Number.isFinite(value[key])?Math.max(0,Math.min(1,value[key])):fallback):key==='compassSize'?compassSizeValue(value?.[key]):typeof value?.[key]==='boolean'?value[key]:fallback]));}
export function loadGameplaySettings(storage){try{return gameplayValues(JSON.parse(storage?.getItem('oceanbound.gameplay.v1')??'null'));}catch{return {...gameplayDefaults};}}
export function saveGameplaySettings(storage,value){try{if(!storage)return false;storage.setItem('oceanbound.gameplay.v1',JSON.stringify(gameplayValues(value)));return true;}catch{return false;}}
