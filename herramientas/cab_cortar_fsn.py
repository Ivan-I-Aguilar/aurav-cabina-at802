# Cúpula nueva · etapa 1b.1 · CORTE del FSN (PLAN_CUPULA.md §5): exterior.glb → exterior_cupula.glb, sin la cúpula.
# exterior.glb queda intacto (lo sigue usando ?cabina=vieja); el archivo nuevo lo carga sólo ?cabina=nueva.
#
# Qué se saca (marco de la cabina = el del glb: +x derecha, +y arriba, +z atrás):
#   · todo lo que está DENTRO DE LA CAJA  Z0 < z < Z1,  y > CINTURON,  |x| < XMAX  de la piel y de lo que va montado en
#     la cúpula (mat02 piel y marcos, mat14, mat30, mat15: limpiaparabrisas, antenas, baliza, y las chapas-isla sueltas);
#   · todos los vidrios (mat22) entre z 0,55 y Z1 (los de la cúpula; el FSN no tiene otros ahí).
#   Del cable deflector (mat08, de la punta del techo a la deriva) sólo se recorta la punta delantera (z < CABLE_Z), que
#   quedaba colgando 2 cm por debajo del techo nuevo (es más alto que el del FSN): ahora nace en la chapa.
# Cómo: sin Blender, directo sobre el glb (así no cambian materiales, texturas, normales ni UV del resto). Los triángulos
# que cruzan una cara de la caja se PARTEN exactamente por ese plano (vértices nuevos interpolados: posición, normal y UV):
# el borde que queda es recto, sin dientes y sin estirar nada. (La lección del 1/11 era no APLASTAR vértices ni borrar
# con cajas «generosas»: acá no se mueve ningún vértice y el borde es el plano mismo.)
# Verificación en el acto: imprime cuántas caras salen por material, cuántas se partieron y qué queda cerca del borde.
# Uso: python -E -P -X utf8 herramientas/cab_cortar_fsn.py [entrada.glb] [salida.glb]
import json, os, struct, sys
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRADA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'exterior.glb')
SALIDA = sys.argv[2] if len(sys.argv) > 2 else os.path.join(RAIZ, 'exterior_cupula.glb')
Z0 = 0.76         # el capó (su borde trasero llega a z 0,75) queda entero
Z1 = 2.55         # detrás sigue el carenado del FSN (se decide en 1b.3 si se rehace hasta 2,9)
CINTURON = 0.93   # el antepecho: debajo queda toda la chapa del FSN (calza con la real con 2–3 cm)
XMAX = 0.80
PARTIR = ('mat02', 'mat14', 'mat30', 'mat15')
CABLE, CABLE_Z = 'mat08', 1.755   # donde el cable cruza la chapa del techo nuevo (cab_cupula.py)
VIDRIO = 'mat22'
TIPOS = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def leer_glb(ruta):
    with open(ruta, 'rb') as f: datos = f.read()
    magia, version, total = struct.unpack_from('<4sII', datos, 0); assert magia == b'glTF' and version == 2
    n, t = struct.unpack_from('<I4s', datos, 12); assert t == b'JSON'; j = json.loads(datos[20:20 + n])
    p = 20 + n; nb, tb = struct.unpack_from('<I4s', datos, p); assert tb == b'BIN\x00'
    return j, datos[p + 8:p + 8 + nb]

def escribir_glb(ruta, j, vistas):
    """vistas = lista de bytes, uno por bufferView (en orden); recalcula desplazamientos (alineados a 4)."""
    cuerpo = bytearray()
    for bv, d in zip(j['bufferViews'], vistas):
        while len(cuerpo) % 4: cuerpo.append(0)
        bv['byteOffset'] = len(cuerpo); bv['byteLength'] = len(d); cuerpo += d
    while len(cuerpo) % 4: cuerpo.append(0)
    j['buffers'] = [{'byteLength': len(cuerpo)}]
    texto = json.dumps(j, separators=(',', ':')).encode('utf-8'); texto += b' ' * (-len(texto) % 4)
    with open(ruta, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(texto) + 8 + len(cuerpo)))
        f.write(struct.pack('<I4s', len(texto), b'JSON')); f.write(texto)
        f.write(struct.pack('<I4s', len(cuerpo), b'BIN\x00')); f.write(cuerpo)
    return 12 + 8 + len(texto) + 8 + len(cuerpo)

