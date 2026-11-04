# Cabina nueva del AT-802 · lo común a todos los scripts cab_*.py (PLAN_CABINA_NUEVA.md §4 y §6, etapa 0).
# Conversiones, prismas, materiales con los colores reales, el casco medido con rayos contra exterior.glb,
# controles con sus propiedades, exportación, vistas de prueba y los chequeos automáticos.
# Todo en el MARCO DE LA CABINA (= glTF de exterior.glb): +x derecha del piloto, +y arriba, −z adelante.
# En Blender: b(v) = (x, −z, y).
#
# Desde otro script de Blender:
#   import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import cab_comun as cc
# Corrido directo mide el casco (blender/casco_medido.json) y prueba el chequeador con piezas de prueba:
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/cab_comun.py
import bpy, bmesh, json, math, os, sys, time
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTERIOR = os.path.join(RAIZ, 'exterior.glb')
SALIDA = os.path.join(RAIZ, 'blender')
OJO = Vector((0.0, 1.38, 1.64))
HOMBROS = (Vector((-0.20, 1.12, 1.70)), Vector((0.20, 1.12, 1.70)))   # PROVISORIO: 26 cm bajo el ojo y ±20 cm (se mide en la etapa 4)
VIDRIO = 'mat22'                                                       # material de los vidrios de la cúpula en exterior.glb
HOLGURA = 0.015                                                        # todo lo que sigue al casco va 1,5 cm hacia adentro


def b(v): return Vector((v[0], -v[2], v[1]))          # cabina → Blender
def cab(v): return Vector((v[0], v[2], -v[1]))         # Blender → cabina
def z_parabrisas(y): return 0.74 + 0.93 * (y - 1.02)   # plano del parabrisas (medido el 1/11)


# ---------------- materiales (colores de la cabina real; PROVISORIOS hasta medirlos en la 360) ----------------
def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)

COLORES = {   # nombre: (color sRGB, rugosidad, metal)
    'tablero': ('#16171a', 0.75, 0.0),          # negro mate del tablero y los paneles
    'piso': ('#5b5d5f', 0.85, 0.0),
    'pared': ('#4d5054', 0.80, 0.0),
    'jaula': ('#6e7175', 0.55, 0.2),            # caños grises a la vista
    'antideslizante': ('#1c1c1d', 0.95, 0.0),
    'tolva': ('#c7ae5a', 0.70, 0.0),            # amarillo cromato de la pared de la tolva
    'malla_roja': ('#a3221d', 0.85, 0.0),       # asiento
    'arnes': ('#141414', 0.80, 0.0),
    'plata': ('#c4c5c8', 0.35, 0.8),            # manija POWER
    'azul_prop': ('#1d4fa6', 0.45, 0.0),
    'rojo': ('#bf1a16', 0.45, 0.0),             # CONDITION, FUEL, SALVO
    'naranja': ('#e0661b', 0.50, 0.0),          # E-DUMP
    'cromo': ('#d6d7da', 0.18, 1.0),            # bastón
    'goma': ('#0e0e0f', 0.90, 0.0),
    'prueba': ('#ff00ff', 0.50, 0.0),
}

def material(nombre):
    m = bpy.data.materials.get('cab_' + nombre)
    if m: return m
    col, rug, met = COLORES[nombre]
    m = bpy.data.materials.new('cab_' + nombre); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = srgb(col); p.inputs['Roughness'].default_value = rug; p.inputs['Metallic'].default_value = met
    m.diffuse_color = srgb(col)
    return m


# ---------------- geometría por vértices (sin rotaciones euler: regla del plan) ----------------
def coleccion(nombre):
    c = bpy.data.collections.get(nombre)
    if not c: c = bpy.data.collections.new(nombre); bpy.context.scene.collection.children.link(c)
    return c

def malla(nombre, verts, caras, mat=None, col=None, cerrada=False):
    """Malla con los vértices horneados (transform identidad), dados en marco cabina."""
    me = bpy.data.meshes.new(nombre); me.from_pydata([tuple(b(v)) for v in verts], [], caras); me.update()
    if cerrada:   # sólo en sólidos NUESTROS y cerrados (en el casco FSN nunca se recalculan normales)
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nombre, me); (col or coleccion('cabina')).objects.link(o)
    if mat: o.data.materials.append(material(mat) if isinstance(mat, str) else mat)
    return o

