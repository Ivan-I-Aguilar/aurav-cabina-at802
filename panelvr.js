// Panel flotante para VR: título, texto y botones, dibujado en un canvas. Se apunta con el rayo del control y se elige con el gatillo.
import * as THREE from './three.module.js';

export function crearPanelVR() {
  const W = 1024, H = 680, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2 * H / W), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }));
  malla.renderOrder = 10; malla.visible = false; malla.name = 'panelVR';
  let datos = { titulo: '', texto: '', botones: [] }, rects = [], hover = -1, alSeleccionar = null;

  function envolver(texto, ancho) {
    const lineas = []; for (const parrafo of String(texto).split('\n')) { let l = ''; for (const p of parrafo.split(' ')) { const t = l ? l + ' ' + p : p; if (g.measureText(t).width > ancho && l) { lineas.push(l); l = p; } else l = t; } lineas.push(l); }
    return lineas;
  }
  function dibujar() {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(8,36,64,0.92)'; g.beginPath(); g.roundRect(0, 0, W, H, 36); g.fill();
    g.fillStyle = '#c8e63a'; g.font = 'bold 44px Arial'; g.textBaseline = 'top'; g.fillText(datos.titulo || '', 40, 32);
    g.fillStyle = '#ffffff'; g.font = '32px Arial'; let y = 100;
    for (const l of envolver(datos.texto || '', W - 80)) { g.fillText(l, 40, y); y += 40; if (y > 380) break; }
    rects = []; const bs = datos.botones || [], cols = bs.length > 4 ? 4 : bs.length || 1, bw = (W - 80 - (cols - 1) * 14) / cols, bh = bs.length > 4 ? 56 : 80;
    const y0 = bs.length > 4 ? H - 30 - Math.ceil(bs.length / cols) * (bh + 12) : H - 120;
    bs.forEach((b, i) => { const c = i % cols, r = Math.floor(i / cols), x = 40 + c * (bw + 14), yy = y0 + r * (bh + 12);
      rects.push([x, yy, bw, bh]); g.fillStyle = i === hover ? '#c8e63a' : '#ffffff'; g.beginPath(); g.roundRect(x, yy, bw, bh, 14); g.fill();
      g.fillStyle = '#082440'; g.font = `bold ${bs.length > 4 ? 22 : 30}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.texto, x + bw / 2, yy + bh / 2, bw - 16); g.textAlign = 'left'; g.textBaseline = 'top'; });
    tex.needsUpdate = true;
  }
  const ray = new THREE.Raycaster(), m4 = new THREE.Matrix4();
  function indiceDesde(control) {
    m4.identity().extractRotation(control.matrixWorld); ray.ray.origin.setFromMatrixPosition(control.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m4);
    const hit = ray.intersectObject(malla)[0]; if (!hit) return [-1, null];
    const u = hit.uv.x * W, v = (1 - hit.uv.y) * H; return [rects.findIndex(([x, y, w, h]) => u >= x && u <= x + w && v >= y && v <= y + h), hit];
  }
  return {
    malla,
    get visible() { return malla.visible; },
    mostrar(d, cb, camara) {
      datos = d; alSeleccionar = cb; hover = -1; dibujar(); malla.visible = true;
      if (camara) { const p = new THREE.Vector3(), q = new THREE.Quaternion(); camara.getWorldPosition(p); camara.getWorldQuaternion(q);
        const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q); f.y = 0; f.normalize();
        malla.position.copy(p).addScaledVector(f, 1.3); malla.position.y = p.y - 0.15; malla.lookAt(p.x, malla.position.y, p.z); }
    },
    ocultar() { malla.visible = false; alSeleccionar = null; },
    // devuelve la distancia del impacto (para dibujar el rayo) o null
    apuntar(control) { if (!malla.visible) return null; const [i, hit] = indiceDesde(control); if (i !== hover) { hover = i; dibujar(); } return hit ? hit.distance : null; },
    gatillo(control) { if (!malla.visible) return false; const [i, hit] = indiceDesde(control); if (!hit) return false;
      if (i >= 0 && alSeleccionar) { const cb = alSeleccionar, id = datos.botones[i].id; cb(id); } return true; },
  };
}
