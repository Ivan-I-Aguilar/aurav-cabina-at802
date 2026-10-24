# Lichi · exterior terrestre v2: parte del AT-802 TERRESTRE real (OBJ de Metasequoia, mismo linaje FSN)
# en vez del Fire Boss recortado. Trae tren de ballesta, ruedas y hélice de 5 palas de fábrica.
# Uso: blender.exe -b --factory-startup --python herramientas/exterior_terrestre2.py
#   Entrada: Documents\aurav-cabina\fsx\rar_terrestre\Air Tractor AT-802\files\AT802-4.obj + carpeta DDS,
#            estribo de salida\at802_terrestre_trabajo.blend.
#   Salida: salida\at802_terrestre_v3.blend y exterior.glb del proyecto (texturas 1024).
# Marco en Blender (igual que los scripts previos): X = x_cab (derecha del piloto), Y = -z_cab (nariz +Y... ojo: nariz = -z_cab → Blender_Y = -z_cab, la nariz queda en +Y), Z = y_cab (arriba).
import bpy, bmesh, os, math
import numpy as np
from mathutils import Vector, Matrix

SAL = r'C:\Users\ivani\Documents\aurav-cabina\fsx\salida'
BASE = r'C:\Users\ivani\Documents\aurav-cabina\fsx\rar_terrestre\Air Tractor AT-802'
PROYECTO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=os.path.join(BASE, 'files', 'AT802-4.obj'))
o = [x for x in bpy.data.objects if x.type == 'MESH'][0]; o.name = 'exterior'
# el importador deja la conversión de ejes en la MATRIZ del objeto: hornearla en la malla antes de medir
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# texturas del DDS (nombres con mayúsculas mezcladas)
dds = {f.lower(): os.path.join(BASE, 'DDS', f) for f in os.listdir(os.path.join(BASE, 'DDS'))}
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image and n.image.name.lower() in dds:
            n.image.filepath = dds[n.image.name.lower()]; n.image.source = 'FILE'; n.image.reload()

# orientar al marco de trabajo: obj(arriba=+X, cola=+Y, envergadura=Z) → Blender(X=der, Y=nariz(-z_cab... la cola queda en -Y), Z=arriba)
# nuevo = (z_obj, -y_obj, x_obj); escala por envergadura 18,06 m (el obj mide ±9,03 ya escalado en import? no: unidades crudas)
dim = max(o.dimensions); esc_f = 18.06 / dim
M = Matrix(((0, 0, esc_f, 0), (0, -esc_f, 0, 0), (esc_f, 0, 0, 0), (0, 0, 0, 1)))
o.data.transform(M); o.matrix_world = Matrix.Identity(4); o.data.update()
# verificación: tope del timón (z alto) tiene que quedar en la cola (y negativo) y la envergadura en X
co0 = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', co0); co0 = co0.reshape(-1, 3)
fin = co0[co0[:, 2] > co0[:, 2].max() - 0.3]
assert abs(co0[:, 0].max() - 9.03) < 0.3, f'envergadura mal: {co0[:, 0].max():.2f}'
assert np.median(fin[:, 1]) < -3, f'la deriva no quedó en la cola: y={np.median(fin[:, 1]):.2f}'
print('MARCO OK: deriva en y', round(float(np.median(fin[:, 1])), 2), 'envergadura ±', round(float(co0[:, 0].max()), 2))

# UVs del OBJ vienen corridas a V 1..2 (Metasequoia): bajarlas a 0..1 o el horneado cae fuera del lienzo
uvl = o.data.uv_layers[0].data
uva = np.empty(len(uvl) * 2); uvl.foreach_get('uv', uva); uva = uva.reshape(-1, 2)
uva[:, 1] -= np.floor(uva[:, 1].min())
uvl.foreach_set('uv', uva.ravel())

# medir y alinear: ruedas al piso (z_B = -2) y cabina del OBJ sobre la nuestra (vidrio de cúpula ≈ y_B −0,6…−2,2)
co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
z_min = co[:, 2].min()
# el parabrisas del OBJ: vértices del material glass (mat22) → centro en Y
idx_glass = [i for i, s in enumerate(o.material_slots) if s.material and 'mat22' in s.material.name]
ys = []
if idx_glass:
    me = o.data
    for p in me.polygons:
        if p.material_index in idx_glass and all(me.vertices[v].co.z > 1.0 for v in p.vertices):
            ys += [me.vertices[v].co.y for v in p.vertices]
y_canopy = (min(ys) + max(ys)) / 2 if ys else 0.0
# nuestra cúpula (marco cabina z 0,65…2,15 → Blender Y −2,15…−0,65): centro −1,4
o.data.transform(Matrix.Translation((0, -1.4 - y_canopy, -2.0 - z_min))); o.data.update()
print('ALINEADO: canopy_obj_y', round(y_canopy, 2), 'piso corregido', round(z_min, 2))

# borrar: interior propio (paneles $atvc), vidrios de cúpula y estructura de cúpula (la pone nuestra cabina + puerta de Lichi)
me = o.data
mats_borrar = {i for i, s in enumerate(o.material_slots) if s.material and any(k in (s.material.name or '') for k in ('mat00', 'mat01'))}
bm = bmesh.new(); bm.from_mesh(me)
INT_MIN, INT_MAX = Vector((-0.5, -2.4, 0.15)), Vector((0.5, -0.7, 1.25))     # restos interiores (el habitáculo lo pone nuestra cabina)
CUP_MIN, CUP_MAX = Vector((-0.80, -2.10, 1.02)), Vector((0.80, -0.70, 2.2))   # cúpula del OBJ: desde adentro se ve negra; la pone nuestra cabina (vidrios + jaula + techo)
quitar = []
for f in bm.faces:
    c = f.calc_center_median()
    en_int = all(INT_MIN[i] <= c[i] <= INT_MAX[i] for i in range(3))
    en_cup = all(CUP_MIN[i] <= c[i] <= CUP_MAX[i] for i in range(3))
    if f.material_index in mats_borrar or en_int or en_cup: quitar.append(f)
