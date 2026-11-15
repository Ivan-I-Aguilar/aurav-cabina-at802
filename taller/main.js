// Taller de motores del AT-802 en VR (PLAN_TALLER.md). T1 (15/11/2026): la página base en una sala gris, con el motor del
// simulador de turbohélice de escritorio como holograma sobre una mesa provisoria con su proyector y la leyenda fija.
// PC: WASD camina, arrastrar con el mouse mira; teclas del motor en la ayuda (H). VR: joystick izquierdo camina, derecho gira de
// a 30°. ?holo=0 muestra el motor con sus materiales originales (para comparar con el escritorio).
// La lógica de las palancas, el arranque y las fallas es la de live.js del escritorio; las cifras, las de la cabina (motor.js).
import * as THREE from '../three.module.js';
import {buildEngine, STATIONS as CONJUNTOS} from './engine.js?v=20261115a';
import {initState, step, readout, FAULTS, CL_NAMES, FEATHER} from './motor.js?v=20261115a';
import {STATIONS, LEGEND} from './content.js?v=20261115a';
import {crearHolograma, crearProyector, envolverMotor} from './holograma.js?v=20261115a';

export const VERSION = '20261115a';
const PARAM = new URLSearchParams(location.search);
const HOLO = PARAM.get('holo') !== '0';
const PASO = 1 / 120;
const ALTURA_OJOS = 1.6;
const MESA = {ancho: 1.6, fondo: 0.8, alto: 0.9};
const CENTRO_HOLO = new THREE.Vector3(0, 1.27, 0);
const ESCALA_HOLO = 0.35;
const FAULT_KEYS = ['hot', 'hung', 'stall', 'fod', 'overtemp', 'none'];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const suave = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => suave((t - a) / (b - a));

// ------------------------------------------------------------ renderer, escena, jugador
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true; // el plano de corte de engine.js (llama, chorros, partículas; con ?holo=0, todo): el holograma corta en su sombreador
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x2a2e34);
const jugador = new THREE.Group();
jugador.name = 'jugador';
escena.add(jugador);
const camara = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 120);
camara.rotation.order = 'YXZ';
jugador.add(camara);
const INICIO = {pos: new THREE.Vector3(0, 0, 0.95), yaw: 0, pitch: -0.32};
let yaw = INICIO.yaw;
let pitch = INICIO.pitch;
jugador.position.copy(INICIO.pos);
camara.position.set(0, ALTURA_OJOS, 0);

escena.add(new THREE.HemisphereLight(0xdfe7ef, 0x3c4046, 1.15));
const sol = new THREE.DirectionalLight(0xffffff, 1.1);
sol.position.set(2.5, 6, 3.5);
escena.add(sol);

// ------------------------------------------------------------ la sala gris (provisoria hasta el hangar, T4)
function crearSala() {
  const g = new THREE.Group();
  g.name = 'sala-gris';
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#585d64';
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = 'rgba(255,255,255,0.09)';
  c.lineWidth = 3;
  c.strokeRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshLambertMaterial({map: tex}));
  piso.rotation.x = -Math.PI / 2;
  piso.name = 'piso';
  g.add(piso);
  const pared = new THREE.MeshLambertMaterial({color: 0x737981});
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.5), pared);
    const a = (i * Math.PI) / 2;
    p.position.set(Math.sin(a) * -7, 2.25, Math.cos(a) * -7);
    p.rotation.y = a;
    g.add(p);
  }
  return g;
}

/** la leyenda fija, como cartel de mesa vuelto hacia el ojo (en la T3 pasa al canto de la mesa y al pie de cada panel) */
function placaLeyenda(texto, ancho = 1.5) {
  const W = 2048;
  const H = 240;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#16181b';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffcf4a';
  c.fillRect(0, 0, W, 10);
  const [a, ...b] = texto.split('. ');
  const lineas = [`⚠  ${a}.`, b.join('. ')];
  let t = 64;
  c.font = `bold ${t}px Arial`;
  while (Math.max(...lineas.map((l) => c.measureText(l).width)) > W - 90 && t > 20) c.font = `bold ${--t}px Arial`;
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(lineas[0], W / 2, H * 0.36);
  c.fillText(lineas[1], W / 2, H * 0.72);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const alto = (ancho * H) / W;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({map: tex, toneMapped: false}));
  m.name = 'leyenda';
  m.userData.letra = (t / W) * ancho; // alto de la letra en metros
  return m;
}

