import {crewConfig} from './crewConfig.js';
const floorY=20.10;
const consoleStations=Array.from({length:7},(_,i)=>{const a=Math.PI+i*Math.PI/6,x=Math.cos(a),z=-Math.sin(a);return {id:i===3?'main-control':['port-control','navigation','research',null,'communications','engineering','starboard-control'][i],position:{x:x*5.3,y:floorY,z:z*5.3},heading:Math.atan2(x,z),maxOccupancy:1,activityType:'computer',target:{x:x*7.5,z:z*7.5}};});
// All coordinates are local to the existing Octopod, in Three.js Y-up units.
export const crewActivityConfig={
 enabled:true,movementSpeed:.7,turnSpeed:2.4,
 minDecisionDelay:5,maxDecisionDelay:10,minWorkDuration:5,maxWorkDuration:10,
 initialDelay:[1,6],stayProbability:.6,retryDelay:1.5,
 maxSimultaneousMoving:1,idleAnimationIntensity:.035,walkBobFrequency:8,
 arrivalDistance:.035,personalSpace:.12,replanAfter:2,stationSpacing:2.6,
 floorY,walkableRadius:7.8,activeDistance:90,
 stations:[...consoleStations,
  {id:'rear-monitor',position:{x:0,y:floorY,z:-4.1},heading:Math.PI,maxOccupancy:1,activityType:'computer',target:{x:0,z:-5.94}},
  {id:'quiet-window',position:{x:-4.4,y:floorY,z:-3.4},heading:-2.2,maxOccupancy:1,activityType:'observe',target:{x:-7,z:-5.3}},
  {id:'observation',position:{x:4.4,y:floorY,z:-3.4},heading:2.2,maxOccupancy:1,activityType:'observe',target:{x:7,z:-5.3}},
  ...crewConfig.characters.map(d=>({id:'idle-'+d.id,position:{x:d.x,y:d.y,z:d.z},heading:d.heading,maxOccupancy:1,activityType:'idle'}))
 ].map(station=>({minDuration:null,maxDuration:null,...station})),
 characterPreferences:{barnacles:['main-control'],dashi:['communications','rear-monitor'],inkling:['quiet-window','observation'],kwazii:['navigation','observation'],peso:['starboard-control','rear-monitor'],shellington:['research','quiet-window'],tweak:['engineering','port-control'],tunip:['starboard-control','observation']},
 // Small visibility graph through the open central deck, not a navigation mesh.
 waypoints:Array.from({length:25},(_,i)=>({x:(i%5-2)*2.4,z:(Math.floor(i/5)-2)*2.4})).filter(p=>Math.hypot(p.x,p.z)<6.3),
 arrivalPositions:Array.from({length:25},(_,i)=>({x:(i%5-2)*2.4,y:floorY,z:(Math.floor(i/5)-2)*2.4})).filter(p=>Math.hypot(p.x,p.z)<6.3),
 obstacles:[...Array.from({length:7},(_,i)=>{const a=Math.PI+i*Math.PI/6;return {id:'Bridge_Console_'+String(i).padStart(2,'0'),x:Math.cos(a)*7.5,z:-Math.sin(a)*7.5,heading:a+Math.PI/2,halfWidth:1.05,halfDepth:.5};}),{id:'Bridge_Rear_Monitor_Frame',x:0,z:-6.1,heading:0,halfWidth:2.2,halfDepth:.11}]
};
