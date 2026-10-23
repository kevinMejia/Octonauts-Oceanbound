"""Editable stratified reef foundations, coral surface anchors and bounded LODs."""
import bpy,math,random,json,os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
OUT=os.path.join(ROOT,'assets/models');PRE=os.path.join(ROOT,'docs/visual-recovery');os.makedirs(PRE,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mat=bpy.data.materials.new('Blue limestone with warm exposed faces');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.86
vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
manifest={'formations':[]};roots=[];export=[]
def stone(name,loc,scale,seed,layered=False):
 rng=random.Random(seed);verts=[];faces=[];colors=[];rings=13;sides=28;phase=rng.random()*6.28
 for i in range(rings):
  t=i/(rings-1);profile=.12+.89*math.sin(math.pi*(.08+.89*t))**.42
  if layered:profile*=1+.10*math.sin(t*math.pi*6)
  for j in range(sides):
   a=j*math.tau/sides;irregular=1+.13*math.sin(a*3+phase+t*1.1)+.07*math.cos(a*5-t*2)
   x=math.cos(a)*profile*irregular*scale[0]+t*t*scale[0]*.2
   y=math.sin(a)*profile*irregular*scale[1]
   z=t*scale[2]+.08*math.sin(a*4+phase)*math.sin(t*math.pi)
   verts.append((x,y,z));light=.78+.18*t+.07*math.sin(a*2+t*8);sand=max(0,t-.55)*.22
   colors.append((.31*light+sand,.38*light+sand*.7,.40*light+sand*.3,1))
 for i in range(rings-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces+=[tuple(reversed(range(sides))),tuple((rings-1)*sides+j for j in range(sides))]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();color=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for a,c in zip(color.data,colors):a.color=c
 uv=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:
   q=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(q.x*.21+q.z*.07,q.y*.21+q.z*.1)
 mesh.materials.append(mat);o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=loc;return o
blocks=[
 [(-2,-.6,-.5,3.0,2.4,5.4),(1.8,.5,-.5,2.7,2.5,7.1),(4,1,-.3,1.8,2,4),(-4,1,-.3,2,2,3.3),(0,3,-.4,2.8,2,3.1),(3,-2,-.3,2,1.8,2.5),(-3,-3,-.2,1.8,1.4,2)],
 [(-3,0,-.35,3.4,2.3,2.9),(1.8,.3,-.4,3.7,2.4,3.7),(4,1.7,-.4,2,1.7,2),(-1,-2,-.3,2.5,1.4,1.7)],
 [(-1,0,-.6,2.9,2.7,10.8),(2,1,-.5,2.3,2.3,7.4),(-3,1,-.3,1.9,1.7,4.2),(0,-2,-.3,2.4,1.8,3.7)]
]
for kind,shapes in enumerate(blocks):
 coll=bpy.data.collections.new(['Boulder colony','Low stratified shelf','Distant reef buttress'][kind]);bpy.context.scene.collection.children.link(coll)
 root=bpy.data.objects.new('Editable foundation '+str(kind),None);coll.objects.link(root);roots.append(root);parts=[];colliders=[]
 for i,(x,y,z,sx,sy,sz) in enumerate(shapes):
  o=stone('Limestone_'+str(kind)+'_ledge_'+str(i),(x,y,z),(sx,sy,sz),44712+kind*100+i,kind!=0);parts.append(o)
  for old in list(o.users_collection):old.objects.unlink(o)
  coll.objects.link(o);o.parent=root;colliders.append({'x':x,'y':z+sz*.5,'z':-y,'rx':sx*.92,'ry':sz*.48,'rz':sy*.92,'angle':0})
 bpy.context.view_layer.update();verts=[];faces=[]
 for o in parts:
  off=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend(tuple(off+i for i in p.vertices) for p in o.data.polygons)
 bvh=BVHTree.FromPolygons(verts,faces)
 # Bake low-cost crevice occlusion into editable vertex colours. It survives
 # GLB export and mobile rendering without an SSAO/postprocessing pass.
 shade_rng=random.Random(44900+kind)
 for o in parts:
  colors=o.data.color_attributes['Color']
  for vertex,color in zip(o.data.vertices,colors.data):
   normal=(o.matrix_world.to_3x3()@vertex.normal).normalized();origin=o.matrix_world@vertex.co+normal*.04;blocked=0
   for ray in range(8):
    jitter=Vector((shade_rng.uniform(-1,1),shade_rng.uniform(-1,1),shade_rng.uniform(-1,1)))
    if jitter.dot(normal)<0:jitter=-jitter
    direction=(normal*.55+jitter).normalized();hit,_,_,_=bvh.ray_cast(origin,direction,2.2)
    if hit is not None:blocked+=1
   factor=1-.38*blocked/8;color.color=tuple(c*factor for c in color.color[:3])+(1,)
 rng=random.Random(44800+kind);anchors=[]
 for i in range(250):
  x=rng.uniform(-6,6);y=rng.uniform(-4.7,4.7);hit,normal,_,_=bvh.ray_cast(Vector((x,y,18)),Vector((0,0,-1)),25)
  if hit and normal.z>.36 and all((x-a[0])**2+(-y-a[2])**2>.45 for a in anchors):anchors.append([round(hit.x,3),round(hit.z-.05,3),round(-hit.y,3)])
  if len(anchors)>=48:break
 manifest['formations'].append({'kind':'rockShowcase'+str(kind),'anchors':anchors,'colliders':colliders})
 # Temporary runtime layer merges only this reusable module; sources stay split.
 duplicates=[]
 for o in parts:
  d=o.copy();d.data=o.data.copy();d.parent=None;bpy.context.collection.objects.link(d);duplicates.append(d)
 bpy.ops.object.select_all(action='DESELECT')
 for d in duplicates:d.select_set(True)
 bpy.context.view_layer.objects.active=duplicates[0];bpy.ops.object.join();merged=duplicates[0];merged.name='rockShowcase'+str(kind)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);export.append(merged)
 low=merged.copy();low.data=merged.data.copy();low.name=merged.name+'_low';bpy.context.collection.objects.link(low);bpy.context.view_layer.objects.active=low
 mod=low.modifiers.new('Mobile silhouette-preserving reduction','DECIMATE');mod.ratio=.42;bpy.ops.object.modifier_apply(modifier=mod.name);export.append(low)
bpy.ops.object.select_all(action='DESELECT')
for o in export:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'showcase-rocks.glb'),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False)
for o in export:bpy.data.objects.remove(o,do_unlink=True)
with open(os.path.join(OUT,'showcase-rocks.json'),'w') as f:json.dump(manifest,f,indent=2)
for i,r in enumerate(roots):r.location.x=(i-1)*18
# Neutral asset preview, not gameplay proof.
bpy.ops.object.camera_add(location=(29,-43,29));camera=bpy.context.object;camera.name='Preview Camera';camera.rotation_euler=(Vector((0,0,3))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=55;bpy.context.scene.camera=camera
for loc,power,size in [((0,-14,28),3300,18),((-20,10,20),2500,14)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,2))-l.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100;scene.world.color=(.16,.19,.22)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/blender/showcase-rocks.blend'))
scene.render.filepath=os.path.join(PRE,'blender-rock-library.png');bpy.ops.render.render(write_still=True)
print('Editable showcase rocks, anchors and GLB exported.')
