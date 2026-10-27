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

# el OBJ trae COLORES DE VÉRTICE (pintura vieja): three.js los multiplica sobre la textura (Blender los ignora) → fuera
for ca in list(o.data.color_attributes):
    o.data.color_attributes.remove(ca)

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
mats_borrar = {i for i, s in enumerate(o.material_slots) if s.material and any(k in (s.material.name or '') for k in ('mat00', 'mat01', 'mat11'))}   # mat11: revestimiento interior oscuro del OBJ, asomaba por el vidrio (24/10); el interior lo pone la cabina
bm = bmesh.new(); bm.from_mesh(me)
INT_MIN, INT_MAX = Vector((-0.5, -2.02, 0.15)), Vector((0.5, -0.7, 1.25))    # restos interiores (el habitáculo lo pone nuestra cabina); el mamparo de atrás (y<-2.02) queda: cierra la chapa detrás de la ventana
# la cúpula del OBJ queda ENTERA, vidrios incluidos (sin puerta que abre: el modelo lo más fiel posible)
gi = {i for i, sl in enumerate(o.material_slots) if sl.material and sl.material.name == 'mat22'}
quitar = []
for f in bm.faces:
    c = f.calc_center_median()
    en_int = all(INT_MIN[i] <= c[i] <= INT_MAX[i] for i in range(3))
    # vidrios de la cúpula duplicados (paño interno + externo superpuestos pelean entre sí): queda sólo la cara que mira hacia afuera
    vidrio_int = False
    if f.material_index in gi and -2.6 < c.y < -0.3 and c.z > 0.85:
        d = Vector((c.x, 0, c.z - 1.0)).normalized()
        vidrio_int = f.normal.dot(d) < 0
    if f.material_index in mats_borrar or en_int or vidrio_int: quitar.append(f)
bmesh.ops.delete(bm, geom=quitar, context='FACES')
bm.to_mesh(me); bm.free(); me.update()
print('BORRADAS', len(quitar))

# Librea (24/10, pedido de Iván): respetar la PINTURA ORIGINAL del modelo —franjas y deriva azules de fábrica—
# sobre base blanca: el amarillo se blanquea (conservando remaches), lo azul y lo oscuro (gomas, antideslizante,
# antirreflejo) queda tal cual, sin el «493» de la cola ni el «RESTRICTED» (espejado de un lado).
# Nada de dibujo por geometría: sólo las ruedas de goma y las palas (negras con banda roja) se pintan aparte.
BORRAR = {'b_at_04': ('azul', [(0.07, 0.17, 0.27, 0.33), (0.62, 0.17, 0.82, 0.33)]),    # «493»: se rellena con el azul de la deriva (u0, v0, u1, v1; v desde abajo)
          'b_at_01': ('blanco', [(0.42, 0.79, 0.51, 0.835), (0.49, 0.50, 0.57, 0.54)])}  # «RESTRICTED»: chapa blanca lisa
