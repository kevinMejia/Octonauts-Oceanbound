"""Original-series exterior, interpreted from Disney Junior vehicle card and studio stills.
Blender 4.2: editable components in collections; runtime duplicates merged by palette only.
"""
import bpy,math,os,json
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../../..'))
OUT=os.path.join(ROOT,'assets/blender/octopod');DOC=os.path.join(ROOT,'docs/octopod');os.makedirs(DOC,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name!='Collection':bpy.data.collections.remove(c)
def material(name,color,rough=.4,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha);p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 return m
orange=material('Octopod orange enamel',(.9,.23,.035));trim=material('Orange panel insets',(.63,.13,.025));dark=material('Graphite seals and flexible arms',(.13,.2,.21));cream=material('Warm grey arm ribs',(.52,.59,.57));cyan=material('Turquoise windows and screens',(.08,.49,.56));glass=material('Observation glazing',(.3,.76,.81),.2,.28);green=material('Garden and room accents',(.17,.47,.16))
for mat,strength in [(orange,.10),(cyan,.22)]:
 node=mat.node_tree.nodes.get('Principled BSDF');node.inputs['Emission Color'].default_value=mat.diffuse_color;node.inputs['Emission Strength'].default_value=strength
collections={name:bpy.data.collections.new(name) for name in ['Central_Hub','Main_Dome','Connecting_Arms','Side_Pods','Supports','Windows','Exterior_Details']}
for c in collections.values():bpy.context.scene.collection.children.link(c)
base=[];colliders=[]
def finish(obj,name,mat,collection):
 obj.name=name
 for c in list(obj.users_collection):c.objects.unlink(obj)
 collections[collection].objects.link(obj);obj.data.materials.clear();obj.data.materials.append(mat)
 if obj.type=='MESH':
  for p in obj.data.polygons:p.use_smooth=True
 base.append(obj);return obj
def lathe(name,profile,center,mat,collection,segments=64):
 verts=[];faces=[]
 for radius,z in profile:
  for i in range(segments):a=i*math.tau/segments;verts.append((radius*math.cos(a),radius*math.sin(a),z))
 for j in range(len(profile)-1):
  for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);collections[collection].objects.link(o);o.location=center;o.data.materials.append(mat)
 for p in mesh.polygons:p.use_smooth=True
 base.append(o);return o
def sphere(name,location,scale,mat,collection):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=location);o=bpy.context.object;o.scale=scale;return finish(o,name,mat,collection)
def tube(name,points,radii,mat,collection,sides=12):
 vertices=[];faces=[]
 for j,point in enumerate(points):
  t=(Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])).normalized();u=t.cross(Vector((0,0,1)))
  if u.length<.01:u=Vector((1,0,0))
  u.normalize();v=t.cross(u).normalized()
  for i in range(sides):a=i*math.tau/sides;vertices.append(Vector(point)+(u*math.cos(a)+v*math.sin(a))*radii[j])
 for j in range(len(points)-1):
  for i in range(sides):a=j*sides+i;b=j*sides+(i+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+i for i in range(sides))]);mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);collections[collection].objects.link(o);o.data.materials.append(mat)
 for p in mesh.polygons:p.use_smooth=True
 base.append(o);return o
def bezier(a,b,c,d,n=25):return [tuple((1-t)**3*Vector(a)+3*(1-t)**2*t*Vector(b)+3*(1-t)*t*t*Vector(c)+t**3*Vector(d)) for t in [i/(n-1) for i in range(n)]]
def ring(name,center,radius,minor,mat,collection,normal=(0,0,1)):
 bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=8,location=center,major_radius=radius,minor_radius=minor);o=bpy.context.object;o.rotation_euler=Vector(normal).to_track_quat('Z','Y').to_euler();return finish(o,name,mat,collection)
def disc(name,center,radius,depth,mat,collection,normal=(0,0,1)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=center);o=bpy.context.object;o.rotation_euler=Vector(normal).to_track_quat('Z','Y').to_euler();return finish(o,name,mat,collection)
def box(name,center,size,mat,collection,rotation=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.scale=size;o.rotation_euler.z=rotation;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bevel=o.modifiers.new('Soft manufactured corners','BEVEL');bevel.width=.12;bevel.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name);return finish(o,name,mat,collection)
def collider(center,radii):colliders.append({'center':[center[0],center[2],-center[1]],'radii':[radii[0],radii[2],radii[1]]})
# The central hull is a rounded bowl, not a sphere. Upper glazing has a shallow orange roof.
lathe('Central_Hub_Orange_Hull',[(0,7.8),(3,8),(6.8,9.3),(8.8,12),(9.7,15),(10,18),(9.8,20)],(0,0,0),orange,'Central_Hub')
ring('Main_Observation_Seal',(0,0,20),9.8,.22,dark,'Main_Dome')
lathe('Main_Dome_Glass',[(9.8,20),(9.5,21.3),(8.8,23),(7.8,24.7),(6.7,25.8)],(0,0,0),glass,'Main_Dome')
lathe('Main_Dome_Orange_Roof',[(6.7,25.8),(5.7,26.35),(4,26.8),(2,27.1),(0,27.2)],(0,0,0),orange,'Main_Dome')
disc('Control_Room_Floor',(0,0,20),9.4,.18,cream,'Main_Dome')
ring('Control_Deck_Edge',(0,0,20.15),9.1,.10,cyan,'Main_Dome')
for i in range(7):
 a=math.pi+i*math.pi/6;x,y=math.cos(a)*7.5,math.sin(a)*7.5
 box('Bridge_Console_%02d'%i,(x,y,20.6),(2.1,1,.75),dark,'Main_Dome',a+math.pi/2)
 box('Bridge_Display_%02d'%i,(x*.98,y*.98,21.1),(1.65,.7,.06),cyan,'Main_Dome',a+math.pi/2)
