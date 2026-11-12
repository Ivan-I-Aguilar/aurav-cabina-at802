// Cabina del AT-802 en VR (AURAV). Modelo: interior del Fire Boss freeware de FSX (Flight Sim Nation),
// convertido con herramientas/mdl2glb.py. Entorno: el aeródromo de AURAV (escenario.js de «Control del sector»).
// Vuelo: vuelo.js (modelo simplificado). Instrumentos vivos: instrumentos.js. Controles: controles.js.
// Uso interno de prueba.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { crearEscenario } from './escenario.js?v=20261017a';
import { Controles } from './controles.js?v=20261022e';
import { Instrumentos } from './instrumentos.js?v=20261025e';
import { Vuelo, MPH, FT } from './vuelo.js?v=20261026j';
import { Mision } from './mision.js?v=20261022b';
import { Audio } from './audio.js?v=20261018b';
import { crearAPie } from './apie.js?v=20261024a';
import { crearPanelVR } from './panelvr.js?v=20261017a';
import { cargarCabinaNueva } from './cabina_nueva.js?v=20261111d';

/* Etapa 7 (11/11): la cabina FSX (cabina.glb) y todos sus parches se sacaron del juego; la única cabina es la nueva (cabina_nueva.js).
   La historia de la vieja está en TRASPASO.md y en git (hasta el commit anterior a éste). */
const OJO = new THREE.Vector3(0, 1.38, 1.64);  // vista del piloto en el marco del modelo (adelante = −z): ~0,78 m sobre el asiento (0,60), por encima del tablero (1,30) para ver el horizonte
const ALTURA_CABINA = 1.9;                      // el marco de la cabina sobre el del avión: a 7,2° de 3 puntos las ruedas (y_cab −2 / −1,12) apoyan justo (24/10)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); window.__renderer = renderer;   /* gancho de prueba: renderer.info (llamadas, triángulos) */   /* alpha: en modo cámara «lugar real» se ve la cámara detrás del avión */
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true; document.body.appendChild(renderer.domElement);

const escena = new THREE.Scene();
THREE.ShaderChunk.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = length( mvPosition.xyz );\n#endif';   // niebla por distancia (Quest)
const antesDelEntorno = new Set(escena.children);
const ambiente = crearEscenario(escena);
const entorno = escena.children.filter(o => !antesDelEntorno.has(o) && !o.isLight); const nieblaEntorno = escena.fog;
let lugarReal = false;
/* modo cámara a escala: el jugador se agranda k veces (tus pasos rinden k veces) → el avión se ve como maqueta 1:k a la altura de una mesa */
const ESCALAS = [5, 10, 20, 1];   /* 1:5 de entrada: a más escala, más se amplifica el temblor del seguimiento */ let iEscala = 0, pisoXR = true;
function aplicarEscalaCamara(reubicar) {
  const k = ESCALAS[iEscala]; jugador.scale.setScalar(k);
  aPie.alturaXR = k === 1 ? (pisoXR ? 0 : 1.4) : (pisoXR ? -0.8 * k : 0.6 * k);   /* el piso real queda 0,8 m (a escala) debajo del avión */
  document.getElementById('escala').textContent = k === 1 ? 'Escala real' : 'Escala 1:' + k;
  if (reubicar) {   /* pararte a 1,5 m (reales) del costado izquierdo del avión, mirándolo */
    const centro = cabina.localToWorld(new THREE.Vector3(0, -1.2, 1.5)), lado = new THREE.Vector3(-1, 0, 0).applyQuaternion(cabina.getWorldQuaternion(new THREE.Quaternion())); lado.y = 0; lado.normalize();
    const pos = centro.clone().addScaledVector(lado, 1.5 * k + 2.5);
    escena.attach(jugador); jugador.position.set(pos.x, ambiente.alturaTerreno(pos.x, pos.z) + aPie.alturaXR, pos.z);
    jugador.rotation.set(0, Math.atan2(lado.x, lado.z), 0);
  }
}
/* seguimiento del celular: compensar saltos bruscos y avisar cuando se pierde */
const segui = { previo: null, perdido: 0, aviso: null };
function cuidarSeguimiento() {
  const frame = renderer.xr.getFrame(), ref = renderer.xr.getReferenceSpace(); if (!frame || !ref) return;
  const pose = frame.getViewerPose(ref); if (!pose) return;
  const p = pose.transform.position, ahora = new THREE.Vector3(p.x, p.y, p.z);
  if (segui.previo) {
    const d = ahora.clone().sub(segui.previo);
    if (d.length() > 0.12 && aPie.modo === 'pie' && !aPie.animando) {   /* más de 12 cm en un cuadro: es un error de seguimiento, no un paso */
      d.y = 0; d.applyQuaternion(jugador.quaternion).multiplyScalar(jugador.scale.x); jugador.position.sub(d);
    }
  }
  segui.previo = ahora;
  segui.perdido = pose.emulatedPosition ? segui.perdido + 1 : 0;
  if (!segui.aviso) { segui.aviso = document.createElement('div'); segui.aviso.textContent = 'Mové el celular más despacio, apuntando a algo con textura'; segui.aviso.style.cssText = 'position:fixed;left:50%;top:60px;transform:translateX(-50%);background:rgba(160,30,30,.9);color:#fff;padding:8px 14px;border-radius:10px;font:600 15px Arial;z-index:30;display:none;text-align:center;max-width:85vw'; document.body.appendChild(segui.aviso); }
  segui.aviso.style.display = segui.perdido > 10 ? 'block' : 'none';
}
document.getElementById('escala').onclick = () => { iEscala = (iEscala + 1) % ESCALAS.length; aplicarEscalaCamara(true); };
function verLugarReal(si) {   /* modo cámara: true = el avión sobre lo que filma el teléfono; false = la pista virtual */
  lugarReal = si; for (const o of entorno) o.visible = !si;
 escena.fog = si ? null : nieblaEntorno;
  renderer.setClearAlpha(si ? 0 : 1); document.getElementById('entorno').textContent = si ? 'Ver pista virtual' : 'Ver lugar real';
}

