"""Editable original-series crew interpretations. Blender 4.5, +Z up, -Y front.
Run blender --background --python assets/blender/characters/scripts/create-crew.py
Rigid weighted articulated components; joined runtime skin, one vertex-color material.
"""
import bpy, math, os, json
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../../..'))
OUT=ROOT+'/assets/blender/characters'; MODELS=ROOT+'/assets/models/characters'; DOC=ROOT+'/docs/characters'
for p in [OUT,MODELS,DOC]:os.makedirs(p,exist_ok=True)
BLUE=(.015,.36,.55,1);LIGHT=(.07,.58,.72,1);DARK=(.015,.05,.07,1);WHITE=(.87,.92,.90,1);ORANGE=(.95,.40,.055,1);CREAM=(1,.77,.32,1)

def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for d in list(bpy.data.materials):bpy.data.materials.remove(d)
 global parts
 parts=[]

def finish(o,name,color,bone):
 o.name=name
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 a=o.data.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='POINT')
 for v in a.data:v.color=color
 if bone:o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE')
 for p in o.data.polygons:p.use_smooth=True
 parts.append(o);return o

def ell(name,loc,scale,color,bone='Head',square=1):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc);o=bpy.context.object
 for v in o.data.vertices:
  v.co=Vector([math.copysign(abs(x)**square,x) for x in v.co])
 o.scale=scale;return finish(o,name,color,bone)

def box(name,loc,scale,color,bone):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 b=o.modifiers.new('Rounded corners','BEVEL');b.width=min(scale)*.22;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name)
 return finish(o,name,color,bone)

def tube(name,points,r,color,bone):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=r;curve.bevel_resolution=3;curve.resolution_u=12
 s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,color,bone)

def lathe(name,profile,loc,color,bone):
 verts=[];faces=[];n=40
 for r,z in profile:
  for i in range(n):a=i/n*math.tau;verts.append((loc[0]+r*math.cos(a),loc[1]+r*math.sin(a),loc[2]+z))
 for j in range(len(profile)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,color,bone)

def emblem(x,y,z,r,bone):
 ell('Badge blue disc',(x,y,z),(r,.018,r),BLUE,bone)
 ell('Badge octopus head',(x,y-.024,z+.02),(r*.45,.012,r*.44),WHITE,bone)
 for side in [-1,1]:
  ell('Badge eye',(x+side*r*.18,y-.04,z+.05),(r*.07,.008,r*.09),BLUE,bone)
 for j in range(5):
  a=(j-2)*.48;tube('Badge tentacle',[(x+(j-2)*r*.14,y-.028,z-r*.12),(x+math.sin(a)*r*.68,y-.03,z-r*.62),(x+math.sin(a)*r*.80,y-.03,z-r*.44)],r*.07,WHITE,bone)

def hat(z,peso=False):
 lathe('Octonaut cap',[(0,.0),(.35,0),(.44,.08),(.37,.20),(.29,.31),(.10,.37),(0,.37)],(0,0,z),BLUE,'Head')
 lathe('Cap turned brim',[(.34,0),(.44,0),(.45,.07),(.37,.10)],(0,0,z),WHITE if peso else LIGHT,'Head')
 emblem(0,-.37,z+.22,.13,'Head')

def ear(side,z,cat=False):
 if not cat:
  ell('Round bear ear',(side*.64,0,z),(.24,.14,.26),WHITE);ell('Blue inner ear',(side*.64,-.123,z),(.135,.03,.15),(.44,.65,.69,1))
 else:
  verts=[(side*.43,-.12,z-.10),(side*.80,-.10,z+.36),(side*.83,-.1,z-.18),(side*.43,.15,z-.10),(side*.80,.14,z+.36),(side*.83,.14,z-.18)]
  mesh=bpy.data.meshes.new('Ear');mesh.from_pydata(verts,[],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)]);mesh.update();o=bpy.data.objects.new('Cat pointed ear',mesh);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
  b=o.modifiers.new('Soft ear edges','BEVEL');b.width=.08;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name);finish(o,'Pointed cat ear',ORANGE,'Head')
  ell('Cream inner ear',(side*.70,-.14,z+.06),(.10,.028,.17),CREAM)

