# LOD del AT-802 para los otros juegos (15/11): lo llama herramientas/avion_juegos.py, no se corre solo.
# Blender 5.2 en segundo plano: importa el exterior y la hélice ya en el marco de los juegos (con colores por vértice),
# los simplifica con Decimate (colapso) hasta los triángulos de META y los devuelve con sus colores. Los bordes entre
# colores no se mezclan: cada color tiene sus propios vértices (la malla viene partida por material).
#   blender -b --factory-startup --python herramientas/avion_juegos_lod.py -- entrada.glb salida.glb
import sys
import bpy

entrada, salida = sys.argv[sys.argv.index('--') + 1:][:2]
META = {'exterior': 14000, 'helice': 900}          # triángulos por objeto

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=entrada, merge_vertices=False)
for o in [x for x in bpy.context.scene.objects if x.type == 'MESH']:
    me = o.data; n0 = sum(len(p.vertices) - 2 for p in me.polygons)
    meta = META.get(o.name, n0)
    if n0 > meta:
        m = o.modifiers.new('lod', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = meta / n0; m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.modifier_apply(modifier='lod'); o.select_set(False)
    if me.color_attributes: me.color_attributes.active_color = me.color_attributes[0]
    n1 = sum(len(p.vertices) - 2 for p in me.polygons)
    print(f'LOD {o.name}: {n0} -> {n1} triángulos (colores: {[c.name for c in me.color_attributes]})', flush=True)
bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', export_vertex_color='ACTIVE', export_normals=True,
                          export_texcoords=False, export_materials='EXPORT', export_yup=True, export_apply=True)
print('LOD exportado', salida, flush=True)
