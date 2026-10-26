// Lightweight, session-only parked motion; piloted vehicle tuning is unchanged.
export const parkedVehicleConfig={
 enabled:true,range:65,volumeUnit:5,minimumMass:.5,groundMassMultiplier:2.5,
 minImpact:.5,impulseScale:.85,hitCooldown:.16,maxSpeed:4,drag:2.3,
 turnImpulse:1.5,maxSpin:.65,angularDrag:3.8,stopSpeed:.025,stopSpin:.006,
 step:1/60,maxFrame:.05,maxSlope:Math.PI/4,heightSlack:.04,overlapTolerance:.002,
};