function crearMesa() {
  const g = new THREE.Group();
  g.name = 'mesa-provisoria';
  const metal = new THREE.MeshStandardMaterial({color: 0x2b3036, roughness: 0.55, metalness: 0.45});
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(MESA.ancho, 0.05, MESA.fondo), new THREE.MeshStandardMaterial({color: 0x1b1e22, roughness: 0.35, metalness: 0.25}));
  tapa.position.y = MESA.alto - 0.025;
  g.add(tapa);
  const faldon = new THREE.Mesh(new THREE.BoxGeometry(MESA.ancho - 0.08, 0.1, MESA.fondo - 0.08), metal);
  faldon.position.y = MESA.alto - 0.1;
  g.add(faldon);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, MESA.alto - 0.05, 0.06), metal);
      p.position.set(sx * (MESA.ancho / 2 - 0.07), (MESA.alto - 0.05) / 2, sz * (MESA.fondo / 2 - 0.07));
      g.add(p);
    }
  // la leyenda: cartel de mesa del lado del alumno, inclinado hacia un ojo de 1,6 m parado a 0,95 m
  const ley = placaLeyenda(LEGEND, 1.1);
  const pos = new THREE.Vector3(0, 0, MESA.fondo / 2 - 0.07);
  const ojo = new THREE.Vector3(0, ALTURA_OJOS, INICIO.pos.z);
  const elev = Math.atan2(ojo.y - MESA.alto, ojo.z - pos.z);
  const alto = ley.geometry.parameters.height;
  pos.y = MESA.alto + 0.004 + (alto / 2) * Math.cos(elev);
  ley.position.copy(pos);
  ley.rotation.x = -elev; // la normal (+z) sube elev grados: mira al ojo
  g.add(ley);
  const atril = new THREE.Mesh(new THREE.BoxGeometry(1.12, alto + 0.012, 0.012), metal);
  atril.position.copy(pos).addScaledVector(new THREE.Vector3(0, Math.sin(elev), Math.cos(elev)), -0.0075);
  atril.rotation.x = -elev;
  g.add(atril);
  return {grupo: g, leyenda: ley};
}

escena.add(crearSala());
const mesa = crearMesa();
escena.add(mesa.grupo);
const proyector = crearProyector({altoCono: CENTRO_HOLO.y - 0.15 - (MESA.alto + 0.031)});
proyector.grupo.position.set(0, MESA.alto, 0);
escena.add(proyector.grupo);

// ------------------------------------------------------------ el motor: holograma (o los materiales originales con ?holo=0)
const eng = buildEngine();
let s = initState(true);
let holo = null;
let motorGrupo;
const planoLocal = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
if (HOLO) {
  holo = crearHolograma(eng, {estado0: initState(true), conjuntos: CONJUNTOS});
  motorGrupo = holo.grupo;
} else {
  motorGrupo = envolverMotor(eng.root).grupo;
  eng.setCut('section');
}
motorGrupo.position.copy(CENTRO_HOLO);
motorGrupo.rotation.y = -Math.PI / 2; // la hélice a la izquierda del alumno y el costado cortado hacia él (como la vista del escritorio)
motorGrupo.scale.setScalar(ESCALA_HOLO);
escena.add(motorGrupo);

