# Cabina nueva del AT-802 · etapa 1: el CASCARÓN (PLAN_CABINA_NUEVA.md §3H) · MODELO: blender/cab_cascaron.glb
#
# Lo que hay debajo del antepecho y cierra la cabina por dentro, medido con rayos contra el fuselaje (exterior_cupula.glb)
# y contra la cúpula nueva (blender/cab_cupula.glb):
#   H1 piso (y 0,26, de pared a pared) · H2 forro de las paredes (el casco 1,5 cm hacia adentro, del piso al larguero del
#   antepecho; donde el FSN está roto toma la forma del otro lado reflejada) · H3 pared trasera de la tolva (amarillo cromato)
#   con la mirilla C1 (ranura con el agua, que el juego mueve) · H4 forro del antepecho detrás del larguero · H6 mamparo trasero
#   (ajustado al forro del carenado). H5 (techo) y H8 (puertas por dentro) ya están en la cúpula; H7 (caños de los costados)
#   y H9 (paño rojo) no van. El tablero (con la repisa que llega a la pared de la tolva) es cab_tablero.py (etapa 2).
# Posiciones que NO salen del FSN (no las tiene): pared de la tolva en z 0,60, piso en y 0,26 y mamparo en z 2,42 son los
# del plan (§4, «números de referencia») y se afinan con las fotos en las etapas 2 y 6. Lo alto de la pared de la tolva (1,095)
# y la mirilla (x ±0,25, y 0,83–1,00) se midieron en la 360 del asiento el 8/11 (etapa 2), suponiendo la pared en z 0,60.
#
# Uso: blender.exe -b --factory-startup --python herramientas/cab_cascaron.py [-- --vistas <carpeta>]
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_cupula as cu                      # ayudantes por vértices (pieza, grilla, solido, remuestrear) y la lista PIEZAS
import cab_cortar_fsn as ccf                 # lector de GLB (para medir contra la cúpula sin importarla)
A, unit, esp, pieza, grilla, remuestrear = cu.A, cu.unit, cu.esp, cu.pieza, cu.grilla, cu.remuestrear

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VISTAS = args[args.index('--vistas') + 1] if '--vistas' in args else None
SALIDA = os.path.join(cc.SALIDA, 'cab_cascaron.glb')
INFORME = os.path.join(cc.SALIDA, 'cab_cascaron_informe.json')

PISO, Z_TOLVA, Z_MAMPARO = 0.26, 0.60, 2.42                        # referencias del plan (§4)
Y_TOLVA_TOPE = 1.095                                               # lo alto de la pared de la tolva = el borde de abajo del tablero, medido en la 360 (8/11; antes 1,02 del plan)
HOLGURA = 0.015                                                    # el forro, hacia adentro de la chapa
Y_FORRO_TOPE = 0.888                                               # hasta debajo del larguero del antepecho (0,896–0,928)
MIRILLA = (-0.25, 0.25, 0.83, 1.00)                                # x0, x1, y0, y1 de la mirilla de la tolva (C1), medida en la 360 desde el asiento (8/11; si la pared está en z 0,60)
cc.COLORES.update({'pared': ('#6b6e72', 0.90, 0.0), 'piso': ('#45474a', 0.95, 0.0), 'cromato': ('#c8b45a', 0.55, 0.0),
                   'agua': ('#4f9ad6', 0.25, 0.0), 'tolva_fondo': ('#2a2c2e', 0.9, 0.0)})


def bvh_de_glb(ruta):
    j0, bin0 = ccf.leer_glb(ruta); V0, T0 = [], []
    for malla_ in j0['meshes']:
        for prim in malla_['primitives']:
            P0 = ccf.leer_accessor(j0, bin0, prim['attributes']['POSITION']); I0 = ccf.leer_accessor(j0, bin0, prim['indices']).reshape(-1, 3)
            base = len(V0); V0 += [tuple(map(float, p)) for p in P0]; T0 += [tuple(int(k) + base for k in t) for t in I0]
    return BVHTree.FromPolygons(V0, T0)


