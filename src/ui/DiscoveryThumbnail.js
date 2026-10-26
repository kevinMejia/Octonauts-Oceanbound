import * as T from 'three';
import {discoveryPreviewConfig as config} from '../config/discoveryPreviewConfig.js';

// Render the existing, orientation-corrected visual once. No mesh/material clones,
// animation changes, second renderer, or persistent render targets are needed.
export function discoveryThumbnail(renderer,group,view=config.views.marine){
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.01,2000),parent=group.parent,index=parent?.children.indexOf(group),position=group.position.clone(),rotation=group.quaternion.clone(),scale=group.scale.clone(),visible=group.visible;
 const target=new T.WebGLRenderTarget(config.size,config.size);target.texture.colorSpace=T.SRGBColorSpace;
 const previous=renderer.getRenderTarget(),alpha=renderer.getClearAlpha(),color=renderer.getClearColor(new T.Color()),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear;
 try{
  // Asset transforms (including native-forward correction) are inside this root.
  group.position.set(0,0,0);group.quaternion.identity();group.visible=true;scene.add(group);group.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),distance=Math.max(size.length(),.1)*1.05,yaw=view.yaw*Math.PI/180,elevation=view.elevation*Math.PI/180;
  camera.position.copy(center).add(new T.Vector3(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation)).multiplyScalar(distance));camera.lookAt(center);
  camera.updateMatrixWorld(true);let extent=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));}
  const half=Math.max(extent,.01)/(view.edge??config.edge);camera.left=camera.bottom=-half;camera.right=camera.top=half;camera.updateProjectionMatrix();
  const light=config.light;scene.add(new T.HemisphereLight(light.sky,light.ground,light.ambient));
  for(const [x,y,z,intensity] of [[3,4,5,light.key],[-4,1,3,light.fill]]){const lamp=new T.DirectionalLight(0xffffff,intensity);lamp.position.copy(center).add(new T.Vector3(x,y,z).multiplyScalar(distance));lamp.target.position.copy(center);scene.add(lamp,lamp.target);}
  renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.autoClear=true;renderer.setClearColor(0x000000,0);renderer.render(scene,camera);
  const pixels=new Uint8Array(config.size*config.size*4);renderer.readRenderTargetPixels(target,0,0,config.size,config.size,pixels);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=config.size;const context=canvas.getContext('2d'),data=context.createImageData(config.size,config.size),stride=config.size*4;
  for(let y=0;y<config.size;y++)data.data.set(pixels.subarray((config.size-1-y)*stride,(config.size-y)*stride),y*stride);context.putImageData(data,0,0);
  if(view.crop){
   // Crop transparent padding, not model pixels, so wide and tall animals each
   // fill their existing object-fit screen without changing its mobile layout.
   let left=config.size,top=config.size,right=-1,bottom=-1;
   for(let y=0;y<config.size;y++)for(let x=0;x<config.size;x++)if(data.data[(y*config.size+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   if(right>=left){const padding=Math.ceil(Math.max(right-left+1,bottom-top+1)*config.cropPadding);left=Math.max(0,left-padding);top=Math.max(0,top-padding);right=Math.min(config.size-1,right+padding);bottom=Math.min(config.size-1,bottom+padding);
    const cropped=document.createElement('canvas');cropped.width=right-left+1;cropped.height=bottom-top+1;cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);return cropped.toDataURL('image/png');
   }
  }return canvas.toDataURL('image/png');
 }finally{
  renderer.setRenderTarget(previous);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.autoClear=autoClear;renderer.setClearColor(color,alpha);target.dispose();
  scene.remove(group);group.position.copy(position);group.quaternion.copy(rotation);group.scale.copy(scale);group.visible=visible;
  if(parent){parent.add(group);parent.children.splice(parent.children.indexOf(group),1);parent.children.splice(index,0,group);}group.updateMatrixWorld(true);
 }
}
