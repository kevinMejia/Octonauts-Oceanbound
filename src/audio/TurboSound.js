// A single one-shot voice on the existing Turbo user-volume bus. Never loops.
export class TurboSound{
 constructor(context,destination,buffer){this.context=context;this.destination=destination;this.buffer=buffer;this.voice=null;this.played=0;}
 play(){
  if(this.voice||this.context.state!=='running')return false;
  const source=this.context.createBufferSource();source.buffer=this.buffer;source.loop=false;source.connect(this.destination);
  this.voice=source;source.onended=()=>{source.disconnect();if(this.voice===source)this.voice=null;};source.start();this.played++;return true;
 }
 suspend(){if(this.voice){const source=this.voice;this.voice=null;source.stop();source.disconnect();source.onended=null;}}
}
