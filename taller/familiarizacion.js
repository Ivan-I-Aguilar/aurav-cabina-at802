// La FAMILIARIZACIÓN con el AT-802 (T11, 16/11/2026; PLAN_TALLER.md §15.2, pedido de Iván: «acercarse al avión, hacer tipo un
// recorrido de la aeronave, una especie de familiarización, y sobre la turbina poder seleccionar que te dé la opción de ver motor»).
// Nueve puntos alrededor del avión (los que nombró Iván: hélice, escapes, tolva, cabina, cola, compuerta, ala, tren y motor), en
// el orden de una vuelta caminando que termina en el motor. Cada uno tiene: una MARCA (un disco con su número que
// flota junto a la parte y mira siempre al alumno, con una línea fina hasta la parte), una marca en el PISO donde pararse, y una
// TARJETA (nombre y una o dos líneas) que se abre al llegar a menos de 1,9 m de su marca del piso. La tarjeta trae SIGUIENTE
// (salto con fundido al punto que sigue), VER EN HOLOGRAMA donde la pieza ya está (§15.2b) y, en el motor, VER EL MOTOR.
// Mientras la pieza del punto está abierta en holograma su tarjeta se esconde (una cosa por vez: en el casco la pieza se abre
// justo donde el alumno estaba mirando, que es la tarjeta); la pieza lleva su propio rótulo con CERRAR (main.js).
// Se llega a cada punto mirando al medio entre el disco y la tarjeta, que va por debajo de los discos para no tocarse con ellos.
//
// Los textos son un BORRADOR [AGREGADO, VERIFICAR]: los corrige o los dicta Iván; los números salen de «Números del avión» de
// CLAUDE.md, que están «a validar». Las coordenadas van en el MARCO DEL AVIÓN de juegos/at802.glb (+x nariz, +y arriba, +z derecha,
// metros, origen en el piso entre las ruedas principales) y están puestas mirando la planta que ocupa el avión [PROVISORIO].
// Todo en 3 llamadas de dibujo: las marcas (un disco y una marca de piso por punto) en una malla con un atlas, las líneas, y la
// tarjeta. Sumar un punto es agregar su entrada en PUNTOS (y, si tiene pieza en holograma, su recorte en PIEZAS_HOLO de main.js).
import * as THREE from '../three.module.js';
import {crearPanel, pieLeyenda} from './paneles.js?v=20261116d';

