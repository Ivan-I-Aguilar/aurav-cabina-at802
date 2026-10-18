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

export class Instrumentos {
  constructor(raiz, datos) {
    this.raiz = raiz; this.agujas = {}; this.valores = {};
    for (const d of datos) {
      const base = new THREE.Group(); base.position.fromArray(d.c).addScaledVector(new THREE.Vector3().fromArray(d.n), 0.004);
      // marco local: ex (derecha del reloj), ey (arriba), n (hacia el piloto)
      const ex = new THREE.Vector3().fromArray(d.ex), ey = new THREE.Vector3().fromArray(d.ey), n = new THREE.Vector3().fromArray(d.n);
      base.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, n)); raiz.add(base);
      if (d.tipo === 'horizonte') { this._horizonte(base, d.r); continue; }
      if (d.tipo === 'reloj') { this._reloj(base, d.r); continue; }
      const larga = this._aguja(base, d.r * 0.8, d.r * 0.055, matAguja);
      const ag = { larga, esc: ESCALAS[d.tipo], r: d.r };
      if (d.tipo === 'alt') ag.corta = this._aguja(base, d.r * 0.5, d.r * 0.09, matAgujaCorta);
      const eje = new THREE.Mesh(new THREE.CircleGeometry(d.r * 0.08, 12), matEje); eje.position.z = 0.0012; base.add(eje);
      this.agujas[d.tipo] = ag;
    }
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
