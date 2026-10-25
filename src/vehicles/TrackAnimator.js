import * as T from 'three';
// Named clip/mesh bindings allow replacement GLBs without controller changes.
// Authored placeholders use discrete belt links moving around a closed capsule.
export class TrackAnimator{
 constructor(model,config,clips=[]){this.config=config;this.phase={left:0,right:0};this.links={left:[],right:[]};this.belts={};this.actions={};this.morphs={left:[],right:[]};this.mixer=new T.AnimationMixer(model);
  model.traverse(o=>{for(const side of ['left','right'])if(o.name.startsWith(config[side]+'Link'))this.links[side].push(o);});
  for(const side of ['left','right']){const clip=clips.find(c=>c.name===config[side+'Clip']);if(clip){const action=this.mixer.clipAction(clip);action.play();this.actions[side]=action;}
   const tread=model.getObjectByName(config[side+'Morph']);tread?.traverse(o=>{if(o.isMesh&&o.morphTargetInfluences)this.morphs[side].push(o);});
   const links=this.links[side];if(links.length&&links.every(o=>o.isMesh&&o.parent===model&&o.geometry===links[0].geometry&&o.material===links[0].material)){
    const belt=new T.InstancedMesh(links[0].geometry,links[0].material,links.length);belt.name=side+' instanced tread';belt.instanceMatrix.setUsage(T.DynamicDrawUsage);belt.frustumCulled=false;model.add(belt);this.belts[side]=belt;for(const link of links)link.visible=false;
   }
  }
 }
 update(dt,ground){if(!ground)return;const c=this.config;
  for(const side of ['left','right']){this.phase[side]=(this.phase[side]+ground[side+'Speed']*dt*(c.direction??1)/(c.pitch??c.loopLength))%1;
   // Blender samples one source-link pitch through the authored Array/Curve
   // modifiers. Adjacent morphs interpolate; wrapping exchanges identical links.
   const phase=((this.phase[side]%1)+1)%1,step=phase*(c.morphSteps??8),index=Math.floor(step),blend=step-index;
   for(const mesh of this.morphs[side]){const weights=mesh.morphTargetInfluences,dict=mesh.morphTargetDictionary;weights.fill(0);if(index>0)weights[dict['TreadPhase'+index]]=1-blend;weights[dict['TreadPhase'+(index+1)]]=blend;}
   if(this.actions[side])this.actions[side].timeScale=ground[side+'Speed']/c.loopLength*this.actions[side].getClip().duration;
   const links=this.links[side];for(let i=0;i<links.length;i++){const link=links[i],t=((i/links.length+this.phase[side])%1+1)%1;
    // Arc-length parameterisation keeps the lower tread moving at ground speed.
    const radius=c.radius??.53,end=(c.halfLength??2.65)-radius,straight=end*2,arc=Math.PI*radius;
    let d=t*(straight*2+arc*2),z,y,angle;
    if(d<straight){z=-end+d;y=radius;angle=0;}
    else if((d-=straight)<arc){angle=d/radius;z=end+Math.sin(angle)*radius;y=Math.cos(angle)*radius;}
    else if((d-=arc)<straight){z=end-d;y=-radius;angle=Math.PI;}
    else{d-=straight;angle=Math.PI+d/radius;z=-end+Math.sin(angle)*radius;y=Math.cos(angle)*radius;}
    link.position.z=z;link.position.y=(c.centerY??-.05)+y;link.rotation.x=angle;
    if(this.belts[side]){link.updateMatrix();this.belts[side].setMatrixAt(i,link.matrix);}
   }
   if(this.belts[side])this.belts[side].instanceMatrix.needsUpdate=true;
  }
  this.mixer.update(dt);
 }
}
