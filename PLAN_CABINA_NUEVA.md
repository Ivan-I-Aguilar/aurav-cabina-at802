# Cabina nueva del AT-802 — plan completo

Pedido de Iván (2/11/2026): hacer el interior de cero en Blender, con la cabina real de AAXOD como
modelo, y antes de arrancar tener un plan profundo de todas las piezas y etapas. Este documento es
ese plan. Se actualiza a medida que avanzamos: cada etapa se marca HECHA con fecha y versión.

**Estado:** plan propuesto el 2/11 y ampliado el mismo día con la foto 360 de la cabina (método de
medidas) y la integración con el fuselaje. **3/11: Iván eligió copiar el BLANCO Y ROJO (el de la 360) y
la etapa 0 quedó HECHA (v=20261103a, local, sin publicar); falta su decisión A o B** (ver etapa 0).

## En una mirada
- **Qué:** se reemplaza TODO el interior que viene del FSX (`cabina.glb` y las ~400 líneas de
  parches que lo sostienen en main.js) por una cabina modelada de cero, por scripts de Blender, con
  la distribución de la cabina real.
- **El fuselaje:** la cabina tiene que calzar en el fuselaje que ya tenemos (`exterior.glb`). Si en
  la etapa 0 se ve que el fuselaje FSN no coincide con el real, se rehace sólo la sección de cabina
  del fuselaje, no el avión entero (§4, «Integración con el fuselaje»).
- **Cómo:** 8 etapas (0 a 7). Cada etapa deja el juego andando. La cabina vieja y la nueva conviven
  con un interruptor hasta la última etapa, así siempre se puede comparar.
- **Cuánto:** unas 10 a 16 sesiones de trabajo como las de estos días (16 si hay que rehacer la
  sección de cabina del fuselaje).
- **Cómo sabemos que quedó:** antes de mirar, un chequeo automático (que nada asome por fuera, que
  nada flote ni se superponga); después, una ronda fija de 12 vistas que se le manda a Iván. Iván
  aprueba cada etapa. Publicar, sólo con su ok.
- **Qué hace falta de Iván:** fotos de cerca en algunas etapas (§8) y algunas decisiones (§9).

## 1. Qué se conserva, qué se reemplaza y qué se borra

**Se conserva:** el exterior (alas, cola, motor, tolva y pintura; también la cúpula y la chapa de la
zona de cabina, salvo que la etapa 0 diga que hay que rehacerlas), la simulación (`vuelo.js`), la
misión y el tutor (`mision.js`), el audio, el escenario, el modo a pie (`apie.js`), el panel VR, la
lógica de `controles.js` (con dos agregados), la brújula y el ojo del piloto en (0; 1,38; 1,64).

**Se reemplaza:**
- `cabina.glb` (7 MB, del FSX) → seis GLB por zona hechos en Blender (meta: 3 MB en total).
- El tablero, las consolas y el anunciador que hoy se arman por código (`crearTablero`,
  `crearExtrasManual`, `crearConsolas`) → modelo.
- Los 19 relojes del FSX → 2 relojes analógicos y 3 pantallas en vivo, como en el avión real.
- El pedestal de radios inventado (`radios.js`) → el rack real.
- La butaca de cuerina → el asiento de malla roja.
- Los pedales actuales → pedales Air Tractor (con el mismo clip `pedales_timon`).

**Se borra (en la etapa 7):** el «recorte general» del exterior (`restoPanel`, `cuadranteViejo`,
`agujaLat`, `butacaVieja`, `restoLateral`, `vertsOk`…), los mamparos y faldones postizos,
`MANIJAS`, `EXTRAER`, `PEDAL_VIEJO`, `techo.glb`, `marco_ventana.glb` y el `instrumentos.json` del FSX.

## 2. Reglas de construcción (lo que aprendimos a los golpes)
1. **Cero parches sobre la cabina vieja.** La nueva no usa ni un triángulo del FSX.
2. **Todo sale de scripts** (`herramientas/cab_*.py`) que se pueden volver a correr: nada se edita
   a mano y todo se regenera con un comando.
3. **Lo que toca el casco se construye midiéndolo.** Paredes, piso, techo, antepecho y mamparo
   siguen la chapa real con rayos (el método de `techo_blender.py`), 1,5 cm hacia adentro, con los
   bordes lejos de los huecos de las ventanas (lección de la «sierra»). Nunca una pieza recta «a ojo»
   contra la chapa curva (lección de las molduras del 1/11).
4. **Geometría por vértices**, sin rotaciones euler (lección de la butaca: piezas volteadas).
5. **Los controles viajan con sus datos.** Cada llave o palanca es un objeto aparte con su pivote,
   eje y ángulos guardados como propiedades en Blender. El GLB los lleva (extras → `userData`) y
   `controles.js` ya sabe leerlos (`piv`, `eje`, `ang`, `pos`, `perilla`).
6. **Mismos nombres cuando la función es la misma** (`levPOT`, `levHEL`, `levCOND`, `swFUEL`,
   `swFLAPS`…): la misión no se toca. Las llaves pasan de número a nombre (`sw62` → `swBATT`) en
   UNA sola tabla (`SW` en main.js).
