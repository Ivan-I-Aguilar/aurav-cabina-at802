// Cabina nueva de cero (PLAN_CABINA_NUEVA.md). Se activa con ?cabina=nueva; con ?cabina=vieja (o nada) sigue
// cargando la cabina FSX con sus parches. Carga el exterior, las piezas nuevas por zona (blender/cab_*.glb,
// se van sumando etapa por etapa) y, mientras no hay cascarón, el «plano» del casco medido por dentro
// (blender/casco_medido.json, etapa 0): el contorno interior cada 10 cm, 1,5 cm hacia adentro de la chapa,
// gris donde hay chapa y celeste donde hay vidrio, más el piso de referencia (y 0,26) y el ojo del piloto.
// Etapa 1b.1 (5/11): el exterior es el FSN SIN la cúpula (exterior_cupula.glb, de herramientas/cab_cortar_fsn.py) y
// la cúpula nueva va en blender/cab_cupula.glb (herramientas/cab_cupula.py); del plano del casco queda lo de abajo
// del antepecho.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { Pantallas } from './pantallas.js?v=20261108b';

export const PIEZAS = ['cab_cupula', 'cab_cascaron', 'cab_tablero'];   /* GLB por zona, en orden de carga; cada etapa agrega el suyo: 'cab_frds', … */
const HOLGURA = 0.015, PISO = 0.26;
const CUPULA = PIEZAS.includes('cab_cupula'), CINTURON = 0.93;   /* con la cúpula nueva, el FSN va cortado en el antepecho (y 0,93) */
const vidrios = raiz => raiz.traverse(o => { if (o.isMesh) { o.frustumCulled = true; if (o.material?.transparent) { o.renderOrder = 2; o.material.depthWrite = false; } } });

export async function cargarCabinaNueva({ cabina, controles, V, V_EXT, OJO, Instrumentos }) {
  const cargador = new GLTFLoader();
  const e = await cargador.loadAsync(CUPULA ? `./exterior_cupula.glb?v=${V}` : `./exterior.glb?v=${V_EXT}`);
  vidrios(e.scene);
  e.scene.name = 'exterior'; cabina.add(e.scene);
  for (const nombre of PIEZAS) {
    const g = await cargador.loadAsync(`./blender/${nombre}.glb?v=${V}`);
    vidrios(g.scene);
    g.scene.name = nombre; cabina.add(g.scene);
    controles.armar(g.scene);   /* los controles viajan con sus datos (userData.piv, eje, ang, pos, perilla…) */
  }
  if (!PIEZAS.includes('cab_cascaron')) cabina.add(await planoCasco(V, OJO));
  /* la mirilla de la tolva (etapa 1, 7/11): la placa «agua_tolva» (del cascarón) se escala en y según la carga; su userData.nivel
     trae y0 (vacía) e y1 (llena), con la geometría horneada en el sitio: escalar alrededor de y0 */
  const agua = cabina.getObjectByName('agua_tolva'); const nivel = agua?.userData?.nivel;
  const actualizar = vuelo => { if (!agua || !nivel) return; const f = Math.max(0.02, Math.min(1, vuelo.agua / 2400)); agua.scale.y = f; agua.position.y = nivel.y0 * (1 - f); };
  /* el tablero (etapa 2, 8/11): la chapa trae en userData.tablero los centros de los relojes (hueco de 8 cm, 7 mm detrás de la cara:
     instrumentos.js dibuja la carátula 3 mm adentro y el bisel 1 mm afuera), de las pantallas y de los anunciadores. Los relojes
     son los mismos Instrumentos de la cabina vieja (carátula en canvas + agujas), mirando a +z (hacia el piloto). */
  const tab = cabina.getObjectByName('tablero_chapa_u')?.userData?.tablero; let instrumentos = null, pantallas = null;
  if (tab && Instrumentos) {
    const datos = Object.entries(tab.relojes).map(([tipo, c]) => ({ tipo, c: [...c], r: tab.radio_reloj, n: [0, 0, 1], ex: [1, 0, 0], ey: [0, 1, 0] }));
    instrumentos = new Instrumentos(cabina, datos);
  }
  if (tab) pantallas = new Pantallas(cabina, tab);   /* 2b (8/11): G5, Garmin de rumbo, MVP-50 y los cuatro anunciadores */
  /* el bucle llama actualizar(vuelo, dt, { controles, SW }) cada cuadro: mirilla, pantallas y anunciadores.
     Rumbo: el avión arranca en la pista 36 con euler.rumbo = π/2 (mirando a −z); girar a la derecha lo achica → rumbo = 90° − euler (signo a validar en vuelo, como la brújula) */
  const actualizarTodo = (vuelo, dt = 0, { controles, SW } = {}) => {
    actualizar(vuelo);
    if (!pantallas) return;
    const m = vuelo.motor, sw = n => (controles && SW && SW[n]) ? controles.estado(SW[n]) : undefined;
    const rumbo = ((90 - vuelo.euler.rumbo * 180 / Math.PI) % 360 + 360) % 360;
    pantallas.actualizar(dt, { L: vuelo.lecturas(), rumbo, gs: vuelo.vel.length() * 2.237, bateria: !!m.bateria, avionica: sw('AVNC') ?? true, fuego: !!m.fuego, falla: !!m.falla,
      generador: !!m.generador, encendido: !!m.encendido, enTierra: !!vuelo.enTierra, armado: !!sw('FRDS'), test: !!(controles && controles.estado('swTEST')), estrellado: !!vuelo.estrellado });
  };
  return { exterior: e.scene, actualizar: actualizarTodo, instrumentos, pantallas, tablero: tab || null };
}

