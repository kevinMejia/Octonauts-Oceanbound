"""Trace the supplied Octonauts wordmark into reusable, simplified glyph contours.
Usage: bundled-python tools/trace_word_hunt_letters.py reference.jpg
Requires Pillow only at authoring time; generated JS has no runtime dependencies.
"""
import sys,json,math
from pathlib import Path
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB')
# Isolate the word from the surrounding badge in the supplied 755x180 reference.
im=im.crop((48,43,648,134))
pixels={(x,y) for y in range(im.height) for x in range(im.width) if (lambda c:c[0]<70 and c[1]<130 and c[2]<145)(im.getpixel((x,y)))}
components=[]
while pixels:
 seed=pixels.pop();todo=[seed];part={seed}
 while todo:
  x,y=todo.pop()
  for q in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
   if q in pixels:pixels.remove(q);part.add(q);todo.append(q)
 if len(part)>150:components.append(part)
components.sort(key=lambda p:min(x for x,y in p))
assert len(components)==9,len(components)
def simplify(points,eps=1.2):
 if len(points)<3:return points
 a,b=points[0],points[-1];dx=b[0]-a[0];dy=b[1]-a[1];den=math.hypot(dx,dy)
 distances=[abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/den if den else math.dist(a,p) for p in points]
 i=max(range(len(points)),key=lambda i:distances[i])
 if distances[i]>eps:return simplify(points[:i+1],eps)[:-1]+simplify(points[i:],eps)
 return [a,b]
glyphs={}
for letter,part in zip('OCTONAUTS',components):
 edges={}
 for x,y in part:
  for neighbor,a,b in [((x,y-1),(x,y),(x+1,y)),((x+1,y),(x+1,y),(x+1,y+1)),((x,y+1),(x+1,y+1),(x,y+1)),((x-1,y),(x,y+1),(x,y))]:
   if neighbor not in part:edges[a]=b
 loops=[]
 while edges:
  start=next(iter(edges));p=start;loop=[p]
  while p in edges:
   p=edges.pop(p);loop.append(p)
   if p==start:break
  if len(loop)>15:
   mid=len(loop)//2;loop=simplify(loop[:mid+1])[:-1]+simplify(loop[mid:])[:-1];loops.append(loop)
 left=min(x for x,y in part);right=max(x for x,y in part)+1
 contours=[[[round((x-(left+right)/2)/90,5),round((45-y)/90,5)] for x,y in loop] for loop in loops]
 # Largest contour is the outer silhouette; remaining loops form counters.
 def area(c):return abs(sum(c[i][0]*c[(i+1)%len(c)][1]-c[(i+1)%len(c)][0]*c[i][1] for i in range(len(c))))
 contours.sort(key=area,reverse=True)
 if letter not in glyphs:glyphs[letter]=contours
out=Path(__file__).resolve().parents[1]/'src/wordHunt/letterOutlines.js'
out.write_text('// Vector contours traced from the user-supplied Octonauts wordmark.\nexport const letterOutlines='+json.dumps(glyphs,separators=(',',':'))+';\n')
print({k:[len(c) for c in v] for k,v in glyphs.items()})
