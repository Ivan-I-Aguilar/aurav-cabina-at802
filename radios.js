// Consola de radios del lado derecho (el Fire Boss de FSX no la trae). Pedestal negro con los equipos
// como cajas separadas (bisel, pantalla, perillas), siguiendo la foto del panel real: GPS portátil arriba
// en un soporte, panel de audio, GNS con pantalla, COM/NAV, transponder y placa de fichas.
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

export function crearRadios() {
  const g = new THREE.Group(); g.name = 'radios';
  const A = 0.165;                                                 // ancho útil de los equipos (6,25")
  // pedestal: caja negra alta, con la cara donde van los equipos
  const PH = 0.56, PP = 0.2;
  const ped = new THREE.Mesh(new THREE.BoxGeometry(A + 0.03, PH, PP), negro); ped.position.set(0, -PH / 2, -PP / 2); g.add(ped);
  const borde = new THREE.Mesh(new THREE.BoxGeometry(A + 0.034, PH + 0.004, 0.004), metal); borde.position.set(0, -PH / 2, -0.001); g.add(borde);
  let y = -0.012; const apilar = (e, alto, sep = 0.006) => { e.position.set(0, y - alto / 2, 0.004); g.add(e); y -= alto + sep; };

  // GPS portátil en soporte, inclinado hacia el piloto
  const gps = equipo(0.075, 0.15, 0.03, (c, w, h) => {
    c.fillStyle = '#5a5c60'; c.fillRect(0, 0, w, h);
    pantalla(c, 40, 40, w - 80, h * 0.42, '#a8d79a'); c.strokeStyle = '#2f5a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(60, h * 0.42); c.lineTo(180, h * 0.2); c.lineTo(330, h * 0.3); c.lineTo(440, h * 0.12); c.stroke();
    txt(c, 'GS 0 kt   TRK 180°', 50, 60, 22, '#1d3a16'); txt(c, 'AURAV   ', w - 50, h * 0.42 + 18, 22, '#1d3a16', 'right');
    const nombres = ['MENU', 'NRST', 'D→', 'ENT', 'PWR', 'CLR', 'IN', 'OUT', '▲', '▼', '◄', '►'];
    nombres.forEach((t, i) => tecla(c, 50 + (i % 4) * 105, h * 0.52 + Math.floor(i / 4) * 95, 85, 70, t, '#2a2b2e'));
  });
  const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.05), negro); soporte.position.set(0, 0.07, -0.02); g.add(soporte);
  gps.position.set(0, 0.11, 0.015); gps.rotation.x = -0.3; g.add(gps);

  // panel de audio
  apilar(equipo(A, 0.034, 0.06, (c, w, h) => {
    const n = ['COM1', 'COM2', 'NAV1', 'NAV2', 'ADF', 'DME', 'MKR', 'SPKR'];
    n.forEach((t, i) => { tecla(c, 18 + i * 54, 14, 46, 44, t); led(c, 34 + i * 54, 66, i < 2); });
    txt(c, 'AUDIO', w - 22, h / 2, 14, '#9a9a9a', 'right');
  }, [[0.93, 0.5, 0.009]]), 0.034);

  // GNS: COM/VLOC + pantalla con mapa
  apilar(equipo(A, 0.068, 0.07, (c, w, h) => {
    pantalla(c, 120, 12, 300, h - 24);
    txt(c, '118.100', 130, 34, 26, '#8fe3ff', 'left', true); txt(c, '121.500', 300, 34, 26, '#ffd37a', 'left', true);
    txt(c, '112.30', 130, 66, 22, '#8fe3ff'); txt(c, '110.90', 300, 66, 22, '#ffd37a');
    c.strokeStyle = '#2d6b4a'; c.lineWidth = 2; c.strokeRect(130, 84, 280, h - 108); c.strokeStyle = '#5fc08a'; c.beginPath(); c.moveTo(140, h - 30); c.lineTo(200, h - 70); c.lineTo(290, h - 60); c.lineTo(400, h - 100); c.stroke();
    txt(c, 'MAP  2 NM', 138, 98, 13, '#9bd8b2');
    ['RNG', 'D→', 'MENU', 'CLR', 'ENT'].forEach((t, i) => tecla(c, 128 + i * 58, h - 16, 50, 12, '', '#333'));
    txt(c, 'C', 60, h / 2 - 36, 13, '#aaa', 'center'); txt(c, 'V', 60, h / 2 + 36, 13, '#aaa', 'center');
  }, [[0.11, 0.32, 0.011, true], [0.11, 0.72, 0.011, true], [0.9, 0.5, 0.011, true]]), 0.068);

  // COM/NAV
  apilar(equipo(A, 0.044, 0.06, (c, w, h) => {
    pantalla(c, 90, 14, 330, h - 28, '#0a0906');
    txt(c, 'COM 122.800', 100, h * 0.33, 26, '#ff9d3a', 'left', true); txt(c, '123.450', 300, h * 0.33, 22, '#ff9d3a');
    txt(c, 'NAV 114.50', 100, h * 0.7, 26, '#ff9d3a', 'left', true); txt(c, '109.30', 300, h * 0.7, 22, '#ff9d3a');
  }, [[0.08, 0.5, 0.012, true], [0.92, 0.5, 0.012, true]]), 0.044);

  // transponder
  apilar(equipo(A, 0.04, 0.06, (c, w, h) => {
    pantalla(c, 110, 14, 170, h - 28, '#0a0906'); txt(c, '7000', 130, h / 2, 34, '#ff9d3a', 'left', true); txt(c, 'ALT', 300, h / 2, 16, '#ff9d3a');
    for (let i = 0; i < 4; i++) tecla(c, 330 + i * 38, 16, 30, h - 32, String(i));
    txt(c, 'IDT', 495, h / 2, 12, '#ccc', 'right');
  }, [[0.08, 0.5, 0.011]]), 0.04);

  // placa de fichas y rótulos
  apilar(equipo(A, 0.19, 0.03, (c, w, h) => {
    const r = ['ADF', 'DME', 'COM1', 'COM2', 'ATC', 'FAN', 'INT', 'PHONE'];
    r.forEach((t, i) => { c.fillStyle = '#d9c99c'; c.fillRect(290, 28 + i * 66, 120, 30); txt(c, t, 350, 43 + i * 66, 16, '#222', 'center', true); c.fillStyle = '#0a0a0a'; c.beginPath(); c.arc(240, 43 + i * 66, 12, 0, 7); c.fill(); c.fillStyle = '#555'; c.beginPath(); c.arc(240, 43 + i * 66, 5, 0, 7); c.fill(); });
    txt(c, 'MASTER', 100, 60, 14, '#ccc', 'center'); c.fillStyle = '#c0392b'; c.fillRect(70, 80, 60, 70); c.fillStyle = '#eee'; c.fillRect(85, 90, 30, 50);
    txt(c, 'AURAV', 100, h - 40, 16, '#777', 'center', true);
  }), 0.19);

  return g;
}
