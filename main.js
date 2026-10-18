// Cabina del AT-802 en VR (AURAV). Modelo: interior del Fire Boss freeware de FSX (Flight Sim Nation),
// convertido con herramientas/mdl2glb.py. Entorno: el aeródromo de AURAV (escenario.js de «Control del sector»).
// Vuelo: vuelo.js (modelo simplificado). Instrumentos vivos: instrumentos.js. Controles: controles.js.
// Uso interno de prueba.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { mergeGeometries } from './BufferGeometryUtils.js';
import { crearEscenario } from './escenario.js?v=20261017a';
import { crearRadios } from './radios.js?v=20261017a';
import { Controles } from './controles.js?v=20261018a';
import { Instrumentos } from './instrumentos.js?v=20261017a';
import { Vuelo, MPH, FT } from './vuelo.js?v=20261017a';
import { Mision } from './mision.js?v=20261018c';
import { Audio } from './audio.js?v=20261017a';
import { crearPanelVR } from './panelvr.js?v=20261017a';

const OJO = new THREE.Vector3(0, 1.15, 1.6);   // vista del piloto en el marco del modelo (adelante = −z)
const ALTURA_OJO = 2.7;                         // metros sobre la pista con el tren en el piso
const V = '20261017a';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true; document.body.appendChild(renderer.domElement);

const escena = new THREE.Scene();
THREE.ShaderChunk.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = length( mvPosition.xyz );\n#endif';   // niebla por distancia (Quest)
const ambiente = crearEscenario(escena);

// Jerarquía: avion (cuerpo que vuela, +x adelante) → cabina (el GLB mira a −z: se gira 90°, tren en el piso) + jugador (cámara)
const vuelo = new Vuelo(); window.__vuelo = vuelo; vuelo.suelo = (x, z) => ambiente.alturaTerreno(x, z);
const avion = new THREE.Group(); escena.add(avion);
const cabina = new THREE.Group(); cabina.rotation.y = -Math.PI / 2; cabina.position.y = ALTURA_OJO - OJO.y; avion.add(cabina);
const jugador = new THREE.Group(); avion.add(jugador);
const camara = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.02, 3000); camara.rotation.order = 'YXZ';
const OJO_AVION = cabina.localToWorld(OJO.clone()); avion.worldToLocal(OJO_AVION);
jugador.add(camara); jugador.position.copy(OJO_AVION); jugador.rotation.y = -Math.PI / 2;
// posición inicial: alineado en la cabecera de la pista 36 (la pista corre por x = 30 hacia −z), mirando a −z
vuelo.pos.set(30, 0, 100); vuelo.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

