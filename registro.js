// Registrador de la partida (PLAN_JUEGO.md §2): anota con el tiempo de misión todo lo que pasa y todo lo que el alumno toca; de acá
// salen la línea de tiempo del debrief y las observaciones del instructor. Lo alimentan main.js (controles, eventos del vuelo,
// muestreo de parámetros) y mision.js (pasos del checklist, observaciones, fallas).
export class Registro {
  constructor() { this.tMision = 0; this.items = []; this.excesos = {}; this.fatal = null; }
  get t() { return this.tMision; }
  tic(dt) { this.tMision += dt; }
  anotar(tipo, datos = {}) { const it = { t: +this.tMision.toFixed(1), tipo, ...datos }; this.items.push(it); return it; }
  /* parámetros excedidos: se anota al entrar y al salir (con el máximo y la duración) */
  muestrear(vuelo) {
    const m = vuelo.motor;
    this._exceso('ITT', m.itt, 1000, '°C'); this._exceso('torque', m.torque, 100, '%'); this._exceso('velocidad', vuelo.vIAS, 220, 'mph');
  }
  _exceso(k, v, lim, u) {
    const ex = this.excesos[k];
    if (v > lim) { if (!ex) { this.excesos[k] = { max: v, desde: this.tMision }; this.anotar('exceso', { que: k, valor: Math.round(v), limite: lim, unidad: u }); } else ex.max = Math.max(ex.max, v); }
    else if (ex) { this.anotar('fin-exceso', { que: k, max: Math.round(ex.max), dur: +(this.tMision - ex.desde).toFixed(1) }); delete this.excesos[k]; }
  }
  marcarFatal(texto) { if (!this.fatal) { this.fatal = texto; this.anotar('fatal', { texto }); } }
  /* la línea de tiempo en texto, para el debrief y la constancia */
  lineaDeTiempo() {
    const f = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    return this.items.map(it => {
      let txt = '';
      if (it.tipo === 'control') txt = `${it.nombre} → ${it.valor}`;
      else if (it.tipo === 'paso') txt = `✓ ${it.texto}${it.tarde ? ` (tarde: ${it.tardo.toFixed(0)} s)` : ''}${it.anticipado ? ' (ya estaba hecho antes de corresponder)' : ''}`;
      else if (it.tipo === 'observacion') txt = `⚠ ${it.texto}`;
      else if (it.tipo === 'exceso') txt = `⚠ ${it.que} ${it.valor} ${it.unidad} (límite ${it.limite})`;
      else if (it.tipo === 'fin-exceso') txt = `${it.que} volvió al límite (máx. ${it.max}, ${it.dur} s)`;
      else if (it.tipo === 'falla') txt = `✱ ${it.texto}`;
      else if (it.tipo === 'fatal') txt = `✖ ${it.texto}`;
      else if (it.tipo === 'evento') txt = `· ${it.nombre}${it.detalle ? ' ' + it.detalle : ''}`;
      else if (it.tipo === 'fin') txt = `■ ${it.texto}`;
      else if (it.tipo === 'inicio') txt = `▶ Nivel ${it.nivel} · ${it.situacion}`;
      else if (it.tipo === 'reaccion') txt = `✓ ${it.texto} (${it.segundos} s después del síntoma)`;
      else if (it.tipo === 'starter') txt = `⚠ starter más de ${it.segundos} s`;
      else txt = `${it.tipo} ${JSON.stringify({ ...it, t: undefined, tipo: undefined })}`;
      return { t: it.t, hora: f(it.t), tipo: it.tipo, texto: txt, malo: /^[⚠✖]/.test(txt) || !!it.tarde || !!it.anticipado };
    });
  }
}
