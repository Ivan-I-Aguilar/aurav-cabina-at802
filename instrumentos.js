// Instrumentos vivos: agujas 3D sobre las caras dibujadas del panel y horizonte artificial animado.
// La geometría de cada reloj (centro, radio, normal, ejes) sale de herramientas/instrumentos.py → instrumentos.json.
// Escalas iguales a las de relojes.py (a0 = ángulo del mínimo en grados «canvas», sweep en grados, horario).
import * as THREE from './three.module.js';

const ESCALAS = {
  asi:    { a0: 120, sweep: 300, vmin: 40, vmax: 260 },
  alt:    { a0: -90, sweep: 360, vmin: 0, vmax: 10 },       // aguja larga: centenas de pie (0–1000); corta: miles
  vsi:    { a0: 180, sweep: 340, vmin: -2, vmax: 2 },        // miles de pie/min
  torque: { a0: 135, sweep: 270, vmin: 0, vmax: 100 },
  itt:    { a0: 135, sweep: 270, vmin: 0, vmax: 1000 },
  prop:   { a0: 135, sweep: 270, vmin: 0, vmax: 25 },        // cientos de RPM
  ng:     { a0: 135, sweep: 270, vmin: 0, vmax: 110 },
  ff:     { a0: 135, sweep: 270, vmin: 0, vmax: 600 },
  fuelL:  { a0: 150, sweep: 240, vmin: 0, vmax: 4 }, fuelR: { a0: 150, sweep: 240, vmin: 0, vmax: 4 },
  oilp:   { a0: 150, sweep: 240, vmin: 0, vmax: 150 }, oilt: { a0: 150, sweep: 240, vmin: 0, vmax: 120 },
  volt:   { a0: 150, sweep: 240, vmin: 0, vmax: 30 }, amp: { a0: 150, sweep: 240, vmin: 0, vmax: 300 },
  hyd:    { a0: 150, sweep: 240, vmin: 0, vmax: 3000 }, fuelp: { a0: 150, sweep: 240, vmin: 0, vmax: 60 },
  suction:{ a0: 150, sweep: 240, vmin: 0, vmax: 10 },
};
const matAguja = new THREE.MeshBasicMaterial({ color: 0xf4f4f4 });
const matAgujaCorta = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
const matEje = new THREE.MeshBasicMaterial({ color: 0x303034 });

/* Carátulas dibujadas en vivo (25/10, tablero reconstruido): mismas escalas que las agujas, definiciones
   portadas de herramientas/relojes.py. El canvas usa la MISMA convención de ángulos que PIL (y hacia abajo,
   horario), así que las marcas calzan exactas con rotation.z = −(a0 + sweep·t) de las agujas. */