// ------------------------------------------------------------ la lógica de live.js: palancas, arranque, fallas, estaciones
const inp = {pla: 0, cl: 1, prop: 1, fault: 'none', start: false};
let autoCL = false;
let estacion = 0;
let desdeEstacion = -9;
let corte = true;
let flujo = 1;
let reloj = 0;
let tFalla = 0;
let ultimaFalla = 'none';
const conservar = () => ({ga: s.ga, pa: s.pa, pr: s.pr, flow: s.flow, t: s.t});
function aRalenti() {
  s = Object.assign(initState(true), conservar());
  Object.assign(inp, {pla: 0, cl: 1, prop: 1, fault: 'none'});
  autoCL = false;
}
function apagar() {
  s = Object.assign(initState(false), conservar());
  Object.assign(inp, {pla: 0, cl: 0});
}
function pulsarArranque() {
  if (s.ng >= 25) return;
  inp.cl = 0;
  inp.pla = 0;
  inp.start = true;
  autoCL = true;
}
function arrancar() {
  if (s.ng >= 25) return;
  if (inp.fault !== 'none' && !FAULTS[inp.fault].start) inp.fault = 'none';
  apagar();
  pulsarArranque();
}
function ponerFalla(k) {
  if (k === 'none') return aRalenti();
  if (FAULTS[k].start) {
    apagar();
    inp.fault = k;
    pulsarArranque();
  } else {
    if (!s.lit) aRalenti();
    inp.fault = k;
    if (k === 'stall') inp.pla = Math.max(inp.pla, 0.4);
  }
}
function ponerEstacion(n) {
  estacion = estacion === n ? 0 : n;
  desdeEstacion = reloj;
}
/** la alerta sale cuando aparece el síntoma (como en la cabina: arranque caliente con ITT > 750; colgado, Ng estancado) */
function alertaVisible() {
  const f = inp.fault;
  if (f === 'none') return false;
  if (f === 'hot') return s.itt > 750;
  if (f === 'hung') return s.lit && reloj - tFalla > 8;
  return true;
}

// ------------------------------------------------------------ teclado y mouse (PC)
const teclas = {};
const AYUDA = 'WASD caminar · arrastrar = mirar · ↑↓ potencia · ←→ hélice · C condición · Enter arrancar · R a ralentí · G falla siguiente · 1–8 estación (0 todas) · K corte · L flujo · H ayuda';
let verAyuda = true;
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  teclas[k] = true;
  if (k === 'c') {
    inp.cl = (inp.cl + 1) % 3;
    autoCL = false;
  } else if (k === 'enter') arrancar();
  else if (k === 'r') aRalenti();
  else if (k === 'g') ponerFalla(FAULT_KEYS[(FAULT_KEYS.indexOf(inp.fault) + 1) % FAULT_KEYS.length]);
  else if (k >= '1' && k <= '8') ponerEstacion(+k);
  else if (k === '0') {
    estacion = 0;
    desdeEstacion = reloj;
  } else if (k === 'k') corte = !corte;
  else if (k === 'l') flujo = flujo ? 0 : 1;
  else if (k === 'h') verAyuda = !verAyuda;
  else return;
  e.preventDefault();
});
addEventListener('keyup', (e) => {
  teclas[e.key.toLowerCase()] = false;
});
let arrastre = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  arrastre = {x: e.clientX, y: e.clientY};
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!arrastre || renderer.xr.isPresenting) return;
  yaw -= (e.clientX - arrastre.x) * 0.0045;
  pitch = clamp(pitch - (e.clientY - arrastre.y) * 0.0045, -1.45, 1.45);
  arrastre = {x: e.clientX, y: e.clientY};
});
const soltar = () => (arrastre = null);
renderer.domElement.addEventListener('pointerup', soltar);
renderer.domElement.addEventListener('pointercancel', soltar);
addEventListener('resize', () => {
  if (renderer.xr.isPresenting) return;
  renderer.setSize(innerWidth, innerHeight);
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
});

