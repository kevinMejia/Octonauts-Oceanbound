// Eligibility reads the existing session's loaded progress; it never reads or writes storage.
export function startupTipState(game){
 const fleet=game?.unlocks,marine=game?.marineDiscovery,crew=game?.crewDiscovery;
 return {fleet,marine,crew,hunt:game?.wordHunt?.progress};
}
export const startupTipsConfig={interval:4000,fadeOut:200,fadeIn:250,tips:[
 {id:'fleet',category:'vehicles',text:'Collect every GUP to unlock a special surprise!',eligible:s=>!!s.fleet&&s.fleet.registry.some(v=>!s.fleet.isUnlocked(v.id))},
 {id:'gup-x',category:'vehicles',text:'Unlock the other GUPs, then return to the Octopod for GUP-X!',eligible:s=>!!s.fleet&&s.fleet.registry.some(v=>v.finalReward&&!s.fleet.isUnlocked(v.id))},
 {id:'switch',category:'vehicles',text:'Switch GUPs to explore the ocean in different ways!'},
 {id:'turbo',category:'vehicles',text:'Use Turbo to explore the ocean even faster!'},
 {id:'letters',category:'collectibles',text:'Find all the OCTONAUTS letters to unlock infinite Turbo!',eligible:s=>!!s.hunt&&!s.hunt.infiniteTurbo},
 {id:'hidden',category:'exploration',text:'Look behind rocks and coral for hidden discoveries!'},
 {id:'explore',category:'exploration',text:'Keep exploring! There’s always something new to discover!'},
 {id:'creatures',category:'marine',text:s=>`Discover all ${s.marine.records.size} sea creatures. Can you find them all?`,eligible:s=>!!s.marine&&s.marine.count<s.marine.records.size},
 {id:'rare',category:'marine',text:'Some sea creatures are harder to find than others!',eligible:s=>!!s.marine&&s.marine.count<s.marine.records.size},
 {id:'floor',category:'marine',text:'Explore the ocean floor. Hidden discoveries await!',eligible:s=>!!s.marine&&s.marine.count<s.marine.records.size},
 {id:'rescue',category:'crew',text:'Rescue lost Octonauts and bring them back to the Octopod!',eligible:s=>!!s.crew&&s.crew.config.enabled&&s.crew.rescuedCount<s.crew.records.size},
 {id:'octopod',category:'crew',text:'Every rescued Octonaut has a place in the Octopod!',eligible:s=>!!s.crew&&s.crew.config.enabled&&s.crew.rescuedCount<s.crew.records.size}
]};
