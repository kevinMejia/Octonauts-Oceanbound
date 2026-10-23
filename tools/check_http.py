import sys,urllib.request
base=sys.argv[1].rstrip('/')+'/'
paths=['index.html','src/main.js','src/game/Game.js','vendor/three.module.js','vendor/GLTFLoader.js','vendor/BufferGeometryUtils.js','assets/models/gup-b.glb','assets/models/turbo-lightning.glb']+['assets/models/underwater-environment.glb']+['assets/models/reef-formations/'+name for name in ['large.glb','garden.glb','patch.glb','wall.glb','manifest.json']]+['vendor/DRACOLoader.js','vendor/draco/draco_wasm_wrapper.js','vendor/draco/draco_decoder.wasm']+['assets/textures/'+name for name in ['sand-color.jpg','sand-normal.png','sand-roughness.png','caustics.png','rock-color.jpg','rock-normal.png']]
paths+=['assets/models/reef-formations/interactions.json','src/effects/EnvironmentalInteractions.js','src/config/interactionConfig.js','assets/models/octopod.glb','assets/models/octopod-collision.json','src/navigation/Compass.js','src/config/octopodConfig.js']
paths+=['src/environment/AmbientWater.js','src/environment/waterCaustics.js','src/effects/PropulsionWater.js','src/effects/waterMath.js','src/config/waterConfig.js']
paths+=['src/camera/ChaseCamera.js','src/camera/CameraObstacles.js','src/camera/cameraMath.js','src/config/cameraConfig.js']
paths+=['src/ui/TurboMeter.js']
paths+=['src/config/visualConfig.js','src/environment/showcaseLayout.js','assets/models/showcase-rocks.glb','assets/models/showcase-rocks.json','src/environment/waterReflections.js']
for path in paths:
 with urllib.request.urlopen(base+path) as r:
  assert r.status==200
  data=r.read();assert len(data)>0
  if path.endswith('.glb'):assert data[:4]==b'glTF'
print(f'HTTP 200 and valid content: {len(paths)} production files at {base}')
