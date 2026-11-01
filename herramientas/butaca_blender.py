# Lichi · BUTACA NUEVA del AT-802 (1/11): asiento de UNA pieza (banqueta, respaldo alto, base,
# rieles) + cinturones integrados (hombros y cintura convergiendo en la hebilla), modelada EN SITU
# con cabina.glb de referencia. Exporta blender/butaca.glb + vistas previas con la cabina alrededor.
# Uso (sin abrir Blender):
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/butaca_blender.py
# Coordenadas en el marco de cabina.glb (glTF: +x derecha, +y arriba, +z hacia el piloto). Blender: (x, -z, y).
import bpy, math, os
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'blender')

def b(v): return Vector((v[0], -v[2], v[1]))   # glTF → Blender

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(RAIZ, 'cabina.glb'))
referencia = list(bpy.data.objects)

# --- materiales ---
def mat(nombre, rgb, rough=0.9, metal=0.0):
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m

m_cuerina = mat('cuerina', (0.055, 0.055, 0.050), 0.88)      # gris carbón cálido
m_correa  = mat('correa',  (0.028, 0.075, 0.23), 0.75)       # azul arnés
m_metal   = mat('metal',   (0.42, 0.43, 0.45), 0.35, 0.8)    # hebilla
m_base    = mat('base',    (0.012, 0.012, 0.014), 0.7)       # estructura negra

