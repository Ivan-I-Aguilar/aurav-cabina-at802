# Lichi · pedales del AT-802: los separa de cabina.glb, los deja en neutro con la bisagra arriba,
# anima el clip «pedales_timon» (tope izquierdo → neutro → tope derecho) y exporta blender/pedales.glb (+ .blend y vistas previas).
# Uso (sin abrir Blender):
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/pedales_blender.py
# Coordenadas en el marco de cabina.glb (glTF: +x derecha, +y arriba, +z hacia el piloto). Blender: (x, -z, y).
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'blender')
RECORRIDO = 0.2          # rad a cada lado (~11°): lo que trae el modelo FSX congelado; a validar con AAXOD
PIV_Y, PIV_Z = 0.598, 0.617   # eje de los pedales colgantes (arriba del brazo amarillo)
FPS, CUADROS = 30, 30

# piezas de cada pedal: (malla, centro aproximado de la isla en glTF)
PIEZAS = {
    'pedal_izq': [('m16', (-0.189, 0.381, 0.522)), ('m23', (-0.195, 0.310, 0.542)), ('m23', (-0.274, 0.440, 0.578)), ('m23', (-0.294, 0.311, 0.592))],
    'pedal_der': [('m16', (0.186, 0.382, 0.673)), ('m23', (0.192, 0.310, 0.692)), ('m23', (0.272, 0.440, 0.655)), ('m23', (0.290, 0.310, 0.742))],
}
# ángulo con que vienen en el modelo (+ = pala hacia adelante): se deshace para dejarlos en neutro
DESVIO = {'pedal_izq': 0.195, 'pedal_der': -0.21}

def b(v): return Vector((v[0], -v[2], v[1]))   # glTF → Blender

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(RAIZ, 'cabina.glb'))
mallas = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}

def islas(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.faces.ensure_lookup_table()
    vistas, res = set(), []
    for f in bm.faces:
        if f.index in vistas: continue
        pila, isla = [f], []
        vistas.add(f.index)
        while pila:
            g = pila.pop(); isla.append(g.index)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in vistas: vistas.add(h.index); pila.append(h)
        mw = obj.matrix_world
        pts = [mw @ v.co for i in isla for v in bm.faces[i].verts]
        mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        res.append((isla, (mn + mx) / 2))
    bm.free(); return res

cache = {}
nuevos = {}
for nombre, piezas in PIEZAS.items():
    partes = []
    for malla, centro in piezas:
        obj = mallas[malla]
        if malla not in cache: cache[malla] = islas(obj)
        cand = min(cache[malla], key=lambda it: (it[1] - b(centro)).length)
        assert (cand[1] - b(centro)).length < 0.02, (nombre, malla, centro, tuple(cand[1]))
        # copia de la malla con sólo esa isla
        o = obj.copy(); o.data = obj.data.copy(); bpy.context.collection.objects.link(o)
        bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
        quedan = set(cand[0])
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in quedan], context='FACES')
        bm.to_mesh(o.data); bm.free()
        partes.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in partes: o.select_set(True)
    bpy.context.view_layer.objects.active = partes[0]
    bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = ob.data.name = nombre
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # origen en la bisagra y pedal a neutro
    cx = sum(c[1][0] for c in [(m, cc) for m, cc in piezas]) / len(piezas)
    piv = b((cx, PIV_Y, PIV_Z))
    ob.data.transform(Matrix.Translation(-piv)); ob.location = piv
    ob.data.transform(Matrix.Rotation(-DESVIO[nombre], 4, 'X'))
    nuevos[nombre] = ob

# borrar todo lo demás (este .blend es sólo de los pedales)
for o in list(bpy.data.objects):
    if o.name not in nuevos: bpy.data.objects.remove(o, do_unlink=True)

# clip: cuadro 0 = timón a la izquierda (pedal izquierdo adelante), CUADROS/2 = neutro, CUADROS = derecha
esc = bpy.context.scene; esc.name = 'pedales_timon'; esc.render.fps = FPS; esc.frame_start, esc.frame_end = 0, CUADROS
for nombre, ob in nuevos.items():
    s = 1 if nombre == 'pedal_izq' else -1
    ob.rotation_mode = 'XYZ'   # los objetos importados de glTF vienen en cuaterniones: el exportador no acepta mezclar
    for f, k in ((0, 1), (CUADROS // 2, 0), (CUADROS, -1)):
        ob.rotation_euler = (s * k * RECORRIDO, 0, 0); ob.keyframe_insert('rotation_euler', frame=f)
    for fc in ob.animation_data.action.fcurves if hasattr(ob.animation_data.action, 'fcurves') else []:
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
# Blender 5: las curvas viven en los canales de la acción
for ob in nuevos.values():
    act = ob.animation_data.action
    for capa in getattr(act, 'layers', []):
        for tira in capa.strips:
            for cb in tira.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# un solo clip: cada pedal pone su acción en una pista NLA llamada igual; el exportador las junta
for ob in nuevos.values():
    act = ob.animation_data.action; act.name = 'pedales_timon_' + ob.name
    pista = ob.animation_data.nla_tracks.new(); pista.name = 'pedales_timon'
    pista.strips.new('pedales_timon', 0, act); ob.animation_data.action = None

os.makedirs(SALIDA, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, 'pedales.glb'), export_format='GLB', use_selection=True, export_yup=True,
                          export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SALIDA, 'pedales.blend'))

# vistas previas: izquierda / neutro / derecha, desde el costado del piloto
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); esc.collection.objects.link(cam); esc.camera = cam
cam.location = b((0.80, 0.80, 1.30)); cam.rotation_euler = (b((0.0, 0.40, 0.62)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
luz = bpy.data.objects.new('luz', bpy.data.lights.new('luz', 'SUN')); esc.collection.objects.link(luz); luz.rotation_euler = (0.8, 0.2, 0.6); luz.data.energy = 3
esc.render.engine = 'BLENDER_EEVEE'; esc.render.resolution_x, esc.render.resolution_y = 640, 400
esc.world = bpy.data.worlds.new('w'); esc.world.color = (0.25, 0.27, 0.3)
for f, nom in ((0, 'izq'), (CUADROS // 2, 'neutro'), (CUADROS, 'der')):
    esc.frame_set(f); esc.render.filepath = os.path.join(SALIDA, f'pedales_{nom}.png'); bpy.ops.render.render(write_still=True)
print('LISTO', {n: tuple(round(v, 3) for v in o.location) for n, o in nuevos.items()})
