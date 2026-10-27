// One controlled prototype; no player preference or global scenery changes.
export const reefOverpassConfig={enableReefOverpass:true,searchStart:360,searchEnd:660,searchStep:20,footprint:38,approach:65,maxSlope:.22,maxRelief:7,renderDistance:185};
export function overpassEnabled(host=globalThis){return reefOverpassConfig.enableReefOverpass&&new URLSearchParams(host.location?.search??'').get('reefOverpass')!=='off';}