piezas = []
def caja(nombre, centro, dims, material, rotx=0.0, bisel=0.012):
    """Caja biselada en coords glTF; rotx (rad, glTF: + = tope hacia atrás) alrededor de su centro."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=b(centro))
    o = bpy.context.active_object; o.name = nombre
    o.scale = (dims[0], dims[2], dims[1])          # glTF (ancho, alto, fondo) → Blender (x, y=fondo, z=alto)
    bpy.ops.object.transform_apply(scale=True)
    if rotx:
        o.rotation_euler = (-rotx, 0, 0)           # glTF inclinar hacia atrás = rot X negativa en Blender
        bpy.ops.object.transform_apply(rotation=True)
    mod = o.modifiers.new('bisel', 'BEVEL'); mod.width = bisel; mod.segments = 3; mod.limit_method = 'ANGLE'
    bpy.ops.object.modifier_apply(modifier='bisel')
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(38))
    piezas.append(o); return o

# --- prismas por VÉRTICES en coords glTF: cero rotaciones, cero sorpresas ---
def prisma(nombre, c4, espVec, material, bisel=0.0):
    """c4: 4 esquinas glTF de una cara (en orden); espVec: vector glTF de extrusión."""
    e = Vector(espVec)
    base = [Vector(p) for p in c4]
    verts = [b(tuple(p)) for p in base] + [b(tuple(p + e)) for p in base]
    caras = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(nombre); me.from_pydata([tuple(v) for v in verts], [], caras); me.update()
    o = bpy.data.objects.new(nombre, me); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    if bisel:
        mod = o.modifiers.new('bisel', 'BEVEL'); mod.width = bisel; mod.segments = 3; mod.limit_method = 'ANGLE'
        bpy.ops.object.modifier_apply(modifier='bisel')
    o.data.materials.append(material)
    piezas.append(o); return o

# banqueta (cojín): top y 0,64
caja('banqueta', (0, 0.585, 1.70), (0.72, 0.11, 0.46), m_cuerina, bisel=0.022)
# respaldo ALTO inclinado (cara trasera de (0,60, z 1,955) a (1,44, z 2,045); espesor 10 cm al frente)
prisma('respaldo', [(-0.35, 0.60, 1.955), (0.35, 0.60, 1.955), (0.35, 1.44, 2.045), (-0.35, 1.44, 2.045)],
       (0, 0, -0.10), m_cuerina, bisel=0.02)
# apoyacabeza: sigue la inclinación arriba
prisma('apoyacabeza', [(-0.17, 1.44, 2.043), (0.17, 1.44, 2.043), (0.17, 1.60, 2.060), (-0.17, 1.60, 2.060)],
       (0, 0, -0.088), m_cuerina, bisel=0.018)
# base/cajón estructural bajo la banqueta (tapa el mecanismo y el hueco al piso)
caja('base', (0, 0.42, 1.70), (0.58, 0.24, 0.42), m_base, bisel=0.008)
# rieles al piso
caja('riel_i', (-0.22, 0.285, 1.70), (0.05, 0.05, 0.50), m_base, bisel=0.004)
caja('riel_d', (0.22, 0.285, 1.70), (0.05, 0.05, 0.50), m_base, bisel=0.004)

# --- cinturones: prismas con el ancho PERPENDICULAR al recorrido ---
def zFrente(y): return 1.855 + (y - 0.60) / 0.84 * 0.09 - 0.004   # cara frontal del respaldo − 4 mm

def correa(nombre, A, B, planoVert=True, ancho=0.056, espesor=0.013):
    A = Vector(A); B = Vector(B); d = (B - A).normalized()
    n = Vector((0, 0, 1)) if planoVert else Vector((0, 1, 0))   # espesor: al piloto (hombros) o arriba (cintura)
    lat = d.cross(n).normalized() * (ancho / 2)
    prisma(nombre, [tuple(A - lat), tuple(A + lat), tuple(B + lat), tuple(B - lat)], tuple(n * espesor), m_correa)

# hombros: del respaldo alto a la hebilla, extremos hundidos 2 mm (quedan «cosidos»)
correa('correa_hi', (-0.135, 1.33, zFrente(1.33) - 0.002), (-0.045, 0.72, zFrente(0.72) - 0.002))
correa('correa_hd', (0.135, 1.33, zFrente(1.33) - 0.002), (0.045, 0.72, zFrente(0.72) - 0.002))
# cintura: del costado de la banqueta (hundidas en el cojín) al centro
correa('correa_ci', (-0.33, 0.630, 1.80), (-0.055, 0.655, 1.86), planoVert=False)
correa('correa_cd', (0.33, 0.630, 1.80), (0.055, 0.655, 1.86), planoVert=False)
# hebilla central
bpy.ops.mesh.primitive_cube_add(size=1, location=b((0, 0.70, zFrente(0.70) - 0.014)))
heb = bpy.context.active_object; heb.name = 'hebilla'
heb.scale = (0.095, 0.022, 0.07); bpy.ops.object.transform_apply(scale=True)
heb.data.materials.append(m_metal); piezas.append(heb)

# unir todo en un solo objeto 'butaca'
bpy.ops.object.select_all(action='DESELECT')
for o in piezas: o.select_set(True)
bpy.context.view_layer.objects.active = piezas[0]
bpy.ops.object.join()
butaca = bpy.context.active_object; butaca.name = butaca.data.name = 'butaca'

# --- previews CON la cabina de referencia ---
esc = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); esc.collection.objects.link(cam); esc.camera = cam
luz = bpy.data.objects.new('luz', bpy.data.lights.new('luz', 'SUN')); esc.collection.objects.link(luz)
luz.rotation_euler = (0.9, 0.3, 2.4); luz.data.energy = 4
rel = bpy.data.objects.new('rel', bpy.data.lights.new('rel', 'SUN')); esc.collection.objects.link(rel)
rel.rotation_euler = (1.2, -0.4, -0.7); rel.data.energy = 1.5
esc.render.engine = 'BLENDER_EEVEE'
esc.render.resolution_x, esc.render.resolution_y = 900, 640
esc.world = bpy.data.worlds.new('w'); esc.world.color = (0.35, 0.37, 0.40)
os.makedirs(SALIDA, exist_ok=True)

def vista(nombre, ojo, objetivo):
    cam.location = b(ojo)
    cam.rotation_euler = (b(objetivo) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    esc.render.filepath = os.path.join(SALIDA, f'butaca_{nombre}.png')
    bpy.ops.render.render(write_still=True)

vista('puerta', (-0.52, 1.22, 1.00), (0.08, 0.88, 1.92))  # 3/4 desde el vano de la puerta, ADENTRO
vista('frente', (0.0, 1.12, 0.78), (0.0, 0.98, 1.95))     # desde el tablero, de frente

# --- export: SOLO la butaca ---
for o in referencia:
    try: bpy.data.objects.remove(o, do_unlink=True)
    except Exception: pass
vista('sola', (-1.35, 1.55, 0.55), (0.0, 0.90, 1.9))      # la pieza sola, entera
bpy.ops.object.select_all(action='DESELECT')
butaca.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, 'butaca.glb'), export_format='GLB',
                          use_selection=True, export_yup=True, export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SALIDA, 'butaca.blend'))
print('LISTO butaca.glb', tuple(round(v, 3) for v in butaca.dimensions))
