import {worldConfig as world} from '../config/worldConfig.js';
import {heightAt,random} from '../environment/terrainMath.js';
export function pickupLayout(count){const rng=random(world.seed+913),points=[];for(let i=0;i<count;i++){const angle=rng()*Math.PI*2,radius=i<5?18+rng()*95:140+rng()*550;const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;const floor=heightAt(x,z);points.push({x,y:Math.min(world.surface-5,floor+5+rng()*(i<5?7:25)),z});}return points;}
