# Taller de motores · T2 (adelantada dentro del bloque de la T1, 15/11/2026): la MESA HOLOGRÁFICA y su CUADRANTE · MODELO:
# taller/mesa.glb (PLAN_TALLER.md §5). Mismo método que la cabina: geometría por vértices con cab_comun.py, sin rotaciones euler.
# Marco: el del juego (three.js): +x a la derecha del alumno, +y arriba, +z hacia el alumno; origen en el piso, en el centro de la mesa.
# En Blender: (x, −z, y) (cab_comun.b).
#
# Mesa de 1,60 × 0,80 m con la tapa a 0,90 m (estante abajo, canto de metal). Sobre el canto del alumno, a la derecha, la CAJA DEL
# CUADRANTE (x 0,08…0,62 · z 0,12…0,38 · tope a 0,99) con:
# - tres palancas como las del AT-802, en el mismo orden que la cabina: POTENCIA (plateada, manija en T), HÉLICE (azul) y CONDICIÓN
#   (roja). Eje común en y 0,93 · z 0,25; adelante (−z) = ángulo negativo, como controles.js (−0,9 … 0,15). Un control = UNA malla con
#   UN material (con dos, el GLB la parte y controles.js ve dos palancas).
# - dos botones (btnARRANCAR verde, btnRALENTI gris) y tres lámparas (lampARRANQUE, lampIGNITORES, lampCOMBUSTIBLE).
# Los rótulos NO van en el GLB: el juego los dibuja en una placa de canvas sobre el tope con los datos de userData.cuadrante.
# El proyector (con sus luces aditivas) lo arma el juego (holograma.js, crearProyector) en el centro de la tapa.
#
# Uso: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/taller_mesa.py [-- --vistas <carpeta>]
import bpy, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VISTAS = args[args.index('--vistas') + 1] if '--vistas' in args else None
SALIDA = os.path.join(cc.RAIZ, 'taller', 'mesa.glb')
INFORME = os.path.join(cc.RAIZ, 'taller', 'mesa_informe.json')

MESA = {'ancho': 1.60, 'fondo': 0.80, 'alto': 0.90, 'espesor': 0.04}
CAJA = {'x': (0.08, 0.62), 'z': (0.12, 0.38), 'tope': 0.99}           # caja del cuadrante, sobre la tapa
EJE = {'y': 0.93, 'z': 0.25}                                          # eje común de las palancas (dentro de la caja)
PALANCAS = {   # nombre: x, largo desde el eje, color, perilla (radio) o None = manija en T; rótulo, atrás (adelante, −z), adelante del alumno
    'levPLA': (0.38, 0.20, 'plata', None, 'POTENCIA', 'MÁX', 'RALENTÍ'),
    'levPROP': (0.47, 0.18, 'azul_prop', 0.018, 'HÉLICE', 'MÁX RPM', 'BANDERA'),
    'levCL': (0.56, 0.16, 'rojo', 0.018, 'CONDICIÓN', 'ALTO', 'CORTE'),
}
ANG = {'min': -0.9, 'max': 0.15, 'muescasCL': [0.15, -0.375, -0.9]}  # CONDICIÓN: CORTE · RALENTÍ BAJO · RALENTÍ ALTO
BOTONES = {'btnARRANCAR': (0.135, 'boton_verde', 'ARRANCAR'), 'btnRALENTI': (0.235, 'boton_gris', 'A RALENTÍ')}   # x (centro); sin ▶ ni ↺: con ellos, a 1,5 cm de letra, los rótulos se tocaban
Z_BOTONES = (0.285, 0.330)
# las lámparas en columna con el rótulo al costado: en fila, a 7 cm, los rótulos no pasaban de 0,8 cm (la regla pide 1,5 cm a 1 m)
LAMPARAS = {'lampARRANQUE': (0.152, 'ARRANQUE'), 'lampIGNITORES': (0.195, 'IGNITORES'), 'lampCOMBUSTIBLE': (0.238, 'COMBUSTIBLE')}   # z de cada una
X_LAMPARAS = 0.105
cc.COLORES.update({
    'mesa_tapa': ('#1a1d21', 0.45, 0.15), 'mesa_metal': ('#3b4047', 0.45, 0.7), 'mesa_canto': ('#626a73', 0.32, 0.85),
    'cuadrante': ('#202328', 0.6, 0.1), 'ranura': ('#0a0b0c', 0.9, 0.0), 'boton_verde': ('#2f9e5b', 0.4, 0.0),
    'boton_gris': ('#d4d8dd', 0.45, 0.0), 'lampara': ('#3a3d42', 0.3, 0.0),
})


