export const rescueConfig={
 enabled:true, // Enable the one-mission escort flow.
 discoveryRadius:2.5, // Maximum 3D gap from the active GUP hull, in world metres.
 deliveryRadius:32, // Both vehicle and payload must enter this radius; the base spans ~50 m.
 deliveryOffset:[0,20,0], // Docking-height centre relative to the existing Octopod origin.
 maxActiveRescues:1, // MVP supports exactly one attached payload.
 towing:{
  enabled:true, // Keep discovered crew in the ocean until a tow is delivered.
  attachmentHeightRatio:.45, // Character-side attachment height relative to measured model height.
  ropeLength:5, // Rest distance behind the vehicle's rear attachment.
  ropeThickness:.045, // Tube radius, readable on mobile without a heavy rope mesh.
  ropeSag:.35, // Maximum underwater slack when stopped.
  ropeSegments:18, // Fixed reusable tube segments; no rope physics solver.
  followSmoothness:4, // Exponential trailing response per second.
  catchUpSpeed:6, // Extra m/s above the GUP speed; caps sudden pickup corrections.
  lateralOffset:1, // Slight side-trailing offset keeps the rope visible in the normal chase view.
  lateralSway:.15, // Gentle side-to-side movement in metres.
  verticalBob:.12, // Gentle vertical movement in metres.
  speedMultiplier:.9, // Temporary forward/reverse top-speed multiplier, including turbo.
  terrainClearance:.18, // Minimum clearance beneath the character's feet.
  maxStretch:12, // Recover near the GUP if an exceptional switch/obstacle separates the tow.
  recoveryDelay:1.2, // Seconds of blocked movement before looking for a clear reattachment.
 },
 navigation:{
  height:1.8, // World-up metres above the active hull's highest point.
  forwardOffset:1.8, // Metres along horizontal vehicle heading, independent of tilt.
  scale:1.5, // Uniform world-space scale of the existing rescue arrow.
  positionSmoothing:10, // Exponential response per second for heading offset and height.
  rotationSmoothing:12, // Shortest-bearing exponential response per second.
  minClearance:.6, // Minimum mesh/hull gap while damped height catches a rapid ascent.
  presentationTilt:25, // Maximum face-normal tilt from world up, in degrees.
  presentationSmoothing:12, // Exponential response of the intrinsic readability tilt.
 },
 hud:{
  enabled:true, // Show the compact mission indicator.
  highlightOctopod:true, // Emphasize the existing base marker while towing.
 },
 completion:{
  showMessage:true, // Show a brief accessible completion status.
  showEffect:true, // Reuse the existing discovery burst and sound.
  messageSeconds:3, // Completion message lifetime in gameplay seconds.
 },
};
