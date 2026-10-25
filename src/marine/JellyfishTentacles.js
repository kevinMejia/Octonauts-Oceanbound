import * as T from 'three';

// Only opaque, unskinned tentacles are batched. Their original pivots remain
// the animation owners; bells and all encounter movement stay unchanged.
export class JellyfishTentacles{
 constructor(group,sources,enabled=true){
  this.sources=sources;this.batches=[];
  this.compatible=sources.every(({mesh})=>mesh.matrixAutoUpdate&&!mesh.isSkinnedMesh&&!mesh.morphTargetInfluences?.length&&!Array.isArray(mesh.material)&&!mesh.material.transparent&&!mesh.castShadow&&!mesh.receiveShadow&&mesh.visible&&mesh.layers.mask===1&&mesh.position.lengthSq()===0&&mesh.quaternion.x===0&&mesh.quaternion.y===0&&mesh.quaternion.z===0&&mesh.quaternion.w===1&&mesh.scale.x===1&&mesh.scale.y===1&&mesh.scale.z===1);
  if(!this.compatible){this.enabled=false;return;}
  for(const source of sources){
   let batch=this.batches.find(b=>b.mesh.geometry===source.mesh.geometry&&b.mesh.material===source.mesh.material);
   if(!batch){const count=sources.filter(s=>s.mesh.geometry===source.mesh.geometry&&s.mesh.material===source.mesh.material).length;
    const mesh=new T.InstancedMesh(source.mesh.geometry,source.mesh.material,count);mesh.name='Jellyfish opaque tentacles';mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);batch={mesh,sources:[]};this.batches.push(batch);
   }batch.sources.push(source);
  }
  this.setEnabled(enabled);
 }
 setEnabled(enabled){if(!this.compatible)return;this.enabled=enabled;for(const source of this.sources)source.mesh.visible=!enabled;for(const b of this.batches)b.mesh.visible=enabled;this.update();}
 update(){
  if(!this.enabled)return;
  for(const b of this.batches){for(let i=0;i<b.sources.length;i++){const {pivot}=b.sources[i];pivot.updateMatrix();b.mesh.setMatrixAt(i,pivot.matrix);}b.mesh.instanceMatrix.needsUpdate=true;b.mesh.computeBoundingSphere();b.mesh.boundingBox=null;}
 }
}
