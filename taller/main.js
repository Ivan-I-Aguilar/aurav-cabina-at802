// Taller de motores del AT-802 en VR (PLAN_TALLER.md). T1 (15/11/2026): la página base en una sala gris, con el motor del
// simulador de turbohélice de escritorio como holograma sobre la mesa, su proyector y la leyenda fija. T2 (adelantada en el bloque
// de la T1): la mesa del GLB (herramientas/taller_mesa.py) con el cuadrante de tres palancas como el del AT-802 (potencia, hélice,
// condición), dos botones y tres lámparas; el panel de INSTRUMENTOS y FALLAS; el cartel de la estación y la alerta.
// PC: WASD camina, arrastrar mira; las palancas se arrastran con el mouse; clic en botones y panel; teclas en la ayuda (H).
// VR: joystick izquierdo camina, derecho gira de a 30°; grip cerca de una palanca la agarra; gatillo con el rayo = botón.
// ?holo=0 muestra el motor con sus materiales originales (para comparar con el escritorio).
// La lógica de las palancas, el arranque y las fallas es la de live.js del escritorio; las cifras, las de la cabina (motor.js).
import * as THREE from '../three.module.js';
import {GLTFLoader} from '../GLTFLoader.js';
import {Controles} from '../controles.js?v=20261022e';
import {Audio} from '../audio.js?v=20261112d';
import {crearPanelVR} from '../panelvr.js?v=20261112d';
import {buildEngine, STATIONS as CONJUNTOS} from './engine.js?v=20261115d';
import {initState, step, readout, FAULTS, GAUGES, CL_NAMES, FEATHER} from './motor.js?v=20261115d';
import {STATIONS, LEGEND, QUIZ, ORDER} from './content.js?v=20261115d';
import {crearHolograma, crearProyector, envolverMotor} from './holograma.js?v=20261115d';
import {crearPanelMotor, crearPanelEstaciones, crearPanelPreguntas, crearCartel, crearPlacaCuadrante} from './paneles.js?v=20261115d';
import {crearLlamadas} from './llamadas.js?v=20261115d';
import {DURATION, FAULT_T, RESET_T, inpAt, stationAt, poseHolograma, POSE_BASE} from './recorrido.js?v=20261115d';

export const VERSION = '20261115d';
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
const camara = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 700);
camara.rotation.order = 'YXZ';
jugador.add(camara);
const INICIO = {pos: new THREE.Vector3(0, 0, 0.95), yaw: 0, pitch: -0.32};
let yaw = INICIO.yaw;
let pitch = INICIO.pitch;
jugador.position.copy(INICIO.pos);
camara.position.set(0, ALTURA_OJOS, 0);

// sin sombras ni luces que se muevan: hemisferio + una direccional suave. El «suelo» del hemisferio es claro (el rebote del piso de
// hormigón y las luminarias): con uno oscuro, el techo y los arcos de la nave quedaban negros, y con 0xa3a8ae, gris oscuro (15/11)
const hemisferio = new THREE.HemisphereLight(0xe8eef5, 0xcfd3d8, 1.25);
escena.add(hemisferio);
const sol = new THREE.DirectionalLight(0xffffff, 0.7);
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

/** la leyenda fija, como cartel de mesa vuelto hacia el ojo (en la T3 se suma al canto de la mesa y al pie de cada panel) */
function placaLeyenda(texto, ancho) {
  const W = 2048;
  const H = 400;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#16181b';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffcf4a';
  c.fillRect(0, 0, W, 12);
  const [a, ...b] = texto.split('. ');
  const resto = b.join('. ');
  const corte = resto.indexOf(', el ') > 0 ? resto.indexOf(', el ') + 1 : Math.floor(resto.length / 2);
  const lineas = [`⚠  ${a}.`, resto.slice(0, corte), resto.slice(corte).trim()];
  let t = 96;
  c.font = `bold ${t}px Arial`;
  while (Math.max(...lineas.map((l) => c.measureText(l).width)) > W - 90 && t > 20) c.font = `bold ${--t}px Arial`;
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lineas.forEach((l, i) => c.fillText(l, W / 2, H * (0.3 + i * 0.25)));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const alto = (ancho * H) / W;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({map: tex, toneMapped: false}));
  m.name = 'leyenda';
  m.userData.letra = (t / W) * ancho; // alto de la letra en metros
  return m;
}
/** el cartel de la leyenda sobre el canto izquierdo de la mesa, inclinado hacia un ojo de 1,6 m parado a 0,95 m */
function crearLeyenda() {
  const g = new THREE.Group();
  g.name = 'leyenda-mesa';
  const ley = placaLeyenda(LEGEND, 0.74);
  const pos = new THREE.Vector3(-0.42, 0, MESA.fondo / 2 - 0.08);
  const elev = Math.atan2(ALTURA_OJOS - MESA.alto, INICIO.pos.z - pos.z);
  const alto = ley.geometry.parameters.height;
  pos.y = MESA.alto + 0.004 + (alto / 2) * Math.cos(elev);
  ley.position.copy(pos);
  ley.rotation.x = -elev; // la normal (+z) sube elev grados: mira al ojo
  g.add(ley);
  const atril = new THREE.Mesh(new THREE.BoxGeometry(0.76, alto + 0.012, 0.012), new THREE.MeshStandardMaterial({color: 0x2b3036, roughness: 0.55, metalness: 0.45}));
  atril.position.copy(pos).addScaledVector(new THREE.Vector3(0, Math.sin(elev), Math.cos(elev)), -0.0075);
  atril.rotation.x = -elev;
  g.add(atril);
  return {grupo: g, leyenda: ley};
}
/** la mesa de la T1, por si mesa.glb no carga */
function crearMesaProvisoria() {
  const g = new THREE.Group();
  g.name = 'mesa-provisoria';
  const metal = new THREE.MeshStandardMaterial({color: 0x2b3036, roughness: 0.55, metalness: 0.45});
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(MESA.ancho, 0.05, MESA.fondo), new THREE.MeshStandardMaterial({color: 0x1b1e22, roughness: 0.35, metalness: 0.25}));
  tapa.position.y = MESA.alto - 0.025;
  g.add(tapa);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, MESA.alto - 0.05, 0.06), metal);
      p.position.set(sx * (MESA.ancho / 2 - 0.07), (MESA.alto - 0.05) / 2, sz * (MESA.fondo / 2 - 0.07));
      g.add(p);
    }
  return g;
}

