import {gupXGround} from './groundVehicleConfig.js';
import {vehicleMovement} from './vehicleMovementConfig.js';
import {withOctopodBerth} from './fleetParkingConfig.js';
import {importedVehicles} from './importedVehicles.js';
export const defaultVehicleId='gup-b';
// Deploy runtime exports and thumbnails; original authoring downloads stay separate.
// Existing published GUP-B geometry is reused verbatim, never regenerated here.
const thumbnail=id=>'../../assets/img/vehicles/'+id+'.png';
const audio={propellerGain:1,bubbleGain:1,rateMultiplier:1};
export const vehicles=[
 {id:'gup-a',name:'GUP-A',compassColor:'#58c9bd',unlockedByDefault:false,preloadAtStart:true,parking:{spawn:{relativeTo:'octopod',offset:[-18,0,34]},rotation:.25,groundClearance:1.6},discovery:{enabled:true,spawn:{relativeTo:'octopod',offset:[24,0,48]},rotation:.35,groundClearance:1.6,triggerPadding:.3,modelScale:1,description:'Ready for a new ocean adventure?',effects:true},modelPath:'../../assets/models/gup-a.glb',thumbnailPath:thumbnail('gup-a'),scale:1,orientation:0,collision:{radius:2.5,halfHeight:1.95,halfLength:2.9,centerY:.4,terrainClearance:2.15,surfaceClearance:2.8},propellers:[{name:'Propeller',axis:'z',direction:1}],camera:{distanceMultiplier:1.1},movement:{speedMultiplier:.75},audio},
 {id:'gup-b',name:'GUP-B',compassColor:'#ff982f',unlockedByDefault:true,parking:{spawn:{relativeTo:'octopod',offset:[0,0,37]},rotation:0,groundClearance:.76},discovery:{enabled:false},modelPath:'../../assets/models/gup-b-high.glb',thumbnailPath:thumbnail('gup-b'),scale:1,orientation:0,collision:{radius:1.65,halfHeight:1,halfLength:2.9,centerY:.25,terrainClearance:1.7,surfaceClearance:2.5},propellers:[],camera:{distanceMultiplier:1},movement:{speedMultiplier:1},audio},
 {id:'gup-r',name:'GUP-R',compassColor:'#53b9e4',unlockedByDefault:false,preloadAtStart:true,parking:{spawn:{relativeTo:'octopod',offset:[20,0,34]},rotation:-.3,groundClearance:1.16},discovery:{enabled:true,spawn:{relativeTo:'octopod',offset:[-68,0,-38]},rotation:-.8,groundClearance:1.16,triggerPadding:.3,modelScale:1,description:'Your fastest GUP is ready to explore!',effects:true},modelPath:'../../assets/models/gup-r.glb',thumbnailPath:thumbnail('gup-r'),scale:1,orientation:0,collision:{radius:1.8,halfHeight:1.65,halfLength:2.9,centerY:.55,terrainClearance:1.7,surfaceClearance:2.7},propellers:[],camera:{distanceMultiplier:1},movement:{speedMultiplier:1.35},audio},
 ...importedVehicles.map(v=>({...v,audio})),
 {id:'gup-x',name:'GUP-X',type:'ground',preloadAtStart:false,parking:{spawn:{relativeTo:'octopod',offset:[-40,0,-35]},rotation:-2.3,groundClearance:.65},compassColor:'#e52b38',unlockedByDefault:false,finalReward:true,discovery:{enabled:false},modelPath:'../../assets/models/gup-x.glb',thumbnailPath:thumbnail('gup-x'),scale:1,orientation:0,groundOffset:0,ground:gupXGround,collision:{radius:2.3,halfHeight:1.65,halfLength:3.2,centerY:1,terrainClearance:.65,surfaceClearance:3},propellers:[],camera:{distanceMultiplier:1.4,heightMultiplier:1.3},movement:{maxSpeed:10.8,cruisingSpeed:8.64,speedMultiplier:.9},audio:{...audio,rateMultiplier:.75},tracks:{left:'LeftTrack',right:'RightTrack',loopLength:11.81008821280518},towing:{attachment:[0,.3,-3.4]},exhaust:[0,.3,-3.1]},
].map(v=>withOctopodBerth({...v,movement:vehicleMovement(v.id,v.movement)}));
export function vehicleById(id){const vehicle=vehicles.find(v=>v.id===id);if(!vehicle)throw new Error('Unknown vehicle: '+id);return vehicle;}
// Resolve from this module, preserving a GitHub Pages project prefix and build version.
function assetURL(path,moduleURL){const url=new URL(path,moduleURL);url.search=new URL(moduleURL).search;return url.href;}
export function vehicleModelURL(definition,moduleURL=import.meta.url){return assetURL(definition.modelPath,moduleURL);}
export function vehicleThumbnailURL(definition,moduleURL=import.meta.url){return assetURL(definition.thumbnailPath,moduleURL);}
export const wrapVehicleIndex=(index,count)=>((index%count)+count)%count;
export function carouselNeighbors(index,count){return [-1,0,1].map(offset=>({index:wrapVehicleIndex(index+offset,count),offset}));}
