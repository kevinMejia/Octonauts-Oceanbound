// Rendering and cosmetic motion only. Distances are game metres, rates are per second.
export const waterConfig={
 bubbles:{enabled:true,emissionRate:10,minSize:.035,maxSize:.14,buoyancy:.85,
  lifetime:4.5,speedMultiplier:1,boostMultiplier:1.35,maxParticles:160,lowParticles:64,
  renderDistance:65},
 ambient:{enabled:true,density:1,opacity:.30,driftSpeed:.035,renderDistance:32,nearDistance:12,nearFraction:.45,
  maxParticles:800,lowParticles:320,minSize:.018,maxSize:.045},
 motion:{enabled:true,speedThreshold:14,streakIntensity:.12,maxStreaks:12,
  lowStreaks:0,lifetime:.75}, // Optional flow streaks are disabled in low quality.
 caustics:{enabled:true,intensity:.26,animationSpeed:1,scale:.12,
  depthFalloff:.006,reefIntensity:.4}, // Low quality uses one sample and rock surfaces only.
 atmosphere:{fogDensity:.0054,fogColor:'#08789f',depthTint:'#086e91',
  depthTintStrength:.12,depthRange:46,lightShaftIntensity:.045},
};
