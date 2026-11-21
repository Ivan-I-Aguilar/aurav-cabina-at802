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
import * as THREE from '../three.module.js';

const VERT = /* glsl */ `
attribute float aLuz;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying float vLuz;
void main() {
  vP = position;
  vLuz = aLuz;
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
uniform float uPaso;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying float vLuz;
void main() {
  if (uCaja > 0.5 && (any(lessThan(vP, uMin)) || any(greaterThan(vP, uMax)))) discard;
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
  float barrido = 0.8 + 0.2 * sin(vP.y * uPaso - uTiempo * 2.4);
  float i = ((0.07 + 0.6 * f) * barrido + vLuz) * uBrillo; // vLuz: la luz propia de lo que tiene que leerse de frente (una escala)
  gl_FragColor = vec4(uColor * i, 1.0);
  #include <colorspace_fragment>
}`;

const suave = (x) => x * x * (3 - 2 * x);

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
 * omisión, la primera fuente); caja: Box3 en ese marco para recortar (o null: la malla entera); tam: cuánto mide su lado más largo
 * (m); gira: {eje: 'x' | 'y' | 'z', vel: rad/s} si la pieza gira sobre un eje de su marco (la hélice).
 * Partes que se mueven, de dos maneras (todo en el marco, ángulos en radianes):
 *  - moviles: [{fuentes, a, b, angulo}]: mallas enteras que giran sobre el eje que va de a hasta b (Vector3);
 *  - elegir(isla): para las islas de «fuentes» ({n, min, max, centro}); devuelve null (queda fija) o {a, b, angulo}.
 * Con las partes en la posición v, cada una está girada angulo · v: irA(v) las lleva (abrir(true | false) = irA(1 | 0)).
 * velocidad: cuánto cambia v por segundo. flujo: {n, radio, desde, hasta, cola, tam, color} = estelas de luz a lo largo del eje x
 * del marco, dentro de ese radio, entre esas dos x (cola: su largo a velocidad 1); ponerFlujo(v) las mueve a v unidades del marco
 * por segundo (con signo; 0 las apaga).
 * Devuelve {clave, grupo, interior, radio, mitad, centro, triangulos, tieneMoviles, abierta, abertura, valor, objetivo, irA, abrir,
 * ponerGiro, ponerFlujo, aMundo, actualizar(dt, t), liberar()}: el grupo se pone, se gira y se escala desde afuera; «interior» es
 * lo que gira solo; «mitad» es la media caja de lo que se ve, en reposo; aMundo(p) lleva un punto del marco al mundo.
 */
