import * as T from 'three';
import {crewHelmetConfig as config} from '../config/crewHelmetConfig.js';
// Cosmetic only: measured before installation, so helmets never affect gameplay bounds.
export class CrewHelmet{
 constructor(record){
  const root=record.motionRoot,profile=config.characters[record.definition.id]??{},bounds=new T.Box3(),point=new T.Vector3(),matrix=new T.Matrix4();root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert();
  const meshes=[];record.content.traverse(node=>{if(node.isMesh&&node.geometry.attributes.position){node.skeleton?.update();meshes.push(node);}});
  const visit=callback=>{for(const mesh of meshes){matrix.multiplyMatrices(inverse,mesh.matrixWorld);for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point).applyMatrix4(matrix);callback(point);}}};
  visit(p=>bounds.expandByPoint(p));const cutoff=bounds.min.y+(bounds.max.y-bounds.min.y)*(profile.headStart??config.headStart),head=new T.Box3();visit(p=>{if(p.y>=cutoff)head.expandByPoint(p);});if(head.isEmpty())head.copy(bounds);
  const center=head.getCenter(new T.Vector3()),size=head.getSize(new T.Vector3()),padding=profile.padding??config.padding;
  this.group=new T.Group();this.group.name=record.definition.id+' underwater bubble helmet';this.group.position.copy(center);this.group.scale.set(Math.max(size.x,size.z)*.56*padding,size.y*.66*padding,Math.max(size.x,size.z)*.56*padding);this.group.visible=false;root.add(this.group);
  const shell=new T.Mesh(new T.SphereGeometry(1,32,20),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 vNormal;varying vec3 vView;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.);gl_FragColor=vec4(mix(vec3(.55,.89,.96),vec3(.84,.98,1.),rim),.018+rim*.26);}`}));shell.name='Clear helmet visor';shell.renderOrder=2;this.group.add(shell);
  const collar=new T.Mesh(new T.TorusGeometry(.6,.035,8,40),new T.MeshStandardMaterial({color:0x72dce9,metalness:.35,roughness:.35}));collar.rotation.x=Math.PI/2;collar.position.y=-.8;collar.name='Helmet neck seal';this.group.add(collar);
  const curve=new T.CatmullRomCurve3([new T.Vector3(.38,.74,.555),new T.Vector3(.53,.59,.61),new T.Vector3(.64,.4,.655)]),glint=new T.Mesh(new T.TubeGeometry(curve,12,.014,5,false),new T.MeshBasicMaterial({color:0xeeffff,transparent:true,opacity:.65,depthWrite:false}));glint.name='Visor reflection';glint.renderOrder=3;this.group.add(glint);
 }
 setUnderwater(underwater){this.group.visible=config.enabled&&underwater;}
 dispose(){this.group.removeFromParent();this.group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});}
}
