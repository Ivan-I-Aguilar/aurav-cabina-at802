# Taller de motores · T12 (21/11/2026; PLAN_TALLER.md §15.5): el LOMO DE LA TOLVA del AT-802 (lo que se ve arriba del fuselaje,
# entre el capó y el parabrisas) y la ESCALA DE LA MIRILLA · MODELO: taller/tolva.glb, en el MARCO DEL AVIÓN de juegos/at802.glb
# (+x nariz, +y arriba, +z derecha, metros, origen en el piso entre las ruedas principales).
#
# De dónde sale cada cosa:
# - La SUPERFICIE del lomo (LOMO, más abajo) se midió con rayos contra el modelo del avión el 21/11: todo lo de este archivo va
#   apoyado sobre ella, y en el taller se dibuja junto con el tramo de fuselaje recortado del modelo.
# - Lo que hay ARRIBA sale de las fotos de Iván del avión real (24/9, carpeta de detalles, fuera del repo; números de la hoja de
#   contactos): la tapa roja redonda con su brida de doce bulones y su manija en T (81, 82), el panel de adelante con su bisagra y
#   sus dos trabas de palanca naranja (81), el panel negro antideslizante con sus remaches y la tapa negra levantada (70, 72, 98,
#   100), la cúpula de venteo y sus dos trabas (70, 98), la baranda de dos caños con sus cuatro soportes, la manija en U, la chapa
#   de aluminio y la placa (69, 70, 96, 98).
# - La ESCALA de la mirilla sale de la foto 89: marcas cada 25 galones, de 650 a 800 (la tolva llena son 800 galones, unos 3.000
#   litros). Va sobre la pared de atrás de la tolva, la que mira a la cabina.
# - Todo es [VERIFICAR]: las posiciones y las medidas están tomadas a ojo de las fotos (no hay ninguna tomada de frente ni con una
#   regla), y no se afirma para qué sirve cada tapa. El INTERIOR de la tolva no está: no hay fotos.
#
# Dos mallas, un material, color por vértice: tolva_lomo (todo lo de arriba y la franja de la pared) y tolva_escala (las rayas y
# los números, con userData.luz: en el holograma llevan luz propia para leerse de frente).
#
# Uso: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/taller_tolva.py
import bpy, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cab_comun as cc
from taller_hangar import Malla, lin
from taller_compuerta import tubo, prisma, suma, por, uni

SALIDA = os.path.join(cc.RAIZ, 'taller', 'tolva.glb')
INFORME = os.path.join(cc.RAIZ, 'taller', 'tolva_informe.json')
cc.COLORES.update({'tolva': ('#ffffff', 0.5, 0.2)})

OLIVA, NEGRO, ROJO, NARANJA = lin('#5b5a3a'), lin('#1d1f22'), lin('#c2161f'), lin('#e8501e')
ALUMINIO, ACERO, GRIS = lin('#b9bdc2'), lin('#d0d3d6'), lin('#7b8087')

