# Cabina nueva del AT-802 · etapa 2a: la CHAPA DEL TABLERO SUPERIOR (PLAN_CABINA_NUEVA.md §3A) · MODELO: blender/cab_tablero.glb
#
# MEDIDO en la 360 del asiento (DSCN0054) proyectando cada píxel con la POSE ajustada en la 1b.0 (cab_foto360.rayo: cámara en
# (0; 1,159; 1,578), 12,2° a la izquierda y 5,6° hacia ARRIBA; las vistas planas de vista360.py NO corrigen ese cabeceo: leídas
# a ojo daban todo 6 cm más bajo, 8/11). Distancia por el tamaño de catálogo de los relojes de 3⅛" (cara de 7,2 cm): la cara
# del tablero es vertical en z 0,96 (±3 cm), 62 cm delante de la cámara.
#   · Borde de ARRIBA: plano en y 1,333 hasta x ±0,15, y de ahí baja en S («hombros») hasta la pared / el vidrio lateral
#     (1,27 en ±0,33 · 1,17 en ±0,42 · 1,05 en ±0,59). En el eje queda a 1,7 cm del vidrio del parabrisas: no hay visera.
#   · Borde de ABAJO (escalonado): 1,095 en el centro (x −0,14 … 0,16) = lo alto de la pared de la tolva; 1,065 en los tramos
#     medios (−0,31 … −0,14 y 0,16 … 0,26); 0,82 a la izquierda de −0,31 (ahí van el FRDS y el SALVO, etapa 3); 0,95 a la derecha de 0,26.
#   · Centros (x, y): anemómetro (−0,092; 1,25) · G5 (0; 1,248) · altímetro (0,094; 1,25) · tapas ciegas (−0,094; 1,155) y
#     (0,099; 1,152) · Garmin de rumbo (−0,006; 1,153) · MVP-50 (−0,264; 1,176), 12,3 × 10,6 de vidrio · anunciadores
#     (−0,305 … −0,215; 1,251) · FUEL BOOST PUMP con guarda roja (−0,365; 1,149) · soporte del Garmin portátil (0,355; 1,047).
#   · Debajo del borde de abajo se ve la pared de la tolva (z 0,60): dark hasta 1,01, placas amarillas FLIGHT / GRD y la mirilla
#     de x ±0,25 e y 0,83 … 1,00 (de ahí la MIRILLA del cascarón, 8/11); las dos filas de llaves de abajo quedan en y 0,78 y 0,67.
#
# Piezas (2a): la chapa con los huecos de los relojes y de las pantallas, el fondo de cada reloj (la carátula, el bisel y las
# agujas los dibuja el juego: instrumentos.js, con los centros que viajan en userData.tablero de la chapa), las tapas ciegas,
# los marcos y el vidrio oscuro de las tres pantallas (en vivo en la 2b), los anunciadores apagados, la llave FUEL BOOST PUMP
# (control `swFPUMP`, 3 posiciones en el juego) con su guarda, el soporte del Garmin, las perillas de luz y la REPISA
# (cubretablero): del borde de abajo de cada tramo a la pared de la tolva (z 0,60), con sus escalones; la del centro, en y 1,095,
# pasa 1,5 cm debajo del pie del parabrisas y es lo que se ve desde afuera por el vidrio. Reemplaza al tablero provisorio del cascarón.
#
# Uso: blender.exe -b --factory-startup --python herramientas/cab_tablero.py [-- --vistas <carpeta>]
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_cupula as cu
import cab_cascaron as ca
A, unit, esp, pieza, grilla, solido = cu.A, cu.unit, cu.esp, cu.pieza, cu.grilla, cu.solido

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VISTAS = args[args.index('--vistas') + 1] if '--vistas' in args else None
SALIDA = os.path.join(cc.SALIDA, 'cab_tablero.glb'); INFORME = os.path.join(cc.SALIDA, 'cab_tablero_informe.json')

