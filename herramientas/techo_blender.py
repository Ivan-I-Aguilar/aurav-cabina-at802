# Lichi · CIELORRASO interior (headliner) del AT-802 (1/11): el techo se veía oliva/sucio (cara
# interior de la cúpula del OBJ). Se MUESTREA la bóveda real de exterior.glb en una grilla (x, z)
# y se construye un forro limpio 1,2 cm POR DEBAJO que la sigue punto a punto (método antepecho).
# Sólo la bóveda alta (y 1,38-2,0), así termina solo en los vanos y el parabrisas.
# Uso: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/techo_blender.py
import bpy, os
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'blender')
X0, X1, PX = -0.56, 0.56, 0.045
Z0, Z1, PZ = 1.55, 2.52, 0.045   # de DETRÁS del arco (a 1,05 el raycast pegaba en el VIDRIO y tapaba la vista) hasta el mamparo (2,52: con 2,32 quedaba un empalme oliva atrás)
BAJADA = 0.012

def b(v): return Vector((v[0], -v[2], v[1]))
def degltf(v): return (v.x, v.z, -v.y)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(RAIZ, 'exterior.glb'))

NX = int((X1 - X0) / PX) + 1
NZ = int((Z1 - Z0) / PZ) + 1
# RAYCAST por celda (1/11: muestrear vértices daba confeti: la cúpula tiene triángulos grandes):
# un rayo hacia arriba desde y 1,30; si pega entre 1,38 y 2,05 es la bóveda.
dg = bpy.context.evaluated_depsgraph_get()
grilla = {}
for i in range(NX):
    for j in range(NZ):
        x = X0 + i * PX; z = Z0 + j * PZ
        hit, loc, *_ = bpy.context.scene.ray_cast(dg, b((x, 1.30, z)), Vector((0, 0, 1)))
        if hit:
            y = degltf(loc)[1]
            if 1.30 < y < 2.05: grilla[(i, j)] = y   # hombros incluidos (1,30: con 1,38 quedaba franja oliva lateral)

# suavizado 2D (promedio de vecinos presentes) y relleno de huecos chicos
suave = {}
for (i, j), y0 in list(grilla.items()):
    vec = [grilla[(a, c)] for a in range(i - 1, i + 2) for c in range(j - 1, j + 2) if (a, c) in grilla]
    suave[(i, j)] = sum(vec) / len(vec)
for i in range(NX):
    for j in range(NZ):
        if (i, j) in suave: continue
        vec = [suave[(a, c)] for a in range(i - 1, i + 2) for c in range(j - 1, j + 2) if (a, c) in suave]
        if len(vec) >= 5: suave[(i, j)] = sum(vec) / len(vec)   # tapa huecos de muestreo, no los vanos

mat = bpy.data.materials.new('techo'); mat.use_nodes = True
p = mat.node_tree.nodes['Principled BSDF']
p.inputs['Base Color'].default_value = (0.80, 0.80, 0.78, 1)   # blanco-gris headliner
p.inputs['Roughness'].default_value = 0.85

verts, caras, idx = [], [], {}
def vid(i, j):
    if (i, j) not in idx:
        idx[(i, j)] = len(verts)
        verts.append(tuple(b((X0 + i * PX, suave[(i, j)] - BAJADA, Z0 + j * PZ))))
    return idx[(i, j)]
for i in range(NX - 1):
    for j in range(NZ - 1):
        if all((a, c) in suave for a in (i, i + 1) for c in (j, j + 1)):
            caras.append((vid(i, j), vid(i, j + 1), vid(i + 1, j + 1), vid(i + 1, j)))   # normal hacia ABAJO (visible desde adentro)

me = bpy.data.meshes.new('techo_forro'); me.from_pydata(verts, [], caras); me.update()
o = bpy.data.objects.new('techo_forro', me); bpy.context.collection.objects.link(o)
o.data.materials.append(mat)
bpy.context.view_layer.objects.active = o
bpy.ops.object.shade_smooth()
piezas = [o]

# FLANCOS laterales (las paredes curvas bajo la bóveda también se veían oliva): raycast HORIZONTAL
# desde el eje; donde hay VANO el rayo no pega y el forro queda abierto solo.
Y0f, Y1f, PYf = 0.95, 1.44, 0.045
Zf0, Zf1 = 1.05, 2.52
NYf = int((Y1f - Y0f) / PYf) + 1
NZf = int((Zf1 - Zf0) / PZ) + 1
for lado in (-1, 1):
    gl = {}
    for j in range(NZf):
        for k in range(NYf):
            z = Zf0 + j * PZ; y = Y0f + k * PYf
            hit, loc, *_ = bpy.context.scene.ray_cast(dg, b((0, y, z)), Vector((lado, 0, 0)))
            if hit:
                xg = degltf(loc)[0]
                if 0.45 < abs(xg) < 0.68: gl[(j, k)] = xg - lado * 0.012
    sl = {}
    for (j, k), x0 in list(gl.items()):
        vec = [gl[(a, c)] for a in range(j - 1, j + 2) for c in range(k - 1, k + 2) if (a, c) in gl]
        sl[(j, k)] = sum(vec) / len(vec)
    vl, cl, il = [], [], {}
    def vidl(j, k):
        if (j, k) not in il:
            il[(j, k)] = len(vl)
            vl.append(tuple(b((sl[(j, k)], Y0f + k * PYf, Zf0 + j * PZ))))
        return il[(j, k)]
    for j in range(NZf - 1):
        for k in range(NYf - 1):
            if all((a, c) in sl for a in (j, j + 1) for c in (k, k + 1)):
                cl.append((vidl(j, k), vidl(j, k + 1), vidl(j + 1, k + 1), vidl(j + 1, k)))
    mef = bpy.data.meshes.new(f'flanco_{lado}'); mef.from_pydata(vl, [], cl); mef.update()
    of = bpy.data.objects.new(f'flanco_{lado}', mef); bpy.context.collection.objects.link(of)
    of.data.materials.append(mat)
    bpy.context.view_layer.objects.active = of; bpy.ops.object.shade_smooth()
    piezas.append(of)
    print('FLANCO', lado, 'celdas', len(sl), 'caras', len(cl))

bpy.ops.object.select_all(action='DESELECT')
for p_ in piezas: p_.select_set(True)
bpy.context.view_layer.objects.active = piezas[0]
bpy.ops.object.join(); o = bpy.context.active_object; o.name = o.data.name = 'techo_forro'
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
os.makedirs(SALIDA, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, 'techo.glb'), export_format='GLB',
                          use_selection=True, export_yup=True, export_materials='EXPORT')
print('LISTO techo.glb celdas', len(suave), 'caras', len(caras))