// Jerarquía: avion (cuerpo que vuela, +x adelante) → cabina (el GLB mira a −z: se gira 90°, tren en el piso) + jugador (cámara)
const vuelo = new Vuelo(); window.__vuelo = vuelo; vuelo.suelo = (x, z) => ambiente.alturaTerreno(x, z);
const avion = new THREE.Group(); escena.add(avion);
const cabina = new THREE.Group(); cabina.rotation.y = -Math.PI / 2; cabina.position.y = ALTURA_CABINA; avion.add(cabina);
const jugador = new THREE.Group(); avion.add(jugador);
const camara = new THREE.PerspectiveCamera(75, innerWidth / innerHeight || 800 / 675, 0.02, 3000); camara.rotation.order = 'YXZ';   /* con la pestaña oculta la ventana mide 0×0: aspecto de repuesto para que los rayos (__sonda) sigan andando */
const OJO_AVION = cabina.localToWorld(OJO.clone()); avion.worldToLocal(OJO_AVION);
jugador.add(camara); jugador.position.copy(OJO_AVION); jugador.rotation.y = -Math.PI / 2;
// posición inicial: alineado en la cabecera de la pista 36 (la pista corre por x = 30 hacia −z), mirando a −z
vuelo.pos.set(30, 0, 100); vuelo.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

let instrumentos = null, exterior = null, cabinaNueva = null; const V_EXT = '20261102j';
const pedales = { mixer: null, accion: null, dur: 1, vis: 0 };   /* el clip va de timón a la izquierda (0) a la derecha (dur) */
function actualizarPedales(dt) {
  if (!pedales.accion) return; pedales.vis += (pedal - pedales.vis) * Math.min(1, dt * 10);   /* con teclado el pedal salta: suavizar */
  pedales.accion.time = (THREE.MathUtils.clamp(pedales.vis, -1, 1) + 1) / 2 * pedales.dur; pedales.mixer.update(0);
}
Promise.resolve().then(() => cargarCabinaNueva({ cabina, controles, V: '20261111d', V_EXT, OJO, Instrumentos }).then(r => {   /* en una microtarea: controles y mision se declaran más abajo */
  exterior = r.exterior; cabinaNueva = r; instrumentos = r.instrumentos; document.getElementById('cargando').remove(); mision.menu();   /* instrumentos: anemómetro y altímetro del tablero nuevo (etapa 2) */
  for (const n of SW3) controles.hacerTresPosiciones(n, 0);   /* la FUEL BOOST PUMP del tablero nuevo (swFPUMP) es de 3 posiciones, como en la vieja */
  if (r.tablero) {   /* 2b (8/11): la tablilla del tutor prendida al parante derecho del parabrisas (inclinada como el vidrio, 2 cm por dentro) y la placa MENÚ sobre el ala derecha del tablero, donde el 802 real lleva la matrícula */
    hudVR.malla.position.set(0.29, 1.37, 1.065); hudVR.malla.rotation.set(0.55, -0.15, 0);
    botonSalir.malla.position.set(0.27, 1.21, r.tablero.z_cara + 0.002); botonSalir.malla.rotation.set(0, 0, 0);
  }
  for (const o of r.palanca || []) { o.position.sub(PIVOTE); palanca.add(o); }   /* etapa 6: el bastón nuevo (palanca_*) gira con el mando desde PIVOTE */
  Object.assign(pedales, r.pedales || {});                                        /* y los pedales de Lichi siguen al pedal */
}));
// ---- controles de cabina → modelo de vuelo ----
const controles = new Controles(cabina); window.__controles = controles;
/* Tabla lógica → malla (los nombres reales de los GLB de la cabina nueva: cab_llaves.py, cab_tablero.py, cab_consola.py, radios.js). Lo que el 802
   no tiene apunta a una malla que no existe (controles.estado da null y aplicarControles no lo pisa): ALTN, HYD y SPARE. FIRE es la manija FUEL
   (estado 0 = OFF corta el combustible y hace de «FIRE» para la misión: a confirmar con Bruno); AVNC es la MASTER AVIONICS del PAC24 (radios) */