export const PUNTOS = [
  {
    clave: 'helice',
    titulo: 'Hélice',
    texto: 'Cinco palas de paso variable. La palanca de hélice cambia el ángulo de las palas, hasta dejarlas de canto al viento: «en bandera».',
    parte: [2.31, 2.54, 0],
    marca: [2.9, 1.95, -0.95],
    pie: [4.3, -1.5],
    holo: 'helice',
  },
  {
    clave: 'escapes',
    titulo: 'Escapes y toma de aire',
    texto: 'El motor trabaja «al revés»: el aire entra por abajo y da la vuelta hacia atrás, y los gases salen adelante, por los costados.',
    parte: [2.0, 2.45, -0.55],
    marca: [2.3, 2.0, -1.15],
    pie: [3.0, -2.5],
    holo: 'escapes',
  },
  {
    clave: 'tolva',
    titulo: 'Tolva y boca de carga',
    texto: 'La tolva va entre el motor y la cabina y lleva unos 3.000 litros de agua o retardante. Se carga desde el piso, por la válvula de abajo.',
    parte: [-0.5, 2.5, -0.6],
    marca: [0.0, 2.0, -1.25],
    pie: [0.7, -3.1],
    lado: -1, // la tarjeta a la izquierda del disco (hacia la nariz): a la derecha quedaba metida en el ala
    holo: 'tolva',
    holoNota: 'por fuera · el interior, más adelante',
  },
  {
    clave: 'cabina',
    titulo: 'Cabina',
    texto: 'Un solo piloto, sentado alto y detrás de la tolva, con buena vista hacia adelante y hacia abajo. Es la cabina del simulador.',
    parte: [-2.8, 2.5, -0.55],
    marca: [-3.0, 2.0, -1.15],
    pie: [-3.6, -2.2],
    holo: 'cabina',
  },
  {
    clave: 'cola',
    titulo: 'Cola y rueda de cola',
    texto: 'Tren convencional: la rueda de cola se traba para despegar y aterrizar. Atrás, el timón de dirección y el de profundidad.',
    parte: [-7.0, 1.6, 0],
    marca: [-6.2, 1.9, 0.9],
    pie: [-5.0, 2.4],
    holo: 'cola',
  },
  {
    clave: 'compuerta',
    titulo: 'Compuerta de descarga',
    texto: 'Debajo de la tolva. La maneja el sistema de descarga desde la cabina: larga la carga de a poco, según la cobertura, o toda junta.',
    parte: [-1.2, 0.8, 0.1],
    marca: [-2.7, 1.3, 1.0],
    pie: [-3.6, 2.2],
    lado: -1, // a la izquierda del disco (hacia la cola): a la derecha el borde de fuga del ala le tapaba SIGUIENTE
    holo: 'compuerta',
    holoNota: 'por fuera · las hojas y el mecanismo, más adelante',
  },
  {
    clave: 'ala',
    titulo: 'Ala y flaps',
    texto: 'Ala baja de unos 18 metros de punta a punta, con flaps para volar más lento al despegar y al aterrizar.',
    parte: [-0.9, 1.4, 4.8],
    marca: [-0.3, 1.85, 4.9],
    pie: [1.0, 5.4],
    holo: 'ala',
  },
  {
    // el tren, aparte del ala (Iván lo nombró solo: «ala, tren, cola…»); la rueda principal derecha está en (0; 0,46; 1,4…1,6)
    clave: 'tren',
    titulo: 'Tren de aterrizaje',
    texto: 'Tren fijo y convencional: dos ruedas principales sobre ballestas, que absorben el golpe del aterrizaje, y la rueda de cola atrás.',
    parte: [0.0, 0.6, 1.62],
    marca: [0.3, 1.2, 2.15],
    pie: [1.0, 3.6],
    holo: 'tren',
  },
  {
    clave: 'motor',
    titulo: 'Motor',
    texto: 'Un turbohélice de la familia PT6A, de unos 1.350 caballos, debajo de este capó. Miralo por dentro, a tamaño real.',
    parte: [1.5, 2.35, 0.5],
    marca: [1.6, 1.95, 1.2],
    pie: [1.9, 2.6],
    holo: 'motor',
  },
];

const RADIO_MARCA = 0.14;
const RADIO_PISO = 0.34;
const CERCA = 1.9; // a menos de esto de la marca del piso se abre la tarjeta
const ALTO_TARJETA = 1.45; // el centro de la tarjeta (su borde de arriba queda a 1,70 m: los discos van de 1,76 m para arriba)
const DIST_TARJETA = 1.3; // del lugar del alumno a su tarjeta (m)
const ANG_TARJETA = 0.42; // cuánto se abre la tarjeta de la dirección al disco (rad: 24°)

