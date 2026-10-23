"""Export cheap cosmetic surface proxies from the actual editable reef parts.
Run after create-reef-formations.py; no rendering or GLB changes required.
"""
import bpy,os,json
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets/blender/reef-formations.blend'))
result={}
for root in [o for o in bpy.context.scene.objects if o.type=='EMPTY']:
 kind=root.name.split(' ')[0];items=[]
 for obj in root.children:
  name=obj.name.split('.')[0]
  surface='coral' if name.startswith(('branch','brain','tube')) else 'vegetation' if name.startswith(('kelp','seaweed','grass')) else None
  if not surface:continue
  corners=[root.matrix_world.inverted()@obj.matrix_world@Vector(c) for c in obj.bound_box]
  lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)));hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)));c=(lo+hi)/2
  attr=obj.data.color_attributes.get('Color');values=list(attr.data)[::max(1,len(attr.data)//24)] if attr else []
  color=[sum(v.color[i] for v in values)/len(values) for i in range(3)] if values else [.3,.6,.2]
  items.append({'center':[round(c.x,3),round(c.z,3),round(-c.y,3)],'radius':round(max(.18,(hi-lo).length*.38),3),'surface':surface,'branch':name.startswith('branch'),'color':[round(v,3) for v in color]})
 result[kind]=items
with open(os.path.join(ROOT,'assets/models/reef-formations/interactions.json'),'w') as f:json.dump(result,f,separators=(',',':'))
print('Exported',sum(map(len,result.values())),'surface proxies from authored parts')