const SW = { BATT: 'swBATT', ALTN: 'swALTN', GEN: 'swGEN', IGNTR: 'swIGN', START: 'swSTART', FIRE: 'swFUEL', FPUMP: 'swFPUMP', HYD: 'swHYD', AVNC: 'swAVNC', PITOT: 'swPITOT', HOPR: 'swFRDS', FRDS: 'swARMED', WIPER: 'swWIPER', LDG: 'swLDG_L', DOME: 'swWORK', BCN: 'swPULSE', NAV: 'swSTRBNAV', STRB: 'swSTRBNAV', SPARE: 'swSPARE' };
const SW3 = ['swFPUMP', 'swIGN', 'swFRDS_GAL', 'swFRDS_COV', 'swTRIMALERON'];   /* 3 posiciones: IGNITION ON · OFF · CONTINUOUS (los extremos encienden); GALLONS, COVERAGE y AILERON TRIM + · 0 · − (vuelven solas) */
const levAng = n => { const p = controles.palancas.find(x => x.nombre === n); return p ? p.ang : 0; };
const adelante = n => THREE.MathUtils.clamp(-levAng(n) / 0.9, 0, 1);   // palancas: adelante = ángulo negativo
const hayLev = n => controles.palancas.some(x => x.nombre === n);
function aplicarControles() {
  const m = vuelo.motor, c = vuelo.mando;
  /* la cabina nueva todavía no tiene todas las llaves ni las palancas (etapas 3 y 4): si un control falta, vale lo que puso reiniciarAvion (8/11) */
  const est = (n, actual) => { const v = controles.estado(n); return v === null ? !!actual : !!v; };
  m.bateria = est(SW.BATT, m.bateria); m.generador = controles.estado(SW.GEN) === null && controles.estado(SW.ALTN) === null ? !!m.generador : !!(controles.estado(SW.GEN) || controles.estado(SW.ALTN));
  m.ignicion = est(SW.IGNTR, m.ignicion); m.arrancador = est(SW.START, m.arrancador) && m.bateria; m.bombaCombustible = est(SW.FPUMP, m.bombaCombustible);
  m.extintor = controles.estado('swFUEL') === 0;   /* no hay switch FIRE: la manija FUEL a OFF corta el combustible y hace de «FIRE» (etapa 4; a confirmar con Bruno) */
  if (hayLev('levPOT')) { c.potencia = adelante('levPOT'); c.reversa = THREE.MathUtils.clamp((levAng('levPOT') - 0.17) / 0.25, 0, 1); }   /* palanca detrás del ralentí = beta/reversa */
  if (hayLev('levHEL')) c.helice = adelante('levHEL');
  if (hayLev('levCOND')) c.condicion = adelante('levCOND');
  if (controles.estado('swFUEL') === 0) c.condicion = 0;   /* válvula de combustible en OFF: sin combustible, el motor se corta (manual 26/10) */
  vuelo.colaLibre = !!controles.estado('swWRUD');   /* traba de cola: destrabada gira más cerrado en el piso */
  if (adelante('levEDUMP') > 0.85 && vuelo.agua > 0) vuelo.agua = 0;   /* manija E-DUMP adelante: salvo total (manual 26/10) */
  c.cabeceo = THREE.MathUtils.clamp(mando.x / LIMITE + (c.trimProf || 0), -1, 1); c.alabeo = THREE.MathUtils.clamp(-mando.z / LIMITE + (c.trimAler || 0), -1, 1);   /* + trims de la consola (etapa 4) */

  c.pedal = THREE.MathUtils.clamp(pedal + (c.trimTimon || 0), -1, 1); c.frenos = frenos; c.flaps = flaps;
  /* largado de emergencia: tecla E (la manija roja agregada se sacó; falta definir el control real con AAXOD) */
  // el arrancador vuelve solo cuando el motor enciende (en el avión es con resorte)
  if (m.encendido && controles.estado(SW.START)) { const s = controles.switches.find(x => x.nombre === SW.START); if (s) { s.estado = false; controles._aplicarSwitch(s); } }
}
let pedal = 0, frenos = 0, flaps = 0;
controles.alCambiar = (nombre, valor) => { console.log('control', nombre, valor); if (nombre === 'swFLAPS') flaps = flaps >= 1 ? 0 : flaps + 0.5; };   /* switch de flaps: 0° → 10° → 20° → 0° */

// ---- bastón de mando ----
const PIVOTE = new THREE.Vector3(0, 0.28, 1.15);               // base del bastón (etapa 6, medida en la 360; el bastón es blender/cab_asiento.glb, mallas palanca_*)
const INCL_NEUTRA = 0;                                          // nace derecho (el del FSX venía inclinado −0,25)
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
const rayoMano = new THREE.Raycaster(), m4Mano = new THREE.Matrix4();
function rayoDe(c) { m4Mano.identity().extractRotation(c.matrixWorld); rayoMano.ray.origin.setFromMatrixPosition(c.matrixWorld); rayoMano.ray.direction.set(0, 0, -1).applyMatrix4(m4Mano); rayoMano.far = 1.5; return rayoMano; }
const manos = [];
for (const i of [0, 1]) {
  const c = renderer.xr.getController(i); jugador.add(c);
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf2c200 })); c.add(esfera); manos.push(c);
  c.userData.apretado = 0;
  const rayo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xc8e63a })); rayo.visible = false; c.add(rayo); c.userData.rayo = rayo;
  const agarrar = () => {
    c.userData.apretado++; audio.iniciar();
    if (mando.agarre === c && c.userData.apretado > 1) { largarCarga(); return; }   /* con el bastón agarrado, el otro botón = descarga (botón del mango) */
    if (panelVR.visible) { panelVR.gatillo(c); return; }
    if (botonSalir.apuntado(c) != null) { pausar(); return; }
    if (aPie.modo === 'pie') { if (aPie.cerca || rayoDe(c).intersectObject(aPie.cartel).length) aPie.subir(); return; }
    if (controles.manoVR(c, true, true)) return;
    palanca.localToWorld(tmp.copy(PUNIO)); c.getWorldPosition(tmp2); if (tmp.distanceTo(tmp2) < 0.25) { mando.agarre = c; return; }
    controles.clic(rayoDe(c));   /* lejos de todo: lo que apunte el rayo (switch o palanca) se acciona */
  };
  const soltar = () => { c.userData.apretado = Math.max(0, c.userData.apretado - 1); if (!c.userData.apretado && mando.agarre === c) mando.agarre = null; };
  c.addEventListener('selectstart', agarrar); c.addEventListener('squeezestart', agarrar);
  c.addEventListener('selectend', soltar); c.addEventListener('squeezeend', soltar);
  c.addEventListener('connected', e => { c.userData.mano = e.data.handedness; });
}
// joysticks: izquierdo X = pedales, izquierdo atrás = frenos; derecho arriba/abajo = flaps; botón joystick o A/X = recentrar
let flapsPrevio = 0, pausaPrevio = false, giroPrevio = 0; const ejesPie = { mover: [0, 0], girar: 0 };
function leerJoysticks() {
  const ses = renderer.xr.getSession(); if (!ses) return; let boton = false, botonPausa = false; pedal = 0; frenos = 0;
  for (const src of ses.inputSources) {
    const gp = src.gamepad; if (!gp) continue;
    if (gp.buttons[3]?.pressed || gp.buttons[4]?.pressed) boton = true;
    if (gp.buttons[5]?.pressed) botonPausa = true;   /* B / Y: pausa con opción de salir */
    const x = gp.axes[2] || 0, y = gp.axes[3] || 0;
    if (aPie.modo === 'pie') {   /* a pie: izquierdo camina, derecho gira de a 30° */
      if (src.handedness === 'left') ejesPie.mover = [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0];
      if (src.handedness === 'right') { const g = x > 0.7 ? 1 : x < -0.7 ? -1 : 0; ejesPie.girar = g !== giroPrevio ? -g : 0; giroPrevio = g; }
      continue;
    }
    if (src.handedness === 'left') { pedal = Math.abs(x) > 0.15 ? x : 0; frenos = y > 0.5 ? (y - 0.5) * 2 : 0; }
    if (src.handedness === 'right') { if (y > 0.7 && flapsPrevio <= 0.7) flaps = Math.min(1, flaps + 0.5); if (y < -0.7 && flapsPrevio >= -0.7) flaps = Math.max(0, flaps - 0.5); flapsPrevio = y; }
  }
  if (boton && !botonPrevio && aPie.modo === 'cabina') recentrarPendiente = 1; botonPrevio = boton;
  if (botonPausa && !pausaPrevio && !panelVR.visible) pausar(); pausaPrevio = botonPausa;
}
// ---- teclado (PC): flechas bastón, A/D pedales, B frenos, F flaps, E largado ----
function largarCarga() { if (vuelo.largando == null && vuelo.agua > 0) { vuelo.largarCarga(true); vuelo.evento('largado'); } }
const teclas = {}; addEventListener('keydown', e => { teclas[e.key.toLowerCase()] = true; if (e.key === 'f') flaps = flaps >= 1 ? 0 : flaps + 0.5; if (e.key === 'e') largarCarga(); });
addEventListener('keyup', e => teclas[e.key.toLowerCase()] = false);
addEventListener('keydown', e => { if (e.key === 'Escape') pausar(); if (e.key === 'Enter' && aPie.modo === 'pie' && aPie.cerca) aPie.subir(); });
const teclado = new THREE.Object3D(); cabina.add(teclado);
function actualizarTeclado() {
  if (aPie.modo !== 'cabina') { pedal = 0; frenos = 0; return; }   /* a pie, las teclas caminan */
  const ax = (teclas.arrowdown ? 1 : 0) - (teclas.arrowup ? 1 : 0), az = (teclas.arrowright ? 1 : 0) - (teclas.arrowleft ? 1 : 0);
  if (ax || az) { teclado.position.set(PIVOTE.x + Math.sin(az * LIMITE) * 0.6, PIVOTE.y + 0.55, PIVOTE.z + Math.sin(ax * LIMITE) * 0.6); mando.agarre = teclado; }
  else if (mando.agarre === teclado) mando.agarre = null;
  if (!renderer.xr.isPresenting) { pedal = (teclas.d ? 1 : 0) - (teclas.a ? 1 : 0); frenos = teclas.b ? 1 : 0; }
}

