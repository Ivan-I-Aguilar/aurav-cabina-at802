# Taller de motores · T5 (adelantada dentro del bloque de la T1, 15/11/2026): los MUEBLES y la UTILERÍA de la nave · MODELO:
# taller/muebles.glb (PLAN_TALLER.md §4, zonas H2–H7). Todo liviano y por vértices, en el MISMO marco que taller/hangar.glb (portón en
# z 0, fondo en z −60, x −20…20; el juego lo cuelga del hangar, así se corre con él).
#
# Qué hay [PROVISORIO: medidas y lugares inventados, se ajustan mirando las vistas]:
#  H6 fondo y pared derecha: 3 bancos de trabajo con su tablero de herramientas con siluetas (en uno falta una llave: el «control de
#     herramientas», gancho para el modo mecánico), 2 cajoneras rojas con ruedas, estanterías de rack (parantes azules, largueros
#     naranja, cajas), compresor de tanque horizontal, 2 ventiladores industriales, matafuegos en las columnas y un lavaojos.
#  H7 rincón del fondo a la izquierda: oficina vidriada (marcos blancos, puerta, cielorraso, escritorio) con el PIZARRÓN de los
#     créditos (malla «pizarron» con coordenadas 0–1: el juego le pone el texto).
#  H3 puesto del AT-802: 4 conos en las esquinas de la zona y la escalera de servicio (las calzas van con el avión, en la T6).
#  H4 puesto del Cessna: carro de herramientas, bandeja y el cartel de pie «EN MANTENIMIENTO» (malla «cartel_mantenimiento» con
#     coordenadas 0–1; los gatos van con el avión, en la T6).
#  H2 partida: el cuerpo del atril (el panel con la elección de modo lo pone el juego).
#  Sombras de contacto: cuadrados con coordenadas 0–1 (material «muebles_sombra»: el juego les pone una mancha suave).
# El choque al caminar: los rectángulos de planta de cada mueble van en userData.choques de la raíz y en el informe.
#
# Uso: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/taller_muebles.py
import bpy, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
from taller_hangar import Malla, lin, mezclar, W, FONDO, ZONAS

SALIDA = os.path.join(cc.RAIZ, 'taller', 'muebles.glb')
INFORME = os.path.join(cc.RAIZ, 'taller', 'muebles_informe.json')
cc.COLORES.update({k: ('#ffffff', 0.6, 0.1) for k in ('muebles', 'muebles_vidrio', 'muebles_sombra', 'pizarron', 'cartel_mantenimiento')})

ROJO, ROJO_OSC = lin('#b3262a'), lin('#7c1a1d')
GRIS, GRIS_OSC, GRIS_CLARO = lin('#5d636b'), lin('#2e3338'), lin('#a7adb3')
TAPA = lin('#8d7a62')                       # tapa de banco (multilaminado)
AZUL, NARANJA = lin('#2f5f9e'), lin('#e0702a')
CARTON, BIN = lin('#b08d5b'), lin('#2f6db3')
NEGRO, AMARILLO, VERDE, BLANCO = lin('#1d1f22'), lin('#e3b81f'), lin('#2f9e5b'), lin('#e9ebed')
CONO, METAL = lin('#f06a1d'), lin('#c3c8cd')
TABLERO, SILUETA = lin('#d5d9dc'), lin('#2a2d31')

m = Malla()            # todo lo opaco, con color por vértice
vidrio = Malla()
sombras = Malla()
pizarron = Malla()
cartel = Malla()
choques = []           # [x0, x1, z0, z1] en el marco del hangar


def caja(x0, x1, y0, y1, z0, z1, col, malla=None):
    (malla or m).caja(min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1), min(z0, z1), max(z0, z1), col)


def barra(a, b, w, col):
    """barra de sección cuadrada w entre los puntos a y b (cualquier dirección), por vértices"""
    import mathutils
    A, B = mathutils.Vector(a), mathutils.Vector(b)
    d = (B - A).normalized()
    ref = mathutils.Vector((0, 1, 0)) if abs(d.y) < 0.9 else mathutils.Vector((1, 0, 0))
    u = d.cross(ref).normalized() * (w / 2)
    v = d.cross(u).normalized() * (w / 2)
    esq = [u + v, -u + v, -u - v, u - v]
    pa = [tuple(A + e) for e in esq]
    pb = [tuple(B + e) for e in esq]
    for i in range(4):
        j = (i + 1) % 4
        m.quad(pa[i], pa[j], pb[j], pb[i], col)
    m.quad(pa[3], pa[2], pa[1], pa[0], col)
    m.quad(pb[0], pb[1], pb[2], pb[3], col)


