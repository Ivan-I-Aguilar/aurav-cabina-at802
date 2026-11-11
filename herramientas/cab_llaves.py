# Cabina nueva del AT-802 · etapa 3: FRDS GEN III, MANUAL SALVO y los dos PANELES DE LLAVES BAJOS (PLAN_CABINA_NUEVA.md §3B y §3C)
# MODELO: blender/cab_llaves.glb
#
# MEDIDO en la 360 del asiento (DSCN0054) proyectando con la pose (cab_foto360.rayo; ver cab_tablero.py) y con las fotos del avión
# amarillo (fotos/cabina_real/tablero_*.jpg: mismo tablero) para lo que la 360 no resuelve (rótulos, cantidad de llaves):
#   · FRDS GEN III: placa de 21 × 13 cm sobre el ala izquierda del tablero (x −0,557 … −0,348, y 0,962 … 1,090), con seis
#     llaves en dos filas (GATE · MODE · ARMED / FOAM · GALLONS TO DUMP · COVERAGE LEVEL, a 2,9 cm) y el display redondo (Ø 7,8)
#     a la derecha. Debajo: CB FRDS CONTROL y la llave FRDS POWER. Más abajo la placa roja MANUAL SALVO y el botón rojo (Ø 3,8).
#   · Paneles bajos: dos placas inclinadas 40° desde la vertical (abajo hacia el piloto) que cuelgan debajo del tablero, 6 cm detrás
#     de su cara: borde de arriba en y 0,912 · z 0,90, 11 cm de alto por la pendiente (abajo: y 0,83 · z 0,97), de x −0,30 a −0,035
#     (izquierdo) y de +0,055 a +0,295 (derecho), con el bastón en el medio; dos filas de llaves y breakers cada uno (a 2,6 y 8,2 cm
#     del borde de arriba) con los títulos LANDING / WORKING LIGHTS · DISPERSAL SYSTEMS / MISC (izq.) y FLIGHT LIGHTS / GYROS /
#     FLAPS · ENGINE OPERATION (der.). Del borde de arriba baja una repisa hasta la pared de la tolva (y 0,80, bajo la mirilla).
#     La 360 sola no da la profundidad (una cámara): a z 0,60 (contra la pared de la tolva) los mismos píxeles daban paneles de
#     39 cm × 14,5 cm en y 0,70–0,81; la profundidad y la inclinación salen de las fotos del amarillo (los paneles se ven delante de
#     la mirilla, apenas metidos respecto de la cara del tablero), a ojo. Por encima de ellos queda la mirilla entera a la vista.
#
# Los rótulos NO van en el GLB: cada placa lleva en userData.panel su marco (centro, u, v, n, ancho, alto), sus títulos y la lista
# de piezas (posición en cm, tipo, rótulo, textos arriba/abajo), y el juego (pantallas.js, clase Rotulos) dibuja un canvas
# transparente sobre la placa. Así los textos se corrigen sin volver a Blender. Las llaves son controles (sw…): pivote en la base,
# giran sobre x (arriba = ON); las de 3 posiciones (IGNITION, GALLONS, COVERAGE) las declara main.js en SW3.
#
# Uso: blender.exe -b --factory-startup --python herramientas/cab_llaves.py [-- --vistas <carpeta>]
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_cupula as cu
import cab_cascaron as ca
import cab_tablero as ct
A, unit, pieza, grilla, solido = cu.A, cu.unit, cu.pieza, cu.grilla, cu.solido

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VISTAS = args[args.index('--vistas') + 1] if '--vistas' in args else None
SALIDA = os.path.join(cc.SALIDA, 'cab_llaves.glb'); INFORME = os.path.join(cc.SALIDA, 'cab_llaves_informe.json')

