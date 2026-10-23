export const defaultVehicleId='gup-b';
// Deploy runtime exports and thumbnails; original authoring downloads stay separate.
// Existing published GUP-B geometry is reused verbatim, never regenerated here.
const thumbnail=id=>'../../assets/img/vehicles/'+id+'.png';
const audio={propellerGain:1,bubbleGain:1,rateMultiplier:1};
export const vehicles=[
 {id:'gup-a',name:'GUP-A',modelPath:'../../assets/models/gup-a.glb',thumbnailPath:thumbnail('gup-a'),scale:1,orientation:0,collision:{radius:2.65,halfHeight:2.3,halfLength:3,terrainClearance:2.15,surfaceClearance:2.8},propellers:[{name:'Propeller',axis:'z',direction:1}],camera:{distanceMultiplier:1.1},movement:{},audio},
 {id:'gup-b',name:'GUP-B',modelPath:'../../assets/models/gup-b-high.glb',thumbnailPath:thumbnail('gup-b'),scale:1,orientation:0,collision:{radius:2.2,halfHeight:1.1,halfLength:3,terrainClearance:1.7,surfaceClearance:2.5},propellers:[],camera:{distanceMultiplier:1},movement:{},audio},
 {id:'gup-r',name:'GUP-R',modelPath:'../../assets/models/gup-r.glb',thumbnailPath:thumbnail('gup-r'),scale:1,orientation:0,collision:{radius:2.2,halfHeight:2.15,halfLength:3,terrainClearance:1.7,surfaceClearance:2.7},propellers:[],camera:{distanceMultiplier:1},movement:{},audio},
];
export function vehicleById(id){const vehicle=vehicles.find(v=>v.id===id);if(!vehicle)throw new Error('Unknown vehicle: '+id);return vehicle;}
// Resolve from this module, preserving a GitHub Pages project prefix and build version.
function assetURL(path,moduleURL){const url=new URL(path,moduleURL);url.search=new URL(moduleURL).search;return url.href;}
export function vehicleModelURL(definition,moduleURL=import.meta.url){return assetURL(definition.modelPath,moduleURL);}
export function vehicleThumbnailURL(definition,moduleURL=import.meta.url){return assetURL(definition.thumbnailPath,moduleURL);}
export const wrapVehicleIndex=(index,count)=>((index%count)+count)%count;
export function carouselNeighbors(index,count){return [-1,0,1].map(offset=>({index:wrapVehicleIndex(index+offset,count),offset}));}