def cilindro(c, r, largo, eje, col, tapa=None, n=12):
    """prisma de n lados alrededor del eje 'x' | 'y' | 'z', centrado en c"""
    def P(t, ang):
        a, b_ = r * math.cos(ang), r * math.sin(ang)
        if eje == 'x': return (c[0] + t, c[1] + a, c[2] + b_)
        if eje == 'y': return (c[0] + a, c[1] + t, c[2] + b_)
        return (c[0] + a, c[1] + b_, c[2] + t)
    h = largo / 2
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        m.quad(P(-h, a0), P(-h, a1), P(h, a1), P(h, a0), col)
        for t, orden in ((-h, (a1, a0)), (h, (a0, a1))):
            centro = (c[0] + (t if eje == 'x' else 0), c[1] + (t if eje == 'y' else 0), c[2] + (t if eje == 'z' else 0))
            m.cara([centro, P(t, orden[0]), P(t, orden[1])], [tapa or col] * 3)


def cono(x, z, r, h, col, n=10):
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        m.cara([(x + r * math.cos(a0), 0.03, z + r * math.sin(a0)), (x, h, z), (x + r * math.cos(a1), 0.03, z + r * math.sin(a1))], [col] * 3)
    caja(x - r - 0.04, x + r + 0.04, 0, 0.03, z - r - 0.04, z + r + 0.04, NEGRO)


def sombra(cx, cz, rx, rz):
    y = 0.006
    sombras.quad((cx - rx, y, cz - rz), (cx + rx, y, cz - rz), (cx + rx, y, cz + rz), (cx - rx, y, cz + rz), (1, 1, 1),
                 [(0, 0), (1, 0), (1, 1), (0, 1)])


def choque(x0, x1, z0, z1):
    choques.append([round(min(x0, x1), 3), round(max(x0, x1), 3), round(min(z0, z1), 3), round(max(z0, z1), 3)])


# ---------------------------------------------------------------- H6: bancos de trabajo con tablero de herramientas (pared del fondo)
Z_PARED = -FONDO
def banco(cx, falta=None):
    x0, x1, zb, zf, y = cx - 1.2, cx + 1.2, Z_PARED + 0.12, Z_PARED + 0.87, 0.9
    caja(x0, x1, y - 0.05, y, zb, zf, TAPA)                                           # tapa
    for x in (x0 + 0.05, x1 - 0.1):
        for z in (zb + 0.03, zf - 0.08):
            caja(x, x + 0.05, 0, y - 0.05, z, z + 0.05, GRIS_OSC)                    # patas
    caja(x0 + 0.05, x1 - 0.05, 0.15, 0.18, zb + 0.03, zf - 0.03, GRIS)              # estante de abajo
    caja(x1 - 0.65, x1 - 0.1, 0.18, y - 0.05, zb + 0.05, zf - 0.04, ROJO)          # cajonera bajo la tapa
    for k in range(4):
        yy = 0.24 + k * 0.155
        caja(x1 - 0.6, x1 - 0.15, yy + 0.12, yy + 0.125, zf - 0.04, zf - 0.035, ROJO_OSC)   # rendijas de los cajones
        caja(x1 - 0.45, x1 - 0.3, yy + 0.07, yy + 0.085, zf - 0.035, zf - 0.02, METAL)       # manijas
    # tablero perforado con siluetas, en la pared (de 1,15 a 2,15 m)
    tz = Z_PARED + 0.05
    caja(cx - 1.1, cx + 1.1, 1.15, 2.15, tz - 0.02, tz, TABLERO)
    herr = []
    for i in range(6):                                                               # destornilladores
        herr.append((cx - 0.95 + i * 0.07, 1.78, 0.022, 0.24))
    for i in range(5):                                                               # llaves combinadas, de menor a mayor
        herr.append((cx - 0.45 + i * 0.09, 1.70 + i * 0.012, 0.03, 0.2 + i * 0.03))
    for i in range(3):                                                               # martillos (mango + cabeza)
        herr.append((cx + 0.15 + i * 0.2, 1.62, 0.03, 0.3))
        herr.append((cx + 0.15 + i * 0.2, 1.80, 0.13, 0.045))
    for i in range(2):                                                               # pinzas
        herr.append((cx + 0.78 + i * 0.12, 1.66, 0.05, 0.24))
    for i, (x, y, w, h) in enumerate(herr):
        caja(x - w / 2, x + w / 2, y - h / 2, y + h / 2, tz, tz + 0.002, SILUETA)     # la silueta pintada
        if i != falta:
            caja(x - w / 2 + 0.003, x + w / 2 - 0.003, y - h / 2 + 0.004, y + h / 2 - 0.004, tz + 0.006, tz + 0.016, METAL if h > w else GRIS)
    choque(x0, x1, zb - 0.1, zf)
    sombra(cx, (zb + zf) / 2, 1.45, 0.6)

