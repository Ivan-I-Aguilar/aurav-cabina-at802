// Modo a pie: caminar alrededor del avión (VR, PC y celular sin casco), subir por el estribo hasta el asiento y bajar.
// Marco de referencia de las posiciones: el de la cabina (+x derecha del piloto, +y arriba, −z hacia la nariz; piso en y = −2).
import * as THREE from './three.module.js';

const PISO = -2.0;
const ALTURA_OJOS = 1.65;                                   // PC / celular parado
const PIE_BAJADA = new THREE.Vector3(-2.2, PISO, 3.0);   // donde quedás al bajar (al lado del estribo, ala izquierda)
const ESTRIBO = new THREE.Vector3(-0.95, -1.35, 1.27);
const RECORRIDO_SUBIDA = [                                  // ojos: piso → estribo → raíz del ala → asiento (lo completa OJO)
  new THREE.Vector3(-1.5, PISO + ALTURA_OJOS, 1.27),
  new THREE.Vector3(-1.15, -1.35 + 1.6, 1.27),
  new THREE.Vector3(-1.0, -0.13 + 1.65, 0.9),
  new THREE.Vector3(-0.45, 1.5, 1.45),
];

export function crearAPie({ escena, avion, cabina, jugador, camara, renderer, ojoCabina, terreno, alPedirSubir }) {
  const estado = { modo: 'cabina', anim: null, vel: new THREE.Vector2(), turnoPrevio: 0, cerca: false, alturaXR: 0 };   /* alturaXR: compensación si el XR no da el piso (modo cámara con espacio «local») */
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), q = new THREE.Quaternion();

  // cartel «SUBIR» junto al estribo (se apunta, se toca o se clickea)
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(8,36,64,0.92)'; c.beginPath(); c.roundRect(0, 0, 256, 96, 20); c.fill();
  c.fillStyle = '#c8e63a'; c.font = 'bold 44px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('▲ SUBIR', 128, 50);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  cartel.position.set(-1.2, -0.75, 1.27); cartel.rotation.y = -Math.PI / 2; cartel.visible = false; cabina.add(cartel);

  // joystick en pantalla (celular), sólo a pie
  const tactil = matchMedia('(pointer: coarse)').matches;
  const base = document.createElement('div'); base.id = 'joy';
  base.style.cssText = 'position:fixed;right:24px;bottom:190px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.5);touch-action:none;display:none;z-index:20';
  const perilla = document.createElement('div');
  perilla.style.cssText = 'position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(200,230,58,.85)';
  base.appendChild(perilla); document.body.appendChild(base);
  const joy = { id: null, x: 0, y: 0 };
  const moverJoy = e => { const r = base.getBoundingClientRect(); let dx = e.clientX - (r.left + 60), dy = e.clientY - (r.top + 60); const d = Math.hypot(dx, dy); if (d > 45) { dx *= 45 / d; dy *= 45 / d; } joy.x = dx / 45; joy.y = dy / 45; perilla.style.left = 35 + dx + 'px'; perilla.style.top = 35 + dy + 'px'; };
  base.addEventListener('pointerdown', e => { e.stopPropagation(); joy.id = e.pointerId; try { base.setPointerCapture(e.pointerId); } catch {} moverJoy(e); });
  base.addEventListener('pointermove', e => { if (e.pointerId === joy.id) { e.stopPropagation(); moverJoy(e); } });
  const soltarJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; perilla.style.left = perilla.style.top = '35px'; };
  base.addEventListener('pointerup', soltarJoy); base.addEventListener('pointercancel', soltarJoy);

  // fundido para VR (subir/bajar sin movimiento forzado)
  const fundido = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false }));
  fundido.position.z = -0.1; fundido.renderOrder = 99; camara.add(fundido);

  const enVR = () => renderer.xr.isPresenting;
  function aMundo(pCabina, out) { cabina.updateWorldMatrix(true, false); return cabina.localToWorld(out.copy(pCabina)); }
  function ponerJugadorEnElPiso(pCabinaPies, mirarA) {
    escena.attach(jugador); aMundo(pCabinaPies, tmp); tmp.y = terreno(tmp.x, tmp.z);
    jugador.position.copy(tmp); jugador.quaternion.identity();
    aMundo(mirarA, tmp2); const yaw = Math.atan2(-(tmp2.x - tmp.x), -(tmp2.z - tmp.z)); jugador.rotation.set(0, yaw, 0);
    camara.position.set(0, enVR() ? 0 : ALTURA_OJOS, 0); if (enVR()) jugador.position.y += estado.alturaXR;
  }
  function ponerJugadorEnElAsiento() {
    avion.attach(jugador); jugador.position.copy(ojoCabina()); jugador.rotation.set(0, -Math.PI / 2, 0); camara.position.set(0, 0, 0);
  }

  function bajar(conAnimacion = true) {
    if (estado.modo !== 'cabina' || estado.anim) return;
    if (enVR() || !conAnimacion) { estado.anim = { tipo: 'fundido', t: 0, dur: 0.9, accion: () => { ponerJugadorEnElPiso(PIE_BAJADA, new THREE.Vector3(-0.7, 0, 1.3)); estado.modo = 'pie'; } }; return; }
    const pts = [...RECORRIDO_SUBIDA].reverse(); pts.unshift(new THREE.Vector3().copy(ojoCabinaCabina())); pts.push(new THREE.Vector3(PIE_BAJADA.x, PISO + ALTURA_OJOS, PIE_BAJADA.z));
    estado.anim = { tipo: 'camino', t: 0, dur: 3.2, curva: new THREE.CatmullRomCurve3(pts), fin: () => { ponerJugadorEnElPiso(PIE_BAJADA, new THREE.Vector3(-0.7, 0, 1.3)); estado.modo = 'pie'; } };
    escena.attach(jugador); jugador.quaternion.identity(); camara.position.set(0, 0, 0);
  }
  function subir() {
    if (estado.modo !== 'pie' || estado.anim) return;
    if (enVR()) { estado.anim = { tipo: 'fundido', t: 0, dur: 0.9, accion: () => { ponerJugadorEnElAsiento(); estado.modo = 'cabina'; alPedirSubir?.('vr'); } }; return; }
    jugador.getWorldPosition(tmp); const desde = cabina.worldToLocal(tmp.clone()); desde.y = PISO + ALTURA_OJOS;
    const pts = [desde, ...RECORRIDO_SUBIDA, ojoCabinaCabina()];
    escena.attach(jugador); jugador.quaternion.identity(); camara.position.set(0, 0, 0);
    estado.anim = { tipo: 'camino', t: 0, dur: 3.4, curva: new THREE.CatmullRomCurve3(pts), fin: () => { ponerJugadorEnElAsiento(); estado.modo = 'cabina'; alPedirSubir?.('pc'); } };
  }
  function ojoCabinaCabina() { return cabina.worldToLocal(avion.localToWorld(ojoCabina().clone())); }

  // colisión simple con el fuselaje y la hélice (marco de la cabina)
  function empujarFuera(p) {
    const l = cabina.worldToLocal(p.clone());
    const dentroFus = Math.abs(l.x) < 0.85 && l.z > -4.1 && l.z < 6.9;
    const dentroHelice = l.z < -3.2 && l.z > -4.4 && Math.abs(l.x) < 1.6;
    if (dentroFus || dentroHelice) { const lim = dentroHelice ? 1.6 : 0.85; l.x = l.x < 0 ? -lim : lim; cabina.localToWorld(l); p.x = l.x; p.z = l.z; }
  }

  function mover(dt, ejeX, ejeY, giroVR) {
    if (giroVR) {   // giro por saltos de 30° alrededor de la cabeza
      camara.getWorldPosition(tmp); jugador.rotation.y += giroVR * Math.PI / 6;
      camara.getWorldPosition(tmp2); jugador.position.add(tmp.sub(tmp2)).setY(jugador.position.y);
    }
    if (!ejeX && !ejeY) return;
    camara.getWorldDirection(tmp); tmp.y = 0; tmp.normalize();
    const der = tmp2.set(-tmp.z, 0, tmp.x);
    const v = 1.5 * dt; jugador.position.addScaledVector(tmp, -ejeY * v).addScaledVector(der, ejeX * v);
    empujarFuera(jugador.position); jugador.position.y = terreno(jugador.position.x, jugador.position.z);
  }

  return {
    get modo() { return estado.modo; }, get animando() { return !!estado.anim; }, cartel, bajar, subir,
    get cerca() { return estado.cerca; }, set alturaXR(v) { estado.alturaXR = v; },
    /* teclas: objeto de teclas apretadas (PC); joysticks: { mover: [x, y], girar: -1|0|1 } en VR */
    actualizar(dt, teclas, joysticksVR) {
      base.style.display = estado.modo === 'pie' && tactil && !enVR() ? 'block' : 'none';
      cartel.visible = estado.modo === 'pie' && !estado.anim;
      if (estado.anim) {
        const a = estado.anim; a.t += dt;
        if (a.tipo === 'fundido') {
          const k = a.t / a.dur; fundido.material.opacity = k < 0.5 ? k * 2 : Math.max(0, 2 - k * 2);
          if (!a.hecho && k >= 0.5) { a.hecho = true; a.accion(); }
          if (k >= 1) { fundido.material.opacity = 0; estado.anim = null; }
        } else {
          const k = Math.min(1, a.t / a.dur), s = k * k * (3 - 2 * k);
          cabina.localToWorld(a.curva.getPointAt(s, tmp)); jugador.position.copy(tmp);
          if (k >= 1) { estado.anim = null; a.fin(); }
        }
        return;
      }
      if (estado.modo !== 'pie') return;
      let x = 0, y = 0, giro = 0;
      if (enVR()) { if (joysticksVR) { [x, y] = joysticksVR.mover; giro = joysticksVR.girar; } }
      else {
        x = (teclas.d || teclas.arrowright ? 1 : 0) - (teclas.a || teclas.arrowleft ? 1 : 0);
        y = (teclas.s || teclas.arrowdown ? 1 : 0) - (teclas.w || teclas.arrowup ? 1 : 0);
        if (joy.id != null) { x = joy.x; y = joy.y; }
      }
      mover(dt, x, y, giro); jugador.position.y = terreno(jugador.position.x, jugador.position.z) + (enVR() ? estado.alturaXR : 0);
      camara.getWorldPosition(tmp); const l = cabina.worldToLocal(tmp);   /* la cabeza / el teléfono: en VR y en modo cámara uno camina de verdad */
      estado.cerca = Math.hypot(l.x - ESTRIBO.x, l.z - ESTRIBO.z) < 1.4 * jugador.scale.x;   /* a escala de maqueta, el radio crece con el jugador */
      cartel.material.color.setHex(estado.cerca ? 0xffffff : 0x9a9a9a);
    },
  };
}
