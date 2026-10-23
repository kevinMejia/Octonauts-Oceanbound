import bpy,os,json
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../../..'))
report=[]
for name in ['barnacles','kwazii','peso']:
 path=ROOT+'/assets/blender/characters/'+name+'.blend';bpy.ops.wm.open_mainfile(filepath=path)
 scene=bpy.context.scene;obj=bpy.data.objects[name+'_Skin'];arm=bpy.data.objects[name+'_Rig'];positions=[]
 for frame in [1,61,85]:
  scene.frame_set(frame);evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();positions.append([tuple(v.co) for v in mesh.vertices]);evaluated.to_mesh_clear()
 delta=max(sum((a-b)**2 for a,b in zip(p,q))**.5 for p,q in zip(positions[0],positions[1]));blink=max(sum((a-b)**2 for a,b in zip(p,q))**.5 for p,q in zip(positions[0],positions[2]));assert delta>.001 and blink>.001
 scene.frame_set(1);bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=path,compress=True)
 report.append({'name':name,'bones':len(arm.data.bones),'breathingVertexDisplacement':delta,'blinkPoseVertexDisplacement':blink,'sourceReopened':True})
open(ROOT+'/docs/characters/rig-validation.json','w').write(json.dumps(report,indent=2))