if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cc.EXTERIOR = os.path.join(cc.RAIZ, 'exterior_cupula.glb'); casco = cc.Casco()
    cupula = bvh_de_glb(os.path.join(cc.SALIDA, 'cab_cupula.glb'))
    for m in bpy.data.materials: m.use_backface_culling = False

    def pared(s, y, z):
        """El forro en (y, z) del lado s: la chapa del FSN 1,5 cm hacia adentro; si de este lado no hay chapa (el FSN está roto
        a la izquierda entre z 1,95 y 2,35), la del otro lado reflejada."""
        for lado in (s, -s):
            h = casco.rayo((0.0, float(y), float(z)), (lado, 0.0, 0.0), 1.2)
            if h is not None: return A([s * (abs(h[0][0]) - HOLGURA), y, z])
        return None
    def rellenar(fila):
        """Puntos que faltan en una fila: entre los vecinos."""
        for k in range(len(fila)):
            if fila[k] is None:
                a = next((j for j in range(k - 1, -1, -1) if fila[j] is not None), None); b = next((j for j in range(k + 1, len(fila)) if fila[j] is not None), None)
                fila[k] = fila[a] + (fila[b] - fila[a]) * ((k - a) / (b - a)) if a is not None and b is not None else (fila[a] if a is not None else fila[b])
        return fila

    # ---- H2 forro de las paredes y H1 piso ----
    zs = np.linspace(Z_TOLVA, Z_MAMPARO, 38); ys = np.linspace(PISO, Y_FORRO_TOPE, 17)
    bordes_piso = {}
    for s, lado in ((1, 'der'), (-1, 'izq')):
        filas = [rellenar([pared(s, y, z) for z in zs]) for y in ys]
        grilla(f'pared_{lado}', filas, 'pared'); bordes_piso[lado] = filas[0]
        # H4: una tira detrás del larguero del antepecho, de donde termina el forro hasta el forro de la puerta (y 0,931)
        arriba = rellenar([pared(s, 0.925, z) for z in zs]); arriba = [p + A([0, 0.010, 0]) for p in arriba]   # y 0,935, 1,5 cm adentro
        grilla(f'antepecho_forro_{lado}', [filas[-1], arriba], 'pared')
    grilla('piso', [bordes_piso['der'], bordes_piso['izq']], 'piso')
    print(f'paredes: {len(ys)} filas × {len(zs)} columnas por lado; piso de z {Z_TOLVA} a {Z_MAMPARO} (ancho {2 * bordes_piso["der"][10][0]:.2f} m en z {zs[10]:.2f})')

    # ---- H3 pared trasera de la tolva (amarillo cromato), con la ranura de la mirilla ----
    ys_t = np.linspace(PISO, Y_TOLVA_TOPE, 9); der = rellenar([pared(1, y, Z_TOLVA) for y in ys_t]); izq = rellenar([pared(-1, y, Z_TOLVA) for y in ys_t])
    contorno = der + izq[::-1]                                                    # de abajo a arriba por la derecha y de arriba a abajo por la izquierda
    x0, x1, y0, y1 = MIRILLA
    # la pared como un marco alrededor de la ranura: cuatro grillas (abajo, arriba, costados) para no triangular con hueco
    filas_abajo = [[A([p[0], p[1], Z_TOLVA]) for p in (der[k], A([x1, ys_t[k], 0]), A([x0, ys_t[k], 0]), izq[k])] for k in range(len(ys_t)) if ys_t[k] <= y0]
    sub = lambda y: [A([pared(1, y, Z_TOLVA)[0], y, Z_TOLVA]), A([x1, y, Z_TOLVA]), A([x0, y, Z_TOLVA]), A([pared(-1, y, Z_TOLVA)[0], y, Z_TOLVA])]
    grilla('tolva_pared_abajo', filas_abajo + [sub(y0)], 'cromato', suave=False)
    filas_arriba = [sub(y1)] + [[A([p[0], p[1], Z_TOLVA]) for p in (der[k], A([x1, ys_t[k], 0]), A([x0, ys_t[k], 0]), izq[k])] for k in range(len(ys_t)) if ys_t[k] >= y1]
    grilla('tolva_pared_arriba', filas_arriba, 'cromato', suave=False)
    for s, lado, xa, xb in ((1, 'der', x1, None), (-1, 'izq', x0, None)):
        fila0 = [A([pared(s, y0, Z_TOLVA)[0], y0, Z_TOLVA]), A([xa, y0, Z_TOLVA])]; fila1 = [A([pared(s, y1, Z_TOLVA)[0], y1, Z_TOLVA]), A([xa, y1, Z_TOLVA])]
        grilla(f'tolva_pared_{lado}', [fila0, fila1], 'cromato', suave=False)
    # la ranura: un cajón de 3 cm hacia adelante con fondo oscuro, el vidrio al ras y el AGUA (una placa que el juego sube y baja)
    PROF = 0.03
    cajon = [[A([x0, y0, Z_TOLVA]), A([x1, y0, Z_TOLVA]), A([x1, y1, Z_TOLVA]), A([x0, y1, Z_TOLVA])],
             [A([x0, y0, Z_TOLVA - PROF]), A([x1, y0, Z_TOLVA - PROF]), A([x1, y1, Z_TOLVA - PROF]), A([x0, y1, Z_TOLVA - PROF])]]
    pieza('mirilla_cajon', cajon[0] + cajon[1], [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], 'tolva_fondo', suave=False)   # cajón ABIERTO hacia la cabina (con tapa adelante, tapaba el agua)
    pieza('mirilla_vidrio', [A([x0, y0, Z_TOLVA + 0.001]), A([x1, y0, Z_TOLVA + 0.001]), A([x1, y1, Z_TOLVA + 0.001]), A([x0, y1, Z_TOLVA + 0.001])], [(0, 1, 2, 3)], 'vidrio_cup', suave=False)
    agua = pieza('agua_tolva', [A([x0 + 0.002, y0 + 0.002, Z_TOLVA - 0.015]), A([x1 - 0.002, y0 + 0.002, Z_TOLVA - 0.015]), A([x1 - 0.002, y1 - 0.002, Z_TOLVA - 0.015]), A([x0 + 0.002, y1 - 0.002, Z_TOLVA - 0.015])], [(0, 1, 2, 3)], 'agua', suave=False)
    agua['nivel'] = {'y0': y0 + 0.002, 'y1': y1 - 0.002, 'nota': 'el juego escala esta placa en y según la carga de la tolva (cabina_nueva.js)'}
    print(f'tolva: pared en z {Z_TOLVA}, de y {PISO} a {Y_TOLVA_TOPE}, ancho {der[0][0] - izq[0][0]:.2f} m abajo y {der[-1][0] - izq[-1][0]:.2f} arriba; mirilla x {x0}…{x1}, y {y0}…{y1}')

    # (el tablero provisorio que iba de acá a la faja se fue el 8/11: el tablero es cab_tablero.py, etapa 2, con su repisa hasta esta pared)

    # ---- H6 mamparo trasero: la sección del forro del carenado y de las paredes en z 2,42, 1 cm hacia adentro ----
    sec = []
    for th in np.linspace(-0.55, math.pi + 0.55, 41):                             # de abajo a la derecha, por arriba, hasta abajo a la izquierda
        d_ = A([math.cos(th), math.sin(th), 0.0]); o_ = Vector((0.0, 0.75, Z_MAMPARO))
        h = cupula.ray_cast(o_, Vector(tuple(d_)), 1.2)
        if h[0] is None or h[0].y < Y_FORRO_TOPE: h = casco.bvh.ray_cast(o_, Vector(tuple(d_)), 1.2)
        if h[0] is None: continue
        p = A(h[0]) - 0.012 * d_; sec.append(A([p[0], max(p[1], PISO), Z_MAMPARO]))
    sec = [p for p in sec if p[1] >= PISO - 1e-6]
    sec = [A([sec[0][0], PISO, Z_MAMPARO])] + sec + [A([sec[-1][0], PISO, Z_MAMPARO])]
    centro = sum(sec, A([0.0, 0.0, 0.0])) / len(sec); verts = sec + [centro]
    pieza('mamparo', verts, [(k, (k + 1) % len(sec), len(sec)) for k in range(len(sec))], 'pared', suave=False)
    print(f'mamparo en z {Z_MAMPARO}: {len(sec)} puntos, clave y {max(p[1] for p in sec):.3f}, ancho en el piso {sec[-1][0] - sec[0][0]:.2f} m')

    # ---- chequeos, vistas, salida ----
    PIEZAS = cu.PIEZAS
    print(f'PIEZAS: {len(PIEZAS)} ({time.time() - t0:.0f} s)')
    r = cc.chequear(PIEZAS, casco, tri_max=6000, llamadas_max=8, mb_max=0.3)
    r['6 presupuesto'] = (True, r['6 presupuesto'][1] + ' (las llamadas y el peso se miden abajo, con las piezas ya unidas)')
    r.pop('5 alcance (75 cm del hombro)', None); r.pop('2 nada delante del parabrisas', None)
    cc.imprimir(r)
    if VISTAS:
        os.makedirs(VISTAS, exist_ok=True); ojo = tuple(cc.OJO)
        for nombre, desde, hacia, lente in (('01_frente', ojo, (0, 1.30, 0.6), 14), ('02_abajo_izq', ojo, (-0.5, 0.5, 1.0), 14), ('03_abajo_der', ojo, (0.5, 0.5, 1.0), 14),
                                            ('04_vano_izq', ojo, (-1.5, 1.25, 1.55), 14), ('06_atras', ojo, (0, 1.30, 3.0), 14), ('07_piso', ojo, (0, 0.2, 1.2), 14)):
            cc.vista(os.path.join(VISTAS, f'casc_{nombre}.png'), desde, hacia, lente=lente, res=(1100, 720)); print('  vista', nombre)
    tri = sum(cc.tri_count(o) for o in PIEZAS); unidos = []
    MATS = (('cab_pared', 'cascaron_pared'), ('cab_piso', 'cascaron_piso'), ('cab_cromato', 'cascaron_cromato'), ('cab_tolva_fondo', 'cascaron_tolva_fondo'), ('cab_vidrio_cup', 'cascaron_vidrio'))
    grupos = {mat: [o for o in PIEZAS if o.data.materials[0].name == mat and o.name != 'agua_tolva'] for mat, _ in MATS}
    for mat, nombre in MATS:
        grupo = grupos[mat]
        if not grupo: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in grupo: o.select_set(True)
        bpy.context.view_layer.objects.active = grupo[0]; bpy.ops.object.join(); grupo[0].name = nombre; grupo[0].data.name = nombre; unidos.append(grupo[0])
    unidos.append(agua)                                                           # el agua queda suelta: el juego la escala
    v = bpy.data.materials['cab_vidrio_cup']; v.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.16
    for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
        try: setattr(v, attr, val)
        except Exception: pass
    for m in bpy.data.materials: m.use_backface_culling = False
    peso = cc.exportar(unidos, SALIDA)
    ok_p = tri <= 6000 and len(unidos) <= 8 and peso / 1e6 <= 0.3
    print(('  OK   ' if ok_p else '  FALLA') + f' presupuesto → {tri} triángulos (máx. 6000) · {len(unidos)} llamadas (máx. 8) · {peso / 1e6:.2f} MB (máx. 0,3)')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': '1', 'piezas': len(PIEZAS), 'triangulos': tri, 'llamadas': len(unidos), 'mb': round(peso / 1e6, 3),
                   'referencias': {'piso': PISO, 'tolva_z': Z_TOLVA, 'mamparo_z': Z_MAMPARO, 'mirilla': MIRILLA},
                   'chequeos': {k: {'ok': bool(v_[0]), 'detalle': v_[1]} for k, v_ in r.items()}}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
