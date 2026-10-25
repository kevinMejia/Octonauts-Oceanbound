// Player defaults; remaining values are developer tuning in metres and seconds.
export const cameraShakeConfig={
 enabled:true,intensity:.3,
 minimumImpactThreshold:.65, // Inward contact velocity, never total travel speed.
 maxIntensity:.32, // Absolute positional cap, including overlapping impacts.
 duration:.3, // Hard impacts; light bumps use one third of this duration.
 cooldown:.22 // Minimum time between accepted impacts.
};