let instrumentos = null;
/* saca de las mallas los triángulos cuyo centro cae en la caja (sin caja: la malla entera) y los junta en una malla nueva con el material de la primera */
function recortarManija(raiz, piezas) {
  const geos = [], mats = []; const p = new THREE.Vector3(), c = new THREE.Vector3();
  for (const [nombre, min, max] of piezas) {
    let m = null; raiz.traverse(o => { if (o.isMesh && o.name === nombre) m = o; }); if (!m) continue;
    if (!min) { geos.push(m.geometry.index ? m.geometry.toNonIndexed() : m.geometry); mats.push(m.material); m.removeFromParent(); continue; }
    const g = m.geometry, pos = g.attributes.position, idx = g.index, caja = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));
    const dentro = [], fuera = []; const T = idx ? idx.count / 3 : pos.count / 3; const vi = (t, k) => idx ? idx.getX(3 * t + k) : 3 * t + k;
    for (let t = 0; t < T; t++) { c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.add(p.fromBufferAttribute(pos, vi(t, k))); c.multiplyScalar(1 / 3); (caja.containsPoint(c) ? dentro : fuera).push(vi(t, 0), vi(t, 1), vi(t, 2)); }
    if (!dentro.length) continue;
    const sub = g.clone(); sub.setIndex(dentro); geos.push(sub.toNonIndexed()); g.setIndex(fuera); mats.push(m.material);
  }
  if (!geos.length) return null;
  const comunes = ['position', 'normal', 'uv'].filter(k => geos.every(x => x.attributes[k]));
  for (const x of geos) for (const k of Object.keys(x.attributes)) if (!comunes.includes(k)) x.deleteAttribute(k);
  return new THREE.Mesh(mergeGeometries(geos, true), mats);   /* un grupo por pieza, cada una con su material */
}
Promise.all([new GLTFLoader().loadAsync(`./cabina.glb?v=${V}`), fetch(`./instrumentos.json?v=${V}`).then(r => r.json())]).then(([g, datosInst]) => {
  g.scene.traverse(o => {
    if (o.name === 'm13') o.visible = false;   /* GPS: flotaba delante del panel; oculto hasta tener la foto real */
    if (o.isMesh && (o.name === 'm14' || o.name === 'm15')) { o.material.color.set(0xe6e6df); o.material.roughness = 0.55; }   /* exterior blanco */
  });
  // manija roja de largado de emergencia (el modelo no la trae): a la izquierda del asiento, se tira hacia atrás
  const gm = mergeGeometries([new THREE.BoxGeometry(0.03, 0.16, 0.03).translate(-0.33, 0.56, 1.12), new THREE.SphereGeometry(0.028, 14, 10).translate(-0.33, 0.645, 1.12)]);
  const manija = new THREE.Mesh(gm, new THREE.MeshStandardMaterial({ color: 0xd42020, roughness: 0.5 })); manija.name = 'levDUMP'; g.scene.add(manija);
  cabina.add(g.scene);
  // manijas reales del cuadrante: vienen fundidas en mallas grandes; se recortan por caja (marco de la cabina) y pasan a ser palancas.
  // Las lev75/77/42 de la conversión eran varillitas del mecanismo, no las manijas: quedan fijas.
  g.scene.traverse(o => { if (o.isMesh) o.name = o.name.replace(/^lev(75|77|42)$/, 'varilla$1'); });
  const MANIJAS = [
    { nombre: 'levPOT', pivY: 0.55, escala: 0.5, piezas: [['m16', [-0.48, 0.67, 1.23], [-0.43, 0.85, 1.37]]] },                                   /* POWER blanca */
    { nombre: 'levHEL', pivY: 0.19, escala: 0.25, piezas: [['m16', [-0.37, 0.70, 1.27], [-0.31, 0.76, 1.33]], ['m23', [-0.39, 0.18, 1.21], [-0.33, 0.79, 1.31]]] },   /* perilla azul + varilla amarilla */
    { nombre: 'levCOND', pivY: 0.63, escala: 0.6, piezas: [['m2'], ['m6']] },                                                                     /* perilla gris (a confirmar) */
  ];
  for (const mj of MANIJAS) { const m = recortarManija(g.scene, mj.piezas); if (!m) continue; m.name = mj.nombre; m.userData.pivY = mj.pivY; m.userData.escala = mj.escala; g.scene.add(m); }
  const partes = []; g.scene.traverse(o => { if (o.isMesh && o.name.startsWith('palanca_')) partes.push(o); });
  for (const o of partes) { o.position.sub(PIVOTE); palanca.add(o); }
  controles.armar(g.scene);
  const pd = controles.palancas.find(p => p.nombre === 'levDUMP'); if (pd) { pd.min = -0.05; pd.max = 0.9; }
  instrumentos = new Instrumentos(cabina, datosInst);
  document.getElementById('cargando').remove();
  mision.menu();
});

