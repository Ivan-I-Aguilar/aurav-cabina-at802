// Consola de radios de la derecha: los equipos como caras dibujadas en canvas con sus perillas en 3D (equipo()), apilados sobre
// la cara del bloque que trae blender/cab_radios.glb (crearRadiosEn, etapa 5). El pedestal inventado para la cabina FSX se fue el 11/11.
import * as THREE from './three.module.js';

const negro = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.75 });
const grafito = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.6 });
const metal = new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.4, metalness: 0.6 });

function lienzo(w, h, dib) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = '#1c1d20'; c.fillRect(0, 0, w, h); dib(c, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const txt = (c, t, x, y, s, col = '#e8e8e8', al = 'left', b = false) => { c.fillStyle = col; c.font = `${b ? 'bold ' : ''}${s}px Arial`; c.textAlign = al; c.textBaseline = 'middle'; c.fillText(t, x, y); };
const pantalla = (c, x, y, w, h, fondo = '#07110c') => { c.fillStyle = '#000'; c.fillRect(x - 3, y - 3, w + 6, h + 6); c.fillStyle = fondo; c.fillRect(x, y, w, h); };
const tecla = (c, x, y, w, h, t = '', col = '#3b3c40') => { c.fillStyle = col; c.fillRect(x, y, w, h); c.strokeStyle = '#0b0b0c'; c.lineWidth = 2; c.strokeRect(x, y, w, h); if (t) txt(c, t, x + w / 2, y + h / 2, Math.min(h * 0.5, 13), '#e4e4e4', 'center'); };
const led = (c, x, y, on) => { c.fillStyle = on ? '#43e06a' : '#243127'; c.fillRect(x, y, 14, 5); };

// cada equipo: caja con cara dibujada y perillas en 3D. ancho/alto en metros; dib dibuja la cara (canvas 512 px de ancho)
function equipo(ancho, alto, prof, dib, perillas = []) {
  const g = new THREE.Group();
  const caja = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), grafito); caja.position.z = -prof / 2; g.add(caja);
  const tex = lienzo(512, Math.round(512 * alto / ancho), dib);
  const cara = new THREE.Mesh(new THREE.PlaneGeometry(ancho * 0.985, alto * 0.95), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 })); cara.position.z = 0.0015; g.add(cara);
  for (const [px, py, r, dob] of perillas) {   // px, py en fracción de la cara (0..1 desde arriba-izquierda)
    const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 20), negro); k.rotation.x = Math.PI / 2;
    k.position.set((px - 0.5) * ancho, (0.5 - py) * alto, 0.006); g.add(k);
    const marca = new THREE.Mesh(new THREE.BoxGeometry(0.0015, r * 0.8, 0.002), metal); marca.position.set(k.position.x, k.position.y + r * 0.5, 0.0125); g.add(marca);
    if (dob) { const k2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.02, 20), grafito); k2.rotation.x = Math.PI / 2; k2.position.set(k.position.x, k.position.y, 0.014); g.add(k2); }
  }
  return g;
}

/* Cabina nueva (etapa 5, 11/11): la consola compacta del avión blanco y rojo. El GLB (blender/cab_radios.glb) trae el bloque y en
   userData.radios el marco de su cara (c, u, v, n, w, h: u = derecha del piloto al mirarla, v = arriba, n = hacia el piloto) y la
   lista de unidades (id, alto). Acá se apilan los equipos (las mismas caras en canvas de arriba) desde el borde de arriba y se arma
   la llave MASTER AVIONICS (swAVNC) con la geometría horneada en el marco de la cabina, como pide controles.armar. */