PALA = (0.645, 0.0, 0.70, 0.292)      # tira de la pala Hartzell en at_01 (raiz v~0.06, punta v~0.284)
PALA_BANDA = (0.250, 0.284)           # banda roja pegada a la punta (antes quedaba a mitad de pala y la punta gastada)
def blanquear(img, nombre):
    W, H = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
    lum = px[..., 0] * 0.3 + px[..., 1] * 0.59 + px[..., 2] * 0.11
    r = max(4, W // 256)
    c = np.cumsum(np.cumsum(np.pad(lum, ((1, 0), (1, 0))), 0), 1)
    yy0 = np.clip(np.arange(H) - r, 0, H); yy1 = np.clip(np.arange(H) + r + 1, 0, H)
    xx0 = np.clip(np.arange(W) - r, 0, W); xx1 = np.clip(np.arange(W) + r + 1, 0, W)
    area = (yy1 - yy0)[:, None] * (xx1 - xx0)[None, :]
    blur = (c[yy1][:, xx1] - c[yy1][:, xx0] - c[yy0][:, xx1] + c[yy0][:, xx0]) / area
    detalle = np.clip(lum - blur, -0.35, 0.1)
    azul = px[..., 2] > np.maximum(px[..., 0], px[..., 1]) + 0.015   # pintura azul de fábrica (valores lineales)
    oscuro = lum < 0.045                                             # gomas, antideslizante, rejillas (~sRGB 0,23)
    modo_cajas = BORRAR.get(next((k for k in BORRAR if nombre.lower().startswith(k)), ''), None)
    if modo_cajas:
        modo, cajas = modo_cajas
        for u0, v0, u1, v1 in cajas:
            reg = (slice(int(v0 * H), int(v1 * H)), slice(int(u0 * W), int(u1 * W)))
            detalle[reg] = 0
            if modo == 'azul':
                alto = int(v1 * H) - int(v0 * H)   # clonar la franja de arriba de la caja (misma chapa azul): sin parche plano
                src = (slice(int(v0 * H) + alto, int(v1 * H) + alto), reg[1])
                px[reg] = px[src]; azul[reg] = azul[src]; detalle[reg] = detalle[src]
            else:
                azul[reg] = False; oscuro[reg] = False
    if nombre.lower().startswith('b_at_01'):   # pala: negra con banda roja en la punta (pedido 24/10)
        u0, v0, u1, v1 = PALA
        reg = (slice(int(v0 * H), int(v1 * H)), slice(int(u0 * W), int(u1 * W)))
        # TODA la tira negra pareja, sin excepciones: el metal gastado del original es azulado
        # y el filtro «azul de fábrica» lo conservaba → palas moteadas (video de Iván 26/10)
        px[reg] = (0.02, 0.02, 0.022, 1)
        b0, b1 = (slice(int(PALA_BANDA[0] * H), int(PALA_BANDA[1] * H)), reg[1])
        px[b0, b1] = (0.35, 0.012, 0.012, 1)
        azul[reg] = True
    gris = oscuro & ~azul   # lo oscuro conservado va a GRIS neutro (los parches de amarillo sombreado quedaban amarillos)
    for i in range(3): px[..., i] = np.where(gris, lum, px[..., i])
    conservar = azul | oscuro
    v = np.clip(0.78 + detalle * 0.9, 0, 0.9)
    out = bpy.data.images.new(nombre, W, H)
    for i, esc in enumerate((1, 1, 0.985)):
        px[..., i] = np.where(conservar, px[..., i], v * esc)
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

m21 = bpy.data.materials.get('mat21')
if m21 and m21.use_nodes:   # escapes: metal oscuro parejo (se teñían de blanco con el blanqueado)
    nt21 = m21.node_tree; b21 = next(n for n in nt21.nodes if n.type == 'BSDF_PRINCIPLED')
    for lk in list(nt21.links):
        if lk.to_node is b21 and lk.to_socket.name == 'Base Color': nt21.links.remove(lk)
    b21.inputs['Base Color'].default_value = (0.055, 0.055, 0.06, 1)
    b21.inputs['Metallic'].default_value = 0.6; b21.inputs['Roughness'].default_value = 0.45

def mat_plano(nombre, color):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = 0.8
    return m
m_goma = mat_plano('goma', (0.015, 0.015, 0.016)); m_goma.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
o.data.materials.append(m_goma)
i_goma = len(o.data.materials) - 1

m_compuerta = mat_plano('compuerta', (0.40, 0.015, 0.02)); m_compuerta.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.55   # compuerta ROJA (reglamentación, 26/10)
o.data.materials.append(m_compuerta)
i_compuerta = len(o.data.materials) - 1
m_pedana = mat_plano('pedana', (0.05, 0.05, 0.052)); m_pedana.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0   # gris oscuro: negra parecia un bulto en escorzo
o.data.materials.append(m_pedana)
i_pedana = len(o.data.materials) - 1

# por geometría: GOMA negra en las ruedas, y la PEDANA (antideslizante) PINTADA en la raíz del ala izquierda
# (24/10, pedido de Iván: la placa flotante pisada_ala se reemplaza por pintura sobre la chapa)
bm = bmesh.new(); bm.from_mesh(o.data)
# cortes para que la pedana tenga bordes netos (marco Blender: x, y=-largo, z arriba; ala izq. x<0, z_cab 0.63..1.1 → y -1.1..-0.63)
for co, no in [((-1.10, 0, 0), (1, 0, 0)), ((-0.80, 0, 0), (1, 0, 0)), ((0, -1.02, 0), (0, 1, 0)), ((0, -0.68, 0), (0, 1, 0))]:
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), plane_co=co, plane_no=no)
ng = np_ = 0
for f in bm.faces:
    c = f.calc_center_median()
    if (1.26 < abs(c.x) < 1.66 and -2.05 < c.z < -1.05 and 0.3 < c.y < 1.35) or (-6.45 < c.y < -5.9 and c.z < -0.75 and abs(c.x) < 0.12): f.material_index = i_goma; ng += 1
    if -1.10 < c.x < -0.80 and -1.02 < c.y < -0.68 and -0.45 < c.z < 0.15 and f.normal.z > 0.3: f.material_index = i_pedana; np_ += 1
