import * as T from 'three';
let stone;
// One GPU texture pair shared by the legacy scenery and modular habitat materials.
export function reefStoneTextures(){if(!stone){const loader=new T.TextureLoader();const color=loader.load(new URL('../../assets/textures/rock-color.jpg',import.meta.url).href),normal=loader.load(new URL('../../assets/textures/rock-normal.png',import.meta.url).href);color.colorSpace=T.SRGBColorSpace;for(const t of [color,normal]){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=4;}stone={color,normal};}return stone;}
