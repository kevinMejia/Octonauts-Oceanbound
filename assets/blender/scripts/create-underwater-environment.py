"""Build the authored Oceanbound reef library with Blender 4.2+. All dimensions in metres.
Meshes use tapered organic surfaces, hollow coral openings and vertex-color crevice shading.
"""
import bpy, math, random, os
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'));rng=random.Random(71421)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mat=bpy.data.materials.new('Reef organic vertex colors');mat.use_nodes=True
p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.8
v=mat.node_tree.nodes.new('ShaderNodeVertexColor');v.layer_name='Color';mat.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color'])
leafmat=mat.copy();leafmat.name='Leaf surfaces two-sided';leafmat.use_backface_culling=False
class Builder:
 def __init__(self):self.v=[];self.f=[];self.c=[]
 def vertex(self,p,c):self.v.append(tuple(p));self.c.append(tuple(c)+(1,));return len(self.v)-1
 def face(self,*ids):self.f.append(ids)
 def tube(self,points,radii,color,sides=7,cap=True):
  start=len(self.v)
  for i,pos in enumerate(points):
   tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized();u=tangent.cross(Vector((0,0,1)))
   if u.length<.01:u=tangent.cross(Vector((1,0,0)))
   u.normalize();v=tangent.cross(u).normalized()
   for j in range(sides):
    a=j*math.tau/sides;shade=.72+.28*(i/max(1,len(points)-1));self.vertex(Vector(pos)+radii[i]*(math.cos(a)*u+math.sin(a)*v),[x*shade for x in color])
  for i in range(len(points)-1):
   for j in range(sides):a=start+i*sides+j;b=start+i*sides+(j+1)%sides;self.face(a,b,b+sides,a+sides)
  if cap:self.face(*[start+j for j in reversed(range(sides))]);self.face(*[start+(len(points)-1)*sides+j for j in range(sides)])
 def ball(self,center,radius,color):
  start=len(self.v);rings=6;sides=8
  for i in range(rings+1):
   p=math.pi*i/rings
   for j in range(sides):
    a=j*math.tau/sides;self.vertex(Vector(center)+Vector((math.sin(p)*math.cos(a),math.sin(p)*math.sin(a),math.cos(p)))*radius,color)
  for i in range(rings):
   for j in range(sides):a=start+i*sides+j;d=start+i*sides+(j+1)%sides;self.face(a,d,d+sides,a+sides)
 def object(self,name,material=mat):
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(self.v,[],self.f);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(material)
  attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
  for a,c in zip(attr.data,self.c):a.color=c
  for f in mesh.polygons:f.use_smooth=True
  return obj

def coral(var,color):
 b=Builder()
 def branch(origin,direction,length,radius,depth):
  direction=Vector(direction).normalized();bend=Vector((rng.uniform(-.2,.2),rng.uniform(-.2,.2),.12));pts=[Vector(origin)+direction*length*t/6+bend*length*(t/6)**2 for t in range(7)];b.tube(pts,[radius*(1-.3*i/6) for i in range(7)],color,8);b.ball(pts[-1],radius*.72,color)
  if depth:
   for t in [.43,.72,1.]:
    a=rng.random()*math.tau;d=Vector((math.cos(a)*.75,math.sin(a)*.75,.8));branch(pts[int(t*6)],d,length*rng.uniform(.48,.7),radius*.65,depth-1)
 for i in range(3):branch((rng.uniform(-.15,.15),rng.uniform(-.15,.15),0),(rng.uniform(-.25,.25),rng.uniform(-.25,.25),1),1.15+var*.12,.16,2)
 return b.object('branch'+str(var))

