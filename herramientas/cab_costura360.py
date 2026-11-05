# Cabina nueva · etapa 1b.0 · DESALINEACIÓN entre las dos lentes de la KeyMission 360, medida con lo LEJANO (el hangar).
# En cada costura (lon +90 y −90 de la foto) se comparan por correlación los perfiles verticales de luminancia a un
# lado y al otro (a 3, 4,5 y 6° de la costura, extrapolado a 0): salto = lat(lente trasera) − lat(lente delantera) del
# mismo rasgo. Un giro de la lente trasera alrededor del eje de la cámara da +e en una costura y −e en la otra, igual
# a toda altura; el paralaje de lo lejano es despreciable.
# Resultado con las 53 fotos del 24/9/2026 (medido el 5/11): +0,25° en la costura de −90 y −0,25° en la de +90
# → cab_foto360.GIRO_T = (0, 0, 0,25°).
# Uso: python -E -P -X utf8 herramientas/cab_costura360.py "<carpeta con las DSCN00*.JPG>"
import glob, os, sys
import numpy as np
from PIL import Image

VENTANAS = [(8, 22), (22, 36), (36, 50)]      # franjas de latitud sobre el horizonte: techo y paredes del hangar (lejos)

def perfil(a, lon, W, r0, r1, medio=0.75):
    """Perfil vertical de luminancia en una columna de ±medio grados, sin la tendencia (pasa-altos de 3°)."""
    c = int((lon / 360 + 0.5) * W); k = int(medio / 360 * W)
    p = a[r0:r1, c - k:c + k + 1].mean(1)
    n = int(3 / 180 * a.shape[0]); s = np.convolve(p, np.ones(n) / n, mode='same')
    return p - s

def correlacion(pf, pt, maxs):
    """Desplazamiento (px; + = la lente trasera lo muestra más ARRIBA) y valor del pico de correlación."""
    mejor = (-2, 0); vals = {}
    for s in range(-maxs, maxs + 1):
        a = pf[maxs:-maxs]; b = pt[maxs - s:len(pt) - maxs - s]
        v = float((a * b).sum() / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)); vals[s] = v
        if v > mejor[0]: mejor = (v, s)
    v, s = mejor
    if -maxs < s < maxs:
        y0, y1, y2 = vals[s - 1], v, vals[s + 1]; den = y0 - 2 * y1 + y2
        s = s + (0.5 * (y0 - y2) / den if abs(den) > 1e-9 else 0)
    return s, v

if __name__ == '__main__':
    fotos = sorted(glob.glob(os.path.join(sys.argv[1], 'DSCN00*.JPG')))
    res = {(sg, w): [] for sg in (1, -1) for w in VENTANAS}
    for f in fotos:
        a = np.asarray(Image.open(f).convert('L')).astype(np.float32); H, W = a.shape; ppd = H / 180
        for sg in (1, -1):
            for w in VENTANAS:
                r0, r1 = int((90 - w[1]) * ppd), int((90 - w[0]) * ppd); pts = []
                for d in (3.0, 4.5, 6.0):
                    s, v = correlacion(perfil(a, sg * (90 - d), W, r0, r1), perfil(a, sg * (90 + d), W, r0, r1), int(1.6 * ppd))
                    pts.append((d, s / ppd, v))
                if min(p[2] for p in pts) < 0.55: continue                   # sin rasgos claros a los dos lados
                ds = np.array([p[0] for p in pts]); ss = np.array([p[1] for p in pts]); m, j = np.polyfit(ds, ss, 1)
                if np.abs(ss - (m * ds + j)).max() > 0.12: continue           # los tres desplazamientos tienen que caer en una recta
                res[(sg, w)].append(j)
    for sg in (1, -1):
        for w in VENTANAS:
            v = np.array(res[(sg, w)])
            print(f'costura {90 * sg:+d}, lat {w[0]}..{w[1]}: ' + (f'{len(v)} fotos · mediana {np.median(v):+.3f}° · cuartiles {np.percentile(v, 25):+.3f} / {np.percentile(v, 75):+.3f}' if len(v) else 'sin datos'))
    for sg in (1, -1):
        v = np.array([x for w in VENTANAS for x in res[(sg, w)]])
        print(f'costura {90 * sg:+d} (todas las alturas): {len(v)} medidas · mediana {np.median(v):+.3f}°')