// ---- cámara PC ----
let yaw = 0, pitch = -0.15, arr = null, arrIni = null;
addEventListener('pointerdown', e => { arr = [e.clientX, e.clientY]; arrIni = [e.clientX, e.clientY]; });
addEventListener('pointerup', e => {
  arr = null;
  if (arrIni && Math.hypot(e.clientX - arrIni[0], e.clientY - arrIni[1]) < 8) { const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camara);
    if (aPie.modo === 'pie') { const h = r.intersectObject(aPie.cartel)[0]; if (h && h.distance < 4) { aPie.subir(); return; } }
    controles.clic(r); }
});
addEventListener('pointermove', e => { if (!arr) return; yaw += (e.clientX - arr[0]) * 0.004; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - arr[1]) * 0.004, -1.4, 1.4); arr = [e.clientX, e.clientY]; });
addEventListener('resize', () => { if (!(innerWidth > 0 && innerHeight > 0)) return; camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
/* RONDA FIJA (etapa 0, 3/11; PLAN §6): __ronda(n) pone la cámara en la vista n de las 12 y devuelve una
   promesa que se cumple con la vista ya dibujada. Adentro (1–7) desde el ojo del piloto; afuera (8–12) a
   pie, con la cámara local elevada (a pie el jugador se pega al suelo cada cuadro). La luz es fija (de día).
   Posiciones y miradas en el marco de la cabina. __ronda() sin número lista las vistas. */
const RONDA = [
  { n: 1, nombre: 'frente', yaw: 0, pitch: -0.12 },
  { n: 2, nombre: 'abajo a la izquierda (cuadrante)', yaw: 0.75, pitch: -0.7 },
  { n: 3, nombre: 'abajo a la derecha (radios)', yaw: -0.75, pitch: -0.7 },
  { n: 4, nombre: 'vano izquierdo', yaw: 1.5, pitch: -0.1 },
  { n: 5, nombre: 'vano derecho', yaw: -1.5, pitch: -0.1 },
  { n: 6, nombre: 'atrás', yaw: Math.PI, pitch: -0.1 },
  { n: 7, nombre: 'piso y pedales', yaw: 0, pitch: -1.15 },
  { n: 8, nombre: '3/4 delantero izquierdo desde arriba', desde: [-2.6, 2.6, -1.0], hacia: [0, 1.15, 1.5] },
  { n: 9, nombre: '3/4 delantero derecho desde arriba', desde: [2.6, 2.6, -1.0], hacia: [0, 1.15, 1.5] },
  { n: 10, nombre: '3/4 trasero izquierdo, por las ventanas', desde: [-2.4, 1.6, 3.6], hacia: [0, 1.1, 1.5] },
  { n: 11, nombre: '3/4 trasero derecho, por las ventanas', desde: [2.4, 1.6, 3.6], hacia: [0, 1.1, 1.5] },
  { n: 12, nombre: 'de costado, a la altura de la ventana (izquierda)', desde: [-3.0, 1.3, 1.55], hacia: [0, 1.15, 1.55] },
];
/* cuadros(n): espera n cuadros. Si la pestaña está oculta el navegador no dibuja (no hay requestAnimationFrame): a los
   250 ms se dibuja a mano un cuadro (cámara puesta, escena actualizada, a pie avanzado) para que __ronda, __vista y
   __sonda sigan sirviendo con el panel del navegador escondido (7/11). */
const dibujar = () => { if (renderer.xr.isPresenting) return; if (aPie.animando) aPie.actualizar(0.05, teclas, null); camara.rotation.set(pitch, yaw, 0); escena.updateMatrixWorld(true); renderer.render(escena, camara); };
const cuadros = n => new Promise(r => {
  const f = () => { if (n-- <= 0) return r(); let hecho = false; const id = requestAnimationFrame(() => { hecho = true; f(); });
    setTimeout(() => { if (!hecho) { hecho = true; cancelAnimationFrame(id); dibujar(); f(); } }, 250); };
  f();
});
window.__ronda = async n => {
  const v = RONDA.find(x => x.n === n); if (!v) { console.table(RONDA.map(x => ({ n: x.n, vista: x.nombre }))); return RONDA.map(x => x.n + ' ' + x.nombre); }
  $('panel').hidden = true; panelVR.ocultar();   /* el menú tapa la vista; la misión no cambia */
  const esperar = async () => { for (let i = 0; i < 300 && aPie.animando; i++) await cuadros(1); };
  camara.fov = 75; camara.updateProjectionMatrix();   /* por si antes se usó __vista(...) con otro campo */
  if (v.desde) {
    if (aPie.modo === 'cabina') { aPie.bajar(); await cuadros(2); await esperar(); }
    const desde = cabina.localToWorld(new THREE.Vector3(...v.desde)), hacia = cabina.localToWorld(new THREE.Vector3(...v.hacia));
    const suelo = ambiente.alturaTerreno(desde.x, desde.z);
    escena.attach(jugador); jugador.position.set(desde.x, suelo, desde.z); jugador.scale.setScalar(1);
    const d = hacia.clone().sub(desde); jugador.rotation.set(0, Math.atan2(-d.x, -d.z), 0);
    camara.position.set(0, desde.y - suelo, 0); yaw = 0; pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  } else {
    if (aPie.modo === 'pie') { aPie.subir(); await cuadros(2); await esperar(); }
    jugador.position.copy(OJO_AVION); camara.position.set(0, 0, 0);   /* por si antes se usó __vista(...) desde otro punto */
    yaw = v.yaw; pitch = v.pitch;
  }
  await cuadros(3); return v.nombre;
};
/* __desde([x, y, z], [hx, hy, hz], hfov°): la cámara a pie en un punto cualquiera de AFUERA (marco cabina) mirando a otro:
   para acercarse a un detalle del exterior (7/11). Sin argumentos vuelve al asiento. */
window.__desde = async (desde, hacia, hfov = 50) => {
  $('panel').hidden = true; panelVR.ocultar();
  if (!desde) { if (aPie.modo === 'pie') { aPie.subir(); await cuadros(2); for (let i = 0; i < 300 && aPie.animando; i++) await cuadros(1); } jugador.position.copy(OJO_AVION); camara.position.set(0, 0, 0); camara.fov = 75; camara.updateProjectionMatrix(); yaw = 0; pitch = -0.15; await cuadros(3); return 'asiento'; }
  if (aPie.modo === 'cabina') { aPie.bajar(); await cuadros(2); for (let i = 0; i < 300 && aPie.animando; i++) await cuadros(1); }
  const d0 = cabina.localToWorld(new THREE.Vector3(...desde)), h0 = cabina.localToWorld(new THREE.Vector3(...hacia));
  const suelo = ambiente.alturaTerreno(d0.x, d0.z);
  escena.attach(jugador); jugador.position.set(d0.x, suelo, d0.z); jugador.scale.setScalar(1);
  const d = h0.clone().sub(d0); jugador.rotation.set(0, Math.atan2(-d.x, -d.z), 0);
  camara.position.set(0, d0.y - suelo, 0); yaw = 0; pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  camara.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov) / 2) / camara.aspect)); camara.updateProjectionMatrix();
  await cuadros(3); return `a pie desde (${desde}) mirando a (${hacia}), hfov ${hfov}`;
};
/* __vista(x, y, z, yaw°, pitch°, hfov°): la cámara en un punto cualquiera de la cabina (marco cabina) mirando
   con ese yaw (positivo = derecha) y pitch (positivo = arriba) y ese campo horizontal: para comparar el juego
   con una foto desde el mismo punto (calcado de la 360, etapa 0). Sin argumentos vuelve al ojo del piloto. */
