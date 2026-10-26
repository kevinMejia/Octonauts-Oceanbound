"""Read embedded vehicle PNGs without changing assets; emit exact pixel findings."""
import argparse,base64,hashlib,io,json,pathlib,struct,zlib
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
def chunks(data):
 offset=8
 while offset<len(data):
  n=struct.unpack_from('>I',data,offset)[0];kind=data[offset+4:offset+8];payload=data[offset+8:offset+8+n]
  yield kind,payload
  offset+=n+12
def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
def constant_png(data,pixel):
 out=bytearray(data[:8]);written=False
 for kind,payload in chunks(data):
  if kind==b'IHDR':payload=struct.pack('>II',1,1)+payload[8:]
  if kind==b'IDAT':
   if written:continue
   payload=zlib.compress(bytes([0])+bytes(pixel));written=True
  out+=chunk(kind,payload)
 return bytes(out)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--output',default='docs/performance-audit/vehicle-textures-data/inventory.json');parser.add_argument('--candidates',default='.local-assets/vehicle-constant-candidates.json');args=parser.parse_args()
 inventory=[];images={};constants={}
 for path in sorted((ROOT/'assets/models').glob('gup-*.glb')):
  if path.name=='gup-b.glb':continue # historical optional original; not in active fleet
  with path.open('rb') as f:
   header=f.read(12);length,kind=struct.unpack('<II',f.read(8));doc=json.loads(f.read(length));bin_length,bin_kind=struct.unpack('<II',f.read(8));binary_at=f.tell()
   def usages(index):
    result=[]
    for mi,m in enumerate(doc.get('materials',[])):
     def walk(value,trail):
      if isinstance(value,dict):
       if trail[-1].endswith('Texture') and 'index'in value:
        ti=value['index'];tex=doc['textures'][ti]
        if tex.get('source')==index:result.append({'material':m.get('name',str(mi)),'slot':'.'.join(trail),'texture':ti,'sampler':doc.get('samplers',[])[tex['sampler']] if 'sampler'in tex else {}})
       for k,v in value.items():walk(v,trail+[k])
      elif isinstance(value,list):
       for i,v in enumerate(value):walk(v,trail+[str(i)])
     walk(m,['material'])
    return result
   for index,definition in enumerate(doc.get('images',[])):
    if definition.get('mimeType')!='image/png' or 'bufferView'not in definition:continue
    view=doc['bufferViews'][definition['bufferView']];f.seek(binary_at+view.get('byteOffset',0));data=f.read(view['byteLength']);key=hashlib.sha256(data).hexdigest()
    if key not in images:
     with Image.open(io.BytesIO(data)) as source:
      mode=source.mode;rgba=source.convert('RGBA');extrema=rgba.getextrema();uniform=all(lo==hi for lo,hi in extrema);pixel=list(rgba.getpixel((0,0)));pixel_hash=hashlib.sha256(rgba.tobytes()).hexdigest()
      metadata=[kind.decode('ascii') for kind,_ in chunks(data) if kind not in [b'IHDR',b'IDAT',b'IEND']]
      ihdr=next(payload for kind,payload in chunks(data) if kind==b'IHDR');eligible=uniform and ihdr[8]==8 and ihdr[9]in [2,6] and ihdr[12]==0
      images[key]={'sha256':key,'width':source.width,'height':source.height,'mode':mode,'encodedBytes':len(data),'rgbaHash':pixel_hash,'extrema':extrema,'uniform':uniform,'pixel':pixel if uniform else None,'eligibleConstant':eligible,'metadata':metadata}
      if eligible:
       replacement=constant_png(data,pixel[:3] if ihdr[9]==2 else pixel)
       with Image.open(io.BytesIO(replacement)) as check:
        if check.convert('RGBA').getpixel((0,0))!=tuple(pixel):raise ValueError('Constant roundtrip mismatch')
       constants[key]=base64.b64encode(replacement).decode('ascii')
    inventory.append({'asset':path.name,'image':index,'name':definition.get('name',''),'hash':key,'usages':usages(index)})
  print(path.name,'scanned')
 target=ROOT/args.output;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps({'images':list(images.values()),'references':inventory},indent=2),encoding='utf-8')
 candidate=ROOT/args.candidates;candidate.parent.mkdir(parents=True,exist_ok=True);candidate.write_text(json.dumps(constants,indent=2),encoding='utf-8')
 print('unique',len(images),'uniform',sum(i['uniform']for i in images.values()),'eligible',len(constants))
 for key in constants:
  info=images[key];print(key[:12],info['width'],info['height'],info['pixel'],info['metadata'])
if __name__=='__main__':main()
