# Cabina nueva · etapa 0 · «plano» de la cabina vacía para Iván: el casco FSN por dentro con sus medidas
# (de blender/casco_medido.json): secciones transversales cada 20 cm, vista de costado y vista en planta.
# Uso: python -E -P herramientas/cab_plano.py [salida.png]
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
m = json.load(open(os.path.join(RAIZ, 'blender', 'casco_medido.json'), encoding='utf-8'))
SAL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'blender', 'calcado', 'plano_casco.png')
os.makedirs(os.path.dirname(SAL), exist_ok=True)
try: F = ImageFont.truetype('arial.ttf', 15); FG = ImageFont.truetype('arialbd.ttf', 22)
except OSError: F = FG = ImageFont.load_default()
OJO = (0, 1.38, 1.64); PISO = 0.26
zs, ys = m['z'], m['y']
img = Image.new('RGB', (2500, 2150), (250, 250, 247)); d = ImageDraw.Draw(img)
d.text((20, 14), 'Casco FSN por dentro (exterior.glb medido con rayos desde el eje, paso 2,5 cm) · marco cabina en metros · gris = chapa · celeste = vidrio · amarillo = ojo del piloto · piso de referencia y 0,26', fill=(30, 30, 30), font=FG)

# ---- secciones transversales (x, y) cada 20 cm, en una grilla ----
ESC = 300   # px por metro
def seccion(k, ox, oy):
    z = zs[k]
    d.rectangle([ox - 0.78 * ESC, oy - 2.0 * ESC, ox + 0.78 * ESC, oy - 0.05 * ESC], outline=(215, 215, 210))
    d.text((ox - 0.76 * ESC, oy - 1.98 * ESC), f'z = {z:.2f}', fill=(30, 30, 30), font=F)
    for lado, clave in ((-1, 'izq'), (1, 'der')):
        prev = None
        for j, y in enumerate(ys):
            x = m[clave][k][j]; v = m['vidrio_' + clave][k][j]
            if x is None: prev = None; continue
            p = (ox + x * ESC, oy - y * ESC)
            if prev and abs(p[0] - prev[0]) < 0.08 * ESC: d.line([prev, p], fill=(70, 190, 240) if v else (90, 90, 90), width=3 if v else 2)
            prev = p
    t = m['techo'][k]
    if t is not None: d.line([(ox - 0.03 * ESC, oy - t * ESC), (ox + 0.03 * ESC, oy - t * ESC)], fill=(90, 90, 90), width=2); d.text((ox + 0.04 * ESC, oy - t * ESC - 8), f'techo {t:.2f}', fill=(90, 90, 90), font=F)
    d.line([(ox - 0.6 * ESC, oy - PISO * ESC), (ox + 0.6 * ESC, oy - PISO * ESC)], fill=(160, 160, 150), width=1)
    for y in (0.5, 1.0, 1.5):
        j = ys.index(round(y, 4)); xi, xd = m['izq'][k][j], m['der'][k][j]
        if xi is not None and xd is not None: d.text((ox + 0.3 * ESC, oy - y * ESC - 8), f'y {y:.1f}: {abs(xi) + xd:.2f} m', fill=(120, 60, 60), font=F)
    if abs(z - OJO[2]) < 0.013: d.ellipse([ox - 6, oy - OJO[1] * ESC - 6, ox + 6, oy - OJO[1] * ESC + 6], fill=(240, 200, 0))
cols = [k for k, z in enumerate(zs) if round(z * 100) % 20 == 0 and 0.6 <= z <= 2.4]
for i, k in enumerate(cols):
    seccion(k, 40 + 0.78 * ESC + (i % 5) * (1.58 * ESC + 12), 60 + 2.0 * ESC + (i // 5) * (2.05 * ESC + 12))

# ---- vista de costado (z, y): techo y antepechos; vista en planta (z, x): ancho a y 0,5 / 0,9 / 1,3 ----
oy = 2060; ox = 60; E2 = 260
d.text((ox, oy - 2.1 * E2 - 26), 'Costado: techo (gris), antepecho izq. (celeste) · Planta (abajo): ancho a y 0,5 (gris), 0,9 (rojo), 1,3 (celeste)', fill=(30, 30, 30), font=F)
def curva(pts, color, w=2):
    prev = None
    for p in pts:
        if p and prev: d.line([prev, p], fill=color, width=w)
        prev = p
curva([(ox + (z - 0.5) * E2, oy - y * E2) if y is not None else None for z, y in zip(zs, m['techo'])], (90, 90, 90))
curva([(ox + (z - 0.5) * E2, oy - y * E2) if y is not None else None for z, y in zip(zs, m['antepecho_izq'])], (70, 190, 240), 3)
d.line([(ox, oy - PISO * E2), (ox + 2.0 * E2, oy - PISO * E2)], fill=(160, 160, 150), width=1)
for z in (0.5, 1.0, 1.5, 2.0, 2.5): d.text((ox + (z - 0.5) * E2 - 10, oy + 4), f'z {z:.1f}', fill=(30, 30, 30), font=F)
d.ellipse([ox + (OJO[2] - 0.5) * E2 - 6, oy - OJO[1] * E2 - 6, ox + (OJO[2] - 0.5) * E2 + 6, oy - OJO[1] * E2 + 6], fill=(240, 200, 0))
# parabrisas: z = 0,74 + 0,93·(y − 1,02)
d.line([(ox + (0.74 + 0.93 * (1.02 - 1.02) - 0.5) * E2, oy - 1.02 * E2), (ox + (0.74 + 0.93 * (1.65 - 1.02) - 0.5) * E2, oy - 1.65 * E2)], fill=(70, 190, 240), width=2)
ox2 = 760; oy2 = 2060 - 0.95 * E2
for y, color in ((0.5, (90, 90, 90)), (0.9, (200, 60, 60)), (1.3, (70, 190, 240))):
    j = ys.index(round(y, 4))
    for clave, s in (('izq', 1), ('der', 1)):
        curva([(ox2 + (z - 0.5) * E2, oy2 - (m[clave][k][j] or 0) * E2) if m[clave][k][j] is not None else None for k, z in enumerate(zs)], color)
d.text((ox2, oy2 + 0.8 * E2), 'planta: arriba = derecha del piloto', fill=(30, 30, 30), font=F)
img.save(SAL); print('ok', SAL)
