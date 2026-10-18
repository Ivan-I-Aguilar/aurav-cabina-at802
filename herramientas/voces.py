# Junta las frases que dice el tutor (literales de mision.js y main.js) y escribe voz/frases.json
# con { clave: texto }. La clave es el FNV-1a de 32 bits del texto (igual que claveVoz() en audio.js).
# Después: powershell -File herramientas/voces.ps1  → genera voz/<clave>.wav con la voz Sabina de Windows.
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def clave(t):
    h, b = 0x811c9dc5, t.encode('utf-16-le')   # unidades UTF-16, como charCodeAt en JS
    for i in range(0, len(b), 2):
        h ^= b[i] | b[i + 1] << 8; h = (h * 0x01000193) & 0xffffffff
    return format(h, '08x')

# cómo se dice (la clave sigue siendo la del texto escrito)
PRONUNCIA = [(r'\bNg\b', 'ene ge'), (r'\bITT\b', 'i te te'), (r'\bF PUMP\b', 'efe pump'), (r'\bHOPR\b', 'hopper'), (r'\bON\b', 'on'), (r'\bOFF\b', 'off'),
             (r'\bRUN\b', 'ran'), (r'\bSTART\b', 'start'), (r'\bFIRE\b', 'faier'), (r'\bmph\b', 'millas'), (r'\bft\b', 'pies'), (r'\blb\b', 'libras'),
             (r'≥', 'mayor o igual a'), (r'°C', ' grados'), (r'°', ' grados'), (r'·', ','), (r'–', ' a '), (r'\bAT-802\b', 'A T ochocientos dos')]

def hablado(t):
    for a, b in PRONUNCIA: t = re.sub(a, b, t)
    return t

frases = {}
for nombre in ('mision.js', 'main.js'):
    src = open(os.path.join(RAIZ, nombre), encoding='utf-8').read()
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'", src):
        t = m.group(1).replace("\\'", "'")
        if ' ' in t and re.search(r'[a-záéíóúñ]{3}', t, re.I) and not re.search(r'[{}<>=;]|\$\{|https?:', t) and len(t) < 220:
            frases[clave(t)] = hablado(t)

os.makedirs(os.path.join(RAIZ, 'voz'), exist_ok=True)
json.dump(frases, open(os.path.join(RAIZ, 'voz', 'frases.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(frases), 'frases')