def rig(name,h):
 bpy.ops.object.select_all(action='DESELECT');bpy.ops.object.armature_add();arm=bpy.context.object;arm.name=name+'_Rig';bpy.ops.object.mode_set(mode='EDIT');arm.data.edit_bones.remove(arm.data.edit_bones[0])
 def bone(n,a,b,parent=None):
  v=arm.data.edit_bones.new(n);v.head=a;v.tail=b
  if parent:v.parent=arm.data.edit_bones[parent]
 bone('Root',(0,0,0),(0,0,.3));bone('Torso',(0,0,.75),(0,0,1.35),'Root');bone('Head',(0,0,1.4),(0,0,h-.1),'Torso')
 for side,x in [('L',.53),('R',-.53)]:
  bone('Arm_'+side,(x,0,1.36),(x*1.35,0,.98),'Torso');bone('Hand_'+side,(x*1.35,0,.98),(x*1.45,0,.78),'Arm_'+side)
  bone('Leg_'+side,(x*.48,0,.75),(x*.48,0,.32),'Root');bone('Foot_'+side,(x*.48,0,.32),(x*.48,-.15,.12),'Leg_'+side)
  bone('Blink_'+side,(x*.6,-.6,h-.75),(x*.6,-.6,h-.6),'Head')
 bpy.ops.object.mode_set(mode='OBJECT')
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name=name+'_Skin';mesh.data.materials.clear()
 mat=bpy.data.materials.new('Crew vertex palette');mat.use_nodes=True;nodes=mat.node_tree.nodes;p=nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.72;v=nodes.new('ShaderNodeVertexColor');v.layer_name='Palette';mat.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color']);mesh.data.materials.append(mat)
 for poly in mesh.data.polygons:poly.material_index=0
 mod=mesh.modifiers.new('Crew skeleton','ARMATURE');mod.object=arm;mesh.parent=arm
 arm.animation_data_create();arm.animation_data.action=bpy.data.actions.new(name+'_Idle')
 for frame in [1,31,61,91,121,151,181,211,241]:
  t=(frame-1)/240*math.tau
  for b in arm.pose.bones:b.rotation_mode='XYZ'
  torso=arm.pose.bones['Torso'];torso.scale=(1+math.sin(t*2)*.009,1+math.sin(t*2)*.014,1+math.sin(t*2)*.009);torso.keyframe_insert('scale',frame=frame)
  head=arm.pose.bones['Head'];head.rotation_euler=(math.sin(t)*.018,math.sin(t)*.022,math.sin(t)*.035);head.keyframe_insert('rotation_euler',frame=frame)
  for side,sgn in [('L',1),('R',-1)]:
   b=arm.pose.bones['Arm_'+side];b.rotation_euler=(math.sin(t*2)*.025,sgn*math.sin(t)*.02,0);b.keyframe_insert('rotation_euler',frame=frame)
 for side in ['L','R']:
  b=arm.pose.bones['Blink_'+side]
  for f,s in [(1,1),(82,1),(85,.06),(88,1),(180,1),(183,.06),(186,1),(241,1)]:b.scale=(1,1,s);b.keyframe_insert('scale',frame=f)
 scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=241;scene.render.fps=30;scene.frame_set(1)
 arm.show_in_front=True;arm['notes']='Head/torso/limbs/hands/feet plus blink controls. Rigid weighted toy-like articulation, no walking.'
 return arm,mesh

