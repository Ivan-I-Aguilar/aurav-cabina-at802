# Taller de motores · T12 (16/11/2026; PLAN_TALLER.md §15.5): la COMPUERTA de descarga del AT-802 hidrante, con sus dos hojas, sus
# rieles, el venteo y la cañería de carga · MODELO: taller/compuerta.glb, en el MARCO DEL AVIÓN de juegos/at802.glb (+x nariz, +y
# arriba, +z derecha, metros, origen en el piso entre las ruedas principales; el avión apoyado en la rueda de cola: por eso la
# quilla baja hacia atrás).
#
# De dónde sale cada cosa:
# - La ENVOLVENTE (dónde está la panza, su largo, su ancho, su hondura y la pendiente de la quilla) se midió con rayos contra el
#   modelo del avión el 16/11: la panza va de x +0,15 a −2,5; la quilla, de 1,00 m (x −0,25) a 0,78 m (x −1,75); media anchura 0,5 m
#   donde entra en la panza del fuselaje; hondura 0,33 a 0,37 m.
# - La FORMA y los DETALLES salen de las fotos de Iván del avión real (24/9, carpeta de detalles, fuera del repo; números de la hoja
#   de contactos): la quilla en V que forman las dos hojas (18, 22), la hoja larga entre el riel de la bisagra, con sus bulones, y el
#   listón dorado de la quilla (12, 13), la proa redonda con su burlete claro (17), el caño corto de venteo en el costado (10, 13,
#   14), y detrás la cañería de carga: dos bocas con acople rápido, una de cada lado, cada una con su válvula y su palanca, un caño
#   transversal, una T y el caño que entra por la popa de la panza, con sus manguitos verdes (3, 16, 23, 25, 27, 29, 37, 38).
# - Todo lo demás es [VERIFICAR]: las medidas chicas (ancho de la hoja, diámetro de los caños, paso de los bulones) están tomadas a
#   ojo de las fotos, y la posición ABIERTA de las hojas no tiene foto [PROVISORIO: giran hacia abajo sobre su bisagra de afuera].
#
# Cinco mallas, un material, color por vértice: compuerta_caja (lo fijo), compuerta_hoja_izq y compuerta_hoja_der (cada una con
# userData.bisagra = {a, b, abre}: los dos extremos de su bisagra y el ángulo, con signo, que la abre girando sobre a→b) y
# compuerta_carga (la cañería), más compuerta_panza (la chapa del fuselaje de la que cuelgan, sólo como contexto). En el taller se
# ven como holograma (taller/piezaholo.js), sin la chapa; los colores quedan para usarla sólida.
#
# Uso: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/taller_compuerta.py
import bpy, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
from taller_hangar import Malla, lin

SALIDA = os.path.join(cc.RAIZ, 'taller', 'compuerta.glb')
INFORME = os.path.join(cc.RAIZ, 'taller', 'compuerta_informe.json')
cc.COLORES.update({'compuerta': ('#ffffff', 0.5, 0.3)})

ROJO, CREMA, DORADO = lin('#b5121b'), lin('#e8e2d0'), lin('#b89b55')
ALUMINIO, ACERO, GRIS = lin('#b9bdc2'), lin('#d0d3d6'), lin('#7b8087')
VERDE, NEGRO, CHAPA = lin('#1f9e8a'), lin('#1d1f22'), lin('#d9d9d6')