def brain(var):
 b=Builder();rows=64;sides=96
 for i in range(rows+1):
  lat=math.pi*i/rows
  for j in range(sides):
   a=j*math.tau/sides;x=math.sin(lat)*math.cos(a);y=math.sin(lat)*math.sin(a);z=math.cos(lat)
   field=math.sin(x*8+math.sin(z*8)*1.7)+math.sin(y*8+math.sin(x*8)*1.4);ridge=math.exp(-(field/.55)**2);r=(.62+var*.1)*(1+.055*math.sin(a*5+lat*4))+.035*ridge
   color=[(.07+.24*ridge),(.15+.35*ridge),(.025+.10*ridge)];b.vertex((x*r,y*r,z*r*.83+.52+var*.06),color)
 for i in range(rows):
  for j in range(sides):a=i*sides+j;d=i*sides+(j+1)%sides;b.face(a,d,d+sides,a+sides)
 return b.object('brain'+str(var))

def tubes(var):
 b=Builder()
 for k in range(7):
  angle=k*2.4;r=.14+(k%3)*.17;x=math.cos(angle)*r;y=math.sin(angle)*r;h=.8+rng.random()*1.3;rad=.12+rng.random()*.065;start=len(b.v);sides=14
  # Outer curved wall, rounded lip and deep dark inner wall in one closed section.
  rings=[(h*t/7,rad*(.72+.28*t/7)) for t in range(8)]+[(h+.025,rad*.94),(h+.015,rad*.68),(h-.13,rad*.64),(h*.6,rad*.57)]
  for ri,(z,rr) in enumerate(rings):
   for j in range(sides):
    a=j*math.tau/sides;flute=1+.04*math.sin(a*7+z*2);t=z/h;shade=.52+.48*t if ri<9 else .35;col=(.45*shade,.12*shade,.64*shade) if ri!=8 else (.72,.34,.83)
    b.vertex((x+math.cos(a)*rr*flute+math.sin(angle)*t*t*.28,y+math.sin(a)*rr*flute+math.cos(angle)*t*t*.2,z),col)
  for i in range(len(rings)-1):
   for j in range(sides):a=start+i*sides+j;d=start+i*sides+(j+1)%sides;b.face(a,d,d+sides,a+sides)
 return b.object('tube'+str(var))

def leaf(b,origin,height,width,angle,color):
 start=len(b.v);o=Vector(origin);direction=Vector((math.cos(angle),math.sin(angle),0));side=Vector((-math.sin(angle),math.cos(angle),0))
 for i in range(13):
  t=i/12;center=o+direction*(height*.2*t+math.sin(t*5)*height*.09)+Vector((0,0,height*t));w=width*math.sin(math.pi*t)**.7
  for j in [-1,0,1]:
   point=center+side*w*j+direction*(abs(j)*math.sin(t*8+angle)*w*.4);c=[x*(.62+.32*t+(.1 if j==0 else 0)) for x in color];b.vertex(point,c)
 for i in range(12):
  for j in range(2):a=start+i*3+j;b.face(a,a+1,a+4,a+3)

def plant(kind,var):
 b=Builder()
 if kind=='kelp':
  for k in range(3):
   a=k*2.4;h=2.7+var*.4+k*.2;pts=[(.14*math.sin(t*.7+a),.14*math.cos(t*.8+a),h*t/10) for t in range(11)];b.tube(pts,[.045*(1-t/13) for t in range(11)],(.085,.22,.035),6)
   for j in range(6):leaf(b,pts[j+2],.8+j*.05,.15,a+j*2.4,(.15,.39,.055))
 elif kind=='seaweed':
  for k in range(8):leaf(b,(rng.uniform(-.25,.25),rng.uniform(-.25,.25),0),.7+rng.random()*.65,.10+rng.random()*.06,k*2.4,(.07,.34,.10))
 else:
  for k in range(26):
   a=k*2.4;r=math.sqrt(rng.random())*.55;leaf(b,(math.cos(a)*r,math.sin(a)*r,0),.35+rng.random()*.5,.025+rng.random()*.018,a,(.18,.31,.06))
 return b.object(kind+str(var),leafmat)

