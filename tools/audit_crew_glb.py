"""Audit generated self-contained GLBs without third-party dependencies."""
import json,struct,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1];rows=[]
for p in sorted((ROOT/'assets/models/characters/imported').glob('*.glb')):
 b=p.read_bytes();length=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+length]);binary=b[28+length:];primitives=[q for m in g.get('meshes',[]) for q in m['primitives']];images=[]
 for i in g.get('images',[]):
  v=g['bufferViews'][i['bufferView']];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];size=list(struct.unpack_from('>II',data,16)) if data[:8]==b'\x89PNG\r\n\x1a\n' else None
  images.append(dict(name=i.get('name'),mimeType=i.get('mimeType'),size=size,bytes=len(data),embedded=True))
 rows.append(dict(id=p.stem,path=p.relative_to(ROOT).as_posix(),bytes=len(b),triangles=sum(g['accessors'][q['indices']]['count']//3 for q in primitives),vertices=sum(g['accessors'][q['attributes']['POSITION']]['count'] for q in primitives),meshes=len(g.get('meshes',[])),primitives=len(primitives),materials=len(g.get('materials',[])),textures=len(g.get('textures',[])),images=images,skins=len(g.get('skins',[])),animations=[dict(name=a['name'],duration=max(g['accessors'][s['input']].get('max',[0])[0] for s in a['samplers'])) for a in g.get('animations',[])]))
(ROOT/'docs/characters/runtime-audit.json').write_text(json.dumps(rows,indent=2))
for r in rows:print(r['id'],r['triangles'],r['vertices'],r['meshes'],r['primitives'],r['materials'],len(r['images']),[a['name'] for a in r['animations']])
