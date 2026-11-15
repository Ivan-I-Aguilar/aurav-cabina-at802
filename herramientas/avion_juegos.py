# El AT-802 nuevo (exterior + cúpula + cabina) para los OTROS juegos de AURAV (señaleros, sector), 15/11.
# Plan: PLAN_AVION_JUEGOS.md (aprobado por Iván el 15/11: «sí, cabina y exterior»).
#
# Lee los GLB del simulador (marco cabina: +x derecha, +y arriba, −z adelante, ruedas en y −2, nivelado) y escribe
# juegos/at802.glb en el marco de esos juegos (el del at802.glb viejo): +x nariz, +y arriba, +z derecha, origen en el
# piso entre las ruedas principales, actitud de 3 puntos horneada. La hélice (palas, bandas, cono, plato y raíces de
# las palas, que en el exterior vienen pegados a la malla) va aparte en helice-eje → helice: helice-eje lleva la
# posición y la inclinación del eje, y helice queda limpia para que rotation.x gire justo sobre el eje (igual que el
# GLB viejo). Todo se junta por material en 4 grupos con colores por vértice (sin texturas): ~9 llamadas el avión
# entero. Anclajes como nodos vacíos y medidas en extras (userData del nodo at802). Corrige las luces de punta de ala
# (en el exterior venían al revés: verde a la izquierda). Después llama a Blender (avion_juegos_lod.py) para el LOD.
#
# Sin Blender para el GLB principal (numpy + Pillow, como cab_cortar_fsn.py):
#   python -E -P -X utf8 herramientas/avion_juegos.py [--librea azul|bordo] [--sin-lod]
import argparse, io, json, math, os, struct, subprocess, sys, datetime
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAL = os.path.join(RAIZ, 'juegos')
BLENDER = r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
EXTERIOR = ['exterior_cupula.glb', 'blender/cab_cupula.glb']                 # lo que se ve de afuera
CABINA = ['blender/cab_cascaron.glb', 'blender/cab_tablero.glb', 'blender/cab_llaves.glb', 'blender/cab_consola.glb',
          'blender/cab_radios.glb', 'blender/cab_asiento.glb', 'blender/pedales.glb', 'blender/butaca.glb']   # = PIEZAS de cabina_nueva.js
OJO = (0.0, 1.38, 1.64)          # main.js: OJO, la vista del piloto (marco cabina)
ASIENTO = (0.0, 0.60, 1.72)      # sobre el almohadón de la butaca (main.js: «~0,78 m sobre el asiento (0,60)»)
BORDO = (0.18, 0.0075, 0.026)    # la franja del at802.glb viejo (mediana de sus texturas: sRGB #76152d)
NAV_ROJA, NAV_VERDE = (0.75, 0.02, 0.02), (0.02, 0.55, 0.08)

# grupos de material de salida: un material por grupo (colores por vértice) → una llamada por grupo y nodo
GRUPOS = {
    'pintura': dict(metal=0.0, rugosidad=0.5),
    'mate': dict(metal=0.0, rugosidad=0.88),
    'metal': dict(metal=0.8, rugosidad=0.35),
    'vidrio': dict(metal=0.0, rugosidad=0.06, alfa=0.16),
    'brillo': dict(metal=0.0, rugosidad=0.15),          # sólo el LOD: vidrios opacos oscuros
}


# ---------------------------------------------------------------- leer GLB
CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def leer_glb(ruta):
    b = open(ruta, 'rb').read()
    assert struct.unpack_from('<I', b, 0)[0] == 0x46546C67, ruta + ': no es GLB'
    o, js, binc = 12, None, b''
    while o < len(b):
        cl, ct = struct.unpack_from('<II', b, o); o += 8
        if ct == 0x4E4F534A: js = json.loads(b[o:o + cl].decode('utf8'))
        elif ct == 0x004E4942: binc = b[o:o + cl]
        o += cl
    return js, binc


