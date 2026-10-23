// Cabina del AT-802 en VR (AURAV). Modelo: interior del Fire Boss freeware de FSX (Flight Sim Nation),
// convertido con herramientas/mdl2glb.py. Entorno: el aeródromo de AURAV (escenario.js de «Control del sector»).
// Vuelo: vuelo.js (modelo simplificado). Instrumentos vivos: instrumentos.js. Controles: controles.js.
// Uso interno de prueba.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { mergeGeometries } from './BufferGeometryUtils.js';
import { crearEscenario } from './escenario.js?v=20261017a';
import { crearRadios } from './radios.js?v=20261017a';
import { Controles } from './controles.js?v=20261022e';
import { Instrumentos } from './instrumentos.js?v=20261018a';
import { Vuelo, MPH, FT } from './vuelo.js?v=20261017a';
import { Mision } from './mision.js?v=20261022b';
import { Audio } from './audio.js?v=20261018b';
import { crearAPie } from './apie.js?v=20261023a';
import { crearPanelVR } from './panelvr.js?v=20261017a';

const OJO = new THREE.Vector3(0, 1.38, 1.64);  // vista del piloto en el marco del modelo (adelante = −z): ~0,78 m sobre el asiento (0,60), por encima del tablero (1,30) para ver el horizonte
const ALTURA_CABINA = 2.0;                      // el marco de la cabina sobre el del avión: con el tren terrestre (exterior.glb) las ruedas apoyan 2 m debajo
const V = '20261017a';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });   /* alpha: en modo cámara «lugar real» se ve la cámara detrás del avión */
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
const camara = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.02, 3000); camara.rotation.order = 'YXZ';
const OJO_AVION = cabina.localToWorld(OJO.clone()); avion.worldToLocal(OJO_AVION);
jugador.add(camara); jugador.position.copy(OJO_AVION); jugador.rotation.y = -Math.PI / 2;
// posición inicial: alineado en la cabecera de la pista 36 (la pista corre por x = 30 hacia −z), mirando a −z
vuelo.pos.set(30, 0, 100); vuelo.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

/* puerta izquierda (Lichi, blender/puerta.glb): marco, vidrio de 6 mm, bisagras y manija; clip «puerta_abrir» (0 = cerrada, fin = abierta).
   Se saca el vidrio lateral original de la cabina (triángulos de m27 con las 6 esquinas VIDRIO) y se maneja con la traba roja (swTRABA). */
