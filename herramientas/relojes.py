# Caras de instrumentos del AT-802 para las texturas dinámicas $ATVC_01..04 (en FSX las pintaba el panel en vivo).
# Las caras están dibujadas a mano (no son fotos) siguiendo la distribución del panel real (foto EC-LHI como guía).
import json,struct,numpy as np,sys,math,os
SIN_AGUJAS=bool(os.environ.get('SIN_AGUJAS'))   # las agujas se ponen en 3D en el juego (vivas)
from PIL import Image,ImageDraw,ImageFont
glb,outdir=sys.argv[1],sys.argv[2]
b=open(glb,'rb').read(); jl=struct.unpack_from('<I',b,12)[0]; g=json.loads(b[20:20+jl]); bin0=20+jl+8
def acc(i):
    a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
    return np.frombuffer(b,dtype='<f4' if a['componentType']==5126 else '<u4',count=a['count']*n,offset=bin0+v['byteOffset']).reshape(-1,n)
S=1024
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FN='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def F(s,b=True): return ImageFont.truetype(FB if b else FN,max(6,int(s)))
BLANCO=(240,240,240); NEGRO=(14,14,16); VERDE=(60,180,70); AMAR=(230,200,40); ROJO=(220,40,40)
def pol(cx,cy,r,a): a=math.radians(a); return (cx+math.cos(a)*r,cy+math.sin(a)*r)
def aguja(d,cx,cy,r,a,w,col=BLANCO,cola=0.15):
    p1=pol(cx,cy,r,a); p0=pol(cx,cy,-r*cola,a); d.line([p0,p1],fill=col,width=max(2,int(w)))
def dial(d,cx,cy,r,a0=135,sweep=270,vmin=0,vmax=10,paso=1,sub=5,etq=2,arcos=(),agujas=(1,),titulo='',unidad='',fmt=lambda v:str(int(v)),numR=0.62):
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=NEGRO); d.ellipse([cx-r,cy-r,cx+r,cy+r],outline=(70,70,74),width=max(1,int(r*0.03)))
    ang=lambda v:a0+sweep*(v-vmin)/(vmax-vmin)
    for v0,v1,col in arcos: d.arc([cx-r*0.9,cy-r*0.9,cx+r*0.9,cy+r*0.9],ang(v0),ang(v1),fill=col,width=max(2,int(r*0.07)))
    n=int(round((vmax-vmin)/paso)); k=0; v=vmin
    while v<=vmax+1e-6:
        for s in range(sub if v<vmax-1e-6 else 1):
            vv=v+paso*s/sub; a=ang(vv); big=s==0
            d.line([pol(cx,cy,r*(0.76 if big else 0.84),a),pol(cx,cy,r*0.92,a)],fill=BLANCO,width=max(1,int(r*(0.045 if big else 0.02))))
        if r>26 and (k%etq==0): d.text(pol(cx,cy,r*numR,ang(v)),fmt(v),fill=BLANCO,font=F(r*0.17),anchor='mm')
        v+=paso; k+=1
    if titulo and r>26: d.text((cx,cy+r*0.3),titulo,fill=BLANCO,font=F(r*0.12),anchor='mm')
    if unidad and r>26: d.text((cx,cy+r*0.44),unidad,fill=(190,190,190),font=F(r*0.09,False),anchor='mm')
    if SIN_AGUJAS: agujas=()
    for i,val in enumerate(agujas): aguja(d,cx,cy,r*(0.8 if i==0 else 0.55),ang(val),r*(0.05 if i==0 else 0.08))
    d.ellipse([cx-r*0.08,cy-r*0.08,cx+r*0.08,cy+r*0.08],fill=(50,50,54))
def horizonte(d,cx,cy,r):
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=NEGRO)
    if SIN_AGUJAS: d.ellipse([cx-r,cy-r,cx+r,cy+r],outline=(70,70,74),width=max(1,int(r*0.03))); return
    m=Image.new('L',(S,S),0); ImageDraw.Draw(m).ellipse([cx-r*0.9,cy-r*0.9,cx+r*0.9,cy+r*0.9],fill=255)
    cap=Image.new('RGB',(S,S),(14,14,16)); dc=ImageDraw.Draw(cap)
    dc.rectangle([cx-r,cy-r,cx+r,cy],fill=(60,130,210)); dc.rectangle([cx-r,cy,cx+r,cy+r],fill=(140,90,45))
    dc.line([cx-r,cy,cx+r,cy],fill=BLANCO,width=max(2,int(r*0.03)))
    for i,p in enumerate((10,20)):
        for sg in (1,-1):
            y=cy-sg*p/20*r*0.45; w=r*(0.25 if i else 0.15)
            dc.line([cx-w,y,cx+w,y],fill=BLANCO,width=max(1,int(r*0.02)))
            if i: dc.text((cx-w-r*0.12,y),str(p),fill=BLANCO,font=F(r*0.1),anchor='mm'); dc.text((cx+w+r*0.12,y),str(p),fill=BLANCO,font=F(r*0.1),anchor='mm')
    for a in (-60,-30,-20,-10,0,10,20,30,60):
        aa=-90+a; L=0.12 if a%30==0 else 0.07
        dc.line([pol(cx,cy,r*0.9,aa),pol(cx,cy,r*(0.9-L),aa)],fill=BLANCO,width=max(2,int(r*0.025)))
    base=Image.new('RGB',(S,S)); base.paste(cap,(0,0),m)
    d._image.paste(base,(0,0),m)
    # avioncito
    d.line([cx-r*0.45,cy,cx-r*0.12,cy],fill=(250,200,40),width=max(3,int(r*0.05))); d.line([cx+r*0.12,cy,cx+r*0.45,cy],fill=(250,200,40),width=max(3,int(r*0.05)))
    d.ellipse([cx-r*0.06,cy-r*0.06,cx+r*0.06,cy+r*0.06],fill=(250,200,40))
    d.polygon([pol(cx,cy,r*0.9,-90),pol(cx,cy,r*0.78,-84),pol(cx,cy,r*0.78,-96)],fill=(250,200,40))
    d.ellipse([cx-r,cy-r,cx+r,cy+r],outline=(70,70,74),width=max(1,int(r*0.03)))
