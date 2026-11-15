# Servidor local SIN CACHÉ (1/11): python servidor.py y abrir http://localhost:8765/
# Manda Cache-Control: no-store en TODO, así cada F5 trae la última versión de verdad.
# (Con `python -m http.server` el navegador cacheaba index/main/GLB y se veían versiones viejas.)
# Otro puerto (15/11, para tener dos abiertos: la cabina y el taller): python servidor.py 8766
import http.server
import sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f'Sirviendo en http://localhost:{puerto}/ (sin caché)')
    http.server.ThreadingHTTPServer(('', puerto), SinCache).serve_forever()
