import json,struct,numpy as np,sys
b=open('cabina.glb','rb').read(); jl=struct.unpack_from('<I',b,12)[0]; g=json.loads(b[20:20+jl]); bin0=20+jl+8
def acc(i):
    a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
    return np.frombuffer(b,dtype='<f4' if a['componentType']==5126 else '<u4',count=a['count']*n,offset=bin0+v['byteOffset']).reshape(-1,n)
S=1024
for m in g['meshes']:
    if m['name'] not in sys.argv[1:]: continue
    p=m['primitives'][0]; T=acc(p['attributes']['TEXCOORD_0']); P=acc(p['attributes']['POSITION']); I=acc(p['indices']).reshape(-1,3)
    par=list(range(len(T)))
    def f(x):
        while par[x]!=x: par[x]=par[par[x]]; x=par[x]
        return x
    key={}
    for i,t in enumerate(T): key.setdefault((round(t[0]*S),round(t[1]*S)),[]).append(i)
    for l in key.values():
        for x in l[1:]: par[f(x)]=f(l[0])
    for a,b_,c in I: par[f(b_)]=f(a); par[f(c)]=f(a)
    grp={}
    for i in range(len(T)): grp.setdefault(f(i),[]).append(i)
    rows=[]
    for v in grp.values():
        u=T[v]; q=P[v]; w,h=np.ptp(u[:,0])*S,np.ptp(u[:,1])*S
        if w<3 or h<3: continue
        rows.append((m['name'],len(v),round(w),round(h),u.mean(0).round(3).tolist(),q.mean(0).round(3).tolist()))
    rows.sort(key=lambda r:(-r[5][0]))
    for r in rows: print(r)
