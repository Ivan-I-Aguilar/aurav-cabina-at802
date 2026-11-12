# Cabina nueva del AT-802 · etapa 6: BASTÓN, PISO y VARILLAJE (PLAN_CABINA_NUEVA.md §3F) · MODELO: blender/cab_asiento.glb
#
# El bastón cromado recto con la empuñadura negra y el botón rojo de descarga (F3), el fuelle negro de su base (F1), los parches
# antideslizantes del piso y el varillaje rojo en V entre los pedales (F4). Los pedales son blender/pedales.glb (Lichi, clip
# pedales_timon) y el asiento blender/butaca.glb (Lichi), que cabina_nueva.js carga y recolorea (malla roja, arnés negro).
#
# MEDIDO en la 360 con la pose (11/11): la base del bastón (fuelle) en (−0,01; 0,26; 1,15); el botón rojo en y ≈ 1,05–1,08 y la
# empuñadura de 0,90 a 1,06, con la caña casi vertical (z 1,10–1,15: inclinada 3° adelante). Los pedales de x ±0,18 a ±0,33, con
# el borde de abajo en z 0,91 y el de arriba unos 15 cm más alto y 10 cm más adelante. En la 360 el bastón está a x ≈ 0.
#
# El bastón se exporta en tres mallas «palanca_*» (caña cromada, empuñadura, botón) con la geometría en el marco de la cabina:
# main.js las cuelga del grupo `palanca` restando PIVOTE_NUEVO = (0; 0,28; 1,15) y las gira con el mando, como a las del FSX.
#
# Uso: blender.exe -b --factory-startup --python herramientas/cab_asiento.py
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_cupula as cu
import cab_cascaron as ca
A, unit, pieza, grilla, solido = cu.A, cu.unit, cu.pieza, cu.grilla, cu.solido

SALIDA = os.path.join(cc.SALIDA, 'cab_asiento.glb'); INFORME = os.path.join(cc.SALIDA, 'cab_asiento_informe.json')
PIVOTE = A([0.0, 0.28, 1.15])                         # base del bastón (eje de giro)
TOPE = A([0.0, 1.06, 1.11])                           # arriba del botón
Y_PUNO = 0.90                                         # empieza la empuñadura
PISO = ca.PISO
cc.COLORES.update({'metal': ('#9a9c9f', 0.4, 0.8)})

def tubo_entre(nombre, a, b, r, mat, k=16):
    """Cilindro de a a b (secciones perpendiculares al eje)."""
    a, b = A(a), A(b); e = unit(b - a); p = unit(np.cross(e, A([1.0, 0.0, 0.0]) if abs(e[0]) < 0.9 else A([0.0, 1.0, 0.0]))); q = np.cross(e, p)
    return solido(nombre, [[c + r * (math.cos(2 * math.pi * i / k) * p + math.sin(2 * math.pi * i / k) * q) for i in range(k)] for c in (a, b)], mat)

