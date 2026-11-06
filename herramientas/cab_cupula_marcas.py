# Cúpula nueva · etapa 1b.0 · LAS MARCAS: todo lo que se leyó en las fotos 360, en un solo lugar, y su afinado.
#
# Tres fotos (Nikon KeyMission 360, 7744×3872; lon/lat en grados de cada FOTO: lon 0 = frente de la cámara, negativo
# = izquierda; lat 0 = su horizonte):
#   DSCN0054  desde el asiento            → blender/calcado/marcas54.json
#   DSCN0050  de afuera, ala derecha      → blender/calcado/marcas_afuera.json
#   DSCN0043  de afuera, ala izquierda    →          »
# De cada BORDE RECTO se anota a ojo un arco aproximado A→B y un punto del lado del vidrio; cab_borde360.py lo afina
# (escalón marco→vidrio por tramos, 1–2 px). Los bordes que cruzan la costura de las dos lentes (lon ±90) se parten y
# cada parte se afina por separado (cada lente lo ve desde su pupila: cab_foto360.py). Los RASGOS que no son rectos
# (ojos de buey, ventanas del techo, parasol del tablero) son puntos leídos sobre recortes con cuadrícula.
# De ahí en más: cab_cupula_puntos.py (--ajustar) → cab_cupula_afuera.py → cab_cupula_puntos.py → cab_cupula_lamina.py.
# Uso: python -E -P -X utf8 herramientas/cab_cupula_marcas.py "<carpeta de las DSCN00*.JPG>" [carpeta de salida]
import json, math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_borde360 as cb

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- 360 desde el asiento (DSCN0054): arcos aproximados (A, B, un punto del lado del vidrio) ----------------
BORDES_54 = {
    'puerta_izq_del': ([-39.4, -18.2], [-64.0, 39.6], [-80, 10]),   'puerta_izq_tras': ([-95.1, -21.5], [-115.2, 38.3], [-80, 10]),
    'puerta_izq_sup': ([-64.0, 39.6], [-115.2, 38.3], [-80, 10]),   'puerta_izq_inf': ([-39.4, -18.2], [-95.1, -21.5], [-80, 10]),
    'puerta_der_del': ([64.6, -17.7], [87.2, 38.7], [100, 10]),     'puerta_der_tras': ([117.5, -21.0], [138.3, 38.4], [100, 10]),
    'puerta_der_sup': ([87.2, 38.7], [138.3, 38.4], [100, 10]),     'puerta_der_inf': ([64.6, -17.7], [117.5, -21.0], [100, 10]),
    'parante_izq_int': ([-7.2, 12], [-12.4, 36], [10, 25]),         'parante_izq_ext': ([-12.25, 12], [-19.5, 36], [-28, 22]),
    'parante_der_int': ([32.9, 12], [37.6, 32], [10, 25]),          'parante_der_ext': ([35.8, 12], [44.1, 32], [52, 22]),
    'parabrisas_sup': ([-8.0, 40.1], [32.0, 40.2], [12, 30]),
    'lateral_izq_sup': ([-44.5, 34.0], [-19.7, 36.2], [-30, 25]),   'lateral_der_sup': ([45.6, 35.5], [69.3, 32.8], [55, 22]),
    'posteA_izq_del': ([-36.7, 5.0], [-44.5, 34.0], [-30, 22]),     'posteA_der_del': ([62.5, 9.0], [69.3, 32.8], [56, 22]),
}
# rasgos sueltos de la 360 del asiento (leídos sobre recortes con cuadrícula de 1°, o sobre vistas locales ampliadas)
RASGOS_54 = {
    'ojo_izq': [[-105.759, 34.215]], 'ojo_der': [[127.841, 34.773]],                                   # centro del agujero del ojo de buey (mínimo de luminancia)
    'ojo_izq_disco': [[-110.3, 34.3], [-100.5, 34.3], [-105.5, 39.6], [-105.5, 29.2]],                  # borde del disco: atrás, adelante, arriba, abajo
    'ojo_der_disco': [[123.0, 34.8], [132.8, 34.8], [127.8, 39.8], [127.8, 29.5]],                      # adelante, atrás, arriba, abajo
    # ventanas del techo: polilínea ABIERTA por el contorno que se ve. Izquierda: borde de adentro desde donde lo tapa la
    # jaula → punta delantera → borde de afuera → punta trasera. Derecha: desde la costura por el borde de adentro → punta
    # trasera → borde de afuera hasta la costura (su punta delantera cae en la costura)
    'techo_izq': [[-112.67, 63.41], [-108.35, 64.2], [-102.22, 65.2], [-93.96, 66.15], [-85.29, 66.49], [-76.74, 66.18], [-70.84, 64.93], [-67.75, 62.91],
                  [-66.7, 60.28], [-67.86, 57.6], [-70.05, 55.89], [-73.33, 55.09], [-77.12, 54.81], [-81.93, 54.87], [-87.96, 54.81], [-93.97, 54.51],
                  [-99.85, 53.95], [-105.48, 53.13], [-110.75, 51.97], [-114.22, 51.09], [-117.96, 50.91], [-121.04, 51.43], [-122.4, 52.15]],
    'techo_der': [[88.7, 64.31], [91.42, 64.79], [99.3, 65.5], [107.65, 65.67], [116.04, 65.49], [124.18, 64.82], [131.76, 63.73], [135.25, 63.01],
                  [137.92, 61.37], [140.06, 59.36], [142.05, 57.48], [143.7, 55.45], [144.8, 53.72], [144.84, 52.62], [143.49, 51.53], [141.12, 50.86],
                  [137.75, 50.69], [135.13, 50.89], [130.01, 51.91], [124.63, 52.92], [118.95, 53.64], [113.1, 53.78], [107.29, 53.54], [102.75, 53.18],
                  [98.54, 53.54], [96.26, 53.66]],
    # borde del parasol del tablero (tapa la base del parabrisas) y último punto visible de cada paño lateral junto al poste de puerta
    'tablero_sup': [[-10.0, 10.8], [-8.0, 10.6], [-4.0, 10.2], [0.0, 10.2], [4.0, 10.2], [8.0, 10.4], [12.0, 10.456], [14.0, 10.454], [18.0, 10.44],
                    [20.0, 10.544], [22.0, 10.303], [24.0, 10.122], [26.0, 9.966], [28.0, 9.799], [30.0, 9.512], [32.0, 9.208]],
    'lateral_izq_base': [[-33.3, -11.2]], 'lateral_der_base': [[57.6, -10.8]],
    # JAULA DEL TECHO (caños a la vista), leída sobre vistas locales ampliadas (±1°). Nudos = centro de cada unión; arcos y
    # caños = línea media. FL = sobre el poste de puerta delantero, PL = sobre el parante (lado izquierdo: el derecho lo
    # tapa el reflejo y sale por simetría); FC = vértice de la V, justo detrás del parasol; RL / RR = nudos traseros (sobre
    # el poste entre la puerta y la ventanilla trasera); RC = centro del travesaño trasero, de donde bajan dos caños hacia atrás
    'jaula_FL': [[-50.7, 46.76]], 'jaula_PL': [[-22.82, 47.38]], 'jaula_FC': [[16.09, 75.47]],
    'jaula_RL': [[-131.44, 43.69]], 'jaula_RR': [[154.38, 44.03]], 'jaula_RC': [[-169.82, 49.52]],
    'jaula_arco_del_izq': [[-50.7, 46.76], [-47.87, 52.73], [-43.57, 58.22], [-36.87, 63.02]],                # del nudo FL hacia el centro (sigue tapado por el parasol)
    'jaula_arco_tras': [[154.83, 46.27], [157.96, 49.85], [166.25, 54.62], [-179.95, 57.55], [-164.0, 57.72], [-150.0, 55.31], [-139.82, 50.84],
                        [-133.83, 46.15], [-131.68, 43.95]],                                                    # de RR a RL por arriba
    'jaula_lambda_der': [[-169.82, 49.52], [179.4, 44.26], [168.95, 37.43], [160.75, 31.26], [154.27, 25.75], [145.03, 16.23]],   # de RC hacia atrás y abajo, hasta donde lo tapa el asiento
    'jaula_lambda_izq': [[-169.82, 49.52], [-156.57, 43.73], [-146.07, 37.2], [-138.79, 31.54], [-132.43, 25.05], [-124.57, 17.15]],
    # ventanilla trasera vista desde el asiento (parcial, detrás del apoyacabezas y del caño de la jaula): es el MARCO por dentro
    'trasera_der_sup_vista': [[153.16, 33.13], [155.98, 31.95], [161.6, 28.75], [168.0, 24.65]],        # borde superior, a los dos lados del caño
    'trasera_der_del_vista': [[147.57, 20.37], [152.98, 32.43]],                                        # borde delantero
    'trasera_der_esq_vista': [[153.1, 33.1]], 'trasera_izq_esq_vista': [[-131.3, 33.2]],                # esquina superior delantera
}
MEZCLA = 2.0     # grados a cada lado de la costura donde la foto mezcla las dos lentes: ahí no se marca

