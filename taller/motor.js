// COPIA ADAPTADA de turbo-shared/motor.js del simulador de turbohélice de escritorio (repo aurav; fuente fuera del repo en
// Documents/aurav-cabina/taller_fuente/, zip del 15/11/2026) para el taller de motores en VR (PLAN_TALLER.md).
// Cambio respecto de la fuente (decisión 5 de Iván, 15/11: «manda la cabina»): las CIFRAS pasan a ser las del motor de la cabina
// (vuelo.js, pasoMotor), así el alumno ve lo mismo en el holograma y en el MVP-50: ralentí 60 % de Ng (60 + 41·potencia), torque
// (Ng − 58) / 43, ITT 420 + 3,8·torque con el pico de arranque ~700 °C, arrancador que sube el Ng 3 %/s hasta 25 % y enciende a más
// de 12 % con combustible, arranque caliente hacia 1120 °C, colgado en 24 % con la ITT hacia 1100 °C, hélice 1000 + 700·(Ng/85)
// con la palanca (atrás = bandera), flujo 90 + 5·torque PPH, y los rangos de los instrumentos iguales a los del MVP-50
// (pantallas.js). Se conservan la interfaz, las tres palancas, el pulso de arranque, las 5 fallas (la pérdida de compresor, la
// ingestión y la sobretemperatura, que la cabina no tiene, van encima de la base de la cabina), los giros y el flujo.
// La cabina no tiene ralentí alto: queda en 65 % [VERIFICAR] hasta tener el manual. Lo comprueba
// herramientas/taller_prueba_motor.mjs (el mismo arranque, potencia y fallas en los dos motores).
// [AGREGADO] Todo sale de conocimiento general; las cifras son ILUSTRATIVAS [VERIFICAR] y no son límites de ningún motor real.
// Entradas: palanca de potencia (pla 0..1), condición (cl 0 corte, 1 ralentí bajo, 2 ralentí alto), hélice (prop 0..1; menos de
// 0,15 es bandera), arranque (pulso), falla. Salidas: Ng %, ITT °C, torque %, Np RPM, flujo de combustible PPH, y los ángulos de giro
// (cámara lenta) que posan las piezas.

export const IDLE_LO = 60; // [VERIFICAR] el de la cabina
export const IDLE_HI = 65; // [VERIFICAR] la cabina no tiene ralentí alto
export const NG_MAX = 101;
export const NP_MIN = 1000; // [VERIFICAR] hélice de la cabina: 1000 + 700·(Ng/85)·palanca
export const NP_MAX = 1700;
export const FEATHER = 0.15; // palanca de hélice por debajo de esto: bandera (como levHEL de la cabina)
export const AMB = 15;
// rangos de los paneles: los del MVP-50 de la cabina (pantallas.js); amber = arco ámbar (sólo la ITT)
export const GAUGES = {
  tq: {name: 'TORQUE', sub: 'PAR EN EL EJE DE LA HÉLICE', unit: '%', min: 0, max: 110, green: [0, 85], red: 85},
  itt: {name: 'ITT', sub: 'TEMPERATURA ENTRE TURBINAS', unit: '°C', min: 0, max: 1000, green: [400, 800], amber: [800, 850], red: 850},
  ng: {name: 'Ng', sub: 'GENERADOR DE GAS', unit: '%', min: 0, max: 110, green: [IDLE_LO, NG_MAX], red: NG_MAX},
  np: {name: 'Np', sub: 'RPM DE LA HÉLICE', unit: 'RPM', min: 0, max: 2500, green: [NP_MIN, NP_MAX], red: NP_MAX},
  ff: {name: 'COMBUSTIBLE', sub: 'FLUJO', unit: 'PPH', min: 0, max: 600, green: [100, 500], red: null},
};
export const FAULTS = {
  none: {name: 'SIN FALLA'},
  hot: {name: 'ARRANQUE CALIENTE', alert: 'ARRANQUE CALIENTE · LA ITT SUBE MUY RÁPIDO', act: 'CORTAR COMBUSTIBLE: CONDICIÓN A CORTE', start: true},
  hung: {name: 'ARRANQUE COLGADO', alert: 'ARRANQUE COLGADO · EL Ng SE ESTANCA Y NO LLEGA A RALENTÍ', act: 'EL MOTOR NO ACELERA SOLO: SE ABORTA EL ARRANQUE', start: true},
  stall: {name: 'PÉRDIDA DE COMPRESOR', alert: 'PÉRDIDA DE COMPRESOR · ESTAMPIDOS, LA ITT SALTA, EL Ng OSCILA', act: 'MIRÁ CÓMO SALTAN ITT, Ng Y TORQUE EN CADA ESTAMPIDO'},
  fod: {name: 'INGESTIÓN DE OBJETOS', alert: 'INGESTIÓN DE OBJETOS POR LA ADMISIÓN · ÁLABES DAÑADOS', act: 'MÁS ITT Y MENOS TORQUE PARA LA MISMA PALANCA, VIBRACIÓN'},
  overtemp: {name: 'SOBRETEMPERATURA', alert: 'SOBRETEMPERATURA AL SUBIR POTENCIA', act: 'SUBÍ LA POTENCIA: LA ITT PASA LA ZONA ROJA ILUSTRATIVA'},
};
export const CL_NAMES = ['CORTE', 'RALENTÍ BAJO', 'RALENTÍ ALTO'];

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
/** el mismo paso de primer orden que vuelo.js: x += (objetivo − x)·min(1, dt/τ) */
const hacia = (x, obj, tau, dt) => x + (obj - x) * Math.min(1, dt / tau);
const tqDe = (ng) => Math.max(0, (ng - 58) / 43) * 100;
const npDe = (ng, prop) => (prop < FEATHER ? 0 : NP_MIN + (NP_MAX - NP_MIN) * Math.min(1, ng / 85) * prop);

