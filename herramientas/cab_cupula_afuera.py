# Cúpula nueva · etapa 1b.0 · las 360 de AFUERA (DSCN0050 sobre el ala derecha, DSCN0043 sobre la izquierda):
# de ahí salen las VENTANILLAS TRASERAS del carenado y el largo de las ventanas del techo vistas por fuera.
#
# Método: AJUSTE CONJUNTO de las dos fotos (mínimos cuadrados, Levenberg-Marquardt). Cada foto ve un solo lado; como
# el avión es simétrico, la foto de la izquierda REFLEJADA respecto del plano x = 0 mira la misma ventanilla derecha
# desde otro punto: las dos fotos hacen de par estéreo. Incógnitas: la pose de cada cámara (6 + 6) y el punto 3D de
# cada rasgo (lado derecho). Ecuaciones:
#   1. cada marca de cada foto apunta a su punto (rayo desde la pupila de SU lente, cab_foto360.py);
#   2. las 4 esquinas del vidrio de la puerta y el ojo de buey están en el PLANO de la ventana de puerta (el mismo de
#      la medición desde el asiento: de ahí sale la escala, que es la del fuselaje FSN que se conserva);
#   3. esas esquinas quedan cerca de las medidas desde el asiento (flojo, ±2,5 cm: por fuera se ve el borde del vidrio
#      y por dentro el del marco, que no son el mismo) y el ojo de buey, que sí es el mismo punto, firme (±1 cm);
#   4. la ventanilla trasera es PLANA (sus 4 esquinas en un plano) y su borde superior, visto desde el asiento, es
#      PARALELO al del marco que ahí se ve detrás del apoyacabezas (±0,7°; el corrimiento entre vidrio y marco queda
#      libre): las dos fotos de afuera la miran casi en la misma dirección y solas dejan su profundidad con ±5 cm;
#   5. las puntas de la ventana del techo suman su marca en la 360 del asiento (±1,5°), que las mira desde abajo: de
#      ahí sale la altura real del techo.
# OJO: las dos fotos fijan bien la FORMA de lo que ven (las proporciones de cada ventana), pero no su escala ni su giro
# dentro del plano de la puerta: eso sale de las anclas con lo medido desde el asiento (2 y 3).
# Controles: residuos de cada marca, cuánto se aparta el vidrio por fuera del marco por dentro, la esquina de
# la ventanilla trasera proyectada a la 360 del asiento contra lo que ahí se ve, y a cuánto queda el casco FSN.
# Vale ±3 cm: PROVISORIO (PLAN_CUPULA.md §4.3). Salida: blender/calcado/cupula_afuera.json y pose50.json / pose43.json.
# Uso: blender.exe -b --factory-startup --python herramientas/cab_cupula_afuera.py [-- --comparar-lentes]
import bpy, json, math, os, sys, time
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
import cab_foto360 as f3

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
CARPETA = os.path.join(cc.RAIZ, 'blender', 'calcado')
RASGOS = ['puerta_esq_del_inf', 'puerta_esq_tras_inf', 'puerta_esq_tras_sup', 'puerta_esq_del_sup', 'ojo_centro',
          'trasera_esq_del_sup', 'trasera_esq_tras_sup', 'trasera_esq_tras_inf', 'trasera_esq_del_inf', 'techo_punta_del', 'techo_punta_tras']
EN_PUERTA = 5                                   # los 5 primeros están en el vidrio de la puerta
SIG_PLANO, SIG_ESQ, SIG_OJO = 0.010, 0.025, 0.010   # m
SIG_VISTA = math.radians(0.7)                   # paralelismo del borde superior de la ventanilla trasera con el del marco visto desde el asiento
SIG_TECHO = math.radians(1.5)                   # puntas de la ventana del techo vistas desde el asiento (marco por dentro ≠ vidrio por fuera, leídas a mano)
FOTOS = ('50', '43')

def unit(v): return v / np.linalg.norm(v)

def rotacion_optima(K, D, C):
    """Rotación cámara→cabina que mejor lleva las direcciones de la foto D a las de los puntos K vistos desde C (Kabsch)."""
    U = K - C; U = U / np.linalg.norm(U, axis=1)[:, None]
    A, S, Vt = np.linalg.svd(D.T @ U)
    R = Vt.T @ np.diag([1.0, 1.0, np.sign(np.linalg.det(Vt.T @ A.T))]) @ A.T
    return float(np.sqrt(np.mean(np.arccos(np.clip(np.sum((D @ R.T) * U, axis=1), -1, 1)) ** 2))), R

