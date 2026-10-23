"""Deterministic seamless sand and water-light textures. No external image assets."""
from pathlib import Path
import numpy as np
from PIL import Image
OUT=Path(__file__).resolve().parents[1]/'assets/textures';OUT.mkdir(exist_ok=True)
rng=np.random.default_rng(71421);n=512
v,u=np.mgrid[0:n,0:n]/n;tau=2*np.pi
# Periodic directional ripple relief; finer grains prevent smooth plastic sand.
phase=tau*(20*u+0.42*np.sin(tau*2*v)+.16*np.sin(tau*(3*u+v)))
height=.55*np.cos(phase)+.10*np.cos(2*phase)+rng.normal(0,.055,(n,n))
dx=(np.roll(height,-1,1)-np.roll(height,1,1))*.65;dy=(np.roll(height,-1,0)-np.roll(height,1,0))*.65
normal=np.stack([-dx,-dy,np.ones_like(dx)],-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
Image.fromarray(np.uint8(np.clip(normal*.5+.5,0,1)*255)).save(OUT/'sand-normal.png')
grain=rng.normal(0,1.9,(n,n))+.8*np.cos(phase);rgb=np.stack([216+grain,201+grain,169+grain],-1)
Image.fromarray(np.uint8(np.clip(rgb,0,255))).save(OUT/'sand-color.jpg',quality=91)
rough=np.uint8(np.clip(224+rng.normal(0,7,(n,n)),0,255));Image.fromarray(rough).save(OUT/'sand-roughness.png')
# A tileable Voronoi edge network approximates refracted sunlight (not a grid).
seeds=rng.random((42,2));first=np.full((n,n),1e9);second=first.copy()
for x,y in seeds:
 dx=np.abs(u-x);dy=np.abs(v-y);d=np.sqrt(np.minimum(dx,1-dx)**2+np.minimum(dy,1-dy)**2)
 second=np.where(d<first,first,np.minimum(second,d));first=np.minimum(first,d)
edge=np.exp(-((second-first)/.006)**2)
Image.fromarray(np.uint8(edge*255)).save(OUT/'caustics.png')
print('Generated 512px sand normal/color/roughness and seamless caustic texture.')
# Tileable limestone relief for authored rock outcrops; band-limited noise avoids faceting.
field=np.zeros((n,n));freq=np.fft.fftfreq(n);fy,fx=np.meshgrid(freq,freq,indexing='ij');radial=np.sqrt(fx*fx+fy*fy)
for cutoff,amplitude in [(.012,1),(.035,.4),(.1,.12)]:
 raw=rng.normal(size=(n,n));smooth=np.fft.ifft2(np.fft.fft2(raw)*np.exp(-(radial/cutoff)**2)).real;smooth/=smooth.std();field+=smooth*amplitude
rx=(np.roll(field,-1,1)-np.roll(field,1,1))*1.2;ry=(np.roll(field,-1,0)-np.roll(field,1,0))*1.2
rn=np.stack([-rx,-ry,np.ones_like(rx)],-1);rn/=np.linalg.norm(rn,axis=-1,keepdims=True)
Image.fromarray(np.uint8(np.clip(rn*.5+.5,0,1)*255)).save(OUT/'rock-normal.png')
shade=np.clip(212+field*15+rng.normal(0,3,(n,n)),140,250);Image.fromarray(np.uint8(np.stack([shade*.92,shade*.98,shade],-1))).save(OUT/'rock-color.jpg',quality=90)
