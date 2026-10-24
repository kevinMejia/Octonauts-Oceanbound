const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const approach=(a,b,n)=>a+clamp(b-a,-n,n);
// One stateful integrator for configured individuals and group leaders. No scene dependency.
export class AnimalMovement{
 constructor(config){this.config=config;const c=config;this.position={x:c.center.x,y:c.center.y,z:c.center.z+c.routeRadius};this.heading=Math.PI/2;this.speed=0;this.bank=0;this.time=0;this.routePhase=0;this.waypoint=0;this.escapeLeft=0;this.cooldown=0;this.pauseLeft=0;this.nextPause=c.pauseInterval;this.near=[];this.avoidX=0;this.avoidZ=0;this.senseLeft=0;this.playerPrevious=null;this.approachSpeed=0;this.escapeHeading=this.heading;}
 target(){const c=this.config,p=this.position;
  if(c.pattern==='stationary')return {x:c.center.x+Math.sin(this.time*.19)*2,z:c.center.z+Math.cos(this.time*.13)*2};
  if((c.pattern==='patrol'||c.pattern==='migration')&&c.waypoints?.length){let w=c.waypoints[this.waypoint];if(Math.hypot(p.x-c.center.x-w[0],p.z-c.center.z-w[1])<Math.max(5,this.speed*.8)){this.waypoint=(this.waypoint+1)%c.waypoints.length;w=c.waypoints[this.waypoint];}return {x:c.center.x+w[0],z:c.center.z+w[1]};}
  // Advance a lookahead along a broad route; roaming gently varies its radius.
  this.routePhase=Math.atan2(p.x-c.center.x,p.z-c.center.z)+Math.max(.2,this.speed*.8/Math.max(1,c.routeRadius));
  const radius=c.pattern==='roaming'?Math.min(c.roamingRadius,c.routeRadius)*( .86+.12*Math.sin(this.time*.09)):c.routeRadius;
  return {x:c.center.x+Math.sin(this.routePhase)*radius,z:c.center.z+Math.cos(this.routePhase)*radius};
 }
 update(dt,player,{grid,ground=()=>0,steering}={}){
  // Measure the GUP's own approach, not an animal swimming past a waiting player.
  if(dt>0){const previous=this.playerPrevious,p=this.position;if(previous){const vx=(player.x-previous.x)/dt,vy=(player.y-previous.y)/dt,vz=(player.z-previous.z)/dt,d=Math.hypot(p.x-player.x,p.y-player.y,p.z-player.z)||1;this.approachSpeed=Math.hypot(vx,vy,vz)<80?(vx*(p.x-player.x)+vy*(p.y-player.y)+vz*(p.z-player.z))/d:0;}this.playerPrevious??={};Object.assign(this.playerPrevious,player);}
  let left=Math.max(0,dt);while(left>1e-8){const step=Math.min(left,.05);this.step(step,player,grid,ground,steering);left-=step;}return this;}
 step(dt,player,grid,ground,steering){const c=this.config,p=this.position;this.time+=dt;this.escapeLeft=Math.max(0,this.escapeLeft-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  const distance=Math.hypot(p.x-player.x,p.y-player.y,p.z-player.z),active=c.evasionEnabled&&c.reaction!=='passive';
  const threatened=distance<c.emergencyDistance||this.approachSpeed>c.approachSpeedThreshold||c.reaction==='curious'||c.reaction==='cautious';
  if(active&&threatened&&!this.escapeLeft&&!this.cooldown&&distance<Math.min(c.triggerDistance,c.detectionRadius)){
   this.reacted=true;this.escapeLeft=c.evasionDuration;this.cooldown=c.evasionDuration+c.evasionCooldown;
   const dx=p.x-player.x,dz=p.z-player.z,away=Math.hypot(dx,dz)>.001?Math.atan2(dx,dz):this.heading,delta=angle(away-this.heading);
   // Latch a coherent escape course so a near-head-on approach cannot flip turn sides.
   this.escapeHeading=angle(away-(Math.abs(delta)>Math.PI/2?Math.sign(delta)*.4:0));
  }
  let target=this.target(),desired=c.cruisingSpeed*(1+c.speedVariation*(Math.sin(this.time*.37)*.65+Math.sin(this.time*.17+1)*.35)),escaping=active&&this.escapeLeft>0&&c.reaction!=='cautious';
  if(escaping){target={x:p.x+Math.sin(this.escapeHeading)*25,z:p.z+Math.cos(this.escapeHeading)*25};desired=c.escapeSpeed;}
  else if(active&&distance<c.detectionRadius){
   if(c.reaction==='curious'&&!this.cooldown){target=player;desired*=.8;}
   else if(c.reaction==='cautious'){target={x:p.x+(p.x-player.x),z:p.z+(p.z-player.z)};}
  }
  if(this.reacted&&!escaping){if(!c.returnToRoute)target={x:p.x+Math.sin(this.heading)*20,z:p.z+Math.cos(this.heading)*20};if(!c.returnToNormal)desired=c.maxSpeed;}
  const limit=Math.max(1,Math.min(c.habitatRadius,c.maxHabitatDistance)-c.footprint),radial=Math.hypot(p.x-c.center.x,p.z-c.center.z);
  const turnSpeed=escaping?c.evasionTurningSpeed:c.turningSpeed;
  this.senseLeft-=dt;if(this.senseLeft<=0){this.senseLeft=.2;this.avoidX=this.avoidZ=0;if(grid)for(const s of grid.query(p.x,p.z,c.footprint+this.speed*2+8,this.near)){if(!s.solid||Math.abs(p.y-s.y)>(s.ry??s.radius)+c.bodyHeight)continue;const dx=p.x-s.x,dz=p.z-s.z,n=Math.hypot(dx,dz)||1,r=Math.max(s.rx??s.radius,s.rz??s.radius)+c.footprint+this.speed*1.5;if(n<r){this.avoidX+=(dx*3-dz*2)/n*(r-n);this.avoidZ+=(dz*3+dx*2)/n*(r-n);}}}
  let steerX=target.x-p.x+this.avoidX+(steering?.x??0),steerZ=target.z-p.z+this.avoidZ+(steering?.z??0);
  const margin=Math.max(8,this.speed/Math.max(.1,turnSpeed)*1.4),soft=limit-margin;
  if(radial>soft&&radial>.001){
   const nx=(p.x-c.center.x)/radial,nz=(p.z-c.center.z)/radial,outward=steerX*nx+steerZ*nz;
   if(outward>0){const inward=Math.max(.15,clamp((radial-soft)/margin,0,1))*Math.max(10,Math.hypot(steerX,steerZ));steerX-=nx*(outward+inward);steerZ-=nz*(outward+inward);
    // Follow the habitat edge rather than cancelling the escape and turning at its centre.
    if(Math.abs(steerX*nz-steerZ*nx)<2){const side=Math.sign(Math.sin(this.heading)*nz-Math.cos(this.heading)*nx)||1;steerX+=nz*side*15;steerZ-=nx*side*15;}
   }
  }
  let heading=Math.atan2(steerX,steerZ),turn=clamp(angle(heading-this.heading),-turnSpeed*dt,turnSpeed*dt);this.heading=angle(this.heading+turn);this.bank+=(clamp(-turn/dt*.18,-.24,.24)-this.bank)*(1-Math.exp(-3*dt));
  if(c.pattern==='stationary'&&!escaping)desired=Math.min(desired,Math.hypot(target.x-p.x,target.z-p.z)*.4);
  this.pauseLeft=Math.max(0,this.pauseLeft-dt);if(c.pauseSeconds>0&&this.time>=this.nextPause){this.pauseLeft=c.pauseSeconds;this.nextPause=this.time+c.pauseInterval;}
  desired=this.pauseLeft&&!escaping?0:clamp(desired,c.pattern==='stationary'?0:c.minSpeed,escaping?c.escapeSpeed:c.maxSpeed);this.speed=approach(this.speed,desired,(desired>this.speed?(escaping?c.escapeAcceleration:c.acceleration):c.deceleration)*dt);
  const x=p.x+Math.sin(this.heading)*this.speed*dt,z=p.z+Math.cos(this.heading)*this.speed*dt;
  const y=clamp(c.center.y+Math.sin(this.time*.45)*c.verticalVariation,Math.max(c.minY,ground(x,z)+c.clearance),c.maxY);
  let blocked=Math.hypot(x-c.center.x,z-c.center.z)>limit;
  // Swept conservative bounds prevent tunnelling; local steering handles the detour.
  if(grid)for(const s of grid.query(x,z,c.footprint+this.speed*dt,this.near)){if(!s.solid||Math.abs(y-s.y)>(s.ry??s.radius)+c.bodyHeight)continue;const dx=x-p.x,dz=z-p.z,n=dx*dx+dz*dz,t=n?clamp(((s.x-p.x)*dx+(s.z-p.z)*dz)/n,0,1):0;if(Math.hypot(p.x+dx*t-s.x,p.z+dz*t-s.z)<Math.max(s.rx??s.radius,s.rz??s.radius)+c.footprint){blocked=true;break;}}
  if(!blocked){p.x=x;p.z=z;}else this.speed=approach(this.speed,0,c.deceleration*dt);
  p.y=approach(p.y,y,Math.max(.5,c.acceleration)*dt);
 }
}
