// Absolute-time paths keep pause/resume and distant updates smooth without AI.
export function pufferfishPose(time,index,count,{orbitRadius=3.2,orbitSpeed=.24}={},out={}){
 const phase=index*Math.PI*2/count;
 const angle=time*orbitSpeed+phase+.065*Math.sin(time*.17+phase);
 const turn=orbitSpeed+.01105*Math.cos(time*.17+phase);
 const radius=orbitRadius+.12*Math.sin(time*.23+phase),radialSpeed=.0276*Math.cos(time*.23+phase);
 const c=Math.cos(angle),s=Math.sin(angle);
 out.x=c*radius;out.z=s*radius*.85;out.y=Math.sin(time*.65+phase)*.25;
 const vx=c*radialSpeed-s*radius*turn,vz=(s*radialSpeed+c*radius*turn)*.85;
 out.heading=Math.atan2(vx,vz);out.bank=Math.sin(time*.45+phase)*.06;
 return out;
}