7. **Chequeo automático antes de mirar** (§6) y **ronda fija** después, del mismo lado que la
   captura de Iván.
8. **Lo que no sepamos se marca como provisorio** en este plan; no se inventa en silencio.

## 3. La cabina real, zona por zona
Fuentes (ninguna foto va al repo):
- Las 4 fotos del 2/11 (`Documents/aurav-cabina/fotos/cabina_real/`): avión AMARILLO de AAXOD.
- La foto 360 desde el asiento del piloto (`Documents/aurav-cabina/fotos/vr360/VR 360 VARIAS
  ALTURAS/DSCN0054.JPG`, 24/9): Nikon KeyMission 360, equirectangular de 7744×3872, avión BLANCO Y
  ROJO de AAXOD. Las otras 52 de esa carpeta son 360 alrededor y debajo del mismo avión, a varias
  alturas; de la 0040 a la 0051 se ve la cúpula de cerca, desde afuera.
- El manual de Air Tractor (notas en `herramientas/mapa_cabina.md`).

Los dos aviones tienen el MISMO tablero (FRDS GEN III, MVP-50, anunciadores, SALVO, mirilla y
escalas de la tolva). Lo que cambia son las radios: el amarillo tiene el rack alto de la zona E; el
blanco y rojo, una consola compacta entre el tablero y la pared derecha (decisión en §9).

En las tablas, «interactiva» quiere decir que se acciona en el juego y «en vivo», que es una
pantalla que dibuja datos de la simulación.

### A. Tablero superior (casi todo pantallas)
Chapa negra mate. El borde de arriba es una curva continua bajo el parabrisas: no hay visera plana.
El ala izquierda baja más que el resto (ahí va el FRDS, zona B).

| Pieza | Qué es | En el juego |
|---|---|---|
| A1 | Chapa del tablero con su contorno real, perforaciones y biseles | estática |
| A2 | Anunciadores MASTER WARN · MASTER CAUTION · LOW FUEL · ARMED | luces cableadas |
| A3 | Llave FUEL BOOST PUMP (ON/OFF), a la izquierda del monitor | interactiva (`swFPUMP`) |
| A4 | Monitor de motor E.I. MVP-50, con perilla PUSH-SELECT y teclas EXIT · SCRN · MENU | en vivo: torque, ITT, Ng, Np, flujo, aceite, combustible, voltios |
| A5 | Anemómetro analógico (mph, arco verde) | aguja 3D, como hoy |
| A6 | Pantalla de actitud Garmin (G5 o similar: confirmar con la foto de frente) | en vivo: horizonte, cintas de velocidad y altura, rumbo |
| A7 | Altímetro analógico | agujas 3D, como hoy |
| A8 | Garmin debajo de la de actitud (rumbo / HSI) | en vivo |
| A9 | Dos huecos redondos vacíos | tapas ciegas con tornillos |
| A10 | Placas: velocidad de maniobra, bomba, casco obligatorio, vuelo coordinado, pérdida en viraje derrapado | rótulos |
| A11 | A la derecha: soporte VACÍO de Garmin portátil con su cable; perillas UPPER y LOWER PANEL LIGHTS | perillas interactivas (luz del panel de noche) |
| A12 | Brújula colgada del marco del parabrisas | se conserva |
| A13 | Tablilla del tutor en VR y placa MENÚ · SALIR | se reubican sobre el ala derecha del tablero |
| A14 | Llaves BLOWER del aire acondicionado, abajo a la derecha | decorativas |

Cableado de los anunciadores (propuesta): LOW FUEL con poco combustible; MASTER WARN con fuego o
falla de motor; MASTER CAUTION con generador caído, bajo voltaje o reversa (BETA); ARMED con el FRDS
armado. El detalle de cada aviso sale como mensaje en la pantalla del MVP-50, como en el real. Esto
reemplaza al anunciador de 5 celdas que inventamos el 26/10.

### B. Ala izquierda: FRDS GEN III y MANUAL SALVO

| Pieza | Qué es | En el juego |
|---|---|---|
| B1 | Llaves del FRDS GEN III: GATE (CLOSE/OPEN), MODE (AUTO/MANUAL), ARMED (ON/OFF), FOAM (SET/INJECT), GALLONS TO DUMP (+/−), COVERAGE LEVEL (+/−). GATE, FOAM y las de +/− vuelven solas | interactivas |
| B2 | Display redondo del FRDS, con pantallita, perilla y teclas | en vivo: galones, nivel de cobertura, compuerta |
| B3 | Breaker CB FRDS CONTROL y llave FRDS POWER | interactiva |
| B4 | Botón rojo grande MANUAL SALVO «PRESS TO DUMP HOPPER» | interactivo: larga toda la carga |

Hoy tenemos las piezas del FRDS GEN II del FSX (`swFRDS_A..D`, `swK_FRDS1..3`): se reemplazan por
éstas. La lógica fina del FRDS (que el nivel de cobertura cambie el caudal y que «galones a largar»
haga descargas parciales) es una mejora de la simulación aparte, opcional.

