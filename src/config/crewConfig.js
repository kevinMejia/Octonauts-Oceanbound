// Positions are local to the existing Octopod; the bridge deck top is y=20.09.
export const crewConfig={enabled:true,renderDistance:110,scale:1,
 characters:[{id:'barnacles',name:'Captain Barnacles',x:0,z:5.3,y:20.10,heading:0,phase:0,
  discovery:{position:{x:112,y:0,z:260},heading:.3,maxPlacementRadius:16},message:'Thanks for finding me! I will head back to the Octopod and get ready for our next adventure.'},
 {id:'kwazii',name:'Kwazii',x:-3.2,z:4.6,y:20.10,heading:.15,phase:2.1,
  discovery:{position:{x:-90,y:0,z:90},heading:1.2,maxPlacementRadius:16},message:'Yeow! You found me, matey! Time to head back to the Octopod.'},
 {id:'peso',name:'Peso',x:3.2,z:4.6,y:20.10,heading:-.15,phase:4.4,
  discovery:{position:{x:275,y:0,z:10},heading:-.7,maxPlacementRadius:16},message:'Thank you for finding me! I will be back at the Octopod, ready to help.'},
 {id:'shellington',name:'Shellington',x:-4.4,z:1.3,y:20.10,heading:.2,phase:1.2,
  discovery:{position:{x:-185,y:0,z:-130},heading:.5,maxPlacementRadius:16},message:'Fascinating! Thanks for finding me. I will take my research back to the Octopod.'},
 {id:'dashi',name:'Dashi',x:0,z:1.8,y:20.10,heading:0,phase:3.1,
  discovery:{position:{x:330,y:0,z:235},heading:-.4,maxPlacementRadius:16},message:'You found me! I will head back to the Octopod to help with our next mission.'},
 {id:'tweak',name:'Tweak',x:4.4,z:1.3,y:20.10,heading:-.2,phase:5.2,
  discovery:{position:{x:35,y:0,z:315},heading:.8,maxPlacementRadius:16},message:'Thanks, partner! I will head back to the Octopod and get those GUPs ready.'},
 {id:'inkling',name:'Professor Inkling',x:-2.8,z:-2.6,y:20.10,heading:.15,phase:2.8,
  discovery:{position:{x:-235,y:0,z:180},heading:1,maxPlacementRadius:16},message:'Splendid work! I will return to the Octopod to study our discoveries.'},
 {id:'tunip',name:'Tunip',x:2.8,z:-2.6,y:20.10,heading:-.15,phase:6.1,
  discovery:{position:{x:320,y:0,z:-165},heading:-.5,maxPlacementRadius:16},message:'Cheepa cheepa! Tunip is ready to head home and help in the Octopod kitchen.'}
 ].map(c=>({...c,visual:{modelPath:'../../assets/models/characters/'+c.id+'.glb',scale:1,orientation:0,offset:[0,0,0],idleClip:c.id+'_Idle',placeholder:!['barnacles','kwazii','peso'].includes(c.id),...c.visual}}))};

// Visual replacement never changes a character ID, save key, discovery location or home slot.
export function crewModelURL(definition,moduleURL=import.meta.url){const url=new URL(definition.visual?.modelPath??('../../assets/models/characters/'+definition.id+'.glb'),moduleURL);url.search=new URL(moduleURL).search;return url.href;}