# ---------------------------------------------------------------- la superficie del lomo, medida en el modelo (y según x y |z|)
LOMO_Z = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
LOMO = [   # (x, [y en cada |z|])  ·  donde el modelo no tiene chapa (la nariz es más angosta) se sigue la pendiente
    (1.25, [2.897, 2.894, 2.881, 2.836, 2.764, 2.570, 2.30, 2.00]),
    (1.00, [2.905, 2.902, 2.896, 2.855, 2.792, 2.684, 2.45, 2.15]),
    (0.75, [2.913, 2.911, 2.908, 2.871, 2.816, 2.732, 2.56, 2.25]),
    (0.50, [2.921, 2.920, 2.919, 2.889, 2.839, 2.769, 2.607, 2.130]),
    (0.25, [2.928, 2.928, 2.927, 2.903, 2.858, 2.797, 2.688, 2.33]),
    (0.00, [2.934, 2.934, 2.933, 2.915, 2.873, 2.815, 2.727, 2.40]),
    (-0.25, [2.938, 2.938, 2.938, 2.923, 2.883, 2.827, 2.747, 2.429]),
    (-0.50, [2.950, 2.950, 2.950, 2.927, 2.889, 2.834, 2.756, 2.576]),
    (-0.75, [2.954, 2.954, 2.954, 2.929, 2.890, 2.835, 2.758, 2.590]),
    (-1.00, [2.955, 2.955, 2.955, 2.930, 2.891, 2.836, 2.759, 2.601]),
    (-1.25, [2.956, 2.956, 2.956, 2.931, 2.892, 2.837, 2.760, 2.609]),
    (-1.50, [2.942, 2.942, 2.942, 2.932, 2.893, 2.838, 2.761, 2.617]),
    (-1.75, [2.943, 2.943, 2.942, 2.933, 2.894, 2.838, 2.761, 2.613]),
    (-1.90, [2.958, 2.958, 2.958, 2.950, 2.904, 2.849, 2.761, 2.571]),
]

def lomo(x, z):
    """la altura de la chapa del lomo en (x, z): interpolación en la tabla medida"""
    z = min(abs(z), LOMO_Z[-1])
    k = min(int(z / 0.1), len(LOMO_Z) - 2)
    fz = (z - LOMO_Z[k]) / 0.1
    def en_fila(fila):
        return fila[k] + (fila[k + 1] - fila[k]) * fz
    if x >= LOMO[0][0]: return en_fila(LOMO[0][1])
    if x <= LOMO[-1][0]: return en_fila(LOMO[-1][1])
    for (x0, f0), (x1, f1) in zip(LOMO, LOMO[1:]):
        if x0 >= x >= x1:
            t = (x0 - x) / (x0 - x1)
            return en_fila(f0) + (en_fila(f1) - en_fila(f0)) * t

def sobre(x, z, h=0.0):
    return (x, lomo(x, z) + h, z)

def parche(m, x0, x1, z0, z1, h0, h1, col, nx=4, nz=6, borde=0.0):
    """una plancha que sigue la curva del lomo, de h0 a h1 sobre la chapa; con borde > 0, la cara de arriba se achica (chaflán)"""
    xs = [x0 + (x1 - x0) * i / nx for i in range(nx + 1)]
    zs = [z0 + (z1 - z0) * j / nz for j in range(nz + 1)]
    def arriba(i, j):
        fx = borde * (1 if i == 0 else -1 if i == nx else 0) * (1 if x1 > x0 else -1)
        fz = borde * (1 if j == 0 else -1 if j == nz else 0) * (1 if z1 > z0 else -1)
        return sobre(xs[i] + fx, zs[j] + fz, h1)
    for i in range(nx):
        for j in range(nz):
            m.quad(arriba(i, j), arriba(i, j + 1), arriba(i + 1, j + 1), arriba(i + 1, j), col)
    for i in range(nx):                             # los dos costados largos
        for j in (0, nz):
            m.quad(sobre(xs[i], zs[j], h0), sobre(xs[i + 1], zs[j], h0), arriba(i + 1, j), arriba(i, j), col)
    for j in range(nz):                             # los dos cortos
        for i in (0, nx):
            m.quad(sobre(xs[i], zs[j], h0), sobre(xs[i], zs[j + 1], h0), arriba(i, j + 1), arriba(i, j), col)

def cilindro(m, x, z, r, h0, h1, col, n=16):
    """un cilindro vertical apoyado en el lomo (en su centro)"""
    y = lomo(x, z)
    tubo(m, [((x, y + h0, z), r), ((x, y + h1, z), r)], col, n=n, eje=(0, 1, 0))

