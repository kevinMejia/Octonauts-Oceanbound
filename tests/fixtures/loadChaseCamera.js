import {readFile} from 'node:fs/promises';
// Use the production class and vendored Three.js in Node without adding a package
// or changing the browser's import map. Only module URL resolution is adapted.
const moduleURL=new URL('../../src/camera/ChaseCamera.js',import.meta.url);
const source=(await readFile(moduleURL,'utf8')).replace(/from '([^']+)'/g,(_,path)=>
 `from '${path==='three'?new URL('../../vendor/three.module.js',import.meta.url):new URL(path,moduleURL)}'`);
export const {ChaseCamera}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
