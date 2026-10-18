# Centro, radio y normal 3D de cada reloj (para poner agujas 3D en el juego). Usa la misma asignación que relojes.py.
import json,struct,numpy as np,sys,importlib.util
glb,out=sys.argv[1],sys.argv[2]
b=open(glb,'rb').read(); jl=struct.unpack_from('<I',b,12)[0]; g=json.loads(b[20:20+jl]); bin0=20+jl+8
def acc(i):
    a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
    return np.frombuffer(b,dtype='<f4' if a['componentType']==5126 else '<u4',count=a['count']*n,offset=bin0+v['byteOffset']).reshape(-1,n)
S=1024
ASIG=[((0.493,1.085),'itt'),((0.390,1.178),'prop'),((0.388,1.082),'ng'),((0.279,1.212),'vsi'),((0.120,1.231),'alt'),((0.0,1.206),'horizonte'),((-0.120,1.231),'asi'),((-0.411,1.159),'torque'),
 ((0.294,1.118),'ff'),((0.0,0.825),'reloj'),((-0.265,1.228),'fuelL'),((-0.338,1.228),'fuelR'),((-0.265,1.159),'oilp'),((-0.338,1.159),'oilt'),((-0.338,1.092),'volt'),((-0.411,1.091),'amp'),((-0.479,1.044),'hyd'),((-0.548,1.044),'fuelp'),((-0.459,0.621),'suction')]
res=[]
for m in g['meshes']:
    if m['name'] not in ('m10','m11'): continue
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
    for v in grp.values():
        q=P[v]; c=q.mean(0)
        tipo=None
        for (ax,ay),t in ASIG:
            if abs(c[0]-ax)<0.02 and abs(c[1]-ay)<0.02: tipo=t
        if not tipo: continue
        # normal por PCA (menor varianza), orientada hacia +z (hacia el piloto)
        X=q-c; w,vec=np.linalg.eigh(X.T@X); n=vec[:,0]; n=n if n[2]>0 else -n
        # radio: mitad de la extensión máxima en el plano
        r=float(np.linalg.norm(X,axis=1).max())
        # dirección «arriba» del reloj en 3D: la que corresponde a −v en UV (texto arriba). Se estima con regresión UV→3D
        u=T[v]; A=np.c_[u-u.mean(0),np.ones(len(u))]; M,_,_,_=np.linalg.lstsq(A,q,rcond=None)   # 3D ≈ M[0]*du + M[1]*dv + M[2]
        ex=M[0]/np.linalg.norm(M[0]); ey=-M[1]/np.linalg.norm(M[1])
        res.append({'tipo':tipo,'c':[round(float(x),4) for x in c],'r':round(r,4),'n':[round(float(x),4) for x in n],'ex':[round(float(x),4) for x in ex],'ey':[round(float(x),4) for x in ey]})
json.dump(res,open(out,'w'),indent=0)
for r in res: print(r['tipo'],r['c'],r['r'],r['n'],r['ex'],r['ey'])