// ------------------------------------------------------------ la nave del hangar (T4: herramientas/taller_hangar.py → hangar.glb)
// En el marco del hangar el portón está en z 0 y el fondo en z −60; se corre +45 m para que el sector del taller (z −45) caiga en la
// mesa (el origen del mundo). El alumno en la mesa mira hacia el fondo: el portón abierto, lo más claro, le queda a la espalda.
const DESPLAZAR_HANGAR = 45;
let hangar = null;
/** la chapa acanalada: bandas claras y oscuras (las coordenadas de textura del GLB están en metros; 5 ondas por metro) */
function texturaAcanalada() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 4;
  const g = c.getContext('2d');
  for (let x = 0; x < 64; x++) {
    const v = Math.round(222 + 33 * Math.sin((x / 64) * Math.PI * 2)); // con 200 ± 55 el techo quedaba gris oscuro (15/11)
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
/** las almas de los arcos, caladas: un agujero redondo por paso (u del GLB = metros de arco / 0,75; v = 0 abajo … 1 arriba) */
function texturaCalada() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(64, 64, 39, 0, Math.PI * 2); // Ø 0,46 m en un alma de 0,74
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
/** el cartel de AURAV en la pared del fondo (la marca del escenario; nada de AAXOD) */
function cartelAurav() {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 300;
  const c = cv.getContext('2d');
  c.fillStyle = '#082440';
  c.fillRect(0, 0, 1024, 300);
  c.fillStyle = '#c8e63a';
  c.fillRect(0, 0, 1024, 14);
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = 'bold 120px Arial';
  c.fillText('AURAV', 512, 120);
  c.font = 'bold 46px Arial';
  c.fillStyle = '#c8e63a';
  c.fillText('TALLER DE MOTORES · VER PARA VOLAR', 512, 228, 980);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.34), new THREE.MeshBasicMaterial({map: t, toneMapped: false}));
  m.name = 'cartel-aurav';
  return m;
}
try {
  const gltf = await new GLTFLoader().loadAsync(`./taller/hangar.glb?v=${VERSION}`);
  hangar = gltf.scene;
  hangar.name = 'hangar';
  hangar.position.z = DESPLAZAR_HANGAR;
  const acanalada = texturaAcanalada();
  hangar.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.material.name || '';
    if (n.includes('hangar_luz')) o.material = new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false, side: THREE.DoubleSide});
    else {
      o.material.metalness = 0.05;
      o.material.roughness = 0.85;
      if (n.includes('hangar_chapa')) o.material.map = acanalada;
      if (n.includes('hangar_alma')) {
        o.material.map = texturaCalada();
        o.material.alphaTest = 0.5;
        o.material.alphaToCoverage = true; // bordes suaves con el MSAA del casco
        o.material.side = THREE.DoubleSide;
      }
      o.material.needsUpdate = true;
    }
  });
  escena.add(hangar);
  const cartel = cartelAurav();
  cartel.position.set(0, 6.8, DESPLAZAR_HANGAR - 60 + 0.05); // alto: detrás del holograma, por encima de la línea de los paneles
  escena.add(cartel);
  escena.background = new THREE.Color(0xa9c7e0); // el cielo, que se ve por el portón
} catch (e) {
  console.warn('taller: hangar.glb no cargó; queda la sala gris', e);
  escena.add(crearSala());
}
const leyenda = crearLeyenda();
escena.add(leyenda.grupo);
const proyector = crearProyector({altoCono: CENTRO_HOLO.y - 0.15 - (MESA.alto + 0.031)});
proyector.grupo.position.set(0, MESA.alto, 0);
escena.add(proyector.grupo);