/** the engine at rest (off) or settled at low idle with the prop lever forward */
export function initState(running = true) {
  const s = {t: 0, ng: 0, itt: AMB, np: 0, tq: 0, ff: 0, lit: false, startOn: false, ign: false, plaLag: 0, recent: 3, ga: 0, pa: 0, pr: 0, flow: 0, surge: 0};
  if (running) {
    const tq = tqDe(IDLE_LO);
    Object.assign(s, {ng: IDLE_LO, tq, itt: 420 + 3.8 * tq, np: npDe(IDLE_LO, 1), ff: 90 + 5 * tq, lit: true, recent: 0});
  }
  return s;
}
export const copyState = (s) => ({...s});

/** inp: {pla, cl, prop, start (pulse), fault} — advances s by dt seconds, in the same order as vuelo.js pasoMotor */
export function step(s, inp, dt) {
  const fault = inp.fault || 'none';
  s.t += dt;
  // arranque: el pulso engancha el arrancador; sube el Ng 3 %/s hasta 25 % y se suelta solo al encender (swSTART de la cabina)
  if (inp.start && !s.startOn && !s.lit && s.ng < 25) s.startOn = true;
  const cranking = s.startOn && !s.lit;
  s.ign = cranking;
  if (cranking) s.ng = Math.min(s.ng + 3 * dt, 25);
  const fuel = inp.cl > 0;
  if (!s.lit && fuel && s.ign && s.ng > 12) {
    s.lit = true;
    s.startOn = false;
  }
  if (s.lit && !fuel) s.lit = false;
  const idle = inp.cl === 2 ? IDLE_HI : IDLE_LO;

  // ------------------------------------------------ Ng: el generador de gas (colgado: se clava en 24 %)
  const ngT = s.lit ? (fault === 'hung' ? 24 : idle + inp.pla * (NG_MAX - idle)) : 0;
  if (s.lit) s.ng = hacia(s.ng, ngT, 1.6, dt);
  else if (!cranking) s.ng = Math.max(0, s.ng - 3 * dt);

  // ------------------------------------------------ torque: sigue al Ng
  let tqT = s.lit ? tqDe(s.ng) : 0;
  if (fault === 'fod') tqT *= 0.88;
  s.tq = hacia(s.tq, tqT, 1.2, dt);

  // ------------------------------------------------ ITT: sube con el torque; pico en el arranque; las fallas encima
  s.plaLag = hacia(s.plaLag, inp.pla, 4, dt);
  let ittT;
  let tauI;
  if (s.lit) {
    ittT = 420 + 3.8 * s.tq;
    tauI = 2.5;
    if (fault === 'hot') {
      ittT = 1120;
      tauI = 10;
    }
    if (fault === 'hung') {
      ittT = 1100;
      tauI = 30;
    }
    if (fault === 'fod') ittT += 75;
    if (fault === 'stall' && s.ng > 55) ittT += 45;
    if (fault === 'overtemp') ittT += 120 * clamp((inp.pla - 0.35) / 0.65, 0, 1) + 320 * Math.max(0, inp.pla - s.plaLag);
  } else {
    ittT = cranking && s.ng > 8 ? 200 : AMB;
    tauI = 6;
  }
  s.itt = hacia(s.itt, ittT, tauI, dt);
  if (s.lit && s.recent > 0) s.itt = Math.max(s.itt, 700 - (3 - s.recent) * 80);
  s.recent = s.lit ? Math.max(0, s.recent - dt) : 3;

  // ------------------------------------------------ Np: la hélice (palanca adelante 1700; atrás, bandera)
  s.np = hacia(s.np, s.lit ? npDe(s.ng, inp.prop) : 0, 2, dt);

  // ------------------------------------------------ flujo de combustible (PPH, como el MVP-50)
  s.ff = s.lit ? (90 + 5 * s.tq) * (fault === 'fod' ? 1.06 : 1) : 0;

  // ------------------------------------------------ compressor stall: a bang every 1.4 s while it lasts
  s.surge = fault === 'stall' && s.lit && s.ng > 55 ? Math.exp(-((s.t % 1.4) / 0.22)) : 0;

  // ------------------------------------------------ rotation (slow motion) and the flow phase
  s.ga += (s.ng / 100) * 2.6 * dt; // gas generator, rev on screen
  s.pr += (s.np / NP_MAX) * 0.45 * dt; // propeller
  s.pa = s.pr * 5; // the free turbine, 5:1 through the planetary stage shown [VERIFICAR] ilustrativo
  s.flow += (s.ng / 100) * 0.24 * dt;
  return s;
}

/** what the panels show: the state plus the stall's bang on top (it does not accumulate) */
export function readout(s) {
  const k = s.surge || 0;
  return {
    ng: Math.max(0, s.ng - 5 * k),
    itt: s.itt + 110 * k,
    tq: Math.max(0, s.tq * (1 - 0.4 * k)),
    np: s.np,
    ff: s.ff,
  };
}

/** a status line for the levers panel */
export const fuelOn = (inp) => inp.cl > 0;