// ---- controles de cabina → modelo de vuelo ----
const controles = new Controles(cabina); window.__controles = controles;
const SW = { BATT: 'sw62', ALTN: 'sw64', GEN: 'sw56', IGNTR: 'sw53', START: 'sw47', FIRE: 'sw60', FPUMP: 'swFPUMP', HYD: 'sw54', AVNC: 'sw63', PITOT: 'sw50', HOPR: 'swHOPR', FRDS: 'swFRDS', WIPER: 'swWIPER', LDG: 'sw52', DOME: 'sw49', BCN: 'sw61', NAV: 'sw51', STRB: 'sw48', SPARE: 'sw38' };
const levAng = n => { const p = controles.palancas.find(x => x.nombre === n); return p ? p.ang : 0; };
const adelante = n => THREE.MathUtils.clamp(-levAng(n) / 0.9, 0, 1);   // palancas: adelante = ángulo negativo
function aplicarControles() {
  const m = vuelo.motor, c = vuelo.mando;
  m.bateria = !!controles.estado(SW.BATT); m.generador = !!(controles.estado(SW.GEN) || controles.estado(SW.ALTN));
  m.ignicion = !!controles.estado(SW.IGNTR); m.arrancador = !!controles.estado(SW.START) && m.bateria; m.bombaCombustible = !!controles.estado(SW.FPUMP);
  m.extintor = !!controles.estado(SW.FIRE);
  c.potencia = adelante('levPOT'); c.helice = adelante('levHEL'); c.condicion = adelante('levCOND');
  c.cabeceo = mando.x / LIMITE; c.alabeo = -mando.z / LIMITE;

  c.pedal = pedal; c.frenos = frenos; c.flaps = flaps;
  if (levAng('levDUMP') > 0.6 && vuelo.largando == null) { vuelo.largarCarga(true); vuelo.evento('largado'); }
  // el arrancador vuelve solo cuando el motor enciende (en el avión es con resorte)
  if (m.encendido && controles.estado(SW.START)) { const s = controles.switches.find(x => x.nombre === SW.START); if (s) { s.estado = false; controles._aplicarSwitch(s); } }
}
let pedal = 0, frenos = 0, flaps = 0;
controles.alCambiar = (nombre, valor) => { console.log('control', nombre, valor); };

// ---- bastón de mando ----
const PIVOTE = new THREE.Vector3(0.004, 0.22, 0.969);          // base del bastón (marco del modelo)
const INCL_NEUTRA = -0.25;                                      // el modelo lo trae inclinado a la izquierda: se endereza
const palanca = new THREE.Group(); palanca.position.copy(PIVOTE); palanca.rotation.order = 'ZXY'; palanca.rotation.z = INCL_NEUTRA; cabina.add(palanca);
const PUNIO = new THREE.Vector3(0, 0.6, 0);
const LIMITE = 0.3;
let mando = { agarre: null, x: 0, z: 0 };
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function actualizarPalanca(dt) {
  if (mando.agarre) {
    cabina.worldToLocal(mando.agarre.getWorldPosition(tmp)); tmp.sub(PIVOTE);
    mando.x = THREE.MathUtils.clamp(Math.atan2(tmp.z, tmp.y), -LIMITE, LIMITE);
    mando.z = THREE.MathUtils.clamp(-Math.atan2(tmp.x, tmp.y), -LIMITE, LIMITE);
  } else { const k = Math.min(1, dt * 6); mando.x += (0 - mando.x) * k; mando.z += (0 - mando.z) * k; }
  palanca.rotation.x = mando.x; palanca.rotation.z = INCL_NEUTRA + mando.z;
}
// ---- manos VR ----
const manos = [];
for (const i of [0, 1]) {
  const c = renderer.xr.getController(i); jugador.add(c);
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf2c200 })); c.add(esfera); manos.push(c);
  c.userData.apretado = 0;
  const rayo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xc8e63a })); rayo.visible = false; c.add(rayo); c.userData.rayo = rayo;
  const agarrar = () => {
    c.userData.apretado++;
    if (panelVR.visible) { panelVR.gatillo(c); return; }
    if (controles.manoVR(c, true, true)) return;
    palanca.localToWorld(tmp.copy(PUNIO)); c.getWorldPosition(tmp2); if (tmp.distanceTo(tmp2) < 0.25) mando.agarre = c;
  };
  const soltar = () => { c.userData.apretado = Math.max(0, c.userData.apretado - 1); if (!c.userData.apretado && mando.agarre === c) mando.agarre = null; };
  c.addEventListener('selectstart', agarrar); c.addEventListener('squeezestart', agarrar);
  c.addEventListener('selectend', soltar); c.addEventListener('squeezeend', soltar);
  c.addEventListener('connected', e => { c.userData.mano = e.data.handedness; });
}
// joysticks: izquierdo X = pedales, izquierdo atrás = frenos; derecho arriba/abajo = flaps; botón joystick o A/X = recentrar
let flapsPrevio = 0;
function leerJoysticks() {
  const ses = renderer.xr.getSession(); if (!ses) return; let boton = false; pedal = 0; frenos = 0;
  for (const src of ses.inputSources) {
    const gp = src.gamepad; if (!gp) continue;
    if (gp.buttons[3]?.pressed || gp.buttons[4]?.pressed) boton = true;
    const x = gp.axes[2] || 0, y = gp.axes[3] || 0;
    if (src.handedness === 'left') { pedal = Math.abs(x) > 0.15 ? x : 0; frenos = y > 0.5 ? (y - 0.5) * 2 : 0; }
    if (src.handedness === 'right') { if (y > 0.7 && flapsPrevio <= 0.7) flaps = Math.min(1, flaps + 0.5); if (y < -0.7 && flapsPrevio >= -0.7) flaps = Math.max(0, flaps - 0.5); flapsPrevio = y; }
  }
  if (boton && !botonPrevio) recentrarPendiente = 1; botonPrevio = boton;
}
// ---- teclado (PC): flechas bastón, A/D pedales, B frenos, F flaps, E largado ----
const teclas = {}; addEventListener('keydown', e => { teclas[e.key.toLowerCase()] = true; if (e.key === 'f') flaps = flaps >= 1 ? 0 : flaps + 0.5; if (e.key === 'e') { vuelo.largarCarga(true); vuelo.evento('largado'); } });
addEventListener('keyup', e => teclas[e.key.toLowerCase()] = false);
addEventListener('keydown', e => { if (e.key === 'Escape') mision.menu(); });
const teclado = new THREE.Object3D(); cabina.add(teclado);
function actualizarTeclado() {
  const ax = (teclas.arrowdown ? 1 : 0) - (teclas.arrowup ? 1 : 0), az = (teclas.arrowright ? 1 : 0) - (teclas.arrowleft ? 1 : 0);
  if (ax || az) { teclado.position.set(PIVOTE.x + Math.sin(az * LIMITE) * 0.6, PIVOTE.y + 0.55, PIVOTE.z + Math.sin(ax * LIMITE) * 0.6); mando.agarre = teclado; }
  else if (mando.agarre === teclado) mando.agarre = null;
  if (!renderer.xr.isPresenting) { pedal = (teclas.d ? 1 : 0) - (teclas.a ? 1 : 0); frenos = teclas.b ? 1 : 0; }
}
const radios = crearRadios(); radios.position.set(0.57, 0.86, 0.97); radios.rotation.set(0.08, -0.42, 0); radios.scale.setScalar(1.2); cabina.add(radios);