def traba(m, x, z, hacia):
    """una traba de palanca: la base de acero y la palanca naranja, que apunta hacia (dx, dz)"""
    y = lomo(x, z)
    m.caja(x - 0.018, x + 0.018, y, y + 0.03, z - 0.014, z + 0.014, ACERO)
    d = uni((hacia[0], 0.55, hacia[1]))
    p0 = (x, y + 0.03, z)
    tubo(m, [(p0, 0.005), (suma(p0, por(d, 0.035)), 0.005)], ACERO, n=6)
    tubo(m, [(suma(p0, por(d, 0.035)), 0.008), (suma(p0, por(d, 0.085)), 0.008)], NARANJA, n=8)

lomo_m = Malla()
escala = Malla()

# ---------------------------------------------------------------- adelante: el panel con bisagra y la tapa roja (fotos 81 y 82)
PX0, PX1, PZ = 0.72, 0.28, 0.27                  # el panel de adelante [VERIFICAR]
for (xa, xb, za, zb) in ((PX0, PX0 - 0.012, -PZ, PZ), (PX1 + 0.012, PX1, -PZ, PZ), (PX0, PX1, -PZ, -PZ + 0.012), (PX0, PX1, PZ - 0.012, PZ)):
    parche(lomo_m, xa, xb, za, zb, 0.0, 0.005, OLIVA, nx=2, nz=4)                       # el reborde del panel
parche(lomo_m, PX0 + 0.004, PX0 + 0.030, -PZ + 0.01, PZ - 0.01, 0.0, 0.010, ACERO, nx=1, nz=6)   # la bisagra de piano, en el borde de adelante
for z in (-0.09, 0.09):
    traba(lomo_m, PX1 + 0.10 + (0.11 if z > 0 else 0.0), -PZ - 0.035, (0.0, -1.0))      # las dos trabas, del lado izquierdo
CX, CZ = 0.50, 0.05                              # la tapa roja
cilindro(lomo_m, CX, CZ, 0.110, 0.0, 0.012, ALUMINIO, n=24)                             # la brida
for i in range(12):
    a = 2 * math.pi * (i + 0.5) / 12
    cilindro(lomo_m, CX + 0.092 * math.cos(a), CZ + 0.092 * math.sin(a), 0.009, 0.012, 0.018, GRIS, n=6)
cilindro(lomo_m, CX, CZ, 0.074, 0.012, 0.030, ROJO, n=20)                               # la tapa
yc = lomo(CX, CZ)
lomo_m.caja(CX - 0.006, CX + 0.006, yc + 0.030, yc + 0.040, CZ - 0.035, CZ + 0.035, ROJO)   # la manija en T
lomo_m.caja(CX - 0.006, CX + 0.006, yc + 0.030, yc + 0.040, CZ - 0.006, CZ + 0.006, ROJO)
lomo_m.caja(CX - 0.030, CX + 0.006, yc + 0.030, yc + 0.040, CZ - 0.006, CZ + 0.006, ROJO)

# ---------------------------------------------------------------- en el medio: el panel negro con sus remaches y la tapa levantada
NX0, NX1, NZ = 0.23, -0.49, 0.27                 # el panel negro antideslizante [VERIFICAR]
parche(lomo_m, NX0, NX1, -NZ, NZ, 0.0, 0.006, NEGRO, nx=4, nz=6)
n_l, n_c = 9, 7
for i in range(n_l):                             # los remaches del borde
    x = NX0 - 0.03 - i * (NX0 - NX1 - 0.06) / (n_l - 1)
    for z in (-NZ + 0.03, NZ - 0.03):
        cilindro(lomo_m, x, z, 0.006, 0.006, 0.009, GRIS, n=6)
for j in range(1, n_c - 1):
    z = -NZ + 0.03 + j * (2 * NZ - 0.06) / (n_c - 1)
    for x in (NX0 - 0.03, NX1 + 0.03):
        cilindro(lomo_m, x, z, 0.006, 0.006, 0.009, GRIS, n=6)