def accesor(js, binc, i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
    f, s = CT[a['componentType']]; n = NC[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); paso = bv.get('byteStride', 0) or s * n
    dt = np.dtype(f).newbyteorder('<')
    if paso == s * n: arr = np.frombuffer(binc, dtype=dt, count=a['count'] * n, offset=off).reshape(a['count'], n)
    else: arr = np.stack([np.frombuffer(binc, dtype=dt, count=n, offset=off + k * paso) for k in range(a['count'])])
    arr = arr.astype(np.float64)
    if a.get('normalized'): arr /= {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[a['componentType']]
    return arr


def mat_trs(t=(0, 0, 0), r=(0, 0, 0, 1), s=(1, 1, 1)):
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t
    return M


def pose_animada(js, binc, t):
    """Rotación/traslación de cada nodo animado en el tiempo t (LINEAR). Los pedales de Lichi tienen como pose de
    reposo el timón a fondo a la izquierda (t = 0); el neutro del juego es la mitad del clip."""
    pose = {}
    for an in js.get('animations', []):
        for ch in an['channels']:
            s = an['samplers'][ch['sampler']]; tt = accesor(js, binc, s['input']).ravel(); vv = accesor(js, binc, s['output'])
            k = int(np.clip(np.searchsorted(tt, t), 1, len(tt) - 1)); f = (t - tt[k - 1]) / max(1e-9, tt[k] - tt[k - 1])
            v = vv[k - 1] * (1 - f) + vv[k] * f
            if ch['target']['path'] == 'rotation': v = v / np.linalg.norm(v)
            pose.setdefault(ch['target']['node'], {})[ch['target']['path']] = v.tolist()
    return pose


def color_textura(js, binc, idx_tex):
    """Color medio (lineal) de una textura del GLB."""
    im = js['images'][js['textures'][idx_tex]['source']]; bv = js['bufferViews'][im['bufferView']]
    d = binc[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    a = np.asarray(Image.open(io.BytesIO(d)).convert('RGB'), dtype=np.float64) / 255
    a = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    return a.reshape(-1, 3).mean(0)


def srgb(h):
    c = np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255]) / 255
    return tuple(np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))


def piezas_de(rel):
    """Todas las primitivas de un GLB en el marco cabina: dict(pos, nor, tri, mat, nodo, color, metal, rugosidad, blend)."""
    ruta = os.path.join(RAIZ, rel); js, binc = leer_glb(ruta)
    pose = pose_animada(js, binc, 0.5) if js.get('animations') else {}
    mats = js.get('materials', []); out = []
    def rec(i, M):
        n = js['nodes'][i]
        if 'matrix' in n: Mn = np.array(n['matrix']).reshape(4, 4).T
        else:
            p = pose.get(i, {})
            Mn = mat_trs(p.get('translation', n.get('translation', (0, 0, 0))), p.get('rotation', n.get('rotation', (0, 0, 0, 1))), n.get('scale', (1, 1, 1)))
        Mi = M @ Mn
        if 'mesh' in n:
            N3 = np.linalg.inv(Mi[:3, :3]).T
            for pr in js['meshes'][n['mesh']]['primitives']:
                assert pr.get('mode', 4) == 4
                pos = accesor(js, binc, pr['attributes']['POSITION']); pos = pos @ Mi[:3, :3].T + Mi[:3, 3]
                tri = (accesor(js, binc, pr['indices']).astype(np.int64) if 'indices' in pr else np.arange(len(pos))).reshape(-1, 3)
                if 'NORMAL' in pr['attributes']:
                    nor = accesor(js, binc, pr['attributes']['NORMAL']) @ N3.T
                    nor /= np.maximum(np.linalg.norm(nor, axis=1, keepdims=True), 1e-12)
                else: nor = None
                m = mats[pr['material']] if 'material' in pr else {'name': '-'}
                pbr = m.get('pbrMetallicRoughness', {}); col = np.array(pbr.get('baseColorFactor', [1, 1, 1, 1]), dtype=float)
                if 'baseColorTexture' in pbr: col[:3] *= color_textura(js, binc, pbr['baseColorTexture']['index'])
                out.append(dict(pos=pos, nor=nor, tri=tri, mat=m.get('name', '-'), nodo=n.get('name', ''), archivo=rel,
                                color=col[:3].copy(), alfa=col[3], metal=pbr.get('metallicFactor', 1.0),
                                rugosidad=pbr.get('roughnessFactor', 1.0), blend=m.get('alphaMode') == 'BLEND'))
        for c in n.get('children', []): rec(c, Mi)
    for r in js['scenes'][js.get('scene', 0)]['nodes']: rec(r, np.eye(4))
    return out


