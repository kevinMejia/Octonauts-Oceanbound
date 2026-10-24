const pair=(left,leftTip,right,rightTip)=>[{bone:left,tip:leftTip},{bone:right,tip:rightTip}];
const standardArms=[{bone:'Bone.018',tip:'Bone.007',followers:['Bone.008']},{bone:'Bone.019',tip:'Bone.012',followers:['Bone.013']}];
export const towVisualConfig={
 pose:{enabled:true,blendSpeed:8,releaseSpeed:6,reachWeight:.72,reachDirection:[.45,.25,.86],bodyPitch:.045,bodyBob:.015,bodyRoll:.012,
  characters:{
   barnacles:{rig:'Barnicals_Armature',joints:standardArms},kwazii:{rig:'Kwazii_Armature',joints:standardArms},
   dashi:{rig:'Dashi_Armature',joints:standardArms},shellington:{rig:'Shellington_Armature',joints:standardArms},tweak:{rig:'Tweak_Armature',joints:standardArms},
   peso:{rig:'Peso_Armature',joints:pair('Bone.008_L','Bone.009_L','Bone.008_R','Bone.009_R').map((joint,i)=>({...joint,followers:[i?'Bone.022_R':'Bone.022_L']})),reachWeight:.6},
   tunip:{rig:'Tunip_Armature',joints:pair('Bone.007','Bone.008','Bone.024','Bone.025'),reachWeight:.55},
   inkling:{rig:'Inkling_Armature',joints:pair('Bone.008','Bone.019','Bone.014','Bone.050'),reachWeight:.25}
  }
 },
 water:{enabled:true,maxParticles:40,lowParticles:24,emissionRate:10,lowEmissionRate:7,speedThreshold:.4,fullSpeed:8,opacity:.25,lifetime:.9,renderDistance:45,maxJump:3}
};
