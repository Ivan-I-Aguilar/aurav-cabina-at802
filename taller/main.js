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
import {mergeGeometries} from '../BufferGeometryUtils.js';
import {Controles} from '../controles.js?v=20261022e';
import {Audio} from '../audio.js?v=20261112d';
import {crearPanelVR} from '../panelvr.js?v=20261112d';
import {buildEngine, STATIONS as CONJUNTOS} from './engine.js?v=20261115d';
import {initState, step, readout, FAULTS, GAUGES, CL_NAMES, FEATHER} from './motor.js?v=20261115d';
import {STATIONS, LEGEND, QUIZ, ORDER} from './content.js?v=20261115d';
import {crearHolograma, crearProyector, envolverMotor} from './holograma.js?v=20261115d';
import {crearPanel, crearPanelMotor, crearPanelEstaciones, crearPanelPreguntas, crearCartel, crearPlacaCuadrante, crearPanelAtril} from './paneles.js?v=20261115d';
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

// ------------------------------------------------------------ muebles y utilería (T5: herramientas/taller_muebles.py → muebles.glb)
// En el marco del hangar (cuelgan de él). Los rectángulos de choque vienen en userData.choques; el atril, en userData.atril.
const choquesMuebles = []; // [x0, x1, z0, z1] en el mundo
let datosAtril = null;
function lienzo(w, h, dibujar) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  dibujar(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const texturaSombra = () =>
  lienzo(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,0.9)');
    r.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
const texturaMantenimiento = () =>
  lienzo(512, 768, (g, w, h) => {
    g.fillStyle = '#f2c230';
    g.fillRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h);
    g.rect(34, 34, w - 68, h - 68);
    g.clip('evenodd');
    g.fillStyle = '#16181b';
    for (let k = -h; k < w + h; k += 64) {
      g.beginPath();
      g.moveTo(k, 0);
      g.lineTo(k + 32, 0);
      g.lineTo(k + 32 - h, h);
      g.lineTo(k - h, h);
      g.fill();
    }
    g.restore();
    g.fillStyle = '#16181b';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 92px Arial';
    g.fillText('EN', w / 2, 230);
    g.font = 'bold 74px Arial';
    g.fillText('MANTENI-', w / 2, 340, w - 90);
    g.fillText('MIENTO', w / 2, 425, w - 90);
    g.font = 'bold 34px Arial';
    g.fillText('AERONAVE FUERA', w / 2, 540, w - 90);
    g.fillText('DE SERVICIO', w / 2, 584, w - 90);
    g.fillText('NO OPERAR', w / 2, 646, w - 90);
  });
// los créditos completos, en el pizarrón de la oficina [PROVISORIO: el del Cessna se suma con el avión, en la T6]
const CREDITOS = [
  ['TALLER DE MOTORES · AURAV', 'Uso interno de prueba. Nada de lo que se ve es un procedimiento aprobado.'],
  ['El motor del holograma', 'El turbohélice genérico del simulador de escritorio de AURAV, con las cifras de la cabina del AT-802 de este proyecto.'],
  ['El AT-802', 'Exterior: modelo freeware de FSX (Flight Sim Nation), sólo para uso interno. Cabina: AURAV.'],
  ['El hangar', 'Ficticio, de AURAV: medidas y distribución inventadas.'],
  ['Programas', 'three.js (licencia MIT) · Blender.'],
];
const texturaCreditos = () =>
  lienzo(1600, 505, (g, w, h) => {
    g.fillStyle = '#f7f8f9';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f86e0';
    g.font = 'bold 54px Arial';
    g.fillText('CRÉDITOS', 40, 70);
    let y = 128;
    for (const [t, d] of CREDITOS) {
      g.fillStyle = '#16181b';
      g.font = 'bold 34px Arial';
      g.fillText(t, 40, y);
      g.fillStyle = '#4a4f55';
      g.font = '28px Arial';
      g.fillText(d, 40, y + 36, w - 80);
      y += 76;
    }
  });
if (hangar)
  try {
    const gm = await new GLTFLoader().loadAsync(`./taller/muebles.glb?v=${VERSION}`);
    gm.scene.name = 'muebles';
    gm.scene.traverse((o) => {
      if (o.userData.choques) for (const [x0, x1, z0, z1] of JSON.parse(o.userData.choques)) choquesMuebles.push([x0, x1, z0 + DESPLAZAR_HANGAR, z1 + DESPLAZAR_HANGAR]);
      if (o.userData.atril) datosAtril = JSON.parse(o.userData.atril);
      if (!o.isMesh) return;
      const n = o.material.name || '';
      if (n.includes('muebles_vidrio')) o.material = new THREE.MeshStandardMaterial({color: 0xcfe3ef, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0, depthWrite: false, side: THREE.DoubleSide});
      else if (n.includes('muebles_sombra')) {
        o.material = new THREE.MeshBasicMaterial({color: 0x000000, map: texturaSombra(), transparent: true, opacity: 0.55, depthWrite: false});
        o.renderOrder = 1;
      } else if (n.includes('pizarron') || n.includes('cartel_mantenimiento')) {
        const t = n.includes('pizarron') ? texturaCreditos() : texturaMantenimiento();
        t.flipY = false; // las coordenadas de textura del glTF ya vienen con v hacia abajo (con flipY el texto salía dado vuelta)
        o.material = new THREE.MeshBasicMaterial({map: t, toneMapped: false, side: THREE.DoubleSide});
      } else {
        o.material.metalness = 0.1;
        o.material.roughness = 0.75;
        o.material.needsUpdate = true;
      }
    });
    hangar.add(gm.scene);
  } catch (e) {
    console.warn('taller: muebles.glb no cargó', e);
  }
// ------------------------------------------------------------ el banco de componentes (T8, tramo 1 adelantado: taller_piezas.py → piezas.glb)
// Al costado derecho del alumno, de frente a la mesa. Las seis piezas a tamaño real [medidas VERIFICAR], cada una suelta (pieza_*,
// con userData {pieza, nombre, estacion, bandeja}) para agarrarlas en la T8; el riel con los nombres lo dibuja el juego. Marco del mundo.
let banco = null;
const piezasBanco = {};
try {
  const gp = await new GLTFLoader().loadAsync(`./taller/piezas.glb?v=${VERSION}`);
  gp.scene.name = 'banco-componentes';
  gp.scene.traverse((o) => {
    if (o.userData.banco) banco = JSON.parse(o.userData.banco);
    if (o.userData.pieza) piezasBanco[o.userData.pieza] = o;
    if (o.isMesh) {
      o.material.metalness = o.material.name.includes('pieza') ? 0.3 : 0.1; // sin mapa de ambiente, el metal muy metálico se ve negro
      o.material.roughness = o.material.name.includes('pieza') ? 0.42 : 0.75;
      o.material.needsUpdate = true;
    }
  });
  escena.add(gp.scene);
  if (banco) {
    const [x0, x1, z0, z1] = banco.caja;
    choquesMuebles.push([x0, x1, z0, z1]);
    // el riel de los nombres: entre el canto del banco y las bandejas, inclinado 35° hacia el alumno
    const largo = z1 - z0;
    const riel = crearPanel({ancho: largo, alto: 0.1, px: 2400, nombre: 'riel-banco'});
    const {g, W, H} = riel;
    g.fillStyle = '#16181b';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffcf4a';
    g.fillRect(0, 0, W, 8);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const b of banco.bandejas) {
      // la placa mira a −x: su +u (derecha del que la lee) va hacia +z
      const u = ((b.centro[2] - z0) / largo) * W;
      g.font = 'bold 44px Arial';
      g.fillStyle = '#ffffff';
      g.fillText(b.nombre || '', u, H * 0.42, (W / banco.bandejas.length) * 0.94);
      g.font = 'bold 26px Arial';
      g.fillStyle = '#9fa6ad';
      g.fillText('[VERIFICAR]', u, H * 0.8);
    }
    riel.pintado();
    const inc = THREE.MathUtils.degToRad(35);
    riel.malla.rotation.set(0, -Math.PI / 2, 0, 'YXZ');
    riel.malla.rotateX(-(Math.PI / 2 - inc));
    riel.malla.position.set(x0 + 0.06, banco.tapa_y + 0.03, (z0 + z1) / 2);
    escena.add(riel.malla);
  }
} catch (e) {
  console.warn('taller: piezas.glb no cargó', e);
}