window.__vista = async (x, y, z, yawDeg = 0, pitchDeg = 0, hfov = null) => {
  if (aPie.modo !== 'cabina') return 'sólo en la cabina';
  $('panel').hidden = true; panelVR.ocultar();
  if (x == null) { jugador.position.copy(OJO_AVION); yaw = 0; pitch = -0.15; camara.fov = 75; camara.updateProjectionMatrix(); await cuadros(3); return 'ojo del piloto'; }
  const p = cabina.localToWorld(new THREE.Vector3(x, y, z)); avion.worldToLocal(p); jugador.position.copy(p); camara.position.set(0, 0, 0);
  yaw = -THREE.MathUtils.degToRad(yawDeg); pitch = THREE.MathUtils.degToRad(pitchDeg);
  if (hfov) { camara.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov) / 2) / camara.aspect)); camara.updateProjectionMatrix(); }
  await cuadros(3); return `vista desde (${x}, ${y}, ${z}) yaw ${yawDeg}° pitch ${pitchDeg}° hfov ${hfov ?? 'igual'}`;
};
/* __sonda(u, v, n): QUÉ se ve en un punto de la pantalla (u, v de 0 a 1 desde arriba a la izquierda; sirve cualquier
   tamaño de captura): las primeras n mallas visibles que cruza el rayo, con su material, la distancia y el punto en
   el marco de la cabina. Para revisar una captura sin adivinar qué pieza es cada mancha (5/11). */