const VERDE = '#3cb446', AMAR = '#e6c828', ROJO = '#dc2828', BLANCO = '#f0f0f0';
const CARAS = {
  asi:   { paso: 20, sub: 4, etq: 1, arcos: [[60, 100, BLANCO], [70, 210, VERDE], [210, 235, AMAR], [235, 240, ROJO]], titulo: 'AIRSPEED', unidad: 'MPH', numR: 0.6 },
  alt:   { paso: 1, sub: 5, etq: 1, titulo: 'ALT', unidad: 'FEET', fmt: v => String(Math.round(v) % 10), numR: 0.7 },
  vsi:   { paso: 0.5, sub: 5, etq: 2, titulo: 'VERT SPEED', unidad: '1000 FT/MIN', fmt: v => String(Math.abs(Math.round(v))) },
  torque: { paso: 10, sub: 2, etq: 2, arcos: [[0, 85, VERDE], [85, 100, ROJO]], titulo: 'TORQUE', unidad: '%' },
  itt:   { paso: 100, sub: 2, etq: 2, arcos: [[400, 800, VERDE], [800, 850, AMAR], [850, 1000, ROJO]], titulo: 'ITT', unidad: '°C x100', fmt: v => String(Math.floor(v / 100)) },
  prop:  { paso: 5, sub: 5, etq: 1, arcos: [[10, 17, VERDE], [17, 25, ROJO]], titulo: 'PROP RPM', unidad: 'x100' },
  ng:    { paso: 10, sub: 2, etq: 2, arcos: [[60, 101, VERDE], [101, 110, ROJO]], titulo: 'Ng', unidad: '% RPM' },
  ff:    { paso: 100, sub: 2, etq: 1, arcos: [[100, 500, VERDE]], titulo: 'FUEL FLOW', unidad: 'PPH' },
  fuelL: { paso: 1, sub: 2, etq: 2, arcos: [[0, 0.5, ROJO]], titulo: 'FUEL L', fmt: v => ['E', '', '1/2', '', 'F'][Math.round(v)], numR: 0.7 },
  fuelR: { paso: 1, sub: 2, etq: 2, arcos: [[0, 0.5, ROJO]], titulo: 'FUEL R', fmt: v => ['E', '', '1/2', '', 'F'][Math.round(v)], numR: 0.7 },
  oilp:  { paso: 50, sub: 5, etq: 1, arcos: [[85, 105, VERDE], [0, 60, ROJO]], titulo: 'OIL PRESS', unidad: 'PSI' },
  oilt:  { paso: 20, sub: 2, etq: 2, arcos: [[10, 99, VERDE], [99, 120, ROJO]], titulo: 'OIL TEMP', unidad: '°C' },
  volt:  { paso: 5, sub: 2, etq: 1, arcos: [[24, 29, VERDE]], titulo: 'VOLT' },
  amp:   { paso: 50, sub: 2, etq: 2, titulo: 'AMP' },
  hyd:   { paso: 1000, sub: 4, etq: 1, arcos: [[1000, 2200, VERDE]], titulo: 'HYD', unidad: 'x1000 PSI', fmt: v => String(Math.round(v / 1000)) },
  fuelp: { paso: 10, sub: 2, etq: 2, arcos: [[15, 50, VERDE]], titulo: 'FUEL PRESS', unidad: 'PSI' },
  suction: { paso: 2, sub: 2, etq: 1, arcos: [[4, 6, VERDE]], titulo: 'SUCTION' },
  reloj: { paso: 1, sub: 5, etq: 1, numR: 0.72, fmt: v => String(Math.round(v) % 12 || 12), esc: { a0: -90, sweep: 360, vmin: 0, vmax: 12 } },
};

