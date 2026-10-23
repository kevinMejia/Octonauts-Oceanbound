// Metres / seconds. Static proxies and fixed solver budgets, independent of mesh detail.
export const collisionConfig={
 skin:.008,maxSlides:6,recoveryPasses:8,terrainSpacing:.4,maxTerrainSamples:24,
 coralCoresPerFormation:4,coralCoresPerPocket:2,minCoralRadius:.75,minRockRadius:1,
 reboundThreshold:7,restitution:.035,driftDrag:5,
 audio:{threshold:2.2,fullImpact:13,cooldown:.65,maxVoices:2,maxGain:.32,
  surfaces:{sand:.5,rock:1,coral:.8,octopod:.9}},
};