// ------------------------------------------------------------ la mesa del GLB: palancas (controles.js), botones, lámparas, rótulos
const raizMesa = new THREE.Group();
raizMesa.name = 'mesa';
escena.add(raizMesa);
let controles = null;
let datosCuadrante = null;
const botones3D = {}; // btnARRANCAR, btnRALENTI: {malla, y0, hasta}
const lamparas = {}; // lampARRANQUE, lampIGNITORES, lampCOMBUSTIBLE: material propio
const LAMP_COLOR = {lampARRANQUE: '#e0a100', lampIGNITORES: '#2f86e0', lampCOMBUSTIBLE: '#2f9e5b'};
try {
  const gltf = await new GLTFLoader().loadAsync(`./taller/mesa.glb?v=${VERSION}`);
  const sc = gltf.scene;
  raizMesa.add(sc);
  sc.traverse((o) => {
    if (o.userData && o.userData.cuadrante) datosCuadrante = JSON.parse(o.userData.cuadrante);
  });
  for (const nombre of ['btnARRANCAR', 'btnRALENTI']) {
    const m = sc.getObjectByName(nombre);
    if (m) botones3D[nombre] = {malla: m, y0: m.position.y, hasta: 0};
  }
  for (const nombre of Object.keys(LAMP_COLOR)) {
    const m = sc.getObjectByName(nombre);
    if (!m) continue;
    m.material = new THREE.MeshBasicMaterial({color: 0x3a3d42, toneMapped: false});
    lamparas[nombre] = m;
  }
  controles = new Controles(raizMesa).armar(sc);
  if (datosCuadrante) raizMesa.add(crearPlacaCuadrante(datosCuadrante).malla);
} catch (e) {
  console.warn('taller: mesa.glb no cargó; queda la mesa provisoria', e);
  raizMesa.add(crearMesaProvisoria());
}

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
const motorCentro = motorGrupo.children[0]; // grupo → centro (la caja del motor centrada) → raíz de engine.js
escena.add(motorGrupo);

// ------------------------------------------------------------ la pose del holograma en la mesa
// Base: la hélice a la izquierda del alumno y el costado cortado hacia él (la vista «hero» del escritorio). El recorrido la cambia
// por la vista de cada estación (recorrido.js); agarrarlo (grip en VR; rueda y Shift + arrastre en PC) la deja a mano hasta «A LA MESA».
const pose = {...POSE_BASE, objetivo: [...POSE_BASE.objetivo]};
let poseManual = false;
const vPose = new THREE.Vector3();
const ePose = new THREE.Euler(0, 0, 0, 'XYZ');
const tPose = {pos: new THREE.Vector3(), quat: new THREE.Quaternion(), esc: ESCALA_HOLO};
/** la transformación del grupo del motor para una pose: giro sobre la vertical, después la inclinación hacia el alumno (eje x del
 *  mundo), la escala, y el punto «objetivo» del motor (m, marco del motor) en el centro de la mesa */
function transformDePose(p, out = tPose) {
  ePose.set(p.pitch, p.yaw, 0, 'XYZ');
  out.quat.setFromEuler(ePose);
  out.esc = ESCALA_HOLO * p.escala;
  vPose.set(...p.objetivo).add(motorCentro.position).applyQuaternion(out.quat).multiplyScalar(out.esc);
  out.pos.copy(CENTRO_HOLO).sub(vPose);
  return out;
}
function aplicarPose() {
  transformDePose(pose);
  motorGrupo.position.copy(tPose.pos);
  motorGrupo.quaternion.copy(tPose.quat);
  motorGrupo.scale.setScalar(tPose.esc);
}
/** va de a poco hacia la pose meta desde donde esté el grupo (también desde donde lo dejó la mano) */
function seguirPose(meta, dt) {
  transformDePose(meta);
  const k = 1 - Math.exp(-dt / 0.6);
  motorGrupo.position.lerp(tPose.pos, k);
  motorGrupo.quaternion.slerp(tPose.quat, k);
  motorGrupo.scale.setScalar(motorGrupo.scale.x + (tPose.esc - motorGrupo.scale.x) * k);
  Object.assign(pose, {yaw: meta.yaw, pitch: meta.pitch, escala: meta.escala, objetivo: [...meta.objetivo]});
}
aplicarPose();

// ------------------------------------------------------------ paneles: INSTRUMENTOS + FALLAS a la derecha, el cartel arriba
// 0,68 × 0,97 m a 1,2 m del ojo: la letra más chica (30 px de 1024) da 2 cm (con 0,56 m a 1,3 m daba 1,6 cm: chica para el casco)
const PANEL = {ancho: 0.68, alto: 0.97};
const metalPanel = new THREE.MeshStandardMaterial({color: 0x2b3036, roughness: 0.55, metalness: 0.45});
/** un panel de pie, de cara al alumno parado frente a la mesa, con su marco, su poste y su base */
function montarPanel(p, x, y, z) {
  p.position.set(x, y, z);
  p.rotation.y = Math.atan2(INICIO.pos.x - x, INICIO.pos.z - z);
  escena.add(p);
  const marco = new THREE.Mesh(new THREE.BoxGeometry(PANEL.ancho + 0.02, PANEL.alto + 0.02, 0.025), metalPanel);
  marco.position.copy(p.position).addScaledVector(new THREE.Vector3(Math.sin(p.rotation.y), 0, Math.cos(p.rotation.y)), -0.014);
  marco.rotation.y = p.rotation.y;
  escena.add(marco);
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, y - PANEL.alto / 2, 16), metalPanel);
  poste.position.set(marco.position.x, (y - PANEL.alto / 2) / 2, marco.position.z);
  escena.add(poste);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 32), metalPanel);
  base.position.set(marco.position.x, 0.015, marco.position.z);
  escena.add(base);
}
const panelMotor = crearPanelMotor({gauges: GAUGES, faults: FAULTS, faultKeys: FAULT_KEYS, leyenda: LEGEND, ...PANEL});
montarPanel(panelMotor.malla, 0.92, 1.4, 0.18);
const panelEstaciones = crearPanelEstaciones({estaciones: STATIONS, leyenda: LEGEND, ...PANEL});
montarPanel(panelEstaciones.malla, -0.92, 1.4, 0.18);
const cartel = crearCartel();
cartel.malla.position.set(0, 1.66, -0.12);
cartel.malla.visible = false;
escena.add(cartel.malla);
// las preguntas: delante del holograma, a la altura de los ojos (el holograma se atenúa mientras están abiertas)
const preguntas = crearPanelPreguntas({quiz: QUIZ, orden: ORDER});
preguntas.malla.position.set(0, 1.47, 0.1);
preguntas.malla.visible = false;
preguntas.malla.renderOrder = 12;
escena.add(preguntas.malla);
const paneles = [panelMotor, panelEstaciones, preguntas];
const llamadas = crearLlamadas({escena, parts: eng.PARTS, centro: CENTRO_HOLO});
// la pausa en VR (B/Y): el panel de la cabina (panelvr.js), frente a la cabeza
const panelVR = crearPanelVR();
escena.add(panelVR.malla);
// el sonido de la turbina (audio.js de la cabina: silbido y hélice que siguen a Ng y Np); arranca con el primer gesto
const audio = new Audio();
const iniciarAudio = () => audio.iniciar();
addEventListener('pointerdown', iniciarAudio);
addEventListener('keydown', iniciarAudio);

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

