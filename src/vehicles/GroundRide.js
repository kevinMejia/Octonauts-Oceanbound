// Render-only suspension. Never writes controller state or camera transforms.
export class GroundRide{
 constructor(){this.reset();}
 reset(){this.ready=false;this.phase=0;this.amount=0;this.y=this.pitch=this.roll=0;}
 update(dt,s){
  const ground=s.groundController,c=ground?.config.ride,p=s.position;
  if(!c?.enabled||dt<=0){this.reset();return;}
  const distance=this.ready?Math.hypot(p.x-this.x,p.z-this.z):0;
  this.x=p.x;this.z=p.z;this.ready=true;
  // Actual displacement avoids vibrating while pushing into a wall.
  const speed=distance/dt;
  const target=Math.min(1,speed/4);
  this.amount+=(target-this.amount)*(1-Math.exp(-c.response*dt));
  this.phase=(this.phase+distance/c.wavelength*Math.PI*2)%(Math.PI*2);
  // Existing terrain alignment supplies slope; irregular harmonics suggest tread travel.
  const terrain=1+Math.min(.6,Math.abs(s.pitch)+Math.abs(s.bank));
  const amplitude=this.amount*terrain,phase=this.phase;
  this.y=c.heave*amplitude*(.7*Math.sin(phase)+.3*Math.sin(phase*2+.5));
  this.pitch=c.pitch*amplitude*Math.sin(phase+.8);
  this.roll=c.roll*amplitude*Math.sin(phase*2+.3);
  if(this.amount<.0001)this.y=this.pitch=this.roll=0;
 }
}
