import pathlib, shutil, json, struct, hashlib, re
ROOT=pathlib.Path(__file__).resolve().parents[1];out=ROOT/'dist';out.mkdir(exist_ok=True)
for name in ['index.html','src','vendor']:
 p=ROOT/name
 if p.is_dir():shutil.copytree(p,out/name,dirs_exist_ok=True)
 else:shutil.copy2(p,out/name)
models=['gup-a.glb','gup-r.glb','gup-b.glb','gup-b-high.glb','turbo-lightning.glb','underwater-environment.glb','octopod.glb','showcase-rocks.glb']
(out/'assets/models').mkdir(parents=True,exist_ok=True)
for p in (out/'assets/models').glob('*.glb'):
 if p.name not in models:p.unlink()
for name in models:shutil.copy2(ROOT/'assets/models'/name,out/'assets/models'/name)
shutil.copy2(ROOT/'assets/models/octopod-collision.json',out/'assets/models/octopod-collision.json')
shutil.copy2(ROOT/'assets/models/showcase-rocks.json',out/'assets/models/showcase-rocks.json')
shutil.copytree(ROOT/'assets/models/reef-formations',out/'assets/models/reef-formations',dirs_exist_ok=True)
shutil.copytree(ROOT/'assets/models/characters',out/'assets/models/characters',dirs_exist_ok=True)
shutil.copytree(ROOT/'assets/textures',out/'assets/textures',dirs_exist_ok=True)
shutil.copytree(ROOT/'assets/audio',out/'assets/audio',dirs_exist_ok=True,ignore=shutil.ignore_patterns('source'))
shutil.copytree(ROOT/'assets/img',out/'assets/img',dirs_exist_ok=True)
(out/'.nojekyll').touch()
for p in (out/'assets/models').rglob('*.glb'):
 data=p.read_bytes();assert data[:4]==b'glTF';assert struct.unpack_from('<I',data,8)[0]==len(data)
print('Production site built; all GLB headers and lengths verified.')

# Version the module graph together: Safari may otherwise reuse old imports after a deploy.
hash_input=b''.join(p.read_bytes() for p in sorted((ROOT/'src').rglob('*')) if p.is_file())+(ROOT/'index.html').read_bytes()
hash_input+=b''.join((ROOT/'assets/models'/name).read_bytes() for name in models)
hash_input+=b''.join(p.read_bytes() for p in sorted((ROOT/'assets/textures').glob('*')) if p.is_file())
hash_input+=b''.join(p.read_bytes() for p in sorted((ROOT/'assets/models/reef-formations').glob('*')) if p.is_file())
hash_input+=(ROOT/'assets/models/octopod-collision.json').read_bytes()
hash_input+=(ROOT/'assets/models/showcase-rocks.json').read_bytes()
hash_input+=b''.join(p.read_bytes() for p in sorted((ROOT/'assets/models/characters').glob('*.glb')))
hash_input+=b''.join(p.read_bytes() for p in sorted((ROOT/'assets/audio').glob('*.mp3')))
hash_input+=b''.join(p.read_bytes() for p in sorted((ROOT/'assets/img').rglob('*')) if p.is_file())
version=hashlib.sha256(hash_input).hexdigest()[:12]
for p in [out/'index.html',*list((out/'src').rglob('*.js')),*list((out/'vendor').glob('*.js'))]:
 text=p.read_text(encoding='utf-8')
 text=re.sub(r"([\"'])(\.{1,2}/[^\"'\s]+\.(?:js|css))\1",lambda m:m[1]+m[2]+'?v='+version+m[1],text)
 if p.suffix=='.js' and 'src' in p.relative_to(out).parts:
  text=re.sub(r"(new URL\([^;\n]+?,import\.meta\.url\)\.href)",lambda m:m[1]+"+'?v="+version+"'",text)
 p.write_text(text,encoding='utf-8')
print('Versioned production modules:',version)
