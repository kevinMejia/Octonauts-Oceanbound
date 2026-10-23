import {submarineConfig as c} from '../config/submarineConfig.js';
import {worldConfig as w} from '../config/worldConfig.js';
import {TurboBoost} from '../turbo/TurboBoost.js';
import {heightAt} from '../environment/terrainMath.js';
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export class SubmarineController{
 constructor(){this.turbo=new TurboBoost();this.position={x:0,y:8,z:0};this.heading=0;this.speed=0;this.vertical=0;this.steer=0;this.bank=0;this.pitch=0;}
 update(dt,input){dt=Math.min(dt,.05);this.turbo.request(input.boost);this.turbo.step(dt,input.thrust>0);const boost=this.turbo.multiplier,speedMultiplier=this.movement?.speedMultiplier??1;
 // Brake before reversing. Once nearly stationary, a held back button engages reverse.
 const thrust=input.brakeReverse&&this.speed>.15?0:input.thrust;
 const response=input.brakeReverse&&this.speed>.15?6:(thrust?c.acceleration*boost:c.drag);this.steer=damp(this.steer,input.turn,5,dt);this.heading+=this.steer*c.turnSpeed*dt;this.speed=damp(this.speed,thrust*(thrust>=0?c.maxForwardSpeed*boost*speedMultiplier:c.maxReverseSpeed*speedMultiplier),response,dt);this.vertical=damp(this.vertical,input.rise*(input.rise>=0?c.ascendSpeed:c.descendSpeed),input.rise?c.acceleration:c.drag,dt);
 const p=this.position,edge=w.size/2-12,soft=edge-w.boundaryMargin;
 let dx=Math.sin(this.heading)*this.speed,dz=Math.cos(this.heading)*this.speed;
 if(p.x*dx>0&&Math.abs(p.x)>soft)dx*=Math.max(0,(edge-Math.abs(p.x))/w.boundaryMargin);
 if(p.z*dz>0&&Math.abs(p.z)>soft)dz*=Math.max(0,(edge-Math.abs(p.z))/w.boundaryMargin);
 p.x=Math.max(-edge,Math.min(edge,p.x+dx*dt));p.z=Math.max(-edge,Math.min(edge,p.z+dz*dt));p.y+=this.vertical*dt;
 let floor=heightAt(p.x,p.z);for(const a of [-1,1])floor=Math.max(floor,heightAt(p.x+Math.sin(this.heading)*(this.collisionProxy?.halfLength??3)*a,p.z+Math.cos(this.heading)*(this.collisionProxy?.halfLength??3)*a));floor+=this.collisionProxy?.terrainClearance??c.minTerrainClearance;
 this.floorContact={clearance:Math.max(0,p.y-floor),touching:p.y<=floor+.025,impact:p.y<floor?Math.max(0,-this.vertical):0,floor:floor-(this.collisionProxy?.terrainClearance??c.minTerrainClearance)};
 if(p.y<floor){p.y=floor;this.vertical=Math.max(0,this.vertical);}if(p.y>w.surface-(this.collisionProxy?.surfaceClearance??2.5)){p.y=w.surface-(this.collisionProxy?.surfaceClearance??2.5);this.vertical=Math.min(0,this.vertical);}this.bank=damp(this.bank,-this.steer*c.bankAmount,4,dt);this.pitch=damp(this.pitch,-this.vertical/c.ascendSpeed*c.pitchAmount,4,dt);
 }
}