def cil_y(nombre, cx, cz, y0, y1, r, mat, k=24):
    vs = [(cx + r * math.cos(2 * math.pi * i / k), y, cz + r * math.sin(2 * math.pi * i / k)) for y in (y0, y1) for i in range(k)]
    caras = [tuple(range(k))[::-1], tuple(range(k, 2 * k))] + [(i, (i + 1) % k, k + (i + 1) % k, k + i) for i in range(k)]
    return cc.malla(nombre, vs, caras, mat, cerrada=True)


def esfera(nombre, c, r, mat, n=14, m=9):
    vs = [(c[0], c[1] + r, c[2])]
    for j in range(1, m):
        for i in range(n):
            t, f = math.pi * j / m, 2 * math.pi * i / n
            vs.append((c[0] + r * math.sin(t) * math.cos(f), c[1] + r * math.cos(t), c[2] + r * math.sin(t) * math.sin(f)))
    vs.append((c[0], c[1] - r, c[2]))
    caras = [(0, 1 + (i + 1) % n, 1 + i) for i in range(n)]
    for j in range(m - 2):
        for i in range(n):
            a, b_ = 1 + j * n + i, 1 + j * n + (i + 1) % n
            caras.append((a, b_, b_ + n, a + n))
    ult, base = len(vs) - 1, 1 + (m - 2) * n
    caras += [(ult, base + i, base + (i + 1) % n) for i in range(n)]
    return cc.malla(nombre, vs, caras, mat, cerrada=True)


def unir(destino, extras):
    bpy.ops.object.select_all(action='DESELECT')
    destino.select_set(True)
    for o in extras: o.select_set(True)
    bpy.context.view_layer.objects.active = destino
    bpy.ops.object.join()
    return destino