def prisma(nombre, base, altura, mat=None, col=None):
    """Prisma recto: base = polígono en orden (puntos cabina) y altura = vector de extrusión."""
    n = len(base); h = Vector(altura)
    verts = [Vector(p) for p in base] + [Vector(p) + h for p in base]
    caras = [tuple(range(n)), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    return malla(nombre, verts, caras, mat, col, cerrada=True)

def caja(nombre, x0, x1, y0, y1, z0, z1, mat=None, col=None):
    return prisma(nombre, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, y1 - y0, 0), mat, col)

def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

def verts_cab(o):
    mw = o.matrix_world
    return [cab(mw @ v.co) for v in o.data.vertices]


# ---------------- el casco FSN medido con rayos ----------------
class Casco:
    """exterior.glb en marco cabina, con dos árboles BVH: chapa (opaca) y todo (chapa + vidrio)."""

    def __init__(self, importar=True, mostrar=True):
        if importar:
            antes = set(bpy.data.objects)
            bpy.ops.import_scene.gltf(filepath=EXTERIOR)
            self.objetos = [o for o in bpy.data.objects if o not in antes]
            ref = coleccion('referencia')
            for o in self.objetos:
                for c in list(o.users_collection): c.objects.unlink(o)
                ref.objects.link(o); o.hide_render = not mostrar; o.hide_set(not mostrar)
        verts, chapa, vidrio = [], [], []
        for o in self.objetos:
            if o.type != 'MESH': continue
            mw = o.matrix_world; base = len(verts)
            verts += [tuple(cab(mw @ v.co)) for v in o.data.vertices]
            nombres = [s.material.name if s.material else '' for s in o.material_slots]
            for p in o.data.polygons:
                es_v = p.material_index < len(nombres) and nombres[p.material_index] == VIDRIO
                (vidrio if es_v else chapa).append(tuple(base + i for i in p.vertices))
        self.verts = verts
        self.bvh = BVHTree.FromPolygons(verts, chapa)
        self.bvh_todo = BVHTree.FromPolygons(verts, chapa + vidrio)
        self.n_chapa, self.n_vidrio = len(chapa), len(vidrio)
        self.vidrio_desde = len(chapa)   # en bvh_todo, los índices ≥ éste son vidrio

    def rayo(self, o, d, dist=3.0, vidrio=False, saltar=0.0):
        """Primer impacto (punto, normal, distancia, es_vidrio) o None. saltar: ignora lo que esté a
        menos de esa distancia del origen (chapas-isla sueltas del FSN que caen hacia adentro)."""
        o = Vector(o); d = Vector(d).normalized(); arbol = self.bvh_todo if vidrio else self.bvh
        avance = 0.0
        while avance < dist:
            p, n, i, t = arbol.ray_cast(o + d * avance, d, dist - avance)
            if p is None: return None
            if avance + t >= saltar:
                return p, n, avance + t, bool(vidrio and i >= self.vidrio_desde)
            avance += t + 1e-4
        return None

    def cerca(self, p, dist=0.05, vidrio=False):
        """Punto más cercano del casco a p (punto, distancia) o None."""
        q, n, i, t = (self.bvh_todo if vidrio else self.bvh).find_nearest(Vector(p), dist)
        return None if q is None else (q, t)


