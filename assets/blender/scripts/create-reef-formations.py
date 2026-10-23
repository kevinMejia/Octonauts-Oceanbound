"""Reuse the existing authored library to build editable, complete reef modules.
Export each formation as three shared-palette layers, with reduced LODs and rock-only colliders.
"""
import bpy,math,random,os,json
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'));OUT=os.path.join(ROOT,'assets/models/reef-formations');os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets/blender/underwater-environment.blend'))
sources={o.name:o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.endswith('_low')}
cache={}
for name,original in sources.items():
 obj=original.copy();obj.data=(bpy.data.objects.get(name+'_low').data if name.startswith('branch') else original.data).copy();bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj
 modifier=obj.modifiers.new('Formation mesh budget','DECIMATE');modifier.ratio=1 if name.startswith('branch') else .075 if name.startswith('brain') else .36 if name.startswith(('tube','shell')) else .45 if name.startswith(('kelp','grass')) else .75
 bpy.ops.object.modifier_apply(modifier=modifier.name);cache[name]=obj.data;bpy.data.objects.remove(obj,do_unlink=True)
for obj in list(bpy.data.objects):bpy.data.objects.remove(obj,do_unlink=True)
for collection in list(bpy.data.collections):
 if collection.name!='Collection':bpy.data.collections.remove(collection)
