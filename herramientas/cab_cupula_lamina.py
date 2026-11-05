# Cúpula nueva · etapa 1b.0 · LÁMINA para que Iván revise la medición (PLAN_CUPULA.md §4.5 y §6):
#   cupula_puntos.png (y .jpg)  los puntos y bordes marcados sobre la 360 del asiento (panorama y vistas planas), el
#                               MODELO SIMÉTRICO que se va a construir proyectado de vuelta sobre la foto (blanco), las dos
#                               360 de afuera con las ventanillas traseras, y las medidas. LLEVA FOTO: va FUERA del repo.
#   cupula_plano.png            las tres vistas (costado, planta, frente) de lo medido, en cm, sin foto: va al repo.
# Uso: python -E -P -X utf8 herramientas/cab_cupula_lamina.py "<carpeta de las DSCN00*.JPG>" "<carpeta de salida de la lámina>"
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_foto360 as f3

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARPETA = os.path.join(RAIZ, 'blender', 'calcado')
FOTOS, SALIDA = sys.argv[1], sys.argv[2]
cp = json.load(open(os.path.join(CARPETA, 'cupula_puntos.json'), encoding='utf-8'))
ma = json.load(open(os.path.join(CARPETA, 'marcas_afuera.json'), encoding='utf-8'))['fotos']
m54 = json.load(open(os.path.join(CARPETA, 'marcas54.json'), encoding='utf-8'))
casco = json.load(open(os.path.join(RAIZ, 'blender', 'casco_medido.json'), encoding='utf-8'))
sim, af, med = cp['simetrico'], cp.get('afuera'), cp['medidas']
CAM54 = f3.pose_de(cp['pose'])

def coma(t):
    import re
    return re.sub(r'(\d)\.(\d)', r'\1,\2', str(t))

def fuente(t, negrita=False):
    try: return ImageFont.truetype('arialbd.ttf' if negrita else 'arial.ttf', t)
    except OSError: return ImageFont.load_default()
F18, F21, F22, F26, F34, F44 = fuente(18), fuente(21), fuente(22), fuente(26, True), fuente(34, True), fuente(44, True)
AMARILLO, CIAN, VERDE, NARANJA, MAGENTA, ROJO, BLANCO, GRIS, NEGRO = (255, 220, 0), (0, 230, 255), (70, 255, 100), (255, 150, 30), (255, 90, 255), (255, 70, 70), (255, 255, 255), (190, 190, 190), (0, 0, 0)
VIOLETA = (170, 150, 255)
def color_de(rasgo):
    if rasgo.startswith('puerta'): return AMARILLO
    if rasgo.startswith('parante'): return CIAN
    if rasgo.startswith(('parabrisas', 'lateral')): return VERDE
    if rasgo.startswith('posteA'): return NARANJA
    if rasgo.startswith('techo'): return MAGENTA
    if rasgo.startswith('trasera'): return ROJO
    if rasgo.startswith('jaula'): return VIOLETA
    return GRIS

# ---------------- paneles: recorte equirectangular y vista plana (misma convención que vista360.py) ----------------
class Equi:
    def __init__(self, img, lon0, lon1, lat0, lat1, ancho):
        H, W = img.shape[:2]; c0, c1 = int((lon0 / 360 + 0.5) * W), int((lon1 / 360 + 0.5) * W); r0, r1 = int((0.5 - lat1 / 180) * H), int((0.5 - lat0 / 180) * H)
        self.esc = ancho / (c1 - c0); self.lon0, self.lat1 = lon0, lat1; self.ppg = W / 360 * self.esc
        self.im = Image.fromarray(img[r0:r1, c0:c1]).resize((ancho, int((r1 - r0) * self.esc)), Image.LANCZOS)
    def xy(self, lon, lat):
        x, y = (lon - self.lon0) * self.ppg, (self.lat1 - lat) * self.ppg
        return (x, y) if -5 <= x <= self.im.width + 5 and -5 <= y <= self.im.height + 5 else None

class Plana:
    def __init__(self, img, yaw, pitch, hfov, w, h):
        H, W = img.shape[:2]; self.f = (w / 2) / math.tan(math.radians(hfov) / 2); self.w, self.h = w, h
        self.cp, self.sp, self.cy, self.sy = math.cos(math.radians(pitch)), math.sin(math.radians(pitch)), math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
        i, j = np.meshgrid(np.arange(w) - w / 2 + 0.5, np.arange(h) - h / 2 + 0.5)
        x, y, z = i / self.f, -j / self.f, np.ones_like(i, dtype=float)
        y2, z2 = y * self.cp + z * self.sp, -y * self.sp + z * self.cp; x3, z3 = x * self.cy + z2 * self.sy, -x * self.sy + z2 * self.cy
        lon = np.arctan2(x3, z3); lat = np.arctan2(y2, np.hypot(x3, z3))
        u = ((lon / (2 * math.pi) + 0.5) * W).astype(np.int64) % W; v = np.clip(((0.5 - lat / math.pi) * H).astype(np.int64), 0, H - 1)
        self.im = Image.fromarray(img[v, u])
    def xy(self, lon, lat):
        lo, la = math.radians(lon), math.radians(lat); wx, wy, wz = math.sin(lo) * math.cos(la), math.sin(la), math.cos(lo) * math.cos(la)
        x, z2 = wx * self.cy - wz * self.sy, wx * self.sy + wz * self.cy; y, z = wy * self.cp - z2 * self.sp, wy * self.sp + z2 * self.cp
        if z <= 0.05: return None
        px, py = self.w / 2 + self.f * x / z, self.h / 2 - self.f * y / z
        return (px, py) if -40 <= px <= self.w + 40 and -40 <= py <= self.h + 40 else None

