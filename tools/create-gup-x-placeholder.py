from pathlib import Path
import json,struct,math
from PIL import Image,ImageDraw
root=Path.cwd(); data=bytearray(); views=[]; access=[]
def buf(values,fmt,kind,typ,mins=None,maxs=None):
 while len(data)%4:data.append(0)
 start=len(data);data.extend(struct.pack('<'+fmt*len(values),*values));views.append({'buffer':0,'byteOffset':start,'byteLength':len(data)-start})
 a={'bufferView':len(views)-1,'componentType':kind,'count':len(values)//(3 if typ=='VEC3' else 1),'type':typ}
 if mins is not None:a.update(min=mins,max=maxs)
 access.append(a);return len(access)-1
# Unit cube with flat normals, shared by every authored part.
pos=[];norm=[];idx=[]
for n,u,v in [((1,0,0),(0,1,0),(0,0,1)),((-1,0,0),(0,0,1),(0,1,0)),((0,1,0),(0,0,1),(1,0,0)),((0,-1,0),(1,0,0),(0,0,1)),((0,0,1),(1,0,0),(0,1,0)),((0,0,-1),(0,1,0),(1,0,0))]:
 base=len(pos)//3
 for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]:pos.extend([(n[k]+u[k]*a+v[k]*b)/2 for k in range(3)]);norm.extend(n)
 idx.extend([base,base+1,base+2,base,base+2,base+3])
p=buf(pos,'f',5126,'VEC3',[-.5]*3,[.5]*3);n=buf(norm,'f',5126,'VEC3');i=buf(idx,'H',5123,'SCALAR')
colors=[[.8,.025,.035,1],[.045,.055,.065,1],[.15,.65,.82,1],[.85,.87,.84,1]]
g={'asset':{'version':'2.0','generator':'Oceanbound locally authored GUP-X placeholder'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[{'primitives':[{'attributes':{'POSITION':p,'NORMAL':n},'indices':i,'material':m}]} for m in range(4)],'materials':[{'pbrMetallicRoughness':{'baseColorFactor':c,'metallicFactor':.1,'roughnessFactor':.65}} for c in colors],'buffers':[{'byteLength':len(data)}],'bufferViews':views,'accessors':access}
def part(name,xyz,scale,mat=0):
 g['scenes'][0]['nodes'].append(len(g['nodes']));g['nodes'].append({'name':name,'mesh':mat,'translation':xyz,'scale':scale})
part('Red hull',[0,.85,0],[3.6,1.5,5.2]);part('Red cabin',[0,2,.6],[2.8,1.3,2.9]);part('Blue windscreen',[0,2.15,2.07],[2.5,.95,.12],2);part('Roof',[0,2.75,.6],[3,.2,3.1]);part('Rear tow hitch',[0,.3,-3],[.4,.4,.8],3)
for side,x in [('LeftTrack',-1.9),('RightTrack',1.9)]:
 part(side,[x,0,0],[.65,.9,5.1],1)
 for j in range(32):
  a=j/32*math.tau;part(side+'Link'+str(j),[x,-.05+math.cos(a)*.53,math.sin(a)*2.65],[.8,.16,.28],3)
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);data.extend(b'\0'*((-len(data))%4));out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(data))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(data),b'BIN\0')+data
(root/'assets/models/gup-x.glb').write_bytes(out)
im=Image.new('RGBA',(512,320));d=ImageDraw.Draw(im);d.rounded_rectangle((55,202,458,284),30,fill='#252d35');d.rounded_rectangle((65,112,448,230),24,fill='#db162a');d.rounded_rectangle((150,46,371,158),18,fill='#e52b38');d.rounded_rectangle((172,65,350,125),12,fill='#47bfd9')
for x in range(72,450,23):d.line((x,244,x+10,273),fill='#9ca7ab',width=9)
im.save(root/'assets/img/vehicles/gup-x.png')
