# Lichi · compara modelos exteriores del AT-802: dimensiones (largo, envergadura, alto) y una vista 3/4 de cada uno.
# Uso: blender.exe -b --factory-startup --python herramientas/comparar_exteriores.py
import bpy, os, json, math
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'blender', 'comparar')
MODELOS = {
    'aaxod_r5': r'C:\Users\ivani\OneDrive\Desktop\AURAV\AT802_AAXOD_r5.glb',
    'aaxod': r'C:\Users\ivani\OneDrive\Desktop\AURAV\at802-aaxod.glb',
    'sector': r'C:\Users\ivani\Documents\aurav-sector\at802.glb',
    'cabina_fsx': os.path.join(RAIZ, 'cabina.glb'),
}
os.makedirs(SALIDA, exist_ok=True)
res = {}
for nombre, ruta in MODELOS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=ruta)
    mallas = [o for o in bpy.data.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in mallas for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    tam = mx - mn
    res[nombre] = {'x': round(tam.x, 2), 'y': round(tam.y, 2), 'z': round(tam.z, 2), 'mallas': len(mallas),
                   'tris': sum(len(o.data.polygons) for o in mallas), 'materiales': len(bpy.data.materials), 'imagenes': len(bpy.data.images)}
    centro = (mn + mx) / 2; r = max(tam) * 1.1
    esc = bpy.context.scene
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); esc.collection.objects.link(cam); esc.camera = cam
    cam.location = centro + Vector((r * 0.9, -r * 1.1, r * 0.55))
    cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler()
    for rot in ((0.8, 0.2, 0.6), (-0.6, 0.3, 2.5)):
        l = bpy.data.objects.new('luz', bpy.data.lights.new('luz', 'SUN')); esc.collection.objects.link(l); l.rotation_euler = rot; l.data.energy = 3
    esc.world = bpy.data.worlds.new('w'); esc.world.color = (0.55, 0.62, 0.7)
    esc.render.engine = 'BLENDER_EEVEE'; esc.render.resolution_x, esc.render.resolution_y = 640, 400
    esc.render.filepath = os.path.join(SALIDA, nombre + '.png'); bpy.ops.render.render(write_still=True)
json.dump(res, open(os.path.join(SALIDA, 'medidas.json'), 'w'), indent=1)
print('MEDIDAS', json.dumps(res))