def linea(panel, d, pts, color, ancho=3, guion=0):
    """Polilínea por puntos (lon, lat); se corta donde un punto no se ve. guion > 0: trazos de ese largo (px)."""
    tramo = []
    def volcar():
        if len(tramo) < 2: return
        if not guion: d.line(tramo, fill=color, width=ancho, joint='curve'); return
        acum = 0.0
        for a, b in zip(tramo[:-1], tramo[1:]):
            L = math.dist(a, b); n = max(1, int(L / 3))
            for k in range(n):
                t0, t1 = k / n, (k + 1) / n
                if int((acum + L * t0) / guion) % 2 == 0: d.line([(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)], fill=color, width=ancho)
            acum += L
    for q in pts:
        p = panel.xy(*q) if q is not None else None
        if p is None or (tramo and math.dist(p, tramo[-1]) > 0.4 * panel.im.width): volcar(); tramo = [] if p is None else [p]
        else: tramo.append(p)
    volcar()

def marca(panel, d, q, color, r=8, texto=None, f=None, cuadrado=False, dx=10, dy=-26):
    p = panel.xy(*q) if q is not None else None
    if p is None: return
    caja = [p[0] - r, p[1] - r, p[0] + r, p[1] + r]
    (d.rectangle if cuadrado else d.ellipse)([caja[0] - 2, caja[1] - 2, caja[2] + 2, caja[3] + 2], outline=NEGRO, width=3)
    (d.rectangle if cuadrado else d.ellipse)(caja, outline=color, width=3)
    if texto:
        f = f or F22
        for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2)): d.text((p[0] + dx + ox, p[1] + dy + oy), texto, fill=NEGRO, font=f)
        d.text((p[0] + dx, p[1] + dy), texto, fill=color, font=f)

def arco(a, b, n=24):
    """Puntos (lon, lat) del círculo máximo entre dos marcas de una foto."""
    va, vb = f3.dir_foto(*a), f3.dir_foto(*b); ang = math.acos(float(np.clip(va @ vb, -1, 1))); e = vb - (va @ vb) * va; e /= np.linalg.norm(e)
    return [f3.lonlat(math.cos(s) * va + math.sin(s) * e) for s in np.linspace(0, ang, n)]

def segmento(cam, A, B, n=30):
    """Segmento 3D A–B proyectado a una foto: lista de (lon, lat) o None (franja de la costura)."""
    A, B = np.array(A, float), np.array(B, float); pos, R, b, giro = cam
    return [f3.proyectar(pos, R, A + (B - A) * t, b, giro) for t in np.linspace(0, 1, n)]

def poligono(cam, pts, cerrar=True):
    out = []
    P = list(pts) + ([pts[0]] if cerrar else [])
    for a, b in zip(P[:-1], P[1:]): out += segmento(cam, a, b)
    return out

# ---------------- lo que se dibuja sobre la 360 del asiento ----------------
PTS = cp['puntos']
BORDES = {}                                                                       # rasgo → [(lon, lat)] de las marcas
for q in PTS:
    if q['lon_lat'] and not q['calculado_en_3d']: BORDES.setdefault(q['rasgo'], []).append(tuple(q['lon_lat']))
ESQ = {q['nombre']: q for q in PTS if q['calculado_en_3d']}
def lado3d(k, lado): return sim[k]['p3d_' + lado]
ORDEN = ('del_inf', 'tras_inf', 'tras_sup', 'del_sup')

