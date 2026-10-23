// Menus acquire independent pause tokens. Releasing one never releases another.
export class PauseState{
 constructor(onChange=()=>{}){this.owners=new Set();this.onChange=onChange;}
 get paused(){return this.owners.size>0;}
 set(owner,paused){const before=this.paused;if(paused)this.owners.add(owner);else this.owners.delete(owner);if(before!==this.paused)this.onChange(this.paused);}
 acquire(label){const token=Symbol(label);this.set(token,true);let released=false;return ()=>{if(!released){released=true;this.set(token,false);}};}
}
