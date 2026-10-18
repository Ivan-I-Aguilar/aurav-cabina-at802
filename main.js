// Cabina del AT-802 en VR (AURAV). Modelo: interior del Fire Boss freeware de FSX (Flight Sim Nation),
// convertido con herramientas/mdl2glb.py. Entorno: el aeródromo de AURAV (escenario.js de «Control del sector»).
// Uso interno de prueba.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { crearEscenario } from './escenario.js?v=20261016a';
import { crearRadios } from './radios.js?v=20261017a';
import { Controles } from './controles.js?v=20261017a';

const OJO = new THREE.Vector3(0, 1.15, 1.6);   // vista del piloto en el marco del modelo (adelante = −z)
const ALTURA_OJO = 2.7;                         // metros sobre la plataforma (la cabina del 802 queda alta)

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true; document.body.appendChild(renderer.domElement);

const escena = new THREE.Scene();
// niebla por distancia (no por profundidad): en Quest la bruma «saltaba» al girar la cabeza
THREE.ShaderChunk.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = length( mvPosition.xyz );\n#endif';
const ambiente = crearEscenario(escena);

// el avión queda en la plataforma mirando a la pista (+x); el GLB mira a −z, se gira 90°
const avion = new THREE.Group(); avion.rotation.y = -Math.PI / 2; avion.position.y = ALTURA_OJO - OJO.y; escena.add(avion);
const ojoMundo = avion.localToWorld(OJO.clone());

// el jugador es un grupo que lleva la cámara: en VR el casco se mueve respecto de él
const jugador = new THREE.Group(); escena.add(jugador);
const camara = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.02, 1500); camara.rotation.order = 'YXZ';
jugador.add(camara); jugador.position.copy(ojoMundo); jugador.rotation.y = -Math.PI / 2;

new GLTFLoader().load('./cabina.glb?v=20261017a', g => {
  g.scene.traverse(o => {
    if (o.name === 'm13') o.visible = false;   /* GPS: flotaba delante del panel; oculto hasta tener la foto real */
    /* exterior (fuselaje y alas, sin textura en el modelo): blanco como el AUR-AV de los otros juegos */
    if (o.isMesh && (o.name === 'm14' || o.name === 'm15')) { o.material.color.set(0xe6e6df); o.material.roughness = 0.55; }
  });
  avion.add(g.scene);
  /* el bastón de mando viene en mallas «palanca_*» (separadas en la conversión); se cuelgan de un pivote en la base */
  const partes = []; g.scene.traverse(o => { if (o.isMesh && o.name.startsWith('palanca_')) partes.push(o); });
  for (const o of partes) { o.position.sub(PIVOTE); palanca.add(o); }
  controles.armar(g.scene);
  document.getElementById('cargando').remove();
});
const controles = new Controles(avion); window.__controles = controles;
controles.alCambiar = (nombre, valor) => { console.log('control', nombre, valor); };
const PIVOTE = new THREE.Vector3(0.004, 0.22, 0.969);          // base del bastón (marco del modelo)
const INCL_NEUTRA = -0.25;                                      // el modelo lo trae inclinado a la izquierda: se endereza
const palanca = new THREE.Group(); palanca.position.copy(PIVOTE); palanca.rotation.order = 'ZXY'; palanca.rotation.z = INCL_NEUTRA; avion.add(palanca);
const PUNIO = new THREE.Vector3(0, 0.6, 0);                     // altura del puño sobre el pivote
const LIMITE = 0.3;                                             // radianes de recorrido a cada lado
let mando = { agarre: null, x: 0, z: 0 };                       // x: adelante/atrás, z: alabeo
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function actualizarPalanca(dt) {
  if (mando.agarre) {
    avion.worldToLocal(mando.agarre.getWorldPosition(tmp)); tmp.sub(PIVOTE);
    mando.x = THREE.MathUtils.clamp(Math.atan2(tmp.z, tmp.y), -LIMITE, LIMITE);
    mando.z = THREE.MathUtils.clamp(-Math.atan2(tmp.x, tmp.y), -LIMITE, LIMITE);
  } else { const k = Math.min(1, dt * 6); mando.x += (0 - mando.x) * k; mando.z += (0 - mando.z) * k; }   /* vuelve al centro */
  palanca.rotation.x = mando.x; palanca.rotation.z = INCL_NEUTRA + mando.z;
}
// manos en VR: esfera chica por control; apretando el gatillo o el grip cerca del puño se agarra el bastón
const manos = [];
for (const i of [0, 1]) {
  const c = renderer.xr.getController(i); jugador.add(c);
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf2c200 })); c.add(esfera); manos.push(c);
  c.userData.apretado = 0;
  const agarrar = () => {
    c.userData.apretado++;
    if (controles.manoVR(c, true, true)) return;               /* un switch o palanca cerca tiene prioridad */
    palanca.localToWorld(tmp.copy(PUNIO)); c.getWorldPosition(tmp2); if (tmp.distanceTo(tmp2) < 0.25) mando.agarre = c;
  };
  const soltar = () => { c.userData.apretado = Math.max(0, c.userData.apretado - 1); if (!c.userData.apretado && mando.agarre === c) mando.agarre = null; };
  c.addEventListener('selectstart', agarrar); c.addEventListener('squeezestart', agarrar);
  c.addEventListener('selectend', soltar); c.addEventListener('squeezeend', soltar);
}
// en PC: flechas del teclado mueven el bastón (para probar)
const teclas = {}; addEventListener('keydown', e => teclas[e.key] = true); addEventListener('keyup', e => teclas[e.key] = false);
const teclado = new THREE.Object3D(); avion.add(teclado);
function actualizarTeclado() {
  const ax = (teclas.ArrowDown ? 1 : 0) - (teclas.ArrowUp ? 1 : 0), az = (teclas.ArrowRight ? 1 : 0) - (teclas.ArrowLeft ? 1 : 0);
  if (ax || az) { teclado.position.set(PIVOTE.x + Math.sin(az * LIMITE) * 0.6, PIVOTE.y + 0.55, PIVOTE.z + Math.sin(ax * LIMITE) * 0.6); mando.agarre = teclado; }
  else if (mando.agarre === teclado) mando.agarre = null;
}
/* consola de radios a la derecha de la rodilla, inclinada hacia el piloto (el modelo no la trae) */
const radios = crearRadios(); radios.position.set(0.57, 0.86, 0.97); radios.rotation.set(0.08, -0.42, 0); radios.scale.setScalar(1.2); avion.add(radios);

