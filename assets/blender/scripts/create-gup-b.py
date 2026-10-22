import bpy, math, os
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,rough=.35,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,alpha);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,alpha);p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED' if bpy.app.version>=(4,2,0) else None
 return m
orange=mat('Hull • tangerine enamel',(1,.22,.025));finmat=mat('Fins • burnt orange',(.55,.075,.018));white=mat('Ivory markings',(.97,.96,.85));dark=mat('Shark eye and mouth',(.065,.027,.018));glass=mat('Blue bubble canopy',(.18,.64,.78),.12,.34);blue=mat('Octonaut blue',(.015,.23,.43));seat=mat('Cockpit seat',(.19,.12,.085))
def ell(name,loc,scale,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
def poly(name,verts,faces,material,bevel=.12):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(material)
 for face in o.data.polygons:face.use_smooth=True
 if bevel:mod=o.modifiers.new('Soft edges','BEVEL');mod.width=bevel;mod.segments=5;mod.use_clamp_overlap=False;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
# Blender Y is longitudinal; glTF converts Z-up to Y-up. Bow is Blender -Y = runtime +Z.
ell('Rounded shark hull',(0,0,0),(1.1,2.65,.73),orange)
ell('Lower jaw',(0,-1.15,-.31),(.9,1.46,.39),orange)
ell('Cockpit dark inset',(0,.05,.62),(.75,1.0,.13),seat)
ell('Seat back',(0,.53,.89),(.48,.16,.41),seat)
ell('Bubble canopy',(0,-.05,.83),(.79,1.02,.87),glass)
for side in [-1,1]:
 # White eye patches and inset dark pupils on each shoulder.
 e=ell('Shark eye white',(side*.91,-1.42,.24),(.055,.43,.18),white);e.rotation_euler.z=side*-.32
 ell('Shark pupil',(side*.964,-1.49,.25),(.035,.15,.14),dark)
 # Swept pectoral fins with rounded bevels.
 v=[(side*.8,-.45,-.13),(side*2.0,.45,-.22),(side*1.9,.95,-.21),(side*.78,.8,-.1)]
 verts=[(x,y,z+d) for d in [-.065,.065] for x,y,z in v]
 poly('Pectoral fin',verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],finmat)
# A curved, flush painted smile follows the bow; avoid floating side patches.
cu=bpy.data.curves.new('Smile seam','CURVE');cu.dimensions='3D';cu.bevel_depth=.026;cu.bevel_resolution=3
sp=cu.splines.new('POLY');sp.points.add(24)
for i,p in enumerate(sp.points):
 a=-.95+i*1.9/24;p.co=(.82*math.sin(a),-1.6-.91*math.cos(a),-.25,1)
o=bpy.data.objects.new('Shark smile',cu);bpy.context.collection.objects.link(o);o.data.materials.append(dark)
# Tall aft dorsal fin.
poly('Dorsal fin',[(-.08,.9,.52),(-.08,1.45,1.65),(-.08,2.05,.4),(.08,.9,.52),(.08,1.45,1.65),(.08,2.05,.4)],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],finmat)
# Vertical shark tail.
poly('Tail fin',[(-.1,2.15,0),(-.1,2.9,1),(-.1,2.7,.05),(-.1,2.92,-.85),(.1,2.15,0),(.1,2.9,1),(.1,2.7,.05),(.1,2.92,-.85)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],finmat)
# Small separate axial screw underneath the tail; shaft axis Blender Y / glTF Z.
prop=bpy.data.objects.new('Propeller',None);bpy.context.collection.objects.link(prop);prop.location=(0,2.35,-.32)
for a in [0,math.pi/2,math.pi,3*math.pi/2]:
 o=ell('Propeller blade',(math.cos(a)*.24,2.35,-.32+math.sin(a)*.24),(.13,.055,.3),blue);o.rotation_euler.y=math.pi/2-a;o.parent=prop;o.matrix_parent_inverse=prop.matrix_world.inverted()
# Circular blue badge, ivory octopus-like emblem on both dorsal sides.
for s in [-1,1]:
 ell('Badge blue',(s*.115,1.45,1.03),(.025,.21,.23),blue)
 ell('Badge head',(s*.145,1.45,1.08),(.016,.09,.09),white)
 for i in range(4):ell('Badge tentacle',(s*.145,1.32+i*.085,.96),(.016,.025,.1),white)
for i in range(30):
 a=2*math.pi*i/30;ell('Hull seam rivet',(1.101*math.sin(a),2.65*math.cos(a),-.015),(.027,.027,.027),orange)
# Save clean editable source and runtime export before adding preview studio.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/blender/gup-b.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets/models/gup-b.glb'),export_format='GLB',export_cameras=False,export_lights=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1000;scene.render.resolution_y=750;scene.render.resolution_percentage=100
scene.world.color=(.25,.3,.35)
for loc,power,size in [((4,-5,8),1000,6),((-5,2,5),850,5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=size
for name,pos in [('hero',(7,-9,5)),('side',(9,0,2)),('rear',(6,9,4)),('top',(0,-.01,12))]:
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=8;scene.camera=cam;scene.render.filepath=os.path.join(ROOT,'docs/gup-b-'+name+'.png');bpy.ops.render.render(write_still=True)