def dibujar_asiento(panel, etiquetas=True, fino=False):
    d = ImageDraw.Draw(panel.im); a = 2 if fino else 3
    for lon in (-90, 90):                                                         # costuras de las dos lentes
        linea(panel, d, [(lon, la) for la in range(-60, 91, 2)], (255, 255, 255), 1, guion=10)
    # marcas: bordes rectos (9 muestras cada uno) y contornos
    for rasgo, pts in BORDES.items():
        if rasgo.startswith(('ojo_', 'lateral_izq_base', 'lateral_der_base')): continue
        linea(panel, d, pts, color_de(rasgo), a)                                  # (las ventanas del techo son polilíneas abiertas: el contorno que se ve)
    # modelo simétrico proyectado de vuelta (blanco, a trazos): ventanas de puerta, parantes, paño central y laterales, ojos de buey
    for lado in ('der', 'izq'):
        linea(panel, d, poligono(CAM54, [lado3d(f'puerta_esq_{e}', lado) for e in ORDEN]), BLANCO, 2, guion=9)
        for k in ('borde_interior', 'borde_exterior'):
            A, B = sim['parante'][k]; A, B = (A, B) if lado == 'der' else (f3.espejo(A), f3.espejo(B))
            linea(panel, d, segmento(CAM54, A, B), BLANCO, 2, guion=9)
        linea(panel, d, poligono(CAM54, [lado3d('lateral_base_visible', lado), lado3d('lateral_esq_sup_posteA', lado), lado3d('lateral_esq_sup_parante', lado)], cerrar=False), BLANCO, 2, guion=9)
        if 'techo_ventana' in sim:
            c = sim['techo_ventana']['contorno_der']; c = c if lado == 'der' else [f3.espejo(p) for p in c]
            linea(panel, d, poligono(CAM54, c), BLANCO, 2, guion=9)
        o = np.array(lado3d('ojo_centro', lado)); marca(panel, d, f3.proyectar(*CAM54[:2], o, *CAM54[2:]), BLANCO, r=5)
        # ventanilla trasera (de las 360 de afuera) proyectada a esta foto
        if af:
            q = [af['rasgos'][f'trasera_esq_{e}']['p3d_' + lado] for e in ORDEN]
            linea(panel, d, poligono(CAM54, q), ROJO, a, guion=14)
            for e, p in zip(ORDEN, q): marca(panel, d, f3.proyectar(*CAM54[:2], np.array(p), *CAM54[2:]), ROJO, r=7, cuadrado=True)
    A, B = lado3d('parabrisas_esq_sup', 'izq'), lado3d('parabrisas_esq_sup', 'der'); linea(panel, d, segmento(CAM54, A, B), BLANCO, 2, guion=9)
    # jaula del techo: marcas (nudos, arcos y los dos caños que bajan hacia atrás) y el modelo (caños rectos entre nudos, arcos)
    for k, pts in m54['rasgos'].items():
        if not k.startswith('jaula_'): continue
        if len(pts) == 1: marca(panel, d, pts[0], VIOLETA, r=7, cuadrado=True)
        elif 'lambda' in k: linea(panel, d, [tuple(p) for p in pts], VIOLETA, a)
    if 'jaula_techo' in sim:
        J = sim['jaula_techo']
        for n1, n2 in J['canos']: linea(panel, d, segmento(CAM54, nudo(n1), nudo(n2)), BLANCO, 2, guion=9)
        for arco_ in (J['arco_delantero_der'], J['arco_trasero_der']):
            for esp_ in (np.array, f3.espejo): linea(panel, d, poligono(CAM54, [esp_(q) for q in arco_], cerrar=False), BLANCO, 2, guion=9)
    # esquinas calculadas (círculos) y ojos de buey
    for nombre, q in ESQ.items():
        num = {'del_inf': '1', 'tras_inf': '2', 'tras_sup': '3', 'del_sup': '4'}.get(nombre.split('esq_')[-1]) if nombre.startswith('puerta') else None
        marca(panel, d, q['lon_lat'], color_de(q['rasgo']), r=9, texto=num if etiquetas else None, f=F26)
    for lado in ('izq', 'der'):
        for q in BORDES.get(f'ojo_{lado}', []): marca(panel, d, q, AMARILLO, r=14)
        for q in BORDES.get(f'lateral_{lado}_base', []): marca(panel, d, q, VERDE, r=8)

def nudo(n):
    """Nudo de la jaula del techo por su nombre (FL, PL, RL = espejo de FR, PR, RR)."""
    J = sim['jaula_techo']['nudos_der']
    return np.array(J[n]) if n in J else f3.espejo(J[n[0] + 'R'])

def leyenda(d, x, y, items, f=None):
    f = f or F22
    for texto, color, guion in items:
        if guion: [d.line([(x + k, y + 13), (x + k + 9, y + 13)], fill=color, width=3) for k in range(0, 54, 18)]
        else: d.line([(x, y + 13), (x + 54, y + 13)], fill=color, width=4)
        d.text((x + 66, y), texto, fill=BLANCO, font=f); y += 30
    return y

def rotulo(im, texto, f=None):
    d = ImageDraw.Draw(im); f = f or F26; w = d.textlength(texto, font=f)
    d.rectangle([0, 0, w + 24, 40], fill=(0, 0, 0)); d.text((12, 5), texto, fill=(255, 255, 0), font=f)

# ================= 1. la lámina con foto =================
img54 = np.asarray(Image.open(os.path.join(FOTOS, 'DSCN0054.JPG')).convert('RGB'))
ANCHO = 4000; M = 24
pano = Equi(img54, -160, 180, -32, 74, ANCHO - 2 * M); dibujar_asiento(pano)
LEYENDA = [('ventana de puerta (bordes; 1-4 = esquinas)', AMARILLO, 0), ('parantes del parabrisas (bordes de la banda oscura)', CIAN, 0),
           ('borde superior del parabrisas y de los paños laterales', VERDE, 0), ('borde delantero del poste de puerta', NARANJA, 0),
           ('ventanas del techo (contorno que se ve)', MAGENTA, 0), ('ventanilla trasera, medida desde AFUERA (±3 a 5 cm)', ROJO, 1),
           ('jaula del techo: nudos y caños (±4 cm, provisorio)', VIOLETA, 0),
           ('MODELO SIMÉTRICO que se va a construir, sobre la foto', BLANCO, 1), ('costuras de las dos lentes de la cámara (verticales finas)', GRIS, 1)]
vistas = {'Parabrisas (3 paños y 2 parantes)': (13, 22, 82), 'Puerta izquierda': (-80, 8, 96), 'Puerta derecha': (104, 8, 96),
          'Techo (las dos ventanas, mirando hacia arriba)': (12, 86, 118), 'Atrás a la izquierda (ventanilla trasera)': (-128, 14, 84), 'Atrás a la derecha (ventanilla trasera)': (152, 14, 84)}