BANCOS = [7.6, 10.2, 12.8]
for i, cx in enumerate(BANCOS):
    banco(cx, falta=8 if i == 1 else None)                                           # al del medio le falta una llave

# cajoneras rojas con ruedas
for cx in (15.4, 16.3):
    z0, z1 = Z_PARED + 0.15, Z_PARED + 0.62
    caja(cx - 0.34, cx + 0.34, 0.1, 1.05, z0, z1, ROJO)
    caja(cx - 0.34, cx + 0.34, 1.07, 1.45, z0 + 0.04, z1, ROJO)
    caja(cx - 0.345, cx + 0.345, 1.05, 1.07, z0 + 0.02, z1 + 0.005, GRIS_OSC)
    for k in range(7):
        yy = 0.18 + k * 0.125
        caja(cx - 0.31, cx + 0.31, yy, yy + 0.006, z1, z1 + 0.004, ROJO_OSC)
        caja(cx - 0.2, cx + 0.2, yy + 0.05, yy + 0.065, z1, z1 + 0.02, METAL)
    for x in (cx - 0.28, cx + 0.22):
        for z in (z0 + 0.03, z1 - 0.09):
            caja(x, x + 0.06, 0, 0.1, z, z + 0.06, NEGRO)
    choque(cx - 0.34, cx + 0.34, z0, z1)
    sombra(cx, (z0 + z1) / 2, 0.5, 0.4)

# lavaojos: pedestal amarillo, pileta verde y su cartel en la pared
caja(5.0, 5.06, 0, 1.0, Z_PARED + 0.3, Z_PARED + 0.36, AMARILLO)
caja(4.85, 5.21, 1.0, 1.08, Z_PARED + 0.18, Z_PARED + 0.48, VERDE)
caja(4.86, 5.2, 1.85, 2.2, Z_PARED + 0.04, Z_PARED + 0.05, VERDE)
caja(4.95, 5.11, 1.93, 2.12, Z_PARED + 0.05, Z_PARED + 0.052, BLANCO)
choque(4.8, 5.26, Z_PARED, Z_PARED + 0.5)

# ---------------------------------------------------------------- H6: estanterías de rack sobre la pared derecha
X_PARED = W
def rack(z0, bahias, largo=2.6, prof=1.0, alto=3.0):
    x0, x1 = X_PARED - 0.5 - prof, X_PARED - 0.5
    for k in range(bahias + 1):
        z = z0 + k * largo
        for x in (x0, x1 - 0.08):
            caja(x, x + 0.08, 0, alto, z - 0.04, z + 0.04, AZUL)                     # parantes
    z1 = z0 + bahias * largo
    for yy in (1.0, 2.0, 2.95):
        for x in (x0, x1 - 0.05):
            caja(x, x + 0.05, yy - 0.1, yy, z0, z1, NARANJA)                         # largueros
        caja(x0 + 0.05, x1 - 0.05, yy - 0.02, yy, z0, z1, GRIS)                      # piso del nivel
    import random
    rnd = random.Random(802)
    for yy in (0.0, 1.0, 2.0):
        z = z0 + 0.1
        while z < z1 - 0.4:
            w = rnd.uniform(0.35, 0.8)
            if z + w > z1 - 0.05:
                break
            h = rnd.uniform(0.25, 0.7)
            d = rnd.uniform(0.5, 0.9)
            col = mezclar(CARTON, rnd.uniform(0.85, 1.1)) if rnd.random() < 0.75 else BIN
            caja(x1 - 0.05 - d, x1 - 0.06, yy + 0.002, yy + h, z, z + w, col)
            z += w + rnd.uniform(0.03, 0.2)
    choque(x0, x1, z0 - 0.04, z1 + 0.04)
    sombra(x0 + prof / 2, (z0 + z1) / 2, prof / 2 + 0.25, (z1 - z0) / 2 + 0.3)

