// Distances in metres, time in seconds, budgets are hard caps (high / low).
export const interactionConfig={
 enabled:true,
 qualityLevel:'auto', // auto follows existing quality; high/low override effects only.
 renderDistance:65, // Old, distant clouds are recycled; frustum rejection happens per layer.
 sediment:{enabled:true,proximityDistance:2.8,proximityIntensity:1,speedInfluence:1,
  impactIntensity:1,cloudLifetime:5.5,cloudExpansion:.65,settlingSpeed:.06,
  density:1,maxClouds:96,maxParticles:160,lowClouds:40,lowParticles:64},
 debris:{enabled:true,coralFragmentCount:5,rockFragmentCount:4,fragmentLifetime:6,
  collisionThreshold:.65,maxFragments:48,lowFragments:20,contactCooldown:.24},
};
