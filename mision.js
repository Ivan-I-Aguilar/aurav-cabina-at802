// Misiones de la cabina del AT-802: puesta en marcha, despegue y tres emergencias en secuencia.
// Procedimientos resumidos del manual de vuelo del AT-802 (a validar con el POH y los instructores de AAXOD):
//   · Falla de motor en vuelo: planeo 110 mph → largar carga → hélice a bandera → intento de rearranque si hay altura
//     (condición a corte, ignición, arranque) → si no arranca: campo, flaps, condición a corte y batería OFF antes de tocar.
//   · Fuego de motor en vuelo: potencia a ralentí → condición a corte → corte de combustible / extintor → largar carga →
//     hélice a bandera → aterrizar lo antes posible. No se rearranca.
//   · Falla de motor en el despegue: nariz abajo ya (100 mph) → largar carga → aterrizar de frente, nunca volver a la pista
//     por debajo de 500 ft → flaps, condición a corte, batería OFF.
import * as THREE from './three.module.js';

const deg = THREE.MathUtils.radToDeg;

export class Mision {
  // ui: { tutor(titulo, texto), cartel(texto), tareas([{texto, ok}]), panel(datos, cb), ocultarPanel(), decir(texto) }
  constructor({ vuelo, controles, SW, ui, obtener, reiniciarAvion }) {
    Object.assign(this, { vuelo, controles, SW, ui, obtener, reiniciarAvion });
    this.fase = 'intro'; this.t = 0; this.pasos = []; this.i = 0; this.notas = {}; this.resultados = [];
    this.secuencia = ['arranque', 'despegue', 'falla', 'fuego', 'fallaDespegue'];
    this.falladas = 0;
  }
  // ------------- utilidades -------------
  sw(n) { return !!this.controles.estado(this.SW[n]); }
  lev(n) { const p = this.controles.palancas.find(x => x.nombre === n); return p ? THREE.MathUtils.clamp(-p.ang / 0.9, 0, 1) : 0; }
  get alt() { return this.vuelo.pos.y * 3.28084 - (this.obtener.terreno(this.vuelo.pos.x, this.vuelo.pos.z) * 3.28084); }
  get ias() { return this.vuelo.vIAS; }
  decir(titulo, texto, hablar = texto) { this.ui.tutor(titulo, texto); if (hablar) this.ui.decir(hablar); }
  anotar(clave, valor) { this.notas[clave] = valor; }
  // pasos: [{ id, texto, listo: () => bool, tiempo?: s límite, alFallar?: texto }]
  definir(fase, pasos, titulo) {
    this.fase = fase; this.pasos = pasos; this.i = 0; this.tPaso = 0; this.t = 0; this.titulo = titulo;
    if (!fase.startsWith('forzoso') && fase !== 'fallaDespegue') { this.puntos = 100; this.detalle = []; }   /* el forzoso hereda los puntos de la emergencia */
    this.forzoso = false; this.volvio = false; this.perdidaAnotada = false; this.salioPista = false; this.tApagando = null; this.fuegoFatal = false; this.alContacto = null;
    this.ui.cartel(titulo); this.mostrarPaso();
  }
  mostrarPaso() {
    const p = this.pasos[this.i]; if (!p) return;
    this.ui.tareas(this.pasos.map((q, k) => ({ texto: q.texto, ok: k < this.i, actual: k === this.i })));
    this.decir(this.titulo, p.texto, p.voz ?? p.texto);
    this.ui.marcar?.(this.marcaDe(p));
  }
  /* control que hay que tocar en el paso: p.marca, o el primero que mire listo() (lev('levHEL') o sw('BATT')) */
  marcaDe(p) {
    if (p.marca !== undefined) return p.marca && (this.SW[p.marca] ?? p.marca);
    const r = /(lev|sw)\('(\w+)'\)/.exec(p.listo.toString()); if (!r) return null;
    return r[1] === 'lev' ? r[2] : this.SW[r[2]];
  }
  avanzarPaso() {
    const p = this.pasos[this.i];
    if (p.tiempo && this.tPaso > p.tiempo) { this.puntos -= p.penal ?? 10; this.detalle.push(`${p.texto}: tarde (${this.tPaso.toFixed(0)} s)`); }
    this.i++; this.tPaso = 0;
    if (this.i < this.pasos.length) this.mostrarPaso(); else { this.ui.tareas(this.pasos.map(q => ({ texto: q.texto, ok: true }))); this.ui.marcar?.(null); }
  }
  // ------------- flujo -------------
  empezar(desde = 'arranque') {
    this.indice = Math.max(0, this.secuencia.indexOf(desde)); this.resultados = [];
    this.irA(this.secuencia[this.indice]);
  }
  siguiente() {
    this.indice++; if (this.indice >= this.secuencia.length) return this.resultado();
    this.irA(this.secuencia[this.indice]);
  }
  irA(nombre) {
    const v = this.vuelo, m = v.motor;
    if (nombre === 'arranque') { this.reiniciarAvion({ enPista: true, agua: 2400, apagado: true }); this.faseArranque(); }
    else if (nombre === 'despegue') { if (!m.encendido) this.reiniciarAvion({ enPista: true, agua: 2400, apagado: false }); this.faseDespegue(); }
    else if (nombre === 'falla') { if (v.enTierra) this.reiniciarAvion({ enVuelo: true, agua: 2400 }); this.faseCrucero('falla'); }
    else if (nombre === 'fuego') { this.reiniciarAvion({ enVuelo: true, agua: 2400 }); this.faseCrucero('fuego'); }
    else if (nombre === 'fallaDespegue') { this.reiniciarAvion({ enPista: true, agua: 3100, apagado: false }); this.faseDespegue(true); }
  }
  cerrarFase(nombre, exito, texto) {
    const nota = Math.max(0, Math.min(100, Math.round(this.puntos)));
    this.resultados.push({ nombre, nota: exito ? nota : Math.min(nota, 40), detalle: this.detalle.join(' · '), exito });
    this.fase = 'pausa';
    this.ui.panel({ titulo: exito ? `${nombre}: ${nota} / 100` : `${nombre}: no superada`, texto: texto + (this.detalle.length ? '\n\nObservaciones: ' + this.detalle.join('; ') : ''), botones: [{ id: 'seguir', texto: 'Seguir' }, { id: 'repetir', texto: 'Repetir' }, { id: 'menu', texto: 'Menú' }] },
      id => { this.ui.ocultarPanel(); if (id === 'seguir') this.siguiente(); else if (id === 'repetir') { this.resultados.pop(); this.irA(this.secuencia[this.indice]); } else this.menu(); });
    this.ui.decir(texto);
  }
  menu() {
    this.fase = 'intro'; this.ui.tareas([]); this.ui.cartel(''); this.ui.marcar?.(null);
    this.ui.panel({ titulo: 'Cabina AT-802 · AURAV', texto: 'Práctica de puesta en marcha, despegue y emergencias. Elegí por dónde empezar.',
      botones: [{ id: 'arranque', texto: 'Todo desde el arranque' }, { id: 'despegue', texto: 'Despegue' }, { id: 'falla', texto: 'Falla de motor en vuelo' }, { id: 'fuego', texto: 'Fuego de motor' }, { id: 'fallaDespegue', texto: 'Falla en el despegue' }, { id: 'libre', texto: 'Vuelo libre' }, { id: 'apie', texto: 'Recorrer el avión (a pie)' }] },
      id => { this.ui.ocultarPanel(); if (id === 'apie') { this.ui.aPie?.(); return; } if (id === 'libre') { this.fase = 'libre'; this.reiniciarAvion({ enPista: true, agua: 2400, apagado: false }); this.ui.tareas([]); this.decir('Vuelo libre', 'Volá tranquilo. Menú para volver.'); } else this.empezar(id); });
  }
  resultado() {
    const prom = this.resultados.length ? Math.round(this.resultados.reduce((a, r) => a + r.nota, 0) / this.resultados.length) : 0;
    this.fase = 'resultado';
    this.ui.panel({ titulo: `Resultado: ${prom} / 100`, texto: this.resultados.map(r => `${r.nombre}: ${r.nota}`).join('\n'), botones: [{ id: 'menu', texto: 'Menú' }] }, () => { this.ui.ocultarPanel(); this.menu(); });
  }
  // ------------- fases -------------
  faseArranque() {
    const m = this.vuelo.motor; this.arranqueCaliente = false;
    this.definir('arranque', [   /* checklist PARTIDA de AAXOD (CHECK LIST 802 NORM ed2 Rev01) */
      { id: 'pot', texto: 'Palanca de potencia: RALENTÍ (atrás)', listo: () => this.lev('levPOT') < 0.1 },
      { id: 'hel', texto: 'Hélice: BANDERA (perilla azul atrás)', listo: () => this.lev('levHEL') < 0.15 },
      { id: 'cond', texto: 'Palanca de partida (condición): CORTADA (atrás)', listo: () => this.lev('levCOND') < 0.1 },
      { id: 'batt', texto: 'Master: ON', listo: () => this.sw('BATT') },
      { id: 'off', texto: 'Ignitor OFF · Generador OFF', listo: () => !this.sw('IGNTR') && !this.sw('GEN') && !this.sw('ALTN'), marca: null },
      { id: 'boostOn', texto: 'Booster (F PUMP): ON · presión de combustible positiva', listo: () => this.sw('FPUMP') && this.tPaso > 1.5 },
      { id: 'boostOff', texto: 'Booster: OFF', listo: () => !this.sw('FPUMP') },
      { id: 'libre', texto: '¡Hélice LIBRE!', listo: () => this.tPaso > 2.5, voz: '¡Hélice libre!', marca: null },
      { id: 'start', texto: 'Starter: ON (máximo 30 s) · Ng estabilizar mínimo 12 %', listo: () => this.sw('START') || m.ng > 5, voz: 'Starter. Esperá doce por ciento de ene ge.' },
      { id: 'ign', texto: 'Ignitor: posición START', listo: () => this.sw('IGNTR') },
      { id: 'run', texto: 'Con Ng ≥ 12 %: palanca de partida a RUN (adelante)', listo: () => m.encendido, marca: 'levCOND', voz: 'Con doce por ciento, palanca de partida a ran.' },
      { id: 'acel', texto: 'Ng: verificá aceleración a 56–58 % · ITT sin pasar 1000 °C', listo: () => this.tPaso > 6 && m.ng > 50, voz: 'Verificá la aceleración y la i te te.', marca: null },
      { id: 'soltar', texto: 'Starter: soltar al 56–58 %', listo: () => !this.sw('START') },
      { id: 'gen', texto: 'Generador: ON · Aviónica: ON', listo: () => (this.sw('GEN') || this.sw('ALTN')) && this.sw('AVNC') },
      { id: 'chk', texto: 'Presión y temperatura de aceite: check', listo: () => this.tPaso > 4, marca: null },
    ], 'Puesta en marcha');
    // vigilancia: condición adelante antes de Ng 12 → arranque caliente
    this.vigilar = () => {
      if (!m.encendido && this.lev('levCOND') > 0.3 && m.arrancador && m.ng < 12 && !this.arranqueCaliente) { this.arranqueCaliente = true; this.puntos -= 30; this.detalle.push('condición adelante antes de Ng 12 % (riesgo de arranque caliente)'); this.decir('Puesta en marcha', '¡Muy pronto! Condición a corte, dejá girar y esperá Ng 12 %.'); }
    };
    this.alTerminar = () => this.cerrarFase('Puesta en marcha', true, 'Motor en marcha y estabilizado. Bien.');
  }
  faseDespegue(conFalla = false) {
    const v = this.vuelo; this.conFalla = conFalla; this.fallaHecha = false; this.vRot = null; this.maxDesvio = 0;
    const pesado = (3200 + v.agua) * 2.20462 > 12500;   /* checklist: despegue hasta / sobre 12.500 lb */
    this.definir(conFalla ? 'despegue2' : 'despegue', [
      { id: 'hel', texto: 'Hélice: TODA ADELANTE', listo: () => this.lev('levHEL') > 0.8 },
      { id: 'cond', texto: 'Palanca de condición: FLIGHT (adelante)', listo: () => this.lev('levCOND') > 0.8 },
      pesado ? { id: 'flaps', texto: 'Flaps 10° (más de 12.500 lb)', listo: () => v.mando.flaps >= 0.5 && v.mando.flaps < 1 }
             : { id: 'flaps', texto: 'Flaps arriba (hasta 12.500 lb)', listo: () => v.mando.flaps === 0 },
      { id: 'pot', texto: 'Potencia a 1.500 de torque, soltá frenos y seguí hasta máximo despegue. Pedales para el eje', listo: () => v.motor.torque > 85, marca: 'levPOT' },
      { id: 'rot', texto: 'Dejá que levante la cola (2 puntos) y rotá suave', listo: () => !v.enTierra, voz: 'Dejá que levante la cola, y rotá suave.', marca: null },
      { id: 'asc', texto: pesado ? 'Montada inicial 135 mph' : 'Montada inicial 122 mph', listo: () => this.alt > 300, voz: pesado ? 'Montada inicial, ciento treinta y cinco millas.' : 'Montada inicial, ciento veintidós millas.' },
      pesado && { id: 'flapsUp', texto: 'Flaps arriba (sobre 123 mph)', listo: () => v.mando.flaps === 0 },
      { id: 'nivel', texto: 'Nivelá a 1000 ft y reducí a 80 % de torque', listo: () => this.alt > 950 && Math.abs(v.vs) < 300 && v.motor.torque < 88, voz: 'Nivelá a mil pies.' },
    ].filter(Boolean), conFalla ? 'Despegue (tolva llena)' : 'Despegue');
    this.vigilar = () => {
      if (v.enTierra) { const d = Math.abs(v.pos.x - 30); this.maxDesvio = Math.max(this.maxDesvio, d); if (d > 8 && v.vIAS > 20 && !this.salioPista) { this.salioPista = true; this.puntos -= 40; this.detalle.push('se salió de la pista'); this.decir(this.titulo, 'Te saliste del eje: pedales, suave.'); } }
      if (!v.enTierra && this.vRot == null) { this.vRot = v.vIAS; if (this.vRot < 78) { this.puntos -= 20; this.detalle.push(`rotó a ${this.vRot.toFixed(0)} mph (lento)`); } else if (this.vRot > 115) { this.puntos -= 10; this.detalle.push(`rotó a ${this.vRot.toFixed(0)} mph (tarde)`); } }
      if (conFalla && !this.fallaHecha && !v.enTierra && this.alt > 150) { this.fallaHecha = true; v.motor.falla = true; v.motor.sinRearranque = true; this.faseFallaDespegue(); }
    };
    this.alTerminar = () => { if (!conFalla) { this.cerrarFase('Despegue', true, 'Despegue correcto.'); } };
  }
  faseCrucero(proxima) {
    const v = this.vuelo; this.proxima = proxima; this.tCrucero = 0; this.alt0 = this.alt;
    this.definir('crucero', [
      { id: 'mant', texto: 'Mantené 1000 ft, 150 mph y el rumbo. Mirá los instrumentos de motor.', listo: () => false },
    ], 'Crucero');
    this.vigilar = () => {
      this.tCrucero += this.dt;
      if (this.tCrucero > 25 + Math.random() * 20) {
        if (proxima === 'falla') { v.motor.falla = true; v.motor.causaFalla = 'combustible'; this.faseFalla(); }
        else { v.motor.fuego = true; this.faseFuego(); }
      }
    };
    this.alTerminar = () => {};
  }
  faseFalla() {
    const v = this.vuelo, m = v.motor; this.ui.decir('');
    this.definir('falla', [
      { id: 'planeo', texto: '¡FALLA DE MOTOR! Nariz abajo: planeo a 110 mph', listo: () => v.vIAS > 100 && v.vIAS < 130 && v.vs < 0, tiempo: 8, penal: 20, voz: 'Falla de motor. Nariz abajo, planeo a ciento diez millas.' },
      { id: 'dump', texto: 'Largá la carga de emergencia (botón del bastón)', listo: () => v.agua < 100 || v.largando, tiempo: 10, penal: 20 },
      { id: 'bandera', texto: 'Hélice a BANDERA (palanca atrás)', listo: () => this.lev('levHEL') < 0.15, tiempo: 12, penal: 10 },
      { id: 'rearr', texto: 'Hay altura: intento de rearranque. Condición a CORTE, Ignición ON, START', listo: () => m.encendido || this.alt < 350, voz: 'Hay altura. Intento de rearranque: condición a corte, ignición, start.' },
      { id: 'fin', texto: 'Motor en marcha: hélice adelante, potencia, nivelá y recuperá altura', listo: () => m.encendido && v.motor.torque > 50 && v.vs > -200 && this.lev('levHEL') > 0.8 && this.alt > 500 },
    ], 'Emergencia: falla de motor');
    this.rearrancado = false;
    this.vigilar = () => {
      // el motor se apagó por combustible: ciclar condición a corte y volver a arrancar lo recupera
      if (m.falla && this.lev('levCOND') < 0.1 && m.ng < 30) { m.falla = false; }
      if (!m.encendido && this.alt < 350 && this.fase === 'falla' && !this.forzoso) { this.forzoso = true; this.faseForzoso('Sin motor: aterrizaje forzoso'); }
      if (m.encendido && !this.rearrancado && this.i >= 3) { this.rearrancado = true; this.decir(this.titulo, 'Arrancó. Hélice adelante y potencia.'); }
    };
    this.alTerminar = () => this.cerrarFase('Falla de motor en vuelo', true, 'Rearranque logrado. El motor está en marcha.');
  }
  faseFuego() {
    const v = this.vuelo, m = v.motor; this.tFuego = 0;
    this.definir('fuego', [
      { id: 'pot', texto: '¡FUEGO DE MOTOR! Potencia a RALENTÍ', listo: () => this.lev('levPOT') < 0.15, tiempo: 6, penal: 15, voz: 'Fuego de motor. Potencia a ralentí.' },
      { id: 'cond', texto: 'Condición a CORTE', listo: () => this.lev('levCOND') < 0.1, tiempo: 8, penal: 20 },
      { id: 'fire', texto: 'Corte de combustible y extintor: switch FIRE', listo: () => this.sw('FIRE'), tiempo: 10, penal: 20 },
      { id: 'dump', texto: 'Largá la carga', listo: () => v.agua < 100 || v.largando, tiempo: 10, penal: 10 },
      { id: 'bandera', texto: 'Hélice a BANDERA', listo: () => this.lev('levHEL') < 0.15, tiempo: 10, penal: 10 },
    ], 'Emergencia: fuego de motor');
    this.vigilar = () => {};
    this.alTerminar = () => this.faseForzoso('Fuego: aterrizaje forzoso. Planeo 110 mph', 'Fuego de motor');
  }
  faseFallaDespegue() {
    const v = this.vuelo; this.rumbo0 = v.euler.rumbo; this.giroMax = 0;
    this.definir('fallaDespegue', [
      { id: 'nariz', texto: '¡FALLA EN EL DESPEGUE! Nariz abajo YA: 100 mph', listo: () => v.vIAS > 90 && v.euler.cabeceo < 0.02, tiempo: 4, penal: 30, voz: 'Falla de motor. Nariz abajo ya. Cien millas.' },
      { id: 'dump', texto: 'Largá la carga YA', listo: () => v.agua < 200 || v.largando, tiempo: 5, penal: 25 },
      { id: 'frente', texto: 'De frente: no vuelvas a la pista. Elegí el campo adelante', listo: () => this.alt < 60, voz: 'De frente. Nunca des la vuelta.' },
      { id: 'conf', texto: 'Flaps abajo, condición a CORTE, batería OFF antes de tocar', listo: () => v.enTierra },
    ], 'Emergencia: falla en el despegue');
    this.vigilar = () => {
      let d = Math.abs(v.euler.rumbo - this.rumbo0); if (d > Math.PI) d = 2 * Math.PI - d; this.giroMax = Math.max(this.giroMax, d);
      if (this.giroMax > THREE.MathUtils.degToRad(60) && !this.volvio) { this.volvio = true; this.puntos -= 50; this.detalle.push('intentó volver a la pista'); this.decir(this.titulo, 'No. Nunca se vuelve a la pista tan bajo. De frente.'); }
      if (v.perdida && !this.perdidaAnotada) { this.perdidaAnotada = true; this.puntos -= 30; this.detalle.push('entró en pérdida'); }
    };
    this.alTerminar = () => {};
    this.alContacto = d => this.evaluarAterrizaje(d, 'Falla en el despegue');
  }
  faseForzoso(titulo, nombreFase = 'Falla de motor en vuelo') {
    const v = this.vuelo;
    this.definir('forzoso', [
      { id: 'campo', texto: 'Elegí el campo de frente o la pista si llegás. 110 mph', listo: () => this.alt < 200 },
      { id: 'conf', texto: 'Flaps abajo, condición a CORTE, batería OFF', listo: () => v.enTierra },
    ], titulo);
    this.vigilar = () => { if (v.perdida && !this.perdidaAnotada) { this.perdidaAnotada = true; this.puntos -= 30; this.detalle.push('entró en pérdida'); } };
    this.alTerminar = () => {};
    this.alContacto = d => this.evaluarAterrizaje(d, nombreFase);
  }
  evaluarAterrizaje(d, nombre) {
    const v = this.vuelo; let texto;
    if (v.estrellado) { this.puntos = Math.min(this.puntos, 30); texto = `Toque muy fuerte (${d.vv.toFixed(1)} m/s de descenso). El avión no quedó entero.`; }
    else { if (d.vv > 2) { this.puntos -= 15; this.detalle.push(`toque fuerte (${d.vv.toFixed(1)} m/s)`); } texto = `Aterrizaste. Descenso ${d.vv.toFixed(1)} m/s a ${d.v.toFixed(0)} mph.`; }
    if (this.lev('levCOND') > 0.1) { this.puntos -= 10; this.detalle.push('condición no estaba en corte'); }
    if (this.sw('BATT')) { this.puntos -= 10; this.detalle.push('batería quedó ON'); }
    if (v.mando.flaps < 1) { this.puntos -= 5; this.detalle.push('sin flaps completos'); }
    this.alContacto = null; this.cerrarFase(nombre, !v.estrellado, texto);
  }
  // ------------- bucle -------------
  actualizar(dt) {
    this.dt = dt; if (!this.pasos.length || this.fase === 'pausa' || this.fase === 'intro' || this.fase === 'resultado' || this.fase === 'libre') return;
    this.t += dt; this.tPaso += dt; this.vigilar?.();
    if (this.fase === 'pausa') return;
    const p = this.pasos[this.i];
    if (p && p.listo()) { this.avanzarPaso(); if (this.i >= this.pasos.length) this.alTerminar?.(); }
  }
  evento(tipo, d) {
    if (tipo === 'contacto' || tipo === 'accidente') { if (this.alContacto && (tipo === 'accidente' || this.vuelo.enTierra || true)) { const f = this.alContacto; this.alContacto = null; f(d); } else if (tipo === 'accidente' && this.fase !== 'pausa' && this.fase !== 'intro') { this.cerrarFase(this.titulo || 'Vuelo', false, 'Accidente. Repasemos qué pasó.'); } }
    if (tipo === 'vne') { this.puntos -= 10; this.detalle.push('superó la Vne'); }
    if (tipo === 'fuego-extinguido') this.decir(this.titulo, 'Fuego extinguido. Ahora, a aterrizar.');
    if (tipo === 'fuego-incontrolado' && this.fase !== 'pausa') { this.vuelo.estrellado = true; this.cerrarFase('Fuego de motor', false, 'El fuego no se controló a tiempo. Repasá: ralentí, condición a corte, FIRE.'); }
  }
}
