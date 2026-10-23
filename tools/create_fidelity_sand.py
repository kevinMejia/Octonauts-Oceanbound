"""512 px seamless fine sand; no large periodic normal-map corrugation."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(__file__).resolve().parents[1]/'assets/textures'
rng=np.random.default_rng(44712);n=512;v,u=np.mgrid[0:n,0:n]/n;tau=2*np.pi
freq=np.fft.fftfreq(n);fy,fx=np.meshgrid(freq,freq,indexing='ij');r=np.hypot(fx,fy)
def field(cut):
 a=np.fft.ifft2(np.fft.fft2(rng.normal(size=(n,n)))*np.exp(-(r/cut)**2)).real
 return a/a.std()
warp=field(.016);fine=field(.17);macro=field(.009)
# 32 fine ripples per 2.4 m world tile, warped in both directions and broken
# into variable-strength beds. Albedo contains no directional ripple stripes.
phase=tau*(32*u+.8*np.sin(tau*3*v)+.5*np.sin(tau*(2*u+v)))+warp*.65
height=.15*np.cos(phase)*(.55+.25*np.tanh(field(.025)))+.028*fine
sx=(np.roll(height,-1,1)-np.roll(height,1,1))*.55;sy=(np.roll(height,-1,0)-np.roll(height,1,0))*.55
normal=np.stack([-sx,-sy,np.ones_like(sx)],-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
Image.fromarray(np.uint8(np.clip(normal*.5+.5,0,1)*255)).save(out/'sand-normal.png')
grains=fine*1.1+macro*1.8;rgb=np.stack([222+grains,207+grains,176+grains],-1)
Image.fromarray(np.uint8(np.clip(rgb,0,255))).save(out/'sand-color.jpg',quality=93)
Image.fromarray(np.uint8(np.clip(230+fine*4+macro*3,0,255))).save(out/'sand-roughness.png')
print('Fine seamless sand maps generated, 512 px each.')

# Curved, broken cellular light network; periodic domain warp keeps seams closed.
cu=(u+.044*np.sin(tau*3*v)+.023*np.sin(tau*(u+2*v)))%1
cv=(v+.038*np.sin(tau*2*u)+.02*np.sin(tau*(2*u-v)))%1
first=np.full((n,n),1e9);second=first.copy()
for x,y in rng.random((28,2)):
 dx=np.abs(cu-x);dy=np.abs(cv-y);d=np.hypot(np.minimum(dx,1-dx),np.minimum(dy,1-dy))
 second=np.where(d<first,first,np.minimum(second,d));first=np.minimum(first,d)
edge=np.exp(-((second-first)/.008)**2)*(.42+.58*(np.sin(tau*(2*u+v)+macro*.2)*.5+.5))
Image.fromarray(np.uint8(edge*255)).save(out/'caustics.png')