def grupo_de(p):
    if p['blend']: return 'vidrio'
    if p['metal'] >= 0.6: return 'metal'
    if p['rugosidad'] >= 0.7: return 'mate'
    return 'pintura'


# ---------------------------------------------------------------- islas (vértices soldados por posición)
def islas(pos, tri):
    q = np.round(pos / 1e-4).astype(np.int64); _, inv = np.unique(q, axis=0, return_inverse=True)
    t = inv.ravel()[tri]; padre = np.arange(t.max() + 1)
    def raiz(a):
        while padre[a] != a: padre[a] = padre[padre[a]]; a = padre[a]
        return a
    for a, b, c in t:
        ra = raiz(a); padre[raiz(b)] = ra; padre[raiz(c)] = ra
    return np.array([raiz(x) for x in t[:, 0]])


def partir(p, sel):
    """Divide la pieza p en (p[sel], p[~sel]) por triángulos (los vértices se comparten; se compactan al escribir)."""
    a, b = dict(p), dict(p); a['tri'] = p['tri'][sel]; b['tri'] = p['tri'][~sel]
    return a, b


# ---------------------------------------------------------------- escribir GLB
class Escritor:
    def __init__(self): self.bin = bytearray(); self.js = {'asset': {'version': '2.0', 'generator': 'aurav-cabina-at802 herramientas/avion_juegos.py'},
                                                            'buffers': [], 'bufferViews': [], 'accessors': [], 'meshes': [], 'materials': [], 'nodes': [], 'scenes': [], 'scene': 0}
    def _vista(self, datos, objetivo):
        while len(self.bin) % 4: self.bin += b'\0'
        self.js['bufferViews'].append({'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(datos), 'target': objetivo})
        self.bin += datos; return len(self.js['bufferViews']) - 1
    def _acc(self, arr, tipo, comp, objetivo, normalizado=False, minmax=False):
        v = self._vista(arr.tobytes(), objetivo)
        a = {'bufferView': v, 'componentType': comp, 'count': int(arr.shape[0]), 'type': tipo}
        if normalizado: a['normalized'] = True
        if minmax: a['min'] = arr.min(0).astype(float).tolist(); a['max'] = arr.max(0).astype(float).tolist()
        self.js['accessors'].append(a); return len(self.js['accessors']) - 1
    def material(self, nombre):
        for i, m in enumerate(self.js['materials']):
            if m['name'] == nombre: return i
        g = GRUPOS[nombre]
        m = {'name': nombre, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, g.get('alfa', 1.0)], 'metallicFactor': g['metal'], 'roughnessFactor': g['rugosidad']}, 'doubleSided': True}
        if 'alfa' in g: m['alphaMode'] = 'BLEND'
        self.js['materials'].append(m); return len(self.js['materials']) - 1
    def malla(self, nombre, prims):
        """prims: {grupo: (pos (N,3), nor (N,3), col (N,3), tri (M,3))}"""
        ps = []
        for g, (pos, nor, col, tri) in prims.items():
            if len(tri) == 0: continue
            c8 = np.c_[np.clip(np.round(col * 255), 0, 255), np.full(len(col), 255)].astype(np.uint8)
            at = {'POSITION': self._acc(pos.astype(np.float32), 'VEC3', 5126, 34962, minmax=True),
                  'NORMAL': self._acc(nor.astype(np.float32), 'VEC3', 5126, 34962),
                  'COLOR_0': self._acc(c8, 'VEC4', 5121, 34962, normalizado=True)}
            ind = tri.astype(np.uint16 if len(pos) < 65536 else np.uint32).reshape(-1, 1)
            ps.append({'attributes': at, 'indices': self._acc(ind, 'SCALAR', 5123 if ind.dtype == np.uint16 else 5125, 34963), 'material': self.material(g), 'mode': 4})
        self.js['meshes'].append({'name': nombre, 'primitives': ps}); return len(self.js['meshes']) - 1
    def nodo(self, d):
        self.js['nodes'].append(d); return len(self.js['nodes']) - 1
    def guardar(self, ruta, raices):
        self.js['scenes'] = [{'nodes': raices}]
        while len(self.bin) % 4: self.bin += b'\0'
        self.js['buffers'] = [{'byteLength': len(self.bin)}]
        j = json.dumps(self.js, separators=(',', ':'), ensure_ascii=False).encode('utf8')
        j += b' ' * ((4 - len(j) % 4) % 4)
        with open(ruta, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(self.bin)))
            f.write(struct.pack('<II', len(j), 0x4E4F534A)); f.write(j)
            f.write(struct.pack('<II', len(self.bin), 0x004E4942)); f.write(bytes(self.bin))