### C. Mirilla de la tolva y paneles de llaves bajos
Debajo del tablero está la pared trasera de la tolva. Los paneles de llaves van más abajo, a la
altura de las rodillas, inclinados hacia el piloto, uno a cada lado del bastón.

| Pieza | Qué es | En el juego |
|---|---|---|
| C1 | Mirilla: ventana horizontal larga por la que se ve el interior de la tolva | en vivo: se ve el NIVEL DEL AGUA, que baja al largar |
| C2 | Escalas de galones pintadas en la pared de la tolva (FLIGHT 580→400 entre los pedales, y otra a la izquierda) | rótulos |
| C3 | Panel bajo izquierdo: filas LANDING / WORKING LIGHTS y DISPERSAL SYSTEMS / MISC, con breakers y llaves; placa PARK BRAKE OPERATION | llaves interactivas |
| C4 | Panel bajo derecho: filas FLIGHT LIGHTS / GYROS / FLAPS (con una llave de guarda roja) y ENGINE OPERATION (arranque, ignición, generador…) | llaves interactivas |
| C5 | Breakers (botones redondos con su amperaje) | estáticos (más adelante podrían «saltar» en una falla) |

Los rótulos de C3 y C4 no se leen todos en las fotos: hacen falta fotos de cerca (§8).

### D. Pared izquierda: cuadrante, combustible y compensadores

| Pieza | Qué es | En el juego |
|---|---|---|
| D1 | Panel negro inclinado sobre la pared, con placas | estático |
| D2 | Cuadrante: POWER (manija plateada, con beta y reversa detrás del ralentí), CONDITION (perilla roja: corte · tierra · vuelo), PROP (perilla azul: bandera … máximo); cables hacia adelante | interactivas (`levPOT`, `levCOND`, `levHEL`) |
| D3 | Manija roja FUEL (válvula: MAIN · OFF) | interactiva (`swFUEL`) |
| D4 | Perilla naranja «TURN TO LO…» | ¿fricción del cuadrante? **a confirmar** |
| D5 | Llave AILERON TRIM, que vuelve sola | trim de alerón (nuevo en la simulación) |
| D6 | Llave DOWN FLAPS / OFF | interactiva (`swFLAPS`; el manual dice recorrido continuo de 0 a 30°, hoy cicla 0/10/20) |
| D7 | Volante del compensador de profundidad con cadena y piñón (NOSE DOWN / NOSE UP) | trim de profundidad (nuevo en la simulación) |
| D8 | Dial RUDDER TRIM (NOSE LEFT · TAKEOFF · CLIMB · CRUISE · NOSE RIGHT) | interactivo (`swK_TRIMTIMON`) |
| D9 | Manija E-DUMP al lado del cuadrante: en la 360 (avión blanco y rojo) es NARANJA y tiene «DUMP» escrito; en el amarillo se ve gris con tapa roja | interactiva (`levEDUMP`; el manual: «manija con botón rojo, apretar y empujar adelante») |

En las fotos tampoco se ven la traba de la rueda de cola ni el freno de estacionamiento: preguntar
dónde están.

### E. Derecha: rack de radios

| Pieza | Qué es | En el juego |
|---|---|---|
| E1 | Rack negro de marco abierto, alto, apoyado en el piso a la derecha del asiento | estático |
| E2 | De arriba abajo: PAC24 (audio, con la llave MASTER AVIONICS), COM, transpondedor, Kenwood (FM), Motorola (digital) y controlador de sirena; fichas MIC y PHONES | caras en vivo (canvas, como hoy en `radios.js`); MASTER AVIONICS interactiva (`swAVNC`) |
| E3 | Bandeja abajo y una cajita | estáticas |
| E4 | Pared derecha: PULL FOR FRESH AIR, toma de 12 V, fichas, conexiones de bronce, manija baja | estáticas |

A la derecha no hay consola de breakers: la que inventamos el 27/10 se va. Esta zona es la del
avión amarillo; si se copia el blanco y rojo, va su consola compacta de radios (§9).

### F. Piso, pedales y bastón

| Pieza | Qué es | En el juego |
|---|---|---|
| F1 | Piso gris con parches antideslizantes negros, tapas redondas y fuelle negro en la base del bastón | estático |
| F2 | Pedales con la placa AIR TRACTOR | se rehace `pedales_blender.py`, mismo clip `pedales_timon` |
| F3 | Bastón cromado recto con empuñadura negra: botón rojo arriba (descarga), una llavecita y el botón de micrófono | interactivo (la lógica de hoy, con pivote nuevo) |
| F4 | Varillaje rojo en V entre los pedales; conducto gris de aire que sube a la derecha | estáticos |

### G. Asiento y atrás

| Pieza | Qué es | En el juego |
|---|---|---|
| G1 | Asiento de MALLA ROJA con arnés NEGRO y hebilla | se rehace `butaca_blender.py` |
| G2 | Mamparo detrás del asiento | estático (falta foto) |

### H. Cascarón