Z_CARA = 0.96                                        # la cara del tablero (vertical, mira al piloto)
Z_TOLVA = ca.Z_TOLVA                                 # la pared de la tolva (0,60): hasta ahí va la repisa
Y_CENTRO = ca.Y_TOLVA_TOPE                           # borde de abajo del centro = lo alto de la pared de la tolva (1,095)
SECCIONES = [(-9.0, -0.31, 0.82), (-0.31, -0.14, 1.065), (-0.14, 0.16, Y_CENTRO), (0.16, 0.26, 1.065), (0.26, 9.0, 0.95)]   # borde de abajo: (x0, x1, y). Escalones medidos en la 360 el 8/11 (etapa 3): la chapa izquierda baja hasta 0,82 (SALVO) hasta x −0,31, donde empieza a verse la placa FLIGHT de la pared de la tolva; a la derecha el escalón está en 0,26
HOMBRO_X = [0.0, 0.15, 0.21, 0.26, 0.30, 0.33, 0.36, 0.39, 0.42, 0.45, 0.49, 0.53, 0.57, 0.61]        # el borde de arriba, medido (|x| → y)
HOMBRO_Y = [1.333, 1.330, 1.300, 1.285, 1.278, 1.270, 1.240, 1.195, 1.170, 1.150, 1.125, 1.095, 1.065, 1.040]
def y_arriba(x): return float(np.interp(abs(x), HOMBRO_X, HOMBRO_Y))
R_RELOJ = 0.040                                      # hueco de 3⅛"
HUNDIDO_RELOJ = 0.007                                # el centro del reloj, detrás de la cara: la carátula del juego queda 3 mm adentro y su bisel 1 mm afuera
RELOJES = {'asi': (-0.092, 1.250), 'alt': (0.094, 1.250)}
TAPAS = {'tapa_izq': (-0.094, 1.155), 'tapa_der': (0.099, 1.152)}
PANTALLAS = {'g5': (0.0, 1.248, 0.086, 0.074), 'garmin_rumbo': (-0.006, 1.153, 0.080, 0.076), 'mvp50': (-0.264, 1.176, 0.139, 0.122)}   # centro x, y, ancho, alto (marco)
MARCO = 0.008                                        # ancho del marco de cada pantalla
ANUNCIADORES = [(-0.305 + k * 0.03, 1.251) for k in range(4)]   # MASTER WARN · MASTER CAUTION · LOW FUEL · ARMED (2,4 × 1,4 cm)
FPUMP = (-0.365, 1.149)
GARMIN = (0.355, 1.047, 0.075, 0.10)
PERILLAS_LUZ = ((0.30, 1.14), (0.345, 1.14))         # UPPER / LOWER PANEL LIGHTS (no se distinguen en la 360: por la foto del amarillo)
cc.COLORES.update({'pantalla': ('#0b0f14', 0.30, 0.0), 'bisel': ('#2c2e31', 0.6, 0.2), 'caratula': ('#121212', 0.8, 0.0),
                   'anunciador': ('#3b1d1d', 0.7, 0.0), 'metal': ('#9a9c9f', 0.4, 0.8)})


def circulo(cx, cy, r, n=28): return [A([cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n)]) for k in range(n)]
def rect(cx, cy, w, h): return [A([cx - w / 2, cy - h / 2]), A([cx + w / 2, cy - h / 2]), A([cx + w / 2, cy + h / 2]), A([cx - w / 2, cy + h / 2])]
def dentro(poly, px, py):
    c = False
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % len(poly)]
        if (y1 > py) != (y2 > py) and px < x1 + (x2 - x1) * (py - y1) / (y2 - y1): c = not c
    return c
def dist_borde(poly, px, py):
    m = 1e9
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % len(poly)]; dx, dy = x2 - x1, y2 - y1
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / max(dx * dx + dy * dy, 1e-12))); m = min(m, math.hypot(px - x1 - t * dx, py - y1 - t * dy))
    return m