material=next(m for m in bpy.data.materials if m.name=='Reef organic vertex colors');leafmat=next(m for m in bpy.data.materials if m.name=='Leaf surfaces two-sided')
manifest={'version':1,'sourceLibrary':'../underwater-environment.blend','axes':'glTF X right, Y up, Z forward; formations authored in local metres','formations':{}}
roots=[]
for kind,seed in [('large',8801),('garden',8802),('patch',8803),('wall',8804)]:
 rng=random.Random(seed);collection=bpy.data.collections.new('Formation '+kind);bpy.context.scene.collection.children.link(collection)
 root=bpy.data.objects.new(kind+' editable assembly',None);collection.objects.link(root);roots.append(root);parts={'rock':[],'coral':[],'vegetation':[]};foundation=[]
 def place(name,loc,scale,layer,rotation=None):
  obj=bpy.data.objects.new(name,cache[name]);collection.objects.link(obj);obj.parent=root;obj.location=loc;obj.scale=(scale,)*3 if isinstance(scale,(int,float)) else scale
  if rotation is None:obj.rotation_euler.z=rng.random()*math.tau
  else:obj.rotation_euler=rotation
  parts[layer].append(obj);return obj
 if kind=='large':
  blocks=[(-4,-2,0,3.0,3.2,3.2),(0,0,0,3.7,3.3,4.1),(4,1,0,3.2,3.1,3.4),(0,4,0,3.6,2.6,2.7),(-3,4,0,2.7,2.6,2.5),(4,-3,0,2.5,2.4,2.3),(-6,1,0,2.2,2.2,2.6),(-2,-4,1.5,1.7,1.5,1.4),(3,-3.5,2,1.8,1.6,1.2),(-4,2,2,1.6,1.5,1.4)];count=130;radius=8;plants=34
 elif kind=='garden':
  blocks=[(-3,-1,0,2.3,2.5,1.9),(0,0,0,2.5,2.4,2.7),(3,1,0,2.3,2.2,1.8),(0,3,0,2.1,2.1,1.5)];count=74;radius=6;plants=28
 elif kind=='patch':
  blocks=[(-1.8,0,0,1.5,1.7,.65),(1,0,0,2.1,1.7,.75),(0,1.8,0,1.6,1.3,.6)];count=32;radius=4;plants=20
 else:
  blocks=[((-1)**i*.8,(i-3)*3.0,0,2.4,2.5,2.6+rng.random()*1.7) for i in range(7)];blocks+=[(-2.7,-5,1,1.6,1.7,1),(-2.8,2,1.2,1.8,2,1.2),(-2.4,7,1,1.8,1.6,1)];count=125;radius=11;plants=35
 for i,(x,y,z,sx,sy,sz) in enumerate(blocks):foundation.append(place('rock'+str(i%2),(x,y,z),(sx,sy,sz),'rock'))
 bpy.context.view_layer.update()
 verts=[];faces=[];colliders=[]
 for o in foundation:
  offset=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend(tuple(offset+i for i in p.vertices) for p in o.data.polygons)
  bounds=[o.matrix_world@Vector(c) for c in o.bound_box];lo=Vector(tuple(min(v[i] for v in bounds) for i in range(3)));hi=Vector(tuple(max(v[i] for v in bounds) for i in range(3)));center=(lo+hi)/2;half=(hi-lo)*.47
  colliders.append({'center':[center.x,center.z,-center.y],'radii':[half.x,half.z,half.y]})
 bvh=BVHTree.FromPolygons(verts,faces,all_triangles=False)
 def surface():
  for attempt in range(200):
   block=rng.choice(blocks);x=block[0]+rng.uniform(-block[3]*.9,block[3]*.9);y=block[1]+rng.uniform(-block[4]*.9,block[4]*.9)
   if rng.random()<.52:
    co,normal,_,_=bvh.ray_cast(Vector((x,y,30)),Vector((0,0,-1)),45)
   else:
    a=rng.random()*math.tau;target=Vector((x,y,max(.3,block[2]+rng.random()*block[5]*1.2)));origin=target+Vector((math.cos(a)*25,math.sin(a)*25,8));co,normal,_,_=bvh.ray_cast(origin,(target-origin).normalized(),40)
   if co is not None and normal.z>-.12:return co,normal
  return Vector((0,0,1)),Vector((0,0,1))
 for i in range(count):
  if i%4==0:colony,normal=surface()
  co=colony.copy()
  if i%4:
   tangent=normal.cross(Vector((0,0,1)))
   if tangent.length<.05:tangent=Vector((1,0,0))
   tangent.normalize();bitangent=normal.cross(tangent).normalized();candidate=colony+tangent*rng.uniform(-.95,.95)+bitangent*rng.uniform(-.95,.95)
   hit,n,_,_=bvh.ray_cast(candidate+normal*3,-normal,6)
   if hit is not None:co=hit;normal=n
  choices=['branch0','branch1','branch2','tube0','tube1','tube2','brain0','brain1','brain2'];name=choices[i%len(choices)];scale=rng.uniform(.55,.95)*( .7 if kind=='patch' else 1)
  # Gentle lean along exposed surfaces, rather than rows of vertical coral on the sand.
  up=(normal*.65+Vector((0,0,.5))).normalized();rot=up.to_track_quat('Z','Y').to_euler();rot.z+=rng.random()*math.tau;place(name,co-normal*.07,scale,'coral',rot)
 for i in range(plants):
  co,normal=surface();name=('kelp' if i%8==0 and kind!='patch' else 'seaweed' if i%3==0 else 'grass')+str(i%3);place(name,co-normal*.03,rng.uniform(.55,.95),'vegetation')
 for i in range(18 if kind!='patch' else 10):
  a=rng.random()*math.tau;r=radius*rng.uniform(.6,1.05);x=math.cos(a)*r;y=math.sin(a)*r
  if kind=='wall':x*=.37
  place('rock'+str(i%2),(x,y,-.1),(rng.uniform(.25,.7),rng.uniform(.3,.7),rng.uniform(.25,.65)),'rock')
  if i%3==0:place('shell'+str(i%3),(x+.3,y,.04),rng.uniform(.6,1),'coral')
 # Export merged palette layers; the source assembly stays individually editable and shares meshes.
 temporary=[];triangles={}
 for layer,objects in parts.items():
  vertices=[];polygons=[];colors=[];uvs=[]
  for obj in objects:
   bpy.context.view_layer.update();mesh=obj.data;offset=len(vertices);transform=obj.matrix_world;vertices.extend(transform@v.co for v in mesh.vertices);attr=mesh.color_attributes.get('Color');colors.extend(tuple(a.color) for a in attr.data)
   for face in mesh.polygons:
    polygons.append(tuple(offset+i for i in face.vertices))
    for li,vi in zip(face.loop_indices,face.vertices):
     if layer=='vegetation':uvs.append((0,max(0,mesh.vertices[vi].co.z)*obj.scale.z))
     elif mesh.uv_layers:uvs.append(tuple(mesh.uv_layers.active.data[li].uv))
     else:uvs.append((0,0))
  merged=bpy.data.meshes.new(kind+'_'+layer);merged.from_pydata(vertices,[],polygons);merged.update();col=merged.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
  for a,color in zip(col.data,colors):a.color=color
  uv=merged.uv_layers.new(name='UVMap')
  for a,value in zip(uv.data,uvs):a.uv=value
  for p in merged.polygons:p.use_smooth=True
  merged.materials.append(leafmat if layer=='vegetation' else material);obj=bpy.data.objects.new(kind+'_'+layer,merged);bpy.context.collection.objects.link(obj);temporary.append(obj)
  low=obj.copy();low.data=obj.data.copy();low.name=kind+'_'+layer+'_low';bpy.context.collection.objects.link(low);bpy.context.view_layer.objects.active=low;mod=low.modifiers.new('Distant module reduction','DECIMATE');mod.ratio=.45 if layer=='coral' else .6;bpy.ops.object.modifier_apply(modifier=mod.name);temporary.append(low)
  for o in [obj,low]:o.data.calc_loop_triangles();triangles[o.name]=len(o.data.loop_triangles)
 bpy.ops.object.select_all(action='DESELECT')
 for o in temporary:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,kind+'.glb'),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
 allverts=[o.matrix_world@v.co for objects in parts.values() for o in objects for v in o.data.vertices];bounds=[[min(v[i] for v in allverts) for i in range(3)],[max(v[i] for v in allverts) for i in range(3)]]
 manifest['formations'][kind]={'colliders':colliders,'boundsBlender':bounds,'triangles':triangles,'pieces':{layer:len(objects) for layer,objects in parts.items()}}
 for o in temporary:bpy.data.objects.remove(o,do_unlink=True)
 root.location.x=len(roots)*28-28
with open(os.path.join(ROOT,'assets/models/reef-formations/manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/blender/reef-formations.blend'))
# Blender source previews: these are separate from the mandatory actual game captures.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.world.color=(.16,.21,.25);scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
bpy.ops.mesh.primitive_plane_add(size=250,location=(40,0,-1.4));floor=bpy.context.object;m=bpy.data.materials.new('Preview ground');m.diffuse_color=(.14,.18,.2,1);floor.data.materials.append(m)
for loc,power,size in [((25,-25,35),6500,20),((70,15,30),5000,18)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((40,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
for i,kind in enumerate(['large','garden','patch','wall']):
 x=i*28;bpy.ops.object.camera_add(location=(x+18,-24,18));cam=bpy.context.object;cam.rotation_euler=(Vector((x,0,3))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=34 if kind=='wall' else 27 if kind=='large' else 20;scene.camera=cam;scene.render.filepath=os.path.join(ROOT,'docs/reef-habitat/blender-'+kind+'.png');bpy.ops.render.render(write_still=True)
print('Exported four reusable formation modules and rock-only collision manifest.')
