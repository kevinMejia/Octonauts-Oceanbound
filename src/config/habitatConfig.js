// One authored demonstration habitat. Expansion is opt-in; no world-wide formation loop.
export const habitatConfig={
 enabled:true,
 seedOffset:9021,
 bounds:{minX:-55,maxX:58,minZ:-18,maxZ:137},
 density:1, // 0..1 affects transition patches, never the main passage-defining structures.
 formationScale:1, // Global module size; keep within .8..1.15 for this authored passage.
 spacing:1, // Scales positions along the passage, not the rock/coral geometry.
 renderDistance:185,
 detailDistance:42,
 collisionRadius:2.2, // Conservative submarine horizontal clearance around foundation rocks.
 placements:[
  ['large',-1,18,43,1.03, .24],
  ['garden',-1,16,18,1.08,-.65],['garden',1,16,23,1.05,.8],
  ['garden',-1,20,63,1.05,-.8],['garden',1,24,70,1.12,.9],
  ['garden',-1,21,86,1,.7],['garden',1,17,119,1.05,-.75],
  ['wall',1,24,47,1,-.23],['wall',1,25,93,.94,.28],['wall',-1,26,112,1.02,-.21],
  ['patch',-1,13,5,.95,.2],['patch',1,15,9,1,-.5],
  ['patch',-1,16,29,1.1,.4],['patch',1,18,33,1.05,-.3],
  ['patch',-1,19,54,1.2,-.2],['patch',1,21,61,1.1,.3],
  ['patch',-1,18,73,1.1,.4],['patch',-1,15,77,.9,-.3],
  ['patch',1,22,81,1.1,.2],['patch',-1,21,96,1.1,-.4],
  ['patch',1,21,106,1.1,-.2],['patch',-1,23,124,1,.35],
  ['patch',1,14,130,.9,-.3],['patch',-1,14,-8,.95,.4],
 ],
};

// QA comparison only: the ordinary game always uses the configured demonstration.
export function habitatEnabled(){const q=new URLSearchParams(location.search);return habitatConfig.enabled&&!(q.has('inspect')&&q.get('habitat')==='off');}
