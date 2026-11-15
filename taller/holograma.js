// El holograma del motor para VR (taller de motores, T1, 15/11/2026; PLAN_TALLER.md §5). Toma el motor que arma engine.js tal
// como viene (no toca su geometría ni su update) y lo dibuja como holograma, sin postproceso:
// - engine.js sigue posando todo (giros, sacudida, flujo, llama, inyectores, ignitores, fallas): se llama a su update() en cada
//   cuadro, pero sus mallas sólidas pasan a la capa 31, que ninguna cámara mira.
// - Las mallas sólidas se juntan por CUERPO QUE GIRA (lo fijo, el generador de gas, la turbina libre, el solar, el portasatélites
//   y cada satélite): una malla por cuerpo, colgada del mismo nodo que gira, así el giro sale solo. Qué gira se averigua probando
//   el update con ga, pa y pr distintos (holograma.js no sabe de qué motor se trata: sirve igual para el motor real).
// - Cada vértice lleva su estación (aTag) y si es pieza principal (aPrim): aislar una estación, el fantasma, el acento y el corte
//   son uniforms del sombreador, sin cambiar materiales. Contornos con EdgesGeometry en los cuerpos grandes.
// - Las 1500 partículas del flujo (esferas de 80 triángulos: 120 k) pasan a puntos de luz: se copian de la InstancedMesh que
//   escribe engine.js (posición, tamaño y color), que queda escondida.
// - Los efectos repetidos (14 chorros, 2 chispas) se juntan en una malla; llama, estampido, escombros y álabes dañados quedan.
import * as THREE from '../three.module.js';

export const CAPA_OCULTA = 31;

