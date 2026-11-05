# Cúpula nueva · etapa 1b.0 · MEDICIÓN: de las marcas sobre la foto 360 del asiento (DSCN0054) a puntos 3D en el
# marco de la cabina (PLAN_CUPULA.md §4).
#
# Entradas: blender/calcado/marcas54.json (bordes rectos = arcos de círculo máximo afinados con cab_borde360.py, y
# rasgos sueltos; todo en grados de la FOTO) y la pose de la toma (pose54.json).
# Cada marca es un rayo que sale de la pupila de SU lente (cab_foto360.py: la KeyMission 360 son dos ojos de pez
# espalda con espalda, con las pupilas a ±1,1 cm del centro y la lente trasera girada 0,25°; a 50 cm eso es hasta
# 1 cm) y se corta con la superficie que le toca:
#   parabrisas   plano del paño central: z = 0,74 + 0,93·(y − 1,02) (medido en el FSN el 1/11)
#   puerta_*     plano de la ventana de cada puerta: ajustado a los impactos de sus bordes en el FSN y hecho SIMÉTRICO
#   lateral_*    plano de cada paño lateral: por el borde exterior del parante y el borde delantero de la ventana de puerta
#   casco        el fuselaje FSN (exterior.glb) por rayos: ventanas del techo (si todavía no está lo de afuera)
#   jaula        el techo del FSN corrido 2,5 cm hacia afuera: los caños de la jaula del techo (PROVISORIO, ±4 cm: desde el
#                asiento, que está sobre el plano de simetría, no hay cómo medir la altura del techo)
# Las ESQUINAS se calculan en 3D (cruce de las rectas de los bordes dentro de su plano), no sobre la foto: un borde
# que cruza la costura se ve desde dos pupilas y no es un solo círculo máximo.
#
# Con --ajustar:
#   1. POSE por SIMETRÍA: se buscan el corrimiento lateral de la cámara (dx), el yaw y el roll que dejan espejo los
#      rasgos izquierdos y derechos (parantes, bordes y esquinas de las ventanas de puerta). y, z y pitch quedan del
#      calcado de la etapa 0 (pose54_etapa0.json): la simetría no los ve.
#      Junto con la pose se ajusta el giro de la lente trasera alrededor de la vertical (queda en la pose como
#      «lente_giro»; --sin-gy lo deja fijo).
#   2. LENTE (control): con el giro de la lente trasera alrededor del eje ya corregido (cab_costura360.py), los
#      bordes que cruzan la costura tienen que dar la MISMA recta en 3D vistos por la lente delantera y por la
#      trasera; se imprime el salto que queda para varios b (media separación de las pupilas) y el b que lo anula.
# Si ya está blender/calcado/cupula_afuera.json (cab_cupula_afuera.py), suma lo medido desde afuera, apoya las ventanas
# del techo en un plano que pasa por sus puntas y compara la forma de la ventana de puerta de adentro con la de afuera.
# Salida: blender/calcado/cupula_puntos.json y, con --ajustar, pose54.json corregida.
# Orden: cab_cupula_marcas.py → éste con --ajustar → cab_cupula_afuera.py → éste otra vez → cab_cupula_lamina.py.
# Uso: blender.exe -b --factory-startup --python herramientas/cab_cupula_puntos.py -- [--ajustar] [--b 0.011] [--giro gx,gy,gz] [--sin-gy]
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_foto360 as f3

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def opcion(nombre, defecto): return args[args.index(nombre) + 1] if nombre in args else defecto
CARPETA = os.path.join(cc.RAIZ, 'blender', 'calcado')
MARCAS = opcion('--marcas', os.path.join(CARPETA, 'marcas54.json'))
POSE = opcion('--pose', os.path.join(CARPETA, 'pose54.json'))
POSE_BASE = opcion('--pose-base', os.path.join(CARPETA, 'pose54_etapa0.json'))   # calcado de la etapa 0: de ahí salen y, z y pitch
SALIDA = opcion('--salida', os.path.join(CARPETA, 'cupula_puntos.json'))
EXTRA = opcion('--extra', os.path.join(CARPETA, 'cupula_afuera.json'))          # lo medido en las 360 de afuera (cab_cupula_afuera.py), si existe
AJUSTAR = '--ajustar' in args
B_FIJO = float(opcion('--b', 'nan'))
GIRO_FIJO = tuple(math.radians(float(v)) for v in opcion('--giro', '').split(',')) if '--giro' in args else None   # grados: gx,gy,gz
LIBRE_GY = '--sin-gy' not in args                                           # por defecto, el giro de la lente trasera alrededor de la vertical sale de la simetría
N = 9                                                                           # muestras por borde
_n = np.array([0.0, -0.93, 1.0]); PARABRISAS = (np.array([0.0, 1.02, 0.74]), _n / np.linalg.norm(_n))
GRUPOS = ('del', 'inf', 'tras', 'sup')                                          # bordes de la ventana de puerta
ESQUINAS = (('del_inf', 'del', 'inf'), ('tras_inf', 'inf', 'tras'), ('tras_sup', 'tras', 'sup'), ('del_sup', 'sup', 'del'))
PRECISION = {'parabrisas': (1.0, 3.0), 'puerta': (1.0, 3.5), 'lateral': (1.5, 3.0), 'casco': (1.5, 3.0), 'techo': (1.5, 3.0), 'jaula': (2.0, 4.0)}
JAULA_FUERA = 0.025                                                             # m: eje de los caños del techo respecto del techo del FSN (el techo real queda unos 5 cm por fuera)   # cm: (lateral/vertical, profundidad)

def unit(v): return v / np.linalg.norm(v)
def redondo(p, n=4): return [round(float(v), n) for v in p]

def muestras(b, n=N):
    """n puntos (lon, lat) a lo largo del arco A→B."""
    a, c = f3.dir_foto(*b['A']), f3.dir_foto(*b['B']); ang = math.acos(float(np.clip(a @ c, -1, 1))); e = unit(c - (a @ c) * a)
    return [f3.lonlat(math.cos(s) * a + math.sin(s) * e) for s in np.linspace(0, ang, n)]

def superficie(nombre):
    if nombre.startswith(('parante_', 'parabrisas_', 'tablero_')): return 'parabrisas'
    for lado in ('izq', 'der'):
        if nombre.startswith((f'puerta_{lado}', f'ojo_{lado}')): return f'puerta_{lado}'
        if nombre.startswith((f'lateral_{lado}', f'posteA_{lado}')): return f'lateral_{lado}'
    if nombre.startswith('techo_'): return nombre[:9]                           # techo_izq / techo_der: su plano si ya se midió desde afuera; si no, el casco FSN
    if nombre.startswith('jaula_') and 'lambda' not in nombre: return 'jaula'   # (los dos caños que bajan hacia atrás quedan sólo como marcas: no hay con qué darles profundidad)
    return None                                                                  # sólo control (ventanilla trasera vista desde el asiento)

