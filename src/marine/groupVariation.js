import {random} from '../environment/terrainMath.js';
const tau=Math.PI*2;
export function speciesSeed(id,seed){for(const char of id)seed=Math.imul(seed^char.charCodeAt(0),16777619);return seed>>>0;}
// Bounded rejection sampling; never relax spacing or silently drop members.
export function createGroupVariation(id,count,c){
 const rng=random(speciesSeed(id,c.seed)),members=[];
 for(let i=0;i<count;i++){
  let offset=count===1?{x:0,y:0,z:0}:null;
  for(let attempt=0;!offset&&attempt<512;attempt++){
   const a=rng()*tau,r=c.spawnRadius*Math.sqrt(rng())*(.75+rng()*.25),candidate={x:Math.cos(a)*r,y:(rng()*2-1)*c.spawnHeightVariation,z:Math.sin(a)*r};
   // Reserve both members' complete drift envelopes, so drift cannot cause overlap.
   if(members.every(m=>Math.hypot(m.offset.x-candidate.x,m.offset.z-candidate.z)>=c.spawnMinSeparation+c.driftRadius*2))offset=candidate;
  }
  if(!offset)throw Error('Group spacing does not fit spawn radius: '+id);
  const vary=n=>1+(rng()*2-1)*n;
  members.push({offset,phase:rng()*tau,heading:(rng()*2-1)*c.initialHeadingVariation,speed:vary(c.speedVariation),acceleration:vary(c.accelerationVariation),turnSpeed:vary(c.turnSpeedVariation),radius:vary(c.patrolRadiusVariation),pause:vary(c.pauseTimeVariation),routePhase:(i+rng()*.6)*c.routePhaseOffset/count,direction:rng()<.5?-1:1,animationRate:.85+rng()*.3});
 }return members;
}
// Smooth, bounded drift about irregular anchors. Every oscillator has seeded timing.
export function looseMemberPose(time,member,c,out={}){
 const cycle=Math.max(0,time+member.phase*10),period=c.pauseInterval*member.pause,swim=Math.max(.1,period-c.pauseSeconds*member.pause);
 const clock=Math.floor(cycle/period)*swim+Math.min(cycle%period,swim),t=clock*c.driftSpeed*member.speed*member.direction,a=member.phase,amplitude=c.driftRadius*.7/(1+c.groupCohesion);
 const x=Math.sin(t+a),z=Math.sin(t*.73+a*1.7);
 out.x=member.offset.x+x*amplitude;out.z=member.offset.z+z*amplitude;
 out.y=member.offset.y+Math.sin(t*.61+a*2)*Math.min(.22,c.spawnHeightVariation*.3);
 out.heading=member.heading+Math.sin(t*.4+a)*.45;
 return out;
}
export function neighborSteering(index,positions,c,out={}){
 const p=positions[index];let x=0,z=0,cx=0,cz=0;
 for(let j=0;j<positions.length;j++){if(j===index)continue;const q=positions[j],dx=p.x-q.x,dz=p.z-q.z,n=Math.hypot(dx,dz)||.001;cx+=q.x;cz+=q.z;
  if(n<c.preferredSpacing){const weight=((c.preferredSpacing-n)+Math.max(0,c.spawnMinSeparation*2-n)*4)*c.groupSeparation;x+=(dx-dz*.35)/n*weight;z+=(dz+dx*.35)/n*weight;}
 }
 const others=positions.length-1;
 if(others){x+=(cx/others-p.x)*c.groupCohesion;z+=(cz/others-p.z)*c.groupCohesion;}
 out.x=x;out.z=z;return out;
}
