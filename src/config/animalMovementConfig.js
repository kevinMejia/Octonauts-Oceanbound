import {octopodConfig} from './octopodConfig.js';
// Speeds in metres/second, acceleration in metres/second², turns in radians/second.
export const animalMovementDefaults={pattern:'roaming',minSpeed:2,cruisingSpeed:6,maxSpeed:8,acceleration:2,deceleration:3,turningSpeed:.8,speedVariation:.08,roamingRadius:30,routeRadius:20,verticalVariation:.6,pauseSeconds:0,pauseInterval:25,returnToRoute:true,
 habitatRadius:45,minY:12,maxY:38,footprint:4,bodyHeight:2.5,clearance:3,
 reaction:'passive',evasionEnabled:false,detectionRadius:32,triggerDistance:22,escapeSpeed:10,escapeAcceleration:4,evasionDuration:3,evasionCooldown:8,returnToNormal:true,maxHabitatDistance:45};
export const animalMovementConfig={
 'giant-manta-ray':{pattern:'circular',center:{x:octopodConfig.position.x,y:28,z:octopodConfig.position.z},routeRadius:85,habitatRadius:110,maxHabitatDistance:110,roamingRadius:85,minSpeed:8.8,cruisingSpeed:10.2,maxSpeed:11.2,escapeSpeed:13.8,turningSpeed:.85,footprint:7,reaction:'fleeing',evasionEnabled:true,triggerDistance:22,evasionDuration:2.4,evasionCooldown:9},
 'hammerhead-shark':{pattern:'patrol',waypoints:[[-25,-12],[20,-20],[30,12],[-15,25]],routeRadius:30,habitatRadius:60,maxHabitatDistance:60,minSpeed:6,cruisingSpeed:9.5,maxSpeed:11,escapeSpeed:13.2,footprint:22,reaction:'evasive',evasionEnabled:true,evasionDuration:3,evasionCooldown:10},
 'bottlenose-dolphin':{pattern:'roaming',routeRadius:27,roamingRadius:32,habitatRadius:48,minSpeed:4,cruisingSpeed:7.8,maxSpeed:10,escapeSpeed:11,speedVariation:.2,reaction:'curious',evasionEnabled:true,triggerDistance:17,evasionDuration:1.5,evasionCooldown:13},
 'whale-shark':{pattern:'migration',waypoints:[[-50,0],[-25,-32],[38,-26],[55,14],[0,38]],habitatRadius:85,maxHabitatDistance:85,minSpeed:2.2,cruisingSpeed:3,maxSpeed:3.5,escapeSpeed:3.5,acceleration:.7,deceleration:.9,turningSpeed:.22,speedVariation:.04,footprint:11,bodyHeight:5,reaction:'passive',evasionEnabled:false},
};
export function movementForAnimal(d){const c=d.movement??animalMovementConfig[d.id];return c?{...animalMovementDefaults,...c,center:{...(c.center??d.position)}}:null;}
