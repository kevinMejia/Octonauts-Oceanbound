import {turboWindowConfig as config} from '../config/hudConfig.js';
const number=v=>Number(v.toFixed(3));
// Offset the badge along its true normal, rather than widening a slanted polygon.
// This is startup-only geometry; charge updates still change only the fill scale.
export function turboWindowGeometry(c=config){
 const b=c.badge,h=c.housing;
 const shape=inset=>{
  const point=angle=>{const co=Math.cos(angle),si=Math.sin(angle),nx=co/b.rx,ny=si/b.ry,n=Math.hypot(nx,ny);return {x:b.x+b.rx*co+inset*nx/n,y:b.y+b.ry*si+inset*ny/n};};
  const angleAt=y=>{let lo=-Math.PI/2,hi=Math.PI/2;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(point(mid).y<y)lo=mid;else hi=mid;}return (lo+hi)/2;};
  const edge=inset+h.stroke/2,top=h.top+edge,bottom=h.bottom-edge,right=h.right-edge,rt=h.upperRadius-edge,rb=h.lowerRadius-edge,a=angleAt(top),z=angleAt(bottom),left=[];
  for(let i=0;i<=c.leftSegments;i++)left.push(point(a+(z-a)*i/c.leftSegments));
  const start=left[0],end=left.at(-1),d=`M${number(start.x)} ${top}H${h.upperX}A${rt} ${rt} 0 0 1 ${right} ${h.upperY}V${h.lowerY}A${rb} ${rb} 0 0 1 ${h.lowerX} ${bottom}H${number(end.x)}`+left.slice(0,-1).reverse().map(p=>`L${number(p.x)} ${number(p.y)}`).join('')+'Z';
  return {d,left,top,bottom,right};
 };
 const rim=shape(c.inset),well=shape(c.inset+c.bezel/2),mask=shape(c.inset+c.bezel),x=mask.left[0].x;
 return {rim,well,mask,bounds:{x,y:mask.top,width:mask.right-x,height:mask.bottom-mask.top}};
}
export function configureTurboWindow(root){
 const rim=root.querySelector('#turboWindowRim');if(!rim)return;
 const geometry=turboWindowGeometry();
 for(const [id,part] of [['turboWindowRim','rim'],['turboWindowWell','well'],['turboWindowMask','mask']])root.querySelector('#'+id).setAttribute('d',geometry[part].d);
 const rect=root.querySelector('#turboFill');for(const [key,value] of Object.entries(geometry.bounds))rect.setAttribute(key,number(value));
 root.querySelector('.turbo-energy').setAttribute('d',geometry.mask.d);
 root.querySelector('.turbo-empty').setAttribute('d',geometry.mask.d);
 root.querySelector('.turbo-grooves path').setAttribute('d',geometry.mask.d);
}
