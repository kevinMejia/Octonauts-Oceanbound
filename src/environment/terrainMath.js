import {worldConfig as c} from '../config/worldConfig.js';
import {octopodConfig as base} from '../config/octopodConfig.js';
export function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function hash(x,z){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^c.seed;n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967295;}
export function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z);let a=x-ix,b=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);return (hash(ix,iz)*(1-a)+hash(ix+1,iz)*a)*(1-b)+(hash(ix,iz+1)*(1-a)+hash(ix+1,iz+1)*a)*b;}
// Broad shelves, cross-current dunes and a gently winding open sandy valley.
function relief(x,z){
 const broad=(noise(x/170,z/170)-.5)*10;
 const medium=(noise((x+37)/48,(z-21)/48)-.5)*4;
 const dunes=Math.sin(x*.095+Math.sin(z*.028)*1.4)*1.35+Math.sin(x*.037-z*.022)*1.25+1.8*Math.sin(z*.105+x*.032+Math.sin(x*.06));
 const valley=-2.8*Math.exp(-Math.pow((x-19*Math.sin(z*.014))/22,2));
 return broad+medium+dunes+valley;
}
const origin=relief(0,0);
export function heightAt(x,z){const natural=(relief(x,z)-origin)*c.heightVariation/4;if(!base.enabled)return natural;const d=Math.hypot(x-base.position.x,z-base.position.z)/base.scale,t=Math.max(0,Math.min(1,(d-base.levelRadius)/(base.blendRadius-base.levelRadius)));return base.position.y+(natural-base.position.y)*t*t*(3-2*t);}