def pose_inicial(K, D, caja):
    """Posición por grilla (10 cm) y refinamiento; rotación en forma cerrada. Sólo para arrancar el ajuste conjunto."""
    mejor = (9.0, None)
    for x in np.arange(caja[0], caja[1] + 1e-6, 0.10):
        for y in np.arange(caja[2], caja[3] + 1e-6, 0.10):
            for z in np.arange(caja[4], caja[5] + 1e-6, 0.10):
                e = rotacion_optima(K, D, np.array([x, y, z]))[0]
                if e < mejor[0]: mejor = (e, np.array([x, y, z]))
    paso = 0.05
    while paso >= 0.001:
        e0, C = mejor
        for d in np.array(np.meshgrid((-paso, 0, paso), (-paso, 0, paso), (-paso, 0, paso))).T.reshape(-1, 3):
            e = rotacion_optima(K, D, C + d)[0]
            if e < mejor[0]: mejor = (e, C + d)
        if mejor[0] >= e0 - 1e-12: paso /= 2
    return mejor[1], rotacion_optima(K, D, mejor[1])[1]


class Ajuste:
    def __init__(self, marcas, sim, plano, lente, vista=None, techo=None):
        self.marcas, self.plano, (self.b, self.giro) = marcas, plano, lente
        self.vista = vista                                                      # (pupila, normal): plano de visión del borde superior de la ventanilla trasera desde el asiento
        self.techo = techo or []                                                # [(índice del rasgo, origen, dirección)]: puntas de la ventana del techo vistas desde el asiento (lado derecho)
        self.Q = [np.array(sim[k]['p3d_der']) for k in RASGOS[:EN_PUERTA]]      # medidos desde el asiento (lado derecho)
        self.lado = {n: (1 if marcas[n]['lado'] == 'der' else -1) for n in FOTOS}

    def obs(self, n, k):
        o = self.marcas[n]['puntos'].get(k)
        return None if o is None else (o['lon_lat'][0], o['lon_lat'][1], 1 if o['lente'] == 'F' else -1, math.radians(o['sigma_grados']))

    def camara(self, p, i):
        C = p[6 * i:6 * i + 3]; R = f3.rotacion(*p[6 * i + 3:6 * i + 6]); return C, R

    def rayo(self, p, i, k):
        """Origen y dirección (marco cabina, del lado real de la foto) de la marca k de la foto i."""
        lon, lat, s, sig = self.obs(FOTOS[i], k); C, R = self.camara(p, i)
        return f3.rayo(C, R, lon, lat, self.b, self.giro, s)

    def residuos(self, p, partes=False):
        ang, pl, an = [], [], []
        X = p[12:].reshape(-1, 3)
        for i, n in enumerate(FOTOS):
            for j, k in enumerate(RASGOS):
                if self.obs(n, k) is None: continue
                o, d = self.rayo(p, i, k); Xs = X[j] if self.lado[n] > 0 else f3.espejo(X[j])
                ang.extend((unit(Xs - o) - d) / self.obs(n, k)[3])
        c, nn = self.plano
        for j in range(EN_PUERTA):
            dq = X[j] - self.Q[j]; pl.append(float((X[j] - c) @ nn) / SIG_PLANO)
            an.extend((dq - (dq @ nn) * nn) / (SIG_OJO if RASGOS[j] == 'ojo_centro' else SIG_ESQ))
        # ventanilla trasera: plana (5 del_sup, 6 tras_sup, 7 tras_inf, 8 del_inf) y con el borde superior donde se ve desde el asiento
        nv = np.cross(X[6] - X[5], X[8] - X[5]); pl.append(float((X[7] - X[5]) @ unit(nv)) / SIG_PLANO)
        if self.vista is not None:
            o, nt = self.vista; an.append(float(unit(X[6] - o) @ nt - unit(X[5] - o) @ nt) / SIG_VISTA)
        for j, o, d in self.techo: an.extend((unit(X[j] - o) - d) / SIG_TECHO)
        return (np.array(ang), np.array(pl), np.array(an)) if partes else np.array(ang + pl + an)

    def inicial(self):
        p = np.zeros(12 + 3 * len(RASGOS)); rayos = {}
        for i, n in enumerate(FOTOS):
            s = self.lado[n]
            K = np.array([q if s > 0 else f3.espejo(q) for q in self.Q[:4]]); D = np.array([f3.dir_foto(*self.obs(n, k)[:2]) for k in RASGOS[:4]])
            C, R = pose_inicial(K, D, [0.7, 3.2, 0.7, 2.4, -0.5, 4.0] if s > 0 else [-3.2, -0.7, 0.7, 2.4, -0.5, 4.0])
            p[6 * i:6 * i + 3] = C; p[6 * i + 3:6 * i + 6] = f3.angulos(R)
        for j, k in enumerate(RASGOS):
            if j < EN_PUERTA: p[12 + 3 * j:15 + 3 * j] = self.Q[j]; continue
            r = []
            for i, n in enumerate(FOTOS):
                o, d = self.rayo(p, i, k)
                r.append((o, d) if self.lado[n] > 0 else (f3.espejo(o), f3.espejo(d)))
            p[12 + 3 * j:15 + 3 * j] = f3.cruce_de_rayos(r[0][0], r[0][1], r[1][0], r[1][1])[0]
        return p

    def resolver(self, p0=None, vueltas=80):
        """Levenberg-Marquardt con jacobiano numérico. Devuelve (p, costo, covarianza)."""
        p = self.inicial() if p0 is None else p0.copy(); r = self.residuos(p); c = float(r @ r); lam = 1e-3
        def jac(p, r):
            J = np.zeros((len(r), len(p)))
            for k in range(len(p)):
                q = p.copy(); q[k] += 1e-6; J[:, k] = (self.residuos(q) - r) / 1e-6
            return J
        for _ in range(vueltas):
            J = jac(p, r); A = J.T @ J; g = J.T @ r; mejoro = False
            for _ in range(10):
                dp = np.linalg.solve(A + lam * np.diag(np.diag(A)), -g); r2 = self.residuos(p + dp); c2 = float(r2 @ r2)
                if c2 < c:
                    fin = c - c2 < 1e-9 * c; p, r, c = p + dp, r2, c2; lam = max(lam / 3, 1e-10); mejoro = True; break
                lam *= 4
            if not mejoro or fin: break
        J = jac(p, r); gl = max(1, 22 * 2 + EN_PUERTA + 2 * EN_PUERTA + 1 + (1 if self.vista is not None else 0) + 2 * len(self.techo) - len(p))   # grados de libertad (cada marca vale 2 ecuaciones)
        cov = np.linalg.pinv(J.T @ J) * max(1.0, c / gl)
        return p, c, cov


