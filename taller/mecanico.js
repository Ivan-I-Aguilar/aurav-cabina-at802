// Contenido del MODO MECÁNICO (PLAN_TALLER.md §7; T8 reserva y T9, adelantados dentro del bloque de la T1, 15/11/2026).
// BORRADOR con conocimiento general de turbohélices de la familia del PT6: TODO es [AGREGADO] y [VERIFICAR]. Lo corrige o lo
// escribe quien valide en AAXOD (decisión 3b, todavía sin nombre) y el modo mecánico NO se publica hasta tener esa validación.
// Nada de esto reemplaza el manual de mantenimiento del fabricante, el procedimiento de la empresa ni la instrucción: los límites,
// los valores y los procedimientos quedan siempre para el manual (columna «manual»). La misma tabla, para corregirla a mano, está en
// taller/INSPECCION_BORRADOR.md: si se corrige una, se corrige la otra.

export const AVISO_MECANICO = 'BORRADOR [AGREGADO · VERIFICAR] · Falta la validación de AAXOD · No reemplaza el manual del fabricante ni el procedimiento de la empresa.';

/** por pieza (las claves de piezas.glb y de LUGAR_PIEZA en agregados.js): dónde está, qué se mira, qué se busca y qué es del manual */
export const INSPECCION = {
  ignitor: {
    nombre: 'Ignitor',
    donde: 'En la cámara de combustión: son dos, a los costados, de 4 y 8 en punto mirando desde atrás [VERIFICAR].',
    mira: ['La punta de encendido (electrodos y aislante cerámico)', 'La rosca y el asiento', 'El conector y el cable'],
    busca: ['Desgaste o erosión de los electrodos', 'Fisuras, astillas o carbón en el aislante', 'Rosca dañada, conector flojo o con corrosión'],
    manual: 'Los límites de desgaste, el intervalo de inspección y la prueba de chispa.',
  },
  inyector: {
    nombre: 'Inyector de combustible',
    donde: 'Alrededor de la cámara de combustión, en el colector de combustible (catorce en este motor del simulador).',
    mira: ['La punta y el orificio de salida', 'La vaina o protección térmica', 'Las conexiones de entrada y sus sellos'],
    busca: ['Carbón acumulado en la punta (coquización)', 'Punta erosionada o dañada; fisuras en la vaina', 'Pérdidas de combustible en las conexiones'],
    manual: 'La prueba de caudal y del cono de pulverización en banco, la limpieza y los límites.',
  },
  alabe: {
    nombre: 'Álabe de la turbina del compresor',
    donde: 'En el disco de la turbina del compresor, entre la cámara de combustión y la turbina libre.',
    mira: ['El borde de ataque y el de fuga', 'La punta', 'La raíz y la plataforma'],
    busca: ['Mellas, erosión o fisuras (sobre todo en el borde de fuga y en la raíz)', 'Quemaduras, corrosión en caliente o pérdida del recubrimiento', 'Punta rozada o doblada'],
    manual: 'La inspección con boroscopio en el motor, los límites de daño admisible y qué hacer con cada hallazgo.',
  },
  malla: {
    nombre: 'Sector de la malla de admisión',
    donde: 'Alrededor de la entrada de aire, atrás del motor (la admisión es por atrás: el flujo va al revés).',
    mira: ['Toda la superficie de la malla', 'El marco y su fijación'],
    busca: ['Objetos extraños atrapados o restos (pájaros, hielo, suciedad)', 'Alambres cortados, agujeros o deformaciones', 'Fijaciones flojas o faltantes'],
    manual: 'El daño admisible de la malla, la limpieza y cuándo se cambia.',
  },
  detector: {
    nombre: 'Detector de virutas',
    donde: 'Abajo en la caja reductora (puede haber otro en la caja de accesorios) [VERIFICAR].',
    mira: ['La punta magnética', 'El sello y la traba', 'El circuito de indicación'],
    busca: ['Partículas metálicas en la punta: cuántas y de qué tipo (polvo fino, escamas, virutas)', 'Sello dañado o pérdida de aceite', 'Indicación falsa o falta de continuidad'],
    manual: 'Qué hacer según el tipo y la cantidad de partículas (análisis, seguimiento o desmontaje) y la prueba del circuito.',
  },
  termocupla: {
    nombre: 'Termocupla de ITT',
    donde: 'En un anillo entre la turbina del compresor y la turbina libre: las sondas atraviesan la carcasa y un arnés las junta.',
    mira: ['La punta de cada sonda', 'La bornera y sus bornes', 'El arnés y su aislación'],
    busca: ['Sondas quemadas, dobladas o con la vaina fisurada', 'Bornes flojos o con corrosión', 'Arnés rozado o con la aislación dañada'],
    manual: 'La prueba eléctrica del arnés (resistencia y aislación), la calibración y los valores.',
  },
};

/** las tareas del modo mecánico, módulo 1 (decisión 3a): identificar, ubicar e inspeccionar */
export const TAREAS = [
  {tipo: 'identificar', texto: 'Señalá con el rayo el ignitor en el holograma.', pieza: 'ignitor'},
  {tipo: 'identificar', texto: 'Señalá la malla de admisión.', pieza: 'malla'},
  {tipo: 'identificar', texto: 'Señalá el detector de virutas.', pieza: 'detector'},
  {tipo: 'identificar', texto: 'Señalá las termocuplas de ITT.', pieza: 'termocupla'},
  {tipo: 'ubicar', texto: 'Llevá cada pieza del banco a su lugar en el holograma.', piezas: ['ignitor', 'inyector', 'alabe', 'malla', 'detector', 'termocupla']},
  {tipo: 'inspeccionar', texto: 'Tomá cada pieza y mirá lo que dice la tabla de inspección.', piezas: ['ignitor', 'inyector', 'alabe', 'malla', 'detector', 'termocupla']},
];