window.__sonda = (u, v, n = 3) => {
  const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(u * 2 - 1, 1 - v * 2), camara);
  const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  return r.intersectObject(escena, true).filter(h => h.object.isMesh && visible(h.object)).slice(0, n).map(h => {
    const p = cabina.worldToLocal(h.point.clone());
    return `${h.object.name} / ${h.object.material.name} · ${h.distance.toFixed(2)} m · (${p.x.toFixed(3)}; ${p.y.toFixed(3)}; ${p.z.toFixed(3)})`; });
};

// ---- VR ----
const bVR = document.getElementById('vr');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { bVR.hidden = !ok; });
bVR.onclick = async () => {
  audio.iniciar();
  const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
  renderer.xr.setReferenceSpaceType('local-floor'); await renderer.xr.setSession(s);
  recentrarPendiente = 72;   /* recentra a los 12 y a los 72 cuadros */
  setTimeout(() => { if (!$('panel').hidden && ui._ultimo) panelVR.mostrar(ui._ultimo[0], ui._ultimo[1], renderer.xr.getCamera()); }, 800);
  s.addEventListener('end', () => { if (aPie.modo === 'cabina') jugador.position.copy(OJO_AVION); else camara.position.y = 1.65; });
};
// ---- modo cámara (celular Android): WebXR AR que sigue el movimiento real del teléfono pero muestra sólo la escena virtual ----
const bAR = document.getElementById('ar');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-ar').then(ok => { bAR.hidden = !ok; }).catch(() => {});
bAR.onclick = async () => {
  audio.iniciar();
  const s = await navigator.xr.requestSession('immersive-ar', { optionalFeatures: ['local-floor', 'dom-overlay'], domOverlay: { root: document.body } });
  const piso = !s.enabledFeatures || s.enabledFeatures.includes('local-floor');
  renderer.xr.setReferenceSpaceType(piso ? 'local-floor' : 'local'); pisoXR = piso;
  for (const c of manos) c.children.forEach(h => h.visible = false);   /* sin esferas ni rayos de mano en el teléfono */
  await renderer.xr.setSession(s); modoCamara = true;
  if (aPie.modo === 'cabina') ui.aPie();
  setTimeout(() => aplicarEscalaCamara(true), 1200);   /* después del fundido de bajada */
  document.getElementById('entorno').hidden = false; document.getElementById('escala').hidden = false;
  s.addEventListener('end', () => { modoCamara = false; verLugarReal(false); document.getElementById('entorno').hidden = true; document.getElementById('escala').hidden = true; jugador.scale.setScalar(1); segui.previo = null; if (segui.aviso) segui.aviso.style.display = 'none'; aPie.alturaXR = 0; for (const c of manos) c.children[0].visible = true; if (aPie.modo === 'pie') camara.position.y = 1.65; });
};
let modoCamara = false;
document.getElementById('entorno').onclick = () => verLugarReal(!lugarReal);
// ---- giroscopio (celulares sin modo cámara): mirar moviendo el teléfono ----
const bGiro = document.getElementById('giro'); bGiro.hidden = !matchMedia('(pointer: coarse)').matches || !('DeviceOrientationEvent' in window);
const giro = { activo: false, q: new THREE.Quaternion(), off: null };
const _e = new THREE.Euler(), _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), _qz = new THREE.Quaternion(), _qy = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0);
function alOrientar(e) {
  if (e.alpha == null) return;
  _e.set(THREE.MathUtils.degToRad(e.beta), THREE.MathUtils.degToRad(e.alpha), -THREE.MathUtils.degToRad(e.gamma), 'YXZ');
  giro.q.setFromEuler(_e).multiply(_q1).multiply(_qz.setFromAxisAngle(Z, -THREE.MathUtils.degToRad(screen.orientation?.angle || 0)));
  if (giro.off == null) giro.off = yaw - new THREE.Euler().setFromQuaternion(giro.q, 'YXZ').y;   /* arrancar mirando hacia donde ya mirabas */
  giro.q.premultiply(_qy.setFromAxisAngle(Y, giro.off));
}
async function activarGiro() {
  if (giro.activo) return;
  try { if (DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return; } } catch { return; }
  giro.activo = true; giro.off = null; addEventListener('deviceorientation', alOrientar); bGiro.textContent = 'Dejar de mirar con el celular';
}
if (!bGiro.hidden) addEventListener('pointerup', () => { if (!renderer.xr.isPresenting) activarGiro(); }, { once: true });   /* celular: el giroscopio arranca solo con el primer toque */
bGiro.onclick = async () => {
  if (giro.activo) { giro.activo = false; removeEventListener('deviceorientation', alOrientar); bGiro.textContent = 'Mirar moviendo el celular'; return; }
  try { if (DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return; } } catch { return; }
  giro.activo = true; giro.off = null; addEventListener('deviceorientation', alOrientar); bGiro.textContent = 'Dejar de mirar con el celular';
};
let recentrarPendiente = 0, botonPrevio = false;
const cabezaW = new THREE.Vector3(), ojoW = new THREE.Vector3();
function recentrar() {   // lleva el casco al ojo del piloto (en el marco del avión)
  camara.getWorldPosition(cabezaW); avion.localToWorld(ojoW.copy(OJO_AVION));   /* la cámara XR interna no cuelga de la escena: usar la nuestra */
  tmp.copy(ojoW).sub(cabezaW).applyQuaternion(avion.getWorldQuaternion(new THREE.Quaternion()).invert()); jugador.position.add(tmp);
}

