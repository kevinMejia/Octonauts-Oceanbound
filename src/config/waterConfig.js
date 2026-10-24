// Rendering and cosmetic motion only. Distances are game metres, rates are per second.
export const waterConfig={
 sunRays:{enabled:true,count:6,lowCount:3,intensity:.14,lowIntensity:.1},
 bubbles:{enabled:true,emissionRate:14,minSize:.07,maxSize:.24,buoyancy:1.1,
  lifetime:6,speedMultiplier:1,boostMultiplier:1.5,maxParticles:240,lowParticles:128,
  renderDistance:65},
 vents:{enabled:true,emissionRate:3,pulseSpeed:.55,range:65,positions:[{x:169,z:183},{x:198,z:186},{x:156,z:176},{x:216,z:195},{x:164,z:192},{x:210,z:167}]},
 ambient:{enabled:true,density:1,opacity:.36,driftSpeed:.05,renderDistance:32,nearDistance:12,nearFraction:.6,
  maxParticles:800,lowParticles:320,minSize:.018,maxSize:.055},
 motion:{enabled:true,speedThreshold:14,streakIntensity:.12,maxStreaks:12,
  lowStreaks:0,lifetime:.75}, // Optional flow streaks are disabled in low quality.
 caustics:{enabled:true,intensity:.26,animationSpeed:1,scale:.12,
  depthFalloff:.006,reefIntensity:.4}, // Low quality uses one sample and rock surfaces only.
 atmosphere:{fogDensity:.0054,fogColor:'#08789f',depthTint:'#086e91',
  depthTintStrength:.12,depthRange:46,lightShaftIntensity:.045},
};
