import {turboBoostConfig} from './turboConfig.js';
// Metres, seconds and radians. Model origin sits at the lower track centre.
export const gupXGround={maxSpeed:10.8,maxReverseSpeed:3.8,acceleration:1.6,braking:5,drag:2.8,
 steering:5,turnSpeed:1.05,pivotTurnSpeed:.8,turnRadius:5,highSpeedSensitivity:.45,groundClearance:.65,
 hillClimb:.6,maxSlope:45*Math.PI/180,pitchResponse:7,rollResponse:6,terrainSmoothing:12,
 sampleLength:2.7,sampleWidth:1.8,maxStep:.35,substep:1/120,
 turboAcceleration:2.2,sediment:1.7,turboSediment:2.2,turboVisual:1.4,bubbleIntensity:.3,
 trackSpacing:3.6,trackLoopLength:11.81008821280518,
 turbo:{...turboBoostConfig,speedBoostPercent:90,drainPerSecond:8,rechargePerSecond:4}};
