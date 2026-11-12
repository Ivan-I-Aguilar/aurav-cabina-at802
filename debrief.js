// Devolución al instructor (PLAN_JUEGO.md §2): al terminar un nivel el juego se interrumpe y muestra aprobado/no, la nota por
// competencia, la línea de tiempo con lo malo en rojo y las observaciones; se descarga la constancia (PNG) y el resultado (JSON),
// que además queda en localStorage (aurav_cabina_resultados) listo para mandarlo al aula virtual cuando exista (mismo JSON).
import { Constancia } from './constancia.js';
import { describir, FALLAS_ARRANQUE, EMERGENCIAS, MOMENTOS } from './escenario_azar.js';

export const PESOS = { procedimientos: 40, reaccion: 25, control: 20, decision: 15 };
export const APROBADO = 70;
const NOMBRES = { 1: 'Nivel 1 · Puesta en marcha', 2: 'Nivel 2 · Misión de incendio', 3: 'Nivel 3 · Salida con emergencia' };

export function codigoVerificacion(texto) {   /* FNV-1a de 32 bits, en hexadecimal: el instructor lo recomputa con los mismos datos */
  let h = 0x811c9dc5; for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

/* Rúbrica del nivel 1 a partir del registro: cuatro competencias de 0 a 100 */
export function rubricaNivel1(registro, escenario, resultado) {
  const items = registro.items; const c = { procedimientos: 100, reaccion: 100, control: 100, decision: 100 };
  for (const it of items) {
    if (it.tipo === 'paso' && it.tarde) c.procedimientos -= 6;
    if (it.tipo === 'paso' && it.anticipado) c.procedimientos -= 5;
    if (it.tipo === 'observacion') { if (/antes de Ng 12/.test(it.texto)) c.decision -= 40; else c.procedimientos -= 8; }
    if (it.tipo === 'exceso') { if (it.que === 'ITT') c.control -= 50; else c.control -= 20; }
    if (it.tipo === 'reaccion') { const s = it.segundos; c.reaccion -= s <= 4 ? 0 : s <= 8 ? 15 : s <= 15 ? 40 : 70; }
    if (it.tipo === 'starter') c.control -= 25;
  }
  if (escenario.falla !== 'normal') { if (!resultado.abortado) { c.decision -= 60; c.reaccion = 0; } } else c.reaccion = Math.max(c.reaccion, 90);   /* sin falla no hay reacción que medir; con falla y sin abortar, la reacción es nula */
  if (registro.fatal) { c.control = Math.min(c.control, 20); c.decision = Math.min(c.decision, 30); }
  for (const k in c) c[k] = Math.max(0, Math.min(100, Math.round(c[k])));
  return c;
}

/* Rúbrica del nivel 2: procedimientos (checklist, pista, pérdida) · navegación y descarga (la ventana y dónde cayó) · control (toque, velocidades, bajo) · decisión (largó sobre el foco, volvió) */
export function rubricaNivel2(registro, escenario, resultado) {
  const its = registro.items, c = { procedimientos: 100, reaccion: 100, control: 100, decision: 100 }; let descargas = 0;
  for (const it of its) {
    if (it.tipo === 'paso' && it.tarde) c.procedimientos -= 6;
    if (it.tipo === 'paso' && it.anticipado) c.procedimientos -= 4;
    if (it.tipo === 'descarga') { descargas++; if (!it.okAlt) c.reaccion -= 20; if (!it.okVel) c.reaccion -= 15; if (!it.okCob) c.reaccion -= 10; c.reaccion -= it.dm > 150 ? 60 : it.dm > 60 ? 25 : 0; c.decision -= it.dm > 150 ? 30 : it.dm > 60 ? 10 : 0; if (it.kg < 300) c.decision -= 15; }
    if (it.tipo === 'observacion') { const t = it.texto;
      if (/ventana 1|en vez de|menos de 300 kg|cayó a \d+ m del foco|del foco \(parcial\)/.test(t)) continue;   /* lo de la descarga ya se contó con el renglón «descarga» */
      if (/pista|pérdida|rotó/.test(t)) c.procedimientos -= 15; else if (/toque|rápido|bajo de 100|sin flaps/.test(t)) c.control -= 15; else if (/sin largar|no se cumplió/.test(t)) c.decision -= 40; else c.procedimientos -= 5; }
    if (it.tipo === 'exceso') c.control -= it.que === 'velocidad' ? 20 : 10;
  }
  const cortada = its.some(i => i.tipo === 'falla' && /motor|Fuego/.test(i.texto));   /* nivel 3: una falla de motor o un fuego cortan la misión: sin descarga no hay castigo */
  if (!descargas && !cortada) { c.reaccion = 0; c.decision -= 50; }
  if (registro.fatal) { c.control = Math.min(c.control, 20); c.decision = Math.min(c.decision, 30); }
  for (const k in c) c[k] = Math.max(0, Math.min(100, Math.round(c[k])));
  return c;
}
/* Rúbrica del nivel 3: la del 2 para procedimientos y control; «reacción» = la emergencia (segundos hasta la primera acción correcta, pasos de la
   emergencia hechos tarde); «decisión» = lo decidido en la emergencia más la calidad de la descarga (a la mitad de peso) */
export function rubricaNivel3(registro, escenario, resultado) {
  const c = rubricaNivel2(registro, escenario, resultado), its = registro.items;
  c.decision = Math.max(0, Math.round(c.decision - (100 - c.reaccion) * 0.5));
  const f = its.find(i => i.tipo === 'falla'), r = its.find(i => i.tipo === 'reaccion');
  if (!f) c.reaccion = resultado.exito === false ? 50 : 100;   /* la emergencia no llegó a darse (la partida terminó antes): no hay reacción que medir */
  else if (!r) c.reaccion = 0;
  else { const s = r.segundos; c.reaccion = 100 - (s <= 5 ? 0 : s <= 10 ? 15 : s <= 20 ? 40 : 70); for (const it of its) if (it.tipo === 'paso' && it.tarde && it.emergencia) c.reaccion -= 10; }
  for (const it of its) if (it.tipo === 'observacion' && /volver a la pista|sin batería|condición no estaba|batería quedó/.test(it.texto)) c.decision -= 20;
  for (const k in c) c[k] = Math.max(0, Math.min(100, Math.round(c[k])));
  return c;
}
export const NOMBRES_COMP = { 1: { procedimientos: 'Procedimientos', reaccion: 'Reacción', control: 'Control del avión', decision: 'Decisión' }, 2: { procedimientos: 'Procedimientos', reaccion: 'Navegación y descarga', control: 'Control del avión', decision: 'Decisión' },
  3: { procedimientos: 'Procedimientos', reaccion: 'Reacción a la emergencia', control: 'Control del avión', decision: 'Decisión y descarga' } };
export function notaFinal(comp) { let s = 0; for (const k in PESOS) s += (comp[k] ?? 0) * PESOS[k] / 100; return Math.round(s); }

/* observaciones en texto para el instructor, generadas de la línea de tiempo */
export function observaciones(registro, escenario, resultado) {
  const o = []; const its = registro.items;
  for (const i of its.filter(i => i.tipo === 'descarga')) o.push(`Descarga: ${i.texto}.`);
  if (escenario.falla && escenario.falla !== 'normal') {
    o.push(`La situación era: ${FALLAS_ARRANQUE[escenario.falla]}.`);
    const f = its.find(i => i.tipo === 'falla'), r = its.find(i => i.tipo === 'reaccion');
    if (f && r) o.push(`Síntoma a los ${f.t} s; ${r.texto} (${r.segundos} s después).`);
    else if (f) o.push(`Síntoma a los ${f.t} s y no abortó${registro.fatal ? ': ' + registro.fatal : ''}.`);
  } else if (escenario.falla === 'normal') o.push('Arranque normal, sin fallas preparadas.');
  if (escenario.emergencia) {   /* nivel 3 */
    o.push(`La emergencia preparada: ${EMERGENCIAS[escenario.emergencia] || escenario.emergencia} ${MOMENTOS[escenario.momento] || ''}${escenario.senales ? ', con señales previas' : ', sin aviso'}.`);
    const f = its.find(i => i.tipo === 'falla'), r = its.find(i => i.tipo === 'reaccion');
    if (f && r) o.push(`${f.texto} a los ${f.t} s; ${r.texto} (${r.segundos} s después).`); else if (f) o.push(`${f.texto} a los ${f.t} s y no hubo reacción${registro.fatal ? ': ' + registro.fatal : ''}.`); else o.push('La emergencia no llegó a presentarse.');
  }
  const tardes = its.filter(i => i.tipo === 'paso' && i.tarde); if (tardes.length) o.push(`Pasos lentos: ${tardes.map(i => `${i.texto.split(':')[0]} (${i.tardo.toFixed(0)} s)`).join(', ')}.`);
  const antic = its.filter(i => i.tipo === 'paso' && i.anticipado); if (antic.length) o.push(`Hechos antes de que correspondiera (fuera de orden): ${antic.map(i => i.texto.split(':')[0]).join(', ')}.`);
  for (const i of its.filter(i => i.tipo === 'observacion')) o.push(i.texto.charAt(0).toUpperCase() + i.texto.slice(1) + '.');
  for (const i of its.filter(i => i.tipo === 'fin-exceso')) o.push(`${i.que} fuera de límite ${i.dur} s (máximo ${i.max}).`);
  if (registro.fatal) o.push(`FATAL: ${registro.fatal}.`);
  return o;
}

export function armarResultado({ alumno, nivel, escenario, registro, resultado }) {
  const comp = nivel === 1 ? rubricaNivel1(registro, escenario, resultado) : nivel === 2 ? rubricaNivel2(registro, escenario, resultado) : nivel === 3 ? rubricaNivel3(registro, escenario, resultado) : { procedimientos: resultado.nota, reaccion: resultado.nota, control: resultado.nota, decision: resultado.nota };
  const nota = notaFinal(comp), aprobado = nota >= APROBADO && !registro.fatal && resultado.exito !== false;
  const fecha = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const base = `${alumno}|${nivel}|${escenario.semilla}|${fecha}|${nota}|${aprobado ? 'A' : 'N'}`;
  return { alumno, nivel, titulo: NOMBRES[nivel] || `Nivel ${nivel}`, semilla: escenario.semilla, escenario: describir(escenario), fecha, nota, aprobado, competencias: comp,
    fatal: registro.fatal, observaciones: observaciones(registro, escenario, resultado), lineaDeTiempo: registro.lineaDeTiempo(), codigo: codigoVerificacion(base), version: document.getElementById('version-vista')?.textContent || '' };
}

function guardar(res) {
  try { const k = 'aurav_cabina_resultados'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.push({ ...res, lineaDeTiempo: undefined }); localStorage.setItem(k, JSON.stringify(l.slice(-50))); } catch (e) { /* sin almacenamiento */ }
}
function descargarJSON(res) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(res, null, 1)], { type: 'application/json' })); a.download = `cabina-nivel${res.nivel}-${res.semilla}-${res.codigo}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* la pantalla (PC): se arma sobre #debrief del index; botones: constancia, JSON, repetir la misma semilla, otra situación, menú */
export function mostrarDebrief(res, acciones) {
  guardar(res);
  const d = document.getElementById('debrief'); d.hidden = false;
  const barra = (k, v) => `<div class="comp"><span>${k}</span><div class="barra"><div style="width:${v}%;background:${v >= 70 ? '#2e7d32' : v >= 50 ? '#e0a020' : '#c0392b'}"></div></div><b>${v}</b></div>`;
  const nombres = NOMBRES_COMP[res.nivel] || NOMBRES_COMP[1];
  d.innerHTML = `<div class="caja">
    <h2>${res.titulo} · <span class="${res.aprobado ? 'ok' : 'no'}">${res.aprobado ? 'APROBADO' : 'NO APROBADO'}</span> · ${res.nota} / 100</h2>
    <p class="chico">${res.alumno} · ${res.fecha} · semilla ${res.semilla} · código ${res.codigo}<br>${res.escenario}</p>
    <div class="comps">${Object.keys(nombres).map(k => barra(nombres[k], res.competencias[k])).join('')}</div>
    <h3>Observaciones</h3><ul>${res.observaciones.map(o => `<li>${o}</li>`).join('') || '<li>Sin observaciones.</li>'}</ul>
    <h3>Línea de tiempo</h3><ol class="tiempo">${res.lineaDeTiempo.map(l => `<li class="${l.malo ? 'malo' : ''}"><span>${l.hora}</span> ${l.texto}</li>`).join('')}</ol>
    <div class="botones"><button id="db-const">Descargar constancia</button><button id="db-json">Descargar resultado</button><button id="db-rep">Repetir (misma semilla)</button><button id="db-otra">Otra situación</button><button id="db-menu" class="gris">Menú</button></div>
  </div>`;
  const constancia = new Constancia();
  d.querySelector('#db-const').onclick = () => { constancia.dibujar(res); constancia.descargar(`constancia-cabina-nivel${res.nivel}-${res.codigo}.png`); };
  d.querySelector('#db-json').onclick = () => descargarJSON(res);
  d.querySelector('#db-rep').onclick = () => acciones.repetir();
  d.querySelector('#db-otra').onclick = () => acciones.otra();
  d.querySelector('#db-menu').onclick = () => acciones.menu();
}
export function ocultarDebrief() { const d = document.getElementById('debrief'); if (d) d.hidden = true; }