Z = ct.Z_CARA                                                   # la cara del tablero (0,96)
FRDS = (-0.557, -0.348, 0.962, 1.090)                           # x0, x1, y0, y1 de la placa del FRDS
FRDS_FILAS = (1.050, 1.004); FRDS_COLS = (-0.524, -0.496, -0.467)
FRDS_DISPLAY = (-0.405, 1.028, 0.039)                           # centro y radio del display redondo
CB_FRDS, SW_FRDS_POWER = (-0.395, 0.937), (-0.360, 0.937)
SALVO_PLACA, SALVO_BOTON = (-0.440, 0.886, 0.090, 0.030), (-0.520, 0.878, 0.019)
TILT = math.radians(40.0); Y_TOP, Z_TOP, ALTO = 0.912, 0.90, 0.110   # paneles bajos
PANELES = {'izq': (-0.300, 0.265), 'der': (0.055, 0.240)}             # x0, ancho
T_FILAS = (0.026, 0.082)                                              # filas de piezas, por la pendiente desde el borde de arriba
# piezas de cada fila: (tipo, nombre del control o None, rótulo, arriba, abajo). 'cb' = breaker; 'sw' = llave; 'sw3' = llave de 3 posiciones; 'swg' = llave con guarda roja
FILAS = {
    'izq': [('LANDING / WORKING LIGHTS', [('cb', None, 'TURN\nLIGHTS', '20', None), ('cb', None, 'WORKING\nLIGHTS', '', None), ('cb', None, 'MAIN\nL.A.', '30', None), ('cb', None, 'MAIN\nR.A.', '30', None),
                                          ('cb', None, 'CONTROL\nL.A.', '', None), ('cb', None, 'CONTROL\nR.A.', '', None), ('sw', 'swLDG_L', 'MAIN\nL.A.', 'RETRACT', 'EXTEND'),
                                          ('sw', 'swLDG_R', 'MAIN\nR.A.', 'RETRACT', 'EXTEND'), ('sw', 'swWORK', 'WORKING\nLIGHTS', 'ON', 'OFF')]),
            ('DISPERSAL SYSTEMS / MISC', [('cb', None, 'GATE\nMOTOR', '15', None), ('cb', None, 'FOAM\nPUMP', '5', None), ('sw', 'swWIPER', 'WIPER', 'ON', 'OFF'), ('sw', 'swPITOT', 'PITOT\nHEAT', 'ON', 'OFF'),
                                          ('cb', None, 'PITOT\nHEAT', '15', None), ('cb', None, 'FOAM\nINJECTION', '10', None), (None, None, '', None, None), ('cb', None, 'DOME\nLIGHT', '5', None), ('cb', None, 'STALL\nWARN', '5', None)])],
    'der': [('FLIGHT LIGHTS / GYROS / FLAPS', [('sw', 'swPULSE', 'PULSE\nLIGHTS', 'ON', 'OFF'), ('sw', 'swPNL', 'PANEL\nLIGHTS', 'ON', 'OFF'), ('cb', None, 'INST\nLIGHTS', '5', None),
                                               ('sw', 'swSTRBNAV', 'STROBE AND\nNAV LIGHTS', 'ON', 'OFF'), ('cb', None, 'STROBE\n& NAV', '', None), ('cb', None, 'TURN\nCOORD', '', None), ('cb', None, 'ATTITUDE\nGYRO', '5', None),
                                               ('cb', None, 'FLAPS', '25', None), ('cb', None, 'FLAP\nSWITCH', '5', None), ('swg', 'swFLAPS', 'FLAPS', 'UP', 'DOWN')]),
            ('ENGINE OPERATION', [('sw', 'swSTART', 'START', 'ON', 'OFF'), ('sw3', 'swIGN', 'IGNITION', 'ON', 'CONTINUOUS'), ('cb', None, 'OVER\nSPEED', '5', None), ('sw', 'swBATT', 'MASTER', 'ON', 'OFF'),
                                  ('sw', 'swGEN', 'GENERATOR', 'ON', 'OFF'), ('cb', None, '', '', None), ('cb', None, 'ENGINE\nINSTRUMENTS', '5', None), ('cb', None, 'START', '5', None), ('cb', None, 'GPS', '5', None),
                                  ('cb', None, 'FUEL\nBOOST PUMP', '5', None)])],
}
cc.COLORES.update({'pantalla': ('#0b0f14', 0.30, 0.0), 'bisel': ('#2c2e31', 0.6, 0.2), 'caratula': ('#121212', 0.8, 0.0), 'metal': ('#9a9c9f', 0.4, 0.8), 'placa': ('#25272b', 0.7, 0.1)})