VW = (ANCHO - 4 * M) // 3; VH = int(VW * 0.75); planas = []
for nombre, (yaw, pitch, hfov) in vistas.items():
    v = Plana(img54, yaw, pitch, hfov, VW, VH); dibujar_asiento(v, etiquetas='uerta' in nombre); rotulo(v.im, nombre); planas.append(v.im)

def vista_afuera(n, yaw, pitch, hfov, titulo):
    img = np.asarray(Image.open(os.path.join(FOTOS, f'DSCN00{n}.JPG')).convert('RGB')); v = Plana(img, yaw, pitch, hfov, VW, VH); d = ImageDraw.Draw(v.im)
    P = ma[n]['puntos']; lado = ma[n]['lado']; cam = f3.pose_de(af['poses'][n])
    for pref, col in (('puerta_esq', AMARILLO), ('trasera_esq', ROJO)):
        q = [P[f'{pref}_{e}']['lon_lat'] for e in ORDEN]
        for a, b in zip(q, q[1:] + q[:1]): linea(v, d, arco(a, b), col, 3)
        for e, p in zip(ORDEN, q): marca(v, d, p, col, r=9, texto=str(ORDEN.index(e) + 1), f=F26)
    marca(v, d, P['ojo_centro']['lon_lat'], AMARILLO, r=14)
    for k in ('techo_punta_del', 'techo_punta_tras'): marca(v, d, P[k]['lon_lat'], MAGENTA, r=10)
    linea(v, d, arco(P['techo_punta_del']['lon_lat'], P['techo_punta_tras']['lon_lat']), MAGENTA, 2)
    # lo medido DESDE EL ASIENTO, proyectado a esta foto (blanco a trazos): marco de la ventana de puerta, parante, paño lateral,
    # borde superior del paño central y ventana del techo. Control independiente: tiene que caer sobre el avión
    S3 = lambda k: sim[k]['p3d_' + lado]
    esp = (lambda p: np.array(p)) if lado == 'der' else f3.espejo
    linea(v, d, poligono(cam, [S3(f'puerta_esq_{e}') for e in ORDEN]), BLANCO, 2, guion=9)
    for k in ('borde_interior', 'borde_exterior'): linea(v, d, segmento(cam, esp(sim['parante'][k][0]), esp(sim['parante'][k][1])), BLANCO, 2, guion=9)
    linea(v, d, poligono(cam, [S3('lateral_base_visible'), S3('lateral_esq_sup_posteA'), S3('lateral_esq_sup_parante')], cerrar=False), BLANCO, 2, guion=9)
    linea(v, d, segmento(cam, sim['parabrisas_esq_sup']['p3d_izq'], sim['parabrisas_esq_sup']['p3d_der']), BLANCO, 2, guion=9)
    if 'techo_ventana' in sim: linea(v, d, poligono(cam, [esp(p) for p in sim['techo_ventana']['contorno_der']]), BLANCO, 2, guion=9)
    for k, r in af['rasgos'].items():                                             # el punto 3D ajustado, proyectado de vuelta (cruz blanca): tiene que caer sobre la marca
        p = v.xy(*f3.proyectar(*cam[:2], np.array(r['p3d_' + lado]), *cam[2:])) if f3.proyectar(*cam[:2], np.array(r['p3d_' + lado]), *cam[2:]) else None
        if p: d.line([(p[0] - 9, p[1]), (p[0] + 9, p[1])], fill=BLANCO, width=2); d.line([(p[0], p[1] - 9), (p[0], p[1] + 9)], fill=BLANCO, width=2)
    rotulo(v.im, titulo); return v.im
if af:
    planas.append(vista_afuera('50', -72, -8, 104, '360 de AFUERA, sobre el ala derecha (DSCN0050)'))
    planas.append(vista_afuera('43', 26, -8, 104, '360 de AFUERA, sobre el ala izquierda (DSCN0043)'))
# cuadro de medidas
txt = Image.new('RGB', (VW, VH), (18, 22, 30)); d = ImageDraw.Draw(txt); y = 22
def renglon(t, f=None, color=BLANCO, salto=None):
    global y
    f = f or F21; d.text((26, y), coma(t), fill=color, font=f); y += salto or 27

vp = med['ventana_puerta_cm']; pr = sim['parante']
renglon('MEDIDAS (cm) · lado derecho; el izquierdo es su espejo', F26, (255, 255, 0), 38)
renglon(f'Ventana de puerta (vista desde el asiento): abajo {vp["borde_inferior"]} · arriba {vp["borde_superior"]}')
renglon(f'      adelante {vp["borde_delantero"]} · atrás {vp["borde_trasero"]} · ojo de buey Ø {med.get("ojo_de_buey_disco_diametro_cm", "?")}')
renglon(f'Paño central del parabrisas: {med["pano_central_ancho_arriba_cm"]} de ancho arriba')
renglon(f'Parantes: {med["parante_ancho_visible_cm"][0]} a {med["parante_ancho_visible_cm"][1]} de ancho; ejes a {med["parantes_separacion_ejes_cm"]["arriba"]} (arriba)')
renglon(f'      y {med["parantes_separacion_ejes_cm"]["a_la_altura_del_tablero"]} (a la altura del tablero)')
renglon(f'Paño lateral: borde superior {med["pano_lateral_borde_superior_cm"]} · poste de puerta delantero {med["poste_A_ancho_cm"]}')
if af:
    vt = med['ventanilla_trasera_cm']
    renglon(f'Ventanilla trasera (de afuera): arriba {vt["borde_superior"]} · abajo {vt["borde_inferior"]}')
    renglon(f'      adelante {vt["borde_delantero"]} · atrás {vt["borde_trasero"]} · poste entre ventanas {med["poste_B_ancho_cm"]}')
    renglon(f'Ventana del techo: unos {med["ventana_techo_largo_cm"]:.0f} de largo por {sim["techo_ventana"]["ancho_cm"]} de ancho')
