// Player defaults; remaining values are developer tuning in metres and seconds.
export const cameraShakeConfig={
 enabled:true,intensity:.3,
 minimumImpactThreshold:.65, // Inward contact velocity, never total travel speed.
 vehicleOffset:.07,vehicleTilt:.025, // Render-only hull travel (metres) and tilt (radians).
 maxRotation:.014, // Radians at 100%: under one degree, readable even at distant camera zoom.
 maxIntensity:.32, // Absolute positional cap, including overlapping impacts.
 duration:.3, // Hard impacts; light bumps use 55% to remain visible at lower frame rates.
 cooldown:.22 // Minimum time between accepted impacts.
};
