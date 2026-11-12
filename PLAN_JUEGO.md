# Plan del juego: «Cabina AT-802», tres niveles independientes (11/11/2026)

Pedido de Iván (11/11): darle «una vuelta de rosca» al juego. Hoy es un checklist guiado donde el alumno elige la situación. Se
quiere **desafío y resolución** (que no sepa qué va a pasar), **una devolución para el instructor** sobre lo que hizo, y que el
alumno sienta en VR el potencial de la práctica. Decidido: **tres juegos distintos, uno por nivel** («Cabina nivel 1 / 2 / 3»),
cada uno como actividad independiente del aula virtual de AURAV (dominio propio, ni Moodle ni Classroom): se juega, termina y
entrega su resultado. El cruce de datos con el aula se hace cuando exista; el juego ya deja el resultado listo para eso.

Estado: **aprobado por Iván el 11/11** («Aprobado, arrancá»). **J0 y J1 HECHAS el 12/11 (v=20261112a, sin publicar)**: ver §7.

## 1. Los tres niveles

| Nivel | Qué hace el alumno | Lo que cambia cada vez (azar) | Aprueba si |
|---|---|---|---|
| **1 · Puesta en marcha** | En tierra, con el tutor callado (sólo la tablilla con el checklist de AAXOD a mano). Arranca el motor hasta estabilizarlo y queda listo para rodar. | Una de cuatro: arranque **normal** · **hot start** (ITT sube rápido hacia 1000 °C al poner condición) · **hung start** (Ng se clava en 20–25 % y la ITT sube despacio) · **batería baja** (Ng no pasa de 10 %: hay que abortar). Y pequeñas variaciones: ITT inicial, viento. | Secuencia del checklist completa y en orden; en las fallas, **cortó a tiempo** (condición a corte y starter OFF antes del límite); sin exceder ITT ni tiempo de starter. |
| **2 · Misión de incendio** | Orden de vuelo por radio: foco a tal rumbo y distancia, viento. Despega cargado, navega con el Garmin de rumbo, larga sobre el foco (altura, velocidad y cobertura), vuelve y aterriza. Sin emergencias. | Posición del foco (rumbo 30°–330°, 3–8 km), viento (dirección e intensidad), carga (2000–3100 kg), nivel de cobertura pedido, hora (luz). | Despegue dentro de parámetros (rotación, eje de pista), llegó al foco, **descarga dentro de la ventana** (100–200 ft AGL, 110–130 mph, cobertura pedida, sobre el foco), regreso y aterrizaje sin golpe ni pérdida. |
| **3 · Salida con emergencia** | La misión del nivel 2, pero en algún momento el juego inyecta **una emergencia que el alumno no conoce**. | Cuál (falla de motor · fuego · falla en el despegue · generador · compuerta trabada · hot start en el arranque previo) y **cuándo** (en el rodaje, el despegue, la ida, la descarga o la vuelta); con o sin señales previas (ITT alta antes de la falla, CAUTION antes del fuego) según la dificultad. | Lo del nivel 2 hasta la emergencia, más el procedimiento de la emergencia completo y en orden, con tiempos, y una resolución segura (rearranque, forzoso o vuelta a la pista según el caso). |

Progresión: el nivel 2 se habilita con el 1 aprobado y el 3 con el 2; el instructor puede abrir cualquiera (parámetro en el link).

## 2. Lo común a los tres: semilla, registro, devolución, constancia

- **Semilla.** Cada partida nace de una semilla (número de 6 cifras, en el link o al azar). De ella salen TODAS las variables del
  nivel (qué falla, cuándo, el viento, el foco). El instructor puede **repetir exactamente la misma situación** con otro alumno
  (`…/?nivel=3&semilla=482913`) y comparar devoluciones. La semilla se imprime en la constancia.
- **Registrador.** Durante la partida se anota todo con tiempo: cada control tocado (qué, a qué valor), cada paso del checklist
  (hecho / omitido / fuera de orden, y cuánto tardó desde que correspondía), cada evento del vuelo (rotación, contacto, pérdida,
  Vne, ITT/torque excedidos, fuego, largado) y cada mensaje del tutor o la radio. Es la materia prima de la devolución.
