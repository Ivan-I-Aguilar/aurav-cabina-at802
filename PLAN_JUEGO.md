# Plan del juego: «Cabina AT-802», tres niveles independientes (11/11/2026)

Pedido de Iván (11/11): darle «una vuelta de rosca» al juego. Hoy es un checklist guiado donde el alumno elige la situación. Se
quiere **desafío y resolución** (que no sepa qué va a pasar), **una devolución para el instructor** sobre lo que hizo, y que el
alumno sienta en VR el potencial de la práctica. Decidido: **tres juegos distintos, uno por nivel** («Cabina nivel 1 / 2 / 3»),
cada uno como actividad independiente del aula virtual de AURAV (dominio propio, ni Moodle ni Classroom): se juega, termina y
entrega su resultado. El cruce de datos con el aula se hace cuando exista; el juego ya deja el resultado listo para eso.

Estado: **aprobado por Iván el 11/11** («Aprobado, arrancá»). **J0 a J3 y el código de la J4 HECHOS el 12/11 y PUBLICADOS ese
día (v=20261112d, con el ok de Iván: «Sí, publicá»); falta su prueba en el Quest**: ver §7.

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
- **J3 (12/11/2026, v=20261112c, commit local): nivel 3, la misión del 2 con una emergencia sorpresa, completo en PC.**
  `escenario_azar.js` (nivel 3: `emergencia` ∈ falla · fuego · fallaDespegue · generador · compuerta; `momento` ∈ ida · descarga · vuelta
  —la falla en el despegue siempre a 150 ft, la compuerta siempre al largar—; `senales` 1 de 2; `rearranque` 6 de 10 para la falla en
  vuelo; `genVuelve` 1 de 2; `EMERGENCIAS` y `MOMENTOS` legibles), `vuelo.js` (`motor.senal`: señales previas —aceite que cae a la mitad
  y torque que tiembla hacia abajo en 22 s, ITT +90 °C en 20 s, generador que parpadea—; `fallaGen` fija o recuperable con GEN OFF→ON
  —`genSw` de main.js—; `carga` de batería 1 → 0 en ~8 min sin generador según `consumo` —luces, pitot, aviónica—, a 0 V se apagan las
  pantallas; `sinRearranque` = falla mecánica), `cabina_nueva.js` (`frds.trabada`: GATE y SALVO no abren y sale `compuerta-trabada`),
  `main.js` (la manija E-DUMP larga por `largarCarga(true)`, así la misión la ve como descarga; `genSw`, `consumo`), `mision.js`
  (`vigilarEmergencia`: la ventana del momento, las señales, la espera a que un planeo 9:1 llegue al valle para las que dejan sin motor, el
  aborto del despegue si el alumno lee las señales; `dispararEmergencia`: falla / fuego / falla en el despegue pasan a las fases de la
  práctica con el checklist a la vista —y `retomarMision` si el motor rearranca—, generador y compuerta meten sus pasos con `insertarPasos`
  y la misión sigue; la reacción —segundos hasta la primera acción correcta— y los pasos de la emergencia hechos tarde quedan en el
  registro; «fuera de orden» ya sólo cuenta los pasos que son una acción sobre un control), `debrief.js` (`rubricaNivel3`: procedimientos
  y control como el 2, «reacción a la emergencia» por segundos y pasos tarde, «decisión y descarga»; sin castigo por no largar cuando una
  falla de motor o un fuego cortaron la misión), `herramientas/piloto_prueba.js` (resuelve las cinco emergencias; `abortarConSenales`).
  Probado el 12/11 con el piloto de prueba, una semilla por caso: compuerta 100004 (E-DUMP a 0,3 s, descarga a 0 m) APROBADO 97 ·
  generador 100021 (reset a 0,3 s, volvió) 95 · falla en el despegue 100024 (nariz abajo, carga, de frente, toque a 1,2 m/s en el valle)
  APROBADO 77 (la rúbrica castigaba «sin descarga»: corregido) · la misma con señales 100005 y aborto en la carrera (aceite a 80 psi)
  APROBADO 90 · fuego 100007 en la vuelta (procedimiento en 1,5 s, apagado, planeo y toque en el valle a 1,1 m/s) 99 · falla en vuelo
  con rearranque 100002 (carga a 0 s, bandera, rearranque a 552 ft, la misión se retoma, descarga y aterriza) 97 · falla mecánica con
  señales 100008 (aviso a los 138 s, falla a los 174 cuando ya llegaba planeando al valle, rearranque fallido, forzoso en el valle a
  1,1 m/s) 99. Bugs que aparecieron: las señales de torque pasaban de 100 % (ahora tiemblan
  hacia abajo); el paso «Flaps arriba» de un avión liviano y los pasos de navegación salían «fuera de orden».
  Queda: todo en el Quest (J4), que el humo del capot/la campana se vean y oigan bien en VR, las preguntas de §5.3 (qué emergencias quieren
  AAXOD y si las señales previas van), y el piloto de prueba larga alto cuando el foco está entre lomas (sigue el terreno de adelante).