if __name__ == '__main__':
    t0 = time.time()
    cp = json.load(open(os.path.join(CARPETA, 'cupula_puntos.json'), encoding='utf-8'))
    marcas = json.load(open(os.path.join(CARPETA, 'marcas_afuera.json'), encoding='utf-8'))['fotos']
    m54 = json.load(open(os.path.join(CARPETA, 'marcas54.json'), encoding='utf-8'))['rasgos']
    sim = cp['simetrico']; plano = (np.array(cp['superficies']['puerta_der']['punto']), np.array(cp['superficies']['puerta_der']['normal']))
    pos54, R54, b, giro = f3.pose_de(cp['pose'])
    # borde superior de la ventanilla trasera derecha visto desde el asiento (lente trasera): plano de visión por su pupila
    vs = [f3.dir_camara(lo, la, giro) for lo, la in m54['trasera_der_sup_vista']]; nt = np.linalg.svd(np.array(vs))[2][2]
    print('BORDE SUPERIOR de la ventanilla trasera visto desde el asiento: ' + ' '.join(f'{math.degrees(math.asin(float(v @ nt))):+.2f}°' for v in vs) + ' (lo que se aparta cada punto del círculo máximo)')
    vista = (pos54 - b * f3.frente(R54), R54 @ nt)
    # puntas de la ventana del techo vistas desde el asiento, llevadas al lado derecho: la trasera es la de la ventana derecha
    # (primer... la punta más atrás del contorno) y la delantera la de la izquierda (la derecha la corta la costura), reflejada
    def rayo54(lo, la, reflejar):
        o, d = f3.rayo(pos54, R54, lo, la, b, giro)
        return (f3.espejo(o), f3.espejo(d)) if reflejar else (o, d)
    tras54 = max(m54['techo_der'], key=lambda q: q[0]); del54 = max(m54['techo_izq'], key=lambda q: q[0])    # mayor lon: a la derecha, lo más atrás; a la izquierda, lo más adelante
    techo = [(RASGOS.index('techo_punta_del'),) + rayo54(del54[0], del54[1], True), (RASGOS.index('techo_punta_tras'),) + rayo54(tras54[0], tras54[1], False)]
    print(f'PUNTAS de la ventana del techo desde el asiento: delantera (ventana izquierda) {del54}, trasera (ventana derecha) {tras54}')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    casco = cc.Casco(mostrar=False)
    if '--comparar-lentes' in args:                                             # control del modelo de lentes: el ajuste tiene que cerrar mejor con él
        print('MODELO DE LENTES, costo del ajuste conjunto (menos es mejor):')
        for nombre, lente in (('sin corrección', (0.0, (0.0, 0.0, 0.0))), ('pupilas + giro alrededor del eje', (f3.LENTE, f3.GIRO_T)), ('el de la 360 del asiento', (b, giro)),
                              ('ídem con el giro vertical al revés', (b, (giro[0], -giro[1], giro[2])))):
            a = Ajuste(marcas, sim, plano, lente, vista, techo); p, c, cov = a.resolver(); ang, pl, an = a.residuos(p, partes=True)
            print(f'    {nombre}: costo {c:.1f} · marcas {float(ang @ ang):.1f} · plano {float(pl @ pl):.1f} · anclas {float(an @ an):.1f}')
    a0 = Ajuste(marcas, sim, plano, (b, giro)); p0, c0, cov0 = a0.resolver(); X0 = p0[12:].reshape(-1, 3)   # sólo las dos fotos de afuera: para ver cuánto mueve la 360 del asiento
    a = Ajuste(marcas, sim, plano, (b, giro), vista, techo); p, c, cov = a.resolver()
    X = p[12:].reshape(-1, 3); sig = np.sqrt(np.diag(cov))[12:].reshape(-1, 3)
    ang, pl, an = a.residuos(p, partes=True)
    print(f'AJUSTE CONJUNTO: costo {c:.1f} (marcas {float(ang @ ang):.1f} · plano {float(pl @ pl):.1f} · anclas {float(an @ an):.1f}) en {time.time() - t0:.0f} s · lente b = {b * 100:.1f} cm, giro ({", ".join(f"{math.degrees(v):+.2f}" for v in giro)})°')
    poses, res_marcas = {}, {}
    for i, n in enumerate(FOTOS):
        C, R = a.camara(p, i); yaw, pitch, roll = p[6 * i + 3:6 * i + 6]; sC = np.sqrt(np.diag(cov))[6 * i:6 * i + 3]; res = {}
        for j, k in enumerate(RASGOS):
            if a.obs(n, k) is None: continue
            o, d = a.rayo(p, i, k); Xs = X[j] if a.lado[n] > 0 else f3.espejo(X[j])
            e = math.acos(float(np.clip(unit(Xs - o) @ d, -1, 1))); res[k] = (math.degrees(e), e * float(np.linalg.norm(Xs - o)) * 100)
        res_marcas[n] = res
        print(f'  FOTO {n} ({marcas[n]["lado"]}): cámara en ({C[0]:.3f}, {C[1]:.3f}, {C[2]:.3f}) ± ({sC[0] * 100:.1f}, {sC[1] * 100:.1f}, {sC[2] * 100:.1f}) cm · yaw {math.degrees(yaw):.2f}° pitch {math.degrees(pitch):.2f}° roll {math.degrees(roll):.2f}°')
        print('      residuos: ' + ' · '.join(f'{k.replace("_esq", "")} {v[0]:.2f}°/{v[1]:.1f} cm' for k, v in res.items()))
        poses[n] = {'pos': [float(v) for v in C], 'yaw': float(yaw), 'pitch': float(pitch), 'roll': float(roll), 'lente_m': b, 'lente_giro': [float(v) for v in giro],
                    'sigma_pos_cm': [round(float(v) * 100, 1) for v in sC], 'residuo_medio_grados': round(float(np.sqrt(np.mean([v[0] ** 2 for v in res.values()]))), 3),
                    'nota': 'marco cabina (m); ángulos en rad; d_cabina = Rx(pitch)·Rz(roll)·Ry(yaw)·d_cámara; pos = centro de la cámara (cada lente mira desde pos ± lente_m·frente, cab_foto360.py) · '
                            '1b.0 (5/11): ajuste conjunto de las dos 360 de afuera (cab_cupula_afuera.py); PROVISORIA ±3 cm'}
        with open(os.path.join(CARPETA, f'pose{n}.json'), 'w', encoding='utf-8') as f: json.dump(poses[n], f, indent=1, ensure_ascii=False)
    # el vidrio por fuera contra el marco por dentro, en el plano de la puerta (e1 hacia atrás, e2 hacia arriba)
    ejes = f3.base_del_plano(plano); margen = {}
    for j in range(EN_PUERTA):
        dq = X[j] - a.Q[j]; margen[RASGOS[j]] = [round(float(dq @ ejes[0]) * 100, 1), round(float(dq @ ejes[1]) * 100, 1), round(float((X[j] - plano[0]) @ plano[1]) * 100, 1)]
    print('  vidrio por fuera − marco por dentro (cm: hacia atrás, hacia arriba, fuera del plano): ' + ' · '.join(f'{k.replace("puerta_esq_", "")} {v}' for k, v in margen.items()))
    # rasgos medidos desde afuera
    rasgos = {}
    print('RASGOS (lado derecho; el izquierdo es el espejo):')
    for j, k in enumerate(RASGOS):
        P = X[j]; r = []
        for i, n in enumerate(FOTOS):
            o, d = a.rayo(p, i, k); r.append((o, d) if a.lado[n] > 0 else (f3.espejo(o), f3.espejo(d)))
        sep = f3.cruce_de_rayos(r[0][0], r[0][1], r[1][0], r[1][1])[1]; angulo = math.degrees(math.acos(float(np.clip(r[0][1] @ r[1][1], -1, 1))))
        cerca = casco.cerca(Vector(P), dist=0.5, vidrio=True)
        ver = {lado: f3.proyectar(pos54, R54, pp, b, giro) for lado, pp in (('der', P), ('izq', f3.espejo(P)))}
        rasgos[k] = {'p3d_der': [round(float(v), 4) for v in P], 'p3d_izq': [round(float(v), 4) for v in f3.espejo(P)], 'sigma_cm': [round(float(v) * 100, 1) for v in sig[j]],
                     'separacion_rayos_cm': round(sep * 100, 1), 'angulo_entre_rayos_grados': round(angulo, 1), 'fsn_a_cm': round(float(cerca[1]) * 100, 1) if cerca else None,
                     'fotos': {f'DSCN00{n}': {'lon_lat': marcas[n]['puntos'][k]['lon_lat'], 'px': f3.pixel(*marcas[n]['puntos'][k]['lon_lat']), 'residuo_grados': round(res_marcas[n][k][0], 2)} for n in FOTOS},
                     'en_la_360_del_asiento': ver, 'precision_cm': max(2.0, round(float(sig[j].max()) * 200) / 2), 'provisorio': True}
        if j >= EN_PUERTA:
            print(f'  {k}: ({P[0]:.3f}, {P[1]:.3f}, {P[2]:.3f}) ± ({sig[j][0] * 100:.1f}, {sig[j][1] * 100:.1f}, {sig[j][2] * 100:.1f}) cm · rayos a {sep * 100:.1f} cm (ángulo {angulo:.0f}°) · FSN a {rasgos[k]["fsn_a_cm"]} cm · desde el asiento: der {ver["der"]} izq {ver["izq"]}')
    # control con lo que se ve de la ventanilla trasera desde el asiento (borde del MARCO por dentro: se espera 1–2° de diferencia)
    control = {}
    for nombre, lado, k in (('trasera_der_esq_vista', 'der', 'trasera_esq_del_sup'), ('trasera_izq_esq_vista', 'izq', 'trasera_esq_del_sup')):
        visto = m54.get(nombre); pr = rasgos[k]['en_la_360_del_asiento'][lado]
        if visto and pr:
            dif = math.degrees(math.acos(float(np.clip(f3.dir_foto(*visto[0]) @ f3.dir_foto(*pr), -1, 1))))
            control[nombre] = {'esquina_superior_delantera_vista': visto[0], 'prevista': pr, 'diferencia_grados': round(dif, 2)}
            print(f'  CONTROL {nombre}: la esquina superior delantera se ve en {visto[0]} y el ajuste la pone en {pr}: {dif:.1f}° de diferencia')
    mov = {RASGOS[j]: round(float(np.linalg.norm(X[j] - X0[j])) * 100, 1) for j in range(EN_PUERTA, len(RASGOS))}
    print('  lo que movió cada punto sumar la 360 del asiento y la ventanilla plana (cm):', mov)
    for j, o, d in techo: print(f'  {RASGOS[j]} desde el asiento: residuo {math.degrees(math.acos(float(np.clip(unit(X[j] - o) @ d, -1, 1)))):.1f}°')
    E = {k: np.array(rasgos[f'trasera_esq_{k}']['p3d_der']) for k in ('del_sup', 'tras_sup', 'tras_inf', 'del_inf')}
    nvt = unit(np.cross(E['tras_sup'] - E['del_sup'], E['del_inf'] - E['del_sup'])); nvt = nvt if nvt[0] > 0 else -nvt
    ang_planos = math.degrees(math.acos(float(np.clip(abs(nvt @ plano[1]), -1, 1))))
    print(f'  plano de la ventanilla trasera: normal ({nvt[0]:.3f}, {nvt[1]:.3f}, {nvt[2]:.3f}); el de la puerta ({abs(plano[1][0]):.3f}, {plano[1][1] * np.sign(plano[1][0]):.3f}, {plano[1][2] * np.sign(plano[1][0]):.3f}): {ang_planos:.1f}° entre los dos')
    med = {'ventanilla_trasera_cm': {'borde_superior': round(float(np.linalg.norm(E['del_sup'] - E['tras_sup'])) * 100, 1), 'borde_inferior': round(float(np.linalg.norm(E['del_inf'] - E['tras_inf'])) * 100, 1),
                                     'borde_delantero': round(float(np.linalg.norm(E['del_sup'] - E['del_inf'])) * 100, 1), 'borde_trasero': round(float(np.linalg.norm(E['tras_sup'] - E['tras_inf'])) * 100, 1)},
           'plano_normal': [round(float(v), 3) for v in nvt], 'angulo_con_el_plano_de_puerta_grados': round(ang_planos, 1), 'movido_por_la_360_del_asiento_cm': mov,
           'poste_B_ancho_cm': round(float(np.linalg.norm(E['del_sup'] - X[2])) * 100, 1),
           'ventana_techo_largo_cm': round(float(np.linalg.norm(X[9] - X[10])) * 100, 1)}
    print('  medidas:', med)
    salida = {'marco': 'cabina (m): +x derecha del piloto, +y arriba, -z adelante',
              'metodo': 'ajuste conjunto de las dos 360 de afuera (DSCN0050 ala derecha, DSCN0043 ala izquierda reflejada): poses y puntos; escala por el plano de la ventana de puerta; ancla en el ojo de buey y las esquinas medidas desde el asiento',
              'costo': {'total': round(c, 1), 'marcas': round(float(ang @ ang), 1), 'plano': round(float(pl @ pl), 1), 'anclas': round(float(an @ an), 1)},
              'poses': poses, 'vidrio_por_fuera_menos_marco_por_dentro_cm': margen, 'rasgos': rasgos, 'control_desde_el_asiento': control, 'medidas': med,
              'notas': ['PROVISORIO ±3 cm cerca de la puerta y ±5 cm en las esquinas traseras de la ventanilla (PLAN_CUPULA.md §4.3)',
                        'la escala, la posición y el giro (dentro del plano de la puerta) de todo lo de afuera salen de las anclas con lo medido desde el asiento: ±3 % de escala', 'sigma_cm: incertidumbre formal del ajuste (x, y, z); separacion_rayos_cm: cuánto les falta a los dos rayos para cruzarse',
                        'fsn_a_cm: a cuánto queda el casco FSN del punto', 'puerta_esq_* acá son las esquinas del VIDRIO por fuera; las de cupula_puntos.json (simetrico) son las del marco visto desde el asiento']}
    with open(os.path.join(CARPETA, 'cupula_afuera.json'), 'w', encoding='utf-8') as f: json.dump(salida, f, indent=1, ensure_ascii=False)
    print(f'SALIDA → cupula_afuera.json en {time.time() - t0:.0f} s')