const VIDRIO = [[-0.619, 1.137, 0.809], [-0.609, 1.077, 0.919], [-0.569, 1.039, 1.699], [-0.391, 1.549, 1.831], [-0.4, 1.562, 1.535], [-0.404, 1.575, 1.287]].map(p => new THREE.Vector3(...p));
const puerta = { mixer: null, accion: null, dur: 1, k: 0 };
function crearPuerta(raices) {
  const esVertice = (x, y, z) => VIDRIO.some(p => Math.abs(p.x - x) < 0.003 && Math.abs(p.y - y) < 0.003 && Math.abs(p.z - z) < 0.003);
  for (const raiz of raices) raiz.traverse(o => {   /* el exterior también trae vidrio de cúpula (m28): sacarle el tramo de la puerta */
    if (!o.isMesh || o.name !== 'm28' || raiz !== raices[1] || !o.geometry.index) return;
    /* sólo lo que cae sobre el paño de la puerta: cerca de su plano y dentro de su contorno (no tocar el parabrisas de adelante) */
    const n = new THREE.Vector3().subVectors(VIDRIO[1], VIDRIO[0]).cross(new THREE.Vector3().subVectors(VIDRIO[2], VIDRIO[0])).normalize();
    const u = new THREE.Vector3().subVectors(VIDRIO[3], VIDRIO[5]).normalize(), w = new THREE.Vector3().crossVectors(n, u);
    const poli = VIDRIO.map(q => [q.clone().sub(VIDRIO[0]).dot(u), q.clone().sub(VIDRIO[0]).dot(w)]);
    const adentro = (x, y) => { let s = false; for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) { const [xi, yi] = poli[i], [xj, yj] = poli[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) s = !s; } return s; };
    const geo = o.geometry, pos = geo.attributes.position, idx = geo.index, fuera = [], c = new THREE.Vector3(), p = new THREE.Vector3();
    for (let t = 0; t < idx.count; t += 3) { c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.add(p.fromBufferAttribute(pos, idx.getX(t + k))); c.multiplyScalar(1 / 3);
      const d = c.clone().sub(VIDRIO[0]); if (!(Math.abs(d.dot(n)) < 0.08 && adentro(d.dot(u), d.dot(w)))) fuera.push(idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)); }
    geo.setIndex(fuera);
  });
  for (const raiz of raices) raiz.traverse(o => {
    if (!o.isMesh || o.name !== 'm27' || !o.geometry.index) return;
    const geo = o.geometry, pos = geo.attributes.position, idx = geo.index, fuera = [];
    for (let t = 0; t < idx.count; t += 3) { const ids = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)]; if (!ids.every(i => esVertice(pos.getX(i), pos.getY(i), pos.getZ(i)))) fuera.push(...ids); }
    geo.setIndex(fuera);
  });
  new GLTFLoader().loadAsync(`./blender/puerta.glb?v=${V_EXT}`).then(p => {
    p.scene.traverse(o => { if (o.isMesh && o.material?.transparent) { o.renderOrder = 3; o.material.depthWrite = false; } });
    cabina.add(p.scene); puerta.mixer = new THREE.AnimationMixer(p.scene);
    const clip = THREE.AnimationClip.findByName(p.animations, 'puerta_abrir');
    if (clip) { puerta.accion = puerta.mixer.clipAction(clip); puerta.accion.play(); puerta.accion.paused = true; puerta.dur = clip.duration; }
  });
}
function actualizarPuerta(dt) {
  if (!puerta.accion) return;
  const obj = controles.estado('swTRABA') === 1 ? 1 : 0;
  puerta.k += (obj - puerta.k) * Math.min(1, dt * 2.5); puerta.accion.time = puerta.k * puerta.dur; puerta.mixer.update(0);
}
let instrumentos = null, exterior = null; const V_EXT = '20261023d';
const pedales = { mixer: null, accion: null, dur: 1, vis: 0 };   /* el clip va de timón a la izquierda (0) a la derecha (dur) */
function actualizarPedales(dt) {
  if (!pedales.accion) return; pedales.vis += (pedal - pedales.vis) * Math.min(1, dt * 10);   /* con teclado el pedal salta: suavizar */
  pedales.accion.time = (THREE.MathUtils.clamp(pedales.vis, -1, 1) + 1) / 2 * pedales.dur; pedales.mixer.update(0);
}
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
  cabina.add(g.scene);
  /* exterior completo (Lichi: FSX terrestre con librea AURAV, mismo marco que la cabina); reemplaza la cáscara gris que traía la cabina */
  new GLTFLoader().loadAsync(`./exterior.glb?v=${V_EXT}`).then(e => {
    e.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = true; if (o.material?.transparent) o.renderOrder = 2; } });
    cabina.add(e.scene); exterior = e.scene;
    /* de la cáscara de la cabina (m14/m15) se queda sólo lo de adentro del habitáculo (butaca, paredes interiores); el resto lo pone el exterior */
    const dentro = new THREE.Box3(new THREE.Vector3(-0.62, 0.12, 0.75), new THREE.Vector3(0.62, 1.62, 2.45)), c = new THREE.Vector3(), p = new THREE.Vector3();
    const CUPULA = new THREE.Box3(new THREE.Vector3(-0.8, 1.0, 0.65), new THREE.Vector3(0.8, 2.1, 2.15));   /* la cúpula la pone la cabina (más fiel); al exterior se le saca */
    e.scene.traverse(o => {
      if (!o.isMesh || !o.geometry.index) return; const g2 = o.geometry, ps = g2.attributes.position, ix = g2.index, q = [];
      for (let t = 0; t < ix.count; t += 3) { c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.add(p.fromBufferAttribute(ps, ix.getX(t + k))); c.multiplyScalar(1 / 3); if (!CUPULA.containsPoint(c)) q.push(ix.getX(t), ix.getX(t + 1), ix.getX(t + 2)); }
      g2.setIndex(q);
    });
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      if (o.name === 'm9') { o.visible = false; return; }   /* disco de hélice de la cabina */
      if (o.name !== 'm14' && o.name !== 'm15') return;
      const geo = o.geometry, pos = geo.attributes.position, idx = geo.index; if (!idx) { o.visible = false; return; }
      const quedan = [], techo = [];
      for (let t = 0; t < idx.count; t += 3) { c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.add(p.fromBufferAttribute(pos, idx.getX(t + k))); c.multiplyScalar(1 / 3);
        const tri = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)]; if (dentro.containsPoint(c)) quedan.push(...tri); else if (CUPULA.containsPoint(c)) techo.push(...tri); }
      if (techo.length) {   /* chapa exterior de la cúpula: blanca lisa (la textura de la cabina pinta manchas rojas/doradas ahí) */
        const gt = geo.clone(); gt.setIndex(techo);
        const mt = new THREE.Mesh(gt, new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.55, side: THREE.DoubleSide })); mt.name = o.name + '_techo'; o.parent.add(mt); mt.position.copy(o.position); mt.quaternion.copy(o.quaternion); mt.scale.copy(o.scale);
      }
      geo.setIndex(quedan); o.visible = quedan.length > 0;
    });
    /* la cabina convertida no tenía AT_01_T (salía blanca): usar la textura del exterior (mismo atlas, misma UV) */
    let texAt01 = null; e.scene.traverse(o => { if (o.isMesh && o.name === 'm15' && o.material?.map) texAt01 = o.material.map; });
    if (texAt01) g.scene.traverse(o => { if (o.isMesh && o.name === 'm14') { o.material = o.material.clone(); o.material.map = texAt01; o.material.color.set(0xffffff); o.material.needsUpdate = true; } });
    crearPuerta([g.scene, e.scene]);
  });
  // manijas reales del cuadrante: vienen fundidas en mallas grandes; se recortan por caja (marco de la cabina) y pasan a ser palancas.
  // Las lev75/77/42 de la conversión eran varillitas del mecanismo, no las manijas: quedan fijas.
  g.scene.traverse(o => { if (o.isMesh) o.name = o.name.replace(/^lev(75|77|42)$/, 'varilla$1'); });
  const MANIJAS = [
    { nombre: 'levPOT', pivY: 0.59, escala: 0.5, piezas: [['m16', [-0.48, 0.67, 1.23], [-0.43, 0.85, 1.37]], ['m26', [-0.47, 0.585, 1.28], [-0.445, 0.78, 1.415]]] },   /* POWER: manija blanca + cuerpo gris */
    { nombre: 'levHEL', pivY: 0.19, escala: 0.25, piezas: [['m16', [-0.37, 0.70, 1.27], [-0.31, 0.76, 1.33]], ['m23', [-0.39, 0.18, 1.21], [-0.33, 0.79, 1.31]], ['m23', [-0.395, 0.685, 1.195], [-0.31, 0.82, 1.285]], ['m34', [-0.352, 0.795, 1.195], [-0.31, 0.842, 1.237]]] },   /* + mango negro y punta gris de arriba */   /* perilla azul + varilla amarilla */
    { nombre: 'swFLAPS', pivBase: true, piezas: [['m34', [-0.605, 0.66, 1.40], [-0.575, 0.708, 1.423]]] },   /* consola izquierda: switch de FLAPS */
    { nombre: 'swAUX', pivBase: true, piezas: [['m34', [-0.53, 0.646, 1.40], [-0.515, 0.686, 1.423]]] },     /* consola izquierda: el de abajo (función a confirmar) */
    { nombre: 'swFUEL', piv: [-0.617, 0.703, 0.947], eje: 'y', pos: [Math.PI / 2, Math.PI / 4, 0], inicial: 2, piezas: [['m23', [-0.628, 0.689, 0.935], [-0.606, 0.717, 0.959]], ['m23', [-0.622, 0.69, 0.882], [-0.612, 0.719, 0.976]], ['m26', [-0.628, 0.68, 0.932], [-0.605, 0.689, 0.959]]] },   /* selector de combustible: OFF · medio · BOTH (3 posiciones según Bruno; función a definir con el manual) */
    { nombre: 'swWRUD', pivBase: true, piezas: [['m23', [-0.518, 0.765, 1.349], [-0.482, 0.819, 1.403]]] },   /* perilla negra: timón de agua (WATER RUDDER) */
    /* panel FRDS (sistema de descarga): perillas giratorias y palanquitas; funciones a definir con el manual */
    { nombre: 'swK_FRDS1', piv: [-0.604, 0.864, 0.914], eje: 'z', perilla: Math.PI / 6, piezas: [['m18', [-0.616, 0.852, 0.914], [-0.592, 0.876, 0.931]]] },
    { nombre: 'swK_FRDS2', piv: [-0.557, 0.864, 0.908], eje: 'z', perilla: Math.PI / 6, piezas: [['m18', [-0.569, 0.852, 0.908], [-0.545, 0.876, 0.925]]] },
    { nombre: 'swK_FRDS3', piv: [-0.557, 0.822, 0.908], eje: 'z', perilla: Math.PI / 6, piezas: [['m18', [-0.569, 0.810, 0.908], [-0.545, 0.834, 0.925]]] },
    { nombre: 'swFRDS_A', piezas: [['m18', [-0.553, 0.944, 0.908], [-0.540, 0.956, 0.929]]] },
    { nombre: 'swFRDS_B', piezas: [['m18', [-0.508, 0.944, 0.903], [-0.495, 0.956, 0.924]]] },
    { nombre: 'swFRDS_C', piezas: [['m18', [-0.557, 0.781, 0.908], [-0.543, 0.794, 0.933]]] },
    { nombre: 'swFRDS_D', piezas: [['m18', [-0.491, 0.781, 0.901], [-0.477, 0.794, 0.925]]] },
    /* consola izquierda: perilla del compensador de timón (RUDDER TRIM), 7 posiciones de izquierda a derecha */
    { nombre: 'swK_TRIMTIMON', piv: [-0.5125, 0.663, 1.5885], eje: 'y', pos: [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1].map(k => k * Math.PI / 3), inicial: 3, piezas: [['m16', [-0.526, 0.66, 1.575], [-0.499, 0.667, 1.602]]] },
    /* traba roja de la puerta izquierda (la ventana es un paño fijo; la puerta se hará con el avión completo) */
    { nombre: 'swTRABA', piv: [-0.609, 0.9385, 1.308], eje: 'x', pos: [0, 1.2], piezas: [['m23', [-0.638, 0.899, 1.211], [-0.618, 0.956, 1.322]], ['m23', [-0.647, 0.906, 1.229], [-0.629, 0.926, 1.246]], ['m23', [-0.628, 0.915, 1.285], [-0.590, 0.962, 1.331]]] },
    { nombre: 'levCOND', pivY: 0.63, escala: 0.6, piezas: [['m2'], ['m6']] },                                                                     /* perilla gris (a confirmar) */
  ];
  for (const mj of MANIJAS) { const m = recortarManija(g.scene, mj.piezas); if (!m) continue; m.name = mj.nombre; m.userData.pivY = mj.pivY; m.userData.escala = mj.escala; m.userData.pivBase = !!mj.pivBase; if (mj.piv) m.userData.piv = mj.piv; if (mj.eje) m.userData.eje = mj.eje; for (const k of ['ang', 'pos', 'inicial', 'perilla', 'suave']) if (mj[k] != null) m.userData[k] = mj[k]; g.scene.add(m); }
  const partes = []; g.scene.traverse(o => { if (o.isMesh && o.name.startsWith('palanca_')) partes.push(o); });
  for (const o of partes) { o.position.sub(PIVOTE); palanca.add(o); }
  /* panel inferior: tapa el recuadro donde estaba el soporte del GPS (se veían los cables y el parallamas) */
  const tapa = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.31), new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.85 })); tapa.position.set(0, 1.0, 0.86); g.scene.add(tapa);
  /* palanquita para los switches que en el modelo son sólo la tuerca (F PUMP, HOPR, FRDS, WIPER) */
  const bate = mergeGeometries([new THREE.CylinderGeometry(0.0022, 0.003, 0.024, 10).rotateX(Math.PI / 2).translate(0, 0, 0.014), new THREE.SphereGeometry(0.0035, 10, 8).translate(0, 0, 0.026)]);
  /* las piezas sacadas con EXTRAER traen todo el buffer de vértices (caja de 2 m, pivote en cualquier lado): quedarse sólo con los usados */
  g.scene.traverse(o => { if (o.isMesh && /^(sw|lev)\w+$/.test(o.name) && o.geometry.index) o.geometry = o.geometry.toNonIndexed(); });
  controles.armar(g.scene);
  const matBate = new THREE.MeshStandardMaterial({ color: 0xc8c8cc, metalness: 0.6, roughness: 0.35 });
  for (const n of ['swFPUMP', 'swHOPR', 'swFRDS', 'swWIPER']) { const sw = controles.switches.find(x => x.nombre === n); if (sw) sw.grupo.add(new THREE.Mesh(bate, matBate)); }
  /* switches de 3 posiciones (arriba · medio · abajo). Qué hace cada posición: a confirmar con Bruno (AAXOD).
     Para la simulación, arriba y abajo cuentan como encendido y el medio como apagado. */
  for (const n of SW3) controles.hacerTresPosiciones(n, 0);
  /* pedales: los del modelo venían congelados a mitad de recorrido; se sacan y se cargan los de Lichi (blender/pedales.glb, clip «pedales_timon») */
  const PEDAL_VIEJO = [['m16', [-0.255, 0.263, 0.467], [-0.122, 0.499, 0.577]], ['m23', [-0.29, 0.292, 0.524], [-0.099, 0.329, 0.56]], ['m23', [-0.29, 0.28, 0.52], [-0.258, 0.601, 0.637]], ['m23', [-0.302, 0.289, 0.51], [-0.285, 0.333, 0.675]],
    ['m16', [0.12, 0.264, 0.619], [0.252, 0.5, 0.727]], ['m23', [0.097, 0.292, 0.674], [0.288, 0.329, 0.71]], ['m23', [0.256, 0.28, 0.596], [0.288, 0.601, 0.714]], ['m23', [0.282, 0.288, 0.66], [0.299, 0.333, 0.825]]];
  recortarManija(g.scene, PEDAL_VIEJO);   /* se descarta lo recortado */
  new GLTFLoader().loadAsync(`./blender/pedales.glb?v=${V}`).then(p => {
    cabina.add(p.scene); pedales.mixer = new THREE.AnimationMixer(p.scene);
    const clip = THREE.AnimationClip.findByName(p.animations, 'pedales_timon');
    if (clip) { pedales.accion = pedales.mixer.clipAction(clip); pedales.accion.play(); pedales.accion.paused = true; pedales.dur = clip.duration; }
  });
  instrumentos = new Instrumentos(cabina, datosInst);
  document.getElementById('cargando').remove();
  mision.menu();
});

