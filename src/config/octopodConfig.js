export const octopodConfig={
 enabled:true,
 position:{x:180,y:0,z:100}, // Feet on the locally leveled seabed; fixed between sessions.
 scale:1, // Blender metres match the existing GUP-B world units.
 levelRadius:30, // Flat sand only under the complete base footprint.
 blendRadius:70, // Smooth transition back to untouched procedural terrain.
 sceneryClearance:39, // Includes support feet, pods and decoration footprint margins.
 collisionEnabled:true,
 navigationMarkerEnabled:true,
 spawn:{x:180,y:20,z:195,heading:Math.PI}, // 95 m south of the hub, facing north (-Z).
};
export const compassConfig={
 enabled:true,size:86, // CSS pixels; smaller on short landscape screens.
 showCardinalDirections:true,showOctopodMarker:true,showDistance:true,
 discoveryHighlightDistance:90, // World metres; individual discovery.compassHighlightDistance may override.
 smoothing:18, // Exponential response per second, shortest angular path.
};
export function insideOctopodClearing(x,z,margin=0){return octopodConfig.enabled&&Math.hypot(x-octopodConfig.position.x,z-octopodConfig.position.z)<octopodConfig.sceneryClearance*octopodConfig.scale+margin;}