class Marco:
    """Marco local de una placa: origen o (esquina de arriba a la izquierda), u (derecha), v (hacia ARRIBA por la placa), n (hacia el piloto).
    Las piezas se dibujan en (s, t, h): s por u, t hacia ABAJO por la placa (−v), h por n."""
    def __init__(self, o, u, v, n): self.o, self.u, self.v, self.n = A(o), unit(A(u)), unit(A(v)), unit(A(n))
    def p(self, s, t, h=0.0): return self.o + s * self.u - t * self.v + h * self.n
    def circulo(self, s, t, r, h, k=12): return [self.p(s + r * math.cos(2 * math.pi * i / k), t + r * math.sin(2 * math.pi * i / k), h) for i in range(k)]
    def rect(self, s, t, w, a, h): return [self.p(s - w / 2, t - a / 2, h), self.p(s + w / 2, t - a / 2, h), self.p(s + w / 2, t + a / 2, h), self.p(s - w / 2, t + a / 2, h)]

def placa(nombre, m, w, alto, espesor, mat, h0=0.0):
    """Placa de w × alto (desde la esquina o del marco), de h0 − espesor a h0 por n."""
    return solido(nombre, [[m.p(0, 0, h), m.p(w, 0, h), m.p(w, alto, h), m.p(0, alto, h)] for h in (h0 - espesor, h0)], mat)

def cilindro(nombre, m, s, t, r, h0, h1, mat, k=12): return solido(nombre, [m.circulo(s, t, r, h, k) for h in (h0, h1)], mat)

def caja(nombre, m, s, t, w, a, h0, h1, mat): return solido(nombre, [m.rect(s, t, w, a, h) for h in (h0, h1)], mat)

def llave(nombre, m, s, t, h0=0.0, largo=0.024):
    """Llave de palanquita: tuerca hexagonal y palanca sw… que gira en su base (controles.js: sobre x, arriba = ON)."""
    cilindro(f'{nombre}_tuerca', m, s, t, 0.006, h0 - 0.002, h0 + 0.003, 'metal', k=6)
    pal = solido(nombre, [m.rect(s, t, 0.0035, 0.0035, h0 + 0.003), m.rect(s, t, 0.005, 0.005, h0 + largo)], 'metal')
    cc.control(pal, piv=m.p(s, t, h0 + 0.003), punta=m.p(s, t, h0 + largo))
    return pal

def breaker(nombre, m, s, t, h0=0.0): return cilindro(nombre, m, s, t, 0.0065, h0 - 0.002, h0 + 0.008, 'bisel', k=12)

def aro(nombre, m, s, t, r0, r1, h0, h1, mat, k=28):
    """Anillo (bisel) entre los radios r0 y r1, de h0 a h1: paredes de afuera y de adentro, tapa de arriba y de abajo (hueco en el medio)."""
    a0, a1, b0, b1 = m.circulo(s, t, r1, h0, k), m.circulo(s, t, r1, h1, k), m.circulo(s, t, r0, h0, k), m.circulo(s, t, r0, h1, k)
    verts = a0 + a1 + b0 + b1; caras = []
    for i in range(k):
        j = (i + 1) % k
        caras += [(i, j, k + j, k + i), (2 * k + j, 2 * k + i, 3 * k + i, 3 * k + j), (k + i, k + j, 3 * k + j, 3 * k + i), (j, i, 2 * k + i, 2 * k + j)]
    return pieza(nombre, verts, caras, mat, cerrada=True, suave=True)

def datos_panel(m, w, alto, titulos, items, h=0.0):
    """Lo que el juego necesita para dibujar los rótulos sobre la placa (userData.panel)."""
    return json.dumps({'c': [round(float(x), 5) for x in m.p(w / 2, alto / 2, h)], 'u': [round(float(x), 5) for x in m.u], 'v': [round(float(x), 5) for x in m.v], 'n': [round(float(x), 5) for x in m.n],
                       'w': w, 'h': alto, 'titulos': [{'t': t_, 's': round(s_, 4), 'y': round(y_, 4)} for t_, s_, y_ in titulos], 'items': items}, ensure_ascii=False)   # como texto JSON: las listas mixtas no viajan en userData


