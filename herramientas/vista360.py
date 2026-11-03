# Vista plana (perspectiva) desde una foto equirectangular: yaw/pitch en grados, campo horizontal hfov.
# Uso: python vista360.py foto.jpg salida.jpg yaw pitch hfov ancho alto
import sys, math
import numpy as np
from PIL import Image

ruta, salida = sys.argv[1], sys.argv[2]
yaw, pitch, hfov = (math.radians(float(a)) for a in sys.argv[3:6])
w, h = int(sys.argv[6]), int(sys.argv[7])
img = np.asarray(Image.open(ruta).convert('RGB'))
H, W = img.shape[:2]
f = (w / 2) / math.tan(hfov / 2)
i, j = np.meshgrid(np.arange(w) - w / 2 + 0.5, np.arange(h) - h / 2 + 0.5)
x, y, z = i / f, -j / f, np.ones_like(i)
# pitch (alrededor de x) y después yaw (alrededor de y); z = adelante, x = derecha, y = arriba
cp, sp = math.cos(pitch), math.sin(pitch)
y2, z2 = y * cp + z * sp, -y * sp + z * cp
cy, sy = math.cos(yaw), math.sin(yaw)
x3, z3 = x * cy + z2 * sy, -x * sy + z2 * cy
lon = np.arctan2(x3, z3)
lat = np.arctan2(y2, np.hypot(x3, z3))
u = ((lon / (2 * math.pi) + 0.5) * W).astype(np.int64) % W
v = np.clip(((0.5 - lat / math.pi) * H).astype(np.int64), 0, H - 1)
Image.fromarray(img[v, u]).save(salida, quality=90)
print('ok', salida)
