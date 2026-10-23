import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {GupB} from './GupB.js';
import {collectModelStats} from './gupAsset.js';
import {vehicleById,vehicleModelURL} from '../config/vehicleConfig.js';
// Release renderer allocations, while retaining CPU buffers and image bitmaps for reuse.
// Never close ImageBitmaps or dispose another cached vehicle's shared image data.
export function releaseVehicleGPU(vehicle){
 const geometries=new Set(),materials=new Set(),textures=new Set();vehicle.group.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
 for(const item of textures){item.dispose();item.needsUpdate=true;}for(const item of materials){item.dispose();item.needsUpdate=true;}for(const item of geometries)item.dispose();
}
export async function loadVehicle(id){const definition=vehicleById(id),start=performance.now();const gltf=await new GLTFLoader().loadAsync(vehicleModelURL(definition));const vehicle=new GupB(gltf.scene,{imported:true});
 vehicle.group.scale.setScalar(definition.scale);gltf.scene.rotation.y+=definition.orientation;vehicle.definition=definition;vehicle.rotors=definition.propellers.map(p=>({...p,node:gltf.scene.getObjectByName(p.name)})).filter(p=>p.node);vehicle.stats={...collectModelStats(gltf.scene),variant:id,loadMs:performance.now()-start};return vehicle;
}
