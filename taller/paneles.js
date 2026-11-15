// Paneles 3D del taller (T2, adelantada dentro del bloque de la T1, 15/11/2026; PLAN_TALLER.md §6): lo que en el simulador de
// escritorio era el tablero HTML (console.js), pasado a placas de canvas en el mundo, con su mismo contenido y sus colores.
// - crearPanel: una placa con canvas, botones por rectángulo y el impacto de un rayo (PC: el mouse; VR: el rayo del control).
// - crearPanelMotor: INSTRUMENTOS (las 5 barras con su zona verde, ámbar y roja y el valor grande) y FALLAS (5 + SIN FALLA), con la
//   leyenda fija al pie. Se redibuja sólo cuando cambia lo que muestra (los valores, redondeados).
// - crearCartel: arriba del holograma, el texto de la estación y la alerta de la falla.
// - crearPlacaCuadrante: los rótulos del cuadrante de la mesa (palancas, muescas, botones, lámparas), sobre el tope de su caja.
// Legibilidad (regla del plan): letra de 1,5 cm o más a 1 m; los paneles se miran a 1–1,4 m.
import * as THREE from '../three.module.js';

export const C = {ink: '#16181b', mute: '#80858c', faint: '#c9ccd0', line: '#e1e3e6', panel: 'rgba(248,248,249,0.96)', red: '#d6182b', green: '#2f9e5b', amber: '#e0a100', blue: '#2f86e0'};
const FUENTE = 'Arial, Helvetica, sans-serif';

/** una placa con canvas: ancho y alto en metros; px = ancho del canvas */
export function crearPanel({ancho, alto, px = 1024, nombre = 'panel', transparente = false}) {
  const W = px;
  const H = Math.round((px * alto) / ancho);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({map: tex, transparent: transparente, toneMapped: false}));
  malla.name = nombre;
  const botones = [];
  return {
    malla,
    g,
    W,
    H,
    botones,
    pxPorMetro: W / ancho,
    pintado() {
      tex.needsUpdate = true;
    },
    /** {distancia, id} del botón que toca el rayo (id null si toca la placa fuera de los botones) o null */
    impacto(raycaster) {
      if (!malla.visible) return null;
      const h = raycaster.intersectObject(malla, false)[0];
      if (!h) return null;
      const u = h.uv.x * W;
      const v = (1 - h.uv.y) * H;
      const b = botones.find((b) => u >= b.x && u <= b.x + b.w && v >= b.y && v <= b.y + b.h);
      return {distancia: h.distance, id: b ? b.id : null};
    },
  };
}

function caja(g, x, y, w, h, r, relleno, borde) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (relleno) {
    g.fillStyle = relleno;
    g.fill();
  }
  if (borde) {
    g.strokeStyle = borde;
    g.lineWidth = 3;
    g.stroke();
  }
}
function texto(g, t, x, y, tam, color = C.ink, {negrita = false, alinear = 'left', base = 'alphabetic', max} = {}) {
  g.font = `${negrita ? 'bold ' : ''}${tam}px ${FUENTE}`;
  g.fillStyle = color;
  g.textAlign = alinear;
  g.textBaseline = base;
  if (max) g.fillText(t, x, y, max);
  else g.fillText(t, x, y);
}
function envolver(g, t, ancho) {
  const lineas = [];
  let l = '';
  for (const p of String(t).split(' ')) {
    const prueba = l ? `${l} ${p}` : p;
    if (g.measureText(prueba).width > ancho && l) {
      lineas.push(l);
      l = p;
    } else l = prueba;
  }
  if (l) lineas.push(l);
  return lineas;
}
/** la leyenda fija, como franja oscura al pie de una placa */
export function pieLeyenda(g, W, y, h, leyenda, tam = 30) {
  g.fillStyle = '#16181b';
  g.fillRect(0, y, W, h);
  g.font = `bold ${tam}px ${FUENTE}`;
  const lineas = envolver(g, `⚠ ${leyenda}`, W - 60);
  lineas.forEach((l, i) => texto(g, l, W / 2, y + h / 2 + (i - (lineas.length - 1) / 2) * tam * 1.18, tam, '#ffffff', {negrita: true, alinear: 'center', base: 'middle'}));
}

/**
 * INSTRUMENTOS + FALLAS (el panel de la derecha). gauges y faults: los de motor.js; leyenda: la de content.js.
 * actualizar({r (readout), fault}) redibuja si cambió algo visible. Botones: 'f_<falla>'.
 */
