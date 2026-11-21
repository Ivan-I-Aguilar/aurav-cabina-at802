// Una PIEZA del avión en holograma, «en las manos» (T11, 16/11/2026; PLAN_TALLER.md §15.2b, pedido de Iván: «ver esa pieza tipo en
// tus manos, en un holograma»). Un solo mecanismo para todas: toma mallas del avión de juegos/at802.glb (o de un modelo propio, como
// taller/compuerta.glb), las pasa al marco de la pieza, las recorta por una caja si hace falta (los triángulos de afuera se sacan y
// el sombreador corta limpio en el borde), las centra y las escala para que entren entre las manos, y las dibuja con el aspecto del
// holograma del motor (celeste, luz sumada, brillo de borde y barrido), en UNA llamada de dibujo. Sólo existe mientras está abierta.
// Desde la T12 una pieza puede traer PARTES QUE SE MUEVEN (las hojas de la compuerta): cada una es una malla más, que gira sobre su
// bisagra al abrir y al cerrar.
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

/**
 * clave: el nombre de la pieza; fuentes: las mallas de donde sale; marco: el objeto en cuyo marco local queda la pieza (por
 * omisión, la primera fuente); caja: Box3 en ese marco para recortar (o null: la malla entera); tam: cuánto mide su lado más largo
 * (m); gira: {eje: 'x' | 'y' | 'z', vel: rad/s} si la pieza gira sobre un eje de su marco (la hélice); moviles: las partes que se
 * mueven, [{fuentes, a, b, angulo}]: giran «angulo» (rad, con signo) sobre el eje que va de a hasta b (Vector3 en el marco) al abrir.
 * Devuelve {clave, grupo, interior, radio, mitad, triangulos, tieneMoviles, abierta, abertura, abrir(si), actualizar(dt, t),
 * liberar()}: el grupo se pone, se gira y se escala desde afuera; «interior» es lo que gira solo; «mitad» es la media caja de lo
 * que se ve, cerrada (para saber hasta dónde sube); abrir(true | false) abre o cierra las partes móviles en 1,2 s.
 */
export function crearPiezaHolo({clave, fuentes, marco = null, caja = null, tam = 0.8, color = '#62d8ff', gira = null, brillo = 1, moviles = []}) {
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
  /** los triángulos de unas mallas, en el marco de la pieza (y dentro de la caja, si hay): {pos, nor} */
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
  const fijo = extraer(fuentes);
  const sueltas = moviles.map((mv) => ({...mv, datos: extraer(mv.fuentes)}));
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
  // las partes móviles: cada una en su malla, con la matriz puesta a mano (un giro sobre su bisagra, ya en el marco centrado)
  const partes = sueltas.map((mv, i) => {
    const m = armar(mv.datos, `pieza-holo-${clave}-movil-${i}`);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false; // abierta se sale de su esfera
    interior.add(m);
    const p = mv.a.clone().sub(centro);
    return {malla: m, p, eje: mv.b.clone().sub(mv.a).normalize(), angulo: mv.angulo};
  });
  const grupo = new THREE.Group();
  grupo.name = `pieza-${clave}`;
  grupo.add(interior);
  grupo.scale.setScalar(k);
  let abertura = 0; // 0 cerrada · 1 abierta
  let objetivo = 0;
  const ida = new THREE.Matrix4();
  const giro = new THREE.Matrix4();
  const vuelta = new THREE.Matrix4();
  const mover = () => {
    const s = suave(abertura);
    for (const q of partes) {
      ida.makeTranslation(q.p.x, q.p.y, q.p.z);
      giro.makeRotationAxis(q.eje, q.angulo * s);
      vuelta.makeTranslation(-q.p.x, -q.p.y, -q.p.z);
      q.malla.matrix.copy(ida).multiply(giro).multiply(vuelta);
      q.malla.matrixWorldNeedsUpdate = true;
    }
  };
  const triangulos = (fijo.pos.length + sueltas.reduce((s, mv) => s + mv.datos.pos.length, 0)) / 9;
  const esfera = geos.reduce((r, g) => Math.max(r, g.boundingSphere.center.length() + g.boundingSphere.radius), 0);
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
    tieneMoviles: partes.length > 0,
    get abierta() {
      return objetivo === 1;
    },
    get abertura() {
      return abertura;
    },
    /** abre (true) o cierra (false) las partes móviles; con «ya», sin animar (para las pruebas) */
    abrir(si, ya = false) {
      objetivo = si ? 1 : 0;
      if (ya) {
        abertura = objetivo;
        mover();
      }
    },
    actualizar(dt, t) {
      U.uTiempo.value = t;
      if (gira) interior.rotation[gira.eje] += gira.vel * dt;
      if (abertura !== objetivo) {
        abertura = objetivo > abertura ? Math.min(1, abertura + dt / 1.2) : Math.max(0, abertura - dt / 1.2);
        mover();
      }
    },
    liberar() {
      grupo.removeFromParent();
      for (const g of geos) g.dispose();
      material.dispose();
    },
  };
}