def juntar(piezas, a_marco, a_marco_n):
    """Junta piezas por grupo: compacta vértices usados, aplica el marco, pone color por vértice (o por triángulo)."""
    por = {}
    for p in piezas:
        if len(p['tri']) == 0: continue
        usados, inv = np.unique(p['tri'], return_inverse=True); tri = inv.reshape(-1, 3)
        pos = a_marco(p['pos'][usados])
        if p['nor'] is None:   # sin normales: planas por triángulo
            pp = pos[tri]; n = np.cross(pp[:, 1] - pp[:, 0], pp[:, 2] - pp[:, 0]); n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
            pos = pp.reshape(-1, 3); nor = np.repeat(n, 3, axis=0); tri = np.arange(len(pos)).reshape(-1, 3)
            col = np.repeat(p['col_tri'], 3, axis=0) if 'col_tri' in p else np.tile(p['color'], (len(pos), 1))
        else:
            nor = a_marco_n(p['nor'][usados])
            if 'col_tri' in p:   # color por triángulo: vértices propios
                pos = pos[tri].reshape(-1, 3); nor = nor[tri].reshape(-1, 3); col = np.repeat(p['col_tri'], 3, axis=0); tri = np.arange(len(pos)).reshape(-1, 3)
            else: col = np.tile(p['color'], (len(pos), 1))
        g = p['grupo']; L = por.setdefault(g, [[], [], [], [], 0])
        L[0].append(pos); L[1].append(nor); L[2].append(col); L[3].append(tri + L[4]); L[4] += len(pos)
    return {g: (np.concatenate(L[0]), np.concatenate(L[1]), np.concatenate(L[2]), np.concatenate(L[3])) for g, L in por.items()}


def quat_de(a, b):
    """Cuaternión (x, y, z, w) que lleva el versor a al versor b."""
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); c = np.cross(a, b); d = float(a @ b)
    q = np.array([c[0], c[1], c[2], 1 + d]); return q / np.linalg.norm(q)


def rot_de_quat(q):
    return mat_trs(r=q)[:3, :3]


