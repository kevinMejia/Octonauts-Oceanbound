// Small local-deck scheduler and visibility graph. No world physics or save state.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function segmentDistance(a,b,p){const dx=b.x-a.x,dz=b.z-a.z,n=dx*dx+dz*dz,t=n?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/n)):0;return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
function hitsBox(a,b,box,padding){
 const c=Math.cos(box.heading??0),s=Math.sin(box.heading??0),px=(a.x-box.x)*c-(a.z-box.z)*s,pz=(a.x-box.x)*s+(a.z-box.z)*c,dx=(b.x-a.x)*c-(b.z-a.z)*s,dz=(b.x-a.x)*s+(b.z-a.z)*c;let lo=0,hi=1;
 for(let axis=0;axis<2;axis++){const p=axis?pz:px,d=axis?dz:dx,half=(axis?box.halfDepth:box.halfWidth)+padding;
  if(Math.abs(d)<1e-9){if(Math.abs(p)>half)return false;}
  else{let t1=(-half-p)/d,t2=(half-p)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false;}
 }
 return true;
}
export class CrewActivities{
 constructor(config,{random=Math.random}={}){this.config=config;this.random=random;this.actors=new Map();this.reservations=new Map();this.slots=[];this.time=0;
  for(const station of config.stations){const capacity=station.maxOccupancy??1,heading=station.target?Math.atan2(station.target.x-station.position.x,station.target.z-station.position.z):station.heading??0;
   for(let index=0;index<capacity;index++){const offset=(index-(capacity-1)/2)*(station.spacing??config.stationSpacing);this.slots.push({key:station.id+':'+index,station,index,x:station.position.x+Math.cos(heading)*offset,y:station.position.y??config.floorY,z:station.position.z-Math.sin(heading)*offset,heading});}
  }
 }
 between(min,max){return min+(max-min)*this.random();}
 decisionDelay(){return this.between(this.config.minDecisionDelay,this.config.maxDecisionDelay);}
 workDuration(slot){return this.between(slot.station.minDuration??this.config.minWorkDuration,slot.station.maxDuration??this.config.maxWorkDuration);}
 sync(records){
  const ids=new Set(records.map(r=>r.id));for(const id of this.actors.keys())if(!ids.has(id))this.remove(id);
  for(const record of records)if(!this.actors.has(record.id))this.add(record);
 }
 add(record){
  const actor={id:record.id,position:{...record.position},heading:record.heading,radius:record.radius,state:'IDLE',timer:this.between(...this.config.initialDelay),current:null,target:null,path:[],pathIndex:0,travelTime:0,blocked:0,phase:this.random()*Math.PI*2,activityType:'idle'};
  if(this.config.enabled&&!this.clearSegment(actor.position,actor.position,actor)){
   const choices=[...this.slots.filter(s=>s.station.activityType==='idle'&&!this.reservations.has(s.key)),...this.config.arrivalPositions].sort((a,b)=>distance(a,actor.position)-distance(b,actor.position));const clear=choices.find(p=>this.clearSegment(p,p,actor));if(clear)actor.position={x:clear.x,y:clear.y??this.config.floorY,z:clear.z};
  }
  this.actors.set(actor.id,actor);const slot=this.slots.find(s=>distance(s,actor.position)<this.config.arrivalDistance&&!this.reservations.has(s.key));
  if(slot){this.reservations.set(slot.key,actor.id);actor.current=slot;if(slot.station.activityType!=='idle'){actor.state='WORKING';actor.timer=this.workDuration(slot);actor.activityType=slot.station.activityType;}}
  return actor;
 }
 remove(id){const actor=this.actors.get(id);if(!actor)return;for(const [key,owner] of this.reservations)if(owner===id)this.reservations.delete(key);this.actors.delete(id);}
 clearSegment(a,b,actor,{destinations=true}={}){
  const margin=this.config.personalSpace,radius=actor.radius;
  if(Math.hypot(a.x,a.z)+radius>this.config.walkableRadius||Math.hypot(b.x,b.z)+radius>this.config.walkableRadius)return false;
  for(const box of this.config.obstacles)if(hitsBox(a,b,box,radius+margin))return false;
  for(const other of this.actors.values())if(other.id!==actor.id){const gap=radius+other.radius+margin;if(segmentDistance(a,b,other.position)<gap)return false;if(destinations&&other.target&&segmentDistance(a,b,other.target)<gap)return false;}
  return true;
 }
 route(actor,target){
  if(!this.clearSegment(target,target,actor))return null;
  const points=[actor.position,target,...this.config.waypoints],n=points.length,cost=Array(n).fill(Infinity),previous=Array(n).fill(-1),done=new Set();cost[0]=0;
  for(let count=0;count<n;count++){
   let best=-1;for(let i=0;i<n;i++)if(!done.has(i)&&(best===-1||cost[i]<cost[best]))best=i;
   if(best<0||!Number.isFinite(cost[best]))return null;if(best===1){const path=[];for(let p=1;p!==0;p=previous[p])path.unshift({x:points[p].x,y:target.y,z:points[p].z});return path;}
   done.add(best);for(let j=1;j<n;j++)if(!done.has(j)&&this.clearSegment(points[best],points[j],actor)){const candidate=cost[best]+distance(points[best],points[j]);if(candidate<cost[j]){cost[j]=candidate;previous[j]=best;}}
  }return null;
 }
 choose(actor){
  if([...this.actors.values()].filter(a=>a.state==='WALKING').length>=this.config.maxSimultaneousMoving)return false;
  const preferred=this.config.characterPreferences[actor.id]??[];
  const candidates=this.slots.filter(s=>s!==actor.current&&!this.reservations.has(s.key)&&this.clearSegment(s,s,actor)).map(slot=>({slot,rank:-Math.log(Math.max(.000001,this.random()))/((preferred.includes(slot.station.id)||preferred.includes(slot.station.activityType)||slot.station.preferredCharacters?.includes(actor.id))?4:slot.station.activityType==='idle'?.3:1)})).sort((a,b)=>a.rank-b.rank);
  for(const {slot} of candidates){const path=this.route(actor,slot);if(!path)continue;this.reservations.set(slot.key,actor.id);actor.target=slot;actor.path=path;actor.pathIndex=0;actor.state='WALKING';actor.travelTime=0;actor.blocked=0;actor.activityType='walk';return true;}
  return false;
 }
 turn(actor,target,dt){actor.heading+=Math.max(-this.config.turnSpeed*dt,Math.min(this.config.turnSpeed*dt,angleDelta(actor.heading,target)));}
 update(dt,visible=true){
  if(!this.config.enabled||!visible||dt<=0)return;dt=Math.min(dt,.05);this.time+=dt;
  for(const actor of this.actors.values()){
   if(actor.state==='WALKING'){
    const point=actor.path[actor.pathIndex],gap=distance(actor.position,point),heading=Math.atan2(point.x-actor.position.x,point.z-actor.position.z);this.turn(actor,heading,dt);const step=Math.min(gap,this.config.movementSpeed*dt)*Math.max(0,Math.cos(angleDelta(actor.heading,heading)));
    const next={x:actor.position.x+Math.sin(heading)*step,y:this.config.floorY,z:actor.position.z+Math.cos(heading)*step};
    if(this.clearSegment(actor.position,next,actor,{destinations:false})){Object.assign(actor.position,next);actor.travelTime+=dt;actor.blocked=0;}else actor.blocked+=dt;
    if(actor.current&&distance(actor.position,actor.current)>actor.radius+this.config.personalSpace){this.reservations.delete(actor.current.key);actor.current=null;}
    if(distance(actor.position,point)<=this.config.arrivalDistance){actor.pathIndex++;if(actor.pathIndex>=actor.path.length){actor.current=actor.target;actor.target=null;actor.state='WORKING';actor.activityType=actor.current.station.activityType;actor.timer=this.workDuration(actor.current);}}
    if(actor.state==='WALKING'&&actor.blocked>=this.config.replanAfter){
     const route=this.route(actor,actor.target);
     if(route){actor.path=route;actor.pathIndex=0;}
     else{this.reservations.delete(actor.target.key);actor.target=null;actor.path=[];actor.state='IDLE';actor.activityType='idle';actor.timer=this.decisionDelay();}
     actor.blocked=0;
    }
   }else{
    if(actor.current)this.turn(actor,actor.current.heading,dt);actor.timer-=dt;
    if(actor.timer<=0){if(actor.state==='WORKING'){if(this.random()<this.config.stayProbability)actor.timer=this.workDuration(actor.current);else{actor.state='IDLE';actor.timer=this.decisionDelay();}}else if(!this.choose(actor))actor.timer=this.config.retryDelay+this.random();}
   }
  }
 }
 dispose(){this.actors.clear();this.reservations.clear();}
}