- **Devolución (debrief).** Al terminar el nivel, el juego se interrumpe y muestra:
  1. Resultado: **aprobado / no aprobado** y nota 0–100.
  2. **Nota por competencia** (cuatro barras): procedimientos (checklist completo y en orden) · reacción (tiempos ante la falla) ·
     control del avión (velocidades, actitud, eje, toque) · decisión (abortó / largó / no intentó volver / eligió campo).
  3. **Línea de tiempo** de la partida: lo que pasó y lo que hizo, con los tiempos, y marcadas en rojo las omisiones y excesos.
  4. **Observaciones del instructor** en texto, generadas de la línea de tiempo («cortó la condición 14 s después del hot start,
     la ITT llegó a 1040 °C», «largó a 320 ft, alto para la cobertura 3»).
  En VR se ve en el panel flotante; en PC, en una página de resultado. Se puede **descargar** (JSON + imagen) y **repetir**.
- **Constancia.** La de los otros juegos de AURAV (`constancia.js` de aurav-senales, clase `Constancia`: dibuja el certificado en un
  canvas con el logo de AAXOD, cartel 3D en VR y PNG para descargar en PC, con nombre, etapas con nota y detalle, y fecha). Se copia
  con los textos de este juego y se le agregan nivel, semilla y **código de verificación** (hash de todo lo anterior: el instructor lo
  puede recomputar). Hoy el alumno la descarga y la entrega; mañana el juego la manda al aula.
- **Resultado para el aula virtual (listo desde el día 1).** Un JSON con: alumno, nivel, semilla, fecha, nota, competencias,
  aprobado, código, la línea de tiempo resumida. Se guarda en el navegador (`localStorage`) y se descarga; cuando exista el aula
  (mismo dominio), se agrega un `fetch POST` a su API con ese mismo JSON: no cambia nada más.

## 3. Cómo se arma con lo que hay

- `mision.js` ya tiene las fases (arranque, despegue, crucero, falla, fuego, falla en el despegue, forzoso), el puntaje con
  penalizaciones y las observaciones (`detalle`). Se reorganiza en **tres guiones de nivel** (`niveles/nivel1.js`, `nivel2.js`,
  `nivel3.js`) que usan las mismas fases como piezas, más dos piezas nuevas: **navegación al foco** (foco en el escenario, rumbo y
  distancia por radio, ventana de descarga) y **aterrizaje de vuelta** (la pista ya existe).
- Nuevo `escenario_azar.js`: la semilla → variables del nivel (generador determinista, `mulberry32`).
- Nuevo `registro.js`: el registrador (escucha `controles.alCambiar`, los pasos de la misión y `vuelo.alEvento`).
- Nuevo `debrief.js`: la pantalla de resultado (HTML en PC, canvas en el panel VR) y el JSON; `constancia.js` copiado de
  aurav-senales con los campos de este juego.
- `vuelo.js`: **fallas de arranque** nuevas (hot start, hung start, batería baja: curvas de ITT y Ng), **generador** que cae y
  **compuerta trabada** (la carga no sale con GATE ni SALVO: hay que ciclar o usar la E-DUMP); el foco de incendio en el terreno
  (humo visible desde lejos) y el cálculo de **dónde cayó la descarga** respecto del foco.
- `index.html`: el link `?nivel=N[&semilla=S]` arranca directo en el nivel (sin menú); el menú actual queda como «práctica libre»
  para el instructor (`?nivel=libre`).
- El tutor cambia de rol: en los niveles **no dicta los pasos**; la **tablilla** muestra el checklist de AAXOD y el alumno marca
  solo (en VR, apuntando). El tutor habla sólo para la radio (orden de vuelo, torre) y para las consecuencias.
- Voces nuevas (torre, orden de vuelo, devolución): `voces.py` + `voces.ps1`, como siempre.

## 4. Etapas (y sesiones estimadas)