# ---------------- 360 de afuera: ventana de puerta (pd) y ventanilla trasera (pt); el vidrio es lo OSCURO ----------------
BORDES_AFUERA = {
    '50': {'pd_sup': ([-61.5, 4.0], [-34.7, 7.3], [-40, -12]),     'pd_del': ([-34.7, 7.3], [-5.4, -19.7], [-40, -12]),
           'pd_inf': ([-5.4, -19.7], [-46.1, -32.7], [-40, -12]),  'pd_tras': ([-46.1, -32.7], [-61.5, 4.0], [-40, -12]),
           'pt_sup': ([-71.3, 2.1], [-103.0, -4.7], [-85, -15]),   'pt_tras': ([-103.0, -4.7], [-102.3, -28.4], [-85, -15]),
           'pt_inf': ([-102.3, -28.4], [-59.4, -34.5], [-85, -15]), 'pt_del': ([-59.4, -34.5], [-71.3, 2.1], [-85, -15])},
    '43': {'pd_sup': ([20.3, 5.6], [40.1, 0.2], [15, -15]),        'pd_tras': ([40.1, 0.2], [34.6, -30.5], [15, -15]),
           'pd_inf': ([34.6, -30.5], [-14.8, -26.0], [15, -15]),   'pd_del': ([-14.8, -26.0], [20.3, 5.6], [15, -15]),
           'pt_sup': ([45.95, -1.4], [63.9, -6.7], [55, -15]),     'pt_tras': ([63.9, -6.7], [65.0, -23.7], [55, -15]),
           'pt_inf': ([65.0, -23.7], [42.7, -29.5], [55, -15]),    'pt_del': ([42.7, -29.5], [45.95, -1.4], [55, -15])},
}
# El parante DERECHO del parabrisas visto desde la 360 del ala izquierda (DSCN0043), por dentro, a través de la cabina: una
# banda negra entre dos zonas claras (la pared del hangar vista por los vidrios). Sus dos bordes, con lo claro del lado que
# se indica: de ahí sale la inclinación real del parabrisas (cab_cupula_afuera.py)
PARANTE_LEJANO_43 = {'parante_lejano_a': ([-0.69, 4.14], [-7.85, -0.03], [-4.9, 3.1]),      # borde de adelante / arriba (lo claro, más arriba)
                     'parante_lejano_b': ([-0.03, 3.02], [-7.19, -1.15], [-3.0, -0.1])}     # borde de atrás / abajo (lo claro, más abajo)
