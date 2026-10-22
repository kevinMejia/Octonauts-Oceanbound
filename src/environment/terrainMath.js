import {worldConfig as c} from '../config/worldConfig.js';
export function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function hash(x,z){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^c.seed;n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967295;}
export function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z);let a=x-ix,b=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);return (hash(ix,iz)*(1-a)+hash(ix+1,iz)*a)*(1-b)+(hash(ix,iz+1)*(1-a)+hash(ix+1,iz+1)*a)*b;}
export function heightAt(x,z){return c.heightVariation*((noise(x/95,z/95)-.5)*1.6+(noise(x/35,z/35)-.5)*.35)+Math.sin(x*.022+z*.013)*.6;}
