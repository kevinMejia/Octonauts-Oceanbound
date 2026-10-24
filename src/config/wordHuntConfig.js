export const wordHuntConfig={
 word:'OCTONAUTS',collectionRadius:7,floatAmplitude:.45, // Retain authored placement clearance; animation is configured below.
 visuals:{
  height:3.8,haloSize:5.2,sparkleCount:12,sparkleSize:.4,
  rotation:{enabled:true,duration:2.5},
  floating:{enabled:true,amplitude:.2,duration:2},
  appearance:{extrusionDepth:.12,bevelEnabled:true,bevelSize:.025,glowEnabled:true,glowIntensity:.3,emissiveIntensity:.16,darkOutline:'#43234F'},
  particles:{enabled:true,orbitEnabled:true,orbitCount:5},
  colors:['#FF8C28','#FF4D6D','#FFD43B','#B86AFF','#A5ED43','#FFAD33','#FF659E','#E6F24C','#F47C4A'],
 },
 // Stable IDs correspond to word positions, including repeated letters.
 letters:[
  {id:'o-1',letter:'O',x:120,y:22,z:185},
  {id:'c-2',letter:'C',x:0,y:30,z:70},
  {id:'t-3',letter:'T',x:-190,y:18,z:160},
  {id:'o-4',letter:'O',x:-380,y:25,z:-120},
  {id:'n-5',letter:'N',x:230,y:18,z:-270},
  {id:'a-6',letter:'A',x:470,y:30,z:120},
  {id:'u-7',letter:'U',x:-260,y:15,z:470},
  {id:'t-8',letter:'T',x:420,y:16,z:490},
  {id:'s-9',letter:'S',x:-540,y:12,z:-470},
 ],
};