def recta_3d(pts):
    P = np.array(pts); c = P.mean(0); d = np.linalg.svd(P - c)[2][0]
    return c, unit(d)

def dist_a_recta_3d(p, r):
    c, d = r; v = p - c
    return float(np.linalg.norm(v - (v @ d) * d))

def semejanza_2d(A, B):
    """Residuo de llevar los puntos 2D A sobre B con la mejor semejanza (giro, escala, traslación): (rms, escala, residuo por punto), en las unidades de B."""
    mejor = None
    for refl in (1, -1):
        a = (A * np.array([1, refl])); a = a - a.mean(0); c = B - B.mean(0)
        za, zb = a[:, 0] + 1j * a[:, 1], c[:, 0] + 1j * c[:, 1]; k = (np.conj(za) @ zb) / (np.conj(za) @ za); r = np.abs(zb - k * za)
        if mejor is None or float(np.sqrt(np.mean(r ** 2))) < mejor[0]: mejor = (float(np.sqrt(np.mean(r ** 2))), float(abs(k)), r)
    return mejor

def en_su_plano(P):
    P = np.asarray(P, float); c = P.mean(0); return (P - c) @ np.linalg.svd(P - c)[2][:2].T

def control_de_forma(rayos, plano, afuera_pts):
    """La ventana de puerta vista desde el asiento (4 esquinas y ojo de buey, proyectados al plano de la puerta) contra la
    FORMA que dan las dos 360 de afuera (rígida: no depende del plano). Devuelve el residuo con el plano adoptado y la
    orientación del plano (convergencia hacia atrás y caída hacia adentro, en grados) que mejor las reconcilia."""
    c0, n0 = plano; n0 = n0 if n0[0] > 0 else -n0; O2 = en_su_plano(afuera_pts)
    def forma(toe, lean):
        t, l = math.radians(toe), math.radians(lean); n = np.array([math.cos(l) * math.cos(t), math.sin(l), math.cos(l) * math.sin(t)])
        Q = [np.mean([f3.cortar_plano(o, d, (c0, n)) for o, d in par], 0) for par in rayos]
        return semejanza_2d(en_su_plano(Q), O2)
    toe0, lean0 = math.degrees(math.atan2(n0[2], n0[0])), math.degrees(math.asin(n0[1])); r0 = forma(toe0, lean0)
    mejor = (r0[0], toe0, lean0)
    for paso in (2.0, 0.5):
        _, tc, lc = mejor
        for t in np.arange(tc - 8 * paso, tc + 8 * paso + 1e-9, paso):
            for l in np.arange(lc - 8 * paso, lc + 8 * paso + 1e-9, paso):
                r = forma(t, l)[0]
                if r < mejor[0]: mejor = (r, float(t), float(l))
    return {'rms_cm': round(r0[0] * 100, 2), 'por_punto_cm': [round(float(v) * 100, 1) for v in r0[2]], 'plano_adoptado_grados': {'convergencia': round(toe0, 1), 'caida': round(lean0, 1)},
            'mejor_plano_grados': {'convergencia': round(mejor[1], 1), 'caida': round(mejor[2], 1), 'rms_cm': round(mejor[0] * 100, 2)},
            'nota': 'por_punto: esquinas del_inf, tras_inf, tras_sup, del_sup y ojo de buey. Las fotos de afuera fijan la forma del vidrio pero no la orientación del plano de la puerta (el ANCHO de la '
                    'cabina): eso sale del FSN. Si el plano real convergiera y cayera como «mejor_plano», las esquinas se correrían hasta 5 cm en x. SIN RESOLVER con fotos: se define con medidas de '
                    'cinta (ancho de la cabina en el antepecho adelante y atrás de la puerta, y en el borde de arriba de la puerta)'}

def simetrizar(pi, pd):
    """Par de planos espejo: promedio del izquierdo y del derecho reflejado; y cuánto diferían (m)."""
    (ci, ni), (cd, nd) = pi, pd
    if ni[0] < 0: ni = -ni
    if nd[0] > 0: nd = -nd
    n = unit(ni + f3.espejo(nd)); c = (ci + f3.espejo(cd)) / 2
    dif = abs(float((ci - c) @ n)) + abs(float((f3.espejo(cd) - c) @ n))
    return (c, n), (f3.espejo(c), f3.espejo(n)), dif