const VERT = /* glsl */ `
attribute float aTag;
attribute float aPrim;
uniform mat4 uRaizInv;
varying vec3 vN;
varying vec3 vV;
varying float vTag;
varying float vPrim;
varying vec3 vM;
void main() {
  vec4 mundo = modelMatrix * vec4(position, 1.0);
  vec4 mv = viewMatrix * mundo;
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vTag = aTag;
  vPrim = aPrim;
  vM = (uRaizInv * mundo).xyz;
  gl_Position = projectionMatrix * mv;
}`;
const COMUN = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAcento;
uniform float uTiempo;
uniform float uEstacion;
uniform float uFade;
uniform float uTodo;
uniform float uMostrarA;
uniform float uMostrarB;
uniform float uAcc;
uniform float uCorte;
uniform vec3 uCorteN;
uniform float uBrillo;
varying float vTag;
varying float vPrim;
varying vec3 vM;
float barrido() { return 0.8 + 0.2 * sin(vM.y * 0.06 - uTiempo * 2.4); }
float parpadeo() { return 0.95 + 0.05 * sin(uTiempo * 29.0) * sin(uTiempo * 6.1); }
float visible() {
  bool visto = uEstacion < 0.5 || uTodo > 0.5 || abs(vTag - uMostrarA) < 0.5 || abs(vTag - uMostrarB) < 0.5;
  return visto ? 1.0 : 1.0 - 0.9 * uFade;
}
bool acento() { return uEstacion > 0.5 && uFade > 0.5 && abs(vTag - uAcc) < 0.5 && vPrim > 0.5; }
`;
const FRAG = /* glsl */ `
${COMUN}
uniform float uBase;
uniform float uBorde;
uniform float uPot;
varying vec3 vN;
varying vec3 vV;
void main() {
  if (uCorte > 0.5 && dot(vM, uCorteN) < 0.0) discard;
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPot);
  bool acc = acento();
  vec3 col = acc ? uAcento : uColor;
  float i = (uBase + uBorde * f) * barrido() * parpadeo() * visible() * uBrillo * (acc ? 1.6 : 1.0);
  gl_FragColor = vec4(col * i, 1.0);
  #include <colorspace_fragment>
}`;
const VERT_L = /* glsl */ `
attribute float aTag;
attribute float aPrim;
uniform mat4 uRaizInv;
varying float vTag;
varying float vPrim;
varying vec3 vM;
void main() {
  vec4 mundo = modelMatrix * vec4(position, 1.0);
  vTag = aTag;
  vPrim = aPrim;
  vM = (uRaizInv * mundo).xyz;
  gl_Position = projectionMatrix * viewMatrix * mundo;
}`;
const FRAG_L = /* glsl */ `
${COMUN}
uniform float uLinea;
void main() {
  if (uCorte > 0.5 && dot(vM, uCorteN) < 0.0) discard;
  bool acc = acento();
  vec3 col = acc ? uAcento : uColor;
  gl_FragColor = vec4(col * uLinea * barrido() * parpadeo() * visible() * uBrillo * (acc ? 1.8 : 1.0), 1.0);
  #include <colorspace_fragment>
}`;

const suave = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

/** una mancha redonda y suave para los puntos de luz */
function mancha() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Envuelve la raíz del motor (en mm, con su escala 0,001) en grupo → centro → raíz, con el centro de su caja en el origen del
 * grupo. engine.js pisa raiz.position en cada update (la sacudida), por eso el centrado va en un nodo aparte.
 */
export function envolverMotor(raiz) {
  raiz.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert();
  const caja = new THREE.Box3();
  const c = new THREE.Box3();
  raiz.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || (o.userData && o.userData.fx)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    c.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    caja.union(c);
  });
  const centroMm = caja.getCenter(new THREE.Vector3());
  const grupo = new THREE.Group();
  grupo.name = 'motor';
  const centro = new THREE.Group();
  centro.name = 'motor-centro';
  centro.position.copy(centroMm).multiplyScalar(-raiz.scale.x);
  grupo.add(centro);
  centro.add(raiz);
  const tam = caja.getSize(new THREE.Vector3()).multiplyScalar(raiz.scale.x);
  return {grupo, centro, cajaMm: caja, tam};
}

/**
 * eng: lo que devuelve buildEngine() (root, update, PARTS…). opciones: estado0 (un estado del modelo en marcha, para probar qué
 * gira), conjuntos (STATIONS de engine.js: qué queda y qué se resalta en cada estación), color, acento, tamPunto (m).
 */
export function crearHolograma(eng, {estado0, conjuntos = {}, color = '#62d8ff', acento = '#ffc46b', tamPunto = 0.011, brilloFlujo = 1.25, atenuarGrandes = 0.1} = {}) {
  const raiz = eng.root;
  const env = envolverMotor(raiz);

  // ------------------------------------------------------------ 1. qué gira: se prueba el update con ga, pa y pr distintos
  const s0 = {...estado0, ga: 0, pa: 0, pr: 0};
  const leer = () => {
    const m = new Map();
    raiz.traverse((o) => m.set(o, o.rotation.z));
    return m;
  };
  eng.update(s0, {});
  const reposo = leer();
  const gira = new Set();
  for (const k of ['ga', 'pa', 'pr']) {
    eng.update({...s0, [k]: 0.137}, {});
    for (const [o, z] of leer()) if (Math.abs(z - reposo.get(o)) > 1e-7) gira.add(o);
  }
  eng.update(s0, {});
  raiz.updateMatrixWorld(true);
  const cuerpoDe = (o) => {
    for (let p = o; p && p !== raiz; p = p.parent) if (gira.has(p)) return p;
    return raiz;
  };

  // ------------------------------------------------------------ 2. clasificar
  const solidas = [];
  const efectos = [];
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    const d = o.userData || {};
    if (!o.isInstancedMesh && !d.fx && d.mat0 && d.mat0.isMeshStandardMaterial) solidas.push(o);
    else efectos.push(o);
  });

  // ------------------------------------------------------------ 3. materiales del holograma (uniforms compartidos)
  const U = {
    uTiempo: {value: 0},
    uColor: {value: new THREE.Color(color)},
    uAcento: {value: new THREE.Color(acento)},
    uEstacion: {value: 0},
    uFade: {value: 0},
    uTodo: {value: 1},
    uMostrarA: {value: -9},
    uMostrarB: {value: -9},
    uAcc: {value: -9},
    uCorte: {value: 1},
    uCorteN: {value: new THREE.Vector3(-1, 0, 0)},
    uRaizInv: {value: new THREE.Matrix4()},
    uBrillo: {value: 1},
    // por capa: el holograma suma todas sus capas (aditivo); con 0,07 / 1,0 la cámara de combustión y los discos de canto se
    // saturaban en blanco (15/11)
    uBase: {value: 0.035},
    uBorde: {value: 0.42},
    uPot: {value: 2.6},
    uLinea: {value: 0.42},
  };
  const comun = {uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false};
  const matSolido = new THREE.ShaderMaterial({...comun, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide});
  const matLinea = new THREE.ShaderMaterial({...comun, vertexShader: VERT_L, fragmentShader: FRAG_L});

  // ------------------------------------------------------------ 4. una malla por cuerpo (y sus contornos)
  const porCuerpo = new Map();
  for (const m of solidas) {
    const c = cuerpoDe(m);
    if (!porCuerpo.has(c)) porCuerpo.set(c, []);
    porCuerpo.get(c).push(m);
  }
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  const rel = new THREE.Matrix4();
  const nm = new THREE.Matrix3();
  const cuerpos = [];
  let triangulos = 0;
  let segmentos = 0;
  for (const [c, mallas] of porCuerpo) {
    inv.copy(c.matrixWorld).invert();
    const pos = [];
    const nor = [];
    const tag = [];
    const prim = [];
    const lpos = [];
    const ltag = [];
    const lprim = [];
    const rangos = [];
    let tri = 0;
    for (const m of mallas) {
      rel.multiplyMatrices(inv, m.matrixWorld);
      nm.getNormalMatrix(rel);
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
      const P = g.attributes.position;
      const N = g.attributes.normal;
      const t = m.userData.tag ?? 0;
      const pr = m.userData.prim ? 1 : 0;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(rel);
        n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        pos.push(v.x, v.y, v.z);
        nor.push(n.x, n.y, n.z);
        tag.push(t);
        prim.push(pr);
      }
      rangos.push({malla: m, desde: tri, hasta: tri + P.count / 3});
      tri += P.count / 3;
      if (g !== m.geometry) g.dispose();
      m.layers.set(CAPA_OCULTA);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('aTag', new THREE.Float32BufferAttribute(tag, 1));
    geo.setAttribute('aPrim', new THREE.Float32BufferAttribute(prim, 1));
    geo.computeBoundingSphere();
    const malla = new THREE.Mesh(geo, matSolido);
    malla.name = `holo-${c === raiz ? 'fijo' : c.name || c.type}`;
    malla.renderOrder = 5;
    malla.userData.rangos = rangos;
    c.add(malla);
    triangulos += tri;
    // contornos: sólo en los cuerpos grandes (en los chicos alcanza con el brillo de borde)
    let lineas = null;
    if (tri >= 1500) {
      for (const m of mallas) {
        rel.multiplyMatrices(inv, m.matrixWorld);
        const e = new THREE.EdgesGeometry(m.geometry, 32);
        const P = e.attributes.position;
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i).applyMatrix4(rel);
          lpos.push(v.x, v.y, v.z);
          ltag.push(m.userData.tag ?? 0);
          lprim.push(m.userData.prim ? 1 : 0);
        }
        e.dispose();
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3));
      lg.setAttribute('aTag', new THREE.Float32BufferAttribute(ltag, 1));
      lg.setAttribute('aPrim', new THREE.Float32BufferAttribute(lprim, 1));
      lg.computeBoundingSphere();
      lineas = new THREE.LineSegments(lg, matLinea);
      lineas.name = `${malla.name}-contornos`;
      lineas.renderOrder = 5;
      c.add(lineas);
      segmentos += lpos.length / 6;
    }
    cuerpos.push({nodo: c, malla, lineas, triangulos: tri, mallas: mallas.length});
  }

  // ------------------------------------------------------------ 5. efectos: los repetidos se juntan; el flujo pasa a puntos
  inv.copy(raiz.matrixWorld).invert();
  const porMaterial = new Map();
  for (const m of efectos) {
    if (m.isInstancedMesh || !m.userData.fx) continue;
    if (!porMaterial.has(m.material)) porMaterial.set(m.material, []);
    porMaterial.get(m.material).push(m);
  }
  const juntados = [];
  for (const [mat, lista] of porMaterial) {
    mat.blending = THREE.AdditiveBlending;
    mat.depthWrite = false;
    mat.toneMapped = false;
    mat.needsUpdate = true;
    // los efectos grandes (la llama y el estampido, que cubren toda la cámara o el compresor) se atenúan a un décimo: en el
    // holograma nada los tapa y se suman todas sus capas; con 0,32 todavía daban un bloque crema que tapaba los inyectores (15/11).
    // Se baja el color, no la opacidad (la opacidad la pisa engine.js en cada cuadro).
    if (!lista[0].geometry.boundingSphere) lista[0].geometry.computeBoundingSphere();
    if (lista.length === 1 && lista[0].geometry.boundingSphere.radius > 150) mat.color.multiplyScalar(atenuarGrandes);
    if (lista.length < 2) continue;
    const pos = [];
    for (const m of lista) {
      rel.multiplyMatrices(inv, m.matrixWorld);
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(rel);
        pos.push(v.x, v.y, v.z);
      }
      m.layers.set(CAPA_OCULTA);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeBoundingSphere();
    const malla = new THREE.Mesh(geo, mat);
    malla.name = `holo-efecto-${lista.length}`;
    malla.renderOrder = 6;
    raiz.add(malla);
    juntados.push({malla, originales: lista});
  }
  const flujo = efectos.find((m) => m.isInstancedMesh && m.count >= 500);
  let puntos = null;
  if (flujo) {
    flujo.layers.set(CAPA_OCULTA);
    const N = flujo.count;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const pm = new THREE.PointsMaterial({size: tamPunto, map: mancha(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false});
    puntos = new THREE.Points(pg, pm);
    puntos.name = 'holo-flujo';
    puntos.frustumCulled = false;
    puntos.renderOrder = 7;
    raiz.add(puntos);
  }
  for (const m of efectos) if (m.isInstancedMesh && m !== flujo) m.renderOrder = 6;

  const copiarFlujo = () => {
    puntos.visible = flujo.visible;
    if (!flujo.visible) return;
    const M = flujo.instanceMatrix.array;
    const C = flujo.instanceColor ? flujo.instanceColor.array : null;
    const P = puntos.geometry.attributes.position;
    const K = puntos.geometry.attributes.color;
    const p = P.array;
    const k = K.array;
    for (let i = 0, N = flujo.count; i < N; i++) {
      const o = i * 16;
      const j = i * 3;
      p[j] = M[o + 12];
      p[j + 1] = M[o + 13];
      p[j + 2] = M[o + 14];
      const b = brilloFlujo * Math.min(1, M[o]);
      k[j] = (C ? C[j] : 1) * b;
      k[j + 1] = (C ? C[j + 1] : 1) * b;
      k[j + 2] = (C ? C[j + 2] : 1) * b;
    }
    P.needsUpdate = true;
    K.needsUpdate = true;
  };

  // ------------------------------------------------------------ 6. el cuadro
  let corteOn = true;
  let corteEje = 'x';
  const planosCorte = eng.CLIP ? [eng.CLIP] : null;
  return {
    grupo: env.grupo,
    raiz,
    tam: env.tam,
    cuerpos,
    puntos,
    ajustes: U,
    materiales: {solido: matSolido, linea: matLinea, puntos: puntos && puntos.material},
    /** ops como en engine.js: {station, fade, flow, fault, inp}; t en segundos (para el barrido y el parpadeo) */
    update(s, ops = {}, t = 0) {
      eng.update(s, ops);
      for (const j of juntados) j.malla.visible = j.originales[0].visible;
      if (puntos) copiarFlujo();
      const st = ops.station || 0;
      const set = conjuntos[st];
      U.uTiempo.value = t;
      U.uEstacion.value = st && set ? st : 0;
      U.uFade.value = st ? suave(ops.fade ?? 1) : 0;
      U.uTodo.value = !set || !set.show ? 1 : 0;
      U.uMostrarA.value = set && set.show ? set.show[0] ?? -9 : -9;
      U.uMostrarB.value = set && set.show ? set.show[1] ?? -9 : -9;
      U.uAcc.value = set && set.acc ? set.acc[0] ?? -9 : -9;
      U.uCorte.value = corteOn ? 1 : 0;
      U.uCorteN.value.set(corteEje === 'y' ? 0 : -1, corteEje === 'y' ? -1 : 0, 0);
      env.grupo.updateMatrixWorld(true);
      U.uRaizInv.value.copy(raiz.matrixWorld).invert();
    },
    /** corte por el eje: 'x' saca el costado que mira a +x (el del alumno, como el escritorio); 'y' saca la mitad de arriba.
     *  Los puntos del flujo usan el plano de engine.js (CLIP, del mundo), que el que llama tiene que llevar al marco del mundo. */
    corte(on, eje = 'x') {
      corteOn = !!on;
      corteEje = eje;
      if (puntos) puntos.material.clippingPlanes = corteOn && eng.CLIP ? planosCorte : null;
    },
    get corteOn() {
      return corteOn;
    },
    info() {
      return {cuerpos: cuerpos.length, mallasSolidas: solidas.length, triangulos, segmentos, puntos: puntos ? puntos.geometry.attributes.position.count : 0, efectosJuntados: juntados.map((j) => j.originales.length), largo: +env.tam.z.toFixed(3), ancho: +env.tam.x.toFixed(3), alto: +env.tam.y.toFixed(3)};
    },
  };
}

/**
 * El proyector de la mesa: disco, lente, aro de luz y el cono de luz hasta el holograma (aditivo, sin luces). La base queda en
 * y = 0 del grupo; el cono sube altoCono metros y se abre de radioLente a radioArriba.
 */
export function crearProyector({radio = 0.175, radioLente = 0.12, radioArriba = 0.3, altoCono = 0.19, color = '#62d8ff'} = {}) {
  const g = new THREE.Group();
  g.name = 'proyector';
  const metal = new THREE.MeshStandardMaterial({color: 0x30353c, roughness: 0.45, metalness: 0.6});
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio * 1.04, 0.03, 48), metal);
  base.position.y = 0.015;
  g.add(base);
  const luz = new THREE.Color(color);
  const lente = new THREE.Mesh(new THREE.CircleGeometry(radioLente, 48), new THREE.MeshBasicMaterial({color: luz.clone().multiplyScalar(0.55), toneMapped: false}));
  lente.rotation.x = -Math.PI / 2;
  lente.position.y = 0.0305;
  g.add(lente);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(radio - 0.018, 0.005, 8, 64), new THREE.MeshBasicMaterial({color: luz, toneMapped: false}));
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = 0.031;
  g.add(aro);
  const Uc = {uColor: {value: luz.clone()}, uTiempo: {value: 0}, uFuerza: {value: 0.55}};
  const cono = new THREE.Mesh(
    new THREE.CylinderGeometry(radioArriba, radioLente, altoCono, 48, 1, true),
    new THREE.ShaderMaterial({
      uniforms: Uc,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      vertexShader: /* glsl */ `
        varying float vH; varying vec3 vN; varying vec3 vV;
        void main() { vH = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uTiempo; uniform float uFuerza;
        varying float vH; varying vec3 vN; varying vec3 vV;
        void main() {
          float borde = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.4);
          float a = pow(1.0 - vH, 1.6) * (0.18 + 0.82 * borde);
          float rayas = 0.82 + 0.18 * sin(vH * 46.0 - uTiempo * 3.0);
          gl_FragColor = vec4(uColor * a * rayas * uFuerza, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  cono.position.y = 0.031 + altoCono / 2;
  cono.renderOrder = 4;
  g.add(cono);
  return {grupo: g, cono, ajustes: Uc, actualizar: (t) => (Uc.uTiempo.value = t)};
}