if 'jaula_techo' in sim:
    jn = sim['jaula_techo']['nudos_der']
    renglon(f'Caños del techo: arco delantero en z {jn["FR"][2]:.2f} a {jn["FC"][2]:.2f} m · marco trasero en z {jn["RR"][2]:.2f} m')
y += 10
renglon('CÓMO SE MIDIÓ', F26, (255, 255, 0), 38)
renglon(f'Asimetría izquierda/derecha del resultado: {cp["asimetria_cm"]["media_cuadratica"]} cm (media)')
renglon(f'Cámara de la 360: a {abs(cp["pose"]["pos"][0]) * 100:.1f} cm del eje, girada {math.degrees(cp["pose"]["yaw"]):.1f}° a la izquierda (antes 13,0°)')
renglon('La asimetría de 5° de los parantes no era real: en la etapa 0 se')
renglon('había tomado el limpiaparabrisas por el parante izquierdo')
renglon(f'La cámara tiene DOS lentes (pupilas a ±{cp["lente"]["b_cm"]} cm; la trasera, girada')
renglon(f'{abs(cp["lente"]["giro_trasera_grados"][2])}° y {abs(cp["lente"]["giro_trasera_grados"][1])}°): corregido')
y += 10
renglon('OJO', F26, (255, 120, 120), 38)
renglon('· La jaula del techo no tiene 3 arcos como decía el plan: es un arco', color=(255, 200, 200))
renglon('  delantero, una V y un marco trasero (arco + travesaño)', color=(255, 200, 200))
renglon('· La ventanilla trasera es grande y llega a z 2,8 m: detrás del piloto', color=(255, 200, 200))
renglon('  hay más cabina (¿segundo asiento?). El FSN ahí ya se angosta: hay', color=(255, 200, 200))
renglon('  que rehacer más carenado que el previsto', color=(255, 200, 200))
renglon('· El techo real queda unos 5 cm por fuera del techo del FSN', color=(255, 200, 200))
renglon('· Por fuera, el borde del vidrio de la puerta no coincide con el marco', color=(255, 200, 200))
renglon('  que se ve desde el asiento: hasta 4 cm en la esquina de abajo atrás', color=(255, 200, 200))
renglon('· El ANCHO de la cabina sale del FSN (±3 cm). Con 3 medidas de cinta se afina:', color=(255, 230, 120))
renglon('  de puerta a puerta en el antepecho (adelante y atrás) y en el borde de arriba', color=(255, 230, 120))
renglon('· La base del parabrisas no se ve desde el asiento (la tapa el tablero)', color=(255, 200, 200))
planas.append(txt)