def medir_casco(casco, ruta=None, z0=0.50, z1=2.50, y0=0.15, y1=1.95, paso=0.025):
    """El casco por dentro cada 2,5 cm a lo largo: x de la pared a cada altura (izq./der.), si lo que se ve
    es vidrio (vano), techo, piso y antepechos. Rayos desde el eje (x = 0) hacia afuera."""
    nz = int(round((z1 - z0) / paso)) + 1; ny = int(round((y1 - y0) / paso)) + 1
    zs = [round(z0 + k * paso, 4) for k in range(nz)]; ys = [round(y0 + k * paso, 4) for k in range(ny)]
    res = {'marco': 'cabina: +x derecha del piloto, +y arriba, -z adelante (metros)', 'paso': paso, 'z': zs, 'y': ys,
           'izq': [], 'der': [], 'vidrio_izq': [], 'vidrio_der': [], 'techo': [], 'piso': [],
           'antepecho_izq': [], 'antepecho_der': [], 'parabrisas': 'z = 0,74 + 0,93·(y − 1,02)',
           'nota': 'x de la chapa (o del vidrio) vista desde el eje; null = el rayo no pegó en 1,2 m. Holgura de las piezas: 1,5 cm hacia adentro.'}
    for z in zs:
        for lado, clave in ((-1, 'izq'), (1, 'der')):
            xs, vs = [], []
            for y in ys:
                h = casco.rayo((0, y, z), (lado, 0, 0), 1.2, vidrio=True, saltar=0.30)
                xs.append(None if h is None else round(h[0].x, 4)); vs.append(None if h is None else int(h[3]))
            res[clave].append(xs); res['vidrio_' + clave].append(vs)
            # antepecho: la altura más baja (sobre 0,6) desde la que el rayo sale por vidrio de corrido
            ante = None
            for k, y in enumerate(ys):
                if y < 0.6 or vs[k] != 1: continue
                if all(v == 1 for v in vs[k:k + 4]): ante = y; break
            res['antepecho_' + clave].append(ante)
        h = casco.rayo((0, 1.30, z), (0, 1, 0), 1.0, vidrio=True); res['techo'].append(None if h is None else round(h[0].y, 4))
        h = casco.rayo((0, 0.80, z), (0, -1, 0), 1.2, saltar=0.05); res['piso'].append(None if h is None else round(h[0].y, 4))
    if ruta:
        with open(ruta, 'w', encoding='utf-8') as f: json.dump(res, f, ensure_ascii=False)
    return res


# ---------------- panoramas: rayos por píxel contra el casco (calcado de las fotos 360) ----------------
class Panorama:
    """Para cada dirección (píxel de un panorama equirectangular o de una vista plana) qué toca primero
    el rayo en exterior.glb: clase 0 nada · 1 chapa · 2 vidrio, y a qué distancia. `zona` = caja
    (min, max) en marco cabina para quedarse sólo con las caras de la cabina (los rayos que escapan
    hacia la cola o el capó cuentan como «nada»); None = el avión entero (fotos de afuera)."""

    def __init__(self, casco, zona=((-1.3, -0.4, -0.6), (1.3, 2.6, 3.6))):
        import numpy as np
        verts = np.array(casco.verts); caras, clase = [], []; base = 0
        for o in casco.objetos:
            if o.type != 'MESH': continue
            nombres = [s.material.name if s.material else '' for s in o.material_slots]
            for p in o.data.polygons:
                vs = [base + i for i in p.vertices]
                if zona is not None:
                    c = verts[vs].mean(0)
                    if not all(zona[0][k] < c[k] < zona[1][k] for k in range(3)): continue
                caras.append(tuple(vs)); clase.append(2 if nombres[p.material_index] == VIDRIO else 1)
            base += len(o.data.vertices)
        self.clase = np.array(clase, np.uint8); self.n = len(caras)
        self.arbol = BVHTree.FromPolygons([tuple(v) for v in verts], caras)

    def lanzar(self, origen, dirs, dist=4.0, saltar=0.20):
        """saltar: se ignoran impactos a menos de esa distancia (chapas-isla del FSN que caen hacia adentro)."""
        import numpy as np
        cl = np.zeros(len(dirs), np.uint8); di = np.zeros(len(dirs), np.float32)
        o = Vector(origen); rc = self.arbol.ray_cast; clase = self.clase
        for k, d in enumerate(dirs):
            dv = Vector(d); avance = 0.0
            while True:
                p, n, i, t = rc(o + dv * avance, dv, dist - avance)
                if p is None: break
                if avance + t >= saltar: cl[k] = clase[i]; di[k] = avance + t; break
                avance += t + 1e-4
                if avance >= dist: break
        return cl, di

    @staticmethod
    def direcciones(W, H):
        """Panorama equirectangular W×H en el marco de la cámara: columna central = adelante (−z),
        derecha = +x, arriba = +y (igual que vista360.py)."""
        import numpy as np
        u = (np.arange(W) + 0.5) / W; v = (np.arange(H) + 0.5) / H
        LON, LAT = np.meshgrid((u - 0.5) * 2 * np.pi, (0.5 - v) * np.pi)
        return np.stack([np.sin(LON) * np.cos(LAT), np.sin(LAT), -np.cos(LON) * np.cos(LAT)], -1).reshape(-1, 3)

    @staticmethod
    def rotacion(yaw, pitch, roll):
        """Cámara → cabina: d_cabina = Rx(pitch) · Rz(roll) · Ry(yaw) · d_cámara. El yaw va PRIMERO (es el
        desplazamiento de columnas del panorama con que se busca); yaw positivo = la cámara gira a la
        IZQUIERDA (su frente queda en la longitud −yaw de la cabina); pitch positivo = mira arriba."""
        return Matrix.Rotation(pitch, 3, 'X') @ Matrix.Rotation(roll, 3, 'Z') @ Matrix.Rotation(yaw, 3, 'Y')

    @staticmethod
    def a_cabina(dirs_cam, R):
        import numpy as np
        return dirs_cam @ np.array(R).T