| Pieza | Qué es | En el juego |
|---|---|---|
| H1 | Piso hasta las paredes | gris |
| H2 | Forro de las paredes, del piso al antepecho de las ventanas | gris, medido del casco |
| H3 | Pared trasera de la tolva bajo el tablero, de lado a lado | amarillo cromato, con la mirilla (C1) y las escalas (C2) |
| H4 | Antepecho de las ventanas | parte del forro (reemplaza `marco_ventana.glb`) |
| H5 | Techo | forro medido (reemplaza `techo.glb`) |
| H6 | Mamparo trasero | detrás del asiento |
| H7 | Jaula de caños grises a la vista en el techo y los costados (se ve en la 360) | estática |
| H8 | Puertas por dentro: panel oscuro con la placa CATEGORÍA RESTRINGIDA, manija roja, calco DO NOT OPEN DOOR IN FLIGHT en el vidrio | estáticas (la puerta no abre: decisión del 24/10) |
| H9 | Paño rojo en el techo, sobre el parabrisas (¿parasol?) | estático, **a confirmar** |

## 4. Cómo se construye

### Marco y números de referencia
Marco de la cabina: +x a la derecha del piloto, +y arriba, −z adelante. En Blender: (x, −z, y).

| Referencia | Valor |
|---|---|
| Ojo del piloto | (0; 1,38; 1,64) |
| Piso | y ≈ 0,26 |
| Casco por dentro | x entre ±0,58 y ±0,66 según la altura |
| Plano del parabrisas | z = 0,74 + 0,93·(y − 1,02) |
| Tablero de hoy | z ≈ 0,86–0,95; y 0,70–1,25 |
| Banqueta del asiento | arriba en y ≈ 0,64 |
| Mamparo trasero de hoy | z 2,33 |
| Base del bastón de hoy | (0,004; 0,22; 0,969) |

### Medidas y escala
- **Una sola escala: metros, la del fuselaje.** El exterior está a escala real (18,06 m de
  envergadura, la del AT-802) y la cabina usa su mismo marco. No hay una escala para ajustar a ojo:
  todo se mide en metros en ese marco.
- **De dónde sale cada medida**, de más a menos confiable:
  1. **El fuselaje medido por dentro** (rayos contra `exterior.glb`). Manda en todo lo que toca la
     chapa: ancho, techo, antepecho y piso.
  2. **Las medidas de catálogo de cada equipo.** Los relojes y el G5 van en huecos estándar de 3⅛"
     (8 cm); el MVP-50 tiene medidas publicadas; las radios de panel suelen tener 6¼" de ancho (16 cm).
  3. **La foto 360 desde el asiento.** Da la DIRECCIÓN exacta de cada cosa: un píxel equivale a 0,05°,
     menos de 1 mm a un metro. Con la dirección y una superficie conocida (el plano del tablero, el
     piso, la pared) sale la posición.
  4. **Las fotos comunes**, para detalles y rótulos. No sirven para medir porque no se conoce el lente.
- **Cómo se usa la 360 (la «calcada»).** En Blender la foto va de fondo, como un cielo
  equirectangular, y la cámara se pone en el punto donde estuvo la Nikon. Mirando desde ahí, todo lo
  modelado tiene que caer ENCIMA de lo que se ve en la foto. Si un reloj o una manija no coinciden,
  están mal puestos. Es la misma vista que tiene el piloto.
- **Primero se ubica la cámara.** El punto exacto de la toma se calcula alineando lo que ya está en
  el modelo: los parantes del parabrisas, los marcos de las puertas y la jaula del techo. De paso,
  eso mide qué tan bien coincide el fuselaje FSN con el real (ver «Integración con el fuselaje»).
- **Tolerancias:** ±1 cm en lo que se toca (palancas y llaves) y en lo que está junto al casco;
  ±2 cm en lo demás. Cerca de las costuras de los dos lentes de la Nikon, lo que está a menos de medio
  metro puede correrse 1 a 2 cm: ahí mandan el catálogo o el casco.
- **También se verifica el ojo del piloto.** La 360 muestra a qué altura queda el tablero visto desde
  el asiento; si nuestro ojo (1,38) no da lo mismo que un piloto real, se corrige.
- **Mejor todavía, si se vuelve al hangar:** una segunda 360 desde el mismo asiento, corrida unos
  20 cm (arriba o al costado). Con dos puntos de vista se triangula y la distancia sale directa, sin
  depender del casco.

### Integración con el fuselaje
Al final la cabina nueva tiene que quedar DENTRO del fuselaje que se ve desde afuera. Hay dos
caminos, y se elige en la etapa 0 con datos, no a ojo:
- **A. Integrarla al fuselaje que ya tenemos (FSN).** El cascarón se mide contra su chapa, con 1,5 cm
  de holgura. Sirve si el fuselaje FSN coincide con el real.
- **B. Rehacer la sección de cabina del fuselaje.** Cúpula, marcos, vidrios, puertas y la chapa desde
  el cortafuegos hasta detrás del asiento, modelados con las 360 de adentro y de afuera. Esa sección
  se saca del exterior con dos cortes planos (adelante y atrás) y se reemplaza. Termina de raíz con
  los problemas de la frontera (vidrios en sierra, dientes, huecos del lomo, alambres), pero es más
  trabajo: suma una etapa (1b, de 1 a 2 sesiones).
