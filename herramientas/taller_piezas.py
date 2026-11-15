# Taller de motores · T8, tramo 1 (adelantado dentro del bloque de la T1, 15/11/2026): el BANCO DE COMPONENTES y las SEIS PIEZAS a
# tamaño real (PLAN_TALLER.md §7, decisión 4) · MODELO: taller/piezas.glb, en el marco del MUNDO del taller (como mesa.glb: la mesa
# en el origen, el alumno en +z mirando a −z).
#
# Las piezas [medidas VERIFICAR: genéricas de un turbohélice de la familia del PT6, a ojo, NO del manual]: ignitor, inyector de
# combustible, álabe de la turbina del compresor, sector de la malla de admisión, detector de virutas y termocupla de ITT. Una malla
# por pieza (se agarran sueltas), todas con UN material y el color por vértice (metal, cerámica, bronce, cobre: «reales», sin
# texturas, para que se distingan del holograma) → 6 llamadas + 1 del banco. Cada pieza lleva userData {pieza, nombre, estacion,
# bandeja}; el banco, userData.banco (las bandejas, para los rótulos que dibuja el juego). El texto de INSPECCIÓN no va acá: es de
# taller/mecanico.js y lo valida AAXOD (decisión 3b).
#
# Uso: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/taller_piezas.py
import bpy, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
from taller_hangar import Malla, lin, mezclar

SALIDA = os.path.join(cc.RAIZ, 'taller', 'piezas.glb')
INFORME = os.path.join(cc.RAIZ, 'taller', 'piezas_informe.json')
cc.COLORES.update({'banco_componentes': ('#ffffff', 0.7, 0.1), 'pieza': ('#ffffff', 0.38, 0.55)})

ACERO, ACERO_OSC, NIQUEL = lin('#9aa1a8'), lin('#5d636b'), lin('#c8ccd0')
CERAMICA, BRONCE, COBRE, NEGRO = lin('#efece4'), lin('#b0874a'), lin('#b8693a'), lin('#1d1f22')
INCONEL = lin('#8c8a84')                    # el álabe y la termocupla: aleación de alta temperatura, gris pardo
GRIS, GRIS_OSC, GOMA, ESPUMA = lin('#6b7178'), lin('#2e3338'), lin('#2a3a33'), lin('#3d4f63')
mm = 0.001

# ---------------------------------------------------------------- el banco: al costado derecho del alumno, de frente a la mesa (−x)
BX0, BX1, BZ0, BZ1, BY = 1.70, 2.40, 0.95, 2.55, 0.90          # [PROVISORIO]
banco = Malla()
def caja(m, x0, x1, y0, y1, z0, z1, col):
    m.caja(min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1), min(z0, z1), max(z0, z1), col)
caja(banco, BX0, BX1, BY - 0.04, BY, BZ0, BZ1, GRIS)                                     # tapa
caja(banco, BX0 + 0.02, BX1 - 0.02, BY, BY + 0.004, BZ0 + 0.02, BZ1 - 0.02, GOMA)       # alfombra de goma
for x in (BX0 + 0.04, BX1 - 0.09):
    for z in (BZ0 + 0.04, BZ1 - 0.09):
        caja(banco, x, x + 0.05, 0, BY - 0.04, z, z + 0.05, GRIS_OSC)
caja(banco, BX0 + 0.06, BX1 - 0.06, 0.16, 0.19, BZ0 + 0.06, BZ1 - 0.06, GRIS_OSC)       # estante
N_BANDEJAS = 6
PASO = (BZ1 - BZ0) / N_BANDEJAS
bandejas = []
for i in range(N_BANDEJAS):
    zc = BZ0 + PASO * (i + 0.5)
    x0, x1, z0, z1, y0 = BX0 + 0.12, BX1 - 0.04, zc - PASO / 2 + 0.015, zc + PASO / 2 - 0.015, BY + 0.004
    caja(banco, x0, x1, y0, y0 + 0.006, z0, z1, GRIS_OSC)                                # fondo
    caja(banco, x0 + 0.01, x1 - 0.01, y0 + 0.006, y0 + 0.02, z0 + 0.01, z1 - 0.01, ESPUMA)   # espuma
    for (a, b_, c, d) in ((x0, x1, z0, z0 + 0.008), (x0, x1, z1 - 0.008, z1), (x0, x0 + 0.008, z0, z1), (x1 - 0.008, x1, z0, z1)):
        caja(banco, a, b_, y0, y0 + 0.04, c, d, GRIS_OSC)                                # bordes
    bandejas.append({'centro': [round((x0 + x1) / 2, 4), round(y0 + 0.02, 4), round(zc, 4)], 'z0': round(z0, 4), 'z1': round(z1, 4)})