bm.to_mesh(o.data); bm.free(); o.data.update()
print('GOMA', ng, 'PEDANA', np_)

# compuerta: la BURBUJA ENTERA roja (26/10, Iván: «tiene que estar toda esa burbuja roja»).
# Por islas conexas enteramente contenidas en la caja del pod: la panza (mat05) y la ballesta
# del tren siguen de largo fuera de la caja y quedan afuera solas. mat02 no sirve de filtro
# (se usa hasta en las alas) y la regla vieja por normal pintaba sólo el piso de la puerta.
bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); bm.faces.index_update()
vistas = set(); nc = 0
for f0 in bm.faces:
    if f0.index in vistas: continue
    pila = [f0]; vistas.add(f0.index); isla = []
    while pila:
        g = pila.pop(); isla.append(g)
        for e in g.edges:
            for h in e.link_faces:
                if h.index not in vistas: vistas.add(h.index); pila.append(h)
    ps = [v.co for g in isla for v in g.verts]
    if (max(abs(p.x) for p in ps) < 0.50 and min(p.y for p in ps) > -1.70
            and max(p.y for p in ps) < 1.30 and max(p.z for p in ps) < -0.45):
        for g in isla: g.material_index = i_compuerta
        nc += len(isla)
print('COMPUERTA', nc)

# acoples de carga (boquillas mat08 detrás del pod): de fábrica cuelgan sueltos justo por fuera
# de la curva del casco (a z −0.7 el casco llega a |x| 0.42 y ellos arrancan en 0.42) → 10 cm
# adentro y 6 cm arriba: quedan incrustados en el flanco con la boquilla asomando, sin flotar.
i_acop = next((i for i, m in enumerate(o.data.materials) if m and m.name == 'mat08'), -1)
va = set()
for f in bm.faces:
    c = f.calc_center_median()
    if f.material_index == i_acop and 0.38 < abs(c.x) < 0.62 and -2.68 < c.y < -2.40 and -0.86 < c.z < -0.64:
        for v in f.verts: va.add(v)
for v in va:
    v.co.x -= 0.10 * (1 if v.co.x > 0 else -1); v.co.z += 0.06
print('ACOPLES', len(va))
bm.to_mesh(o.data); bm.free(); o.data.update()

# estribo del trabajo anterior (el tren ya viene en el OBJ: el nuestro no hace falta);
# pisada_ala queda afuera: flotaba sobre el ala del OBJ (la pedana ahora va pintada, arriba)
with bpy.data.libraries.load(os.path.join(SAL, 'at802_terrestre_trabajo.blend'), link=False) as (de, a):
    a.collections = [c for c in de.collections if c == 'estribo']
for c in a.collections:
    if c: bpy.context.scene.collection.children.link(c)
pa = bpy.data.objects.get('pisada_ala')
if pa: bpy.data.objects.remove(pa, do_unlink=True)

# todo a DOBLE cara: ninguna chapa puede desaparecer según el ángulo (las normales del OBJ vienen mezcladas)
for sl in o.material_slots:
    if sl.material: sl.material.use_backface_culling = False
# vidrio real: tinte suave y 25 % de opacidad (el glass.dds del OBJ era casi opaco y desde adentro tapaba todo)
mv = bpy.data.materials.get('mat22')
if mv and mv.use_nodes:
    nt = mv.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    for lk in list(nt.links):
        if lk.to_node is b and lk.to_socket.name in ('Base Color', 'Alpha'): nt.links.remove(lk)
    b.inputs['Base Color'].default_value = (0.45, 0.52, 0.58, 1); b.inputs['Alpha'].default_value = 0.34; b.inputs['Roughness'].default_value = 0.04   # un poco mas lechoso: el tablero negro resaltaba a traves de los vidrios
    mv.surface_render_method = 'BLENDED'
# sombreado suave (38°): sin facetas en fuselaje ni carenados
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(38))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SAL, 'at802_terrestre_v3.blend'))
for i in bpy.data.images:
    if i.size[0] > 1024: i.scale(1024, 1024)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(PROYECTO, 'exterior.glb'), export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_animations=False, export_materials='EXPORT', export_image_format='AUTO', export_jpeg_quality=85)
print('LISTO', {'kb': round(os.path.getsize(os.path.join(PROYECTO, 'exterior.glb')) / 1024)})