// ---- controles de cabina → modelo de vuelo ----
const controles = new Controles(cabina); window.__controles = controles;
const SW = { BATT: 'sw62', ALTN: 'sw64', GEN: 'sw56', IGNTR: 'sw53', START: 'sw47', FIRE: 'sw60', FPUMP: 'swFPUMP', HYD: 'sw54', AVNC: 'sw63', PITOT: 'sw50', HOPR: 'swHOPR', FRDS: 'swFRDS', WIPER: 'swWIPER', LDG: 'sw52', DOME: 'sw49', BCN: 'sw61', NAV: 'sw51', STRB: 'sw48', SPARE: 'sw38' };
const SW3 = ['swFPUMP', 'swFRDS_D'];   /* swFRDS_D: AUTO / MAN / OFF del panel FRDS */   /* nombres de los switches de 3 posiciones */
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
  /* largado de emergencia: tecla E (la manija roja agregada se sacó; falta definir el control real con AAXOD) */
  // el arrancador vuelve solo cuando el motor enciende (en el avión es con resorte)
  if (m.encendido && controles.estado(SW.START)) { const s = controles.switches.find(x => x.nombre === SW.START); if (s) { s.estado = false; controles._aplicarSwitch(s); } }
}
let pedal = 0, frenos = 0, flaps = 0;
controles.alCambiar = (nombre, valor) => { console.log('control', nombre, valor); if (nombre === 'swFLAPS') flaps = flaps >= 1 ? 0 : flaps + 0.5; };   /* switch de flaps: 0° → 10° → 20° → 0° */

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
const radios = crearRadios(); radios.position.set(0.57, 0.86, 0.97); radios.rotation.set(0.08, -0.42, 0); radios.scale.setScalar(1.2); cabina.add(radios);

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
addEventListener('resize', () => { camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

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
    pon('levPOT', -0.72); pon('levHEL', -0.88); pon('levCOND', -0.88);
  } else {
    v.pos.set(30, 0, 100); v.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); v.enTierra = true;
    if (apagado) { Object.assign(v.motor, { encendido: false, ng: 0, torque: 0, itt: 15, rpmHel: 0, bateria: false, generador: false }); for (const n of ['BATT', 'GEN', 'ALTN', 'AVNC', 'FPUMP', 'IGNTR', 'START', 'FIRE']) sw(n, false); pon('levPOT', 0.1); pon('levHEL', 0.1); pon('levCOND', 0.1); }
    else { Object.assign(v.motor, { encendido: true, ng: 62, torque: 5, itt: 480, rpmHel: 1100, bateria: true, generador: true }); for (const n of ['BATT', 'GEN', 'AVNC', 'FPUMP']) sw(n, true); for (const n of ['IGNTR', 'START', 'FIRE']) sw(n, false); pon('levPOT', 0.1); pon('levHEL', -0.88); pon('levCOND', -0.88); }
  }
  avion.position.copy(v.pos); avion.quaternion.copy(v.q);
}
const aPie = crearAPie({ escena, avion, cabina, jugador, camara, renderer, ojoCabina: () => OJO_AVION, terreno: (x, z) => ambiente.alturaTerreno(x, z),
  alPedirSubir: tipo => { jugador.scale.setScalar(1); if (tipo === 'vr') recentrarPendiente = 1; yaw = 0; pitch = -0.15; } });
