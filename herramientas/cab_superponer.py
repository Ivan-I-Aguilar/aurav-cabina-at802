# Cabina nueva · etapa 0 · superposiciones y medidas de la foto 360 del asiento contra el fuselaje FSN.
# Toma lo que dejó cab_calcar.py (pose54.json, modelo54_clase.npy, modelo54_dist.npy) y la foto, y escribe:
#   sup54_panorama.jpg      la 360 entera con los bordes del FSN (chapa↔vidrio) en celeste
#   sup54_<vista>.jpg       vistas planas (frente, puerta izq., puerta der., techo, parabrisas) con los bordes
#   sup54_medidas.json/.txt diferencia entre los bordes de la foto y los del modelo, línea por línea,
#                           en grados y en cm (a la distancia del impacto): es el dato de la decisión A/B
# Afuera (--afuera, DSCN0040–0051): lo claro de la foto es la chapa blanca del avión contra el piso; se
# dibujan los bordes de la chapa (silueta) en celeste y los de los vidrios en naranja.
# Uso: python -E -P herramientas/cab_superponer.py <carpeta de cab_calcar> <foto 360.jpg> [--foto 54] [--afuera]
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

CARPETA, FOTO = sys.argv[1], sys.argv[2]
N = int(sys.argv[sys.argv.index('--foto') + 1]) if '--foto' in sys.argv else 54
AFUERA = '--afuera' in sys.argv
UMBRAL = 0.50 if AFUERA else 0.45
pose = json.load(open(os.path.join(CARPETA, f'pose{N}.json'), encoding='utf-8'))
rot = json.load(open(os.path.join(CARPETA, f'pose{N}_rot.json'), encoding='utf-8'))
clase = np.load(os.path.join(CARPETA, f'modelo{N}_clase.npy')); dist = np.load(os.path.join(CARPETA, f'modelo{N}_dist.npy'))
H, W = clase.shape
foto = Image.open(FOTO).convert('RGB').resize((W, H), Image.LANCZOS)
lum = np.asarray(foto).astype(np.float32).mean(-1) / 255
SAL = f'sup{N}_'

def bordes(mask):
    """Píxeles donde la máscara cambia (horizontal o vertical)."""
    b = np.zeros_like(mask, bool)
    b[:, 1:] |= mask[:, 1:] != mask[:, :-1]; b[1:, :] |= mask[1:, :] != mask[:-1, :]
    return b

def pintar(img, mask, color, alfa):
    a = np.asarray(img).astype(np.float32); c = np.array(color, np.float32)
    a[mask] = a[mask] * (1 - alfa) + c * alfa
    return Image.fromarray(a.astype(np.uint8))

try: fuente = ImageFont.truetype('arial.ttf', 22)
except OSError: fuente = ImageFont.load_default()

# ---- 1. panorama ----
vid = clase == (1 if AFUERA else 2)   # lo que en el modelo se ve CLARO
pano = pintar(foto, vid, (80, 220, 255), 0.18)
pano = pintar(pano, bordes(vid), (0, 230, 255), 1.0)
if AFUERA: pano = pintar(pano, bordes(clase == 2), (255, 150, 0), 1.0)
d = ImageDraw.Draw(pano)
for k in range(-180, 181, 30):
    x = (k / 360 + 0.5) * W; d.line([(x, 0), (x, H)], fill=(255, 80, 80), width=1); d.text((x + 3, H / 2 + 3), f'{k}°', fill=(255, 255, 0), font=fuente)
for la in (-30, 0, 30, 60):
    y = (0.5 - la / 180) * H; d.line([(0, y), (W, y)], fill=(255, 80, 80), width=1); d.text((3, y + 3), f'{la}°', fill=(255, 255, 0), font=fuente)
x, y, z = pose['pos']
d.text((10, 10), f'360 {"de afuera" if AFUERA else "desde el asiento"} (DSCN00{N}) + {"chapa del FSN (silueta celeste, vidrios naranja)" if AFUERA else "vidrios del FSN en celeste"} · cámara en ({x:.2f}, {y:.2f}, {z:.2f}) m · yaw {math.degrees(pose["yaw"]):.1f}° pitch {math.degrees(pose["pitch"]):.1f}° roll {math.degrees(pose["roll"]):.1f}° · iou {pose["iou"]:.2f}', fill=(255, 255, 255), font=fuente)
pano.save(os.path.join(CARPETA, SAL + 'panorama.jpg'), quality=90)

# ---- 2. vistas planas (yaw/pitch en el marco de la FOTO: 0 = adelante, negativo = izquierda) ----
def vista_plana(yaw, pitch, hfov, w, h):
    f = (w / 2) / math.tan(math.radians(hfov) / 2)
    i, j = np.meshgrid(np.arange(w) - w / 2 + 0.5, np.arange(h) - h / 2 + 0.5)
    xx, yy, zz = i / f, -j / f, np.ones_like(i)
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    y2, z2 = yy * cp + zz * sp, -yy * sp + zz * cp
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    x3, z3 = xx * cy + z2 * sy, -xx * sy + z2 * cy
    lon = np.arctan2(x3, z3); lat = np.arctan2(y2, np.hypot(x3, z3))
    u = ((lon / (2 * math.pi) + 0.5) * W).astype(np.int64) % W
    v = np.clip(((0.5 - lat / math.pi) * H).astype(np.int64), 0, H - 1)
    return u, v

