// Match the browser import map for the production class and GLB loader, without
// a package install or a replacement navigation implementation. register() works
// on the project's full Node 22 range; registerHooks() requires Node 22.15+.
import {register} from 'node:module';
const three=new URL('../../vendor/three.module.js',import.meta.url).href;
register('data:text/javascript,'+encodeURIComponent(`export function resolve(specifier,context,next){return next(specifier==='three'?${JSON.stringify(three)}:specifier,context);}`),import.meta.url);
export const {RescueNavigation}=await import('../../src/ui/RescueNavigation.js');
export const {GLTFLoader}=await import('../../vendor/GLTFLoader.js');
export const {RescueSystem}=await import('../../src/rescue/RescueSystem.js');