export class Instrumentos {
  constructor(raiz, datos) {
    this.raiz = raiz; this.agujas = {}; this.valores = {};
    for (const d of datos) {
      const base = new THREE.Group(); base.position.fromArray(d.c).addScaledVector(new THREE.Vector3().fromArray(d.n), 0.004);
      // marco local: ex (derecha del reloj), ey (arriba), n (hacia el piloto)
      const ex = new THREE.Vector3().fromArray(d.ex), ey = new THREE.Vector3().fromArray(d.ey), n = new THREE.Vector3().fromArray(d.n);
      base.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, n)); raiz.add(base);
      if (d.tipo === 'horizonte') { this._horizonte(base, d.r); this._bisel(base, d.r); continue; }
      this._cara(base, d); this._bisel(base, d.r);
      if (d.tipo === 'reloj') { this._reloj(base, d.r); continue; }
      const larga = this._aguja(base, d.r * 0.8, d.r * 0.055, matAguja);
      const ag = { larga, esc: ESCALAS[d.tipo], r: d.r };
      if (d.tipo === 'alt') ag.corta = this._aguja(base, d.r * 0.5, d.r * 0.09, matAgujaCorta);
      const eje = new THREE.Mesh(new THREE.CircleGeometry(d.r * 0.08, 12), matEje); eje.position.z = 0.0012; base.add(eje);
      this.agujas[d.tipo] = ag;
    }
  }
  _cara(base, d) {
    const cfg = CARAS[d.tipo] || {}; const esc = cfg.esc || ESCALAS[d.tipo];
    const S = 256, cx = 128, cy = 128, R = 122;
    const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
    c.fillStyle = '#101113'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
    const pol = (r, a) => { a *= Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    if (esc && cfg.paso) {
      const ang = v => esc.a0 + esc.sweep * (v - esc.vmin) / (esc.vmax - esc.vmin);
      for (const [v0, v1, col] of cfg.arcos || []) { c.strokeStyle = col; c.lineWidth = R * 0.07; c.beginPath(); c.arc(cx, cy, R * 0.86, ang(v0) * Math.PI / 180, ang(v1) * Math.PI / 180); c.stroke(); }
      c.strokeStyle = BLANCO; c.fillStyle = BLANCO; c.textAlign = 'center'; c.textBaseline = 'middle';
      let k = 0;
      for (let v = esc.vmin; v <= esc.vmax + 1e-6; v += cfg.paso, k++) {
        for (let s = 0; s < (v < esc.vmax - 1e-6 ? cfg.sub : 1); s++) {
          const a = ang(v + cfg.paso * s / cfg.sub), big = s === 0;
          c.lineWidth = Math.max(1.5, R * (big ? 0.04 : 0.015)); c.beginPath(); c.moveTo(...pol(R * (big ? 0.76 : 0.84), a)); c.lineTo(...pol(R * 0.92, a)); c.stroke();
        }
        if (k % (cfg.etq || 1) === 0) { c.font = `bold ${Math.round(R * 0.19)}px Arial`; const f = cfg.fmt || (x => String(Math.round(x))); c.fillText(f(v), ...pol(R * (cfg.numR || 0.6), ang(v))); }
      }
      if (cfg.titulo) { c.font = `bold ${Math.round(R * 0.12)}px Arial`; c.fillText(cfg.titulo, cx, cy + R * 0.3); }
      if (cfg.unidad) { c.fillStyle = '#bebebe'; c.font = `${Math.round(R * 0.1)}px Arial`; c.fillText(cfg.unidad, cx, cy + R * 0.45); }
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    base.add(new THREE.Mesh(new THREE.CircleGeometry(d.r, 40), new THREE.MeshBasicMaterial({ map: tex })));
  }
  _bisel(base, r) {   /* aro embutido alrededor de cada reloj, por delante de las agujas */
    const b = new THREE.Mesh(new THREE.RingGeometry(r * 0.97, r * 1.16, 40), new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.55, metalness: 0.3 }));
    b.position.z = 0.004; base.add(b);
  }
  _aguja(base, largo, ancho, mat) {
    const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(largo * 1.15, ancho), mat);
    m.position.x = largo * 0.5 - largo * 0.15; g.add(m); g.position.z = 0.0008; base.add(g); return g;
  }
  _reloj(base, r) {
    this.relojH = this._aguja(base, r * 0.5, r * 0.08, matAguja); this.relojM = this._aguja(base, r * 0.8, r * 0.05, matAguja);
    this.relojS = this._aguja(base, r * 0.85, r * 0.02, new THREE.MeshBasicMaterial({ color: 0xdd3333 }));
  }
  _horizonte(base, r) {
    // disco con cielo/tierra que se desplaza (cabeceo) y gira (alabeo) detrás de un anillo negro; avioncito fijo
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const c = cv.getContext('2d');
    c.fillStyle = '#3c82d2'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#8c5a2d'; c.fillRect(0, 256, 256, 256);
    c.fillStyle = '#fff'; c.fillRect(0, 254, 256, 4);
    c.font = 'bold 18px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const p of [10, 20, 30]) for (const s of [1, -1]) { const y = 256 - s * p * 3.2; const w = p === 20 ? 40 : p === 10 ? 26 : 56; c.fillRect(128 - w, y - 1.5, 2 * w, 3); if (p > 5) { c.fillText(p, 128 - w - 16, y); c.fillText(p, 128 + w + 16, y); } }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    this.horTex = tex;
    const disco = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 48), new THREE.MeshBasicMaterial({ map: tex }));
    // la textura muestra ±40° de cabeceo en todo el alto; se usa repeat para que el disco vea sólo ±25°
    tex.repeat.set(1, 0.375); tex.offset.set(0, 0.3125);   /* la textura cubre ±80°; el disco muestra ±30° */
    base.add(disco); this.horDisco = disco;
    const caja = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.035, 40, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.0175), new THREE.MeshBasicMaterial({ color: 0x0b0b0c, side: THREE.DoubleSide })); base.add(caja);   /* caja del instrumento: que no parezca flotar */
    const anillo = new THREE.Mesh(new THREE.RingGeometry(r * 0.88, r * 1.02, 48), new THREE.MeshBasicMaterial({ color: 0x0e0e10 })); anillo.position.z = 0.001; base.add(anillo);
    const amarillo = new THREE.MeshBasicMaterial({ color: 0xf2c200 });
    for (const s of [-1, 1]) { const ala = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.34, r * 0.05), amarillo); ala.position.set(s * r * 0.29, 0, 0.0015); base.add(ala); }
    const punto = new THREE.Mesh(new THREE.CircleGeometry(r * 0.05, 10), amarillo); punto.position.z = 0.0015; base.add(punto);
    const tri = new THREE.Mesh(new THREE.CircleGeometry(r * 0.06, 3), amarillo); tri.position.set(0, r * 0.82, 0.0015); tri.rotation.z = Math.PI / 2; base.add(tri);
  }
  // valores: { asi(mph), alt(ft), vsi(fpm), torque(%), itt(°C), prop(rpm), ng(%), ff(pph), ..., cabeceo(rad), alabeo(rad) }
  fijar(v) { Object.assign(this.valores, v); }
  actualizar(dt) {
    const v = this.valores;
    const ang = (esc, val) => { const t = THREE.MathUtils.clamp((val - esc.vmin) / (esc.vmax - esc.vmin), -0.02, 1.02); return -THREE.MathUtils.degToRad(esc.a0 + esc.sweep * t); };
    const k = Math.min(1, dt * 8);   // las agujas siguen con un poco de inercia
    const pon = (tipo, val, cual = 'larga') => { const a = this.agujas[tipo]; if (!a) return; const obj = a[cual]; const dest = ang(a.esc, val); obj.rotation.z += (dest - obj.rotation.z) * k; };
    pon('asi', v.asi ?? 0); pon('vsi', (v.vsi ?? 0) / 1000); pon('torque', v.torque ?? 0); pon('itt', v.itt ?? 15);
    pon('prop', (v.prop ?? 0) / 100); pon('ng', v.ng ?? 0); pon('ff', v.ff ?? 0);
    const alt = v.alt ?? 0; pon('alt', (alt % 1000) / 100); pon('alt', (alt % 10000) / 1000, 'corta');
    pon('fuelL', v.fuelL ?? 2.6); pon('fuelR', v.fuelR ?? 2.8); pon('oilp', v.oilp ?? 0); pon('oilt', v.oilt ?? 20);
    pon('volt', v.volt ?? 0); pon('amp', v.amp ?? 0); pon('hyd', v.hyd ?? 0); pon('fuelp', v.fuelp ?? 0); pon('suction', v.suction ?? 0);
    if (this.horDisco) {
      const cab = THREE.MathUtils.clamp(v.cabeceo ?? 0, -0.6, 0.6);
      this.horTex.offset.y = 0.3125 + THREE.MathUtils.radToDeg(cab) / 160;
      this.horDisco.rotation.z = (v.alabeo ?? 0);   /* alabeo a la derecha: el horizonte gira antihorario */
    }
    if (this.relojH) { const d = new Date(); this.relojH.rotation.z = Math.PI / 2 - (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2; this.relojM.rotation.z = Math.PI / 2 - d.getMinutes() / 60 * Math.PI * 2; this.relojS.rotation.z = Math.PI / 2 - d.getSeconds() / 60 * Math.PI * 2; }
  }
}
