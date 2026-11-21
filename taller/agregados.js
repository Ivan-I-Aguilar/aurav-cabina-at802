// Las dos piezas del banco que el motor del simulador no tiene (T8, tramo 2, adelantado dentro del bloque de la T1, 15/11/2026;
// PLAN_TALLER.md §7, decisión 4). Van en este archivo aparte para que engine.js siga igual a la fuente. Todo [AGREGADO, VERIFICAR]:
// lugares y medidas genéricos de un turbohélice de la familia del PT6, NO del manual.
// - El DETECTOR DE VIRUTAS abajo en la caja reductora (estación 6), con la punta magnética hacia adentro.
// - El ANILLO DE TERMOCUPLAS DE ITT entre la turbina del compresor y la turbina libre (estación 4: también se ve al aislar la 5), con
//   las sondas radiales que atraviesan la carcasa, el arnés que las junta por afuera y la bornera arriba.
// Las mallas llevan userData {tag, prim, mat0, pieza} como las de engine.js: el holograma las junta con lo fijo y las aísla por estación.
// Marco del motor de engine.js: milímetros, eje en z (la hélice hacia +z), y hacia arriba.
import * as THREE from '../three.module.js';
import {Z} from './engine.js?v=20261121b';

/** los puntos de llamada de las piezas agregadas (mm, marco del motor), como los de PARTS */
export const PARTS_AGREGADAS = {
  detectorVirutas: [0, -300, Z.sun],
  termocuplas: [0, 262, (Z.ct + Z.pt1) / 2],
};
/** dónde va cada pieza del banco en el holograma: la clave de PARTS (engine.js) o de PARTS_AGREGADAS */
export const LUGAR_PIEZA = {
  ignitor: 'igniter',
  inyector: 'nozzle',
  alabe: 'ct',
  malla: 'screen',
  detector: 'detectorVirutas',
  termocupla: 'termocuplas',
};

const metal = new THREE.MeshStandardMaterial({color: '#a9adb3', roughness: 0.4, metalness: 0.6});
const bronce = new THREE.MeshStandardMaterial({color: '#b0874a', roughness: 0.45, metalness: 0.5});

function torno(perfil, n = 16) {
  return new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), n);
}

/** suma las piezas agregadas a la raíz de engine.js (antes de crear el holograma) y devuelve sus mallas */
export function sumarAgregados(eng) {
  const mallas = [];
  const add = (geo, mat, tag, pieza) => {
    const m = new THREE.Mesh(geo, mat);
    m.userData = {tag, prim: true, mat0: mat, pieza};
    m.name = `agregado_${pieza}`;
    eng.root.add(m);
    mallas.push(m);
    return m;
  };
  // detector de virutas: entra desde abajo en la caja reductora (eje vertical), ~60 mm
  const zDet = Z.sun;
  const det = torno([[0, 0], [6, 0], [6, 14], [11, 14], [11, 34], [14, 34], [14, 44], [12, 44], [12, 66], [0, 66]], 12);
  det.translate(0, -305, zDet); // de y −305 (el conector, afuera) a −239 (la punta, adentro)
  add(det, metal, 6, 'detector');
  // anillo de termocuplas de ITT: 8 sondas radiales, el arnés alrededor por afuera y la bornera arriba
  const zT5 = (Z.ct + Z.pt1) / 2;
  const sondas = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const g = new THREE.CylinderGeometry(4, 4, 70, 8);
    g.translate(0, 215, 0); // de r 180 a 250
    g.rotateZ(a);
    g.translate(0, 0, zT5);
    sondas.push(g);
    const cabeza = new THREE.CylinderGeometry(8, 8, 10, 8);
    cabeza.translate(0, 255, 0);
    cabeza.rotateZ(a);
    cabeza.translate(0, 0, zT5);
    sondas.push(cabeza);
  }
  const arnes = new THREE.TorusGeometry(262, 5, 6, 48);
  arnes.translate(0, 0, zT5);
  sondas.push(arnes);
  const bornera = new THREE.BoxGeometry(40, 22, 26);
  bornera.translate(0, 280, zT5);
  sondas.push(bornera);
  const juntas = sondas.map((g) => g.toNonIndexed());
  let n = 0;
  for (const g of juntas) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  let k = 0;
  for (const g of juntas) {
    g.computeVertexNormals();
    pos.set(g.attributes.position.array, k * 3);
    nor.set(g.attributes.normal.array, k * 3);
    k += g.attributes.position.count;
  }
  const t5 = new THREE.BufferGeometry();
  t5.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  t5.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  add(t5, bronce, 4, 'termocupla');
  return mallas;
}
