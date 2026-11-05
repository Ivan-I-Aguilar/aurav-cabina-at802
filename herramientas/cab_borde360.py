# Cúpula nueva · etapa 1b.0 · medir BORDES RECTOS en una foto 360 (equirectangular).
# Un borde recto del avión (un caño, el borde de un vidrio) se ve en la foto como un arco de círculo máximo. Dado
# un arco aproximado A→B (lon, lat en grados de la FOTO) y un punto del lado del vidrio, se muestrea la luminancia
# a lo largo del arco (s) y perpendicular a él (t), se toma la MEDIANA sobre s por tramos (así no molestan las
# cosas del hangar que se ven por el vidrio) y se busca el escalón oscuro→claro (marco→vidrio). Con los escalones
# de cada tramo se reajusta el círculo máximo. Precisión típica: 0,05–0,15° (1–2 px de la foto).
# Uso:  python -E -P -X utf8 herramientas/cab_borde360.py <foto.jpg> <bordes.json> <salida.json> [--ver]
#   bordes.json: {nombre: {"A": [lon, lat], "B": [lon, lat], "adentro": [lon, lat], "claro_adentro": true}}
#   salida.json: {nombre: {"A", "B" afinados, "residuo_grados", "puntos": [[lon, lat] × 9]}}
import json, math, sys
import numpy as np
from PIL import Image

def vec(lon, lat):
    lo, la = math.radians(lon), math.radians(lat)
    return np.array([math.sin(lo) * math.cos(la), math.sin(la), -math.cos(lo) * math.cos(la)])

def lonlat(d):
    d = d / np.linalg.norm(d)
    return [round(math.degrees(math.atan2(d[0], -d[2])), 3), round(math.degrees(math.asin(max(-1.0, min(1.0, d[1])))), 3)]

class Foto:
    def __init__(self, ruta):
        self.img = np.asarray(Image.open(ruta).convert('L')).astype(np.float32) / 255
        self.H, self.W = self.img.shape

    def lum(self, d):
        lon = np.degrees(np.arctan2(d[..., 0], -d[..., 2])); lat = np.degrees(np.arcsin(np.clip(d[..., 1], -1, 1)))
        c = ((lon / 360 + 0.5) * self.W).astype(int) % self.W; r = np.clip(((0.5 - lat / 180) * self.H).astype(int), 0, self.H - 1)
        return self.img[r, c]

    def apilado(self, A, B, adentro, tmax=2.5, dt=0.025, ds=0.05, margen=0.06):
        """Luminancia L[s, t] alrededor del arco A→B; t > 0 hacia `adentro`. Devuelve (ss rad, ts grados, L, a, e, n)."""
        a, b = vec(*A), vec(*B); n = np.cross(a, b); n /= np.linalg.norm(n)
        if np.dot(n, vec(*adentro)) < 0: n = -n
        ang = math.acos(float(np.clip(np.dot(a, b), -1, 1))); e = np.cross(n, a); e /= np.linalg.norm(e)
        if np.dot(e, b) < 0: e = -e
        ss = np.arange(ang * margen, ang * (1 - margen), math.radians(ds)); ts = np.arange(-tmax, tmax + 1e-9, dt)
        P = np.cos(ss)[:, None] * a[None, :] + np.sin(ss)[:, None] * e[None, :]
        tr = np.radians(ts)
        Q = np.cos(tr)[None, :, None] * P[:, None, :] + np.sin(tr)[None, :, None] * n[None, None, :]
        return ss, ts, self.lum(Q), a, e, n

def escalon(ts, prof, claro_adentro=True, ventana=1.6, salto=0.12):
    """El escalón marco→vidrio más ADENTRO (mayor t) dentro de ±ventana: posición t (interpolada a media altura) o None."""
    if not claro_adentro: prof = -prof
    k = max(3, int(round(0.2 / (ts[1] - ts[0])))); p = np.convolve(prof, np.ones(k) / k, mode='same')
    g = np.gradient(p, ts); n = len(ts); paso = ts[1] - ts[0]
    w1, w2 = int(round(0.25 / paso)), int(round(0.9 / paso))
    mejor = None
    for i in range(w2, n - w2):
        if abs(ts[i]) > ventana or not (g[i] >= g[i - 1] and g[i] >= g[i + 1]): continue
        bajo = float(np.median(p[i - w2:i - w1])); alto = float(np.median(p[i + w1:i + w2]))
        if alto - bajo < salto: continue
        # cruce a media altura cerca de i
        medio = (alto + bajo) / 2; j = i
        while j > 1 and p[j] > medio: j -= 1
        while j < n - 2 and p[j + 1] < medio: j += 1
        t = ts[j] + (medio - p[j]) / (p[j + 1] - p[j]) * paso if p[j + 1] != p[j] else ts[j]
        if mejor is None or t > mejor[0]: mejor = (float(t), alto - bajo)
    return mejor

