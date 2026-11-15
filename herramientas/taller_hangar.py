# Taller de motores · T4 (adelantada dentro del bloque de la T1, 15/11/2026): la NAVE del hangar ficticio de AURAV · MODELO:
# taller/hangar.glb (PLAN_TALLER.md §4). Referencia de TIPO, no de copia (las 360 del hangar real, que no van al repo): techo en arco
# de vigas curvas, correas, chapa acanalada clara, columnas oscuras, piso de hormigón con juntas aserradas y sendas amarillas,
# luminarias LED redondas y un portón corredizo grande. Nada de AAXOD; la marca de AURAV la pone el juego.
#
# Medidas [PROVISORIAS, inventadas]: 40 m de luz (x −20…20) × 60 m de fondo (z 0 en el portón … −60 en el fondo), arco de 6 m en los
# costados a 12 m en el centro (circunferencia por (±20; 6) y (0; 12)), 9 arcos cada 7,5 m, portón corredizo de 30 × 8 m abierto en
# el centro (12 m). Marco: +x a la derecha mirando desde el portón hacia el fondo, +y arriba, −z hacia el fondo, origen en el piso en
# el centro del portón (el juego lo corre +45 m en z: así el sector del taller, en z −45, cae donde está la mesa).
# Zonas (para las sendas del piso): H3 AT-802 (x −19…−1, z −24…−11), H4 Cessna (x 3…15, z −23…−13), H5 taller (x −4…4, z −49…−41),
# H2 partida (x −2…2, z −8…−4); pasillos junto a las paredes.
#
# Sin luces en tiempo real: la «luz horneada» va en COLORES POR VÉRTICE (analítica: más oscuro junto a las paredes, en los rincones y
# bajo los aviones; las paredes más claras arriba). La chapa lleva coordenadas de textura en metros (u cruza las ondas): el juego le
# pone la textura acanalada en canvas. Las almas de los arcos van aparte con u = metros de arco / 0,75: el juego las cala con una
# textura de agujeros redondos (alphaTest). Una malla por material: piso, chapa, estructura, almas, luces, afuera.
#
# Uso: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/taller_hangar.py [-- --vistas <carpeta>]
import bpy, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VISTAS = args[args.index('--vistas') + 1] if '--vistas' in args else None
SALIDA = os.path.join(cc.RAIZ, 'taller', 'hangar.glb')
INFORME = os.path.join(cc.RAIZ, 'taller', 'hangar_informe.json')

ANCHO, FONDO, ALTO_LADO, ALTO_CENTRO = 40.0, 60.0, 6.0, 12.0
W = ANCHO / 2
R = (W ** 2 + (ALTO_CENTRO - ALTO_LADO) ** 2) / (2 * (ALTO_CENTRO - ALTO_LADO))   # radio del arco: 36,33 m
CY = ALTO_CENTRO - R                                                              # centro del arco (y)
PHI = math.asin(W / R)                                                            # medio ángulo del arco
N_ARCO = 24
BAHIA = 7.5
PORTON = {'ancho': 30.0, 'alto': 8.0, 'abierto': 12.0}
ZONAS = {'at802': (-19, -1, -24, -11), 'cessna': (3, 15, -23, -13), 'taller': (-4, 4, -49, -41), 'partida': (-2, 2, -8, -4)}
SOMBRAS = [(-10, -17.5, 7.0, 4.5, 0.28), (9, -18, 5.0, 3.5, 0.22)]                # manchas de contacto bajo los aviones: x, z, rx, rz, cuánto
cc.COLORES.update({
    'hangar_piso': ('#ffffff', 0.55, 0.0), 'hangar_chapa': ('#ffffff', 0.5, 0.3), 'hangar_estructura': ('#ffffff', 0.5, 0.6), 'hangar_alma': ('#ffffff', 0.5, 0.6),
    'hangar_luz': ('#ffffff', 0.2, 0.0), 'hangar_afuera': ('#ffffff', 0.9, 0.0),
})


def lin(h):
    return cc.srgb(h)[:3]


def arco_y(x):
    return CY + math.sqrt(max(0.0, R * R - x * x))


