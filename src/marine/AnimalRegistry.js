import {expandedAnimals} from './ExpandedRegistry.js';
// Stable IDs survive visual replacements and additions.
export const marineAnimals=Object.freeze([
 {id:'octopus',commonName:'Octopus',scientificName:'Octopus vulgaris',fact:'An octopus has eight arms and can change color to hide!',habitat:'Rocky reef',position:{x:-45,y:8,z:66},discoveryRadius:10,scale:1.4,visual:{source:'procedural',type:'octopus'},behavior:{radius:5,speed:.22,vertical:.25,clearance:2.8}},
 {id:'bottlenose-dolphin',commonName:'Bottlenose Dolphin',scientificName:'Tursiops truncatus',fact:'Dolphins use clicking sounds to help find things underwater!',habitat:'Open water',position:{x:110,y:25,z:215},discoveryRadius:13,scale:1.5,visual:{source:'procedural',type:'dolphin'},behavior:{radius:19,speed:.15,vertical:3,clearance:6}},
 {id:'whale-shark',commonName:'Whale Shark',scientificName:'Rhincodon typus',fact:'Whale sharks are the biggest fish in the ocean, but they eat tiny animals!',habitat:'Deep open water',position:{x:-230,y:15,z:-120},discoveryRadius:17,scale:2.5,visual:{source:'procedural',type:'whale-shark'},behavior:{radius:28,speed:.045,vertical:.8,clearance:9}},
 {id:'giant-manta-ray',commonName:'Giant Manta Ray',scientificName:'Mobula birostris',fact:'Manta rays use their giant fins like wings to glide through the water!',habitat:'Reef edge',position:{x:65,y:24,z:110},discoveryRadius:13,scale:1.7,visual:{source:'procedural',type:'manta'},behavior:{radius:14,speed:.085,vertical:1.2,clearance:7}},
 ...expandedAnimals,
]);
