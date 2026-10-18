// Controles manipulables de la cabina: switches (palanquitas) y palancas del cuadrante.
// Las mallas vienen separadas del GLB («sw<parte>», «lev<parte>»); acá se les pone un pivote y se las anima.
// VR: el gatillo o el grip cerca de un control lo acciona (switch: cambia; palanca: se agarra y sigue la mano).
// También se accionan «pinchándolos» con la mano. PC: clic sobre el control.
import * as THREE from './three.module.js';

const caja = new THREE.Box3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const SW_ANG = 0.45;    // inclinación de la palanquita (rad) arriba/abajo

export class Controles {
  constructor(raiz) {
    this.raiz = raiz;            // grupo del avión (marco del modelo)
    this.switches = [];          // { grupo, pivote, estado, nombre, alDistancia }
    this.palancas = [];          // { grupo, pivote, ang, min, max, agarre }
    this.alCambiar = null;       // callback(nombre, valor)
    this._ultimoToque = new Map();
  }
  // toma las mallas del GLB y las cuelga de pivotes
  armar(escenaGLB) {
    const mallas = []; escenaGLB.traverse(o => { if (o.isMesh && /^(sw|lev)\d+$/.test(o.name)) mallas.push(o); });
    for (const o of mallas) {
      o.geometry.computeBoundingBox(); caja.copy(o.geometry.boundingBox); const c = caja.getCenter(new THREE.Vector3());
      const g = new THREE.Group(); g.name = 'piv_' + o.name;
      if (o.name.startsWith('sw')) {
        const piv = new THREE.Vector3(c.x, c.y, caja.min.z);     // la palanquita nace en la cara del panel y asoma hacia +z
        g.position.copy(piv); o.position.sub(piv); g.add(o); this.raiz.add(g);
        const s = { grupo: g, pivote: piv, estado: false, nombre: o.name, malla: o }; this.switches.push(s); this._aplicarSwitch(s);
      } else {
        const piv = new THREE.Vector3(c.x, caja.min.y, c.z);     // las palancas giran en su base
        g.position.copy(piv); o.position.sub(piv); g.add(o); this.raiz.add(g);
        this.palancas.push({ grupo: g, pivote: piv, ang: 0, min: -0.9, max: 0.15, agarre: null, nombre: o.name, malla: o, alto: caja.max.y - caja.min.y });
      }
    }
    return this;
  }
  _aplicarSwitch(s) { s.grupo.rotation.x = s.estado ? -SW_ANG : SW_ANG; }
  alternar(s) { s.estado = !s.estado; this._aplicarSwitch(s); this.alCambiar?.(s.nombre, s.estado); }
  // punto de agarre de una palanca (su extremo) en coordenadas del mundo
  _puntaPalanca(p, out) { return p.grupo.localToWorld(out.set(0, p.alto, 0)); }
  _puntaSwitch(s, out) { return s.grupo.localToWorld(out.set(0, 0, 0.03)); }
  // ---- VR ----
  // mano: Object3D del control; apretado: si está apretando gatillo/grip en este cuadro; recienApretado: flanco
  manoVR(mano, apretado, recienApretado) {
    mano.getWorldPosition(tmp);
    if (recienApretado) {
      let mejor = null, d0 = 0.06;
      for (const s of this.switches) { const d = this._puntaSwitch(s, tmp2).distanceTo(tmp); if (d < d0) { d0 = d; mejor = () => this.alternar(s); } }
      for (const p of this.palancas) { const d = this._puntaPalanca(p, tmp2).distanceTo(tmp); if (d < Math.max(d0, 0.1)) { d0 = d; mejor = () => { p.agarre = mano; }; } }
      if (mejor) { mejor(); return true; }
    }
    if (!apretado) for (const p of this.palancas) if (p.agarre === mano) p.agarre = null;
    // pinchar: la mano atraviesa la palanquita (con un respiro para no rebotar)
    for (const s of this.switches) {
      const d = this._puntaSwitch(s, tmp2).distanceTo(tmp); const t = performance.now();
      if (d < 0.018 && (t - (this._ultimoToque.get(s) || 0)) > 600) { this._ultimoToque.set(s, t); this.alternar(s); }
    }
    return false;
  }
  // ---- PC: clic ----
  clic(raycaster) {
    const objs = [...this.switches.map(s => s.malla), ...this.palancas.map(p => p.malla)];
    const h = raycaster.intersectObjects(objs, false)[0]; if (!h) return false;
    const s = this.switches.find(x => x.malla === h.object); if (s) { this.alternar(s); return true; }
    const p = this.palancas.find(x => x.malla === h.object); if (p) { p.ang = p.ang < -0.4 ? 0 : -0.85; this._aplicarPalanca(p); this.alCambiar?.(p.nombre, p.ang); return true; }
    return false;
  }
  _aplicarPalanca(p) { p.grupo.rotation.x = p.ang; }
  actualizar() {
    for (const p of this.palancas) {
      if (!p.agarre) continue;
      this.raiz.worldToLocal(p.agarre.getWorldPosition(tmp)); tmp.sub(p.pivote);
      const a = THREE.MathUtils.clamp(Math.atan2(tmp.z, tmp.y), p.min, p.max);   // adelante (−z) = ángulo negativo
      if (Math.abs(a - p.ang) > 1e-3) { p.ang = a; this._aplicarPalanca(p); this.alCambiar?.(p.nombre, p.ang); }
    }
  }
  estado(nombre) { const s = this.switches.find(x => x.nombre === nombre); return s ? s.estado : null; }
}