TX0, TX1, TZ = -0.41, -0.95, 0.23                # la tapa negra levantada, que pisa el panel [VERIFICAR]
parche(lomo_m, TX0, TX1, -TZ, TZ, 0.006, 0.045, NEGRO, nx=3, nz=5, borde=0.03)
cilindro(lomo_m, TX0 + 0.02, 0.0, 0.014, 0.006, 0.05, NEGRO, n=10)                     # el botón del borde

# ---------------------------------------------------------------- atrás: la cúpula de venteo y sus dos trabas (fotos 70 y 98)
DX, DZ, DR = -1.50, 0.32, 0.12
yd = lomo(DX, DZ)
N_LON, N_LAT = 12, 4
def cupula(i, j):
    lat = (math.pi / 2) * j / N_LAT
    lon = 2 * math.pi * i / N_LON
    return (DX + DR * math.cos(lat) * math.cos(lon), yd + 0.75 * DR * math.sin(lat), DZ + DR * math.cos(lat) * math.sin(lon))
for i in range(N_LON):
    for j in range(N_LAT):
        if j == N_LAT - 1:
            lomo_m.cara([cupula(i, j), cupula(i + 1, j), (DX, yd + 0.75 * DR, DZ)], [OLIVA] * 3)
        else:
            lomo_m.quad(cupula(i, j), cupula(i + 1, j), cupula(i + 1, j + 1), cupula(i, j + 1), OLIVA)
traba(lomo_m, -1.36, 0.10, (0.6, -0.5))
traba(lomo_m, -1.40, 0.22, (0.6, -0.5))

# ---------------------------------------------------------------- a la izquierda: la baranda de dos caños, la manija, la chapa, la placa
BX0, BX1 = 0.30, -1.30                           # la baranda [VERIFICAR]
BZ = (-0.40, -0.51)
for z in BZ:
    pts = [((BX0 + (BX1 - BX0) * i / 8, lomo(BX0 + (BX1 - BX0) * i / 8, z) + 0.035, z), 0.011) for i in range(9)]
    tubo(lomo_m, pts, ACERO, n=8)
for x in (0.25, -0.25, -0.78, -1.25):            # los cuatro soportes
    a4 = [sobre(x - 0.02, BZ[0] + 0.02), sobre(x + 0.02, BZ[0] + 0.02), sobre(x + 0.02, BZ[1] - 0.02), sobre(x - 0.02, BZ[1] - 0.02)]
    b4 = [sobre(x - 0.02, BZ[0] + 0.02, 0.05), sobre(x + 0.02, BZ[0] + 0.02, 0.05), sobre(x + 0.02, BZ[1] - 0.02, 0.05), sobre(x - 0.02, BZ[1] - 0.02, 0.05)]
    prisma(lomo_m, a4, b4, ACERO)
zm = -0.325                                      # la manija en U, entre el panel negro y la baranda
tubo(lomo_m, [(sobre(0.00, zm), 0.008), (sobre(0.00, zm, 0.045), 0.008), (sobre(-0.16, zm, 0.045), 0.008), (sobre(-0.16, zm), 0.008)], ACERO, n=8)
parche(lomo_m, 0.05, -0.25, -0.53, -0.68, 0.0, 0.004, ALUMINIO, nx=2, nz=4)             # la chapa de aluminio, por fuera de la baranda
parche(lomo_m, -0.26, -0.42, -0.335, -0.29, 0.0, 0.003, NEGRO, nx=1, nz=1)               # la placa

