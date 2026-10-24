"""Read-only source conversion; based on prepare_vehicle.py's visible-shader adapter.
Run Blender --background --disable-autoexec --python tools/blender/prepare_crew.py.
"""
import bpy,pathlib,json,math,sys,time
ROOT=pathlib.Path.cwd();out=ROOT/'assets/models/characters/imported';out.mkdir(exist_ok=True)
for p in sorted((ROOT/'assets/models/characters/new models').rglob('*.blend')):
 if '--' in sys.argv and p.parent.name.lower().replace(' ','-') not in sys.argv[sys.argv.index('--')+1:]:continue
 bpy.ops.wm.open_mainfile(filepath=str(p),use_scripts=False)
 bpy.context.scene.frame_set(1)
 # Single-frame source actions are poses, not motion. Give them a one-frame
 # export interval so glTF can retain the named poses instead of dropping them.
 rigs=[o for o in bpy.context.view_layer.objects if o.type=='ARMATURE']
 main=max(rigs,key=lambda o:len(o.data.bones)) if rigs else None
 for action in bpy.data.actions:
  curves=[c for layer in action.layers for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves]
  times=[point.co.x for curve in curves for point in curve.keyframe_points]
  if times and min(times)==max(times) and main:
   action.use_frame_range=True;action.frame_start=min(times);action.frame_end=min(times)+1
   main.animation_data_create();main.animation_data.action=action
   if action.slots:main.animation_data.action_slot=action.slots[0]
   track=main.animation_data.nla_tracks.new();track.name=action.name;track.mute=True
   strip=track.strips.new(action.name,int(min(times)),action);strip.action_slot=action.slots[0]
 # Limit authoring subdivision, retaining smooth normals and all authored topology/rigs.
 for o in bpy.context.view_layer.objects:
  for m in o.modifiers:
   if m.type=='SUBSURF':m.levels=min(m.levels,1);m.render_levels=m.levels
   # Keep thin shrinkwrapped shells clear of the underlying surface.
   if m.type=='SOLIDIFY' and abs(m.thickness)<=.0011 and any(k.type=='SHRINKWRAP' for k in o.modifiers):m.offset=1
 for m in bpy.data.materials:
  m.use_backface_culling=True
  if not m.use_nodes:continue
  nodes=m.node_tree.nodes;bsdf=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None);output=next((n for n in nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output),None)
  if bsdf and output:
   # The source's Light Path shadow switches are offline-only; retain its visible BSDF.
   m.node_tree.links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
   if m.name in {'Glass2','GlassOcto'}:
    bsdf.inputs['Alpha'].default_value=.25;bsdf.inputs['Transmission Weight'].default_value=0;m.surface_render_method='BLENDED';m.use_backface_culling=False
 for image in bpy.data.images:
  if image.type=='IMAGE' and image.size[0]>1024:
   image.scale(1024,1024)
 # Consolidate compatible rigid parts; keep bone bindings, skins and animated objects separate.
 groups={}
 for o in list(bpy.context.view_layer.objects):
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or o.animation_data or o.constraints or any(m.type=='ARMATURE' for m in o.modifiers):continue
  key=(o.parent,o.parent_type,o.parent_bone)
  groups.setdefault(key,[]).append(o)
 for objects in groups.values():
  if len(objects)<2:continue
  ready=[]
  for o in objects:
   bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
   try:
    for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
    ready.append(o)
   except RuntimeError:pass
  if len(ready)>1:
   bpy.ops.object.select_all(action='DESELECT')
   for o in ready:o.select_set(True)
   bpy.context.view_layer.objects.active=ready[0];bpy.ops.object.join()
 # Export visible meshes plus their complete parent/rig hierarchy, never cameras/lights.
 bpy.ops.object.select_all(action='DESELECT')
 for o in bpy.context.view_layer.objects:
  if (o.type=='MESH' and not o.hide_render) or o.type=='ARMATURE':
   o.hide_set(False);o.select_set(True)
   parent=o.parent
   while parent:parent.hide_set(False);parent.select_set(True);parent=parent.parent
 name=p.parent.name.lower().replace(' ','-')
 bpy.ops.export_scene.gltf(filepath=str(out/(name+'-pending.glb')),export_format='GLB',use_selection=True,export_apply=True,export_animations=True,export_animation_mode='ACTIONS',export_cameras=False,export_lights=False,export_yup=True,export_image_format='AUTO')


 for attempt in range(10):
  try:(out/(name+'-pending.glb')).replace(out/(name+'.glb'));break
  except PermissionError:
   if attempt==9:raise
   time.sleep(.5)
