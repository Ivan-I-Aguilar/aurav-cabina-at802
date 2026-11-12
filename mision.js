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
  constructor({ vuelo, controles, SW, ui, obtener, reiniciarAvion, fuegoConFuel = false }) {
    this.fuegoConFuel = fuegoConFuel;   /* cabina nueva (etapa 4): no hay switch FIRE, el corte es la manija FUEL a OFF (estado 0); a confirmar con Bruno */
    Object.assign(this, { vuelo, controles, SW, ui, obtener, reiniciarAvion });
    this.fase = 'intro'; this.t = 0; this.pasos = []; this.i = 0; this.notas = {}; this.resultados = [];
    this.secuencia = ['arranque', 'despegue', 'falla', 'fuego', 'fallaDespegue'];
    this.falladas = 0; this.modoNivel = 0; this.registro = null; this.escenario = null; this.alCerrar = null;
  }
  /* ---- niveles del aula virtual (PLAN_JUEGO.md): un nivel por link, el tutor no dicta (la lista de tareas es el checklist), todo queda en el
     registro y al terminar se llama alCerrar(resultado) en vez del panel Seguir/Repetir ---- */
  nivel(n, escenario, registro) {
    this.modoNivel = n; this.escenario = escenario; this.registro = registro; this.resultados = []; this.fase = 'intro'; this.abortado = false;
    this.emergencia = null; this._mision = null; this._checklistDicho = false; Object.assign(this.vuelo.motor, { senal: null, fallaGen: false, genReset: false, carga: 1 });
    if (n === 1) {
      this.reiniciarAvion({ enPista: true, agua: 2400, apagado: true });
      const m = this.vuelo.motor; m.fallaArranque = escenario.falla || 'normal'; m.tFalla = 0; m.itt = escenario.ittInicial || 15;
      this.faseArranque();
    } else if (n === 2 || n === 3) {   /* nivel 2 (J2): misión de incendio; nivel 3 (J3): la misma misión con una emergencia sorpresa */
      this.reiniciarAvion({ enPista: true, agua: escenario.carga || 2400, apagado: false });
      this.emergencia = n === 3 && escenario.emergencia ? { tipo: escenario.emergencia, momento: escenario.momento, senales: !!escenario.senales, estado: 'latente' } : null;
      if (this.frds) { this.frds.trabada = this.emergencia?.tipo === 'compuerta'; this.frds.avisoTrabada = false; }   /* la compuerta trabada se descubre al querer largar */
      for (const n of ['levHEL', 'levCOND']) { const p = this.controles.palancas.find(x => x.nombre === n); if (p) { p.ang = -0.45; this.controles._aplicarPalanca(p); } }   /* en la cabecera, de rodaje: hélice y condición a mitad (ground idle); el checklist las pide adelante */
      const th = escenario.foco.rumbo * Math.PI / 180, p = this.lugarLlano(30 + escenario.foco.km * 1000 * Math.sin(th), -escenario.foco.km * 1000 * Math.cos(th));   /* desde el aeródromo: norte = −z, este = +x */
      this.incendio?.poner(p.x, p.z, this.obtener.terreno(p.x, p.z) + 0.5, escenario.viento);
      this.faseMisionIncendio();
    } else this.empezar('arranque');
  }
  /* el foco va en el lugar más llano a menos de 300 m del punto sorteado (determinista: mismo terreno, mismo lugar): la pasada a 100–200 ft
     tiene que poder hacerse sin una loma en el medio (12/11: el piloto de prueba chocó una a 1 km del foco) */
  lugarLlano(x0, z0) {
    const T = (x, z) => this.obtener.terreno(x, z); let mejor = null;
    for (let dx = -300; dx <= 300; dx += 100) for (let dz = -300; dz <= 300; dz += 100) {
      const x = x0 + dx, z = z0 + dz; let mn = T(x, z), mx = mn;
      for (let a = 0; a < 8; a++) for (const r of [120, 250, 400]) { const h = T(x + r * Math.cos(a * Math.PI / 4), z + r * Math.sin(a * Math.PI / 4)); mn = Math.min(mn, h); mx = Math.max(mx, h); }
      const relieve = mx - mn + Math.hypot(dx, dz) * 0.01;   /* a igual relieve, el más cercano al sorteado */
      if (!mejor || relieve < mejor.relieve) mejor = { x, z, relieve };
    }
    return mejor;
  }
  /* ---- nivel 3 (J3): la emergencia sorpresa. Se arma en nivel(3) con el escenario (tipo, momento, señales) y la vigila la misión: cuando se abre
     la ventana del momento elegido empiezan las señales previas (si las hay) y, 25 s después —o en el acto—, se dispara. Las que dejan sin
     motor (falla, fuego) esperan a que el avión pueda planear hasta el valle de la pista: si no, no sería examen sino trampa. La falla en el
     despegue va a 150 ft, salvo que el alumno lea las señales y aborte en la carrera. La compuerta trabada la dispara el propio intento de
     largar (evento compuerta-trabada). Falla, fuego y falla en el despegue cortan la misión y pasan a sus fases (las de la práctica, con el
     checklist a la vista); generador y compuerta meten sus pasos en el checklist y la misión sigue. La reacción (segundos hasta la primera
     acción correcta) se anota para la rúbrica. ---- */
  vigilarEmergencia() {
    const E = this.emergencia, v = this.vuelo, m = v.motor, foco = this.incendio?.pos, T = this.registro?.t ?? this.t; if (!E || E.tipo === 'compuerta' || E.estado === 'disparada' || E.estado === 'resuelta') return;
    const dist = p => Math.hypot(p.x - v.pos.x, p.z - v.pos.z);
    const dRect = (x, z, x0, x1, z0, z1) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
    if (E.estado === 'latente') {   /* ¿se abrió la ventana del momento elegido? */
      E.d0 ??= foco ? Math.hypot(foco.x - 30, foco.z - 100) : 3000;
      const abierta = { despegue: v.enTierra && m.torque > 85, ida: !v.enTierra && this.alt > 250 && !!foco && dist(foco) < 0.75 * E.d0, descarga: !!foco && dist(foco) < 1200, vuelta: this.descargas.length > 0 && !!foco && dist(foco) > 700 }[E.momento];
      if (!abierta) return;
      E.estado = 'ventana'; E.tVentana = T;
      if (E.senales) { m.senal = { tipo: E.tipo, t0: v.tiempo }; this.registro?.anotar('evento', { nombre: 'senal-previa', detalle: E.tipo }); }
    }
    if (E.estado === 'ventana') {
      if (E.senales && E.tipo === 'fallaDespegue' && v.enTierra && v.vIAS > 30 && this.lev('levPOT') < 0.2) {   /* leyó las señales y abortó el despegue: resuelta */
        E.estado = 'resuelta'; m.senal = null; this.registro?.anotar('falla', { texto: 'Señales de falla de motor en la carrera de despegue (aceite, torque)', t: +E.tVentana.toFixed(1) });
        this.registro?.anotar('reaccion', { texto: 'abortó el despegue', segundos: +(T - E.tVentana).toFixed(1) });
        this.cerrarFase('Misión de incendio', true, 'Abortaste el despegue por las señales de falla. Bien: se reporta y no se vuela.'); return;
      }
      if (T - E.tVentana < (E.senales ? 25 : 0)) return;
      if (E.tipo === 'fallaDespegue') { if (v.enTierra || this.alt < 150) return; }
      else if (E.tipo === 'falla' || E.tipo === 'fuego') { const agl = v.pos.y - this.obtener.terreno(v.pos.x, v.pos.z); if (agl * 7 < dRect(v.pos.x, v.pos.z, -250, 300, -4200, 500) + 250) return; }   /* planeando 9:1 (con margen) tiene que llegar al valle */
      this.dispararEmergencia();
    }
  }
  dispararEmergencia() {
    const E = this.emergencia, v = this.vuelo, m = v.motor, e = this.escenario; if (!E || E.estado === 'disparada') return;
    E.estado = 'disparada'; E.tDisparo = this.registro?.t ?? this.t; E.reaccionHecha = false; m.senal = null;
    this.registro?.anotar('falla', { texto: { falla: 'Falla de motor en vuelo', fuego: 'Fuego de motor', fallaDespegue: 'Falla de motor en el despegue', generador: 'Falla del generador (CAUTION)', compuerta: 'Compuerta de la tolva trabada' }[E.tipo] });
    this._mision = { pasos: this.pasos, i: this.i, vigilar: this.vigilar, alTerminar: this.alTerminar, titulo: this.titulo };   /* para retomar la misión si la emergencia se resuelve en vuelo */
    const reaccion = (texto, listo) => { E.reaccion = { texto, listo }; };
    if (E.tipo === 'fallaDespegue') { m.falla = true; m.sinRearranque = true; reaccion('nariz abajo y carga largada', () => v.largando != null || v.agua < 200); this.faseFallaDespegue(); }
    else if (E.tipo === 'falla') { m.falla = true; m.sinRearranque = !e.rearranque; m.causaFalla = e.rearranque ? 'combustible' : 'mecanica'; reaccion('carga largada', () => v.largando != null || v.agua < 100); this.faseFalla(); }
    else if (E.tipo === 'fuego') { m.fuego = true; v.tiempoFuego = 0; reaccion('potencia a ralentí', () => this.lev('levPOT') < 0.15); this.faseFuego(); }
    else if (E.tipo === 'generador') {
      m.fallaGen = e.genVuelve ? 'recuperable' : 'fija'; m.genReset = false; reaccion('reset del generador', () => m.genReset || !m.fallaGen);
      this.insertarPasos([
        { id: 'genReset', texto: 'MASTER CAUTION: generador fuera. GEN a OFF y de nuevo a ON (un intento)', listo: () => !m.fallaGen || !!m.genReset, emergencia: true },
        { id: 'genCarga', texto: 'Si no vuelve: luces y pitot OFF (la batería dura unos minutos) y seguir', listo: () => !m.fallaGen || (m.consumo || 0) < 0.3, emergencia: true },
      ]);
    } else if (E.tipo === 'compuerta') { reaccion('manija E-DUMP', () => v.largando != null || v.agua < 100); this.insertarPasos([{ id: 'edump', texto: 'La compuerta no abre (trabada): manija E-DUMP sobre el foco', listo: () => v.largando != null || v.agua < 100, emergencia: true }]); }
  }
  insertarPasos(nuevos) {   /* los pasos de una emergencia que no corta la misión van delante del paso actual */
    this.pasos.splice(this.i, 0, ...nuevos); this.tPaso = 0; if (nuevos[0]) nuevos[0]._yaEstaba = !!nuevos[0].listo(); this.mostrarPaso();
  }
  retomarMision() {   /* la emergencia se resolvió en vuelo (motor rearrancado): sigue la misión donde estaba */
    const g = this._mision; if (!g) return; this.emergencia.estado = 'resuelta'; this._mision = null;
    this.fase = 'mision'; this.pasos = g.pasos; this.i = g.i; this.vigilar = g.vigilar; this.alTerminar = g.alTerminar; this.titulo = g.titulo; this.tPaso = 0;
    this.alContacto = this.volando ? d => this.evaluarAterrizajeNormal(d) : null; this.ui.cartel(this.titulo); this.mostrarPaso();
    this.decir(this.titulo, 'Torre: copiado el rearranque. Seguí la misión o volvé, a tu criterio.');
  }
  /* la orden de vuelo por radio, en pedazos con WAV propio (dígitos sueltos: herramientas/voces.py los genera) */
  frasesOrden(e) {
    const D = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const dig = n => String(n).split('').map(ch => ch === '.' || ch === ',' ? 'coma' : D[+ch]);
    return ['Torre a Air Tractor: foco de incendio.', 'Rumbo al foco:', ...dig(String(e.foco.rumbo).padStart(3, '0')), 'Distancia:', ...dig(String(e.foco.km)), 'kilómetros.',
      'Viento de los', ...dig(String(e.viento.dir).padStart(3, '0')), 'a', ...dig(e.viento.kt), 'nudos.', 'Carga:', ...dig(e.carga), 'kilos.', 'Cobertura:', ...dig(e.cobertura), 'Autorizado a despegar.'];
  }
  faseMisionIncendio() {
    const v = this.vuelo, e = this.escenario, foco = this.incendio?.pos, p3 = n => String(Math.round(n)).padStart(3, '0');
    this.vRot = null; this.maxDesvio = 0; this.salioPista = false; this.perdidaAnotada = false; this.descarga = null; this.descargas = []; this.volando = false; this.bajoAnotado = false; this.alContacto = null;
    const rumboA = p => ((Math.atan2(p.x - v.pos.x, -(p.z - v.pos.z)) * 180 / Math.PI) % 360 + 360) % 360;   /* rumbo desde el avión a p (norte = −z, este = +x) */
    const rumboAvion = () => ((90 - v.euler.rumbo * 180 / Math.PI) % 360 + 360) % 360;
    const difRumbo = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
    const dist = p => Math.hypot(p.x - v.pos.x, p.z - v.pos.z);
    const pista = { x: 30, z: -500 }, aprox = { x: 30, z: -3000 };   /* centro de la pista y el punto de aproximación: al NORTE (el valle sigue la pista hacia el norte; al sur hay sierras), final a la 18 */
    const pesado = (3200 + v.agua) * 2.20462 > 12500;
    this.definir('mision', [
      { id: 'orden', texto: `Orden de vuelo: foco a ${e.foco.km} km rumbo ${p3(e.foco.rumbo)}°, viento ${p3(e.viento.dir)}°/${e.viento.kt} kt, carga ${e.carga} kg, cobertura ${e.cobertura}`, listo: () => this.tPaso > 6, marca: null },
      { id: 'hel', texto: 'Hélice: TODA ADELANTE', listo: () => this.lev('levHEL') > 0.8 },
      { id: 'cond', texto: 'Palanca de condición: FLIGHT (adelante)', listo: () => this.lev('levCOND') > 0.8 },
      pesado ? { id: 'flaps', texto: 'Flaps 10° (más de 12.500 lb)', listo: () => v.mando.flaps >= 0.5 && v.mando.flaps < 1 } : { id: 'flapsChk', texto: 'Flaps arriba (hasta 12.500 lb)', listo: () => v.mando.flaps === 0 },   /* liviano: es un chequeo (ya están arriba), no cuenta como «fuera de orden» */
      { id: 'pot', texto: 'Potencia de despegue, pedales para el eje', listo: () => v.motor.torque > 85 },
      { id: 'rot', texto: 'Rotá suave y montada inicial', listo: () => !v.enTierra && this.alt > 100 },
      { id: 'rumbo', texto: `Rumbo al foco ${p3(e.foco.rumbo)}° (CRS en el Garmin), trepando a 500 ft`, listo: () => foco && difRumbo(rumboAvion(), rumboA(foco)) < 12 && this.alt > 300 },
      { id: 'foco', texto: 'Llegar al foco (el humo, adelante)', listo: () => foco && dist(foco) < 600 },
      { id: 'desc', texto: `Descarga sobre el foco: 100–200 ft, 110–130 mph, cobertura ${e.cobertura} (GATE o SALVO)`, listo: () => this.descargas.length > 0 },
      { id: 'vuelta', texto: 'Vuelta: al norte del aeródromo por el valle y final a la pista 18 (CRS 180)', listo: () => this.descargas.length > 0 && difRumbo(rumboAvion(), rumboA(aprox)) < 20 && dist(foco) > 800 },
      { id: 'aprox', texto: 'Aproximación: flaps, 100 mph, alineado con la pista', listo: () => this.alt < 300 && Math.abs(v.pos.x - 30) < 80 && v.pos.z > -3300 && v.pos.z < 300 },
      { id: 'tierra', texto: 'Aterrizar en la pista', listo: () => v.enTierra && this.volando },
      { id: 'parar', texto: 'Frenar y detenerse en la pista', listo: () => v.enTierra && this.volando && v.vIAS < 5 },   /* la misión cierra con el avión detenido: la carrera de aterrizaje también cuenta */
    ].filter(Boolean), 'Misión de incendio');
    this.rodando = false; this.salioAterrizando = false; this.textoToque = null;
    this.ui.decirVarias?.(this.frasesOrden(e));
    this.vigilar = () => {
      if (!v.enTierra && this.alt > 50 && !this.volando) { this.volando = true; this.alContacto = d => this.evaluarAterrizajeNormal(d); }
      if (v.enTierra && !this.volando) { const d = Math.abs(v.pos.x - 30); this.maxDesvio = Math.max(this.maxDesvio, d); if (d > 8 && v.vIAS > 20 && !this.salioPista) { this.salioPista = true; this.puntos -= 40; this.detalle.push('se salió de la pista en el despegue'); } }
      if (!v.enTierra && this.vRot == null) { this.vRot = v.vIAS; if (this.vRot < 78) { this.puntos -= 20; this.detalle.push(`rotó a ${this.vRot.toFixed(0)} mph (lento)`); } else if (this.vRot > 115) { this.puntos -= 10; this.detalle.push(`rotó a ${this.vRot.toFixed(0)} mph (tarde)`); } }
      if (v.perdida && !this.perdidaAnotada) { this.perdidaAnotada = true; this.puntos -= 30; this.detalle.push('entró en pérdida'); }
      const enValle = Math.abs(v.pos.x - 30) < 300 && v.pos.z > -4200 && v.pos.z < 500;   /* el eje de la pista y sus prolongaciones: ahí se baja para aterrizar */
      if (this.volando && this.alt < 100 && foco && dist(foco) > 1500 && !enValle && !this.bajoAnotado) {   /* fuera de la pasada (1,5 km del foco) y del valle: bajo */ this.bajoAnotado = true; this.puntos -= 15; this.detalle.push('voló por debajo de 100 ft en ruta'); }
      v.cursoHSI = this.descargas.length ? (dist(aprox) > 600 && v.pos.z > -2600 ? rumboA(aprox) : 180) : (foco ? rumboA(foco) : 360);   /* el CRS del Garmin: al foco en la ida; a la vuelta, al punto de aproximación y después la final 18 */
      if (v.largando != null && v.agua > 0 && !this.descarga) { this.descarga = { t0: this.t, pos0: v.pos.clone(), vel0: v.vel.clone(), agl0: this.alt, ias0: v.vIAS, cob: this.frds?.cobertura ?? e.cobertura, agua0: Math.max(v.agua, this._aguaPrev ?? v.agua) };   /* lo que había antes de abrir (la compuerta abre entre cuadros) */ this.registro?.anotar('evento', { nombre: 'descarga-inicio', detalle: `${this.alt.toFixed(0)} ft, ${v.vIAS.toFixed(0)} mph, a ${foco ? dist(foco).toFixed(0) : '?'} m del foco` }); }
      if (this.descarga && (v.largando == null || v.agua <= 0)) this.evaluarDescarga();
      if (!this.descarga) this._aguaPrev = v.agua;
      if (this.rodando && v.enTierra && !this.salioAterrizando && (Math.abs(v.pos.x - 30) > 25 || v.pos.z > 200 || v.pos.z < -1200)) { this.salioAterrizando = true; this.puntos -= 30; this.detalle.push(`se salió de la pista en la carrera de aterrizaje (x ${v.pos.x.toFixed(0)}, z ${v.pos.z.toFixed(0)})`); }
      if (this.emergencia) this.vigilarEmergencia();
    };
    this.alTerminar = () => {   /* la misión se cumple si alguna descarga llegó al foco (a menos de 150 m): si no, la nota puede dar pero no se aprueba */
      const util = this.descargas.some(d => d.dm <= 150); if (!util && this.descargas.length) this.detalle.push('la misión no se cumplió: ninguna descarga llegó al foco (a menos de 150 m)');
      this.cerrarFase('Misión de incendio', util, this.textoToque || 'Aterrizaste.');
    };
  }
  evaluarDescarga() {
    const v = this.vuelo, d = this.descarga, foco = this.incendio?.pos, e = this.escenario; this.descarga = null;
    const caida = (p, vel, agl) => { const tc = Math.sqrt(2 * Math.max(5, agl / 3.281) / 9.8); return { x: p.x + vel.x * tc, z: p.z + vel.z * tc }; };   /* el agua cae unos 3 s desde 150 ft: adelante del avión */
    const a = caida(d.pos0, d.vel0, d.agl0), b = caida(v.pos, v.vel, this.alt);
    const distSeg = (p, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz; const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L2)) : 0; return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz); };
    const dm = foco ? distSeg(foco, a, b) : Infinity, largo = Math.hypot(b.x - a.x, b.z - a.z), kg = d.agua0 - v.agua;
    const okAlt = d.agl0 >= 100 && d.agl0 <= 200, okVel = d.ias0 >= 110 && d.ias0 <= 130, okCob = d.cob === e.cobertura;
    const texto = `${kg.toFixed(0)} kg desde ${d.agl0.toFixed(0)} ft a ${d.ias0.toFixed(0)} mph, línea de ${largo.toFixed(0)} m a ${dm.toFixed(0)} m del foco, cobertura ${d.cob}`;
    this.descargas.push({ dm, agl: d.agl0, ias: d.ias0, cob: d.cob, kg, largo });
    this.registro?.anotar('descarga', { texto, dm: +dm.toFixed(0), agl: +d.agl0.toFixed(0), ias: +d.ias0.toFixed(0), cob: d.cob, kg: +kg.toFixed(0), largo: +largo.toFixed(0), okAlt, okVel, okCob });
    if (!okAlt) { this.puntos -= 15; this.detalle.push(`descarga a ${d.agl0.toFixed(0)} ft (ventana 100 a 200)`); }
    if (!okVel) { this.puntos -= 10; this.detalle.push(`descarga a ${d.ias0.toFixed(0)} mph (ventana 110 a 130)`); }
    if (!okCob) { this.puntos -= 10; this.detalle.push(`cobertura ${d.cob} en vez de ${e.cobertura}`); }
    if (kg < 300) { this.puntos -= 10; this.detalle.push('descarga parcial (menos de 300 kg)'); }
    if (dm > 150) { this.puntos -= 40; this.detalle.push(`la descarga cayó a ${dm.toFixed(0)} m del foco`); this.decir(this.titulo, 'Torre: la descarga cayó lejos del foco.'); }
    else if (dm > 60) { this.puntos -= 15; this.detalle.push(`descarga a ${dm.toFixed(0)} m del foco (parcial)`); this.incendio?.controlar(0.5); this.decir(this.titulo, 'Torre: descarga cerca del foco, parcial. Volvé a la pista.'); }
    else { this.incendio?.controlar(1); this.decir(this.titulo, 'Torre: foco controlado. Volvé a la pista.'); }
  }
  evaluarAterrizajeNormal(d) {
    const v = this.vuelo; let texto;
    if (v.estrellado) {   /* contra el terreno en ruta, con un ala o de panza: fatal, y no se le suma lo del aterrizaje */
      const causa = d.terreno ? `chocó contra el terreno a ${d.v.toFixed(0)} mph` : d.bank > 0.25 ? 'tocó con un ala' : `toque muy fuerte (${d.vv.toFixed(1)} m/s de descenso)`;
      this.puntos = Math.min(this.puntos, 30); this.registro?.marcarFatal(causa); texto = `${causa.charAt(0).toUpperCase() + causa.slice(1)}. El avión no quedó entero.`;
    } else {
      if (d.vv > 2) { this.puntos -= 15; this.detalle.push(`toque fuerte (${d.vv.toFixed(1)} m/s)`); }
      if (Math.abs(v.pos.x - 30) > 20 || v.pos.z < -1250 || v.pos.z > 200) { this.puntos -= 30; this.detalle.push(`aterrizó fuera de la pista (x ${v.pos.x.toFixed(0)}, z ${v.pos.z.toFixed(0)})`); }
      if (d.v > 115) { this.puntos -= 10; this.detalle.push(`tocó rápido (${d.v.toFixed(0)} mph)`); }
      if (!this.descargas.length) { this.puntos -= 50; this.detalle.push('volvió sin largar sobre el foco'); }
      if (v.mando.flaps < 0.5) { this.puntos -= 5; this.detalle.push('aterrizó sin flaps'); }
      texto = `Aterrizaste: descenso ${d.vv.toFixed(1)} m/s a ${d.v.toFixed(0)} mph.`;
    }
    this.alContacto = null;
    if (v.estrellado) this.cerrarFase('Misión de incendio', false, texto);
    else { this.textoToque = texto; this.rodando = true; this.registro?.anotar('evento', { nombre: 'toque', detalle: texto }); }   /* el cierre lo da el último paso (detenerse en la pista) o un accidente en la carrera */
  }
  _nuevoDetalle() {   /* las observaciones (penalizaciones) también van al registro */
    const d = []; const reg = this.registro; if (!reg) return d;
    d.push = (...xs) => { for (const x of xs) reg.anotar('observacion', { texto: x }); return Array.prototype.push.apply(d, xs); }; return d;
  }
  // ------------- utilidades -------------
  sw(n) { if (n === 'FIRE' && this.fuegoConFuel) return this.controles.estado(this.SW.FIRE) === 0; return !!this.controles.estado(this.SW[n]); }
  lev(n) { const p = this.controles.palancas.find(x => x.nombre === n); return p ? THREE.MathUtils.clamp(-p.ang / 0.9, 0, 1) : 0; }
  get alt() { return this.vuelo.pos.y * 3.28084 - (this.obtener.terreno(this.vuelo.pos.x, this.vuelo.pos.z) * 3.28084); }
  get ias() { return this.vuelo.vIAS; }
  decir(titulo, texto, hablar = texto) { this.ui.tutor(titulo, texto); if (hablar) this.ui.decir(hablar); }
  anotar(clave, valor) { this.notas[clave] = valor; }
  // pasos: [{ id, texto, listo: () => bool, tiempo?: s límite, alFallar?: texto }]
  definir(fase, pasos, titulo) {
    this.fase = fase; this.pasos = pasos; this.i = 0; this.tPaso = 0; this.t = 0; this.titulo = titulo; if (pasos[0]) pasos[0]._yaEstaba = false;
    if (this.modoNivel && this.emergencia?.estado === 'disparada') for (const p of pasos) p.emergencia = true;   /* nivel 3: los pasos de la emergencia, para la rúbrica */
    if (!fase.startsWith('forzoso') && fase !== 'fallaDespegue') { this.puntos = 100; this.detalle = this._nuevoDetalle(); }   /* el forzoso hereda los puntos de la emergencia */
    this.forzoso = false; this.volvio = false; this.perdidaAnotada = false; this.salioPista = false; this.tApagando = null; this.fuegoFatal = false; this.alContacto = null;
    this.ui.cartel(titulo); this.mostrarPaso();
  }
  mostrarPaso() {
    const p = this.pasos[this.i]; if (!p) return;
    if (this.modoNivel) {   /* sin dictado: el checklist a la vista (los hechos tachados), sin el paso actual resaltado, sin voz ni aro amarillo */
      this.ui.tareas(this.pasos.map((q, k) => ({ texto: q.texto, ok: k < this.i, actual: false })));
      if (this.i === 0 && !this._checklistDicho) { this._checklistDicho = true; this.decir(this.titulo, 'Seguí el checklist de la tablilla. El tutor no dicta: anota.'); } this.ui.marcar?.(null); return;
    }
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
    const tarde = !!(p.tiempo && this.tPaso > p.tiempo), anticipado = !!p._yaEstaba && this.i > 0 && this.t > 1.5 && !['off', 'libre', 'chk', 'acel', 'boostOff', 'soltar', 'flapsChk', 'orden', 'rot', 'asc', 'nivel', 'rumbo', 'foco', 'desc', 'vuelta', 'aprox', 'tierra', 'parar', 'genCarga', 'rearr', 'fin', 'frente', 'conf', 'campo', 'planeo', 'nariz', 'dump', 'bandera'].includes(p.id);   /* sólo cuentan los pasos que son una acción sobre un control, no los de navegación o espera */   /* ya estaba hecho cuando el paso pasó a ser el actual: fuera de orden (salvo los pasos de espera o de «dejar», y los del estado inicial en el primer segundo y medio) */
    if (tarde) { this.puntos -= p.penal ?? 10; if (!this.modoNivel) this.detalle.push(`${p.texto}: tarde (${this.tPaso.toFixed(0)} s)`); }   /* en los niveles ya queda en el paso del registro */
    this.registro?.anotar('paso', { id: p.id, texto: p.texto, tardo: +this.tPaso.toFixed(1), tarde, anticipado, emergencia: !!p.emergencia });   /* anticipado: ya estaba hecho cuando correspondió (fuera de orden) */
    this.i++; this.tPaso = 0;
    const q = this.pasos[this.i]; if (q) q._yaEstaba = !!q.listo();   /* se mira en el acto: si ya está, el alumno lo hizo antes de que correspondiera */
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
    if (this.modoNivel) {   /* nivel: se interrumpe y va al debrief */
      this.registro?.anotar('fin', { texto: `${nombre}: ${texto}`, exito, nota }); this.fase = 'resultado'; this.ui.tareas([]); this.ui.marcar?.(null);
      this.decir(nombre, texto); this.alCerrar?.({ nombre, nota: exito ? nota : Math.min(nota, 40), exito, texto, abortado: this.abortado, detalle: this.detalle.slice() }); return;
    }
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
    // vigilancia: condición adelante antes de Ng 12 → arranque caliente; starter más de 30 s; y en el nivel 1, las fallas preparadas
    this.tStarter = 0; this.starterAnotado = false; this.sintomaT = null;
    this.vigilar = () => {
      if (!m.encendido && this.lev('levCOND') > 0.3 && m.arrancador && m.ng < 12 && !this.arranqueCaliente) { this.arranqueCaliente = true; this.puntos -= 30; this.detalle.push('condición adelante antes de Ng 12 % (riesgo de arranque caliente)'); if (!this.modoNivel) this.decir('Puesta en marcha', '¡Muy pronto! Condición a corte, dejá girar y esperá Ng 12 %.'); }
      this.tStarter = m.arrancador && !m.encendido ? this.tStarter + this.dt : 0;
      if (this.tStarter > 30 && !this.starterAnotado) { this.starterAnotado = true; this.puntos -= 20; this.detalle.push('starter más de 30 s'); this.registro?.anotar('starter', { segundos: 30 }); }
      if (!this.modoNivel) return;
      const falla = this.escenario?.falla; if (!falla || falla === 'normal' || this.abortado) return;
      if (m.tFalla && this.sintomaT == null) { this.sintomaT = this.t; this.registro?.anotar('falla', { texto: { hot: 'la ITT se dispara (hot start)', hung: 'Ng se clava en 24 % y la ITT sube (hung start)', bateria: 'Ng no pasa de 9 % (batería baja)' }[falla], falla }); }
      if (this.sintomaT != null) {
        const corto = this.lev('levCOND') < 0.1 && !this.sw('START');
        if (corto) { this.abortado = true; const s = +(this.t - this.sintomaT).toFixed(1); this.registro?.anotar('reaccion', { texto: 'cortó condición y starter', segundos: s });
          if (s > 8) { this.puntos -= Math.min(40, Math.round(s * 2)); this.detalle.push(`tardó ${s} s en abortar`); }
          this.cerrarFase('Puesta en marcha', true, { hot: 'Abortaste el hot start a tiempo. Bien: motoring para enfriar y reportar.', hung: 'Abortaste el hung start. Bien: dejá enfriar y repetí la secuencia.', bateria: 'Abortaste bien: batería baja, pedí fuente externa.' }[falla]); return; }
        if (m.itt > 1000) { this.registro?.marcarFatal('ITT superó 1000 °C: motor dañado'); this.puntos -= 60; this.cerrarFase('Puesta en marcha', false, 'La ITT pasó los 1000 °C: el motor quedó dañado. Había que cortar condición y starter.'); return; }
        if (falla === 'bateria' && this.lev('levCOND') > 0.3 && !this.condConBateriaBaja) { this.condConBateriaBaja = true; this.puntos -= 30; this.detalle.push('puso condición con Ng por debajo de 12 % (batería baja)'); }
      }
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
      if (m.falla && !m.sinRearranque && this.lev('levCOND') < 0.1 && m.ng < 30) { m.falla = false; }   /* mecánica (sinRearranque): no vuelve */
      if (!m.encendido && this.alt < 350 && this.fase === 'falla' && !this.forzoso) { this.forzoso = true; this.faseForzoso('Sin motor: aterrizaje forzoso'); }
      if (m.encendido && !this.rearrancado && this.i >= 3) { this.rearrancado = true; this.decir(this.titulo, 'Arrancó. Hélice adelante y potencia.'); }
    };
    this.alTerminar = () => { if (this.modoNivel && this._mision) this.retomarMision(); else this.cerrarFase('Falla de motor en vuelo', true, 'Rearranque logrado. El motor está en marcha.'); };
  }
  faseFuego() {
    const v = this.vuelo, m = v.motor; this.tFuego = 0;
    this.definir('fuego', [
      { id: 'pot', texto: '¡FUEGO DE MOTOR! Potencia a RALENTÍ', listo: () => this.lev('levPOT') < 0.15, tiempo: 6, penal: 15, voz: 'Fuego de motor. Potencia a ralentí.' },
      { id: 'cond', texto: 'Condición a CORTE', listo: () => this.lev('levCOND') < 0.1, tiempo: 8, penal: 20 },
      { id: 'fire', texto: this.fuegoConFuel ? 'Corte de combustible: manija FUEL a OFF' : 'Corte de combustible y extintor: switch FIRE', listo: () => this.sw('FIRE'), tiempo: 10, penal: 20 },
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
    if (v.estrellado) { this.puntos = Math.min(this.puntos, 30); const causa = d.terreno ? `chocó contra el terreno a ${d.v.toFixed(0)} mph` : d.bank > 0.25 ? 'tocó con un ala' : `toque muy fuerte (${d.vv.toFixed(1)} m/s de descenso)`; this.registro?.marcarFatal(causa); texto = `${causa.charAt(0).toUpperCase() + causa.slice(1)}. El avión no quedó entero.`; }
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
    const E = this.emergencia;   /* nivel 3: la primera acción correcta ante la emergencia, con sus segundos */
    if (E && E.estado === 'disparada' && E.reaccion && !E.reaccionHecha && E.reaccion.listo()) { E.reaccionHecha = true; this.registro?.anotar('reaccion', { texto: E.reaccion.texto, segundos: +((this.registro?.t ?? this.t) - E.tDisparo).toFixed(1) }); }
    if (this.fase === 'pausa') return;
    const p = this.pasos[this.i];
    if (p && p.listo()) { this.avanzarPaso(); if (this.i >= this.pasos.length) this.alTerminar?.(); }
  }
  evento(tipo, d) {
    this.registro?.anotar('evento', { nombre: tipo, detalle: d && typeof d === 'object' ? Object.entries(d).map(([k, v]) => `${k} ${typeof v === 'number' ? +v.toFixed(1) : v}`).join(', ') : '' });
    if (this.fase === 'resultado') return;   /* el nivel ya cerró: lo que pase después (p. ej. seguir rodando hasta la loma) no cambia el resultado */
    if (tipo === 'contacto' || tipo === 'accidente') { if (this.alContacto && (tipo === 'accidente' || this.vuelo.enTierra || true)) { const f = this.alContacto; this.alContacto = null; f(d); } else if (tipo === 'accidente' && this.fase !== 'pausa' && this.fase !== 'intro') { if (this.modoNivel) this.registro?.marcarFatal(d?.terreno ? 'chocó contra el terreno' : 'accidente'); this.cerrarFase(this.titulo || 'Vuelo', false, 'Accidente. Repasemos qué pasó.'); } }
    if (tipo === 'vne') { this.puntos -= 10; this.detalle.push('superó la Vne'); }
    if (tipo === 'fuego-extinguido') this.decir(this.titulo, 'Fuego extinguido. Ahora, a aterrizar.');
    if (tipo === 'compuerta-trabada' && this.emergencia?.tipo === 'compuerta') this.dispararEmergencia();
    if (tipo === 'fuego-incontrolado' && this.fase !== 'pausa') { this.vuelo.estrellado = true; if (this.modoNivel) this.registro?.marcarFatal('fuego de motor incontrolado'); this.cerrarFase('Fuego de motor', false, this.fuegoConFuel ? 'El fuego no se controló a tiempo. Repasá: ralentí, condición a corte, FUEL a OFF.' : 'El fuego no se controló a tiempo. Repasá: ralentí, condición a corte, FIRE.'); }
  }
}