filas = [planas[i:i + 3] for i in range(0, len(planas), 3)]
Y0 = 218                                                                          # título + leyenda (fuera de la foto)
alto = Y0 + pano.im.height + M + len(filas) * (VH + M) + M
hoja = Image.new('RGB', (ANCHO, alto), (245, 245, 242)); d = ImageDraw.Draw(hoja)
d.text((M, 14), 'Cúpula del AT-802 · etapa 1b.0 · MEDICIÓN sobre la foto 360 desde el asiento (avión blanco y rojo de AAXOD)', fill=(20, 20, 20), font=F44)
d.text((M, 64), 'Colores = lo que se marcó en cada foto · blanco a trazos = el modelo simétrico que se va a construir (medido desde el asiento), proyectado sobre cada foto: tiene que caer encima de lo marcado', fill=(60, 60, 60), font=F22)
d.rectangle([M, 100, ANCHO - M, Y0 - 8], fill=(18, 22, 30))
for k, (texto, color, guion) in enumerate(LEYENDA):
    x, y = M + 20 + (k % 3) * 1315, 108 + (k // 3) * 34
    if guion: [d.line([(x + j, y + 13), (x + j + 9, y + 13)], fill=color, width=3) for j in range(0, 54, 18)]
    else: d.line([(x, y + 13), (x + 54, y + 13)], fill=color, width=4)
    d.text((x + 66, y), texto, fill=BLANCO, font=F22)
hoja.paste(pano.im, (M, Y0)); yy = Y0 + pano.im.height + M
for fila in filas:
    for k, im in enumerate(fila): hoja.paste(im, (M + k * (VW + M), yy))
    yy += VH + M
os.makedirs(SALIDA, exist_ok=True)
hoja.save(os.path.join(SALIDA, 'cupula_puntos.png'), optimize=True); hoja.save(os.path.join(SALIDA, 'cupula_puntos.jpg'), quality=88)
print('ok', os.path.join(SALIDA, 'cupula_puntos.png'), hoja.size)

# ================= 2. el plano (sin foto, al repo) =================
E = 620                                                                           # px por metro
W2, H2 = 3300, 2060; pl = Image.new('RGB', (W2, H2), (250, 250, 247)); d = ImageDraw.Draw(pl)
FP, FPB, FPT = fuente(20), fuente(22, True), fuente(34, True)
AZ, GR, RJ, VD, MG, NG = (30, 90, 200), (120, 120, 120), (200, 40, 40), (20, 140, 60), (170, 40, 170), (20, 20, 20)
def c1(x): return coma(f'{x:.1f}')
d.text((30, 18), 'Cúpula del AT-802 · lo medido en la etapa 1b.0 (cm; marco de la cabina: x a la derecha del piloto, y arriba, z hacia atrás)', fill=NG, font=FPT)
d.text((30, 64), 'azul = desde el asiento (±1 cm) · rojo = desde afuera (ventanilla trasera, techo y el vidrio de la puerta por fuera: ±2 a 5 cm, PROVISORIO) · violeta = jaula del techo (±4 cm, PROVISORIO) · gris = fuselaje FSN que se conserva · a trazos = no se ve', fill=(70, 70, 70), font=FP)
S = lambda k, lado='der': np.array(sim[k]['p3d_' + lado])
A3 = lambda k, lado='der': np.array(af['rasgos'][k]['p3d_' + lado])
def trazos(p, q, color, w=2, largo=12):
    L = math.dist(p, q); n = max(1, int(L / largo))
    for k in range(0, n, 2): d.line([(p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n), (p[0] + (q[0] - p[0]) * min(k + 1, n) / n, p[1] + (q[1] - p[1]) * min(k + 1, n) / n)], fill=color, width=w)
def cota(p, q, texto, color, dx=0, dy=-24):
    x, y = (p[0] + q[0]) / 2 + dx, (p[1] + q[1]) / 2 + dy; w = d.textlength(texto, font=FPB)
    d.rectangle([x - 3, y - 1, x + w + 3, y + 25], fill=(250, 250, 247)); d.text((x, y), texto, fill=color, font=FPB)
def poli(pts, color, w=3, cerrar=True):
    d.line(pts + ([pts[0]] if cerrar else []), fill=color, width=w, joint='curve')
zs, ys = casco['z'], casco['y']
# ---- costado (z → derecha, y ↑) ----
ox, oy = 100, 820
C = lambda p: (ox + (p[2] - 0.5) * E, oy - (p[1] - 0.8) * E)
d.text((ox, 112), 'DE COSTADO (lado derecho, visto desde afuera; adelante a la izquierda)', fill=NG, font=FPB)
for zz in np.arange(0.6, 3.01, 0.2):
    x = ox + (zz - 0.5) * E; d.line([(x, oy - 1.0 * E), (x, oy + 0.02 * E)], fill=(225, 225, 220)); d.text((x - 20, oy + 0.03 * E), coma(f'z {zz:.1f}'), fill=GR, font=FP)
for yy_ in np.arange(0.8, 1.81, 0.2):
    y = oy - (yy_ - 0.8) * E; d.line([(ox, y), (ox + 2.55 * E, y)], fill=(225, 225, 220)); d.text((ox - 66, y - 11), coma(f'y {yy_:.1f}'), fill=GR, font=FP)
techo = [(ox + (z - 0.5) * E, oy - (t - 0.8) * E) for z, t in zip(zs, casco['techo']) if t is not None]; poli(techo, GR, 2, cerrar=False); d.text((techo[-1][0] - 40, techo[-1][1] - 96), 'techo del FSN (en el eje)', fill=GR, font=FP)
ante = [(ox + (z - 0.5) * E, oy - (a - 0.8) * E) for z, a in zip(zs, casco['antepecho_der']) if a is not None]; poli(ante, GR, 2, cerrar=False)
d.text((ox + 0.02 * E, oy - 0.26 * E), 'antepecho del FSN', fill=GR, font=FP); d.line([(ox + 0.20 * E, oy - 0.225 * E), ante[2]], fill=GR, width=1)
vp3 = [S(f'puerta_esq_{e}') for e in ORDEN]; poli([C(p) for p in vp3], AZ)
if af:
    vg = [A3(f'puerta_esq_{e}') for e in ORDEN]
    for a, b in zip(vg, vg[1:] + vg[:1]): trazos(C(a), C(b), RJ, 2, 9)
for (a, b), k, off in (((0, 1), 'borde_inferior', (-30, 12)), ((1, 2), 'borde_trasero', (-76, -12)), ((2, 3), 'borde_superior', (-24, -34)), ((3, 0), 'borde_delantero', (-112, -40))):
    cota(C(vp3[a]), C(vp3[b]), c1(vp[k]), AZ, *off)
o = S('ojo_centro'); r = med.get('ojo_de_buey_disco_diametro_cm', 9) / 200 * E; c = C(o); d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=AZ, width=3)
pt, pb, pa = np.array(pr['tope']), np.array(pr['base_visible']), np.array(pr['base_antepecho_provisoria'])
d.line([C(pb), C(pt)], fill=AZ, width=7); trazos(C(pa), C(pb), AZ, 3); d.text((C(pt)[0] - 290, C(pt)[1] - 14), 'parante del parabrisas', fill=AZ, font=FPB)
ls, la, lb = S('lateral_esq_sup_parante'), S('lateral_esq_sup_posteA'), S('lateral_base_visible')
poli([C(ls), C(la), C(lb)], VD, 3, cerrar=False); d.text((C(lb)[0] - 150, C(lb)[1] + 6), 'paño lateral', fill=VD, font=FP)
if af:
    vt3 = [A3(f'trasera_esq_{e}') for e in ORDEN]; poli([C(p) for p in vt3], RJ)
    for (a, b), k, off in (((0, 1), 'borde_inferior', (-30, 12)), ((1, 2), 'borde_trasero', (14, -12)), ((2, 3), 'borde_superior', (-24, -34)), ((3, 0), 'borde_delantero', (14, -12))):
        cota(C(vt3[a]), C(vt3[b]), c1(med['ventanilla_trasera_cm'][k]), RJ, *off)
    d.text((C(vt3[3])[0] + 60, C(vt3[3])[1] + 60), 'ventanilla trasera', fill=RJ, font=FPB)
    t1, t2 = A3('techo_punta_del'), A3('techo_punta_tras'); d.line([C(t1), C(t2)], fill=MG, width=6); cota(C(t1), C(t2), f'ventana del techo, unos {med["ventana_techo_largo_cm"]:.0f}', MG, -130, -40)
