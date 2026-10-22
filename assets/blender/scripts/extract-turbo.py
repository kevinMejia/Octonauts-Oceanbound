# Adapt the user's original Little Big Dirt Blender lightning core; omit rings/studio/base.
import bpy,os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets/blender/turbo-original.blend'))
for obj in list(bpy.data.objects):
 if obj.type!='MESH' or not obj.name.startswith('Core_'):bpy.data.objects.remove(obj,do_unlink=True)
for obj in bpy.context.scene.objects:
 mat=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=mat
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/blender/turbo-lightning.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets/models/turbo-lightning.glb'),export_format='GLB',use_selection=True)