rack(-57.0, 3)          # z −57 … −49,2
rack(-34.0, 2)          # z −34 … −28,8

# compresor de tanque horizontal
cx, cz = X_PARED - 1.1, -42.0
caja(cx - 0.35, cx + 0.35, 0, 0.12, cz - 0.85, cz + 0.85, GRIS_OSC)
cilindro((cx, 0.45, cz), 0.3, 1.6, 'z', ROJO, tapa=ROJO_OSC)
caja(cx - 0.2, cx + 0.2, 0.75, 1.1, cz - 0.55, cz - 0.1, GRIS)                     # motor
caja(cx - 0.22, cx + 0.22, 0.75, 1.05, cz + 0.05, cz + 0.45, ROJO)                 # bomba con su cubre-correa
cilindro((cx, 0.95, cz + 0.6), 0.06, 0.25, 'y', METAL)                              # filtro
choque(cx - 0.4, cx + 0.4, cz - 0.9, cz + 0.9)
sombra(cx, cz, 0.6, 1.1)

# ventiladores industriales (tambor sobre caballete), mirando al centro de la nave
def ventilador(x, z):
    yc = 1.0
    cilindro((x, yc, z), 0.55, 0.35, 'x', GRIS_OSC, tapa=NEGRO, n=16)
    for dz in (-0.45, 0.45):
        barra((x, 0, z + dz * 1.2), (x, yc - 0.1, z + dz), 0.05, GRIS_OSC)        # caballete
    caja(x - 0.03, x + 0.03, 0.0, 0.05, z - 0.6, z + 0.6, GRIS_OSC)
    choque(x - 0.25, x + 0.25, z - 0.6, z + 0.6)
    sombra(x, z, 0.5, 0.75)

ventilador(X_PARED - 1.2, -24.0)
ventilador(-X_PARED + 1.2, -41.0)

# matafuegos en las columnas (cara de adentro), con su chapa roja arriba; a la derecha no en la 7 (ahí está el rack)
for sx in (-1, 1):
    for b in ((1, 3, 5, 7) if sx < 0 else (1, 3, 6)):
        z = -b * 7.5
        x = sx * (W - 0.25 - 0.2 - 0.11)
        cilindro((x, 0.98, z), 0.085, 0.52, 'y', ROJO, tapa=ROJO_OSC)
        caja(x - 0.025, x + 0.025, 1.24, 1.32, z - 0.03, z + 0.03, NEGRO)           # válvula
        barra((x, 1.3, z + 0.02), (x, 0.8, z + 0.11), 0.018, NEGRO)                 # manguera
        caja(x - sx * 0.005 - 0.004, x - sx * 0.005 + 0.004, 1.55, 1.85, z - 0.15, z + 0.15, ROJO)   # chapa
        caja(x - sx * 0.005 - 0.006, x - sx * 0.005 + 0.006, 1.6, 1.8, z - 0.035, z + 0.035, BLANCO)

# ---------------------------------------------------------------- H7: la oficina vidriada (rincón del fondo, izquierda)
OX0, OX1, OZ0, OZ1, OH = -W + 0.3, -11.5, -FONDO + 0.1, -53.5, 2.7
PUERTA = (-13.6, -12.6)
def marco_vertical(x, z):
    caja(x - 0.03, x + 0.03, 0, OH, z - 0.03, z + 0.03, BLANCO)