def suave(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


class Malla:
    """Caras sueltas (sin compartir vértices) con color por vértice y coordenadas de textura, en el marco del juego."""
    def __init__(self):
        self.v, self.f, self.col, self.uv = [], [], [], []

    def cara(self, pts, cols, uvs=None):
        i = len(self.v)
        self.v += [tuple(p) for p in pts]
        self.f.append(tuple(range(i, i + len(pts))))
        self.col.append([tuple(c) for c in cols])
        self.uv.append([tuple(u) for u in (uvs or [(0, 0)] * len(pts))])

    def quad(self, a, b, c, d, col, uvs=None):
        cols = col if isinstance(col[0], (tuple, list)) else [col] * 4
        self.cara([a, b, c, d], cols, uvs)

    def caja(self, x0, x1, y0, y1, z0, z1, col):
        P = lambda x, y, z: (x, y, z)
        for q in ((P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)), (P(x0, y0, z1), P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1)),
                  (P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)), (P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)),
                  (P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)), (P(x0, y0, z0), P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0))):
            self.quad(*q, col)

    def construir(self, nombre, mat):
        me = bpy.data.meshes.new(nombre)
        me.from_pydata([tuple(cc.b(p)) for p in self.v], [], self.f)
        me.update()
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        uvl = me.uv_layers.new(name='UVMap')
        for poly in me.polygons:
            for k, li in enumerate(poly.loop_indices):
                c = self.col[poly.index][k]
                ca.data[li].color = (c[0], c[1], c[2], 1.0)
                uvl.data[li].uv = self.uv[poly.index][k]
        me.color_attributes.active_color = ca
        o = bpy.data.objects.new(nombre, me)
        cc.coleccion('hangar').objects.link(o)
        o.data.materials.append(cc.material(mat))
        return o


def mezclar(c, k):
    return tuple(min(1.0, x * k) for x in c)


