import bpy,json,pathlib,hashlib
from mathutils import Vector
root=pathlib.Path.cwd(); rows=[]
for p in sorted((root/'assets/models/characters/new models').rglob('*.blend')):
 bpy.ops.wm.open_mainfile(filepath=str(p),use_scripts=False)
 deps=bpy.context.evaluated_depsgraph_get(); objects=[o for o in bpy.context.view_layer.objects if o.type=='MESH' and not o.hide_render]; points=[]; tri=vert=0
 for o in objects:
  e=o.evaluated_get(deps);m=e.to_mesh();m.calc_loop_triangles();tri+=len(m.loop_triangles);vert+=len(m.vertices);points.extend(o.matrix_world@v.co for v in m.vertices);e.to_mesh_clear()
 lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
 used={m.name for o in objects for m in o.data.materials if m};images={n.image.name for m in bpy.data.materials if m.name in used and m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image}
 ranges={}
 for a in bpy.data.actions:
  times=[k.co.x for l in a.layers for st in l.strips for bag in st.channelbags for c in bag.fcurves for k in c.keyframe_points]
  ranges[a.name]=[min(times),max(times)] if times else None
 row=dict(actionFrameRanges=ranges,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),usedMaterials=sorted(used),materialImages=sorted(images),animationKeys={a.name:sum(len(c.keyframe_points) for l in a.layers for st in l.strips for bag in st.channelbags for c in bag.fcurves) for a in bpy.data.actions},orientation='Blender Z-up, +Y front; glTF Y-up, -Z front',folder=p.parent.name,file=p.name,bytes=p.stat().st_size,triangles=tri,vertices=vert,meshes=len(objects),materials=[m.name for m in bpy.data.materials],textures=[dict(name=i.name,path=i.filepath,size=list(i.size),packed=bool(i.packed_file)) for i in bpy.data.images if i.type=='IMAGE'],actions=[a.name for a in bpy.data.actions],rigs=[o.name for o in bpy.data.objects if o.type=='ARMATURE'],bounds=[lo,hi],objects=[dict(name=o.name,modifiers=[dict(type=m.type,name=m.name,levels=getattr(m,'levels',None)) for m in o.modifiers]) for o in objects])
 rows.append(row)
(root/'docs/characters/source-audit.json').write_text(json.dumps(rows,indent=2))