/** caminar sin salir de la sala ni meterse en la mesa */
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
function limitar(p) {
  p.x = clamp(p.x, -6.6, 6.6);
  p.z = clamp(p.z, -6.6, 6.6);
  const mx = MESA.ancho / 2 + 0.25;
  const mz = MESA.fondo / 2 + 0.25;
  if (Math.abs(p.x) < mx && Math.abs(p.z) < mz) {
    const dx = mx - Math.abs(p.x);
    const dz = mz - Math.abs(p.z);
    if (dx < dz) p.x = Math.sign(p.x || 1) * mx;
    else p.z = Math.sign(p.z || 1) * mz;
  }
}
function caminar(dt, ejeX, ejeY) {
  if (!ejeX && !ejeY) return;
  camara.getWorldDirection(tmp);
  tmp.y = 0;
  tmp.normalize();
  tmp2.set(-tmp.z, 0, tmp.x);
  jugador.position.addScaledVector(tmp, -ejeY * 1.5 * dt).addScaledVector(tmp2, ejeX * 1.5 * dt);
  limitar(jugador.position);
}

// ------------------------------------------------------------ VR: entrar, joysticks (caminar y girar de a 30°), rayos
const botonVR = document.getElementById('vr');
if (navigator.xr)
  navigator.xr
    .isSessionSupported('immersive-vr')
    .then((ok) => (botonVR.hidden = !ok))
    .catch(() => {});
botonVR.addEventListener('click', async () => {
  if (renderer.xr.isPresenting) return renderer.xr.getSession()?.end();
  const ses = await navigator.xr.requestSession('immersive-vr', {optionalFeatures: ['local-floor']});
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(ses);
});
renderer.xr.addEventListener('sessionstart', () => {
  botonVR.textContent = 'Salir de VR';
  jugador.position.copy(INICIO.pos);
  jugador.rotation.set(0, 0, 0);
});
renderer.xr.addEventListener('sessionend', () => {
  botonVR.textContent = 'Entrar en VR';
  jugador.rotation.set(0, 0, 0);
  camara.position.set(0, ALTURA_OJOS, 0);
});
const manos = [0, 1].map((i) => {
  const c = renderer.xr.getController(i);
  const rayo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({color: 0x9fe3ff, transparent: true, opacity: 0.6}));
  rayo.scale.z = 0.6;
  c.add(rayo);
  jugador.add(c);
  return c;
});
void manos;
let giroArmado = true;
function leerJoysticks(dt) {
  const ses = renderer.xr.getSession();
  if (!ses) return;
  for (const src of ses.inputSources) {
    const gp = src.gamepad;
    if (!gp || gp.axes.length < 2) continue;
    const x = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0];
    const y = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];
    if (src.handedness === 'left') caminar(dt, Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0);
    else if (src.handedness === 'right') {
      if (giroArmado && Math.abs(x) > 0.7) {
        camara.getWorldPosition(tmp);
        jugador.rotation.y -= Math.sign(x) * (Math.PI / 6);
        jugador.updateMatrixWorld(true);
        camara.getWorldPosition(tmp2);
        jugador.position.add(tmp.sub(tmp2)).setY(0);
        giroArmado = false;
      } else if (Math.abs(x) < 0.3) giroArmado = true;
    }
  }
}

