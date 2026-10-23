export const defaultVehicleId='gup-b';
// New exports and thumbnails intentionally remain in the ignored local workspace.
// Existing published GUP-B geometry is reused verbatim, never regenerated here.
const thumbnail=id=>'/.local-assets/vehicle-selection/thumbnails/'+id+'.png';
const audio={propellerGain:1,bubbleGain:1,rateMultiplier:1};
export const vehicles=[
 {id:'gup-a',name:'GUP-A',modelPath:'/.local-assets/vehicle-selection/GupA/gup-a.glb',thumbnailPath:thumbnail('gup-a'),localOnly:true,scale:1,orientation:0,collision:{radius:2.65,halfHeight:2.3,halfLength:3,terrainClearance:2.15,surfaceClearance:2.8},propellers:[{name:'Propeller',axis:'z',direction:1}],camera:{distanceMultiplier:1.1},movement:{},audio},
 {id:'gup-b',name:'GUP-B',modelPath:'../../assets/models/gup-b-high.glb',thumbnailPath:thumbnail('gup-b'),localOnly:false,scale:1,orientation:0,collision:{radius:2.2,halfHeight:1.1,halfLength:3,terrainClearance:1.7,surfaceClearance:2.5},propellers:[],camera:{distanceMultiplier:1},movement:{},audio},
 {id:'gup-r',name:'GUP-R',modelPath:'/.local-assets/vehicle-selection/GupR/gup-r.glb',thumbnailPath:thumbnail('gup-r'),localOnly:true,scale:1,orientation:0,collision:{radius:2.2,halfHeight:2.15,halfLength:3,terrainClearance:1.7,surfaceClearance:2.7},propellers:[],camera:{distanceMultiplier:1},movement:{},audio},
];
export function vehicleById(id){const vehicle=vehicles.find(v=>v.id===id);if(!vehicle)throw new Error('Unknown vehicle: '+id);return vehicle;}
export function vehicleModelURL(definition,base=globalThis.location?.href??import.meta.url){return new URL(definition.modelPath,definition.modelPath.startsWith('/')?base:import.meta.url).href;}
export function vehicleThumbnailURL(definition,base=globalThis.location?.href??import.meta.url){return new URL(definition.thumbnailPath,base).href;}
export const wrapVehicleIndex=(index,count)=>((index%count)+count)%count;
export function carouselNeighbors(index,count){return [-1,0,1].map(offset=>({index:wrapVehicleIndex(index+offset,count),offset}));}
