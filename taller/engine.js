// COPIA de turbo-shared/engine.js del simulador de turbohélice de escritorio (repo aurav; fuente fuera del repo en
// Documents/aurav-cabina/taller_fuente/, zip del 15/11/2026) para el taller de motores en VR (PLAN_TALLER.md).
// ÚNICO cambio respecto de la fuente: los dos imports (three y BufferGeometryUtils del repo, sin importmap). La geometría, PARTS,
// STATIONS, Z y update() quedan iguales: el holograma (holograma.js) los usa sin tocarlos.

// El turbohélice genérico construido por código, en milímetros (eje del motor sobre z, adelante = +z, y arriba).
// [AGREGADO] Disposición de un motor de turbina libre y flujo inverso, sin marca ni modelo: de atrás hacia adelante,
// caja de accesorios, pleno de admisión con malla, 3 etapas axiales + 1 centrífuga, difusor, cámara anular de flujo
// inverso (inyectores y 2 ignitores), turbina del compresor, turbina libre de 2 etapas, ducto de escape con dos
// salidas laterales, caja reductora planetaria y la hélice (palas recortadas). La toma de aire va abajo, adelante, y
// lleva el aire hacia atrás hasta el pleno. Proporciones ilustrativas [VERIFICAR].
// update(s, ops) posa todo desde el estado del modelo (motor.js): giro, flujo, llama, inyectores, ignitores, fallas.
import * as THREE from '../three.module.js';
import {mergeGeometries} from '../BufferGeometryUtils.js';

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

// ------------------------------------------------------------ geometry helpers (all along z)
/** a lathe from [r, z] points, the axis on z */
function lathe(pts, seg = 64) {
  const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(Math.PI / 2);
  return g;
}
/** a tube along z: radius r from z0 to z1 */
function shaft(r, z0, z1, seg = 24) {
  const g = new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), seg);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}