def rock(var):
 # Distorted smooth icospheres joined into intentionally asymmetrical outcrops.
 objs=[]
 for k in range(3 if var==2 else 1):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1);o=bpy.context.object;o.name='rock';scale=(1.1+var*.2,.9+var*.1,.8+var*.3)
  for v in o.data.vertices:
   q=v.co;d=1+.09*math.sin(q.x*5+q.z*3)*math.sin(q.y*5+1)+.04*math.cos(q.z*8);q.x*=scale[0]*d;q.y*=scale[1]*d;q.z*=scale[2]*d;q.z+=scale[2]*.65
  o.location=(k*.75,math.sin(k*3)*.6,k*.35);attr=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
  for v,a in zip(o.data.vertices,attr.data):
   q=v.co;shade=.72+.16*math.sin(q.x*8+q.z*4)*math.sin(q.y*7)+.12*q.z/max(1,scale[2]);a.color=(.18*shade,.235*shade,.25*shade,1)
  for f in o.data.polygons:f.use_smooth=True
  o.data.materials.append(mat);objs.append(o)
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name='rock'+str(var);return objs[0]

def shell(var):
 b=Builder()
 if var%2==0:
  pts=[];rads=[]
  for i in range(100):
   a=i/99*math.pi*5;r=.025+.29*(i/99)**1.5;pts.append((math.cos(a)*r,math.sin(a)*r,.08+.11*i/99));rads.append(.012+.075*i/99)
  b.tube(pts,rads,(.72,.48,.25),8)
 else:
  for i in range(11):
   r=i/10*.43
   for j in range(25):
    a=.22+j/24*(math.pi-.44);z=.14*math.sin(i/10*math.pi)+.012*math.cos(a*22)*i/10;b.vertex((r*math.cos(a),r*math.sin(a),z),(.72+.1*math.cos(a*22),.58,.38))
  for i in range(10):
   for j in range(24):a=i*25+j;b.face(a,a+1,a+26,a+25)
 return b.object('shell'+str(var),leafmat)

assets=[]
for v,color in enumerate([(.85,.19,.035),(.75,.12,.29),(.43,.13,.65)]):assets.extend([coral(v,color),brain(v),tubes(v),plant('kelp',v),plant('seaweed',v),plant('grass',v),rock(v),shell(v)])
# Author a reduced mesh for each variation rather than asking mobile to render hero geometry.
low_assets=[]
for original in assets:
 low=original.copy();low.data=original.data.copy();low.name=original.name+'_low';bpy.context.collection.objects.link(low)
 modifier=low.modifiers.new('Mobile reduction','DECIMATE');modifier.ratio=.28 if original.name.startswith('brain') else .48 if original.name.startswith(('branch','rock')) else .65
 bpy.context.view_layer.objects.active=low;bpy.ops.object.modifier_apply(modifier=modifier.name);low_assets.append(low)
# Runtime library: every object stays at the origin; placement is authored in Three.js.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/blender/underwater-environment.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets/models/underwater-environment.glb'),export_format='GLB',export_cameras=False,export_lights=False)
# Studio preview is separate and never exported to the game.
for low in low_assets:low.hide_render=True
for i,o in enumerate(assets):o.location.x+=(i%8)*3.6;o.location.y+=(i//8)*4
bpy.ops.mesh.primitive_plane_add(size=200,location=(11,4,-.04));floor=bpy.context.object;m=bpy.data.materials.new('Studio ground');m.diffuse_color=(.1,.14,.16,1);floor.data.materials.append(m)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.world.color=(.2,.24,.28);scene.render.resolution_percentage=100
for loc,power,size in [((8,-4,15),2500,12),((22,10,12),2000,10)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((12,4,0))-o.location).to_track_quat('-Z','Y').to_euler()
for name,pos,target,scale,res in [('library',(15,-18,19),(12.5,4,1),32,(1600,900)),('detail',(3,-6,4.5),(3,0,.8),9,(1200,900))]:
 bpy.ops.object.camera_add(location=pos);o=bpy.context.object;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=scale;scene.camera=o;scene.render.resolution_x=res[0];scene.render.resolution_y=res[1];scene.render.filepath=os.path.join(ROOT,'docs/environment-upgrade/blender-'+name+'.png');bpy.ops.render.render(write_still=True)
print('Oceanbound reef library:',len(assets),'authored variations')
