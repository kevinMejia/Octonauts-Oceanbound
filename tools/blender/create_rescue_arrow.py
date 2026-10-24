"""Author the small rescue HUD arrow; Blender 5.0, no external assets needed."""
import bpy,pathlib,json
ROOT=pathlib.Path.cwd();bpy.ops.wm.read_factory_settings(use_empty=True)
outline=[(-.28,-.72),(.28,-.72),(.28,.08),(.7,.08),(0,.92),(-.7,.08),(-.28,.08)];n=len(outline)
vertices=[(x,y,z) for z in [-.12,.12] for x,y in outline];faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh=bpy.data.meshes.new('Rescue arrow low-poly mesh');mesh.from_pydata(vertices,[],faces);mesh.update();arrow=bpy.data.objects.new('Rescue navigation arrow',mesh);bpy.context.collection.objects.link(arrow)
for name,color,metallic,emission in [('Dark underside',(0.006,.09,.12,1),.1,0),('Cyan screen top',(.015,.85,.76,1),.2,.15),('Teal sides',(.008,.23,.27,1),.25,0),('Bevel highlights',(.06,.65,.65,1),.25,.08)]:
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=.32;p.inputs['Emission Color'].default_value=color;p.inputs['Emission Strength'].default_value=emission;arrow.data.materials.append(m)
for p in mesh.polygons:p.material_index=0 if p.index==0 else 1 if p.index==1 else 2
bevel=arrow.modifiers.new('Soft low-poly bevel','BEVEL');bevel.width=.055;bevel.segments=2;bevel.material=3
bpy.context.view_layer.objects.active=arrow;arrow.select_set(True)
source=ROOT/'assets/blender/ui/rescue-arrow.blend';source.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models/rescue-arrow.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
