// El CONTENIDO de las lecciones del curso de familiarización con el AT-802 (T13, 21/11/2026; PLAN_TALLER.md §16). Va aparte del
// código para que lo corrija y lo valide quien corresponda (Iván, AAXOD) sin tocar nada más.
// [AGREGADO] Sale de conocimiento general y de las notas del manual de entrenamiento (herramientas/mapa_cabina.md). Todo es
// [VERIFICAR]: no reemplaza el manual del fabricante, el procedimiento de la empresa ni la instrucción. No trae límites ni
// procedimientos: sólo qué es cada cosa y cómo se mueve.
//
// Cada lección: «mando» (con qué se maneja de verdad, en la cabina), «inicial» (el estado con que se abre), «estados» (un botón por
// cada cosa que hace: el texto que se lee; «paso» = a qué posición van las partes móviles, en grados desde como está el modelo;
// «giro» = a qué velocidad gira la pieza, rad/s; «flujo» = hacia dónde y qué tan rápido va el flujo, con signo, 0 = sin flujo;
// «partes: true» = en ese estado se ven los nombres de las partes), «partes» (los nombres, con el punto de la pieza que señalan,
// en el marco de la pieza) y «preguntas» (la primera respuesta es la correcta; al mostrarlas se mezclan).
//
// HÉLICE. Marco: el del nodo «helice» de juegos/at802.glb (el eje de giro sobre x, hacia adelante; el cubo en el origen). Las palas
// del modelo están en paso fino (medido el 21/11: 11° a tres cuartos del radio, 37° cerca de la raíz y 3° en la punta). «paso» es
// cuántos grados gira cada pala sobre su eje desde ahí: los ángulos son ILUSTRATIVOS [VERIFICAR con el manual de la hélice].
export const LECCIONES = {
  helice: {
    mando: 'En la cabina, la palanca HÉLICE elige las vueltas y un gobernador acomoda las palas solo para mantenerlas.',
    inicial: 'fino',
    estados: [
      {id: 'partes', boton: 'PARTES', paso: 0, giro: 0, flujo: 0, partes: true, texto: 'Cinco palas y un cubo. Cada pala puede girar sobre su propio eje: a ese ángulo se le dice «paso».'},
      {id: 'fino', boton: 'PASO FINO', paso: 0, giro: 2.4, flujo: -1.1, texto: 'Palas casi de plano: cada vuelta muerde poco aire y el motor gira rápido. Vueltas altas, para despegar y aterrizar.'},
      {id: 'grueso', boton: 'PASO GRUESO', paso: 19, giro: 1.5, flujo: -1.4, texto: 'Cada vuelta muerde más aire: la hélice gira más despacio haciendo la misma fuerza. Es la posición de crucero.'},
      {id: 'bandera', boton: 'BANDERA', paso: 74, giro: 0, flujo: 0, texto: 'De canto al viento: ni empuja ni frena. Es la palanca HÉLICE atrás del todo, y así queda con el motor parado.'},
      {id: 'reversa', boton: 'REVERSA', paso: -21, giro: 2.0, flujo: 0.9, texto: 'Paso negativo: tira el aire hacia adelante y frena el avión en tierra. Se pone con la palanca de potencia y enciende la luz BETA.'},
    ],
    // medido en el modelo (21/11): el cono llega a x 0,407; las palas salen del cono a 0,24 m del eje y llegan a 1,54 m; el eje de
    // cada pala pasa por x 0,005. «repite: 5» = hay cinco iguales alrededor del eje (se señala la que queda del lado de los rótulos)
    partes: [
      {nombre: 'Cono', sub: 'cubre el cubo', punto: [0.4, 0, 0]},
      {nombre: 'Pala', sub: 'gira sobre su eje', punto: [0.005, 0.95, 0], repite: 5},
      {nombre: 'Raíz de la pala', sub: 'entra en el cubo', punto: [0.005, 0.27, 0], repite: 5},
    ],
    // «muestra»: el estado al que va la pieza cuando el alumno responde, para que vea la respuesta
    preguntas: [
      {q: '¿Qué cambia cuando cambia el «paso» de la hélice?', a: ['El ángulo de las palas', 'El largo de las palas', 'La cantidad de palas'], muestra: 'grueso'},
      {q: 'Con el motor parado, ¿cómo quedan las palas para frenar lo menos posible?', a: ['En bandera, de canto al viento', 'En paso fino, de plano', 'En reversa'], muestra: 'bandera'},
      {q: '¿Para qué sirve la reversa?', a: ['Para frenar el avión en tierra', 'Para subir más rápido', 'Para arrancar el motor'], muestra: 'reversa'},
    ],
  },
};