# ---------------------------------------------------------------- la escala de la mirilla (foto 89): en la pared de atrás de la tolva
EX = -1.80                                       # la pared de atrás, la que mira a la cabina [VERIFICAR]
EZ0, EZ1 = 0.07, 0.21
Y800, PASO_Y = 2.80, 0.055                       # la marca de 800 galones y lo que baja cada 25 galones [VERIFICAR]
lomo_m.quad((EX, 2.42, EZ0), (EX, 2.42, EZ1), (EX, 2.86, EZ1), (EX, 2.86, EZ0), OLIVA)   # la franja traslúcida de la pared (va con el lomo)
SEG = {'0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abfgcd'}
def digito(m, d, z0, y0, ancho=0.016, alto=0.028, g=0.0035):
    """un dígito de siete segmentos, visto desde la cabina (mirando hacia adelante: la derecha es +z), apenas despegado de la pared"""
    x = EX - 0.004
    def barra(za, zb, ya, yb):
        m.quad((x, ya, za), (x, ya, zb), (x, yb, zb), (x, yb, za), NEGRO)
    h = alto / 2
    for s in SEG[d]:
        if s == 'a': barra(z0, z0 + ancho, y0 + alto - g, y0 + alto)
        if s == 'g': barra(z0, z0 + ancho, y0 + h - g / 2, y0 + h + g / 2)
        if s == 'd': barra(z0, z0 + ancho, y0, y0 + g)
        if s == 'f': barra(z0, z0 + g, y0 + h, y0 + alto)
        if s == 'e': barra(z0, z0 + g, y0, y0 + h)
        if s == 'b': barra(z0 + ancho - g, z0 + ancho, y0 + h, y0 + alto)
        if s == 'c': barra(z0 + ancho - g, z0 + ancho, y0, y0 + h)
marcas = []
for i, gal in enumerate(range(800, 649, -25)):
    y = Y800 - i * PASO_Y
    marcas.append({'galones': gal, 'y': round(y, 3)})
    x = EX - 0.004
    escala.quad((x, y - 0.003, EZ0 + 0.008), (x, y - 0.003, EZ0 + 0.055), (x, y + 0.003, EZ0 + 0.055), (x, y + 0.003, EZ0 + 0.008), NEGRO)   # la raya
    for k, d in enumerate(str(gal)):
        digito(escala, d, EZ0 + 0.066 + k * 0.022, y + 0.008)

if __name__ == '__main__':
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = [lomo_m.construir('tolva_lomo', 'tolva'), escala.construir('tolva_escala', 'tolva')]
    medidas = {'marco': 'avión: +x nariz, +y arriba, +z derecha, m; origen en el piso entre las ruedas principales',
               'panel_adelante_x': [PX0, PX1], 'tapa_roja': [CX, round(lomo(CX, CZ), 3), CZ], 'panel_negro_x': [NX0, NX1],
               'tapa_levantada_x': [TX0, TX1], 'cupula': [DX, round(yd, 3), DZ], 'baranda_x': [BX0, BX1], 'baranda_z': list(BZ),
               'escala': {'x': EX, 'z': [EZ0, EZ1], 'marcas': marcas, 'tolva_llena_galones': 800}}
    objs[0]['tolva'] = json.dumps(medidas)
    objs[1]['luz'] = 0.6          # en el holograma las rayas y los números de la escala llevan luz propia: se leen de frente
    tri = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
    for mt in bpy.data.materials:
        mt.use_backface_culling = False
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    opciones = dict(filepath=SALIDA, export_format='GLB', use_selection=True, export_yup=True, export_extras=True, export_apply=True, export_materials='EXPORT')
    try:
        bpy.ops.export_scene.gltf(**opciones, export_vertex_color='ACTIVE')
    except TypeError:
        bpy.ops.export_scene.gltf(**opciones)
    peso = os.path.getsize(SALIDA)
    print(f'  presupuesto → {sum(tri.values())} triángulos · {len(objs)} mallas · {peso / 1e6:.3f} MB · {tri}')
    with open(INFORME, 'w', encoding='utf-8') as f:
        json.dump({'etapa': 'T12', 'triangulos': tri, 'mallas': len(objs), 'mb': round(peso / 1e6, 3), 'medidas': medidas,
                   'nota': 'superficie del lomo medida en juegos/at802.glb; lo de arriba, de las fotos del avión real, a ojo [VERIFICAR]; el interior de la tolva no está'},
                  f, ensure_ascii=False, indent=1)
    print(f'SALIDA → {SALIDA} · informe → {INFORME} ({time.time() - t0:.0f} s)')
