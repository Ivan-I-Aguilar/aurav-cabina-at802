// Cabina del AT-802 en VR (AURAV). Modelo: interior del Fire Boss freeware de FSX (Flight Sim Nation),
// convertido con herramientas/mdl2glb.py. Entorno: el aeródromo de AURAV (escenario.js de «Control del sector»).
// Vuelo: vuelo.js (modelo simplificado). Instrumentos vivos: instrumentos.js. Controles: controles.js.
// Uso interno de prueba.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { crearEscenario } from './escenario.js?v=20261112d';
import { Controles } from './controles.js?v=20261022e';
import { Instrumentos } from './instrumentos.js?v=20261025e';
import { Vuelo, MPH, FT } from './vuelo.js?v=20261112d';
import { Mision } from './mision.js?v=20261122e';
import { Audio } from './audio.js?v=20261112d';
import { crearAPie } from './apie.js?v=20261024a';
import { crearPanelVR } from './panelvr.js?v=20261112d';
import { cargarCabinaNueva } from './cabina_nueva.js?v=20261112d';
import { generar, semillaNueva, describir } from './escenario_azar.js?v=20261112d';
import { Registro } from './registro.js?v=20261112d';
import { crearIncendio } from './incendio.js?v=20261112d';
import { armarResultado, mostrarDebrief, ocultarDebrief, resumenVR } from './debrief.js?v=20261112d';

/* Etapa 7 (11/11): la cabina FSX (cabina.glb) y todos sus parches se sacaron del juego; la única cabina es la nueva (cabina_nueva.js).
   La historia de la vieja está en TRASPASO.md y en git (hasta el commit anterior a éste). */
const OJO = new THREE.Vector3(0, 1.38, 1.64);  // vista del piloto en el marco del modelo (adelante = −z): ~0,78 m sobre el asiento (0,60), por encima del tablero (1,30) para ver el horizonte
/* Niveles del aula virtual (PLAN_JUEGO.md, 12/11): ?nivel=1|2|3[&semilla=123456][&alumno=Nombre] arranca directo en el nivel, sin menú; sin ?nivel, el
   menú de práctica libre de siempre. La semilla fija la situación (escenario_azar.js); el registro (registro.js) alimenta el debrief (debrief.js). */
