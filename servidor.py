# Servidor local SIN CACHÉ (1/11): python servidor.py y abrir http://localhost:8765/
# Manda Cache-Control: no-store en TODO, así cada F5 trae la última versión de verdad.
# (Con `python -m http.server` el navegador cacheaba index/main/GLB y se veían versiones viejas.)
import http.server


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    print('Sirviendo en http://localhost:8765/ (sin caché)')
    http.server.ThreadingHTTPServer(('', 8765), SinCache).serve_forever()
