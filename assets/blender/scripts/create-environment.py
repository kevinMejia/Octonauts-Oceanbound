import bpy, os, math, random
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'));random.seed(71)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);return m
def tube(name,coords,r,mat):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=2;s=cu.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
 for p,co in zip(s.bezier_points,coords):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.data.materials.append(mat);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
for variant in range(3):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for kind in ['coral','kelp','rock','shell','grass']:
  before=set(bpy.context.scene.objects);m=material(kind,{'coral':(.95,.21+.08*variant,.2),'kelp':(.08,.36,.19),'rock':(.28,.35,.34),'shell':(.9,.76,.57),'grass':(.18,.44,.29)}[kind])
  if kind=='coral':
   for i in range(7):
    a=i*2.4;h=.6+(i%3)*.28;x=math.sin(a)*.4;y=math.cos(a)*.4;tube(kind,[(0,0,0),(x*.5,y*.5,h*.5),(x,y,h)],.085,m);tube(kind,[(x*.5,y*.5,h*.5),(x+.23,y+.14,h*.85)],.06,m)
  elif kind in ['kelp','grass']:
   for i in range(5):
    h=(2.7 if kind=='kelp' else .6)*(1+i*.12);x=(i-2)*.12;tube(kind,[(x,0,0),(x+.1,.05,h*.3),(x-.12,.08,h*.7),(x+.13,0,h)],.045 if kind=='kelp' else .025,m)
   if kind=='kelp':
    for j in range(4):
     z=.4+j*.6;side=1 if j%2 else -1
     bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=(side*.2,0,z));leaf=bpy.context.object;leaf.name='Kelp leaf';leaf.scale=(.13,.055,.45);leaf.rotation_euler.y=side*.65;leaf.data.materials.append(m)
  else:
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1);o=bpy.context.object;o.name=kind;o.scale=(.7+variant*.15,.6,.45) if kind=='rock' else (.3,.4,.08);o.data.materials.append(m)
  objs=list(set(bpy.context.scene.objects)-before);bpy.ops.object.select_all(action='DESELECT')
  for o in objs:o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name=kind+'_'+str(variant)
  for p in objs[0].data.polygons:p.use_smooth=True
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/blender/environment-'+str(variant)+'.blend'))
 bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets/models/environment-'+str(variant)+'.glb'),export_format='GLB')