// ---- cámara PC ----
let yaw = 0, pitch = -0.15, arr = null, arrIni = null;
addEventListener('pointerdown', e => { arr = [e.clientX, e.clientY]; arrIni = [e.clientX, e.clientY]; });
addEventListener('pointerup', e => {
  arr = null;
  if (arrIni && Math.hypot(e.clientX - arrIni[0], e.clientY - arrIni[1]) < 4) { const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camara); controles.clic(r); }
});
addEventListener('pointermove', e => { if (!arr) return; yaw += (e.clientX - arr[0]) * 0.004; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - arr[1]) * 0.004, -1.4, 1.4); arr = [e.clientX, e.clientY]; });
addEventListener('resize', () => { camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---- VR ----
const bVR = document.getElementById('vr');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { bVR.hidden = !ok; });
bVR.onclick = async () => {
  const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
  renderer.xr.setReferenceSpaceType('local-floor'); await renderer.xr.setSession(s);
  recentrarPendiente = 72;   /* recentra a los 12 y a los 72 cuadros */
  setTimeout(() => { if (!$('panel').hidden && ui._ultimo) panelVR.mostrar(ui._ultimo[0], ui._ultimo[1], renderer.xr.getCamera()); }, 800);
  s.addEventListener('end', () => jugador.position.copy(OJO_AVION));
};
let recentrarPendiente = 0, botonPrevio = false;
const cabezaW = new THREE.Vector3(), ojoW = new THREE.Vector3();
function recentrar() {   // lleva el casco al ojo del piloto (en el marco del avión)
  camara.getWorldPosition(cabezaW); avion.localToWorld(ojoW.copy(OJO_AVION));   /* la cámara XR interna no cuelga de la escena: usar la nuestra */
  tmp.copy(ojoW).sub(cabezaW).applyQuaternion(avion.getWorldQuaternion(new THREE.Quaternion()).invert()); jugador.position.add(tmp);
}

// luz ENG FIRE (anunciador del panel) y humo del capot
const luzFuego = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); luzFuego.position.set(-0.091, 1.161, 0.887); luzFuego.visible = false; cabina.add(luzFuego);
const humoTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(40,40,40,0.9)'); gr.addColorStop(1, 'rgba(40,40,40,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
const humos = []; for (let i = 0; i < 24; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: humoTex, transparent: true, depthWrite: false, opacity: 0 })); sp.userData.t = i / 24; escena.add(sp); humos.push(sp); }
function actualizarHumo(dt) {
  const on = vuelo.motor.fuego; const nariz = avion.localToWorld(new THREE.Vector3(2.8, 1.6, 0.4));
  for (const sp of humos) { sp.userData.t += dt * 0.5; if (sp.userData.t > 1) { sp.userData.t = 0; sp.position.copy(nariz); sp.userData.v = new THREE.Vector3(0, 1.5, 0).add(vuelo.vel.clone().multiplyScalar(0.15)); }
    const t = sp.userData.t; if (sp.userData.v) sp.position.addScaledVector(sp.userData.v, dt); sp.position.y += dt * 2; const k = 1.5 + t * 6; sp.scale.set(k, k, 1); sp.material.opacity = on ? 0.7 * (1 - t) : 0; }
}
// ---- UI (PC + VR) ----
const audio = new Audio(); const panelVR = crearPanelVR(); escena.add(panelVR.malla);
const $ = id => document.getElementById(id);
const ui = {
  tutor(titulo, texto) { $('tutor').hidden = !texto; $('tutor-titulo').textContent = titulo || ''; $('tutor-texto').textContent = texto || ''; hudVR.texto(titulo, texto); },
  cartel(texto) { $('fase').textContent = texto || ''; },
  tareas(lista) { const ul = $('tareas'); ul.innerHTML = ''; ul.hidden = !lista.length; for (const t of lista) { const li = document.createElement('li'); li.textContent = t.texto; if (t.ok) li.className = 'ok'; if (t.actual) li.className = 'actual'; ul.appendChild(li); } },
  panel(datos, cb) {
    $('panel-titulo').textContent = datos.titulo; $('panel-texto').textContent = datos.texto; const bs = $('panel-botones'); bs.innerHTML = '';
    for (const b of datos.botones) { const el = document.createElement('button'); el.textContent = b.texto; el.onclick = () => { audio.iniciar(); cb(b.id); }; bs.appendChild(el); }
    $('panel').hidden = false; ui._ultimo = [datos, cb]; if (renderer.xr.isPresenting) panelVR.mostrar(datos, cb, renderer.xr.getCamera()); else panelVR.ocultar();
  },
  ocultarPanel() { $('panel').hidden = true; panelVR.ocultar(); },
  decir(t) { audio.decir(t); },
  marcar(nombre) { marca.objetivo = nombre ? (controles.palancas.find(p => p.nombre === nombre) || controles.switches.find(s => s.nombre === nombre) || null) : null; },
};
// marcador del control que pide el paso actual: aro amarillo que titila + flecha, visible a través de todo
const marca = (() => {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, depthTest: false });
  const g = new THREE.Group(); g.renderOrder = 10; g.visible = false; escena.add(g);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 32), mat); aro.renderOrder = 10; g.add(aro);
  const flecha = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 12), mat); flecha.rotation.x = Math.PI; flecha.position.y = 0.075; flecha.renderOrder = 10; g.add(flecha);
  return { g, aro, flecha, mat, objetivo: null, t: 0 };
})();
function actualizarMarca(dt) {
  const o = marca.objetivo; marca.g.visible = !!o; if (!o) return;
  if (o.alto != null) controles._puntaPalanca(o, marca.g.position); else controles._puntaSwitch(o, marca.g.position);
  marca.t += dt; const k = 1 + 0.25 * Math.sin(marca.t * 6); marca.aro.scale.setScalar(k); marca.flecha.position.y = 0.075 + 0.012 * Math.sin(marca.t * 6);
  marca.mat.opacity = 0.55 + 0.45 * Math.abs(Math.sin(marca.t * 3));
  camara.getWorldPosition(tmp); marca.aro.lookAt(tmp);   /* el aro siempre de frente al piloto; la flecha apunta hacia abajo en el mundo */
  marca.g.quaternion.identity();
}
// texto flotante en VR (tutor): tablilla a la derecha del panel, fija a la cabina
const hudVR = (() => {
  const W = 768, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })); m.renderOrder = 9; m.position.set(0.32, 1.34, 0.78); m.rotation.set(-0.15, -0.25, 0); cabina.add(m);
  return { texto(titulo, texto) { c.clearRect(0, 0, W, H); if (!texto) { tex.needsUpdate = true; return; } c.fillStyle = 'rgba(8,36,64,0.85)'; c.beginPath(); c.roundRect(0, 0, W, H, 28); c.fill(); c.fillStyle = '#c8e63a'; c.font = 'bold 30px Arial'; c.fillText(titulo || '', 28, 48);
    c.fillStyle = '#fff'; c.font = '34px Arial'; let y = 100, l = ''; for (const p of texto.split(' ')) { const t = l ? l + ' ' + p : p; if (c.measureText(t).width > W - 56) { c.fillText(l, 28, y); y += 42; l = p; } else l = t; } c.fillText(l, 28, y); tex.needsUpdate = true; } };
})();
function reiniciarAvion({ enPista = false, enVuelo = false, agua = 2400, apagado = false } = {}) {
  const v = vuelo; v.vel.set(0, 0, 0); v.w.set(0, 0, 0); v.agua = agua; v.largando = null; v.estrellado = false; v.perdida = false; v.avisoVne = false; v.tiempoFuego = 0; v.eventos = [];
  Object.assign(v.motor, { falla: false, fuego: false, sinRearranque: false, cortado: false, extintor: false });
  mando.x = mando.z = 0; flaps = 0;
  const pon = (n, ang) => { const p = controles.palancas.find(x => x.nombre === n); if (p) { p.ang = ang; p._aplicar?.(); p.grupo.rotation.x = ang; } };
  const sw = (n, est) => { const s = controles.switches.find(x => x.nombre === SW[n]); if (s && s.estado !== est) { s.estado = est; controles._aplicarSwitch(s); } };
  if (enVuelo) {
    v.pos.set(30, 305, -300); v.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); v.vel.set(0, 0, -67); v.enTierra = false; v.tiempoAire = 10;
    Object.assign(v.motor, { encendido: true, ng: 92, torque: 80, itt: 720, rpmHel: 1700, bateria: true, generador: true });
    for (const n of ['BATT', 'GEN', 'AVNC', 'FPUMP']) sw(n, true); for (const n of ['IGNTR', 'START', 'FIRE']) sw(n, false);
    pon('levPOT', -0.72); pon('levHEL', -0.88); pon('levCOND', -0.88); pon('levDUMP', 0);
  } else {
    v.pos.set(30, 0, 100); v.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); v.enTierra = true;
    if (apagado) { Object.assign(v.motor, { encendido: false, ng: 0, torque: 0, itt: 15, rpmHel: 0, bateria: false, generador: false }); for (const n of ['BATT', 'GEN', 'ALTN', 'AVNC', 'FPUMP', 'IGNTR', 'START', 'FIRE']) sw(n, false); pon('levPOT', 0.1); pon('levHEL', 0.1); pon('levCOND', 0.1); pon('levDUMP', 0); }
    else { Object.assign(v.motor, { encendido: true, ng: 62, torque: 5, itt: 480, rpmHel: 1100, bateria: true, generador: true }); for (const n of ['BATT', 'GEN', 'AVNC', 'FPUMP']) sw(n, true); for (const n of ['IGNTR', 'START', 'FIRE']) sw(n, false); pon('levPOT', 0.1); pon('levHEL', -0.88); pon('levCOND', -0.88); pon('levDUMP', 0); }
  }
  avion.position.copy(v.pos); avion.quaternion.copy(v.q);
}
const mision = new Mision({ vuelo, controles, SW, ui, obtener: { terreno: (x, z) => ambiente.alturaTerreno(x, z) }, reiniciarAvion }); window.__mision = mision;
$('menu').onclick = () => { audio.iniciar(); mision.menu(); };
$('voz').onclick = () => { audio.vozOn = !audio.vozOn; $('voz').textContent = 'Voz: ' + (audio.vozOn ? 'sí' : 'no'); };
addEventListener('pointerdown', () => audio.iniciar(), { once: true });