- **El avión entero no hace falta rehacerlo:** alas, cola, motor y tolva del FSN están bien.
- **Cómo se decide:** se superpone la 360 de adentro con el fuselaje FSN visto desde el mismo punto,
  y las 360 de afuera (0040 a 0051) con el exterior visto desde donde se tomaron. Si los parantes,
  los marcos y el techo coinciden con 2 cm de error o menos, va A; si no, va B. Iván ve las
  superposiciones y decide.

### Archivos nuevos
- `herramientas/cab_comun.py`: lo común a todos los scripts. Conversiones, prismas, materiales con
  los colores reales, medición del casco, creación de controles con sus propiedades, placas con
  rótulos, exportación, vistas de prueba y chequeos automáticos.
- Un script por zona: `cab_cascaron.py`, `cab_tablero.py`, `cab_paneles.py`, `cab_izquierda.py`,
  `cab_radios.py`, `cab_mandos.py`. Cada uno exporta `blender/cab_<zona>.glb` y sus vistas de prueba.
- `herramientas/cab_rotulos.py` (Python común, con Pillow): dibuja TODOS los rótulos y placas en una
  sola imagen (`blender/cab_rotulos.png`) y anota dónde quedó cada uno; Blender los pega en su lugar.
  Texto nítido y sin costo para el Quest.
- `herramientas/hacer_cabina.ps1`: corre todo en orden y deja también `blender/cabina_nueva.blend`
  para abrirlo en Blender.
- `casco_medido.json`: el casco por dentro cada 2,5 cm a lo largo (ancho a cada altura, antepecho y
  techo). Es la referencia común de todas las zonas.
- En el juego, un módulo nuevo `cabina_nueva.js`: carga los GLB, arma los controles y conecta las
  pantallas, los anunciadores y la mirilla. main.js adelgaza.

### Controles
- En Blender, cada control lleva sus propiedades: `piv` (pivote), `eje`, `ang` (apagado y
  encendido), `pos` (varias posiciones) y `perilla` (paso), que `controles.js` ya entiende, más dos
  nuevas: `tres` (llave de 3 posiciones; reemplaza la lista `SW3`) y `momentaneo` (vuelve sola:
  START, GATE, FOAM, trim de alerón).
- Al exportar: transformaciones aplicadas (`controles.armar` supone vértices en coordenadas de
  cabina) y `export_extras=True`, que en el exportador de Blender viene apagado: sin eso las
  propiedades no llegan al juego. Un control con dos materiales llega como grupo con dos mallas
  adentro: sus propiedades quedan en el grupo, y `armar` tiene que leerlas de ahí.
- También `punta`: hacia dónde «mira» el control. Hoy el aro del tutor y el agarre en VR suponen que
  todo mira al piloto; los controles de la pared izquierda miran hacia el centro de la cabina.
- Palancas del cuadrante: mismos nombres y mismas escalas lógicas (adelante −0,9; atrás 0,15; POWER
  hasta 0,42 en reversa), así la misión no cambia.

### Pantallas en vivo
`pantallas.js` (nuevo) dibuja en canvas el MVP-50, la pantalla de actitud, el Garmin de rumbo, el
display del FRDS, la mirilla y las caras de las radios. Se redibujan 10 a 15 veces por segundo, no
72: el Quest no da para más. Los datos salen de `vuelo`, que ya entrega torque, ITT, Ng, Np, flujo,
aceite, voltios e hidráulico. Los relojes analógicos (anemómetro y altímetro) siguen con
`instrumentos.js`: el script del tablero escribe su posición en `instrumentos.json`, con el mismo
formato de hoy.

### Colores (de las fotos)
Negro mate del tablero, gris de piso y paredes, antideslizante negro, amarillo cromato de la tolva,
rojo de la malla del asiento, plata de POWER, azul de PROP, rojo de CONDITION y de FUEL, cromo del
bastón.

### Presupuesto para el Quest
Cabina nueva con 60 mil triángulos como máximo, 40 llamadas de dibujo como máximo (lo estático se une
por material), una sola imagen de rótulos de 2048 y 3 MB de GLB en total (hoy `cabina.glb` sola pesa 7).

## 5. Etapas
Cada etapa dice qué se hace, qué se conecta, qué se borra y cuándo está lista.

### Etapa 0 — Base de trabajo (1 sesión)
- `cab_comun.py`, la medición del casco y el chequeador automático.
- La 360 en Blender: ubicar la cámara de la toma y superponer la foto con el fuselaje FSN, desde
  adentro y desde afuera. **Sale la decisión A o B** de «Integración con el fuselaje», con las
  imágenes para que Iván la vea.
- `__ronda(n)` en el juego: pone la cámara en cada una de las 12 vistas fijas, adentro o afuera, con
  luz de día. Las capturas salen idénticas cada vez (hoy se arman a mano, y una vez miramos el lado
  equivocado).
- Interruptor `?cabina=vieja` / `?cabina=nueva` para comparar.
- Para Iván: un «plano» de la cabina vacía, el casco por dentro con sus medidas.
- **Lista cuando** la ronda sale con un comando y el chequeador corre sobre una pieza de prueba.

