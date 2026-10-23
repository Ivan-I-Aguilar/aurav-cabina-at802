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
    const mallas = []; escenaGLB.traverse(o => { if (o.isMesh && /^(sw|lev)\w+$/.test(o.name)) mallas.push(o); });
    for (const o of mallas) {
      o.geometry.computeBoundingBox(); caja.copy(o.geometry.boundingBox); const c = caja.getCenter(new THREE.Vector3());
      const g = new THREE.Group(); g.name = 'piv_' + o.name;
      if (o.name.startsWith('sw')) {
        const piv = o.userData.piv ? new THREE.Vector3(...o.userData.piv) : o.userData.pivBase ? new THREE.Vector3(c.x, caja.min.y, c.z) : new THREE.Vector3(c.x, c.y, caja.min.z);     // la palanquita nace en la cara del panel y asoma hacia +z (recortadas de consola: asoma hacia arriba)
        g.position.copy(piv); o.position.sub(piv); g.add(o); this.raiz.add(g);
        const s = { grupo: g, pivote: piv, estado: false, nombre: o.name, malla: o, eje: o.userData.eje || 'x', ang: o.userData.ang || null, pos: o.userData.pos || null, perilla: o.userData.perilla || 0, suave: !!o.userData.suave };
        if (s.pos) s.estado = o.userData.inicial ?? 0; else if (s.perilla) s.estado = 0;   /* ang: [apagado, encendido] en rad sobre el eje (manijas que giran distinto) */ this.switches.push(s); this._aplicarSwitch(s);
      } else {
        const piv = new THREE.Vector3(c.x, o.userData.pivY ?? caja.min.y, c.z);     // las palancas giran en su base (o en pivY si la manija está recortada)
        g.position.copy(piv); o.position.sub(piv); g.add(o); this.raiz.add(g);
        this.palancas.push({ grupo: g, pivote: piv, ang: 0, min: -0.9, max: 0.15, agarre: null, nombre: o.name, malla: o, alto: caja.max.y - piv.y, escala: o.userData.escala ?? 1 });
      }
    }
    return this;
  }
  /* switches de 2 posiciones: estado true (arriba) / false (abajo).
     de 3 posiciones (s.tres = true): estado 1 arriba · 0 medio · −1 abajo; cada toque avanza y rebota en los extremos (arriba → medio → abajo → medio → …) */
  _aplicarSwitch(s) {
    if (s.pos) { if (s.suave) s.objetivo = s.pos[s.estado]; else s.grupo.rotation[s.eje] = s.pos[s.estado]; return; }   /* varias posiciones: estado = índice; suave = se mueve de a poco (ventana) */
    if (s.perilla) { s.grupo.rotation[s.eje] = s.estado * s.perilla; return; }   /* perilla giratoria: estado = pasos girados */
    if (s.ang) { s.grupo.rotation[s.eje] = s.estado ? s.ang[1] : s.ang[0]; return; }
    if (!s.tres) { s.grupo.rotation.x = s.estado ? -SW_ANG : SW_ANG; return; }
    if (typeof s.estado === 'boolean') s.estado = s.estado ? 1 : 0;
    s.grupo.rotation.x = -SW_ANG * s.estado;
  }
  alternar(s) {
    if (s.pos) { s.paso ??= 1; if (s.estado + s.paso >= s.pos.length || s.estado + s.paso < 0) s.paso = -s.paso; s.estado += s.paso; }
    else if (s.perilla) s.estado++;
    else if (s.tres) { s.paso ??= 1; if (s.estado + s.paso > 1 || s.estado + s.paso < -1) s.paso = -s.paso; s.estado += s.paso; }
    else s.estado = !s.estado;
    this._aplicarSwitch(s); this.alCambiar?.(s.nombre, s.estado);
  }
  hacerTresPosiciones(nombre, inicial = 0) { const s = this.switches.find(x => x.nombre === nombre); if (s) { s.tres = true; s.estado = inicial; this._aplicarSwitch(s); } return s; }
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
  // ---- PC: clic (y en VR: apuntar con el rayo y gatillo) ----
  impacto(raycaster) {
    const h = raycaster.intersectObjects([...this.switches.map(s => s.malla), ...this.palancas.map(p => p.malla)], false)[0]; if (h) return h;
    /* tolerante: el control cuyo centro pase a menos de 2,5 cm del rayo (las piezas chicas o con agujero, como F PUMP) */
    let mejor = null, d0 = 0.025; const r = raycaster.ray;
    for (const o of [...this.switches, ...this.palancas]) {
      const g = o.malla.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); o.malla.localToWorld(tmp.copy(g.boundingSphere.center));
      const d = r.distanceToPoint(tmp), t = tmp.sub(r.origin).dot(r.direction); if (d < d0 && t > 0 && t < raycaster.far) { d0 = d; mejor = { object: o.malla, distance: t }; }
    }
    return mejor;
  }
  clic(raycaster) {
    const h = this.impacto(raycaster); if (!h) return false;
    const s = this.switches.find(x => x.malla === h.object); if (s) { this.alternar(s); return true; }
    const p = this.palancas.find(x => x.malla === h.object); if (p) { const med = (p.min + p.max) / 2; p.ang = p.ang > med ? p.min + 0.05 : p.max - 0.05; this._aplicarPalanca(p); this.alCambiar?.(p.nombre, p.ang); return true; }
    return false;
  }
  _aplicarPalanca(p) { p.grupo.rotation.x = p.ang * p.escala; }   /* escala: recorrido visual menor para manijas largas; la lógica sigue en −0.9…0.15 */
  actualizar() {
    for (const s of this.switches) if (s.suave && s.objetivo != null) { const r = s.grupo.rotation; r[s.eje] += (s.objetivo - r[s.eje]) * 0.08; }
    for (const p of this.palancas) {
      if (!p.agarre) continue;
      this.raiz.worldToLocal(p.agarre.getWorldPosition(tmp)); tmp.sub(p.pivote);
      const a = THREE.MathUtils.clamp(Math.atan2(tmp.z, tmp.y) / p.escala, p.min, p.max);   // adelante (−z) = ángulo negativo
      if (Math.abs(a - p.ang) > 1e-3) { p.ang = a; this._aplicarPalanca(p); this.alCambiar?.(p.nombre, p.ang); }
    }
  }
  estado(nombre) { const s = this.switches.find(x => x.nombre === nombre); return s ? s.estado : null; }
}
