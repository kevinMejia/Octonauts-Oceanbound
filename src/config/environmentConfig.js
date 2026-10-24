import {chooseGraphics,loadGraphicsMode} from '../ui/graphicsPreferences.js';
// Rendering-only profiles. Select ?quality=low or ?quality=high for comparison.
export const environmentConfig={
 terrainChunkSize:100,
 terrainSegments:48, // Shared edge samples produce continuous ~2m terrain detail.
 terrainDrawDistance:260,
 reefSpacing:55, // Metres between candidate reef pockets, with jitter and rejection.
 openingPocketAttempts:70,
 openSandDecorations:850,

 profiles:{
  high:{pixelRatio:2,antialias:true,minPixelRatio:.9,targetFrameMs:20,terrainSegments:48,drawDistance:300,coralDistance:250,vegetationDistance:175,reefFraction:1,shadows:true,shadowMapSize:2048,sunColor:0xffe6bb,sunIntensity:3.4,hemisphereIntensity:.78,fogColor:'#08789f',depthTint:'#054a76',depthTintStrength:.2,reflectionIntensity:.32,rayIntensity:.17},
  low:{pixelRatio:1,antialias:false,minPixelRatio:.7,targetFrameMs:1000/30,terrainSegments:40,drawDistance:200,coralDistance:140,vegetationDistance:100,reefFraction:.7,shadows:false,shadowMapSize:512,sunColor:0xffedcd,sunIntensity:3.5,hemisphereIntensity:.9,fogColor:'#08789f',depthTint:'#086e91',depthTintStrength:.12,reflectionIntensity:.18,rayIntensity:.08},
 },
};
export function graphicsSelection(host=globalThis){
 let storage;try{storage=host.localStorage;}catch{}
 return chooseGraphics({mode:loadGraphicsMode(storage),qualityOverride:new URLSearchParams(host.location?.search??'').get('quality'),coarsePointer:host.matchMedia?.('(any-pointer:coarse)').matches??false,userAgent:host.navigator?.userAgent??'',deviceMemory:host.navigator?.deviceMemory});
}
export function renderingProfile(){return graphicsSelection().quality;}