# ---------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--librea', choices=['azul', 'bordo'], default='azul')
    ap.add_argument('--sin-lod', action='store_true'); ap.add_argument('--nombre', default='at802', help='nombre de los archivos de salida (para probar variantes)'); arg = ap.parse_args()
    os.makedirs(SAL, exist_ok=True); inf = {'fecha': datetime.date.today().isoformat(), 'librea': arg.librea}

    ext = [p for f in EXTERIOR for p in piezas_de(f)]
    cab = [p for f in CABINA for p in piezas_de(f)]
    for p in ext + cab: p['grupo'] = grupo_de(p)

    # --- colores que hoy pone cabina_nueva.js en el juego (pedales gris metal; butaca malla roja, arnés negro)
    for p in cab:
        if p['archivo'].endswith('pedales.glb'): p['color'] = np.array(srgb(0x3b3c40)); p['grupo'] = 'pintura'
        if p['archivo'].endswith('butaca.glb'):
            n = p['mat'].lower()
            if 'correa' in n: p['color'] = np.array(srgb(0x141414))
            elif 'metal' in n: p['color'] = np.array(srgb(0x9a9c9f))
            else: p['color'] = np.array(srgb(0xa3221d)); p['grupo'] = 'mate'
    if arg.librea == 'bordo':
        for p in ext:
            if p['mat'] == 'azul_librea': p['color'] = np.array(BORDO)

    # --- actitud de 3 puntos (marco cabina): las cubiertas son círculos (centro = medio de su caja, radio = media altura);
    # el piso es la tangente de abajo común a la rueda principal y a la de cola: n·(c_cola − c_ppal) = r_cola − r_ppal,
    # con n = (0, cos α, sin α) la normal del piso. La nariz se levanta θ = −α y cada rueda apoya en c − r·n.
    g = np.concatenate([p['pos'][np.unique(p['tri'])] for p in ext if p['mat'] == 'goma'])
    def rueda(v):
        lo_, hi_ = v.min(0), v.max(0); return (lo_ + hi_) / 2, (hi_[1] - lo_[1]) / 2
    (ci, ri_), (cd, rd_), (cc, rc_) = rueda(g[(g[:, 2] < 3) & (g[:, 0] < 0)]), rueda(g[(g[:, 2] < 3) & (g[:, 0] > 0)]), rueda(g[g[:, 2] > 5])
    cp, rp = (ci + cd) / 2, (ri_ + rd_) / 2
    Ay, Bz, D = cc[1] - cp[1], cc[2] - cp[2], rc_ - rp
    alfa = math.atan2(Bz, Ay) - math.acos(D / math.hypot(Ay, Bz))
    n_piso = np.array([0.0, math.cos(alfa), math.sin(alfa)])
    ri, rd, rc = ci - ri_ * n_piso, cd - rd_ * n_piso, cc - rc_ * n_piso
    C = (ri + rd) / 2
    th = -alfa; c, s = math.cos(th), math.sin(th)
    def a_juego_n(v):   # Rx(θ) (nariz arriba) y Ry(−90°): x' = −z, y' = y, z' = x
        y = v[:, 1] * c - v[:, 2] * s; z = v[:, 1] * s + v[:, 2] * c
        return np.stack([-z, y, v[:, 0]], 1)
    def a_juego(v): return a_juego_n(np.asarray(v, dtype=float).reshape(-1, 3) - C)
    inf['marco'] = {'contacto_principal_cabina': C.round(4).tolist(), 'rueda_cola_cabina': rc.round(4).tolist(), 'actitud_grados': round(math.degrees(th), 3),
                    'formula': 'p_juego = Ry(-90°)·Rx(actitud)·(p_cabina − contacto_principal)'}

    # --- hélice: palas, bandas, cono (mat08), plato (mat10) y raíces de las palas (mat02 delante del capó)
    exterior, prop = [], []
    for p in ext:
        if p['nodo'] != 'exterior': exterior.append(p); continue
        if p['mat'] in ('pala', 'banda_pala'): prop.append(p); continue
        reglas = {'mat08': (-3.20, 0.30), 'mat10': (-3.25, 0.26), 'mat02': (-3.30, 0.60)}   # (z máx de la isla, radio máx)
        if p['mat'] not in reglas: exterior.append(p); continue
        zmax, rmax = reglas[p['mat']]
        r = islas(p['pos'], p['tri']); sel = np.zeros(len(p['tri']), bool)
        for k in np.unique(r):
            v = p['pos'][np.unique(p['tri'][r == k])]
            if v[:, 2].max() < zmax and np.hypot(v[:, 0], v[:, 1] - 0.23).max() < rmax: sel |= r == k
        a, b = partir(p, sel); prop.append(a); exterior.append(b)
        inf.setdefault('helice_partes', {})[p['mat']] = int(sel.sum())
    for p in prop: p['grupo'] = 'pintura'
    # eje de la hélice: un círculo por aro del cono (ajuste algebraico); sólo los aros limpios (los de atrás tienen el
    # plato y los cortes de las palas mezclados) y una recta por sus centros
    cono = next(p for p in prop if p['mat'] == 'mat08'); vcono = cono['pos'][np.unique(cono['tri'])]
    def circulo(xy):
        M = np.c_[xy, np.ones(len(xy))]; bb = -(xy ** 2).sum(1)
        Dd, Ee, Ff = np.linalg.lstsq(M, bb, rcond=None)[0]; cc_ = np.array([-Dd / 2, -Ee / 2]); rr = math.sqrt(max(0.0, cc_ @ cc_ - Ff))
        return cc_, rr, float(np.abs(np.hypot(*(xy - cc_).T) - rr).max())
    zr = np.round(vcono[:, 2], 3); centros = []
    for z in np.unique(zr):
        a = vcono[zr == z]
        if len(a) < 12: continue
        cc_, rr, res = circulo(a[:, :2])
        if rr > 0.015 and res < 0.003: centros.append([cc_[0], cc_[1], z])
    centros = np.array(centros); A = np.c_[centros[:, 2], np.ones(len(centros))]
    kx, ky = np.linalg.lstsq(A, centros[:, 0], rcond=None)[0], np.linalg.lstsq(A, centros[:, 1], rcond=None)[0]
    eje = np.array([-kx[0], -ky[0], -1.0]); eje /= np.linalg.norm(eje)              # hacia adelante (−z)
    palas = np.concatenate([p['pos'][np.unique(p['tri'])] for p in prop if p['mat'] == 'pala'])
    zc = palas[:, 2].mean(); cubo = np.array([kx[0] * zc + kx[1], ky[0] * zc + ky[1], zc])
    rel = palas - cubo; radio = float(np.linalg.norm(rel - np.outer(rel @ eje, eje), axis=1).max())
    eje_j = a_juego_n(eje[None])[0]; cubo_j = a_juego(cubo)[0]; q = quat_de(np.array([1.0, 0, 0]), eje_j); Rq = rot_de_quat(q)
    inf['helice'] = {'cubo_cabina': cubo.round(4).tolist(), 'eje_cabina': eje.round(5).tolist(), 'inclinacion_eje_cabina_grados': round(math.degrees(math.acos(min(1, -eje[2]))), 3),
                     'cubo_juego': cubo_j.round(4).tolist(), 'eje_juego': eje_j.round(5).tolist(), 'radio': round(radio, 3),
                     'excentricidad_aros_cono_mm': round(float(np.hypot(centros[:, 0] - (kx[0] * centros[:, 2] + kx[1]), centros[:, 1] - (ky[0] * centros[:, 2] + ky[1])).max() * 1000), 2)}
    def a_helice(vc): return (a_juego(vc) - cubo_j) @ Rq           # marco local de 'helice' (x = eje)
    def a_helice_n(n): return a_juego_n(n) @ Rq

    # --- luces de punta de ala: roja a la izquierda (x < 0), verde a la derecha; el faro de la panza sigue rojo
    for p in exterior:
        if p['mat'] in ('mat23', 'mat24'):
            cx = p['pos'][p['tri']].mean(1)[:, 0]
            p['col_tri'] = np.where(cx[:, None] < -8, NAV_ROJA, np.where(cx[:, None] > 8, NAV_VERDE, p['color']))

    # --- anclajes (marco cabina → juego)
    boca = next(p for p in ext if p['nodo'] == 'carga_boca'); tubo = next(p for p in ext if p['nodo'] == 'carga_tubo')
    vb = boca['pos'][np.unique(boca['tri'])]; cb = vb.mean(0); d = cb - tubo['pos'][np.unique(tubo['tri'])].mean(0); d /= np.linalg.norm(d)
    boca_pt = cb + d * ((vb - cb) @ d).max()
    def nav(x_signo):
        v = np.concatenate([p['pos'][np.unique(p['tri'])] for p in ext if p['mat'] in ('mat23', 'mat24')]); v = v[v[:, 0] * x_signo > 8]; return v.mean(0)
    punta = cono['pos'][np.unique(cono['tri'])]; punta = punta[punta[:, 2].argmin()]
    anclas = {'acople-carga': boca_pt, 'acople-carga-derecho': boca_pt,   # una sola válvula, la real (centro-izquierda): ver PLAN §4, pregunta 3
              'cabina-piloto': np.array(ASIENTO), 'ojo-piloto': np.array(OJO), 'nariz': punta,
              'rueda-izq': ri, 'rueda-der': rd, 'rueda-cola': rc, 'puntera-izq': nav(-1), 'puntera-der': nav(1)}
    anclas_j = {k: a_juego(v)[0] for k, v in anclas.items()}

    # --- mallas
    W = Escritor()
    m_ext = W.malla('exterior', juntar(exterior, a_juego, a_juego_n))
    m_cab = W.malla('cabina', juntar(cab, a_juego, a_juego_n))
    m_hel = W.malla('helice', juntar(prop, a_helice, a_helice_n))
    hijos = [W.nodo({'name': 'exterior', 'mesh': m_ext}), W.nodo({'name': 'cabina', 'mesh': m_cab})]
    n_hel = W.nodo({'name': 'helice', 'mesh': m_hel})
    hijos.append(W.nodo({'name': 'helice-eje', 'translation': cubo_j.tolist(), 'rotation': q.tolist(), 'children': [n_hel]}))
    for k, v in anclas_j.items(): hijos.append(W.nodo({'name': k, 'translation': [round(float(x), 4) for x in v]}))

    # --- medidas (marco juego) y chequeos
    todo = np.concatenate([a_juego(p['pos'][np.unique(p['tri'])]) for p in exterior] + [a_helice(p['pos'][np.unique(p['tri'])]) @ Rq.T + cubo_j for p in prop])
    lo, hi = todo.min(0), todo.max(0)
    med = {'envergadura': round(float(hi[2] - lo[2]), 3), 'largo': round(float(hi[0] - lo[0]), 3), 'alto': round(float(hi[1] - lo[1]), 3),
           'nariz_x': round(float(anclas_j['nariz'][0]), 3), 'cola_x': round(float(lo[0]), 3), 'trocha': round(float(anclas_j['rueda-der'][2] - anclas_j['rueda-izq'][2]), 3),
           'radio_helice': round(radio, 3), 'actitud_grados': round(math.degrees(th), 3)}
    gj = a_juego(g)   # las cubiertas en el marco del juego: cada una toca el piso (y = 0) sin hundirse
    chequeos = {
        'ruedas_apoyan (y min de cada cubierta, mm)': [round(float(gj[s_, 1].min()) * 1000, 2) for s_ in ((g[:, 2] < 3) & (g[:, 0] < 0), (g[:, 2] < 3) & (g[:, 0] > 0), g[:, 2] > 5)],
        'nada_bajo_el_piso (y min, mm)': round(float(lo[1]) * 1000, 2),
    }
    # el cono gira sin cabecear: en el marco de 'helice' los centros de los aros limpios caen sobre el eje x
    cl = a_helice(centros[:, :3])
    chequeos['cono_centrado_en_el_eje (mm)'] = round(float(np.hypot(cl[:, 1], cl[:, 2]).max()) * 1000, 3)
    W.js['nodes'].append({'name': 'at802', 'children': hijos, 'extras': {'origen': 'aurav-cabina-at802', 'version': inf['fecha'], 'librea': arg.librea,
                          'actitud': round(th, 5), 'radioHelice': round(radio, 3), 'medidas': med}})
    raiz = len(W.js['nodes']) - 1
    ruta = os.path.join(SAL, arg.nombre + '.glb'); W.guardar(ruta, [raiz])

    def cuenta(nombre):
        m = next(x for x in W.js['meshes'] if x['name'] == nombre)
        return {'llamadas': len(m['primitives']), 'triangulos': int(sum(W.js['accessors'][p['indices']]['count'] for p in m['primitives']) // 3)}
    inf.update({'medidas': med, 'anclajes': {k: [round(float(x), 4) for x in v] for k, v in anclas_j.items()}, 'chequeos': chequeos,
                'at802.glb': {'MB': round(os.path.getsize(ruta) / 1e6, 3), 'exterior': cuenta('exterior'), 'cabina': cuenta('cabina'), 'helice': cuenta('helice')}})
    print(json.dumps(inf, indent=1, ensure_ascii=False))
    ok = all(-3 < x < 3 for x in chequeos['ruedas_apoyan (y min de cada cubierta, mm)']) and chequeos['nada_bajo_el_piso (y min, mm)'] > -3 and chequeos['cono_centrado_en_el_eje (mm)'] < 1
    print('CHEQUEOS', 'OK' if ok else 'FALLAN')

    # --- LOD (Blender): exterior y hélice sin cabina, simplificados; vidrios opacos oscuros
    if not arg.sin_lod:
        Wl = Escritor()
        vid = [dict(p, grupo='brillo', color=np.array([0.03, 0.045, 0.055])) if p['grupo'] == 'vidrio' else p for p in exterior]
        ml_e = Wl.malla('exterior', juntar(vid, a_juego, a_juego_n)); ml_h = Wl.malla('helice', juntar(prop, a_helice, a_helice_n))
        nh = Wl.nodo({'name': 'helice', 'mesh': ml_h}); ne = Wl.nodo({'name': 'exterior', 'mesh': ml_e})
        tmp_in, tmp_out = os.path.join(SAL, '_lod_entrada.glb'), os.path.join(SAL, '_lod_salida.glb')
        Wl.guardar(tmp_in, [ne, nh])
        r = subprocess.run([BLENDER, '-b', '--factory-startup', '--python', os.path.join(RAIZ, 'herramientas', 'avion_juegos_lod.py'), '--', tmp_in, tmp_out],
                           capture_output=True, text=True, encoding='utf8', errors='replace')
        print('\n'.join(l for l in r.stdout.splitlines() if l.startswith('LOD')))
        if r.returncode or not os.path.exists(tmp_out): print(r.stdout[-3000:], r.stderr[-3000:]); sys.exit('el LOD falló')
        lod_glb(tmp_out, os.path.join(SAL, arg.nombre + '-lod.glb'), cubo_j, q, anclas_j, inf, arg.librea, th, radio, med)
        os.remove(tmp_in); os.remove(tmp_out)
    json.dump(inf, open(os.path.join(SAL, arg.nombre + '_informe.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)


def lod_glb(entrada, salida, cubo_j, q, anclas_j, inf, librea, th, radio, med):
    """Rearma el LOD que devolvió Blender con los mismos materiales, nodos y anclajes que el principal."""
    js, binc = leer_glb(entrada); W = Escritor(); mallas = {}
    for n in js['nodes']:
        if 'mesh' not in n: continue
        prims = {}
        for pr in js['meshes'][n['mesh']]['primitives']:
            g = js['materials'][pr['material']]['name']
            pos = accesor(js, binc, pr['attributes']['POSITION']); nor = accesor(js, binc, pr['attributes']['NORMAL'])
            col = accesor(js, binc, pr['attributes']['COLOR_0'])[:, :3]; tri = accesor(js, binc, pr['indices']).astype(np.int64).reshape(-1, 3)
            if g in prims:
                P = prims[g]; prims[g] = (np.r_[P[0], pos], np.r_[P[1], nor], np.r_[P[2], col], np.r_[P[3], tri + len(P[0])])
            else: prims[g] = (pos, nor, col, tri)
        mallas[n['name']] = W.malla(n['name'], prims)
    nh = W.nodo({'name': 'helice', 'mesh': mallas['helice']})
    hijos = [W.nodo({'name': 'exterior', 'mesh': mallas['exterior']}), W.nodo({'name': 'helice-eje', 'translation': cubo_j.tolist(), 'rotation': q.tolist(), 'children': [nh]})]
    for k, v in anclas_j.items(): hijos.append(W.nodo({'name': k, 'translation': [round(float(x), 4) for x in v]}))
    W.js['nodes'].append({'name': 'at802', 'children': hijos, 'extras': {'origen': 'aurav-cabina-at802', 'lod': True, 'version': inf['fecha'], 'librea': librea,
                          'actitud': round(th, 5), 'radioHelice': round(radio, 3), 'medidas': med}})
    W.guardar(salida, [len(W.js['nodes']) - 1])
    tri = {m['name']: int(sum(W.js['accessors'][p['indices']]['count'] for p in m['primitives']) // 3) for m in W.js['meshes']}
    inf['at802-lod.glb'] = {'MB': round(os.path.getsize(salida) / 1e6, 3), 'triangulos': tri, 'llamadas': sum(len(m['primitives']) for m in W.js['meshes'])}
    print('LOD', json.dumps(inf['at802-lod.glb'], ensure_ascii=False))


if __name__ == '__main__':
    main()