class Medicion:
    def __init__(self, marcas, casco):
        self.bordes = {k: (muestras(v), 1 if v['lente'] == 'F' else -1) for k, v in marcas['bordes'].items()}
        self.rasgos = {k: [(lo, la) for lo, la in v] for k, v in marcas['rasgos'].items()}
        self.casco = casco
        self.planos = {'parabrisas': PARABRISAS}
        self.b, self.giro = f3.LENTE, f3.GIRO_T                                  # modelo de las dos lentes

    # ---- rayos y cortes ----
    def rayos(self, nombre, pos, R):
        if nombre in self.bordes: pts, s = self.bordes[nombre]; pts = [(lo, la, s) for lo, la in pts]
        else: pts = [(lo, la, f3.lente(lo)) for lo, la in self.rasgos[nombre]]
        return [f3.rayo(pos, R, lo, la, self.b, self.giro, s) + (lo, la, s) for lo, la, s in pts]

    def en_casco(self, o, d):
        h = self.casco.rayo(Vector(o), Vector(d), dist=3.0, vidrio=True, saltar=0.25)
        return (np.array(h[0]), 'vidrio' if h[3] else 'chapa', h[2]) if h else (None, None, None)

    def en_techo(self, o, d, fuera):
        """El techo del FSN corrido `fuera` metros a lo largo de su normal, por ese rayo."""
        h = self.casco.rayo(Vector(o), Vector(d), dist=3.0, vidrio=True, saltar=0.25)
        if h is None: return None, None, None
        n = np.array(h[1]); c = max(0.3, abs(float(d @ n) / (np.linalg.norm(n) * np.linalg.norm(d))))
        return np.array(h[0]) + d / np.linalg.norm(d) * (fuera / c), 'techo FSN + %.1f cm' % (fuera * 100), h[2]

    def p3d(self, nombre, pos, R, sup=None):
        """[(punto o None, lon, lat, lente, toca)] del borde o rasgo, cortado con su superficie."""
        sup = sup or superficie(nombre); out = []
        if sup not in self.planos and sup != 'jaula': sup = 'casco'
        for o, d, lo, la, s in self.rayos(nombre, pos, R):
            if sup == 'jaula': p, toca, _ = self.en_techo(o, d, JAULA_FUERA)
            elif sup == 'casco': p, toca, _ = self.en_casco(o, d)
            else: p = f3.cortar_plano(o, d, self.planos[sup]); toca = 'plano'
            out.append((p, lo, la, s, toca))
        return out

    def pts(self, nombre, pos, R, sup=None):
        return [q[0] for q in self.p3d(nombre, pos, R, sup) if q[0] is not None]

    def nombres_de(self, prefijo):
        return [k for k in self.bordes if k == prefijo or k.startswith(prefijo + '_')]

    # ---- planos ----
    def planos_de_puerta(self, pos, R, ver=False):
        """Plano de cada ventana de puerta por los impactos de sus bordes en el FSN; después, simétricos."""
        aj = {}
        for lado in ('izq', 'der'):
            hits = []
            for g in GRUPOS:
                for nombre in self.nombres_de(f'puerta_{lado}_{g}'):
                    for o, d, lo, la, s in self.rayos(nombre, pos, R):
                        p, toca, dist = self.en_casco(o, d)
                        if p is not None and dist < 1.2: hits.append(p)
            c, n = f3.plano_por_puntos(hits)
            buenos = [p for p in hits if abs(float((p - c) @ n)) < 0.03]
            if len(buenos) >= 6: c, n = f3.plano_por_puntos(buenos)
            aj[lado] = (c, n)
            if ver: print(f'  plano de puerta {lado} (FSN): {len(buenos)}/{len(hits)} impactos a menos de 3 cm · por ({c[0]:.3f}, {c[1]:.3f}, {c[2]:.3f}) normal ({n[0]:.3f}, {n[1]:.3f}, {n[2]:.3f})')
        self.planos['puerta_izq'], self.planos['puerta_der'], dif = simetrizar(aj['izq'], aj['der'])
        if ver: print(f'  planos de puerta simétricos (antes de promediar diferían {dif * 100:.1f} cm)')
        return dif

    def planos_laterales(self, pos, R, ver=False):
        """Plano de cada paño lateral: por el borde exterior del parante y el borde delantero de la ventana de puerta."""
        aj = {}
        for lado in ('izq', 'der'):
            p = self.pts(f'parante_{lado}_ext', pos, R) + [q for q in self.pts(f'puerta_{lado}_del', pos, R) if q[1] > 1.25]
            aj[lado] = f3.plano_por_puntos(p)
        self.planos['lateral_izq'], self.planos['lateral_der'], dif = simetrizar(aj['izq'], aj['der'])
        if ver:
            c, n = self.planos['lateral_der']; print(f'  planos laterales simétricos: der. por ({c[0]:.3f}, {c[1]:.3f}, {c[2]:.3f}) normal ({n[0]:.3f}, {n[1]:.3f}, {n[2]:.3f}) (diferían {dif * 100:.1f} cm)')

    # ---- ventana de puerta: rectas de los 4 bordes en el plano y esquinas en 3D ----
    def ventana(self, lado, pos, R):
        plano = self.planos[f'puerta_{lado}']; ejes = f3.base_del_plano(plano)
        partes, grupos, rectas = {}, {}, {}
        for g in GRUPOS:
            grupos[g] = []
            for nombre in self.nombres_de(f'puerta_{lado}_{g}'):
                partes[nombre] = self.pts(nombre, pos, R); grupos[g] += partes[nombre]
            rectas[g] = f3.recta_2d([f3.a_2d(p, plano, ejes) for p in grupos[g]])
        esq = {e: f3.a_3d(f3.cruce_2d(rectas[g1], rectas[g2]), plano, ejes) for e, g1, g2 in ESQUINAS}
        return {'plano': plano, 'ejes': ejes, 'partes': partes, 'grupos': grupos, 'rectas': rectas, 'esq': esq}

    def costura(self, pos, R):
        """Para cada borde que cruza la costura con las dos partes medidas: cuánto se separan en la costura la recta
        vista por la lente trasera y la vista por la delantera (cm, con signo; + = la trasera queda más arriba)."""
        out = {}
        for lado in ('izq', 'der'):
            v = self.ventana(lado, pos, R); plano, ejes = v['plano'], v['ejes']
            for g in ('sup', 'inf'):
                F, T = v['partes'].get(f'puerta_{lado}_{g}_F'), v['partes'].get(f'puerta_{lado}_{g}_T')
                if not F or not T: continue
                qF = np.array([f3.a_2d(p, plano, ejes) for p in F]); qT = np.array([f3.a_2d(p, plano, ejes) for p in T])
                x = (qF[:, 0].max() + qT[:, 0].min()) / 2                       # e1 ≈ hacia atrás: la costura queda entre las dos partes
                def y_en(q):
                    c, d = f3.recta_2d(q); return c[1] + (x - c[0]) * d[1] / d[0]
                P = f3.a_3d(np.array([x, y_en(qF)]), plano, ejes)
                out[f'puerta_{lado}_{g}'] = {'salto_cm': float(y_en(qT) - y_en(qF)) * 100, 'dist_m': float(np.linalg.norm(P - np.asarray(pos)))}
        return out

    # ---- asimetría (para el ajuste de la pose) ----
    def asimetria(self, pos, R, detalle=False):
        d, det = [], {}
        def lineas(nombre, A, Bp):                                              # puntos de un lado contra la recta del otro, reflejada
            if len(A) < 2 or len(Bp) < 2: return
            rb = recta_3d(Bp); ra = recta_3d(A)
            v = [dist_a_recta_3d(f3.espejo(p), rb) for p in A] + [dist_a_recta_3d(f3.espejo(p), ra) for p in Bp]
            det[nombre] = v; d.extend(v)
        for k in ('int', 'ext'): lineas(f'parante_{k}', self.pts(f'parante_izq_{k}', pos, R), self.pts(f'parante_der_{k}', pos, R))
        vi, vd = self.ventana('izq', pos, R), self.ventana('der', pos, R)
        for g in GRUPOS: lineas(f'puerta_{g}', vi['grupos'][g], vd['grupos'][g])
        esq = [float(np.linalg.norm(f3.espejo(vi['esq'][e]) - vd['esq'][e])) for e, _, _ in ESQUINAS]
        det['puerta_esquinas'] = esq; d.extend(esq * N)                         # cada esquina pesa como un borde
        rms = math.sqrt(sum(x * x for x in d) / len(d))
        return (rms, det) if detalle else rms

    def ajustar_pose(self, base, libres=('dx', 'yaw', 'roll'), ver=True):
        """Parámetros de menor asimetría. Siempre dx, yaw y roll de la cámara (y, z y pitch quedan fijos); como
        diagnóstico pueden liberarse también 'gy' y 'gz' (giro de la lente trasera alrededor de la vertical y del eje)."""
        x0, y0, z0 = base['pos']; pitch = base['pitch']; giro0 = self.giro
        p = {'dx': 0.0, 'yaw': base['yaw'], 'roll': base['roll'], 'gy': giro0[1], 'gz': giro0[2]}
        def costo(q):
            self.giro = (giro0[0], q['gy'], q['gz'])
            return self.asimetria((x0 + q['dx'], y0, z0), f3.rotacion(q['yaw'], pitch, q['roll']))
        c_base = costo(p); mejor = (c_base, dict(p))
        for dx in np.arange(-0.06, 0.0601, 0.01):                              # grilla gruesa en dx, yaw, roll
            for dyaw in np.radians(np.arange(-3.0, 3.01, 0.5)):
                for droll in np.radians(np.arange(-2.0, 2.01, 0.5)):
                    q = dict(p, dx=float(dx), yaw=base['yaw'] + float(dyaw), roll=base['roll'] + float(droll)); c = costo(q)
                    if c < mejor[0]: mejor = (c, q)
        paso = {'dx': 0.005, 'yaw': math.radians(0.25), 'roll': math.radians(0.25), 'gy': math.radians(0.1), 'gz': math.radians(0.1)}
        for _ in range(60):                                                     # búsqueda por coordenadas con paso que se achica
            c0 = mejor[0]
            for k in libres:
                for sg in (-1, 1):
                    q = dict(mejor[1]); q[k] += sg * paso[k]; c = costo(q)
                    if c < mejor[0]: mejor = (c, q)
            if mejor[0] >= c0 - 1e-8:
                paso = {k: v / 2 for k, v in paso.items()}
                if paso['dx'] < 2e-5: break
        c, q = mejor
        sens = {}
        for nombre, k, d in (('dx ±1 cm', 'dx', 0.01), ('yaw ±0,5°', 'yaw', math.radians(0.5)), ('roll ±0,5°', 'roll', math.radians(0.5))):
            sens[nombre] = round(max(costo(dict(q, **{k: q[k] + sg * d})) for sg in (-1, 1)) * 100, 2)
        costo(q)
        if ver:
            extra = ''.join(f', {k} {math.degrees(q[k]):+.2f}°' for k in libres if k in ('gy', 'gz'))
            print(f'    pose ({", ".join(libres)}): asimetría {c_base * 100:.2f} → {c * 100:.2f} cm con dx {q["dx"] * 100:+.2f} cm, yaw {math.degrees(q["yaw"]):.2f}°, roll {math.degrees(q["roll"]):.2f}°{extra} · sensibilidad {sens}')
        return {'pos': [x0 + q['dx'], y0, z0], 'yaw': q['yaw'], 'pitch': pitch, 'roll': q['roll'], 'asimetria_cm': round(c * 100, 2), 'sensibilidad_cm': sens,
                'giro': (giro0[0], q['gy'], q['gz'])}

    def ajustar(self, base, libres=('dx', 'yaw', 'roll'), pasadas=2, ver=True):
        """Pose por simetría; los planos de puerta se vuelven a medir con la pose afinada."""
        pose = dict(base); giro0 = self.giro
        for k in range(pasadas):
            self.planos_de_puerta(pose['pos'], f3.rotacion(pose['yaw'], pose['pitch'], pose['roll']))
            self.giro = giro0; pose = self.ajustar_pose(base, libres, ver=ver and k == pasadas - 1)
        return pose