# ---------------- controles: viajan con sus datos (extras → userData en controles.js) ----------------
def control(o, piv, eje='x', ang=None, pos=None, inicial=None, perilla=None, tres=False, momentaneo=False,
            punta=None, pivY=None, escala=None, suave=False):
    """Propiedades que controles.js lee de userData. Pivote y punta en marco cabina. Los controles se
    llaman sw… (llaves, perillas) o lev… (palancas) y llevan la geometría horneada (transform identidad)."""
    assert o.name.startswith(('sw', 'lev')), f'{o.name}: los controles se llaman sw… o lev…'
    o['piv'] = [float(v) for v in piv]; o['eje'] = eje
    if ang is not None: o['ang'] = [float(a) for a in ang]
    if pos is not None: o['pos'] = [float(a) for a in pos]
    if inicial is not None: o['inicial'] = int(inicial)
    if perilla is not None: o['perilla'] = float(perilla)
    if pivY is not None: o['pivY'] = float(pivY)
    if escala is not None: o['escala'] = float(escala)
    if tres: o['tres'] = True
    if momentaneo: o['momentaneo'] = True
    if suave: o['suave'] = True
    o['punta'] = [float(v) for v in (punta if punta is not None else centro(o))]
    return o

def centro(o):
    vs = verts_cab(o)
    return Vector([(min(v[i] for v in vs) + max(v[i] for v in vs)) / 2 for i in range(3)])