// ------------------------------------------------------------ HUD (PC) y leyenda
document.getElementById('leyenda-texto').textContent = LEGEND;
const hud = document.getElementById('hud');
let hudT = 0;
function pintarHUD() {
  const r = readout(s);
  const st = STATIONS.find((x) => x.n === estacion);
  const f = FAULTS[inp.fault];
  const helice = inp.prop < FEATHER ? 'BANDERA' : `${Math.round(inp.prop * 100)} %`;
  hud.innerHTML =
    `<b>TALLER DE MOTORES · AURAV</b> <span style="opacity:.7">v${VERSION} · T1 sala de prueba${HOLO ? '' : ' · materiales originales'}</span><br>` +
    `Ng <b>${r.ng.toFixed(1)}</b> % · ITT <b>${r.itt.toFixed(0)}</b> °C · TORQUE <b>${r.tq.toFixed(0)}</b> % · Np <b>${r.np.toFixed(0)}</b> · FLUJO <b>${r.ff.toFixed(0)}</b> PPH<br>` +
    `POTENCIA ${Math.round(inp.pla * 100)} % · CONDICIÓN ${CL_NAMES[inp.cl]} · HÉLICE ${helice}${s.startOn ? ' · <b>ARRANQUE</b>' : ''}${s.ign ? ' · IGNITORES' : ''}<br>` +
    `FALLA ${f.name} · ${st ? `ESTACIÓN ${st.n} · ${st.name.toUpperCase()}` : 'MOTOR ENTERO'} · ${corte ? 'CORTE' : 'COMPLETO'}${flujo ? ' · FLUJO' : ''}` +
    (st ? `<div style="margin-top:5px">“${st.text}” <span style="opacity:.6">[AGREGADO]</span></div>` : '') +
    (alertaVisible() && f.alert ? `<div class="alerta">${f.alert}<br><span style="font-weight:normal">${f.act} [AGREGADO]</span></div>` : '') +
    (verAyuda ? `<div id="ayuda">${AYUDA}</div>` : '');
}

// ------------------------------------------------------------ el cuadro
let ultimo = performance.now();
let acum = 0;
const camPC = () => {
  camara.rotation.set(pitch, yaw, 0);
};
function avanzar(dt) {
  reloj += dt;
  if (!renderer.xr.isPresenting) {
    const v = 0.6 * dt;
    if (teclas.arrowup) inp.pla = clamp(inp.pla + v, 0, 1);
    if (teclas.arrowdown) inp.pla = clamp(inp.pla - v, 0, 1);
    if (teclas.arrowright) inp.prop = clamp(inp.prop + v, 0, 1);
    if (teclas.arrowleft) inp.prop = clamp(inp.prop - v, 0, 1);
    caminar(dt, (teclas.d ? 1 : 0) - (teclas.a ? 1 : 0), (teclas.s ? 1 : 0) - (teclas.w ? 1 : 0));
    camPC();
  } else leerJoysticks(dt);
  acum = Math.min(acum + dt, 0.25);
  while (acum >= PASO) {
    if (autoCL && s.startOn && s.ng >= 12 && inp.cl === 0) {
      inp.cl = 1;
      autoCL = false;
    }
    step(s, inp, PASO);
    inp.start = false;
    acum -= PASO;
  }
  if (inp.fault !== ultimaFalla) {
    tFalla = reloj;
    ultimaFalla = inp.fault;
  }
  const since = reloj - desdeEstacion;
  const ops = {station: estacion, fade: estacion ? ss(0.4, 1.0, since) : 0, flow: flujo, fault: inp.fault, inp};
  const eje = estacion === 7 ? 'y' : 'x'; // el escape se corta por arriba para que se vean las dos salidas (tour.js)
  eng.setCut(corte ? 'section' : 'solid', eje);
  if (holo) {
    holo.corte(corte, eje);
    holo.update(s, ops, reloj);
  } else eng.update(s, ops);
  // el plano de corte de engine.js es del mundo: se lleva del marco del motor al mundo (el motor está girado y a escala de mesa)
  motorGrupo.updateMatrixWorld(true);
  planoLocal.normal.set(eje === 'y' ? 0 : -1, eje === 'y' ? -1 : 0, 0);
  planoLocal.constant = 0;
  eng.CLIP.copy(planoLocal).applyMatrix4(eng.root.matrixWorld);
  proyector.actualizar(reloj);
  hudT -= dt;
  if (hudT <= 0 && !renderer.xr.isPresenting) {
    hudT = 0.1;
    pintarHUD();
  }
}
renderer.setAnimationLoop(() => {
  const ahora = performance.now();
  const dt = Math.min(0.1, Math.max(0, (ahora - ultimo) / 1000));
  ultimo = ahora;
  avanzar(dt);
  renderer.render(escena, camara);
});

