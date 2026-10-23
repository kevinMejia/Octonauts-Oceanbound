import * as T from 'three';
import {vehicleLoader} from './VehicleTextures.js';
import {collectModelStats,useImportedGup} from './gupAsset.js';
export class GupB{
 static async load(){
  const start=performance.now(),loader=vehicleLoader(),imported=useImportedGup(location);
  const highURL=new URL('../../assets/models/gup-b-high.glb',import.meta.url).href;
  const originalURL=new URL('../../assets/models/gup-b.glb',import.meta.url).href;
  const gltf=await loader.loadAsync(imported?highURL:originalURL);
  const vehicle=new GupB(gltf.scene,{imported});vehicle.stats={...collectModelStats(gltf.scene),variant:imported?'imported':'original',loadMs:performance.now()-start};
  vehicle.stats.bounds=new T.Box3().setFromObject(gltf.scene).getSize(new T.Vector3()).toArray();return vehicle;
 }
 constructor(model,{imported=false}={}){
  this.group=new T.Group();this.group.add(model);
  model.traverse(o=>{if(!o.isMesh)return;
   for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(!imported){if(m.name.startsWith('Hull')){m.roughness=.3;m.envMapIntensity=.85;}if(m.name==='Blue bubble canopy'){m.roughness=.16;m.envMapIntensity=1.2;m.opacity=.38;m.depthWrite=false;}}
    else{
     if(m.transparent)m.depthWrite=false;
     if(m.userData.oceanboundFacingAlpha){
      // Equivalent to the supplied Glass2 Layer Weight -> linear ramp mix.
      // glTF cannot represent this view-dependent transparent shader itself.
      m.opacity=1;m.transparent=true;m.depthWrite=false;
      m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= clamp((1.0 - abs(dot(normal, normalize(vViewPosition))) - 0.018181818) / 0.92727278, 0.0, 1.0);\n#include <opaque_fragment>');};
      m.customProgramCacheKey=()=> 'oceanbound-source-glass-facing-v1';
     }
    }
   }
  });
  // The imported tail is not a propeller. Never animate unrelated geometry.
  this.propeller=imported?null:model.getObjectByName('Propeller');
 }
 update(dt,s){this.group.position.set(s.position.x,s.position.y,s.position.z);this.group.rotation.set(s.pitch,s.heading,s.bank,'YXZ');if(this.propeller)this.propeller.rotation.z+=dt*(2+Math.abs(s.speed)*5);if(this.rotors?.length){const target=Math.abs(s.speed)*5+Math.abs(s.vertical)*2;this.rotorRate=(this.rotorRate??0)+(target-(this.rotorRate??0))*(1-Math.exp(-dt*5));for(const rotor of this.rotors)rotor.node.rotation[rotor.axis]+=dt*this.rotorRate*rotor.direction;}}
}