def recta_robusta(ss, offs, tol=0.2):
    """Ajuste t(s) = c0 + c1·s tolerante a valores atípicos: la recta por el par de tramos con más tramos a menos
    de `tol` grados; devuelve los índices de los tramos buenos."""
    n = len(ss); mejor = (0, 9.0, list(range(n)))
    for i in range(n):
        for j in range(i + 1, n):
            c1 = (offs[j] - offs[i]) / (ss[j] - ss[i]); c0 = offs[i] - c1 * ss[i]
            res = [abs(offs[k] - (c0 + c1 * ss[k])) for k in range(n)]
            dentro = [k for k in range(n) if res[k] < tol]
            err = sum(res[k] for k in dentro) / max(1, len(dentro))
            if len(dentro) > mejor[0] or (len(dentro) == mejor[0] and err < mejor[1]): mejor = (len(dentro), err, dentro)
    return mejor[2]

def afinar(foto, A, B, adentro, claro_adentro=True, tramos=8, rondas=3, ver=False, nombre=''):
    """Afina el círculo máximo A→B con los escalones de cada tramo (descartando los atípicos)."""
    def escalones(A, B):
        ss, ts, L, a, e, n = foto.apilado(A, B, adentro); S = len(ss); sal = []
        for k in range(tramos):
            sub = L[k * S // tramos:(k + 1) * S // tramos]
            if len(sub) < 5: continue
            r = escalon(ts, np.median(sub, 0), claro_adentro)
            if r is None: continue
            sal.append((float(ss[(k * S // tramos + (k + 1) * S // tramos) // 2]), r[0]))
        return sal, a, e, n
    for ronda in range(rondas):
        sal, a, e, n = escalones(A, B)
        if len(sal) < 2: return None
        buenos = recta_robusta([s for s, _ in sal], [t for _, t in sal]) if len(sal) >= 3 else list(range(len(sal)))
        if ver: print(f'   {nombre} ronda {ronda}: escalones t = ' + ' '.join(f'{t:+.2f}' + ('' if k in buenos else '*') for k, (s_, t) in enumerate(sal)))
        pts = []
        for k in buenos:
            s_, t = sal[k]; t = math.radians(t); p = math.cos(s_) * a + math.sin(s_) * e
            pts.append(math.cos(t) * p + math.sin(t) * n)
        if len(pts) >= 3:
            u, sv, vt = np.linalg.svd(np.array(pts)); nn = vt[2]
        else:
            nn = np.cross(pts[0], pts[-1]); nn /= np.linalg.norm(nn)
        a2 = vec(*A) - np.dot(vec(*A), nn) * nn; b2 = vec(*B) - np.dot(vec(*B), nn) * nn
        A, B = lonlat(a2), lonlat(b2)
    sal, a, e, n = escalones(A, B)
    buenos = recta_robusta([s for s, _ in sal], [t for _, t in sal]) if len(sal) >= 3 else list(range(len(sal)))
    fin = [sal[k][1] for k in buenos]
    ang = math.acos(float(np.clip(np.dot(vec(*A), vec(*B)), -1, 1)))
    puntos = [lonlat(math.cos(s_) * a + math.sin(s_) * e) for s_ in np.linspace(0, ang, 9)]
    return {'A': A, 'B': B, 'residuo_grados': round(float(np.sqrt(np.mean(np.square(fin)))) if fin else 9.0, 3),
            'tramos_usados': f'{len(buenos)}/{len(sal)}', 'escalones': [round(t, 2) for _, t in sal], 'puntos': puntos}

def cruce(l1, l2, cerca):
    """Intersección de dos círculos máximos (dados por A, B) más cercana a `cerca` (lon, lat)."""
    n1 = np.cross(vec(*l1['A']), vec(*l1['B'])); n2 = np.cross(vec(*l2['A']), vec(*l2['B']))
    d = np.cross(n1, n2); d /= np.linalg.norm(d)
    if np.dot(d, vec(*cerca)) < 0: d = -d
    return lonlat(d)

if __name__ == '__main__':
    foto = Foto(sys.argv[1]); bordes = json.load(open(sys.argv[2], encoding='utf-8')); ver = '--ver' in sys.argv
    out = {}
    for nombre, b in bordes.items():
        r = afinar(foto, b['A'], b['B'], b['adentro'], b.get('claro_adentro', True), ver=ver, nombre=nombre)
        if r is None: print(f'{nombre}: SIN ESCALÓN'); continue
        out[nombre] = r
        print(f'{nombre}: A {r["A"]} B {r["B"]} residuo {r["residuo_grados"]}° escalones {r["escalones"]}')
    json.dump(out, open(sys.argv[3], 'w', encoding='utf-8'), indent=1)