// ------------------------------------------------------------ ganchos de prueba: __taller, __ronda(n), __vista(...)
const RONDA = [
  null,
  {nombre: 'frente (el alumno en la mesa)', pos: [0, ALTURA_OJOS, 0.95], mira: [0, 1.2, 0]},
  {nombre: '3/4 desde la izquierda', pos: [-0.85, 1.55, 0.8], mira: [0, 1.22, 0]},
  {nombre: '3/4 desde la derecha', pos: [0.85, 1.55, 0.8], mira: [0, 1.22, 0]},
  {nombre: 'de cerca', pos: [0, 1.38, 0.5], mira: [0, 1.25, 0]},
  {nombre: 'desde arriba', pos: [0, 2.15, 0.62], mira: [0, 1.15, -0.02]},
  {nombre: 'la sala', pos: [2.6, 1.8, 2.9], mira: [0, 1.0, 0]},
];
function ponerCamara(pos, mira, hfov = 75) {
  jugador.position.set(pos[0], 0, pos[2]);
  jugador.rotation.set(0, 0, 0);
  camara.position.set(0, pos[1], 0);
  const d = new THREE.Vector3(mira[0] - pos[0], mira[1] - pos[1], mira[2] - pos[2]);
  yaw = Math.atan2(-d.x, -d.z);
  pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  camPC();
  const aspecto = renderer.domElement.width / Math.max(1, renderer.domElement.height) || 16 / 9;
  camara.aspect = aspecto;
  camara.fov = (2 * Math.atan(Math.tan((hfov * Math.PI) / 360) / aspecto) * 180) / Math.PI;
  camara.updateProjectionMatrix();
}
function dibujarAhora() {
  avanzar(0);
  if (!renderer.xr.isPresenting) pintarHUD();
  escena.updateMatrixWorld(true);
  renderer.render(escena, camara);
}
window.__renderer = renderer;
window.__ronda = async (n) => {
  if (!n) return RONDA.map((r, i) => (r ? `${i}: ${r.nombre}` : null)).filter(Boolean);
  const r = RONDA[n];
  ponerCamara(r.pos, r.mira, r.hfov ?? 75);
  dibujarAhora();
  await new Promise((ok) => setTimeout(ok, 250));
  dibujarAhora();
  return r.nombre;
};
window.__vista = (x, y, z, yawG = 0, pitchG = 0, hfov = 75) => {
  if (x === undefined) return __ronda(1);
  const yr = (yawG * Math.PI) / 180;
  const pr = (pitchG * Math.PI) / 180;
  ponerCamara([x, y, z], [x - Math.sin(yr) * Math.cos(pr), y + Math.sin(pr), z - Math.cos(yr) * Math.cos(pr)], hfov);
  dibujarAhora();
};
window.__taller = {
  get s() {
    return s;
  },
  inp,
  eng,
  holo,
  proyector,
  mesa,
  escena,
  camara,
  jugador,
  renderer,
  estacion: (n) => {
    estacion = 0;
    if (n) ponerEstacion(n);
    desdeEstacion = reloj - 5;
  },
  falla: ponerFalla,
  arrancar,
  ralenti: aRalenti,
  corte: (v) => (corte = v ?? !corte),
  flujo: (v) => (flujo = v ?? (flujo ? 0 : 1)),
  /** avanza la simulación t segundos de golpe (para las capturas) */
  correr(t, cada = 1 / 60) {
    for (let x = 0; x < t; x += cada) avanzar(cada);
  },
  /** dibuja un cuadro y devuelve lo que costó (llamadas, triángulos, puntos, líneas) y lo que tiene el holograma */
  medir() {
    dibujarAhora();
    const r = renderer.info.render;
    return {llamadas: r.calls, triangulos: r.triangles, puntos: r.points, lineas: r.lines, geometrias: renderer.info.memory.geometries, texturas: renderer.info.memory.textures, holograma: holo ? holo.info() : null, letraLeyendaCm: +(mesa.leyenda.userData.letra * 100).toFixed(2)};
  },
};