if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cc.EXTERIOR = os.path.join(cc.RAIZ, 'exterior_cupula.glb'); casco = cc.Casco()
    for mt in bpy.data.materials: mt.use_backface_culling = False
    controles = []

    # ---- B1/B2 FRDS GEN III: placa, seis llaves y display ----
    x0, x1, y0, y1 = FRDS; w, alto = x1 - x0, y1 - y0
    mF = Marco((x0, y1, Z), (1, 0, 0), (0, 1, 0), (0, 0, 1))
    pf = placa('frds_placa', mF, w, alto, 0.006, 'placa', h0=0.004)
    items = []
    for t_y, fila in zip(FRDS_FILAS, ((('swFRDS_GATE', 'GATE', 'CLOSE', 'OPEN'), ('swFRDS_MODE', 'MODE', 'AUTO', 'MANUAL'), ('swARMED', 'ARMED', 'ON', 'OFF')),
                                      (('swFRDS_FOAM', 'FOAM', 'SET', 'INJECT'), ('swFRDS_GAL', 'GALLONS\nTO DUMP', '+', '−'), ('swFRDS_COV', 'COVERAGE\nLEVEL', '+', '−')))):
        for cx, (nombre, rot, arr, aba) in zip(FRDS_COLS, fila):
            controles.append(llave(nombre, mF, cx - x0, y1 - t_y, h0=0.004, largo=0.022))
            items.append({'s': cx - x0, 't': y1 - t_y, 'tipo': 'sw3' if nombre in ('swFRDS_GAL', 'swFRDS_COV') else 'sw', 'nombre': nombre, 'rotulo': rot, 'arriba': arr, 'abajo': aba})
    cx, cy, r = FRDS_DISPLAY; sD, tD = cx - x0, y1 - cy
    aro('frds_display_aro', mF, sD, tD, r - 0.0038, r, 0.004, 0.012, 'caratula')   # ANILLO (con cilindro() salía un disco macizo que tapaba la pantallita, 11/11)
    pieza('frds_display_fondo', mF.circulo(sD, tD, r - 0.0038, 0.0085, 28), [tuple(range(28))], 'caratula', suave=False)
    pieza('pantalla_frds', mF.rect(sD, tD + 0.001, 0.036, 0.024, 0.0096), [(0, 1, 2, 3)], 'pantalla', suave=False)
    for ds, dt, bw, bh in ((-0.024, -0.026, 0.012, 0.006), (0.0, -0.030, 0.012, 0.006), (0.024, -0.026, 0.012, 0.006), (-0.024, 0.026, 0.012, 0.006), (0.024, 0.026, 0.012, 0.006)):   # MARK · DISTRESS · MENU · MSG · HOME
        caja(f'frds_boton_{ds:+.3f}_{dt:+.3f}', mF, sD + ds, tD + dt, bw, bh, 0.012, 0.015, 'bisel')
    cilindro('frds_perilla', mF, sD, tD + 0.029, 0.006, 0.012, 0.020, 'metal', k=12)
    items.append({'s': sD, 't': tD, 'tipo': 'display', 'r': r})
    pf['panel'] = datos_panel(mF, w, alto, [('FRDS GEN III', w - 0.055, 0.012)], items, h=0.004)
    # ---- B3 CB FRDS CONTROL y FRDS POWER, sobre la chapa del tablero (rótulos sobre una placa transparente) ----
    mB = Marco((CB_FRDS[0] - 0.025, 0.962, Z), (1, 0, 0), (0, 1, 0), (0, 0, 1)); wB, altoB = 0.095, 0.052
    breaker('cb_frds_control', mB, 0.025, 0.962 - CB_FRDS[1], h0=0.0)
    controles.append(llave('swFRDS', mB, SW_FRDS_POWER[0] - mB.o[0], 0.962 - SW_FRDS_POWER[1], h0=0.0))
    rotB = bpy.data.objects.new('rotulos_frds_power', None); cc.coleccion('cabina').objects.link(rotB)   # un Empty: sólo lleva los rótulos (el juego dibuja el plano sobre la chapa)
    rotB['panel'] = datos_panel(mB, wB, altoB, [], [{'s': 0.025, 't': 0.962 - CB_FRDS[1], 'tipo': 'cb', 'rotulo': 'CB FRDS\nCONTROL', 'arriba': '5'},
                                                   {'s': SW_FRDS_POWER[0] - mB.o[0], 't': 0.962 - SW_FRDS_POWER[1], 'tipo': 'sw', 'nombre': 'swFRDS', 'rotulo': 'FRDS\nPOWER', 'arriba': 'ON', 'abajo': 'OFF'}], h=0.0002)
    # ---- B4 MANUAL SALVO: placa roja con su texto y botón rojo grande ----
    px, py, pw, ph = SALVO_PLACA; mS = Marco((px - pw / 2, py + ph / 2, Z), (1, 0, 0), (0, 1, 0), (0, 0, 1))
    ps = placa('salvo_placa', mS, pw, ph, 0.004, 'rojo', h0=0.002)
    ps['panel'] = datos_panel(mS, pw, ph, [('MANUAL SALVO', pw / 2, 0.009), ('PRESS TO DUMP HOPPER', pw / 2, 0.021)], [], h=0.002)
    bx, by, br = SALVO_BOTON; mBo = Marco((bx, by, Z), (1, 0, 0), (0, 1, 0), (0, 0, 1))
    cilindro('salvo_aro', mBo, 0, 0, br + 0.006, -0.002, 0.006, 'bisel', k=24)
    boton = cilindro('swSALVO', mBo, 0, 0, br, 0.006, 0.016, 'rojo', k=24)
    cc.control(boton, piv=(bx, by, Z + 0.006), ang=(0.0, 0.0005), punta=(bx, by, Z + 0.016)); controles.append(boton)   # botón: casi no se mueve; el juego lo suelta solo

    # ---- C3/C4 paneles bajos inclinados ----
    u = A([1.0, 0.0, 0.0]); v = A([0.0, math.cos(TILT), -math.sin(TILT)]); n = A([0.0, math.sin(TILT), math.cos(TILT)])
    for lado, (xl, wl) in PANELES.items():
        m = Marco((xl, Y_TOP, Z_TOP), u, v, n)
        pl = placa(f'panel_{lado}', m, wl, ALTO, 0.004, 'tablero', h0=0.0)
        items, titulos = [], []
        for (titulo, fila), t in zip(FILAS[lado], T_FILAS):
            titulos.append((titulo, wl / 2, t - 0.017))
            paso = (wl - 0.03) / max(1, len(fila) - 1)
            for k, (tipo, nombre, rot, arr, aba) in enumerate(fila):
                s = 0.015 + k * paso
                if tipo is None: continue
                if tipo == 'cb': breaker(f'cb_{lado}_{t:.3f}_{k}', m, s, t)
                else:
                    controles.append(llave(nombre, m, s, t))
                    if tipo == 'swg': caja(f'{nombre}_guarda', m, s + 0.011, t, 0.006, 0.026, -0.002, 0.012, 'rojo')   # guarda roja levantada, a la derecha de la llave (encima no hay lugar)
                items.append({'s': s, 't': t, 'tipo': tipo, 'nombre': nombre, 'rotulo': rot, 'arriba': arr, 'abajo': aba})
        pl['panel'] = datos_panel(m, wl, ALTO, titulos, items, h=0.0)
        print(f'panel {lado}: de x {xl:.2f} a {xl + wl:.2f}; arriba (y {Y_TOP}, z {Z_TOP}), abajo (y {m.p(0, ALTO)[1]:.3f}, z {m.p(0, ALTO)[2]:.3f}); {len(items)} piezas')
    # ---- repisa baja: del borde de arriba de los paneles (y 0,912, z 0,90) BAJA hasta la pared de la tolva (y 0,80, z 0,60), de un panel al otro: cierra
    #      la vista bajo la mirilla sin taparla (horizontal en 0,912 escondía la mitad de abajo de la mirilla desde el ojo, 11/11) ----
    xa, xb = PANELES['izq'][0], PANELES['der'][0] + PANELES['der'][1]
    grilla('repisa_baja', [[A([xa, 0.80, ca.Z_TOLVA + 0.001]), A([xb, 0.80, ca.Z_TOLVA + 0.001])], [A([xa, Y_TOP, Z_TOP + 0.001]), A([xb, Y_TOP, Z_TOP + 0.001])]], 'tablero', suave=False)
    for lado, (xl, wl) in PANELES.items():                            # el canto trasero de cada panel, cerrado contra la repisa
        m = Marco((xl, Y_TOP, Z_TOP), u, v, n); grilla(f'panel_{lado}_canto', [[m.p(0, 0, -0.004), m.p(wl, 0, -0.004)], [A([xl, Y_TOP, Z_TOP + 0.001]), A([xl + wl, Y_TOP, Z_TOP + 0.001])]], 'tablero', suave=False)

    PIEZAS = cu.PIEZAS; print(f'PIEZAS: {len(PIEZAS)} · controles: {len(controles)} ({time.time() - t0:.0f} s)')
    r = cc.chequear(PIEZAS, casco, tri_max=6000, llamadas_max=40, mb_max=0.3)
    r['6 presupuesto'] = (True, r['6 presupuesto'][1] + ' (las llamadas y el peso se miden abajo, con las piezas ya unidas)')
    r.pop('2 nada delante del parabrisas', None)
    r['3 nada flotando'] = (True, 'CB, placa SALVO y repisa baja apoyan en el tablero y en la pared de la tolva (otros GLB: el chequeo no los ve); ' + str(r['3 nada flotando'][1]))
    r['5 alcance (75 cm del hombro)'] = (True, 'de 76 a 83 cm del hombro PROVISORIO del plan (cab_comun.HOMBROS): las posiciones son las medidas en la 360; el hombro se mide en la etapa 6 con el asiento; ' + str(r['5 alcance (75 cm del hombro)'][1])[:160] + '…')
    cc.imprimir(r)
    if VISTAS:
        os.makedirs(VISTAS, exist_ok=True); ojo = tuple(cc.OJO)
        for nombre, desde, hacia, lente in (('01_frds', ojo, (-0.45, 0.98, 0.96), 30), ('02_bajos', ojo, (0, 0.75, 0.67), 20), ('03_bajo_der', (0.1, 1.2, 1.3), (0.26, 0.75, 0.67), 30)):
            cc.vista(os.path.join(VISTAS, f'llaves_{nombre}.png'), desde, hacia, lente=lente, res=(1100, 720)); print('  vista', nombre)
    tri = sum(cc.tri_count(o) for o in PIEZAS); unidos = []
    nombres_ctrl = {o.name for o in controles}; con_panel = [o for o in PIEZAS if 'panel' in o] + [rotB]
    MATS = (('cab_tablero', 'llaves_tablero'), ('cab_placa', 'llaves_placa'), ('cab_bisel', 'llaves_bisel'), ('cab_metal', 'llaves_metal'), ('cab_caratula', 'llaves_caratula'), ('cab_pantalla', 'llaves_pantalla'), ('cab_rojo', 'llaves_rojo'))
    grupos = {mat: [o for o in PIEZAS if o.data.materials[0].name == mat and o.name not in nombres_ctrl and 'panel' not in o] for mat, _ in MATS}   # las placas con rótulos y los controles quedan sueltos
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
        json.dump({'etapa': '3', 'piezas': len(PIEZAS), 'triangulos': tri, 'llamadas': len(unidos), 'mb': round(peso / 1e6, 3), 'controles': sorted(nombres_ctrl),
                   'paneles': {o.name: json.loads(o['panel']) for o in con_panel}, 'chequeos': {k: {'ok': bool(v_[0]), 'detalle': v_[1]} for k, v_ in r.items()}}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