// el atlas de las marcas: COLS casillas de ancho; arriba, FILAS filas con los números pendientes (lima); abajo, otras tantas con
// los vistos (verde, con tilde). Sirve para cualquier cantidad de puntos
const COLS = 4;
const FILAS = Math.ceil(PUNTOS.length / COLS);
function atlas() {
  const T = 192;
  const cv = document.createElement('canvas');
  cv.width = COLS * T;
  cv.height = 2 * FILAS * T;
  const g = cv.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < PUNTOS.length; i++)
    for (const visto of [0, 1]) {
      const x = (i % COLS) * T + T / 2;
      const y = (Math.floor(i / COLS) + FILAS * visto) * T + T / 2;
      g.beginPath();
      g.arc(x, y, T * 0.46, 0, Math.PI * 2);
      g.fillStyle = visto ? '#2f9e5b' : '#c8e63a';
      g.fill();
      g.lineWidth = T * 0.047;
      g.strokeStyle = visto ? '#ffffff' : '#082440';
      g.stroke();
      g.fillStyle = visto ? '#ffffff' : '#082440';
      g.font = `bold ${Math.round(T * (visto ? 0.47 : 0.586))}px Arial`;
      g.fillText(visto ? `${i + 1} ✓` : String(i + 1), x, y + T / 32);
    }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * avion: el objeto cuyo marco local es el del avión (el LOD de main.js); leyenda: el texto fijo. Devuelve:
 *  grupo (para la escena), tarjeta (un panel de paneles.js: va a la lista de paneles para el rayo), vistos (Set de índices),
 *  activo (índice del punto donde está el alumno, o −1), destino(i) = {x, z, yaw, pitch} para saltar a su marca del piso,
 *  marcaTocada(raycaster) = índice del punto cuya marca (disco o piso) toca el rayo, o −1, y actualizar(camara, tiempo, abierto)
 *  (abierto = la clave de la pieza que está abierta en holograma: la tarjeta de ese punto se esconde mientras tanto).
 */
