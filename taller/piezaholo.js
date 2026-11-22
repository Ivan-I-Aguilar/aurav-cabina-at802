// Una PIEZA del avión en holograma, «en las manos» (T11, 16/11/2026; PLAN_TALLER.md §15.2b, pedido de Iván: «ver esa pieza tipo en
// tus manos, en un holograma»). Un solo mecanismo para todas: toma mallas del avión de juegos/at802.glb (o de un modelo propio, como
// taller/compuerta.glb), las pasa al marco de la pieza, las recorta por una caja si hace falta (los triángulos de afuera se sacan y
// el sombreador corta limpio en el borde), las centra y las escala para que entren entre las manos, y las dibuja con el aspecto del
// holograma del motor (celeste, luz sumada, brillo de borde y barrido), en UNA llamada de dibujo. Sólo existe mientras está abierta.
// T12: una pieza puede traer PARTES QUE SE MUEVEN (las hojas de la compuerta): cada una es una malla más, que gira sobre su bisagra.
// T13 («ver su funcionamiento, como se hace con el motor»): las partes móviles van a CUALQUIER posición (irA: el paso de las palas),
// pueden salir de las ISLAS de una malla (elegir: las palas de la hélice vienen sueltas dentro de una sola malla), el giro propio
// cambia de velocidad (ponerGiro) y la pieza puede llevar un FLUJO de estelas de luz a lo largo de un eje (ponerFlujo: el aire que
// mueve la hélice).
// T14 (las superficies de mando): las partes móviles se reparten en CANALES que se mueven por separado (los flaps por un lado y los
// alerones por otro; el timón de profundidad y el de dirección), una isla se puede PARTIR (el timón de dirección viene pegado a la
// deriva), las partes móviles pueden llevar LUZ propia para que se vea qué es lo que se mueve, la pieza toma una ACTITUD (se inclina,
// cabecea o guiña: lo que le pasa al avión cuando se mueve esa superficie), el recorte acepta DOS cajas (las dos alas, sin el
// fuselaje del medio) y el flujo puede llenar una caja (el aire sobre toda el ala).
// T15 (el tren, y los escapes y la toma de aire): una parte móvil puede CORRERSE en vez de girar (mueve: el piso bajo la rueda),
// llevar un segundo movimiento ENCIMA (sobre: la rueda gira sobre su eje y, con la pata, sobre el encastre) y andar SOLA (continuo:
// el canal es una velocidad y la parte acumula el giro: la rueda que rueda); las partes con la misma «junta» van en una sola malla;
// una isla se puede QUITAR (las palas, en la nariz); y el flujo pasa a ser uno o más CHORROS que siguen un camino con curvas, cada
// uno de su color (el aire que entra por la toma, da la vuelta, atraviesa el motor y sale por los escapes).
// T16 (la tolva y la compuerta): unas mallas pueden entrar ENTERAS, sin pasar por la caja de recorte (los modelos propios: la
// compuerta, bajo un lomo recortado del avión); la pieza puede llevar un LÍQUIDO: un recipiente dibujado en esquema que se llena
// hasta un nivel según lo que entra y lo que sale (el agua de la tolva); y un chorro puede ir al paso de lo que entra o de lo que
// sale de ese líquido (si la tolva está vacía, no cae nada), o encenderse recién desde cierto caudal (más cobertura, más agua).
import * as THREE from '../three.module.js';

const VERT = /* glsl */ `
attribute float aLuz;
attribute float aEntera;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying float vLuz;
varying float vEntera;
void main() {
  vP = position;
  vLuz = aLuz;
  vEntera = aEntera;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTiempo;
uniform float uBrillo;
uniform float uCaja;
uniform vec3 uMin;
uniform vec3 uMax;
uniform vec3 uMin2;
uniform vec3 uMax2;
uniform float uPaso;
uniform float uLiquido;
uniform float uTope;
uniform vec3 uAgua;
uniform float uTenue;
uniform float uAguaLuz;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying float vLuz;
varying float vEntera;
void main() {
  // el recorte: fuera de la caja (o de las dos cajas) no se dibuja. vP es la posición en reposo: una parte que se mueve no se
  // recorta por salirse de la caja. Lo que entró entero (un modelo propio, lo dibujado) no se recorta
  bool fuera1 = any(lessThan(vP, uMin)) || any(greaterThan(vP, uMax));
  bool fuera2 = uCaja < 1.5 || any(lessThan(vP, uMin2)) || any(greaterThan(vP, uMax2));
  if (uCaja > 0.5 && vEntera < 0.5 && fuera1 && fuera2) discard;
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
  float barrido = 0.8 + 0.2 * sin(vP.y * uPaso - uTiempo * 2.4);
  float i = ((0.07 + 0.6 * f) * barrido + vLuz) * uBrillo; // vLuz: la luz propia de lo que tiene que leerse de frente (una escala)
  vec3 tono = uColor;
  if (uLiquido > 0.5) {
    // las paredes de un recipiente: por encima del nivel, tenues; por debajo, del color del líquido y con algo de luz propia (tiene
    // que verse lleno aunque la pared se mire de frente)
    if (vP.y > uTope) i *= uTenue;
    else {
      tono = uAgua;
      i += uAguaLuz;
    }
  }
  gl_FragColor = vec4(tono * i, 1.0);
  #include <colorspace_fragment>
}`;

const suave = (x) => x * x * (3 - 2 * x);
/** el canal de las partes móviles que no dicen cuál es el suyo (las hojas de la compuerta, las palas) */
export const CANAL = 'paso';

// la cabeza redonda de las estelas del flujo: un punto de luz difuso (una sola textura para todas las piezas)
let texPunto = null;
function texturaPunto() {
  if (texPunto) return texPunto;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#9a9a9a');
  grad.addColorStop(1, '#000000');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  texPunto = new THREE.CanvasTexture(cv);
  return texPunto;
}