# frente (z = OZ1): parantes cada ~1,6 m, la puerta y el vidrio
xs = [OX0 + k * (OX1 - OX0) / 5 for k in range(6)]
for x in xs:
    marco_vertical(x, OZ1)
for x in PUERTA:
    marco_vertical(x, OZ1)
caja(OX0, OX1, OH - 0.08, OH, OZ1 - 0.03, OZ1 + 0.03, BLANCO)
caja(OX0, OX1, 0, 0.1, OZ1 - 0.03, OZ1 + 0.03, BLANCO)
for xa, xb in zip(xs, xs[1:]):
    tramos = [(xa, xb)]
    if xa < PUERTA[1] and xb > PUERTA[0]:
        tramos = [(xa, PUERTA[0]), (PUERTA[1], xb)]
    for ta, tb in tramos:
        if tb - ta > 0.08:
            vidrio.quad((ta + 0.03, 0.1, OZ1), (tb - 0.03, 0.1, OZ1), (tb - 0.03, OH - 0.08, OZ1), (ta + 0.03, OH - 0.08, OZ1), (1, 1, 1))
caja(PUERTA[0], PUERTA[1], 2.1, 2.16, OZ1 - 0.03, OZ1 + 0.03, BLANCO)               # dintel
vidrio.quad((PUERTA[0] + 0.03, 2.16, OZ1), (PUERTA[1] - 0.03, 2.16, OZ1), (PUERTA[1] - 0.03, OH - 0.08, OZ1), (PUERTA[0] + 0.03, OH - 0.08, OZ1), (1, 1, 1))
# costado (x = OX1)
zs = [OZ0 + k * (OZ1 - OZ0) / 4 for k in range(5)]
for z in zs:
    marco_vertical(OX1, z)
caja(OX1 - 0.03, OX1 + 0.03, OH - 0.08, OH, OZ0, OZ1, BLANCO)
caja(OX1 - 0.03, OX1 + 0.03, 0, 0.1, OZ0, OZ1, BLANCO)
for za, zb in zip(zs, zs[1:]):
    vidrio.quad((OX1, 0.1, za + 0.03), (OX1, 0.1, zb - 0.03), (OX1, OH - 0.08, zb - 0.03), (OX1, OH - 0.08, za + 0.03), (1, 1, 1))
caja(OX0, OX1 + 0.03, OH, OH + 0.12, OZ0, OZ1 + 0.03, BLANCO)                       # cielorraso
# escritorio, silla y el pizarrón de los créditos en la pared del fondo
caja(-17.6, -15.8, 0.72, 0.76, -57.6, -56.8, TAPA)
for x in (-17.55, -15.9):
    caja(x, x + 0.05, 0, 0.72, -57.55, -56.85, GRIS_OSC)
caja(-16.95, -16.45, 0.42, 0.47, -56.5, -56.0, NEGRO)
caja(-16.95, -16.45, 0.47, 0.95, -56.03, -55.98, NEGRO)
caja(-16.73, -16.67, 0, 0.42, -56.28, -56.22, GRIS_OSC)
PZ = (-18.9, -15.1, 1.0, 2.2)                                                       # x0, x1, y0, y1 del pizarrón
caja(PZ[0] - 0.04, PZ[1] + 0.04, PZ[2] - 0.04, PZ[3] + 0.04, Z_PARED + 0.06, Z_PARED + 0.08, METAL)
pizarron.quad((PZ[0], PZ[2], Z_PARED + 0.085), (PZ[1], PZ[2], Z_PARED + 0.085), (PZ[1], PZ[3], Z_PARED + 0.085), (PZ[0], PZ[3], Z_PARED + 0.085),
              (1, 1, 1), [(0, 0), (1, 0), (1, 1), (0, 1)])
# las paredes de vidrio chocan (la puerta no)
choque(OX0, PUERTA[0], OZ1 - 0.05, OZ1 + 0.05)
choque(PUERTA[1], OX1, OZ1 - 0.05, OZ1 + 0.05)
choque(OX1 - 0.05, OX1 + 0.05, OZ0, OZ1)
choque(-17.65, -15.75, -57.65, -56.75)

