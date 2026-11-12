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
  if (nivel >= 2) { e.foco = { rumbo: 30 + Math.floor(r() * 300), km: +(3 + r() * 5).toFixed(1) }; e.carga = 2000 + Math.round(r() * 11) * 100; e.cobertura = 1 + Math.floor(r() * 4); }
  if (nivel === 3) { e.emergencia = elegir(['falla', 'fuego', 'fallaDespegue', 'generador', 'compuerta']); e.momento = elegir(['despegue', 'ida', 'descarga', 'vuelta']); e.senales = r() < 0.5; }
  return e;
}

/* texto para el instructor (la constancia y el debrief): qué tenía preparada la partida */
export function describir(e) {
  if (!e) return '';
  const partes = [`semilla ${e.semilla}`];
  if (e.nivel === 1) partes.push(FALLAS_ARRANQUE[e.falla] || e.falla);
  if (e.foco) partes.push(`foco a ${e.foco.km} km rumbo ${String(e.foco.rumbo).padStart(3, '0')}°, carga ${e.carga} kg, cobertura ${e.cobertura}, viento ${String(e.viento.dir).padStart(3, '0')}°/${e.viento.kt} kt`);
  if (e.emergencia) partes.push(`emergencia: ${e.emergencia} en ${e.momento}${e.senales ? ' con señales previas' : ''}`);
  return partes.join(' · ');
}