/** a row of n blades from rHub to rTip, chord along z, twisted, centred on z */
function bladeRow(n, rHub, rTip, chord, thick, twist, z, hub = true) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.BoxGeometry(thick, rTip - rHub, chord);
    b.rotateY(twist);
    b.translate(0, (rHub + rTip) / 2, 0);
    b.rotateZ((i / n) * TAU);
    parts.push(b);
  }
  if (hub) parts.push(shaft(rHub + 2, -chord / 2 - 3, chord / 2 + 3, 48));
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  g.translate(0, 0, z);
  return g;
}
/** a static vane ring: the vanes and a thin outer band */
function vaneRing(n, rIn, rOut, chord, twist, z) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.BoxGeometry(3, rOut - rIn, chord);
    b.rotateY(twist);
    b.translate(0, (rIn + rOut) / 2, 0);
    b.rotateZ(((i + 0.5) / n) * TAU);
    parts.push(b.toNonIndexed());
  }
  const band = new THREE.CylinderGeometry(rOut + 3, rOut + 3, chord + 4, 64, 1, true);
  band.rotateX(Math.PI / 2);
  parts.push(band.toNonIndexed());
  const g = mergeGeometries(parts);
  g.translate(0, 0, z);
  return g;
}
/** a spur gear in the XY plane (extruded along z), centred */
function gearGeo(teeth, rOut, rRoot, width, holeR = 0) {
  const sh = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * TAU;
    const da = TAU / teeth;
    [[rRoot, a0], [rRoot, a0 + da * 0.2], [rOut, a0 + da * 0.35], [rOut, a0 + da * 0.6], [rRoot, a0 + da * 0.75]].forEach(([r, a], k) =>
      i === 0 && k === 0 ? sh.moveTo(r * Math.cos(a), r * Math.sin(a)) : sh.lineTo(r * Math.cos(a), r * Math.sin(a)),
    );
  }
  sh.closePath();
  if (holeR) {
    const h = new THREE.Path();
    h.absarc(0, 0, holeR, 0, TAU, true);
    sh.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(sh, {depth: width, bevelEnabled: false, curveSegments: 4});
  g.translate(0, 0, -width / 2);
  return g;
}
/** a ring gear: an annulus with teeth on the inside */
function ringGearGeo(teeth, rIn, rRoot, rOuter, width) {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, rOuter, 0, TAU, false);
  const h = new THREE.Path();
  for (let i = 0; i < teeth; i++) {
    const a0 = -(i / teeth) * TAU;
    const da = -TAU / teeth;
    [[rRoot, a0], [rRoot, a0 + da * 0.2], [rIn, a0 + da * 0.35], [rIn, a0 + da * 0.6], [rRoot, a0 + da * 0.75]].forEach(([r, a], k) =>
      i === 0 && k === 0 ? h.moveTo(r * Math.cos(a), r * Math.sin(a)) : h.lineTo(r * Math.cos(a), r * Math.sin(a)),
    );
  }
  h.closePath();
  sh.holes.push(h);
  const g = new THREE.ExtrudeGeometry(sh, {depth: width, bevelEnabled: false, curveSegments: 48});
  g.translate(0, 0, -width / 2);
  return g;
}
/** a grid texture for the intake screen */
function screenTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  for (let i = 0; i < 64; i += 8) {
    g.fillRect(i, 0, 2, 64);
    g.fillRect(0, i, 64, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(34, 5);
  return t;
}

// ------------------------------------------------------------ where things are (mm) [VERIFICAR] proporciones ilustrativas
export const Z = {
  agb: -900, plenum0: -810, plenum1: -600, ax: [-555, -495, -435], imp: -335, diff: -318, case0: -345, case1: 130,
  liner0: -258, liner1: 120, noz: 128, ign: 40, ctv: -238, ct: -205, ptv1: -165, pt1: -132, ptv2: -98, pt2: -66,
  exh0: 130, exh1: 345, stack: 238, rgb0: 352, sun: 470, carrier: 500, flange: 655, prop: 735,
};
export const PARTS = {
  intake: [0, -390, 470],
  screen: [0, 230, -700],
  plenum: [-250, 120, -760],
  axial: [0, 125, -495],
  impeller: [0, 190, -335],
  diffuser: [0, 250, -318],
  liner: [0, 240, -70],
  nozzle: [0, 285, Z.noz],
  igniter: [-300 * Math.cos(0.35), -300 * Math.sin(0.35), Z.ign],
  ct: [0, 175, Z.ct],
  ggShaft: [0, -30, -400],
  pt: [0, 190, Z.pt1 + 30],
  gap: [0, 0, -170],
  ptShaft: [0, 30, 200],
  sun: [0, 30, Z.sun],
  planet: [0, 90, Z.sun],
  ringGear: [0, 150, Z.sun],
  stack: [-400, 0, 175],
  exhDuct: [0, 230, 240],
  fcu: [-130, -40, -905],
  governor: [0, 250, 450],
  propHub: [0, 160, Z.prop],
};

/** station sets: what stays on when a station is isolated, and what wears the accent */
export const STATIONS = {
  1: {show: [1], acc: [1]},
  2: {show: [2], acc: [2]},
  3: {show: [3], acc: [3]},
  4: {show: [4, 2], acc: [4]},
  5: {show: [5, 4], acc: [5]},
  6: {show: [6, 5], acc: [6]},
  7: {show: [7], acc: [7]},
  8: {show: null, acc: [8]},
};

export function buildEngine() {
  const root = new THREE.Group();
  const M = {
    caseM: new THREE.MeshStandardMaterial({color: '#c3c7cd', roughness: 0.48, metalness: 0.55, side: THREE.DoubleSide, envMapIntensity: 0.6}),
    caseD: new THREE.MeshStandardMaterial({color: '#9ea3aa', roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide, envMapIntensity: 0.55}),
    blade: new THREE.MeshStandardMaterial({color: '#d2d5da', roughness: 0.38, metalness: 0.95, envMapIntensity: 0.6}),
    hot: new THREE.MeshStandardMaterial({color: '#8d6c52', roughness: 0.5, metalness: 0.75, side: THREE.DoubleSide, envMapIntensity: 0.5}),
    turb: new THREE.MeshStandardMaterial({color: '#6f737b', roughness: 0.42, metalness: 0.9, envMapIntensity: 0.55}),
    dark: new THREE.MeshStandardMaterial({color: '#2b2d31', roughness: 0.5, metalness: 0.3, envMapIntensity: 0.5}),
    gear: new THREE.MeshStandardMaterial({color: '#4f535b', roughness: 0.45, metalness: 0.85, envMapIntensity: 0.55}),
    shaftM: new THREE.MeshStandardMaterial({color: '#e0e2e6', roughness: 0.3, metalness: 1, envMapIntensity: 0.6}),
    brass: new THREE.MeshStandardMaterial({color: '#b58a58', roughness: 0.35, metalness: 0.9, envMapIntensity: 0.6}),
    ceramic: new THREE.MeshStandardMaterial({color: '#eeebe5', roughness: 0.4, metalness: 0, envMapIntensity: 0.5}),
    prop: new THREE.MeshStandardMaterial({color: '#202125', roughness: 0.5, metalness: 0.2, envMapIntensity: 0.5}),
    spinner: new THREE.MeshStandardMaterial({color: '#aeb2b8', roughness: 0.45, metalness: 0.6, envMapIntensity: 0.6}),
    ringM: new THREE.MeshStandardMaterial({color: '#8d929a', roughness: 0.45, metalness: 0.8, envMapIntensity: 0.55}),
    screen: new THREE.MeshStandardMaterial({color: '#3b3e44', roughness: 0.6, metalness: 0.4, alphaMap: screenTex(), alphaTest: 0.5, side: THREE.DoubleSide}),
  };
  const CASES = new Set([M.caseM, M.caseD]);
  const parts = [];
  /** tag: station 1..8 (0 = casing, general); prim: wears the accent when its station is on */
  const add = (parent, geo, mat, tag, prim = true, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    m.userData = {tag, prim, mat0: mat};
    parent.add(m);
    parts.push(m);
    return m;
  };

  // ------------------------------------------------------------ 1 · admisión: toma, ducto, pleno, malla; caja de accesorios atrás
  const duct = new THREE.CatmullRomCurve3([new V3(0, -392, 500), new V3(0, -392, 300), new V3(0, -392, -300), new V3(0, -380, -560), new V3(0, -330, -680), new V3(0, -285, -715)]);
  add(root, new THREE.TubeGeometry(duct, 80, 66, 32, false), M.caseD, 1);
  add(root, lathe([[66, 0], [88, 24], [92, 40]], 32).translate(0, -392, 500), M.caseD, 1);
  // the plenum: a drum at the rear around the compressor inlet, the rear wall closed
  add(root, lathe([[0, Z.plenum0], [300, Z.plenum0], [312, Z.plenum0 + 20], [312, Z.plenum1 - 20], [290, Z.plenum1], [150, Z.plenum1 + 15]], 72), M.caseM, 1);
  add(root, new THREE.CylinderGeometry(248, 248, 170, 72, 1, true).rotateX(Math.PI / 2).translate(0, 0, -700), M.screen, 1, true, false);
  // the bellmouth turning the air forward into the compressor
  add(root, lathe([[245, -785], [200, -770], [140, -730], [110, -660], [104, -590]], 64), M.caseD, 1);
  // accessory gearbox and fuel control at the back
  const agb = add(root, shaft(170, Z.agb, Z.plenum0, 48), M.dark, 0);
  void agb;
  const fcu = add(root, new THREE.BoxGeometry(120, 90, 110), M.dark, 8);
  fcu.position.set(-130, -40, -905);
  add(root, shaft(55, -1010, Z.agb, 24).translate(95, 70, 0), M.dark, 0);

  // ------------------------------------------------------------ 2 · compresor: 3 axiales, 1 centrífugo, difusor
  const gg = new THREE.Group();
  root.add(gg);
  const axialTip = [142, 132, 122];
  const axialHub = [74, 82, 88];
  Z.ax.forEach((z, i) => {
    add(gg, bladeRow(26 + i * 2, axialHub[i], axialTip[i], 30, 3.2, 0.62, z), M.blade, 2);
    add(root, vaneRing(30, axialHub[i] + 4, axialTip[i] + 2, 18, -0.5, z + 30), M.caseD, 2, false);
  });
  // the impeller: a curved hub and radial vanes
  add(gg, lathe([[30, -395], [80, -388], [108, -370], [150, -342], [192, -318], [204, -306], [30, -300]], 64), M.blade, 2);
  {
    const sh = new THREE.Shape();
    [[80, -388], [140, -390], [168, -372], [196, -340], [204, -318], [192, -318], [150, -342], [108, -370]].forEach(([r, z], k) => (k ? sh.lineTo(r, z) : sh.moveTo(r, z)));
    sh.closePath();
    const vane = new THREE.ExtrudeGeometry(sh, {depth: 3, bevelEnabled: false});
    vane.translate(0, 0, -1.5);
    vane.rotateX(Math.PI / 2);
    const vanes = [];
    for (let i = 0; i < 17; i++) vanes.push(vane.clone().rotateZ((i / 17) * TAU).toNonIndexed());
    add(gg, mergeGeometries(vanes), M.blade, 2);
  }
  add(root, vaneRing(22, 210, 282, 26, 0.9, Z.diff), M.caseD, 2, false);
  // the gas generator shaft: compressor to its turbine
  add(gg, shaft(30, -600, -195), M.shaftM, 4);

  // ------------------------------------------------------------ the gas generator case (casing)
  add(root, lathe([[150, -600], [255, -560], [300, -380], [302, -340], [302, 110], [290, 130], [250, 140]], 80), M.caseM, 0);

  // ------------------------------------------------------------ 3 · cámara de combustión anular, inyectores, ignitores
  add(root, lathe([[200, -232], [200, 92], [212, 112], [236, 122], [258, 114], [270, 92], [270, -240], [258, -262], [228, -276], [196, -274], [170, -262], [155, -244]], 72), M.hot, 3);
  const flame = new THREE.Mesh(
    lathe([[210, -225], [210, 85], [236, 108], [260, 85], [260, -230], [236, -258], [210, -225]], 72),
    new THREE.MeshBasicMaterial({color: '#ff7a1f', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending}),
  );
  flame.userData = {tag: 3, prim: false, mat0: flame.material, fx: true};
  root.add(flame);
  parts.push(flame);
  const nozzles = [];
  const sprays = [];
  const sprayMat = new THREE.MeshBasicMaterial({color: '#ffb347', transparent: true, opacity: 0.8, depthWrite: false});
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + 0.11;
    const g = new THREE.Group();
    g.rotation.z = a - Math.PI / 2;
    root.add(g);
    // local +y points outward
    add(g, new THREE.CylinderGeometry(7, 7, 80, 12).translate(0, 285, Z.noz), M.brass, 3);
    add(g, new THREE.CylinderGeometry(12, 12, 16, 12).translate(0, 322, Z.noz), M.brass, 3);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(16, 40, 12, 1, true).rotateX(-Math.PI / 2).translate(0, 236, Z.noz - 22), sprayMat);
    sp.userData = {tag: 3, prim: false, mat0: sprayMat, fx: true};
    g.add(sp);
    parts.push(sp);
    sprays.push(sp);
    nozzles.push(g);
  }
  const sparks = [];
  const sparkMat = new THREE.MeshBasicMaterial({color: '#9fd0ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending});
  const IGN_A = [Math.PI + 0.35, -0.35];
  for (const a of IGN_A) {
    const g = new THREE.Group();
    g.rotation.z = a - Math.PI / 2;
    root.add(g);
    add(g, new THREE.CylinderGeometry(9, 9, 70, 14).translate(0, 300, Z.ign), M.ceramic, 3);
    add(g, new THREE.CylinderGeometry(14, 14, 28, 6).translate(0, 345, Z.ign), M.shaftM, 3);
    const s = new THREE.Mesh(new THREE.SphereGeometry(26, 16, 12).translate(0, 258, Z.ign), sparkMat);
    s.userData = {tag: 3, prim: false, mat0: sparkMat, fx: true};
    g.add(s);
    parts.push(s);
    sparks.push(s);
  }

  // ------------------------------------------------------------ 4 · turbina del compresor (Ng)
  add(root, vaneRing(24, 120, 188, 20, 0.7, Z.ctv), M.hot, 4, false);
  add(gg, bladeRow(36, 118, 186, 26, 3.5, -0.75, Z.ct), M.turb, 4);
  add(gg, shaft(118, Z.ct - 14, Z.ct + 14, 48), M.turb, 4);

  // ------------------------------------------------------------ 5 · turbina libre (2 etapas) y su eje hacia adelante
  const pt = new THREE.Group();
  root.add(pt);
  add(root, vaneRing(26, 128, 194, 18, -0.7, Z.ptv1), M.hot, 5, false);
  add(pt, bladeRow(40, 128, 192, 22, 3.5, 0.75, Z.pt1), M.turb, 5);
  add(root, vaneRing(26, 132, 198, 18, -0.7, Z.ptv2), M.hot, 5, false);
  add(pt, bladeRow(44, 132, 196, 22, 3.5, 0.75, Z.pt2), M.turb, 5);
  add(pt, shaft(128, Z.pt1 - 12, Z.pt2 + 12, 48), M.turb, 5);
  add(pt, shaft(28, Z.pt1, Z.sun), M.shaftM, 5);

  // ------------------------------------------------------------ 7 · escape: ducto y dos salidas laterales
  add(root, lathe([[200, Z.exh0], [228, 180], [248, 240], [242, 300], [210, 335], [90, 345], [40, 350]], 72), M.caseD, 7);
  for (const sx of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([new V3(sx * 150, 0, Z.stack), new V3(sx * 260, 0, Z.stack - 6), new V3(sx * 345, 0, Z.stack - 40), new V3(sx * 400, 0, Z.stack - 90)]);
    add(root, new THREE.TubeGeometry(c, 40, 78, 32, false), M.caseD, 7);
    add(root, new THREE.TorusGeometry(78, 6, 10, 40).rotateY(Math.PI / 2 - sx * 0.85).translate(sx * 400, 0, Z.stack - 90), M.dark, 7);
  }

  // ------------------------------------------------------------ 6 · caja reductora planetaria y hélice
  add(root, lathe([[60, Z.rgb0], [205, Z.rgb0], [236, 410], [232, 540], [190, 600], [130, 630], [70, 640]], 72), M.caseM, 0);
  const sun = add(root, gearGeo(18, 40, 33, 34, 12).translate(0, 0, Z.sun), M.gear, 6);
  const ring = add(root, ringGearGeo(72, 147, 154, 172, 34).translate(0, 0, Z.sun), M.ringM, 6);
  void ring;
  const carrier = new THREE.Group();
  root.add(carrier);
  const planets = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + Math.PI / 2;
    const p = add(carrier, gearGeo(27, 57, 50, 30, 10), M.gear, 6);
    p.position.set(Math.cos(a) * 93, Math.sin(a) * 93, Z.sun);
    planets.push({p, a});
    add(carrier, shaft(11, Z.sun - 20, Z.carrier).translate(Math.cos(a) * 93, Math.sin(a) * 93, 0), M.shaftM, 6, false);
  }
  add(carrier, shaft(118, Z.carrier - 6, Z.carrier + 8, 48), M.gear, 9, false);
  add(carrier, shaft(46, Z.carrier, Z.flange), M.shaftM, 6);
  add(carrier, shaft(122, Z.flange - 8, Z.flange + 8, 48), M.gear, 9, false);
  add(carrier, lathe([[150, Z.flange + 10], [148, 700], [128, 780], [80, 850], [0, 885]], 64), M.spinner, 9, false);
  for (let k = 0; k < 4; k++) {
    const b = new THREE.BoxGeometry(105, 240, 22);
    b.rotateY(0.45);
    b.translate(0, 150 + 120, Z.prop);
    b.rotateZ((k / 4) * TAU + Math.PI / 4);
    add(carrier, b, M.prop, 9, false);
  }
  // the prop governor on top of the reduction gearbox (station 8)
  const gov = add(root, new THREE.BoxGeometry(80, 70, 90), M.dark, 8);
  gov.position.set(0, 262, 450);

  // ------------------------------------------------------------ the flow: particles along 36 paths round the axis
  const AZ = 36;
  const SAMPLES = 360;
  // [r, z, key]: 0 aire, 1 aire comprimido, 2 combustión, 3 gases de escape
  const axi = [
    [275, -722, 0], [210, -712, 0], [140, -684, 0], [108, -622, 0], [100, -575, 0], [96, -520, 1], [93, -440, 1], [92, -398, 1],
    [118, -368, 1], [162, -340, 1], [204, -322, 1], [245, -318, 1], [286, -298, 1], [286, -150, 1], [286, 20, 1], [282, 104, 1],
    [262, 134, 1], [236, 116, 2], [234, 50, 2], [234, -100, 2], [232, -228, 2], [218, -260, 2], [186, -268, 2], [160, -250, 2],
    [155, -205, 2], [162, -132, 2], [166, -66, 3], [172, 30, 3], [200, 160, 3],
  ];
  const paths = [];
  for (let a = 0; a < AZ; a++) {
    const phi = ((a + 0.5) / AZ) * TAU;
    const u = [Math.cos(phi), Math.sin(phi)];
    const sx = u[0] >= 0 ? 1 : -1;
    const ctrl = [
      [new V3(0, -392, 520), 0], [new V3(0, -392, 300), 0], [new V3(0, -390, -300), 0], [new V3(0, -378, -560), 0], [new V3(0, -330, -682), 0],
      ...axi.map(([r, z, k]) => [new V3(r * u[0], r * u[1], z), k]),
      [new V3(sx * 175, u[1] * 40, Z.stack), 3], [new V3(sx * 270, u[1] * 25, Z.stack - 8), 3], [new V3(sx * 350, u[1] * 20, Z.stack - 44), 3], [new V3(sx * 430, u[1] * 18, Z.stack - 110), 3], [new V3(sx * 560, u[1] * 18, Z.stack - 220), 3],
    ];
    const curve = new THREE.CatmullRomCurve3(ctrl.map((c) => c[0]), false, 'centripetal');
    const pts = curve.getSpacedPoints(SAMPLES - 1);
    const xyz = new Float32Array(SAMPLES * 3);
    const key = new Uint8Array(SAMPLES);
    let ci = 0;
    let ductEnd = 0;
    pts.forEach((p, i) => {
      xyz.set([p.x, p.y, p.z], i * 3);
      while (ci < ctrl.length - 1 && p.distanceTo(ctrl[ci + 1][0]) < p.distanceTo(ctrl[ci][0])) ci++;
      key[i] = ctrl[ci][1];
      if (ci <= 4) ductEnd = i;
    });
    paths.push({xyz, key, ductEnd});
  }
  const NP = 1500;
  let seed = 9871;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pcl = Array.from({length: NP}, (_, i) => {
    const a = rnd() * TAU;
    const r = 50 * Math.sqrt(rnd());
    return {p: i % AZ, off: rnd(), jit: (rnd() - 0.5) * 14, dx: r * Math.cos(a), dy: r * Math.sin(a)};
  });
  const flowMat = new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false});
  const flow = new THREE.InstancedMesh(new THREE.SphereGeometry(5.2, 8, 6), flowMat, NP);
  flow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flow.frustumCulled = false;
  flow.renderOrder = 4;
  flow.userData = {tag: -1, prim: false, mat0: flowMat, fx: true};
  root.add(flow);
  const FLOW_COL = [new THREE.Color('#2f86e0'), new THREE.Color('#7d8ea6'), new THREE.Color('#ff6a1f'), new THREE.Color('#5f646c')];
  const COLD = FLOW_COL[1];
  // debris for the foreign-object fault, on the intake leg only
  const debMat = new THREE.MeshBasicMaterial({color: '#d6182b'});
  const debris = new THREE.InstancedMesh(new THREE.BoxGeometry(14, 14, 14), debMat, 40);
  debris.frustumCulled = false;
  debris.userData = {tag: -1, prim: false, mat0: debMat, fx: true};
  root.add(debris);
  // the damaged blades (fault): a red sliver on the first compressor stage
  const nick = add(gg, bladeRow(3, axialHub[0], axialTip[0], 31, 3.6, 0.62, Z.ax[0], false), new THREE.MeshBasicMaterial({color: '#d6182b'}), 2, false);
  nick.visible = false;
  // a flash at the compressor for the stall's bang
  const bangMat = new THREE.MeshBasicMaterial({color: '#ff4d3a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide});
  const bang = new THREE.Mesh(lathe([[100, -560], [130, -470], [200, -340], [280, -300]], 48), bangMat);
  bang.userData = {tag: -1, prim: false, mat0: bangMat, fx: true};
  root.add(bang);

  // ------------------------------------------------------------ materials: clipping, ghosts, accent, glass
  const CLIP = new THREE.Plane(new V3(-1, 0, 0), 0);
  const baseMats = [...Object.values(M), nick.material];
  const fxMats = [flame.material, sprayMat, sparkMat, flowMat, debMat, bangMat];
  const GHOST = new Map(baseMats.map((m) => {
    const g = m.clone();
    g.transparent = true;
    g.depthWrite = false;
    g.opacity = 0.06;
    return [m, g];
  }));
  const ACC = new Map(baseMats.map((m) => {
    const a = m.clone();
    a.color = m.color.clone().lerp(new THREE.Color('#d6182b'), 0.5);
    if (a.emissive) a.emissive = new THREE.Color('#d6182b').multiplyScalar(0.12);
    return [m, a];
  }));
  const allMats = () => [...baseMats, ...fxMats, ...GHOST.values(), ...ACC.values()];
  let cutNow = null;
  /** mode: section | glass | solid; axis: 'x' cuts the side facing +x, 'y' cuts the top half */
  const setCut = (mode, axis = 'x') => {
    CLIP.normal.set(axis === 'y' ? 0 : -1, axis === 'y' ? -1 : 0, 0);
    if (mode === cutNow) return;
    cutNow = mode;
    for (const m of allMats()) {
      m.clippingPlanes = mode === 'section' ? [CLIP] : null;
      m.needsUpdate = true;
    }
    const glass = mode === 'glass';
    for (const m of CASES) {
      m.transparent = glass;
      m.opacity = glass ? 0.14 : 1;
      m.depthWrite = !glass;
      m.needsUpdate = true;
    }
    for (const m of CASES) {
      const a = ACC.get(m);
      a.transparent = glass;
      a.opacity = glass ? 0.2 : 1;
      a.depthWrite = !glass;
    }
  };
  setCut('section');

  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new V3();
  const pos = new V3();
  const col = new THREE.Color();
  /** s: the model state; ops: {station (0 all), fade (0..1 isolate), flow (0..1), fault, inp} */
  const update = (s, ops = {}) => {
    const fault = ops.fault || 'none';
    // rotation
    gg.rotation.z = -s.ga * TAU;
    pt.rotation.z = -s.pa * TAU;
    sun.rotation.z = -s.pa * TAU;
    carrier.rotation.z = -s.pr * TAU;
    // planets: they orbit with the carrier and spin on their pins (sun 18, planets 27, ring 72)
    const sunA = -s.pa * TAU;
    const carA = -s.pr * TAU;
    for (const {p} of planets) p.rotation.z = -(sunA - carA) * (18 / 27);
    // shake (foreign objects) and the stall's thump
    const shake = fault === 'fod' && s.lit ? 2.2 : 0;
    const k = s.surge || 0;
    root.position.set(0.001 * shake * Math.sin(s.t * 61), 0.001 * (shake * Math.sin(s.t * 47 + 1) + 3 * k * Math.sin(s.t * 90)), 0);
    // combustion: flame glow, sprays, sparks
    const burn = s.lit ? Math.min(1, s.ff / 160) : 0;
    const stn = ops.station || 0;
    const dimFx = stn === 0 || stn === 3 || stn === 8 ? 1 : stn === 4 || stn === 5 ? 0.3 : 0;
    flame.material.opacity = (s.lit ? 0.18 + 0.4 * burn + (fault === 'hot' && s.startOn ? 0.25 : 0) : 0) * dimFx;
    flame.visible = flame.material.opacity > 0.01;
    const fuel = (ops.inp?.cl ?? 1) > 0 && s.ff > 5;
    sprays.forEach((sp, i) => {
      sp.visible = fuel;
      sp.scale.setScalar(0.75 + 0.25 * Math.sin(s.t * 40 + i * 1.7));
    });
    const spark = s.ign ? (Math.sin(s.t * 55) > 0.2 ? 1 : 0.15) : 0;
    sparkMat.opacity = spark * 0.9;
    for (const sp of sparks) sp.visible = spark > 0;
    bangMat.opacity = 0.75 * k;
    bang.visible = k > 0.02;
    nick.visible = fault === 'fod';

    // the flow
    const fOn = ops.flow ?? 1;
    flow.visible = fOn > 0.01 && s.ng > 0.5;
    if (flow.visible) {
      for (let i = 0; i < NP; i++) {
        const c = pcl[i];
        const P = paths[c.p];
        const u = (((c.off + s.flow) % 1) + 1) % 1;
        const f = u * (SAMPLES - 1);
        const j = Math.floor(f);
        const w = f - j;
        const a = j * 3;
        const b = Math.min(SAMPLES - 1, j + 1) * 3;
        // in the duct the particles spread over its section, fading back to the path where it meets the plenum
        const dk = j < P.ductEnd ? Math.min(1, (P.ductEnd - j) / 12) : 0;
        pos.set(P.xyz[a] + (P.xyz[b] - P.xyz[a]) * w + c.dx * dk, P.xyz[a + 1] + (P.xyz[b + 1] - P.xyz[a + 1]) * w + c.jit * 0.6 + c.dy * dk, P.xyz[a + 2] + (P.xyz[b + 2] - P.xyz[a + 2]) * w + c.jit);
        let key = P.key[j];
        // no flame: the gas stays compressed air on through the turbines
        if (!s.lit && key >= 2) key = 1;
        // fade in at the scoop mouth and out past the stack
        const edge = Math.min(1, u / 0.02, (1 - u) / 0.04);
        sc.setScalar(Math.max(0.001, edge) * (key === 2 ? 1.15 : 1) * fOn);
        mtx.compose(pos, q, sc);
        flow.setMatrixAt(i, mtx);
        col.copy(key === 1 && !s.lit ? COLD : FLOW_COL[key]);
        if (key === 2 && fault === 'hot' && s.startOn) col.lerp(new THREE.Color('#ff2a10'), 0.6);
        flow.setColorAt(i, col);
      }
      flow.instanceMatrix.needsUpdate = true;
      flow.instanceColor.needsUpdate = true;
    }
    debris.visible = fault === 'fod' && s.ng > 5;
    if (debris.visible) {
      for (let i = 0; i < 40; i++) {
        const u = (i / 40 + s.flow * 1.3) % 1;
        const P = paths[(i * 7) % AZ];
        const f = u * 0.33 * (SAMPLES - 1);
        const j = Math.floor(f);
        pos.set(P.xyz[j * 3], P.xyz[j * 3 + 1], P.xyz[j * 3 + 2]);
        q.setFromEuler(new THREE.Euler(i, i * 2, s.t * 3));
        mtx.compose(pos, q, sc.setScalar(1));
        debris.setMatrixAt(i, mtx);
      }
      q.identity();
      debris.instanceMatrix.needsUpdate = true;
    }

    // isolate: the station's parts stay, the rest goes to its see-through twin; the working part wears the accent
    const st = ops.station || 0;
    const fade = st ? smoother(ops.fade ?? 1) : 0;
    const set = STATIONS[st];
    for (const m of parts) {
      const d = m.userData;
      if (d.fx) continue;
      let mat = d.mat0;
      if (st && set) {
        const shown = !set.show || set.show.includes(d.tag);
        if (!shown && fade > 0.02) {
          mat = GHOST.get(d.mat0) || mat;
        } else if (set.acc.includes(d.tag) && d.prim && fade > 0.5) mat = ACC.get(d.mat0) || mat;
      }
      m.material = mat;
    }
    for (const g of GHOST.values()) g.opacity = 1 - 0.94 * fade;
  };

  root.scale.setScalar(0.001);
  return {root, update, setCut, CLIP, M, PARTS};
}