if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    HORMIGON, JUNTA, AMARILLO = lin('#9c9fa3'), lin('#5d6064'), lin('#d9b21f')
    CHAPA, ZOCALO = lin('#c9cdd2'), lin('#5a5f66')
    ACERO, LUZ = lin('#2d3239'), (1.0, 1.0, 1.0)
    PLATAFORMA, PASTO = lin('#b7b8b4'), lin('#7f8c5c')

    # ---------------------------------------------------------------- piso: grilla de 1 m con la «luz horneada», juntas y sendas
    piso = Malla()
    def ao_piso(x, z):
        d = min(x + W, W - x, z + FONDO, -z if abs(x) > PORTON['abierto'] / 2 else 6.0)
        k = 0.66 + 0.34 * suave(0.0, 2.6, d)
        for sx, sz, rx, rz, f in SOMBRAS:
            k *= 1 - f * math.exp(-(((x - sx) / rx) ** 2 + ((z - sz) / rz) ** 2))
        k *= 0.96 + 0.04 * math.sin(x * 0.37 + 1.1) * math.cos(z * 0.29)
        return mezclar(HORMIGON, k)
    for i in range(int(ANCHO)):
        for j in range(int(FONDO)):
            x0, z0 = -W + i, -j - 1.0
            pts = [(x0, 0, z0), (x0 + 1, 0, z0), (x0 + 1, 0, z0 + 1), (x0, 0, z0 + 1)]
            piso.quad(*pts, [ao_piso(p[0], p[2]) for p in pts])
    y_l = 0.002
    for k in range(1, int(ANCHO / 5)):                     # juntas aserradas cada 5 m
        x = -W + 5 * k
        piso.quad((x - 0.008, y_l, -FONDO), (x + 0.008, y_l, -FONDO), (x + 0.008, y_l, 0), (x - 0.008, y_l, 0), JUNTA)
    for k in range(1, int(FONDO / 5)):
        z = -5.0 * k
        piso.quad((-W, y_l, z - 0.008), (W, y_l, z - 0.008), (W, y_l, z + 0.008), (-W, y_l, z + 0.008), JUNTA)
    def senda(x0, x1, z0, z1, a=0.10):                       # rectángulo pintado (4 franjas)
        y = 0.004
        for q in (((x0, y, z0), (x1, y, z0), (x1, y, z0 + a), (x0, y, z0 + a)), ((x0, y, z1 - a), (x1, y, z1 - a), (x1, y, z1), (x0, y, z1)),
                  ((x0, y, z0), (x0 + a, y, z0), (x0 + a, y, z1), (x0, y, z1)), ((x1 - a, y, z0), (x1, y, z0), (x1, y, z1), (x1 - a, y, z1))):
            piso.quad(*q, AMARILLO)
    for x0, x1, z0, z1 in ZONAS.values():
        senda(x0, x1, z0, z1)
    for sx in (-1, 1):                                       # pasillos junto a las paredes
        x = sx * (W - 2.0)
        piso.quad((x - 0.06, 0.004, -FONDO + 1), (x + 0.06, 0.004, -FONDO + 1), (x + 0.06, 0.004, -1), (x - 0.06, 0.004, -1), AMARILLO)

    # ---------------------------------------------------------------- chapa: paredes laterales, fondo, frente con el portón y el techo
    chapa = Malla()
    def col_pared(y):
        return mezclar(CHAPA, 0.70 + 0.30 * suave(0.0, 5.0, y))
    ZOC = 0.9                                                # zócalo de hormigón
    for sx in (-1, 1):                                       # laterales: bahías de 7,5 m y filas de 1,5 m; u (cruza las ondas) = z
        x = sx * W
        for b in range(int(FONDO / BAHIA)):
            za, zb = -b * BAHIA, -(b + 1) * BAHIA
            ys = [ZOC + (ALTO_LADO - ZOC) * k / 4 for k in range(5)]
            for y0, y1 in zip(ys, ys[1:]):
                chapa.quad((x, y0, za), (x, y0, zb), (x, y1, zb), (x, y1, za), [col_pared(y0), col_pared(y0), col_pared(y1), col_pared(y1)],
                           [(-za, y0), (-zb, y0), (-zb, y1), (-za, y1)])
    def pared_frontal(z, hueco=None):                         # fondo o frente, en franjas verticales de 1 m hasta el arco; u = x
        for i in range(int(ANCHO)):
            xa, xb = -W + i, -W + i + 1
            ya, yb = arco_y(xa), arco_y(xb)
            if hueco and xb <= hueco[1] and xa >= hueco[0]:
                y0 = hueco[2]
            else:
                y0 = ZOC
            chapa.quad((xa, y0, z), (xb, y0, z), (xb, yb, z), (xa, ya, z), [col_pared(y0), col_pared(y0), col_pared(yb), col_pared(ya)],
                       [(xa, y0), (xb, y0), (xb, yb), (xa, ya)])
    pared_frontal(-FONDO)
    pared_frontal(0.0, (-PORTON['ancho'] / 2, PORTON['ancho'] / 2, PORTON['alto']))
    for k in range(N_ARCO):                                  # techo: del alero al alero, en bahías; u = z (las ondas bajan por la pendiente)
        fa, fb = -PHI + 2 * PHI * k / N_ARCO, -PHI + 2 * PHI * (k + 1) / N_ARCO
        xa, ya, xb, yb = R * math.sin(fa), CY + R * math.cos(fa), R * math.sin(fb), CY + R * math.cos(fb)
        ca_, cb_ = mezclar(CHAPA, 0.80 + 0.12 * (ya - ALTO_LADO) / 6), mezclar(CHAPA, 0.80 + 0.12 * (yb - ALTO_LADO) / 6)
        for b in range(int(FONDO / BAHIA)):
            za, zb = -b * BAHIA, -(b + 1) * BAHIA
            chapa.quad((xa, ya, za), (xa, ya, zb), (xb, yb, zb), (xb, yb, za), [ca_, ca_, cb_, cb_], [(-za, R * fa), (-zb, R * fa), (-zb, R * fb), (-za, R * fb)])
    # el portón: dos pilas de hojas corridas a los costados (5 m × 8 m), abierto 12 m en el centro
    hoja, alto_p = 5.0, PORTON['alto']
    for sx in (-1, 1):
        for k, (dz, x_in) in enumerate(((0.35, PORTON['abierto'] / 2), (0.55, PORTON['abierto'] / 2 + 3.0), (0.75, PORTON['abierto'] / 2 + 6.0))):
            xa, xb = sx * x_in, sx * (x_in + hoja)
            x0, x1 = min(xa, xb), max(xa, xb)
            chapa.quad((x0, 0.02, dz), (x1, 0.02, dz), (x1, alto_p, dz), (x0, alto_p, dz), [mezclar(CHAPA, 0.78)] * 2 + [mezclar(CHAPA, 0.95)] * 2,
                       [(x0, 0.02), (x1, 0.02), (x1, alto_p), (x0, alto_p)])

    # ---------------------------------------------------------------- estructura: zócalo, columnas, arcos, correas, riel del portón
    est = Malla()
    almas = Malla()                                          # las almas de los arcos, CALADAS: el juego les pone agujeros redondos por textura
    PASO_AGUJERO = 0.75                                      # un agujero cada 0,75 m de arco (el alma mide 0,74: la textura queda cuadrada)
    for sx in (-1, 1):
        x = sx * W
        est.quad((x - sx * 0.02, 0, 0), (x - sx * 0.02, 0, -FONDO), (x - sx * 0.02, ZOC, -FONDO), (x - sx * 0.02, ZOC, 0), ZOCALO)
    est.quad((-W, 0, -FONDO + 0.02), (W, 0, -FONDO + 0.02), (W, ZOC, -FONDO + 0.02), (-W, ZOC, -FONDO + 0.02), ZOCALO)
    for sx in (-1, 1):                                       # el zócalo del frente, a los costados del portón
        xa, xb = sx * PORTON['ancho'] / 2, sx * W
        est.quad((min(xa, xb), 0, -0.02), (max(xa, xb), 0, -0.02), (max(xa, xb), ZOC, -0.02), (min(xa, xb), ZOC, -0.02), ZOCALO)
    for b in range(int(FONDO / BAHIA) + 1):
        z = -b * BAHIA
        zc = min(-0.2, max(-FONDO + 0.2, z))
        for sx in (-1, 1):                                   # columna
            x = sx * (W - 0.25)
            est.caja(x - 0.2, x + 0.2, 0, ALTO_LADO, zc - 0.2, zc + 0.2, ACERO)
        for k in range(N_ARCO):                              # arco: viga curva de 0,74 m de alma bajo la chapa (llega a 1 cm de la chapa)
            fa, fb = -PHI + 2 * PHI * k / N_ARCO, -PHI + 2 * PHI * (k + 1) / N_ARCO
            ri, ro = R - 0.75, R - 0.01
            pa_i = (ri * math.sin(fa), CY + ri * math.cos(fa)); pb_i = (ri * math.sin(fb), CY + ri * math.cos(fb))
            pa_o = (ro * math.sin(fa), CY + ro * math.cos(fa)); pb_o = (ro * math.sin(fb), CY + ro * math.cos(fb))
            z0, z1 = zc - 0.15, zc + 0.15
            est.quad((pa_i[0], pa_i[1], z0), (pb_i[0], pb_i[1], z0), (pb_i[0], pb_i[1], z1), (pa_i[0], pa_i[1], z1), ACERO)   # ala de abajo
            # u = metros de arco / paso (a radio medio); el primer y el último tramo, macizos (u entero = la parte llena de la textura)
            rm = (ri + ro) / 2
            ua, ub = rm * (fa + PHI) / PASO_AGUJERO, rm * (fb + PHI) / PASO_AGUJERO
            if k in (0, N_ARCO - 1):
                ua = ub = float(round(ua))
            for z_ in (z0, z1):                                                                                                # almas
                almas.quad((pa_i[0], pa_i[1], z_), (pb_i[0], pb_i[1], z_), (pb_o[0], pb_o[1], z_), (pa_o[0], pa_o[1], z_), mezclar(ACERO, 1.15),
                           [(ua, 0.0), (ub, 0.0), (ub, 1.0), (ua, 1.0)])
    for k in range(1, 10):                                   # correas a lo largo de la nave
        f = -PHI + 2 * PHI * k / 10
        r0, r1 = R - 0.2, R - 0.01
        xa, ya, xb, yb = r0 * math.sin(f), CY + r0 * math.cos(f), r1 * math.sin(f), CY + r1 * math.cos(f)
        t = (math.cos(f) * 0.07, -math.sin(f) * 0.07)
        est.quad((xa - t[0], ya - t[1], 0), (xa + t[0], ya + t[1], 0), (xa + t[0], ya + t[1], -FONDO), (xa - t[0], ya - t[1], -FONDO), ACERO)
        est.quad((xa - t[0], ya - t[1], 0), (xa - t[0], ya - t[1], -FONDO), (xb - t[0], yb - t[1], -FONDO), (xb - t[0], yb - t[1], 0), ACERO)
    est.caja(-W, W, PORTON['alto'], PORTON['alto'] + 0.4, 0.1, 0.9, ACERO)   # riel del portón

    # ---------------------------------------------------------------- luminarias LED redondas (discos que brillan), colgadas bajo el techo
    luces = Malla()
    pos_luces = []
    for x in (-14.0, -7.0, 0.0, 7.0, 14.0):
        for b in range(int(FONDO / BAHIA)):
            z = -(b + 0.5) * BAHIA
            y = arco_y(x) - 1.3
            pos_luces.append((x, round(y, 3), z))
            n = 12
            for i in range(n):
                a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
                luces.cara([(x, y, z), (x + 0.32 * math.cos(a1), y, z + 0.32 * math.sin(a1)), (x + 0.32 * math.cos(a0), y, z + 0.32 * math.sin(a0))], [LUZ] * 3)
            est.caja(x - 0.36, x + 0.36, y + 0.02, y + 0.08, z - 0.36, z + 0.36, mezclar(ACERO, 0.9))   # la carcasa
            est.caja(x - 0.01, x + 0.01, y + 0.08, arco_y(x) - 0.005, z - 0.01, z + 0.01, ACERO)           # el cable, hasta la chapa

    # ---------------------------------------------------------------- afuera: la plataforma frente al portón y el pasto
    afuera = Malla()
    for i in range(10):
        for j in range(4):
            x0, z0 = -50 + 10 * i, 10.0 * j
            k = lambda x, z: mezclar(PLATAFORMA, 0.92 + 0.08 * math.sin(x * 0.21) * math.cos(z * 0.17))
            afuera.quad((x0, -0.01, z0), (x0 + 10, -0.01, z0), (x0 + 10, -0.01, z0 + 10), (x0, -0.01, z0 + 10), [k(x0, z0), k(x0 + 10, z0), k(x0 + 10, z0 + 10), k(x0, z0 + 10)])
    for x0, x1, z0, z1 in ((-400, 400, 40, 400), (-400, -50, -400, 40), (50, 400, -400, 40), (-50, 50, -400, -60.5)):
        afuera.quad((x0, -0.03, z0), (x1, -0.03, z0), (x1, -0.03, z1), (x0, -0.03, z1), PASTO)

    objs = [piso.construir('hangar_piso', 'hangar_piso'), chapa.construir('hangar_chapa', 'hangar_chapa'), est.construir('hangar_estructura', 'hangar_estructura'),
            almas.construir('hangar_almas', 'hangar_alma'), luces.construir('hangar_luces', 'hangar_luz'), afuera.construir('hangar_afuera', 'hangar_afuera')]
    tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    for mt in bpy.data.materials:
        mt.use_backface_culling = False
        if mt.use_nodes:                                     # el color base sale del color por vértice (para las vistas de Eevee)
            nodos = mt.node_tree.nodes
            attr = nodos.new('ShaderNodeVertexColor')
            attr.layer_name = 'Col'
            mt.node_tree.links.new(attr.outputs['Color'], nodos['Principled BSDF'].inputs['Base Color'])
    if VISTAS:
        os.makedirs(VISTAS, exist_ok=True)
        for nombre, desde, hacia, lente in (('01_desde_el_taller', (0, 1.6, -44), (0, 3.0, 0), 16), ('02_desde_el_porton', (0, 1.7, -2), (0, 3.0, -60), 16),
                                            ('03_rincon', (18, 7.5, -2), (-8, 1.5, -40), 14), ('04_techo', (0, 1.7, -30), (0, 11, -36), 14)):
            cc.vista(os.path.join(VISTAS, f'hangar_{nombre}.png'), desde, hacia, lente=lente, res=(1100, 720), fondo=(0.62, 0.72, 0.82))
            print('  vista', nombre)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    opciones = dict(filepath=SALIDA, export_format='GLB', use_selection=True, export_yup=True, export_extras=True, export_apply=True, export_materials='EXPORT')
    try:
        bpy.ops.export_scene.gltf(**opciones, export_vertex_color='ACTIVE')
    except TypeError:
        bpy.ops.export_scene.gltf(**opciones)
    peso = os.path.getsize(SALIDA)
    print(f'  presupuesto → {tri} triángulos · {len(objs)} llamadas · {peso / 1e6:.3f} MB')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': 'T4 (adelantada)', 'triangulos': tri, 'llamadas': len(objs), 'mb': round(peso / 1e6, 3),
                   'nave': {'ancho': ANCHO, 'fondo': FONDO, 'alto_lado': ALTO_LADO, 'alto_centro': ALTO_CENTRO, 'radio_arco': round(R, 3), 'bahia': BAHIA},
                   'porton': PORTON, 'zonas': ZONAS, 'luces': len(pos_luces)}, f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