// humo del capot (la luz de fuego es el anunciador MASTER WARN del tablero: pantallas.js)
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
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); m.renderOrder = 3; m.position.set(0.33, 1.29, 1.13);   /* con depthTest: ya no se dibuja a traves de la chapa (24/10) */ m.rotation.set(-0.12, -0.22, 0); cabina.add(m);   /* adentro del vidrio: a 0,78 atravesaba la cupula (24/10) */
  return { malla: m, texto(titulo, texto) { c.clearRect(0, 0, W, H); if (!texto) { tex.needsUpdate = true; return; } c.fillStyle = 'rgba(8,36,64,0.85)'; c.beginPath(); c.roundRect(0, 0, W, H, 28); c.fill(); c.fillStyle = '#c8e63a'; c.font = 'bold 30px Arial'; c.fillText(titulo || '', 28, 48);
    c.fillStyle = '#fff'; c.font = '34px Arial'; let y = 100, l = ''; for (const p of texto.split(' ')) { const t = l ? l + ' ' + p : p; if (c.measureText(t).width > W - 56) { c.fillText(l, 28, y); y += 42; l = p; } else l = t; } c.fillText(l, 28, y); tex.needsUpdate = true; } };
})();
function reiniciarAvion({ enPista = false, enVuelo = false, agua = 2400, apagado = false } = {}) {
  const v = vuelo; v.vel.set(0, 0, 0); v.w.set(0, 0, 0); v.agua = agua; v.largando = null; v.estrellado = false; v.perdida = false; v.avisoVne = false; v.tiempoFuego = 0; v.eventos = [];
  Object.assign(v.motor, { falla: false, fuego: false, sinRearranque: false, cortado: false, extintor: false });
  mando.x = mando.z = 0; flaps = 0;
  const pon = (n, ang) => { const p = controles.palancas.find(x => x.nombre === n); if (p) { p.ang = ang; p._aplicar?.(); p.grupo.rotation.x = ang; }
    else { const k = { levPOT: 'potencia', levHEL: 'helice', levCOND: 'condicion' }[n]; if (k) v.mando[k] = THREE.MathUtils.clamp(-ang / 0.9, 0, 1); } };   /* sin la palanca (cabina nueva hasta la etapa 4): el mando directo */
  const sw = (n, est) => { const s = controles.switches.find(x => x.nombre === SW[n]); if (!s) return;
    if (s.pos) est = n === 'FIRE' ? (est ? 0 : 1) : (est ? 1 : 0);   /* llaves de posiciones (la manija FUEL: 0 = OFF, 1 = MAIN): índice, no booleano */
    if (s.estado !== est) { s.estado = est; controles._aplicarSwitch(s); } };
  if (enVuelo) {
    v.pos.set(30, 305, -300); v.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); v.vel.set(0, 0, -67); v.enTierra = false; v.tiempoAire = 10;
    Object.assign(v.motor, { encendido: true, ng: 92, torque: 80, itt: 720, rpmHel: 1700, bateria: true, generador: true });
    for (const n of ['BATT', 'GEN', 'AVNC', 'FPUMP']) sw(n, true); for (const n of ['IGNTR', 'START', 'FIRE']) sw(n, false);
    pon('levPOT', -0.72); pon('levHEL', -0.88); pon('levCOND', -0.88);
  } else {
    v.pos.set(30, 0, 100); v.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); v.enTierra = true;
    if (apagado) { Object.assign(v.motor, { encendido: false, ng: 0, torque: 0, itt: 15, rpmHel: 0, bateria: false, generador: false }); for (const n of ['BATT', 'GEN', 'ALTN', 'AVNC', 'FPUMP', 'IGNTR', 'START', 'FIRE']) sw(n, false); pon('levPOT', 0.1); pon('levHEL', 0.1); pon('levCOND', 0.1); }
    else { Object.assign(v.motor, { encendido: true, ng: 62, torque: 5, itt: 480, rpmHel: 1100, bateria: true, generador: true }); for (const n of ['BATT', 'GEN', 'AVNC', 'FPUMP']) sw(n, true); for (const n of ['IGNTR', 'START', 'FIRE']) sw(n, false); pon('levPOT', 0.1); pon('levHEL', -0.88); pon('levCOND', -0.88); }
  }
  avion.position.copy(v.pos); avion.quaternion.copy(v.q);
}
const aPie = crearAPie({ escena, avion, cabina, jugador, camara, renderer, ojoCabina: () => OJO_AVION, terreno: (x, z) => ambiente.alturaTerreno(x, z),
  alPedirSubir: tipo => { jugador.scale.setScalar(1); if (tipo === 'vr') recentrarPendiente = 72;   /* recentra a los 12 y 72 cuadros: al subir se caia arriba del techo */ yaw = 0; pitch = -0.15; } });
window.__aPie = aPie;
let modoPrevio = 'cabina';
ui.aPie = () => { mision.fase = 'libre'; reiniciarAvion({ enPista: true, agua: 2400, apagado: true }); mision.ui.tareas([]); aPie.bajar(false);
  mision.decir('Recorrido a pie', 'Caminá alrededor del avión. Para subir, acercate al estribo debajo del ala izquierda.'); };