VT = (110, 80, 210)
def jaula(proy):
    """Caños y nudos de la jaula del techo en la vista dada (función de proyección)."""
    if 'jaula_techo' not in sim: return
    J = sim['jaula_techo']
    for n1, n2 in J['canos']: d.line([proy(nudo(n1)), proy(nudo(n2))], fill=VT, width=3)
    for arco_ in (J['arco_delantero_der'], J['arco_trasero_der']):
        for esp_ in (np.array, f3.espejo): d.line([proy(esp_(q)) for q in arco_], fill=VT, width=3, joint='curve')
    for n in ('FL', 'FR', 'PL', 'PR', 'FC', 'RL', 'RR', 'RC'):
        p = proy(nudo(n)); d.ellipse([p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5], fill=VT)
jaula(C)
cam = np.array(cp['pose']['pos']); c = C(cam); d.ellipse([c[0] - 8, c[1] - 8, c[0] + 8, c[1] + 8], fill=(240, 180, 0)); d.text((c[0] - 176, c[1] - 12), 'cámara de la 360', fill=(150, 110, 0), font=FP)
c = C((0, 1.38, 1.64)); d.ellipse([c[0] - 8, c[1] - 8, c[0] + 8, c[1] + 8], outline=(150, 110, 0), width=3); d.text((c[0] - 136, c[1] - 12), 'ojo del juego', fill=(150, 110, 0), font=FP)
d.text((C(vp3[0])[0] + 30, C(vp3[0])[1] - 60), 'ventana de puerta', fill=AZ, font=FPB)
d.text((ox, oy + 0.09 * E), 'A trazos rojos, el borde del vidrio de la puerta visto desde AFUERA: no coincide con el marco que se ve desde el asiento (azul); hasta 4 cm en la esquina de abajo atrás.', fill=RJ, font=FP)
# ---- planta (z → derecha, x ↓ = derecha del piloto) ----
ox2, oy2 = 100, 1500
Pn = lambda p: (ox2 + (p[2] - 0.5) * E, oy2 + p[0] * E)
d.text((ox2, 1010), 'EN PLANTA (desde arriba; adelante a la izquierda; abajo = derecha del piloto)', fill=NG, font=FPB)
d.line([(ox2, oy2), (ox2 + 2.55 * E, oy2)], fill=(200, 200, 195))
j = ys.index(0.9)                                                                 # el fuselaje FSN justo bajo el antepecho
for clave in ('izq', 'der'):
    seg = [(ox2 + (z - 0.5) * E, oy2 + fila[j] * E) for z, fila in zip(zs, casco[clave]) if fila[j] is not None and z >= 0.9]
    if len(seg) > 1: d.line(seg, fill=GR, width=2)
d.text((ox2 + 0.42 * E, oy2 + 0.74 * E), 'gris: fuselaje FSN a y 0,90 (bajo el antepecho)', fill=GR, font=FP)
if 'techo_ventana' in sim: d.text((ox2 + 1.42 * E, oy2 + 0.74 * E), f'magenta: ventana del techo, unos {med["ventana_techo_largo_cm"]:.0f} × {c1(sim["techo_ventana"]["ancho_cm"])}', fill=MG, font=FP)
for lado in ('der', 'izq'):
    poli([Pn(S(f'puerta_esq_{e}', lado)) for e in ORDEN], AZ)
    for k in (0, 1):
        A, B = pr['borde_interior'][k], pr['borde_exterior'][k]; A, B = (np.array(A), np.array(B)) if lado == 'der' else (f3.espejo(A), f3.espejo(B)); d.line([Pn(A), Pn(B)], fill=AZ, width=8)
    poli([Pn(S('lateral_esq_sup_parante', lado)), Pn(S('lateral_esq_sup_posteA', lado)), Pn(S('lateral_base_visible', lado))], VD, 3, cerrar=False)
    o = Pn(S('ojo_centro', lado)); d.ellipse([o[0] - 7, o[1] - 7, o[0] + 7, o[1] + 7], outline=AZ, width=3)
    if 'techo_ventana' in sim:
        c3 = [np.array(p) if lado == 'der' else f3.espejo(p) for p in sim['techo_ventana']['contorno_der']]; poli([Pn(p) for p in c3], MG, 3)
    if af: poli([Pn(A3(f'trasera_esq_{e}', lado)) for e in ORDEN], RJ)
