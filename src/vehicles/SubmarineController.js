import {TrackedGroundController} from './TrackedGroundController.js';
import {hullFloor} from '../collision/collisionMath.js';
import {collisionConfig} from '../config/collisionConfig.js';
import {submarineConfig as c} from '../config/submarineConfig.js';
import {worldConfig as w} from '../config/worldConfig.js';
import {TurboBoost} from '../turbo/TurboBoost.js';
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export class SubmarineController{
 constructor(){this.previousPosition={x:0,y:8,z:0};this.collisionDrift={x:0,z:0};this.floorContact={};this.turbo=new TurboBoost();this.position={x:0,y:8,z:0};this.heading=0;this.speed=0;this.vertical=0;this.steer=0;this.bank=0;this.pitch=0;}
 selectVehicle(id,movement,definition){
  this.vehicleTurbo??=new Map();
  if(this.vehicleId)this.vehicleTurbo.set(this.vehicleId,this.turbo);
  if(this.vehicleId!==id)this.turbo=this.vehicleTurbo.get(id)??new TurboBoost();
  this.vehicleId=id;this.movement=movement;this.definition=definition;this.groundController=definition?.type==='ground'?new TrackedGroundController(definition.ground):null;
  if(this.groundController){this.collisionProxy={...this.collisionProxy,terrainClearance:definition.ground.groundClearance};this.turbo.config=definition.ground.turbo;this.groundController.align(this);}
 }
 update(dt,input){dt=Math.min(dt,.05);if(this.groundController){this.groundController.update(this,dt,input);return;}Object.assign(this.previousPosition,this.position);const drift=this.collisionDrift,decay=Math.exp(-collisionConfig.driftDrag*dt);drift.x*=decay;drift.z*=decay;this.turbo.request(input.boost);this.turbo.step(dt,input.thrust>0);const boost=this.turbo.multiplier,tow=this.towingSpeedMultiplier??1,speedMultiplier=this.movement?.speedMultiplier??1;
 // Brake before reversing. Once nearly stationary, a held back button engages reverse.
 const thrust=input.brakeReverse&&this.speed>.15?0:input.thrust;
 const response=input.brakeReverse&&this.speed>.15?6:(thrust?(this.movement?.acceleration??c.acceleration)*boost:c.drag);this.steer=damp(this.steer,input.turn,5,dt);this.heading+=this.steer*c.turnSpeed*dt;this.speed=damp(this.speed,thrust*(thrust>=0?(input.cruise?(this.movement?.cruisingSpeed??c.maxForwardSpeed*speedMultiplier):(this.movement?.maxSpeed??c.maxForwardSpeed*speedMultiplier))*boost*tow:c.maxReverseSpeed*speedMultiplier*tow),response,dt);this.vertical=damp(this.vertical,input.rise*(input.rise>=0?c.ascendSpeed:c.descendSpeed),input.rise?c.acceleration:c.drag,dt);
 const p=this.position,edge=w.size/2-12,soft=edge-w.boundaryMargin;
 let dx=Math.sin(this.heading)*this.speed+drift.x,dz=Math.cos(this.heading)*this.speed+drift.z;
 if(p.x*dx>0&&Math.abs(p.x)>soft)dx*=Math.max(0,(edge-Math.abs(p.x))/w.boundaryMargin);
 if(p.z*dz>0&&Math.abs(p.z)>soft)dz*=Math.max(0,(edge-Math.abs(p.z))/w.boundaryMargin);
 p.x=Math.max(-edge,Math.min(edge,p.x+dx*dt));p.z=Math.max(-edge,Math.min(edge,p.z+dz*dt));p.y+=this.vertical*dt;
 this.collisionWorld?.resolve(this,dt);
 const floor=hullFloor(this),terrainClearance=this.collisionProxy?.terrainClearance??c.minTerrainClearance;
 const contact=this.floorContact;contact.clearance=Math.max(0,p.y-floor);contact.touching=p.y<=floor+.025;contact.impact=Math.max(p.y<floor?Math.max(0,-this.vertical):0,this.collisionContact?.surface==='sand'?this.collisionContact.impact:0);contact.floor=floor-terrainClearance;

 if(p.y<floor){p.y=floor;this.vertical=Math.max(0,this.vertical);}if(p.y>w.surface-(this.collisionProxy?.surfaceClearance??2.5)){p.y=w.surface-(this.collisionProxy?.surfaceClearance??2.5);this.vertical=Math.min(0,this.vertical);}this.bank=damp(this.bank,-this.steer*c.bankAmount,4,dt);this.pitch=damp(this.pitch,-this.vertical/c.ascendSpeed*c.pitchAmount,4,dt);
 // The new tilt can lower the bow or stern after the movement clearance check.
 const tiltedFloor=hullFloor(this);if(p.y<tiltedFloor){p.y=tiltedFloor;this.vertical=Math.max(0,this.vertical);}
 }
}