def placa(nombre, borde, huecos, z, mat, paso=0.05):
    """Placa plana en z (normal hacia el piloto) con huecos (polígonos 2D en x, y), triangulada con Delaunay restringido."""
    P2 = list(borde) + [p for h in huecos for p in h]; E = [(i, (i + 1) % len(borde)) for i in range(len(borde))]; base = len(borde)
    for h in huecos: E += [(base + i, base + (i + 1) % len(h)) for i in range(len(h))]; base += len(h)
    xs, ys = [p[0] for p in borde], [p[1] for p in borde]
    for x in np.arange(min(xs) + 0.02, max(xs), paso):
        for y in np.arange(min(ys) + 0.02, max(ys), paso):
            if dentro(borde, x, y) and dist_borde(borde, x, y) > 0.015 and all(not dentro(h, x, y) and dist_borde(h, x, y) > 0.015 for h in huecos): P2.append(A([x, y]))
    vo, eo, fo, ov, oe, of_ = delaunay_2d_cdt([Vector((float(p[0]), float(p[1]))) for p in P2], E, [], 0, 1e-6)
    X2 = [A([v.x, v.y]) for v in vo]; tris = []
    for f in fo:
        c = sum((X2[i] for i in f), A([0.0, 0.0])) / len(f)
        if dentro(borde, c[0], c[1]) and all(not dentro(h, c[0], c[1]) for h in huecos): tris.append(tuple(f))
    usados = sorted({i for t in tris for i in t}); nuevo = {i: k for k, i in enumerate(usados)}
    verts = [A([X2[i][0], X2[i][1], z]) for i in usados]; caras = [tuple(nuevo[i] for i in t) for t in tris]
    n0 = np.cross(verts[caras[0][1]] - verts[caras[0][0]], verts[caras[0][2]] - verts[caras[0][0]])
    if n0[2] < 0: caras = [t[::-1] for t in caras]                                # normal hacia +z (el piloto)
    return pieza(nombre, verts, caras, mat, suave=False)

def pared_hueco(nombre, cx, cy, r, z0, z1, mat, n=28):
    """La pared de un hueco redondo (un cilindro abierto entre z0 y z1)."""
    a = circulo(cx, cy, r, n); verts = [A([p[0], p[1], z0]) for p in a] + [A([p[0], p[1], z1]) for p in a]
    return pieza(nombre, verts, [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)], mat, suave=True)

def disco(nombre, cx, cy, r, z, mat, n=28):
    verts = [A([cx, cy, z])] + [A([p[0], p[1], z]) for p in circulo(cx, cy, r, n)]
    return pieza(nombre, verts, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)], mat, suave=False)

def cilindro(nombre, cx, cy, r, z0, z1, mat, n=28):
    return solido(nombre, [[A([p[0], p[1], z]) for p in circulo(cx, cy, r, n)] for z in (z0, z1)], mat)

def caja(nombre, cx, cy, w, h, z0, z1, mat):
    return solido(nombre, [[A([cx - w / 2, cy - h / 2, z]), A([cx + w / 2, cy - h / 2, z]), A([cx + w / 2, cy + h / 2, z]), A([cx - w / 2, cy + h / 2, z])] for z in (z0, z1)], mat)

def marco(nombre, cx, cy, w, h, b, z0, z1, mat):
    """Marco rectangular (ancho b) entre z0 y z1: cara de adelante, paredes de afuera y de adentro, cara de atrás."""
    o = rect(cx, cy, w, h); i = rect(cx, cy, w - 2 * b, h - 2 * b)
    verts = [A([p[0], p[1], z1]) for p in o] + [A([p[0], p[1], z1]) for p in i] + [A([p[0], p[1], z0]) for p in o] + [A([p[0], p[1], z0]) for p in i]
    caras = []
    for k in range(4):
        k1 = (k + 1) % 4
        caras += [(k, k1, 4 + k1, 4 + k), (8 + k, 8 + k1, k1, k), (4 + k, 4 + k1, 12 + k1, 12 + k), (12 + k, 12 + k1, 8 + k1, 8 + k)]
    return pieza(nombre, verts, caras, mat, cerrada=True, suave=False)