# ---------------------------------------------------------------- herramientas de geometría de las piezas
def torno(m, perfil, centro, eje='x', n=16, fase=0.0):
    """revoluciona un perfil [(radio, t, color)] (t a lo largo del eje, en metros) alrededor de 'x' | 'y' | 'z' por centro"""
    cx, cy, cz = centro
    def P(r, t, a):
        u, v = r * math.cos(a + fase), r * math.sin(a + fase)
        if eje == 'x': return (cx + t, cy + u, cz + v)
        if eje == 'y': return (cx + u, cy + t, cz + v)
        return (cx + u, cy + v, cz + t)
    for (r0, t0, col), (r1, t1, _) in zip(perfil, perfil[1:]):
        if r0 == 0 and r1 == 0: continue
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            if r0 == 0:
                m.cara([P(0, t0, 0), P(r1, t1, a1), P(r1, t1, a0)], [col] * 3)
            elif r1 == 0:
                m.cara([P(r0, t0, a0), P(r0, t0, a1), P(0, t1, 0)], [col] * 3)
            else:
                m.quad(P(r0, t0, a0), P(r0, t0, a1), P(r1, t1, a1), P(r1, t1, a0), col)

def barra(m, a, b, w, col):
    import mathutils
    A, B = mathutils.Vector(a), mathutils.Vector(b)
    d = (B - A).normalized()
    ref = mathutils.Vector((0, 1, 0)) if abs(d.y) < 0.9 else mathutils.Vector((1, 0, 0))
    u = d.cross(ref).normalized() * (w / 2)
    v = d.cross(u).normalized() * (w / 2)
    esq = [u + v, -u + v, -u - v, u - v]
    pa, pb = [tuple(A + e) for e in esq], [tuple(B + e) for e in esq]
    for i in range(4):
        j = (i + 1) % 4
        m.quad(pa[i], pa[j], pb[j], pb[i], col)

def disco(m, c, r, normal_y=True, col=NEGRO, n=10):
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        m.cara([c, (c[0] + r * math.cos(a1), c[1], c[2] + r * math.sin(a1)), (c[0] + r * math.cos(a0), c[1], c[2] + r * math.sin(a0))], [col] * 3)

piezas = []
def pieza(clave, nombre, estacion, i, m, alto):
    piezas.append({'clave': clave, 'nombre': nombre, 'estacion': estacion, 'bandeja': i, 'malla': m, 'alto': alto})

def en_bandeja(i, alto):
    """el punto donde apoya una pieza acostada en la bandeja i (sobre la espuma), con su eje a lo largo de x"""
    c = bandejas[i]['centro']
    return (c[0], c[1] + alto, c[2])

# 1 · IGNITOR (bujía de encendido): punta de cerámica, cuerpo roscado, hexágono, cuerpo y conector de bronce · ~110 mm
m1 = Malla()
c = en_bandeja(0, 11 * mm)
x0 = c[0] - 55 * mm
perfil = [(0, 0, CERAMICA), (4 * mm, 0, CERAMICA), (4 * mm, 6 * mm, ACERO), (7 * mm, 6 * mm, ACERO), (7 * mm, 28 * mm, ACERO),
          (8 * mm, 40 * mm, ACERO), (8 * mm, 95 * mm, NIQUEL), (9.5 * mm, 95 * mm, BRONCE), (9.5 * mm, 110 * mm, BRONCE), (0, 110 * mm, BRONCE)]