// ------------------------------------------------------------ el recorrido automático (recorrido.js: el guion de tour.js en vivo)
// Las estaciones de a 7 s, las palancas que se mueven solas, el arranque caliente y el corte. En VR arranca sólo con el botón
// RECORRIDO (en el casco, solo y sin aviso desorienta); cualquier toque del alumno lo para y el motor sigue desde donde quedó.
const recorrido = {activo: false, t0: 0, tPrev: 0};
function iniciarRecorrido() {
  aRalenti();
  estacion = 0;
  desdeEstacion = reloj;
  poseManual = false;
  Object.assign(recorrido, {activo: true, t0: reloj, tPrev: 0});
}
function pararRecorrido() {
  recorrido.activo = false;
}
function pasoRecorrido() {
  const t = (reloj - recorrido.t0) % DURATION;
  if (t < recorrido.tPrev) aRalenti(); // dio la vuelta
  if (recorrido.tPrev < FAULT_T && t >= FAULT_T) ponerFalla('hot');
  if (recorrido.tPrev < RESET_T && t >= RESET_T) aRalenti();
  recorrido.tPrev = t;
  const i = inpAt(t);
  inp.pla = i.pla;
  inp.prop = i.prop;
  if (t >= FAULT_T && t < RESET_T) {
    inp.cl = i.cl;
    autoCL = false;
  }
  const st = stationAt(t);
  if (st !== estacion) {
    estacion = st;
    desdeEstacion = reloj;
  }
  return poseHolograma(t);
}

// ------------------------------------------------------------ las preguntas
let preguntasAbiertas = false;
function abrirPreguntas() {
  pararRecorrido();
  preguntas.abrir();
  preguntas.malla.visible = preguntasAbiertas = true;
}
function cerrarPreguntas() {
  preguntas.malla.visible = preguntasAbiertas = false;
}

// ------------------------------------------------------------ las palancas 3D ↔ las entradas del motor
// controles.js: adelante (−z) = ángulo negativo, de −0,9 (adelante) a 0,15 (atrás). POTENCIA: atrás = ralentí, adelante = máxima.
// HÉLICE: adelante = máx. RPM, atrás = bandera. CONDICIÓN: tres muescas (corte atrás · ralentí bajo · ralentí alto adelante).
const LEV = {levPLA: 'pla', levPROP: 'prop', levCL: 'cl'};
const A_MAX = 0.15;
const A_MIN = -0.9;
const MUESCAS = [0.15, -0.375, -0.9];
const angDe = (k, v) => (k === 'cl' ? MUESCAS[v] : A_MAX - v * (A_MAX - A_MIN));
const valorDe = (k, a) => (k === 'cl' ? MUESCAS.reduce((m, x, i) => (Math.abs(a - x) < Math.abs(a - MUESCAS[m]) ? i : m), 0) : clamp((A_MAX - a) / (A_MAX - A_MIN), 0, 1));
let palancaMouse = null; // la palanca que se arrastra con el mouse (PC)
function sincronizarPalancas(dt) {
  if (!controles) return;
  for (const p of controles.palancas) {
    const k = LEV[p.nombre];
    if (!k) continue;
    if (p.agarre || p === palancaMouse) {
      const v = valorDe(k, p.ang);
      if (k === 'cl') {
        if (v !== inp.cl) {
          inp.cl = v;
          autoCL = false;
        }
      } else inp[k] = v;
    } else {
      const obj = angDe(k, inp[k]);
      if (Math.abs(p.ang - obj) > 1e-4) {
        p.ang += (obj - p.ang) * Math.min(1, dt * 14 || 1);
        controles._aplicarPalanca(p);
      }
    }
  }
}