// ------------------------------------------------------------ carteles de seguridad genéricos (reserva de la T5): un atlas, una llamada
// Sin marcas ni logos; los pictogramas son figuras simples [PROVISORIO]. Marco del hangar (cuelgan de él).
function atlasSeguridad() {
  const T = 512;
  return lienzo(4 * T, 2 * T, (g) => {
    const centrado = (t, x, y, tam, color = '#16181b') => {
      g.font = `bold ${tam}px Arial`;
      g.fillStyle = color;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(t, x, y, T - 50);
    };
    const tile = (k, fondo) => {
      const x = (k % 4) * T;
      const y = Math.floor(k / 4) * T;
      g.fillStyle = fondo;
      g.fillRect(x + 6, y + 6, T - 12, T - 12);
      return [x, y];
    };
    // 0 · prohibido fumar
    let [x, y] = tile(0, '#ffffff');
    g.fillStyle = '#8a8f96';
    g.fillRect(x + 130, y + 175, 230, 40);
    g.fillStyle = '#e8732a';
    g.fillRect(x + 360, y + 175, 30, 40);
    g.lineWidth = 34;
    g.strokeStyle = '#d6182b';
    g.beginPath();
    g.arc(x + 256, y + 195, 150, 0, Math.PI * 2);
    g.moveTo(x + 150, y + 89);
    g.lineTo(x + 362, y + 301);
    g.stroke();
    centrado('PROHIBIDO', x + 256, y + 400, 64);
    centrado('FUMAR', x + 256, y + 462, 64);
    // 1 · protección auditiva obligatoria
    [x, y] = tile(1, '#ffffff');
    g.fillStyle = '#1f5fae';
    g.beginPath();
    g.arc(x + 256, y + 190, 160, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 26;
    g.beginPath();
    g.arc(x + 256, y + 200, 92, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(x + 140, y + 180, 56, 100, 22);
    g.roundRect(x + 316, y + 180, 56, 100, 22);
    g.fill();
    centrado('USO OBLIGATORIO DE', x + 256, y + 400, 40);
    centrado('PROTECCIÓN AUDITIVA', x + 256, y + 455, 44);
    // 2 y 3 · salida (flecha a la derecha y a la izquierda)
    for (const [k, flecha] of [[2, '→'], [3, '←']]) {
      [x, y] = tile(k, '#1f8f4e');
      g.strokeStyle = '#ffffff';
      g.lineWidth = 16;
      g.strokeRect(x + 176, y + 60, 160, 230);
      centrado(flecha, x + 256, y + 180, 150, '#ffffff');
      centrado('SALIDA', x + 256, y + 400, 92, '#ffffff');
    }
    // 4 · atención hélice
    [x, y] = tile(4, '#ffffff');
    g.fillStyle = '#f2c230';
    g.strokeStyle = '#16181b';
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(x + 256, y + 40);
    g.lineTo(x + 446, y + 330);
    g.lineTo(x + 66, y + 330);
    g.closePath();
    g.fill();
    g.stroke();
    centrado('!', x + 256, y + 222, 190);
    centrado('NO PASAR FRENTE', x + 256, y + 400, 50);
    centrado('A LA HÉLICE', x + 256, y + 458, 50);
  });
}
const CARTELES_SEGURIDAD = [
  // [tile, x, y, z, giro (rad sobre la vertical: 0 = mira a +z), lado (m)]
  [0, -17.5, 2.6, -0.07, Math.PI, 0.6], // prohibido fumar: frente, adentro, a la izquierda del portón
  [0, 10.2, 2.75, -59.93, 0, 0.6], // y sobre los bancos
  [1, -19.93, 2.7, -18.5, Math.PI / 2, 0.6], // protección auditiva: junto al AT-802
  [1, -6.0, 2.75, -59.93, 0, 0.6], // y en el fondo, junto al taller
  [3, -19.93, 2.7, -4.0, Math.PI / 2, 0.55], // salida: el portón queda a la izquierda de quien mira la pared izquierda
  [2, 19.93, 2.7, -4.0, -Math.PI / 2, 0.55], // y a la derecha de quien mira la pared derecha
  [4, -19.93, 2.7, -11.0, Math.PI / 2, 0.6], // atención hélice
];
function crearCartelesSeguridad() {
  const geos = CARTELES_SEGURIDAD.map(([k, x, y, z, giro, lado]) => {
    const g = new THREE.PlaneGeometry(lado, lado);
    const uv = g.attributes.uv;
    const col = k % 4;
    const fila = Math.floor(k / 4);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.25 * (col + uv.getX(i)), 0.5 * (1 - fila) + 0.5 * uv.getY(i) - 0.0);
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(giro).setPosition(x, y, z));
    return g;
  });
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial({map: atlasSeguridad(), color: 0xe4e4e4}));
  m.name = 'carteles-seguridad';
  return m;
}
if (hangar) hangar.add(crearCartelesSeguridad());
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
// el camino del modo piloto (T7, adelantado): lo que el alumno ya vio e hizo, para el resumen del final y la pausa [PROVISORIO]
const camino = {estaciones: new Set(), fallas: new Set(), arranco: false, enCurso: false, preguntas: null};
function resumenCamino(conPreguntas = true) {
  const p = camino.preguntas === null ? 'sin hacer' : `${camino.preguntas} de ${QUIZ.length}`;
  return `Estaciones vistas: ${camino.estaciones.size} de ${STATIONS.length} · Fallas probadas: ${camino.fallas.size} de 5 · Arranque normal: ${camino.arranco ? 'hecho' : 'falta'}` + (conPreguntas ? ` · Preguntas: ${p}` : '');
}
const preguntas = crearPanelPreguntas({quiz: QUIZ, orden: ORDER, resumen: () => resumenCamino(false)}); // el puntaje ya está grande arriba
preguntas.malla.position.set(0, 1.48, 0.2); // delante de la cara del holograma (z 0,17): en 0,1 el flujo tapaba «Otra vez»
preguntas.malla.visible = false;
preguntas.malla.renderOrder = 12;
escena.add(preguntas.malla);
const paneles = [panelMotor, panelEstaciones, preguntas];
// el panel del atril de partida (T5): sobre la cabeza inclinada del atril de muebles.glb
let panelAtril = null;
if (datosAtril) {
  panelAtril = crearPanelAtril({leyenda: LEGEND});
  const [x, y, z] = datosAtril.centro;
  const inc = THREE.MathUtils.degToRad(datosAtril.inclinacion_grados);
  panelAtril.malla.rotation.x = -(Math.PI / 2 - inc); // la normal queda (0, cos inc, sin inc): hacia el que llega por el portón
  panelAtril.malla.position.set(x, y, z + DESPLAZAR_HANGAR).addScaledVector(new THREE.Vector3(0, Math.cos(inc), Math.sin(inc)), 0.004);
  escena.add(panelAtril.malla);
  panelAtril.actualizar();
  paneles.push(panelAtril);
}
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
  camino.enCurso = inp.fault === 'none'; // un arranque normal cuenta cuando llega a ralentí
}
function arrancar() {
  if (s.ng >= 25) return;
  if (inp.fault !== 'none' && !FAULTS[inp.fault].start) inp.fault = 'none';
  apagar();
  pulsarArranque();
}
function ponerFalla(k) {
  if (k === 'none') return aRalenti();
  camino.fallas.add(k);
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
  if (estacion) {
    camino.estaciones.add(estacion);
    decirEstacion(estacion);
  }
}
// la voz del tutor (T7, tramo 2): la frase de cada estación y el aviso de cada falla, con los WAV de voz/ (Sabina, voces.py)
function decirEstacion(n) {
  const st = STATIONS.find((x) => x.n === n);
  if (st) audio.decir(st.text);
}
let alertaAntes = false;
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
  if (recorrido.tPrev < FAULT_T && t >= FAULT_T) {
    const yaProbada = camino.fallas.has('hot');
    ponerFalla('hot');
    if (!yaProbada) camino.fallas.delete('hot'); // la que muestra el recorrido no cuenta como probada por el alumno
  }
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
    if (st) {
      camino.estaciones.add(st);
      decirEstacion(st);
    }
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
    const e = preguntas.estado;
    if (e.pregunta >= QUIZ.length) camino.preguntas = Math.max(camino.preguntas ?? 0, e.puntaje);
  } else if (a.tipo === 'panel' && a.id.startsWith('f_')) ponerFalla(a.id.slice(2));
  else if (a.tipo === 'panel' && /^st\d$/.test(a.id)) ponerEstacion(+a.id.slice(2));
  else if (a.id === 'v_corte') corte = true;
  else if (a.id === 'v_completo') corte = false;
  else if (a.id === 'v_flujo') flujo = flujo ? 0 : 1;
  else if (a.id === 'v_recorrido') recorrido.activo ? pararRecorrido() : iniciarRecorrido();
  else if (a.id === 'v_preguntas') preguntasAbiertas ? cerrarPreguntas() : abrirPreguntas();
  else if (a.id === 'v_mesa') poseManual = false;
  else if (a.id === 'modo_piloto') saltarA('mesa');
  else if (a.id === 'modo_mecanico') return true; // en preparación (T8): el botón se ve apagado
  else if (a.id.startsWith('ir_')) saltarA(a.id.slice(3));
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
  // la mesa y los muebles: se sale del rectángulo (con 25 cm de cuerpo) por el lado más cercano
  const mx = MESA.ancho / 2;
  const mz = MESA.fondo / 2;
  for (const [x0, x1, z0, z1] of [[-mx, mx, -mz, mz], ...choquesMuebles]) {
    const a = x0 - 0.25;
    const b = x1 + 0.25;
    const c = z0 - 0.25;
    const d = z1 + 0.25;
    if (p.x <= a || p.x >= b || p.z <= c || p.z >= d) continue;
    const salidas = [p.x - a, b - p.x, p.z - c, d - p.z];
    const i = salidas.indexOf(Math.min(...salidas));
    if (i === 0) p.x = a;
    else if (i === 1) p.x = b;
    else if (i === 2) p.z = c;
    else p.z = d;
  }
}
const antesDeCaminar = new THREE.Vector3();
function caminar(dt, ejeX, ejeY) {
  if (!ejeX && !ejeY) return;
  camara.getWorldDirection(tmp);
  tmp.y = 0;
  tmp.normalize();
  tmp2.set(-tmp.z, 0, tmp.x);
  antesDeCaminar.copy(jugador.position);
  jugador.position.addScaledVector(tmp, -ejeY * 1.5 * dt).addScaledVector(tmp2, ejeX * 1.5 * dt);
  limitar(jugador.position);
  // el avión: si el paso entra en una celda ocupada, se desliza por el eje que quede libre o no se mueve (si ya estaba adentro, por
  // un salto o al entrar en VR, se lo deja salir)
  if (bloqueado(jugador.position.x, jugador.position.z) && !bloqueado(antesDeCaminar.x, antesDeCaminar.z)) {
    const {x, z} = jugador.position;
    if (!bloqueado(x, antesDeCaminar.z)) jugador.position.z = antesDeCaminar.z;
    else if (!bloqueado(antesDeCaminar.x, z)) jugador.position.x = antesDeCaminar.x;
    else jugador.position.copy(antesDeCaminar);
  }
}
// ------------------------------------------------------------ el AT-802 en su puesto (T6, tramo 1 adelantado)
// juegos/at802.glb: el MISMO avión del simulador y de los otros juegos (juegos/LEEME.md); en este repo se carga de ahí, no se copia.
// Su marco: +x nariz, +y arriba, +z derecha, origen en el piso entre las ruedas principales. En H3 (marco del hangar: x −19…−1,
// z −24…−11) va con la nariz al portón (rotation.y = −π/2) y las ruedas principales en (−10; −14,5) [PROVISORIO].
const AT802 = {x: -10, z: -14.5, v: '20261115a'};
let avionAT = null;
// el choque con el avión: sus triángulos que bajan de 1,9 m (el ala, la cola, el tren), rasterizados en planta en una grilla de 20 cm
const GRILLA = {paso: 0.2, x0: 0, z0: 0, nx: 0, nz: 0, celdas: null};
function bloqueado(x, z, r = 0.25) {
  if (!GRILLA.celdas) return false;
  const {paso, x0, z0, nx, nz, celdas} = GRILLA;
  for (let i = Math.floor((x - r - x0) / paso); i <= Math.floor((x + r - x0) / paso); i++)
    for (let j = Math.floor((z - r - z0) / paso); j <= Math.floor((z + r - z0) / paso); j++)
      if (i >= 0 && j >= 0 && i < nx && j < nz && celdas[j * nx + i]) return true;
  return false;
}
function rasterizarChoque(raiz, alto = 1.9) {
  raiz.updateWorldMatrix(true, true);
  const caja = new THREE.Box3().setFromObject(raiz);
  const {paso} = GRILLA;
  GRILLA.x0 = caja.min.x - paso;
  GRILLA.z0 = caja.min.z - paso;
  GRILLA.nx = Math.ceil((caja.max.x - caja.min.x) / paso) + 2;
  GRILLA.nz = Math.ceil((caja.max.z - caja.min.z) / paso) + 2;
  const celdas = new Uint8Array(GRILLA.nx * GRILLA.nz);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const marcar = (x, z) => {
    const i = Math.floor((x - GRILLA.x0) / paso);
    const j = Math.floor((z - GRILLA.z0) / paso);
    if (i >= 0 && j >= 0 && i < GRILLA.nx && j < GRILLA.nz) celdas[j * GRILLA.nx + i] = 1;
  };
  const lado = (px, pz, p, q) => (q.x - p.x) * (pz - p.z) - (q.z - p.z) * (px - p.x);
  raiz.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let t = 0; t < n; t += 3) {
      const ia = idx ? idx.getX(t) : t;
      const ib = idx ? idx.getX(t + 1) : t + 1;
      const ic = idx ? idx.getX(t + 2) : t + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld);
      if (Math.min(a.y, b.y, c.y) > alto) continue;
      marcar(a.x, a.z);
      marcar(b.x, b.z);
      marcar(c.x, c.z);
      const area = lado(c.x, c.z, a, b);
      if (Math.abs(area) < 1e-6) continue;
      for (let x = Math.min(a.x, b.x, c.x); x <= Math.max(a.x, b.x, c.x); x += paso)
        for (let z = Math.min(a.z, b.z, c.z); z <= Math.max(a.z, b.z, c.z); z += paso) {
          const s1 = lado(x, z, a, b) * area;
          const s2 = lado(x, z, b, c) * area;
          const s3 = lado(x, z, c, a) * area;
          if (s1 >= 0 && s2 >= 0 && s3 >= 0) marcar(x, z);
        }
    }
  });
  GRILLA.celdas = celdas;
  return celdas.reduce((s, v) => s + v, 0);
}
if (hangar)
  try {
    const ga = await new GLTFLoader().loadAsync(`./juegos/at802.glb?v=${AT802.v}`);
    avionAT = ga.scene;
    avionAT.name = 'AT-802';
    avionAT.rotation.y = -Math.PI / 2; // la nariz (+x) al portón (+z del hangar)
    avionAT.position.set(AT802.x, 0, AT802.z);
    avionAT.traverse((o) => {
      if (o.isMesh && o.material.transparent) {
        o.material.depthWrite = false; // como prepararAvion de juegos/at802glb.js
        o.renderOrder = 2;
      }
    });
    hangar.add(avionAT);
    AT802.celdas = rasterizarChoque(avionAT);
  } catch (e) {
    console.warn('taller: juegos/at802.glb no cargó', e);
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
  jugador.rotation.set(0, yaw, 0); // se entra en VR donde se estaba y mirando para el mismo lado
  audio.iniciar(); // el Quest suspende el audio al entrar en VR: se reanuda acá y en cada gesto
  // pausa si se saca el casco (o si el sistema tapa la escena con su menú)
  const ses = renderer.xr.getSession();
  ses.addEventListener('visibilitychange', () => {
    if (ses.visibilityState !== 'visible' && !panelVR.visible) abrirPausa();
  });
});
function abrirPausa() {
  const botones = [{id: 'seguir', texto: 'Seguir'}, {id: 'ralenti', texto: 'Motor a ralentí'}, {id: 'ir_mesa', texto: 'A la mesa'}, {id: 'ir_partida', texto: 'A la partida'}];
  if (hangar) botones.push({id: 'ir_at802', texto: 'Al AT-802'}, {id: 'ir_cessna', texto: 'Al Cessna'}, {id: 'ir_bancos', texto: 'A los bancos'});
  botones.push({id: 'salir', texto: 'Salir de VR'});
  panelVR.mostrar(
    {titulo: 'TALLER DE MOTORES · PAUSA', texto: `${LEGEND}\n\nEl motor sigue en el estado en que lo dejaste.\n${resumenCamino()}`, botones},
    (id) => {
      panelVR.ocultar();
      if (id === 'ralenti') aRalenti();
      else if (id.startsWith('ir_')) saltarA(id.slice(3));
      else if (id === 'salir') renderer.xr.getSession()?.end();
    },
    renderer.xr.isPresenting ? renderer.xr.getCamera() : camara,
  );
}
renderer.xr.addEventListener('sessionend', () => {
  botonVR.textContent = 'Entrar en VR';
  yaw = jugador.rotation.y;
  jugador.rotation.set(0, 0, 0);
  camara.position.set(0, ALTURA_OJOS, 0);
});

