import {visualConfig} from '../config/visualConfig.js';
import {heightAt,random} from './terrainMath.js';
import {insideOctopodClearing} from '../config/octopodConfig.js';
export function inShowcase(x,z){const c=visualConfig.showcase;return Math.hypot(x-c.x,z-c.z)<c.radius;}
export function showcaseLayout(manifest){const c=visualConfig.showcase,rng=random(c.seed),records=[],rocks=[];
 const modules=[[-20,-4,1,.55,.4],[22,12,1,.52,-.6],[-19,-33,1,.48,.8],[24,-29,1,.5,-.4],[-55,-110,2,1.35,.2],[62,-127,2,1.2,-.4],[-38,4,0,.92,.3],[42,-8,0,1,-.4],[-39,-30,1,1.2,.7],[40,-45,1,1.25,-.8],[-57,-64,2,.9,.2],[66,-76,2,1,-.5],[-73,-8,1,1.1,1],[78,18,0,.85,-.3],[-40,40,1,.8,.7],[38,42,1,.9,-.4],[-36,-63,2,.95,.6],[-54,-96,1,1.2,.3],[82,-108,0,1,-.8]];
 for(const [dx,dz,type,scale,angle] of modules){const x=c.x+dx,z=c.z+dz,form=manifest.formations[type];if(insideOctopodClearing(x,z,9*scale))continue;
  const samples=[heightAt(x,z)];for(let j=0;j<8;j++){const a=j*Math.PI/4;samples.push(heightAt(x+Math.cos(a)*7*scale,z+Math.sin(a)*7*scale));}samples.sort((a,b)=>a-b);const y=samples[2]-1.0;records.push({kind:form.kind,x,y,z,scale,angle,upright:true,module:true});
  const co=Math.cos(angle),si=Math.sin(angle);
  for(const s of form.colliders)rocks.push({x:x+(co*s.x+si*s.z)*scale,y:y+s.y*scale,z:z+(-si*s.x+co*s.z)*scale,rx:s.rx*scale,ry:s.ry*scale,rz:s.rz*scale,angle,radius:Math.max(s.rx,s.rz)*scale});
  for(let i=0;i<form.anchors.length;i++){const a=form.anchors[i],px=x+(co*a[0]+si*a[2])*scale,pz=z+(-si*a[0]+co*a[2])*scale,py=y+a[1]*scale;if(py<heightAt(px,pz)-.1)continue;
   const family=i%11===0?'kelp':i%6===0?'seaweed':i%5===0?'grass':i%4===0?'brain':i%3===0?'tube':'branch';
   records.push({kind:family+Math.floor(rng()*3),x:px,y:py,z:pz,scale:(.65+rng()*.7)*scale,angle:rng()*Math.PI*2,upright:true});
  }
  // Rooted transition vegetation and rubble; the valley centre stays open.
  for(let i=0;i<32;i++){const a=rng()*Math.PI*2,r=(4+rng()*5)*scale,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;if(insideOctopodClearing(px,pz,2)||Math.abs(px-c.x)<16)continue;
   const family=i%9===0?'rock':i%7===0?'shell':i%3===0?'seaweed':'grass';records.push({kind:family+i%3,x:px,y:heightAt(px,pz)-.06,z:pz,scale:family==='rock'?.2+rng()*.4:.65+rng()*.75,angle:rng()*Math.PI*2});
  }
 }
 return {records,rocks};
}