export function crearRadiosEn(datos, cabina) {
  const g = new THREE.Group(); g.name = 'radios_compactas';
  const u = new THREE.Vector3().fromArray(datos.u), v = new THREE.Vector3().fromArray(datos.v), n = new THREE.Vector3().fromArray(datos.n);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, n)); g.position.fromArray(datos.c); cabina.add(g); g.updateMatrix();   /* g.matrix: de la cara al marco de la CABINA (matrixWorld metía el giro del GLB y la posición del avión: el pivote caía fuera de la cabina) */
  const A = datos.w - 0.02; let y = datos.h / 2 - 0.01;
  const apilar = (e, alto, sep = 0.006) => { e.position.set(0, y - alto / 2, 0.002); g.add(e); y -= alto + sep; };
  const caras = {
    pac24: [0.040, (c, w, h) => { const n_ = ['COM1', 'COM2', 'COM3', 'COM4', 'NAV', 'MKR', 'SPKR']; n_.forEach((t, i) => { tecla(c, 14 + i * 52, 12, 44, 40, t); led(c, 28 + i * 52, 58, i < 1); });
      txt(c, 'PAC24', w - 150, h / 2 - 14, 15, '#9a9a9a', 'right', true); txt(c, 'MASTER', w - 44, 20, 12, '#ddd', 'center'); txt(c, 'AVIONICS', w - 44, 34, 12, '#ddd', 'center'); txt(c, 'ON', w - 44, h - 42, 11, '#aaa', 'center'); txt(c, 'OFF', w - 44, h - 12, 11, '#aaa', 'center'); }, [[0.68, 0.5, 0.008]]],
    com: [0.060, (c, w, h) => { pantalla(c, 90, 14, 330, h - 28, '#0a0906'); txt(c, 'COM 122.800', 100, h * 0.33, 26, '#ff9d3a', 'left', true); txt(c, '123.450', 300, h * 0.33, 22, '#ff9d3a'); txt(c, 'NAV 114.50', 100, h * 0.7, 26, '#ff9d3a', 'left', true); txt(c, '109.30', 300, h * 0.7, 22, '#ff9d3a'); }, [[0.08, 0.5, 0.012, true], [0.92, 0.5, 0.012, true]]],
    xpdr: [0.050, (c, w, h) => { pantalla(c, 110, 14, 170, h - 28, '#0a0906'); txt(c, '7000', 130, h / 2, 34, '#ff9d3a', 'left', true); txt(c, 'ALT', 300, h / 2, 16, '#ff9d3a'); for (let i = 0; i < 4; i++) tecla(c, 330 + i * 38, 16, 30, h - 32, String(i)); txt(c, 'IDT', 495, h / 2, 12, '#ccc', 'right'); }, [[0.08, 0.5, 0.011]]],
    fm: [0.060, (c, w, h) => { pantalla(c, 150, 16, 220, h - 32, '#0b1a0e'); txt(c, 'CH 12  AAXOD', 160, h * 0.4, 24, '#9ef08a', 'left', true); txt(c, 'FM  151.325', 160, h * 0.72, 20, '#9ef08a'); ['CALL', 'MR', 'VFO', 'MENU'].forEach((t, i) => tecla(c, 380 + i * 30, 20, 26, 22, '', '#333')); txt(c, 'KENWOOD', 60, h - 14, 12, '#aaa', 'center'); }, [[0.08, 0.5, 0.011, true], [0.92, 0.5, 0.009]]],
  };
  for (const un of datos.unidades || []) { const d = caras[un.id] || caras.com; apilar(equipo(A, un.alto || d[0], 0.05, d[1], d[2]), un.alto || d[0]); }
  /* MASTER AVIONICS: palanquita en el PAC24 (arriba a la derecha de la cara), horneada en coordenadas de la cabina; gira sobre u (= z de la cabina) */
  const alto0 = (datos.unidades?.[0]?.alto) || 0.04, cx = A / 2 - 0.085 * A / 0.23 - 0.004, cy = datos.h / 2 - 0.01 - alto0 / 2;
  const base = new THREE.Vector3(cx, cy, 0.004).applyMatrix4(g.matrix), punta = new THREE.Vector3(cx, cy, 0.026).applyMatrix4(g.matrix);
  const geo = new THREE.BoxGeometry(0.005, 0.005, 0.022).translate(cx, cy, 0.015).applyMatrix4(g.matrix);
  const sw = new THREE.Mesh(geo, metal); sw.name = 'swAVNC'; sw.userData.piv = base.toArray(); sw.userData.eje = 'z'; sw.userData.punta = punta.toArray();
  const grupoControles = new THREE.Group(); grupoControles.name = 'radios_controles'; grupoControles.add(sw); cabina.add(grupoControles);
  return { grupo: g, grupoControles };
}
