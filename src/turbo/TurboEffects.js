import * as T from 'three';
// Adapted from Little Big Dirt's lightweight blue turbo exhaust, positioned behind GUP-B.
export class TurboEffects{
 constructor(root){this.group=new T.Group();root.add(this.group);this.time=0;const geometry=new T.ConeGeometry(.2,1.8,8);for(const x of [-.35,.35]){const m=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0x68efff,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}));m.rotation.x=-Math.PI/2;m.position.set(x,-.3,-3.0);this.group.add(m);}this.group.visible=false;}
 update(dt,active){this.group.visible=active;this.time+=dt;if(active)this.group.scale.z=1+Math.sin(this.time*45)*.12;}
}
