# Chequeo antes de publicar en GitHub Pages (12/11/2026).
# Pages distingue mayúsculas y sólo sirve lo que está en git; el servidor local (Windows) no distingue y sirve también lo
# que git ignora o no sigue. Un nombre mal escrito o un archivo sin agregar anda acá y da 404 allá (y en el Quest).
# Revisa: cada archivo local que nombran index.html y los módulos del juego, las piezas de la cabina (PIEZAS) y el WAV
# de cada frase de voz/frases.json.
#   python -E -P -X utf8 herramientas/prevuelo_pages.py        (termina con código 1 si hay algo que arreglar)
import json, os, re, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def git(*a):
    return subprocess.run(['git', '-C', REPO, *a], capture_output=True, text=True, encoding='utf-8').stdout


EN_GIT = [t for t in git('ls-files').split('\n') if t]
S = set(EN_GIT)
MINUS = {t.lower(): t for t in EN_GIT}

AJENOS = {'GLTFLoader.js', 'BufferGeometryUtils.js'}     # de three.js: sus comentarios nombran archivos de ejemplo
SABIDOS = {                                               # nombres que no son un archivo que haya que servir
    'motobomba.glb': 'carga opcional: si falta queda la motobomba de cajas',
    'constancia-cabina-at802.png': 'nombre de la descarga',
}
DESCARGAS = ('cabina-nivel${', 'constancia-cabina-nivel${')   # nombres de descarga armados en debrief.js

EXT = r'(?:js|mjs|glb|gltf|png|jpg|jpeg|webp|wav|mp3|ogg|json|txt|svg|bin|hdr|ktx2|css|html)'
PAT = re.compile(r'''(['"`])((?:\./|\.\./)*[A-Za-z0-9_\-./${}]*?[A-Za-z0-9_\-}]\.''' + EXT + r''')(\?[^'"`]*)?\1''')

bien, mal, falta, en_vivo = 0, [], [], []


def revisar(fuente, linea, ruta):
    """Clasifica una ruta fija: bien, mayúsculas distintas o no está en git."""
    global bien
    cand = [os.path.normpath(os.path.join(os.path.dirname(fuente), ruta)).replace('\\', '/')]
    raiz = os.path.normpath(ruta).replace('\\', '/')
    if raiz not in cand:
        cand.append(raiz)
    if any(c in S for c in cand):
        bien += 1
    elif any(c.lower() in MINUS for c in cand):
        c = next(c for c in cand if c.lower() in MINUS)
        mal.append((fuente, linea, ruta, 'en git se llama ' + MINUS[c.lower()]))
    elif raiz not in SABIDOS:
        en_disco = any(os.path.exists(os.path.join(REPO, c)) for c in cand)
        falta.append((fuente, linea, ruta, 'está en disco pero NO en git' if en_disco else 'no existe'))


FUENTES = [t for t in EN_GIT if t == 'index.html' or t == 'herramientas/piloto_prueba.js'
           or (t.endswith('.js') and '/' not in t and not t.startswith('three.') and t not in AJENOS)
           # el taller de motores (PLAN_TALLER.md, T10): su página y sus módulos (las rutas de los GLB son relativas a la página)
           or t == 'taller.html' or (t.startswith('taller/') and t.endswith('.js'))]
for f in FUENTES:
    with open(os.path.join(REPO, f), encoding='utf-8') as fh:
        for n, renglon in enumerate(fh.read().split('\n'), 1):
            for m in PAT.finditer(renglon):
                p = m.group(2)
                if p.startswith('http') or '//' in p:
                    continue
                if '${' in p:
                    if not p.startswith(DESCARGAS):
                        en_vivo.append((f, n, p))
                    continue
                revisar(f, n, p)

# las dos rutas armadas en vivo que se saben resolver
with open(os.path.join(REPO, 'cabina_nueva.js'), encoding='utf-8') as fh:
    piezas = re.search(r'PIEZAS\s*=\s*\[([^\]]*)\]', fh.read())
nombres = re.findall(r"'([^']+)'", piezas.group(1)) if piezas else []
for nombre in nombres:
    revisar('cabina_nueva.js (PIEZAS)', 0, f'blender/{nombre}.glb')
with open(os.path.join(REPO, 'voz', 'frases.json'), encoding='utf-8') as fh:
    frases = json.load(fh)
for clave in frases:
    revisar('voz/frases.json', 0, f'voz/{clave}.wav')
otras = [x for x in en_vivo if x[2] not in ('./voz/${k}.wav', './blender/${nombre}.glb')]

sin_seguir = [r for r in git('status', '--porcelain').split('\n') if r.startswith('??')]

print(f'fuentes: {len(FUENTES)} · rutas correctas: {bien} (con {len(nombres)} piezas de la cabina y {len(frases)} frases de voz)')
print(f'MAYÚSCULAS DISTINTAS (da 404 en Pages): {len(mal)}')
for x in mal:
    print('   ', *x, sep=' · ')
print(f'NO ESTÁ EN GIT (da 404 en Pages): {len(falta)}')
for x in falta:
    print('   ', *x, sep=' · ')
print(f'archivos sin agregar a git (no se publican): {len(sin_seguir)}')
for x in sin_seguir:
    print('   ', x)
if otras:
    print(f'rutas armadas en vivo que este script no sabe resolver (mirarlas a mano): {len(otras)}')
    for x in otras:
        print('   ', *x, sep=' · ')
if mal or falta:
    print('HAY QUE ARREGLAR lo de arriba antes de publicar.')
    sys.exit(1)
print('TODO BIEN para publicar.')
