// El recorrido automático del taller (T3, adelantada dentro del bloque de la T1, 15/11/2026; PLAN_TALLER.md §6). Es el guion
// de turbo-shared/tour.js del simulador de escritorio (SCRIPT, inpAt, stationAt, VIEW_FN), copiado sin el kit y sin three: abre
// en el motor entero, pasa por las 8 estaciones de a 7 s, en la 8 mueve las palancas, termina con un arranque caliente que se corta
// y vuelve a ralentí (82 s). Cambio para VR: en el escritorio la cámara gira alrededor del motor; en el casco el alumno no se mueve,
// así que la vista de cada estación se traduce en una POSE DEL HOLOGRAMA (giro, inclinación, escala y el punto que queda en el
// centro de la mesa): poseHolograma(t). El motor corre en vivo (motor.js, con las cifras de la cabina) con las palancas del guion.

const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const ss = (a, b, t) => smoother((t - a) / (b - a));
const D2R = Math.PI / 180;

// ------------------------------------------------------------ el guion (tal cual tour.js)
const ST0 = 4.5;
const STEP = 7;
export const stationT = (n) => ST0 + (n - 1) * STEP;
const T8 = stationT(8);
export const FAULT_T = T8 + 12.5; // 66
export const RESET_T = FAULT_T + 13;
export const DURATION = RESET_T + 3.5;
const N_ESTACIONES = 8;
export const SCRIPT = [
  {t: 0, view: 'open'},
  ...Array.from({length: N_ESTACIONES}, (_, i) => ({t: stationT(i + 1), station: i + 1})),
  {t: T8 + 1.5, lever: 'pla', from: 0, to: 0.75, dur: 2.5},
  {t: T8 + 6, lever: 'prop', from: 1, to: 0.2, dur: 1.5},
  {t: T8 + 9, lever: 'pla', from: 0.75, to: 0, dur: 1.5},
  {t: T8 + 10.8, lever: 'prop', from: 0.2, to: 1, dur: 1},
  {t: FAULT_T, fault: 'hot', view: 'fault'},
  {t: FAULT_T + 0.3, start: true},
  {t: FAULT_T + 2.6, lever: 'cl', from: 0, to: 0.5, dur: 0.6},
  {t: FAULT_T + 8, lever: 'cl', from: 0.5, to: 0, dur: 0.6},
  {t: RESET_T, fault: 'none', view: 'hero'},
];
const lev = (k, t, base) => {
  let v = base;
  for (const e of SCRIPT) if (e.lever === k && t >= e.t) v = e.from + (e.to - e.from) * ss(e.t, e.t + e.dur, t);
  return v;
};
export const inpAt = (t) => {
  const inFault = t >= FAULT_T && t < RESET_T;
  return {
    pla: lev('pla', t, 0),
    prop: lev('prop', t, 1),
    cl: inFault ? Math.round(lev('cl', t, 0) * 2) : 1,
    start: t >= FAULT_T + 0.3 && t < FAULT_T + 0.45,
    fault: inFault ? 'hot' : 'none',
  };
};
export const stationAt = (t) => SCRIPT.filter((e) => e.station && e.t <= t && t < FAULT_T).pop()?.station ?? 0;
export const cutAxis = (station) => (station === 7 ? 'y' : 'x');

// ------------------------------------------------------------ las vistas de tour.js (grados, metros), en función de u (segundos desde que empezó)
export const VIEW_FN = {
  open: (u) => {
    const k = smoother(u / 4.5);
    return {tx: 0, ty: 0.0, tz: -0.06, az: 62 + 30 * k, el: 20 - 6 * k, d: 4.3 - 0.35 * k};
  },
  hero: (u) => ({tx: 0, ty: 0.0, tz: -0.06, az: 92 + 2 * u, el: 14, d: 3.95}),
  fault: (u) => ({tx: 0, ty: 0.0, tz: -0.25, az: 88 + 1.2 * u, el: 12, d: 3.1}),
  s1: (u) => ({tx: 0, ty: -0.1, tz: -0.3, az: 118 + 1.5 * u, el: 16, d: 3.4}),
  s2: (u) => ({tx: 0, ty: 0, tz: -0.47, az: 100 - 1.2 * u, el: 12, d: 2.5}),
  s3: (u) => ({tx: 0, ty: 0, tz: -0.1, az: 102 - 1.2 * u, el: 16, d: 2.6}),
  s4: (u) => ({tx: 0, ty: 0, tz: -0.36, az: 96 - 1 * u, el: 10, d: 2.4}),
  s5: (u) => ({tx: 0, ty: 0, tz: 0.02, az: 92 - 1 * u, el: 10, d: 2.7}),
  s6: (u) => ({tx: 0, ty: 0.02, tz: 0.47, az: 30 + 1.2 * u, el: 14, d: 1.45}),
  s7: (u) => ({tx: 0, ty: -0.05, tz: 0.18, az: 18 + 1.5 * u, el: 58, d: 2.6}),
  s8: (u) => ({tx: 0, ty: 0, tz: -0.06, az: 96 - 1 * u, el: 15, d: 3.95}),
};
const VIEWS = SCRIPT.filter((e) => e.view || e.station).map((e) => [e.t, e.view || `s${e.station}`]);
function blend(a, b, k) {
  const o = {};
  for (const key in b) o[key] = key === 'az' ? a.az + ((((b.az - a.az + 540) % 360) - 180) * k) : a[key] + (b[key] - a[key]) * k;
  return o;
}
export const camAt = (t) => {
  let i = 0;
  while (i < VIEWS.length - 1 && VIEWS[i + 1][0] <= t) i++;
  const cur = VIEW_FN[VIEWS[i][1]](t - VIEWS[i][0]);
  if (i === 0) return cur;
  const k = ss(VIEWS[i][0], VIEWS[i][0] + 1.6, t);
  return k >= 1 ? cur : blend(VIEW_FN[VIEWS[i - 1][1]](t - VIEWS[i - 1][0]), cur, k);
};

// ------------------------------------------------------------ la vista del escritorio → la pose del holograma en la mesa
// En el escritorio la cámara mira al motor desde el azimut az (desde +z hacia +x) y la elevación el. En la mesa, el motor gira -az
// sobre la vertical (con az = 90° queda la pose de base: la hélice a la izquierda y el costado cortado hacia el alumno) y se inclina
// hacia el alumno lo que la elevación pase de los ~19° con que ya lo mira un alumno parado. La distancia d se vuelve escala, pero
// suavizada y con tope (de cerca, el motor real a 0,35 ocupa la mesa; a 1,6 veces ya mide un metro).
export const EL_ALUMNO = 19;
export const D_BASE = 3.95;
export function poseDeVista(v) {
  return {
    yaw: -v.az * D2R,
    pitch: Math.max(0, v.el - EL_ALUMNO) * D2R,
    escala: Math.min(1.6, Math.max(0.85, Math.sqrt(D_BASE / v.d))),
    objetivo: [v.tx, v.ty, v.tz], // en metros, en el marco del motor (el punto que queda en el centro)
  };
}
export const poseHolograma = (t) => poseDeVista(camAt(t));
export const POSE_BASE = poseDeVista({tx: 0, ty: 0, tz: -0.06, az: 90, el: EL_ALUMNO, d: D_BASE});