// ------------------------------------------------------------ apuntar y accionar: paneles, botones de la mesa, palancas
const rayo = new THREE.Raycaster();
const m4 = new THREE.Matrix4();
function rayoDesdeControl(c) {
  m4.identity().extractRotation(c.matrixWorld);
  rayo.ray.origin.setFromMatrixPosition(c.matrixWorld);
  rayo.ray.direction.set(0, 0, -1).applyMatrix4(m4);
  rayo.far = 6;
  return rayo;
}
function rayoDesdeMouse(e) {
  const r = renderer.domElement.getBoundingClientRect();
  rayo.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
  rayo.far = 20;
  return rayo;
}
/** lo primero que toca el rayo: {tipo: 'panel'|'boton'|'palanca', id, distancia, palanca?} */
function apuntado(r) {
  let mejor = null;
  const tomar = (h) => {
    if (h && (!mejor || h.distancia < mejor.distancia)) mejor = h;
  };
  for (const p of paneles) {
    const h = p.impacto(r);
    if (h) tomar({tipo: 'panel', id: h.id, distancia: h.distancia, panel: p});
  }
  for (const [nombre, b] of Object.entries(botones3D)) {
    const h = r.intersectObject(b.malla, false)[0];
    if (h) tomar({tipo: 'boton', id: nombre, distancia: h.distance});
  }
  if (controles) {
    const h = controles.impacto(r);
    if (h) {
      const p = controles.palancas.find((x) => x.malla === h.object);
      if (p) tomar({tipo: 'palanca', id: p.nombre, distancia: h.distance, palanca: p});
    }
  }
  return mejor;
}
function accionar(a) {
  if (!a || !a.id) return false;
  if (recorrido.activo && a.id !== 'v_recorrido') pararRecorrido(); // cualquier toque del alumno toma el control
  if (a.tipo === 'panel' && a.id.startsWith('q_')) {
    if (preguntas.tocar(a.id) === 'cerrar') cerrarPreguntas();
  } else if (a.tipo === 'panel' && a.id.startsWith('f_')) ponerFalla(a.id.slice(2));
  else if (a.tipo === 'panel' && /^st\d$/.test(a.id)) ponerEstacion(+a.id.slice(2));
  else if (a.id === 'v_corte') corte = true;
  else if (a.id === 'v_completo') corte = false;
  else if (a.id === 'v_flujo') flujo = flujo ? 0 : 1;
  else if (a.id === 'v_recorrido') recorrido.activo ? pararRecorrido() : iniciarRecorrido();
  else if (a.id === 'v_preguntas') preguntasAbiertas ? cerrarPreguntas() : abrirPreguntas();
  else if (a.id === 'v_mesa') poseManual = false;
  else if (a.tipo === 'boton') {
    const b = botones3D[a.id];
    b.hasta = reloj + 0.18;
    if (a.id === 'btnARRANCAR') arrancar();
    else aRalenti();
  } else if (a.tipo === 'palanca' && a.id === 'levCL') {
    inp.cl = (inp.cl + 1) % 3; // un toque en la condición la pasa a la muesca siguiente (en VR se agarra con el grip)
    autoCL = false;
  } else return false;
  return true;
}

// ------------------------------------------------------------ teclado y mouse (PC)
const teclas = {};
const AYUDA = 'WASD caminar · arrastrar = mirar · arrastrar una palanca = moverla · clic en botones y paneles · rueda = tamaño del holograma · Shift + arrastrar = girarlo · ↑↓ potencia · ←→ hélice · C condición · Enter arrancar · R a ralentí · G falla siguiente · 1–8 estación (0 todas) · K corte · L flujo · T recorrido · P preguntas · M a la mesa · H ayuda';
let verAyuda = true;
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  teclas[k] = true;
  if (k === 't') return recorrido.activo ? pararRecorrido() : iniciarRecorrido();
  if (k === 'p') return preguntasAbiertas ? cerrarPreguntas() : abrirPreguntas();
  if (k === 'm') return (poseManual = false);
  if (recorrido.activo && ['c', 'enter', 'r', 'g', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) pararRecorrido();
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
let hoverPC = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  const a = apuntado(rayoDesdeMouse(e));
  arrastre = {x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, a, girarHolo: e.shiftKey};
  if (a && a.tipo === 'palanca' && a.id !== 'levCL') {
    palancaMouse = a.palanca;
    arrastre.ang0 = a.palanca.ang;
    pararRecorrido();
  }
  if (e.shiftKey) {
    poseManual = true;
    pararRecorrido();
  }
  renderer.domElement.setPointerCapture(e.pointerId);
});
// la rueda cambia el tamaño del holograma (de 0,2 a 1:1 del real, como las dos manos en VR)
renderer.domElement.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    poseManual = true;
    pararRecorrido();
    pose.escala = clamp(pose.escala * Math.exp(-e.deltaY * 0.0012), 0.2 / ESCALA_HOLO, 1 / ESCALA_HOLO);
    aplicarPose();
  },
  {passive: false},
);
renderer.domElement.addEventListener('pointermove', (e) => {
  if (renderer.xr.isPresenting) return;
  if (!arrastre) {
    const a = apuntado(rayoDesdeMouse(e));
    hoverPC = a && a.tipo === 'panel' ? a.id : null;
    renderer.domElement.style.cursor = a && a.id ? 'pointer' : 'default';
    return;
  }
  if (palancaMouse) {
    palancaMouse.ang = clamp(arrastre.ang0 + (e.clientY - arrastre.y0) * 0.006, A_MIN, A_MAX); // arrastrar hacia arriba = adelante
    controles._aplicarPalanca(palancaMouse);
    return;
  }
  if (arrastre.girarHolo) {
    pose.yaw += (e.clientX - arrastre.x) * 0.008;
    pose.pitch = clamp(pose.pitch + (e.clientY - arrastre.y) * 0.006, -1.2, 1.2);
    aplicarPose();
    arrastre.x = e.clientX;
    arrastre.y = e.clientY;
    return;
  }
  yaw -= (e.clientX - arrastre.x) * 0.0045;
  pitch = clamp(pitch - (e.clientY - arrastre.y) * 0.0045, -1.45, 1.45);
  arrastre.x = e.clientX;
  arrastre.y = e.clientY;
});
const soltar = (e) => {
  if (arrastre && !palancaMouse && e && Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) < 5) accionar(arrastre.a);
  arrastre = null;
  palancaMouse = null;
};
renderer.domElement.addEventListener('pointerup', soltar);
renderer.domElement.addEventListener('pointercancel', () => soltar(null));
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
  if (hangar) {
    // adentro de la nave (con medio metro a las paredes) o afuera, en la plataforma; el frente se cruza sólo por el portón abierto
    const zPorton = DESPLAZAR_HANGAR;
    if (p.z < zPorton) {
      p.x = clamp(p.x, -19.5, 19.5);
      p.z = Math.max(p.z, DESPLAZAR_HANGAR - 59.5);
      if (p.z > zPorton - 0.5 && Math.abs(p.x) > 5.6) p.z = zPorton - 0.5;
    } else {
      p.x = clamp(p.x, -45, 45);
      p.z = Math.min(p.z, zPorton + 40);
      if (p.z < zPorton + 1.2 && Math.abs(p.x) > 5.6) p.z = zPorton + 1.2;
    }
  } else {
    p.x = clamp(p.x, -6.6, 6.6);
    p.z = clamp(p.z, -6.6, 6.6);
  }
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

