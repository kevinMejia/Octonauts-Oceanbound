import * as T from 'three';
import {visualConfig} from '../config/visualConfig.js';
// One tiny generated lighting environment, convolved once on loading. No live
// reflection capture, external HDR download or additional per-frame render pass.
export function waterReflections(scene,renderer){if(!visualConfig.lighting.reflections||!renderer.extensions.has('EXT_color_buffer_float'))return null;const width=128,height=64,data=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const latitude=Math.cos(y/(height-1)*Math.PI),up=Math.max(0,latitude),sun=Math.exp(-((x/width-.32)**2/.008+(y/height-.2)**2/.006));const i=(y*width+x)*4;
  data[i]=.12+up*.7+sun*2;data[i+1]=.22+up*.85+sun*1.9;data[i+2]=.25+up*.9+sun*1.5;data[i+3]=1;
 }
 const source=new T.DataTexture(data,width,height,T.RGBAFormat,T.FloatType);source.mapping=T.EquirectangularReflectionMapping;source.needsUpdate=true;
 const generator=new T.PMREMGenerator(renderer),target=generator.fromEquirectangular(source);scene.environment=target.texture;scene.environmentIntensity=.25;source.dispose();generator.dispose();return target;
}
