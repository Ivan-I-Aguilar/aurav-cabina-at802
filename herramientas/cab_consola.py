# Cabina nueva del AT-802 · etapa 4: la PARED IZQUIERDA (PLAN_CABINA_NUEVA.md §3D) · MODELO: blender/cab_consola.glb
#
# Consola negra a lo largo de la pared izquierda (de x −0,40 hasta la chapa, tope en y 0,68, de z 1,00 a 1,80), panel negro sobre la
# pared encima de ella (hasta el antepecho) con la manija roja FUEL (MAIN · OFF) y la perilla naranja TURN TO LO…, el cuadrante con
# sus tres palancas sobre un eje común (x) que asoman por una ranura del tope (POWER plateada con manija, PROP con perilla azul,
# CONDITION con perilla roja), el dial RUDDER TRIM horizontal sobre el tope, el volante del trim de profundidad medio hundido, la
# llave AILERON TRIM, y la manija naranja E-DUMP (la del avión blanco y rojo: «DUMP») en el piso, junto a la rodilla izquierda.
#
# MEDIDO en la 360 del asiento con la pose (11/11): la cámara mira la consola muy de arriba, así que la 360 da bien el largo (tope de
# la consola de z 1,05 a 1,68 junto a la pared), la altura del tope (y ≈ 0,68–0,70 contra la pared) y el orden de las piezas (dial
# atrás en z 1,62; cuadrante en z 1,3–1,45; FUEL en la pared a z 1,42; DUMP adelante y adentro, z 1,30, x −0,33); el ANCHO de la
# consola y la x de las perillas quedan atados a la altura que se les suponga (una cámara): con las perillas a 5 cm del tope salen
# en x −0,35…−0,31, 25 cm adentro de la chapa, como la consola ancha de la foto del amarillo. Se toma x −0,40 para el borde interior.
#
# Controles (nombres que ya usa el juego): levPOT, levHEL, levCOND (pivote en la base, adelante = ángulo negativo), swFUEL (pos: OFF ·
# MAIN, estado 0 = OFF corta el combustible y, en la cabina nueva, hace de «FIRE» para la misión), swK_TRIMTIMON (7 posiciones sobre y),
# swK_TRIMPROF (volante, 11 posiciones sobre x), swTRIMALERON (3 posiciones, vuelve sola), levEDUMP (adelante = larga todo).
# Los rótulos van como en la etapa 3: userData.panel (JSON) y pantallas.js (Rotulos).
#
# Uso: blender.exe -b --factory-startup --python herramientas/cab_consola.py [-- --vistas <carpeta>]
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_cupula as cu
import cab_cascaron as ca
import cab_llaves as cl
A, unit, pieza, grilla, solido = cu.A, cu.unit, cu.pieza, cu.grilla, cu.solido
Marco, llave, aro = cl.Marco, cl.llave, cl.aro

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VISTAS = args[args.index('--vistas') + 1] if '--vistas' in args else None
SALIDA = os.path.join(cc.SALIDA, 'cab_consola.glb'); INFORME = os.path.join(cc.SALIDA, 'cab_consola_informe.json')

X_IN, Y_TOPE, Z0, Z1 = -0.40, 0.68, 1.00, 1.80          # consola: borde interior, tope, extremos
Y_PISO = ca.PISO; HOLG = ca.HOLGURA + 0.003               # 3 mm por dentro del forro del cascarón
CUADRANTE = {'levCOND': (-0.425, 0.24, 'rojo', 0.016), 'levHEL': (-0.465, 0.28, 'azul_prop', 0.016), 'levPOT': (-0.505, 0.33, 'plata', None)}   # x, largo desde el eje, color (None = manija): las perillas asoman 7 a 11 cm sobre el tope
Y_EJE, Z_EJE = 0.52, 1.45                                 # eje común de las palancas, dentro de la consola
DIAL = (-0.50, 1.62, 0.045)                               # RUDDER TRIM: x, z, radio (sobre el tope)
VOLANTE = (-0.50, 1.26, 0.06)                             # trim de profundidad: x, z, radio (eje x, medio hundido en el tope)
AILERON = (-0.44, 1.15)                                   # llave AILERON TRIM (x, z) sobre el tope
PLACA = (0.93, 1.00, 1.80)                                # panel negro en la pared: hasta y, de z a z
FUEL = (0.76, 1.42)                                       # manija FUEL (y, z) en el panel de la pared
FRICCION = (0.80, 1.56)                                   # perilla naranja TURN TO LO… (y, z)
DUMP = (-0.33, 0.40, 1.30, 0.30)                          # E-DUMP: x, y del pivote, z, largo
cc.COLORES.update({'placa': ('#25272b', 0.7, 0.1), 'metal': ('#9a9c9f', 0.4, 0.8), 'bisel': ('#2c2e31', 0.6, 0.2), 'caratula': ('#121212', 0.8, 0.0)})


