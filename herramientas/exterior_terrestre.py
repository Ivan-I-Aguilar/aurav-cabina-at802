# Lichi · arma el exterior terrestre AURAV desde el exterior FSX sin pintar (reproducible).
# Uso: blender.exe -b --factory-startup --python herramientas/exterior_terrestre.py
#   Entrada: Documents\aurav-cabina\fsx\salida\exterior_bare.glb (de mdl2glb.py), texturas aurav_at01/02/04.png,
#            y el tren / estribo modelados en at802_terrestre_trabajo.blend (colecciones tren_terrestre, estribo).
#   Salida: at802_terrestre_v2.blend y, en el proyecto, exterior.glb (texturas a 1024).
# Marco de la cabina (glTF): +x derecha, +y arriba, −z hacia la nariz. Blender: (x, −z, y).
import bpy, bmesh, os
from mathutils import Vector

SAL = r'C:\Users\ivani\Documents\aurav-cabina\fsx\salida'
PROYECTO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTERIOR = ['m23', 'm12', 'm13', 'm14', 'm17', 'm19', 'm20', 'm24', 'm25', 'm26', 'm2', 'm5', 'm7', 'm10', 'm11', 'm31']   # piloto, discos de hélice, cabina simplificada e instrumentos
LIBREA = {'m15': 'aurav_at01', 'm16': 'aurav_at02', 'm18': 'aurav_at04'}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SAL, 'exterior_bare.glb'))
for n in INTERIOR:
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)

def borrar_caras(cond):
    total = 0
    for o in [o for o in bpy.data.objects if o.type == 'MESH']:
        bm = bmesh.new(); bm.from_mesh(o.data); mw = o.matrix_world
        caras = [f for f in bm.faces if cond(o, f, mw)]
        total += len(caras); bmesh.ops.delete(bm, geom=caras, context='FACES'); bm.to_mesh(o.data); bm.free()
    return total

# 1) flotadores: todo lo que quede bajo la panza
n1 = borrar_caras(lambda o, f, mw: all((mw @ v.co).z < -0.95 for v in f.verts))
# 2) soportes de los flotadores: piezas sueltas que cuelgan bajo la panza fuera del centro
n2 = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); mw = o.matrix_world; vistas = set(); quitar = []
    for f in bm.faces:
        if f.index in vistas: continue
        pila, isla = [f], []; vistas.add(f.index)
        while pila:
            g = pila.pop(); isla.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in vistas: vistas.add(h.index); pila.append(h)
        ps = [mw @ v.co for g in isla for v in g.verts]
        if min(p.z for p in ps) < -0.68 and max(p.z for p in ps) < 0.2 and abs(sum(p.x for p in ps) / len(ps)) > 0.3 and max(max(p.x for p in ps) - min(p.x for p in ps), max(p.y for p in ps) - min(p.y for p in ps)) < 3.0:
            quitar += isla
    n2 += len(set(quitar)); bmesh.ops.delete(bm, geom=list(set(quitar)), context='FACES'); bm.to_mesh(o.data); bm.free()
# 3) lo que estorba dentro de la cabina: sólo el centro del habitáculo (la chapa de los costados, el techo y la cúpula quedan)
def centro_cabina(o, f, mw):
    p = mw @ f.calc_center_median()       # Blender: X=x, Y=−z, Z=y
    return abs(p.x) < 0.5 and -2.0 < p.y < -0.55 and 0.2 < p.z < 1.62 and o.name != 'm28'
n3 = borrar_caras(centro_cabina)

# 3b) cola: sacar las aletas verticales que el Fire Boss lleva sobre el estabilizador (a ±1,5 m); el terrestre no las tiene
n4 = borrar_caras(lambda o, f, mw: all(1.44 < abs((mw @ v.co).x) < 1.57 and -6.12 < (mw @ v.co).y < -5.1 and 0.14 < (mw @ v.co).z < 0.96 for v in f.verts))

# 4) librea AURAV (texturas horneadas sobre las mismas UV)
for n, img in LIBREA.items():
    o = bpy.data.objects.get(n)
    if not o: continue
    im = bpy.data.images.load(os.path.join(SAL, 'tex', img + '.png'))
    nt = o.material_slots[0].material.node_tree; tex = next(x for x in nt.nodes if x.type == 'TEX_IMAGE'); tex.image = im

# 5) tren y estribo desde el archivo de trabajo
with bpy.data.libraries.load(os.path.join(SAL, 'at802_terrestre_trabajo.blend'), link=False) as (de, a):
    a.collections = [c for c in de.collections if c in ('tren_terrestre', 'estribo')]
for c in a.collections:
    if c: bpy.context.scene.collection.children.link(c)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SAL, 'at802_terrestre_v2.blend'))
for i in bpy.data.images:
    if i.size[0] > 1024: i.scale(1024, 1024)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(PROYECTO, 'exterior.glb'), export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_animations=False, export_materials='EXPORT', export_image_format='AUTO', export_jpeg_quality=85)
print('LISTO', {'aletas_cola': n4, 'flotadores': n1, 'soportes': n2, 'centro_cabina': n3, 'kb': round(os.path.getsize(os.path.join(PROYECTO, 'exterior.glb')) / 1024)})