**HECHA el 3/11/2026 (v=20261103a, local).** Lo que quedó:
- `herramientas/cab_comun.py` (`Casco` con rayos, `medir_casco` → `blender/casco_medido.json`, 81
  estaciones × 73 alturas; `Panorama`; `control()`; `exportar()`; `vista()`; `chequear()` con los 6
  chequeos). Corrido directo prueba el chequeador con piezas de prueba y encuentra las 5 fallas.
- `cab_calcar.py` (pose de una 360 por calce de máscaras: adentro vidrios↔claros, afuera chapa↔claros),
  `cab_superponer.py` (superposiciones y medidas borde a borde), `cab_render_pose.py` (el FSN desde el
  punto de la toma), `cab_plano.py` (el plano del casco). Las imágenes con foto quedan FUERA del repo:
  `Documents/aurav-cabina/fotos/calcado_etapa0/`; las poses y medidas, en `blender/calcado/`.
- Juego: `?cabina=nueva` / `?cabina=vieja` (`cabina_nueva.js`), `__ronda(n)` con las 12 vistas (devuelve
  una promesa; a pie para las de afuera) y `__vista(x, y, z, yaw°, pitch°, hfov°)` para mirar desde un
  punto dado (comparar con una foto). Verificado en el navegador: las 12 vistas salen con un comando.
- **Calcado de la 360 (DSCN0054):** la cámara estuvo en (0,00; 1,16; 1,58) m, girada 13° a la
  izquierda y 6° hacia arriba; es decir 22 cm MÁS BAJO que el ojo del juego (1,38) y 6 cm adelante:
  altura de pecho de un piloto sentado (el ojo real queda ~25 cm arriba, o sea ≈ 1,41: el ojo del juego
  está bien o apenas bajo). Calce con los vidrios del FSN: mediana 1,7 cm, p75 3,7 cm, p90 5,4 cm (171
  bordes). Por zona: parabrisas 1,8 / 4,7; puerta izq. 1,3 / 5,1; puerta der. 2,2 / 5,9; atrás 1,5 / 2,4
  (mediana / p90 en cm).
- **Hallazgos para la decisión A/B:** (1) las PUERTAS (marcos, postes, antepecho) y el techo calzan con
  2–3 cm; (2) el PARABRISAS del FSN es un solo paño de vidrio con los parantes PINTADOS en la textura,
  borde inferior en sierra con huecos (los «dientes» de siempre), y el paño central queda corrido ~6°
  (≈ 6 cm) respecto del real visto desde el mismo punto; (3) las VENTANAS DEL TECHO del FSN quedan
  unos 10° (≈ 8–10 cm) más afuera y atrás que las reales; (4) el FSN no tiene piso ni cortafuegos
  (agujeros). La 360 de afuera (DSCN0050, sobre el ala derecha) calzó sólo en forma aproximada (mediana
  6 cm): no sirve para medir; sí para ver la forma.
- **DECIDIDO por Iván el 3/11: B, rehacer la CÚPULA** («el FSN se ve roto»: con `?cabina=nueva`, sin
  forro, se ven los huecos en sierra de las ventanillas traseras del carenado sin vidrio, caras que faltan
  y chapas-isla flotando). Alcance de la 1b: todo lo que está por encima del antepecho, desde el
  cortafuegos hasta detrás del asiento: parabrisas de 3 paños con sus 2 parantes, ventanas del techo,
  puertas (marcos y vidrios) y las ventanillas traseras del carenado, calcado de la 360. Se conserva la
  chapa del FSN por debajo del antepecho (calza con 2–3 cm) y el resto del avión.

### Etapa 1b — La cúpula (2 a 3 sesiones; DECIDIDA el 3/11: sale B)
- **Plan detallado en `PLAN_CUPULA.md`** (3/11, a la espera del ok de Iván): jaula de caños, parabrisas
  de 3 paños, techo con sus ventanas y forro, puertas, carenado con ventanillas, costura con el FSN.
- Se rehace sólo lo que está sobre el antepecho; el FSN se corta por triángulos enteros a un archivo
  nuevo (`exterior_cupula.glb`, sólo para `?cabina=nueva`); `exterior.glb` queda para la cabina vieja.
- Se hace ANTES del cascarón, porque el cascarón se mide contra esta cúpula (arriba) y el FSN (abajo).

### Etapa 1 — Cascarón (1 a 2 sesiones)
- Crea el cascarón (H1–H9), la mirilla con el agua (C1) y las escalas (C2), medidos contra el
  fuselaje (el FSN si sale A; la sección nueva si sale B) y calcados sobre la 360.
- Se deja de cargar TODA la parte estática del FSX. Lo que todavía no se rehízo (tablero, consolas,
  radios, controles, asiento, pedales) queda provisorio hasta su etapa.
- Borra el recorte general, los mamparos, los faldones, `techo.glb` y `marco_ventana.glb`. Los
  arreglos locales del 31/10 al 2/11 (sin publicar) quedan superados.
- Los restos que el OBJ del exterior trae hacia adentro (el alambre de la pared derecha, el mazo del
  parante trasero izquierdo) quedan detrás del forro; si alguno lo atraviesa, se borra en
  `exterior_terrestre2.py` sólo con una firma inequívoca (regla del 1/11) y se verifica en el acto.
