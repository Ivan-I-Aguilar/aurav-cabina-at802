# Dibuja caras de instrumentos para las texturas dinámicas $ATVC (en FSX las pintaba el panel en vivo)
import json,struct,numpy as np,sys,math,random
from PIL import Image,ImageDraw,ImageFont
glb,outdir=sys.argv[1],sys.argv[2]
b=open(glb,'rb').read(); jl=struct.unpack_from('<I',b,12)[0]; g=json.loads(b[20:20+jl]); bin0=20+jl+8
def acc(i):
    a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
    return np.frombuffer(b,dtype='<f4' if a['componentType']==5126 else '<u4',count=a['count']*n,offset=bin0+v['byteOffset']).reshape(-1,n)
S=1024; random.seed(7)
try: F=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
except: F=lambda s: ImageFont.load_default()
def islas(T,I):
    par=list(range(len(T)))
    def f(x):
        while par[x]!=x: par[x]=par[par[x]]; x=par[x]
        return x
    # unir por triángulo y por posición UV coincidente
    key={}
    for i,t in enumerate(T): k=(round(t[0]*S),round(t[1]*S)); key.setdefault(k,[]).append(i)
    for l in key.values():
        for x in l[1:]: par[f(x)]=f(l[0])
    for a,b_,c in I: par[f(b_)]=f(a); par[f(c)]=f(a)
    grp={}
    for i in range(len(T)): grp.setdefault(f(i),[]).append(i)
    return [T[v] for v in grp.values()]
def dial(d,cx,cy,r):
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=(18,18,20))
    a0,a1=math.radians(135),math.radians(405); n=10
    for k in range(n*5+1):
        a=a0+(a1-a0)*k/(n*5); big=k%5==0; r1=r*(0.78 if big else 0.86)
        d.line([cx+math.cos(a)*r1,cy+math.sin(a)*r1,cx+math.cos(a)*r*0.95,cy+math.sin(a)*r*0.95],fill=(235,235,235),width=max(1,int(r*(0.05 if big else 0.025))))
    if r>25:
        for k in range(0,n+1,2):
            a=a0+(a1-a0)*k/n; fx=cx+math.cos(a)*r*0.6; fy=cy+math.sin(a)*r*0.6
            d.text((fx,fy),str(k),fill=(235,235,235),font=F(max(8,int(r*0.17))),anchor='mm')
        # arco verde
        d.arc([cx-r*0.93,cy-r*0.93,cx+r*0.93,cy+r*0.93],math.degrees(a0+(a1-a0)*0.35),math.degrees(a0+(a1-a0)*0.75),fill=(40,170,60),width=max(2,int(r*0.06)))
    a=a0+(a1-a0)*random.uniform(0.2,0.6)
    d.line([cx,cy,cx+math.cos(a)*r*0.8,cy+math.sin(a)*r*0.8],fill=(250,250,250),width=max(2,int(r*0.06)))
    d.ellipse([cx-r*0.09,cy-r*0.09,cx+r*0.09,cy+r*0.09],fill=(60,60,60))
nombres={'m10':'$ATVC_01','m11':'$ATVC_02','m12':'$ATVC_03','m13':'$ATVC_04'}
for m in g['meshes']:
    if m['name'] not in nombres: continue
    p=m['primitives'][0]; T=acc(p['attributes']['TEXCOORD_0']); I=acc(p['indices']).reshape(-1,3)
    im=Image.new('RGB',(S,S),(30,31,33)); d=ImageDraw.Draw(im)
    gps=m['name']=='m13'
    if gps:
        d.rectangle([0,0,S,S],fill=(40,42,45))
        d.rectangle([0.04*S,0.04*S,0.86*S,0.62*S],fill=(10,30,25))   # pantalla
        for k in range(14): x=0.04*S+k*0.06*S; d.line([x,0.04*S,x,0.62*S],fill=(20,60,45))
        d.text((0.45*S,0.33*S),'GPS',fill=(80,200,120),font=F(60),anchor='mm')
    isl=sorted(islas(T,I),key=lambda u:-(np.ptp(u[:,0])*np.ptp(u[:,1])))
    for u in isl:
        x0,y0=u.min(0)*S; x1,y1=u.max(0)*S; w,h=x1-x0,y1-y0
        if w<3 or h<3: continue
        if gps: continue
        if abs(w-h)<0.15*max(w,h) and len(u)>=10:
            r=min(w,h)/2; cx,cy=(x0+x1)/2,(y0+y1)/2
            if r>20: dial(d,cx,cy,r)
            else: d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=(45,45,48)); d.line([cx,cy,cx+r*0.8,cy-r*0.3],fill=(220,220,220),width=2)
        else:
            d.rectangle([x0,y0,x1,y1],fill=(12,14,12))
            if h>15: d.text(((x0+x1)/2,(y0+y1)/2),'%d'%random.randint(10,999),fill=(255,150,40),font=F(int(h*0.6)),anchor='mm')
    im.save(f'{outdir}/{nombres[m["name"]].lstrip("$")}.png')
print('ok')
