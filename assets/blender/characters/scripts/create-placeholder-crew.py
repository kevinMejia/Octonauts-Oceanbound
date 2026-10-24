"""Five replaceable, low-detail crew proxies. Does not regenerate the original three.
Run blender --background --python assets/blender/characters/scripts/create-placeholder-crew.py
Feet at Z=0 in Blender, +Y up / +Z facing after GLB export. One palette skin + idle.
"""
import bpy,math,os,importlib.util,sys
from mathutils import Vector
spec=importlib.util.spec_from_file_location('crew_base',os.path.join(os.path.dirname(__file__),'create-crew.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
BROWN=(.35,.15,.065,1);TAN=(.72,.40,.18,1);PALE=(1,.80,.48,1);PINK=(.92,.24,.48,1);GREEN=(.20,.65,.32,1);MINT=(.43,.83,.46,1)
def ell(name,loc,scale,color,bone='Head',square=1):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=14,ring_count=10,location=loc);o=bpy.context.object
 for v in o.data.vertices:v.co=Vector([math.copysign(abs(x)**square,x) for x in v.co])
 o.scale=scale;return b.finish(o,name,color,bone)
def tube(name,points,r,color,bone):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=r;curve.bevel_resolution=2;curve.resolution_u=6
 s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');return b.finish(bpy.context.object,name,color,bone)
b.ell=ell;b.tube=tube

def eyes(z,y=-.48,spread=.26):
 for side,sign in [('L',1),('R',-1)]:
  ell('Eye '+side,(sign*spread,y,z),(.085,.05,.11),b.DARK,'Blink_'+side)
  ell('Eye highlight '+side,(sign*spread-.02,y-.04,z+.035),(.022,.012,.027),b.WHITE,'Blink_'+side)
def smile(z,y=-.55):tube('Smile',[(-.12,y,z),(0,y-.015,z-.04),(.12,y,z)],.012,b.DARK,'Head')
def limbs(skin,shirt,boots=True):
 for side,sign in [('L',1),('R',-1)]:
  ell('Sleeve '+side,(sign*.5,0,1.14),(.13,.14,.30),shirt,'Arm_'+side)
  ell('Hand '+side,(sign*.57,-.02,.86),(.13,.13,.15),skin,'Hand_'+side)
  ell('Leg '+side,(sign*.20,0,.48),(.14,.15,.26),skin,'Leg_'+side)
  ell('Foot '+side,(sign*.20,-.08,.18),(.19,.24,.17),b.LIGHT if boots else skin,'Foot_'+side)

def build(name):
 b.reset()
 if name in ['shellington','dashi','tweak']:
  skin=MINT if name=='tweak' else TAN if name=='dashi' else BROWN
  ell('Uniform torso',(0,0,1.03),(.40,.30,.54),b.BLUE if name!='tweak' else GREEN,'Torso')
  ell('Head',(0,0,2.03),(.66,.48,.61),skin,'Head',.85)
  limbs(skin,b.BLUE if name!='tweak' else GREEN)
  if name=='shellington':
   for sign in [-1,1]:ell('Otter ear',(sign*.57,0,2.35),(.18,.13,.20),BROWN)
   for sign in [-1,1]:ell('Otter cream muzzle',(sign*.14,-.46,1.87),(.25,.09,.19),PALE)
   ell('Otter nose',(0,-.57,1.99),(.10,.06,.07),b.DARK)
   tube('Otter tail',[(0,.2,.65),(0,.55,.42),(0,.78,.26)],.13,BROWN,'Torso')
   for x in [-.20,0,.2]:ell('Hair tuft',(x,-.02,2.58),(.14,.16,.18),BROWN)
   b.hat(2.52);eyes(2.16);smile(1.76)
  elif name=='dashi':
   for sign in [-1,1]:ell('Long dachshund ear',(sign*.64,.02,1.96),(.20,.16,.49),BROWN)
   ell('Hair sweep',(-.12,-.15,2.51),(.51,.33,.22),BROWN)
   b.box('Pink hair clip',(.40,-.37,2.48),(.27,.06,.10),PINK,'Head')
   ell('Dog muzzle',(0,-.47,1.86),(.29,.12,.20),PALE);ell('Dog nose',(0,-.61,1.96),(.10,.06,.075),b.DARK)
   b.lathe('Pink skirt',[(.35,0),(.47,.08),(.40,.30)],(0,0,.60),PINK,'Torso')
   b.box('Camera',(.40,-.40,1.10),(.32,.18,.24),b.DARK,'Hand_L');ell('Camera lens',(.40,-.52,1.10),(.09,.06,.09),b.LIGHT,'Hand_L')
   eyes(2.16);smile(1.74)
  else:
   for sign in [-1,1]:
    ell('Long bunny ear',(sign*.29,.02,2.95),(.18,.15,.56),MINT)
    ell('Inner bunny ear',(sign*.29,-.12,2.96),(.095,.035,.40),GREEN)
   b.lathe('Pink headband',[(.63,0),(.65,.14)],(0,0,2.23),PINK,'Head')
   ell('Headband knot',(.64,.05,2.30),(.18,.16,.14),PINK)
   for sign in [-1,1]:ell('Bunny muzzle',(sign*.12,-.47,1.90),(.19,.09,.16),PALE)
   ell('Bunny nose',(0,-.57,2.01),(.075,.04,.06),PINK);b.box('Bunny tooth',(0,-.56,1.80),(.09,.04,.11),b.WHITE,'Head')
   ell('Bunny tail',(0,.32,.86),(.22,.2,.22),PALE,'Torso');eyes(2.15);smile(1.78)
  b.lathe('Blue collar',[(.25,0),(.30,.10),(.24,.14)],(0,0,1.43),b.LIGHT,'Torso');b.emblem(-.18,-.32,1.22,.10,'Torso')
  h=3.5 if name=='tweak' else 2.9 if name=='shellington' else 2.72
 elif name=='inkling':
  rose=(.83,.32,.49,1);ell('Octopus mantle',(0,0,1.72),(.71,.49,.73),rose,'Head')
  ell('Octopus body',(0,0,.93),(.48,.34,.42),rose,'Torso')
  for sign in [-1,1]:ell('Dumbo ear',(sign*.70,.02,2.00),(.28,.12,.27),PINK)
  for i in range(8):
   a=i*math.tau/8;x=math.cos(a);y=math.sin(a)
   tube('Tentacle '+str(i),[(x*.26,y*.26,.88),(x*.67,y*.67,.32),(x*.90,y*.90,.20),(x*1.06,y*1.06,.28)],.13,rose,'Arm_L' if i%2==0 else 'Arm_R')
  eyes(1.88,y=-.48);ell('Octopus mouth',(0,-.51,1.55),(.10,.045,.09),b.DARK)
  for sign in [-1,1]:
   points=[(sign*.26+math.cos(i*math.tau/24)*.17,-.555,1.89+math.sin(i*math.tau/24)*.20) for i in range(25)]
   tube('Spectacle rim',points,.018,b.DARK,'Head')
  tube('Spectacle bridge',[(-.10,-.555,1.89),(0,-.57,1.93),(.10,-.555,1.89)],.016,b.DARK,'Head')
  b.box('Book',(.54,-.27,.94),(.33,.15,.42),b.BLUE,'Hand_L');h=2.6
 else:
  ell('Vegimal body',(0,0,.63),(.36,.28,.43),(.10,.54,.60,1),'Torso')
  ell('Turnip head',(0,0,1.19),(.53,.40,.53),PALE,'Head')
  for x in [-.21,0,.21]:
   ell('Green leaf',(x,.02,1.88),(.13,.11,.35),GREEN,'Head')
  eyes(1.26,y=-.345,spread=.20);ell('Small orange mouth',(0,-.43,1.06),(.08,.06,.07),b.ORANGE)
  for side,sign in [('L',1),('R',-1)]:
   ell('Vegimal flipper',(sign*.38,0,.65),(.11,.10,.25),(.10,.54,.60,1),'Arm_'+side)
   ell('Root foot',(sign*.15,-.05,.10),(.13,.18,.09),b.ORANGE,'Foot_'+side)
  ell('Fish tail',(0,.33,.40),(.22,.16,.17),(.10,.54,.60,1),'Torso');h=2.25
 arm,mesh=b.rig(name,h)
 # Blink around each actual eye, vertically. The shared source rig's eye pivots
 # were authored for the original three and must not pull smaller faces forward.
 eye_z,eye_y,spread=(1.26,-.345,.20) if name=='tunip' else (1.88,-.48,.26) if name=='inkling' else (2.15 if name=='tweak' else 2.16,-.48,.26)
 bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
 for side,sign in [('L',1),('R',-1)]:
  bone=arm.data.edit_bones['Blink_'+side];bone.head=(sign*spread,eye_y,eye_z);bone.tail=(sign*spread,eye_y+.15,eye_z);bone.roll=0
 bpy.ops.object.mode_set(mode='OBJECT')
 arm['asset_status']='Replaceable placeholder; gameplay identity lives in crewConfig.js'
 bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=arm
 bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=b.OUT+'/'+name+'.blend',compress=True)
 bpy.ops.export_scene.gltf(filepath=b.MODELS+'/'+name+'.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_yup=True)
 print('PLACEHOLDER_COMPLETE',name,len(mesh.data.polygons))
if __name__=='__main__':
 for name in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['shellington','dashi','tweak','inkling','tunip']):build(name)