// ------------------------------------------------------------ saltos con fundido (T5): partida, mesa, AT-802, Cessna, bancos, oficina
// Nunca un movimiento forzado de la cámara: fundido a negro, se pone la CABEZA en el destino mirando hacia yaw, y se vuelve. Marco del
// mundo (z del hangar + 45); yaw 0 = mirando hacia el fondo (−z). [PROVISORIO: el AT-802 y el Cessna se afinan con los aviones, T6]
const DESTINOS = {
  partida: {x: 0, z: 39.95, yaw: 0, pitch: -0.52}, // a 0,95 m del atril: el panel entero entre 18° y 42° hacia abajo
  mesa: {x: INICIO.pos.x, z: INICIO.pos.z, yaw: INICIO.yaw, pitch: INICIO.pitch},
  at802: {x: -10, z: 37.5, yaw: 0, pitch: -0.12},
  cessna: {x: 9, z: 35.5, yaw: 0, pitch: -0.12},
  bancos: {x: 10.2, z: -12.4, yaw: 0, pitch: -0.1},
  oficina: {x: -17, z: -10.9, yaw: 0, pitch: -0.05},
};
const fundido = new THREE.Mesh(
  new THREE.SphereGeometry(0.25, 16, 8),
  new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false}),
);
fundido.name = 'fundido';
fundido.renderOrder = 999;
fundido.visible = false;
camara.add(fundido);
let salto = null;
const eSalto = new THREE.Euler(0, 0, 0, 'YXZ');
function ponerEn(d) {
  if (renderer.xr.isPresenting) {
    eSalto.setFromQuaternion(camara.quaternion, 'YXZ'); // la cabeza, relativa al jugador
    jugador.rotation.set(0, d.yaw - eSalto.y, 0);
    const c = Math.cos(jugador.rotation.y);
    const s_ = Math.sin(jugador.rotation.y);
    const hx = camara.position.x;
    const hz = camara.position.z;
    jugador.position.set(d.x - (hx * c + hz * s_), 0, d.z - (-hx * s_ + hz * c));
  } else {
    jugador.position.set(d.x, 0, d.z);
    yaw = d.yaw;
    pitch = d.pitch;
  }
}
function saltarA(nombre) {
  const d = DESTINOS[nombre];
  if (!d || salto) return false;
  salto = {d, t: 0, movido: false};
  pararRecorrido();
  return true;
}
function pasoSalto(dt) {
  if (!salto) return;
  salto.t += dt;
  if (!salto.movido && salto.t >= 0.25) {
    ponerEn(salto.d);
    salto.movido = true;
  }
  const t = salto.t;
  fundido.material.opacity = t < 0.25 ? t / 0.25 : t < 0.35 ? 1 : Math.max(0, 1 - (t - 0.35) / 0.3);
  fundido.visible = fundido.material.opacity > 0.001;
  if (t >= 0.65) salto = null;
}
// se arranca en la partida (H2, junto al portón), salvo ?inicio=mesa
if (panelAtril && PARAM.get('inicio') !== 'mesa') ponerEn(DESTINOS.partida);
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
// «cerca» = dentro de la caja de los cuerpos del motor más 6 cm. Antes era una esfera de 0,5 m alrededor del centro, que llegaba a
// las puntas de las palancas: un grip que erraba la palanca por poco agarraba el holograma (lo encontró probarMandos, 15/11)
const cajaHolo = new THREE.Box3();
const cajaTmp = new THREE.Box3();
function cercaDelHolograma(c) {
  c.getWorldPosition(tmp);
  cajaHolo.makeEmpty();
  for (const o of holo ? holo.cuerpos.map((x) => x.malla) : [motorGrupo]) cajaHolo.union(cajaTmp.setFromObject(o));
  return cajaHolo.expandByScalar(0.06).containsPoint(tmp);
}
// con la cabeza adentro del holograma (agrandado a tamaño real, para caminarlo) las capas aditivas se apilan y no se ve nada: se
// apaga de a poco, hasta el 20 % a 25 cm adentro de la caja de los cuerpos (en el marco del motor: la caja no crece al girarlo)
const cajaLocalHolo = new THREE.Box3();
if (holo) {
  motorGrupo.updateMatrixWorld(true);
  const inv = motorGrupo.matrixWorld.clone().invert();
  for (const {malla} of holo.cuerpos) {
    malla.geometry.computeBoundingBox();
    cajaLocalHolo.union(cajaTmp.copy(malla.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, malla.matrixWorld)));
  }
}
const ojoLocal = new THREE.Vector3();
function brilloPorCabeza() {
  if (!holo) return 1;
  (renderer.xr.isPresenting ? renderer.xr.getCamera() : camara).getWorldPosition(ojoLocal);
  motorGrupo.worldToLocal(ojoLocal);
  const {min, max} = cajaLocalHolo;
  const adentro = Math.min(ojoLocal.x - min.x, max.x - ojoLocal.x, ojoLocal.y - min.y, max.y - ojoLocal.y, ojoLocal.z - min.z, max.z - ojoLocal.z);
  return adentro <= 0 ? 1 : 1 - 0.8 * ss(0, 0.25, adentro * motorGrupo.scale.x);
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

// ------------------------------------------------------------ prueba de los mandos de VR sin casco (reserva de la T2)
// Pone los dos controles de renderer.xr (los mismos objetos que mueve el casco: hijos del jugador, con la matriz puesta a mano como la
// pone WebXR) donde iría la mano y corre el mismo código del cuadro de VR: manosVR() y el evento selectstart. Cubre el grip en las
// palancas, el gatillo en los paneles, en los botones de la mesa y en la pausa, y agarrar el holograma con una y con dos manos. No
// cubre el seguimiento real, los botones del gamepad (B/Y, joysticks) ni cómo se siente: eso, sólo en el Quest.
const vUno = new THREE.Vector3(1, 1, 1);
const ADELANTE = new THREE.Vector3(0, 0, -1);
function ponerMano(c, pos, mirarA = null, quat = null) {
  jugador.updateMatrixWorld(true);
  const q = quat ? quat.clone() : new THREE.Quaternion();
  if (mirarA) q.setFromUnitVectors(ADELANTE, mirarA.clone().sub(pos).normalize());
  c.matrix.multiplyMatrices(new THREE.Matrix4().copy(jugador.matrixWorld).invert(), new THREE.Matrix4().compose(pos, q, vUno));
  c.matrix.decompose(c.position, c.quaternion, c.scale);
  c.updateMatrixWorld(true);
}
function cuadroVR(n = 1) {
  for (let i = 0; i < n; i++) {
    manosVR();
    sincronizarPalancas(1 / 72);
  }
}
const apretarGrip = (c) => Object.assign(c.userData, {grip: true, gripNuevo: true});
const soltarGrip = (c) => (c.userData.grip = false);
/** la punta de una palanca con el ángulo a (lógico, −0,9 adelante … 0,15 atrás), en el mundo */
function puntaCon(p, a) {
  raizMesa.updateWorldMatrix(true, false);
  const t = a * p.escala;
  return raizMesa.localToWorld(p.pivote.clone().add(new THREE.Vector3(0, p.alto * Math.cos(t), p.alto * Math.sin(t))));
}
/** apunta la mano a un punto desde 40 cm (del lado del alumno) y aprieta el gatillo */
function gatilloEn(c, punto, normal) {
  ponerMano(c, punto.clone().addScaledVector(normal, 0.4), punto);
  c.dispatchEvent({type: 'selectstart'});
  cuadroVR();
}
/** las pruebas no tienen que dejar marcas en el camino del alumno */
const guardarCamino = () => ({...camino, estaciones: new Set(camino.estaciones), fallas: new Set(camino.fallas)});
const restaurarCamino = (c) => Object.assign(camino, c);
function probarMandos() {
  const caminoAntes = guardarCamino();
  const vozAntes = audio.vozOn;
  audio.vozOn = false; // que la prueba no hable
  const res = [];
  const ok = (prueba, cond, dato) => res.push({prueba, ok: !!cond, dato});
  const [m0, m1] = manos;
  const lejos = new THREE.Vector3(0, -5, 0); // bajo el piso: fuera del alcance de todo
  const v = new THREE.Vector3();
  pararRecorrido();
  cerrarPreguntas();
  if (panelVR.visible) panelVR.ocultar();
  poseManual = false;
  for (const c of manos) {
    soltarGrip(c);
    ponerMano(c, lejos);
  }
  cuadroVR();
  if (controles) {
    const pal = (n) => controles.palancas.find((p) => p.nombre === n);
    // 1) POTENCIA: grip en la punta (atrás, ralentí) y la mano la lleva adelante por su arco
    const pla = pal('levPLA');
    inp.pla = 0;
    sincronizarPalancas(1);
    ponerMano(m0, puntaCon(pla, A_MAX));
    apretarGrip(m0);
    cuadroVR();
    ok('grip en la punta de POTENCIA la agarra', pla.agarre === m0);
    for (let k = 1; k <= 12; k++) {
      ponerMano(m0, puntaCon(pla, A_MAX + ((A_MIN - A_MAX) * k) / 12));
      cuadroVR();
    }
    ok('la mano adelante → potencia 100 %', inp.pla > 0.97, +inp.pla.toFixed(3));
    soltarGrip(m0);
    cuadroVR();
    ok('al soltar, la palanca queda suelta y en su lugar', !pla.agarre && inp.pla > 0.97 && Math.abs(pla.ang - A_MIN) < 0.03, +pla.ang.toFixed(3));
    // 2) CONDICIÓN: soltada entre muescas va a la más cercana
    const cl = pal('levCL');
    inp.cl = 0;
    sincronizarPalancas(1);
    ponerMano(m0, puntaCon(cl, MUESCAS[0]));
    apretarGrip(m0);
    cuadroVR();
    for (let k = 1; k <= 8; k++) {
      ponerMano(m0, puntaCon(cl, MUESCAS[0] + ((-0.33 - MUESCAS[0]) * k) / 8));
      cuadroVR();
    }
    soltarGrip(m0);
    cuadroVR(60);
    ok('CONDICIÓN soltada cerca de la muesca del medio → RALENTÍ BAJO', inp.cl === 1 && Math.abs(cl.ang - MUESCAS[1]) < 0.01, {cl: inp.cl, ang: +cl.ang.toFixed(3)});
    // 3) HÉLICE atrás → bandera
    const prop = pal('levPROP');
    inp.prop = 1;
    sincronizarPalancas(1);
    ponerMano(m1, puntaCon(prop, A_MIN));
    apretarGrip(m1);
    cuadroVR();
    for (let k = 1; k <= 12; k++) {
      ponerMano(m1, puntaCon(prop, A_MIN + ((A_MAX - A_MIN) * k) / 12));
      cuadroVR();
    }
    soltarGrip(m1);
    cuadroVR();
    ok('HÉLICE atrás → bandera', inp.prop < FEATHER, +inp.prop.toFixed(3));
    // 4) un grip que no llega (15 cm antes de la punta, del lado del alumno) no agarra nada: ni la palanca ni el holograma. (A 12 cm
    // agarra la HÉLICE, que está a 9 cm: controles.js toma la punta más cercana a menos de 10 cm. Y 12 cm por ENCIMA de la punta de
    // POTENCIA agarra el holograma, y está bien: es 5 cm más allá de su punta derecha)
    ponerMano(m0, puntaCon(pla, -0.4).add(new THREE.Vector3(0, 0, 0.15)));
    apretarGrip(m0);
    cuadroVR();
    ok('grip 15 cm antes de una palanca no agarra nada', controles.palancas.every((p) => !p.agarre) && !agarreHolo.length, {
      palancas: controles.palancas.filter((p) => p.agarre).map((p) => p.nombre),
      holograma: agarreHolo.length,
      mano: m0.getWorldPosition(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3)),
    });
    soltarGrip(m0);
    cuadroVR();
  } else ok('mesa.glb con las palancas', false, 'no cargó');
  // 5) gatillo en los paneles: una estación, una falla, CORTE
  const normal = (m) => new THREE.Vector3(0, 0, 1).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion()));
  for (const [panel, id, cond, txt] of [
    [panelEstaciones, 'st3', () => estacion === 3, 'gatillo en ESTACIÓN 3'],
    [panelEstaciones, 'v_corte', () => corte === true, 'gatillo en CORTE'],
    [panelMotor, 'f_hot', () => inp.fault === 'hot', 'gatillo en ARRANQUE CALIENTE'],
    [panelMotor, 'f_none', () => inp.fault === 'none', 'gatillo en SIN FALLA'],
  ]) {
    gatilloEn(m1, panel.centro(id, v), normal(panel.malla));
    ok(txt, cond(), {id});
  }
  // 6) gatillo en el botón A RALENTÍ de la mesa
  const btn = botones3D.btnRALENTI;
  if (btn) {
    inp.pla = 0.7;
    btn.malla.geometry.computeBoundingSphere();
    const centro = btn.malla.localToWorld(btn.malla.geometry.boundingSphere.center.clone());
    gatilloEn(m1, centro, new THREE.Vector3(0, 0.7, 0.7).normalize());
    ok('gatillo en A RALENTÍ', inp.pla === 0, +inp.pla.toFixed(3));
  }
  // 7) la pausa: el gatillo en «Motor a ralentí»
  inp.pla = 0.7;
  abrirPausa();
  panelVR.malla.updateWorldMatrix(true, false);
  {
    // el botón 1 («Motor a ralentí») con la misma grilla que dibuja panelvr.js (1024 × 680 px; 4 columnas si hay más de 4 botones)
    const n = hangar ? 8 : 5;
    const cols = n > 4 ? 4 : n;
    const bw = (1024 - 80 - (cols - 1) * 14) / cols;
    const bh = n > 4 ? 56 : 80;
    const y0 = n > 4 ? 680 - 30 - Math.ceil(n / cols) * (bh + 12) : 680 - 120;
    const u = 40 + (1 % cols) * (bw + 14) + bw / 2;
    const vv = y0 + Math.floor(1 / cols) * (bh + 12) + bh / 2;
    const {width, height} = panelVR.malla.geometry.parameters;
    const enRalenti = panelVR.malla.localToWorld(new THREE.Vector3((u / 1024 - 0.5) * width, (0.5 - vv / 680) * height, 0));
    gatilloEn(m1, enRalenti, normal(panelVR.malla));
  }
  ok('pausa: gatillo en «Motor a ralentí» la cierra y pone ralentí', !panelVR.visible && inp.pla === 0, {pausa: panelVR.visible});
  if (panelVR.visible) panelVR.ocultar(); // que no se coma los gatillos de las pruebas que siguen
  // 8) el holograma con una mano: lo lleva 20 cm y lo gira 30°
  for (const c of manos) ponerMano(c, lejos);
  cuadroVR();
  motorGrupo.updateMatrixWorld(true);
  const pMano0 = CENTRO_HOLO.clone().add(new THREE.Vector3(0.12, 0, 0.1));
  ponerMano(m0, pMano0);
  apretarGrip(m0);
  cuadroVR();
  ok('grip junto al holograma lo agarra', agarreHolo.length === 1 && poseManual);
  const antes = motorGrupo.matrixWorld.clone();
  const mano0 = m0.matrixWorld.clone();
  const giro = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
  ponerMano(m0, pMano0.clone().add(new THREE.Vector3(0.2, 0.05, 0)), null, giro);
  cuadroVR();
  motorGrupo.updateMatrixWorld(true);
  const esperado = new THREE.Matrix4().multiplyMatrices(m0.matrixWorld, mano0.clone().invert()).multiply(antes);
  const pe = new THREE.Vector3().setFromMatrixPosition(esperado);
  const pr = new THREE.Vector3().setFromMatrixPosition(motorGrupo.matrixWorld);
  const qe = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(esperado));
  const qr = motorGrupo.getWorldQuaternion(new THREE.Quaternion());
  ok('una mano lo lleva y lo gira con ella', pe.distanceTo(pr) < 0.002 && qe.angleTo(qr) < 0.01, {errorMm: +(pe.distanceTo(pr) * 1000).toFixed(2), errorGrados: +THREE.MathUtils.radToDeg(qe.angleTo(qr)).toFixed(2)});
  // 9) con las dos manos: separarlas al doble lo agranda al doble; al triple, tope 1:1
  const s0 = motorGrupo.scale.x;
  const pA = m0.getWorldPosition(new THREE.Vector3());
  const pB = pA.clone().add(new THREE.Vector3(-0.2, 0, 0));
  ponerMano(m1, pB);
  apretarGrip(m1);
  cuadroVR();
  ok('el grip de la otra mano se suma', agarreHolo.length === 2);
  ponerMano(m1, pA.clone().add(new THREE.Vector3(-0.4, 0, 0)));
  cuadroVR();
  ok('manos al doble de distancia → el doble de tamaño', Math.abs(motorGrupo.scale.x - Math.min(1, 2 * s0)) < 0.005, {antes: +s0.toFixed(3), despues: +motorGrupo.scale.x.toFixed(3)});
  ponerMano(m1, pA.clone().add(new THREE.Vector3(-1.2, 0, 0)));
  cuadroVR();
  ok('al separarlas mucho, tope 1:1 del real', Math.abs(motorGrupo.scale.x - 1) < 1e-6, +motorGrupo.scale.x.toFixed(3));
  soltarGrip(m0);
  soltarGrip(m1);
  cuadroVR();
  ok('al soltar las dos, queda donde está', agarreHolo.length === 0 && poseManual && Math.abs(motorGrupo.scale.x - 1) < 1e-6);
  // 10) a tamaño real, con la cabeza en el centro del motor se apaga al 20 %; a 1 m de su costado, entero
  if (holo) {
    const camAntes = camara.position.clone();
    const centroMotor = motorGrupo.localToWorld(cajaLocalHolo.getCenter(new THREE.Vector3()));
    jugador.updateMatrixWorld(true);
    camara.position.copy(jugador.worldToLocal(centroMotor.clone()));
    camara.updateMatrixWorld(true);
    const bAdentro = brilloPorCabeza();
    camara.position.copy(jugador.worldToLocal(centroMotor.clone().add(new THREE.Vector3(0, 0, 1.2))));
    camara.updateMatrixWorld(true);
    const bAfuera = brilloPorCabeza();
    camara.position.copy(camAntes);
    camara.updateMatrixWorld(true);
    ok('con la cabeza adentro se apaga (20 %) y afuera vuelve', Math.abs(bAdentro - 0.2) < 0.01 && bAfuera === 1, {adentro: +bAdentro.toFixed(3), afuera: bAfuera});
  }
  // 11) el atril de partida: gatillo en «IR A · BANCOS» → fundido y la cabeza en los bancos; «MODO PILOTO» → a la mesa
  if (panelAtril) {
    const jAntes = jugador.position.clone();
    const yawAntes = yaw;
    const pitchAntes = pitch;
    ponerEn(DESTINOS.partida);
    gatilloEn(m1, panelAtril.centro('ir_bancos', v), normal(panelAtril.malla));
    pasoSalto(0.3);
    pasoSalto(0.4);
    const llego = Math.hypot(jugador.position.x - DESTINOS.bancos.x, jugador.position.z - DESTINOS.bancos.z) < 0.01 && !salto && !fundido.visible;
    ok('atril: gatillo en IR A BANCOS lleva a los bancos (con fundido)', llego, jugador.position.toArray().map((x) => +x.toFixed(2)));
    ponerEn(DESTINOS.partida);
    gatilloEn(m1, panelAtril.centro('modo_piloto', v), normal(panelAtril.malla));
    pasoSalto(0.3);
    pasoSalto(0.4);
    ok('atril: MODO PILOTO lleva a la mesa', Math.hypot(jugador.position.x - DESTINOS.mesa.x, jugador.position.z - DESTINOS.mesa.z) < 0.01);
    jugador.position.copy(jAntes);
    yaw = yawAntes;
    pitch = pitchAntes;
  }
  // dejar todo como al principio: el holograma a la mesa, sin estación, sin corte, motor a ralentí
  for (const c of manos) ponerMano(c, lejos);
  cuadroVR();
  poseManual = false;
  Object.assign(pose, {...POSE_BASE, objetivo: [...POSE_BASE.objetivo]});
  aplicarPose(); // de una: sin cuadros (la pestaña de fondo) el holograma quedaba a tamaño real
  estacion = 0;
  corte = false;
  aRalenti();
  restaurarCamino(caminoAntes);
  audio.vozOn = vozAntes;
  const fallaron = res.filter((r) => !r.ok);
  return {pruebas: res.length, fallaron: fallaron.length, detalle: res};
}

