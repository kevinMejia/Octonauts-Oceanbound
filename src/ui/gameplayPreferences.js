export const gameplayDefaults=Object.freeze({showGupLetters:true,showOctonautLetters:true});
export const gameplaySettings={...gameplayDefaults};
export function gameplayValues(value){return Object.fromEntries(Object.entries(gameplayDefaults).map(([key,fallback])=>[key,typeof value?.[key]==='boolean'?value[key]:fallback]));}
export function loadGameplaySettings(storage){try{return gameplayValues(JSON.parse(storage?.getItem('oceanbound.gameplay.v1')??'null'));}catch{return {...gameplayDefaults};}}
export function saveGameplaySettings(storage,value){try{if(!storage)return false;storage.setItem('oceanbound.gameplay.v1',JSON.stringify(gameplayValues(value)));return true;}catch{return false;}}
