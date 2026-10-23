// Full-resolution imported GUP-B is the default on development and public hosts.
// Keep the original available for repeatable visual/performance comparisons.
export function useImportedGup(location){return new URLSearchParams(location.search).get('gup')!=='original';}
export function collectModelStats(model){
 const materials=new Set(),textures=new Set();let triangles=0,meshes=0;
 model.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
 const textureDetails=[...textures].map(t=>({name:t.name,width:t.image?.width??0,height:t.image?.height??0}));
 return {triangles,meshes,materials:materials.size,textures:textureDetails,textureMemoryEstimateMiB:textureDetails.reduce((bytes,t)=>bytes+t.width*t.height*4*4/3,0)/1048576};
}