// ------------------------------------------------------------ piloto de prueba del modo piloto (T7, tramo 3 adelantado)
// Corre el motor con el mismo cuadro del juego (avanzar) y mira lo que el alumno tendría que ver: el arranque normal (la condición
// pasa sola a ralentí bajo y llega a ralentí sin pasar 750 °C), los dos arranques con falla, las tres fallas en marcha con su
// síntoma, el recorrido de 82 s (las 8 estaciones y la alerta del arranque caliente) y las 6 preguntas (todas bien y todas mal).
function probarPiloto() {
  const caminoAntes = guardarCamino();
  const vozAntes = audio.vozOn;
  audio.vozOn = false;
  const res = [];
  const ok = (prueba, cond, dato) => res.push({prueba, ok: !!cond, dato});
  const correrMirando = (seg, fn) => {
    for (let t = 0; t < seg; t += 1 / 60) {
      avanzar(1 / 60);
      fn && fn();
    }
  };
  pararRecorrido();
  cerrarPreguntas();
  // 1) arranque normal (desde el motor parado: ARRANCAR no hace nada con Ng > 25 %, como en el escritorio)
  inp.fault = 'none';
  apagar();
  arrancar();
  let ittMax = 0;
  let clSola = false;
  correrMirando(30, () => {
    ittMax = Math.max(ittMax, s.itt);
    if (inp.cl === 1) clSola = true;
  });
  ok('arranque normal: la condición pasa sola a ralentí bajo', clSola);
  ok('arranque normal: llega a ralentí (Ng 60 %) y prende', s.lit && Math.abs(s.ng - 60) < 1.5, {ng: +s.ng.toFixed(1)});
  ok('arranque normal: la ITT no pasa de 750 °C', ittMax < 750, {ittMax: Math.round(ittMax)});
  ok('arranque normal: cuenta en el camino', camino.arranco);
  // 2) arranque caliente
  ponerFalla('hot');
  ittMax = 0;
  let alerta = false;
  correrMirando(20, () => {
    ittMax = Math.max(ittMax, s.itt);
    alerta ||= alertaVisible();
  });
  ok('arranque caliente: la ITT pasa de 750 °C y sale la alerta', ittMax > 750 && alerta, {ittMax: Math.round(ittMax)});
  // 3) arranque colgado
  ponerFalla('hung');
  alerta = false;
  correrMirando(30, () => (alerta ||= alertaVisible()));
  ok('arranque colgado: prende pero el Ng se queda abajo de 30 %, con alerta', s.lit && s.ng < 30 && alerta, {ng: +s.ng.toFixed(1)});
  // 4) en marcha: pérdida de compresor, ingestión y sobretemperatura, a plena potencia
  const enMarcha = (k, seg) => {
    aRalenti();
    ponerFalla(k);
    inp.pla = 1;
    const r = {surge: 0, ittMax: 0, tq: 0};
    correrMirando(seg, () => {
      r.surge = Math.max(r.surge, s.surge);
      r.ittMax = Math.max(r.ittMax, s.itt);
    });
    r.tq = s.tq;
    r.alerta = alertaVisible();
    return r;
  };
  const sinFalla = enMarcha('none', 15);
  const stall = enMarcha('stall', 15);
  ok('pérdida de compresor: estampidos (surge) y alerta', stall.surge > 0.9 && stall.alerta, {surge: +stall.surge.toFixed(2)});
  const fod = enMarcha('fod', 15);
  ok('ingestión: más ITT y menos torque que sin falla', fod.ittMax > sinFalla.ittMax && fod.tq < sinFalla.tq && fod.alerta, {itt: [Math.round(sinFalla.ittMax), Math.round(fod.ittMax)], tq: [Math.round(sinFalla.tq), Math.round(fod.tq)]});
  const sobre = enMarcha('overtemp', 20);
  ok('sobretemperatura: la ITT pasa la zona roja (850 °C)', sobre.ittMax > 850 && sobre.alerta, {ittMax: Math.round(sobre.ittMax)});
  ok('las 5 fallas cuentan en el camino', camino.fallas.size === 5, [...camino.fallas]);
  // 5) el recorrido entero
  aRalenti();
  camino.estaciones.clear();
  iniciarRecorrido();
  alerta = false;
  let palancasSolas = 0;
  correrMirando(DURATION - 0.5, () => {
    alerta ||= alertaVisible() && inp.fault === 'hot';
    palancasSolas = Math.max(palancasSolas, inp.pla);
  });
  ok('recorrido: pasa por las 8 estaciones', camino.estaciones.size === 8, [...camino.estaciones]);
  ok('recorrido: mueve la potencia solo y muestra el arranque caliente', palancasSolas > 0.5 && alerta, {potenciaMax: +palancasSolas.toFixed(2)});
  pararRecorrido();
  // 6) las preguntas: todas bien, después todas mal
  abrirPreguntas();
  const responder = (bien) => {
    for (let q = 0; q < QUIZ.length; q++) {
      const j = ORDER[q].findIndex((a) => (bien ? a === 0 : a !== 0));
      accionar({tipo: 'panel', id: `q_a${j}`});
      accionar({tipo: 'panel', id: 'q_siguiente'});
    }
    return preguntas.estado;
  };
  const todasBien = responder(true);
  ok('preguntas: todas bien → 6 de 6', todasBien.puntaje === QUIZ.length && todasBien.pregunta === QUIZ.length, todasBien);
  accionar({tipo: 'panel', id: 'q_otra'});
  const todasMal = responder(false);
  ok('preguntas: todas mal → 0 de 6 (y el camino guarda la mejor)', todasMal.puntaje === 0 && camino.preguntas === QUIZ.length, {mal: todasMal.puntaje, mejor: camino.preguntas});
  accionar({tipo: 'panel', id: 'q_cerrar'});
  ok('preguntas: CERRAR las esconde', !preguntasAbiertas);
  // dejar el motor a ralentí, sin estación
  aRalenti();
  estacion = 0;
  const resumen = resumenCamino();
  restaurarCamino(caminoAntes);
  audio.vozOn = vozAntes;
  return {pruebas: res.length, fallaron: res.filter((r) => !r.ok).length, detalle: res, camino: resumen};
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
  pasoSalto(dt);
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
  const alertaAhora = alertaVisible();
  if (alertaAhora && !alertaAntes) audio.decir(FAULTS[inp.fault].alert);
  alertaAntes = alertaAhora;
  if (camino.enCurso && s.lit && s.ng >= 58) {
    camino.arranco = true;
    camino.enCurso = false;
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
    if (panelAtril) panelAtril.actualizar({hover});
    if (preguntasAbiertas) preguntas.pasarPor(hover && hover.startsWith('q_') ? hover : null);
  }
  const st = STATIONS.find((x) => x.n === estacion);
  cartel.actualizar({estacion: preguntasAbiertas ? null : st || null, alerta: !preguntasAbiertas && alertaVisible() ? FAULTS[inp.fault] : null});
  // las llamadas de la estación (aparecen de a poco, como en el escritorio) y el holograma atenuado mientras están las preguntas o
  // con la cabeza adentro
  llamadas.actualizar(preguntasAbiertas ? null : st || null, estacion ? ss(0.8, 1.3, since) : 0, eng.root, renderer.xr.isPresenting ? renderer.xr.getCamera() : camara);
  if (holo) holo.ajustes.uBrillo.value += (Math.min(preguntasAbiertas ? 0.3 : 1, brilloPorCabeza()) - holo.ajustes.uBrillo.value) * Math.min(1, dt * 6);
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
  // 17 a 21 (T5): los muebles y la utilería (marco del mundo: z del hangar + 45)
  {nombre: 'los bancos con sus tableros y las cajoneras', pos: [10.5, 1.65, -10.3], mira: [11.5, 1.35, -15], hfov: 75},
  {nombre: 'las estanterías y el compresor (pared derecha)', pos: [13.5, 1.7, 7.5], mira: [19, 1.2, -3], hfov: 80},
  {nombre: 'la oficina vidriada', pos: [-8.5, 1.65, -3], mira: [-15.5, 1.3, -12.5], hfov: 75},
  {nombre: 'el pizarrón de los créditos', pos: [-17, 1.6, -11.4], mira: [-17, 1.55, -15], hfov: 70},
  {nombre: 'los puestos: conos, escalera, carro y cartel', pos: [0.5, 1.75, 42], mira: [0, 0.6, 26], hfov: 85},
  {nombre: 'la partida: el atril', pos: [0, 1.6, 41.6], mira: [0, 1.0, 39], hfov: 70},
  // 23 y 24 (T6, tramo 1 adelantado): el AT-802 en su puesto
  {nombre: 'el AT-802 de 3/4 delantero', pos: [-1.5, 1.75, 39.5], mira: [-10, 1.6, 29], hfov: 80},
  {nombre: 'el AT-802: calzas, escalera y hélice', pos: [-6.2, 1.65, 35.4], mira: [-9.3, 1.0, 31.4], hfov: 75},
  // 25 y 26 (T8, tramo 1 adelantado): el banco de componentes
  {nombre: 'el banco de componentes', pos: [1.05, 1.6, 1.75], mira: [2.05, 0.9, 1.75], hfov: 75},
  {nombre: 'el banco desde la mesa', pos: [0, 1.6, 0.95], mira: [2.0, 1.0, 1.75], hfov: 75},
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
  /** los mandos de VR simulados: grip en las palancas, gatillo en paneles, mesa y pausa, el holograma con una y dos manos */
  probarMandos,
  /** salto con fundido: 'partida', 'mesa', 'at802', 'cessna', 'bancos', 'oficina' */
  saltar: saltarA,
  /** el piloto de prueba del modo piloto: arranques, fallas, recorrido y preguntas por consola */
  probarPiloto,
  get camino() {
    return {estaciones: [...camino.estaciones], fallas: [...camino.fallas], arranco: camino.arranco, preguntas: camino.preguntas, resumen: resumenCamino()};
  },
  panelAtril,
  choquesMuebles,
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
