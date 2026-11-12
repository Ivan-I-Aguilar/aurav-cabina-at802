// Escenarios al azar de los niveles (PLAN_JUEGO.md §2): de una SEMILLA de 6 cifras salen todas las variables de la partida, siempre las
// mismas para la misma semilla (generador determinista mulberry32): el instructor repite la situación con otro alumno con el mismo link
// (?nivel=N&semilla=S). Nivel 1: qué le pasa al arranque. Niveles 2 y 3 (J2/J3): foco, viento, carga, cobertura, emergencia y momento.
export function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function semillaNueva() { return 100000 + Math.floor(Math.random() * 900000); }

export const FALLAS_ARRANQUE = {
  normal: 'Arranque normal',
  hot: 'Hot start: la ITT se dispara al poner condición (hay que cortar antes de 1000 °C)',
  hung: 'Hung start: Ng se clava en 22–25 % y la ITT sube despacio (hay que abortar)',
  bateria: 'Batería baja: Ng no pasa de 10 % (hay que abortar y no poner condición)',
};

export function generar(nivel, semilla) {
  const r = mulberry32(semilla); const elegir = lista => lista[Math.floor(r() * lista.length)];
  const e = { nivel, semilla, viento: { dir: Math.floor(r() * 360), kt: Math.round(r() * 15) }, hora: elegir(['mañana', 'mediodía', 'tarde']) };
  if (nivel === 1) { e.falla = elegir(['normal', 'normal', 'hot', 'hung', 'bateria']); e.ittInicial = 15 + Math.round(r() * 25); }
  if (nivel >= 2) { e.foco = { rumbo: 30 + Math.floor(r() * 300), km: +(2.5 + r() * 2).toFixed(1) }; e.carga = 2000 + Math.round(r() * 11) * 100; e.cobertura = 1 + Math.floor(r() * 4); }   /* el terreno llega a 4,5 km */
  if (nivel === 3) {   /* la emergencia sorpresa (J3): cuál, cuándo (la falla en el despegue siempre a 150 ft; la compuerta se descubre al largar) y si avisa antes */
    e.emergencia = elegir(['falla', 'fuego', 'fallaDespegue', 'generador', 'compuerta']);
    e.momento = e.emergencia === 'fallaDespegue' ? 'despegue' : e.emergencia === 'compuerta' ? 'descarga' : elegir(['ida', 'descarga', 'vuelta']);
    e.senales = r() < 0.5; e.rearranque = r() < 0.6; e.genVuelve = r() < 0.5;   /* la falla en vuelo rearranca (corte de combustible) 6 de 10; el generador vuelve con un reset 1 de 2 */
  }
  return e;
}
export const EMERGENCIAS = { falla: 'falla de motor en vuelo', fuego: 'fuego de motor', fallaDespegue: 'falla de motor a 150 ft', generador: 'falla del generador', compuerta: 'compuerta de la tolva trabada' };
export const MOMENTOS = { despegue: 'en el despegue', ida: 'en la ida al foco', descarga: 'en la pasada de descarga', vuelta: 'en la vuelta' };

/* texto para el instructor (la constancia y el debrief): qué tenía preparada la partida */
export function describir(e) {
  if (!e) return '';
  const partes = [`semilla ${e.semilla}`];
  if (e.nivel === 1) partes.push(FALLAS_ARRANQUE[e.falla] || e.falla);
  if (e.foco) partes.push(`foco a ${e.foco.km} km rumbo ${String(e.foco.rumbo).padStart(3, '0')}°, carga ${e.carga} kg, cobertura ${e.cobertura}, viento ${String(e.viento.dir).padStart(3, '0')}°/${e.viento.kt} kt`);
  if (e.emergencia) partes.push(`emergencia: ${EMERGENCIAS[e.emergencia] || e.emergencia} ${MOMENTOS[e.momento] || e.momento}${e.senales ? ', con señales previas' : ', sin aviso'}`);
  return partes.join(' · ');
}