// ---- HUD de prueba (PC) ----
const hud = document.getElementById('hud');
vuelo.alEvento = (tipo, d) => { console.log('evento', tipo, JSON.stringify(d)); mision.evento(tipo, d); if (tipo === 'accidente' || tipo === 'contacto') audio.golpe(); };

const relojT = new THREE.Clock(); let acumSim = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(relojT.getDelta(), 0.1); ambiente.actualizar(dt);
  actualizarTeclado(); actualizarPalanca(dt);
  if (renderer.xr.isPresenting) { leerJoysticks(); for (const c of manos) controles.manoVR(c, c.userData.apretado > 0, false); }
  controles.actualizar(); aplicarControles();
  // física a paso fijo
  const vel = window.__vel || 1; acumSim += dt * vel; const h = 1 / 120; let n = 0;
  while (acumSim >= h && n < 400) {
    if (window.__auto) {   /* piloto automático de prueba (headless): mantiene cabeceo y alabeo pedidos en grados */
      const e = vuelo.euler, a = window.__auto, c = vuelo.mando;
      if (a.cabeceo != null) c.cabeceo = THREE.MathUtils.clamp((THREE.MathUtils.degToRad(a.cabeceo) - e.cabeceo) * 6 - vuelo.w.z * 2, -1, 1);
      if (a.alabeo != null) c.alabeo = THREE.MathUtils.clamp((THREE.MathUtils.degToRad(a.alabeo) - e.alabeo) * 3 - vuelo.w.x, -1, 1);
    }
    vuelo.paso(h); acumSim -= h; n++;
  }
  avion.position.copy(vuelo.pos); avion.quaternion.copy(vuelo.q);
  const cielo = escena.getObjectByName('cielo'); if (cielo) cielo.position.set(vuelo.pos.x, 0, vuelo.pos.z);
  if (instrumentos) { instrumentos.fijar(vuelo.lecturas()); instrumentos.actualizar(dt); }
  mision.actualizar(dt * vel); luzFuego.visible = vuelo.motor.fuego && Math.floor(performance.now() / 400) % 2 === 0; actualizarHumo(dt); actualizarMarca(dt);
  audio.actualizar(dt, { ng: vuelo.motor.ng, rpm: vuelo.motor.rpmHel, fuego: vuelo.motor.fuego, bocina: vuelo.perdida });
  for (const c of manos) { const d = panelVR.visible ? panelVR.apuntar(c) : null; c.userData.rayo.visible = d != null; if (d != null) c.userData.rayo.scale.z = d; }
  if (hud && !renderer.xr.isPresenting) { const L = vuelo.lecturas(), m = vuelo.motor; hud.textContent = `${L.asi.toFixed(0)} mph · ${L.alt.toFixed(0)} ft · ${L.vsi.toFixed(0)} fpm · TRQ ${m.torque.toFixed(0)}% · ITT ${m.itt.toFixed(0)} · Ng ${m.ng.toFixed(0)} · hél ${m.rpmHel.toFixed(0)} · flaps ${flaps * 20}° · agua ${vuelo.agua.toFixed(0)} kg${vuelo.perdida ? ' · PÉRDIDA' : ''}${vuelo.estrellado ? ' · ACCIDENTE' : ''}`; }
  if (renderer.xr.isPresenting) { if (recentrarPendiente > 0) { recentrarPendiente--; if (recentrarPendiente === 0 || recentrarPendiente === 60) recentrar(); } }
  else camara.rotation.set(pitch, yaw, 0);
  renderer.render(escena, camara);
});
