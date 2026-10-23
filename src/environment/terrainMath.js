import {visualConfig} from '../config/visualConfig.js';
import {worldConfig as c} from '../config/worldConfig.js';
import {octopodConfig as base} from '../config/octopodConfig.js';
export function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function hash(x,z){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^c.seed;n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967295;}
export function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z);let a=x-ix,b=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);return (hash(ix,iz)*(1-a)+hash(ix+1,iz)*a)*(1-b)+(hash(ix,iz+1)*(1-a)+hash(ix+1,iz+1)*a)*b;}
// Domain-warped coherent terrain; broad relief never uses repeating waves.
function relief(x,z){
 const wx=x+(noise(x/150+17,z/150)-.5)*35,wz=z+(noise(x/150,z/150+31)-.5)*35;
 const broad=(noise(wx/108,wz/108)-.5)*23+(noise((wx+80)/235,(wz-40)/235)-.5)*9;
 const medium=(noise((wx+37)/34,(wz-21)/34)-.5)*3.6;
 const dunes=(noise(wx/12,wz/16)-.5)*.8;
 const center=(noise(z/110,42)-.5)*22;
 const valley=-3.2*Math.exp(-Math.pow((x-center)/23,2));
 return broad+medium+dunes+valley;
}
function showcase(x,z,natural){const c=visualConfig.showcase,dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,(c.radius-d)/(c.radius-c.blendStart))),weight=t*t*(3-2*t);
 if(!weight)return natural;
 const bend=(noise(z/65,17)-.5)*9;
 const bank=(cx,cz,sx,sz,h)=>h*Math.exp(-Math.pow((dx-cx-bend)/sx,2)-Math.pow((dz-cz)/sz,2));
 const sculpted=6+bank(-38,-6,26,61,15)+bank(38,-30,26,55,16)+bank(-62,-76,36,30,14)+bank(64,-100,34,29,15)
  +(noise((x+9)/22,z/28)-.5)*2+(noise(x/8,z/13)-.5)*.35;
 return natural+(sculpted-natural)*weight;
}
const origin=relief(0,0);
export function heightAt(x,z){const natural=showcase(x,z,28*Math.tanh((relief(x,z)-origin)*c.heightVariation/112));if(!base.enabled)return natural;const d=Math.hypot(x-base.position.x,z-base.position.z)/base.scale,t=d<=base.levelRadius+1e-9?0:Math.max(0,Math.min(1,(d-base.levelRadius)/(base.blendRadius-base.levelRadius)));return base.position.y+(natural-base.position.y)*t*t*(3-2*t);}
