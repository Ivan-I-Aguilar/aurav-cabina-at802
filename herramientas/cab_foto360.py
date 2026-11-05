# Cabina nueva · geometría de las fotos 360 de la Nikon KeyMission 360 (equirectangular 7744×3872), sin Blender.
#
# OJO, DOS LENTES (hallazgo del 4-5/11, etapa 1b.0): la cámara son dos ojos de pez espalda con espalda. La lente
# DELANTERA cubre |lon| < 90° de la foto y la TRASERA el resto; las costuras están en lon ±90° (dos franjas de más
# ruido en cualquier foto, y una zona de mezcla de ±2°). Dos efectos, los dos chicos pero medibles:
#   1. GIRO: la imagen de la lente trasera está girada 0,25° alrededor del eje de la cámara respecto de la delantera
#      (lo lejano salta +0,25° de latitud en la costura de −90 y −0,25° en la de +90; medido con el hangar en unas
#      20 fotos, cab_costura360.py). Las direcciones de la lente trasera se corrigen con GIRO_T.
#   2. PUPILAS: cada lente mira desde su propia pupila, a b ≈ 1,1 cm del centro hacia adelante o hacia atrás:
#          origen = centro + b · frente   si |lon| < 90     (lente delantera)
#          origen = centro − b · frente   si |lon| > 90     (lente trasera)
#      con frente = R · (0, 0, −1). A 50 cm son hasta 1,3° ≈ 1 cm, y en la costura falta una franja de 2b de escena.
#      b = 1,1 ± 0,7 cm: sale de los dos bordes de las ventanas de puerta que cruzan la costura con las dos partes
#      medibles (el mismo borde visto por las dos lentes tiene que dar la misma recta: −0,1 y 1,3 cm cada uno, 1,1 los
#      dos juntos). Está mal determinado, pero pesa poco.
#   3. La simetría izquierda/derecha de la cabina pide además un giro de la lente trasera de −0,78° alrededor de la
#      vertical (cab_cupula_puntos.py --ajustar lo ajusta; va en la pose de cada foto como «lente_giro»). No se pudo
#      confirmar con lo lejano (no hay bordes inclinados que crucen la costura), y el resultado simétrico cambia menos
#      de 1 mm con o sin él.
# Con lo lejano nada de esto importa; con la cabina vista desde el asiento (50 cm) es hasta 1 cm.
#
# Convenciones (las de cab_comun.Panorama y vista360.py): en el marco de la cámara, lon 0 = frente (−z), derecha
# +x, arriba +y; cámara → cabina: d_cabina = Rx(pitch) · Rz(roll) · Ry(yaw) · d_cámara (yaw positivo = la cámara
# gira a la izquierda; pitch positivo = mira arriba).
import math
import numpy as np

ANCHO, ALTO = 7744, 3872
LENTE = 0.011                                   # m, media separación entre las pupilas (b)
GIRO_T = (0.0, 0.0, math.radians(0.25))         # rad, giro chico de la lente trasera (vector de rotación en el marco de la cámara: x derecha, y arriba, z atrás)
COSTURA = 90.0                                  # grados de la foto

def dir_foto(lon, lat):
    lo, la = math.radians(lon), math.radians(lat)
    return np.array([math.sin(lo) * math.cos(la), math.sin(la), -math.cos(lo) * math.cos(la)])

def lonlat(d):
    d = np.asarray(d, float); d = d / np.linalg.norm(d)
    return [round(math.degrees(math.atan2(d[0], -d[2])), 3), round(math.degrees(math.asin(max(-1.0, min(1.0, d[1])))), 3)]

def pixel(lon, lat): return [round((lon / 360 + 0.5) * ANCHO, 1), round((0.5 - lat / 180) * ALTO, 1)]

def rotacion(yaw, pitch, roll):
    cy, sy, cp, sp, cr, sr = math.cos(yaw), math.sin(yaw), math.cos(pitch), math.sin(pitch), math.cos(roll), math.sin(roll)
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]); Rz = np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]]); Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    return Rx @ Rz @ Ry

def angulos(R):
    """yaw, pitch, roll de R = Rx(pitch) · Rz(roll) · Ry(yaw)."""
    return math.atan2(R[0][2], R[0][0]), math.atan2(R[2][1], R[1][1]), math.asin(max(-1.0, min(1.0, -R[0][1])))

def frente(R): return np.asarray(R) @ np.array([0.0, 0.0, -1.0])
def lente(lon): return 1 if abs(lon) < COSTURA else -1          # +1 delantera, −1 trasera

def giro_chico(g):
    """Matriz de un giro chico (vector de rotación g, rad)."""
    g = np.asarray(g, float); a = float(np.linalg.norm(g))
    if a < 1e-12: return np.eye(3)
    k = g / a; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + math.sin(a) * K + (1 - math.cos(a)) * (K @ K)