def create(name):
 reset();peso=name=='peso';cat=name=='kwazii';h=2.45 if peso else 2.7 if cat else 3.05
 if peso:
  ell('Penguin torso',(0,0,.88),(.39,.30,.60),DARK,'Torso');ell('White belly',(0,-.26,.89),(.28,.07,.43),WHITE,'Torso')
  ell('Penguin head',(0,0,1.83),(.66,.48,.65),DARK)
  verts=[];faces=[];n=48;rings=10
  for j in range(rings+1):
   r=j/rings
   for i in range(n):
    a=i/n*math.tau;x=.56*math.cos(a)*r;z=1.78+(.47*math.sin(a)-.16*max(0,math.sin(a))**12)*r;y=-.48*math.sqrt(max(.01,1-(x/.66)**2-((z-1.83)/.65)**2))-.016;verts.append((x,y,z))
  for j in range(rings):
   for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,a+n,b+n,b))
  m=bpy.data.meshes.new('Heart face mask');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('Continuous white heart face',m);bpy.context.collection.objects.link(o);finish(o,'Continuous white heart face',WHITE,'Head')
  ell('Yellow beak',(0,-.55,1.66),(.13,.13,.085),(1,.63,.02,1))
 else:
  skin=ORANGE if cat else WHITE
  ell('Torso',(0,0,1.05),(.44,.31,.57),skin if cat else BLUE,'Torso',.85)
  if cat:ell('Cream tummy',(0,-.28,1.05),(.27,.055,.38),CREAM,'Torso')
  ell('Rounded head',(0,0,h-.9),(.76,.53,.68),skin,'Head',.68 if not cat else .78)
  for side in [-1,1]:ear(side,h-.43,cat)
  muzzle=(1,.79,.39,1) if cat else (.51,.70,.75,1)
  for side in [-1,1]:ell('Rounded muzzle',(side*.105,-.527,h-1.15),(.15,.09,.11),muzzle)
  ell('Small nose',(0,-.61,h-1.04),(.066,.05,.045),(.55,.24,.29,1) if cat else (.22,.35,.4,1))
  tube('Gentle smile',[(-.12,-.59,h-1.25),(0,-.61,h-1.28),(.12,-.59,h-1.25)],.012,DARK,'Head')
  if cat:
   strap=lathe('Eyepatch strap',[(.755,0),(.755,.055)],(0,0,h-.96),DARK,'Head')
   for v in strap.data.vertices:v.co.x=.77*math.copysign((abs(v.co.x)/.755)**.78,v.co.x);v.co.y=.54*math.copysign((abs(v.co.y)/.755)**.78,v.co.y)
   ell('Pirate eyepatch',(-.33,-.48,h-.98),(.23,.105,.21),DARK)
   for side in [-1,1]:
    for j in range(3):ell('Whisker freckle',(side*(.37+j*.045),-.46,h-1.22+(j%2)*.08),(.025,.015,.025),(.53,.23,.04,1))
   tube('Curled kitten tail',[(0,.22,.8),(.35,.50,.72),(.62,.54,.92),(.62,.48,1.15)],.085,ORANGE,'Torso')
  else:
   box('Utility belt',(0,-.01,.87),(.86,.62,.12),LIGHT,'Torso');emblem(-.19,-.336,.87,.11,'Torso')
   tube('Jacket zipper',[(0,-.315,1),(0,-.325,1.46)],.012,LIGHT,'Torso')
   for x in [.25,.32]:box('Belt clasp',(x,-.32,.87),(.025,.025,.08),(.85,.75,.2,1),'Torso')
 # Eyes are independently skinned for blinking, including highlights.
 for side,sgn in [('L',1),('R',-1)]:
  if cat and sgn<0:continue
  x=sgn*(.32 if not peso else .29);z=h-(.94 if not peso else .69);y=-.49 if not peso else -.49
  ell('Eye_'+side,(x,y,z),(.095,.060,.115),DARK,'Blink_'+side,square=.75)
  ell('Eye glint_'+side,(x-.025,y-.052,z+.04),(.025,.015,.027),WHITE,'Blink_'+side)
 # Short arms, mitten hands and boots/flipper feet.
 for side,sgn in [('L',1),('R',-1)]:
  if peso:
   o=ell('Penguin flipper',(sgn*.45,0,1.02),(.11,.10,.38),DARK,'Arm_'+side);o.rotation_euler.y=-sgn*.35
   ell('Penguin ankle',(sgn*.19,0,.24),(.10,.11,.19),DARK,'Leg_'+side)
   ell('Webbed foot',(sgn*.19,-.12,.10),(.19,.24,.075),(1,.65,.035,1),'Foot_'+side)
  else:
   o=ell('Arm sleeve',(sgn*.52,0,1.20),(.13,.14,.32),ORANGE if cat else BLUE,'Arm_'+side);o.rotation_euler.y=sgn*.20
   ell('Cuff',(sgn*.59,-.005,.98),(.14,.15,.07),LIGHT if not cat else ORANGE,'Arm_'+side)
   ell('Mitten hand',(sgn*.61,-.02,.86),(.14,.15,.16),ORANGE if cat else WHITE,'Hand_'+side)
   ell('Leg',(sgn*.22,0,.55),(.15,.17,.29),ORANGE if cat else BLUE,'Leg_'+side)
   ell('Blue boot',(sgn*.22,-.06,.24),(.20,.25,.23),LIGHT,'Foot_'+side,.8)
 # Blue neck scarf/collar visible on all three.
 lathe('Neck collar',[(.30,0),(.32,.09),(.24,.15)],(0,0,1.20 if cat else 1.41 if not peso else 1.29),LIGHT,'Torso')
 for side in [-1,1]:
  o=box('Folded collar',(side*.13,-.40 if cat else -.30,1.25 if cat else 1.45 if not peso else 1.34),(.22,.045,.16),BLUE,'Torso');o.rotation_euler.y=side*.4
 hat(h-(.12 if peso else .31),peso)
 if peso:
  box('Medical case',(.62,-.02,.55),(.38,.19,.36),WHITE,'Hand_L');tube('Case handle',[(.51,-.02,.73),(.51,-.02,.83),(.72,-.02,.83),(.72,-.02,.73)],.022,WHITE,'Hand_L');emblem(.62,-.127,.55,.1,'Hand_L')
 arm,mesh=rig(name,h)
 bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=arm
 bpy.context.preferences.filepaths.save_version=0
 bpy.ops.wm.save_as_mainfile(filepath=OUT+'/'+name+'.blend',compress=True)
 bpy.ops.export_scene.gltf(filepath=MODELS+'/'+name+'.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True)
 # Actual Blender multi-angle previews; never exported with the runtime model.
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=600;scene.render.resolution_y=650;scene.render.resolution_percentage=100;scene.world.color=(.22,.22,.22)
 for loc,power,size in [((3,-4,6),650,5),((-3,-1,3),300,4),((0,4,5),500,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=size;bpy.context.object.rotation_euler=(Vector((0,0,1.4))-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=3.9;scene.camera=camera
 for view,loc in [('front',(0,-7,2.8)),('side',(7,0,2.8)),('rear',(0,7,2.8)),('three-quarter',(4,-7,3.4))]:
  camera.location=loc;camera.rotation_euler=(Vector((0,0,1.5))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=DOC+'/'+name+'-'+view+'.png';bpy.ops.render.render(write_still=True)
 print('CREW_COMPLETE',name,len(mesh.data.polygons))
import sys
for name in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['barnacles','kwazii','peso']):create(name)
