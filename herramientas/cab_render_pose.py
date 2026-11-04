# Cabina nueva · etapa 0 · el FSN (exterior.glb) renderizado con sus texturas DESDE el punto de una foto 360
# (pose de cab_calcar.py), en las mismas vistas planas que cab_superponer.py: así se compara lo que se ve en
# la foto con lo que se vería en el modelo desde el mismo lugar. También dice qué material toca el rayo en
# las direcciones que se le pidan (para saber si un parante es chapa o vidrio tintado).
# Uso: blender.exe -b --factory-startup --python herramientas/cab_render_pose.py -- <carpeta> [--foto 54] [--afuera]
import bpy, json, math, os, sys
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc

args = sys.argv[sys.argv.index('--') + 1:]
CARPETA = args[0]; N = int(args[args.index('--foto') + 1]) if '--foto' in args else 54; AFUERA = '--afuera' in args
pose = json.load(open(os.path.join(CARPETA, f'pose{N}.json'), encoding='utf-8'))
x, y, z = pose['pos']; R = cc.Panorama.rotacion(pose['yaw'], pose['pitch'], pose['roll'])
VISTAS = {'cabina': (-45, -12, 90), 'parabrisas': (-15, -8, 70), 'puerta': (-75, -15, 80), 'lomo': (-45, 10, 90)} if AFUERA else \
         {'frente': (0, 8, 100), 'parabrisas': (0, 25, 70), 'puerta_izq': (-85, 5, 95), 'puerta_der': (85, 5, 95), 'techo': (0, 70, 120)}

def dir_cam(yaw, pitch):   # marco de la FOTO: yaw negativo = izquierda, pitch positivo = arriba
    ps, pc = math.radians(yaw), math.radians(pitch)
    return Vector((math.sin(ps) * math.cos(pc), math.sin(pc), -math.cos(ps) * math.cos(pc)))

bpy.ops.wm.read_factory_settings(use_empty=True)
casco = cc.Casco()
for o in casco.objetos:
    if o.type == 'MESH':
        for s in o.material_slots:
            if s.material: s.material.use_backface_culling = False
# qué toca el rayo en cada dirección pedida (parantes del parabrisas y marcos de las puertas, en grados de la foto)
dg = bpy.context.evaluated_depsgraph_get()
for nombre, (yaw, pitch) in {'parante izq. parabrisas': (-4.5, 20), 'parante der. parabrisas': (35, 20), 'poste delantero puerta izq.': (-40, 15), 'centro parabrisas': (15, 25)}.items():
    d = R @ dir_cam(yaw, pitch)
    hit, loc, nrm, idx, obj, _ = bpy.context.scene.ray_cast(dg, cc.b((x, y, z)) + cc.b(d) * 0.25, cc.b(d))
    if hit and obj and obj.type == 'MESH':
        mi = obj.data.polygons[idx].material_index; m = obj.material_slots[mi].material.name if mi < len(obj.material_slots) else '?'
        print(f'RAYO {nombre} ({yaw}°, {pitch}°): toca {obj.name} material {m} a {(loc - cc.b((x, y, z))).length:.2f} m en cabina {tuple(round(v, 3) for v in cc.cab(loc))}')
    else: print(f'RAYO {nombre}: nada')

esc = bpy.context.scene
for nombre, (yaw, pitch, hfov) in VISTAS.items():
    d = R @ dir_cam(yaw, pitch)
    cc.vista(os.path.join(CARPETA, f'fsn{N}_{nombre}.png'), (x, y, z), (x + d.x, y + d.y, z + d.z), lente=18 / math.tan(math.radians(hfov) / 2), res=(1200, 800))
    print('RENDER', nombre)
print('LISTO')