torno(m1, perfil, (x0, c[1], c[2]), 'x')
torno(m1, [(0, 28 * mm, ACERO_OSC), (11 * mm, 28 * mm, ACERO_OSC), (11 * mm, 40 * mm, ACERO_OSC), (0, 40 * mm, ACERO_OSC)], (x0, c[1], c[2]), 'x', n=6)
for k in range(10):                                                                      # filetes de la rosca
    t = 8 * mm + k * 2 * mm
    torno(m1, [(7 * mm, t, ACERO_OSC), (7.6 * mm, t + 0.6 * mm, ACERO_OSC), (7 * mm, t + 1.2 * mm, ACERO_OSC)], (x0, c[1], c[2]), 'x', n=12)
pieza('ignitor', 'Ignitor', 3, 0, m1, 11 * mm)

# 2 · INYECTOR DE COMBUSTIBLE: punta, cuerpo, brida con dos agujeros y la entrada de combustible · ~75 mm
m2 = Malla()
c = en_bandeja(1, 9 * mm)
x0 = c[0] - 40 * mm
torno(m2, [(0, 0, NIQUEL), (2.5 * mm, 0, NIQUEL), (4 * mm, 3 * mm, NIQUEL), (4 * mm, 12 * mm, ACERO), (7 * mm, 14 * mm, ACERO), (7 * mm, 48 * mm, ACERO),
           (0, 48 * mm, ACERO)], (x0, c[1], c[2]), 'x')
caja(m2, x0 + 48 * mm, x0 + 51 * mm, c[1] - 9 * mm, c[1] + 9 * mm, c[2] - 20 * mm, c[2] + 20 * mm, ACERO_OSC)          # brida
for dz in (-14 * mm, 14 * mm):
    torno(m2, [(3 * mm, 0, NEGRO), (3 * mm, 3.4 * mm, NEGRO)], (x0 + 47.8 * mm, c[1], c[2] + dz), 'x', n=8)   # agujeros
torno(m2, [(4.5 * mm, 0, BRONCE), (4.5 * mm, 22 * mm, BRONCE), (6 * mm, 22 * mm, BRONCE), (6 * mm, 30 * mm, BRONCE), (0, 30 * mm, BRONCE)],
      (x0 + 51 * mm, c[1], c[2]), 'x', n=12)                                                                     # entrada (tuerca)
pieza('inyector', 'Inyector de combustible', 3, 1, m2, 9 * mm)

# 3 · ÁLABE de la turbina del compresor: perfil curvo con torsión, plataforma y raíz de «pino» · ~70 mm
m3 = Malla()
c = en_bandeja(2, 7 * mm)
xr = c[0] + 30 * mm                                                                      # la raíz hacia afuera (+x), la punta hacia el alumno
def seccion(s):
    """perfil del álabe a la altura s (0 raíz … 1 punta): 10 puntos alrededor, en el plano (y, z), con torsión"""
    cuerda, esp, comba, giro = (24 - 4 * s) * mm, (4.2 - 2 * s) * mm, 3.5 * mm, math.radians(-8 + 22 * s)
    pts = []
    for k in range(5):
        u = k / 4
        yc = comba * 4 * u * (1 - u)
        t = esp * 2.2 * math.sqrt(max(u, 1e-4)) * (1 - u)
        pts.append((u * cuerda - cuerda / 2, yc + t / 2))
    for k in range(4, -1, -1):
        u = k / 4
        yc = comba * 4 * u * (1 - u)
        t = esp * 2.2 * math.sqrt(max(u, 1e-4)) * (1 - u)
        pts.append((u * cuerda - cuerda / 2, yc - t / 2))
    cg, sg = math.cos(giro), math.sin(giro)
    return [(a * cg - b_ * sg, a * sg + b_ * cg) for a, b_ in pts]
ALTO_ALABE = 42 * mm
anillos = []
for k in range(6):
    s = k / 5
    x = xr - 14 * mm - s * ALTO_ALABE
    anillos.append([(x, c[1] + b_, c[2] + a) for a, b_ in seccion(s)])