/** las islas de unos triángulos (pos: 9 números por triángulo): los que comparten vértices, por posición redondeada a medio mm */
function islasDe(pos) {
  const n = pos.length / 9;
  const padre = new Map();
  const raiz = (a) => {
    let r = a;
    while (padre.get(r) !== r) r = padre.get(r);
    while (padre.get(a) !== r) {
      const s = padre.get(a);
      padre.set(a, r);
      a = s;
    }
    return r;
  };
  const claves = new Array(n);
  for (let t = 0; t < n; t++) {
    const k = [0, 1, 2].map((j) => `${Math.round(pos[t * 9 + j * 3] * 2000)},${Math.round(pos[t * 9 + j * 3 + 1] * 2000)},${Math.round(pos[t * 9 + j * 3 + 2] * 2000)}`);
    claves[t] = k;
    for (const c of k) if (!padre.has(c)) padre.set(c, c);
    const r0 = raiz(k[0]);
    for (const c of k) padre.set(raiz(c), r0);
  }
  const grupos = new Map();
  for (let t = 0; t < n; t++) {
    const r = raiz(claves[t][0]);
    let g = grupos.get(r);
    if (!g) grupos.set(r, (g = {triangulos: [], n: 0, min: new THREE.Vector3(1e9, 1e9, 1e9), max: new THREE.Vector3(-1e9, -1e9, -1e9), centro: new THREE.Vector3()}));
    g.triangulos.push(t);
    g.n++;
    for (let j = 0; j < 3; j++) {
      const x = pos[t * 9 + j * 3];
      const y = pos[t * 9 + j * 3 + 1];
      const z = pos[t * 9 + j * 3 + 2];
      g.min.min(g.centro.set(x, y, z));
      g.max.max(g.centro);
    }
  }
  for (const g of grupos.values()) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const t of g.triangulos) for (let j = 0; j < 3; j++) ((x += pos[t * 9 + j * 3]), (y += pos[t * 9 + j * 3 + 1]), (z += pos[t * 9 + j * 3 + 2]));
    g.centro.set(x, y, z).divideScalar(g.n * 3);
  }
  return [...grupos.values()];
}

/**
 * clave: el nombre de la pieza; fuentes: las mallas de donde sale; marco: el objeto en cuyo marco local queda la pieza (por
 * omisión, la primera fuente); caja: un Box3 en ese marco para recortar, o dos ([Box3, Box3]: lo que cae en cualquiera de las dos),
 * o null (la malla entera); enteras: mallas que entran ENTERAS, sin pasar por la caja (un modelo propio junto a algo recortado
 * del avión; una parte móvil entra entera con «entera: true»); tam: cuánto mide su lado más largo (m); gira: {eje: 'x' | 'y' |
 * 'z', vel: rad/s} si la pieza gira sobre un eje de su marco (la hélice).
 * PARTES QUE SE MUEVEN, de dos maneras (todo en el marco, ángulos en radianes):
 *  - moviles: [{fuentes, …movimiento, luz, junta}]: mallas enteras;
 *  - elegir(isla): para las islas de «fuentes» ({n, min, max, centro}); devuelve null (queda fija), false (la isla se QUITA: no
 *    se dibuja) o {…movimiento, luz, junta, dentro}. Con «dentro» (una función del centro de cada triángulo, Vector3 → bool) la
 *    isla se PARTE: sólo esos triángulos pasan a ser la parte móvil y el resto queda fijo (el timón de dirección, que viene
 *    pegado a la deriva).
 * Un MOVIMIENTO es un giro, {a, b, angulo, canal} (sobre el eje que va de a hasta b, Vector3), o un corrimiento, {mueve, canal}
 * (mueve: Vector3). Cada uno pertenece a un CANAL (por omisión, 'paso'): con el canal en v, la parte está girada angulo · v, o
 * corrida mueve · v. «continuo: true» = el canal es una VELOCIDAD (por segundo) y la parte lleva lo acumulado (una rueda que
 * rueda). «sobre: {otro movimiento}» = además lleva ese otro, que se aplica después (la rueda gira sobre su eje y, con la pata,
 * sobre el encastre). «velocidad» = cuánto cambia por segundo ese canal (si no, la de la pieza). «junta: 'nombre'» = las partes
 * con la misma junta van en UNA malla (una llamada de dibujo) y se mueven como la primera.
 * irA(v, ya, canal) lleva un canal a v con arranque y llegada suaves; seguir(v, canal), sin ellos (un mando que se arrastra);
 * abrir(true | false) = irA(1 | 0) en el canal por omisión. luz: luz propia de la parte (se le suma a la de su malla);
 * luzMoviles: la de las partes que no dicen la suya.
 * ACTITUD: ponerActitud(x, y, z) inclina la pieza entera (lo que gira solo) sobre los ejes de su marco, de a poco.
 * FLUJO: estelas de luz que corren por uno o más CHORROS; ponerFlujo(v) las mueve a v unidades del marco por segundo (con signo;
 * 0 las apaga). Un chorro: {camino: [[x, y, z], …] (dos puntos o más; con más de dos, una curva suave que pasa por ellos), radio
 * (un tubo; radio2: el radio al final, si se abre) o ancho y alto (media sección de una caja; alto 0 = una lámina), n, color,
 * color2 y cambia: [u0, u1] (cambia de color entre esas dos fracciones del camino: el aire que se calienta), cola (el largo de la
 * estela a velocidad 1), vel (cuánto más rápido que los demás), funde (la fracción de cada punta en que la estela aparece y se
 * apaga), sigue: [{canal, mueve}] (el chorro se corre con un canal: el piso que sube), lleva: {canal, factor} (no va a la
 * velocidad del flujo sino a la de ese canal por «factor»: el piso pasa a la velocidad del borde de la rueda; o {liquido: 'entra'
 * | 'sale', factor}: al paso de lo que de verdad entra o sale del líquido), minimo (el chorro corre recién cuando el flujo llega
 * a ese valor: más cobertura, más agua)}. flujo = un chorro, una lista, o
 * {chorros: […], n, cola, color, tam} (lo común). La forma de antes sigue valiendo: {n, desde, hasta, cola, tam, color} y radio
 * (alrededor del eje x del marco) o caja ([[y0, z0], [y1, z1]]) = un chorro derecho a lo largo de x.
 * LÍQUIDO: {secciones: [[y, x0, x1, mediaAnchura], …] (el recipiente, en esquema: una pila de rectángulos, de abajo hacia arriba),
 * color, entra y sale (los canales que dicen qué fracción del recipiente entra y sale por segundo), inicial (el nivel con que
 * abre, de 0 a 1), tenue (cuánto brillan las paredes por encima del nivel), luz (la de la superficie)}. El nivel sube y baja
 * solo, entre vacío y lleno: lleno, sólo entra lo que sale; vacío, sólo sale lo que entra. ponerNivel(v, ya) lo lleva a un valor.
 * Devuelve {clave, grupo, interior, radio, mitad, centro, triangulos, tieneMoviles, partes, canales, abierta, abertura, valor,
 * objetivo, valorDe, objetivoDe, faseDe, quieta, irA, seguir, abrir, ponerGiro, giro, ponerActitud, actitud, ponerFlujo, flujo,
 * chorros, tieneLiquido, nivel, alturaNivel, caudales, ponerNivel, aMundo, actualizar(dt, t), liberar()}: el grupo se pone, se
 * gira y se escala desde afuera; «interior» es lo que gira solo; «mitad» es la media caja de lo que se ve, en reposo; aMundo(p)
 * lleva un punto del marco al mundo.
 */