window.__aPie = aPie;
function ponerTraba(v) { const s = controles.switches.find(x => x.nombre === 'swTRABA'); if (s) { s.estado = v; controles._aplicarSwitch(s); } }
{ const subir = aPie.subir, bajar = aPie.bajar; aPie.subir = (...a) => { ponerTraba(1); subir(...a); }; aPie.bajar = (...a) => { ponerTraba(1); bajar(...a); }; }   /* la puerta se abre para pasar */
let modoPrevio = 'cabina';
ui.aPie = () => { mision.fase = 'libre'; reiniciarAvion({ enPista: true, agua: 2400, apagado: true }); mision.ui.tareas([]); aPie.bajar(false);
  mision.decir('Recorrido a pie', 'Caminá alrededor del avión. Para subir, acercate al estribo debajo del ala izquierda.'); };
const mision = new Mision({ vuelo, controles, SW, ui, obtener: { terreno: (x, z) => ambiente.alturaTerreno(x, z) }, reiniciarAvion }); window.__mision = mision;
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
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.0375), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })); m.renderOrder = 9;
  m.position.set(0.44, 1.245, 0.80); m.rotation.set(-0.15, -0.25, 0); cabina.add(m);
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
  mision.actualizar(dt * vel); luzFuego.visible = vuelo.motor.fuego && Math.floor(performance.now() / 400) % 2 === 0; actualizarHumo(dt); actualizarMarca(dt); actualizarPedales(dt); actualizarPuerta(dt);
  aPie.actualizar(dt, teclas, renderer.xr.isPresenting ? ejesPie : null); ejesPie.girar = 0;
  if (aPie.modo !== modoPrevio) { modoPrevio = aPie.modo; ponerTraba(0); if (!renderer.xr.isPresenting) { yaw = 0; pitch = aPie.modo === 'pie' ? 0 : -0.15; } }
  botonSalir.malla.visible = renderer.xr.isPresenting;
  audio.actualizar(dt, { ng: vuelo.motor.ng, rpm: vuelo.motor.rpmHel, fuego: vuelo.motor.fuego, bocina: vuelo.perdida });
  for (const c of manos) { const d = panelVR.visible ? panelVR.apuntar(c) : (renderer.xr.isPresenting ? (botonSalir.apuntado(c) ?? controles.impacto(rayoDe(c))?.distance ?? null) : null); c.userData.rayo.visible = d != null; if (d != null) c.userData.rayo.scale.z = d; }
  if (hud && !renderer.xr.isPresenting) { const L = vuelo.lecturas(), m = vuelo.motor; hud.textContent = `${L.asi.toFixed(0)} mph · ${L.alt.toFixed(0)} ft · ${L.vsi.toFixed(0)} fpm · TRQ ${m.torque.toFixed(0)}% · ITT ${m.itt.toFixed(0)} · Ng ${m.ng.toFixed(0)} · hél ${m.rpmHel.toFixed(0)} · flaps ${flaps * 20}° · agua ${vuelo.agua.toFixed(0)} kg${vuelo.perdida ? ' · PÉRDIDA' : ''}${vuelo.estrellado ? ' · ACCIDENTE' : ''}`; }
  if (renderer.xr.isPresenting) { if (aPie.modo === 'cabina' && recentrarPendiente > 0) { recentrarPendiente--; if (recentrarPendiente === 0 || recentrarPendiente === 60) recentrar(); } }
  else if (giro.activo && giro.off != null) camara.quaternion.copy(giro.q);
  else camara.rotation.set(pitch, yaw, 0);
  renderer.render(escena, camara);
});
