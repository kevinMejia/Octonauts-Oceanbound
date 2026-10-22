import pathlib, shutil, json, struct
ROOT=pathlib.Path(__file__).resolve().parents[1];out=ROOT/'dist';out.mkdir(exist_ok=True)
for name in ['index.html','src','vendor']:
 p=ROOT/name
 if p.is_dir():shutil.copytree(p,out/name,dirs_exist_ok=True)
 else:shutil.copy2(p,out/name)
shutil.copytree(ROOT/'assets/models',out/'assets/models',dirs_exist_ok=True)
(out/'.nojekyll').touch()
for p in (out/'assets/models').glob('*.glb'):
 data=p.read_bytes();assert data[:4]==b'glTF';assert struct.unpack_from('<I',data,8)[0]==len(data)
print('Production site built; all GLB headers and lengths verified.')