| Etapa | Qué | Sesiones |
|---|---|---|
| J0 | Infraestructura: semilla, registrador, debrief en PC, constancia, JSON del resultado, links `?nivel=`. Se prueba con el nivel 1 en su forma actual. | 1 |
| J1 | Nivel 1 completo: las tres fallas de arranque en `vuelo.js`, el checklist en la tablilla sin dictado, rúbrica y devolución del arranque. | 1–2 |
| J2 | Nivel 2: foco en el terreno con humo, orden de vuelo por radio, navegación, ventana de descarga y medición de dónde cayó, vuelta y aterrizaje, rúbrica. | 2 |
| J3 | Nivel 3: inyección de emergencias (tabla con momentos y probabilidades), señales previas, generador y compuerta trabada, rúbrica combinada. | 1–2 |
| J4 | Debrief en VR (panel), pulido de voces, prueba de Iván en el Quest de los tres niveles, publicar. | 1 |
| J5 (cuando exista el aula) | `POST` del JSON al aula y lectura de la semilla/alumno desde el link. | ½ |

## 7. Hecho

- **J0 + J1 (12/11/2026, v=20261112a, commit local):** `escenario_azar.js` (semilla → variables; nivel 1: normal ×2, hot, hung,
  batería baja, ITT inicial), `registro.js` (todo con el tiempo de misión: controles, pasos con «tarde» y «fuera de orden», observaciones,
  excesos de ITT/torque/velocidad, síntoma de la falla, reacción, fatal), `debrief.js` (rúbrica del nivel 1 por competencias con los pesos
  de §6, observaciones en texto, pantalla de resultado con barras, línea de tiempo con lo malo en rojo, botones constancia PNG · resultado
  JSON · repetir misma semilla · otra situación · menú; guarda en `localStorage` `aurav_cabina_resultados`), `constancia.js` (la de
  aurav-senales con los textos de este juego, semilla y código FNV-1a; `aaxod-logo.png` copiado), `index.html` (#inicio con el nombre
  del alumno y #debrief), `main.js` (`?nivel=1|2|3[&semilla=S][&alumno=N]`: pantalla de inicio en vez del menú; el link de la partida se
  reescribe con la semilla sorteada), `mision.js` (`nivel()`: sin dictado —la lista de tareas es el checklist, los hechos tachados—, sin aro
  amarillo; `cerrarFase` va al debrief; detección exacta de «fuera de orden»: el paso ya estaba cumplido al pasar a ser el actual; starter
  > 30 s), `vuelo.js` (`m.fallaArranque`: batería baja → Ng no pasa de 9 %; hung → enciende pero Ng se clava en 24 % y la ITT sube ~1000 °C
  a los 40 s; hot → la ITT sube ~35 °C/s desde el encendido, 1000 °C unos 8 s después del síntoma de 750; al cortar condición la falla se
  consume y el segundo intento es normal; `sintoma-arranque` y `arranque-abortado` como eventos). Semillas de prueba: 100001 normal,
  100000 hot, 100008 hung, 100002 batería. Probado el 12/11: normal 96 aprobado; hot abortado a tiempo aprobado; hot sin abortar → ITT 1076,
  FATAL, no aprobado; hung abortado a los 12 s → 85; batería abortada a los 6 s → 94. Los niveles 2 y 3 por ahora corren la secuencia de
  práctica completa con registro y debrief genérico (J2/J3 pendientes). VR: el debrief es sólo HTML (J4).
- Decisión tomada (sin respuesta a §5.5): el nombre lo escribe el alumno en la pantalla de inicio (queda guardado en el navegador); si el
  link trae `&alumno=`, se usa ése.