export function crearPiezaHolo({clave, fuentes, marco = null, caja = null, enteras = [], tam = 0.8, color = '#62d8ff', gira = null, brillo = 1, moviles = [], elegir = null, velocidad = 1 / 1.2, flujo = null, luzMoviles = 0, liquido = null}) {
  const ref = marco || fuentes[0];
  ref.updateWorldMatrix(true, false);
  const inv = new THREE.Matrix4().copy(ref.matrixWorld).invert();
  const m4 = new THREE.Matrix4();
  const n3 = new THREE.Matrix3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const na = new THREE.Vector3();
  const cubre = new THREE.Box3();
  const cajas = !caja ? [] : Array.isArray(caja) ? caja.slice(0, 2) : [caja];
  const enCajas = (p) => cajas.some((q) => q.containsPoint(p));
  /** los triángulos de unas mallas, en el marco de la pieza (y dentro de las cajas, si hay y si no entran enteras): {pos, nor,
   * luz, ent} (ent: 1 por vértice si entró entero: el sombreador no lo recorta) */
  const extraer = (mallas, mas = 0, entera = false) => {
    const pos = [];
    const nor = [];
    const luz = [];
    const ent = [];
    for (const m of mallas) {
      const propia = (+m.userData.luz || 0) + mas; // la luz propia de esa malla (userData.luz del modelo: la escala de la mirilla)
      m.updateWorldMatrix(true, false);
      m4.multiplyMatrices(inv, m.matrixWorld);
      n3.getNormalMatrix(m4);
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
      const P = g.attributes.position;
      const N = g.attributes.normal;
      for (let i = 0; i < P.count; i += 3) {
        a.fromBufferAttribute(P, i).applyMatrix4(m4);
        b.fromBufferAttribute(P, i + 1).applyMatrix4(m4);
        c.fromBufferAttribute(P, i + 2).applyMatrix4(m4);
        // con caja: se quedan los triángulos que la tocan (el borde lo corta el sombreador)
        if (cajas.length && !entera && !enCajas(a) && !enCajas(b) && !enCajas(c)) continue;
        for (const [v, k] of [
          [a, i],
          [b, i + 1],
          [c, i + 2],
        ]) {
          pos.push(v.x, v.y, v.z);
          na.fromBufferAttribute(N, k).applyMatrix3(n3).normalize();
          nor.push(na.x, na.y, na.z);
          luz.push(propia);
          ent.push(entera ? 1 : 0);
        }
      }
      if (g !== m.geometry) g.dispose();
    }
    return {pos, nor, luz, ent};
  };
  const CAMPOS = ['pos', 'nor', 'luz', 'ent'];
  let fijo = extraer(fuentes);
  if (enteras.length) {
    const mas = extraer(enteras, 0, true);
    for (const k of CAMPOS) for (const v of mas[k]) fijo[k].push(v);
  }
  let sueltas = moviles.map((mv) => ({...mv, datos: extraer(mv.fuentes, mv.luz ?? luzMoviles, !!mv.entera)}));
  // las islas de lo fijo que el que llama quiere mover (las palas, los flaps): salen de lo fijo y pasan a ser partes móviles
  if (elegir) {
    const quedan = {pos: [], nor: [], luz: [], ent: []};
    const pasar = (hacia, t, mas = 0) => {
      for (let j = 0; j < 9; j++) hacia.pos.push(fijo.pos[t * 9 + j]), hacia.nor.push(fijo.nor[t * 9 + j]);
      for (let j = 0; j < 3; j++) hacia.luz.push(fijo.luz[t * 3 + j] + mas), hacia.ent.push(fijo.ent[t * 3 + j]);
    };
    for (const isla of islasDe(fijo.pos)) {
      const mv = elegir({n: isla.n, min: isla.min, max: isla.max, centro: isla.centro});
      if (mv === false) continue; // esa isla se quita: no se dibuja (las palas, en la nariz)
      if (!mv) {
        for (const t of isla.triangulos) pasar(quedan, t);
        continue;
      }
      const suyos = {pos: [], nor: [], luz: [], ent: []};
      const mas = mv.luz ?? luzMoviles;
      for (const t of isla.triangulos) {
        // con «dentro» la isla se parte por el centro de cada triángulo
        if (mv.dentro && !mv.dentro(c.set((fijo.pos[t * 9] + fijo.pos[t * 9 + 3] + fijo.pos[t * 9 + 6]) / 3, (fijo.pos[t * 9 + 1] + fijo.pos[t * 9 + 4] + fijo.pos[t * 9 + 7]) / 3, (fijo.pos[t * 9 + 2] + fijo.pos[t * 9 + 5] + fijo.pos[t * 9 + 8]) / 3))) pasar(quedan, t);
        else pasar(suyos, t, mas);
      }
      if (suyos.pos.length) sueltas.push({...mv, datos: suyos});
    }
    fijo = quedan;
  }
  // las partes que comparten «junta» van en UNA malla (una llamada de dibujo): se mueven como la primera
  {
    const porJunta = new Map();
    const unidas = [];
    for (const mv of sueltas) {
      const primera = mv.junta ? porJunta.get(mv.junta) : null;
      if (primera) {
        for (const k of CAMPOS) for (const v of mv.datos[k]) primera.datos[k].push(v);
      } else {
        unidas.push(mv);
        if (mv.junta) porJunta.set(mv.junta, mv);
      }
    }
    sueltas = unidas;
  }
  // lo que cubre la pieza: lo que quedó (fijo y móvil), en reposo. Lo recortado, hasta donde llegan las cajas; lo que entró
  // entero y el recipiente del líquido, todo
  const cubreEnteras = new THREE.Box3();
  for (const d of [fijo, ...sueltas.map((mv) => mv.datos)]) for (let i = 0; i < d.pos.length; i += 3) (d.ent[i / 3] ? cubreEnteras : cubre).expandByPoint(a.set(d.pos[i], d.pos[i + 1], d.pos[i + 2]));
  if (cajas.length && !cubre.isEmpty()) cubre.intersect(cajas.reduce((u, q) => u.union(q), cajas[0].clone()));
  // el recipiente del líquido, en esquema: secciones rectangulares, de abajo hacia arriba
  const secciones = liquido ? liquido.secciones.map(([y, x0, x1, hw]) => ({y, x0, x1, hw})).sort((p, q) => p.y - q.y) : null;
  if (secciones) for (const s of secciones) cubreEnteras.expandByPoint(a.set(s.x0, s.y, -s.hw)).expandByPoint(a.set(s.x1, s.y, s.hw));
  if (!cubreEnteras.isEmpty()) cubre.union(cubreEnteras);
  const centro = cubre.getCenter(new THREE.Vector3());
  const lado = cubre.getSize(new THREE.Vector3());
  const k = tam / Math.max(lado.x, lado.y, lado.z, 1e-6);
  const cero = new THREE.Vector3();
  const U = {
    uColor: {value: new THREE.Color(color)},
    uTiempo: {value: 0},
    uBrillo: {value: brillo}, // menos en las piezas con muchas capas (la cabina), que sumadas dan un bloque blanco
    uCaja: {value: cajas.length},
    uMin: {value: cajas[0] ? cajas[0].min.clone().sub(centro) : cero.clone()},
    uMax: {value: cajas[0] ? cajas[0].max.clone().sub(centro) : cero.clone()},
    uMin2: {value: cajas[1] ? cajas[1].min.clone().sub(centro) : cero.clone()},
    uMax2: {value: cajas[1] ? cajas[1].max.clone().sub(centro) : cero.clone()},
    uPaso: {value: 60 * k}, // el barrido, igual de fino cualquiera sea el tamaño de la pieza
    uLiquido: {value: 0}, // (los del líquido: sólo los usa el material de las paredes de su recipiente)
    uTope: {value: 0},
    uAgua: {value: new THREE.Color('#3b9bff')},
    uTenue: {value: 1},
    uAguaLuz: {value: 0},
  };
  const OPCIONES_MATERIAL = {vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false};
  const material = new THREE.ShaderMaterial({uniforms: U, ...OPCIONES_MATERIAL});
  const materiales = [material];
  const geos = [];
  const armar = ({pos, nor, luz, ent}, nombre) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('aLuz', new THREE.Float32BufferAttribute(luz, 1));
    geo.setAttribute('aEntera', new THREE.Float32BufferAttribute(ent, 1));
    geo.translate(-centro.x, -centro.y, -centro.z);
    geo.computeBoundingSphere();
    geos.push(geo);
    const m = new THREE.Mesh(geo, material);
    m.name = nombre;
    m.renderOrder = 7; // después de las marcas del recorrido (6): la pieza está más cerca del alumno que los discos
    return m;
  };
  const malla = armar(fijo, `pieza-holo-${clave}`);
  const interior = new THREE.Group();
  interior.add(malla);
  // las partes móviles: cada una en su malla, con la matriz puesta a mano. Un MOVIMIENTO es un giro sobre un eje (ya en el marco
  // centrado) o un corrimiento; una parte lleva el suyo y, si lo dice («sobre»), otro encima
  const movimiento = (mv) => ({
    canal: mv.canal || CANAL,
    continuo: !!mv.continuo,
    velocidad: mv.velocidad,
    ...(mv.mueve ? {mueve: mv.mueve.clone()} : {p: mv.a.clone().sub(centro), eje: mv.b.clone().sub(mv.a).normalize(), angulo: mv.angulo ?? 1}),
  });
  const partes = sueltas.map((mv, i) => {
    const m = armar(mv.datos, `pieza-holo-${clave}-movil-${i}`);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false; // movida se sale de su esfera
    interior.add(m);
    const movs = [movimiento(mv)];
    if (mv.sobre) movs.push(movimiento(mv.sobre));
    return {malla: m, ...movs[0], movs}; // (p, eje, angulo y canal: los del primer movimiento)
  });
  const grupo = new THREE.Group();
  grupo.name = `pieza-${clave}`;
  grupo.add(interior);
  grupo.scale.setScalar(k);

  // El LÍQUIDO: las paredes de su recipiente (una malla, con un material que las pinta del color del líquido por debajo del
  // nivel y las deja tenues por encima) y la superficie (un rectángulo con luz propia, a la altura del nivel). El nivel va de 0
  // (la sección de abajo) a 1 (la de arriba) y cambia solo con lo que entra y lo que sale
  let liq = null;
  if (secciones) {
    const pos = [];
    const nor = [];
    const cara = (p0, p1, p2, p3) => {
      b.subVectors(p1, p0);
      c.subVectors(p3, p0);
      na.crossVectors(b, c).normalize();
      for (const p of [p0, p1, p2, p0, p2, p3]) pos.push(p.x, p.y, p.z), nor.push(na.x, na.y, na.z);
    };
    const esquinas = (s) => [new THREE.Vector3(s.x0, s.y, -s.hw), new THREE.Vector3(s.x1, s.y, -s.hw), new THREE.Vector3(s.x1, s.y, s.hw), new THREE.Vector3(s.x0, s.y, s.hw)];
    for (let i = 0; i + 1 < secciones.length; i++) {
      const A = esquinas(secciones[i]);
      const B = esquinas(secciones[i + 1]);
      for (let j = 0; j < 4; j++) cara(A[j], A[(j + 1) % 4], B[(j + 1) % 4], B[j]);
    }
    const fondo = esquinas(secciones[0]);
    cara(fondo[0], fondo[3], fondo[2], fondo[1]);
    const agua = new THREE.Color(liquido.color || '#3b9bff');
    const matPared = new THREE.ShaderMaterial({uniforms: {...U, uLiquido: {value: 1}, uTope: {value: 0}, uAgua: {value: agua}, uTenue: {value: liquido.tenue ?? 0.3}, uAguaLuz: {value: liquido.luzAgua ?? 0.09}}, ...OPCIONES_MATERIAL});
    const matSuperficie = new THREE.ShaderMaterial({uniforms: {...U, uColor: {value: agua}, uBrillo: {value: 1}}, ...OPCIONES_MATERIAL});
    materiales.push(matPared, matSuperficie);
    const unos = (n, v) => new Array(n).fill(v);
    const pared = armar({pos, nor, luz: unos(pos.length / 3, 0), ent: unos(pos.length / 3, 1)}, `pieza-holo-${clave}-recipiente`);
    pared.material = matPared;
    pared.renderOrder = 6.9; // antes que la pieza: el agua queda detrás de la luz de lo que la rodea
    const superficie = armar({pos: unos(18, 0), nor: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], luz: unos(6, liquido.luz ?? 0.3), ent: unos(6, 1)}, `pieza-holo-${clave}-nivel`);
    superficie.geometry.translate(centro.x, centro.y, centro.z); // (armar la centró: sus vértices se escriben ya centrados)
    superficie.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    superficie.material = matSuperficie;
    superficie.frustumCulled = false;
    interior.add(pared, superficie);
    liq = {secciones, pared, superficie, matPared, entra: liquido.entra || null, sale: liquido.sale || null, nivel: Math.min(1, Math.max(0, liquido.inicial ?? 0)), objetivo: null, dibujado: -1, efEntra: 0, efSale: 0, altura: 0};
  }
  /** pone la superficie y el tope del líquido donde dice su nivel: la sección del recipiente a esa altura, entre las dos que la rodean */
  const ponerSuperficie = () => {
    const S = liq.secciones;
    const y = S[0].y + (S[S.length - 1].y - S[0].y) * liq.nivel;
    let i = 0;
    while (i < S.length - 2 && y > S[i + 1].y) i++;
    const t = Math.min(1, Math.max(0, (y - S[i].y) / Math.max(1e-6, S[i + 1].y - S[i].y)));
    const x0 = S[i].x0 + (S[i + 1].x0 - S[i].x0) * t - centro.x;
    const x1 = S[i].x1 + (S[i + 1].x1 - S[i].x1) * t - centro.x;
    const hw = S[i].hw + (S[i + 1].hw - S[i].hw) * t;
    const yy = y - 0.004 - centro.y;
    liq.altura = y;
    liq.matPared.uniforms.uTope.value = y - centro.y;
    const at = liq.superficie.geometry.attributes.position;
    at.array.set([x0, yy, -hw - centro.z, x1, yy, -hw - centro.z, x1, yy, hw - centro.z, x0, yy, -hw - centro.z, x1, yy, hw - centro.z, x0, yy, hw - centro.z]);
    at.needsUpdate = true;
    liq.superficie.visible = liq.nivel > 0.004;
    liq.dibujado = liq.nivel;
  };
  if (liq) ponerSuperficie();

  // El FLUJO: estelas de luz que corren por uno o más CHORROS (no giran con la pieza: cuelgan del grupo). Cada estela es un
  // segmento con la cabeza encendida y la cola apagada (con la luz sumada, la cola se pierde), más un punto redondo en la cabeza:
  // dice hacia dónde va el aire aunque la imagen esté quieta, y se alarga con la velocidad. Un chorro sigue un CAMINO (una curva
  // suave por sus puntos, muestreada a pasos iguales, con su marco transportado: lo que va por afuera de una curva sigue por
  // afuera) y sus estelas aparecen y se apagan de a poco en las puntas. Todos van en dos llamadas de dibujo
  let estelas = null;
  let velFlujo = 0;
  const chorros = [];
  if (flujo) {
    const defs = Array.isArray(flujo) ? flujo : flujo.chorros ? flujo.chorros.map((ch) => ({n: flujo.n, cola: flujo.cola, color: flujo.color, ...ch})) : [flujo];
    let total = 0;
    defs.forEach((f, j) => {
      let puntos;
      let ancho = f.ancho ?? 0;
      let alto = f.alto ?? 0;
      const radio = f.radio ?? 0;
      if (f.camino) puntos = f.camino.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      else {
        // la forma de antes: a lo largo del eje x del marco, entre dos x; alrededor del eje (radio) o llenando una caja en y, z
        const cy = f.caja ? (f.caja[0][0] + f.caja[1][0]) / 2 : 0;
        const cz = f.caja ? (f.caja[0][1] + f.caja[1][1]) / 2 : 0;
        puntos = [new THREE.Vector3(f.hasta, cy, cz), new THREE.Vector3(f.desde, cy, cz)];
        if (f.caja) {
          alto = Math.abs(f.caja[1][0] - f.caja[0][0]) / 2;
          ancho = Math.abs(f.caja[1][1] - f.caja[0][1]) / 2;
        }
      }
      const curva = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
      const N = puntos.length > 2 ? 16 * (puntos.length - 1) : 1;
      const marcos = curva.computeFrenetFrames(N, false);
      const L = curva.getLength();
      const n = f.n || 110;
      const s = new Float32Array(n); // por dónde va la cabeza de cada estela (de 0 a L)
      const lu = new Float32Array(n); // y cuánto se aparta del camino, a lo ancho y a lo alto
      const lw = new Float32Array(n);
      let semilla = 12345 + j * 7919;
      const azar = () => ((semilla = (semilla * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < n; i++) {
        s[i] = azar() * L;
        if (radio) {
          const r = radio * Math.sqrt(0.06 + 0.94 * azar());
          const ang = azar() * Math.PI * 2;
          lu[i] = r * Math.cos(ang);
          lw[i] = r * Math.sin(ang);
        } else {
          lu[i] = ancho * (azar() * 2 - 1);
          lw[i] = alto * (azar() * 2 - 1);
        }
      }
      chorros.push({
        pts: curva.getSpacedPoints(N),
        nor: marcos.normals,
        bin: marcos.binormals,
        N,
        L,
        n,
        s,
        lu,
        lw,
        desde: total,
        abre: f.radio2 && radio ? f.radio2 / radio : (f.abre ?? 1),
        vel: f.vel ?? 1,
        cola: f.cola ?? 0.2,
        funde: f.funde ?? 0.12,
        c1: new THREE.Color(f.color || '#bff1ff'),
        c2: f.color2 ? new THREE.Color(f.color2) : null,
        cambia: f.cambia || [0.4, 0.6],
        sigue: [].concat(f.sigue || []).map((q) => ({canal: q.canal, mueve: new THREE.Vector3(q.mueve[0], q.mueve[1], q.mueve[2])})),
        lleva: f.lleva ? {canal: f.lleva.canal, liquido: f.lleva.liquido, factor: f.lleva.factor ?? 1} : null,
        minimo: f.minimo ?? 0, // corre recién cuando el flujo llega a este valor
        v: 0, // a qué velocidad va ahora
        ultima: 0, // la última distinta de cero: al apagarse, las estelas conservan su largo
        op: 0, // cuánta luz tiene (se enciende y se apaga de a poco)
      });
      total += n;
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 6), 3).setUsage(THREE.DynamicDrawUsage));
    lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(total * 6), 3).setUsage(THREE.DynamicDrawUsage));
    const lineas = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false}));
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(total * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const cabezas = new THREE.Points(pg, new THREE.PointsMaterial({vertexColors: true, map: texturaPunto(), size: defs[0].tam || flujo.tam || 0.014, sizeAttenuation: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false}));
    estelas = new THREE.Group();
    estelas.name = `pieza-holo-${clave}-flujo`;
    estelas.visible = false;
    for (const o of [lineas, cabezas]) {
      o.frustumCulled = false;
      o.renderOrder = 7;
      estelas.add(o);
    }
    estelas.userData = {lineas, cabezas, total};
    grupo.add(estelas);
    geos.push(lg, pg);
  }

  // Los CANALES: cada uno lleva la posición de sus partes, que va de «desde» a «hacia» con arranque y llegada suaves (irA) o
  // persiguiendo un blanco que se mueve (seguir)
  // Un canal CONTINUO es una velocidad: lo que mueve a sus partes es lo que lleva acumulado («fase»)
  const canales = new Map();
  const canalNuevo = () => ({valor: 0, desde: 0, hacia: 0, avance: 1, duracion: 1, persigue: false, continuo: false, fase: 0, velocidad: null});
  for (const q of partes)
    for (const mv of q.movs) {
      if (!canales.has(mv.canal)) canales.set(mv.canal, canalNuevo());
      const cn = canales.get(mv.canal);
      if (mv.continuo) cn.continuo = true;
      if (cn.velocidad === null && mv.velocidad) cn.velocidad = mv.velocidad;
    }
  // (lo que entra y lo que sale del líquido también son canales, aunque no muevan ninguna parte)
  if (liq) for (const nombre of [liq.entra, liq.sale]) if (nombre && !canales.has(nombre)) canales.set(nombre, canalNuevo());
  const primero = canales.keys().next().value ?? CANAL;
  if (!canales.size) canales.set(primero, canalNuevo());
  for (const cn of canales.values()) cn.velocidad ??= velocidad;
  const canalDe = (nombre) => canales.get(nombre ?? primero);
  const ida = new THREE.Matrix4();
  const giro = new THREE.Matrix4();
  const vuelta = new THREE.Matrix4();
  const otra = new THREE.Matrix4();
  /** la matriz de un movimiento, con su canal como está ahora */
  const matrizDe = (mv, out) => {
    const cn = canales.get(mv.canal);
    const v = cn.continuo ? cn.fase : cn.valor;
    if (mv.mueve) return out.makeTranslation(mv.mueve.x * v, mv.mueve.y * v, mv.mueve.z * v);
    ida.makeTranslation(mv.p.x, mv.p.y, mv.p.z);
    giro.makeRotationAxis(mv.eje, mv.angulo * v);
    vuelta.makeTranslation(-mv.p.x, -mv.p.y, -mv.p.z);
    return out.copy(ida).multiply(giro).multiply(vuelta);
  };
  const mover = () => {
    for (const q of partes) {
      matrizDe(q.movs[0], q.malla.matrix);
      for (let i = 1; i < q.movs.length; i++) q.malla.matrix.premultiply(matrizDe(q.movs[i], otra)); // el de encima se aplica después
      q.malla.matrixWorldNeedsUpdate = true;
    }
  };
  // las estelas de los chorros
  const pCabeza = new THREE.Vector3();
  const pCola = new THREE.Vector3();
  const corrido = new THREE.Vector3();
  const escalon = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : suave(x));
  /** el punto del chorro por donde va la estela i cuando su cabeza lleva recorrido s (en el marco, sin centrar) */
  const puntoDe = (ch, sv, i, out) => {
    const f = Math.min(Math.max(sv / ch.L, 0), 1) * ch.N;
    const k0 = Math.min(Math.floor(f), ch.N - 1);
    const t = f - k0;
    const e = 1 + (ch.abre - 1) * Math.min(Math.max(sv / ch.L, 0), 1);
    const A = ch.pts[k0];
    const B = ch.pts[k0 + 1];
    const n0 = ch.nor[k0];
    const n1 = ch.nor[k0 + 1];
    const b0 = ch.bin[k0];
    const b1 = ch.bin[k0 + 1];
    const u = ch.lu[i] * e;
    const w = ch.lw[i] * e;
    return out.set(A.x + (B.x - A.x) * t + (n0.x + (n1.x - n0.x) * t) * u + (b0.x + (b1.x - b0.x) * t) * w, A.y + (B.y - A.y) * t + (n0.y + (n1.y - n0.y) * t) * u + (b0.y + (b1.y - b0.y) * t) * w, A.z + (B.z - A.z) * t + (n0.z + (n1.z - n0.z) * t) * u + (b0.z + (b1.z - b0.z) * t) * w);
  };
  let velGiro = gira ? gira.vel : 0;
  let giroObjetivo = velGiro;
  // la actitud: cuánto está inclinado «interior» sobre cada eje del marco (el eje del giro propio no se toca)
  const actitud = new THREE.Vector3();
  const actitudObjetivo = new THREE.Vector3();
  const triangulos = (fijo.pos.length + sueltas.reduce((s, mv) => s + mv.datos.pos.length, 0)) / 9;
  const esfera = geos.reduce((r, g) => (g.boundingSphere ? Math.max(r, g.boundingSphere.center.length() + g.boundingSphere.radius) : r), 0);
  return {
    clave,
    grupo,
    interior,
    escala0: k,
    // el radio de lo que SE VE: con caja, el de la caja recortada (los triángulos grandes que la cruzan inflaban la esfera: la
    // cabina, de 0,9 m, daba 1,03 m de radio)
    radio: (cajas.length ? Math.min(esfera, lado.length() / 2) : esfera) * k,
    triangulos,
    mitad: lado.clone().multiplyScalar(0.5), // la mitad de lo que mide lo que se ve, en el marco de la pieza (sin escalar)
    centro, // el centro de la pieza, en el marco
    tieneMoviles: partes.length > 0,
    /** las partes móviles (para las pruebas): {malla, p, eje, angulo, canal} */
    partes,
    /** los nombres de los canales de las partes móviles */
    canales: [...canales.keys()],
    get abierta() {
      return canalDe().hacia === 1;
    },
    /** la posición actual de las partes móviles del canal por omisión (0 en reposo; 1 = abiertas) */
    get abertura() {
      return canalDe().valor;
    },
    get valor() {
      return canalDe().valor;
    },
    get objetivo() {
      return canalDe().hacia;
    },
    /** la posición actual y el blanco de un canal (0 si la pieza no lo tiene) */
    valorDe(canal) {
      const q = canales.get(canal);
      return q ? q.valor : 0;
    },
    objetivoDe(canal) {
      const q = canales.get(canal);
      return q ? q.hacia : 0;
    },
    /** lo que lleva acumulado un canal continuo (el giro de la rueda, en radianes) */
    faseDe(canal) {
      const q = canales.get(canal);
      return q ? q.fase : 0;
    },
    /** todas las partes móviles llegaron a su blanco (y las que andan solas, paradas) */
    get quieta() {
      for (const q of canales.values()) if (q.avance < 1 || q.valor !== q.hacia || (q.continuo && q.valor !== 0)) return false;
      return true;
    },
    /** lleva las partes móviles de un canal a la posición v (cada una gira angulo · v); con «ya», sin animar (para las pruebas) */
    irA(v, ya = false, canal = undefined) {
      const q = canalDe(canal);
      if (!q) return;
      if (ya) {
        q.valor = q.desde = q.hacia = v;
        q.avance = 1;
        q.persigue = false;
        mover();
        return;
      }
      const perseguia = q.persigue;
      q.persigue = false;
      if (v === q.hacia && !(perseguia && q.valor !== q.hacia)) return;
      q.desde = q.valor;
      q.hacia = v;
      q.avance = 0;
      q.duracion = Math.max(0.35, Math.abs(q.hacia - q.desde) / q.velocidad);
    },
    /** las partes móviles de un canal persiguen la posición v, que puede cambiar en cada cuadro (un mando continuo que el alumno
     * arrastra): sin el arranque suave de irA, que con un blanco que se mueve las dejaba siempre atrás */
    seguir(v, canal = undefined) {
      const q = canalDe(canal);
      if (!q) return;
      q.hacia = v;
      q.persigue = true;
      q.avance = 1;
    },
    /** abre (true) o cierra (false) las partes móviles del canal por omisión */
    abrir(si, ya = false) {
      this.irA(si ? 1 : 0, ya);
    },
    /** la velocidad del giro propio (rad/s); llega de a poco (con «ya», de una vez: para las pruebas) */
    ponerGiro(vel, ya = false) {
      giroObjetivo = vel;
      if (ya) velGiro = vel;
    },
    /** a qué velocidad está girando ahora (rad/s) */
    get giro() {
      return velGiro;
    },
    /** la actitud de la pieza: cuánto se inclina sobre los ejes x, y, z de su marco (rad); llega de a poco (con «ya», de una vez) */
    ponerActitud(x = 0, y = 0, z = 0, ya = false) {
      actitudObjetivo.set(x, y, z);
      if (ya) actitud.copy(actitudObjetivo);
    },
    /** la actitud de ahora y su blanco (Vector3, rad) */
    actitud,
    actitudObjetivo,
    /** la velocidad del flujo ahora (con signo; 0 = apagado) */
    get flujo() {
      return velFlujo;
    },
    /** la velocidad del flujo, en unidades del marco por segundo y con signo (0 lo apaga) */
    ponerFlujo(v) {
      velFlujo = v;
    },
    /** los chorros del flujo (para las pruebas): dónde empieza y dónde termina cada uno (en el marco), su largo, a qué velocidad
     * va ahora y cuánta luz tiene (de 0 a 1) */
    get chorros() {
      return chorros.map((ch) => ({desde: ch.pts[0].clone(), hasta: ch.pts[ch.N].clone(), largo: ch.L, velocidad: ch.v, luz: ch.op}));
    },
    /** la pieza lleva un líquido */
    tieneLiquido: !!liq,
    /** el nivel del líquido, de 0 (vacío) a 1 (lleno) */
    get nivel() {
      return liq ? liq.nivel : 0;
    },
    /** a qué altura está la superficie del líquido, en el marco de la pieza */
    get alturaNivel() {
      return liq ? liq.altura : 0;
    },
    /** lo que de verdad entra y sale del líquido ahora, en fracciones del recipiente por segundo (lleno, sólo entra lo que sale;
     * vacío, sólo sale lo que entra) */
    get caudales() {
      return liq ? {entra: liq.efEntra, sale: liq.efSale} : {entra: 0, sale: 0};
    },
    /** lleva el nivel del líquido a v (de 0 a 1): rápido, pero no de golpe; con «ya», de una vez */
    ponerNivel(v, ya = false) {
      if (!liq) return;
      const blanco = Math.min(1, Math.max(0, v));
      if (ya) {
        liq.nivel = blanco;
        liq.objetivo = null;
        ponerSuperficie();
      } else liq.objetivo = blanco;
    },
    /** un punto del marco (en reposo) llevado al mundo; conGiro: acompaña al giro propio de la pieza */
    aMundo(p, out = new THREE.Vector3(), conGiro = true) {
      grupo.updateWorldMatrix(true, true);
      return (conGiro ? interior : grupo).localToWorld(out.copy(p).sub(centro));
    },
    actualizar(dt, t) {
      U.uTiempo.value = t;
      velGiro += (giroObjetivo - velGiro) * Math.min(1, dt * 2.5);
      if (gira) interior.rotation[gira.eje] += velGiro * dt;
      if (!actitud.equals(actitudObjetivo)) {
        actitud.lerp(actitudObjetivo, Math.min(1, dt * 3.5));
        if (actitud.distanceToSquared(actitudObjetivo) < 1e-8) actitud.copy(actitudObjetivo);
      }
      for (const eje of ['x', 'y', 'z']) if (!gira || gira.eje !== eje) interior.rotation[eje] = actitud[eje];
      let movio = false;
      for (const q of canales.values()) {
        if (q.avance < 1) {
          q.avance = Math.min(1, q.avance + dt / q.duracion);
          q.valor = q.avance >= 1 ? q.hacia : q.desde + (q.hacia - q.desde) * suave(q.avance);
          movio = true;
        } else if (q.persigue && q.valor !== q.hacia) {
          q.valor += (q.hacia - q.valor) * Math.min(1, dt * 9);
          if (Math.abs(q.hacia - q.valor) < 2e-4) q.valor = q.hacia;
          movio = true;
        }
        if (q.continuo && q.valor) {
          q.fase += q.valor * dt; // lo que anda solo acumula su giro
          movio = true;
        }
      }
      if (movio) mover();
      if (liq) {
        const cnE = liq.entra ? canales.get(liq.entra) : null;
        const cnS = liq.sale ? canales.get(liq.sale) : null;
        const entra = Math.max(0, cnE ? cnE.valor : 0);
        const sale = Math.max(0, cnS ? cnS.valor : 0);
        liq.efEntra = entra;
        liq.efSale = sale;
        if (liq.objetivo !== null) {
          // un nivel pedido de afuera (el estado de una lección): llega rápido, pero no de golpe
          const falta = liq.objetivo - liq.nivel;
          const paso = dt * 2.5;
          if (Math.abs(falta) <= paso) {
            liq.nivel = liq.objetivo;
            liq.objetivo = null;
          } else liq.nivel += Math.sign(falta) * paso;
        } else {
          let n = liq.nivel + (entra - sale) * dt;
          if (n >= 1) {
            n = 1;
            if (entra > sale) liq.efEntra = sale; // lleno: sólo entra lo que sale
          }
          if (n <= 0) {
            n = 0;
            if (sale > entra) liq.efSale = entra; // vacío: sólo sale lo que entra
          }
          liq.nivel = n;
        }
        if (liq.nivel !== liq.dibujado) ponerSuperficie();
      }
      if (estelas) {
        const {lineas, cabezas} = estelas.userData;
        // cada chorro va a la velocidad del flujo, o a la de un canal (el piso, a la del borde de la rueda), y se enciende y se
        // apaga de a poco
        let alguno = false;
        for (const ch of chorros) {
          const cn = ch.lleva && ch.lleva.canal ? canales.get(ch.lleva.canal) : null;
          if (ch.lleva && ch.lleva.liquido) ch.v = liq ? (ch.lleva.liquido === 'entra' ? liq.efEntra : liq.efSale) * ch.lleva.factor : 0; // al paso de lo que de verdad entra o sale
          else if (ch.lleva) ch.v = cn ? cn.valor * ch.lleva.factor : 0;
          else ch.v = Math.abs(velFlujo) >= ch.minimo ? velFlujo * ch.vel : 0;
          if (ch.v) ch.ultima = ch.v;
          ch.op += ((ch.v ? 1 : 0) - ch.op) * Math.min(1, dt * 3);
          if (ch.op > 0.02) alguno = true;
        }
        estelas.visible = alguno;
        if (estelas.visible) {
          const PL = lineas.geometry.attributes.position.array;
          const CL = lineas.geometry.attributes.color.array;
          const PP = cabezas.geometry.attributes.position.array;
          const CP = cabezas.geometry.attributes.color.array;
          for (const ch of chorros) {
            const avance = ch.v * dt;
            const largo = ch.cola * ch.ultima; // el largo (con signo) de la estela
            // el chorro entero se corre con sus canales (el piso, que sube y baja con la pata)
            corrido.copy(centro).negate();
            for (const q of ch.sigue) {
              const cn = canales.get(q.canal);
              if (cn) corrido.addScaledVector(q.mueve, cn.valor);
            }
            for (let i = 0; i < ch.n; i++) {
              let sv = ch.s[i] + avance;
              if (sv < 0) sv += ch.L;
              else if (sv >= ch.L) sv -= ch.L;
              ch.s[i] = sv;
              puntoDe(ch, sv, i, pCabeza).add(corrido);
              puntoDe(ch, Math.min(Math.max(sv - largo, 0), ch.L), i, pCola).add(corrido);
              const u = sv / ch.L;
              const borde = (ch.funde > 0 ? escalon(u / ch.funde) * escalon((1 - u) / ch.funde) : 1) * ch.op;
              const k = ch.c2 ? escalon((u - ch.cambia[0]) / Math.max(1e-6, ch.cambia[1] - ch.cambia[0])) : 0;
              const r = (ch.c2 ? ch.c1.r + (ch.c2.r - ch.c1.r) * k : ch.c1.r) * borde;
              const g = (ch.c2 ? ch.c1.g + (ch.c2.g - ch.c1.g) * k : ch.c1.g) * borde;
              const b = (ch.c2 ? ch.c1.b + (ch.c2.b - ch.c1.b) * k : ch.c1.b) * borde;
              const o = (ch.desde + i) * 6;
              PL[o] = pCabeza.x;
              PL[o + 1] = pCabeza.y;
              PL[o + 2] = pCabeza.z;
              PL[o + 3] = pCola.x;
              PL[o + 4] = pCola.y;
              PL[o + 5] = pCola.z;
              CL[o] = r;
              CL[o + 1] = g;
              CL[o + 2] = b; // (la cola queda en negro: con la luz sumada, se pierde)
              const p = (ch.desde + i) * 3;
              PP[p] = pCabeza.x;
              PP[p + 1] = pCabeza.y;
              PP[p + 2] = pCabeza.z;
              CP[p] = r;
              CP[p + 1] = g;
              CP[p + 2] = b;
            }
          }
          for (const at of [lineas.geometry.attributes.position, lineas.geometry.attributes.color, cabezas.geometry.attributes.position, cabezas.geometry.attributes.color]) at.needsUpdate = true;
        }
      }
    },
    liberar() {
      grupo.removeFromParent();
      for (const g of geos) g.dispose();
      for (const m of materiales) m.dispose();
      if (estelas) for (const o of estelas.children) o.material.dispose();
    },
  };
}
