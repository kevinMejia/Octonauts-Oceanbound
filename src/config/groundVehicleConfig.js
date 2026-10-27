import {turboBoostConfig} from './turboConfig.js';
// Metres, seconds and radians. Model origin sits at the lower track centre.
export const gupXGround={maxSpeed:14.4,maxReverseSpeed:4.8,acceleration:2,braking:5,drag:2.8,
 steering:5,turnSpeed:3.2,pivotTurnSpeed:.8,turnRadius:3,reverseSteeringSpeed:.05,highSpeedSensitivity:.45,groundClearance:.65,
 hillClimb:.6,maxSlope:45*Math.PI/180,pitchResponse:7,rollResponse:6,terrainSmoothing:12,
 sampleLength:2.7,sampleWidth:1.8,maxStep:.35,substep:1/120,
 turboAcceleration:2.2,sediment:1.7,turboSediment:2.2,turboVisual:1.4,bubbleIntensity:.3,
 // Visual suspension only: metres/radians, driven by actual ground travel.
 ride:{enabled:true,heave:.035,pitch:.0035,roll:.005,wavelength:1.7,response:12},
 trackSpacing:3.6,trackLoopLength:11.81008821280518,
 turbo:{...turboBoostConfig,speedBoostPercent:90,drainPerSecond:8,rechargePerSecond:4}};
