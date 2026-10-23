"""Batch the established Blender preparation workflow. Outputs stay local until approved.

python tools/import_fleet.py --blender path/to/blender.exe
Original .blend files and archives are never saved or overwritten.
"""
import argparse, hashlib, json, os, pathlib, struct, subprocess

ROOT=pathlib.Path(__file__).resolve().parents[1]
WORK=ROOT/'.local-assets/fleet-import'
SCRIPT=ROOT/'tools/blender/prepare_vehicle.py'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def validate_glb(path,expected):
    data=path.read_bytes()
    assert data[:4]==b'glTF' and struct.unpack_from('<I',data,8)[0]==len(data)
    length=struct.unpack_from('<I',data,12)[0]
    gltf=json.loads(data[20:20+length])
    triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
    assert triangles==expected, f'Geometry changed: {expected} source vs {triangles} exported triangles'
    assert all('bufferView' in image for image in gltf.get('images',[])), 'External/unresolved texture'
    return {'exportedTriangles':triangles,'embeddedTextures':len(gltf.get('images',[])),'exportedMaterials':len(gltf.get('materials',[])),'glbBytes':len(data)}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--blender',required=True);parser.add_argument('--force',action='store_true');args=parser.parse_args()
    jobs=json.loads((ROOT/'tools/fleet-import.json').read_text());WORK.mkdir(parents=True,exist_ok=True);results=[];registered=[]
    for config in jobs:
        identity=config['id'];work=WORK/identity;work.mkdir(exist_ok=True)
        source=ROOT/config['source'];archives=list(source.parent.glob('*.rar'))
        if not source.is_file():
            results.append({'id':identity,'status':'failed','source':config['source'],'error':'Source file missing'});print(identity,'FAILED source file missing',flush=True);continue
        inputs={str(p.relative_to(ROOT)):digest(p) for p in [source,*archives]}
        fingerprint=hashlib.sha256(json.dumps([inputs,digest(SCRIPT),config['targetLength']],sort_keys=True).encode()).hexdigest()
        output=ROOT/'assets/models'/f'{identity}.glb';thumbnail=ROOT/'assets/img/vehicles'/f'{identity}.png'
        job={**config,'source':str(source),'work':str(work),'output':str(output),'thumbnail':str(thumbnail)}
        job_file=work/'job.json';job_file.write_text(json.dumps(job));report_file=work/'preparation.json'
        try:
            report=json.loads(report_file.read_text()) if report_file.exists() else {}
            cached=not args.force and report.get('inputFingerprint')==fingerprint and output.exists() and thumbnail.exists()
            if not cached:
                for archive in archives:
                    names=subprocess.check_output(['tar','-tf',str(archive)],text=True).splitlines()
                    assert all(not pathlib.PurePosixPath(n.replace('\\','/')).is_absolute() and '..' not in pathlib.PurePosixPath(n.replace('\\','/')).parts and ':' not in n for n in names)
                    subprocess.run(['tar','-xf',str(archive),'-C',str(work)],check=True,capture_output=True)
                with (work/'prepare.log').open('w') as log:
                    result=subprocess.run([args.blender,'--background','--factory-startup','--disable-autoexec','--python',str(SCRIPT),'--',str(job_file)],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
                assert result.returncode==0, f'Blender exited {result.returncode}; see {work}/prepare.log'
                assert 'Traceback (most recent call last)' not in (work/'prepare.log').read_text(errors='replace'), f'Blender script failed; see {work}/prepare.log'
                report=json.loads(report_file.read_text())
            report.update(validate_glb(output,report['sourceTriangles']))
            assert thumbnail.exists(),'Thumbnail render missing'
            for name,original in inputs.items():assert digest(ROOT/name)==original, f'Source changed: {name}'
            report.update({'id':identity,'status':'ready-local','source':config['source'],'inputFingerprint':fingerprint,'sourceHashes':inputs,'output':str(output.relative_to(ROOT)).replace('\\','/'),'thumbnail':str(thumbnail.relative_to(ROOT)).replace('\\','/'),'cached':cached})
            report_file.write_text(json.dumps(report,indent=2))
            width,height,length=report['runtimeDimensionsXYZ'];radius=round(width*.5+.06,3);half_height=round(height*.5+.06,3);half_length=round(length*.5+.04,3)
            ground=round(height*.5+.14,3)
            registered.append({'id':identity,'name':config['name'],'unlockedByDefault':False,'preloadAtStart':False,'modelPath':f'../../assets/models/{identity}.glb','thumbnailPath':f'../../assets/img/vehicles/{identity}.png','scale':1,'orientation':0,
                'collision':{'radius':radius,'halfHeight':half_height,'halfLength':half_length,'centerY':0,'terrainClearance':ground,'surfaceClearance':ground+.3},
                'movement':{'speedMultiplier':config['speed']},'camera':{'distanceMultiplier':round(max(1,length/5.597),2)},'propellers':report['propellers'],
                'parking':{'spawn':{'relativeTo':'octopod','offset':config['parking']},'rotation':config['rotation'],'groundClearance':ground},
                'discovery':{'enabled':True,'spawn':{'relativeTo':'octopod','offset':config['discovery']},'rotation':config['rotation'],'groundClearance':ground,'triggerPadding':.3,'modelScale':1,'effects':True}})
            results.append(report);print(identity, 'CACHED' if cached else 'READY',report['exportedTriangles'],'triangles',report['embeddedTextures'],'textures',flush=True)
        except Exception as error:
            results.append({'id':identity,'status':'failed','source':config['source'],'error':str(error)});print(identity,'FAILED',error,flush=True)
    (WORK/'results.json').write_text(json.dumps(results,indent=2))
    # The fleet registry imports this data; no per-GUP gameplay implementation.
    (ROOT/'src/config/importedVehicles.js').write_text('// Generated by tools/import_fleet.py; runtime exports are published only with explicit user approval.\nexport const importedVehicles='+json.dumps(registered,indent=2)+';\n')

if __name__=='__main__':main()