/* el casco por dentro, como líneas: la referencia común de todas las zonas mientras no está el cascarón */
async function planoCasco(V, OJO) {
  const g = new THREE.Group(); g.name = 'plano_casco';
  let m = null;
  try { m = await fetch(`./blender/casco_medido.json?v=${V}`).then(r => r.json()); } catch (err) { console.warn('casco_medido.json no cargó', err); return g; }
  const chapa = [], vidrio = [];
  const seg = (lista, a, b) => { if (a && b) lista.push(...a, ...b); };
  m.z.forEach((z, k) => {
    if (Math.round(z * 100) % 10) return;   /* cada 10 cm */
    for (const [lado, clave] of [[-1, 'izq'], [1, 'der']]) {
      let prev = null, prevV = 0;
      m.y.forEach((y, j) => {
        const x = m[clave][k][j]; const v = m['vidrio_' + clave][k][j];
        const p = x == null || (CUPULA && y > CINTURON) ? null : [x - lado * HOLGURA, y, z];   /* sobre el antepecho ya está la cúpula nueva */
        if (p && prev && Math.abs(p[0] - prev[0]) < 0.08) seg(v || prevV ? vidrio : chapa, prev, p);
        prev = p; prevV = v;
      });
    }
    const t = m.techo[k]; if (t != null && !CUPULA) seg(chapa, [-0.05, t - HOLGURA, z], [0.05, t - HOLGURA, z]);
  });
  /* líneas longitudinales en el antepecho (donde empieza el vidrio) y el piso de referencia */
  for (const [lado, clave] of [[-1, 'izq'], [1, 'der']]) {
    let prev = null;
    m.z.forEach((z, k) => {
      const y = m['antepecho_' + clave][k]; if (y == null || CUPULA) { prev = null; return; }
      const j = m.y.findIndex(v => Math.abs(v - y) < 1e-4); const x = j >= 0 ? m[clave][k][j] : null;
      const p = x == null ? null : [x - lado * HOLGURA, y, z];
      if (p && prev) seg(vidrio, prev, p); prev = p;
    });
  }
  for (let x = -0.6; x <= 0.601; x += 0.1) seg(chapa, [x, PISO, 0.6], [x, PISO, 2.4]);
  for (let z = 0.6; z <= 2.401; z += 0.1) seg(chapa, [-0.6, PISO, z], [0.6, PISO, z]);
  const linea = (pts, color) => new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), new THREE.LineBasicMaterial({ color }));
  g.add(linea(chapa, 0x9a9a96)); g.add(linea(vidrio, 0x4ad2ff));
  /* el ojo del piloto: cruz amarilla */
  const o = OJO; g.add(linea([o.x - 0.05, o.y, o.z, o.x + 0.05, o.y, o.z, o.x, o.y - 0.05, o.z, o.x, o.y + 0.05, o.z, o.x, o.y, o.z - 0.05, o.x, o.y, o.z + 0.05], 0xffd400));
  return g;
}