- Lo que gana Iván: se terminan los restos del FSX, las rajaduras, los dientes, la sierra y lo que
  asomaba por las ventanas.
- **Lista cuando** el chequeo da cero vértices afuera y las 12 vistas salen limpias.

### Etapa 2 — Tablero superior (2 sesiones)
- 2a: chapa con el contorno real, perforaciones, biseles, placas y tapas ciegas.
- 2b: pantallas en vivo (MVP-50, actitud, rumbo), anemómetro y altímetro, anunciadores cableados,
  BOOST PUMP, perillas de luz del panel, soporte del Garmin portátil; la tablilla del tutor y la
  placa MENÚ se reubican.
- Borra `crearTablero`, la parte de tablero de `crearExtrasManual` y los otros 17 relojes.
- Riesgo: que las pantallas no se lean en el Quest. Letra grande y prueba de Iván en el casco.
- **Lista cuando** la ronda sale limpia y hay capturas de las pantallas en arranque, crucero y falla.

### Etapa 3 — FRDS, SALVO y paneles de llaves (2 a 3 sesiones; la delicada)
- 3a: FRDS GEN III y MANUAL SALVO.
- 3b: los dos paneles bajos con breakers, llaves y rótulos reales (necesita las fotos de cerca).
- 3c: re-cableado con la tabla de abajo, la misión completa simulada sin navegador (Node) y una
  puesta en marcha a mano con el tutor marcando cada llave nueva.
- Borra las llaves del FSX (`sw38`…`sw64`), `ROTULOS`, `EXTRAER` y el panel de llaves por código.
- Si las fotos de cerca no llegan a tiempo, se adelanta la etapa 4.

Borrador de la tabla de re-cableado (se completa con las fotos de cerca):

| Hoy | En el avión real | Nombre nuevo |
|---|---|---|
| `sw62` BATT | Master (el manual dice que es una llave que gira; ¿dónde está?) | `swBATT` |
| `sw56` GEN y `sw64` ALTN | Generator (fila ENGINE OPERATION) | `swGEN` (ALTN se va si no existe) |
| `sw53` IGNTR, 3 posiciones | Ignition (ENGINE OPERATION) | `swIGN` |
| `sw47` START | Start (ENGINE OPERATION), vuelve solo | `swSTART` |
| `sw60` FIRE | no existe: es la manija roja FUEL a OFF | (`swFUEL`) |
| `swFPUMP` | FUEL BOOST PUMP, en el tablero | `swFPUMP` |
| `sw63` AVNC | MASTER AVIONICS, en el rack | `swAVNC` |
| Luces: `sw52` LDG, `sw49` DOME, `sw61` BCN, `sw51` NAV, `sw48` STRB | LANDING, PULSE, WORKING LIGHTS, STROBE AND NAV, luces de instrumentos | uno por rótulo real (`swLDG`, `swPULSE`…) |
| `swHOPR`, `swFRDS` | FRDS POWER y ARMED | `swFRDS`, `swARMED` |
| `swWIPER` | WIPER, con su reóstato | `swWIPER` |
| `sw54` HYD, `sw50` PITOT, `sw38` SPARE | a ver en las fotos de cerca | — |

Textos del tutor que cambian (y se regenera la voz): el paso de FUEGO («switch FIRE» pasa a «manija
FUEL a OFF», a confirmar con Bruno) y los nombres que no coincidan con los rótulos reales.

### Etapa 4 — Pared izquierda (1 a 2 sesiones)
- Crea la zona D completa.
- Conecta las 3 palancas, FUEL, FLAPS, el trim de timón (ya existe) y dos trims nuevos en la
  simulación (profundidad y alerón; simples: suman al mando). E-DUMP, si la palanca de piso es esa.
- Borra `crearConsolas`, `MANIJAS`, `recortarManija` y la manija E-DUMP inventada.
- Riesgo: el alcance en VR (la pared queda más abajo que el pedestal de hoy). Se mide la distancia
  desde el hombro y se prueba en el Quest.

### Etapa 5 — Rack de radios (1 sesión)
- Crea la zona E. Las caras se dibujan como hoy en `radios.js`, pero sobre el rack real.
- Conecta MASTER AVIONICS. Las perillas quedan listas para la radio con la torre (pendiente viejo).
- Borra el pedestal inventado.

### Etapa 6 — Asiento, pedales y bastón (1 a 2 sesiones)
- Asiento de malla roja con arnés negro, pedales AIR TRACTOR, bastón cromado con empuñadura,
  varillajes y conducto de aire.
- Conecta el bastón (pivote nuevo, sin la inclinación de −0,25 que traía el FSX), los pedales (mismo
  clip) y el botón del bastón. Se revisa la altura del ojo con el asiento nuevo y el recorrido de
  subida de `apie.js`.
- Borra el bastón del FSX (`palanca_*`), la butaca de cuerina y `PEDAL_VIEJO`.

### Etapa 7 — Limpieza, rendimiento y Quest (1 sesión)
- Se saca `cabina.glb` del juego (queda en la historia de git) junto con todo el código de parches.
- Se actualizan CLAUDE.md, TRASPASO.md y `mapa_cabina.md`.
- Medición de rendimiento y prueba de Iván en el Quest: pantallas, alcance de los controles, ojo.
- Publicar, sólo con el ok de Iván.