# ---------------------------------------------------------------- H3: conos y escalera de servicio del puesto del AT-802
zx0, zx1, zz0, zz1 = ZONAS['at802']
for x, z in ((zx0 + 0.5, zz0 + 0.5), (zx1 - 0.5, zz0 + 0.5), (zx0 + 0.5, zz1 - 0.5), (zx1 - 0.5, zz1 - 0.5)):
    cono(x, z, 0.16, 0.5, CONO)
    choque(x - 0.22, x + 0.22, z - 0.22, z + 0.22)
# escalera de plataforma (amarilla, con ruedas): sube hacia −z hasta 1,5 m. Afuera de la zona, en el pasillo entre los dos puestos,
# hasta que la T6 ponga el avión (adentro chocaba con el ala) [PROVISORIO]
ex, ez = -0.2, -16.5
for dx in (-0.32, 0.32):
    barra((ex + dx, 0.12, ez + 0.75), (ex + dx, 1.5, ez - 0.25), 0.05, AMARILLO)       # largueros
    barra((ex + dx, 0.12, ez - 0.55), (ex + dx, 1.5, ez - 0.55), 0.05, AMARILLO)       # pata de atrás
    barra((ex + dx, 1.5, ez - 0.55), (ex + dx, 2.45, ez - 0.55), 0.035, AMARILLO)      # baranda
    barra((ex + dx, 1.5, ez - 0.25), (ex + dx, 2.45, ez - 0.25), 0.035, AMARILLO)
    barra((ex + dx, 2.45, ez - 0.55), (ex + dx, 2.45, ez - 0.25), 0.035, AMARILLO)
for k in range(1, 6):
    t = k / 6
    yy, zz = 0.12 + t * (1.5 - 0.12), ez + 0.75 - t * 1.0
    caja(ex - 0.3, ex + 0.3, yy - 0.025, yy, zz - 0.09, zz + 0.09, GRIS_CLARO)       # peldaños
caja(ex - 0.34, ex + 0.34, 1.47, 1.52, ez - 0.6, ez - 0.2, GRIS_CLARO)              # plataforma
for x in (ex - 0.34, ex + 0.3):
    for z in (ez + 0.7, ez - 0.6):
        caja(x, x + 0.04, 0, 0.12, z, z + 0.06, NEGRO)
choque(ex - 0.4, ex + 0.4, ez - 0.65, ez + 0.8)
sombra(ex, ez + 0.05, 0.55, 0.9)

# ---------------------------------------------------------------- H4: carro, bandeja y cartel «EN MANTENIMIENTO» del puesto del Cessna
kx, kz = 4.4, -14.2
caja(kx - 0.45, kx + 0.45, 0.85, 0.88, kz - 0.25, kz + 0.25, ROJO)
caja(kx - 0.45, kx + 0.45, 0.38, 0.41, kz - 0.25, kz + 0.25, ROJO)
for x in (kx - 0.45, kx + 0.42):
    for z in (kz - 0.25, kz + 0.22):
        caja(x, x + 0.03, 0.1, 0.88, z, z + 0.03, ROJO_OSC)
        caja(x - 0.01, x + 0.05, 0, 0.1, z - 0.01, z + 0.05, NEGRO)
barra((kx + 0.45, 0.9, kz - 0.2), (kx + 0.58, 0.95, kz - 0.2), 0.025, METAL)
barra((kx + 0.45, 0.9, kz + 0.2), (kx + 0.58, 0.95, kz + 0.2), 0.025, METAL)
barra((kx + 0.58, 0.95, kz - 0.2), (kx + 0.58, 0.95, kz + 0.2), 0.025, METAL)
for i in range(4):                                                                  # herramientas sobre el carro
    caja(kx - 0.35 + i * 0.18, kx - 0.25 + i * 0.18, 0.88, 0.91, kz - 0.12, kz + 0.1, METAL if i % 2 else GRIS_OSC)
