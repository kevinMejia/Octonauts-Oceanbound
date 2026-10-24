export const GRAPHICS_KEY='oceanbound.graphics.v1';
export const graphicsModes=['auto','performance','beautiful'];
export function loadGraphicsMode(storage){try{const saved=JSON.parse(storage?.getItem(GRAPHICS_KEY)??'null');return saved?.version===1&&graphicsModes.includes(saved.mode)?saved.mode:'auto';}catch{return 'auto';}}
export function saveGraphicsMode(storage,mode){if(!graphicsModes.includes(mode))return false;try{storage.setItem(GRAPHICS_KEY,JSON.stringify({version:1,mode}));return true;}catch{return false;}}
export function chooseGraphics({mode='auto',qualityOverride,coarsePointer=false,userAgent='',deviceMemory}={}){
 if(!graphicsModes.includes(mode))mode='auto';
 const constrained=coarsePointer||/iPhone|iPad|iPod/i.test(userAgent)||(Number.isFinite(deviceMemory)&&deviceMemory>0&&deviceMemory<=4);
 const override=['low','high'].includes(qualityOverride);
 const quality=override?qualityOverride:mode==='performance'?'low':mode==='beautiful'?'high':constrained?'low':'high';
 return {mode,quality,adaptive:mode==='auto'&&!override,override,constrained};
}