ESQUINAS_AFUERA = {   # dónde cae, más o menos, cada esquina (para elegir el cruce bueno de los dos círculos máximos)
    '50': {'pd': {'del_sup': (-34.7, 7.3), 'del_inf': (-5.4, -19.7), 'tras_inf': (-46.1, -32.7), 'tras_sup': (-61.5, 4.0)},
           'pt': {'del_sup': (-71.3, 2.1), 'tras_sup': (-103.0, -4.7), 'tras_inf': (-102.3, -28.4), 'del_inf': (-59.4, -34.5)}},
    '43': {'pd': {'del_sup': (20.3, 5.6), 'tras_sup': (40.1, 0.2), 'tras_inf': (34.6, -30.5), 'del_inf': (-14.8, -26.0)},
           'pt': {'del_sup': (45.95, -1.4), 'tras_sup': (63.9, -6.7), 'tras_inf': (65.0, -23.7), 'del_inf': (42.7, -29.5)}},
}
SUELTOS_AFUERA = {    # leídos a mano: centro del ojo de buey y puntas de la ventana del techo
    '50': {'ojo_centro': [-55.6, 0.2], 'techo_punta_del': [-41.5, 16.0], 'techo_punta_tras': [-63.4, 13.3]},
    '43': {'ojo_centro': [36.7, -2.2], 'techo_punta_del': [23.8, 14.2], 'techo_punta_tras': [40.0, 7.6]},
}
LADO = {'50': 'der', '43': 'izq'}


