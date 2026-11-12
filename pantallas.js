// Pantallas en vivo del tablero nuevo (etapa 2b, 8/11): G5 de actitud, Garmin de rumbo (HSI) y monitor de motor MVP-50, más los
// cuatro anunciadores (MASTER WARN · MASTER CAUTION · LOW FUEL · ARMED). Cada pantalla es un canvas sobre un plano que mira al
// piloto (+z), puesto 0,5 mm delante del vidrio oscuro del GLB; los centros y tamaños vienen en userData.tablero de la chapa
// (herramientas/cab_tablero.py). Letra GRANDE: en el Quest la G5 (7 cm a 65 cm) ocupa unos 120 px de ancho.
// Las pantallas se apagan sin batería (o con la llave de aviónica apagada, cuando exista: etapa 3). Las G5 se redibujan a 30 Hz,
// el MVP-50 a 5 Hz: tres subidas de textura por cuadro eran mucho para el casco.
import * as THREE from './three.module.js';

const BLANCO = '#f2f2f2', VERDE = '#3cb446', AMAR = '#e6c828', ROJO = '#dc2828', CIELO = '#2a7fd4', TIERRA = '#8b5a2b', NEGRO = '#06080a';
/* escalas del MVP-50 (las mismas que instrumentos.js / relojes.py): arcos de color [desde, hasta, color] */
const MVP = {
  torque: { rot: 'TRQ', unidad: '%', min: 0, max: 110, arcos: [[0, 85, VERDE], [85, 100, ROJO]], fmt: v => v.toFixed(0) },
  itt:    { rot: 'ITT', unidad: '°C', min: 0, max: 1000, arcos: [[400, 800, VERDE], [800, 850, AMAR], [850, 1000, ROJO]], fmt: v => v.toFixed(0) },
  ng:     { rot: 'Ng', unidad: '%', min: 0, max: 110, arcos: [[60, 101, VERDE], [101, 110, ROJO]], fmt: v => v.toFixed(1) },
  prop:   { rot: 'PROP', unidad: 'RPM', min: 0, max: 2500, arcos: [[1000, 1700, VERDE], [1700, 2500, ROJO]], fmt: v => v.toFixed(0) },
  ff:     { rot: 'FUEL FLOW', unidad: 'PPH', min: 0, max: 600, arcos: [[100, 500, VERDE]], fmt: v => v.toFixed(0) },
  oilp:   { rot: 'OIL PRESS', unidad: 'PSI', min: 0, max: 150, arcos: [[0, 60, ROJO], [85, 105, VERDE]], fmt: v => v.toFixed(0) },
  oilt:   { rot: 'OIL TEMP', unidad: '°C', min: 0, max: 120, arcos: [[10, 99, VERDE], [99, 120, ROJO]], fmt: v => v.toFixed(0) },
  volt:   { rot: 'VOLTS', unidad: 'V', min: 0, max: 30, arcos: [[24, 29, VERDE]], fmt: v => v.toFixed(1) },
  amp:    { rot: 'AMPS', unidad: 'A', min: 0, max: 300, arcos: [], fmt: v => v.toFixed(0) },
  fuel:   { rot: 'FUEL L / R', unidad: 'GAL', min: 0, max: 127, arcos: [[0, 16, ROJO]], fmt: v => v.toFixed(0) },
};
const enArco = (cfg, v, color) => cfg.arcos.some(([a, b, c]) => c === color && v >= a && v <= b);