export function crearFamiliarizacion({avion, leyenda}) {
  const grupo = new THREE.Group();
  grupo.name = 'familiarizacion';
  avion.updateWorldMatrix(true, false);
  const aMundo = (p) => avion.localToWorld(new THREE.Vector3(...p));
  const N = PUNTOS.length;
  const P = PUNTOS.map((p) => ({...p, parteM: aMundo(p.parte), marcaM: aMundo(p.marca), pieM: aMundo([p.pie[0], 0.012, p.pie[1]])}));
  /**
   * el centro de la tarjeta del punto p: SIEMPRE a 1,3 m del lugar del alumno (se lee igual en todos los puntos, esté el disco
   * cerca o lejos) y 24° al costado de la dirección al disco. Va a la derecha, salvo en los puntos con lado: −1, donde a la
   * derecha la tapa el avión (se comprueba con rayos desde el ojo: probarRecorrido)
   */
  const lugarTarjeta = (p, out = new THREE.Vector3()) => {
    const d = new THREE.Vector3().subVectors(p.marcaM, p.pieM).setY(0).normalize(); // del lugar al disco
    const c = Math.cos(ANG_TARJETA);
    const s = Math.sin(ANG_TARJETA) * (p.lado ?? 1); // la derecha de quien mira hacia d es (−d.z, d.x)
    return out.set(p.pieM.x + (d.x * c - d.z * s) * DIST_TARJETA, ALTO_TARJETA, p.pieM.z + (d.z * c + d.x * s) * DIST_TARJETA);
  };

  // ---- las marcas en una malla: N discos que miran a la cámara + N marcas de piso
  const tex = atlas();
  const pos = new Float32Array(2 * N * 4 * 3);
  const uv = new Float32Array(2 * N * 4 * 2);
  const idx = [];
  for (let q = 0; q < 2 * N; q++) idx.push(4 * q, 4 * q + 1, 4 * q + 2, 4 * q, 4 * q + 2, 4 * q + 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(idx);
  const marcas = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map: tex, transparent: true, alphaTest: 0.5, toneMapped: false, side: THREE.DoubleSide}));
  marcas.name = 'marcas-recorrido';
  marcas.frustumCulled = false;
  marcas.renderOrder = 6;
  grupo.add(marcas);
  const ponerUV = (q, i, visto) => {
    const du = 1 / COLS;
    const dv = 1 / (2 * FILAS);
    const u0 = (i % COLS) * du;
    const v1 = 1 - (Math.floor(i / COLS) + FILAS * visto) * dv;
    uv.set([u0, v1 - dv, u0 + du, v1 - dv, u0 + du, v1, u0, v1], q * 8);
  };
  // las del piso no se mueven: un cuadrado acostado, con el número derecho para quien llega de frente al avión
  P.forEach((p, i) => {
    const q = N + i;
    const d = new THREE.Vector3().subVectors(p.parteM, p.pieM).setY(0).normalize(); // hacia la parte
    const r = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(RADIO_PISO); // la derecha de quien mira la parte
    const f = d.clone().multiplyScalar(RADIO_PISO);
    const c = p.pieM;
    pos.set([c.x - r.x - f.x, c.y, c.z - r.z - f.z, c.x + r.x - f.x, c.y, c.z + r.z - f.z, c.x + r.x + f.x, c.y, c.z + r.z + f.z, c.x - r.x + f.x, c.y, c.z - r.z + f.z], q * 12);
    ponerUV(q, i, 0);
    ponerUV(i, i, 0);
  });
  // ---- las líneas de cada disco a su parte
  const lg = new THREE.BufferGeometry().setFromPoints(P.flatMap((p) => [p.marcaM, p.parteM]));
  const lineas = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color: 0xc8e63a, transparent: true, opacity: 0.7}));
  lineas.name = 'lineas-recorrido';
  grupo.add(lineas);

  // ---- la tarjeta
  const tarjeta = crearPanel({ancho: 0.8, alto: 0.5, px: 1280, nombre: 'tarjeta-recorrido'});
  const {g, W, H} = tarjeta;
  tarjeta.malla.visible = false;
  tarjeta.malla.renderOrder = 7;
  grupo.add(tarjeta.malla);
  const M = 34;
  let firma = '';
  function envolver(t, ancho) {
    const lineasT = [];
    let l = '';
    for (const palabra of t.split(' ')) {
      const prueba = l ? `${l} ${palabra}` : palabra;
      if (g.measureText(prueba).width > ancho && l) {
        lineasT.push(l);
        l = palabra;
      } else l = prueba;
    }
    if (l) lineasT.push(l);
    return lineasT;
  }
  function dibujar(i, hover) {
    const p = P[i];
    tarjeta.botones.length = 0;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(248,248,249,0.97)';
    g.beginPath();
    g.roundRect(0, 0, W, H, 22);
    g.fill();
    g.fillStyle = '#082440';
    g.beginPath();
    g.roundRect(0, 0, W, 92, [22, 22, 0, 0]);
    g.fill();
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillStyle = '#c8e63a';
    g.font = 'bold 40px Arial';
    g.fillText(`PUNTO ${i + 1} DE ${N}`, M, 62);
    g.textAlign = 'right';
    g.fillStyle = '#8fa3b8';
    g.font = 'bold 26px Arial';
    g.fillText('[AGREGADO · VERIFICAR]', W - M, 60);
    g.textAlign = 'left';
    g.fillStyle = '#16181b';
    g.font = 'bold 60px Arial';
    g.fillText(p.titulo, M, 170, W - 2 * M);
    g.font = '38px Arial';
    g.fillStyle = '#2b3036';
    envolver(p.texto, W - 2 * M).slice(0, 4).forEach((l, k) => g.fillText(l, M, 232 + k * 48));
    // botones: a la izquierda lo propio del punto (holograma o motor); a la derecha, SIGUIENTE
    const by = H - 96 - 104;
    const bh = 84;
    const bw = (W - 2 * M - 20) / 2;
    const boton = (id, t, x, primario) => {
      tarjeta.botones.push({id, x, y: by, w: bw, h: bh});
      g.beginPath();
      g.roundRect(x, by, bw, bh, 14);
      g.fillStyle = primario ? (hover === id ? '#b81426' : '#d6182b') : hover === id ? '#eef0f2' : '#ffffff';
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = primario ? '#d6182b' : '#c9ccd0';
      g.stroke();
      g.fillStyle = primario ? '#ffffff' : '#16181b';
      g.font = 'bold 36px Arial';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(t, x + bw / 2, by + bh / 2 + 2, bw - 20);
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
    };
    if (p.holo === 'motor') boton('fam_motor', 'VER EL MOTOR', M, true);
    else if (p.holo) boton('fam_holo', 'VER EN HOLOGRAMA', M, true);
    boton('fam_sig', i === N - 1 ? '← PUNTO 1' : 'SIGUIENTE →', M + bw + 20, false);
    pieLeyenda(g, W, H - 96, 96, leyenda, 27);
    tarjeta.pintado();
  }

  const vistos = new Set();
  let activo = -1;
  const cam = new THREE.Vector3();
  const der = new THREE.Vector3();
  const arr = new THREE.Vector3(0, 1, 0);
  const rc = new THREE.Vector3();
  const ac = new THREE.Vector3();
  return {
    grupo,
    tarjeta,
    vistos,
    get activo() {
      return activo;
    },
    get puntos() {
      return P;
    },
    /** dónde pararse y hacia dónde mirar en el punto i (para el salto con fundido) */
    destino(i) {
      const p = P[i];
      // se llega mirando al medio entre el disco y la tarjeta: los dos quedan enteros a la vista, también en una ventana angosta de PC
      const medio = lugarTarjeta(p).add(p.marcaM).multiplyScalar(0.5);
      const d = medio.clone().sub(p.pieM);
      return {x: p.pieM.x, z: p.pieM.z, yaw: Math.atan2(-d.x, -d.z), pitch: THREE.MathUtils.clamp(Math.atan2(medio.y - 1.6, Math.hypot(d.x, d.z)), -0.5, 0.6)};
    },
    /** el punto cuya marca (el disco o la del piso) toca el rayo, o −1 */
    marcaTocada(raycaster) {
      const h = raycaster.intersectObject(marcas, false)[0];
      return h ? Math.floor(h.faceIndex / 2) % N : -1;
    },
    actualizar(camara, tiempo, {hover = null, abierto = null} = {}) {
      camara.getWorldPosition(cam);
      // los discos miran a la cámara (se recalculan sus cuatro vértices); el del punto activo late
      camara.matrixWorld.extractBasis(der, ac, rc);
      der.setY(0).normalize();
      let cerca = -1;
      let dMin = CERCA;
      P.forEach((p, i) => {
        const r = RADIO_MARCA * (i === activo ? 1.15 + 0.12 * Math.sin(tiempo * 5) : 1);
        rc.copy(der).multiplyScalar(r);
        ac.copy(arr).multiplyScalar(r);
        const c = p.marcaM;
        pos.set([c.x - rc.x - ac.x, c.y - ac.y, c.z - rc.z - ac.z, c.x + rc.x - ac.x, c.y - ac.y, c.z + rc.z - ac.z, c.x + rc.x + ac.x, c.y + ac.y, c.z + rc.z + ac.z, c.x - rc.x + ac.x, c.y + ac.y, c.z - rc.z + ac.z], i * 12);
        const d = Math.hypot(cam.x - p.pieM.x, cam.z - p.pieM.z);
        if (d < dMin) {
          dMin = d;
          cerca = i;
        }
      });
      geo.attributes.position.needsUpdate = true;
      if (cerca !== activo) {
        activo = cerca;
        if (activo >= 0 && !vistos.has(activo)) {
          vistos.add(activo);
          ponerUV(activo, activo, 1);
          ponerUV(N + activo, activo, 1);
          geo.attributes.uv.needsUpdate = true;
        }
        if (activo >= 0) {
          // la tarjeta: a la derecha del disco, un poco por debajo de los ojos, de cara a la marca del piso
          const p = P[activo];
          lugarTarjeta(p, tarjeta.malla.position);
          tarjeta.malla.rotation.set(0, Math.atan2(p.pieM.x - tarjeta.malla.position.x, p.pieM.z - tarjeta.malla.position.z), 0);
        }
        firma = '';
      }
      // con la pieza de este punto abierta en holograma, la tarjeta se esconde (la pieza trae su rótulo con CERRAR)
      tarjeta.malla.visible = activo >= 0 && abierto !== P[activo].clave;
      if (tarjeta.malla.visible) {
        const f = `${activo}|${hover}`;
        if (f !== firma) {
          firma = f;
          dibujar(activo, hover);
        }
      }
    },
    /** para las pruebas: olvida lo visto */
    reiniciar() {
      vistos.clear();
      for (let i = 0; i < N; i++) {
        ponerUV(i, i, 0);
        ponerUV(N + i, i, 0);
      }
      geo.attributes.uv.needsUpdate = true;
    },
  };
}