const PARAMS = new URLSearchParams(location.search); const NIVEL = Math.min(3, Math.max(0, parseInt(PARAMS.get('nivel') || '0', 10) || 0));
const SEMILLA_LINK = parseInt(PARAMS.get('semilla') || '0', 10) || 0;   /* la situación fijada por el instructor en el link (0 = al azar en cada partida) */
let semillaActual = SEMILLA_LINK, registro = null, escenarioActual = null, nombreActual = '', debriefActual = null, congelado = false;   /* congelado: con el debrief a la vista el mundo se detiene */
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
Promise.resolve().then(() => cargarCabinaNueva({ cabina, controles, V: '20261112d', V_EXT, OJO, Instrumentos }).then(r => {   /* en una microtarea: controles y mision se declaran más abajo */
  exterior = r.exterior; cabinaNueva = r; instrumentos = r.instrumentos; mision.frds = r.frds; document.getElementById('cargando').remove(); if (NIVEL) pantallaInicio(); else mision.menu();   /* instrumentos: anemómetro y altímetro del tablero nuevo (etapa 2) */
  for (const n of SW3) controles.hacerTresPosiciones(n, 0);   /* la FUEL BOOST PUMP del tablero nuevo (swFPUMP) es de 3 posiciones, como en la vieja */
  if (r.tablero) {   /* J4 (12/11): la tablilla (tutor y checklist) recostada sobre el ala derecha del tablero y vuelta hacia el ojo, 7 cm por delante de la chapa; la placa MENÚ cuelga de su borde de abajo. (Del 8/11 al 12/11 iba prendida al parante derecho del parabrisas, que le tapaba un tercio del texto.) */
    hudVR.malla.position.set(0.305, 1.135, r.tablero.z_cara + 0.07); hudVR.malla.rotation.set(-0.25, -0.2, 0);
    hudVR.malla.add(botonSalir.malla); botonSalir.malla.position.set(0.085, -0.095 - 0.023, 0.001); botonSalir.malla.rotation.set(0, 0, 0);
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
  if (adelante('levEDUMP') > 0.85 && vuelo.agua > 0 && vuelo.largando == null) { vuelo.largarCarga(true); vuelo.evento('largado', { emergencia: true }); }   /* manija E-DUMP adelante: salvo total mecánico, abre aunque el FRDS esté trabado (manual 26/10; 12/11: por largando, así la misión lo ve) */
  m.genSw = controles.estado(SW.GEN) === null ? undefined : !!controles.estado(SW.GEN);   /* para el reset del generador (vuelo.js, nivel 3) */
  m.consumo = ['swLDG_L', 'swWORK', 'swPULSE', 'swSTRBNAV', 'swPITOT', 'swWIPER'].reduce((s, n) => s + (controles.estado(n) ? 0.25 : 0), 0) + (controles.estado(SW.AVNC) ? 0.2 : 0);   /* carga eléctrica: cuánto dura la batería sin generador */
  c.cabeceo = THREE.MathUtils.clamp(mando.x / LIMITE + (c.trimProf || 0), -1, 1); c.alabeo = THREE.MathUtils.clamp(-mando.z / LIMITE + (c.trimAler || 0), -1, 1);   /* + trims de la consola (etapa 4) */

  c.pedal = THREE.MathUtils.clamp(pedal + (c.trimTimon || 0), -1, 1); c.frenos = frenos; c.flaps = flaps;
  /* largado de emergencia: tecla E (la manija roja agregada se sacó; falta definir el control real con AAXOD) */
  // el arrancador vuelve solo cuando el motor enciende (en el avión es con resorte)
  if (m.encendido && controles.estado(SW.START)) { const s = controles.switches.find(x => x.nombre === SW.START); if (s) { s.estado = false; controles._aplicarSwitch(s); } }
}
let pedal = 0, frenos = 0, flaps = 0;
controles.alCambiar = (nombre, valor) => { console.log('control', nombre, valor); registro?.anotar('control', { nombre, valor: typeof valor === 'number' ? +valor.toFixed(2) : valor }); if (nombre === 'swFLAPS') flaps = flaps >= 1 ? 0 : flaps + 0.5; };   /* switch de flaps: 0° → 10° → 20° → 0° */

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
const bVR = document.getElementById('vr'); let vrDisponible = false;
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { vrDisponible = !!ok; bVR.hidden = !ok; const b = document.getElementById('inicio-vr'); if (b) { b.hidden = !ok; if (ok) document.getElementById('inicio-empezar').textContent = 'Empezar en pantalla'; } }).catch(() => {});
/* entrar a VR: hay que llamarla desde un gesto del usuario (un clic). Pide la sesión, recentra el casco al ojo del piloto y muestra en el
   casco el panel que estuviera abierto en la página. Si el casco se saca en medio de un nivel, el nivel queda en pausa (no sigue volando solo). */
async function entrarVR() {
  audio.iniciar();
  const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
  renderer.xr.setReferenceSpaceType('local-floor'); await renderer.xr.setSession(s);
  recentrarPendiente = 72;   /* recentra a los 12 y a los 72 cuadros */
  setTimeout(panelVRPendiente, 800);
  s.addEventListener('end', () => { if (aPie.modo === 'cabina') jugador.position.copy(OJO_AVION); else camara.position.y = 1.65; panelVR.ocultar();
    if (NIVEL && registro && mision.fase !== 'resultado' && mision.fase !== 'intro') pausar(); });
  return s;
}
bVR.onclick = () => entrarVR().catch(e => console.warn('VR', e));
/* el panel de VR va frente al casco y, en la cabina, pegado al avión: si el avión sigue rodando, el panel va con él */
function mostrarPanelVR(datos, cb) {
  escena.add(panelVR.malla); escena.updateMatrixWorld(true); panelVR.mostrar(datos, cb, renderer.xr.isPresenting ? renderer.xr.getCamera() : camara);
  if (aPie.modo === 'cabina') avion.attach(panelVR.malla);
}
/* el panel que toca mostrar en el casco: el que esté abierto en la página (menú, pausa, resultado de la práctica) o el debrief del nivel */
function panelVRPendiente() {
  if (!renderer.xr.isPresenting) return;
  if (!$('panel').hidden && ui._ultimo) mostrarPanelVR(ui._ultimo[0], ui._ultimo[1]);
  else if (debriefActual && !$('debrief').hidden) panelDebriefVR();
}
function panelDebriefVR(forzar = false) {   /* el debrief en el casco: resultado, competencias en barras, lo más importante y Repetir / Otra situación / Salir de VR */
  if (!debriefActual || !(renderer.xr.isPresenting || forzar)) return; const a = debriefActual.acciones;
  mostrarPanelVR(resumenVR(debriefActual.resultado), id => { if (id === 'repetir') a.repetir(); else if (id === 'otra') a.otra(); else if (id === 'salir') { panelVR.ocultar(); renderer.xr.getSession()?.end(); } });
}
function cerrarDebrief() { ocultarDebrief(); debriefActual = null; congelado = false; panelVR.ocultar(); }
window.__debriefVR = () => panelDebriefVR(true);   /* gancho de prueba (PC): el panel de VR del debrief frente a la cámara */
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
  tareas(lista) { const ul = $('tareas'); ul.innerHTML = ''; ul.hidden = !lista.length; for (const t of lista) { const li = document.createElement('li'); li.textContent = t.texto; if (t.ok) li.className = 'ok'; if (t.actual) li.className = 'actual'; ul.appendChild(li); }
    hudVR.lista(mision.modoNivel ? $('fase').textContent : null, lista, mision.fase === 'mision'); },   /* en los niveles la tablilla de la cabina lleva el checklist (en VR no hay otra lista a la vista); la orden de vuelo, sólo durante la misión (no en una emergencia) */
  orden(texto) { hudVR.orden(texto); },   /* la orden de vuelo (niveles 2 y 3), fija arriba en la tablilla */
  panel(datos, cb) {
    $('panel-titulo').textContent = datos.titulo; $('panel-texto').textContent = datos.texto; const bs = $('panel-botones'); bs.innerHTML = '';
    for (const b of datos.botones) { const el = document.createElement('button'); el.textContent = b.texto; el.onclick = () => { audio.iniciar(); cb(b.id); }; bs.appendChild(el); }
    $('panel').hidden = false; ui._ultimo = [datos, cb]; if (renderer.xr.isPresenting) mostrarPanelVR(datos, cb); else panelVR.ocultar();
  },
  ocultarPanel() { $('panel').hidden = true; panelVR.ocultar(); },
  decir(t) { audio.decir(t); }, decirVarias(l) { return audio.decirVarias(l); },
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
/* Dos vistas (J4, 12/11): el MENSAJE (título + texto: lo que dicta el tutor en la práctica, la torre y los avisos en los niveles) y, en los
   niveles, el CHECKLIST: título de la fase con «paso i/n», la orden de vuelo fija (niveles 2 y 3), el próximo paso en grande (hasta 2 renglones)
   y los que siguen más chicos, uno por renglón. En VR es la única lista a la vista (la de la página no se ve en el casco). Con el checklist
   activo, un mensaje lo tapa 7 s y vuelve; si cambia la fase (una emergencia), el checklist nuevo sale en el acto. */
/* Dónde va (12/11): sobre el ALA DERECHA del tablero, recostada contra la chapa y vuelta hacia el ojo del piloto (31 × 19 cm, a 0,72 m, 25° a la
   derecha y 19° abajo: una mirada, como a un instrumento). Antes iba prendida al parante derecho del parabrisas y el parante, que es más grueso
   que el vidrio, le tapaba un tercio del texto desde el ojo (medido con rayos); acá no tiene nada adelante y no tapa la vista de afuera. Tapa
   las dos perillas y el soporte del Garmin del ala (decorado). La posición final la pone el bloque de carga de la cabina (más arriba). */
const hudVR = (() => {
  const W = 1024, H = 628, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); m.renderOrder = 3; m.name = 'tablilla'; m.rotation.order = 'YXZ';   /* con depthTest: no se dibuja a través de la chapa (24/10) */
  m.position.set(0.305, 1.135, 1.03); m.rotation.set(-0.25, -0.2, 0); cabina.add(m);
  const est = { lista: null, titulo: '', orden: null, msj: null, reloj: 0 };
  const fondo = () => { c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(8,36,64,0.94)'; c.beginPath(); c.roundRect(0, 0, W, H, 40); c.fill(); c.textBaseline = 'alphabetic'; c.textAlign = 'left'; };
  const partir = (texto, ancho, max) => { const ls = []; let l = ''; for (const p of String(texto).split(' ')) { const t = l ? l + ' ' + p : p; if (c.measureText(t).width > ancho && l) { ls.push(l); l = p; } else l = t; } ls.push(l);
    if (ls.length > max) { ls.length = max; let u = ls[max - 1]; while (u.length > 3 && c.measureText(u + '…').width > ancho) u = u.slice(0, -1); ls[max - 1] = u + '…'; } return ls; };
  const dibMensaje = () => { const [titulo, texto] = est.msj; fondo(); c.fillStyle = '#c8e63a'; c.font = 'bold 44px Arial'; c.fillText(titulo || '', 36, 62, W - 72);
    c.fillStyle = '#fff'; c.font = '56px Arial'; let y = 136; for (const l of partir(texto, W - 72, 8)) { c.fillText(l, 36, y); y += 67; } tex.needsUpdate = true; };
  const dibLista = () => {
    const ps = est.lista, i = ps.findIndex(p => !p.ok), n = ps.length; fondo();
    c.fillStyle = '#c8e63a'; c.font = 'bold 44px Arial'; c.fillText(est.titulo || '', 34, 60, W - 280);
    c.fillStyle = '#fff'; c.font = 'bold 38px Arial'; c.textAlign = 'right'; c.fillText(i < 0 ? `${n}/${n} ✓` : `paso ${i + 1}/${n}`, W - 34, 60); c.textAlign = 'left';
    let y = 72;
    if (est.orden && est.conOrden) { c.fillStyle = '#ffd98a'; c.font = 'bold 37px Arial'; c.fillText(est.orden, 34, y + 38, W - 68); y += 50; }
    if (i < 0) { c.fillStyle = '#fff'; c.font = '56px Arial'; c.fillText('Checklist completo.', 34, y + 70); tex.needsUpdate = true; return; }
    c.fillStyle = '#fff'; c.font = '56px Arial'; c.fillText('▸', 26, y + 62); for (const l of partir(ps[i].texto, W - 118, 3)) { y += 62; c.fillText(l, 84, y); }
    c.fillStyle = 'rgba(255,255,255,0.76)'; c.font = '40px Arial'; y += 14;
    for (let k = i + 1; k < n && y + 50 <= H - 14; k++) { y += 50; c.fillText(partir(ps[k].texto, W - 118, 1)[0], 84, y); c.fillRect(46, y - 17, 16, 4); }
    tex.needsUpdate = true;
  };
  const redibujar = () => { if (est.msj && (!est.lista || est.reloj)) dibMensaje(); else if (est.lista) dibLista(); else { c.clearRect(0, 0, W, H); tex.needsUpdate = true; } };
  return { malla: m,
    texto(titulo, texto) {   /* mensaje: fijo si no hay checklist; con checklist, 7 s y vuelve */
      clearTimeout(est.reloj); est.reloj = 0; est.msj = texto ? [titulo, texto] : null;
      if (est.msj && est.lista) est.reloj = setTimeout(() => { est.reloj = 0; est.msj = null; redibujar(); }, 7000);
      redibujar(); },
    lista(titulo, pasos, conOrden = true) {   /* checklist del nivel (null o vacío: no hay) */
      const habia = !!est.lista, cambio = titulo !== est.titulo; est.lista = titulo != null && pasos && pasos.length ? pasos : null; est.titulo = titulo || ''; est.conOrden = conOrden;
      if (est.lista && (cambio || !habia) && est.reloj && habia) { clearTimeout(est.reloj); est.reloj = 0; est.msj = null; }   /* fase nueva con un mensaje en pantalla: manda el checklist */
      if (!est.lista) { clearTimeout(est.reloj); est.reloj = 0; if (habia) est.msj = null; }
      else if (est.msj && !est.reloj) est.reloj = setTimeout(() => { est.reloj = 0; est.msj = null; redibujar(); }, 7000);   /* había un mensaje fijo de antes: 7 s más y el checklist */
      redibujar(); },
    orden(texto) { est.orden = texto || null; redibujar(); },
  };
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
const mision = new Mision({ vuelo, controles, SW, ui, obtener: { terreno: (x, z) => ambiente.alturaTerreno(x, z) }, reiniciarAvion, fuegoConFuel: true });   /* el paso de FUEGO es la manija FUEL a OFF (no hay switch FIRE en el 802) */
const incendio = crearIncendio(escena); mision.incendio = incendio; window.__incendio = incendio;   /* el foco del nivel 2 (incendio.js) */
/* ---- niveles: pantalla de inicio (nombre del alumno), partida con semilla y debrief al terminar ---- */
function pantallaInicio() {
  const ini = $('inicio'); ini.hidden = false; ocultarDebrief(); $('tutor').hidden = true; $('tareas').hidden = true;
  const nombres = { 1: 'Nivel 1 · Puesta en marcha', 2: 'Nivel 2 · Misión de incendio', 3: 'Nivel 3 · Salida con emergencia' };
  $('inicio-titulo').textContent = `Cabina AT-802 · ${nombres[NIVEL]}`;
  $('inicio-texto').textContent = NIVEL === 1 ? 'Poné el motor en marcha siguiendo el checklist de AAXOD (lo tenés en la tablilla). El tutor no dicta: anota todo lo que hacés y cuándo. Puede pasar algo en el arranque: resolvelo.'
    : NIVEL === 2 ? 'Con el motor en marcha en la cabecera, la torre te pasa la orden de vuelo por radio: foco, rumbo, distancia, viento, carga y cobertura. Despegá, navegá al foco con el Garmin (CRS), largá en la ventana correcta y volvé a aterrizar por el valle del norte, final a la pista 18. El tutor no dicta.'
    : 'La misma misión del nivel 2 (orden por radio, foco, descarga, vuelta), pero en algún momento va a pasar algo que no está en el plan. Resolvelo como en el avión: el checklist de emergencia aparece en la tablilla. Si se puede, terminá la misión; si no, volvé entero.';
  const inp = $('inicio-nombre'); inp.value = PARAMS.get('alumno') || nombreActual || localStorage.getItem('aurav_alumno') || '';
  $('inicio-semilla').textContent = SEMILLA_LINK ? `Situación ${SEMILLA_LINK} (fijada en el link)` : 'Situación al azar';
  const nota = $('inicio-nota'); nota.hidden = true;
  const tomarNombre = () => { const nombre = inp.value.trim() || 'Alumno/a'; try { localStorage.setItem('aurav_alumno', nombre); } catch (e) {} ini.hidden = true; $('tutor').hidden = false; audio.iniciar(); return nombre; };
  $('inicio-empezar').onclick = () => empezarNivel(tomarNombre(), SEMILLA_LINK || semillaNueva());
  /* en el Quest: un solo toque entra a VR y arranca el nivel ya sentado (1,5 s después, con el casco recentrado); con la pantalla de inicio
     abierta el botón «Entrar en VR» de la barra queda tapado, y arrancar en 2D dejaba el reloj corriendo antes de ponerse el casco */
  const bv = $('inicio-vr'); bv.hidden = !vrDisponible; if (vrDisponible) $('inicio-empezar').textContent = 'Empezar en pantalla';
  bv.onclick = () => { bv.disabled = true; entrarVR().then(() => { const nombre = tomarNombre(); setTimeout(() => empezarNivel(nombre, SEMILLA_LINK || semillaNueva()), 1500); })
    .catch(e => { nota.hidden = false; nota.textContent = `No se pudo entrar en VR (${e?.message || e}). Probá de nuevo o empezá en pantalla.`; }).finally(() => { bv.disabled = false; }); };
}
function empezarNivel(nombre, semilla) {
  cerrarDebrief(); nombreActual = nombre;
  semillaActual = semilla; escenarioActual = generar(NIVEL, semilla); registro = new Registro(); registro.anotar('inicio', { nivel: NIVEL, semilla, situacion: describir(escenarioActual) });
  const q = new URLSearchParams(location.search); q.set('nivel', String(NIVEL)); q.set('semilla', String(semilla)); history.replaceState(null, '', location.pathname + '?' + q);   /* el link de esta partida, para repetirla */
  mision.alCerrar = res => {
    const resultado = armarResultado({ alumno: nombre, nivel: NIVEL, escenario: escenarioActual, registro, resultado: res });
    console.log('resultado', resultado);
    const acciones = { repetir: () => empezarNivel(nombre, semilla), otra: () => empezarNivel(nombre, semillaNueva()), menu: () => { cerrarDebrief(); registro = null; mision.modoNivel = 0; mision.menu(); } };
    debriefActual = { resultado, acciones }; mostrarDebrief(resultado, acciones);
    /* a los 3 s (un momento para ver cómo quedó): el mundo se detiene, la voz dice el resultado y, con el casco puesto, sale el debrief de VR */
    setTimeout(() => { if (!debriefActual || debriefActual.resultado !== resultado) return; congelado = true;
      if ('speechSynthesis' in window) speechSynthesis.cancel(); audio.decir(resultado.aprobado ? 'Nivel aprobado.' : 'Nivel no aprobado. Mirá la devolución.'); panelDebriefVR(); }, 3000);
  };
  mision.nivel(NIVEL, escenarioActual, registro);
} window.__mision = mision;
$('menu').onclick = () => { audio.iniciar(); pausar(); };
// ---- pausa / salir: siempre a mano (botón fijo en la cabina, B/Y, Esc o «Menú») ----
let pausado = false;
function pausar() {
  if (pausado) return; pausado = true; const previo = $('panel').hidden ? null : ui._ultimo;
  const enNivel = !!(NIVEL && registro);   /* en un nivel no hay menú de práctica ni paseo a pie: se sigue o se empieza de nuevo; la pausa queda anotada */
  const botones = [{ id: 'seguir', texto: 'Seguir' }, enNivel ? { id: 'reiniciar', texto: 'Empezar de nuevo' } : { id: 'menu', texto: 'Menú principal' }];
  if (!enNivel && aPie.modo === 'cabina' && vuelo.enTierra && vuelo.vel.length() < 1) botones.splice(1, 0, { id: 'bajar', texto: 'Bajar del avión' });
  if (aPie.modo === 'pie') botones.splice(1, 0, { id: 'subir', texto: 'Volver a la cabina' });
  if (renderer.xr.isPresenting) botones.push({ id: 'salirVR', texto: 'Salir de VR' }); else if (vrDisponible) botones.push({ id: 'entrarVR', texto: 'Entrar en VR' });
  if (enNivel && mision.fase !== 'resultado' && mision.fase !== 'intro') registro.anotar('evento', { nombre: 'pausa' });
  ui.panel({ titulo: 'Pausa', texto: enNivel ? 'El nivel está en pausa (queda anotada). Seguí donde estabas o empezá de nuevo.' : 'El avión está detenido. Seguí donde estabas, volvé al menú o salí.', botones }, id => {
    pausado = false; ui.ocultarPanel();
    if (id === 'seguir') { if (previo) ui.panel(previo[0], previo[1]); else panelVRPendiente(); }
    else if (id === 'menu') mision.menu();
    else if (id === 'reiniciar') {   /* otra partida (la semilla del link si la hay; si no, una situación nueva): en el casco arranca de una, en la página vuelve a la pantalla de inicio */
      if (renderer.xr.isPresenting) empezarNivel(nombreActual || 'Alumno/a', SEMILLA_LINK || semillaNueva());
      else { cerrarDebrief(); registro = null; mision.fase = 'intro'; ui.tareas([]); ui.tutor('', ''); ui.cartel(''); reiniciarAvion({ enPista: true, apagado: true }); pantallaInicio(); } }
    else if (id === 'bajar') { aPie.bajar(); if (modoCamara) setTimeout(() => aplicarEscalaCamara(true), 1200); }
    else if (id === 'subir') aPie.subir(true);
    else if (id === 'salirVR') { renderer.xr.getSession()?.end(); if (previo) ui.panel(previo[0], previo[1]); }
    else if (id === 'entrarVR') { if (previo) ui.panel(previo[0], previo[1]); entrarVR().catch(e => console.warn('VR', e)); }
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
  const vel = pausado || congelado ? 0 : (window.__vel || 1); acumSim += dt * vel; const h = 1 / 120; let n = 0;
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
  if (registro && mision.fase !== 'resultado' && mision.fase !== 'intro') { registro.tic(dt * vel); registro.muestrear(vuelo); }
  mision.actualizar(dt * vel); actualizarHumo(dt); incendio.actualizar(dt); actualizarMarca(dt); actualizarPedales(dt);
  aPie.actualizar(dt, teclas, renderer.xr.isPresenting ? ejesPie : null); ejesPie.girar = 0;
  if (aPie.modo !== modoPrevio) { modoPrevio = aPie.modo; if (!renderer.xr.isPresenting) { yaw = 0; pitch = aPie.modo === 'pie' ? 0 : -0.15; } }
  botonSalir.malla.visible = renderer.xr.isPresenting;
  hudVR.malla.visible = !(debriefActual && panelVR.visible);   /* con el debrief de VR a la vista la tablilla se guarda: el panel se dibuja encima de todo y se mezclaban los textos */
  audio.actualizar(dt, { ng: vuelo.motor.ng, rpm: vuelo.motor.rpmHel, fuego: vuelo.motor.fuego, bocina: vuelo.perdida });
  for (const c of manos) { const d = panelVR.visible ? panelVR.apuntar(c) : (renderer.xr.isPresenting ? (botonSalir.apuntado(c) ?? controles.impacto(rayoDe(c))?.distance ?? null) : null); c.userData.rayo.visible = d != null; if (d != null) c.userData.rayo.scale.z = d; }
  if (hud && !renderer.xr.isPresenting) { const L = vuelo.lecturas(), m = vuelo.motor; hud.textContent = `${L.asi.toFixed(0)} mph · ${L.alt.toFixed(0)} ft · ${L.vsi.toFixed(0)} fpm · TRQ ${m.torque.toFixed(0)}% · ITT ${m.itt.toFixed(0)} · Ng ${m.ng.toFixed(0)} · hél ${m.rpmHel.toFixed(0)} · flaps ${flaps * 20}° · agua ${vuelo.agua.toFixed(0)} kg${vuelo.perdida ? ' · PÉRDIDA' : ''}${vuelo.estrellado ? ' · ACCIDENTE' : ''}`; }
  if (renderer.xr.isPresenting) { if (aPie.modo === 'cabina' && recentrarPendiente > 0) { recentrarPendiente--; if (recentrarPendiente === 0 || recentrarPendiente === 60) recentrar(); } }
  else if (giro.activo && giro.off != null) camara.quaternion.copy(giro.q);
  else camara.rotation.set(pitch, yaw, 0);
  renderer.render(escena, camara);
});
