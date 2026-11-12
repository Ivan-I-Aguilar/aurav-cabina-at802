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
import { Pantallas, Rotulos } from './pantallas.js?v=20261111c';
import { crearRadiosEn } from './radios.js?v=20261111c';

export const PIEZAS = ['cab_cupula', 'cab_cascaron', 'cab_tablero', 'cab_llaves', 'cab_consola', 'cab_radios', 'cab_asiento', 'pedales', 'butaca'];   /* GLB por zona, en orden de carga (etapas 1b a 6). pedales.glb y butaca.glb son los de Lichi (22/10 y 1/11) */
const HOLGURA = 0.015, PISO = 0.26;
const CUPULA = PIEZAS.includes('cab_cupula'), CINTURON = 0.93;   /* con la cúpula nueva, el FSN va cortado en el antepecho (y 0,93) */
const vidrios = raiz => raiz.traverse(o => { if (o.isMesh) { o.frustumCulled = true; if (o.material?.transparent) { o.renderOrder = 2; o.material.depthWrite = false; } } });

export async function cargarCabinaNueva({ cabina, controles, V, V_EXT, OJO, Instrumentos }) {
  const cargador = new GLTFLoader();
  const e = await cargador.loadAsync(CUPULA ? `./exterior_cupula.glb?v=${V}` : `./exterior.glb?v=${V_EXT}`);
  vidrios(e.scene);
  e.scene.name = 'exterior'; cabina.add(e.scene);
  const pedales = { mixer: null, accion: null, dur: 1 }, palanca = [];
  for (const nombre of PIEZAS) {
    const g = await cargador.loadAsync(`./blender/${nombre}.glb?v=${V}`);
    vidrios(g.scene);
    g.scene.name = nombre; cabina.add(g.scene);
    controles.armar(g.scene);   /* los controles viajan con sus datos (userData.piv, eje, ang, pos, perilla…) */
    if (nombre === 'pedales') {   /* etapa 6: los pedales de Lichi, todo gris metal (31/10) y el clip pedales_timon que main.js mueve con el pedal */
      const matPed = new THREE.MeshStandardMaterial({ color: 0x3b3c40, metalness: 0.35, roughness: 0.55 }); g.scene.traverse(o => { if (o.isMesh) o.material = matPed; });
      pedales.mixer = new THREE.AnimationMixer(g.scene); const clip = THREE.AnimationClip.findByName(g.animations, 'pedales_timon');
      if (clip) { pedales.accion = pedales.mixer.clipAction(clip); pedales.accion.play(); pedales.accion.paused = true; pedales.dur = clip.duration; }
    }
    if (nombre === 'butaca') g.scene.traverse(o => {   /* etapa 6: la butaca de Lichi recoloreada al 802 real (malla roja, arnés negro); el asiento de malla de verdad queda para más adelante */
      if (!o.isMesh) return; const n = (o.material?.name || '').toLowerCase(); o.material = o.material.clone();
      if (n.includes('correa')) o.material.color.set(0x141414); else if (n.includes('metal')) o.material.color.set(0x9a9c9f); else { o.material.color.set(0xa3221d); o.material.roughness = 0.9; }
    });
    if (nombre === 'cab_asiento') g.scene.traverse(o => { if (o.isMesh && o.name.startsWith('palanca_')) palanca.push(o); });   /* el bastón: main.js lo cuelga del grupo palanca */
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
  /* etapa 3 (8/11): el display del FRDS es otra pantalla en vivo; su lugar sale del userData.panel de la placa del FRDS (pieza tipo display) */
  const placaFRDS = cabina.getObjectByName('frds_placa'); let datosFRDS = null;
  try { datosFRDS = placaFRDS && JSON.parse(placaFRDS.userData.panel); } catch (e) { console.warn('frds_placa sin panel', e); }
  const disp = datosFRDS?.items.find(i => i.tipo === 'display');
  if (tab && disp) { const d = datosFRDS; tab.pantallas.frds = [d.c[0] - d.w / 2 + disp.s, d.c[1] + d.h / 2 - (disp.t + 0.001), d.c[2] + 0.0056 + 0.0005, 0.034, 0.022]; }
  if (tab) pantallas = new Pantallas(cabina, tab);   /* 2b (8/11): G5, Garmin de rumbo, MVP-50 y los cuatro anunciadores */
  const rotulos = new Rotulos(cabina);   /* etapa 3: los textos de los paneles de llaves, el FRDS y el SALVO, dibujados en canvas */
  /* etapa 5 (11/11): los equipos de radio sobre la cara del bloque de la consola derecha (userData.radios del GLB) y la llave MASTER AVIONICS */
  let radios = null; const bloqueR = cabina.getObjectByName('radios_bloque');
  try { if (bloqueR?.userData?.radios) { radios = crearRadiosEn(JSON.parse(bloqueR.userData.radios), cabina); controles.armar(radios.grupoControles); } } catch (e) { console.warn('radios_bloque sin datos', e); }
  /* FRDS GEN III y SALVO (etapa 3): llaves momentáneas que vuelven solas, galones a largar y nivel de cobertura, compuerta que larga (en AUTO
     el caudal sigue al nivel de cobertura: de 11 s el 1 a 4 s el 8) y corta al llegar a los galones pedidos; el SALVO vacía la tolva de una */
  const frds = { galones: 800, cobertura: 3, gate: false, objetivo: null, t: {} };
  const MOMENTANEOS = { swSALVO: 0.4, swFRDS_GATE: 0.6, swFRDS_FOAM: 0.6, swFRDS_GAL: 0.35, swFRDS_COV: 0.35, swTRIMALERON: 0.35 };
  /* trims (etapa 4): el volante de profundidad y el dial de timón son posiciones (índice → desplazamiento); el de alerón es una llave
     momentánea que suma un paso por toque. Van a vuelo.mando.trimProf / trimAler / trimTimon y aplicarControles (main.js) los suma al mando */
  const trims = { aler: 0 };
  const accionFRDS = (nombre, estado, vuelo) => {
    if (nombre === 'swTRIMALERON') trims.aler = Math.max(-0.3, Math.min(0.3, trims.aler + (estado > 0 ? -0.05 : 0.05)));   /* arriba = ala izquierda abajo = alabeo negativo */
    if (nombre === 'swSALVO' && vuelo.agua > 0) { vuelo.largarCarga(true); frds.objetivo = null; vuelo.evento('largado'); }
    if (nombre === 'swFRDS_GAL') frds.galones = Math.max(50, Math.min(800, frds.galones + 50 * (estado > 0 ? 1 : -1)));
    if (nombre === 'swFRDS_COV') frds.cobertura = Math.max(1, Math.min(8, frds.cobertura + (estado > 0 ? 1 : -1)));
    if (nombre === 'swFRDS_GATE' && vuelo.agua > 0 && vuelo.largando == null) { vuelo.largarCarga(false); vuelo.largando = 12 - frds.cobertura; frds.objetivo = Math.max(0, vuelo.agua - frds.galones * 3.785); vuelo.evento('largado'); }
  };
  /* el bucle llama actualizar(vuelo, dt, { controles, SW }) cada cuadro: mirilla, pantallas y anunciadores.
     Rumbo: el avión arranca en la pista 36 con euler.rumbo = π/2 (mirando a −z); girar a la derecha lo achica → rumbo = 90° − euler (signo a validar en vuelo, como la brújula) */
  const actualizarTodo = (vuelo, dt = 0, { controles, SW } = {}) => {
    actualizar(vuelo);
    if (controles) for (const [n, dur] of Object.entries(MOMENTANEOS)) {   /* llaves que vuelven solas: la acción al tocarlas, el retorno a los dur segundos */
      const s = controles.switches.find(x => x.nombre === n); if (!s) continue;
      if (s.estado) { if (!frds.t[n]) accionFRDS(n, s.estado, vuelo); frds.t[n] = (frds.t[n] || 0) + dt; if (frds.t[n] > dur) { s.estado = s.tres ? 0 : false; if (s.tres) s.paso = -(s.paso || 1); controles._aplicarSwitch(s); frds.t[n] = 0; } }
      else frds.t[n] = 0;
    }
    frds.gate = vuelo.largando != null && vuelo.agua > 0;
    if (controles) { const ip = controles.estado('swK_TRIMPROF'), it = controles.estado('swK_TRIMTIMON');
      vuelo.mando.trimProf = ip == null ? 0 : (ip - 5) * 0.04; vuelo.mando.trimTimon = it == null ? 0 : (it - 3) * 0.05; vuelo.mando.trimAler = trims.aler; }
    if (frds.objetivo != null && (vuelo.agua <= frds.objetivo || vuelo.largando == null)) { if (vuelo.agua <= frds.objetivo) vuelo.largando = null; frds.objetivo = null; }
    if (!pantallas) return;
    const m = vuelo.motor, sw = n => (controles && SW && SW[n]) ? controles.estado(SW[n]) : undefined;
    const rumbo = ((90 - vuelo.euler.rumbo * 180 / Math.PI) % 360 + 360) % 360;
    const armado = !!sw('FRDS');
    pantallas.actualizar(dt, { L: vuelo.lecturas(), rumbo, gs: vuelo.vel.length() * 2.237, bateria: !!m.bateria, avionica: sw('AVNC') ?? true, fuego: !!m.fuego, falla: !!m.falla,
      generador: !!m.generador, encendido: !!m.encendido, enTierra: !!vuelo.enTierra, armado, test: !!(controles && controles.estado('swTEST')), estrellado: !!vuelo.estrellado,
      frds: { power: !!(controles && controles.estado('swFRDS')), galones: frds.galones, cobertura: frds.cobertura, gate: frds.gate, armado, hopperGal: vuelo.agua / 3.785 } });
  };
  return { exterior: e.scene, actualizar: actualizarTodo, instrumentos, pantallas, rotulos, radios, frds, pedales, palanca, tablero: tab || null };
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