# ---------------- exportación y vistas ----------------
def exportar(objs, ruta):
    """GLB con transformaciones aplicadas (controles.armar supone vértices en coordenadas de cabina) y con
    export_extras (viene APAGADO en el exportador: sin eso las propiedades no llegan al juego)."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(filepath=ruta, export_format='GLB', use_selection=True, export_yup=True,
                              export_extras=True, export_apply=True, export_materials='EXPORT')
    return os.path.getsize(ruta)

def vista(ruta, desde, hacia, lente=16, res=(1280, 800), fondo=(0.55, 0.60, 0.66)):
    """Render de prueba con Eevee desde un punto de la cabina mirando a otro (marco cabina)."""
    esc = bpy.context.scene
    cam = esc.camera
    if cam is None:
        cam = bpy.data.objects.new('cam_vista', bpy.data.cameras.new('cam_vista')); esc.collection.objects.link(cam); esc.camera = cam
        for nombre, energia, rot in (('sol', 3.0, (0.6, 0.2, 2.4)), ('relleno', 1.2, (2.2, -0.3, -0.9))):
            luz = bpy.data.objects.new(nombre, bpy.data.lights.new(nombre, 'SUN')); esc.collection.objects.link(luz)
            luz.data.energy = energia; luz.rotation_euler = rot
        esc.world = bpy.data.worlds.new('fondo'); esc.world.color = fondo
        esc.render.engine = 'BLENDER_EEVEE'
    esc.render.resolution_x, esc.render.resolution_y = res
    cam.data.lens = lente; cam.data.clip_start = 0.01
    cam.location = b(desde); cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = (b(hacia) - b(desde)).to_track_quat('-Z', 'Y')
    esc.render.filepath = ruta; bpy.ops.render.render(write_still=True)
    return ruta


# ---------------- chequeos automáticos (§6), antes de mirar ----------------
def _bvh_de(o):
    return BVHTree.FromPolygons([tuple(v) for v in verts_cab(o)], [tuple(p.vertices) for p in o.data.polygons])

def chequear(piezas, casco, glbs=(), tri_max=60000, llamadas_max=40, mb_max=3.0, informe=None):
    """Corre los 6 chequeos sobre las piezas (objetos de Blender). Devuelve {chequeo: (ok, detalle)}.
    1 nada afuera · 2 nada delante del parabrisas · 3 nada flotando · 4 nada superpuesto en el mismo
    plano · 5 alcance de los controles · 6 presupuesto (triángulos, llamadas de dibujo, MB)."""
    r = {}
    vs = {o.name: verts_cab(o) for o in piezas}
    # 1. un rayo desde el eje de la cabina (a la altura del vértice y a media altura) hasta cada vértice:
    #    si cruza la chapa o el vidrio antes de llegar, ese vértice está afuera
    malos = {}
    for o in piezas:
        n = 0
        for v in vs[o.name]:
            zc = min(max(v.z, 0.62), 2.30)
            for org in (Vector((0, v.y, zc)), Vector((0, 0.95, zc))):
                d = v - org; L = d.length
                if L < 1e-4: continue
                if casco.bvh_todo.ray_cast(org, d / L, L - 1e-4)[0] is not None: n += 1; break
        if n: malos[o.name] = n
    r['1 nada afuera'] = (not malos, malos or 'cero vértices afuera')
    # 2. nada delante del parabrisas (1,5 cm de margen)
    malos = {o.name: sum(1 for v in vs[o.name] if v.y > 1.04 and v.z < z_parabrisas(v.y) - HOLGURA) for o in piezas}
    malos = {k: n for k, n in malos.items() if n}
    r['2 nada delante del parabrisas'] = (not malos, malos or 'cero vértices delante del vidrio')
    # 3. nada flotando: cada pieza toca otra (se cruzan o quedan a menos de 3 mm), o sigue al casco
    #    (lo cruza o queda a menos de 2 cm: la holgura es 1,5 cm)
    arboles = {o.name: _bvh_de(o) for o in piezas}
    def dist_min(verts, arbol, tope):
        m = 9.0
        for v in verts:
            q = arbol.find_nearest(v, tope)
            if q[0] is not None and q[3] < m:
                m = q[3]
                if m <= 1e-4: break
        return m
    toca = {o.name: set() for o in piezas}
    for i, a in enumerate(piezas):
        for c in piezas[i + 1:]:
            if (arboles[a.name].overlap(arboles[c.name]) or dist_min(vs[a.name], arboles[c.name], 0.003) <= 0.003
                    or dist_min(vs[c.name], arboles[a.name], 0.003) <= 0.003):
                toca[a.name].add(c.name); toca[c.name].add(a.name)
    malos = {}
    for o in piezas:
        if toca[o.name]: continue
        dc = 0.0 if arboles[o.name].overlap(casco.bvh_todo) else dist_min(vs[o.name], casco.bvh_todo, 0.5)
        if dc > 0.02: malos[o.name] = f'a {dc * 100:.1f} cm del casco y sin tocar otra pieza'
    r['3 nada flotando'] = (not malos, malos or 'todas las piezas apoyan en otra o siguen al casco')
    # 4. nada superpuesto en el mismo plano (parpadea): puntos de cada cara (centro y vértices corridos al
    #    centro) sobre otra pieza, con la normal en el MISMO sentido (las caras de contacto se miran de
    #    frente y no parpadean)
    malos = {}
    for o in piezas:
        mw = o.matrix_world; n = 0
        for p in o.data.polygons:
            c = cab(mw @ p.center); nrm = cab(mw.to_3x3() @ p.normal).normalized()
            pts = [c] + [cab(mw @ o.data.vertices[k].co).lerp(c, 0.1) for k in p.vertices]
            hallada = False
            for nombre, arbol in arboles.items():
                if nombre == o.name: continue
                for q0 in pts:
                    q = arbol.find_nearest(q0, 0.0008)
                    if q[0] is not None and q[1].normalized().dot(nrm) > 0.995: hallada = True; break
                if hallada: break
            n += hallada
        if n: malos[o.name] = n
    r['4 nada superpuesto en el mismo plano'] = (not malos, malos or 'sin caras coplanares encimadas')
    # 5. alcance: cada control (sw…, lev…) a menos de 75 cm del hombro más cercano
    malos = {}
    for o in piezas:
        if not o.name.startswith(('sw', 'lev')): continue
        p = Vector(o['punta']) if 'punta' in o else centro(o)
        d = min((p - h).length for h in HOMBROS)
        if d > 0.75: malos[o.name] = f'{d * 100:.0f} cm'
    r['5 alcance (75 cm del hombro)'] = (not malos, malos or 'todos los controles al alcance')
    # 6. presupuesto para el Quest
    tri = sum(tri_count(o) for o in piezas)
    llamadas = sum(max(1, len({p.material_index for p in o.data.polygons})) for o in piezas)
    mb = sum(os.path.getsize(g) for g in glbs if os.path.exists(g)) / 1e6
    ok = tri <= tri_max and llamadas <= llamadas_max and mb <= mb_max
    r['6 presupuesto'] = (ok, f'{tri} triángulos (máx. {tri_max}) · {llamadas} llamadas (máx. {llamadas_max}) · {mb:.2f} MB (máx. {mb_max})')
    if informe:
        with open(informe, 'w', encoding='utf-8') as f:
            json.dump({k: {'ok': v[0], 'detalle': v[1]} for k, v in r.items()}, f, ensure_ascii=False, indent=1)
    return r

def imprimir(r):
    for k, (ok, det) in r.items(): print(('  OK   ' if ok else '  FALLA'), k, '→', det)
    return all(ok for ok, _ in r.values())


# ---------------- piezas de prueba del chequeador ----------------
def piezas_de_prueba():
    """Una pieza buena y una por cada falla que el chequeador tiene que encontrar."""
    col = coleccion('prueba')
    buena = caja('prueba_buena', -0.15, 0.15, 0.262, 0.30, 1.10, 1.40, 'prueba', col)          # apoyada en el piso? (cerca del casco)
    sobre = caja('prueba_sobre', -0.05, 0.05, 0.30, 0.40, 1.20, 1.30, 'prueba', col)            # apoyada sobre la buena
    afuera = caja('prueba_afuera', -0.72, -0.50, 0.80, 0.90, 1.60, 1.70, 'prueba', col)         # atraviesa la pared izquierda
    vidrio = caja('prueba_parabrisas', -0.05, 0.05, 1.15, 1.25, 0.80, 0.86, 'prueba', col)      # delante del parabrisas
    flota = caja('prueba_flota', 0.10, 0.16, 0.95, 1.01, 1.30, 1.36, 'prueba', col)             # en el aire
    pa = malla('prueba_plano_a', [(0.2, 0.6, 1.0), (0.4, 0.6, 1.0), (0.4, 0.6, 1.2), (0.2, 0.6, 1.2)], [(0, 1, 2, 3)], 'prueba', col)
    pb = malla('prueba_plano_b', [(0.3, 0.6, 1.1), (0.5, 0.6, 1.1), (0.5, 0.6, 1.3), (0.3, 0.6, 1.3)], [(0, 1, 2, 3)], 'prueba', col)
    lejos = caja('swPRUEBA', 0.30, 0.32, 0.30, 0.32, 0.62, 0.64, 'prueba', col)                 # llave fuera de alcance
    control(lejos, piv=(0.31, 0.30, 0.63))
    return [buena, sobre, afuera, vidrio, flota, pa, pb, lejos]


if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    casco = Casco()
    print(f'CASCO: {casco.n_chapa} caras de chapa, {casco.n_vidrio} de vidrio ({time.time() - t0:.1f} s)')
    os.makedirs(SALIDA, exist_ok=True)
    m = medir_casco(casco, os.path.join(SALIDA, 'casco_medido.json'))
    print(f'MEDIDO: {len(m["z"])} estaciones × {len(m["y"])} alturas → blender/casco_medido.json ({time.time() - t0:.1f} s)')
    piezas = piezas_de_prueba()
    r = chequear(piezas, casco)
    print('CHEQUEO de las piezas de prueba (tienen que FALLAR 1, 2, 3, 4 y 5):')
    imprimir(r)
    esperado = {'1 nada afuera': 'prueba_afuera', '2 nada delante del parabrisas': 'prueba_parabrisas',
                '3 nada flotando': 'prueba_flota', '4 nada superpuesto en el mismo plano': 'prueba_plano_a',
                '5 alcance (75 cm del hombro)': 'swPRUEBA'}
    bien = all((not r[k][0]) and isinstance(r[k][1], dict) and n in r[k][1] for k, n in esperado.items())
    falsos = {k: [x for x in r[k][1] if x not in (esperado[k], 'prueba_plano_b', 'swPRUEBA')] for k in esperado if isinstance(r[k][1], dict)}   # la llave de prueba también flota
    falsos = {k: v for k, v in falsos.items() if v}
    print('PRUEBA DEL CHEQUEADOR:', 'BIEN (encontró las 5 fallas)' if bien else 'MAL', '· falsos positivos:', falsos or 'ninguno')
    print(f'LISTO en {time.time() - t0:.1f} s')