d.line([Pn(S('parabrisas_esq_sup', 'izq')), Pn(S('parabrisas_esq_sup', 'der'))], fill=AZ, width=3)
cota(Pn(S('parabrisas_esq_sup', 'izq')), Pn(S('parabrisas_esq_sup', 'der')), f'paño central {c1(med["pano_central_ancho_arriba_cm"])} (arriba)', AZ, -330, -12)
d.text((ox2, Pn(f3.espejo(pr['tope']))[1] - 66), 'parantes (barras azules): a la altura del tablero y arriba', fill=AZ, font=FP)
c = Pn(cam); d.ellipse([c[0] - 8, c[1] - 8, c[0] + 8, c[1] + 8], fill=(240, 180, 0)); d.text((c[0] + 12, c[1] + 6), 'cámara', fill=(150, 110, 0), font=FP)
jaula(Pn); d.text((Pn(nudo('RC'))[0] + 16, Pn(nudo('RC'))[1] - 12), 'jaula del techo (provisoria)', fill=VT, font=FP)
for zz in np.arange(0.6, 3.01, 0.2):
    x = ox2 + (zz - 0.5) * E; d.text((x - 20, oy2 + 0.80 * E), coma(f'z {zz:.1f}'), fill=GR, font=FP)
# ---- frente (x → derecha, y ↑) ----
ox3, oy3 = 2520, 820
Fr = lambda p: (ox3 + p[0] * E, oy3 - (p[1] - 0.8) * E)
d.text((ox3 - 0.74 * E, 112), 'DE FRENTE (mirando hacia adelante desde atrás)', fill=NG, font=FPB)
d.line([(ox3, oy3 - 1.0 * E), (ox3, oy3)], fill=(200, 200, 195))
k = min(range(len(zs)), key=lambda i: abs(zs[i] - 1.6))
for clave in ('izq', 'der'):
    seg = [(ox3 + x * E, oy3 - (y - 0.8) * E) for x, y in zip(casco[clave][k], ys) if x is not None and y >= 0.8]
    if len(seg) > 1: d.line(seg, fill=GR, width=2)
d.text((ox3 + 0.30 * E, oy3 - 0.06 * E), 'gris: FSN en z 1,6', fill=GR, font=FP)
for lado in ('der', 'izq'):
    poli([Fr(S(f'puerta_esq_{e}', lado)) for e in ORDEN], AZ)
    A, B = np.array(pr['base_visible']), np.array(pr['tope']); A, B = (A, B) if lado == 'der' else (f3.espejo(A), f3.espejo(B)); d.line([Fr(A), Fr(B)], fill=AZ, width=7)
    poli([Fr(S('lateral_esq_sup_parante', lado)), Fr(S('lateral_esq_sup_posteA', lado)), Fr(S('lateral_base_visible', lado))], VD, 3, cerrar=False)
    if 'techo_ventana' in sim:
        c3 = [np.array(p) if lado == 'der' else f3.espejo(p) for p in sim['techo_ventana']['contorno_der']]; poli([Fr(p) for p in c3], MG, 3)
    if af: poli([Fr(A3(f'trasera_esq_{e}', lado)) for e in ORDEN], RJ, 2)
d.line([Fr(S('parabrisas_esq_sup', 'izq')), Fr(S('parabrisas_esq_sup', 'der'))], fill=AZ, width=3)
jaula(Fr)
t_ = f'parantes: {c1(med["parantes_separacion_ejes_cm"]["arriba"])} entre ejes'; d.text((ox3 - d.textlength(t_, font=FP) / 2, Fr((0, 1.40, 0))[1]), t_, fill=AZ, font=FP)
for xx in np.arange(-0.6, 0.61, 0.2):
    x = ox3 + xx * E; d.text((x - 26, oy3 + 0.03 * E), coma(f'x {xx:+.1f}'), fill=GR, font=FP)
# ---- tabla de puntos ----
tx, ty = 1800, 1010
d.text((tx, ty), 'PUNTOS (m), lado derecho · ± = diferencia entre los dos lados (asiento) o incertidumbre del ajuste (afuera)', fill=NG, font=FPB); ty += 42
filas_t = [(k.replace('_', ' '), v['p3d_der'], f'±{v["asimetria_cm"] / 2:.1f} cm') for k, v in sim.items() if 'p3d_der' in v]
filas_t += [('parante tope (eje)', pr['tope'], ''), ('parante base visible (eje)', pr['base_visible'], ''), ('parante base en el antepecho', pr['base_antepecho_provisoria'], 'prolongado')]
if af: filas_t += [(k.replace('_', ' ') + ' (afuera)', v['p3d_der'], f'±{max(v["sigma_cm"]):.0f} cm') for k, v in af['rasgos'].items()]
if 'jaula_techo' in sim: filas_t += [(f'jaula del techo: nudo {k}', v, '±4 cm') for k, v in sim['jaula_techo']['nudos_der'].items()]
for i, (n, p, e) in enumerate(filas_t):
    col = RJ if '(afuera)' in n else (VT if n.startswith('jaula') else AZ)
    d.text((tx, ty), n, fill=col, font=FP); d.text((tx + 520, ty), coma(f'x {p[0]:+.3f}   y {p[1]:.3f}   z {p[2]:.3f}'), fill=NG, font=FP); d.text((tx + 960, ty), coma(e), fill=GR, font=FP); ty += 30
pl.save(os.path.join(CARPETA, 'cupula_plano.png'), optimize=True); pl.save(os.path.join(SALIDA, 'cupula_plano.png'), optimize=True)
print('ok', os.path.join(CARPETA, 'cupula_plano.png'), pl.size)