box('Bridge_Rear_Monitor_Frame',(0,6.1,23),(4.4,.22,2.3),dark,'Main_Dome');box('Bridge_Rear_Monitor',(0,5.94,23),(3.9,.08,1.8),cyan,'Main_Dome')
collider((0,0,17.5),(9.8,9.8,10))
# Rounded portholes and central launch/service hatch, matching the face-like exterior.
for a in [-math.pi/2-.56,-math.pi/2+.56,math.pi/2-.6,math.pi/2+.6]:
 normal=(math.cos(a),math.sin(a),.05);center=(math.cos(a)*9.45,math.sin(a)*9.45,13.8)
 ring('Hull_Porthole_Seal',center,1,.16,dark,'Windows',normal);disc('Hull_Porthole_Glass',center,.86,.16,cyan,'Windows',normal)
ring('Launch_Hatch_Rim',(0,-8.0,10.9),1.55,.28,trim,'Exterior_Details',(0,-.8,-.3));disc('Launch_Hatch_Recess',(0,-8.1,10.9),1.25,.18,dark,'Exterior_Details',(0,-.8,-.3))
for i in range(8):
 a=i*math.tau/8;sphere('Hull_Recessed_Panel',(math.cos(a)*9.7,math.sin(a)*9.7,17.4),(.55,.15,.7),trim,'Exterior_Details').rotation_euler.z=a-math.pi/2
# Four satellite rooms: higher rear pair, lower forward pair, not an invented eight-pod ring.
for i,(x,y,z) in enumerate([(-20,-9,19.5),(20,-9,19.5),(-15,12,26),(15,12,26)]):
 prefix=['Garden_Pod','Kwazii_Pod','Barnacles_Pod','Peso_Pod'][i];r=4.6
 lathe(prefix+'_Lower_Hull',[(0,-3.8),(2.2,-3.6),(3.8,-2.7),(4.6,-1),(4.7,0)],(x,y,z),orange,'Side_Pods',48)
 ring(prefix+'_Window_Seal',(x,y,z),r+.1,.14,dark,'Side_Pods')
 lathe(prefix+'_Glazing',[(4.7,0),(4.5,1.3),(3.8,2.8),(2.8,3.8)],(x,y,z),glass,'Side_Pods',48)
 lathe(prefix+'_Orange_Cap',[(2.8,3.8),(2,4.1),(0,4.3)],(x,y,z),orange,'Side_Pods',48)
 disc(prefix+'_Floor',(x,y,z+.05),4.4,.12,cream,'Side_Pods')
 if i==0:
  for k in range(11):
   a=k*2.399;r2=1+(k%3)*.85;sphere('Garden_Foliage',(x+math.cos(a)*r2,y+math.sin(a)*r2,z+.7),( .6,.55,.8),green,'Side_Pods')
 else:
  box(prefix+'_Bed',(x-.6,y+.8,z+.55),(2,3,.8),cyan,'Side_Pods');box(prefix+'_Pillow',(x-.6,y+1.7,z+1),(1.7,.7,.3),cream,'Side_Pods');box(prefix+'_Cabinet',(x+2,y+.8,z+1),(1,1.5,1.8),dark,'Side_Pods')
 arm=bezier((math.copysign(8,x),math.copysign(3,y),12.5),(math.copysign(12,x),y*.6,8.5),(x,y,z-8),(x,y,z-3.7))
 tube(prefix+'_Flexible_Arm',arm,[.82]*len(arm),dark,'Connecting_Arms')
 for j in range(1,len(arm)-1,2):normal=Vector(arm[j+1])-Vector(arm[j-1]);ring(prefix+'_Arm_Rib_%02d'%j,arm[j],.85,.11,cream,'Connecting_Arms',normal)
 for j in range(0,len(arm),3):collider(arm[j],(1,1,1))
 collider((x,y,z+.2),(4.7,4.7,4.1))
