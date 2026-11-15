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
    /** el centro de un botón en el mundo (para apuntarle con un mando simulado en las pruebas) o null */
    centro(id, out = new THREE.Vector3()) {
      const b = botones.find((x) => x.id === id);
      if (!b) return null;
      malla.updateWorldMatrix(true, false);
      return malla.localToWorld(out.set(((b.x + b.w / 2) / W - 0.5) * ancho, (0.5 - (b.y + b.h / 2) / H) * alto, 0));
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
 * El panel del ATRIL DE PARTIDA (T5, H2): la elección de modo y los saltos con fundido. Botones: 'modo_piloto' (lleva a la mesa),
 * 'modo_mecanico' (en preparación hasta la T8: se ve apagado), 'ir_mesa', 'ir_at802', 'ir_cessna', 'ir_bancos', 'ir_oficina'.
 * actualizar({hover}). Va sobre la cabeza inclinada del atril de muebles.glb (0,92 × 0,52 m).
 */
export function crearPanelAtril({leyenda, ancho = 0.88, alto = 0.48}) {
  const p = crearPanel({ancho, alto, px: 1280, nombre: 'panel-atril'});
  const {g, W, H} = p;
  const M = 30;
  const bwM = (W - 2 * M - 20) / 2;
  p.botones.push({id: 'modo_piloto', x: M, y: 150, w: bwM, h: 170, t: 'MODO PILOTO', sub: 'El motor en la mesa: arrancarlo, sus estaciones y sus fallas'});
  p.botones.push({id: 'modo_mecanico', x: M + bwM + 20, y: 150, w: bwM, h: 170, t: 'MODO MECÁNICO', sub: 'En preparación', apagado: true});
  const IR = [['ir_mesa', 'LA MESA'], ['ir_at802', 'AT-802'], ['ir_cessna', 'CESSNA'], ['ir_bancos', 'BANCOS'], ['ir_oficina', 'CRÉDITOS']];
  const bwI = (W - 2 * M - 4 * 14) / 5;
  IR.forEach(([id, t], i) => p.botones.push({id, t, x: M + i * (bwI + 14), y: 400, w: bwI, h: 96}));
  let firma = '';
  function dibujar(hover) {
    g.clearRect(0, 0, W, H);
    caja(g, 0, 0, W, H, 22, C.panel, C.line);
    g.fillStyle = '#082440';
    g.beginPath();
    g.roundRect(0, 0, W, 128, [22, 22, 0, 0]);
    g.fill();
    texto(g, 'TALLER DE MOTORES · AURAV', M + 4, 70, 52, '#ffffff', {negrita: true});
    texto(g, 'VER PARA VOLAR', M + 4, 112, 30, '#c8e63a', {negrita: true});
    texto(g, '[PROVISORIO]', W - M, 112, 24, '#8fa3b8', {negrita: true, alinear: 'right'});
    for (const b of p.botones) {
      const sobre = hover === b.id;
      if (b.sub) {
        const fondo = b.apagado ? '#eceef0' : sobre ? '#b81426' : C.red;
        caja(g, b.x, b.y, b.w, b.h, 16, fondo, b.apagado ? C.line : fondo);
        texto(g, b.t, b.x + 28, b.y + 70, 48, b.apagado ? C.mute : '#ffffff', {negrita: true, max: b.w - 56});
        g.font = `30px ${FUENTE}`;
        envolver(g, b.sub, b.w - 56).slice(0, 2).forEach((l, i) => texto(g, l, b.x + 28, b.y + 116 + i * 36, 30, b.apagado ? C.mute : '#ffffff'));
      } else {
        caja(g, b.x, b.y, b.w, b.h, 12, sobre ? '#eef0f2' : '#ffffff', sobre ? C.ink : C.line);
        texto(g, b.t, b.x + b.w / 2, b.y + b.h / 2 + 2, 34, C.ink, {negrita: true, alinear: 'center', base: 'middle', max: b.w - 16});
      }
    }
    g.fillStyle = C.red;
    g.fillRect(M, 346, 60, 6);
    texto(g, 'IR A', M, 388, 30, C.ink, {negrita: true});
    pieLeyenda(g, W, H - 120, 120, leyenda, 29);
    p.pintado();
  }
  return {
    ...p,
    actualizar({hover = null} = {}) {
      const f = String(hover);
      if (f === firma) return;
      firma = f;
      dibujar(hover);
    },
  };
}

/**
 * ESTACIONES + VISTA (el panel de la izquierda, T3). estaciones: STATIONS de content.js. Botones: 'st1'…'st8' (tocar la activa la
 * apaga, como el escritorio), 'v_corte', 'v_completo', 'v_flujo', 'v_recorrido', 'v_preguntas', 'v_mesa' (devuelve el holograma a
 * la mesa). actualizar({estacion, corte, flujo, recorrido, hover}).
 */
export function crearPanelEstaciones({estaciones, leyenda, ancho = 0.68, alto = 0.97}) {
  const p = crearPanel({ancho, alto, px: 1024, nombre: 'panel-estaciones'});
  const {g, W, H} = p;
  const M = 34;
  const sh = 84;
  const sy0 = 104;
  estaciones.forEach((s, i) => p.botones.push({id: `st${s.n}`, x: M, y: sy0 + i * (sh + 8), w: W - 2 * M, h: sh, n: s.n, nombre: s.name}));
  const yV = sy0 + estaciones.length * (sh + 8) + 26;
  const VISTA = [['v_corte', 'CORTE'], ['v_completo', 'COMPLETO'], ['v_flujo', 'FLUJO'], ['v_recorrido', 'RECORRIDO'], ['v_preguntas', 'PREGUNTAS (6)'], ['v_mesa', 'A LA MESA']];
  const bw = (W - 2 * M - 2 * 14) / 3;
  const bh = 80;
  VISTA.forEach(([id, t], i) => p.botones.push({id, t, x: M + (i % 3) * (bw + 14), y: yV + 58 + Math.floor(i / 3) * (bh + 14), w: bw, h: bh}));
  const yPie = H - 120;
  let firma = '';
  function dibujar(e) {
    g.clearRect(0, 0, W, H);
    caja(g, 0, 0, W, H, 26, C.panel, C.line);
    g.fillStyle = C.red;
    g.fillRect(M, 30, 70, 7);
    texto(g, 'ESTACIONES', M, 82, 40, C.ink, {negrita: true});
    texto(g, '[AGREGADO]', M + 262, 82, 26, C.mute, {negrita: true});
    for (const b of p.botones) {
      if (b.n) {
        const activo = e.estacion === b.n;
        caja(g, b.x, b.y, b.w, b.h, 12, activo ? C.red : e.hover === b.id ? '#eef0f2' : '#ffffff', activo ? C.red : C.line);
        g.beginPath();
        g.arc(b.x + 46, b.y + b.h / 2, 26, 0, Math.PI * 2);
        g.strokeStyle = activo ? '#ffffff' : C.ink;
        g.lineWidth = 4;
        g.stroke();
        texto(g, String(b.n), b.x + 46, b.y + b.h / 2 + 2, 32, activo ? '#ffffff' : C.ink, {negrita: true, alinear: 'center', base: 'middle'});
        texto(g, b.nombre, b.x + 92, b.y + b.h / 2 + 2, 40, activo ? '#ffffff' : C.ink, {negrita: true, base: 'middle'});
        continue;
      }
      const on = (b.id === 'v_corte' && e.corte) || (b.id === 'v_completo' && !e.corte) || (b.id === 'v_flujo' && e.flujo) || (b.id === 'v_recorrido' && e.recorrido);
      const rojo = b.id === 'v_preguntas';
      const fondo = rojo ? C.red : on ? C.ink : e.hover === b.id ? '#eef0f2' : '#ffffff';
      caja(g, b.x, b.y, b.w, b.h, 12, fondo, rojo ? C.red : on ? C.ink : C.line);
      texto(g, b.t, b.x + b.w / 2, b.y + b.h / 2 + 2, 30, rojo || on ? '#ffffff' : C.ink, {negrita: true, alinear: 'center', base: 'middle', max: b.w - 16});
    }
    g.fillStyle = C.red;
    g.fillRect(M, yV - 6, 70, 7);
    texto(g, 'VISTA', M, yV + 38, 40, C.ink, {negrita: true});
    pieLeyenda(g, W, yPie, 120, leyenda, 30);
    p.pintado();
  }
  return {
    ...p,
    actualizar(e) {
      const f = JSON.stringify([e.estacion, e.corte, e.flujo, e.recorrido, e.hover]);
      if (f === firma) return;
      firma = f;
      dibujar(e);
    },
  };
}

/**
 * Las 6 preguntas (T3), como en live.js: la correcta es la primera de cada lista y se muestran en el orden de ORDER; ✓ o ✗ con la
 * correcta; al final «n de 6» y el aviso. Botones: 'q_a0'…'q_a2' (las opciones en pantalla), 'q_siguiente', 'q_otra', 'q_cerrar'.
 * tocar(id) devuelve 'cerrar' cuando hay que esconderlo.
 */
export function crearPanelPreguntas({quiz, orden, ancho = 0.76, alto = 0.5}) {
  const p = crearPanel({ancho, alto, px: 1400, nombre: 'panel-preguntas'});
  const {g, W, H} = p;
  const M = 44;
  const L = ['A', 'B', 'C'];
  let qi = 0;
  let puntaje = 0;
  let elegida = null;
  let hover = null;
  const opciones = [0, 1, 2].map((j) => ({id: `q_a${j}`, x: M, y: 210 + j * 108, w: W - 2 * M, h: 92}));
  const bSig = {id: 'q_siguiente', x: W - M - 300, y: H - 116, w: 300, h: 80};
  const bCerrar = {id: 'q_cerrar', x: W - M - 300 - 24 - 220, y: H - 116, w: 220, h: 80};
  const bOtra = {id: 'q_otra', x: W - M - 300 - 24 - 220, y: H - 116, w: 220, h: 80};
  function botones() {
    p.botones.length = 0;
    if (qi >= quiz.length) p.botones.push(bOtra, {...bSig, id: 'q_cerrar'});
    else {
      if (elegida === null) p.botones.push(...opciones);
      p.botones.push(bCerrar);
      if (elegida !== null) p.botones.push(bSig);
    }
  }
  function boton(b, t, oscuro) {
    caja(g, b.x, b.y, b.w, b.h, 12, oscuro ? C.ink : hover === b.id ? '#eef0f2' : '#ffffff', oscuro ? C.ink : C.line);
    texto(g, t, b.x + b.w / 2, b.y + b.h / 2 + 2, 30, oscuro ? '#ffffff' : C.ink, {negrita: true, alinear: 'center', base: 'middle'});
  }
  function dibujar() {
    botones();
    g.clearRect(0, 0, W, H);
    caja(g, 0, 0, W, H, 26, '#ffffff', C.line);
    if (qi >= quiz.length) {
      texto(g, 'PREGUNTAS · RESULTADO', M, 76, 32, C.red, {negrita: true});
      texto(g, `${puntaje} de ${quiz.length} correctas`, M, 170, 64, C.ink, {negrita: true});
      g.font = `bold 34px ${FUENTE}`;
      envolver(g, 'Repasá las estaciones de las que dudaste. Este material no reemplaza la instrucción.', W - 2 * M).forEach((l, i) => texto(g, l, M, 250 + i * 46, 34, C.mute, {negrita: true}));
      texto(g, '[AGREGADO]', M, H - 66, 26, C.mute, {negrita: true});
      boton(bOtra, 'Otra vez');
      boton({...bSig, id: 'q_cerrar'}, 'Cerrar', true);
      p.pintado();
      return;
    }
    const Q = quiz[qi];
    texto(g, `PREGUNTA ${qi + 1} DE ${quiz.length}`, M, 76, 32, C.red, {negrita: true});
    texto(g, '[AGREGADO]', W - M, 76, 26, C.mute, {negrita: true, alinear: 'right'});
    texto(g, Q.q, M, 156, 52, C.ink, {negrita: true, max: W - 2 * M});
    orden[qi].forEach((a, j) => {
      const b = opciones[j];
      const correcta = a === 0;
      let fondo = hover === b.id && elegida === null ? '#f3f4f6' : '#ffffff';
      let borde = C.line;
      if (elegida !== null && correcta) {
        fondo = '#eef8f2';
        borde = C.green;
      } else if (elegida === j) {
        fondo = '#fdf0f1';
        borde = C.red;
      }
      caja(g, b.x, b.y, b.w, b.h, 12, fondo, borde);
      g.beginPath();
      g.arc(b.x + 48, b.y + b.h / 2, 26, 0, Math.PI * 2);
      g.strokeStyle = C.ink;
      g.lineWidth = 4;
      g.stroke();
      texto(g, L[j], b.x + 48, b.y + b.h / 2 + 2, 30, C.ink, {negrita: true, alinear: 'center', base: 'middle'});
      texto(g, Q.a[a], b.x + 96, b.y + b.h / 2 + 2, 38, C.ink, {negrita: true, base: 'middle', max: b.w - 120});
    });
    if (elegida !== null) {
      const ok = orden[qi][elegida] === 0;
      texto(g, ok ? '✓ Correcto.' : `✗ No. La respuesta es: ${Q.a[0]}.`, M, H - 64, 34, ok ? C.green : C.red, {negrita: true, max: W - 2 * M - 560});
      boton(bSig, 'Siguiente →', true);
    }
    boton(bCerrar, 'Cerrar');
    p.pintado();
  }
  return {
    ...p,
    abrir() {
      qi = 0;
      puntaje = 0;
      elegida = null;
      hover = null;
      dibujar();
    },
    tocar(id) {
      if (id === 'q_cerrar') return 'cerrar';
      if (id === 'q_otra') {
        qi = 0;
        puntaje = 0;
        elegida = null;
      } else if (id === 'q_siguiente' && elegida !== null) {
        qi++;
        elegida = null;
      } else if (id.startsWith('q_a') && elegida === null && qi < quiz.length) {
        elegida = +id.slice(3);
        if (orden[qi][elegida] === 0) puntaje++;
      }
      dibujar();
      return null;
    },
    pasarPor(id) {
      if (id === hover) return;
      hover = id;
      dibujar();
    },
    get estado() {
      return {pregunta: qi, puntaje, elegida};
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