# ---------------------------------------------------------------- vectores y caños
def suma(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def resta(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def por(a, k): return (a[0] * k, a[1] * k, a[2] * k)
def punto(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def cruz(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def uni(a):
    l = math.sqrt(punto(a, a)) or 1.0
    return (a[0] / l, a[1] / l, a[2] / l)

def tubo(m, pts, col, n=12, tapas=True, eje=None):
    """Un caño por una poligonal [(punto, radio)]: anillos perpendiculares a la tangente (o al eje fijo, para tramos rectos con
    cambios de radio en el mismo punto), llevados de uno al otro sin torcerse. col: un color o uno por tramo."""
    P = [p for p, _ in pts]
    tg = [uni(eje) if eje else uni(resta(P[min(len(P) - 1, i + 1)], P[max(0, i - 1)])) for i in range(len(P))]
    ref = (0, 1, 0) if abs(tg[0][1]) < 0.9 else (1, 0, 0)
    u = uni(cruz(tg[0], ref))
    anillos = []
    for (p, r), t in zip(pts, tg):
        u = uni(resta(u, por(t, punto(u, t))))
        v = cruz(t, u)
        anillos.append([suma(p, suma(por(u, r * math.cos(2 * math.pi * k / n)), por(v, r * math.sin(2 * math.pi * k / n)))) for k in range(n)])
    cols = col if isinstance(col, list) else [col] * (len(pts) - 1)
    for (A, B), c in zip(zip(anillos, anillos[1:]), cols):
        for k in range(n):
            j = (k + 1) % n
            m.quad(A[k], A[j], B[j], B[k], c)
    if tapas:
        for k in range(n):
            j = (k + 1) % n
            m.cara([P[0], anillos[0][j], anillos[0][k]], [cols[0]] * 3)
            m.cara([P[-1], anillos[-1][k], anillos[-1][j]], [cols[-1]] * 3)

def prisma(m, a4, b4, col):
    """el sólido entre dos cuadriláteros a4 y b4 (mismas esquinas, en el mismo orden): 4 costados y 2 tapas"""
    for i in range(4):
        j = (i + 1) % 4
        m.quad(a4[i], a4[j], b4[j], b4[i], col)
    m.quad(a4[3], a4[2], a4[1], a4[0], col)
    m.quad(b4[0], b4[1], b4[2], b4[3], col)

def manguito(m, c, eje, largo=0.11, r=0.052):
    """el manguito de goma verde que une dos tramos de caño, con sus dos abrazaderas"""
    e = uni(eje)
    tubo(m, [(suma(c, por(e, -largo / 2)), r), (suma(c, por(e, largo / 2)), r)], VERDE, n=12)
    for s in (-1, 1):
        k = suma(c, por(e, s * (largo / 2 - 0.022)))
        tubo(m, [(suma(k, por(e, -0.007)), r + 0.004), (suma(k, por(e, 0.007)), r + 0.004)], ACERO, n=12)

# ---------------------------------------------------------------- la envolvente (medida en el modelo del avión)
PEND = 0.1467                                   # la quilla baja 14,7 cm por metro hacia atrás (8,3°)
def quilla(x): return 1.00 + PEND * (x + 0.25)  # altura de la quilla en el tramo recto de las hojas
PANZA = [(0.45, 1.58), (0.25, 1.48), (0.10, 1.44), (0.0, 1.41), (-0.25, 1.36), (-0.5, 1.31), (-1.0, 1.22), (-1.5, 1.13),
         (-2.0, 1.08), (-2.25, 1.07), (-2.5, 1.06), (-3.0, 1.04), (-3.6, 1.03)]      # la panza del fuselaje a los lados de la compuerta
def panza(x):
    for (x0, y0), (x1, y1) in zip(PANZA, PANZA[1:]):
        if x0 >= x >= x1:
            return y0 + (y1 - y0) * (x0 - x) / (x0 - x1)
    return PANZA[0][1] if x > PANZA[0][0] else PANZA[-1][1]

XA, XB = -0.10, -1.85                           # el tramo de las hojas (1,75 m)
XPUNTA, XFIN = 0.16, -2.50                      # la proa y la popa
ZC, HC = 0.29, 0.165                            # la arista de la bisagra: media anchura y altura sobre la quilla [VERIFICAR]
Z1, H1 = 0.43, 0.25                             # un punto del costado
ZT = 0.50                                       # media anchura donde entra en la panza
ANCHO_HOJA = math.hypot(ZC, HC)                 # 0,334 m de la quilla a la bisagra
ABRE = math.radians(78)                         # cuánto gira cada hoja para abrir [PROVISORIO, sin foto]

def media(x, s=1.0, yq=None):
    """media sección derecha en x: de la quilla hacia arriba, achicada s veces hacia el tope (para la proa y la popa)"""
    yt = panza(x)
    yk = quilla(x) if yq is None else yq
    return [(x, yt - (yt - y) * s, z * s) for z, y in ((0.0, yk), (ZC, yk + HC), (Z1, yk + H1), (ZT, yt))]

def anillo(x, s=1.0, yq=None):
    d = media(x, s, yq)
    return [(p[0], p[1], -p[2]) for p in reversed(d[1:])] + d       # izquierda arriba → quilla → derecha arriba (7 puntos)

caja = Malla()
hojas = {'izq': Malla(), 'der': Malla()}
carga = Malla()
chapa = Malla()

# ---------------------------------------------------------------- lo fijo: costados, proa, popa
est = [XA, -0.25, -0.5, -1.0, -1.5, XB]
for x0, x1 in zip(est, est[1:]):
    for sg in (1, -1):
        A = [(p[0], p[1], sg * p[2]) for p in media(x0)[1:]]
        B = [(p[0], p[1], sg * p[2]) for p in media(x1)[1:]]
        for k in range(len(A) - 1):
            q = (A[k], A[k + 1], B[k + 1], B[k]) if sg > 0 else (A[k], B[k], B[k + 1], A[k + 1])
            caja.quad(*q, ROJO)

def casquete(x_de, x_a, pasos, escala, yq=None):
    """la proa o la popa: secciones que se achican hacia el tope hasta cerrarse en una punta"""
    ant = anillo(x_de, 1.0, yq)
    for i in range(1, pasos + 1):
        t = i / pasos
        x, s = (x_de + (x_a - x_de) * math.sin(t * math.pi / 2), math.cos(t * math.pi / 2)) if escala == 'proa' else (x_de + (x_a - x_de) * t, max(0.0, 1 - t ** 1.6) ** 0.7)
        if i == pasos:
            punta = (x_a, panza(x_a), 0.0)
            for k in range(len(ant) - 1):
                caja.cara([ant[k], ant[k + 1], punta], [ROJO] * 3)
        else:
            act = anillo(x, s, yq)
            for k in range(len(ant) - 1):
                q = (ant[k], ant[k + 1], act[k + 1], act[k]) if x_a < x_de else (ant[k], act[k], act[k + 1], ant[k + 1])
                caja.quad(*q, ROJO)
            ant = act

casquete(XA, XPUNTA, 6, 'proa')
casquete(XB, XFIN, 8, 'popa', quilla(XB))

# la panza del fuselaje, como contexto: una chapa de 1,24 m de ancho de la que cuelgan la compuerta y la cañería. Va en su propia
# malla (compuerta_panza): sirve para ver el conjunto sólido; en el holograma se saca, porque de canto es un plano que encandila
for (x0, y0), (x1, y1) in zip(PANZA, PANZA[1:]):
    xa, xb = min(x0, 0.32), max(x1, -3.45)
    if xa <= xb: continue
    chapa.quad((xa, panza(xa), -0.62), (xb, panza(xb), -0.62), (xb, panza(xb), 0.62), (xa, panza(xa), 0.62), CHAPA)

# ---------------------------------------------------------------- por cada lado: el riel de la bisagra, la hoja y su listón
E_COST = uni((0.0, H1 - HC, Z1 - ZC))            # a lo largo del costado, de la arista hacia arriba (lado derecho)
N_COST = uni((0.0, -(Z1 - ZC), H1 - HC))         # hacia afuera del costado
E_HOJA = uni((0.0, HC, ZC))                      # a lo largo de la hoja, de la quilla a la arista
N_HOJA = uni((0.0, -ZC, HC))                     # hacia afuera de la hoja (abajo y afuera)
N_BUL = 17                                       # bulones por riel (foto 12)

def lado(v, sg):
    return (v[0], v[1], sg * v[2])

for sg, nombre in ((1, 'der'), (-1, 'izq')):
    ec, nc, eh, nh = lado(E_COST, sg), lado(N_COST, sg), lado(E_HOJA, sg), lado(N_HOJA, sg)
    arista = lambda x: (x, quilla(x) + HC, sg * ZC)
    filo = lambda x: (x, quilla(x), 0.0)
    # el riel de la bisagra: una planchuela de acero sobre el costado, pegada a la arista, con sus bulones
    def riel(x):
        c = arista(x)
        p0, p1 = suma(c, por(ec, 0.004)), suma(c, por(ec, 0.049))
        return [p0, p1, suma(p1, por(nc, 0.006)), suma(p0, por(nc, 0.006))]
    prisma(caja, riel(XA - 0.01), riel(XB + 0.01), ACERO)
    for i in range(N_BUL):
        x = XA - 0.06 - i * (XA - XB - 0.12) / (N_BUL - 1)
        b0 = suma(suma(arista(x), por(ec, 0.0265)), por(nc, 0.006))
        tubo(caja, [(b0, 0.009), (suma(b0, por(nc, 0.006)), 0.009)], GRIS, n=6)
    # los burletes claros que rodean la boca en las dos puntas de la hoja
    for xa, xb in ((XA + 0.032, XA + 0.002), (XB - 0.002, XB - 0.032)):
        a4 = [suma(filo(xa), por(nh, 0.001)), suma(arista(xa), por(nh, 0.001)), suma(arista(xa), por(nh, 0.005)), suma(filo(xa), por(nh, 0.005))]
        b4 = [suma(filo(xb), por(nh, 0.001)), suma(arista(xb), por(nh, 0.001)), suma(arista(xb), por(nh, 0.005)), suma(filo(xb), por(nh, 0.005))]
        prisma(caja, a4, b4, CREMA)
    # la HOJA: una plancha de 2 cm de la quilla a la bisagra (se mueve: va en su propia malla)
    h = hojas[nombre]
    def plancha(x):
        k, c = suma(filo(x), por(eh, 0.004)), suma(filo(x), por(eh, ANCHO_HOJA - 0.006))
        return [k, c, suma(c, por(nh, -0.02)), suma(k, por(nh, -0.02))]
    prisma(h, plancha(XA), plancha(XB), ROJO)
    # el listón dorado del filo, con sus tornillos (foto 12)
    def liston(x):
        p0, p1 = suma(filo(x), por(eh, 0.008)), suma(filo(x), por(eh, 0.040))
        return [p0, p1, suma(p1, por(nh, 0.004)), suma(p0, por(nh, 0.004))]
    prisma(h, liston(XA - 0.004), liston(XB + 0.004), DORADO)
    for i in range(N_BUL):
        x = XA - 0.06 - i * (XA - XB - 0.12) / (N_BUL - 1)
        t0 = suma(suma(filo(x), por(eh, 0.024)), por(nh, 0.004))
        tubo(h, [(t0, 0.006), (suma(t0, por(nh, 0.003)), 0.006)], GRIS, n=6)

# el caño corto de venteo, en el costado derecho (fotos 10, 13 y 14) [posición VERIFICAR]
xv = -0.75
pv = suma((xv, quilla(xv) + (HC + H1) / 2, (ZC + Z1) / 2), por(N_COST, -0.01))
dv = uni((-0.15, -0.9, 0.35))
tubo(caja, [(pv, 0.02), (suma(pv, por(dv, 0.11)), 0.02)], NEGRO, n=10)

# ---------------------------------------------------------------- la cañería de carga (detrás de la compuerta)
R = 0.04                                        # caño de 8 cm [VERIFICAR: acople rápido de 3 pulgadas]
XT = -2.95                                      # la T y el caño transversal
YP = panza(XT) - 0.075                          # cuelga 7,5 cm bajo la panza
ZV = 0.50                                       # las válvulas, a cada lado
tubo(carga, [((XT, YP, 0.0), R), ((-2.36, YP + 0.015, 0.0), R)], ALUMINIO)                 # de la T a la popa de la compuerta
tubo(carga, [((XT, YP, -ZV + 0.04), R), ((XT, YP, ZV - 0.04), R)], ALUMINIO)               # el transversal
tubo(carga, [((XT, YP, -0.07), R + 0.008), ((XT, YP, 0.07), R + 0.008)], ALUMINIO)         # el cuerpo de la T
manguito(carga, (-2.47, YP + 0.012, 0.0), (1, 0.025, 0))
manguito(carga, (-2.83, YP + 0.003, 0.0), (1, 0.025, 0))
tubo(carga, [((-2.66, YP + R, 0.0), 0.006), ((-2.63, panza(-2.63), 0.05), 0.006)], GRIS, n=6)   # el soporte del caño (foto 37)
for sg in (1, -1):
    z = sg * ZV
    manguito(carga, (XT, YP, sg * 0.30), (0, 0, 1))
    # la válvula: cuerpo, dos bridas cuadradas con sus cuatro bulones y el eje con su palanca (fotos 23, 25 y 38)
    carga.caja(XT - 0.065, XT + 0.065, YP - 0.075, YP + 0.075, min(z - 0.04, z + 0.04), max(z - 0.04, z + 0.04), GRIS)
    for dz in (-0.046, 0.046):
        zz = z + dz
        carga.caja(XT - 0.085, XT + 0.085, YP - 0.085, YP + 0.085, zz - 0.006, zz + 0.006, ALUMINIO)
    for dx in (-0.068, 0.068):
        for dy in (-0.068, 0.068):
            tubo(carga, [((XT + dx, YP + dy, z + sg * 0.052), 0.008), ((XT + dx, YP + dy, z + sg * 0.060), 0.008)], GRIS, n=6)
    tubo(carga, [((XT - 0.065, YP, z), 0.034), ((XT - 0.10, YP, z), 0.034)], ALUMINIO, n=10)    # la caja del eje
    tubo(carga, [((XT - 0.09, YP - 0.01, z), 0.007), ((XT - 0.22, YP - 0.16, z + sg * 0.03), 0.007)], ACERO, n=6)   # la palanca
    tubo(carga, [((XT - 0.215, YP - 0.155, z + sg * 0.029), 0.013), ((XT - 0.245, YP - 0.19, z + sg * 0.036), 0.013)], NEGRO, n=8)
    # el codo y la boca con acople rápido: sale de la válvula hacia afuera y dobla hacia atrás y abajo (fotos 23, 27 y 29)
    d = uni((-0.60, -0.45, sg * 0.66))
    p0 = (XT, YP, z + sg * 0.05)
    p1 = suma(p0, (0, 0, sg * 0.05))
    p2 = suma(p1, por(uni((-0.30, -0.22, sg * 0.83)), 0.06))
    p3 = suma(p2, por(d, 0.07))
    tubo(carga, [(p0, R + 0.002), (p1, R + 0.002), (p2, R + 0.002), (p3, R + 0.002)], ALUMINIO, tapas=False)
    f = lambda t: suma(p3, por(d, t))
    tubo(carga, [(f(0.0), 0.050), (f(0.03), 0.050), (f(0.03), 0.044), (f(0.05), 0.044), (f(0.05), 0.055), (f(0.09), 0.055),
                 (f(0.09), 0.040), (f(0.045), 0.040)], ALUMINIO, n=14, eje=d)

if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = [caja.construir('compuerta_caja', 'compuerta')]
    for sg, nombre in ((1, 'der'), (-1, 'izq')):
        o = hojas[nombre].construir(f'compuerta_hoja_{nombre}', 'compuerta')
        o['bisagra'] = json.dumps({'a': [XA, round(quilla(XA) + HC, 4), sg * ZC], 'b': [XB, round(quilla(XB) + HC, 4), sg * ZC], 'abre': round(sg * ABRE, 4)})
        objs.append(o)
    objs.append(carga.construir('compuerta_carga', 'compuerta'))
    objs.append(chapa.construir('compuerta_panza', 'compuerta'))
    medidas = {'marco': 'avión: +x nariz, +y arriba, +z derecha, m; origen en el piso entre las ruedas principales',
               'hojas_x': [XA, XB], 'largo_hojas': round((XA - XB) / math.cos(math.atan(PEND)), 3), 'ancho_hoja': round(ANCHO_HOJA, 3),
               'quilla_y': [round(quilla(XA), 3), round(quilla(XB), 3)], 'pendiente_grados': round(math.degrees(math.atan(PEND)), 1),
               'proa_x': XPUNTA, 'popa_x': XFIN, 'media_anchura': ZT, 'bulones_por_riel': N_BUL, 'abre_grados': round(math.degrees(ABRE)),
               'cano_m': 2 * R, 'bocas': {'x': XT, 'y': round(YP, 3), 'z': [-ZV, ZV]}}
    objs[0]['compuerta'] = json.dumps(medidas)
    tri = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
    for mt in bpy.data.materials:
        mt.use_backface_culling = False
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    opciones = dict(filepath=SALIDA, export_format='GLB', use_selection=True, export_yup=True, export_extras=True, export_apply=True, export_materials='EXPORT')
    try:
        bpy.ops.export_scene.gltf(**opciones, export_vertex_color='ACTIVE')
    except TypeError:
        bpy.ops.export_scene.gltf(**opciones)
    peso = os.path.getsize(SALIDA)
    print(f'  presupuesto → {sum(tri.values())} triángulos · {len(objs)} mallas · {peso / 1e6:.3f} MB · {tri}')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': 'T12', 'triangulos': tri, 'mallas': len(objs), 'mb': round(peso / 1e6, 3), 'medidas': medidas,
                   'nota': 'envolvente medida en juegos/at802.glb; forma y detalles de las fotos del avión real; medidas chicas [VERIFICAR]; abierta [PROVISORIO]'},
                  f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
