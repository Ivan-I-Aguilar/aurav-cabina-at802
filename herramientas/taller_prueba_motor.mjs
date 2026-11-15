// Prueba del motor del taller (T1, 15/11/2026). Decisión 5 de Iván: «manda la cabina», así que taller/motor.js tiene que dar las
// MISMAS cifras que el motor de la cabina (vuelo.js, pasoMotor) con las mismas palancas. Corre los dos lado a lado en seis casos
// (arranque y ralentí, plena potencia y vuelta, arranque caliente, arranque colgado, hélice a bandera, corte de combustible) y
// compara Ng, ITT, torque, Np y flujo cada medio segundo. También revisa que taller/content.js siga igual a la fuente del
// simulador de escritorio (si la fuente está en esta PC).
//   node herramientas/taller_prueba_motor.mjs        (termina con código 1 si algo no coincide)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { Vuelo } from '../vuelo.js';
import { initState, step } from '../taller/motor.js';

const DT = 1 / 120;
const TOL = { ng: 0.01, itt: 0.05, tq: 0.01, np: 0.05, ff: 0.05 };

/** el motor de la cabina, manejado como lo haría main.js: batería e ignición; el arranque se suelta solo al encender */
function cabina() {
  const v = new Vuelo();
  Object.assign(v.motor, { bateria: true, ignicion: true });
  return {
    paso(p) {
      const c = v.mando, m = v.motor;
      c.potencia = p.pla; c.helice = p.prop; c.condicion = p.cl > 0 ? 1 : 0;
      if (p.start && !m.encendido) m.arrancador = true;
      m.fallaArranque = p.fault === 'hot' || p.fault === 'hung' ? p.fault : undefined;
      v.pasoMotor(DT);
      if (m.encendido) m.arrancador = false;
    },
    get lect() { const m = v.motor; return { ng: m.ng, itt: m.itt, tq: m.torque, np: m.rpmHel, ff: m.ff, lit: m.encendido }; },
  };
}
function taller() {
  const s = initState(false);
  return { paso(p) { step(s, p, DT); }, get lect() { return { ng: s.ng, itt: s.itt, tq: s.tq, np: s.np, ff: s.ff, lit: s.lit }; } };
}

/** un caso: una lista de tramos [segundos, palancas]; la condición pasa sola a ralentí bajo con 12 % de Ng (como live.js) */
function correr(nombre, tramos, fault = 'none') {
  const A = cabina(), B = taller();
  const p = { pla: 0, cl: 0, prop: 1, start: false, fault };
  let t = 0, autoCL = false, peor = { ng: 0, itt: 0, tq: 0, np: 0, ff: 0 }, pico = { itt: 0, ng: 0 }, distintosLit = 0;
  for (const [dur, cambio] of tramos) {
    Object.assign(p, cambio);
    if (cambio.start) autoCL = true;
    const pasos = Math.round(dur / DT);
    for (let i = 0; i < pasos; i++) {
      if (autoCL && p.cl === 0 && B.lect.ng >= 12) { p.cl = 1; autoCL = false; }
      A.paso(p); B.paso(p);
      p.start = false;
      t += DT;
      const a = A.lect, b = B.lect;
      if (Math.round(t / DT) % 60 === 0) for (const k of Object.keys(peor)) peor[k] = Math.max(peor[k], Math.abs(a[k] - b[k]));
      if (a.lit !== b.lit) distintosLit++;
      pico.itt = Math.max(pico.itt, b.itt); pico.ng = Math.max(pico.ng, b.ng);
    }
  }
  const fin = B.lect, finA = A.lect;
  const ok = distintosLit === 0 && Object.keys(TOL).every(k => peor[k] <= TOL[k]);
  console.log(`${ok ? 'OK ' : 'MAL'} ${nombre.padEnd(30)} fin: Ng ${fin.ng.toFixed(1)} (cabina ${finA.ng.toFixed(1)}) · ITT ${fin.itt.toFixed(0)} (${finA.itt.toFixed(0)}) · TQ ${fin.tq.toFixed(1)} (${finA.tq.toFixed(1)}) · Np ${fin.np.toFixed(0)} (${finA.np.toFixed(0)}) · FF ${fin.ff.toFixed(0)} (${finA.ff.toFixed(0)}) · picos ITT ${pico.itt.toFixed(0)} Ng ${pico.ng.toFixed(1)} · máx. dif. ${Object.entries(peor).map(([k, v]) => `${k} ${v.toExponential(1)}`).join(' ')}${distintosLit ? ` · encendido distinto en ${distintosLit} pasos` : ''}`);
  return ok;
}

const ARRANQUE = [[0.05, { start: true }], [40, {}]];
const casos = [
  correr('arranque y ralentí', ARRANQUE),
  correr('plena potencia y vuelta', [...ARRANQUE, [25, { pla: 1 }], [20, { pla: 0 }]]),
  correr('arranque caliente', [[0.05, { start: true }], [15, {}]], 'hot'),
  correr('arranque colgado', [[0.05, { start: true }], [45, {}]], 'hung'),
  correr('hélice a bandera', [...ARRANQUE, [12, { prop: 0.1 }], [12, { prop: 1 }]]),
  correr('corte de combustible', [...ARRANQUE, [20, { cl: 0 }]]),
];

// content.js: tiene que ser la copia tal cual de la fuente (se comparan los bytes sin los fines de línea, que git puede cambiar)
const FUENTE = 'C:/Users/ivani/Documents/aurav-cabina/taller_fuente/turbo-shared/content.js';
const huella = (ruta) => createHash('sha256').update(readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);
if (existsSync(FUENTE)) {
  const igual = huella(FUENTE) === huella(new URL('../taller/content.js', import.meta.url));
  console.log(`${igual ? 'OK ' : 'MAL'} content.js igual a la fuente (${huella(FUENTE)})`);
  casos.push(igual);
} else console.log('--  content.js: la fuente no está en esta PC (no se compara)');

const todos = casos.every(Boolean);
console.log(todos ? 'Todo bien: el motor del taller da las cifras de la cabina.' : 'HAY DIFERENCIAS: revisar taller/motor.js contra vuelo.js.');
process.exit(todos ? 0 : 1);