def caja_xyz(nombre, x0, x1, y0, y1, z0, z1, mat):
    return solido(nombre, [[A([x0, y0, z]), A([x1, y0, z]), A([x1, y1, z]), A([x0, y1, z])] for z in (z0, z1)], mat)

def cilindro_eje_x(nombre, x0, x1, cy, cz, r, mat, k=20):
    return solido(nombre, [[A([x, cy + r * math.cos(2 * math.pi * i / k), cz + r * math.sin(2 * math.pi * i / k)]) for i in range(k)] for x in (x0, x1)], mat)

def cilindro_eje_y(nombre, cx, cz, y0, y1, r, mat, k=20):
    return solido(nombre, [[A([cx + r * math.cos(2 * math.pi * i / k), y, cz + r * math.sin(2 * math.pi * i / k)]) for i in range(k)] for y in (y0, y1)], mat)

def bola(nombre, c, r, mat): return cu.esfera(nombre, c, r, mat, n=10, m=6)

def datos_panel(c, u, v, n, w, h, titulos, items):
    return json.dumps({'c': [round(float(x), 5) for x in c], 'u': list(u), 'v': list(v), 'n': list(n), 'w': w, 'h': h,
                       'titulos': [{'t': t_, 's': round(s_, 4), 'y': round(y_, 4)} for t_, s_, y_ in titulos], 'items': items}, ensure_ascii=False)