- **J4, la parte de código (12/11/2026, v=20261112d): los tres niveles jugables de punta a punta DENTRO del casco. PUBLICADA el 12/11 con
  el ok de Iván («Sí, publicá»), junto con toda la cabina nueva.** Falta lo que depende de Iván: su prueba en el Quest.
  - **Empezar en VR:** la pantalla de inicio suma el botón «Empezar en VR» (sólo si el navegador tiene VR): un toque entra al casco y el
    nivel arranca 1,5 s después, ya sentado y recentrado. Antes, con la pantalla de inicio abierta, el «Entrar en VR» de la barra quedaba
    tapado: había que empezar en 2D (con el reloj corriendo) y después entrar. `entrarVR()` en `main.js`.
  - **La tablilla lleva el checklist** (`hudVR` en `main.js`): en los niveles muestra la fase con «paso i/n», la orden de vuelo fija en
    amarillo (FOCO · km · COBERTURA · VIENTO; `ui.orden`, sólo durante la misión), el próximo paso en grande (hasta 3 renglones) y los que
    siguen más chicos. Un mensaje (torre, avisos) la tapa 7 s y vuelve; si cambia la fase (emergencia), el checklist nuevo sale en el
    acto. En VR es la única lista a la vista (la de la página no se ve en el casco).
  - **La tablilla se mudó al ala derecha del tablero** (31 × 19 cm, recostada 7 cm por delante de la chapa y vuelta hacia el ojo; a
    0,72 m, 25° a la derecha y 19° abajo): donde estaba (prendida al parante derecho del parabrisas, 8/11) el parante —más grueso que el
    vidrio— le tapaba un tercio del texto desde el ojo del piloto; se veía en las capturas («Accidente. R▮▮▮mos qué pasó») y nadie lo
    había notado. Verificado con rayos: 117 de 117 puntos de la tablilla visibles desde el ojo, desde cada ojo (±3,2 cm) y con la cabeza
    corrida ±8 cm, arriba, abajo, adelante y atrás; no tapa el altímetro ni los paneles de llaves; tapa las dos perillas y el soporte del
    Garmin del ala (decorado) y un triángulo de 11 × 9 cm del vidrio derecho, abajo. La placa roja MENÚ · SALIR cuelga de su borde.
  - **Debrief en VR** (`panelvr.js` con subtítulo y barras, `resumenVR` en `debrief.js`, `panelDebriefVR` en `main.js`): a los 3 s del
    cierre el mundo se detiene (`congelado`), la voz dice «Nivel aprobado.» / «Nivel no aprobado. Mirá la devolución.» y aparece el panel:
    nivel, APROBADO/NO con la nota, las cuatro competencias en barras, las cuatro observaciones más importantes (lo fatal y la emergencia
    primero) y Repetir · Otra situación · Salir de VR (la devolución completa, la constancia y el JSON quedan en la página). El panel de
    VR ahora viaja pegado al avión (`mostrarPanelVR`): antes quedaba fijo en el mundo y, si el avión seguía rodando, se iba para atrás.
  - **Pausa de nivel:** Seguir · Empezar de nuevo (otra situación, o la del link si el instructor la fijó) · Salir de VR / Entrar en VR;
    queda anotada en el registro. Si el casco se saca en medio de un nivel, el nivel queda en pausa (no sigue volando solo).
  - **Regla corregida (salió de la prueba):** la altura de la descarga se mide sobre el terreno DONDE CAE el agua, no sobre lo que hay
    justo debajo del avión al abrir (en la sierra difieren hasta 50 m: pasando a 150 ft sobre el foco se anotaban 298 ft).
  - Probado en PC: tablilla en sus tres vistas, pausa y «Empezar de nuevo», nivel 2 entero con el piloto de prueba (APROBADO), mundo
    detenido en el debrief, voz del resultado, «Repetir»; el panel de VR del debrief se ve en PC con `__debriefVR()`. **Nada de esto se
    pudo probar en el casco** (acá no hay VR): entrar con «Empezar en VR», leer la tablilla, apuntar a los botones del panel con el rayo.
  - **Publicación (12/11):** antes de subir se corrió `herramientas/prevuelo_pages.py` (nuevo): todo lo que el juego carga está en git
    con las mismas mayúsculas (Pages distingue, el servidor local no) y cada frase tiene su WAV. Links para el Quest: la página con
    `?nivel=1`, `?nivel=2` y `?nivel=3`; la barra tiene que decir v20261112d.

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