## 6. Verificación (en cada etapa)
**Automática, antes de mirar:**
1. **Nada afuera:** un rayo desde el eje de la cabina hasta cada vértice; si cruza la chapa antes de
   llegar, ese vértice está afuera. Tiene que dar cero.
2. **Nada delante del parabrisas**, con 1,5 cm de margen.
3. **Nada flotando:** cada pieza a menos de 3 mm de otra pieza o del casco.
4. **Nada superpuesto en el mismo plano** (lo que parpadea).
5. **Alcance:** cada control a menos de 75 cm del hombro.
6. **Presupuesto:** triángulos, llamadas de dibujo y MB.

**Visual:** primero en Blender; después en el juego con `__ronda(1..12)`, de día.
- Adentro, desde el ojo: 1 frente · 2 abajo a la izquierda (cuadrante) · 3 abajo a la derecha
  (radios) · 4 vano izquierdo · 5 vano derecho · 6 atrás · 7 piso y pedales.
- Afuera: 8 y 9 tres cuartos delanteros desde arriba (izquierda y derecha) · 10 y 11 tres cuartos
  traseros mirando POR las ventanas · 12 de costado, a la altura de la ventana.

Se le mandan las 12 vistas a Iván; si su captura es de un lado, se mira ese lado. Él decide si quedó.

**Funcional:** la misión completa simulada sin navegador y una puesta en marcha a mano.

## 7. Riesgos y cómo se cubren

| Riesgo | Cómo se cubre |
|---|---|
| Que algo asome por fuera o deje huecos (lo que más nos golpeó) | casco medido, chequeo 1, vistas de afuera |
| Romper la misión al cambiar nombres | palancas con el mismo nombre, llaves en una sola tabla, simulación sin navegador |
| Rendimiento en el Quest | presupuesto, pantallas a 10–15 Hz, prueba de Iván |
| Datos que faltan | fotos de cerca por etapa; lo provisorio, marcado |
| Alcance en VR | chequeo 5 y prueba en el Quest |
| Pasar meses sin una versión estable | cada etapa se puede publicar sola (con el ok de Iván) |

## 8. Fotos que hacen falta (y para cuándo)
La 360 desde el asiento ya da la vista general de toda la cabina (tablero, puertas, techo, cuadrante y
tolva), así que no hace falta una foto de frente para las proporciones. Lo que sigue faltando:
- **Etapa 1:** lo que hay detrás del asiento (la 360 no lo ve, porque la cámara estaba contra el
  respaldo) y el piso de cerca.
- **Etapa 2:** el MVP-50 y la pantalla de actitud encendidos (qué muestran).
- **Etapa 3:** cada fila de llaves de cerca (son 4 filas), que se lean los rótulos; dónde está el Master.
- **Etapa 4:** el cuadrante de costado; la perilla «TURN TO LO…»; la palanca de piso con tapa roja;
  dónde están la traba de la rueda de cola y el freno de estacionamiento.
- **Etapa 5:** el rack de frente.
- **Etapa 6:** la empuñadura del bastón de cerca, los pedales y el asiento de costado.

## 9. Decisiones pendientes de Iván
1. Arrancar por las etapas 0 y 1 (recomendado).
2. Qué avión se copia: el blanco y rojo de la 360 (consola de radios compacta) o el amarillo de las
   4 fotos (rack alto de radios). El tablero es el mismo en los dos.
3. Integración con el fuselaje: A (el FSN de hoy) o B (sección de cabina nueva). Se decide al
   terminar la etapa 0, mirando las superposiciones.
4. Paso de FUEGO: la llave FIRE pasa a ser la manija FUEL a OFF (consultar con Bruno).
5. El anunciador de 5 celdas inventado se reemplaza por los 4 anunciadores reales y mensajes en el MVP-50.
6. Trims nuevos en la simulación (profundidad y alerón).
7. Mirilla con el nivel del agua en vivo.
8. Publicar por etapas (con su ok en cada una) o todo junto al final.

## 10. Cronograma

| Etapa | Qué | Sesiones |
|---|---|---|
| 0 | Base: medición, chequeos, ronda automática, 360 superpuesta y decisión A o B | 1 |
| 1b | Sección de cabina del fuselaje (sólo si sale B) | 0–2 |
| 1 | Cascarón | 1–2 |
| 2 | Tablero superior | 2 |
| 3 | FRDS, SALVO, paneles de llaves y re-cableado | 2–3 |
| 4 | Pared izquierda | 1–2 |
| 5 | Rack de radios | 1 |
| 6 | Asiento, pedales y bastón | 1–2 |
| 7 | Limpieza, rendimiento y Quest | 1 |
| | **Total** | **10–16** |

## Fuera de alcance (por ahora)
Fotorrealismo y texturas sacadas de las fotos (las fotos no van al repo), manos animadas, aire
acondicionado funcional, breakers que saltan y la lógica fina del FRDS. Se pueden sumar después sin
rehacer nada.
