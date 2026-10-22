export const submarineConfig={
 maxForwardSpeed:12, // Metres per second at full forward thrust.
 maxReverseSpeed:5, // Metres per second astern.
 acceleration:2, // Exponential velocity response while thrusting.
 drag:2.8, // Exponential stabilization when controls are released.
 turnSpeed:1.1, // Radians per second, also while hovering.
 ascendSpeed:5, // Vertical speed in metres per second.
 descendSpeed:5, // Downward speed in metres per second.
 bankAmount:.19, // Maximum roll in radians during steering.
 pitchAmount:.13, // Maximum pitch during vertical thrust.
 minTerrainClearance:1.7, // Hull/camera safety clearance, including pitch.
};
