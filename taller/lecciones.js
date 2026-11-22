// El CONTENIDO de las lecciones del curso de familiarización con el AT-802 (T13 y T14, 21/11/2026; PLAN_TALLER.md §16). Va aparte
// del código para que lo corrija y lo valide quien corresponda (Iván, AAXOD) sin tocar nada más.
// [AGREGADO] Sale de conocimiento general y de las notas del manual de entrenamiento (herramientas/mapa_cabina.md). Todo es
// [VERIFICAR]: no reemplaza el manual del fabricante, el procedimiento de la empresa ni la instrucción. No trae límites ni
// procedimientos: sólo qué es cada cosa y cómo se mueve.
//
// Cada lección (la clave es la de la pieza):
//  - «mando»: con qué se maneja de verdad, en la cabina (un renglón).
//  - «inicial»: el estado con que se abre (la pieza abre FUNCIONANDO).
//  - «estados»: lo que la pieza hace. Cada uno: «id», «texto» (lo que se lee), «boton» (si lleva botón en el panel; sin él, el
//    estado sólo es una marca de una palanca) y sus CAMPOS, que dicen cómo queda la pieza:
//      · un canal de partes móviles de la pieza, en grados desde como está el modelo («paso» en la hélice; «flap», «aleron»,
//        «profundidad», «direccion»);
//      · «giro» = a qué velocidad gira la pieza (rad/s) · «flujo» = hacia dónde y qué tan rápido va el aire (con signo; 0 = nada);
//      · «alabeo», «cabeceo», «guinada» = cuánto se inclina la pieza entera, en grados (lo que le pasa al avión; + = ala derecha
//        abajo, nariz arriba, nariz a la derecha).
//    «partes: true» = en ese estado se ven los nombres de las partes. «palancas: {id: u}» = dónde queda una palanca en un estado
//    que no es de ella (en reversa la palanca HÉLICE sigue adelante: la reversa se pone con la de potencia).
//  - «palancas»: los mandos continuos (uno o dos), que se tocan o se arrastran. Cada una: «id», «rotulo», «atras» y «adelante»
//    (cómo se llaman sus extremos), «campos» (cuáles mueve) y «puntos» = [[u, estado, rótulo corto]…]: en qué lugar de su
//    recorrido (0 a 1) queda cada estado; entre uno y otro, sus campos cambian de a poco. «traba»: de ahí para atrás vale el
//    primer punto, sin pasos intermedios (la traba de bandera). «marcas»: [[u, rótulo]…], rayitas de más, sólo para leer.
//  - «partes»: los nombres, con el punto de la pieza que señalan (en el marco de la pieza). «repite: n» = hay n iguales alrededor
//    del eje x (se señala la que apunta hacia arriba).
//  - «preguntas»: la primera respuesta es la correcta (al mostrarlas se mezclan). «muestra»: el estado al que va la pieza cuando
//    el alumno responde, para que vea la respuesta.
export const LECCIONES = {
  // HÉLICE. Marco: el del nodo «helice» de juegos/at802.glb (el eje de giro sobre x, hacia adelante; el cubo en el origen). Las
  // palas del modelo están en paso fino (medido el 21/11: 11° a tres cuartos del radio, 37° cerca de la raíz y 3° en la punta).
  // «paso» es cuántos grados gira cada pala sobre su eje desde ahí: los ángulos son ILUSTRATIVOS [VERIFICAR con el manual].
  helice: {
    mando: 'En la cabina: la palanca HÉLICE elige las vueltas; un gobernador acomoda las palas.',
    inicial: 'fino',
    // la palanca HÉLICE, como la de la cabina: adelante, paso fino y vueltas altas; hacia atrás el paso engrosa; de la traba para
    // atrás, bandera [VERIFICAR]
    palancas: [{id: 'helice', rotulo: 'PALANCA HÉLICE', atras: 'ATRÁS', adelante: 'ADELANTE', campos: ['paso', 'giro', 'flujo'], puntos: [[0, 'bandera'], [0.3, 'grueso'], [1, 'fino']], traba: 0.15}],
    estados: [
      {id: 'partes', boton: 'PARTES', paso: 0, giro: 0, flujo: 0, partes: true, texto: 'Cinco palas y un cubo. Cada pala puede girar sobre su propio eje: a ese ángulo se le dice «paso».'},
      {id: 'fino', boton: 'PASO FINO', paso: 0, giro: 2.4, flujo: -1.1, texto: 'Palas casi de plano: cada vuelta muerde poco aire y el motor gira rápido. Vueltas altas, para despegar y aterrizar.'},
      {id: 'grueso', boton: 'PASO GRUESO', paso: 19, giro: 1.5, flujo: -1.4, texto: 'Cada vuelta muerde más aire y la hélice gira más despacio. Vueltas más bajas, para el crucero.'},
      {id: 'bandera', boton: 'BANDERA', paso: 74, giro: 0, flujo: 0, texto: 'De canto al viento: no empuja y casi no frena. Es la palanca HÉLICE atrás del todo; así queda con el motor parado.'},
      {id: 'reversa', boton: 'REVERSA', paso: -21, giro: 2.0, flujo: 0.9, palancas: {helice: 1}, texto: 'Paso negativo: tira el aire hacia adelante y frena el avión en tierra. Se pone llevando la palanca de potencia atrás del ralentí (luz BETA).'},
    ],
    // medido en el modelo (21/11): el cono llega a x 0,407; las palas salen del cono a 0,24 m del eje y llegan a 1,54 m; el eje de
    // cada pala pasa por x 0,005
    partes: [
      {nombre: 'Cono', sub: 'cubre el cubo', punto: [0.4, 0, 0]},
      {nombre: 'Pala', sub: 'gira sobre su eje', punto: [0.005, 0.95, 0], repite: 5},
      {nombre: 'Raíz de la pala', sub: 'entra en el cubo', punto: [0.005, 0.27, 0], repite: 5},
    ],
    preguntas: [
      {q: '¿Qué cambia cuando cambia el «paso» de la hélice?', a: ['El ángulo de las palas', 'El largo de las palas', 'La cantidad de palas'], muestra: 'grueso'},
      {q: 'Con el motor parado, ¿cómo quedan las palas para frenar lo menos posible?', a: ['En bandera, de canto al viento', 'En paso fino, de plano', 'En reversa'], muestra: 'bandera'},
      {q: '¿Para qué sirve la reversa?', a: ['Para frenar el avión en tierra', 'Para subir más rápido', 'Para arrancar el motor'], muestra: 'reversa'},
    ],
  },

  // ALA Y FLAPS (T14). Marco: el del avión (+x nariz, +y arriba, +z derecha, metros). Las dos alas, vistas desde atrás. Medido en
  // el modelo: cada flap va de 1,08 a 5,01 m del eje del avión y cada alerón de 5,03 a 8,06 m; las bisagras salen de los herrajes
  // que cuelgan del ala. Recorrido de los flaps: de 0° a 30°, con marcas cada 10° (notas del manual) [VERIFICAR]; el de los alerones
  // (18°) y lo que se inclina la pieza son ILUSTRATIVOS.
  ala: {
    mando: 'En la cabina: la llave FLAPS baja los flaps; el bastón, a los costados, mueve los alerones.',
    inicial: 'limpio',
    palancas: [
      {id: 'flaps', rotulo: 'FLAPS', atras: 'ARRIBA', adelante: 'ABAJO', campos: ['flap', 'flujo'], puntos: [[0, 'limpio', '0°'], [1, 'flaps', '30°']], marcas: [[1 / 3, '10°'], [2 / 3, '20°']]},
      {id: 'baston', rotulo: 'BASTÓN', atras: 'IZQUIERDA', adelante: 'DERECHA', campos: ['aleron', 'alabeo'], puntos: [[0, 'izq', 'IZQ.'], [0.5, 'centro', 'CENTRO'], [1, 'der', 'DER.']]},
    ],
    estados: [
      {id: 'partes', boton: 'PARTES', flap: 0, aleron: 0, alabeo: 0, flujo: 0, partes: true, texto: 'En el borde de atrás del ala hay dos superficies que se mueven: los flaps, del lado del fuselaje, y los alerones, hacia la punta.'},
      {id: 'limpio', boton: 'FLAPS ARRIBA', flap: 0, aleron: 0, alabeo: 0, flujo: -1.5, texto: 'Flaps arriba: el ala «limpia», con la menor resistencia. Así se vuela en crucero.'},
      {id: 'flaps', boton: 'FLAPS ABAJO', flap: 30, aleron: 0, alabeo: 0, flujo: -0.8, texto: 'Flaps abajo: el ala sostiene más a baja velocidad y también frena más. Los dos bajan juntos, para despegar y aterrizar más despacio.'},
      {id: 'izq', boton: 'BASTÓN IZQ.', flap: 0, aleron: -18, alabeo: -14, flujo: -1.5, texto: 'Bastón a la izquierda: sube el alerón izquierdo y baja el derecho. El ala izquierda baja y el avión se inclina a la izquierda.'},
      {id: 'der', boton: 'BASTÓN DER.', flap: 0, aleron: 18, alabeo: 14, flujo: -1.5, texto: 'Bastón a la derecha: sube el alerón derecho y baja el izquierdo. El ala derecha baja y el avión se inclina a la derecha.'},
      {id: 'centro', aleron: 0, alabeo: 0, texto: 'Bastón al centro: los dos alerones alineados con el ala, y el avión nivelado.'},
    ],
    partes: [
      {nombre: 'Alerón', sub: 'inclina el avión', punto: [-2.2, 1.7, 6.5]},
      {nombre: 'Flap', sub: 'para volar más despacio', punto: [-2.2, 1.47, 3.0]},
      {nombre: 'Borde de ataque', sub: 'por donde llega el aire', punto: [-0.38, 1.9, 6.6]},
    ],
    preguntas: [
      {q: '¿Para qué se bajan los flaps?', a: ['Para volar más despacio al despegar y al aterrizar', 'Para volar más rápido en crucero', 'Para inclinar el avión'], muestra: 'flaps'},
      {q: 'Con el bastón a la derecha, ¿qué hacen los alerones?', a: ['Sube el derecho y baja el izquierdo', 'Suben los dos', 'Bajan los dos'], muestra: 'der'},
      {q: '¿Cuáles se mueven siempre juntos, para el mismo lado?', a: ['Los flaps', 'Los alerones', 'Ninguno de los dos'], muestra: 'flaps'},
    ],
  },

  // COLA (T14). Marco: el del avión. Medido en el modelo: los timones de profundidad giran sobre x −6,92 · y 1,53 (el borde de
  // atrás del estabilizador), con su cuerno de compensación en la punta; el timón de dirección va de abajo del fuselaje (0,9 m)
  // a la punta de la deriva (3,4 m), detrás del codaste (x −6,94). Los recorridos son ILUSTRATIVOS [VERIFICAR].
  cola: {
    mando: 'En la cabina: el bastón, adelante y atrás, mueve el timón de profundidad; los pedales, el de dirección.',
    inicial: 'centro',
    palancas: [
      {id: 'baston', rotulo: 'BASTÓN', atras: 'ATRÁS', adelante: 'ADELANTE', campos: ['profundidad', 'cabeceo'], puntos: [[0, 'atras', 'ATRÁS'], [0.5, 'centro', 'CENTRO'], [1, 'adelante', 'ADEL.']]},
      {id: 'pedales', rotulo: 'PEDALES', atras: 'IZQUIERDO', adelante: 'DERECHO', campos: ['direccion', 'guinada'], puntos: [[0, 'pedalIzq', 'IZQ.'], [0.5, 'centro', 'CENTRO'], [1, 'pedalDer', 'DER.']]},
    ],
    estados: [
      {id: 'partes', boton: 'PARTES', profundidad: 0, direccion: 0, cabeceo: 0, guinada: 0, flujo: 0, partes: true, texto: 'La cola lleva dos planos fijos, la deriva y el estabilizador, y detrás de cada uno, un timón que se mueve.'},
      {id: 'atras', boton: 'BASTÓN ATRÁS', profundidad: 22, direccion: 0, cabeceo: 10, guinada: 0, flujo: -1.5, texto: 'Bastón atrás: el timón de profundidad sube; el aire empuja la cola hacia abajo y la nariz sube.'},
      {id: 'adelante', boton: 'BASTÓN ADEL.', profundidad: -18, direccion: 0, cabeceo: -9, guinada: 0, flujo: -1.5, texto: 'Bastón adelante: el timón de profundidad baja; la cola sube y la nariz baja.'},
      {id: 'pedalIzq', boton: 'PEDAL IZQ.', profundidad: 0, direccion: -22, cabeceo: 0, guinada: -12, flujo: -1.5, texto: 'Pedal izquierdo: el timón de dirección va a la izquierda; la cola se corre a la derecha y la nariz gira a la izquierda.'},
      {id: 'pedalDer', boton: 'PEDAL DER.', profundidad: 0, direccion: 22, cabeceo: 0, guinada: 12, flujo: -1.5, texto: 'Pedal derecho: el timón de dirección va a la derecha; la cola se corre a la izquierda y la nariz gira a la derecha.'},
      {id: 'centro', profundidad: 0, direccion: 0, cabeceo: 0, guinada: 0, flujo: -1.5, texto: 'Mandos al centro: los timones alineados con sus planos fijos y el avión sigue derecho. Mové el bastón o los pedales.'},
    ],
    partes: [
      {nombre: 'Deriva', sub: 'plano vertical fijo', punto: [-6.62, 2.95, 0]},
      {nombre: 'Timón de dirección', sub: 'gira la nariz a los costados', punto: [-7.4, 2.85, 0]},
      {nombre: 'Estabilizador', sub: 'plano horizontal fijo', punto: [-6.6, 1.62, 1.6]},
      {nombre: 'Timón de profundidad', sub: 'sube o baja la nariz', punto: [-7.2, 1.5, 1.6]},
      {nombre: 'Rueda de cola', sub: 'el apoyo de atrás en tierra', punto: [-7.03, 0.22, 0]},
    ],
    preguntas: [
      {q: 'Con el bastón atrás, ¿qué hace la nariz del avión?', a: ['Sube', 'Baja', 'Gira a un costado'], muestra: 'atras'},
      {q: '¿Con qué se mueve el timón de dirección?', a: ['Con los pedales', 'Con el bastón', 'Con la llave de flaps'], muestra: 'pedalDer'},
      {q: 'Con el pedal izquierdo, ¿hacia dónde gira la nariz?', a: ['A la izquierda', 'A la derecha', 'Hacia arriba'], muestra: 'pedalIzq'},
    ],
  },
};