choque(kx - 0.5, kx + 0.62, kz - 0.3, kz + 0.3)
sombra(kx, kz, 0.7, 0.45)
caja(8.6, 9.4, 0, 0.06, -16.9, -16.3, GRIS_OSC)                                     # bandeja
caja(8.65, 9.35, 0.055, 0.058, -16.85, -16.35, NEGRO)
# cartel de pie (A): dos chapas inclinadas, con la cara de adelante mirando al pasillo (+z)
cx, cz, alto, ancho, ab = 2.4, -12.4, 1.0, 0.6, 0.22
for s_ in (1, -1):
    za, zb = cz + s_ * ab, cz + s_ * 0.015
    barra((cx - ancho / 2, 0, za), (cx - ancho / 2, alto, zb), 0.03, GRIS_OSC)
    barra((cx + ancho / 2, 0, za), (cx + ancho / 2, alto, zb), 0.03, GRIS_OSC)
    p0, p1 = (cx - ancho / 2 + 0.02, 0.25, cz + s_ * (ab - 0.25 / alto * (ab - 0.015)) + s_ * 0.018), (cx + ancho / 2 - 0.02, 0.25, cz + s_ * (ab - 0.25 / alto * (ab - 0.015)) + s_ * 0.018)
    p2, p3 = (cx + ancho / 2 - 0.02, alto - 0.03, cz + s_ * (ab - (alto - 0.03) / alto * (ab - 0.015)) + s_ * 0.018), (cx - ancho / 2 + 0.02, alto - 0.03, cz + s_ * (ab - (alto - 0.03) / alto * (ab - 0.015)) + s_ * 0.018)
    if s_ > 0:
        cartel.quad(p0, p1, p2, p3, (1, 1, 1), [(0, 0), (1, 0), (1, 1), (0, 1)])
    else:
        cartel.quad(p1, p0, p3, p2, (1, 1, 1), [(0, 0), (1, 0), (1, 1), (0, 1)])
choque(cx - 0.35, cx + 0.35, cz - 0.3, cz + 0.3)

# ---------------------------------------------------------------- H2: el cuerpo del atril de partida (el panel lo pone el juego)
ax, az = 0.0, -6.0
caja(ax - 0.3, ax + 0.3, 0, 0.05, az - 0.25, az + 0.25, GRIS_OSC)
caja(ax - 0.08, ax + 0.08, 0.05, 1.0, az - 0.08, az + 0.08, GRIS_OSC)
# la cabeza inclinada 35° hacia el que llega por el portón (+z): un prisma por vértices
inc = math.radians(35)
hx, hd = 0.46, 0.52                    # la cabeza mide 0,92 × 0,52 m: el panel del juego (0,88 × 0,48) va encima
y_c, z_c = 1.08, az
dz_, dy_ = math.cos(inc) * hd / 2, math.sin(inc) * hd / 2
arr = [(ax - hx, y_c - dy_ + 0.02, z_c + dz_), (ax + hx, y_c - dy_ + 0.02, z_c + dz_), (ax + hx, y_c + dy_ + 0.02, z_c - dz_), (ax - hx, y_c + dy_ + 0.02, z_c - dz_)]
aba = [(p[0], p[1] - 0.06, p[2]) for p in arr]
m.quad(*arr, GRIS_OSC)
m.quad(aba[3], aba[2], aba[1], aba[0], GRIS_OSC)
for i in range(4):
    j = (i + 1) % 4
    m.quad(aba[i], aba[j], arr[j], arr[i], GRIS_OSC)
choque(ax - 0.45, ax + 0.45, az - 0.3, az + 0.3)
sombra(ax, az, 0.5, 0.45)
ATRIL = {'centro': [ax, round(y_c + 0.021, 4), az], 'inclinacion_grados': 35, 'ancho': 2 * hx - 0.04, 'fondo': hd - 0.04}

if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = [m.construir('muebles', 'muebles'), vidrio.construir('muebles_vidrio', 'muebles_vidrio'), sombras.construir('muebles_sombra', 'muebles_sombra'),
            pizarron.construir('pizarron', 'pizarron'), cartel.construir('cartel_mantenimiento', 'cartel_mantenimiento')]
    objs[0]['choques'] = json.dumps(choques)
    objs[0]['atril'] = json.dumps(ATRIL)
    tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
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
    print(f'  presupuesto → {tri} triángulos · {len(objs)} llamadas · {peso / 1e6:.3f} MB · {len(choques)} choques')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': 'T5 (adelantada)', 'triangulos': tri, 'llamadas': len(objs), 'mb': round(peso / 1e6, 3), 'atril': ATRIL, 'choques': choques},
                  f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