if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    W, F, A, E = MESA['ancho'] / 2, MESA['fondo'] / 2, MESA['alto'], MESA['espesor']
    piezas = []
    # ---- la mesa: tapa, canto de metal, faldón, patas y estante ----
    piezas.append(cc.caja('tapa', -W, W, A - E, A, -F, F, 'mesa_tapa'))
    c = 0.006
    for nombre, x0, x1, z0, z1 in (('canto_frente', -W - c, W + c, F, F + c), ('canto_fondo', -W - c, W + c, -F - c, -F), ('canto_izq', -W - c, -W, -F, F), ('canto_der', W, W + c, -F, F)):
        piezas.append(cc.caja(nombre, x0, x1, A - E - 0.004, A + 0.002, z0, z1, 'mesa_canto'))
    piezas.append(cc.caja('faldon', -W + 0.04, W - 0.04, A - E - 0.08, A - E, -F + 0.04, F - 0.04, 'mesa_metal'))
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = sx * (W - 0.08), sz * (F - 0.08)
            piezas.append(cc.caja(f'pata_{sx}_{sz}', x - 0.025, x + 0.025, 0.0, A - E - 0.08, z - 0.025, z + 0.025, 'mesa_metal'))
    piezas.append(cc.caja('estante', -W + 0.10, W - 0.10, 0.16, 0.18, -F + 0.10, F - 0.10, 'mesa_metal'))
    # ---- la caja del cuadrante y las ranuras ----
    (x0, x1), (z0, z1), tope = CAJA['x'], CAJA['z'], CAJA['tope']
    piezas.append(cc.caja('cuadrante_caja', x0, x1, A, tope, z0, z1, 'cuadrante'))
    ranura_z = [EJE['z'] + (tope - EJE['y']) * math.tan(a) for a in (ANG['min'], ANG['max'])]   # donde la palanca cruza el tope
    rz0, rz1 = min(ranura_z) - 0.012, max(ranura_z) + 0.012
    for nombre, (x, *_ ) in PALANCAS.items():
        piezas.append(cc.caja(f'ranura_{nombre}', x - 0.008, x + 0.008, tope, tope + 0.0012, rz0, rz1, 'ranura'))
    # ---- las palancas: vara + perilla (o manija en T) del mismo material, unidas en UNA malla ----
    controles = []
    for nombre, (x, largo, color, r, *_ ) in PALANCAS.items():
        y1 = EJE['y'] + largo
        vara = cc.caja(nombre, x - 0.006, x + 0.006, EJE['y'], y1 - (r or 0.012), EJE['z'] - 0.004, EJE['z'] + 0.004, color)
        # manija en T de 5,6 cm (con 7,2 tapaba el rótulo de la hélice, a 9 cm)
        punta = esfera(f'{nombre}_perilla', (x, y1 - r * 0.6, EJE['z']), r, color) if r else cc.caja(f'{nombre}_manija', x - 0.028, x + 0.028, y1 - 0.024, y1, EJE['z'] - 0.014, EJE['z'] + 0.014, color)
        unir(vara, [punta])
        vara.name = nombre
        cc.control(vara, piv=(x, EJE['y'], EJE['z']), eje='x', pivY=EJE['y'], punta=(x, y1, EJE['z']))
        controles.append(vara)
    # ---- botones y lámparas ----
    for nombre, (x, color, _) in BOTONES.items():
        b = cc.caja(nombre, x - 0.035, x + 0.035, tope, tope + 0.016, Z_BOTONES[0], Z_BOTONES[1], color)
        controles.append(b)
    for nombre, (z, _) in LAMPARAS.items():
        controles.append(esfera(nombre, (X_LAMPARAS, tope, z), 0.009, 'lampara', n=12, m=7))
    # ---- datos para el juego (rótulos y mapeo de las palancas) en la caja ----
    tri = sum(cc.tri_count(o) for o in piezas + controles)
    if VISTAS:
        os.makedirs(VISTAS, exist_ok=True)
        for nombre, desde, hacia, lente in (('01_alumno', (0.15, 1.60, 0.95), (0.25, 0.95, 0.20), 24), ('02_cuadrante', (0.62, 1.25, 0.78), (0.40, 0.98, 0.25), 32),
                                            ('03_costado', (1.60, 1.20, 0.20), (0.0, 0.70, 0.0), 22)):
            cc.vista(os.path.join(VISTAS, f'mesa_{nombre}.png'), desde, hacia, lente=lente, res=(1100, 720), fondo=(0.20, 0.22, 0.25))
            print('  vista', nombre)
    # lo estático se une por material; los controles quedan sueltos (cada uno su malla)
    MATS = ('cab_mesa_tapa', 'cab_mesa_canto', 'cab_mesa_metal', 'cab_cuadrante', 'cab_ranura')
    grupos = {mat: [o for o in piezas if o.data.materials[0].name == mat] for mat in MATS}   # ANTES del primer join (CLAUDE.md: los unidos se borran)
    unidos = []
    for mat in MATS:
        grupo = grupos[mat]
        if not grupo: continue
        destino = unir(grupo[0], grupo[1:])
        destino.name = destino.data.name = mat.replace('cab_', '')
        unidos.append(destino)
    caja_o = next(o for o in unidos if o.name == 'cuadrante')
    caja_o['cuadrante'] = json.dumps({
        'caja': CAJA, 'eje': EJE, 'ang': ANG, 'ranura_z': [round(rz0, 4), round(rz1, 4)],
        'palancas': {n: {'x': v[0], 'largo': v[1], 'rotulo': v[4], 'atras': v[5], 'adelante': v[6]} for n, v in PALANCAS.items()},
        'botones': {n: {'x': v[0], 'z': list(Z_BOTONES), 'rotulo': v[2]} for n, v in BOTONES.items()},
        'lamparas': {n: {'x': X_LAMPARAS, 'z': v[0], 'rotulo': v[1]} for n, v in LAMPARAS.items()},
        'mesa': MESA,
    }, ensure_ascii=False)
    for mt in bpy.data.materials: mt.use_backface_culling = False
    todo = unidos + controles
    peso = cc.exportar(todo, SALIDA)
    print(f'  presupuesto → {tri} triángulos · {len(todo)} llamadas ({len(controles)} controles y botones) · {peso / 1e6:.3f} MB')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': 'T2 (adelantada)', 'triangulos': tri, 'llamadas': len(todo), 'mb': round(peso / 1e6, 3), 'controles': [o.name for o in controles],
                   'mesa': MESA, 'caja': CAJA, 'eje': EJE, 'ang': ANG}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
