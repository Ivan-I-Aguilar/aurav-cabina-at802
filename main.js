// Cabina del AT-802 en VR (AURAV). Modelo: interior del Fire Boss freeware de FSX (Flight Sim Nation),
// convertido con herramientas/mdl2glb.py. Entorno: el aeródromo de AURAV (escenario.js de «Control del sector»).
// Uso interno de prueba.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { crearEscenario } from './escenario.js?v=20261016a';
import { crearRadios } from './radios.js?v=20261016a';

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

new GLTFLoader().load('./cabina.glb?v=20261016d', g => {
  g.scene.traverse(o => { if (o.name === 'm13') o.visible = false; });   /* GPS: flotaba delante del panel; oculto hasta tener la foto real */
  avion.add(g.scene); document.getElementById('cargando').remove();
});
/* consola de radios a la derecha de la rodilla, inclinada hacia el piloto (el modelo no la trae) */
const radios = crearRadios(); radios.position.set(0.55, 0.6, 1.04); radios.rotation.set(0.15, -0.45, 0); radios.scale.setScalar(1.35); avion.add(radios);

let yaw = 0, pitch = -0.15, arr = null;
addEventListener('pointerdown', e => arr = [e.clientX, e.clientY]);
addEventListener('pointerup', () => arr = null);
addEventListener('pointermove', e => { if (!arr) return; yaw += (e.clientX - arr[0]) * 0.004; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - arr[1]) * 0.004, -1.4, 1.4); arr = [e.clientX, e.clientY]; });
addEventListener('resize', () => { camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

const bVR = document.getElementById('vr');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { bVR.hidden = !ok; });
bVR.onclick = async () => {
  const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
  renderer.xr.setReferenceSpaceType('local-floor'); await renderer.xr.setSession(s);
  jugador.position.set(ojoMundo.x, ojoMundo.y - 1.2, ojoMundo.z);   // ojo sentado ≈ 1,2 m sobre el piso real
  s.addEventListener('end', () => jugador.position.copy(ojoMundo));
};

const relojT = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(relojT.getDelta(), 0.1); ambiente.actualizar(dt);
  if (!renderer.xr.isPresenting) camara.rotation.set(pitch, yaw, 0);
  renderer.render(escena, camara);
});
