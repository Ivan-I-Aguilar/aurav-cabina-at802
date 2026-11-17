// Una PIEZA del avión en holograma, «en las manos» (T11, 16/11/2026; PLAN_TALLER.md §15.2b, pedido de Iván: «ver esa pieza tipo en
// tus manos, en un holograma»). Un solo mecanismo para todas: toma mallas del avión de juegos/at802.glb, las pasa al marco de la
// pieza, las recorta por una caja si hace falta (los triángulos de afuera se sacan y el sombreador corta limpio en el borde), las
// centra y las escala para que entren entre las manos, y las dibuja con el aspecto del holograma del motor (celeste, luz sumada,
// brillo de borde y barrido), en UNA llamada de dibujo. Sólo existe mientras está abierta.
import * as THREE from '../three.module.js';

const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vP = position;
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
void main() {
  if (uCaja > 0.5 && (any(lessThan(vP, uMin)) || any(greaterThan(vP, uMax)))) discard;
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
  float barrido = 0.8 + 0.2 * sin(vP.y * uPaso - uTiempo * 2.4);
  float i = (0.07 + 0.6 * f) * barrido * uBrillo;
  gl_FragColor = vec4(uColor * i, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * clave: el nombre de la pieza; fuentes: las mallas de donde sale; marco: el objeto en cuyo marco local queda la pieza (por
 * omisión, la primera fuente); caja: Box3 en ese marco para recortar (o null: la malla entera); tam: cuánto mide su lado más largo
 * (m); gira: {eje: 'x' | 'y' | 'z', vel: rad/s} si la pieza gira sobre un eje de su marco (la hélice).
 * Devuelve {clave, grupo, interior, radio, triangulos, actualizar(dt, t), liberar()}: el grupo se pone, se gira y se escala desde
 * afuera; «interior» es lo que gira solo.
 */
export function crearPiezaHolo({clave, fuentes, marco = null, caja = null, tam = 0.8, color = '#62d8ff', gira = null, brillo = 1}) {
  const ref = marco || fuentes[0];
  ref.updateWorldMatrix(true, false);
  const inv = new THREE.Matrix4().copy(ref.matrixWorld).invert();
  const m4 = new THREE.Matrix4();
  const n3 = new THREE.Matrix3();
  const pos = [];
  const nor = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const na = new THREE.Vector3();
  const cubre = new THREE.Box3();
  for (const m of fuentes) {
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
        cubre.expandByPoint(v);
      }
    }
    if (g !== m.geometry) g.dispose();
  }
  if (caja) cubre.intersect(caja);
  const centro = cubre.getCenter(new THREE.Vector3());
  const lado = cubre.getSize(new THREE.Vector3());
  const k = tam / Math.max(lado.x, lado.y, lado.z, 1e-6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.translate(-centro.x, -centro.y, -centro.z);
  geo.computeBoundingSphere();
  const U = {
    uColor: {value: new THREE.Color(color)},
    uTiempo: {value: 0},
    uBrillo: {value: brillo}, // menos en las piezas con muchas capas (la cabina), que sumadas dan un bloque blanco
    uCaja: {value: caja ? 1 : 0},
    uMin: {value: caja ? caja.min.clone().sub(centro) : new THREE.Vector3()},
    uMax: {value: caja ? caja.max.clone().sub(centro) : new THREE.Vector3()},
    uPaso: {value: 60 * k}, // el barrido, igual de fino cualquiera sea el tamaño de la pieza
  };
  const malla = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false}),
  );
  malla.name = `pieza-holo-${clave}`;
  malla.renderOrder = 7; // después de las marcas del recorrido (6): la pieza está más cerca del alumno que los discos
  const interior = new THREE.Group();
  interior.add(malla);
  const grupo = new THREE.Group();
  grupo.name = `pieza-${clave}`;
  grupo.add(interior);
  grupo.scale.setScalar(k);
  return {
    clave,
    grupo,
    interior,
    escala0: k,
    // el radio de lo que SE VE: con caja, el de la caja recortada (los triángulos grandes que la cruzan inflaban la esfera: la
    // cabina, de 0,9 m, daba 1,03 m de radio)
    radio: (caja ? Math.min(geo.boundingSphere.radius, lado.length() / 2) : geo.boundingSphere.radius) * k,
    triangulos: pos.length / 9,
    actualizar(dt, t) {
      U.uTiempo.value = t;
      if (gira) interior.rotation[gira.eje] += gira.vel * dt;
    },
    liberar() {
      grupo.removeFromParent();
      geo.dispose();
      malla.material.dispose();
    },
  };
}