def dir_camara(lon, lat, giro=GIRO_T, s=None):
    """Dirección VERDADERA en el marco de la cámara del píxel (lon, lat): la lente trasera va corregida por su giro."""
    d = dir_foto(lon, lat)
    return giro_chico(giro) @ d if (s if s is not None else lente(lon)) < 0 else d

def origen(pos, R, lon, b=LENTE, s=None):
    return np.asarray(pos, float) + (s if s is not None else lente(lon)) * b * frente(R)

def rayo(pos, R, lon, lat, b=LENTE, giro=GIRO_T, s=None):
    """Origen y dirección (marco cabina) del rayo del píxel (lon, lat) de la foto; s fuerza la lente (+1 / −1)."""
    return origen(pos, R, lon, b, s), np.asarray(R) @ dir_camara(lon, lat, giro, s)

def proyectar(pos, R, P, b=LENTE, giro=GIRO_T):
    """(lon, lat) de la foto donde se ve el punto P (marco cabina), con la lente que le toca; None si cae en la
    franja que falta en la costura."""
    Rt = np.asarray(R).T; P = np.asarray(P, float); pos = np.asarray(pos, float)
    for s in (1, -1):
        d = Rt @ (P - (pos + s * b * frente(R)))
        if s < 0: d = giro_chico(giro).T @ d
        ll = lonlat(d)
        if lente(ll[0]) == s: return ll
    return None

def pose_de(p):
    """(pos, R, b, giro) de un json de pose."""
    return np.array(p['pos'], float), rotacion(p['yaw'], p['pitch'], p['roll']), float(p.get('lente_m', LENTE)), tuple(p.get('lente_giro', GIRO_T))

def espejo(v):
    v = np.asarray(v, float); return np.array([-v[0], v[1], v[2]])

# ---------------- geometría de planos y rectas ----------------
def plano_por_puntos(pts):
    """Plano de mínimos cuadrados (punto, normal unitaria)."""
    P = np.asarray(pts, float); c = P.mean(0); n = np.linalg.svd(P - c)[2][2]
    return c, n / np.linalg.norm(n)

def cortar_plano(o, d, plano):
    c, n = plano; den = float(np.dot(d, n))
    if abs(den) < 1e-9: return None
    t = float(np.dot(c - o, n)) / den
    return o + t * d if t > 0 else None

def base_del_plano(plano):
    """Dos ejes ortonormales del plano: e1 ≈ hacia atrás (+z), e2 ≈ hacia arriba."""
    c, n = plano
    e1 = np.array([0.0, 0.0, 1.0]) - n[2] * n
    if np.linalg.norm(e1) < 0.2: e1 = np.array([1.0, 0.0, 0.0]) - n[0] * n     # plano casi transversal: e1 ≈ +x
    e1 /= np.linalg.norm(e1); e2 = np.cross(n, e1); e2 /= np.linalg.norm(e2)
    if e2[1] < 0: e2 = -e2
    return e1, e2

def a_2d(P, plano, ejes): return np.array([np.dot(P - plano[0], ejes[0]), np.dot(P - plano[0], ejes[1])])
def a_3d(q, plano, ejes): return plano[0] + q[0] * ejes[0] + q[1] * ejes[1]

def recta_2d(Q):
    """Recta de mínimos cuadrados por puntos 2D: (centro, dirección unitaria)."""
    Q = np.asarray(Q, float); c = Q.mean(0); d = np.linalg.svd(Q - c)[2][0]
    return c, d / np.linalg.norm(d)

def cruce_2d(r1, r2):
    (c1, d1), (c2, d2) = r1, r2
    A = np.array([[d1[0], -d2[0]], [d1[1], -d2[1]]]); t = np.linalg.solve(A, c2 - c1)
    return c1 + t[0] * d1

def dist_a_polilinea(p, poli):
    p = np.asarray(p, float)
    if len(poli) == 1: return float(np.linalg.norm(p - poli[0]))
    m = 9.0
    for a, b in zip(poli[:-1], poli[1:]):
        ab = b - a; L2 = float(ab @ ab); t = 0.0 if L2 < 1e-12 else max(0.0, min(1.0, float((p - a) @ ab) / L2))
        m = min(m, float(np.linalg.norm(p - (a + ab * t))))
    return m

def cruce_de_rayos(o1, d1, o2, d2):
    """Punto medio del segmento más corto entre dos rayos, su largo, y la distancia a cada origen."""
    d1 = d1 / np.linalg.norm(d1); d2 = d2 / np.linalg.norm(d2); w0 = o1 - o2
    a, b, c, d, e = d1 @ d1, d1 @ d2, d2 @ d2, d1 @ w0, d2 @ w0; den = a * c - b * b
    s = (b * e - c * d) / den; t = (a * e - b * d) / den
    p1, p2 = o1 + s * d1, o2 + t * d2
    return (p1 + p2) / 2, float(np.linalg.norm(p1 - p2)), float(s), float(t)
