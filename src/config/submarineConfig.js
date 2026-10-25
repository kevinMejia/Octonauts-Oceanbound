export const submarineConfig={
 maxForwardSpeed:12, // Metres per second at full forward thrust.
 maxReverseSpeed:5, // Metres per second astern.
 acceleration:2, // Exponential velocity response while thrusting.
 drag:2.8, // Exponential stabilization when controls are released.
 turnSpeed:1.25, // Radians per second, also while hovering.
 ascendSpeed:5, // Vertical speed in metres per second.
 descendSpeed:5, // Downward speed in metres per second.
 bankAmount:.28, // Maximum roll in radians during steering (about 16 degrees).
 pitchAmount:Math.PI/4, // Default maximum pitch during vertical thrust (45 degrees).
 minTerrainClearance:1.7, // Hull/camera safety clearance, including pitch.
};