# Four curled supports, with rows of turquoise suction pads.
for i in range(4):
 a=math.pi/4+i*math.pi/2;direction=Vector((math.cos(a),math.sin(a),0))
 points=bezier(tuple(direction*1.2+Vector((0,0,8.6))),tuple(direction*1.3+Vector((0,0,-.1))),tuple(direction*6+Vector((0,0,-1))),tuple(direction*6.8+Vector((0,0,1.1))),30)
 radii=[1.65*(1-j/(len(points)-1))+.45 for j in range(len(points))];tube('Support_Tentacle_%d'%i,points,radii,dark,'Supports',16)
 for j in range(4,25,4):
  v=Vector(points[j])+direction*(radii[j]*.9);ring('Suction_Rim_%d_%d'%(i,j),v,.35,.1,cream,'Supports',direction);disc('Suction_Pad_%d_%d'%(i,j),v,.28,.1,cyan,'Supports',direction)
 for j in range(0,len(points),3):collider(points[j],(radii[j],)*3)
# Runtime: merge temporary duplicates by material, but keep five glass panes independent for sorting.
bpy.context.view_layer.update();runtime=[]
for mat in [orange,trim,dark,cream,cyan,green]:
 selected=[]
 for obj in base:
  if obj.data.materials[0]!=mat:continue
  copy=obj.copy();copy.data=obj.data.copy();bpy.context.collection.objects.link(copy);selected.append(copy)
 bpy.ops.object.select_all(action='DESELECT')
 for o in selected:o.select_set(True)
 bpy.context.view_layer.objects.active=selected[0];bpy.ops.object.join();joined=bpy.context.object;joined.name='Runtime_'+mat.name;runtime.append(joined)
for o in base:
 if o.data.materials[0]==glass:
  copy=o.copy();copy.data=o.data.copy();bpy.context.collection.objects.link(copy);copy.name='Runtime_'+o.name;runtime.append(copy)
bpy.ops.object.select_all(action='DESELECT')
for o in runtime:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets/models/octopod.glb'),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False)
triangles=0
for o in runtime:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
with open(os.path.join(ROOT,'assets/models/octopod-collision.json'),'w') as f:json.dump({'colliders':colliders,'triangles':triangles,'runtimeMeshes':len(runtime),'scaleAssumption':'Estimated 49.4 m span, 30.3 m height; world metres match GUP-B, not canonical measurements'},f,indent=2)
for o in runtime:bpy.data.objects.remove(o,do_unlink=True)
# Retain a real imported GUP-B as an editable scale reference, excluded from runtime exports.
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'assets/models/gup-b.glb'));gup=list(set(bpy.context.scene.objects)-before);ref=bpy.data.collections.new('Reference_GUP_B_not_exported');bpy.context.scene.collection.children.link(ref)
for o in gup:
 for c in list(o.users_collection):c.objects.unlink(o)
 ref.objects.link(o)
 if o.parent not in gup:o.location+=Vector((28,-12,7))
bpy.context.view_layer.update();gupverts=[o.matrix_world@v.co for o in gup if o.type=='MESH' for v in o.data.vertices];dimensions=[max(v[i] for v in gupverts)-min(v[i] for v in gupverts) for i in range(3)]
with open(os.path.join(DOC,'scale-check.json'),'w') as f:json.dump({'gupDimensionsBlenderXYZ':dimensions,'octopodSpan':49.4,'spanToGupLength':49.4/max(dimensions)},f,indent=2)
ref.hide_render=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.world.color=(.13,.19,.23);scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
bpy.ops.mesh.primitive_plane_add(size=250,location=(0,0,-.6));floor=bpy.context.object;floor.name='Preview_Ground_not_exported';floor.data.materials.append(material('Preview sand',(.42,.4,.29)))
for loc,power,size in [((15,-35,55),11000,30),((-30,10,38),7500,25)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,15))-o.location).to_track_quat('-Z','Y').to_euler();o.name='Preview_Studio_not_exported'
bpy.ops.object.camera_add(location=(54,-68,44));camera=bpy.context.object;camera.name='Preview_Camera_not_exported';scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=65
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'octopod.blend'))
for name,pos in [('front',(0,-85,25)),('rear',(0,85,25)),('side',(85,0,25)),('top',(0,-.001,100)),('three-quarter',(54,-68,44))]:
 camera.location=pos;camera.rotation_euler=(Vector((0,0,15))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(DOC,'blender-'+name+'.png');bpy.ops.render.render(write_still=True)
ref.hide_render=False;camera.location=(54,-68,44);camera.rotation_euler=(Vector((3,0,14))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(DOC,'blender-scale-comparison.png');bpy.ops.render.render(write_still=True)
print('Editable Octopod saved;',len(base),'components,',triangles,'runtime triangles;',len(runtime),'runtime meshes')