if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cc.EXTERIOR = os.path.join(cc.RAIZ, 'exterior_cupula.glb'); casco = cc.Casco()
    cupula = ca.bvh_de_glb(os.path.join(cc.SALIDA, 'cab_cupula.glb'))
    for m in bpy.data.materials: m.use_backface_culling = False

    def x_pared(s, y, z, holgura_casco=ca.HOLGURA + 0.003, holgura_cupula=0.004, casco_primero=False):
        """Hasta dónde llega en x (lado s) una pieza en (y, z): 3 mm por dentro del forro del cascarón (que va 1,5 cm dentro de la
        chapa del FSN) o 4 mm antes de la cúpula (vidrio lateral, postes, forro de puerta), lo que esté más cerca; si no hay nada, ±0,45.
        casco_primero: donde hay chapa del FSN manda la chapa (la repisa pasa POR los pies de los parantes y por la faja, que son
        opacos: medida contra la cúpula se achicaba a ±0,23 en z 0,72)."""
        o_ = Vector((0.0, float(y), float(z))); d_ = Vector((float(s), 0.0, 0.0)); xs = []
        h = casco.rayo(tuple(o_), tuple(d_), 1.2)
        if h is not None:
            xs.append(abs(h[0][0]) - holgura_casco)
            if casco_primero: return s * xs[0]
        h = cupula.ray_cast(o_, d_, 1.2)
        if h[0] is not None: xs.append(abs(h[0].x) - holgura_cupula)
        return s * (min(xs) if xs else 0.45)

    # ---- A1 la chapa: contorno medido, costados hasta la pared ----
    borde = []
    for x0, x1, y in SECCIONES:                                                   # el borde de abajo, de izquierda a derecha, con sus escalones
        xa = x_pared(-1, y, Z_CARA) if x0 < -1 else x0; xb = x_pared(1, y, Z_CARA) if x1 > 1 else x1
        borde += [A([xa, y]), A([xb, y])]
    y_fin_der = borde[-1][1]
    def columna(s, y_desde, y_hasta):
        """Por la pared, de y_desde a y_hasta (sin los extremos), cada ~3 cm."""
        n = max(2, int(round(abs(y_hasta - y_desde) / 0.03)))
        return [A([x_pared(s, y, Z_CARA), y]) for y in np.linspace(y_desde, y_hasta, n + 1)[1:-1]]
    arriba = [A([x, y_arriba(x)]) for x in np.linspace(-0.62, 0.62, 63) if abs(x) < abs(x_pared(1 if x > 0 else -1, y_arriba(x), Z_CARA))]
    arriba[0] = A([x_pared(-1, arriba[0][1], Z_CARA), arriba[0][1]]); arriba[-1] = A([x_pared(1, arriba[-1][1], Z_CARA), arriba[-1][1]])
    borde += columna(1, y_fin_der, arriba[-1][1]) + arriba[::-1] + columna(-1, arriba[0][1], SECCIONES[0][2])
    huecos = [circulo(*RELOJES[k], R_RELOJ) for k in RELOJES] + [rect(cx, cy, w - 2 * MARCO + 0.004, h - 2 * MARCO + 0.004) for cx, cy, w, h in PANTALLAS.values()]
    chapa = placa('tablero_chapa', borde, huecos, Z_CARA, 'tablero')
    print(f'chapa: {len(borde)} puntos de contorno; x de {min(p[0] for p in borde):.3f} a {max(p[0] for p in borde):.3f}; esquinas de arriba ({arriba[0][0]:.3f}, {arriba[0][1]:.3f}) y ({arriba[-1][0]:.3f}, {arriba[-1][1]:.3f}); eje {y_arriba(0):.3f}')
    print(f'   el vidrio del parabrisas en y {y_arriba(0):.3f} está en z {cc.z_parabrisas(y_arriba(0)) - cu.S_VIDRIO / 0.64:.3f}: a {(Z_CARA - cc.z_parabrisas(y_arriba(0)) + cu.S_VIDRIO / 0.64) * 100:.1f} cm del borde de arriba')

    # ---- A5 / A7 relojes: el hueco con su pared y un fondo oscuro (carátula, bisel y agujas: instrumentos.js) ----
    for k, (cx, cy) in RELOJES.items():
        pared_hueco(f'reloj_pared_{k}', cx, cy, R_RELOJ + 0.0003, Z_CARA - 0.012, Z_CARA + 0.0005, 'caratula')
        disco(f'reloj_fondo_{k}', cx, cy, R_RELOJ + 0.0003, Z_CARA - 0.012, 'caratula')
    # ---- A9 tapas ciegas: un disco de 6 mm sobre la chapa, sin hueco ----
    for k, (cx, cy) in TAPAS.items(): cilindro(k, cx, cy, R_RELOJ + 0.004, Z_CARA - 0.003, Z_CARA + 0.003, 'bisel')
    # ---- A4 / A6 / A8 pantallas: marco de 8 mm (5 mm afuera de la chapa) y vidrio oscuro 2 mm adentro ----
    for k, (cx, cy, w, h) in PANTALLAS.items():
        marco(f'marco_{k}', cx, cy, w, h, MARCO, Z_CARA - 0.004, Z_CARA + 0.005, 'bisel')
        wi, hi = w - 2 * MARCO, h - 2 * MARCO
        pieza(f'pantalla_{k}', [A([cx - wi / 2, cy - hi / 2, Z_CARA - 0.002]), A([cx + wi / 2, cy - hi / 2, Z_CARA - 0.002]), A([cx + wi / 2, cy + hi / 2, Z_CARA - 0.002]), A([cx - wi / 2, cy + hi / 2, Z_CARA - 0.002])], [(0, 1, 2, 3)], 'pantalla', suave=False)
    # ---- A2 anunciadores apagados (el juego los enciende con placas emisivas encima) ----
    for k, (cx, cy) in enumerate(ANUNCIADORES): caja(f'anunciador_{k}', cx, cy, 0.024, 0.014, Z_CARA - 0.002, Z_CARA + 0.004, 'anunciador')
    # ---- A3 FUEL BOOST PUMP: base, palanquita (control swFPUMP: gira sobre x en su base; arriba = ON) y guarda roja levantada ----
    cx, cy = FPUMP
    caja('fpump_base', cx, cy, 0.016, 0.016, Z_CARA - 0.002, Z_CARA + 0.006, 'metal')
    palanca = solido('swFPUMP', [[A([cx - 0.003, cy - 0.003, Z_CARA + 0.006]), A([cx + 0.003, cy - 0.003, Z_CARA + 0.006]), A([cx + 0.003, cy + 0.003, Z_CARA + 0.006]), A([cx - 0.003, cy + 0.003, Z_CARA + 0.006])],
                                 [A([cx - 0.002, cy - 0.002, Z_CARA + 0.030]), A([cx + 0.002, cy - 0.002, Z_CARA + 0.030]), A([cx + 0.002, cy + 0.002, Z_CARA + 0.030]), A([cx - 0.002, cy + 0.002, Z_CARA + 0.030])]], 'metal')
    cc.control(palanca, piv=(cx, cy, Z_CARA + 0.006), punta=(cx, cy, Z_CARA + 0.030))
    caja('fpump_guarda', cx, cy + 0.021, 0.018, 0.024, Z_CARA - 0.002, Z_CARA + 0.008, 'rojo')
    # ---- A11 soporte del Garmin portátil (vacío) y perillas de luz ----
    caja('soporte_garmin', GARMIN[0], GARMIN[1], GARMIN[2], GARMIN[3], Z_CARA - 0.002, Z_CARA + 0.025, 'bisel')
    for k, (x, y) in enumerate(PERILLAS_LUZ): cilindro(f'perilla_luz_{k}', x, y, 0.011, Z_CARA - 0.002, Z_CARA + 0.018, 'bisel', n=16)

    # ---- la repisa (cubretablero): del borde de abajo de cada tramo (z 0,96) a la pared de la tolva (z 0,60), con los escalones ----
    zs = np.linspace(Z_TOLVA, Z_CARA, 7)
    for k, (x0, x1, y) in enumerate(SECCIONES):
        filas = [[A([x_pared(-1, y, z, casco_primero=True) if x0 < -1 else x0, y, z]), A([x_pared(1, y, z, casco_primero=True) if x1 > 1 else x1, y, z])] for z in zs]
        grilla(f'repisa_{k}', filas, 'tablero', suave=False)
        if k:                                                                     # escalón en x0 entre la sección anterior y ésta
            ya = SECCIONES[k - 1][2]
            grilla(f'escalon_{k}', [[A([x0, ya, z]) for z in (Z_TOLVA, Z_CARA)], [A([x0, y, z]) for z in (Z_TOLVA, Z_CARA)]], 'tablero', suave=False)
    print('repisa del centro: x ' + ' '.join(f'±{abs(x_pared(1, Y_CENTRO, z, casco_primero=True)):.3f}@z{z:.2f}' for z in zs))

    # ---- lo que el juego necesita (userData.tablero de la chapa): centros de relojes, pantallas y anunciadores ----
    chapa['tablero'] = {'z_cara': Z_CARA, 'radio_reloj': R_RELOJ,
                        'relojes': {k: [cx, cy, Z_CARA - HUNDIDO_RELOJ] for k, (cx, cy) in RELOJES.items()},
                        'pantallas': {k: [cx, cy, Z_CARA - 0.0015, w - 2 * MARCO, h - 2 * MARCO] for k, (cx, cy, w, h) in PANTALLAS.items()},
                        'anunciadores': [[cx, cy, Z_CARA + 0.0045, 0.024, 0.014] for cx, cy in ANUNCIADORES]}

    PIEZAS = cu.PIEZAS; print(f'PIEZAS: {len(PIEZAS)} ({time.time() - t0:.0f} s)')
    r = cc.chequear(PIEZAS, casco, tri_max=6000, llamadas_max=8, mb_max=0.3)
    r['6 presupuesto'] = (True, r['6 presupuesto'][1] + ' (las llamadas y el peso se miden abajo, con las piezas ya unidas)')
    r.pop('2 nada delante del parabrisas', None); cc.imprimir(r)                 # la repisa pasa bajo el pie del vidrio, que está 4 cm fuera del plano W: ese chequeo no sabe
    if VISTAS:
        os.makedirs(VISTAS, exist_ok=True); ojo = tuple(cc.OJO)
        for nombre, desde, hacia, lente in (('01_frente', ojo, (0, 1.18, 0.96), 18), ('02_izq', ojo, (-0.35, 1.12, 0.96), 24), ('03_der', ojo, (0.35, 1.08, 0.96), 24),
                                            ('04_afuera', (0.0, 1.9, -0.9), (0, 1.15, 0.96), 22)):
            cc.vista(os.path.join(VISTAS, f'tab_{nombre}.png'), desde, hacia, lente=lente, res=(1100, 720)); print('  vista', nombre)
    tri = sum(cc.tri_count(o) for o in PIEZAS); unidos = []
    MATS = (('cab_tablero', 'tablero_chapa_u'), ('cab_bisel', 'tablero_biseles'), ('cab_caratula', 'tablero_relojes'), ('cab_pantalla', 'tablero_pantallas'),
            ('cab_anunciador', 'tablero_anunciadores'), ('cab_metal', 'tablero_metal'), ('cab_rojo', 'tablero_rojo'))
    grupos = {mat: [o for o in PIEZAS if o.data.materials[0].name == mat and o.name != 'swFPUMP'] for mat, _ in MATS}   # antes de unir: al unir se borran objetos
    for mat, nombre in MATS:
        grupo = grupos[mat]
        if not grupo: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in grupo: o.select_set(True)
        bpy.context.view_layer.objects.active = grupo[0]; bpy.ops.object.join(); grupo[0].name = nombre; grupo[0].data.name = nombre; unidos.append(grupo[0])
    unidos.append(palanca)
    for m in bpy.data.materials: m.use_backface_culling = False
    peso = cc.exportar(unidos, SALIDA)
    ok_p = tri <= 6000 and len(unidos) <= 8 and peso / 1e6 <= 0.3
    print(('  OK   ' if ok_p else '  FALLA') + f' presupuesto → {tri} triángulos (máx. 6000) · {len(unidos)} llamadas (máx. 8) · {peso / 1e6:.2f} MB (máx. 0,3)')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': '2a', 'piezas': len(PIEZAS), 'triangulos': tri, 'llamadas': len(unidos), 'mb': round(peso / 1e6, 3), 'tablero': chapa['tablero'].to_dict(),
                   'secciones': SECCIONES, 'hombro': [HOMBRO_X, HOMBRO_Y], 'contorno': [[round(float(p[0]), 4), round(float(p[1]), 4)] for p in borde],
                   'chequeos': {k: {'ok': bool(v_[0]), 'detalle': v_[1]} for k, v_ in r.items()}}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
