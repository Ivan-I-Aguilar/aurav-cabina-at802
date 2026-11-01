# Lichi · MARCO/ANTEPECHO de las ventanas laterales (1/11): el canto inferior del vano viene
# DENTADO de fábrica (picos y muescas) y toda moldura RECTA flotaba. Acá se MUESTREA la línea real
# del canto en exterior.glb (máximo local de y por franja de z, ambos lados), se SUAVIZA y se
# construye una cinta que la RECORRE punto a punto: calza por construcción.
# Uso: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/marco_ventana_blender.py
# Coordenadas glTF de la cabina (+x derecha, +y arriba, +z piloto). Blender: (x, -z, y).
import bpy, os
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'blender')
Z0, Z1, PASO = 1.40, 2.30, 0.03          # tramo del vano (glTF). OJO: NO extender a 1,26: el canto delantero SUBE con el parante y la regresión+residuo levanta toda la moldura 10 cm
ALTO, ANCHO = 0.14, 0.045                # sección de la cinta (alto generoso: la recta debe cubrir también las muescas bajas)

def b(v): return Vector((v[0], -v[2], v[1]))   # glTF → Blender
def degltf(v): return (v.x, v.z, -v.y)         # Blender → glTF

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(RAIZ, 'exterior.glb'))

# --- muestrear el canto: por lado y franja de z, el y máximo y el x medio de la cresta ---
muestras = {-1: {}, 1: {}}   # lado → {indice_franja: (ymax, x_en_ymax)}
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    mw = o.matrix_world
    for v in o.data.vertices:
        g = degltf(mw @ v.co)
        x, y, z = g
        if not (0.50 < abs(x) < 0.66 and 0.80 < y < 1.22 and Z0 - 0.05 < z < Z1 + 0.05): continue
        lado = -1 if x < 0 else 1
        i = int((z - Z0) / PASO)
        prev = muestras[lado].get(i)
        if prev is None or y > prev[0]: muestras[lado][i] = (y, x)

mat = bpy.data.materials.new('marco'); mat.use_nodes = True
p = mat.node_tree.nodes['Principled BSDF']
p.inputs['Base Color'].default_value = (0.845, 0.85, 0.838, 1)   # MISMO blanco del casco liso
p.inputs['Roughness'].default_value = 0.5

piezas = []
n_franjas = int((Z1 - Z0) / PASO) + 1
for lado in (-1, 1):
    ms = muestras[lado]
    if not ms:
        print('SIN MUESTRAS lado', lado); continue
    # series completas (interpolando franjas vacías con el vecino)
    ys, xs = [], []
    ultimo = None
    for i in range(n_franjas):
        m = ms.get(i)
        if m is None: m = ultimo if ultimo else next(ms[j] for j in sorted(ms))
        ultimo = m
        ys.append(m[0]); xs.append(m[1])
    # línea de CRESTA: RECTA por regresión sobre los máximos (el canto real de una ventana es recto;
    # seguir cada pico daba una moldura ondulada tipo «crema batida»). La recta pasa POR ARRIBA:
    # se le suma el residuo máximo para cubrir el pico más alto.
    n = n_franjas; zm = (n - 1) / 2
    sy = sum(ys); sz2 = sum((i - zm) ** 2 for i in range(n))
    pend = sum((i - zm) * y for i, y in enumerate(ys)) / sz2 if sz2 else 0.0
    base = sy / n
    recta = [base + pend * (i - zm) for i in range(n)]
    desvio = max(y - r for y, r in zip(ys, recta))
    cresta = [r + desvio for r in recta]
    # suavizado del x (promedio móvil ±2)
    xsu = [sum(xs[max(0, i - 2):i + 3]) / len(xs[max(0, i - 2):i + 3]) for i in range(n_franjas)]
    # cinta: sección rectangular (ANCHO×ALTO) centrada 1 cm sobre la cresta menos medio alto
    verts, caras = [], []
    for i in range(n_franjas):
        z = Z0 + i * PASO
        ytop = cresta[i] + 0.010
        xin, xout = xsu[i] - lado * ANCHO / 2, xsu[i] + lado * ANCHO / 2
        s = [(xin, ytop - ALTO, z), (xout, ytop - ALTO, z), (xout, ytop, z), (xin, ytop, z)]
        verts += [tuple(b(q)) for q in s]
        if i:
            k = 4 * i
            for a_ in range(4):
                a2 = (a_ + 1) % 4
                caras.append((k - 4 + a_, k - 4 + a2, k + a2, k + a_))
    caras.append((0, 1, 2, 3)); caras.append((len(verts) - 1, len(verts) - 2, len(verts) - 3, len(verts) - 4))
    me = bpy.data.meshes.new(f'marco_{lado}'); me.from_pydata(verts, [], caras); me.update()
    o = bpy.data.objects.new(f'marco_{lado}', me); bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    piezas.append(o)
    print('LADO', lado, 'franjas', n_franjas, 'cresta min/max', round(min(cresta), 3), round(max(cresta), 3))

# --- preview con el exterior de contexto ---
esc = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); esc.collection.objects.link(cam); esc.camera = cam
luz = bpy.data.objects.new('luz', bpy.data.lights.new('luz', 'SUN')); esc.collection.objects.link(luz)
luz.rotation_euler = (0.9, 0.3, 2.2); luz.data.energy = 4
esc.render.engine = 'BLENDER_EEVEE'; esc.render.resolution_x, esc.render.resolution_y = 900, 640
esc.world = bpy.data.worlds.new('w'); esc.world.color = (0.5, 0.55, 0.62)
os.makedirs(SALIDA, exist_ok=True)
cam.location = b((-1.6, 1.45, 1.15)); cam.rotation_euler = (b((-0.45, 0.95, 1.95)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
esc.render.filepath = os.path.join(SALIDA, 'marco_ventana_prev.png'); bpy.ops.render.render(write_still=True)

# --- export: sólo los marcos ---
bpy.ops.object.select_all(action='DESELECT')
for o in piezas: o.select_set(True)
bpy.context.view_layer.objects.active = piezas[0]
bpy.ops.object.join(); mv = bpy.context.active_object; mv.name = mv.data.name = 'marco_ventana'
bpy.ops.object.select_all(action='DESELECT'); mv.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, 'marco_ventana.glb'), export_format='GLB',
                          use_selection=True, export_yup=True, export_materials='EXPORT')
print('LISTO marco_ventana.glb')