bmesh.ops.delete(bm, geom=quitar, context='FACES'); bm.to_mesh(me); bm.free(); me.update()
print('BORRADAS', len(quitar))

# librea AURAV por GEOMETRÍA (este atlas comparte texels entre partes: hornear por posición lo mancha).
# 1) base blanca: las texturas at_01/02/04 se pasan a blanco conservando remaches (luminancia reescalada);
# 2) franja bordó + línea fina y puntas rojas: se bisecta la malla por los planos de la librea y se asignan materiales planos.
def blanquear(img, nombre):
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    lum = px[:, 0] * 0.3 + px[:, 1] * 0.59 + px[:, 2] * 0.11
    v = np.clip(0.42 + 0.75 * lum, 0, 0.86)
    out = bpy.data.images.new(nombre, img.size[0], img.size[1])
    px[:, 0] = v; px[:, 1] = v; px[:, 2] = v * 0.985
    out.pixels.foreach_set(px.ravel())
    out.filepath_raw = os.path.join(SAL, 'tex', nombre + '.png'); out.file_format = 'PNG'; out.save()
    return out
PIEL = []
for sl in o.material_slots:
    mat = sl.material
    if not mat or not mat.use_nodes: continue
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image and n.image.name.lower().startswith(('at_01', 'at_02', 'at_04')):
            if n.image.size[0] == 0: continue
            nb = bpy.data.images.get('b_' + n.image.name) or blanquear(n.image, 'b_' + n.image.name)
            n.image = nb; PIEL.append(mat.name)
PIEL = set(PIEL)
print('PIEL', sorted(PIEL))
# sanear imágenes rotas (steel.bmp, vertex.bmp): color plano
for sl in o.material_slots:
    mat = sl.material
    if not mat or not mat.use_nodes: continue
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] == 0:
            for lk in list(nt.links):
                if lk.from_node is n: nt.links.remove(lk)
            b = next((x for x in nt.nodes if x.type == 'BSDF_PRINCIPLED'), None)
            if b: b.inputs['Base Color'].default_value = (0.5, 0.5, 0.52, 1)
            nt.nodes.remove(n)

def mat_plano(nombre, color):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = 0.8
    return m
m_bordo = mat_plano('librea_bordo', (0.30, 0.025, 0.06)); m_rojo = mat_plano('librea_rojo', (0.62, 0.02, 0.04))
o.data.materials.append(m_bordo); o.data.materials.append(m_rojo)
i_bordo = len(o.data.materials) - 2; i_rojo = len(o.data.materials) - 1
i_piel = {i for i, sl in enumerate(o.material_slots) if sl.material and sl.material.name in PIEL}

bm = bmesh.new(); bm.from_mesh(o.data)
# planos de corte (coords Blender: y hacia la nariz, z arriba): franja z = 0.08 + 0.03*y ± 0.08; línea z = 0.08 + 0.03*y − 0.135 ± 0.013
PLANOS = [((0, 0, -0.09), (0, -0.02, 1)), ((0, 0, -0.27), (0, -0.02, 1)), ((0, 0, -0.315), (0, -0.02, 1)), ((0, 0, -0.345), (0, -0.02, 1)),
          ((8.42, 0, 0), (1, 0, 0)), ((-8.42, 0, 0), (1, 0, 0)), ((2.4, 0, 0), (1, 0, 0)), ((-2.4, 0, 0), (1, 0, 0)),
          ((0, 0, 1.85), (0, 0, 1)), ((0, -4.4, 0), (0, 1, 0))]
for co, no in PLANOS:
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), plane_co=co, plane_no=no)
nb = nr = 0
for f in bm.faces:
    if f.material_index not in i_piel: continue
    c = f.calc_center_median(); g = c.z + 0.18 - 0.02 * c.y
    if (abs(g) < 0.09 or abs(g + 0.15) < 0.015) and abs(c.x) < 0.82 and c.y > -4.6: f.material_index = i_bordo; nb += 1
    elif abs(c.x) > 8.42 or (c.y < -4.4 and c.z > 1.85) or (c.y < -4.4 and abs(c.x) > 2.4 and abs(c.x) < 3.2): f.material_index = i_rojo; nr += 1
bm.to_mesh(o.data); bm.free(); o.data.update()
print('LIBREA bordo', nb, 'rojo', nr)

# estribo del trabajo anterior (el tren ya viene en el OBJ: el nuestro no hace falta)
with bpy.data.libraries.load(os.path.join(SAL, 'at802_terrestre_trabajo.blend'), link=False) as (de, a):
    a.collections = [c for c in de.collections if c == 'estribo']
for c in a.collections:
    if c: bpy.context.scene.collection.children.link(c)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SAL, 'at802_terrestre_v3.blend'))
for i in bpy.data.images:
    if i.size[0] > 1024: i.scale(1024, 1024)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(PROYECTO, 'exterior.glb'), export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_animations=False, export_materials='EXPORT', export_image_format='AUTO', export_jpeg_quality=85)
print('LISTO', {'kb': round(os.path.getsize(os.path.join(PROYECTO, 'exterior.glb')) / 1024)})