if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cc.EXTERIOR = os.path.join(cc.RAIZ, 'exterior_cupula.glb'); casco = cc.Casco()
    for mt in bpy.data.materials: mt.use_backface_culling = False
    e = unit(TOPE - PIVOTE)
    # ---- F3 bastón: caña cromada, empuñadura negra y botón rojo (tres mallas palanca_*) ----
    tubo_entre('palanca_cana', PIVOTE, PIVOTE + e * (Y_PUNO - PIVOTE[1]) / e[1], 0.013, 'cromo')
    p0 = PIVOTE + e * (Y_PUNO - PIVOTE[1]) / e[1]; p1 = TOPE - e * 0.012
    tubo_entre('palanca_puno', p0, p1, 0.019, 'goma', k=20)
    cu.esfera('palanca_puno_tope', p1, 0.019, 'goma', n=16, m=8)
    tubo_entre('palanca_boton', p1 + e * 0.012, TOPE + e * 0.004, 0.008, 'rojo', k=12)
    # ---- F1 fuelle de la base (cono negro) y parches antideslizantes del piso ----
    solido('fuelle', [[PIVOTE + A([0.06 * math.cos(2 * math.pi * i / 16), -0.02 + 0.001, 0.06 * math.sin(2 * math.pi * i / 16)]) for i in range(16)],
                      [PIVOTE + A([0.022 * math.cos(2 * math.pi * i / 16), 0.07, 0.022 * math.sin(2 * math.pi * i / 16)]) for i in range(16)]], 'goma')
    for k, (x0, x1, z0, z1) in enumerate(((-0.33, -0.12, 0.95, 1.40), (0.12, 0.33, 0.95, 1.40), (-0.12, 0.12, 1.25, 1.45))):
        pieza(f'antideslizante_{k}', [A([x0, PISO + 0.002, z0]), A([x1, PISO + 0.002, z0]), A([x1, PISO + 0.002, z1]), A([x0, PISO + 0.002, z1])], [(0, 3, 2, 1)], 'antideslizante', suave=False)
    # ---- F4 varillaje rojo en V: de cada pedal a un punto central bajo el bastón ----
    centro = A([0.0, PISO + 0.05, 1.05])
    for s in (-1, 1):
        tubo_entre(f'varilla_{s}', A([s * 0.24, PISO + 0.06, 0.86]), centro, 0.008, 'rojo', k=8)
    tubo_entre('varilla_eje', A([-0.26, PISO + 0.06, 0.86]), A([0.26, PISO + 0.06, 0.86]), 0.008, 'rojo', k=8)

    PIEZAS = cu.PIEZAS; print(f'PIEZAS: {len(PIEZAS)} ({time.time() - t0:.0f} s)')
    r = cc.chequear(PIEZAS, casco, tri_max=6000, llamadas_max=40, mb_max=0.3)
    r.pop('2 nada delante del parabrisas', None); r.pop('5 alcance (75 cm del hombro)', None); cc.imprimir(r)
    tri = sum(cc.tri_count(o) for o in PIEZAS)
    por_nombre = {o.name: o for o in PIEZAS}
    def unir(destino, extras):
        bpy.ops.object.select_all(action='DESELECT'); destino.select_set(True)
        for o in extras: o.select_set(True)
        bpy.context.view_layer.objects.active = destino; bpy.ops.object.join(); return destino
    estaticos = [o for o in PIEZAS if not o.name.startswith('palanca_')]           # antes de unir (al unir se borra el tope de la empuñadura)
    unir(por_nombre['palanca_puno'], [por_nombre['palanca_puno_tope']])
    unidos = [por_nombre['palanca_cana'], por_nombre['palanca_puno'], por_nombre['palanca_boton']]
    MATS = (('cab_goma', 'asiento_goma'), ('cab_antideslizante', 'asiento_antideslizante'), ('cab_rojo', 'asiento_rojo'))
    grupos = {mat: [o for o in estaticos if o.data.materials[0].name == mat] for mat, _ in MATS}   # antes de unir: al unir se borran objetos
    for mat, nombre in MATS:
        grupo = grupos[mat]
        if not grupo: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in grupo: o.select_set(True)
        bpy.context.view_layer.objects.active = grupo[0]; bpy.ops.object.join(); grupo[0].name = nombre; grupo[0].data.name = nombre; unidos.append(grupo[0])
    for mt in bpy.data.materials: mt.use_backface_culling = False
    peso = cc.exportar(unidos, SALIDA)
    print(f'  presupuesto → {tri} triángulos · {len(unidos)} llamadas · {peso / 1e6:.2f} MB')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': '6', 'triangulos': tri, 'llamadas': len(unidos), 'mb': round(peso / 1e6, 3), 'pivote': [float(v) for v in PIVOTE], 'tope': [float(v) for v in TOPE],
                   'chequeos': {k: {'ok': bool(v_[0]), 'detalle': v_[1]} for k, v_ in r.items()}}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} ({time.time() - t0:.0f} s)')