def reloj(d,cx,cy,r):
    if SIN_AGUJAS: return dial(d,cx,cy,r,a0=-90,sweep=360,vmin=0,vmax=12,paso=1,sub=5,etq=1,agujas=(),fmt=lambda v:str(int(v) or 12),numR=0.72)
    dial(d,cx,cy,r,a0=-90,sweep=360,vmin=0,vmax=12,paso=1,sub=5,etq=1,agujas=(),fmt=lambda v:str(int(v) or 12),numR=0.72)
    aguja(d,cx,cy,r*0.55,-90+30*10.2,r*0.07); aguja(d,cx,cy,r*0.8,-90+6*12,r*0.045); aguja(d,cx,cy,r*0.85,-90+6*40,r*0.02,col=ROJO)
def display(d,x0,y0,x1,y1,txt,col=(255,150,40)):
    d.rectangle([x0,y0,x1,y1],fill=(8,10,8)); h=y1-y0
    d.text(((x0+x1)/2,(y0+y1)/2),txt,fill=col,font=F(min(h*0.6,(x1-x0)/(len(txt)*0.62))),anchor='mm')
# tipos
T_={
 'asi': dict(a0=120,sweep=300,vmin=40,vmax=260,paso=20,sub=4,etq=1,arcos=((60,100,BLANCO),(70,210,VERDE),(210,235,AMAR),(235,240,ROJO)),agujas=(0.0,),titulo='AIRSPEED',unidad='MPH',numR=0.6),
 'alt': dict(a0=-90,sweep=360,vmin=0,vmax=10,paso=1,sub=5,etq=1,agujas=(2.3,3.0),titulo='ALT',unidad='FEET',fmt=lambda v:str(int(v)%10),numR=0.7),
 'vsi': dict(a0=180,sweep=340,vmin=-2,vmax=2,paso=0.5,sub=5,etq=2,agujas=(0.05,),titulo='VERTICAL SPEED',unidad='1000 FT/MIN',fmt=lambda v:str(abs(int(v)))),
 'torque': dict(a0=135,sweep=270,vmin=0,vmax=100,paso=10,sub=2,etq=2,arcos=((0,85,VERDE),(85,100,ROJO)),agujas=(42,),titulo='TORQUE',unidad='%'),
 'itt': dict(a0=135,sweep=270,vmin=0,vmax=1000,paso=100,sub=2,etq=2,arcos=((400,800,VERDE),(800,850,AMAR),(850,1000,ROJO)),agujas=(620,),titulo='ITT',unidad='°C x100',fmt=lambda v:str(int(v//100))),
 'prop': dict(a0=135,sweep=270,vmin=0,vmax=25,paso=5,sub=5,etq=1,arcos=((10,17,VERDE),(17,25,ROJO)),agujas=(16.5,),titulo='PROP RPM',unidad='x100'),
 'ng': dict(a0=135,sweep=270,vmin=0,vmax=110,paso=10,sub=2,etq=2,arcos=((60,101,VERDE),(101,110,ROJO)),agujas=(78,),titulo='Ng',unidad='% RPM'),
 'ff': dict(a0=135,sweep=270,vmin=0,vmax=600,paso=100,sub=2,etq=1,arcos=((100,500,VERDE),),agujas=(240,),titulo='FUEL FLOW',unidad='PPH'),
 'fuelL': dict(a0=150,sweep=240,vmin=0,vmax=4,paso=1,sub=2,etq=2,arcos=((0,0.5,ROJO),),agujas=(2.6,),titulo='FUEL L',unidad='QTY',fmt=lambda v:['E','','1/2','','F'][int(v)]),
 'fuelR': dict(a0=150,sweep=240,vmin=0,vmax=4,paso=1,sub=2,etq=2,arcos=((0,0.5,ROJO),),agujas=(2.8,),titulo='FUEL R',unidad='QTY',fmt=lambda v:['E','','1/2','','F'][int(v)]),
 'oilp': dict(a0=150,sweep=240,vmin=0,vmax=150,paso=50,sub=5,etq=1,arcos=((85,105,VERDE),(0,60,ROJO)),agujas=(95,),titulo='OIL PRESS',unidad='PSI'),
 'oilt': dict(a0=150,sweep=240,vmin=0,vmax=120,paso=40,sub=4,etq=1,arcos=((10,99,VERDE),(99,120,ROJO)),agujas=(70,),titulo='OIL TEMP',unidad='°C'),
 'volt': dict(a0=150,sweep=240,vmin=0,vmax=30,paso=10,sub=5,etq=1,arcos=((24,29,VERDE),),agujas=(28,),titulo='VOLTS',unidad='DC'),
 'amp': dict(a0=150,sweep=240,vmin=0,vmax=300,paso=100,sub=5,etq=1,arcos=((0,200,VERDE),),agujas=(60,),titulo='AMPS',unidad=''),
 'hyd': dict(a0=150,sweep=240,vmin=0,vmax=3000,paso=1000,sub=5,etq=1,arcos=((1500,2500,VERDE),),agujas=(2000,),titulo='HYD PRESS',unidad='PSI',fmt=lambda v:str(int(v//1000))),
 'fuelp': dict(a0=150,sweep=240,vmin=0,vmax=60,paso=20,sub=4,etq=1,arcos=((10,40,VERDE),),agujas=(25,),titulo='FUEL PRESS',unidad='PSI'),
 'suction': dict(a0=150,sweep=240,vmin=0,vmax=10,paso=2,sub=4,etq=1,arcos=((4.5,5.5,VERDE),),agujas=(5,),titulo='SUCTION',unidad='IN HG'),
 'chico': dict(a0=150,sweep=240,vmin=0,vmax=10,paso=2,sub=1,etq=1,agujas=(6,)),
}
# asignación por posición 3D (x, y) del centro de la isla
ASIG=[((0.493,1.085),'itt'),((0.390,1.178),'prop'),((0.388,1.082),'ng'),((0.279,1.212),'vsi'),((0.120,1.231),'alt'),((0.0,1.206),'horizonte'),((-0.120,1.231),'asi'),((-0.411,1.159),'torque'),
 ((0.294,1.118),'ff'),((0.0,0.825),'reloj'),((-0.265,1.228),'fuelL'),((-0.338,1.228),'fuelR'),((-0.265,1.159),'oilp'),((-0.338,1.159),'oilt'),((-0.338,1.092),'volt'),((-0.411,1.091),'amp'),((-0.479,1.044),'hyd'),((-0.548,1.044),'fuelp'),((-0.459,0.621),'suction')]
nombres={'m10':'ATVC_01','m11':'ATVC_02','m12':'ATVC_03','m13':'ATVC_04'}
def islas(T,I):
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
    return list(grp.values())
radios=['COM1 118.10','NAV1 112.30','COM2 121.50','ADF  380','XPDR 7000','DME 12.4']
for m in g['meshes']:
    if m['name'] not in nombres: continue
    p=m['primitives'][0]; T=acc(p['attributes']['TEXCOORD_0']); P=acc(p['attributes']['POSITION']); I=acc(p['indices']).reshape(-1,3)
    im=Image.new('RGB',(S,S),(30,31,33)); d=ImageDraw.Draw(im); d._image=im
    if m['name']=='m13':
        d.rectangle([0.04*S,0.04*S,0.86*S,0.62*S],fill=(10,30,25)); d.text((0.45*S,0.33*S),'GPS',fill=(80,200,120),font=F(60),anchor='mm'); im.save(f'{outdir}/{nombres[m["name"]]}.png'); continue
    ri=0
    for v in sorted(islas(T,I),key=lambda v:(T[v].mean(0)[1],T[v].mean(0)[0])):
        u=T[v]; q=P[v].mean(0); x0,y0=u.min(0)*S; x1,y1=u.max(0)*S; w,h=x1-x0,y1-y0
        if w<3 or h<3: continue
        cx,cy=(x0+x1)/2,(y0+y1)/2; r=min(w,h)/2
        redondo=abs(w-h)<0.15*max(w,h) and len(v)>=10
        tipo=None
        for (ax,ay),t in ASIG:
            if abs(q[0]-ax)<0.02 and abs(q[1]-ay)<0.02: tipo=t
        if tipo=='horizonte': horizonte(d,cx,cy,r)
        elif tipo=='reloj': reloj(d,cx,cy,r)
        elif tipo: dial(d,cx,cy,r,**T_[tipo])
        elif redondo: dial(d,cx,cy,r,**T_['chico'])
        else:
            if w>300: display(d,x0,y0,x1,y1,radios[ri%len(radios)]); ri+=1
            elif h>15: display(d,x0,y0,x1,y1,'%03d'%(int(cx+cy)%1000))
            else: d.rectangle([x0,y0,x1,y1],fill=(12,14,12))
    im.save(f'{outdir}/{nombres[m["name"]]}.png')
print('ok')