def punto_en_lon(l, lon):
    """El punto del círculo máximo l (A, B) que está a esa longitud."""
    n = np.cross(cb.vec(*l['A']), cb.vec(*l['B'])); n /= np.linalg.norm(n); lo = math.radians(lon)
    la = math.atan2(-(n[0] * math.sin(lo) - n[2] * math.cos(lo)), n[1])
    if la > math.pi / 2: la -= math.pi
    if la < -math.pi / 2: la += math.pi
    return [lon, round(math.degrees(la), 3)]

def afinar_bordes(foto, bordes, claro_adentro, ver=True):
    """Afina cada borde y parte en la costura (lon ±90) los que la cruzan: nombre, o nombre_F (lente delantera) y nombre_T
    (trasera). Devuelve {nombre: {A, B, lente, residuo_grados, tramos_usados}}."""
    out = {}
    def anotar(nombre, r, lente):
        out[nombre] = {'A': r['A'], 'B': r['B'], 'lente': lente, 'residuo_grados': r['residuo_grados'], 'tramos_usados': r['tramos_usados']}
        if ver: print(f'    {nombre}: A {r["A"]} B {r["B"]} · residuo {r["residuo_grados"]}° ({r["tramos_usados"]} tramos) · lente {lente}')
    for nombre, (A, B, adentro) in bordes.items():
        r = cb.afinar(foto, A, B, adentro, claro_adentro)
        if r is None: print(f'    {nombre}: SIN ESCALÓN'); continue
        la, lb = r['A'][0], r['B'][0]
        if (abs(la) - 90) * (abs(lb) - 90) >= 0: anotar(nombre, r, 'F' if abs(la) < 90 else 'T'); continue
        s = 1 if la > 0 else -1; lons = sorted([la, lb], key=abs)
        for parte, (l0, l1) in (('F', (lons[0], s * 87.0)), ('T', (s * 93.0, lons[1]))):
            if abs(l1 - l0) < 7:
                if ver: print(f'    {nombre}_{parte}: muy corto ({abs(l1 - l0):.1f}°), no se usa')
                continue
            rp = cb.afinar(foto, punto_en_lon(r, l0), punto_en_lon(r, l1), adentro, claro_adentro, tramos=5, rondas=3)
            if rp is not None: anotar(f'{nombre}_{parte}', rp, parte)
    return out