export function crearPanelMotor({gauges, faults, faultKeys, leyenda, ancho = 0.56, alto = 0.8}) {
  const p = crearPanel({ancho, alto, px: 1024, nombre: 'panel-motor'});
  const {g, W, H} = p;
  const M = 34;
  const claves = ['tq', 'itt', 'ng', 'np', 'ff'];
  const altoG = 168;
  const yG0 = 96;
  const yF0 = yG0 + claves.length * altoG + 66;
  const bw = (W - 2 * M - 20) / 2;
  const bh = 74;
  faultKeys.forEach((k, i) => p.botones.push({id: `f_${k}`, x: M + (i % 2) * (bw + 20), y: yF0 + 56 + Math.floor(i / 2) * (bh + 16), w: bw, h: bh}));
  const yPie = H - 120;
  let firma = '';
  const X = (gg, v) => ((Math.min(gg.max, Math.max(gg.min, v)) - gg.min) / (gg.max - gg.min)) * (W - 2 * M);
  function dibujar(r, fault, hover) {
    g.clearRect(0, 0, W, H);
    caja(g, 0, 0, W, H, 26, C.panel, C.line);
    g.fillStyle = C.red;
    g.fillRect(M, 30, 70, 7);
    texto(g, 'INSTRUMENTOS', M, 82, 40, C.ink, {negrita: true});
    claves.forEach((k, i) => {
      const gg = gauges[k];
      const y = yG0 + i * altoG;
      const v = r[k];
      const rojo = gg.red != null && v > gg.red;
      const ambar = !rojo && gg.amber && v > gg.amber[0];
      texto(g, gg.name, M, y + 46, 44, C.ink, {negrita: true});
      texto(g, gg.sub, M, y + 82, 28, C.mute, {negrita: true});
      const val = k === 'ng' || k === 'tq' ? v.toFixed(k === 'ng' ? 1 : 0) : Math.round(v).toString();
      texto(g, val, W - M - 70, y + 70, 76, rojo ? C.red : ambar ? C.amber : C.ink, {negrita: true, alinear: 'right'});
      texto(g, gg.unit, W - M, y + 70, 30, C.mute, {negrita: true, alinear: 'right'});
      const yb = y + 100;
      g.fillStyle = '#e3e5e8';
      g.fillRect(M, yb, W - 2 * M, 24);
      g.fillStyle = 'rgba(47,158,91,0.5)';
      g.fillRect(M + X(gg, gg.green[0]), yb, X(gg, gg.green[1]) - X(gg, gg.green[0]), 24);
      if (gg.amber) {
        g.fillStyle = 'rgba(224,161,0,0.55)';
        g.fillRect(M + X(gg, gg.amber[0]), yb, X(gg, gg.amber[1]) - X(gg, gg.amber[0]), 24);
      }
      if (gg.red != null) {
        g.fillStyle = 'rgba(214,24,43,0.55)';
        g.fillRect(M + X(gg, gg.red), yb, W - 2 * M - X(gg, gg.red), 24);
      }
      g.fillStyle = rojo ? C.red : C.ink;
      g.fillRect(M, yb + 8, X(gg, v), 8);
      g.fillRect(M + X(gg, v) - 4, yb - 10, 8, 44);
      texto(g, String(gg.min), M, yb + 56, 26, C.mute);
      texto(g, String(gg.max), W - M, yb + 56, 26, C.mute, {alinear: 'right'});
    });
    texto(g, 'VALORES ILUSTRATIVOS · NO SON LÍMITES [VERIFICAR]', M, yF0 - 26, 26, C.red, {negrita: true});
    g.fillStyle = C.red;
    g.fillRect(M, yF0 + 2, 70, 7);
    texto(g, 'FALLAS', M, yF0 + 44, 40, C.ink, {negrita: true});
    texto(g, '[AGREGADO]', M + 170, yF0 + 44, 26, C.mute, {negrita: true});
    for (const b of p.botones) {
      const k = b.id.slice(2);
      const activo = fault === k;
      const col = k === 'none' ? C.ink : C.red;
      caja(g, b.x, b.y, b.w, b.h, 12, activo ? col : hover === b.id ? '#eef0f2' : '#ffffff', activo ? col : C.line);
      texto(g, faults[k].name, b.x + b.w / 2, b.y + b.h / 2 + 2, 30, activo ? '#ffffff' : C.ink, {negrita: true, alinear: 'center', base: 'middle', max: b.w - 20});
    }
    pieLeyenda(g, W, yPie, 120, leyenda, 30);
    p.pintado();
  }
  return {
    ...p,
    actualizar({r, fault, hover = null}) {
      const f = [Math.round(r.tq), Math.round(r.itt), r.ng.toFixed(1), Math.round(r.np), Math.round(r.ff), fault, hover].join('|');
      if (f === firma) return;
      firma = f;
      dibujar(r, fault, hover);
    },
  };
}

