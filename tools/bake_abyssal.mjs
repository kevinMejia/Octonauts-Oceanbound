// Reproducible reduced-resolution terrain bake; no WebGPU required at runtime.
import {writeFileSync,mkdirSync} from 'node:fs';
import {surfaceNets} from '../vendor/abyssal-garden/procedural.js';
import {density} from '../src/arena/density.js';
const nx=193,ny=33,nz=193,step=2,origin=[-192,-58,-192],D=new Float32Array(nx*ny*nz);
for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)D[x+nx*(y+ny*z)]=(x===0||z===0||x===nx-1||z===nz-1||y===ny-1)?-1:density(origin[0]+x*step,origin[1]+y*step,origin[2]+z*step);
const mesh=surfaceNets(D,nx,ny,nz);for(let i=0;i<mesh.pos.length;i++)mesh.pos[i]=origin[i%3]+mesh.pos[i]*step+(i%3===1?46:0);
const directory=new URL('../assets/abyssal/',import.meta.url);mkdirSync(directory,{recursive:true});
const meta={nx,ny,nz,step,origin:[-192,-12,-192],vertices:mesh.pos.length/3,indices:mesh.idx.length};
writeFileSync(new URL('terrain.json',directory),JSON.stringify(meta));writeFileSync(new URL('positions.bin',directory),Buffer.from(mesh.pos.buffer,mesh.pos.byteOffset,mesh.pos.byteLength));writeFileSync(new URL('indices.bin',directory),Buffer.from(mesh.idx.buffer,mesh.idx.byteOffset,mesh.idx.byteLength));
const packed=Int8Array.from(D,v=>Math.round(Math.max(-127,Math.min(127,v*8))));writeFileSync(new URL('density.bin',directory),packed);
console.log(meta);
