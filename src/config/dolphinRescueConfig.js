// Metres, seconds and exponential underwater response rates. No world-save state.
export const dolphinRescueConfig={
 id:'dolphin-rescue',name:'Dolphin Rescue',seed:41024,
 timing:{maxStep:1/60,maxFrameTime:.25}, // Up to 15 small steps, one render; discard long-stall debt.
 entry:{offset:[38,19,32],maxDistance:180},
 route:{startZ:-420,length:600,speed:4,introSeconds:6,cleanDistance:70,depth:11,spawnX:-6,spawnOffset:-10},
 camera:{}, // Inherit normal GUP-B heading follow and saved orbit recenter preferences.
 escort:{halfWidth:3.6,radius:.75,formation:[[-2,0],[2,-1],[0,-6]],response:1.25,routeInfluence:.18,wobble:.18,scale:.8,collisionCooldown:1.5,maxStrikes:3},
 debris:{capacity:6,spawnSide:9,driftSpeed:2.1,drag:.65,angularDrag:3.5,pushScale:2.2,restitution:.45,minImpact:.5,maxSpeed:12,hitCooldown:.18,despawnBehind:14,clearPadding:.2,
  types:[{kind:'box',radius:1.35,halfHeight:1.1,mass:.65},{kind:'crate',radius:1.5,halfHeight:1.3,mass:1.1},{kind:'container',radius:1.6,halfHeight:1.15,mass:1.3},{kind:'tire',radius:1.45,halfHeight:1.3,mass:1.7}],
  stages:[{until:.38,interval:11,reaction:10,types:2},{until:.78,interval:8.5,reaction:9,types:3},{until:1,interval:6.5,reaction:8.5,types:4}]},
 environment:{fogDensity:.024,scenery:{kinds:['rock0','branch0','brain0','tube0','kelp0'],perChunk:{low:12,high:18},maxHeight:5.5,edgeMin:11,edgeMax:17,rockEvery:3,rockX:9,rockRadius:2.2,rockHeight:3.2},chunkLength:36,bankStart:15,bankWidth:23,bankHeight:18,itemsPerChunk:{low:150,high:230},drawDistance:100,floatingPerChunk:8},
};