VISTAS = {'cabina': (-45, -12, 90), 'parabrisas': (-15, -8, 70), 'puerta': (-75, -15, 80), 'lomo': (-45, 10, 90)} if AFUERA else {'frente': (0, 8, 100), 'parabrisas': (0, 25, 70), 'puerta_izq': (-85, 5, 95), 'puerta_der': (85, 5, 95), 'techo': (0, 70, 120), 'atras_izq': (-150, 20, 100), 'atras_der': (150, 20, 100)}
foto_full = np.asarray(Image.open(FOTO).convert('RGB'))
HF, WF = foto_full.shape[:2]
for nombre, (yaw, pitch, hfov) in VISTAS.items():
    w, h = 1200, 800
    u, v = vista_plana(yaw, pitch, hfov, w, h)
    uf = ((u + 0.5) / W * WF).astype(np.int64) % WF; vf = np.clip(((v + 0.5) / H * HF).astype(np.int64), 0, HF - 1)
    img = Image.fromarray(foto_full[vf, uf])
    vm = vid[v, u]; img = pintar(img, vm, (80, 220, 255), 0.15); img = pintar(img, bordes(vm), (0, 230, 255), 1.0)
    if AFUERA: img = pintar(img, bordes((clase == 2)[v, u]), (255, 150, 0), 1.0)
    ImageDraw.Draw(img).text((10, 10), f'{nombre}: foto 360 + {"chapa (celeste) y vidrios (naranja) del FSN" if AFUERA else "vidrios del FSN (celeste)"}', fill=(255, 255, 0), font=fuente)
    img.save(os.path.join(CARPETA, SAL + f'{nombre}.jpg'), quality=90)

# ---- 3. medidas: por cada línea horizontal (lat) y vertical (lon), los bordes claro/oscuro de la foto
#         contra los bordes vidrio/chapa del modelo; se empareja cada borde del modelo con el más cercano
#         de la foto (hasta 6°) y se anota la diferencia en grados y en cm a la distancia del impacto ----
fmask = lum > UMBRAL
LAT0, LAT1 = (-55, 15) if AFUERA else (-20, 70)
def transiciones(fila):
    return np.nonzero(fila[1:] != fila[:-1])[0] + 1
med = []
for la in range(LAT0, LAT1 + 1, 5):
    r = int((0.5 - la / 180) * H)
    tf = transiciones(fmask[r]); tm = transiciones(vid[r])
    for c in tm:
        if not len(tf): continue
        k = tf[np.argmin(np.abs(tf - c))]; dcol = (k - c) * 360 / W
        if abs(dcol) > 6: continue
        dd = float(dist[r, c]) if dist[r, c] > 0 else float(dist[r, max(c - 1, 0)])
        med.append({'lat': la, 'lon': round((c / W - 0.5) * 360, 1), 'dif_grados': round(dcol * math.cos(math.radians(la)), 2), 'dist_m': round(dd, 2), 'dif_cm': round(dd * math.radians(dcol * math.cos(math.radians(la))) * 100, 1)})
for lo in range(-180, 180, 10):
    c = int((lo / 360 + 0.5) * W)
    tf = transiciones(fmask[:, c]); tm = transiciones(vid[:, c])
    for r in tm:
        if not len(tf): continue
        k = tf[np.argmin(np.abs(tf - r))]; dfil = (k - r) * 180 / H
        if abs(dfil) > 6: continue
        dd = float(dist[r, c]) if dist[r, c] > 0 else float(dist[max(r - 1, 0), c])
        med.append({'lat': round((0.5 - r / H) * 180, 1), 'lon': lo, 'dif_grados': round(dfil, 2), 'dist_m': round(dd, 2), 'dif_cm': round(dd * math.radians(dfil) * 100, 1)})
cm = np.array([abs(m['dif_cm']) for m in med]) if med else np.zeros(1)
res = {'pose': pose, 'bordes_comparados': len(med), 'mediana_cm': round(float(np.median(cm)), 1), 'p75_cm': round(float(np.percentile(cm, 75)), 1), 'p90_cm': round(float(np.percentile(cm, 90)), 1), 'max_cm': round(float(cm.max()), 1), 'medidas': med}
# resumen por zona (según el yaw de la foto): parabrisas ±35°, puertas 35–125°, atrás >125°
zonas = {'parabrisas (±35°)': lambda m: abs(m['lon']) <= 35, 'puerta izquierda': lambda m: -125 <= m['lon'] < -35, 'puerta derecha': lambda m: 35 < m['lon'] <= 125, 'atrás': lambda m: abs(m['lon']) > 125}
res['por_zona'] = {}
for zn, f in zonas.items():
    v = np.array([abs(m['dif_cm']) for m in med if f(m)])
    if len(v): res['por_zona'][zn] = {'n': int(len(v)), 'mediana_cm': round(float(np.median(v)), 1), 'p90_cm': round(float(np.percentile(v, 90)), 1)}
with open(os.path.join(CARPETA, SAL + 'medidas.json'), 'w', encoding='utf-8') as f: json.dump(res, f, ensure_ascii=False, indent=1)
with open(os.path.join(CARPETA, SAL + 'medidas.txt'), 'w', encoding='utf-8') as f:
    f.write(f'Cámara de la 360 en ({x:.3f}, {y:.3f}, {z:.3f}) m (marco cabina); ojo del juego en {rot["ojo_juego"]}: diferencia {rot["dif_ojo_cm"]} cm\n')
    f.write(f'Bordes comparados: {len(med)} · mediana {res["mediana_cm"]} cm · p75 {res["p75_cm"]} cm · p90 {res["p90_cm"]} cm · máx {res["max_cm"]} cm\n')
    for zn, v in res['por_zona'].items(): f.write(f'  {zn}: {v["n"]} bordes · mediana {v["mediana_cm"]} cm · p90 {v["p90_cm"]} cm\n')
print(open(os.path.join(CARPETA, SAL + 'medidas.txt'), encoding='utf-8').read())
