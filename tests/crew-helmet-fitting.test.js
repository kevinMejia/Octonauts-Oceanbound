import {test} from 'node:test';import assert from 'node:assert/strict';
import './fixtures/loadRescueNavigation.js';import * as T from '../vendor/three.module.js';
const {CrewHelmet}=await import('../src/crew/CrewHelmet.js');
function record(id='barnacles',moved=false){
 const parent=new T.Group(),motionRoot=new T.Group(),content=new T.Group();parent.add(motionRoot);motionRoot.add(content);
 const geometry=new T.BoxGeometry(1,2,1,1,4,1).translate(0,1,0),count=geometry.attributes.position.count,weights=new Float32Array(count*4);for(let i=0;i<count;i++)weights[i*4]=1;
 geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(new Uint16Array(count*4),4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));const skin=new T.SkinnedMesh(geometry,new T.MeshStandardMaterial()),bone=new T.Bone();skin.add(bone);content.add(skin);skin.bind(new T.Skeleton([bone]));
 const hat=new T.Mesh(new T.BoxGeometry(.4,.2,.4),new T.MeshStandardMaterial());hat.position.y=1.9;content.add(hat);parent.updateMatrixWorld(true);
 // Startup/preview can leave the skin's inverse in the old world frame while
 // ordinary parent matrices are subsequently refreshed during measurement.
 if(moved){parent.position.set(180,12,100);parent.rotation.y=.6;parent.scale.set(1.2,.9,1.5);}
 return {definition:{id},motionRoot,content,parent,skin};
}
test('helmet measurements stay local after translation, rotation and scale with stale skin bind inverses',()=>{
 const base=record(),moved=record('barnacles',true),a=new CrewHelmet(base),b=new CrewHelmet(moved);assert(a.group.position.distanceTo(b.group.position)<1e-6);assert(a.group.scale.distanceTo(b.group.scale)<1e-6);assert(Math.max(...b.group.scale.toArray())<2);assert(Math.abs(b.group.position.x)<.01&&Math.abs(b.group.position.z)<.01);b.setUnderwater(true);assert(b.group.visible);b.setUnderwater(false);assert(!b.group.visible);a.dispose();b.dispose();
});
test('Tunip has no helmet geometry, collar or visor, including after underwater/reset toggles',()=>{
 const r=record('tunip',true),helmet=new CrewHelmet(r);assert.equal(helmet.enabled,false);assert.equal(helmet.group.children.length,0);assert.equal(helmet.group.parent,null);for(const underwater of [true,false,true]){helmet.setUnderwater(underwater);assert.equal(helmet.group.visible,false);}helmet.dispose();
});