export class Pantallas {
  /** raiz: grupo de la cabina; tab: userData.tablero de la chapa ({pantallas: {g5, garmin_rumbo, mvp50: [cx, cy, z, ancho, alto]}, anunciadores: [[cx, cy, z, w, h]…]}) */
  constructor(raiz, tab) {
    this.raiz = raiz; this.t = 0; this.estado = {}; this.pantallas = {};
    const defs = { g5: [420, 348, 1 / 30, this._g5], garmin_rumbo: [384, 360, 1 / 30, this._hsi], mvp50: [492, 424, 1 / 5, this._mvp], frds: [288, 192, 1 / 5, this._frds] };
    for (const [k, d] of Object.entries(tab.pantallas || {})) {
      const [cx, cy, z, w, h] = d; const [W, H, periodo, dibujar] = defs[k] || [384, 320, 1 / 5, this._apagada];
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
      m.position.set(cx, cy, z + 0.0005); m.name = 'pantalla_viva_' + k; raiz.add(m);
      this.pantallas[k] = { cv, c, tex, W, H, periodo, dibujar: dibujar.bind(this), prox: 0, encendida: null };
    }
    /* anunciadores: una placa con dos texturas (apagada: letras de color sobre negro; prendida: negro sobre color pleno) */
    const ROT = [['MASTER WARN', '#ff2a1a'], ['MASTER CAUTION', '#ff9a2a'], ['LOW FUEL', '#ffd22a'], ['ARMED', '#4ad24a']];
    this.luces = {};
    (tab.anunciadores || []).forEach((d, i) => {
      const [cx, cy, z, w, h] = d; const [txt, col] = ROT[i] || ['', '#888'];
      const dib = prendida => { const cl = document.createElement('canvas'); cl.width = 192; cl.height = 112; const cc = cl.getContext('2d');
        cc.fillStyle = prendida ? col : '#141518'; cc.fillRect(0, 0, 192, 112); cc.fillStyle = prendida ? '#101113' : col; cc.font = 'bold 34px Arial'; cc.textAlign = 'center'; cc.textBaseline = 'middle';
        const partes = txt.split(' '); partes.forEach((p, j) => cc.fillText(p, 96, partes.length > 1 ? 36 + j * 40 : 56));
        const tex = new THREE.CanvasTexture(cl); tex.colorSpace = THREE.SRGBColorSpace; return tex; };
      const apagada = dib(false), prendida = dib(true);
      const mat = new THREE.MeshBasicMaterial({ map: apagada, color: 0x8a8a8a });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.002, h - 0.002), mat); m.position.set(cx, cy, z + 0.0005); m.name = 'anunciador_vivo_' + i; raiz.add(m);
      this.luces[txt] = { mat, apagada, prendida, al: null };
    });
  }
  /** estado: { L (vuelo.lecturas()), rumbo (°, 0–360), gs (mph), bateria, avionica, fuego, falla, generador, encendido, enTierra, armado, test, estrellado } */
  actualizar(dt, estado) {
    this.t += dt; Object.assign(this.estado, estado);
    const on = !!(estado.bateria && estado.avionica !== false);
    for (const [k, p] of Object.entries(this.pantallas)) {
      if (this.t < p.prox) continue; p.prox = this.t + p.periodo;
      const onK = k === 'frds' ? !!(estado.bateria && estado.frds && estado.frds.power) : on;   /* el FRDS tiene su propia llave FRDS POWER */
      if (!onK) { if (p.encendida !== false) { p.encendida = false; this._apagada(p); p.tex.needsUpdate = true; } continue; }
      p.encendida = true; p.dibujar(p); p.tex.needsUpdate = true;
    }
    const e = this.estado, parpadeo = Math.floor(this.t * 2.5) % 2 === 0;
    const pon = (k, v) => { const l = this.luces[k]; if (!l || l.al === v) return; l.al = v; l.mat.map = v ? l.prendida : l.apagada; l.mat.color.setHex(v ? 0xffffff : 0x8a8a8a); l.mat.needsUpdate = true; };
    const bat = !!e.bateria, test = bat && !!e.test;
    pon('MASTER WARN', test || (bat && (e.fuego ? parpadeo : !!(e.falla || e.estrellado || (e.enTierra === false && !e.encendido)))));   /* fuego titila; motor parado en vuelo o accidente, fija */
    pon('MASTER CAUTION', test || (bat && !!((e.encendido && !e.generador) || (e.L && e.L.itt > 850))));
    pon('LOW FUEL', test);                                   /* el combustible no está modelado: sólo en el push-to-test */
    pon('ARMED', test || (bat && !!e.armado));
  }
  _apagada(p) { const { c, W, H } = p; c.fillStyle = NEGRO; c.fillRect(0, 0, W, H); }

  /* ---- display del FRDS GEN III: galones a largar, nivel de cobertura, compuerta, armado y lo que queda en la tolva ---- */
  _frds(p) {
    const { c, W, H } = p, f = this.estado.frds || {}; c.fillStyle = '#0a1a0c'; c.fillRect(0, 0, W, H);
    c.textBaseline = 'middle'; c.font = 'bold 26px Arial';
    const fila = (y, a, b, col) => { c.textAlign = 'left'; c.fillStyle = '#9ef08a'; c.fillText(a, 10, y); c.textAlign = 'right'; c.fillStyle = col || '#ffffff'; c.fillText(b, W - 10, y); };
    fila(26, 'GAL TO DUMP', String(f.galones ?? 0)); fila(66, 'COVERAGE', String(f.cobertura ?? 0)); fila(106, 'GATE', f.gate ? 'OPEN' : 'CLOSED', f.gate ? '#ffd24a' : '#ffffff');
    fila(146, 'HOPPER', `${Math.round(f.hopperGal ?? 0)} GAL`); c.textAlign = 'center'; c.fillStyle = f.armado ? '#ff5a3a' : '#5a6a5a'; c.font = 'bold 24px Arial'; c.fillText(f.armado ? 'ARMED' : 'SAFE', W / 2, 178);
  }

  /* ---- G5 de actitud: horizonte con escala de cabeceo, índice de alabeo, cintas de velocidad (izquierda) y altura (derecha), rumbo abajo ---- */
  _g5(p) {
    const { c, W, H } = p, L = this.estado.L || {}, cab = L.cabeceo || 0, ala = L.alabeo || 0;
    const cx = W / 2, cy = H / 2, pxDeg = H / 42;   /* ±21° de cabeceo en la pantalla */
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    c.translate(cx, cy); c.rotate(-ala); c.translate(0, cab * 180 / Math.PI * pxDeg);   /* alabeo a la derecha: el horizonte sube a la derecha · morro arriba: baja */
    c.fillStyle = CIELO; c.fillRect(-2 * W, -3 * H, 4 * W, 3 * H); c.fillStyle = TIERRA; c.fillRect(-2 * W, 0, 4 * W, 3 * H);
    c.fillStyle = BLANCO; c.fillRect(-2 * W, -2, 4 * W, 4);
    c.font = 'bold 22px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let d = -30; d <= 30; d += 5) { if (!d) continue; const y = -d * pxDeg, w = d % 10 ? 28 : 56; c.fillRect(-w, y - 1.5, 2 * w, 3); if (d % 10 === 0) { c.fillText(Math.abs(d), -w - 20, y); c.fillText(Math.abs(d), w + 20, y); } }
    c.restore();
    /* índice de alabeo: arco fijo arriba y triángulo que gira con el avión */
    c.save(); c.translate(cx, cy); c.strokeStyle = BLANCO; c.lineWidth = 3; const R = H * 0.44;
    c.beginPath(); c.arc(0, 0, R, -Math.PI / 2 - Math.PI / 3, -Math.PI / 2 + Math.PI / 3); c.stroke();
    for (const a of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) { const r = a % 30 === 0 || a === 0 ? 16 : 9; c.save(); c.rotate(a * Math.PI / 180); c.fillStyle = BLANCO; c.fillRect(-2, -R - r, 4, r); c.restore(); }
    c.save(); c.rotate(-ala); c.fillStyle = BLANCO; c.beginPath(); c.moveTo(0, -R + 4); c.lineTo(-11, -R + 24); c.lineTo(11, -R + 24); c.closePath(); c.fill(); c.restore();
    /* avioncito fijo */
    c.fillStyle = '#f2c200'; c.fillRect(-W * 0.3, -3, W * 0.17, 6); c.fillRect(W * 0.13, -3, W * 0.17, 6); c.fillRect(-W * 0.13, -3, 6, 16); c.fillRect(W * 0.13 - 6, -3, 6, 16); c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill();
    c.restore();
    /* cintas: velocidad (mph) a la izquierda, altura (ft) a la derecha; caja central con el valor en grande */
    const cinta = (x0, ancho, valor, paso, pxPorUnidad, fmt, derecha) => {
      c.save(); c.beginPath(); c.rect(x0, 0, ancho, H); c.clip(); c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(x0, 0, ancho, H);
      c.fillStyle = BLANCO; c.font = 'bold 24px Arial'; c.textBaseline = 'middle'; c.textAlign = derecha ? 'left' : 'right';
      const v0 = Math.floor((valor - H / 2 / pxPorUnidad) / paso) * paso, v1 = valor + H / 2 / pxPorUnidad;
      for (let v = v0; v <= v1; v += paso) { if (v < 0) continue; const y = cy - (v - valor) * pxPorUnidad; const xr = derecha ? x0 : x0 + ancho; c.fillRect(derecha ? xr : xr - 12, y - 1.5, 12, 3); if (v % (paso * 2) === 0) c.fillText(fmt(v), derecha ? xr + 16 : xr - 16, y); }
      c.restore();
      c.fillStyle = NEGRO; c.strokeStyle = BLANCO; c.lineWidth = 3; const bx = derecha ? x0 - 4 : x0, bw = ancho + 4; c.beginPath(); c.rect(bx, cy - 26, bw, 52); c.fill(); c.stroke();
      c.fillStyle = BLANCO; c.font = 'bold 40px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(fmt(Math.round(valor)), bx + bw / 2, cy + 1);
    };
    cinta(0, W * 0.22, Math.max(0, L.asi || 0), 10, H / 80, v => String(v), false);
    cinta(W * 0.78, W * 0.22, L.alt || 0, 100, H / 600, v => String(v), true);
    /* abajo: rumbo; arriba a la derecha: variómetro */
    c.fillStyle = NEGRO; c.strokeStyle = BLANCO; c.lineWidth = 3; c.beginPath(); c.rect(cx - 56, H - 44, 112, 40); c.fill(); c.stroke();
    c.fillStyle = BLANCO; c.font = 'bold 32px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(Math.round(this.estado.rumbo ?? 0) || 360).padStart(3, '0') + '°', cx, H - 23);
    /* unidades sobre una banda negra al pie de cada cinta (encima de los números, para que no se pisen); variómetro arriba a la derecha */
    c.fillStyle = NEGRO; c.fillRect(0, H - 30, W * 0.22, 30); c.fillRect(W * 0.78, H - 30, W * 0.22, 30);
    c.fillStyle = BLANCO; c.font = 'bold 20px Arial'; c.textAlign = 'center'; c.fillText('MPH', W * 0.11, H - 14); c.fillText('FT', W * 0.89, H - 14);
    c.fillStyle = NEGRO; c.fillRect(W * 0.78, 0, W * 0.22, 34); c.fillStyle = BLANCO; c.textAlign = 'right'; c.fillText(`${(L.vsi || 0) >= 0 ? '+' : ''}${Math.round((L.vsi || 0) / 50) * 50}`, W - 8, 17);
  }

  /* ---- Garmin de rumbo (HSI): rosa que gira, línea de fe, aguja de curso en el rumbo de la pista (36), rumbo en grande y velocidad sobre el suelo ---- */
  _hsi(p) {
    const { c, W, H } = p, rumbo = this.estado.rumbo ?? 0, cx = W / 2, cy = H / 2 + 12, R = Math.min(W, H) * 0.40;
    c.fillStyle = NEGRO; c.fillRect(0, 0, W, H);
    c.save(); c.translate(cx, cy); c.rotate(-rumbo * Math.PI / 180);
    c.strokeStyle = BLANCO; c.fillStyle = BLANCO; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R, 0, 7); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let d = 0; d < 360; d += 5) {
      const largo = d % 30 === 0 ? 22 : d % 10 === 0 ? 14 : 8; c.save(); c.rotate(d * Math.PI / 180); c.fillRect(-1.5, -R, 3, largo);
      if (d % 30 === 0) { const t = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || String(d / 10); c.font = `bold ${t.length === 1 && isNaN(t) ? 34 : 26}px Arial`; c.fillText(t, 0, -R + 46); }
      c.restore();
    }
    /* aguja de curso (CDI) fija a la pista 36 */
    c.save(); c.rotate(0); c.fillStyle = '#d0d0d0'; c.fillRect(-4, -R + 6, 8, R * 0.45); c.fillRect(-4, R * 0.55, 8, R * 0.45 - 6); c.beginPath(); c.moveTo(0, -R + 2); c.lineTo(-14, -R + 30); c.lineTo(14, -R + 30); c.closePath(); c.fill(); c.restore();
    c.restore();
    /* avioncito y línea de fe */
    c.fillStyle = '#f2c200'; c.fillRect(cx - 34, cy - 3, 68, 6); c.fillRect(cx - 3, cy - 26, 6, 44); c.fillRect(cx - 14, cy + 14, 28, 5);
    c.fillStyle = BLANCO; c.beginPath(); c.moveTo(cx, cy - R - 2); c.lineTo(cx - 12, cy - R - 26); c.lineTo(cx + 12, cy - R - 26); c.closePath(); c.fill();
    /* cajas: rumbo arriba, GS abajo a la izquierda, curso abajo a la derecha */
    const caja = (x, y, w, h, txt, tam) => { c.fillStyle = NEGRO; c.strokeStyle = BLANCO; c.lineWidth = 3; c.beginPath(); c.rect(x, y, w, h); c.fill(); c.stroke(); c.fillStyle = BLANCO; c.font = `bold ${tam}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x + w / 2, y + h / 2 + 1); };
    caja(cx - 60, 4, 120, 46, String(Math.round(rumbo) || 360).padStart(3, '0') + '°', 38);
    caja(6, H - 44, 150, 40, `GS ${Math.round(this.estado.gs || 0)} MPH`, 24);
    caja(W - 118, H - 44, 112, 40, 'CRS 360°', 24);
  }

  /* ---- MVP-50: cuatro cajas grandes (TRQ · ITT · Ng · PROP) con su barra y seis chicas (FF · OIL P · OIL T · VOLT · AMP · FUEL) ---- */
  _mvp(p) {
    const { c, W, H } = p, L = this.estado.L || {}, rojoParpadea = Math.floor(this.t * 3) % 2 === 0;
    c.fillStyle = NEGRO; c.fillRect(0, 0, W, H);
    c.fillStyle = '#9ad0ff'; c.font = 'bold 18px Arial'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('MVP-50  PT6A-67F', 10, 16); c.textAlign = 'right'; c.fillText(this.estado.encendido ? 'ENGINE RUN' : 'ENGINE OFF', W - 10, 16);
    const barra = (x, y, w, h, cfg, v) => {
      c.fillStyle = '#2b2e33'; c.fillRect(x, y, w, h);
      for (const [a, b, col] of cfg.arcos) { const xa = x + w * (a - cfg.min) / (cfg.max - cfg.min), xb = x + w * (b - cfg.min) / (cfg.max - cfg.min); c.fillStyle = col; c.fillRect(xa, y, xb - xa, h); }
      const xv = x + w * Math.max(0, Math.min(1, (v - cfg.min) / (cfg.max - cfg.min))); c.fillStyle = BLANCO; c.fillRect(xv - 2, y - 4, 4, h + 8);
    };
    const celda = (x, y, w, h, cfg, v, grande) => {
      c.strokeStyle = '#3a3e45'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
      c.fillStyle = '#c8ccd2'; c.font = `bold ${grande ? 20 : 18}px Arial`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(cfg.rot, x + 8, y + 16);
      c.textAlign = 'right'; c.font = `${grande ? 16 : 14}px Arial`; c.fillText(cfg.unidad, x + w - 8, y + 16);
      const rojo = enArco(cfg, v, ROJO), amar = enArco(cfg, v, AMAR);
      c.fillStyle = rojo ? (rojoParpadea ? ROJO : BLANCO) : amar ? AMAR : BLANCO; c.font = `bold ${grande ? 54 : 36}px Arial`; c.textAlign = 'center'; c.fillText(cfg.fmt(v), x + w / 2, y + (grande ? 56 : 46));
      barra(x + 10, y + h - 20, w - 20, 10, cfg, v);
    };
    const wG = (W - 20) / 4, hG = 118;
    [['torque', L.torque], ['itt', L.itt], ['ng', L.ng], ['prop', L.prop]].forEach(([k, v], i) => celda(10 + i * wG, 32, wG, hG, MVP[k], v || 0, true));
    const wC = (W - 20) / 2, hC = (H - 32 - hG - 16) / 3, y0 = 32 + hG + 8;
    [['ff', L.ff], ['oilp', L.oilp], ['oilt', L.oilt]].forEach(([k, v], i) => celda(10, y0 + i * hC, wC, hC, MVP[k], v || 0, false));
    [['volt', L.volt], ['amp', L.amp]].forEach(([k, v], i) => celda(10 + wC, y0 + i * hC, wC, hC, MVP[k], v || 0, false));
    /* combustible: no está modelado (el vuelo no gasta): muestra los tanques a 2/3, como los relojes de la cabina vieja */
    celda(10 + wC, y0 + 2 * hC, wC, hC, MVP.fuel, 84, false);
    c.fillStyle = '#c8ccd2'; c.font = '14px Arial'; c.textAlign = 'right'; c.fillText('L 84   R 84', 10 + 2 * wC - 8, y0 + 2 * hC + hC - 34);
  }
}

/* ---- Rótulos (etapa 3, 8/11): cada placa del GLB con userData.panel (texto JSON escrito por herramientas/cab_llaves.py: marco c/u/v/n,
   ancho, alto, títulos y piezas con su posición en metros desde la esquina de arriba a la izquierda) recibe un canvas transparente
   0,3 mm por delante con los títulos, el recuadro de cada fila y el rótulo de cada llave o breaker. Así los textos se corrigen sin
   Blender. PX píxeles por metro; letra mínima 4 mm (en el Quest no se lee: la lee el tutor). */
const PX = 3000;
export class Rotulos {
  constructor(raiz) {
    this.planos = [];
    const objetos = []; raiz.traverse(o => { if (o.userData?.panel) objetos.push(o); });
    for (const o of objetos) {
      let d; try { d = JSON.parse(o.userData.panel); } catch (e) { console.warn('userData.panel ilegible en', o.name, e); continue; }
      const W = Math.round(d.w * PX), H = Math.round(d.h * PX), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
      const px = (s, t) => [s * PX, t * PX];
      c.clearRect(0, 0, W, H); c.textAlign = 'center'; c.textBaseline = 'middle';
      const rojo = o.name.startsWith('salvo'); const tinta = rojo ? '#ffffff' : '#e6e6e6';
      const texto = (t, s, y, tam, negrita = true) => { if (!t) return; const lineas = String(t).split('\n'); c.fillStyle = tinta; c.font = `${negrita ? 'bold ' : ''}${tam}px Arial`; lineas.forEach((l, k) => c.fillText(l, ...px(s, y + (k - (lineas.length - 1) / 2) * 0.0042))); };
      /* recuadro por fila (sólo en los paneles bajos): de 2,2 cm sobre las piezas a 3 cm debajo, con el título montado sobre la línea */
      const filas = new Map(); for (const it of d.items) if (it.tipo !== 'display') { const k = it.t.toFixed(3); filas.set(k, (filas.get(k) || []).concat(it)); }
      if (o.name.startsWith('panel_')) for (const [k, its] of filas) { const t = +k; c.strokeStyle = '#b8b8b8'; c.lineWidth = 2; c.strokeRect(...px(0.004, t - 0.021), W - 0.008 * PX, 0.048 * PX); }
      for (const ti of d.titulos || []) { const tam = rojo ? 0.0085 * PX : 0.0062 * PX; c.font = `bold ${tam}px Arial`; const ancho = c.measureText(ti.t).width + 16; if (!rojo) { c.fillStyle = '#16171a'; c.fillRect(ti.s * PX - ancho / 2, ti.y * PX - tam * 0.7, ancho, tam * 1.4); } texto(ti.t, ti.s, ti.y, tam); }
      for (const it of d.items) {
        if (it.tipo === 'display') { texto('MARK', it.s - 0.024, it.t - 0.034, 0.0032 * PX); texto('DISTRESS', it.s, it.t - 0.038, 0.0032 * PX); texto('MENU', it.s + 0.024, it.t - 0.034, 0.0032 * PX); texto('MSG', it.s - 0.024, it.t + 0.034, 0.0032 * PX); texto('HOME', it.s + 0.024, it.t + 0.034, 0.0032 * PX); continue; }
        const chica = 0.0036 * PX, media = 0.004 * PX;
        if (it.tipo === 'texto') { texto(it.rotulo, it.s, it.t, it.tam ? it.tam * PX : media); continue; }   /* un texto suelto (FUEL, MAIN/OFF, NOSE LEFT…) */
        if (it.tipo === 'cb') { texto(it.arriba, it.s, it.t - 0.011, chica); texto(it.rotulo, it.s, it.t + 0.0125, chica, false); }
        else { texto(it.arriba, it.s, it.t - 0.011, media); const abajo = it.tipo === 'sw3' ? [it.rotulo, it.abajo] : [it.abajo, it.rotulo]; texto(abajo[0], it.s, it.t + 0.0115, media); texto(abajo[1], it.s, it.t + 0.0115 + 0.0042 * (1 + (String(abajo[0] || '').split('\n').length - 1) / 2 + (String(abajo[1] || '').split('\n').length - 1) / 2), chica, false); }
      }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      const u = new THREE.Vector3().fromArray(d.u), v = new THREE.Vector3().fromArray(d.v), n = new THREE.Vector3().fromArray(d.n);
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, n)); m.position.fromArray(d.c).addScaledVector(n, 0.0003); m.renderOrder = 1; m.name = 'rotulos_' + o.name;
      raiz.add(m); this.planos.push(m);
    }
  }
}
