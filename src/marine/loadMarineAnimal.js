// Explicit opt-in adapter for future assets. Never called for the empty registry.
export async function loadMarineAnimal(definition,{scene,discovery,load,behavior}={}){
 const T=await import('three');
 if(!discovery?.records.has(definition.id))throw Error('Animal must belong to the marine registry');
 const d=discovery.records.get(definition.id);
 if(!load){const {vehicleLoader}=await import('../vehicles/VehicleTextures.js');const loader=vehicleLoader();load=path=>loader.loadAsync(path);}
 const gltf=await load(d.modelPath),group=new T.Group();group.add(gltf.scene);
 group.scale.setScalar(d.scale??1);group.rotation.set(d.orientation?.x??0,d.orientation?.y??0,d.orientation?.z??0);group.position.set(d.position.x,d.position.y,d.position.z);
 const mixer=d.animation?new T.AnimationMixer(gltf.scene):null;
 const clip=gltf.animations?.find(c=>c.name===d.animation?.clip);if(clip)mixer.clipAction(clip).setEffectiveTimeScale(d.animation.speed??1).play();
 scene.add(group);const center=new T.Vector3();
 return {group,definition:d,update(dt,playerPosition){
  if(group.position.distanceToSquared(playerPosition)>(d.updateDistance??100)**2)return;
  behavior?.({group,dt,config:d.behavior});mixer?.update(dt);group.getWorldPosition(center);discovery.setPosition(d.id,center);
 },dispose(){scene.remove(group);mixer?.stopAllAction();mixer?.uncacheRoot(gltf.scene);group.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}};
}
