import * as T from 'three';
import {damageConfig} from '../config/damageConfig.js';
import {octopodConfig} from '../config/octopodConfig.js';
import {heightAt} from '../environment/terrainMath.js';
// The south clearing is outside rescue delivery and the authored base feet.
// Check the existing solid index once, then cache the terrain-height placement.
export function repairLocation(surfaces,base=octopodConfig){const c=damageConfig.station,near=[];
 for(let ring=0;ring<c.searchRings;ring++)for(let i=0;i<(ring?16:1);i++){const a=i*Math.PI/8,x=base.position.x+c.offset[0]+Math.cos(a)*ring*c.searchStep,z=base.position.z+c.offset[2]+Math.sin(a)*ring*c.searchStep,y=heightAt(x,z)+c.offset[1]+c.hover;
 if(Math.hypot(x-base.position.x,z-base.position.z)<c.minBaseDistance)continue;surfaces.grid.query(x,z,c.obstacleClearance,near,'solid');
 if(near.every(s=>Math.hypot(s.x-x,s.z-z)>Math.max(s.rx,s.rz)+c.obstacleClearance||Math.abs(s.y-y)>s.ry+c.heightClearance))return {x,y,z};}throw Error('No clear repair station placement');}
export class RepairStation{
 constructor(scene,surfaces){this.position=repairLocation(surfaces);this.root=new T.Group();this.root.name='Octopod repair station';this.root.position.copy(this.position);scene.add(this.root);this.local=new T.Vector3();this.time=0;
 this.green=new T.MeshBasicMaterial({color:0x4aff93});this.dark=new T.MeshBasicMaterial({color:0x075c45,side:T.DoubleSide});this.white=new T.MeshBasicMaterial({color:0xe5fff0});this.geometries=[];
 const mesh=(geometry,material,parent=this.root)=>{this.geometries.push(geometry);const m=new T.Mesh(geometry,material);parent.add(m);return m;};
 mesh(new T.CircleGeometry(1.18,24),this.dark);this.ring=mesh(new T.TorusGeometry(1.25,.09,6,32),this.green);
 // Crossed procedural wrench and screwdriver, both face sides remain readable.
 const wrench=new T.Group(),driver=new T.Group();this.root.add(wrench,driver);wrench.rotation.z=-.65;driver.rotation.z=.65;
 mesh(new T.BoxGeometry(.16,1.55,.14),this.white,wrench).position.set(0,-.12,.1);
 mesh(new T.TorusGeometry(.25,.09,5,12,Math.PI*1.55),this.white,wrench).position.set(0,.65,.1);
 mesh(new T.BoxGeometry(.12,1.25,.12),this.white,driver).position.set(0,.28,.18);
 mesh(new T.BoxGeometry(.28,.6,.19),this.green,driver).position.set(0,-.55,.18);
 }
 touches(sub,group){const p=this.local.copy(this.position);group.updateWorldMatrix(true,false);group.worldToLocal(p);const h=sub.collisionProxy,c=damageConfig.station,r=c.radius+c.contactPadding,depth=Math.min(h.radius,h.halfLength),length=Math.max(0,h.halfLength-depth);for(let l=-1;l<=1;l++)if((p.x/(h.radius+r))**2+((p.y-(h.centerY??0))/(h.halfHeight+r))**2+((p.z-length*l)/(depth+r))**2<=1)return true;return false;}
 update(dt){this.time+=dt;this.root.rotation.y=Math.sin(this.time*.3)*.35;this.ring.scale.setScalar(1+Math.sin(this.time*2)*.035);}
 dispose(){this.root.removeFromParent();for(const g of this.geometries)g.dispose();this.green.dispose();this.dark.dispose();this.white.dispose();}
}