for A, B in zip(anillos, anillos[1:]):
    for j in range(len(A)):
        j2 = (j + 1) % len(A)
        m3.quad(A[j], A[j2], B[j2], B[j], INCONEL)
punta = anillos[-1]
for j in range(1, len(punta) - 1):
    m3.cara([punta[0], punta[j], punta[j + 1]], [mezclar(INCONEL, 1.1)] * 3)
caja(m3, xr - 14 * mm, xr - 11 * mm, c[1] - 6 * mm, c[1] + 6 * mm, c[2] - 15 * mm, c[2] + 15 * mm, mezclar(INCONEL, 0.9))   # plataforma
# raíz de pino: perfil en zigzag (en el plano x-z), extruido en y
diente = [(0, 9), (3, 9), (4, 7), (7, 8), (8, 6), (11, 6.5), (12, 4.5), (14, 4.5)]
lado = [(xr - 11 * mm + a * mm, b_ * mm) for a, b_ in diente]
for (xa, za), (xb, zb) in zip(lado, lado[1:]):
    for sz in (-1, 1):
        m3.quad((xa, c[1] - 5 * mm, c[2] + sz * za), (xb, c[1] - 5 * mm, c[2] + sz * zb), (xb, c[1] + 5 * mm, c[2] + sz * zb), (xa, c[1] + 5 * mm, c[2] + sz * za), mezclar(INCONEL, 0.85))
for sy in (-1, 1):
    poli = [(x, c[1] + sy * 5 * mm, c[2] + z) for x, z in lado] + [(x, c[1] + sy * 5 * mm, c[2] - z) for x, z in reversed(lado)]
    for j in range(1, len(poli) - 1):
        m3.cara([poli[0], poli[j], poli[j + 1]], [mezclar(INCONEL, 0.85)] * 3)
pieza('alabe', 'Álabe de la turbina del compresor', 4, 2, m3, 7 * mm)

# 4 · SECTOR DE LA MALLA DE ADMISIÓN: un arco de 60° de la malla cilíndrica (radio 200 mm, 110 mm de alto), con su marco
m4 = Malla()
c = en_bandeja(3, 0)
R4, ALTO4, ANG = 0.2, 0.11, math.radians(60)
cxa = c[0] - R4 * math.cos(ANG / 2) + 0.02                                               # el centro del arco, para que el sector quede en la bandeja
def pa(a, y):
    return (cxa + R4 * math.cos(a), c[1] + y, c[2] + R4 * math.sin(a))
N = 12
for k in range(N):                                                                       # marco: aros de arriba y de abajo
    a0, a1 = -ANG / 2 + ANG * k / N, -ANG / 2 + ANG * (k + 1) / N
    for y in (0.003, ALTO4 - 0.003):
        barra(m4, pa(a0, y), pa(a1, y), 0.006, ACERO_OSC)
for a in (-ANG / 2, ANG / 2):
    barra(m4, pa(a, 0), pa(a, ALTO4), 0.006, ACERO_OSC)
for k in range(1, 26):                                                                   # alambres verticales cada ~8 mm
    a = -ANG / 2 + ANG * k / 26
    barra(m4, pa(a, 0.003), pa(a, ALTO4 - 0.003), 0.0012, ACERO)
for j in range(1, 13):                                                                   # y horizontales
    y = ALTO4 * j / 13
    for k in range(N):
        a0, a1 = -ANG / 2 + ANG * k / N, -ANG / 2 + ANG * (k + 1) / N
        barra(m4, pa(a0, y), pa(a1, y), 0.0012, ACERO)
pieza('malla', 'Sector de la malla de admisión', 1, 3, m4, 0)

# 5 · DETECTOR DE VIRUTAS: punta magnética, rosca, hexágono y conector · ~62 mm
m5 = Malla()
c = en_bandeja(4, 11 * mm)
x0 = c[0] - 31 * mm
torno(m5, [(0, 0, NEGRO), (3 * mm, 0, NEGRO), (3 * mm, 9 * mm, NEGRO), (7 * mm, 9 * mm, ACERO), (7 * mm, 24 * mm, ACERO), (0, 24 * mm, ACERO)],
      (x0, c[1], c[2]), 'x')