def leer_accessor(j, bin_, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    assert 'sparse' not in a and bv.get('byteStride') in (None, 0) and a.get('byteOffset', 0) == 0, f'accessor {i}: formato no previsto'
    tipo = TIPOS[a['componentType']]; n = NCOMP[a['type']]
    v = np.frombuffer(bin_, tipo, a['count'] * n, bv.get('byteOffset', 0))
    return v.reshape(a['count'], n).copy() if n > 1 else v.copy()

def partir(P, N, UV, T, eje, valor, candidatos):
    """Parte por el plano P[eje] = valor los triángulos marcados que lo cruzan. Devuelve los arreglos nuevos y cuántos partió."""
    P, N, UV = list(P), list(N), list(UV); nuevos = {}; salida = []; marca = []; partidos = 0; eps = 1e-6
    def corte(i, j):
        k = (min(i, j), max(i, j))
        if k not in nuevos:
            t = (valor - P[i][eje]) / (P[j][eje] - P[i][eje])
            p = P[i] + (P[j] - P[i]) * t; p[eje] = valor
            n = N[i] + (N[j] - N[i]) * t; L = np.linalg.norm(n); n = n / L if L > 1e-9 else N[i]
            P.append(p.astype(np.float32)); N.append(n.astype(np.float32)); UV.append((UV[i] + (UV[j] - UV[i]) * t).astype(np.float32)); nuevos[k] = len(P) - 1
        return nuevos[k]
    for tri, c in zip(T, candidatos):
        if not c: salida.append(tri); marca.append(False); continue
        d = [float(P[i][eje]) - valor for i in tri]
        lado = [0 if abs(x) < eps else (1 if x > 0 else -1) for x in d]
        if not (1 in lado and -1 in lado): salida.append(tri); marca.append(True); continue
        partidos += 1
        for k in range(3):                                   # rotar hasta que el vértice 0 esté solo de su lado (o sobre el plano con los otros dos opuestos)
            a, b, c2 = tri[k], tri[(k + 1) % 3], tri[(k + 2) % 3]; la, lb, lc = lado[k], lado[(k + 1) % 3], lado[(k + 2) % 3]
            if la == 0 and lb * lc < 0:                      # el plano pasa por a y corta el lado b–c
                m = corte(b, c2); salida += [np.array([a, b, m]), np.array([a, m, c2])]; marca += [True, True]; break
            if la != 0 and lb != la and lc != la and lb != 0 and lc != 0:   # a solo; b y c del otro lado
                ab, ac = corte(a, b), corte(a, c2)
                salida += [np.array([a, ab, ac]), np.array([ab, b, c2]), np.array([ab, c2, ac])]; marca += [True, True, True]; break
            if la != 0 and lb == 0 and lc == -la:            # b sobre el plano; a y c opuestos
                m = corte(c2, a); salida += [np.array([a, b, m]), np.array([b, c2, m])]; marca += [True, True]; break
            if la != 0 and lc == 0 and lb == -la:            # c sobre el plano; a y b opuestos
                m = corte(a, b); salida += [np.array([a, m, c2]), np.array([m, b, c2])]; marca += [True, True]; break
        else: salida.append(tri); marca.append(True)
    return np.array(P, np.float32), np.array(N, np.float32), np.array(UV, np.float32), np.array(salida), np.array(marca), partidos


if __name__ == '__main__':
    j, bin_ = leer_glb(ENTRADA)
    vistas = [bytes(bin_[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]) for bv in j['bufferViews']]
    usados = {}
    for mi, m in enumerate(j['meshes']):
        for pr in m['primitives']:
            for a in list(pr['attributes'].values()) + [pr['indices']]: usados[a] = usados.get(a, 0) + 1
    nodo = next(n for n in j['nodes'] if n.get('name') == 'exterior'); assert not any(k in nodo for k in ('translation', 'rotation', 'scale', 'matrix')), 'el nodo exterior tiene transformación'
    malla = j['meshes'][nodo['mesh']]; quedan = []; total_antes = total_despues = 0
    print(f'CORTE del FSN: caja z {Z0}…{Z1}, y > {CINTURON}, |x| < {XMAX} · vidrios (mat22) entre z 0,55 y {Z1}')
    for pr in malla['primitives']:
        nombre = j['materials'][pr['material']]['name']; at = pr['attributes']
        if nombre not in PARTIR and nombre not in (VIDRIO, CABLE): quedan.append(pr); continue
        assert set(at) == {'POSITION', 'NORMAL', 'TEXCOORD_0'} and all(usados[a] == 1 for a in list(at.values()) + [pr['indices']]) and pr.get('mode', 4) == 4
        P, N, UV = leer_accessor(j, bin_, at['POSITION']), leer_accessor(j, bin_, at['NORMAL']), leer_accessor(j, bin_, at['TEXCOORD_0'])
        T = leer_accessor(j, bin_, pr['indices']).reshape(-1, 3).astype(np.int64); n0 = len(T); total_antes += n0; partidos = 0
        if nombre == VIDRIO:
            C = P[T].mean(1); fuera = ~((C[:, 2] > 0.55) & (C[:, 2] < Z1)); T = T[fuera]
        elif nombre == CABLE:
            # sólo el cable (mat08 es también el cromo del cono de la hélice y otros): junto al eje, sobre el techo, de z 1,50 a CABLE_Z
            del_cable = lambda Q: (np.abs(Q[..., 0]) < 0.02) & (Q[..., 1] > 1.65) & (Q[..., 2] > 1.50)      # el cable entero cumple esto; nada más de mat08
            Q = P[T]; es_cable = del_cable(Q).all(1); cand = es_cable & (Q[:, :, 2].min(1) < CABLE_Z)
            print(f'      (el cable son {int(es_cable.sum())} caras: z {Q[es_cable][:, :, 2].min():.2f}…{Q[es_cable][:, :, 2].max():.2f}, y {Q[es_cable][:, :, 1].min():.2f}…{Q[es_cable][:, :, 1].max():.2f})')
            P, N, UV, T, _, partidos = partir(P, N, UV, T, 2, CABLE_Z, cand)
            Q = P[T]; T = T[~(del_cable(Q).all(1) & (Q.mean(1)[:, 2] < CABLE_Z))]
        else:
            def cerca(T):                                    # triángulos cuya caja toca la caja del corte
                Q = P[T]; return (Q[:, :, 2].max(1) > Z0) & (Q[:, :, 2].min(1) < Z1) & (Q[:, :, 1].max(1) > CINTURON) & (np.abs(Q[:, :, 0]).min(1) < XMAX)
            for eje, valor in ((2, Z0), (2, Z1), (1, CINTURON)):
                P, N, UV, T, _, k = partir(P, N, UV, T, eje, valor, cerca(T)); partidos += k
            C = P[T].mean(1); dentro = (C[:, 2] > Z0) & (C[:, 2] < Z1) & (C[:, 1] > CINTURON) & (np.abs(C[:, 0]) < XMAX)
            if dentro.any():
                Q = P[T[dentro]].reshape(-1, 3); caja = f'x {Q[:, 0].min():+.2f}…{Q[:, 0].max():+.2f} · y {Q[:, 1].min():.2f}…{Q[:, 1].max():.2f} · z {Q[:, 2].min():.2f}…{Q[:, 2].max():.2f}'
            else: caja = '—'
            T = T[~dentro]
        print(f'   {nombre}: {n0} caras → {len(T)} ({partidos} partidas por los planos)' + (' · salen todos los de la cúpula' if nombre == VIDRIO else ' · la punta delantera del cable' if nombre == CABLE else f' · lo que sale: {caja}'))
        total_despues += len(T)
        if len(T) == 0: continue                             # la primitiva desaparece (los vidrios)
        uso = np.unique(T); mapa = np.full(len(P), -1, np.int64); mapa[uso] = np.arange(len(uso)); T = mapa[T]; P, N, UV = P[uso], N[uso], UV[uso]
        for clave, datos in (('POSITION', P), ('NORMAL', N), ('TEXCOORD_0', UV)):
            a = j['accessors'][at[clave]]; a['count'] = len(datos); vistas[a['bufferView']] = datos.astype(np.float32).tobytes()
            if clave == 'POSITION': a['min'] = [float(v) for v in datos.min(0)]; a['max'] = [float(v) for v in datos.max(0)]
        a = j['accessors'][pr['indices']]; a['count'] = T.size; a['componentType'] = 5123 if len(P) <= 65535 else 5125
        vistas[a['bufferView']] = T.astype(np.uint16 if len(P) <= 65535 else np.uint32).tobytes(); quedan.append(pr)
    malla['primitives'] = quedan
    peso = escribir_glb(SALIDA, j, vistas)
    print(f'   en total: {total_antes} → {total_despues} caras de esos materiales · {os.path.basename(SALIDA)}: {peso / 1e6:.2f} MB (antes {os.path.getsize(ENTRADA) / 1e6:.2f})')
    # ---- comprobación: releer la salida y mirar qué queda en la caja y cerca del borde ----
    j2, b2 = leer_glb(SALIDA); nodo2 = next(n for n in j2['nodes'] if n.get('name') == 'exterior'); resto = {}; borde_y = []
    for pr in j2['meshes'][nodo2['mesh']]['primitives']:
        nombre = j2['materials'][pr['material']]['name']; P = leer_accessor(j2, b2, pr['attributes']['POSITION']); T = leer_accessor(j2, b2, pr['indices']).reshape(-1, 3)
        assert T.max() < len(P)
        C = P[T].mean(1); d = (C[:, 2] > Z0) & (C[:, 2] < Z1) & (C[:, 1] > CINTURON) & (np.abs(C[:, 0]) < XMAX)
        if d.any(): resto[nombre] = int(d.sum())
        if nombre == 'mat02':
            k = (P[:, 2] > Z0 + 0.02) & (P[:, 2] < Z1 - 0.02) & (np.abs(P[:, 0]) < XMAX) & (P[:, 1] > CINTURON - 0.06); borde_y = P[k, 1]
    print('   queda dentro de la caja:', resto or 'nada', '(mat08 = el cable deflector, que sigue de la chapa del techo hacia atrás)' if set(resto) <= {'mat08'} and resto else '')
    if len(borde_y): print(f'   piel junto al borde (z {Z0 + 0.02:.2f}…{Z1 - 0.02:.2f}): el vértice más alto está en y = {borde_y.max():.4f} (el cinturón es {CINTURON}): ' + ('SIN DIENTES' if borde_y.max() <= CINTURON + 1e-4 else 'OJO, ASOMA'))
