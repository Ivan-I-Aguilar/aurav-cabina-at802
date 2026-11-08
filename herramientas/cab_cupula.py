# Cúpula nueva del AT-802 · etapa 1b (PLAN_CUPULA.md) · MODELO: blender/cab_cupula.glb, por vértices, a partir de lo
# medido (blender/calcado/cupula_puntos.json, bloque «simetrico»: lado derecho; el izquierdo es su espejo).
#
# Etapa 1b.1 (5/11): jaula de caños, parabrisas de 3 paños, faja del parabrisas. Etapa 1b.2 (7/11): el techo con sus dos
# ventanas y el forro. Etapa 1b.3 (7/11): las puertas cerradas con su ventana y el ojo de buey, y el carenado trasero de
# chapa lisa (Iván: detrás de la puerta no va ventanilla, es todo fuselaje). Va sobre el FSN cortado (exterior_cupula.glb,
# de cab_cortar_fsn.py).
#
# Cómo está pensada (lo que mostraron las fotos de adentro y de afuera juntas):
#   · Lo que se ve DESDE EL ASIENTO son las caras de adentro de la estructura: el plano W del parabrisas (por los ejes
#     de los dos parantes, 50° desde la vertical) y, a los costados, el plano D de la puerta.
#   · El vidrio y las tapas blancas de afuera van unos 4 cm MÁS AFUERA que W (se ve en las dos 360 de afuera): cada
#     parante es una pieza gruesa, gris por dentro, con el vidrio y una tapa blanca por fuera.
#   · El paño central es plano; los laterales son CURVOS: del parante dan la vuelta hasta el poste de la puerta, y por
#     abajo siguen el borde del capó y del antepecho (superficie reglada entre ese borde y el borde de arriba).
#   · La jaula del techo: arco delantero, dos diagonales a la cabeza de los parantes, una V y un marco trasero.
#   · Los bordes medidos (parantes, cabezal, borde de arriba del paño lateral, poste de puerta) son lo que ve la cámara
#     de la 360 DESDE EL ASIENTO. Como cada pieza tiene fondo y la cámara las mira de costado, sus caras laterales van
#     sobre el plano que pasa por la cámara y por el borde medido («abanico»): así la silueta vista desde el asiento cae
#     donde se midió, tenga la pieza el fondo que tenga (chequeo «silueta desde la cámara de la 360»). Con caras
#     perpendiculares al paño los parantes se veían 3 cm más anchos que en la foto.
# Todo se apoya en el FSN con rayos (capó, antepecho, carenado trasero): lo que toca la chapa se mide, no se adivina.
#
# Uso: blender.exe -b --factory-startup --python herramientas/cab_cupula.py [-- --vistas <carpeta>]
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import delaunay_2d_cdt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_cortar_fsn as ccf

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VISTAS = args[args.index('--vistas') + 1] if '--vistas' in args else None
CAL = os.path.join(cc.RAIZ, 'blender', 'calcado')
SALIDA = os.path.join(cc.SALIDA, 'cab_cupula.glb')
INFORME = os.path.join(cc.SALIDA, 'cab_cupula_informe.json')

# ---------------- medidas del modelo (m) ----------------
S_VIDRIO = 0.040      # el vidrio del parabrisas, hacia afuera del plano W
D_DENTRO = 0.020      # cara de adentro de los parantes, hacia adentro de W (el parante mide 4,1 cm de fondo visto de costado)
D_POSTE = 0.036       # cara de afuera de la parte gris del parante
D_TAPA = 0.047        # cara de afuera de la tapa blanca
METE = 0.010          # cuánto se mete el vidrio debajo de las tapas
CABEZAL = 0.055       # alto del travesaño sobre el paño central (medido a lo largo del paño)
Y_PIE_PARANTE, Y_PIE_VIDRIO = 1.090, 1.110          # alturas (sobre W) donde parante y vidrio se hunden en el capó
CINTURON = 0.93       # el corte del FSN
Y_BAJO = 0.915        # hasta donde bajan vidrio lateral y postes, detrás de la chapa del antepecho
R_TUBO, R_LARGUERO = 0.0175, 0.016
POSTE_ANCHO, POSTE_FONDO = 0.085, 0.035   # poste de puerta delantero: ancho de la tapa blanca (del borde del paño lateral hacia atrás) y fondo de la caja oscura
TECHO_FUERA = 0.030   # la chapa del techo sobre el eje de los caños (queda ≈ 5,5 cm por fuera del techo del FSN, como se midió)
FORRO = 0.007         # el forro del techo, por dentro de la chapa (entre punto y punto queda a más de 3 mm de los caños)
NU, NV = 12, 8        # cuadrícula del paño lateral

cc.COLORES.update({'blanco': ('#ededec', 0.50, 0.0), 'vidrio_cup': ('#d5e3e8', 0.06, 0.0),
                   'marco': ('#2d2f33', 0.70, 0.1),      # parantes, cabezal y postes de puerta por dentro (casi negros en las fotos)
                   'forro': ('#3d3f43', 0.85, 0.0)})     # el techo por dentro

def A(v): return np.array(v, float)
def unit(v): return v / np.linalg.norm(v)
def esp(p): return A([-p[0], p[1], p[2]])


# ---------------- construcción de mallas (por vértices; transformaciones identidad) ----------------
PIEZAS = []

def pieza(nombre, verts, caras, mat, cerrada=False, suave=None):
    o = cc.malla(nombre, [tuple(float(c) for c in v) for v in verts], caras, mat, cerrada=cerrada)
    if suave is not None:
        o.data.polygons.foreach_set('use_smooth', [bool(s) for s in (suave if hasattr(suave, '__len__') else [suave] * len(caras))])
    PIEZAS.append(o); return o

def solido(nombre, secciones, mat):
    """Sólido por secciones: cada sección es un polígono (misma cantidad de puntos, mismo orden); tapas en los extremos."""
    m = len(secciones[0]); verts = [p for s in secciones for p in s]; caras = []
    for k in range(len(secciones) - 1):
        for i in range(m): caras.append((k * m + i, k * m + (i + 1) % m, (k + 1) * m + (i + 1) % m, (k + 1) * m + i))
    caras.append(tuple(range(m))[::-1]); caras.append(tuple((len(secciones) - 1) * m + i for i in range(m)))
    return pieza(nombre, verts, caras, mat, cerrada=True)

def tubo(nombre, puntos, r, mat='jaula', n=8):
    """Caño redondo a lo largo de una polilínea (anillos de n lados, transporte paralelo), con tapas."""
    P = [A(p) for p in puntos]; K = len(P); tg = []
    for k in range(K):
        if k == 0: t = P[1] - P[0]
        elif k == K - 1: t = P[-1] - P[-2]
        else: t = unit(P[k] - P[k - 1]) + unit(P[k + 1] - P[k])
        tg.append(unit(t))
    arriba = A([0, 1, 0]) if abs(tg[0][1]) < 0.9 else A([1, 0, 0]); a = unit(arriba - (arriba @ tg[0]) * tg[0])
    verts, caras, suave = [], [], []
    for k in range(K):
        a = unit(a - (a @ tg[k]) * tg[k]); b = np.cross(tg[k], a)
        esc = 1.0 if k in (0, K - 1) else 1.0 / max(0.5, float(unit(P[k] - P[k - 1]) @ tg[k]))      # inglete en los codos
        verts += [P[k] + r * esc * (math.cos(2 * math.pi * i / n) * a + math.sin(2 * math.pi * i / n) * b) for i in range(n)]
    for k in range(K - 1):
        for i in range(n): caras.append((k * n + i, k * n + (i + 1) % n, (k + 1) * n + (i + 1) % n, (k + 1) * n + i)); suave.append(True)
    for k, sentido in ((0, -1), (K - 1, 1)):                                    # tapas con vértices propios (canto vivo)
        base = len(verts); verts += verts[k * n:(k + 1) * n]
        caras.append(tuple(range(base, base + n))[::sentido]); suave.append(False)
    return pieza(nombre, verts, caras, mat, cerrada=True, suave=suave)

def esfera(nombre, c, r, mat='jaula', n=8, m=5):
    c = A(c); verts = [c + A([0, r, 0])]; caras = []
    for j in range(1, m):
        la = math.pi * j / m
        verts += [c + r * A([math.sin(la) * math.cos(2 * math.pi * i / n), math.cos(la), math.sin(la) * math.sin(2 * math.pi * i / n)]) for i in range(n)]
    verts.append(c - A([0, r, 0])); ult = len(verts) - 1
    for i in range(n): caras.append((0, 1 + (i + 1) % n, 1 + i)); caras.append((ult, 1 + (m - 2) * n + i, 1 + (m - 2) * n + (i + 1) % n))
    for j in range(m - 2):
        for i in range(n): caras.append((1 + j * n + i, 1 + j * n + (i + 1) % n, 1 + (j + 1) * n + (i + 1) % n, 1 + (j + 1) * n + i))
    return pieza(nombre, verts, caras, mat, cerrada=True, suave=True)

def grilla(nombre, filas, mat, suave=True):
    """Superficie por filas de puntos (todas del mismo largo)."""
    n = len(filas[0]); verts = [p for f in filas for p in f]
    caras = [(k * n + i, k * n + i + 1, (k + 1) * n + i + 1, (k + 1) * n + i) for k in range(len(filas) - 1) for i in range(n - 1)]
    return pieza(nombre, verts, caras, mat, suave=suave)

def largo_acumulado(P):
    return np.concatenate([[0.0], np.cumsum([np.linalg.norm(P[k + 1] - P[k]) for k in range(len(P) - 1)])])

def remuestrear(P, fracciones):
    """Puntos de la polilínea P en las fracciones dadas de su largo."""
    P = [A(p) for p in P]; s = largo_acumulado(P); out = []
    for f in fracciones:
        x = min(max(f, 0.0), 1.0) * s[-1]; k = min(int(np.searchsorted(s, x, side='right')) - 1, len(P) - 2); k = max(k, 0)
        t = 0.0 if s[k + 1] == s[k] else (x - s[k]) / (s[k + 1] - s[k]); out.append(P[k] + (P[k + 1] - P[k]) * t)
    return out

