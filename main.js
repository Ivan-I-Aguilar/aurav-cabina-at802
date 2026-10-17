// Cabina del AT-802 en VR (AURAV). Modelo: interior del Fire Boss freeware de FSX (Flight Sim Nation),
// convertido con herramientas/mdl2glb.py. Uso interno de prueba.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';

const OJO = new THREE.Vector3(0, 1.15, 1.6);   // vista del piloto (metros, marco del modelo)

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true; document.body.appendChild(renderer.domElement);

const escena = new THREE.Scene(); escena.background = new THREE.Color(0xa8c8e0);
escena.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.2));
const sol = new THREE.DirectionalLight(0xffffff, 1.5); sol.position.set(3, 8, -4); escena.add(sol);

// en VR el piso del jugador queda debajo del ojo: se mueve el avión, no la cámara
const avion = new THREE.Group(); escena.add(avion);
const camara = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.02, 500);
camara.position.copy(OJO); camara.rotation.order = 'YXZ';

new GLTFLoader().load('./cabina.glb?v=20261016b', g => { avion.add(g.scene); document.getElementById('cargando').remove(); });

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
  avion.position.set(-OJO.x, 1.2 - OJO.y, -OJO.z);   // ojo sentado ≈ 1,2 m sobre el piso real
  s.addEventListener('end', () => avion.position.set(0, 0, 0));
};

renderer.setAnimationLoop(() => {
  if (!renderer.xr.isPresenting) camara.rotation.set(pitch, yaw, 0);
  renderer.render(escena, camara);
});
