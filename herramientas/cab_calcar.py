# Cabina nueva · etapa 0 · «calcada»: ubicar el punto exacto desde donde se tomó una foto 360 (Nikon
# KeyMission 360) respecto del fuselaje FSN (exterior.glb) y dejar los búferes para las superposiciones
# con que se decide la integración (A: el FSN coincide con 2 cm o menos; B: sección de cabina nueva).
#
# Cómo: desde cada punto candidato se lanza un rayo por cada píxel de un panorama chico y se anota qué
# toca primero (chapa, vidrio o nada). ADENTRO (DSCN0054, desde el asiento) lo claro de la foto es el
# hangar visto por los VIDRIOS; AFUERA (DSCN0040–0051) lo claro es la CHAPA blanca del avión contra el
# piso gris del hangar. La posición y la orientación que mejor calzan la máscara del modelo con la de
# la foto son las de la toma. Con esa pose se generan los búferes grandes (clase y distancia por píxel)
# con los que cab_superponer.py dibuja las superposiciones y mide las diferencias.
#
# Uso (Blender sin ventana):
#   blender.exe -b --factory-startup --python herramientas/cab_calcar.py -- <carpeta con fotoNN_lum_*.npy> [--foto 54] [--afuera] [--caja x0 x1 y0 y1 z0 z1] [--pose poseNN.json]
#   Sin --pose busca de cero (unos minutos); con --pose sólo genera los búferes de esa pose.
import bpy, json, math, os, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
CARPETA = args[0] if args else os.path.join(cc.RAIZ, 'blender', 'calcado')
FOTO = int(args[args.index('--foto') + 1]) if '--foto' in args else 54
AFUERA = '--afuera' in args
BUSCAR = '--pose' not in args
POSE = args[args.index('--pose') + 1] if '--pose' in args else os.path.join(CARPETA, f'pose{FOTO}.json')
if '--caja' in args: k = args.index('--caja'); CAJA = [float(v) for v in args[k + 1:k + 7]]
else: CAJA = [0.8, 2.2, 0.8, 1.7, 0.8, 3.0] if AFUERA else [-0.15, 0.15, 0.95, 1.5, 1.45, 2.0]   # afuera: parado sobre el ala derecha (DSCN0050)
UMBRAL = 0.50 if AFUERA else 0.45                  # claro en la foto: chapa blanca del avión (0,52-0,69 en DSCN0050; el piso 0,30-0,45) · hangar por los vidrios
LATS = (-55, 15) if AFUERA else (-25, 90)          # franja de latitudes que se compara (afuera: contra el piso gris; adentro: sin el asiento ni el piloto)
DIST, SALTAR = (30.0, 0.0) if AFUERA else (4.0, 0.20)
os.makedirs(CARPETA, exist_ok=True)

def claro(cl):
    """Máscara de lo que en el modelo se vería CLARO: afuera la chapa; adentro el vidrio."""
    return cl == (1 if AFUERA else 2)

def filas_de(H):
    return slice(int(H * (90 - LATS[1]) / 180), int(H * (90 - LATS[0]) / 180))

bpy.ops.wm.read_factory_settings(use_empty=True)
casco = cc.Casco()
pan = cc.Panorama(casco, zona=None if AFUERA else cc.Panorama.__init__.__defaults__[0])   # adentro, sólo la zona de la cabina: los rayos que escapan hacia la cola o el capó cuentan como «nada»
print(f'CALCAR: {pan.n} caras en la zona de cabina ({int((pan.clase == 2).sum())} de vidrio)')
lanzar = lambda o, d: pan.lanzar(o, d, dist=DIST, saltar=SALTAR)
direcciones, rotacion, a_cabina = cc.Panorama.direcciones, cc.Panorama.rotacion, cc.Panorama.a_cabina

def iou(a, b):
    i = np.logical_and(a, b).sum(); u = np.logical_or(a, b).sum()
    return i / u if u else 0.0

def mejor_yaw(mascara_modelo, foto, filas):
    """Desplaza el panorama del modelo columna a columna (= girar la cámara) y devuelve (iou, columnas)."""
    m = mascara_modelo[filas]; f = foto[filas]
    mejor = (-1, 0)
    for s in range(m.shape[1]):
        v = iou(np.roll(m, s, axis=1), f)
        if v > mejor[0]: mejor = (v, s)
    return mejor

