// Metres, degrees and exponential response rates (per second).
// Saved oceanbound.camera.v1 distance and height remain compatible.
export const cameraConfig={
 distance:16.8, // Three native GUP-B lengths (5.597 m each).
 height:6, horizontalAngle:10, downwardAngle:15, fov:65,
 positionSmoothing:7, rotationSmoothing:10,
 lookAhead:1.5, framingLift:.5, // Aim above hull to place it below screen centre.
 orbitSensitivity:.005,verticalSensitivity:.004,
 minOrbitElevation:-8,maxOrbitElevation:65,
 autoRecenterEnabled:true,
 recenterDelay:1.5, // Seconds after a drag ends; target stays relative to current heading.
 recenterSmoothTime:.65, // Critically damped return: approximately 1.5–2 seconds to settle.
 recenterAngleTolerance:.01, // Radians; snap only imperceptible residual offsets.
 // Preserve the existing saved preference and settings-slider name.
 get returnDelay(){return this.recenterDelay;},set returnDelay(value){this.recenterDelay=value;},
 portraitDistanceMax:1.32, // Extra horizontal room on narrow screens.
 speedStart:10,speedFull:22,speedDistanceIncrease:.10,speedFovIncrease:3,
 fovSmoothing:4,nearFloorDistance:4,nearFloorLift:1.2,
 collisionEnabled:true,collisionRadius:.65,collisionPadding:.18,
 terrainClearance:.8,terrainSampleSpacing:.75,maxTerrainSamples:96,
};

// GUP-X only: metres and exponential response rates per second. The shared
// distance/height preferences and orbit controls still apply to this profile.
export const gupXCamera={
 minDistance:14,horizontalResponse:7,verticalResponse:5,focusResponse:6,
 pivotHeight:1.7,lookHeight:1.7,lookAhead:3.5,speedLookAhead:1.5,
 terrainLookWeight:.45,maxLookRise:3,maxLookDrop:1.2,
 speedDistanceIncrease:.08,steerLookAhead:1.4,steerFullSpeed:12,
 airborneFadeHeight:3,terrainPrediction:.7,maxTerrainPrediction:6,
 terrainClearance:1,terrainPadding:.15,
 terrainSampleSpacing:.75,maxTerrainSamples:64,
 terrainViewNear:2,terrainViewFar:10,terrainViewTargetHeight:.2,
 terrainViewClearance:.12,terrainViewSampleSpacing:1.5,maxTerrainViewSamples:24,maxTerrainViewAngle:50,terrainViewRiseRate:10,
};
