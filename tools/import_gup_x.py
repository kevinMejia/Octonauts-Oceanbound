"""Locally prepare the purchased GUP-X through the shared vehicle pipeline.

No upload or deployment. Supplied source files are never saved or overwritten.
Usage: python tools/import_gup_x.py --blender path/to/blender.exe
"""
import argparse
import json
import os
import pathlib
import subprocess
from import_fleet import digest, validate_glb

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blender', required=True)
    args = parser.parse_args()
    config = json.loads((ROOT / 'tools/gup-x-import.json').read_text())
    job = {**config, **{k: str(ROOT / config[k]) for k in ['source', 'work', 'output', 'thumbnail']}}
    work = pathlib.Path(job['work'])
    work.mkdir(parents=True, exist_ok=True)
    source = pathlib.Path(job['source'])
    archives = list(source.parent.glob('*.rar'))
    hashes = {str(p.relative_to(ROOT)): digest(p) for p in [source, *archives]}
    for archive in archives:
        names = subprocess.check_output(['tar', '-tf', str(archive)], text=True).splitlines()
        assert all(not pathlib.PurePosixPath(n.replace('\\', '/')).is_absolute()
                   and '..' not in pathlib.PurePosixPath(n.replace('\\', '/')).parts
                   and ':' not in n for n in names), 'Unsafe archive path'
        subprocess.run(['tar', '-xf', str(archive), '-C', str(work)], check=True)
    job_file = work / 'job.json'
    job_file.write_text(json.dumps(job, indent=2))
    with (work / 'prepare.log').open('w') as log:
        subprocess.run([str(pathlib.Path(args.blender).resolve()), '--background', '--factory-startup',
                        '--disable-autoexec', '--python', str(ROOT / 'tools/blender/prepare_vehicle.py'),
                        '--', str(job_file)], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT,
                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0, check=True)
    assert 'Traceback (most recent call last)' not in (work / 'prepare.log').read_text(errors='replace')
    report = json.loads((work / 'preparation.json').read_text())
    report.update(validate_glb(pathlib.Path(job['output']), report['sourceTriangles']))
    for name, original in hashes.items():
        assert digest(ROOT / name) == original, 'Source changed: ' + name
    report.update(sourceHashes=hashes, source=config['source'], output=config['output'],
                  thumbnail=config['thumbnail'], tracks=config['tracks'])
    (work / 'preparation.json').write_text(json.dumps(report, indent=2))
    print('Prepared GUP-X locally:', report['exportedTriangles'], 'triangles;', report['glbBytes'], 'bytes')


if __name__ == '__main__':
    main()