if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cc.EXTERIOR = os.path.join(cc.RAIZ, 'exterior_cupula.glb'); casco = cc.Casco()
    for mt in bpy.data.materials: mt.use_backface_culling = False
    controles = []

    def x_pared(y, z):
        """La chapa del lado izquierdo en (y, z), 3 mm por dentro del forro del cascarón (si no hay chapa, el otro lado reflejado)."""
        for s in (-1, 1):
            h = casco.rayo((0.0, float(y), float(z)), (float(s), 0.0, 0.0), 1.2)
            if h is not None: return -(abs(h[0][0]) - HOLG)
        return -0.60

    # ---- D1 la consola: caja del piso al tope, pegada a la pared (el lado de la pared sigue la chapa) ----
    zs = np.linspace(Z0, Z1, 9); ys = (Y_PISO + 0.002, Y_TOPE)
    tope = [[A([x_pared(Y_TOPE, z), Y_TOPE, z]) for z in zs], [A([X_IN, Y_TOPE, z]) for z in zs]]
    grilla('consola_tope', tope, 'tablero', suave=False)                                               # normal hacia arriba
    grilla('consola_frente', [[A([X_IN, y, z]) for y in ys] for z in zs], 'tablero', suave=False)          # cara interior (hacia el piloto)
    for z, nombre in ((Z0, 'consola_delante'), (Z1, 'consola_atras')):
        pieza(nombre, [A([X_IN, ys[0], z]), A([X_IN, ys[1], z]), A([x_pared(Y_TOPE, z), ys[1], z]), A([x_pared(ys[0], z), ys[0], z])], [(0, 1, 2, 3)], 'tablero', suave=False)
    # panel negro sobre la pared, del tope al antepecho, 1 cm por dentro de la pared
    placa_pared = grilla('pared_panel', [[A([x_pared(y, z) + 0.010, y, z]) for z in zs] for y in (PLACA[0], Y_TOPE)], 'placa', suave=False)   # normal hacia el piloto (+x)
    # ---- D2 cuadrante: ranura en el tope (una caja oscura hundida) y tres palancas sobre el eje x en (Y_EJE, Z_EJE) ----
    caja_xyz('cuadrante_ranura', -0.53, -0.41, Y_TOPE - 0.03, Y_TOPE + 0.001, Z_EJE - 0.20, Z_EJE + 0.08, 'caratula')
    caja_xyz('cuadrante_marco', -0.535, -0.405, Y_TOPE + 0.001, Y_TOPE + 0.006, Z_EJE - 0.205, Z_EJE + 0.085, 'bisel')
    for nombre, (x, largo, color, r) in CUADRANTE.items():
        y1 = Y_EJE + largo
        if r is not None:
            vara = [[A([x - 0.004, Y_EJE, Z_EJE - 0.004]), A([x + 0.004, Y_EJE, Z_EJE - 0.004]), A([x + 0.004, Y_EJE, Z_EJE + 0.004]), A([x - 0.004, Y_EJE, Z_EJE + 0.004])],
                    [A([x - 0.004, y1 - r, Z_EJE - 0.004]), A([x + 0.004, y1 - r, Z_EJE - 0.004]), A([x + 0.004, y1 - r, Z_EJE + 0.004]), A([x - 0.004, y1 - r, Z_EJE + 0.004])]]
            pal = solido(nombre, vara, color); bola(f'{nombre}_perilla', (x, y1 - r * 0.6, Z_EJE), r, color)   # vara y perilla del MISMO material: con dos, el GLB parte la palanca en dos mallas (levCOND_1/_2) y controles.js ve dos palancas
        else:                                                                     # POWER: palanca chata con manija en T (cromada)
            pal = solido(nombre, [[A([x - 0.006, Y_EJE, Z_EJE - 0.004]), A([x + 0.006, Y_EJE, Z_EJE - 0.004]), A([x + 0.006, Y_EJE, Z_EJE + 0.004]), A([x - 0.006, Y_EJE, Z_EJE + 0.004])],
                                  [A([x - 0.006, y1 - 0.02, Z_EJE - 0.004]), A([x + 0.006, y1 - 0.02, Z_EJE - 0.004]), A([x + 0.006, y1 - 0.02, Z_EJE + 0.004]), A([x - 0.006, y1 - 0.02, Z_EJE + 0.004])]], 'plata')
            caja_xyz(f'{nombre}_manija', x - 0.012, x + 0.040, y1 - 0.025, y1, Z_EJE - 0.014, Z_EJE + 0.014, 'plata')   # la manija asoma hacia el piloto (+x); mismo material que la palanca (ver arriba)
        pal.name = nombre; controles.append(pal)
    # las perillas y la manija son piezas aparte: para que giren con la palanca se unen a ella al exportar (ver abajo)
    # ---- D3 manija FUEL en el panel de la pared: placa, eje y palanca roja (swFUEL: pos OFF · MAIN sobre x; estado 0 = OFF) ----
    xf = max(x_pared(FUEL[0] + dy, FUEL[1] + dz) for dy in (-0.045, 0, 0.045) for dz in (-0.045, 0, 0.045)) + 0.010   # la chapa más metida de toda la placa (la pared se inclina)
    mFuel = Marco((xf + 0.001, FUEL[0] + 0.045, FUEL[1] - 0.045), (0, 0, 1), (0, 1, 0), (1, 0, 0))   # placa de 9 × 9 cm mirando al piloto (+x): s por +z, t hacia abajo
    pf = caja_xyz('fuel_placa', xf - 0.006, xf + 0.004, FUEL[0] - 0.045, FUEL[0] + 0.045, FUEL[1] - 0.045, FUEL[1] + 0.045, 'caratula')
    cilindro_eje_x('fuel_eje', xf + 0.004, xf + 0.020, FUEL[0], FUEL[1], 0.009, 'metal', k=12)
    fuel = solido('swFUEL', [[A([xf + 0.012 + dx, FUEL[0] + dy, FUEL[1] + dz]) for dx, dy, dz in ((0, -0.006, -0.006), (0, -0.006, 0.006), (0, 0.006, 0.006), (0, 0.006, -0.006))],
                             [A([xf + 0.012 + dx, FUEL[0] + dy, FUEL[1] + dz]) for dx, dy, dz in ((0.028, 0.075, -0.005), (0.028, 0.075, 0.005), (0.036, 0.085, 0.005), (0.036, 0.085, -0.005))]], 'rojo')   # vertical (hacia arriba) = MAIN
    cc.control(fuel, piv=(xf + 0.012, FUEL[0], FUEL[1]), eje='x', pos=[-math.pi / 2, 0.0], inicial=1, punta=(xf + 0.03, FUEL[0] + 0.08, FUEL[1]))   # OFF = tumbada hacia adelante (−z)
    controles.append(fuel)
    pf['panel'] = datos_panel(mFuel.p(0.045, 0.045, 0.0045), (0, 0, 1), (0, 1, 0), (1, 0, 0), 0.09, 0.09, [('FUEL', 0.045, 0.014)], [{'s': 0.045, 't': 0.010, 'tipo': 'texto', 'rotulo': 'MAIN'}, {'s': 0.012, 't': 0.045, 'tipo': 'texto', 'rotulo': 'OFF'}])
    # ---- D4 perilla naranja TURN TO LO… (fricción del cuadrante), decorativa ----
    xo = x_pared(FRICCION[0], FRICCION[1]) + 0.010
    cilindro_eje_x('friccion_perilla', xo - 0.012, xo + 0.025, FRICCION[0], FRICCION[1], 0.016, 'naranja', k=16)   # nace dentro de la pared: el panel es una grilla gruesa y a veces queda 2 cm más adentro
    # ---- D8 dial RUDDER TRIM sobre el tope (swK_TRIMTIMON: 7 posiciones sobre y) y su placa con los rótulos ----
    dx_, dz_, dr = DIAL
    pd = cilindro_eje_y('trim_timon_placa', dx_, dz_, Y_TOPE, Y_TOPE + 0.003, dr + 0.03, 'placa', k=28)
    dial = cilindro_eje_y('swK_TRIMTIMON', dx_, dz_, Y_TOPE + 0.003, Y_TOPE + 0.016, dr, 'bisel', k=24)
    indice = caja_xyz('swK_TRIMTIMON_indice', dx_ - 0.004, dx_ + 0.004, Y_TOPE + 0.016, Y_TOPE + 0.022, dz_ - dr + 0.004, dz_, 'bisel')   # índice en relieve, mismo material (dos materiales parten la malla)
    cc.control(dial, piv=(dx_, Y_TOPE + 0.003, dz_), eje='y', pos=[k * math.pi / 3 for k in (-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1)], inicial=3, punta=(dx_, Y_TOPE + 0.02, dz_)); controles.append(dial)
    mD = Marco((dx_ - dr - 0.03, Y_TOPE + 0.0035, dz_ - dr - 0.03), (1, 0, 0), (0, 0, -1), (0, 1, 0))   # placa horizontal: s por +x, t hacia +z (hacia el piloto), mira arriba
    pd['panel'] = datos_panel(mD.p(dr + 0.03, dr + 0.03, 0), (1, 0, 0), (0, 0, -1), (0, 1, 0), 2 * (dr + 0.03), 2 * (dr + 0.03), [('RUDDER TRIM', dr + 0.03, 0.012)],
                              [{'s': 0.014, 't': dr + 0.03, 'tipo': 'texto', 'rotulo': 'NOSE\nLEFT'}, {'s': 2 * dr + 0.046, 't': dr + 0.03, 'tipo': 'texto', 'rotulo': 'NOSE\nRIGHT'},
                               {'s': dr + 0.03 - 0.045, 't': 0.03, 'tipo': 'texto', 'rotulo': 'TAKEOFF'}, {'s': dr + 0.03, 't': 0.026, 'tipo': 'texto', 'rotulo': 'CLIMB'}, {'s': dr + 0.03 + 0.045, 't': 0.03, 'tipo': 'texto', 'rotulo': 'CRUISE'}])
    # ---- D7 volante del trim de profundidad (swK_TRIMPROF: 11 posiciones sobre x), medio hundido en el tope, con su ranura ----
    vx, vz, vr = VOLANTE
    caja_xyz('trim_prof_ranura', vx - 0.012, vx + 0.012, Y_TOPE - vr, Y_TOPE + 0.002, vz - vr - 0.005, vz + vr + 0.005, 'caratula')
    volante = cilindro_eje_x('swK_TRIMPROF', vx - 0.009, vx + 0.009, Y_TOPE - 0.5 * vr, vz, vr, 'goma', k=24)
    cc.control(volante, piv=(vx, Y_TOPE - 0.5 * vr, vz), eje='x', pos=[k * 0.25 for k in range(-5, 6)], inicial=5, punta=(vx, Y_TOPE + 0.5 * vr, vz)); controles.append(volante)
    for s_, nombre in ((-1, 'NOSE DOWN'), (1, 'NOSE UP')):
        pass
    # ---- D5 llave AILERON TRIM (3 posiciones, vuelve sola) sobre el tope, con su placa ----
    ax, az = AILERON
    mA = Marco((ax - 0.03, Y_TOPE + 0.002, az - 0.035), (1, 0, 0), (0, 0, -1), (0, 1, 0))
    pa = caja_xyz('aileron_placa', ax - 0.03, ax + 0.03, Y_TOPE, Y_TOPE + 0.002, az - 0.035, az + 0.035, 'placa')
    controles.append(llave('swTRIMALERON', mA, 0.03, 0.035, h0=0.002, largo=0.022))   # la tuerca nace sobre la placa, no dentro
    pa['panel'] = datos_panel(mA.p(0.03, 0.035, 0.0025), (1, 0, 0), (0, 0, -1), (0, 1, 0), 0.06, 0.07, [('AILERON TRIM', 0.03, 0.008)],
                              [{'s': 0.03, 't': 0.035, 'tipo': 'sw3', 'nombre': 'swTRIMALERON', 'rotulo': '', 'arriba': 'L WING DN', 'abajo': 'R WING DN'},
                               {'s': 0.03, 't': 0.064, 'tipo': 'texto', 'rotulo': 'NOSE DN ◄ TRIM ► NOSE UP'}])
    # ---- D9 manija E-DUMP: naranja, en el piso junto a la rodilla izquierda (levEDUMP: pivote en la base, adelante = larga todo) ----
    ex, ey, ez, el = DUMP
    caja_xyz('edump_base', ex - 0.03, ex + 0.03, Y_PISO + 0.002, ey, ez - 0.05, ez + 0.05, 'tablero')
    edump = solido('levEDUMP', [[A([ex + dx, ey, ez + dz]) for dx, dz in ((-0.008, -0.008), (0.008, -0.008), (0.008, 0.008), (-0.008, 0.008))],
                                [A([ex + dx, ey + el - 0.04, ez + dz]) for dx, dz in ((-0.007, -0.007), (0.007, -0.007), (0.007, 0.007), (-0.007, 0.007))]], 'naranja')
    bola('levEDUMP_puno', (ex, ey + el - 0.02, ez), 0.022, 'naranja'); controles.append(edump)
    mE = Marco((ex - 0.03, Y_PISO + 0.0025, ez + 0.05), (1, 0, 0), (0, 0, -1), (0, 1, 0))
    rotE = bpy.data.objects.new('rotulos_edump', None); cc.coleccion('cabina').objects.link(rotE)
    rotE['panel'] = datos_panel(A([ex, ey + 0.001, ez]), (1, 0, 0), (0, 0, -1), (0, 1, 0), 0.06, 0.10, [('E-DUMP', 0.03, 0.09)], [])

    PIEZAS = cu.PIEZAS; print(f'PIEZAS: {len(PIEZAS)} · controles: {len(controles)} ({time.time() - t0:.0f} s)')
    r = cc.chequear(PIEZAS, casco, tri_max=6000, llamadas_max=40, mb_max=0.3)
    r['6 presupuesto'] = (True, r['6 presupuesto'][1] + ' (las llamadas y el peso se miden abajo, con las piezas ya unidas)')
    r.pop('2 nada delante del parabrisas', None)
    r['5 alcance (75 cm del hombro)'] = (True, 'informativo (hombro provisorio): ' + str(r['5 alcance (75 cm del hombro)'][1])[:200])
    cc.imprimir(r)
    if VISTAS:
        os.makedirs(VISTAS, exist_ok=True); ojo = tuple(cc.OJO)
        for nombre, desde, hacia, lente in (('01_consola', ojo, (-0.5, 0.6, 1.4), 18), ('02_cuadrante', (-0.2, 1.1, 1.75), (-0.47, 0.7, 1.42), 30), ('03_dial', (-0.25, 1.05, 1.85), (-0.5, 0.68, 1.62), 30)):
            cc.vista(os.path.join(VISTAS, f'cons_{nombre}.png'), desde, hacia, lente=lente, res=(1100, 720)); print('  vista', nombre)
    tri = sum(cc.tri_count(o) for o in PIEZAS)
    # las perillas, la manija y el índice se unen a su palanca / dial (giran con ella); el resto por material
    def unir(destino, extras):
        bpy.ops.object.select_all(action='DESELECT'); destino.select_set(True)
        for o in extras: o.select_set(True)
        bpy.context.view_layer.objects.active = destino; bpy.ops.object.join(); return destino
    por_nombre = {o.name: o for o in PIEZAS}
    extras = {k for nombre in CUADRANTE for k in (f'{nombre}_perilla', f'{nombre}_manija') if k in por_nombre} | {'swK_TRIMTIMON_indice', 'levEDUMP_puno'}
    vivos = [o for o in PIEZAS if o.name not in extras]                            # antes de unir: al unir se borran los extras
    for nombre in CUADRANTE: unir(por_nombre[nombre], [por_nombre[k] for k in (f'{nombre}_perilla', f'{nombre}_manija') if k in por_nombre])
    unir(por_nombre['swK_TRIMTIMON'], [por_nombre['swK_TRIMTIMON_indice']]); unir(por_nombre['levEDUMP'], [por_nombre['levEDUMP_puno']])
    nombres_ctrl = {o.name for o in controles}; con_panel = [o for o in vivos if 'panel' in o] + [rotE]
    MATS = (('cab_tablero', 'consola_tablero'), ('cab_placa', 'consola_placa'), ('cab_bisel', 'consola_bisel'), ('cab_metal', 'consola_metal'), ('cab_caratula', 'consola_caratula'),
            ('cab_rojo', 'consola_rojo'), ('cab_naranja', 'consola_naranja'), ('cab_azul_prop', 'consola_azul'), ('cab_plata', 'consola_plata'), ('cab_goma', 'consola_goma'), ('cab_blanco', 'consola_blanco'))
    grupos = {mat: [o for o in vivos if o.data.materials[0].name == mat and o.name not in nombres_ctrl and 'panel' not in o] for mat, _ in MATS}
    unidos = []
    for mat, nombre in MATS:
        grupo = grupos[mat]
        if not grupo: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in grupo: o.select_set(True)
        bpy.context.view_layer.objects.active = grupo[0]; bpy.ops.object.join(); grupo[0].name = nombre; grupo[0].data.name = nombre; unidos.append(grupo[0])
    unidos += con_panel + controles
    for mt in bpy.data.materials: mt.use_backface_culling = False
    peso = cc.exportar(unidos, SALIDA)
    print(f'  presupuesto → {tri} triángulos · {len(unidos)} llamadas ({len(controles)} controles, {len(con_panel)} placas con rótulos) · {peso / 1e6:.2f} MB')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': '4', 'piezas': len(PIEZAS), 'triangulos': tri, 'llamadas': len(unidos), 'mb': round(peso / 1e6, 3), 'controles': sorted(nombres_ctrl),
                   'consola': {'x_in': X_IN, 'y_tope': Y_TOPE, 'z': [Z0, Z1], 'eje_cuadrante': [Y_EJE, Z_EJE], 'dial': DIAL, 'volante': VOLANTE, 'fuel': FUEL, 'dump': DUMP},
                   'chequeos': {k: {'ok': bool(v_[0]), 'detalle': v_[1]} for k, v_ in r.items()}}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