/** el cartel de arriba del holograma: la estación (título y frase) y la alerta de la falla; se esconde si no hay nada */
export function crearCartel({ancho = 1.0, alto = 0.24} = {}) {
  const p = crearPanel({ancho, alto, px: 1600, nombre: 'cartel', transparente: true});
  const {g, W, H} = p;
  let firma = '';
  return {
    ...p,
    actualizar({estacion, alerta}) {
      const f = JSON.stringify([estacion && estacion.n, alerta && alerta.alert]);
      if (f === firma) return;
      firma = f;
      g.clearRect(0, 0, W, H);
      p.malla.visible = !!(estacion || alerta);
      if (!p.malla.visible) return;
      if (alerta) {
        caja(g, 0, 0, W, H, 24, C.red);
        texto(g, alerta.alert, W / 2, H * 0.38, 50, '#ffffff', {negrita: true, alinear: 'center', base: 'middle', max: W - 60});
        texto(g, `${alerta.act} [AGREGADO]`, W / 2, H * 0.72, 38, '#ffffff', {alinear: 'center', base: 'middle', max: W - 60});
      } else {
        caja(g, 0, 0, W, H, 24, C.panel, C.line);
        texto(g, `ESTACIÓN ${estacion.n} · ${estacion.name.toUpperCase()}`, 40, 70, 40, C.red, {negrita: true});
        texto(g, '[AGREGADO]', W - 40, 70, 28, C.mute, {negrita: true, alinear: 'right'});
        g.font = `bold 50px ${FUENTE}`;
        envolver(g, `“${estacion.text}”`, W - 80).slice(0, 2).forEach((l, i) => texto(g, l, 40, 152 + i * 64, 50, C.ink, {negrita: true}));
      }
      p.pintado();
    },
  };
}

/**
 * Los rótulos del cuadrante, sobre el tope de su caja (datos: userData.cuadrante de mesa.glb). Devuelve la placa (mirando hacia
 * arriba, con el borde de arriba del canvas hacia atrás, −z, para que se lea desde el lado del alumno).
 */
export function crearPlacaCuadrante(datos) {
  const [x0, x1] = datos.caja.x;
  const [z0, z1] = datos.caja.z;
  const p = crearPanel({ancho: x1 - x0, alto: z1 - z0, px: 2048, nombre: 'placa-cuadrante', transparente: true});
  const {g, W} = p;
  const k = p.pxPorMetro;
  const px = (x) => (x - x0) * k;
  const pz = (z) => (z - z0) * k;
  g.clearRect(0, 0, W, p.H);
  const zCruce = (a) => datos.eje.z + (datos.caja.tope - datos.eje.y) * Math.tan(a);
  // letras de 1,5 cm o más (la caja se mira a 1 m): 56 px en esta placa (3793 px/m)
  for (const [nombre, d] of Object.entries(datos.palancas)) {
    const x = px(d.x);
    texto(g, d.rotulo, x, pz(z1 - 0.022), 62, '#ffffff', {negrita: true, alinear: 'center', base: 'middle'});
    texto(g, d.atras, x, pz(datos.ranura_z[0] - 0.016), 56, '#c9ccd0', {negrita: true, alinear: 'center', base: 'middle'});
    texto(g, d.adelante, x, pz(datos.ranura_z[1] + 0.018), 56, nombre === 'levCL' ? '#ff6f61' : '#c9ccd0', {negrita: true, alinear: 'center', base: 'middle'});
    if (nombre === 'levCL')
      datos.ang.muescasCL.forEach((a, i) => {
        g.fillStyle = '#ffffff';
        g.fillRect(x - 64, pz(zCruce(a)) - 4, 38, 8);
        g.fillRect(x + 26, pz(zCruce(a)) - 4, 38, 8);
        if (i === 1) texto(g, 'BAJO', x + 76, pz(zCruce(a)), 52, '#c9ccd0', {negrita: true, base: 'middle'});
      });
  }
  for (const d of Object.values(datos.botones)) texto(g, d.rotulo, px(d.x), pz(d.z[1] + 0.022), 56, '#ffffff', {negrita: true, alinear: 'center', base: 'middle'});
  for (const d of Object.values(datos.lamparas)) texto(g, d.rotulo, px(d.x + 0.018), pz(d.z), 56, '#c9ccd0', {negrita: true, base: 'middle'});
  p.pintado();
  p.malla.rotation.x = -Math.PI / 2;
  p.malla.position.set((x0 + x1) / 2, datos.caja.tope + 0.0018, (z0 + z1) / 2);
  p.malla.renderOrder = 2;
  return p;
}