torno(m5, [(0, 24 * mm, ACERO_OSC), (11 * mm, 24 * mm, ACERO_OSC), (11 * mm, 32 * mm, ACERO_OSC), (0, 32 * mm, ACERO_OSC)], (x0, c[1], c[2]), 'x', n=6)
torno(m5, [(0, 32 * mm, NIQUEL), (8 * mm, 32 * mm, NIQUEL), (8 * mm, 42 * mm, NIQUEL), (9.5 * mm, 42 * mm, BRONCE), (9.5 * mm, 62 * mm, BRONCE), (0, 62 * mm, BRONCE)],
      (x0, c[1], c[2]), 'x')
for k in range(7):
    t = 11 * mm + k * 2 * mm
    torno(m5, [(7 * mm, t, ACERO_OSC), (7.5 * mm, t + 0.6 * mm, ACERO_OSC), (7 * mm, t + 1.2 * mm, ACERO_OSC)], (x0, c[1], c[2]), 'x', n=12)
pieza('detector', 'Detector de virutas', 6, 4, m5, 11 * mm)

# 6 · TERMOCUPLA DE ITT: la sonda, la brida con dos agujeros y la bornera con sus dos bornes (cromel y alumel) · ~95 mm
m6 = Malla()
c = en_bandeja(5, 7 * mm)
x0 = c[0] - 47 * mm
torno(m6, [(0, 0, INCONEL), (2.5 * mm, 1 * mm, INCONEL), (2.5 * mm, 70 * mm, INCONEL), (0, 70 * mm, INCONEL)], (x0, c[1], c[2]), 'x', n=10)
caja(m6, x0 + 70 * mm, x0 + 72 * mm, c[1] - 7 * mm, c[1] + 7 * mm, c[2] - 13 * mm, c[2] + 13 * mm, ACERO_OSC)        # brida
for dz in (-9 * mm, 9 * mm):
    torno(m6, [(2 * mm, 0, NEGRO), (2 * mm, 2.4 * mm, NEGRO)], (x0 + 69.8 * mm, c[1], c[2] + dz), 'x', n=8)
caja(m6, x0 + 72 * mm, x0 + 86 * mm, c[1] - 6 * mm, c[1] + 6 * mm, c[2] - 6 * mm, c[2] + 6 * mm, CERAMICA)          # bornera
for dz, col in ((-3 * mm, NIQUEL), (3 * mm, COBRE)):
    torno(m6, [(0, 0, col), (1.6 * mm, 0, col), (1.6 * mm, 9 * mm, col), (0, 9 * mm, col)], (x0 + 86 * mm, c[1], c[2] + dz), 'x', n=8)
pieza('termocupla', 'Termocupla de ITT', 4, 5, m6, 7 * mm)

if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = [banco.construir('banco_componentes', 'banco_componentes')]
    for p in piezas:
        o = p['malla'].construir(f"pieza_{p['clave']}", 'pieza')
        o['pieza'] = p['clave']
        o['nombre'] = p['nombre']
        o['estacion'] = p['estacion']
        o['bandeja'] = p['bandeja']
        objs.append(o)
        bandejas[p['bandeja']]['pieza'] = p['clave']
        bandejas[p['bandeja']]['nombre'] = p['nombre']
    objs[0]['banco'] = json.dumps({'bandejas': bandejas, 'frente_x': BX0, 'tapa_y': BY, 'caja': [BX0, BX1, BZ0, BZ1]})
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
    print(f'  presupuesto → {sum(tri.values())} triángulos · {len(objs)} llamadas · {peso / 1e6:.3f} MB · {tri}')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': 'T8 tramo 1 (adelantado)', 'triangulos': tri, 'llamadas': len(objs), 'mb': round(peso / 1e6, 3), 'bandejas': bandejas,
                   'nota': 'medidas genéricas [VERIFICAR], no del manual'}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
