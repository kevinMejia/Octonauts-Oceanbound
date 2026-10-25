# Generic import derived from the established GUP-A/R preparation workflow.
# Source files are read only; working copies and bakes stay in .local-assets.
import bpy,os,math,json,numpy as np,sys
from mathutils import Vector,Matrix
JOB=json.load(open(sys.argv[sys.argv.index('--')+1]));ROOT=os.getcwd();VEHICLE=JOB['name'].replace('-','');OUT=JOB['work'];TEX=OUT;os.makedirs(os.path.join(OUT,'prepared-textures'),exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=JOB['source'])
texture_files={os.path.basename(p):os.path.join(base,p) for base,dirs,files in os.walk(TEX) for p in files if p.lower().endswith(('.png','.jpg','.jpeg','.mkv','.mp4'))}
# Work only on copies; keep the supplied .blend and archive byte-for-byte intact.
source_scene=bpy.context.scene
for material in bpy.data.materials:
 if not material.use_nodes:continue
 for node in material.node_tree.nodes:
  if node.type=='TEX_IMAGE' and node.image:
   path=texture_files.get(os.path.basename(node.image.filepath.replace('\\','/')),'')
   if os.path.isfile(path):node.image=bpy.data.images.load(path,check_existing=True)
for o in source_scene.objects:
 for m in o.modifiers:m.show_render=m.show_viewport
source_scene.frame_set(1);deps=bpy.context.evaluated_depsgraph_get()
source_objects=[o for o in source_scene.objects if o.type in {'MESH','CURVE'} and not o.hide_render and (o.type=='CURVE' or len(o.data.polygons))]
points=[o.matrix_world@Vector(c) for o in source_objects for c in o.bound_box];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));scale=JOB['targetLength']/(hi.y-lo.y);center=(lo+hi)/2
export_scene=bpy.data.scenes.new('Oceanbound '+VEHICLE);bpy.context.window.scene=export_scene
root=bpy.data.objects.new(VEHICLE+' High Detail',None);export_scene.collection.objects.link(root);root['creator']='Keeks_Q';root['oceanboundImported']=True;root['sourceForward']='+Y';root['sourceUnitLength']=hi.y-lo.y;root['runtimeLength']=JOB['targetLength'];root['propellerAvailable']=False
materials={};notes=[]
def saved_image(name,width,height,pixels):
 image=bpy.data.images.new(name,width=width,height=height,alpha=True);image.pixels.foreach_set(np.asarray(pixels,dtype=np.float32).ravel());image.filepath_raw=os.path.join(OUT,'prepared-textures',name+'.png');image.file_format='PNG';image.save();image.pack();return image

def ramp_image(original,ramp,name):
 width,height=original.size;pixels=np.empty(width*height*4,dtype=np.float32);original.pixels.foreach_get(pixels);pixels=pixels.reshape((-1,4));lum=np.clip(pixels[:,:3]@np.array([.2126,.7152,.0722]),0,1)
 table=np.array([ramp.evaluate(i/4095) for i in range(4096)],dtype=np.float32);result=table[np.rint(lum*4095).astype(np.int32)];result[:,3]=pixels[:,3]
 return saved_image(name,width,height,result)

def convert_material(old):
 if old.name in materials:return materials[old.name]
 new=old.copy();new.name=old.name+' [Oceanbound]';materials[old.name]=new
 if not new.use_nodes:return new
 nodes=new.node_tree.nodes;links=new.node_tree.links;principled=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None);output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
 if not principled:return new
 # Shader shadow-ray switches cannot be serialized to glTF. The visible shader
 # is unchanged; link it directly and retain alpha textures for the visible decals.
 links.new(principled.outputs['BSDF'],output.inputs['Surface'])
 for socket_name in ['Base Color','Emission Color']:
  socket=principled.inputs[socket_name]
  if socket.is_linked and socket.links[0].from_node.type=='VALTORGB':
   ramp=socket.links[0].from_node
   if ramp.inputs['Fac'].is_linked and ramp.inputs['Fac'].links[0].from_node.type=='TEX_IMAGE':
    source=ramp.inputs['Fac'].links[0].from_node.image
    image=ramp_image(source,ramp.color_ramp,old.name+'-'+socket_name.replace(' ','-'))
    texture=nodes.new('ShaderNodeTexImage');texture.image=image
    original_texture=ramp.inputs['Fac'].links[0].from_node
    if original_texture.inputs['Vector'].is_linked:links.new(original_texture.inputs['Vector'].links[0].from_socket,texture.inputs['Vector'])
    links.new(texture.outputs['Color'],socket)
 if old.name.lower().split('.')[0] in ['glass2','glass']:
  # Preserve the authored Fresnel mix via extras and an equivalent runtime shader.
  # Native glTF gets a readable alpha approximation; no geometry is changed.
  new['oceanboundFacingAlpha']=True;principled.inputs['Alpha'].default_value=.32;new.surface_render_method='BLENDED';notes.append('Glass2 view-dependent transparent mix is reproduced by the runtime material adapter.')
 if old.name=='Radar1':notes.append('Radar video exported as a still frame; glTF does not embed video textures.')
 return new