t0 = time.time()
pose = None
if BUSCAR:
    # ---- 1. búsqueda gruesa: posición (paso 5 cm) con pitch = roll = 0 y el yaw por desplazamiento ----
    W, H = 180, 90
    foto = np.load(os.path.join(CARPETA, f'foto{FOTO}_lum_{W}.npy')) > UMBRAL
    filas = filas_de(H)
    dirs0 = direcciones(W, H)
    def evaluar(x, y, z, pitch, roll):
        d = a_cabina(dirs0, rotacion(0, pitch, roll))
        cl, _ = lanzar((x, y, z), d)
        return mejor_yaw(claro(cl).reshape(H, W), foto, filas)
    t = time.time(); evaluar(0, 1.2, 1.7, 0, 0); print(f'  ({W}×{H}: {time.time() - t:.2f} s por candidato)')
    mejor = (-1,)
    PASO = 0.10 if AFUERA else 0.05
    for x in np.arange(CAJA[0], CAJA[1] + 1e-6, PASO):
        for y in np.arange(CAJA[2], CAJA[3] + 1e-6, PASO):
            for z in np.arange(CAJA[4], CAJA[5] + 1e-6, PASO):
                v, s = evaluar(x, y, z, 0, 0)
                if v > mejor[0]: mejor = (v, x, y, z, s); print(f'  grueso iou {v:.3f} en ({x:.2f}, {y:.2f}, {z:.2f}) yaw {s * 360 / W:.0f}°')
    v, x, y, z, s = mejor; yaw = s * 2 * np.pi / W
    print(f'GRUESO: iou {v:.3f} en ({x:.3f}, {y:.3f}, {z:.3f}) yaw {math.degrees(yaw):.1f}° ({time.time() - t0:.0f} s)')
    # ---- 2. fino: posición a 1,5 cm, pitch y roll a 1,5°, yaw por desplazamiento (panorama 360×180) ----
    W, H = 360, 180
    foto = np.load(os.path.join(CARPETA, f'foto{FOTO}_lum_{W}.npy')) > UMBRAL
    filas = filas_de(H); dirs0 = direcciones(W, H)
    paso_p, paso_a = (0.06 if AFUERA else 0.03), math.radians(3); pitch = roll = 0.0
    for ronda in range(4):
        mejor = (-1,)
        for dx in (-paso_p, 0, paso_p):
            for dy in (-paso_p, 0, paso_p):
                for dz in (-paso_p, 0, paso_p):
                    for dp in (-paso_a, 0, paso_a):
                        for dr in (-paso_a, 0, paso_a):
                            d = a_cabina(dirs0, rotacion(0, pitch + dp, roll + dr)); cl, _ = lanzar((x + dx, y + dy, z + dz), d)
                            vv, s = mejor_yaw(claro(cl).reshape(H, W), foto, filas)
                            if vv > mejor[0]: mejor = (vv, x + dx, y + dy, z + dz, pitch + dp, roll + dr, s)
        v, x, y, z, pitch, roll, s = mejor; yaw = s * 2 * np.pi / W
        print(f'FINO {ronda}: iou {v:.3f} en ({x:.3f}, {y:.3f}, {z:.3f}) yaw {math.degrees(yaw):.1f}° pitch {math.degrees(pitch):.1f}° roll {math.degrees(roll):.1f}° ({time.time() - t0:.0f} s)')
        paso_p /= 2; paso_a /= 2
    # yaw fino (fracciones de columna) con pitch/roll fijos, re-lanzando rayos
    mejor = (-1,)
    for dyaw in np.radians(np.arange(-1.0, 1.01, 0.25)):
        d = a_cabina(dirs0, rotacion(yaw + dyaw, pitch, roll)); cl, _ = lanzar((x, y, z), d)
        vv = iou(claro(cl).reshape(H, W)[filas], foto[filas])
        if vv > mejor[0]: mejor = (vv, yaw + dyaw)
    v, yaw = mejor
    pose = {'pos': [float(x), float(y), float(z)], 'yaw': float(yaw), 'pitch': float(pitch), 'roll': float(roll), 'iou': float(v),
            'nota': 'marco cabina (m); ángulos en rad; d_cabina = Rx(pitch)·Rz(roll)·Ry(yaw)·d_cámara; yaw positivo = la cámara gira a la izquierda; pitch positivo = mira arriba'}
    with open(POSE, 'w', encoding='utf-8') as f: json.dump(pose, f, indent=1)
    print(f'POSE: {pose} ({time.time() - t0:.0f} s)')
else:
    with open(POSE, encoding='utf-8') as f: pose = json.load(f)
    x, y, z = pose['pos']; yaw, pitch, roll = pose['yaw'], pose['pitch'], pose['roll']

# ---- 3. búferes finales con esa pose: panorama 1440×720 (clase, distancia) en el marco de la CÁMARA ----
W, H = 2880, 1440
R = rotacion(yaw, pitch, roll)
d = a_cabina(direcciones(W, H), R)
cl, di = lanzar((x, y, z), d)
np.save(os.path.join(CARPETA, f'modelo{FOTO}_clase.npy'), cl.reshape(H, W)); np.save(os.path.join(CARPETA, f'modelo{FOTO}_dist.npy'), di.reshape(H, W))
foto = np.load(os.path.join(CARPETA, f'foto{FOTO}_lum_{W}.npy')) > UMBRAL
filas = filas_de(H)
print(f'PANORAMA {W}×{H}: iou {iou(claro(cl).reshape(H, W)[filas], foto[filas]):.3f} ({time.time() - t0:.0f} s)')
# el ojo del piloto del juego, visto desde la foto: dónde cae y cuánto difiere
with open(os.path.join(CARPETA, f'pose{FOTO}_rot.json'), 'w', encoding='utf-8') as f:
    json.dump({'R_cam_a_cabina': [list(r) for r in R], 'pos': [x, y, z], 'ojo_juego': list(cc.OJO),
               'dif_ojo_cm': [round((v - w) * 100, 1) for v, w in zip((x, y, z), cc.OJO)]}, f, indent=1)
print('LISTO', round(time.time() - t0), 's')
