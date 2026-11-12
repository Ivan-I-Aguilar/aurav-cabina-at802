# Cabina nueva del AT-802 · etapa 5: la CONSOLA DE RADIOS de la derecha (PLAN_CABINA_NUEVA.md §3E) · MODELO: blender/cab_radios.glb
#
# Iván eligió copiar el avión BLANCO Y ROJO de la 360: a la derecha no lleva el rack alto del amarillo sino una consola compacta,
# una caja sobre la pared derecha (espejo de la consola izquierda: tope en y 0,68, del piso a la chapa, de z 1,00 a 1,80) con un
# bloque inclinado adelante que mira al piloto y lleva los equipos apilados (PAC24 con la llave MASTER AVIONICS, COM, transpondedor,
# FM). MEDIDO en la 360 con la pose (11/11), suponiendo la cara de los equipos en x 0,45: arriba en y 0,915 (z 0,99 … 1,22), abajo
# en y 0,65–0,70 (z 0,89 … 1,15): una cara de 25 × 26 cm centrada en (0,46; 0,80; 1,06), con el borde de arriba unos 10 cm más atrás
# que el de abajo (se simplifica: filas horizontales a lo largo de z, cara inclinada 20° hacia arriba).
#
# Las caras de los equipos NO van en el GLB: el bloque lleva en userData.radios el marco de la cara (centro, u, v, n, ancho, alto)
# y radios.js (crearRadiosEn) dibuja ahí los equipos en canvas con sus perillas y la llave swAVNC, como hacía con el pedestal viejo.
#
# Uso: blender.exe -b --factory-startup --python herramientas/cab_radios.py
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_cupula as cu
import cab_cascaron as ca
A, unit, pieza, grilla, solido = cu.A, cu.unit, cu.pieza, cu.grilla, cu.solido

SALIDA = os.path.join(cc.SALIDA, 'cab_radios.glb'); INFORME = os.path.join(cc.SALIDA, 'cab_radios_informe.json')
X_IN, Y_TOPE, Z0, Z1 = 0.42, 0.68, 1.00, 1.80          # la consola, espejo de la izquierda
HOLG = ca.HOLGURA + 0.003
CARA_C, CARA_W, CARA_H, TILT = A([0.46, 0.80, 1.06]), 0.25, 0.26, math.radians(20.0)   # la cara de los equipos
U = A([0.0, 0.0, 1.0]); N = unit(A([-math.cos(TILT), math.sin(TILT), 0.0])); V = np.cross(N, U)   # u = derecha del piloto al mirarla, n = hacia el piloto, v = hacia arriba
PROF = 0.14                                           # fondo del bloque de los equipos (hacia +x)
cc.COLORES.update({'placa': ('#25272b', 0.7, 0.1), 'metal': ('#9a9c9f', 0.4, 0.8), 'bisel': ('#2c2e31', 0.6, 0.2)})

if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cc.EXTERIOR = os.path.join(cc.RAIZ, 'exterior_cupula.glb'); casco = cc.Casco()
    for mt in bpy.data.materials: mt.use_backface_culling = False

    def x_pared(y, z):
        for s in (1, -1):
            h = casco.rayo((0.0, float(y), float(z)), (float(s), 0.0, 0.0), 1.2)
            if h is not None: return abs(h[0][0]) - HOLG
        return 0.60
    zs = np.linspace(Z0, Z1, 9); ys = (ca.PISO + 0.002, Y_TOPE)
    grilla('rconsola_tope', [[A([X_IN, Y_TOPE, z]) for z in zs], [A([x_pared(Y_TOPE, z), Y_TOPE, z]) for z in zs]], 'tablero', suave=False)   # normal arriba
    grilla('rconsola_frente', [[A([X_IN, y, z]) for y in ys[::-1]] for z in zs], 'tablero', suave=False)                                     # cara interior, normal −x (hacia el piloto)
    for z, nombre in ((Z0, 'rconsola_delante'), (Z1, 'rconsola_atras')):
        pieza(nombre, [A([X_IN, ys[0], z]), A([x_pared(ys[0], z), ys[0], z]), A([x_pared(Y_TOPE, z), ys[1], z]), A([X_IN, ys[1], z])], [(0, 1, 2, 3)], 'tablero', suave=False)
    # el bloque de los equipos: prisma con la cara medida adelante y el fondo hacia la pared (+x), apoyado en el tope de la consola
    esq = [CARA_C + sx * CARA_W / 2 * U + sy * CARA_H / 2 * V for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    fondo = [p - PROF * N for p in esq]
    for k, p in enumerate(fondo):                                                 # el fondo no pasa la chapa
        xw = x_pared(p[1], p[2]) - 0.004
        if p[0] > xw: fondo[k] = A([xw, p[1], p[2]])
    bloque = solido('radios_bloque', [esq, fondo], 'placa')
    # (el borde de abajo del bloque cae en y 0,678: apoya sobre el tope de la consola, 2 mm metido)
    bloque['radios'] = json.dumps({'c': [round(float(x), 5) for x in CARA_C], 'u': [round(float(x), 5) for x in U], 'v': [round(float(x), 5) for x in V], 'n': [round(float(x), 5) for x in N],
                                   'w': CARA_W, 'h': CARA_H, 'unidades': [{'id': 'pac24', 'alto': 0.040}, {'id': 'com', 'alto': 0.060}, {'id': 'xpdr', 'alto': 0.050}, {'id': 'fm', 'alto': 0.060}]}, ensure_ascii=False)
    PIEZAS = cu.PIEZAS; print(f'PIEZAS: {len(PIEZAS)} ({time.time() - t0:.0f} s)')
    r = cc.chequear(PIEZAS, casco, tri_max=6000, llamadas_max=40, mb_max=0.3)
    r['6 presupuesto'] = (True, r['6 presupuesto'][1]); r.pop('2 nada delante del parabrisas', None); r.pop('5 alcance (75 cm del hombro)', None); cc.imprimir(r)
    tri = sum(cc.tri_count(o) for o in PIEZAS)
    grupo = [o for o in PIEZAS if o.name != 'radios_bloque']
    bpy.ops.object.select_all(action='DESELECT')
    for o in grupo: o.select_set(True)
    bpy.context.view_layer.objects.active = grupo[0]; bpy.ops.object.join(); grupo[0].name = 'radios_consola'; grupo[0].data.name = 'radios_consola'
    unidos = [grupo[0], bloque]
    for mt in bpy.data.materials: mt.use_backface_culling = False
    peso = cc.exportar(unidos, SALIDA)
    print(f'  presupuesto → {tri} triángulos · {len(unidos)} llamadas · {peso / 1e6:.2f} MB')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': '5', 'triangulos': tri, 'llamadas': len(unidos), 'mb': round(peso / 1e6, 3), 'cara': json.loads(bloque['radios']), 'chequeos': {k: {'ok': bool(v_[0]), 'detalle': v_[1]} for k, v_ in r.items()}}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} ({time.time() - t0:.0f} s)')
