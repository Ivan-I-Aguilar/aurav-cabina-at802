import json,struct,numpy as np,sys
from PIL import Image,ImageDraw
b=open('cabina.glb','rb').read(); jl=struct.unpack_from('<I',b,12)[0]; g=json.loads(b[20:20+jl]); bin0=20+jl+8
def acc(i):
    a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
    dt='<f4' if a['componentType']==5126 else '<u4'
    return np.frombuffer(b,dtype=dt,count=a['count']*n,offset=bin0+v['byteOffset']).reshape(-1,n)
for m in g['meshes']:
    if m['name'] in sys.argv[1:]:
        p=m['primitives'][0]; T=acc(p['attributes']['TEXCOORD_0']); I=acc(p['indices']).reshape(-1,3)
        im=Image.new('RGB',(1024,1024),'white'); d=ImageDraw.Draw(im)
        for t in I: d.polygon([(T[k][0]*1024,T[k][1]*1024) for k in t],outline='black')
        im.save(f'uv_{m["name"]}.png')
