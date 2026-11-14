// Standalone experiment: upstream coordinates are raised 46m to our sea level.
export const abyssalArenaConfig={
 offsetY:46,bounds:150,spawn:{x:0,y:21,z:-52,heading:0},
 profiles:{low:{pixelRatio:1,antialias:false,columns:100,leaves:.08,rocks:180},high:{pixelRatio:1.5,antialias:true,columns:240,leaves:.22,rocks:480}},
 viewpoints:[{name:'Canyon',x:0,y:21,z:-52,heading:0},{name:'Kelp basin',x:0,y:13,z:-74,heading:Math.PI},{name:'Large arch',x:-17,y:7,z:-34,heading:Math.PI/2},{name:'Wreck',x:38,y:26,z:22,heading:Math.PI/2},{name:'Purple grotto',x:6,y:14,z:65,heading:0}],
};
