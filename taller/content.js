// El contenido educativo, tal como lo pidió Iván. [AGREGADO] Sale de conocimiento general; no reemplaza el manual del
// fabricante, el procedimiento de la empresa ni la instrucción. Cifras ilustrativas [VERIFICAR].
export const LEGEND = 'Material de referencia para entender el funcionamiento. No reemplaza el manual del fabricante, el procedimiento de la empresa ni la instrucción.';

export const STATIONS = [
  {n: 1, name: 'Admisión', text: 'Mirá por dónde entra el aire: por atrás. Este motor trabaja al revés de lo que uno espera.',
    calls: [['intake', 'Toma de aire', 'ABAJO, ADELANTE'], ['screen', 'Malla de protección', 'FRENA OBJETOS'], ['plenum', 'Pleno de admisión', 'GIRO DE 180°']]},
  {n: 2, name: 'Compresor', text: 'Cada etapa aprieta un poco más el aire. Más aire comprimido es más potencia disponible.',
    calls: [['axial', 'Etapas axiales', '3 ETAPAS'], ['impeller', 'Etapa centrífuga', '1 ETAPA'], ['diffuser', 'Difusor', 'BAJA VELOCIDAD, SUBE PRESIÓN']]},
  {n: 3, name: 'Cámara de combustión', text: 'Acá se mezcla combustible con aire y se enciende. Los ignitores solo se usan para arrancar.',
    calls: [['liner', 'Cámara anular', 'FLUJO INVERSO'], ['nozzle', 'Inyectores', 'COMBUSTIBLE PULVERIZADO'], ['igniter', 'Ignitores (2)', 'SOLO EN EL ARRANQUE']]},
  {n: 4, name: 'Turbina del compresor', text: 'Esta turbina devuelve energía al compresor. Juntos forman el generador de gas.',
    calls: [['ct', 'Turbina del compresor', 'GIRA A Ng'], ['ggShaft', 'Eje del generador de gas', 'TURBINA + COMPRESOR']]},
  {n: 5, name: 'Turbina libre', text: 'Ojo con esto: la turbina de la hélice no está unida al compresor. Las une solo el gas.',
    calls: [['pt', 'Turbina libre', '2 ETAPAS · GIRA A Np'], ['gap', 'Sin unión mecánica', 'LAS UNE SOLO EL GAS'], ['ptShaft', 'Eje hacia la hélice', 'VA ADELANTE']]},
  {n: 6, name: 'Caja reductora', text: 'La turbina gira muy rápido. La caja reductora baja esas vueltas a las que la hélice puede usar.',
    calls: [['sun', 'Engranaje solar', 'LO MUEVE LA TURBINA'], ['planet', 'Satélites', 'GIRAN Y ORBITAN'], ['ringGear', 'Corona fija', 'RELACIÓN ILUSTRATIVA']]},
  {n: 7, name: 'Escape', text: 'Los gases salen adelante, por los costados. Por eso el escape está cerca de la hélice.',
    calls: [['stack', 'Salida de escape', 'UNA POR LADO'], ['exhDuct', 'Ducto de escape', 'DESPUÉS DE LA TURBINA LIBRE']]},
  {n: 8, name: 'Tres palancas', text: 'Tres palancas, tres trabajos: cuánta potencia, si hay combustible y a qué vueltas gira la hélice.',
    calls: [['fcu', 'Control de combustible', 'POTENCIA Y CONDICIÓN'], ['governor', 'Gobernador de hélice', 'PALANCA DE HÉLICE']]},
];

// la correcta es la primera de cada lista; en pantalla se muestran en un orden fijo mezclado (ORDER)
export const QUIZ = [
  {q: '¿Qué mueve la hélice?', a: ['La turbina libre', 'La turbina del compresor', 'Un eje directo desde el compresor']},
  {q: '¿Por dónde entra el aire?', a: ['Por atrás del motor', 'Por adelante, junto a la hélice', 'Por abajo']},
  {q: '¿Para qué están los ignitores?', a: ['Encender en el arranque', 'Mantener la llama siempre', 'Medir temperatura']},
  {q: 'Si la ITT sube muy rápido en el arranque…', a: ['Arranque caliente: cortar combustible', 'Es normal, esperar', 'Subir potencia']},
  {q: '¿Qué hace la caja reductora?', a: ['Baja las vueltas para la hélice', 'Comprime el aire', 'Mezcla combustible']},
  {q: '¿Qué controla la palanca de condición?', a: ['El paso de combustible (corte)', 'Las RPM de la hélice', 'El torque directamente']},
];
// display order per question (index into a): the correct answer is not always first on screen
export const ORDER = [[1, 0, 2], [0, 2, 1], [2, 1, 0], [1, 2, 0], [0, 1, 2], [2, 0, 1]];