def chaikin(P, veces=2):
    """Redondea las esquinas de una polilínea (conserva los extremos)."""
    for _ in range(veces):
        Q = [P[0]]
        for k in range(len(P) - 1): Q += [0.75 * P[k] + 0.25 * P[k + 1], 0.25 * P[k] + 0.75 * P[k + 1]]
        P = Q + [P[-1]]
    return P


# =====================================================================================================
if __name__ == '__main__':
    t0 = time.time()
    cp = json.load(open(os.path.join(CAL, 'cupula_puntos.json'), encoding='utf-8')); sim = cp['simetrico']; af = cp['afuera']['rasgos']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cc.EXTERIOR = os.path.join(cc.RAIZ, 'exterior_cupula.glb')                  # el FSN ya cortado: referencia y apoyo
    casco = cc.Casco()
    for m in bpy.data.materials: m.use_backface_culling = False
    S = lambda k: A(sim[k]['p3d_der'])
    CAM = A([0.0, cp['pose']['pos'][1], cp['pose']['pos'][2]])                  # la cámara de la 360 del asiento, llevada al eje (el modelo es simétrico)

    def techo_fsn(x, z):
        """El capó / el techo del FSN desde arriba: (punto, normal hacia afuera) o None."""
        h = casco.rayo((x, 1.9, z), (0, -1, 0), 1.6)
        if h is None: return None
        n = A(h[1]); return A(h[0]), unit(n if n[1] > 0 else -n)
    def piel_fsn(y, z):
        """La chapa del costado derecho vista desde afuera: (punto, normal hacia afuera) o None."""
        h = casco.rayo((1.5, y, z), (-1, 0, 0), 1.6)
        if h is None: return None
        n = A(h[1]); return A(h[0]), unit(n if n[0] > 0 else -n)
    def normal_fsn(p, guia):
        """Normal hacia afuera del FSN debajo de p (rayo por la dirección guía); si no hay chapa, la guía."""
        h = casco.rayo(tuple(p + 0.10 * guia), tuple(-guia), 0.25)
        if h is None: return guia
        n = unit(A(h[1])); return n if n @ guia > 0 else -n

    # ---------------- el plano W (parabrisas por dentro) ----------------
    pb = cp['superficies']['parabrisas']; M_W, YW, ZW = pb['pendiente_dz_dy'], pb['punto'][1], pb['punto'][2]
    LW = math.hypot(1, M_W); NW = A([0, M_W / LW, -1 / LW]); UW = A([0, 1 / LW, M_W / LW])      # hacia afuera · hacia arriba por el paño
    def W(x, y, d=0.0): return A([x, y, ZW + M_W * (y - YW)]) + d * NW
    bi, be = sim['parante']['borde_interior'], sim['parante']['borde_exterior']
    # Los dos bordes medidos del parante son lo que la cámara de la 360 ve SOBRE W. A la profundidad d (hacia afuera de W) el
    # borde del parante va donde lo corta el plano que pasa por la cámara y por ese borde: desde el asiento se ve igual.
    nI, nE = np.cross(A(bi[0]) - CAM, A(bi[1]) - CAM), np.cross(A(be[0]) - CAM, A(be[1]) - CAM)
    def x_abanico(n, y, d): return -float((W(0.0, y, d) - CAM) @ n) / float(n[0])
    def xi(y, d=0.0): return x_abanico(nI, y, d)                                 # borde del parante hacia el centro
    def xe(y, d=0.0): return x_abanico(nE, y, d)                                 # borde hacia el costado
    WI = lambda y, d, mas=0.0: W(xi(y, d) + mas, y, d)
    WE = lambda y, d, mas=0.0: W(xe(y, d) + mas, y, d)
    Y_VID_TOPE = sim['parabrisas_esq_sup']['p3d_der'][1]; Y_CAB_TOPE = Y_VID_TOPE + CABEZAL * UW[1]

    # ---------------- el plano D (puerta derecha) y los postes ----------------
    pd = cp['superficies']['puerta_der']; ND_AD = unit(A(pd['normal'])); ND_AD = ND_AD if ND_AD[0] < 0 else -ND_AD; ND = -ND_AD   # hacia adentro · hacia afuera
    pa0, pa1 = S('lateral_base_visible'), S('lateral_esq_sup_posteA'); dirA = unit(pa1 - pa0); wA = unit(np.cross(ND, dirA)); wA = wA if wA[2] > 0 else -wA
    def borde_A(y): return pa0 + (pa1 - pa0) * ((y - pa0[1]) / (pa1[1] - pa0[1]))               # borde delantero del poste de puerta (donde termina el paño lateral)
    # El plano D queda 1 a 2 cm ADENTRO de la chapa del FSN en el cinturón: todo lo que va sobre D (postes, puerta) se «abulta»
    # en x hacia la chapa en el pie (de lleno en y 0,915, nada desde y 1,25), para que la cúpula asiente sobre el fuselaje.
    xD = lambda y, z: pd['punto'][0] - (ND_AD[1] * (y - pd['punto'][1]) + ND_AD[2] * (z - pd['punto'][2])) / ND_AD[0]
    def corr_piel(z):
        """Cuánto hay que correr D en x (en el cinturón) para que la PIEL de la puerta (9,4 mm por fuera de D) quede 1 mm por
        FUERA de la chapa del FSN: a ras del zócalo (S1), que va 1 mm por fuera de la chapa (sin escalón; Iván, 7/11)."""
        h = piel_fsn(CINTURON - 0.008, float(z)); return (h[0][0] - 0.00785 - xD(CINTURON - 0.008, z)) if h else 0.0
    taper = lambda y: max(0.0, 1 - (y - Y_BAJO) / (1.25 - Y_BAJO))
    bulto = lambda p: p + A([corr_piel(p[2]) * taper(p[1]), 0, 0])
    PA = lambda y: bulto(borde_A(y)); corrA = corr_piel(borde_A(Y_BAJO)[2])
    # El borde delantero del poste de puerta (donde termina el paño lateral) también es lo que ve la cámara de la 360, que lo
    # mira muy de costado: el frente de la caja oscura va en chaflán sobre el plano cámara–borde (RETIRO_A = cuánto más atrás
    # queda su arista interior). Con el frente a escuadra, desde el asiento tapaba 2,5 cm de vidrio.
    nF = np.cross(dirA, CAM - pa0); RETIRO_A = -POSTE_FONDO * float(ND_AD @ nF) / float(wA @ nF)
    print(f'W: z = {ZW:.3f} + {M_W:.3f}·(y − {YW}) · parante en y 1,15: x {xi(1.15):.3f}…{xe(1.15):.3f} sobre W, {xi(1.15, D_TAPA):.3f}…{xe(1.15, D_TAPA):.3f} en la tapa · poste de puerta: pie corrido {corrA * 100:+.1f} cm en x hasta la chapa, chaflán {RETIRO_A * 100:.1f} cm')

    for s, lado in ((1, 'der'), (-1, 'izq')):
        X = lambda p: A([s * p[0], p[1], p[2]])
        # ---- J1 parante del parabrisas: parte oscura y tapa blanca, las dos con las caras laterales en abanico (sin pestañas:
        #      se verían desde adentro) ----
        sec = lambda y: [X(WI(y, -D_DENTRO)), X(WE(y, -D_DENTRO)), X(WE(y, D_POSTE)), X(WI(y, D_POSTE))]
        solido(f'parante_{lado}', [sec(Y_PIE_PARANTE), sec(Y_CAB_TOPE)], 'marco')
        tap = lambda y: [X(WI(y, D_POSTE + 0.0003)), X(WE(y, D_POSTE + 0.0003)), X(WE(y, D_TAPA)), X(WI(y, D_TAPA))]
        solido(f'parante_tapa_{lado}', [tap(Y_PIE_VIDRIO - 0.012), tap(Y_CAB_TOPE)], 'blanco')
        # ---- J2 poste de puerta delantero (A) y J3 trasero (B): caja sobre el plano de la puerta + tapa blanca ----
        def caja_poste(nombre, frente_D, ancho, y0, y1, n_ad, retiro=0.0):
            """Poste de puerta: la caja oscura por dentro del plano D (la piel blanca de afuera es la de la puerta, más abajo);
            `frente_D` da el borde delantero SOBRE D (sin abultar: acá se abulta cada vértice con su propio (y, z), como la piel);
            `retiro` = cuánto más atrás queda la arista interior delantera (chaflán sobre el plano cámara–borde)."""
            cuerpo = []
            for y in (y0, 1.25, y1):
                f, w = frente_D(y), ancho(y); r = f + w
                cuerpo.append([X(bulto(f)), X(bulto(r)), X(bulto(r) + POSTE_FONDO * n_ad), X(bulto(f + retiro * unit(w)) + POSTE_FONDO * n_ad)])
            solido(f'{nombre}_{lado}', cuerpo, 'marco')
        Y_POSTE0, Y_TOPE_A, Y_TOPE_B = CINTURON + 0.005, 1.505, 1.56             # los pies, por encima del larguero del antepecho; las cabezas, debajo del flanco del techo
        caja_poste('posteA', borde_A, lambda y: POSTE_ANCHO * wA, Y_POSTE0, Y_TOPE_A, ND_AD, RETIRO_A)
        er0, er1 = S('puerta_esq_tras_inf'), S('puerta_esq_tras_sup'); et0, et1 = A(af['trasera_esq_del_inf']['p3d_der']), A(af['trasera_esq_del_sup']['p3d_der'])
        Er = lambda y: er0 + (er1 - er0) * ((y - er0[1]) / (er1[1] - er0[1])); Et = lambda y: et0 + (et1 - et0) * ((y - et0[1]) / (et1[1] - et0[1]))
        medio = lambda y: (Er(y) + Et(y)) / 2
        PB_D = lambda y: medio(y) - 0.030 * unit(Et(y) - Er(y)); PB = lambda y: bulto(PB_D(y))
        caja_poste('posteB', PB_D, lambda y: 0.060 * unit(Et(y) - Er(y)), Y_POSTE0, Y_TOPE_B, ND_AD)

    # ---- travesaño sobre el paño central (cabezal): gris por dentro, tapa blanca por fuera; entra 3 mm en cada parante ----
    ext = lambda s, y, d, mas: A([s * (xi(y, d) + mas), 0, 0]) + W(0, y, d)        # hasta la cara del parante a esa profundidad, y `mas` adentro de él
    yc0, yc1 = Y_VID_TOPE, Y_CAB_TOPE - 0.0012                                    # 1 mm rehundido respecto de los parantes: sin caras coplanares encimadas
    solido('cabezal', [[ext(s, yc0, -D_DENTRO + 0.001, 0.003), ext(s, yc1, -D_DENTRO + 0.001, 0.003), ext(s, yc1, D_POSTE - 0.001, 0.003), ext(s, yc0, D_POSTE - 0.001, 0.003)] for s in (-1, 1)], 'marco')
    solido('cabezal_tapa', [[ext(s, yc0, D_POSTE + 0.0008, 0.002), ext(s, yc1, D_POSTE + 0.0008, 0.002), ext(s, yc1, D_TAPA - 0.001, 0.002), ext(s, yc0, D_TAPA - 0.001, 0.002)] for s in (-1, 1)], 'blanco')   # sin pestaña abajo: se vería desde adentro

    # ---- V1 paño central: plano, 4 cm por fuera de W, metido debajo de las tapas y hundido en el capó ----
    yb, yt = Y_PIE_VIDRIO, Y_VID_TOPE + 0.008
    pieza('vidrio_central', [esp(WI(yb, S_VIDRIO, METE)), WI(yb, S_VIDRIO, METE), WI(yt, S_VIDRIO, METE), esp(WI(yt, S_VIDRIO, METE))], [(0, 1, 2, 3)], 'vidrio_cup', suave=False)

    # ---- V2 paños laterales (curvos): superficie reglada entre el borde de abajo (capó → esquina → antepecho) y el de arriba ----
    F0 = WE(yb, S_VIDRIO, -METE); ytl = sim['lateral_esq_sup_parante']['p3d_der'][1] + 0.008; F1 = WE(ytl, S_VIDRIO, -METE)
    A0 = PA(Y_BAJO) + METE * wA + 0.003 * ND; A1 = PA(pa1[1] + 0.008) + METE * wA + 0.003 * ND    # el borde de arriba va 1 cm por encima de lo que se ve (queda detrás del marco)
    def fin_capo(sonda, y_min=None):
        """Hasta qué z llega la chapa del capó (su borde trasero) en esa generatriz: se retrocede desde el corte hasta tocarla."""
        for z in np.arange(0.762, 0.66, -0.002):
            h = sonda(float(z))
            if h is not None and (y_min is None or h[0][1] > y_min): return float(z)
        return None
    abajo = [F0]
    for x in (0.32, 0.37, 0.42, 0.47, 0.52):                                     # por arriba del capó: 8 mm antes de su borde y 1 cm debajo de la chapa
        zf = fin_capo(lambda z: techo_fsn(x, z), 0.95); h = techo_fsn(x, zf - 0.008); abajo.append(h[0] - 0.010 * h[1])
    for y in np.arange(abajo[-1][1] - 0.03, Y_BAJO + 0.02, -0.03):               # bajando por el costado del capó
        zf = fin_capo(lambda z: piel_fsn(float(y), z)); h = piel_fsn(float(y), min(zf - 0.008, 0.748)); abajo.append(h[0] - 0.010 * h[1])
    h = piel_fsn(Y_BAJO, 0.748); esquina = h[0] - 0.008 * h[1]; abajo.append(esquina)
    print('  borde de abajo del paño lateral (antes de redondear): ' + ' '.join(f'({p[0]:.3f}, {p[1]:.3f}, {p[2]:.3f})' for p in abajo))
    for z in np.linspace(0.78, A0[2], 5)[:-1]:                                   # hacia atrás, detrás de la chapa del antepecho
        h = piel_fsn(CINTURON - 0.008, float(z)); abajo.append(A([h[0][0] - 0.008, Y_BAJO, z]))
    abajo.append(A0)
    abajo = remuestrear(chaikin(abajo, 2), np.linspace(0, 1, NU + 1))
    arriba = [F1 + (A1 - F1) * u for u in np.linspace(0, 1, NU + 1)]
    lat = [[abajo[j] + (arriba[j] - abajo[j]) * v for j in range(NU + 1)] for v in np.linspace(0, 1, NV + 1)]
    grilla('vidrio_lateral_der', lat, 'vidrio_cup'); grilla('vidrio_lateral_izq', [[esp(p) for p in f][::-1] for f in lat], 'vidrio_cup')
    print(f'paño lateral: de ({F0[0]:.3f}, {F0[1]:.3f}, {F0[2]:.3f}) por el capó y el antepecho a ({A0[0]:.3f}, {A0[1]:.3f}, {A0[2]:.3f}); arriba de ({F1[0]:.3f}, {F1[1]:.3f}, {F1[2]:.3f}) a ({A1[0]:.3f}, {A1[1]:.3f}, {A1[2]:.3f}); borde de abajo {largo_acumulado(abajo)[-1] * 100:.0f} cm')

    # ---- T4 faja del parabrisas: tira blanca sobre la unión del vidrio con el capó y el antepecho, de poste a poste ----
    centro = [W(x, yb, S_VIDRIO) for x in np.linspace(-F0[0], F0[0], 9)[1:-1]]
    borde = [esp(p) for p in abajo][::-1] + centro + abajo                       # de izquierda a derecha
    sube = [unit(esp(arriba[j]) - esp(abajo[j])) for j in range(NU + 1)][::-1] + [UW] * len(centro) + [unit(arriba[j] - abajo[j]) for j in range(NU + 1)]
    # Sigue al vidrio: una banda 5 mm por fuera de él, desde 4 cm por DEBAJO de su borde (prolongando el paño: tapa la unión y
    # la esquina donde el vidrio se aparta del corte del FSN) hasta 4,5 cm por encima; los dos cantos vuelven contra la superficie.
    normales = []
    for k, (p, t) in enumerate(zip(borde, sube)):
        tg = unit(borde[min(k + 1, len(borde) - 1)] - borde[max(k - 1, 0)]); radial = unit(A([p[0], p[1] - 0.55, 0]))
        ng = unit(np.cross(tg, t)); normales.append(ng if ng @ radial > 0 else -ng)
    normales = [unit(normales[max(k - 1, 0)] + 2 * normales[k] + normales[min(k + 1, len(normales) - 1)]) for k in range(len(normales))]   # suavizadas
    filas = [[p + s_ * t + d_ * n for p, t, n in zip(borde, sube, normales)] for s_, d_ in ((-0.042, -0.006), (-0.036, 0.005), (0.0, 0.006), (0.045, 0.005), (0.050, -0.001))]
    grilla('faja_parabrisas', filas, 'blanco')

    # ---- J7 largueros del antepecho: un caño por lado por dentro de la chapa, del cortafuegos al corte de atrás ----
    for s, lado in ((1, 'der'), (-1, 'izq')):
        eje = []
        for z in np.linspace(0.80, 2.50, 14):
            h = piel_fsn(CINTURON - 0.008, float(z))
            if h: eje.append(A([s * (h[0][0] - 0.022), CINTURON - R_LARGUERO - 0.002, z]))   # 6 mm por dentro de la chapa (y del zócalo)
        tubo(f'larguero_antepecho_{lado}', eje, R_LARGUERO)

    # ---- J5 / J6 jaula del techo ----
    J = sim['jaula_techo']; N = {k: A(v) for k, v in J['nudos_der'].items()}
    ym = (Y_VID_TOPE + Y_CAB_TOPE) / 2; N['PR'] = W((xi(ym) + xe(ym)) / 2, ym, 0.0)   # la cabeza del parante: sobre su eje, a la altura del cabezal
    nudo = lambda n: N[n] if n in N else esp(N[n[0] + 'R'])
    arco_d = [A(p) for p in J['arco_delantero_der']]; arco_t = [A(p) for p in J['arco_trasero_der']]
    completo = lambda arco: [esp(p) for p in arco[:-1]] + arco[::-1]             # de izquierda a derecha, pasando por la clave
    tubo('arco_delantero', completo(arco_d), R_TUBO); tubo('arco_trasero', completo(arco_t), R_TUBO)
    for a_, b_ in (('FR', 'PR'), ('FL', 'PL'), ('PR', 'FC'), ('PL', 'FC'), ('FC', 'RR'), ('FC', 'RL'), ('RL', 'RR'), ('FR', 'RR'), ('FL', 'RL')):
        tubo(f'cano_{a_}_{b_}', [nudo(a_), nudo(b_)], R_TUBO)
    for n in ('FR', 'FL', 'PR', 'PL', 'FC', 'RR', 'RL'): esfera(f'nudo_{n}', nudo(n), R_TUBO * 1.25)

    # ---- techo PROVISORIO (1b.1): una chapa blanca sobre los caños, del parabrisas al carenado del FSN; en 1b.2 se rehace
    #      con las ventanas del techo y el forro ----
    fuera = lambda p, d: p + d * unit(A([p[0], p[1] - 1.25, 0]))
    ng_lat = lambda j: unit(np.cross(arriba[min(j + 1, NU)] - arriba[max(j - 1, 0)], arriba[j] - abajo[j]))
    def n_lat(j):
        n = ng_lat(j); return n if n @ A([1, 1, 0]) > 0 else -n
    # fila r00: el borde de abajo de la chapa, sobre los vidrios; fila r0: de la cabeza de cada parante, recta, hasta 2 cm por
    # encima de la esquina del poste de puerta (la banda r00–r0 hace de marco superior del paño lateral, por fuera).
    # El borde de arriba del paño lateral que se midió (la recta L, del parante al poste de puerta) es lo que ve la cámara de la
    # 360: r00 va sobre los rayos cámara → L, apenas por fuera del vidrio (y 1,5 mm más arriba, para que no asome blanco).
    SOBRE = 0.006                                                                 # la chapa del techo pasa 6 mm por encima de las tapas (nunca al ras: parpadea)
    Lp, La = S('lateral_esq_sup_parante'), S('lateral_esq_sup_posteA'); JS = (NU, 2 * NU // 3, NU // 3, 1, 0)   # del poste de puerta al parante (un punto más junto al parante, donde la chapa baja de la tapa al vidrio)
    Lj = [Lp + (La - Lp) * (j / NU) for j in JS]
    def sobre_vidrio(j, P, fuera_m):
        """El punto del rayo cámara → P que queda fuera_m por fuera (negativo: por dentro) del paño lateral, en su columna j."""
        n = n_lat(j); v = P - CAM; t = float((arriba[j] - CAM) @ n) / float(v @ n); return CAM + (t + fuera_m / float(v @ n)) * v
    cabeza = W(xe(Y_CAB_TOPE, D_TAPA) + 0.004, Y_CAB_TOPE, D_TAPA + SOBRE); sobreA = arriba[NU] + 0.004 * n_lat(NU) + 0.020 * unit(arriba[NU] - abajo[NU])
    r0_der = [sobreA + (cabeza - sobreA) * (1 - j / NU) for j in JS]
    r0 = r0_der + [W(x, Y_CAB_TOPE, D_TAPA + SOBRE) for x in (0.12, 0.0, -0.12)] + [esp(p) for p in r0_der][::-1]
    r00_der = [sobre_vidrio(j, L, d_) + 0.0015 * unit(arriba[j] - abajo[j]) for j, L, d_ in zip(JS[:-1], Lj[:-1], (0.004, 0.006, 0.009, 0.011))]
    r00_der.append(Lp + ((D_TAPA + SOBRE) / float((Lp - CAM) @ NW)) * (Lp - CAM) + 0.0015 * UW)   # junto al parante: el mismo rayo, pero SOBRE su tapa (el paño lateral ahí ya dobló hacia adentro)
    r00 = r00_der + [W(x, Y_CAB_TOPE - 0.018, D_TAPA + SOBRE) for x in (0.12, 0.0, -0.12)] + [esp(p) for p in r00_der][::-1]
    grilla('techo_banda', [r00, r0], 'blanco')                                     # la banda sobre los vidrios y las tapas
    hacia_adentro = lambda p, d: p + d * unit(A([0.0, 1.25, p[2]]) - p)             # hacia el eje de la cabina: el forro
    adentro = lambda fila, d: [hacia_adentro(p, d) for p in fila]
    # marco superior del paño lateral, por dentro (oscuro, como los parantes): del borde medido L sube hasta el forro del techo; y
    # de L sale un fondo hasta el vidrio, sobre los rayos de la cámara (desde el asiento queda de canto: no agrega ni quita)
    fondo = [sobre_vidrio(j, L, -0.002) for j, L in zip(JS, Lj)]; tope = adentro(r0_der, FORRO)
    grilla('marco_lateral_der', [fondo, Lj, tope], 'marco', suave=False)
    grilla('marco_lateral_izq', [[esp(p) for p in f_][::-1] for f_ in (fondo, Lj, tope)], 'marco', suave=False)

    # ---- T1 / T2 / V4: el techo con sus dos ventanas (1b.2) ----
    # La BÓVEDA: filas b0 = r0 (cabeza de los parantes y banda), b1 = arco delantero + TECHO_FUERA, b2 = arco trasero + ídem,
    # b25 y b3 = el carenado del FSN justo detrás del corte (z 2,56); TECHO_FUERA se ajusta para que la chapa pase por el plano
    # de la ventana del techo medido desde afuera (superficies.techo_der). A cada lado, el FLANCO: de la línea de los caños
    # FR–RR baja hasta 3 cm por encima del borde de arriba de la ventana de puerta (ahí empieza el marco de la puerta, 1b.3).
    # Sobre esa bóveda se triangula la chapa (T1) con el recorte de las dos ventanas, y 7 mm hacia adentro el forro (T2) con
    # un canto oscuro alrededor de cada ventana; el vidrio son los mismos triángulos del hueco (mismos vértices: sin rendija).
    TV = cp['superficies']['techo_der']; PV, NTV = A(TV['punto']), unit(A(TV['normal']))
    Z_SOLAPA = 2.58                                                               # la cúpula pasa 3 cm sobre el FSN detrás del corte (z 2,55)
    def solapa_techo(P, largo=0.003, hundido=0.002):
        """P, un punto del borde del techo: el mismo punto corrido `largo` hacia el centro del techo por la tangente de la bóveda y
        `hundido` hacia adentro: las piezas que llegan al borde del techo (flancos, carenado) terminan DEBAJO de la chapa, sin
        unión en T (por ahí se colaban rayos)."""
        r = unit(A([P[0], P[1] - 1.25, 0.0])); t = A([-r[1], r[0], 0.0]) * (1 if P[0] >= 0 else -1)
        return P + largo * t - hundido * r
    def punto_D(y, z): return A([pd['punto'][0] - (ND_AD[1] * (y - pd['punto'][1]) + ND_AD[2] * (z - pd['punto'][2])) / ND_AD[0], y, z])   # el plano de la puerta derecha
    DTF = punto_D(S('puerta_esq_del_sup')[1] + 0.03, S('puerta_esq_del_sup')[2]) + 0.0094 * ND      # borde de abajo del flanco: 3 cm sobre la ventana de puerta, en la piel
    DTR = punto_D(S('puerta_esq_tras_sup')[1] + 0.03, S('puerta_esq_tras_sup')[2]) + 0.0094 * ND
    def boveda(fuera_m, columnas=25):
        fc = np.linspace(0, 1, columnas)
        b1 = remuestrear([fuera(p, fuera_m) for p in completo(arco_d)][::-1], fc)      # de derecha a izquierda, como r0
        b2 = remuestrear([fuera(p, fuera_m) for p in completo(arco_t)][::-1], fc)
        b3, faltan = [], 0
        for p in b2:                                                              # el carenado del FSN 3 cm detrás del corte (solapa, 1 mm por fuera), en las mismas direcciones
            d = unit(A([p[0], p[1] - 1.25, 0])); h = casco.rayo((0.0, 1.25, Z_SOLAPA), tuple(d), 1.2)
            b3.append(A(h[0]) + 0.001 * d if h else None)
        for k in range(len(b3)):
            if b3[k] is None:                                                     # donde el FSN tiene un hueco: entre los vecinos
                faltan += 1; vec = [q for q in (b3[k - 1] if k > 0 else None, b3[k + 1] if k + 1 < len(b3) else None) if q is not None]
                b3[k] = sum(vec) / len(vec) if vec else A([b2[k][0], b2[k][1] - 0.10, 2.56])
        b25 = [(a_ + c_) / 2 + A([0, 0.012, 0]) for a_, c_ in zip(b2, b3)]
        filas = [remuestrear(r0, fc), b1, b2, b25, b3]
        verts = [tuple(p) for f_ in filas for p in f_]; n = columnas
        caras = [(k * n + i, k * n + i + 1, (k + 1) * n + i + 1, (k + 1) * n + i) for k in range(len(filas) - 1) for i in range(n - 1)]
        return filas, BVHTree.FromPolygons(verts, caras), faltan
    def altura(bvh, x, z):
        h = bvh.ray_cast(Vector((float(x), 2.2, float(z))), Vector((0.0, -1.0, 0.0)), 1.6)
        return None if h[0] is None else A(h[0])
    fuera_techo, resto = TECHO_FUERA, 0.0
    for _ in range(4):
        filas, bvh_b, faltan = boveda(fuera_techo)
        q = altura(bvh_b, PV[0], PV[2]); resto = float((PV - q) @ NTV) if q is not None else 0.0
        if abs(resto) < 0.0005: break
        fuera_techo += resto
    b0, b1, b2, b25, b3 = filas
    print(f'techo: chapa a {fuera_techo * 100:.1f} cm del eje de los caños para pasar por la ventana medida desde afuera (resto {resto * 1000:.1f} mm); '
          f'clave delantera y {max(p[1] for p in b1):.3f}, trasera {max(p[1] for p in b2):.3f}; carenado del FSN en z 2,56: y {max(p[1] for p in b3):.3f} ({faltan} puntos sin chapa); '
          f'flanco hasta y {DTF[1]:.3f} (z {DTF[2]:.2f}) y {DTR[1]:.3f} (z {DTR[2]:.2f})')
    # contornos en 2D (x, z): el borde de la chapa (adelante r0, flanco izquierdo, atrás b3, flanco derecho) y las dos ventanas
    contorno = [A(p) for p in sim['techo_ventana']['contorno_der']]
    for _ in range(2):                                                            # redondeado (Chaikin cerrado): el contorno marcado a mano tiene zigzags de hasta 1 cm
        contorno = [q for k in range(len(contorno)) for q in (0.75 * contorno[k] + 0.25 * contorno[(k + 1) % len(contorno)], 0.25 * contorno[k] + 0.75 * contorno[(k + 1) % len(contorno)])]
    contorno = contorno[::2] if len(contorno) > 70 else contorno
    ventanas = [contorno, [esp(p) for p in contorno][::-1]]
    borde = list(r0) + [b1[-1], b2[-1], b25[-1]] + b3[::-1] + [b25[0], b2[0], b1[0]]          # la chapa termina en la línea de los caños FR–RR; el flanco va aparte
    def dentro(poly, px, pz):
        c = False
        for i in range(len(poly)):
            x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % len(poly)]
            if (z1 > pz) != (z2 > pz) and px < x1 + (x2 - x1) * (pz - z1) / (z2 - z1): c = not c
        return c
    def dist_borde(poly, px, pz):
        m = 1e9
        for i in range(len(poly)):
            x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % len(poly)]; dx, dz = x2 - x1, z2 - z1
            t = max(0.0, min(1.0, ((px - x1) * dx + (pz - z1) * dz) / max(dx * dx + dz * dz, 1e-12)))
            m = min(m, math.hypot(px - x1 - t * dx, pz - z1 - t * dz))
        return m
    P3 = list(borde); E = [(i, (i + 1) % len(borde)) for i in range(len(borde))]; idx_v = []
    for v in ventanas:
        base = len(P3); P3 += [altura(bvh_b, p[0], p[2]) for p in v]; E += [(base + i, base + (i + 1) % len(v)) for i in range(len(v))]
        idx_v.append(list(range(base, base + len(v))))
    assert all(p is not None for p in P3), 'una ventana del techo cae fuera de la bóveda'
    b2d = [(p[0], p[2]) for p in borde]; v2d = [[(p[0], p[2]) for p in v] for v in ventanas]
    PASO = 0.04
    for x in np.arange(-0.44, 0.441, PASO):
        for z in np.arange(1.28, 2.561, PASO):
            if not dentro(b2d, x, z) or dist_borde(b2d, x, z) < 0.02 or any(dist_borde(v, x, z) < 0.02 for v in v2d): continue
            q = altura(bvh_b, x, z)
            if q is not None: P3.append(q)
    vo, eo, fo, ov, oe, of_ = delaunay_2d_cdt([Vector((p[0], p[2])) for p in P3], E, [], 0, 1e-6)
    X3 = [P3[o[0]] for o in ov]; salida_de = {}
    for k, o in enumerate(ov):
        for i in o: salida_de[i] = k
    tri_techo, tri_vent = [], [[], []]
    for f_ in fo:
        c = sum((X3[i] for i in f_), A([0.0, 0.0, 0.0])) / len(f_)
        if not dentro(b2d, c[0], c[2]): continue
        k_v = next((k for k, v in enumerate(v2d) if dentro(v, c[0], c[2])), None)
        (tri_techo if k_v is None else tri_vent[k_v]).append(tuple(f_))
    n0 = np.cross(X3[tri_techo[0][1]] - X3[tri_techo[0][0]], X3[tri_techo[0][2]] - X3[tri_techo[0][0]])
    if n0[1] < 0: tri_techo = [t[::-1] for t in tri_techo]; tri_vent = [[t[::-1] for t in ts] for ts in tri_vent]
    def malla_tri(nombre, tris, mat, mover=None):
        usados = sorted({i for t in tris for i in t}); nuevo = {i: k for k, i in enumerate(usados)}
        verts = [X3[i] if mover is None else mover(X3[i]) for i in usados]
        return pieza(nombre, verts, [tuple(nuevo[i] for i in t) for t in tris], mat, suave=True)
    malla_tri('techo', tri_techo, 'blanco')
    malla_tri('techo_forro', tri_techo, 'forro', lambda p: hacia_adentro(p, FORRO))
    for k, lado in enumerate(('der', 'izq')):
        malla_tri(f'ventana_techo_{lado}', tri_vent[k], 'vidrio_cup', lambda p: hacia_adentro(p, 0.001))   # 1 mm hundido en el hueco (al ras parpadea y el chequeo 4 lo marca)
        anillo = [X3[salida_de[i]] for i in idx_v[k]]; n = len(anillo)                       # el canto entre la chapa y el forro, alrededor del hueco
        verts = anillo + [hacia_adentro(p, FORRO) for p in anillo]
        pieza(f'ventana_techo_canto_{lado}', verts, [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)], 'marco', suave=False)
    print(f'techo: {len(tri_techo)} triángulos de chapa (+ forro), ventanas de {len(tri_vent[0])} y {len(tri_vent[1])} triángulos; {len(P3)} puntos, paso {PASO * 100:.0f} cm')

    # ---- los flancos del techo: de la línea de los caños FR–RR bajan hasta la piel de la puerta (superficie reglada; como
    #      campo de alturas no se podía: atrás la línea de caños queda más afuera que el plano de la puerta y quedaba en voladizo) ----
    NC = 9                                                                        # puntos por columna del carenado (y del borde trasero de la puerta)
    PBr = lambda y: PB(y) + 0.060 * unit(Et(y) - Er(y))                          # borde trasero del poste B (atrás es todo fuselaje)
    PBT = PBr(1.59) + 0.0094 * ND                                                 # esquina trasera de abajo del flanco, en la piel
    entre = lambda P_, Q_, *fs: [P_ + (Q_ - P_) * f_ for f_ in fs]
    fb_der = [r0[0]] + entre(r0[0], DTF, 1 / 3, 2 / 3) + [DTF] + entre(DTF, DTR, 0.25, 0.5, 0.75) + [DTR] + entre(DTR, PBT, 0.5) + [PBT]   # pasa por las esquinas
    fa_der = [r0[0]] + entre(r0[0], b1[0], 0.5) + [b1[0]] + entre(b1[0], b2[0], *[k / 7 for k in range(1, 8)])   # ídem: por b1[0] (el nudo FR); un remuestreo uniforme cortaba esa esquina y dejaba un hueco
    fa_sol = [fa_der[0], solapa_techo(fa_der[1], 0.003, 0.004)] + [solapa_techo(p) for p in fa_der[2:]]   # la fila de arriba termina 2 mm debajo de la chapa del techo (sin unión en T); el primer triángulo, más hundido (quedaba en el plano de la piel de la puerta)
    for s, lado in ((1, 'der'), (-1, 'izq')):
        M = (lambda p: p) if s > 0 else esp
        fa, fb = [M(p) for p in fa_der], [M(p) for p in fb_der]
        grilla(f'flanco_{lado}', [[M(p) for p in fa_sol], fb], 'blanco')
        grilla(f'flanco_forro_{lado}', [adentro(fa, FORRO), adentro(fb, FORRO)], 'forro')

    # ---- P / V3: las puertas (no abren, decisión del 24/10). Piel blanca a 9,4 mm por fuera del plano D (donde estaban las
    #      tapas de los postes), forro oscuro a 4 mm por fuera, SÓLO entre los postes (que quedan a la vista por dentro) y
    #      por encima de ellos hasta el forro del flanco; el vidrio entre los dos y un canto oscuro alrededor del hueco. El hueco
    #      es el MARCO medido desde el asiento (cuatro esquinas sobre D; la esquina de arriba atrás redondeada; el borde de abajo
    #      recortado 1 cm sobre el cinturón, porque atrás la medida cae debajo del corte del FSN): cada contorno va sobre los
    #      rayos de la cámara a la profundidad de su chapa (abanico), así que desde el asiento el hueco mide lo medido y desde
    #      afuera el vidrio se ve un poco más grande (como en las 360 de afuera). Todo abultado hacia la chapa del FSN en el
    #      pie (`bulto`). El ojo de buey: anillo oscuro de 7 a 9 cm, 1 mm por dentro del vidrio. ----
    D_PIEL, D_FORRO, D_VIDRIO, D_OJO = -0.0094, -0.0040, -0.0065, -0.0055       # profundidades hacia adentro de D (negativo = hacia afuera)
    def abanico_D(E, prof):
        v = CAM - E; return E + (prof / float(v @ ND_AD)) * v
    e1 = unit(wA); e2 = unit(np.cross(ND_AD, e1)); O_D = A(pd['punto'])
    a2 = lambda p: (float((p - O_D) @ e1), float((p - O_D) @ e2))
    de2 = lambda q, prof: bulto(O_D + q[0] * e1 + q[1] * e2 + prof * ND_AD)
    enD = lambda p, prof: bulto(p + prof * ND_AD)                                 # p sobre D (sin abultar)
    # el hueco: esquinas medidas → recorte sobre el cinturón → esquinas redondeadas (en 2D sobre D)
    esq = [S('puerta_esq_del_inf'), S('puerta_esq_tras_inf'), S('puerta_esq_tras_sup'), S('puerta_esq_del_sup')]
    Y_HUECO = CINTURON + 0.010; poli, radios = [], []
    for k in range(4):
        P_, Q_ = esq[k], esq[(k + 1) % 4]
        if P_[1] >= Y_HUECO: poli.append(P_); radios.append(0.08 if k == 2 else 0.02)
        if (P_[1] >= Y_HUECO) != (Q_[1] >= Y_HUECO):
            t = (Y_HUECO - P_[1]) / (Q_[1] - P_[1]); poli.append(P_ + (Q_ - P_) * t); radios.append(0.0)
    def redondear(P2, R):
        out = []
        for i, (p, r) in enumerate(zip(P2, R)):
            if r <= 0: out.append(p); continue
            a_, b_ = P2[i - 1], P2[(i + 1) % len(P2)]; u1, u2 = unit(a_ - p), unit(b_ - p)
            th = math.acos(max(-1.0, min(1.0, float(u1 @ u2)))); d = r / math.tan(th / 2)
            tope = 0.45 * min(np.linalg.norm(a_ - p), np.linalg.norm(b_ - p))
            if d > tope: d = tope; r = d * math.tan(th / 2)
            c = p + unit(u1 + u2) * (r / math.sin(th / 2)); t1, t2 = p + u1 * d, p + u2 * d
            a1, a2_ = math.atan2(*(t1 - c)[::-1]), math.atan2(*(t2 - c)[::-1]); da = (a2_ - a1 + math.pi) % (2 * math.pi) - math.pi
            n = max(3, int(abs(da) / math.radians(12)) + 1)
            out += [c + r * A([math.cos(a1 + da * j / n), math.sin(a1 + da * j / n)]) for j in range(n + 1)]
        return out
    hueco2 = redondear([A(a2(p)) for p in poli], radios)
    hueco3 = [O_D + q[0] * e1 + q[1] * e2 for q in hueco2]                      # sobre D, sin abultar: lo que ve la cámara
    hueco_a = lambda prof: [abanico_D(p, prof + corr_piel(p[2]) * taper(p[1]) * ND_AD[0]) for p in hueco3]   # sobre los rayos de la cámara, a la profundidad de la chapa abultada
    ojo_c = S('ojo_centro')
    # contornos (sobre la piel): abajo el cinturón, atrás el borde trasero del poste B, arriba el flanco, adelante el borde
    # delantero del poste A (donde termina el paño lateral). El forro, además, rodea los postes (1 cm por debajo de ellos).
    yb = yf = CINTURON + 0.001; uB = lambda y: unit(Et(y) - Er(y)); PBr_D = lambda y: PB_D(y) + 0.060 * uB(y)   # piel y forro arrancan sobre el corte (debajo sigue el zócalo)
    col0_puerta = remuestrear([enD(PBr_D(yb), D_PIEL), enD(PBr_D(1.25), D_PIEL), PBT], np.linspace(0, 1, NC - 1))   # del cinturón a PBT: también es la columna delantera del carenado
    borde_p = [enD(borde_A(yb), D_PIEL)] + col0_puerta + fb_der[::-1][1:] + [enD(borde_A(1.25), D_PIEL)]   # … PBT, DTR … r0[0]
    sA = POSTE_ANCHO - 0.010
    yfA = yf - sA * wA[1]                                                          # el borde trasero del poste A baja con wA: se sube por el poste para que la esquina quede en yf
    borde_f = ([enD(borde_A(yfA) + sA * wA, D_FORRO), enD(PB_D(yf) + 0.010 * uB(yf), D_FORRO), enD(PB_D(Y_TOPE_B - 0.01) + 0.010 * uB(Y_TOPE_B), D_FORRO),
                enD(PBr_D(Y_TOPE_B - 0.01), D_FORRO)] + adentro(fb_der, FORRO)[::-1] +
               [enD(borde_A(Y_TOPE_A - 0.01), D_FORRO), enD(borde_A(Y_TOPE_A - 0.01) + sA * wA, D_FORRO)])
    def cara_plana(nombre, borde3, hueco3_, prof, mat, M, adentro_del_hueco=False):
        """Triangula una cara (borde y hueco como restricciones; puntos interiores cada 4 cm) y la crea; devuelve el 3D de los puntos
        de salida y el índice de salida de cada punto del hueco."""
        P3_ = list(borde3) + list(hueco3_); n_b, n_h = len(borde3), len(hueco3_)
        E_ = [(i, (i + 1) % n_b) for i in range(n_b)] + [(n_b + i, n_b + (i + 1) % n_h) for i in range(n_h)]
        b2_ = [a2(p) for p in borde3]; h2_ = [a2(p) for p in hueco3_]; region = h2_ if adentro_del_hueco else b2_
        us, vs = [q[0] for q in region], [q[1] for q in region]
        for u in np.arange(min(us) + 0.01, max(us), 0.04):
            for v in np.arange(min(vs) + 0.01, max(vs), 0.04):
                if adentro_del_hueco:
                    if not dentro(h2_, u, v) or dist_borde(h2_, u, v) < 0.02: continue
                elif not dentro(b2_, u, v) or dist_borde(b2_, u, v) < 0.02 or dist_borde(h2_, u, v) < 0.02 or dentro(h2_, u, v): continue
                P3_.append(de2((u, v), prof))
        vo_, eo_, fo_, ov_, oe_, of2 = delaunay_2d_cdt([Vector(a2(p)) for p in P3_], E_, [], 0, 1e-6)
        X3_ = [P3_[o[0]] for o in ov_]; sal = {i: k for k, o in enumerate(ov_) for i in o}
        tris = []
        for f_ in fo_:
            c = sum((A(a2(X3_[i])) for i in f_), A([0.0, 0.0])) / len(f_)
            if adentro_del_hueco:
                if dentro(h2_, c[0], c[1]): tris.append(tuple(f_))
            elif dentro(b2_, c[0], c[1]) and not dentro(h2_, c[0], c[1]): tris.append(tuple(f_))
        n0_ = np.cross(X3_[tris[0][1]] - X3_[tris[0][0]], X3_[tris[0][2]] - X3_[tris[0][0]])
        if float(n0_ @ ND) < 0: tris = [t[::-1] for t in tris]
        usados = sorted({i for t in tris for i in t}); nuevo = {i: k for k, i in enumerate(usados)}
        pieza(nombre, [M(X3_[i]) for i in usados], [tuple(nuevo[i] for i in t) for t in tris], mat, suave=False)
        return X3_, [sal[n_b + i] for i in range(n_h)]
    for s, lado in ((1, 'der'), (-1, 'izq')):
        M = (lambda p: p) if s > 0 else esp
        h_piel, h_forro, h_vid = hueco_a(D_PIEL), hueco_a(D_FORRO), hueco_a(D_VIDRIO)
        cara_plana(f'puerta_piel_{lado}', borde_p, h_piel, D_PIEL, 'blanco', M)
        cara_plana(f'puerta_forro_{lado}', borde_f, h_forro, D_FORRO, 'forro', M)
        cara_plana(f'vidrio_puerta_{lado}', [], h_vid, D_VIDRIO, 'vidrio_cup', M, adentro_del_hueco=True)
        n = len(hueco3); verts = [M(p) for p in h_piel] + [M(p) for p in h_forro]
        pieza(f'puerta_canto_{lado}', verts, [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)], 'marco', suave=False)
        # tiras que cierran el espesor de la piel (de la piel al plano D): abajo en el cinturón, adelante en el borde del poste A, atrás en el del B
        for nombre, fila_D, mat in (('abajo', [borde_A(yb), PBr_D(yb)], 'blanco'), ('atras', [PBr_D(yb), PBr_D(1.25), PBr_D(1.59)], 'marco'), ('adelante', [borde_A(1.50), borde_A(1.25), borde_A(yb)], 'blanco')):
            m = len(fila_D); verts = [M(enD(p, D_PIEL)) for p in fila_D] + [M(enD(p, 0.0)) for p in fila_D]
            pieza(f'puerta_tira_{nombre}_{lado}', verts, [(i, i + 1, m + i + 1, m + i) for i in range(m - 1)], mat, suave=False)
        anillo = [[M(enD(ojo_c + r_ * (math.cos(2 * math.pi * i / 24) * e1 + math.sin(2 * math.pi * i / 24) * e2), D_OJO)) for i in range(24)] for r_ in (0.045, 0.035)]
        pieza(f'ojo_de_buey_{lado}', anillo[0] + anillo[1], [(i, (i + 1) % 24, 24 + (i + 1) % 24, 24 + i) for i in range(24)], 'marco', suave=False)
    print(f'puertas: hueco de {len(hueco3)} puntos (esquinas {", ".join(f"({p[0]:.3f}, {p[1]:.3f}, {p[2]:.3f})" for p in poli)}), ojo de buey en ({ojo_c[0]:.3f}, {ojo_c[1]:.3f}, {ojo_c[2]:.3f}); abultado en el pie {corr_piel(1.0) * 100:.1f} cm (z 1,0) y {corr_piel(1.9) * 100:.1f} cm (z 1,9)')

    # ---- T3 carenado trasero: detrás del poste B es TODO fuselaje (Iván, 7/11: no va ventanilla). Chapa lisa lofteada entre
    #      el borde trasero de la puerta (sobre D, con la arista del flanco hasta b2[0]) y la sección del FSN en el corte (z 2,56),
    #      pasando por la forma del FSN ORIGINAL (exterior.glb, sin cortar) en las columnas del medio; arriba sigue el borde del
    #      techo (b2[0] → b25[0] → b3[0]) y abajo el cinturón; forro a 7 mm, 1 cm por debajo del poste B. ----
    j0, bin0 = ccf.leer_glb(os.path.join(cc.RAIZ, 'exterior.glb')); V0, T0 = [], []
    for malla_ in j0['meshes']:
        for prim in malla_['primitives']:
            P0 = ccf.leer_accessor(j0, bin0, prim['attributes']['POSITION']); I0 = ccf.leer_accessor(j0, bin0, prim['indices']).reshape(-1, 3)
            base = len(V0); V0 += [tuple(map(float, p)) for p in P0]; T0 += [tuple(int(k) + base for k in t) for t in I0]
    fsn0 = BVHTree.FromPolygons(V0, T0)
    Z_CORTE = Z_SOLAPA; borde_techo = [b2[0], b25[0], b3[0]]
    def en_borde_techo(z):
        for P_, Q_ in zip(borde_techo, borde_techo[1:]):
            if P_[2] - 1e-9 <= z <= Q_[2] + 1e-9: return P_ + (Q_ - P_) * ((z - P_[2]) / (Q_[2] - P_[2]))
        return borde_techo[-1]
    def columna_fsn(z):
        """Perfil del fuselaje en z, del cinturón al borde del techo: rayos desde el eje (0, 1,25, z) al FSN original, 0,5 mm por fuera.
        (Sólo sirve en el corte, z 2,56: entre el poste B y ahí el FSN original tiene sus ventanillas rotas, sin chapa.)"""
        tope = en_borde_techo(z); h = fsn0.ray_cast(Vector((1.5, CINTURON - 0.008, float(z))), Vector((-1.0, 0.0, 0.0)), 1.6)
        if h[0] is None: h = casco.rayo((1.5, CINTURON - 0.008, float(z)), (-1.0, 0.0, 0.0), 1.6)
        assert h is not None and h[0] is not None, f'sin chapa del FSN en el cinturón, z {z:.2f}'
        pie = A([h[0][0] + 0.001, CINTURON + 0.001, z])                          # en el corte, 1 mm por fuera de la chapa del FSN: a ras del zócalo
        th0, th1 = math.atan2(pie[1] - 1.25, pie[0]), math.atan2(tope[1] - 1.25, tope[0]); col = [pie]
        for th in np.linspace(th0, th1, NC)[1:-1]:
            d = A([math.cos(th), math.sin(th), 0.0]); q = fsn0.ray_cast(Vector((0.0, 1.25, float(z))), Vector(tuple(d)), 1.5)
            col.append(A(q[0]) + 0.0015 * d if q[0] is not None else None)
        col.append(tope)
        for k in range(1, NC - 1):                                                 # donde el FSN no tiene chapa: entre los vecinos
            if col[k] is None:
                k2 = next(j for j in range(k + 1, NC) if col[j] is not None); col[k] = col[k - 1] + (col[k2] - col[k - 1]) / (k2 - k + 1)
        return col
    col0 = col0_puerta + [fa_sol[-1]]; colZ = columna_fsn(Z_CORTE)              # la columna delantera: los mismos vértices que la piel de la puerta y el flanco
    zs = [b2[0][2], (b2[0][2] + b25[0][2]) / 2, b25[0][2], (b25[0][2] + Z_CORTE) / 2, Z_CORTE]; cols = [col0]   # por la esquina del borde del techo en b25[0]
    for z in zs[1:-1]:                                                            # columnas del medio: reglada entre la puerta y el corte, con el tope sobre el borde del techo
        t = (z - zs[0]) / (zs[-1] - zs[0]); t = t * t * (3 - 2 * t)                 # arranca tangente al plano de la puerta (sin quiebre en el poste B) y llega suave al corte
        lerp = [a_ + (c_ - a_) * t for a_, c_ in zip(col0, colZ)]; tope = solapa_techo(en_borde_techo(z))
        cols.append([lerp[k] + (tope - lerp[-1]) * (k / (NC - 1)) for k in range(NC)])
    colZ[-1] = solapa_techo(colZ[-1]); cols.append(colZ)                          # arriba, 2 mm debajo de la chapa del techo (sin unión en T)
    adel = lambda y: PBr_D(y) - 0.010 * uB(y)                                     # 1 cm por delante del borde trasero del poste B: el forro se mete debajo del poste
    cols_f = [adentro(remuestrear([enD(adel(yf), D_PIEL), enD(adel(1.25), D_PIEL), PBT - 0.010 * uB(1.59)], np.linspace(0, 1, NC - 1)) + [b2[0]], FORRO)] + [adentro(c, FORRO) for c in cols[1:]]
    for s, lado in ((1, 'der'), (-1, 'izq')):
        M = (lambda p: p) if s > 0 else esp
        grilla(f'carenado_{lado}', [[M(c[k]) for c in cols] for k in range(NC)], 'blanco')
        grilla(f'carenado_forro_{lado}', [[M(c[k]) for c in cols_f] for k in range(NC)], 'forro')
    # ---- S1 zócalo: tira blanca de 10 cm que sigue la chapa del FSN 1,5 mm por fuera, justo debajo del corte del antepecho, del
    #      capó al corte trasero: tapa la franja oscura que el FSN tiene pintada ahí (el burlete de sus ventanas) y deja la piel
    #      de la puerta y el carenado a ras (Iván, 7/11: «falta una partecita… y mejorar esas uniones») ----
    for s, lado in ((1, 'der'), (-1, 'izq')):
        filas = []
        for y in (CINTURON + 0.001, CINTURON - 0.024, CINTURON - 0.049, CINTURON - 0.074, CINTURON - 0.099):   # 10 cm: el FSN izquierdo no tiene chapa entre z 1,8 y 2,35 hasta y 0,85 (ahí iba el vidrio de su ventanilla)
            fila = []
            for z in np.linspace(0.95, Z_SOLAPA, 61):                              # desde detrás de la faja (adelante, el capó y la faja ya cierran); la chapa se mide justo debajo del corte
                ys = min(y, CINTURON - 0.003); h = casco.rayo((s * 1.5, ys, float(z)), (-s, 0.0, 0.0), 1.6); lado_h = s
                if h is None: h = casco.rayo((-s * 1.5, ys, float(z)), (s, 0.0, 0.0), 1.6); lado_h = -s   # sin chapa de este lado: la forma del otro, reflejada
                if h is None: continue                                            # sin chapa en ninguno: la tira puentea entre vecinos
                n_ = A(h[1]); n_ = n_ if n_[0] * lado_h > 0 else -n_; p_ = A(h[0]) + 0.0015 * unit(A([n_[0], n_[1], 0.0]))
                if lado_h != s: p_ = esp(p_)
                p_[1] = y; fila.append(p_)
            assert len(fila) >= 2, f'zócalo {lado}: sin chapa en y {y:.3f}'
            filas.append(remuestrear(fila, np.linspace(0, 1, 31)))
        grilla(f'zocalo_{lado}', filas, 'blanco')
    # ---- parche del lado izquierdo: el FSN no tiene chapa entre z 1,95 y 2,35 por debajo del antepecho, hasta y 0,65 (rotura del
    #      modelo, sólo de ese lado). Chapa con la forma del lado DERECHO reflejada, 1,5 mm por fuera; arriba se mete debajo del zócalo ----
    filas = []
    for k, y in enumerate(np.arange(0.845, 0.62, -0.03)):
        fila = []
        for z in np.linspace(1.90, 2.42, 14):
            h = casco.rayo((1.5, float(y), float(z)), (-1.0, 0.0, 0.0), 1.6)
            assert h is not None, f'parche: sin chapa derecha en y {y:.3f} z {z:.2f}'
            n_ = A(h[1]); n_ = n_ if n_[0] > 0 else -n_; fila.append(esp(A(h[0]) + (-0.001 if k == 0 else 0.0015) * unit(A([n_[0], n_[1], 0.0]))))   # la fila de arriba 1 mm por dentro de la chapa: 2,5 mm debajo del zócalo
        filas.append(fila)
    grilla('parche_izq', filas, 'blanco')
    print(f'carenado trasero: {len(cols)} columnas × {NC} puntos, de z {cols[0][0][2]:.2f} al corte del FSN en z {Z_CORTE}; en el corte, del cinturón (x {cols[-1][0][0]:.3f}) al borde del techo ({cols[-1][-1][0]:.3f}, {cols[-1][-1][1]:.3f})')

    # =====================================================================================================
    # CHEQUEOS
    print(f'PIEZAS: {len(PIEZAS)} ({time.time() - t0:.0f} s)')
    r = cc.chequear(PIEZAS, casco, tri_max=12000, llamadas_max=8, mb_max=0.4)
    r['6 presupuesto'] = (True, r['6 presupuesto'][1] + ' (las llamadas y el peso se miden abajo, con las piezas ya unidas)')
    for k in ('1 nada afuera', '2 nada delante del parabrisas', '5 alcance (75 cm del hombro)'): r.pop(k, None)   # no corresponden: la cúpula ES lo de afuera y no tiene controles
    cc.imprimir(r)
    if not r['4 nada superpuesto en el mismo plano'][0]:                          # con quién se encima cada una
        arboles = {o.name: cc._bvh_de(o) for o in PIEZAS}
        for nombre in r['4 nada superpuesto en el mismo plano'][1]:
            o = bpy.data.objects[nombre]; mw = o.matrix_world; vistos = set()
            for p in o.data.polygons:
                c = cc.cab(mw @ p.center); nrm = cc.cab(mw.to_3x3() @ p.normal).normalized()
                pts = [c] + [cc.cab(mw @ o.data.vertices[k].co).lerp(c, 0.1) for k in p.vertices]
                for otro, arbol in arboles.items():
                    if otro == nombre or otro in vistos: continue
                    for q0 in pts:
                        q = arbol.find_nearest(q0, 0.0008)
                        if q[0] is not None and q[1].normalized().dot(nrm) > 0.995:
                            vistos.add(otro); print(f'       {nombre} sobre {otro} en ({q0.x:.3f}, {q0.y:.3f}, {q0.z:.3f}), normal ({nrm.x:.2f}, {nrm.y:.2f}, {nrm.z:.2f})'); break
    # vidrio contra caño: cada vértice del borde de los vidrios, a cuánto queda de la pieza opaca más cercana
    opacas = [o for o in PIEZAS if not o.name.startswith('vidrio')]   # (el forro y el techo cuentan como opacas)
    arbol = BVHTree.FromPolygons([tuple(v) for o in opacas for v in cc.verts_cab(o)],
                                 [tuple(i + sum(len(q.data.vertices) for q in opacas[:k]) for i in p.vertices) for k, o in enumerate(opacas) for p in o.data.polygons])
    sueltos = {}
    for o in PIEZAS:
        if not o.name.startswith('vidrio'): continue
        vs = cc.verts_cab(o); n_bordes = {}
        for p in o.data.polygons:
            for a_, b_ in zip(p.vertices, list(p.vertices[1:]) + [p.vertices[0]]): n_bordes[tuple(sorted((a_, b_)))] = n_bordes.get(tuple(sorted((a_, b_))), 0) + 1
        borde_v = {i for e, c in n_bordes.items() if c == 1 for i in e}
        d = []
        for i in borde_v:
            h = arbol.find_nearest(vs[i], 0.2); d.append(0.2 if h[0] is None else min(float(h[3]), 0.2))   # (ojo: una distancia 0,0 es «falsa» en Python; antes `or 0.2` la convertía en 20 cm)
        sueltos[o.name] = round(max(d) * 1000, 1)
        if max(d) > 0.05:                                                        # diagnóstico: dónde queda el vértice más suelto y qué hay cerca
            i_max = list(borde_v)[int(np.argmax(d))]; p_ = vs[i_max]; cerca = sorted((round(h[3], 3), q.name) for q in opacas for h in [cc._bvh_de(q).find_nearest(p_, 0.5)] if h[0] is not None)[:3]
            print(f'       {o.name}: el vértice más suelto ({p_.x:.3f}, {p_.y:.3f}, {p_.z:.3f}) → {cerca}')
    ok_v = max(sueltos.values()) <= 16.0
    print(('  OK   ' if ok_v else '  FALLA') + f' vidrio contra caño → borde de cada vidrio a no más de {max(sueltos.values())} mm de una pieza opaca {sueltos} (va metido 10 mm debajo de las tapas y de la faja)')
    # la silueta vista desde la cámara de la 360 del asiento: los bordes medidos son lo que ESA cámara ve, así que el modelo
    # tiene que dar el mismo borde desde ese punto. En cada borde se barre de 4 cm del lado del marco a 4 cm del lado del
    # vidrio y se busca dónde el rayo deja de tocar piezas opacas (mm; + = el marco del modelo invade el vidrio).
    def borde_visto(E, g):
        o = Vector(tuple(CAM))
        for s_mm in range(-40, 41):
            Q = E + (s_mm / 1000.0) * g
            if arbol.ray_cast(o, Vector(tuple(unit(Q - CAM))), float(np.linalg.norm(Q - CAM)) + 0.20)[0] is None: return s_mm - 0.5
        return 40.5
    en = lambda P0, P1, t: A(P0) + (A(P1) - A(P0)) * t
    Lp_, La_ = Lp, La; muestras = []
    for t in (0.2, 0.5, 0.8):
        muestras.append(('parante, borde al centro', en(bi[0], bi[1], t), A([-1.0, 0, 0])))
        muestras.append(('parante, borde al costado', en(be[0], be[1], t), A([1.0, 0, 0])))
    for x in (0.0, 0.08, 0.15): muestras.append(('cabezal, borde de abajo', W(x, Y_VID_TOPE, 0.0), -UW))
    for t in (0.2, 0.5, 0.8):
        j = round(t * NU); baja = -unit(arriba[j] - abajo[j]); e_ = unit(La_ - Lp_)
        muestras.append(('paño lateral, borde de arriba', en(Lp_, La_, t), unit(baja - (baja @ e_) * e_)))
    for t in (0.3, 0.6, 0.9): muestras.append(('poste de puerta, borde delantero', en(pa0, pa1, t), -wA))
    silueta = {}
    for nombre, E, g in muestras: silueta.setdefault(nombre, []).append(borde_visto(E, g))
    ok_s = all(abs(v) <= 3.0 for vs in silueta.values() for v in vs)
    print(('  OK   ' if ok_s else '  FALLA') + ' silueta desde la cámara de la 360 (mm que el borde del modelo invade el vidrio; máx. ±3) → ' + ' · '.join(f"{k}: {' / '.join(f'{v:+.1f}' for v in vs)}" for k, vs in silueta.items()))
    # estanqueidad del frente: rayos desde el ojo y 4 puntos más hacia el parabrisas; ninguno puede salir sin tocar nada
    todo = BVHTree.FromPolygons([tuple(v) for o in PIEZAS for v in cc.verts_cab(o)],
                                [tuple(i + sum(len(q.data.vertices) for q in PIEZAS[:k]) for i in p.vertices) for k, o in enumerate(PIEZAS) for p in o.data.polygons])
    rng = np.random.default_rng(7); escapes = []; n_rayos = 0
    for origen in (cc.OJO, Vector((0.0, 1.16, 1.58)), Vector((-0.15, 1.30, 1.55)), Vector((0.15, 1.30, 1.55)), Vector((0.0, 1.45, 1.75))):
        for _ in range(4000):
            az, el = math.radians(rng.uniform(-36, 36)), math.radians(rng.uniform(-6, 46)); d = Vector((math.sin(az) * math.cos(el), math.sin(el), -math.cos(az) * math.cos(el)))
            n_rayos += 1
            if todo.ray_cast(origen, d, 8.0)[0] is None and casco.bvh_todo.ray_cast(origen, d, 8.0)[0] is None: escapes.append((round(math.degrees(az), 1), round(math.degrees(el), 1)))
    print(('  OK   ' if not escapes else '  FALLA') + f' estanqueidad del frente → {len(escapes)} de {n_rayos} rayos salen sin tocar nada (±36° de acimut, −6° a +46° de altura)' + (f': {escapes[:12]}' if escapes else ''))
    # estanqueidad del techo y los costados (1b.2/1b.3): desde los mismos puntos, todo alrededor, de 0° a 90° de altura
    EL_TECHO = 0; escapes_t = []; n_t = 0                                        # con puertas y carenado (1b.3) la cabina está cerrada sobre el antepecho: de 0° a 90°
    for origen in (cc.OJO, Vector((0.0, 1.16, 1.58)), Vector((-0.15, 1.30, 1.55)), Vector((0.15, 1.30, 1.55)), Vector((0.0, 1.45, 1.75))):
        for _ in range(4000):
            az, el = math.radians(rng.uniform(-180, 180)), math.radians(rng.uniform(EL_TECHO, 90)); d = Vector((math.sin(az) * math.cos(el), math.sin(el), -math.cos(az) * math.cos(el)))
            n_t += 1
            if todo.ray_cast(origen, d, 8.0)[0] is None and casco.bvh_todo.ray_cast(origen, d, 8.0)[0] is None: escapes_t.append((round(math.degrees(az), 1), round(math.degrees(el), 1)))
    print(('  OK   ' if not escapes_t else '  FALLA') + f' estanqueidad del techo → {len(escapes_t)} de {n_t} rayos salen sin tocar nada (todo alrededor, {EL_TECHO}° a 90° de altura)' + (f': {escapes_t[:12]}' if escapes_t else ''))
    if escapes_t:                                                                 # diagnóstico: qué pieza toca cada rayo que escapa, desde cada origen
        arboles = {o.name: cc._bvh_de(o) for o in PIEZAS}
        for az, el in escapes_t[:4]:
            d = Vector((math.sin(math.radians(az)) * math.cos(math.radians(el)), math.sin(math.radians(el)), -math.cos(math.radians(az)) * math.cos(math.radians(el))))
            for origen in (cc.OJO, Vector((0.0, 1.16, 1.58)), Vector((-0.15, 1.30, 1.55)), Vector((0.15, 1.30, 1.55)), Vector((0.0, 1.45, 1.75))):
                hits = sorted((round(h[3], 3), nombre) for nombre, arbol in arboles.items() for h in [arbol.ray_cast(origen, d, 8.0)] if h[0] is not None)
                todo_h = todo.ray_cast(origen, d, 8.0)[0]
                print(f'       escape az {az} el {el} desde ({origen.x:.2f}, {origen.y:.2f}, {origen.z:.2f}): todo={"toca" if todo_h is not None else "nada"} piezas={hits[:4]}')
                if todo_h is None and not hits:                                   # por dónde pasa: el punto del rayo más cercano a alguna pieza
                    mejor = None
                    for t_ in np.arange(0.2, 1.6, 0.005):
                        q_ = origen + d * float(t_)
                        for nombre, arbol in arboles.items():
                            h = arbol.find_nearest(q_, 0.05)
                            if h[0] is not None and (mejor is None or h[3] < mejor[0]): mejor = (h[3], nombre, (round(q_.x, 3), round(q_.y, 3), round(q_.z, 3)))
                    print(f'         pasa a {mejor[0] * 1000:.1f} mm de {mejor[1]} en {mejor[2]}' if mejor else '         lejos de todo')

    # =====================================================================================================
    # VISTAS de prueba (antes de unir), SALIDA y PRESUPUESTO
    if VISTAS:
        os.makedirs(VISTAS, exist_ok=True)
        for m in bpy.data.materials:
            if m.name == 'cab_vidrio_cup':
                m.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.22
                try: m.surface_render_method = 'BLENDED'
                except Exception: pass
        ojo = tuple(cc.OJO)
        for nombre, desde, hacia, lente in (('01_frente', ojo, (0, 1.30, 0.6), 14), ('04_vano_izq', ojo, (-1.5, 1.25, 1.55), 14), ('05_vano_der', ojo, (1.5, 1.25, 1.55), 14), ('06_atras', ojo, (0, 1.30, 3.0), 14),
                                            ('techo', ojo, (0, 2.6, 1.55), 12), ('08_del_izq', (-2.6, 2.6, -1.0), (0, 1.15, 1.5), 24), ('09_del_der', (2.6, 2.6, -1.0), (0, 1.15, 1.5), 24),
                                            ('10_tras_izq', (-2.4, 1.9, 3.9), (0, 1.1, 1.5), 24), ('12_costado', (-3.0, 1.3, 1.55), (0, 1.15, 1.55), 28), ('frente_cerca', (-1.2, 1.55, -0.5), (0.1, 1.25, 1.0), 35),
                                            ('esquina', (-1.5, 1.25, 0.45), (-0.45, 1.05, 0.95), 50), ('13_tras_der_cerca', (1.9, 2.0, 3.1), (0.35, 1.25, 1.95), 32)):
            cc.vista(os.path.join(VISTAS, f'cup_{nombre}.png'), desde, hacia, lente=lente, res=(1100, 720)); print('  vista', nombre)
    # unir por material (3 llamadas de dibujo) y exportar
    tri = sum(cc.tri_count(o) for o in PIEZAS); unidos = []
    MATS = (('cab_jaula', 'cupula_jaula'), ('cab_marco', 'cupula_marco'), ('cab_forro', 'cupula_forro'), ('cab_blanco', 'cupula_blanco'), ('cab_vidrio_cup', 'cupula_vidrio'))
    grupos = {mat: [o for o in PIEZAS if o.data.materials[0].name == mat] for mat, _ in MATS}
    for mat, nombre in MATS:
        grupo = grupos[mat]
        bpy.ops.object.select_all(action='DESELECT')
        for o in grupo: o.select_set(True)
        bpy.context.view_layer.objects.active = grupo[0]; bpy.ops.object.join(); grupo[0].name = nombre; grupo[0].data.name = nombre; unidos.append(grupo[0])
    v = bpy.data.materials['cab_vidrio_cup']; v.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.16
    for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
        try: setattr(v, attr, val)
        except Exception: pass
    for m, _ in MATS: bpy.data.materials[m].use_backface_culling = False
    bpy.data.materials['cab_blanco'].node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.15   # → specularFactor 0,3: igual que la piel del FSN (mat02)
    peso = cc.exportar(unidos, SALIDA)
    ok_p = tri <= 12000 and len(unidos) <= 8 and peso / 1e6 <= 0.4
    print(('  OK   ' if ok_p else '  FALLA') + f' presupuesto → {tri} triángulos (máx. 12000) · {len(unidos)} llamadas (máx. 8) · {peso / 1e6:.2f} MB (máx. 0,4)')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': '1b.1', 'piezas': len(PIEZAS), 'triangulos': tri, 'llamadas': len(unidos), 'mb': round(peso / 1e6, 3),
                   'chequeos': {k: {'ok': bool(v_[0]), 'detalle': v_[1]} for k, v_ in r.items()},
                   'vidrio_contra_cano_mm': sueltos, 'silueta_desde_la_360_mm': silueta, 'estanqueidad_frente': {'rayos': n_rayos, 'escapes': len(escapes), 'direcciones': escapes[:50]}, 'estanqueidad_techo': {'rayos': n_t, 'escapes': len(escapes_t), 'direcciones': escapes_t[:50]}}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