if __name__ == '__main__':
    t0 = time.time()
    marcas = json.load(open(MARCAS, encoding='utf-8'))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    m = Medicion(marcas, cc.Casco(mostrar=False))
    print(f'CASCO listo ({time.time() - t0:.0f} s) · marcas: {len(m.bordes)} bordes y {len(m.rasgos)} rasgos')
    calib = None
    if not math.isnan(B_FIJO): m.b = B_FIJO
    if GIRO_FIJO: m.giro = GIRO_FIJO
    if AJUSTAR:
        base = json.load(open(POSE_BASE if os.path.exists(POSE_BASE) else POSE, encoding='utf-8'))
        b_adoptado, giro = m.b, m.giro
        print(f'LENTE (control): salto que queda en la costura, con el giro de la lente trasera corregido ({math.degrees(giro[2]):+.2f}°), según b:')
        tabla = []
        for bb in (0.0, 0.005, 0.011, 0.015, 0.02, 0.03):
            m.b, m.giro = bb, giro
            pose = m.ajustar(base, ver=False); co = m.costura(pose['pos'], f3.rotacion(pose['yaw'], pose['pitch'], pose['roll'])); tabla.append((bb, pose['asimetria_cm'], co))
            print(f'    b = {bb * 100:.1f} cm: asimetría {pose["asimetria_cm"]:.2f} cm · saltos ' + ' · '.join(f'{k} {v["salto_cm"]:+.2f} cm' for k, v in co.items()))
        bs = np.array([t[0] for t in tabla]); calib = {'b_por_borde_cm': {}, 'tabla': [{'b_cm': round(t[0] * 100, 2), 'asimetria_cm': t[1], 'saltos_cm': {k: round(v['salto_cm'], 2) for k, v in t[2].items()}} for t in tabla]}
        num = den = 0.0
        for k in tabla[0][2]:
            sal = np.array([t[2][k]['salto_cm'] for t in tabla]); p1, p0 = np.polyfit(bs, sal, 1)
            calib['b_por_borde_cm'][k] = round(-p0 / p1 * 100, 2); num += -p0 * p1; den += p1 * p1
            print(f'    {k}: el salto se anula con b = {-p0 / p1 * 100:.2f} cm')
        calib['b_minimos_cuadrados_cm'] = round(float(num / den) * 100, 2)
        print(f'    los dos bordes juntos: b = {num / den * 100:.2f} cm · adoptado b = {b_adoptado * 100:.2f} cm (cab_foto360.LENTE, o --b)')
        m.b, m.giro = b_adoptado, giro
        print('POSE por simetría:')
        for libres in (('dx', 'yaw', 'roll', 'gz'), ('dx', 'yaw', 'roll', 'gy'), ('dx', 'yaw', 'roll', 'gy', 'gz')):   # diagnóstico: ¿la simetría pide otro giro de la lente trasera?
            m.giro = giro; d = m.ajustar(base, libres, ver=True)
        m.giro = giro
        if LIBRE_GY:                                                             # el giro de la lente trasera alrededor de la vertical sale de la simetría
            pose = m.ajustar(base, ('dx', 'yaw', 'roll', 'gy'), pasadas=3); giro = pose['giro']
            print(f'  adoptado el giro de la lente trasera alrededor de la vertical: {math.degrees(giro[1]):+.2f}°')
        else: pose = m.ajustar(base, pasadas=3)
        m.giro = giro
        pose.update({'iou': base.get('iou'), 'lente_m': round(m.b, 4), 'lente_giro': [float(v) for v in giro],
                     'nota': 'marco cabina (m); ángulos en rad; d_cabina = Rx(pitch)·Rz(roll)·Ry(yaw)·d_cámara; yaw positivo = la cámara gira a la izquierda; pitch positivo = mira arriba · '
                             'pos = centro de la cámara; cada lente mira desde pos ± lente_m·frente y la trasera va girada lente_giro (cab_foto360.py) · 1b.0 (5/11): dx, yaw y roll por SIMETRÍA de '
                             'parantes y ventanas de puerta (cab_cupula_puntos.py --ajustar); y, z y pitch son los del calcado de la etapa 0 (pose54_etapa0.json)'})
        del pose['giro']
        with open(POSE, 'w', encoding='utf-8') as f: json.dump(pose, f, indent=1, ensure_ascii=False)
        print('  →', POSE)
    else:
        pose = json.load(open(POSE, encoding='utf-8'))
    pos, R, b, giro = f3.pose_de(pose)
    if not math.isnan(B_FIJO): b = B_FIJO
    if GIRO_FIJO and not AJUSTAR: giro = GIRO_FIJO
    m.b, m.giro = b, giro
    print(f'POSE: centro ({pos[0]:.3f}, {pos[1]:.3f}, {pos[2]:.3f}) · yaw {math.degrees(pose["yaw"]):.2f}° pitch {math.degrees(pose["pitch"]):.2f}° roll {math.degrees(pose["roll"]):.2f}° · lente b = {b * 100:.2f} cm, giro de la trasera ({math.degrees(giro[0]):+.2f}°, {math.degrees(giro[1]):+.2f}°, {math.degrees(giro[2]):+.2f}°)')
    dif_puerta = m.planos_de_puerta(pos, R, ver=True); m.planos_laterales(pos, R, ver=True)
    afuera = json.load(open(EXTRA, encoding='utf-8')) if os.path.exists(EXTRA) else None
    if afuera:                                                                  # ventanas del techo: plano por las puntas medidas desde afuera, con la inclinación del techo del FSN ahí
        t = [np.array(afuera['rasgos'][k]['p3d_der']) for k in ('techo_punta_del', 'techo_punta_tras')]
        c, n = f3.plano_por_puntos(m.pts('techo_der', pos, R, 'casco')); n = n if n[1] > 0 else -n
        centro = (t[0] + t[1]) / 2; sube = float((centro - c) @ n)
        m.planos['techo_der'] = (centro, n); m.planos['techo_izq'] = (f3.espejo(centro), f3.espejo(n))
        print(f'  plano de las ventanas del techo: por las puntas medidas desde afuera, normal ({n[0]:.3f}, {n[1]:.3f}, {n[2]:.3f}); queda {sube * 100:+.1f} cm por encima del techo del FSN')
    rms, det = m.asimetria(pos, R, detalle=True)
    asim = {k: {'media_cm': round(float(np.mean(v)) * 100, 2), 'max_cm': round(float(max(v)) * 100, 2)} for k, v in det.items()}
    print(f'ASIMETRÍA izq./der.: {rms * 100:.2f} cm (media cuadrática) · ' + ' · '.join(f'{k} {v["media_cm"]}/{v["max_cm"]}' for k, v in asim.items()) + ' (media/máx, cm)')
    cost = m.costura(pos, R)
    print('COSTURA: ' + ' · '.join(f'{k} salto {v["salto_cm"]:+.2f} cm a {v["dist_m"]:.2f} m' for k, v in cost.items()))

    # ================= puntos =================
    puntos, P = [], {}                                                          # lista plana para el json · P[nombre] = punto 3D
    def anotar(nombre, rasgo, p, lo, la, s, sup, toca='plano', prov=False, calculado=False):
        fam = sup.split('_')[0] if sup else 'casco'; prec = PRECISION.get(fam, (1.5, 3.0))
        if p is not None: P[nombre] = p
        puntos.append({'nombre': nombre, 'rasgo': rasgo, 'p3d': redondo(p) if p is not None else None, 'foto': 'DSCN0054',
                       'lon_lat': [round(lo, 3), round(la, 3)] if lo is not None else None, 'px': f3.pixel(lo, la) if lo is not None else None,
                       'lente': None if s is None else ('delantera' if s > 0 else 'trasera'), 'superficie': sup, 'toca': toca,
                       'precision_cm': {'lateral_vertical': prec[0], 'profundidad': prec[1]}, 'provisorio': prov, 'calculado_en_3d': calculado})
    def anotar_calculado(nombre, rasgo, p, sup):
        ll = f3.proyectar(pos, R, p, b, giro)
        anotar(nombre, rasgo, p, ll[0] if ll else None, ll[1] if ll else None, f3.lente(ll[0]) if ll else None, sup, calculado=True)
    # bordes (9 muestras cada uno) y rasgos sueltos
    NOMBRES = {'ojo_izq': ['centro'], 'ojo_der': ['centro'], 'ojo_izq_disco': ['tras', 'del', 'sup', 'inf'], 'ojo_der_disco': ['del', 'tras', 'sup', 'inf'],
               'lateral_izq_base': ['visible'], 'lateral_der_base': ['visible']}
    for nombre in list(m.bordes) + list(m.rasgos):
        sup = superficie(nombre)
        if sup is None: continue
        for i, (p, lo, la, s, toca) in enumerate(m.p3d(nombre, pos, R)):
            anotar(f'{nombre}_{NOMBRES[nombre][i]}' if nombre in NOMBRES else f'{nombre}_{i}', nombre, p, lo, la, s, sup, toca, prov=nombre.startswith(('techo_', 'tablero_', 'jaula_')))
    # ventanas de puerta: esquinas en 3D
    V = {lado: m.ventana(lado, pos, R) for lado in ('izq', 'der')}
    for lado in ('izq', 'der'):
        for e, _, _ in ESQUINAS: anotar_calculado(f'puerta_{lado}_esq_{e}', f'puerta_{lado}_esq', V[lado]['esq'][e], f'puerta_{lado}')
    # parabrisas: rectas de los parantes y del borde superior en su plano; esquinas superiores del paño central
    ejes_p = f3.base_del_plano(PARABRISAS)
    def recta_p(nombres, reflejar=()):
        q = [f3.a_2d(f3.espejo(p) if n in reflejar else p, PARABRISAS, ejes_p) for n in nombres for p in m.pts(n, pos, R)]
        return f3.recta_2d(q)
    r_sup = recta_p(['parabrisas_sup'])
    for lado in ('izq', 'der'):
        anotar_calculado(f'parabrisas_esq_sup_{lado}', 'parabrisas_esq', f3.a_3d(f3.cruce_2d(recta_p([f'parante_{lado}_int']), r_sup), PARABRISAS, ejes_p), 'parabrisas')
    # paños laterales: borde superior y borde delantero del poste A en su plano; esquinas
    L = {}
    for lado in ('izq', 'der'):
        plano = m.planos[f'lateral_{lado}']; ejes = f3.base_del_plano(plano)
        def r2(nombre): return f3.recta_2d([f3.a_2d(p, plano, ejes) for p in m.pts(nombre, pos, R, f'lateral_{lado}')])
        rs, rp, ra = r2(f'lateral_{lado}_sup'), r2(f'parante_{lado}_ext'), r2(f'posteA_{lado}_del')
        L[lado] = {'sup_parante': f3.a_3d(f3.cruce_2d(rs, rp), plano, ejes), 'sup_posteA': f3.a_3d(f3.cruce_2d(rs, ra), plano, ejes)}
        for k, p in L[lado].items(): anotar_calculado(f'lateral_{lado}_esq_{k}', f'lateral_{lado}_esq', p, f'lateral_{lado}')

    # ================= versión SIMÉTRICA (lado derecho, x > 0; el izquierdo es su espejo) =================
    sim = {}
    def par(clave, ni, nd):
        if ni in P and nd in P:
            q = (f3.espejo(P[ni]) + P[nd]) / 2
            sim[clave] = {'p3d_der': redondo(q), 'p3d_izq': redondo(f3.espejo(q)), 'asimetria_cm': round(float(np.linalg.norm(f3.espejo(P[ni]) - P[nd])) * 100, 1)}
    for e, _, _ in ESQUINAS: par(f'puerta_esq_{e}', f'puerta_izq_esq_{e}', f'puerta_der_esq_{e}')
    par('ojo_centro', 'ojo_izq_centro', 'ojo_der_centro')
    par('parabrisas_esq_sup', 'parabrisas_esq_sup_izq', 'parabrisas_esq_sup_der')
    for k in ('sup_parante', 'sup_posteA'): par(f'lateral_esq_{k}', f'lateral_izq_esq_{k}', f'lateral_der_esq_{k}')
    par('lateral_base_visible', 'lateral_izq_base_visible', 'lateral_der_base_visible')
    # parante (el derecho): bordes interior y exterior como rectas, con los dos lados juntos (el izquierdo reflejado)
    ri = recta_p(['parante_izq_int', 'parante_der_int'], reflejar=('parante_izq_int',)); re_ = recta_p(['parante_izq_ext', 'parante_der_ext'], reflejar=('parante_izq_ext',))
    def en_y(r, y):                                                             # punto 3D de la recta (en el plano del parabrisas) a la altura y
        c3, d3 = f3.a_3d(r[0], PARABRISAS, ejes_p), f3.a_3d(r[0] + r[1], PARABRISAS, ejes_p) - f3.a_3d(r[0], PARABRISAS, ejes_p)
        return c3 + d3 * ((y - c3[1]) / d3[1])
    y_tope = sim['parabrisas_esq_sup']['p3d_der'][1]
    tab = [p for p in m.pts('tablero_sup', pos, R)]; y_tab = float(np.mean([p[1] for p in tab]))
    eje = lambda y: (en_y(ri, y) + en_y(re_, y)) / 2
    sim['parante'] = {'nota': 'lado derecho; eje = línea media de la banda oscura (caño + burletes) en el plano del parabrisas; base_visible = donde lo tapa el parasol del tablero; base_antepecho = prolongado hasta y 0,95 (PROVISORIO)',
                      'tope': redondo(eje(y_tope)), 'base_visible': redondo(eje(y_tab)), 'base_antepecho_provisoria': redondo(eje(0.95)),
                      'borde_interior': [redondo(en_y(ri, y_tab)), redondo(en_y(ri, y_tope))], 'borde_exterior': [redondo(en_y(re_, y_tab)), redondo(en_y(re_, y_tope))],
                      'ancho_visible_cm': [round(float(np.linalg.norm(en_y(ri, y) - en_y(re_, y))) * 100, 1) for y in (y_tab, y_tope)]}
    # ventana del techo: la derecha se ve desde la costura hacia atrás y la izquierda de la punta delantera hasta donde la tapa
    # la jaula: el contorno simétrico junta la derecha con la parte de la izquierda (reflejada) que queda delante de ella
    td = [np.array(q['p3d']) for q in puntos if q['rasgo'] == 'techo_der' and q['p3d']]; ti = [f3.espejo(q['p3d']) for q in puntos if q['rasgo'] == 'techo_izq' and q['p3d']]
    if td and ti:
        z_corte = min(p[2] for p in td) + 0.01
        junto = td + [p for p in ti if p[2] < z_corte]
        pl_t = m.planos.get('techo_der') or f3.plano_por_puntos(junto); ej_t = f3.base_del_plano(pl_t)
        q2 = [f3.a_2d(p, pl_t, ej_t) for p in junto]; c2 = np.mean(q2, 0)
        orden = sorted(range(len(junto)), key=lambda k: math.atan2(q2[k][1] - c2[1], q2[k][0] - c2[0]))
        comun = [p for p in ti if p[2] >= z_corte]                               # lo que se ve en las dos ventanas: control de simetría
        dif = [f3.dist_a_polilinea(p, td) for p in comun]
        sim['techo_ventana'] = {'contorno_der': [redondo(junto[k]) for k in orden], 'nota': 'contorno de la ventana (lado derecho), en orden; PROVISORIO: la derecha desde la costura hacia atrás más la punta delantera de la izquierda reflejada',
                                'control_izquierda_cm': {'media': round(float(np.mean(dif)) * 100, 1), 'max': round(float(max(dif)) * 100, 1), 'n': len(dif)} if dif else None,
                                'largo_cm': round((max(p[2] for p in junto) - min(p[2] for p in junto)) * 100, 1), 'ancho_cm': round(float(max(q[1] for q in q2) - min(q[1] for q in q2)) * 100, 1)}

    # jaula del techo: nudos simétricos y caños entre nudos (PROVISORIO: la altura sale del techo del FSN + 2,5 cm)
    if 'jaula_FL_0' in P:
        cx = lambda p: np.array([0.0, p[1], p[2]]); der = lambda p: np.array([abs(p[0]), p[1], p[2]])
        N = {'FR': der(P['jaula_FL_0']), 'PR': der(P['jaula_PL_0']), 'FC': cx(P['jaula_FC_0']), 'RR': (der(P['jaula_RL_0']) + der(P['jaula_RR_0'])) / 2}
        N['RC'] = cx(N['RR'])                                                   # el travesaño trasero es recto: su centro
        o_rc, d_rc = f3.rayo(pos, R, *marcas['rasgos']['jaula_RC'][0], b, giro); v = N['RC'] - o_rc
        arco_t = sorted([der(q) for q in m.pts('jaula_arco_tras', pos, R)], key=lambda q: -q[0]); z_arco = float(np.mean([q[2] for q in arco_t]))
        arco_d = sorted([der(q) for q in m.pts('jaula_arco_del_izq', pos, R)], key=lambda q: -q[0])
        sim['jaula_techo'] = {
            'nudos_der': {k: redondo(v_) for k, v_ in N.items()},
            'nudos': {'FL / FR': 'sobre el poste de puerta delantero', 'PL / PR': 'sobre el parante del parabrisas', 'FC': 'centro del arco delantero y vértice de la V (en el eje)',
                      'RL / RR': 'nudos traseros, sobre el poste entre la puerta y la ventanilla trasera', 'RC': 'centro del travesaño trasero (en el eje)'},
            'canos': [['FL', 'PL'], ['FR', 'PR'], ['PL', 'FC'], ['PR', 'FC'], ['PL', 'PR'], ['FC', 'RL'], ['FC', 'RR'], ['RL', 'RR'], ['FL', 'RL'], ['FR', 'RR']],
            'arco_delantero_der': [redondo(q) for q in [N['FR']] + arco_d[1:] + [N['FC']]],
            # el arco trasero queda en un plano transversal (z medio de sus puntos): del nudo RR a la clave, en el eje
            'arco_trasero_der': [redondo(q) for q in [N['RR']] + [np.array([q[0], q[1], z_arco]) for q in arco_t if 0.03 < q[0] < N['RR'][0] - 0.015] + [np.array([0.0, max(q[1] for q in arco_t) + 0.001, z_arco])]],
            'asimetria_RL_RR_cm': round(float(np.linalg.norm(der(P['jaula_RL_0']) - der(P['jaula_RR_0']))) * 100, 1),
            'control_RC_cm': round(float(np.linalg.norm(v - (v @ d_rc) * d_rc)) * 100, 1),
            'canos_hacia_atras': 'de RC bajan dos caños hacia atrás y afuera (marcas jaula_lambda_izq / _der); su extremo de abajo lo tapa el asiento: SIN MEDIR (se ve por las ventanillas traseras desde afuera)',
            'metodo': f'cada nudo: su rayo cortado con el techo del FSN corrido {JAULA_FUERA * 100:.1f} cm hacia afuera; el lado izquierdo reflejado', 'precision_cm': 4.0, 'provisorio': True,
            'diametro_cm': [3.0, 4.0],                                           # ancho aparente de los caños en la foto (2,3 a 2,9° a unos 75 cm): a ojo
            'nota': 'lado derecho; el izquierdo es su espejo (FL = espejo de FR, etc.). Los caños entre nudos son rectos; los dos arcos siguen el techo. control_RC_cm: a cuánto pasa el rayo del centro del travesaño de su punto medio'}
    # postes de puerta y línea del antepecho, armados con lo anterior (para modelar la jaula)
    def tramo(a, c): return [redondo(a), redondo(c)]
    S_ = lambda k: np.array(sim[k]['p3d_der'])
    jn = sim.get('jaula_techo', {}).get('nudos_der', {})
    sim['poste_A'] = {'borde_delantero': tramo(S_('lateral_base_visible'), S_('lateral_esq_sup_posteA')), 'borde_trasero': tramo(S_('puerta_esq_del_inf'), S_('puerta_esq_del_sup')),
                      'tope_provisorio': jn.get('FR'), 'nota': 'poste de puerta delantero (derecho): entre el paño lateral del parabrisas y la ventana de puerta; arriba termina en el nudo FR de la jaula'}
    sim['poste_B'] = {'borde_delantero': tramo(S_('puerta_esq_tras_inf'), S_('puerta_esq_tras_sup')), 'tope_provisorio': jn.get('RR'),
                      'nota': 'poste entre la puerta y la ventanilla trasera (derecho); su borde trasero es el borde delantero de la ventanilla trasera (medido desde afuera)'}
    sim['antepecho'] = {'desde_el_asiento': tramo(S_('puerta_esq_del_inf'), S_('puerta_esq_tras_inf')),
                        'nota': 'borde inferior de la ventana de puerta como se ve desde el asiento (lado derecho); delante de la puerta lo tapa el tablero: ahí vale el del FSN (casco_medido.json)'}
    if afuera:
        A_ = lambda k: afuera['rasgos'][k]['p3d_der']
        sim['poste_B']['borde_trasero'] = [A_('trasera_esq_del_inf'), A_('trasera_esq_del_sup')]
        sim['antepecho']['por_fuera'] = [A_('puerta_esq_del_inf'), A_('puerta_esq_tras_inf'), A_('trasera_esq_del_inf'), A_('trasera_esq_tras_inf')]

    # ================= medidas para leer (cm) =================
    def largo(a, c): return round(float(np.linalg.norm(np.array(sim[a]['p3d_der']) - np.array(sim[c]['p3d_der']))) * 100, 1)
    med = {'ventana_puerta_cm': {'borde_inferior': largo('puerta_esq_del_inf', 'puerta_esq_tras_inf'), 'borde_superior': largo('puerta_esq_del_sup', 'puerta_esq_tras_sup'),
                                 'borde_delantero': largo('puerta_esq_del_inf', 'puerta_esq_del_sup'), 'borde_trasero': largo('puerta_esq_tras_inf', 'puerta_esq_tras_sup')},
           'pano_central_ancho_arriba_cm': round(2 * sim['parabrisas_esq_sup']['p3d_der'][0] * 100, 1),
           'parantes_separacion_ejes_cm': {'arriba': round(2 * sim['parante']['tope'][0] * 100, 1), 'a_la_altura_del_tablero': round(2 * sim['parante']['base_visible'][0] * 100, 1)},
           'parante_ancho_visible_cm': sim['parante']['ancho_visible_cm'],
           'pano_lateral_borde_superior_cm': largo('lateral_esq_sup_parante', 'lateral_esq_sup_posteA'),
           'poste_A_ancho_cm': round(dist_a_recta_3d(np.array(sim['lateral_esq_sup_posteA']['p3d_der']), recta_3d([np.array(sim['puerta_esq_del_inf']['p3d_der']), np.array(sim['puerta_esq_del_sup']['p3d_der'])])) * 100, 1),
           'antepecho_visto_desde_el_asiento_y': [sim['puerta_esq_del_inf']['p3d_der'][1], sim['puerta_esq_tras_inf']['p3d_der'][1]],
           'borde_superior_de_puerta_y': [sim['puerta_esq_del_sup']['p3d_der'][1], sim['puerta_esq_tras_sup']['p3d_der'][1]]}
    if afuera:
        A = afuera['rasgos']; ej = f3.base_del_plano(m.planos['puerta_der'])
        med['poste_B_ancho_cm'] = round(dist_a_recta_3d(np.array(sim['puerta_esq_tras_sup']['p3d_der']), recta_3d([np.array(A['trasera_esq_del_inf']['p3d_der']), np.array(A['trasera_esq_del_sup']['p3d_der'])])) * 100, 1)
        med['antepecho_por_fuera_y'] = [A['puerta_esq_del_inf']['p3d_der'][1], A['puerta_esq_tras_inf']['p3d_der'][1], A['trasera_esq_del_inf']['p3d_der'][1], A['trasera_esq_tras_inf']['p3d_der'][1]]
        med['ventanilla_trasera_cm'] = afuera['medidas']['ventanilla_trasera_cm']; med['ventana_techo_largo_cm'] = afuera['medidas']['ventana_techo_largo_cm']
    diam = []
    for lado in ('izq', 'der'):
        n = [f'ojo_{lado}_disco_{k}' for k in ('del', 'tras', 'sup', 'inf')]
        if all(k in P for k in n): diam += [float(np.linalg.norm(P[n[0]] - P[n[1]])), float(np.linalg.norm(P[n[2]] - P[n[3]]))]
    if diam: med['ojo_de_buey_disco_diametro_cm'] = round(float(np.mean(diam)) * 100, 1)

    control_forma = None
    if afuera:                                                                  # la forma de la ventana de puerta: adentro contra afuera
        def rayos_de(nombre_izq, nombre_der):
            par = []
            for nombre, refl in ((nombre_der, False), (nombre_izq, True)):
                q = next(x for x in puntos if x['nombre'] == nombre); o, d = f3.rayo(pos, R, *q['lon_lat'], b, giro)
                par.append((f3.espejo(o), f3.espejo(d)) if refl else (o, d))
            return par
        ry = [rayos_de(f'puerta_izq_esq_{e}', f'puerta_der_esq_{e}') for e, _, _ in ESQUINAS] + [rayos_de('ojo_izq_centro', 'ojo_der_centro')]
        fuera = [afuera['rasgos'][f'puerta_esq_{e}']['p3d_der'] for e, _, _ in ESQUINAS] + [afuera['rasgos']['ojo_centro']['p3d_der']]
        control_forma = control_de_forma(ry, m.planos['puerta_der'], fuera)
        print(f'CONTROL de forma de la ventana de puerta (asiento contra afuera): {control_forma["rms_cm"]} cm rms, por punto {control_forma["por_punto_cm"]} · con el plano a '
              f'{control_forma["mejor_plano_grados"]} bajaría (el adoptado: {control_forma["plano_adoptado_grados"]})')
    sup_json = {'parabrisas': {'punto': redondo(PARABRISAS[0]), 'normal': redondo(PARABRISAS[1]), 'nota': 'z = 0,74 + 0,93·(y − 1,02), del FSN'}}
    for k, (c, n) in m.planos.items():
        if k != 'parabrisas': sup_json[k] = {'punto': redondo(c), 'normal': redondo(n)}
    salida = {'marco': 'cabina (m): +x derecha del piloto, +y arriba, -z adelante',
              'foto': 'DSCN0054.JPG, 360 desde el asiento (7744x3872, 0,0465 grados/px; lon 0 = frente de la cámara, lat 0 = su horizonte)',
              'pose': pose, 'lente': {'b_cm': round(b * 100, 2), 'giro_trasera_grados': [round(math.degrees(v), 2) for v in giro], 'control': calib,
                                      'costura_saltos_cm': {k: round(v['salto_cm'], 2) for k, v in cost.items()},
                                      'nota': 'la cámara tiene dos lentes (costuras en lon ±90 de la foto): cada una mira desde centro ± b·frente y la trasera va girada (cab_foto360.py, cab_costura360.py)'},
              'superficies': sup_json, 'asimetria_cm': {'media_cuadratica': round(rms * 100, 2), 'por_rasgo': asim}, 'control_forma_puerta': control_forma,
              'simetrico': sim, 'medidas': med, 'puntos': puntos,
              'notas': ['precision_cm: lateral_vertical = lo que se ve desde el asiento (lectura de la foto + pose); profundidad = a lo largo de la visual (depende de la superficie)',
                        'simetrico: promedio del lado derecho y del izquierdo reflejado; es lo que se modela (1b.1). asimetria_cm = diferencia entre los dos lados',
                        'la ESCALA y el ANCHO de la cabina salen del FSN: los planos de puerta son los del vidrio del FSN (para que la cúpula nueva asiente sobre el fuselaje que se conserva). '
                        'Su orientación real puede diferir unos grados: hasta ±3,5 cm en x en las esquinas de la ventana (control_forma_puerta)',
                        'el REGISTRO con el FSN (altura, avance y cabeceo de la cámara) es el del calcado de la etapa 0: ±2 cm y ±2°; la simetría no los ve',
                        'ventana de puerta: desde el asiento se ve el MARCO por dentro, y acá va proyectado al plano de la puerta. Desde afuera, el borde del vidrio no coincide del todo '
                        '(afuera/vidrio_por_fuera_menos_marco_por_dentro_cm: hasta 4 cm en la esquina inferior trasera). SIN RESOLVER: se decide al modelar las puertas (1b.3), mejor con medidas de cinta',
                        'calculado_en_3d: esquinas = cruce de las rectas de los bordes en su plano (no se marcaron en la foto; lon_lat es dónde se verían)',
                        'techo_*: PROVISORIO (contorno leído a mano; se corta con un plano que pasa por las puntas medidas desde afuera, o con el casco FSN si falta cupula_afuera.json; en la costura falta una franja de unos 2 cm de la ventana izquierda)',
                        'tablero_sup: borde del parasol del tablero proyectado al plano del parabrisas (la base real del vidrio queda tapada desde el asiento)',
                        'jaula_techo: PROVISORIO ±4 cm: los caños del techo se ubican sobre el techo del FSN corrido 2,5 cm hacia afuera (desde el asiento no se puede medir su altura)']}
    if afuera: salida['afuera'] = afuera
    with open(SALIDA, 'w', encoding='utf-8') as f: json.dump(salida, f, indent=1, ensure_ascii=False)
    print(f'SALIDA → {SALIDA}: {len(puntos)} puntos ({sum(1 for q in puntos if q["p3d"] is None)} sin corte) en {time.time() - t0:.0f} s')
    for k, v in sim.items():
        if 'p3d_der' in v: print(f'  {k}: {v["p3d_der"]} (asimetría {v["asimetria_cm"]} cm)')
    print('  parante:', {k: v for k, v in sim['parante'].items() if k != 'nota'})
    print('  medidas:', med)