// ------------------------------------------------------------ VR: entrar, joysticks (caminar y girar de a 30°), rayos, grip y gatillo
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
  audio.iniciar(); // el Quest suspende el audio al entrar en VR: se reanuda acá y en cada gesto
});
function abrirPausa() {
  panelVR.mostrar(
    {titulo: 'TALLER DE MOTORES · PAUSA', texto: `${LEGEND}\n\nEl motor sigue en el estado en que lo dejaste.`, botones: [{id: 'seguir', texto: 'Seguir'}, {id: 'ralenti', texto: 'Motor a ralentí'}, {id: 'salir', texto: 'Salir de VR'}]},
    (id) => {
      panelVR.ocultar();
      if (id === 'ralenti') aRalenti();
      else if (id === 'salir') renderer.xr.getSession()?.end();
    },
    renderer.xr.isPresenting ? renderer.xr.getCamera() : camara,
  );
}
renderer.xr.addEventListener('sessionend', () => {
  botonVR.textContent = 'Entrar en VR';
  jugador.rotation.set(0, 0, 0);
  camara.position.set(0, ALTURA_OJOS, 0);
});
const manos = [0, 1].map((i) => {
  const c = renderer.xr.getController(i);
  const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({color: 0x9fe3ff, transparent: true, opacity: 0.7}));
  linea.scale.z = 0.6;
  c.add(linea);
  c.userData = {linea, grip: false, gripNuevo: false};
  c.addEventListener('selectstart', () => {
    audio.iniciar();
    if (panelVR.visible) panelVR.gatillo(c);
    else accionar(apuntado(rayoDesdeControl(c)));
  });
  c.addEventListener('squeezestart', () => Object.assign(c.userData, {grip: true, gripNuevo: true}));
  c.addEventListener('squeezeend', () => (c.userData.grip = false));
  jugador.add(c);
  return c;
});
let giroArmado = true;
let pausaPrevia = false;
function leerJoysticks(dt) {
  const ses = renderer.xr.getSession();
  if (!ses) return;
  let pausa = false;
  for (const src of ses.inputSources) {
    const gp = src.gamepad;
    if (gp && gp.buttons[5] && gp.buttons[5].pressed) pausa = true; // B / Y (xr-standard: botón 5)
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
  if (pausa && !pausaPrevia) {
    if (panelVR.visible) panelVR.ocultar();
    else abrirPausa();
  }
  pausaPrevia = pausa;
}
let hoverVR = null;
// agarrar el holograma: grip cerca de él (y no de una palanca). Con una mano se lleva y se gira; con las dos, además se agranda o
// se achica (de 0,2 a 1:1 del real). Queda donde se suelta hasta «A LA MESA».
const agarreHolo = [];
let dosManos = null;
const mHolo = new THREE.Matrix4();
const vEsc = new THREE.Vector3();
function cercaDelHolograma(c) {
  c.getWorldPosition(tmp);
  motorGrupo.getWorldPosition(tmp2);
  return tmp.distanceTo(CENTRO_HOLO) < 0.32 + motorGrupo.scale.x * 0.5 || tmp.distanceTo(tmp2) < 0.3;
}
function manosVR() {
  hoverVR = null;
  for (const c of manos) {
    let agarroControl = false;
    if (controles && !panelVR.visible) agarroControl = controles.manoVR(c, c.userData.grip, c.userData.gripNuevo);
    if (c.userData.gripNuevo && !agarroControl && !panelVR.visible && cercaDelHolograma(c)) {
      motorGrupo.updateMatrixWorld(true);
      agarreHolo.push({mano: c, rel: new THREE.Matrix4().copy(c.matrixWorld).invert().multiply(motorGrupo.matrixWorld)});
      poseManual = true;
      pararRecorrido();
    }
    if (!c.userData.grip)
      for (let i = agarreHolo.length - 1; i >= 0; i--)
        if (agarreHolo[i].mano === c) {
          agarreHolo.splice(i, 1);
          dosManos = null;
        }
    c.userData.gripNuevo = false;
    if (panelVR.visible) {
      const d = panelVR.apuntar(c);
      c.userData.linea.scale.z = d ?? 0.6;
      continue;
    }
    const a = apuntado(rayoDesdeControl(c));
    c.userData.linea.scale.z = a ? a.distancia : 0.6;
    if (a && a.tipo === 'panel') hoverVR = a.id;
  }
  if (controles) controles.actualizar();
  if (agarreHolo.length) {
    const {mano, rel} = agarreHolo[0];
    mHolo.multiplyMatrices(mano.matrixWorld, rel).decompose(motorGrupo.position, motorGrupo.quaternion, vEsc);
    if (agarreHolo.length > 1) {
      const d = agarreHolo[0].mano.getWorldPosition(tmp).distanceTo(agarreHolo[1].mano.getWorldPosition(tmp2));
      if (!dosManos) dosManos = {d0: d, s0: motorGrupo.scale.x};
      motorGrupo.scale.setScalar(clamp((dosManos.s0 * d) / Math.max(0.05, dosManos.d0), 0.2, 1));
      agarreHolo[0].rel.copy(mano.matrixWorld).invert().multiply(motorGrupo.updateMatrix() || motorGrupo.matrix);
    } else motorGrupo.scale.copy(vEsc);
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
    `<b>TALLER DE MOTORES · AURAV</b> <span style="opacity:.7">v${VERSION} · sala de prueba${HOLO ? '' : ' · materiales originales'}</span><br>` +
    `Ng <b>${r.ng.toFixed(1)}</b> % · ITT <b>${r.itt.toFixed(0)}</b> °C · TORQUE <b>${r.tq.toFixed(0)}</b> % · Np <b>${r.np.toFixed(0)}</b> · FLUJO <b>${r.ff.toFixed(0)}</b> PPH<br>` +
    `POTENCIA ${Math.round(inp.pla * 100)} % · CONDICIÓN ${CL_NAMES[inp.cl]} · HÉLICE ${helice}${s.startOn ? ' · <b>ARRANQUE</b>' : ''}${s.ign ? ' · IGNITORES' : ''}<br>` +
    `FALLA ${f.name} · ${st ? `ESTACIÓN ${st.n} · ${st.name.toUpperCase()}` : 'MOTOR ENTERO'} · ${corte ? 'CORTE' : 'COMPLETO'}${flujo ? ' · FLUJO' : ''}${recorrido.activo ? ` · <b>RECORRIDO ${((reloj - recorrido.t0) % DURATION).toFixed(0)} s</b>` : ''}` +
    (verAyuda ? `<div id="ayuda">${AYUDA}</div>` : '');
}

// ------------------------------------------------------------ el cuadro
let ultimo = performance.now();
let acum = 0;
let panelT = 0;
let estampido = false;
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
  } else {
    leerJoysticks(dt);
    manosVR();
  }
  // el recorrido pone las palancas, la estación y las fallas del guion; la pose del holograma sigue a la vista de cada estación
  const metaTour = recorrido.activo ? pasoRecorrido() : null;
  if (!poseManual && !agarreHolo.length) seguirPose(metaTour || POSE_BASE, dt);
  sincronizarPalancas(dt);
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
  // el sonido: la turbina sigue a Ng y a Np (más bajo que en la cabina: es un holograma); un golpe en cada estampido de la pérdida
  audio.actualizar(dt, {ng: s.ng, rpm: s.np, dentro: true});
  if (s.surge > 0.9 && !estampido) audio.golpe();
  estampido = s.surge > 0.9;
  // lámparas (como console.js: arranque, ignitores, combustible) y botones que se hunden al tocarlos
  const prender = {lampARRANQUE: s.startOn, lampIGNITORES: s.ign, lampCOMBUSTIBLE: inp.cl > 0 && s.ff > 5};
  for (const [nombre, m] of Object.entries(lamparas)) m.material.color.set(prender[nombre] ? LAMP_COLOR[nombre] : 0x3a3d42);
  for (const b of Object.values(botones3D)) b.malla.position.y = b.y0 - (reloj < b.hasta ? 0.006 : 0);
  // paneles: el de instrumentos y fallas a 10 Hz; el cartel cuando cambia
  panelT -= dt;
  const hover = renderer.xr.isPresenting ? hoverVR : hoverPC;
  if (panelT <= 0) {
    panelT = 0.1;
    panelMotor.actualizar({r: readout(s), fault: inp.fault, hover});
    panelEstaciones.actualizar({estacion, corte, flujo: !!flujo, recorrido: recorrido.activo, hover});
    if (preguntasAbiertas) preguntas.pasarPor(hover && hover.startsWith('q_') ? hover : null);
  }
  const st = STATIONS.find((x) => x.n === estacion);
  cartel.actualizar({estacion: preguntasAbiertas ? null : st || null, alerta: !preguntasAbiertas && alertaVisible() ? FAULTS[inp.fault] : null});
  // las llamadas de la estación (aparecen de a poco, como en el escritorio) y el holograma atenuado mientras están las preguntas
  llamadas.actualizar(preguntasAbiertas ? null : st || null, estacion ? ss(0.8, 1.3, since) : 0, eng.root, renderer.xr.isPresenting ? renderer.xr.getCamera() : camara);
  if (holo) holo.ajustes.uBrillo.value += ((preguntasAbiertas ? 0.3 : 1) - holo.ajustes.uBrillo.value) * Math.min(1, dt * 6);
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
  {nombre: 'puesto de trabajo (el alumno, campo ancho)', pos: [0, ALTURA_OJOS, 0.95], mira: [0.35, 1.18, 0], hfov: 100},
  {nombre: 'el cuadrante de cerca', pos: [0.3, 1.45, 0.72], mira: [0.38, 1.0, 0.24], hfov: 60},
  {nombre: 'el panel de instrumentos y fallas', pos: [0.15, ALTURA_OJOS, 0.85], mira: [0.92, 1.4, 0.18], hfov: 70},
  {nombre: 'el panel de estaciones y vista', pos: [-0.15, ALTURA_OJOS, 0.85], mira: [-0.92, 1.4, 0.18], hfov: 70},
  {nombre: 'el puesto entero (los dos paneles)', pos: [0, 1.75, 1.6], mira: [0, 1.25, 0], hfov: 95},
  {nombre: 'la nave desde la mesa, mirando al portón', pos: [0, 1.6, 2.2], mira: [0, 3.5, 45], hfov: 100},
  {nombre: 'desde el portón hacia el taller', pos: [0, 1.7, 42], mira: [0, 2.2, 0], hfov: 90},
  {nombre: 'el techo: arcos, correas y luminarias', pos: [0, 1.7, 18], mira: [0, 11, 10], hfov: 100},
  {nombre: 'la nave desde un rincón alto', pos: [17, 5.6, 37.5], mira: [-8, 1.5, 0], hfov: 90}, // entre dos filas de luminarias (en 43 una quedaba encima)
  {nombre: 'afuera: el portón desde la plataforma', pos: [6, 1.7, 70], mira: [0, 4, 45], hfov: 80},
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
/** rayos desde el ojo (y con la cabeza corrida ±8 cm) a un punto: ¿llegan sin que nada los tape? (la lección de la tablilla) */
function rayosDesdeElOjo(blanco, objeto, ojo = new THREE.Vector3(0, ALTURA_OJOS, INICIO.pos.z)) {
  const r = new THREE.Raycaster();
  const res = [];
  escena.updateMatrixWorld(true);
  const tapan = [];
  // sólo mallas: las líneas no tapan y three.js las toma con un margen de 1 m (daba falsos «tapa LineSegments»)
  escena.traverse((o) => {
    if (o.isMesh && o.visible && o.layers.test(camara.layers) && o !== objeto && !o.name.startsWith('holo') && !(o.material && o.material.blending === THREE.AdditiveBlending)) tapan.push(o);
  });
  for (const dx of [-0.08, 0, 0.08])
    for (const dy of [-0.08, 0, 0.08]) {
      const o = ojo.clone().add(new THREE.Vector3(dx, dy, 0));
      const dir = blanco.clone().sub(o);
      const dist = dir.length();
      r.set(o, dir.normalize());
      r.far = dist - 0.01;
      const h = r.intersectObjects(tapan, false)[0];
      res.push(h ? `tapa ${h.object.name || h.object.type} a ${h.distance.toFixed(2)} m` : 'libre');
    }
  return res;
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
  leyenda,
  escena,
  camara,
  jugador,
  renderer,
  get controles() {
    return controles;
  },
  datosCuadrante,
  panelMotor,
  cartel,
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
  hud: (v) => (hud.style.display = v === false ? 'none' : ''),
  /** abre (o cierra) la pausa de VR delante de la cámara (en PC, para mirarla) */
  pausa: () => (panelVR.visible ? panelVR.ocultar() : abrirPausa()),
  audio,
  panelEstaciones,
  preguntas,
  llamadas,
  /** el recorrido automático: true lo arranca, false lo para; devuelve si está andando y en qué segundo */
  recorrido: (v) => {
    if (v === true) iniciarRecorrido();
    else if (v === false) pararRecorrido();
    return {activo: recorrido.activo, t: +((reloj - recorrido.t0) % DURATION).toFixed(2)};
  },
  /** las preguntas: true las abre, false las cierra */
  abrirPreguntas: (v = true) => (v ? abrirPreguntas() : cerrarPreguntas()),
  /** la pose del holograma (y si está a mano) */
  get pose() {
    return {...pose, manual: poseManual, escalaMundo: +motorGrupo.scale.x.toFixed(3)};
  },
  aLaMesa: () => (poseManual = false),
  /** acciona un botón del panel ('f_hot'…) o de la mesa ('btnARRANCAR', 'btnRALENTI') como si se lo tocara */
  tocar: (id) => accionar(id.startsWith('btn') ? {tipo: 'boton', id} : id.startsWith('lev') ? {tipo: 'palanca', id} : {tipo: 'panel', id}),
  /** mueve una palanca 3D como si la agarrara una mano: nombre ('levPLA', 'levPROP', 'levCL') y ángulo (−0,9 adelante … 0,15 atrás) */
  palanca(nombre, ang) {
    const p = controles && controles.palancas.find((x) => x.nombre === nombre);
    if (!p) return null;
    palancaMouse = p;
    p.ang = clamp(ang, A_MIN, A_MAX);
    controles._aplicarPalanca(p);
    sincronizarPalancas(0);
    palancaMouse = null;
    return {...inp};
  },
  rayosDesdeElOjo,
  /** avanza la simulación t segundos de golpe (para las capturas) */
  correr(t, cada = 1 / 60) {
    for (let x = 0; x < t; x += cada) avanzar(cada);
  },
  /** dibuja un cuadro y devuelve lo que costó (llamadas, triángulos, puntos, líneas) y lo que tiene el holograma */
  medir() {
    dibujarAhora();
    const r = renderer.info.render;
    return {llamadas: r.calls, triangulos: r.triangles, puntos: r.points, lineas: r.lines, geometrias: renderer.info.memory.geometries, texturas: renderer.info.memory.textures, holograma: holo ? holo.info() : null, letraLeyendaCm: +(leyenda.leyenda.userData.letra * 100).toFixed(2)};
  },
};
