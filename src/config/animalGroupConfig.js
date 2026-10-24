// Seeded once per species. Radii stay inside the existing group envelopes.
export const animalGroupDefaults={seed:71421,spawnRadius:5,spawnMinSeparation:3,spawnHeightVariation:.5,initialHeadingVariation:Math.PI,
 speedVariation:.12,accelerationVariation:.15,turnSpeedVariation:.2,routePhaseOffset:1,patrolRadiusVariation:.08,pauseTimeVariation:.4,
 driftRadius:.35,driftSpeed:.18,routeSpeedMultiplier:1,pauseSeconds:0,pauseInterval:22,groupCohesion:.08,groupSeparation:1,preferredSpacing:5,schooling:false,leader:false,independent:false};
export const animalGroupConfig={
 'hammerhead-shark':{independent:true,spawnRadius:32,spawnMinSeparation:8,spawnHeightVariation:1.3,preferredSpacing:16,groupCohesion:.015,groupSeparation:2,speedVariation:.12,patrolRadiusVariation:.12,initialHeadingVariation:.2},
 'jellyfish':{spawnRadius:8.5,spawnMinSeparation:4,spawnHeightVariation:1.3,driftRadius:.7,driftSpeed:.13,pauseSeconds:1.5,preferredSpacing:6},
 'pufferfish':{spawnRadius:4.5,spawnMinSeparation:3.3,spawnHeightVariation:.6,driftRadius:.55,driftSpeed:.9,routeSpeedMultiplier:3,pauseSeconds:0,preferredSpacing:4,initialHeadingVariation:2.4},
 'seahorse':{spawnRadius:4.8,spawnMinSeparation:2.6,spawnHeightVariation:.45,driftRadius:.3,driftSpeed:.12,pauseSeconds:2.5,preferredSpacing:3.5},
 'spotted-eagle-ray':{spawnRadius:8,spawnMinSeparation:8,spawnHeightVariation:.8,driftRadius:1,driftSpeed:.2,preferredSpacing:10,initialHeadingVariation:.25},
};
export function groupConfigFor(d){return {...animalGroupDefaults,...animalGroupConfig[d.id],...d.group?.randomization};}