- **J2 (12/11/2026, v=20261112b, commit local): nivel 2, misión de incendio, completo en PC.** `incendio.js` (el foco: frente de llamas
  que titilan, resplandor, columna de humo que nace oscura y se aclara al subir, inclinada por el viento, parche quemado; con la descarga
  encima pasa a vapor), `escenario_azar.js` (nivel ≥ 2: foco a 2,5–4,5 km rumbo 30–330°, carga 2000–3100 kg, cobertura 1–4, viento),
  `escenario.js` (terreno hasta ±4,5 km y niebla a 6,5 km; el valle de la pista llega a 4,2 km al norte: la final a la 18 baja por el valle),
  `mision.js` (`nivel(2)`: avión en la cabecera con el motor en marcha y hélice/condición a mitad; el foco va al lugar más llano a menos de
  300 m del sorteado; `faseMisionIncendio`: la orden de vuelo por radio armada con WAV de dígitos, checklist de 13 pasos —hélice, condición,
  flaps según peso, potencia, rotación, rumbo al foco con el CRS del Garmin, llegar, descarga en ventana 100–200 ft · 110–130 mph · cobertura
  pedida, vuelta por el valle del norte y final a la 18, aproximación, aterrizar, frenar y detenerse—; `evaluarDescarga` mide dónde cayó el
  agua: impactos con el tiempo de caída desde la altura y la velocidad, distancia del foco a la línea; el foco se controla si cayó a menos de
  60 m, parcial hasta 150; toque fuerte, fuera de pista, rápido, sin flaps, salirse en la carrera; choque = fatal y cierra; después del cierre
  nada cambia el resultado), `vuelo.js` (la compuerta queda cerrada al vaciarse —`largando` null— y el accidente se decide ANTES de avisar el
  contacto: antes un choque en ruta cerraba como «aterrizaste»), `registro.js` (nombres legibles de los controles, los movimientos seguidos
  de una palanca en un renglón: la potencia llenaba la línea de tiempo), `debrief.js` (`rubricaNivel2`: «navegación y descarga» en lugar de
  reacción), `main.js` / `audio.js` (`decirVarias`: frases encadenadas; el foco en la escena; la cobertura del FRDS a la misión),
  `herramientas/piloto_prueba.js` (vuela el nivel solo desde la consola: despegue, ida, descarga, circuito por el este, final a la 18,
  aterrizaje y frenada). Probado el 12/11 con la semilla 100001 (foco a 3,5 km rumbo 134°, 2900 kg, cobertura 1, viento 214°/10 kt): el
  piloto de prueba larga 2900 kg a 136 ft y 120 mph a 0 m del foco, vuelve, aterriza a 1 m/s y 71 mph y se detiene a 50 m del final de la
  pista → APROBADO 100/100. Sus intentos fallidos sirvieron de prueba negativa: descarga a 259 ft → −20 en navegación; choque contra una
  loma a 1 km del foco → FATAL «chocó contra el terreno a 61 mph», no aprobado; rodar hasta la loma del sur después de un toque bueno →
  antes quedaba 100/100 «NO APROBADO» con dos cierres, ahora la misión cierra con el avión detenido y el accidente en la carrera es fatal.
  Referencia visual del foco: los dos videos de Iván del 11/11 (Seedance, `Desktop/WAN_referencias/`, fuera del repo).
  Queda: el humo y el frente en el Quest (rendimiento: ~46 sprites), las preguntas de §5.2 (ventana real de descarga y coberturas de AAXOD).

## 5. Qué hace falta saber (de Iván, AAXOD o el manual)

1. **Límites reales para la rúbrica:** ITT máxima de arranque (el manual dice 1000 °C; ¿cuánto tiempo?), tiempo máximo de starter,
   Ng mínimo para poner condición (12 %), criterios de abortar.
2. **La descarga:** altura y velocidad típicas de descarga de AAXOD (supongo 100–200 ft AGL y 110–130 mph), y cómo se juzga una
   buena descarga (¿sobre el foco con el viento a favor?, ¿largo de la línea?). Qué niveles de cobertura usan.
3. **Qué emergencias quieren en el nivel 3** (las cinco propuestas, ¿alguna más? ¿sacan alguna?) y si las señales previas van.
4. **Umbrales de aprobación** por nivel (propongo 70/100 y sin «fatales»: accidente, fuego incontrolado, exceder ITT límite).
5. **Datos del alumno:** si el nombre lo escribe al empezar (como en los otros juegos) o vendrá del link del aula.
6. Confirmar con **Bruno** lo del FUEGO (manija FUEL a OFF), que ya quedó pendiente de la cabina.

## 6. Decisiones que tomo si no me decís lo contrario

- Nombre de los juegos: «Cabina AT-802 · Nivel 1: puesta en marcha», «… Nivel 2: misión», «… Nivel 3: emergencia».
- Nota 0–100 con las cuatro competencias ponderadas (procedimientos 40 · reacción 25 · control 20 · decisión 15); aprobado ≥ 70 y
  sin fatales. En el nivel 2 «reacción» se reemplaza por «navegación y descarga».
- El azar es determinista por semilla; sin semilla en el link, el juego la sortea y la muestra.
- El tutor no dicta en los niveles; sí en la práctica libre.
- Primero PC; VR del debrief en J4.
