import sys,urllib.request
base=sys.argv[1].rstrip('/')+'/'
paths=['index.html','src/main.js','src/game/Game.js','vendor/three.module.js','vendor/GLTFLoader.js','vendor/BufferGeometryUtils.js','assets/models/gup-b.glb','assets/models/turbo-lightning.glb']+[f'assets/models/environment-{i}.glb' for i in range(3)]
for path in paths:
 with urllib.request.urlopen(base+path) as r:
  assert r.status==200
  data=r.read();assert len(data)>0
  if path.endswith('.glb'):assert data[:4]==b'glTF'
print(f'HTTP 200 and valid content: {len(paths)} production files at {base}')
