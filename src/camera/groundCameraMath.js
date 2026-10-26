// Elevate an existing heading/orbit arm instead of shortening it into the hull.
// The caller owns the vectors; fixed sample bounds avoid mesh rays/allocations.
export function terrainArmHeight(pivot,end,ground,c){
 const dx=end.x-pivot.x,dz=end.z-pivot.z,length=Math.hypot(dx,dz);
 const steps=Math.min(c.maxTerrainSamples,Math.max(1,Math.ceil(length/c.terrainSampleSpacing)));
 let y=end.y;
 for(let i=1;i<=steps;i++){
  const t=i/steps,floor=ground(pivot.x+dx*t,pivot.z+dz*t)+c.terrainClearance+c.terrainPadding;
  y=Math.max(y,pivot.y+(floor-pivot.y)/t);
 }
 return y;
}

// Ground near/far targets must be visible too: a clear hull-to-eye segment can
// still leave the descending road hidden behind the crest under the vehicle.
// Use a smaller surface margin and sample budget for these longer sight lines.
export function terrainViewHeight(target,end,ground,c){
 const dx=end.x-target.x,dz=end.z-target.z,length=Math.hypot(dx,dz);
 const steps=Math.min(c.maxTerrainViewSamples,Math.max(1,Math.ceil(length/c.terrainViewSampleSpacing)));
 let y=end.y;
 for(let i=1;i<=steps;i++){
  const t=i/steps,floor=ground(target.x+dx*t,target.z+dz*t)+c.terrainViewClearance;
  y=Math.max(y,target.y+(floor-target.y)/t);
 }
 return y;
}