def borde_de(B, pref, g, lente):
    """El borde g (del, tras, sup, inf) de la ventana pref visto por esa lente: entero, o la parte que le toca."""
    for k in (f'{pref}_{g}', f'{pref}_{g}_{lente}'):
        if k in B and B[k]['lente'] == lente: return B[k]
    return B.get(f'{pref}_{g}') or B[f'{pref}_{g}_F' if f'{pref}_{g}_F' in B else f'{pref}_{g}_T']


if __name__ == '__main__':
    FOTOS = sys.argv[1]; SALIDA = sys.argv[2] if len(sys.argv) > 2 else os.path.join(RAIZ, 'blender', 'calcado')
    # ---- la 360 del asiento ----
    print('DSCN0054 (desde el asiento):')
    bordes = afinar_bordes(cb.Foto(os.path.join(FOTOS, 'DSCN0054.JPG')), BORDES_54, True)
    rasgos = {k: ([p for p in v if abs(abs(p[0]) - 90) > MEZCLA] if k.startswith('techo_') else v) for k, v in RASGOS_54.items()}
    sal = {'formato': 2, 'foto': 'DSCN0054.JPG (7744x3872; lon 0 = frente de la camara, lat 0 = su horizonte; grados)',
           'nota': 'bordes: arcos de circulo maximo A-B afinados con cab_borde360.py; lente F = delantera (|lon| < 90), T = trasera; los que cruzan la costura van partidos (_F, _T). '
                   'rasgos: puntos (lon, lat). Lo genera cab_cupula_marcas.py; cab_cupula_puntos.py lo lleva a 3D',
           'bordes': bordes, 'rasgos': rasgos}
    with open(os.path.join(SALIDA, 'marcas54.json'), 'w', encoding='utf-8') as f: json.dump(sal, f, indent=0)
    print(f'  → marcas54.json: {len(bordes)} bordes; {len(rasgos)} rasgos, {sum(len(v) for v in rasgos.values())} puntos')
    # ---- las dos 360 de afuera ----
    sal = {'formato': 2, 'nota': 'grados de cada FOTO (lon 0 = frente de la camara, lat 0 = su horizonte). puerta_esq_* y ojo_centro: los mismos de la 360 del asiento, vistos de afuera '
                                 '(el vidrio por fuera); trasera_esq_* y techo_punta_*: lo que se mide desde afuera. lente F = delantera (|lon| < 90), T = trasera. Lo genera cab_cupula_marcas.py',
           'fotos': {}}
    for n in ('50', '43'):
        print(f'DSCN00{n} (de afuera, lado {LADO[n]}):')
        foto_n = cb.Foto(os.path.join(FOTOS, f'DSCN00{n}.JPG'))
        B = afinar_bordes(foto_n, BORDES_AFUERA[n], False)
        if n == '43': B.update(afinar_bordes(foto_n, PARANTE_LEJANO_43, True))
        puntos = {}
        for pref, familia in (('pd', 'puerta_esq'), ('pt', 'trasera_esq')):
            for esq, c in ESQUINAS_AFUERA[n][pref].items():
                a, b = esq.split('_'); lente = 'F' if abs(c[0]) < 90 else 'T'
                ll = cb.cruce(borde_de(B, pref, a, lente), borde_de(B, pref, b, lente), c)
                puntos[f'{familia}_{esq}'] = {'lon_lat': ll, 'lente': 'F' if abs(ll[0]) < 90 else 'T', 'sigma_grados': 0.15}
        for k, ll in SUELTOS_AFUERA[n].items(): puntos[k] = {'lon_lat': ll, 'lente': 'F', 'sigma_grados': 0.5}
        sal['fotos'][n] = {'archivo': f'DSCN00{n}.JPG', 'lado': LADO[n], 'puntos': puntos,
                           'bordes': {k: {'A': v['A'], 'B': v['B'], 'lente': v['lente'], 'residuo_grados': v['residuo_grados']} for k, v in B.items()}}
    with open(os.path.join(SALIDA, 'marcas_afuera.json'), 'w', encoding='utf-8') as f: json.dump(sal, f, indent=1)
    print('  → marcas_afuera.json')