copies=[];triangle_count=0
for old in source_objects:
 evaluated=old.evaluated_get(deps);mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps);mesh.calc_loop_triangles();
 if not mesh.loop_triangles:continue
 triangle_count+=len(mesh.loop_triangles)
 obj=bpy.data.objects.new('Part_'+old.name,mesh);export_scene.collection.objects.link(obj);obj.matrix_world=Matrix.Scale(scale,4)@Matrix.Rotation(math.pi,4,'Z')@Matrix.Translation(-center)@old.matrix_world;obj.parent=root
 for i,material in enumerate(mesh.materials):
  if material:mesh.materials[i]=convert_material(material)
 copies.append(obj)
 # Optional source-derived tread morphs: shift the original link along its
 # existing Array/Curve stack. No belt geometry or path is reconstructed.
 track=JOB.get('tracks',{}).get(old.name)
 if track:
  obj.name=track['name'];obj.shape_key_add(name='Basis');original=[v.co.copy() for v in old.data.vertices]
  steps=track.get('steps',8);pitch=track['sourcePitch']
  for step in range(1,steps+1):
   for vertex,co in zip(old.data.vertices,original):vertex.co=co+Vector((0,pitch*step/steps,0))
   old.data.update();bpy.context.view_layer.update();sample=bpy.data.meshes.new_from_object(old.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
   assert len(sample.vertices)==len(mesh.vertices),'Tread topology changed'
   key=obj.shape_key_add(name='TreadPhase'+str(step))
   for vertex,target in zip(sample.vertices,key.data):target.co=vertex.co
   bpy.data.meshes.remove(sample)
  for vertex,co in zip(old.data.vertices,original):vertex.co=co
  old.data.update();bpy.context.view_layer.update()
  obj['treadPitch']=pitch*scale;obj['treadSteps']=steps
assert triangle_count>0,triangle_count
# Only clearly named independent blade meshes get a preserved world-space pivot.
import re
propellers=[]
for obj in list(copies):
 original=obj.name.removeprefix('Part_')
 if not re.match(r'^(propeller|prepeller|rotor)([LR]|\.\d+|\d*)$',original,re.I):continue
 bounds=[obj.matrix_world@Vector(c) for c in obj.bound_box];dimensions=[max(p[i] for p in bounds)-min(p[i] for p in bounds) for i in range(3)]
 axis=['x','z','y'][dimensions.index(min(dimensions))]
 pivot=bpy.data.objects.new('Propeller'+str(len(propellers)+1),None);export_scene.collection.objects.link(pivot);pivot.parent=root
 pivot.location=Vector(tuple((min(p[i] for p in bounds)+max(p[i] for p in bounds))/2 for i in range(3)));bpy.context.view_layer.update()
 world=obj.matrix_world.copy();obj.parent=pivot;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_world=world;copies.append(pivot);propellers.append({'name':pivot.name,'axis':axis,'direction':1})
root['propellerAvailable']=bool(propellers)
root['sourceTriangles']=triangle_count
# Bake non-image procedural/generated-coordinate colors to per-object UV maps.
# Baking shader color preserves topology; it does not decimate, subdivide or remesh.
export_scene.render.engine='CYCLES';export_scene.cycles.samples=1;export_scene.world=bpy.data.worlds.new('Neutral inspection world');export_scene.world.use_nodes=True;export_scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.2,.2,.2,1);export_scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.6
for obj in copies:
 if obj.type!='MESH':continue
 needs=[]
 for index,m in enumerate(obj.data.materials):
  if not m or not m.use_nodes:continue
  p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if p and any(p.inputs[k].is_linked and p.inputs[k].links[0].from_node.type not in ['TEX_IMAGE'] for k in ['Base Color','Emission Color']):needs.append(index)
  generated=any(n.type=='TEX_IMAGE' and n.image and (n.image.source=='MOVIE' or n.inputs['Vector'].is_linked) for n in m.node_tree.nodes)
  if generated and index not in needs:needs.append(index)
 if not needs:continue
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 # Existing UVs remain unchanged unless procedural mapping had no UVs.
 original_uv=obj.data.uv_layers.active.name if obj.data.uv_layers.active else None
 if original_uv:
  for material_index,material in enumerate(obj.data.materials):
   if not material or not material.use_nodes:continue
   material=material.copy();obj.data.materials[material_index]=material
   for texture in list(material.node_tree.nodes):
    if texture.type=='TEX_IMAGE' and texture.image and not texture.inputs['Vector'].is_linked:
     original_map=material.node_tree.nodes.new('ShaderNodeUVMap');original_map.uv_map=original_uv;material.node_tree.links.new(original_map.outputs['UV'],texture.inputs['Vector'])
 obj.data.uv_layers.new(name='Oceanbound baked UV');obj.data.uv_layers.active_index=len(obj.data.uv_layers)-1;obj.data.uv_layers.active.active_render=True
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
 for index in needs:
  m=obj.data.materials[index].copy();obj.data.materials[index]=m;nodes=m.node_tree.nodes;links=m.node_tree.links;p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
  baked_sources={}
  for socket_name in ['Base Color','Emission Color','Alpha']:
   socket=p.inputs[socket_name]
   if not socket.is_linked:continue
   source_socket=socket.links[0].from_socket;source_key=(source_socket.node.name,source_socket.name)
   if source_key in baked_sources:
    previous_texture=baked_sources[source_key];links.new(previous_texture.outputs['Color'],socket);continue
   image=bpy.data.images.new(obj.name+'-'+socket_name,width=1024,height=1024,alpha=True);target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target;uv=nodes.new('ShaderNodeUVMap');uv.uv_map=obj.data.uv_layers.active.name;links.new(uv.outputs['UV'],target.inputs['Vector'])
   emission=nodes.new('ShaderNodeEmission');links.new(socket.links[0].from_socket,emission.inputs['Color']);links.new(emission.outputs[0],output.inputs['Surface']);bpy.ops.object.bake(type='EMIT',use_clear=True,margin=8)
   image.filepath_raw=os.path.join(OUT,'prepared-textures',image.name+'.png');image.file_format='PNG';image.save();image.pack();nodes.remove(emission);links.new(target.outputs['Color'],socket);baked_sources[source_key]=target
   if socket_name=='Alpha':
    pixels=np.empty(1024*1024*4,dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape((-1,4));pixels[:,3]=pixels[:,0];pixels[:,:3]=1;image.pixels.foreach_set(pixels.ravel());image.save();image.pack();links.new(target.outputs['Alpha'],socket)
  links.new(p.outputs['BSDF'],output.inputs['Surface']);notes.append('Baked procedural/generated-coordinate material on '+obj.name+' at 1024px, with unchanged geometry.')
# Export the clean source before adding preview cameras and lights.
bpy.ops.object.select_all(action='DESELECT')
for o in copies+[root]:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,VEHICLE+'-working.blend'))
bpy.ops.export_scene.gltf(filepath=JOB['output'],export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_morph_normal=False)
report={'creator':'Keeks_Q','sourceTriangles':triangle_count,'runtimeLength':JOB['targetLength'],'scale':scale,'sourceDimensions':list(hi-lo),'runtimeDimensionsXYZ':[float((hi.x-lo.x)*scale),float((hi.z-lo.z)*scale),JOB['targetLength']],'meshes':len(copies),'materials':len(set(m for o in copies if o.type=='MESH' for m in o.data.materials if m)),'propellers':propellers,'notes':notes}
open(os.path.join(OUT,'preparation.json'),'w').write(json.dumps(report,indent=2));print('PREPARED',json.dumps(report))

# One transparent model-based thumbnail doubles as the requested import preview.
export_scene.cycles.samples=24;export_scene.render.resolution_x=640;export_scene.render.resolution_y=448;export_scene.render.resolution_percentage=100;export_scene.render.image_settings.file_format='PNG';export_scene.render.image_settings.color_mode='RGBA';export_scene.render.film_transparent=True;export_scene.view_settings.view_transform='AgX'
points=[o.matrix_world@Vector(c) for o in copies if o.type=='MESH' for c in o.bound_box];center=Vector(tuple((min(p[i] for p in points)+max(p[i] for p in points))/2 for i in range(3)))
for loc,energy,size in [((6,-8,10),1000,7),((-7,0,5),850,6),((0,7,8),900,5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.location=center+Vector((-8,-12,5));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';export_scene.camera=cam
inv=cam.matrix_world.inverted();bpy.context.view_layer.update();inv=cam.matrix_world.inverted();view=[inv@p for p in points];cam.data.ortho_scale=max(max(p.x for p in view)-min(p.x for p in view),(max(p.y for p in view)-min(p.y for p in view))*640/448)*1.18
export_scene.render.filepath=JOB['thumbnail'];bpy.ops.render.render(write_still=True)