let yaw = 0, pitch = -0.15, arr = null;
addEventListener('pointerdown', e => arr = [e.clientX, e.clientY]);
let arrIni = null; addEventListener('pointerdown', e => arrIni = [e.clientX, e.clientY]);
addEventListener('pointerup', e => {
  arr = null;
  if (arrIni && Math.hypot(e.clientX - arrIni[0], e.clientY - arrIni[1]) < 4) {   /* clic: accionar un control */
    const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camara); controles.clic(r);
  }
});
addEventListener('pointermove', e => { if (!arr) return; yaw += (e.clientX - arr[0]) * 0.004; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - arr[1]) * 0.004, -1.4, 1.4); arr = [e.clientX, e.clientY]; });
addEventListener('resize', () => { camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

const bVR = document.getElementById('vr');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { bVR.hidden = !ok; });
bVR.onclick = async () => {
  const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
  renderer.xr.setReferenceSpaceType('local-floor'); await renderer.xr.setSession(s);
  recentrarPendiente = 12;   /* se mide la altura real del casco en los primeros cuadros y se lo lleva al ojo del piloto */
  s.addEventListener('end', () => jugador.position.copy(ojoMundo));
};
// Recentrado: lleva el casco (esté el alumno sentado o parado) exactamente al ojo del piloto.
// Se hace al entrar y cada vez que se aprieta el botón del joystick o A/X en cualquier control.
let recentrarPendiente = 0, botonPrevio = false;
const cabezaW = new THREE.Vector3();
function recentrar() {
  renderer.xr.getCamera().getWorldPosition(cabezaW);
  jugador.position.add(tmp.copy(ojoMundo).sub(cabezaW));
}
function revisarBotones() {
  const ses = renderer.xr.getSession(); if (!ses) return; let ahora = false;
  for (const src of ses.inputSources) { const gp = src.gamepad; if (gp && (gp.buttons[3]?.pressed || gp.buttons[4]?.pressed)) ahora = true; }
  if (ahora && !botonPrevio) recentrarPendiente = 1; botonPrevio = ahora;
}

const relojT = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(relojT.getDelta(), 0.1); ambiente.actualizar(dt); actualizarTeclado(); actualizarPalanca(dt);
  if (renderer.xr.isPresenting) for (const c of manos) controles.manoVR(c, c.userData.apretado > 0, false);
  controles.actualizar();
  if (renderer.xr.isPresenting) { revisarBotones(); if (recentrarPendiente > 0 && --recentrarPendiente === 0) recentrar(); }
  else camara.rotation.set(pitch, yaw, 0);
  renderer.render(escena, camara);
});