const mision = new Mision({ vuelo, controles, SW, ui, obtener: { terreno: (x, z) => ambiente.alturaTerreno(x, z) }, reiniciarAvion, fuegoConFuel: true });   /* el paso de FUEGO es la manija FUEL a OFF (no hay switch FIRE en el 802) */ window.__mision = mision;
$('menu').onclick = () => { audio.iniciar(); pausar(); };
// ---- pausa / salir: siempre a mano (botón fijo en la cabina, B/Y, Esc o «Menú») ----
let pausado = false;
function pausar() {
  if (pausado) return; pausado = true; const previo = $('panel').hidden ? null : ui._ultimo;
  const botones = [{ id: 'seguir', texto: 'Seguir' }, { id: 'menu', texto: 'Menú principal' }];
  if (aPie.modo === 'cabina' && vuelo.enTierra && vuelo.vel.length() < 1) botones.splice(1, 0, { id: 'bajar', texto: 'Bajar del avión' });
  if (aPie.modo === 'pie') botones.splice(1, 0, { id: 'subir', texto: 'Volver a la cabina' });
  if (renderer.xr.isPresenting) botones.push({ id: 'salirVR', texto: 'Salir de VR' });
  ui.panel({ titulo: 'Pausa', texto: 'El avión está detenido. Seguí donde estabas, volvé al menú o salí.', botones }, id => {
    pausado = false; ui.ocultarPanel();
    if (id === 'seguir') { if (previo) ui.panel(previo[0], previo[1]); }
    else if (id === 'menu') mision.menu();
    else if (id === 'bajar') { aPie.bajar(); if (modoCamara) setTimeout(() => aplicarEscalaCamara(true), 1200); }
    else if (id === 'subir') aPie.subir(true);
    else if (id === 'salirVR') { renderer.xr.getSession()?.end(); if (previo) ui.panel(previo[0], previo[1]); }
  });
}
const botonSalir = (() => {   /* placa «MENÚ · SALIR» debajo de la tablilla del tutor */
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 80; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(160,30,30,0.92)'; c.beginPath(); c.roundRect(0, 0, 256, 80, 18); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MENÚ · SALIR', 128, 42);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.0375), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); m.renderOrder = 3;
  m.position.set(0.42, 1.10, 1.07); m.rotation.set(-0.12, -0.22, 0); cabina.add(m);   /* acompana a la tablilla, adentro del vidrio */
  const ray = new THREE.Raycaster(), m4 = new THREE.Matrix4();
  return { malla: m, apuntado(control) {   /* distancia del rayo del control a la placa, o null */
    m4.identity().extractRotation(control.matrixWorld); ray.ray.origin.setFromMatrixPosition(control.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m4);
    const h = ray.intersectObject(m)[0]; return h ? h.distance : null; } };
})();
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
  const vel = pausado ? 0 : (window.__vel || 1); acumSim += dt * vel; const h = 1 / 120; let n = 0;
  while (acumSim >= h && n < 400) {
    if (window.__auto) {   /* piloto automático de prueba (headless): mantiene cabeceo y alabeo pedidos en grados */
      const e = vuelo.euler, a = window.__auto, c = vuelo.mando;
      if (a.cabeceo != null) c.cabeceo = THREE.MathUtils.clamp((THREE.MathUtils.degToRad(a.cabeceo) - e.cabeceo) * 6 - vuelo.w.z * 2, -1, 1);
      if (a.alabeo != null) c.alabeo = THREE.MathUtils.clamp((THREE.MathUtils.degToRad(a.alabeo) - e.alabeo) * 3 - vuelo.w.x, -1, 1);
    }
    vuelo.paso(h); acumSim -= h; n++;
  }
  avion.position.copy(vuelo.pos); avion.quaternion.copy(vuelo.q);
  if (modoCamara) cuidarSeguimiento();
  const cielo = escena.getObjectByName('cielo'); if (cielo) cielo.position.set(vuelo.pos.x, 0, vuelo.pos.z);
  if (instrumentos) { instrumentos.fijar(vuelo.lecturas()); instrumentos.actualizar(dt); }
  if (cabinaNueva) cabinaNueva.actualizar(vuelo, dt, { controles, SW });   /* la mirilla de la tolva (etapa 1), las pantallas y los anunciadores (etapa 2) */
  mision.actualizar(dt * vel); actualizarHumo(dt); actualizarMarca(dt); actualizarPedales(dt);
  aPie.actualizar(dt, teclas, renderer.xr.isPresenting ? ejesPie : null); ejesPie.girar = 0;
  if (aPie.modo !== modoPrevio) { modoPrevio = aPie.modo; if (!renderer.xr.isPresenting) { yaw = 0; pitch = aPie.modo === 'pie' ? 0 : -0.15; } }
  botonSalir.malla.visible = renderer.xr.isPresenting;
  audio.actualizar(dt, { ng: vuelo.motor.ng, rpm: vuelo.motor.rpmHel, fuego: vuelo.motor.fuego, bocina: vuelo.perdida });
  for (const c of manos) { const d = panelVR.visible ? panelVR.apuntar(c) : (renderer.xr.isPresenting ? (botonSalir.apuntado(c) ?? controles.impacto(rayoDe(c))?.distance ?? null) : null); c.userData.rayo.visible = d != null; if (d != null) c.userData.rayo.scale.z = d; }
  if (hud && !renderer.xr.isPresenting) { const L = vuelo.lecturas(), m = vuelo.motor; hud.textContent = `${L.asi.toFixed(0)} mph · ${L.alt.toFixed(0)} ft · ${L.vsi.toFixed(0)} fpm · TRQ ${m.torque.toFixed(0)}% · ITT ${m.itt.toFixed(0)} · Ng ${m.ng.toFixed(0)} · hél ${m.rpmHel.toFixed(0)} · flaps ${flaps * 20}° · agua ${vuelo.agua.toFixed(0)} kg${vuelo.perdida ? ' · PÉRDIDA' : ''}${vuelo.estrellado ? ' · ACCIDENTE' : ''}`; }
  if (renderer.xr.isPresenting) { if (aPie.modo === 'cabina' && recentrarPendiente > 0) { recentrarPendiente--; if (recentrarPendiente === 0 || recentrarPendiente === 60) recentrar(); } }
  else if (giro.activo && giro.off != null) camara.quaternion.copy(giro.q);
  else camara.rotation.set(pitch, yaw, 0);
  renderer.render(escena, camara);
});
