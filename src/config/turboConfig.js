export const turboBoostConfig={
 enabled:true,
 speedBoostPercent:80, // Same 1.8x top speed / acceleration as Little Big Dirt.
 rechargePerSecond:1, // Percentage points per second when not boosting.
 drainPerSecond:20/3, // Three times the original duration: a full meter lasts 15 seconds.
 pickupCharge:25, // One lightning bolt restores a quarter tank.
 doubleTapWindowMs:300, // Separate forward presses; hold the second press.
 respawnSeconds:5, // Collected bolts reappear after this cooldown.
 pickupCount:15, // Seeded floating pickups, with a few near the start.
 pickupRadius:2.5, // Swept three-dimensional collection radius in metres.
};