export function crearPiezaHolo({clave, fuentes, marco = null, caja = null, tam = 0.8, color = '#62d8ff', gira = null, brillo = 1, moviles = [], elegir = null, velocidad = 1 / 1.2, flujo = null}) {
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
  /** los triángulos de unas mallas, en el marco de la pieza (y dentro de la caja, si hay): {pos, nor, luz} */
  const extraer = (mallas) => {
    const pos = [];
    const nor = [];
    const luz = [];
    for (const m of mallas) {
      const propia = +m.userData.luz || 0; // la luz propia de esa malla (userData.luz del modelo: la escala de la mirilla)
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
        if (caja && !caja.containsPoint(a) && !caja.containsPoint(b) && !caja.containsPoint(c)) continue;
        for (const [v, k] of [
          [a, i],
          [b, i + 1],
          [c, i + 2],
        ]) {
          pos.push(v.x, v.y, v.z);
          na.fromBufferAttribute(N, k).applyMatrix3(n3).normalize();
          nor.push(na.x, na.y, na.z);
          luz.push(propia);
          cubre.expandByPoint(v);
        }
      }
      if (g !== m.geometry) g.dispose();
    }
    return {pos, nor, luz};
  };
  let fijo = extraer(fuentes);
  const sueltas = moviles.map((mv) => ({...mv, datos: extraer(mv.fuentes)}));
  // las islas de lo fijo que el que llama quiere mover (las palas): salen de lo fijo y pasan a ser partes móviles
  if (elegir) {
    const quedan = {pos: [], nor: [], luz: []};
    const pasar = (hacia, t) => {
      for (let j = 0; j < 9; j++) hacia.pos.push(fijo.pos[t * 9 + j]), hacia.nor.push(fijo.nor[t * 9 + j]);
      for (let j = 0; j < 3; j++) hacia.luz.push(fijo.luz[t * 3 + j]);
    };
    for (const isla of islasDe(fijo.pos)) {
      const mv = elegir({n: isla.n, min: isla.min, max: isla.max, centro: isla.centro});
      const hacia = mv ? {pos: [], nor: [], luz: []} : quedan;
      for (const t of isla.triangulos) pasar(hacia, t);
      if (mv) sueltas.push({...mv, datos: hacia});
    }
    fijo = quedan;
  }
  if (caja) cubre.intersect(caja);
  const centro = cubre.getCenter(new THREE.Vector3());
  const lado = cubre.getSize(new THREE.Vector3());
  const k = tam / Math.max(lado.x, lado.y, lado.z, 1e-6);
  const U = {
    uColor: {value: new THREE.Color(color)},
    uTiempo: {value: 0},
    uBrillo: {value: brillo}, // menos en las piezas con muchas capas (la cabina), que sumadas dan un bloque blanco
    uCaja: {value: caja ? 1 : 0},
    uMin: {value: caja ? caja.min.clone().sub(centro) : new THREE.Vector3()},
    uMax: {value: caja ? caja.max.clone().sub(centro) : new THREE.Vector3()},
    uPaso: {value: 60 * k}, // el barrido, igual de fino cualquiera sea el tamaño de la pieza
  };
  const material = new THREE.ShaderMaterial({uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false});
  const geos = [];
  const armar = ({pos, nor, luz}, nombre) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('aLuz', new THREE.Float32BufferAttribute(luz, 1));
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
  // las partes móviles: cada una en su malla, con la matriz puesta a mano (un giro sobre su eje, ya en el marco centrado)
  const partes = sueltas.map((mv, i) => {
    const m = armar(mv.datos, `pieza-holo-${clave}-movil-${i}`);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false; // girada se sale de su esfera
    interior.add(m);
    const p = mv.a.clone().sub(centro);
    return {malla: m, p, eje: mv.b.clone().sub(mv.a).normalize(), angulo: mv.angulo};
  });
  const grupo = new THREE.Group();
  grupo.name = `pieza-${clave}`;
  grupo.add(interior);
  grupo.scale.setScalar(k);

  // el flujo: estelas de luz a lo largo del eje x del marco (no gira con la pieza: cuelga del grupo). Cada una es un segmento con
  // la cabeza encendida y la cola apagada (con la luz sumada, la cola se pierde), más un punto redondo en la cabeza: la estela
  // dice hacia dónde va el aire aunque la imagen esté quieta, y se alarga con la velocidad
  let estelas = null;
  let velFlujo = 0;
  let opFlujo = 0;
  let colaFlujo = 0;
  if (flujo) {
    const n = flujo.n || 110;
    const base = new Float32Array(n * 3); // la cabeza de cada estela, en el marco centrado
    let s = 12345;
    const azar = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < n; i++) {
      const r = flujo.radio * Math.sqrt(0.06 + 0.94 * azar());
      const ang = azar() * Math.PI * 2;
      base.set([flujo.hasta + (flujo.desde - flujo.hasta) * azar() - centro.x, r * Math.cos(ang) - centro.y, r * Math.sin(ang) - centro.z], i * 3);
    }
    const tono = new THREE.Color(flujo.color || '#bff1ff');
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    const col = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) col.set([tono.r, tono.g, tono.b, 0, 0, 0], i * 6);
    lg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const lineas = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false}));
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(base, 3).setUsage(THREE.DynamicDrawUsage));
    const cabezas = new THREE.Points(pg, new THREE.PointsMaterial({color: tono, map: texturaPunto(), size: flujo.tam || 0.014, sizeAttenuation: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false}));
    estelas = new THREE.Group();
    estelas.name = `pieza-holo-${clave}-flujo`;
    estelas.visible = false;
    for (const o of [lineas, cabezas]) {
      o.frustumCulled = false;
      o.renderOrder = 7;
      estelas.add(o);
    }
    estelas.userData = {lineas, cabezas, base, n, cola: flujo.cola ?? 0.2};
    grupo.add(estelas);
    geos.push(lg, pg);
  }

  // la posición de las partes móviles: va de «desde» a «hacia» con arranque y llegada suaves
  let valor = 0;
  let desde = 0;
  let hacia = 0;
  let avance = 1;
  let duracion = 1;
  const ida = new THREE.Matrix4();
  const giro = new THREE.Matrix4();
  const vuelta = new THREE.Matrix4();
  const mover = () => {
    for (const q of partes) {
      ida.makeTranslation(q.p.x, q.p.y, q.p.z);
      giro.makeRotationAxis(q.eje, q.angulo * valor);
      vuelta.makeTranslation(-q.p.x, -q.p.y, -q.p.z);
      q.malla.matrix.copy(ida).multiply(giro).multiply(vuelta);
      q.malla.matrixWorldNeedsUpdate = true;
    }
  };
  let velGiro = gira ? gira.vel : 0;
  let giroObjetivo = velGiro;
  const triangulos = (fijo.pos.length + sueltas.reduce((s, mv) => s + mv.datos.pos.length, 0)) / 9;
  const esfera = geos.reduce((r, g) => (g.boundingSphere ? Math.max(r, g.boundingSphere.center.length() + g.boundingSphere.radius) : r), 0);
  return {
    clave,
    grupo,
    interior,
    escala0: k,
    // el radio de lo que SE VE: con caja, el de la caja recortada (los triángulos grandes que la cruzan inflaban la esfera: la
    // cabina, de 0,9 m, daba 1,03 m de radio)
    radio: (caja ? Math.min(esfera, lado.length() / 2) : esfera) * k,
    triangulos,
    mitad: lado.clone().multiplyScalar(0.5), // la mitad de lo que mide lo que se ve, en el marco de la pieza (sin escalar)
    centro, // el centro de la pieza, en el marco
    tieneMoviles: partes.length > 0,
    /** las partes móviles (para las pruebas): {malla, eje, angulo} */
    partes,
    get abierta() {
      return hacia === 1;
    },
    /** la posición actual de las partes móviles (0 en reposo; 1 = abiertas) */
    get abertura() {
      return valor;
    },
    get valor() {
      return valor;
    },
    get objetivo() {
      return hacia;
    },
    /** lleva las partes móviles a la posición v (cada una gira angulo · v); con «ya», sin animar (para las pruebas) */
    irA(v, ya = false) {
      if (ya) {
        valor = desde = hacia = v;
        avance = 1;
        mover();
        return;
      }
      if (v === hacia) return;
      desde = valor;
      hacia = v;
      avance = 0;
      duracion = Math.max(0.35, Math.abs(hacia - desde) / velocidad);
    },
    /** abre (true) o cierra (false) las partes móviles */
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
    /** la velocidad del flujo ahora (con signo; 0 = apagado) */
    get flujo() {
      return velFlujo;
    },
    /** la velocidad del flujo, en unidades del marco por segundo y con signo (0 lo apaga) */
    ponerFlujo(v) {
      velFlujo = v;
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
      if (avance < 1) {
        avance = Math.min(1, avance + dt / duracion);
        valor = avance >= 1 ? hacia : desde + (hacia - desde) * suave(avance);
        mover();
      }
      if (estelas) {
        const {lineas, cabezas, base, n, cola} = estelas.userData;
        opFlujo += ((velFlujo ? 0.9 : 0) - opFlujo) * Math.min(1, dt * 3);
        lineas.material.opacity = cabezas.material.opacity = opFlujo;
        estelas.visible = opFlujo > 0.02;
        if (velFlujo) colaFlujo = cola * velFlujo; // el largo (con signo) de la estela; al apagarse el flujo queda la última
        if (estelas.visible) {
          const x0 = flujo.hasta - centro.x;
          const x1 = flujo.desde - centro.x;
          const L = lineas.geometry.attributes.position.array;
          for (let i = 0; i < n; i++) {
            let x = base[i * 3] + velFlujo * dt;
            if (x < x0) x += x1 - x0;
            else if (x > x1) x -= x1 - x0;
            base[i * 3] = x;
            L[i * 6] = x;
            L[i * 6 + 1] = L[i * 6 + 4] = base[i * 3 + 1];
            L[i * 6 + 2] = L[i * 6 + 5] = base[i * 3 + 2];
            L[i * 6 + 3] = x - colaFlujo;
          }
          lineas.geometry.attributes.position.needsUpdate = true;
          cabezas.geometry.attributes.position.needsUpdate = true;
        }
      }
    },
    liberar() {
      grupo.removeFromParent();
      for (const g of geos) g.dispose();
      material.dispose();
      if (estelas) for (const o of estelas.children) o.material.dispose();
    },
  };
}
