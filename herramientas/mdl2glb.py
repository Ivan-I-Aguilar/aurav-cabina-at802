# FSX MDL9 (MDLX) -> GLB estático (transformaciones horneadas, una malla por material)
import struct, sys, os, io, json, numpy as np
from PIL import Image
src, texdir, out = sys.argv[1], sys.argv[2], sys.argv[3]
b = open(src,'rb').read()
def chunks(o, end):
    while o+8 <= end:
        t=b[o:o+4].decode('latin1'); s=struct.unpack_from('<I',b,o+4)[0]; yield t,o+8,s; o+=8+s
o=b.find(b'MDLD'); mdld=(o+8, o+8+struct.unpack_from('<I',b,o+4)[0])
C={}; verts=[]
for t,p,s in chunks(*mdld):
    if t=='VERB':
        for t2,p2,s2 in chunks(p,p+s):
            if t2=='VERT': verts.append(np.frombuffer(b,dtype='<f4',count=s2//4,offset=p2).reshape(-1,8))
    elif t=='LODT':
        lodes=[(p2,s2) for t2,p2,s2 in chunks(p,p+s) if t2=='LODE']
        C['LODE']=lodes
    elif t not in C: C[t]=(p,s)
p,s=C['TEXT']; tex=[b[p+i*64:p+i*64+64].split(b'\0')[0].decode() for i in range(s//64)]
p,s=C['MATE']; mats=[struct.unpack_from('<9I8f',b,p+i*120) for i in range(s//120)]
p,s=C['INDE']; inde=np.frombuffer(b,dtype='<u2',count=s//2,offset=p)
p,s=C['TRAN']; tran=np.frombuffer(b,dtype='<f4',count=s//4,offset=p).reshape(-1,4,4)
p,s=C['AMAP']; amap=np.frombuffer(b,dtype='<i4',count=s//4,offset=p).reshape(-1,2)
p,s=C['SCEN']; scen=[struct.unpack_from('<hhi',b,p+i*8) for i in range(s//8)]
# mundo de cada nodo (convención fila: v*M)
world=[None]*len(scen)
def walk(n, parent):
    while n!=-1:
        ch,peer,ao=scen[n]; local=tran[amap[ao//8][1]]
        world[n]=local@parent; 
        if ch!=-1: walk(ch, world[n])
        n=peer
walk(0, np.eye(4,dtype='f4'))
# primer LODE (el de mayor detalle)
lodes=C['LODE']; best=max(lodes,key=lambda l: struct.unpack_from('<I',b,l[0])[0])
p0,s0=best; parts=[]
for t,p,s in chunks(p0+4,p0+s0):
    if t=='PART': parts.append(struct.unpack_from('<9i',b,p))
groups={}
import os as _os; EXCL=set(int(x) for x in _os.environ.get('EXCL','').split(',') if x)
for pi,(ty,node,mi,vb,vo,vc,io_,ic,mr) in enumerate(parts):
    if pi in EXCL: continue
    v=verts[vb][vo:vo+vc]; idx=inde[io_:io_+ic].astype(np.int64)
    if idx.max()>=vc: idx=idx-vo   # por si los índices son absolutos
    CUT=_os.environ.get('CUT')   # "mat:x0,y0,z0,x1,y1,z1" quita los triángulos de ese material enteramente dentro de la caja (coords del modelo, z sin invertir)
    if CUT:
        cm,cb=CUT.split(':'); cb=[float(x) for x in cb.split(',')]
        if mi in [int(x) for x in cm.split(',')]:
            tri=idx.reshape(-1,3); pv=v[:,:3]
            dentro=np.all((pv[tri]>=cb[:3])&(pv[tri]<=cb[3:]),axis=(1,2)); idx=tri[~dentro].ravel()
            if dentro.sum(): print('corte',pi,'tri',dentro.sum())
    W=world[node] if world[node] is not None else np.eye(4)
    pos=np.c_[v[:,:3],np.ones(len(v))]@W; nrm=v[:,3:6]@W[:3,:3]
    if _os.environ.get('LISTA'): q=pos[:,:3].copy(); q[:,2]*=-1; print('PART',pi,'mat',mi,'n',vc,q.min(0).round(2),q.max(0).round(2))
    key=('palanca',mi) if pi in [int(x) for x in _os.environ.get('PALANCA','').split(',') if x] else mi
    # MOVIL="sw:38,47,...;lev:75,77" -> cada parte sale como malla propia «<prefijo><parte>» (para animarla en el juego)
    for grp in _os.environ.get('MOVIL','').split(';'):
        if ':' in grp:
            pre,lst=grp.split(':')
            if pi in [int(x) for x in lst.split(',') if x]: key=(pre+str(pi),mi)
    if _os.environ.get('PALANCA') and key!=mi: q=pos[:,:3]; print('palanca',pi,'base',q[q[:,1]<q[:,1].min()+0.02].mean(0).round(3),'top',q[q[:,1]>q[:,1].max()-0.02].mean(0).round(3))
    g=groups.setdefault(key,[[],[],[],[],0]); g[0].append(pos[:,:3]); g[1].append(nrm); g[2].append(v[:,6:8]); g[3].append(idx+g[4]); g[4]+=vc
def texfile(i):
    if tex[i].startswith('$') and len(sys.argv)>4: return os.path.join(sys.argv[4],tex[i][1:]+'.png')
    stem=os.path.splitext(tex[i])[0].lower()
    for f in os.listdir(texdir):
        if os.path.splitext(f)[0].lower()==stem and f.lower().endswith(('.dds','.bmp','.png')): return os.path.join(texdir,f)
bin_=bytearray(); views=[]; accs=[]; meshes=[]; materials=[]; images=[]; textures=[]; imgcache={}
def add(data,target=None):
    while len(bin_)%4: bin_.append(0)
    views.append({'buffer':0,'byteOffset':len(bin_),'byteLength':len(data),**({'target':target} if target else {})}); bin_.extend(data); return len(views)-1
def image(path):
    if path in imgcache: return imgcache[path]
    im=Image.open(path); im.load(); im=im.convert('RGBA')
    if max(im.size)>2048: im.thumbnail((2048,2048))
    alpha=im.getchannel('A').getextrema()[0]<250
    buf=io.BytesIO(); (im if alpha else im.convert('RGB')).save(buf,'PNG' if alpha else 'JPEG',**({} if alpha else {'quality':88}))
    images.append({'bufferView':add(buf.getvalue()),'mimeType':'image/png' if alpha else 'image/jpeg'}); textures.append({'source':len(images)-1,'sampler':0})
    imgcache[path]=(len(textures)-1,alpha); return imgcache[path]
faltan=set()
for key,(P,N,T,I,_) in sorted(groups.items(),key=lambda kv:str(kv[0])):
    mi=key[1] if isinstance(key,tuple) else key; nombre=(f'palanca_m{mi}' if key[0]=='palanca' else key[0]) if isinstance(key,tuple) else f'm{mi}'
    P=np.vstack(P).astype('f4'); N=np.vstack(N).astype('f4'); T=np.vstack(T).astype('f4'); I=np.concatenate(I).astype('u4')
    P[:,2]*=-1; N[:,2]*=-1; nl=np.linalg.norm(N,axis=1,keepdims=True); N/=np.where(nl==0,1,nl)  # izq→der
    I=I.reshape(-1,3)[:,[0,2,1]].ravel()
    a=[]
    for arr,typ in ((P,'VEC3'),(N,'VEC3'),(T,'VEC2')):
        acc={'bufferView':add(arr.tobytes(),34962),'componentType':5126,'count':len(arr),'type':typ}
        if typ=='VEC3' and arr is P: acc['min']=P.min(0).tolist(); acc['max']=P.max(0).tolist()
        accs.append(acc); a.append(len(accs)-1)
    accs.append({'bufferView':add(I.tobytes(),34963),'componentType':5125,'count':len(I),'type':'SCALAR'})
    m=mats[mi]; flags=m[0]; diff=list(m[9:13]); mat={'name':nombre,'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,diff[3]] if flags&2 else diff,'metallicFactor':0,'roughnessFactor':0.8},'doubleSided':True}
    if flags&2:
        f=texfile(m[2])
        if f: ti,al=image(f); mat['pbrMetallicRoughness']['baseColorTexture']={'index':ti}; 
        else: faltan.add(tex[m[2]]); mat['pbrMetallicRoughness']['baseColorFactor']=[0.12,0.13,0.14,1]
        if f and al: mat['alphaMode']='MASK'; mat['alphaCutoff']=0.5
    if diff[3]<0.99: mat['alphaMode']='BLEND'
    materials.append(mat)
    meshes.append({'name':nombre,'primitives':[{'attributes':{'POSITION':a[0],'NORMAL':a[1],'TEXCOORD_0':a[2]},'indices':len(accs)-1,'material':len(materials)-1}]})
g={'asset':{'version':'2.0','generator':'mdl2glb AURAV'},'scene':0,'scenes':[{'nodes':list(range(len(meshes)))}],'nodes':[{'mesh':i,'name':meshes[i]['name']} for i in range(len(meshes))],
   'meshes':meshes,'materials':materials,'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':len(bin_)}],'samplers':[{'magFilter':9729,'minFilter':9987}]}
if images: g['images']=images; g['textures']=textures
js=json.dumps(g).encode(); js+=b' '*((4-len(js)%4)%4)
while len(bin_)%4: bin_.append(0)
with open(out,'wb') as f:
    f.write(struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bin_))); f.write(struct.pack('<II',len(js),0x4E4F534A)); f.write(js); f.write(struct.pack('<II',len(bin_),0x004E4942)); f.write(bin_)
allP=np.vstack([np.vstack(gq[0]) for gq in groups.values()])
print('partes',len(parts),'materiales',len(groups),'bbox',allP.min(0).round(2),allP.max(0).round(2),'faltan',faltan, os.path.getsize(out)//1024,'KB')
