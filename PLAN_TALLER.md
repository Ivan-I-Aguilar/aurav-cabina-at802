# Taller de motores del AT-802 en VR — plan completo

Pedido de Iván (15/11/2026): un taller de motores y componentes del AT-802 en realidad virtual, dentro de un hangar ficticio de
AURAV, con una mesa holográfica que reutiliza el simulador de turbohélice de escritorio. El traspaso lo armaron Lichy y Nacho en
claude.ai (`OneDrive/Desktop/AURAV/HOLOGRAMA/PLAN_TALLER_MOTORES.md`, también dentro del zip de la fuente); todo lo que dice está
acá. Este documento es el plan profundo que pide `CLAUDE.md` antes de un trabajo grande: se actualiza a medida que avanzamos y
cada etapa se marca HECHA con fecha y versión.

**Estado (15/11):** **plan APROBADO por Iván el 15/11 («1 · Aprobado»)**, con sus 5 decisiones de §13: uso interno, página
nueva (`taller.html`), modo mecánico que identifica, ubica e inspecciona, seis piezas en el banco y, en las cifras del motor,
manda la cabina. Queda pendiente quién de AAXOD valida el modo mecánico (3b). **T1 arrancada el 15/11 a las 14:21.** No se tocó
el juego. La fuente del simulador quedó extraída FUERA del repo, en `Documents/aurav-cabina/taller_fuente/`, hasta
decidir qué entra (§3).

## En una mirada
- **Qué:** una página nueva, `taller.html` (decidido el 15/11), con un hangar de AURAV inventado, el AT-802 de este repo
  estacionado, un Cessna 172 en reparación, bancos con herramientas y, en el centro del trabajo, una **mesa holográfica**: el
  turbohélice genérico del simulador de escritorio flotando sobre un proyector, celeste y translúcido, funcionando, con sus 8
  estaciones, las 3 palancas, el arranque, las 5 fallas y las 6 preguntas. Al lado, un **banco de componentes** con piezas a tamaño
  real para agarrar.
- **Para quién:** pilotos (**modo piloto**: lo que ya hace el simulador) y mecánicos (**modo mecánico**: identificar piezas,
  ubicarlas, qué se inspecciona; contenido nuevo que valida AAXOD).
- **Qué se reutiliza:** del simulador, el modelo del motor (`motor.js`, con las cifras de la cabina), el contenido (`content.js`)
  tal cual y la geometría (`engine.js`) cambiando sólo los imports; para VR se rehacen los materiales (holograma sin
  postproceso), el tablero HTML (paneles 3D) y el recorrido (en VR no se mueve la cámara: gira el holograma). Del repo: el AT-802
  listo para juegos (`juegos/at802.glb`), `controles.js` (palancas que se agarran), `panelvr.js`, la turbina de `audio.js`, el
  método de Blender por scripts y la ronda de vistas.
- **Cómo:** 10 etapas (T1 a T10), cada una un **bloque de trabajo de 3 horas o más** que corre solo hasta el cierre (pedido de
  Iván, 15/11; §9). Primero el holograma (lo más riesgoso para el Quest) en una sala gris; después la mesa y los paneles; después
  el hangar y las aeronaves; al final los dos modos, el rendimiento y el Quest.
- **Cuánto:** unas 33 horas: 10 bloques de 3 a 3,5 horas (§14).
- **Cambio de dinámica (16/11, §15):** Iván lo miró en la PC y pidió que se entre recorriendo el avión (familiarización), que
  desde su motor se elija «ver motor», que el motor se presente a escala real y que cada parte del avión se pueda ver en holograma
  «en las manos». **HECHO en el bloque T11 del 16/11** (falta su prueba en el Quest y lo que no sale del modelo: la tolva por dentro
  y la compuerta).
- **Cómo sabemos que quedó:** chequeo automático de presupuesto y de carga antes de mirar; ronda fija de vistas que se le manda a
  Iván; él prueba en el Quest (desde acá no se puede). Publicar, sólo con su ok.
- **Qué hace falta de Iván:** el ok al plan, bajar el Cessna de Sketchfab con su cuenta y decir quién de AAXOD valida el modo
  mecánico (las 5 decisiones de §13 ya están).

## 1. Qué pidió Iván (del traspaso)
- **Hangar de AURAV ficticio**, modelado en 3D: amplio (unas 12 aeronaves), ordenado, con bancos de trabajo y herramientas.
  Referencia: las fotos 360 y planas del hangar real de AAXOD (`Documents/aurav-cabina/fotos/vr360/…`, DSCN0001–0052, y la carpeta
  AT8T del Drive). **Las fotos son sólo referencia y no van al repo; en el hangar no van marcas ni logos de AAXOD.**
- **Adentro:** el AT-802 de este repo, estacionado; el **Cessna 172 en reparación** (modelo «FREE Cessna 172SP» de NLM Group,
  Sketchfab, **CC BY**; el crédito tiene que verse: «Modelo Cessna 172SP: NLM Group, CC BY»; en el repo `aurav` sólo está la nariz
  aligerada, el avión entero hay que bajarlo de nuevo); **mesas de trabajo**, la principal una **mesa holográfica** (proyector sobre
  el banco y el motor en holograma: celeste semitransparente, bordes que brillan, el flujo de aire como partículas de luz,
  funcionando, con estaciones, palancas, paneles, fallas y preguntas) y al lado un **banco de componentes** (ignitor, inyector,
  álabe, malla de admisión, a tamaño real; al acercar una al holograma se ilumina dónde va).
- **Dos modos:** piloto (lo del simulador) y mecánico (contenido nuevo que tiene que validar alguien de AAXOD).
- **Motor GENÉRICO** (turbina libre, flujo inverso, sin marca ni modelo), preparado para cambiarlo por el real cuando Iván tenga el
  manual: nombres, textos y cifras en datos aparte de la geometría. Todo el contenido lleva [AGREGADO] y las cifras [VERIFICAR].
- **Leyenda fija, obligatoria y siempre a la vista:** «Material de referencia para entender el funcionamiento. No reemplaza el
  manual del fabricante, el procedimiento de la empresa ni la instrucción.»

## 2. El simulador de escritorio, leído (15/11)
Página única de escritorio publicada en el repo `aurav` (https://ivan-i-aguilar.github.io/aurav/turbohelice.html, versión AURAV
sin AAXOD), hecha con la skill Teardown (three.js 0.186) y revisada por Nacho (sin llamadas de red, sin datos personales,
licencias incluidas). El zip trae `turbo-shared/` (el código común), `turbo-live/main.js` y `turbo-film/main.js` (las dos
entradas, una línea cada una), `turbohelice.html` (la página empaquetada, 843 KB, con las fuentes y las licencias adentro) y el
traspaso. **No trae `kit/`** (`warm.js` y `runtime.js`, que importan `live.js` y `tour.js`): esos dos sólo corren desde el HTML
empaquetado.

| Archivo | Qué es | En el taller |
|---|---|---|
| `motor.js` (133 líneas) | El modelo: `step(s, inp, dt)` con palanca de potencia `pla` 0–1, condición `cl` (0 corte · 1 ralentí bajo · 2 ralentí alto), hélice `prop` 0–1, arranque (pulso) y falla → Ng, ITT, torque, Np, flujo de combustible, los ángulos de giro en cámara lenta (`ga`, `pa`, `pr`) y la fase del flujo. `readout()` suma el estampido de la pérdida de compresor. `GAUGES` (rangos y zonas) y `FAULTS` (5 fallas con su alerta y su acción). JS puro, sin three. | **La lógica, tal cual; las cifras, las de la cabina** (decisión 5, 15/11). |
| `content.js` (35) | Las 8 estaciones (frase de Iván + 2–3 llamadas cada una), las 6 preguntas (la correcta es la primera; `ORDER` las mezcla en pantalla) y la leyenda. | **Tal cual.** El modo mecánico va en un archivo aparte. |
| `engine.js` (551) | La geometría por código, en mm (eje z, adelante +z): 105 mallas (§8), `PARTS` (22 puntos para las llamadas), `STATIONS` (qué queda y qué se resalta en cada estación) y `Z`. `update(s, ops)` posa el giro, el flujo (1500 partículas en 36 recorridos), la llama, los inyectores, los ignitores, las fallas, el aislado por estación (piezas fantasma + acento rojo) y el corte (`setCut`: corte · vidrio · sólido). Sólo usa `three` y `BufferGeometryUtils`. | **La geometría, tal cual** (cambian los dos imports). Los materiales y el `update` se rehacen en `holograma.js` (§5). |
| `console.js` (243) | El tablero HTML de 1600 × 900: título, estaciones, palancas, lámparas, instrumentos, fallas, vista, preguntas, texto de la estación, alerta, llamadas y la leyenda al pie. | **No:** se rehace como paneles 3D en canvas, con el mismo contenido y los mismos colores (§6). |
| `live.js` (460) | La página que se maneja: estados (`toIdle`, `toOff`, `pressStart`; la condición pasa sola a ralentí bajo al 12 % de Ng), botones, palancas, fallas, preguntas, órbita y zoom, niveles de calidad, recorrido automático tras 25 s quieto. | **La lógica se porta** a `taller/main.js` (es chica); lo de DOM, órbita y calidad no. |
| `tour.js` (243) | El recorrido de 82 s: guion (`SCRIPT`: las 8 estaciones de a 7 s, las palancas, el arranque caliente con el corte), el modelo integrado una vez (`stateAt`), las vistas de cámara (`VIEW_FN`), las llamadas a dos columnas y el cursor. | **El guion, sí** (en `taller/recorrido.js`, sin el kit); las vistas pasan a giros del holograma; las llamadas se rehacen en 3D; el cursor no. |
| `stage.js` (171) | El estudio: postproceso (GTAO), sombras VSM de 4096, ambiente PMREM, piso que sólo recibe sombra. | **No:** el postproceso no corre en WebXR y el Quest no da. |

**Números del modelo (ilustrativos, no son límites de ningún motor):** ralentí bajo 52 % de Ng y alto 65 %; hélice gobernada
1500–1700 RPM (roja 1760); ITT en ralentí ~545 °C, verde 400–760, roja 800; torque rojo 100 %; Ng rojo 102 %. El arranque caliente
lleva la ITT hacia 1150 °C; el colgado deja el Ng en 36 % con la ITT subiendo hacia 790. **La cabina usa otros** (`CLAUDE.md`,
«Números del avión»: Ng de ralentí 60 %, ITT de crucero ~420 + 3,8·torque, pico de arranque ~700). **Decisión 5 (15/11): manda la
cabina**: el holograma toma esas cifras y el simulador de escritorio queda como está.

**Probado acá (15/11):** `engine.js` arma sin errores con el three r180 del repo (una copia en el scratchpad con los imports
cambiados, corrida en Node): 105 mallas — 85 sólidas (33,3 k triángulos, 15 materiales), 18 de efectos (2 k) y 2 instanciadas:
**las 1500 partículas del flujo son esferas de 80 triángulos, 120 k triángulos** (más los 40 escombros de la falla, 480). Tal como
está, el motor solo serían ~105 llamadas de dibujo y ~156 k triángulos: más de lo que se le puede dar en el Quest (§8).

## 3. Qué entra al repo y dónde
- **La fuente queda afuera** (`Documents/aurav-cabina/taller_fuente/`; el zip original sigue intacto en
  `OneDrive/Desktop/AURAV/HOLOGRAMA/`). Al repo entran sólo las copias que se usan, con su nombre original (así se nota que son
  copias) y un comentario arriba que dice de dónde salen y qué se les cambió, para poder traer las mejoras del simulador de
  escritorio sin adivinar.
- **Archivos nuevos** (la página nueva quedó decidida el 15/11):

| Archivo | Qué es |
|---|---|
| `taller.html` | La página: Entrar en VR, barra mínima en PC, versión (`?v=`), créditos. |
| `taller/main.js` | Escena, jugador, VR (`local-floor`), caminar y saltos entre zonas, modos, la lógica portada de `live.js`, bucle (el motor a paso fijo), ganchos de prueba (`__taller`, `__ronda(n)`, `__vista(…)`). |
| `taller/motor.js` | Copia con las cifras de la cabina (decisión 5), como en `vuelo.js`: Ng de ralentí 60 %, torque = (Ng − 58) / 43, ITT = 420 + 3,8·torque con el pico de arranque ~700, arranque caliente hacia 1120 °C y colgado en 24 % de Ng con la ITT subiendo despacio hacia 1100. La cabina no tiene ralentí alto: queda en 65 % [VERIFICAR] hasta el manual. La lógica (palancas, arranque, fallas, giro, flujo) no cambia. |
| `taller/content.js` | Copia tal cual. |
| `taller/engine.js` | Copia; cambian los dos imports (`../three.module.js`, `../BufferGeometryUtils.js`) y, para el modo mecánico, cada malla lleva el nombre de su pieza (§7). |
| `taller/agregados.js` | Lo que el motor del simulador no tiene y el taller sí: el detector de virutas y las termocuplas de ITT (decisión 4), con su estación, su pieza y su punto de llamada. |
| `taller/holograma.js` | El holograma: junta las mallas por cuerpo que gira, sombreador de holograma, aislado y corte por uniforms, partículas como puntos de luz, efectos, proyector. |
| `taller/paneles.js` | Paneles 3D en canvas: estaciones y texto, instrumentos, fallas y alerta, vista, preguntas, modo mecánico, leyenda; rayo + gatillo en VR y clic en PC. |
| `taller/recorrido.js` | El guion de `tour.js` sin el kit; las vistas como giros del holograma. |
| `taller/mecanico.js` | Contenido del modo mecánico (datos: piezas, tareas, puntos de inspección), todo [AGREGADO] / [VERIFICAR]. |
| `taller/hangar.glb`, `taller/mesa.glb`, `taller/piezas.glb`, `taller/cessna172.glb` | Los modelos, cada uno con su `*_informe.json`. |
| `herramientas/taller_hangar.py`, `taller_mesa.py`, `taller_piezas.py`, `taller_cessna.py` | Blender 5.2 en segundo plano, como los `cab_*.py`: geometría por vértices, renders Eevee de prueba, informe con triángulos, llamadas y MB. |

- **Del repo se usa sin copiar:** `three.module.js` / `three.core.js` (r180), `GLTFLoader.js`, `BufferGeometryUtils.js`,
  `controles.js` (las palancas del cuadrante de la mesa se llaman `lev…` y traen `piv`, `eje`, `ang`, `pos` como las de la cabina),
  `panelvr.js` (menús y preguntas), `audio.js` (la turbina sintetizada sigue a Ng y Np) y **`juegos/at802.glb`**. Se sirve con el
  mismo `servidor.py` (configuración `cabina` de `.claude/launch.json`) y se abre `/taller.html`.

## 4. El hangar ficticio de AURAV, zona por zona
Referencia de tipo, no de copia: las 360 del hangar real muestran una nave con techo en arco de vigas curvas de alma calada
(agujeros redondos), correas, chapa acanalada clara en paredes y techo, columnas oscuras, piso de hormigón alisado con juntas
aserradas y sendas amarillas, muchas luminarias LED redondas, ventiladores industriales contra las paredes, carros de herramientas
rojos y un portón grande que da a la plataforma. El nuestro toma ese TIPO de nave con otras medidas, otra distribución y la marca
de AURAV (la del escenario: «AURAV / PLANO AÉREO»); nada de AAXOD.

Medidas [inventadas; **ok de Iván el 15/11** mirando las vistas]: nave de **40 m de luz × 60 m de fondo** (2.400 m²,
alcanza para unas 12 aeronaves mezcladas), techo en arco de 6 m en los costados a 12 m en el centro, 9 arcos cada 7,5 m, **portón
corredizo de 30 × 8 m** en el frente, abierto en parte (se ve la plataforma y el cielo). Marco: +x a la derecha mirando desde el
portón hacia el fondo, +y arriba, −z hacia el fondo, origen en el piso en el centro del portón.

| Zona | Qué hay | En el juego |
|---|---|---|
| H1 Portón y plataforma | Portón corredizo de hojas, abierto en el centro; afuera, una franja de plataforma, pasto y cielo (fondo barato: un plano y el cielo del escenario) | estática |
| H2 Punto de partida | Adentro, junto al portón: un atril con «TALLER DE MOTORES · AURAV · VER PARA VOLAR», la elección de modo (PILOTO · MECÁNICO), la leyenda y los créditos | panel (rayo + gatillo / clic) |
| H3 Puesto del AT-802 | `juegos/at802.glb` con la nariz al portón, calzas, escalera de servicio y conos | estático (§11: opcional, el motor en holograma dentro del capó) |
| H4 Puesto del Cessna 172 en reparación | El Cessna sobre gatos, sin capó (el motor a la vista si el modelo lo trae), una rueda sacada, carro de herramientas, bandeja, cartel «EN MANTENIMIENTO» y la **placa del crédito** | estático |
| H5 Taller de motores | Sector con piso de otro color y borde amarillo: la **mesa holográfica** (§5), los paneles en U, el cuadrante de palancas en el borde de la mesa y, al lado, el **banco de componentes** (§7) | el corazón del juego |
| H6 Bancos y herramientas | Contra el fondo y la pared derecha: bancos de trabajo, tableros de herramientas con siluetas, cajoneras rojas, estanterías con cajas, compresor, ventiladores, matafuegos, lavaojos | estático, liviano |
| H7 Pañol y oficina | Esquina del fondo: oficina vidriada con pizarrón (ahí van los créditos completos) | estático |
| H8 Techo y luces | Arcos, correas, chapa y luminarias LED (discos que brillan, sin luces reales) | estático |

**Recorrido y comodidad en VR:** se camina con el joystick izquierdo y se gira de a 30° con el derecho, como en el modo a pie
(`apie.js`); como la nave es grande, además hay **puntos de salto con fundido** (partida, mesa, AT-802, Cessna, bancos) para no
caminar 40 m con el joystick. Nunca un movimiento forzado de la cámara. En PC: WASD + mouse y clic.

**Luz:** sin luces dinámicas ni sombras en tiempo real en la nave: una luz de hemisferio y una direccional suaves, más la luz
horneada en Blender (oclusión y luz de techo, a colores por vértice o a una imagen chica; a probar en T4) y sombras de contacto
falsas (manchas) bajo las aeronaves, los bancos y la mesa. Las luminarias son discos emisivos.

## 5. La mesa holográfica
**Mesa** (`taller_mesa.py` → `taller/mesa.glb`) [PROVISORIO]: 1,6 × 0,8 m, 0,90 m de alto, tapa oscura con una grilla que brilla
apenas; en el centro el **proyector** (disco de Ø 35 cm con un aro de luz) y un cono de luz aditivo hasta el holograma. En el borde
del alumno, el **cuadrante de palancas** (POTENCIA plata, CONDICIÓN roja con 3 muescas, HÉLICE azul: los colores del cuadrante del
AT-802), los botones ARRANCAR y A RALENTÍ y las tres lámparas (arranque, ignitores, combustible). Las palancas son `levPLA`,
`levCL` y `levPROP` con sus propiedades, así `controles.js` las agarra en VR (grip a menos de 10 cm, o rayo + gatillo) y las mueve
con clic en PC, como en la cabina.

**El holograma** (`taller/holograma.js`):
- **Escala de mesa:** 0,35 del real → **0,66 m de largo** (el motor de `engine.js` mide 1,9 m de la caja de accesorios a la punta
  del cono y 0,96 m de ancho con los escapes; con 0,32 quedan los 60 cm del traspaso), centrado unos 35 cm sobre la mesa (≈ 1,25 m
  del piso: parado se mira apenas desde arriba, sentado queda de frente). Con el grip se agarra para girarlo y acercarlo; con las
  dos manos se agranda, de 0,2 hasta **1:1, a tamaño real**, para caminar alrededor. Botón «volver a la mesa».
- **Material sin postproceso:** un `ShaderMaterial` chico: celeste, aditivo, `depthWrite` apagado, doble cara; brillo de borde por
  fresnel (`1 − |N·V|` a una potencia), líneas de barrido que suben despacio y un parpadeo leve. Contornos con `EdgesGeometry`
  (líneas de 1 px: se miran en el Quest; si titilan, queda sólo el brillo de borde).
- **Pocas llamadas:** las 85 mallas sólidas se juntan por **cuerpo que gira**: lo fijo, el generador de gas, la turbina libre, el
  solar, el portasatélites y los 3 satélites → ~8 mallas. Cada vértice lleva su estación (`tag`) y si es pieza principal (`prim`)
  como atributos: aislar una estación, el fantasma y el acento (que en el holograma pasa del rojo a ámbar o blanco: se elige con
  las capturas) se hacen con uniforms, sin cambiar materiales. El **corte** también es un uniform (el sombreador descarta lo que
  queda del lado cortado): CORTE y COMPLETO; «sólido» no tiene sentido en un holograma.
- **Flujo:** las 1500 partículas pasan a **puntos de luz** (un `Points` o quads instanciados de 2 triángulos con una mancha
  suave): de 120 k triángulos a 3 k o menos, en una llamada. Se conservan los cuatro colores (aire azul, comprimido gris azulado,
  combustión naranja, escape gris) y su leyenda.
- **Efectos:** la llama, los 14 chorros de los inyectores (juntos en una malla), las chispas de los 2 ignitores, el estampido de la
  pérdida, los escombros y los álabes dañados de la ingestión: se conservan, aditivos.
- **Lo que no pasa al Quest:** sombras, GTAO, ambiente PMREM, el antialias del postproceso y los niveles de calidad.
- **Preparado para el motor real:** `holograma.js` no sabe de qué motor se trata: recibe un grupo de mallas con
  `userData {tag, prim, pieza}`. Hoy las arma `engine.js` por código; el día que haya manual, el motor real puede venir de un GLB
  de Blender con los mismos datos, y los textos, de un `content.js` nuevo.

**Las llamadas en 3D:** las de cada estación (2–3) son etiquetas en canvas a los dos costados del holograma, con una línea fina
hasta su punto de `PARTS` (que sigue al holograma cuando se gira) y siempre de cara al alumno.

## 6. Paneles y modos
**Paneles 3D** (`taller/paneles.js`), en U alrededor del alumno, con el contenido y los colores de `console.js` [disposición
PROVISORIA; toda placa se verifica con rayos desde el ojo, lección de la tablilla del 12/11]:
- **Izquierda:** ESTACIONES (8 botones; tocar la activa la apaga, como en el escritorio) y VISTA (CORTE · COMPLETO · FLUJO ·
  RECORRIDO · PREGUNTAS (6) · VOLVER A LA MESA).
- **Derecha:** INSTRUMENTOS (TORQUE, ITT, Ng, Np y COMBUSTIBLE en barras con zona verde y roja y el valor grande; «VALORES
  ILUSTRATIVOS · NO SON LÍMITES [VERIFICAR]») y FALLAS (las 5 + SIN FALLA).
- **Al frente, arriba del holograma:** el texto de la estación («ESTACIÓN 3 · CÁMARA DE COMBUSTIÓN [AGREGADO]» y la frase de Iván)
  y, cuando hay falla, la alerta roja con su acción.
- **La leyenda fija:** en el canto de la mesa del lado del alumno, al pie de cada panel y en el atril de partida: en VR no hay una
  «pantalla» donde dejarla fija, así queda a la vista en cualquier lugar donde se trabaja. Chequeo: desde las tres posiciones de
  trabajo de la mesa, un rayo desde el ojo llega a la leyenda.
- **Legibilidad en el Quest:** letra de 1,5 cm o más a 1 m (≈ 0,9°: unos 17 px en el Quest 2); canvas de 1024 px para paneles de
  ~0,6 m; se redibujan sólo cuando algo cambia (los instrumentos a 10–15 Hz, como las pantallas de la cabina).
- **Preguntas:** en un panel como el de `panelvr.js`: la pregunta, A/B/C en el orden de `ORDER`, ✓ o ✗ con la correcta,
  Siguiente, y al final «n de 6» con «Repasá las estaciones de las que dudaste. Este material no reemplaza la instrucción.».
- **Recorrido automático:** el guion de `tour.js` tal cual (las estaciones de a 7 s, las palancas que se mueven solas, el arranque
  caliente y el corte), pero en vez de mover la cámara **gira y acerca el holograma** para que cada estación quede de frente, y las
  palancas 3D se mueven solas. En VR arranca con el botón (no solo tras 25 s quieto, como en el escritorio: en el casco desorienta);
  en PC puede arrancar solo.
- **Mandos en VR:** joystick izquierdo camina, derecho gira de a 30°; gatillo = elegir con el rayo; grip = agarrar (palancas,
  holograma, piezas: gana lo más cercano); B/Y = menú (Seguir · Volver a la partida · Salir de VR); pausa si se saca el casco.

**Modo piloto:** lo del simulador entero: estaciones con su frase y sus llamadas, las tres palancas con el arranque (la condición
pasa sola a ralentí bajo al 12 % de Ng, como en `live.js`), las 5 fallas, los instrumentos, el flujo, el corte, el recorrido y las
6 preguntas. La voz del tutor puede decir las 8 frases con el mismo método de `voz/` (Sabina, `voces.py`).

**Modo mecánico:** contenido nuevo, ver §7. Hace las tres cosas (decisión 3a, 15/11): identificar, ubicar e inspeccionar; **nada
se publica sin la validación de AAXOD**.

## 7. Banco de componentes y modo mecánico
**Banco** (`taller_piezas.py` → `taller/piezas.glb`): un banco con bandejas y las piezas sueltas **a tamaño real** [medidas
VERIFICAR], cada una con `userData {pieza, nombre, estacion}` y su lugar en el holograma. **Seis piezas en la primera versión
(decisión 4, 15/11):** **ignitor**, **inyector de combustible**, **álabe** (de la turbina del compresor), **sector de la malla de
admisión**, **detector de virutas** y **termocupla de ITT**. Material «real» (metal, cerámica, bronce, sin texturas), para que se
distingan del holograma.
- **Las dos últimas no están en el motor del simulador:** se suman al holograma en un archivo aparte (`taller/agregados.js`, así
  `engine.js` sigue igual a la fuente), con su lugar [AGREGADO, VERIFICAR]: el detector de virutas abajo en la caja reductora (y
  otro en la de accesorios, si se confirma) y las termocuplas de ITT en un anillo entre la turbina del compresor y la turbina
  libre, con su arnés alrededor de la carcasa. Cada una con su punto de llamada, como los de `PARTS`.
- **Agarrar:** grip cerca (10 cm) o rayo + gatillo; en PC, clic para tomar y clic para dejar. Si se suelta lejos, vuelve sola a su
  bandeja.
- **Al acercarla al holograma** (a menos de ~40 cm), el lugar donde va se ilumina y titila (las 14 posiciones de inyectores, los 2
  ignitores, la fila de álabes, la malla, el detector de virutas, el anillo de termocuplas); al soltarla cerca aparece una copia a
  la escala del holograma en su lugar y la pieza vuelve al banco. Si se suelta en otro lado, el holograma marca el lugar correcto.

**Modo mecánico, módulo 1** (Iván eligió los tres niveles el 15/11, decisión 3a):
1. **Identificar:** «Señalá el ignitor»: el alumno apunta el rayo al holograma; si acierta, la pieza se pone verde y sale su
   nombre; si no, se le dice qué señaló. Para eso cada malla de `engine.js` lleva el nombre de su pieza (cambio mínimo y anotado
   en la copia) y el rayo lee la pieza del triángulo que toca.
2. **Ubicar:** las piezas del banco (arriba).
3. **Inspeccionar:** en cada pieza, qué se mira (por ejemplo erosión y fisuras en el álabe, carbón en el inyector, desgaste del
   electrodo del ignitor, objetos extraños y roturas en la malla, virutas en el detector, la punta y el cable de la termocupla)
   [AGREGADO, VERIFICAR]. **Lo escribe o lo valida alguien de AAXOD** (decisión 3b) y va en `taller/mecanico.js`, aparte del
   código. Cómo se arma: primero un borrador con conocimiento general, todo [AGREGADO] / [VERIFICAR], en una tabla fácil de
   corregir (pieza · qué se mira · qué se busca · qué queda para el manual); lo corrige quien valide (todavía no se sabe quién: 3b,
   15/11), y el modo mecánico no se publica hasta tener esa validación.
- Al final, los aciertos por tarea, como el debrief de los niveles (sin constancia ni envío al aula en esta versión).

## 8. Presupuesto para el Quest
Lo medido: la escena de la cabina en PC (11/11) da 296 llamadas, 191 k triángulos y 43 texturas, y **en el Quest no se midió
nada**. En VR cada llamada se dibuja una vez por ojo. Meta del taller: **72 cuadros por segundo en un Quest 2** (90 en un Quest 3),
con esto en la peor vista:

| Pieza | Hoy (medido) | Meta |
|---|---|---|
| Motor del simulador tal cual | 105 llamadas · ~156 k tri (120 k son las partículas) | holograma: ≤ 20 llamadas · ≤ 40 k tri |
| AT-802 (`juegos/at802.glb`) | 9 llamadas · 71 k tri · 2,5 MB (el LOD: 5 · 15 k · 0,9 MB) | igual; si hace falta, el nodo `cabina` se apaga (−4 llamadas, −9 k tri) |
| Cessna 172 (Sketchfab) | sin medir: hay que bajarlo | ≤ 6 llamadas · ≤ 40 k tri · texturas ≤ 2048, una sola imagen si se puede |
| Hangar (nave y zonas) | — | ≤ 15 llamadas · ≤ 30 k tri · ≤ 4 texturas de 1024 |
| Mesa, proyector y cuadrante | — | ≤ 6 llamadas · ≤ 5 k tri |
| Banco y las seis piezas | — | ≤ 8 llamadas · ≤ 10 k tri |
| Paneles, llamadas y leyenda | — | ≤ 10 llamadas |
| **Total** | | **≤ 75 llamadas · ≤ 200 k tri · ≤ 12 MB de descarga** |

- **Lo caro de un holograma no son los triángulos sino el relleno:** capas aditivas una encima de otra. Se controla con el
  holograma chico en la vista y apagándolo de a poco si la cabeza se mete adentro (a menos de 20 cm).
- **Sin postproceso, sin sombras en tiempo real, sin PMREM.** Texto en canvas que se redibuja sólo al cambiar. El motor a paso
  fijo (1/120 s, como la física de la cabina y la prueba contra `vuelo.js`), aparte del dibujo.
- **Se mide en cada etapa** con `renderer.info` en PC (llamadas y triángulos) y se anota acá; el número que manda es el del Quest,
  que mide Iván.

## 9. Etapas: bloques de trabajo de 3 horas o más
Pedido de Iván (15/11): cada etapa es un plan de trabajo de **3 horas como mínimo**, pensado para largarlo entero y que corra solo
hasta el cierre, sin esperar respuestas en el medio. Son 10 etapas (T1 a T10) de 3 a 3,5 horas: unas 33 horas en total (§14). Se
larga con «arrancá T1» (y así cada una); conviene dar al principio los permisos que pida la app (Blender, el servidor, Node).

**El primer bloque (15/11/2026, de 14:21 a 16:10; v=20261115d; sin publicar; en el Quest no se probó nada):** la T1 HECHA y,
adelantadas dentro del mismo bloque, la T2, T3, T4, T5, T8 y T9 (la T9 en local, detrás de `?mecanico=1`), el tramo 1 de la T6 (el
AT-802; el Cessna espera la descarga de Iván), los tramos 1 a 3 de la T7 y de la T10 (sin publicar ni tocar el juego). Se cerró a
las 1 h 50 min y no a las 3 h porque **lo que queda depende de Iván**: el look del holograma y su ok a la mesa, la nave, la ronda,
el banco y la forma de ubicar; bajar el Cessna; quién valida el modo mecánico (3b); probar en el Quest y el ok para publicar. Cada
etapa tiene abajo lo hecho, lo medido, los hallazgos y lo que falta. Pruebas por consola: `__taller.probarMandos()` 24,
`probarPiloto()` 15, `probarMecanico()` 5 y `probarIdentificar()` las seis piezas; y `node herramientas/taller_prueba_motor.mjs`.

**Cómo es cada bloque (vale para todas):**
- **Arranque (15 min):** leer este plan y `CLAUDE.md`, `git status`, levantar `servidor.py`, medir el punto de partida
  (`renderer.info` y la prueba del motor) y anotar la hora.
- **Tramos de 30 a 75 min**, en el orden de la tabla de la etapa. Cada tramo termina con su chequeo automático, una captura revisada
  con ojo crítico (lo raro se corrige en el momento: no se espera a que lo marque Iván) y un commit local, así el avance queda en git
  aunque el bloque se corte.
- **Autonomía:** se decide solo lo chico y reversible (medidas y colores provisorios, nombres internos, el orden de los tramos) y se
  marca [PROVISORIO]. Lo que es de Iván pero no frena se anota como pregunta para el cierre y se sigue con lo provisorio. Se para
  sólo si algo contradice una decisión suya o este plan, o si habría que tocar lo publicado.
- **Mínimo de 3 horas:** si lo principal termina antes, se sigue con la **reserva** de la etapa, en orden: siempre trabajo útil
  (pruebas, pulido, documentación o lo que adelanta la etapa siguiente sin decidir por Iván). Se cierra antes de las 3 horas sólo
  si algo bloquea de verdad, y se dice qué.
- **Cierre (30 min):** la ronda de vistas de la etapa, revisada (lo raro se corrige antes de mandarla); la etapa marcada HECHA con
  fecha y versión en este plan; `CLAUDE.md` al día; commit local; y a Iván: las capturas, qué se hizo, qué quedó provisorio y las
  preguntas juntadas, de a una. Nada se publica, y siempre se dice lo que no se pudo probar (el Quest).

### T1 — Base y holograma en una sala gris (3,5 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:00 | `taller.html` y `taller/main.js`: renderer, VR (`local-floor`), jugador, caminar en PC y en VR, ganchos (`__taller`, `__ronda`, `__vista`); una sala gris con una mesa provisoria | carga sin errores y se camina |
| 1:00–1:30 | Copias: `content.js` (igual a la fuente), `engine.js` (imports) y `motor.js` con las cifras de la cabina, con su prueba en Node contra `vuelo.js` (ralentí, plena potencia y arranques normal, caliente y colgado); el motor con sus materiales originales y las palancas en el teclado | la prueba da bien; `renderer.info` muestra las 105 mallas |
| 1:30–2:30 | `holograma.js`: juntar por cuerpo que gira con `tag` / `prim` / `pieza`; sombreador (fresnel, barrido, parpadeo); aislar y cortar por uniforms; contornos | ≤ 20 llamadas y ≤ 40 k tri; las 8 estaciones se aíslan |
| 2:30–3:00 | Flujo como puntos de luz con sus 4 colores; efectos (llama, chorros, chispas, estampido, escombros, álabes dañados); proyector y cono | las 5 fallas se ven |
| 3:00–3:30 | Cierre: capturas de frente y de 3/4, las 8 estaciones, el corte, el flujo y las 5 fallas, al lado de las mismas vistas del escritorio (`turbohelice.html` en local) | — |

- **Reserva:** dos o tres variantes de color y de acento para que Iván elija; cuánto margen de rendimiento queda (con el doble de
  partículas); la prueba del motor como script de un solo comando (`herramientas/taller_prueba_motor.mjs`).
- **Al cierre, Iván:** elige el «look» del holograma (color, brillo, acento).

**T1 HECHA el 15/11/2026 (bloque arrancado a las 14:21; lo principal y la verificación, a las 14:45; v=20261115a, sin
publicar; en el Quest no se probó nada).** Lo que quedó:
- `taller.html` + `taller/main.js`: sala gris, mesa provisoria con el proyector y la leyenda en un cartel de mesa (letra de 2,5 cm),
  caminar en PC (WASD + mouse) y en VR (joystick izquierdo; derecho, giro de a 30°), la lógica de `live.js`, teclas del motor (H =
  ayuda) y ganchos `__taller` (estación, falla, arrancar, ralenti, corte, flujo, correr, medir, hud), `__ronda(1..6)` y `__vista`.
  `?holo=0` muestra el motor con sus materiales originales.
- `taller/content.js` idéntico a la fuente; `taller/engine.js` con sólo los dos imports cambiados; `taller/motor.js` con las cifras de
  la cabina: `node herramientas/taller_prueba_motor.mjs` lo compara con `vuelo.js` en 6 casos (arranque y ralentí, plena potencia,
  caliente, colgado, bandera, corte) y da **diferencia cero**; también revisa que `content.js` siga igual a la fuente.
- `taller/holograma.js`: 84 mallas sólidas → 8 cuerpos (lo fijo, generador de gas, turbina libre, solar, portasatélites y 3 satélites;
  qué gira se averigua probando el update), sombreador aditivo con fresnel, barrido y parpadeo, aislado y corte por uniforms,
  contornos en los 4 cuerpos grandes, flujo como 1500 puntos de luz, chorros y chispas juntados, y `crearProyector`.
- **Medido (PC):** escena entera 30–32 llamadas, 36,6 k tri, 1500 puntos, 12,1 k segmentos (con `?holo=0`: 118 y 157 k); el holograma
  ≤ 16 llamadas y 33,3 k tri (meta: 20 y 40 k); JavaScript por cuadro 0,26 ms (el update del motor, 0,1 ms). El relleno en la GPU del
  Quest sólo lo puede medir Iván.
- **Hallazgos:** (1) la llama, aditiva y sin nada que la tape, sumada al celeste daba un bloque blanco: va al 10 %; el estampido de la
  pérdida de compresor no se atenúa (es la pista de esa falla); (2) el flujo aditivo saturaba sin corte y el gris del escape desaparecía:
  va con mezcla normal y se ven los cuatro colores del escritorio; (3) con tantas capas, poca intensidad por capa (base 0,035, borde
  0,42); (4) con el panel del navegador escondido, las capturas salen viejas: mostrarlo antes de la ronda.
- Capturas (fuera del repo): `Documents/aurav-cabina/capturas_taller/T1_holograma.jpg` (vistas, 7 estaciones, fallas, sin corte y el
  escritorio de referencia) y `T1_variantes_color.jpg` (A celeste + ámbar, B celeste + blanco, C celeste + lima de AURAV, D azul +
  naranja). **Iván eligió la A, celeste y ámbar (15/11, «1 · Celeste y ámbar»): es la que ya estaba en el código.**

### T2 — Mesa, palancas, instrumentos y fallas (3,5 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:30 | `taller_mesa.py` (Blender): mesa, proyector, cuadrante con `levPLA`, `levCL` (3 muescas) y `levPROP` con `piv` / `eje` / `ang` / `pos`, botones ARRANCAR y A RALENTÍ, lámparas; renders Eevee e informe | ≤ 6 llamadas y ≤ 5 k tri |
| 1:30–2:15 | Integrar con `controles.js` (grip en VR, clic en PC) y la lógica portada de `live.js` (`toIdle`, `toOff`, `pressStart`, la condición que pasa sola a ralentí, las fallas); lámparas | arranques normal, caliente y colgado con las palancas 3D |
| 2:15–3:00 | Paneles INSTRUMENTOS (barras, zonas, valor grande, el aviso de valores ilustrativos) y FALLAS con la alerta roja | las 5 fallas desde el panel |
| 3:00–3:30 | Cierre: rayos desde el ojo a las palancas y a los paneles con la cabeza corrida ±8 cm; legibilidad en capturas a la resolución del Quest | — |

- **Reserva:** la turbina de `audio.js` siguiendo a Ng y Np; la pausa (B/Y) con su menú; los mandos de VR simulados por código
  (rayos y agarre desde las manos).
- **Al cierre, Iván:** ok a la mesa y al cuadrante.

**T2 ADELANTADA y HECHA dentro del bloque de la T1 (15/11/2026, 14:45–15:00; v=20261115b; sin publicar; en el Quest no se probó
nada).** Lo que quedó:
- `herramientas/taller_mesa.py` (Blender 5.2, con `cab_comun.py`) → `taller/mesa.glb` (1132 tri, 13 mallas: 5 fijas por material +
  3 palancas + 2 botones + 3 lámparas; 76 KB) y `taller/mesa_informe.json`. Mesa de 1,60 × 0,80 m a 0,90 m con estante; a la derecha
  del canto, la caja del cuadrante con las tres palancas en el orden del AT-802 (POTENCIA plateada con manija en T, HÉLICE azul,
  CONDICIÓN roja con 3 muescas), los botones ARRANCAR y A RALENTÍ y las tres lámparas en columna. Los datos de los rótulos viajan en
  `userData.cuadrante`.
- `taller/paneles.js`: `crearPanel` (canvas con botones y rayo), `crearPanelMotor` (INSTRUMENTOS con los rangos del MVP-50 y
  FALLAS, con la leyenda al pie), `crearCartel` (estación y alerta arriba del holograma) y `crearPlacaCuadrante` (rótulos de 1,5 cm).
- `taller/main.js`: las palancas con `controles.js` (VR: grip a menos de 10 cm; PC: se arrastran), sincronizadas con el motor en los
  dos sentidos (en el arranque la condición se mueve sola a su muesca); botones que se hunden; lámparas como el escritorio; el panel a
  1,2 m (0,68 × 0,97 m); el cartel; la leyenda pasa al canto izquierdo (3 renglones, letra de 2,5 cm); la turbina de `audio.js` con un
  golpe en cada estampido; la pausa de VR con B/Y (`panelvr.js`); ganchos `tocar(id)`, `palanca(nombre, ang)`, `pausa()`,
  `rayosDesdeElOjo()` y las vistas 7 a 9 de `__ronda`.
- **Verificado en PC:** potencia adelante → Ng 100 %; condición soltada entre muescas → la más cercana; hélice atrás → bandera (Np → 0);
  el arranque entero con sus lámparas; las 5 fallas desde el panel; el cartel con la estación y con la alerta; **rayos desde el ojo y
  con la cabeza corrida ±8 cm: libres** a la leyenda, el cuadrante, las puntas de las tres palancas, los botones, el panel (arriba,
  centro y fallas) y el cartel. Escena: 44 llamadas, 37,9 k tri.
- **Hallazgos:** (1) el panel de 0,56 m a 1,3 m daba letra de 1,6 cm: pasó a 0,68 m a 1,2 m (2 cm); (2) en fila, los rótulos de las
  lámparas no pasaban de 0,8 cm: van en columna con el rótulo al costado; (3) la manija en T de 7,2 cm tapaba el rótulo de la hélice:
  5,6 cm; (4) ARRANCAR sólo arranca con el motor parado (Ng < 25 %), como en el escritorio; (5) la mesa da 13 llamadas (el presupuesto
  decía 6): palancas, botones y lámparas son mallas sueltas para agarrarlas y prenderlas; la escena entera sigue en 44.
- Capturas: `Documents/aurav-cabina/capturas_taller/T2_mesa_y_paneles.jpg`.
- **Ok de Iván a la mesa, el cuadrante y los paneles: 15/11 («Quedan así»).**
- **Pregunta para Iván:** el TORQUE se pone rojo desde 85 % porque así son los arcos del MVP-50 de la cabina (verde 0–85, rojo
  85–100): a plena potencia se ve rojo, en el taller y en la cabina. ¿Está bien así o se corrige en los dos? **Respuesta de Iván (15/11): «Dejarlo así»: el arco queda verde 0–85 y rojo 85–100 en los dos.**

### T3 — Estaciones, llamadas, preguntas y recorrido (3,5 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:15 | Panel ESTACIONES y el texto de la estación arriba del holograma; llamadas 3D (etiquetas a los costados, líneas hasta los puntos de `PARTS`, de cara al alumno) | las 8 estaciones con sus llamadas |
| 1:15–1:45 | Panel VISTA (CORTE · COMPLETO · FLUJO · RECORRIDO · PREGUNTAS · VOLVER A LA MESA) y la leyenda fija (canto de la mesa y pie de cada panel) | el rayo desde el ojo llega a la leyenda desde las 3 posiciones |
| 1:45–2:30 | Preguntas en VR (orden de `ORDER`, ✓ o ✗, resultado) y `recorrido.js` (el guion de `tour.js` girando el holograma, con las palancas que se mueven solas) | las 6 preguntas; el recorrido de 82 s entero |
| 2:30–3:00 | Agarrar el holograma: girar, acercar, agrandar hasta 1:1, «volver a la mesa» | sin saltos ni temblores |
| 3:00–3:30 | Cierre: capturas de cada panel, de una estación con sus llamadas y del recorrido en tres momentos | — |

- **Reserva:** atajos de PC como en el escritorio (teclas 1 a 8); el holograma que se apaga de a poco con la cabeza adentro; letra
  más grande donde la captura no se lea.
- **Al cierre, Iván:** ok al modo piloto sobre la mesa, en PC.

**T3 ADELANTADA y HECHA dentro del bloque de la T1 (15/11/2026, 15:00–15:05; v=20261115c; sin publicar; en el Quest no se probó
nada).** Lo que quedó:
- `taller/recorrido.js`: el guion de `tour.js` sin el kit (SCRIPT, inpAt, stationAt, VIEW_FN, camAt) y la traducción de cada vista
  del escritorio a una POSE DEL HOLOGRAMA: giro −az sobre la vertical, inclinación hacia el alumno lo que la elevación pase de los 19°
  con que ya lo mira parado, escala √(3,95/d) entre 0,85 y 1,6, y el punto de la estación en el centro de la mesa.
- `taller/llamadas.js`: las 2–3 llamadas de cada estación como etiquetas en dos columnas (±0,42 m, 12 cm hacia el alumno) con una
  línea y un punto rojo hasta su pieza (`PARTS`); siguen al holograma cuando gira o se agarra.
- `taller/paneles.js`: `crearPanelEstaciones` (las 8 estaciones y VISTA: CORTE · COMPLETO · FLUJO · RECORRIDO · PREGUNTAS (6) · A LA
  MESA) y `crearPanelPreguntas` (las 6 con su `ORDER`, ✓ o ✗ con la correcta, «n de 6» y el aviso).
- `taller/main.js`: el panel de la izquierda en espejo del derecho; el recorrido en vivo (cualquier toque del alumno lo para y el motor
  sigue desde ahí); la pose del holograma que sigue de a poco a la vista de cada estación; las preguntas delante del holograma, que se
  atenúa; agarrar el holograma (VR: grip cerca; una mano lo lleva y lo gira, dos manos lo agrandan de 0,2 a 1:1 · PC: rueda = tamaño,
  Shift + arrastre = giro); «A LA MESA» o la tecla M lo devuelven; teclas T (recorrido) y P (preguntas); vistas 10 y 11 de `__ronda`.
- **Verificado en PC:** el recorrido de 82 s entero (las 8 poses, las palancas solas en la 8 con Ng 78 %, el arranque caliente con la
  alerta a los 66 s, el corte a los 74 y la vuelta a ralentí a los 79); las 6 preguntas; la rueda, Shift + arrastre y A LA MESA;
  **rayos desde el ojo y con la cabeza corrida ±8 cm, libres** a los dos paneles, las tres llamadas, el cartel, las preguntas, la
  leyenda y las puntas de las palancas. Escena: 52–54 llamadas, 38 k tri.
- **Hallazgos:** (1) a ±0,5 m, la columna izquierda de llamadas tapaba el borde del panel de estaciones: van a ±0,42 m y 12 cm hacia
  el alumno; (2) la prueba de rayos daba falsos «tapa» con las líneas (three.js las toma con 1 m de margen): ahora mira sólo mallas.
- **Sólo se puede probar en el Quest:** agarrar el holograma con el grip y agrandarlo con las dos manos, el grip en las palancas, el
  rayo con el gatillo en los paneles y la pausa con B/Y.
- Capturas: `Documents/aurav-cabina/capturas_taller/T3_estaciones_preguntas_recorrido.jpg`.

### T4 — La nave del hangar (3,5 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:30 | `taller_hangar.py` (Blender, por vértices): piso con losas, juntas y sendas amarillas, el sector del taller; columnas, arcos calados, correas, chapa acanalada de paredes y techo | renders Eevee de la nave vacía |
| 1:30–2:15 | Portón corredizo abierto en parte y el fondo de afuera (plataforma, pasto, cielo); luminarias emisivas; la marca de AURAV | — |
| 2:15–3:00 | Luz horneada (oclusión y luz de techo a colores por vértice; si no sale, a mano: más oscuro abajo y en los rincones); integrar en `taller.html` | ≤ 15 llamadas y ≤ 30 k tri |
| 3:00–3:30 | Cierre: el portón desde adentro, la nave entera desde el portón, el techo y la mesa con la nave atrás | — |

- **Reserva:** variantes de color del piso y la chapa; niebla suave para la profundidad; los chequeos de `cab_comun.py` adaptados a
  la nave (nada flotando, nada superpuesto en el mismo plano).
- **Al cierre, Iván:** ok a la nave y a las medidas inventadas de §4.

**T4 ADELANTADA y HECHA dentro del bloque de la T1 (15/11/2026, 15:05–15:40; v=20261115d; sin publicar; en el Quest no se probó
nada).** Lo que quedó:
- `herramientas/taller_hangar.py` (Blender 5.2, con `cab_comun.py`) → `taller/hangar.glb` (8654 tri, 6 mallas = 6 llamadas, 0,77 MB) y
  `taller/hangar_informe.json`: la nave de §4 con las medidas provisorias (40 × 60 m; arco de 6 a 12 m, radio 36,33 m; 9 arcos cada
  7,5 m). Piso de hormigón en grilla de 1 m con juntas aserradas cada 5 m y las sendas amarillas de H2–H5 y de los pasillos; paredes y
  techo de chapa (la textura acanalada la pone el juego en canvas: el GLB trae coordenadas en metros) sobre un zócalo de hormigón;
  columnas, arcos de 0,74 m de **alma calada** (agujeros de Ø 0,46 m cada 0,75 m, por textura con `alphaTest` y `alphaToCoverage`;
  los extremos, macizos) y correas; el portón de 30 × 8 m abierto 12 m, con las hojas apiladas a los costados y su riel; 40
  luminarias LED (discos que brillan, colgados de su cable); afuera, la plataforma y el pasto.
- **Luz horneada analítica en colores por vértice** (sin bake de Blender: con este look no hacía falta una textura grande): el piso
  más oscuro junto a las paredes y bajo las dos manchas de las aeronaves (sombras de contacto), las paredes más claras arriba.
- `taller/main.js`: el hangar corrido +45 m (el sector del taller cae en la mesa; el alumno mira hacia el fondo, con el portón a la
  espalda); el cartel «AURAV · TALLER DE MOTORES · VER PARA VOLAR» (8 × 2,34 m) en la pared del fondo a 6,8 m, detrás y por encima
  del holograma; el cielo de fondo; caminar con límites (paredes, el portón sólo por el hueco, la mesa); las vistas 12 a 16 de
  `__ronda` (la nave desde la mesa, desde el portón, el techo, un rincón alto, afuera). Si el GLB no carga, queda la sala gris.
- **Medido (PC):** el hangar, 6 llamadas y 8,7 k tri (meta: 15 y 30 k); la escena entera desde el puesto de trabajo, 50 llamadas y
  46,7 k tri.
- **Hallazgos:** (1) con el «suelo» del hemisferio oscuro, el techo y los arcos quedaban negros (de abajo sólo los ilumina el
  hemisferio): el suelo pasa a 0xcfd3d8, que hace de rebote del piso; (2) la chapa con mucho contraste (200 ± 55) oscurecía el techo:
  222 ± 33; (3) arcos y correas llegaban a 4 cm de la chapa y el cable de las luces a 5 cm: ahora 1 cm y 5 mm; (4) el cartel a 4,6 m
  quedaba a la altura de los paneles vistos desde la mesa: a 6,8 m; (5) en Eevee la nave sale oscura (el techo tapa las luces de
  afuera): las vistas que valen son las del navegador.
- Quedan de la reserva: variantes de color y niebla (la nave se lee bien sin niebla; el color, si Iván lo pide).
- Capturas: `Documents/aurav-cabina/capturas_taller/T4_nave.jpg`.
- **Ok de Iván a la nave y a sus medidas: 15/11 («Quedan así»).**

### T5 — Zonas, muebles, partida y saltos (3,5 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:30 | Muebles livianos por script: bancos de trabajo, tableros de herramientas con siluetas, cajoneras rojas, estanterías, compresor, ventiladores, matafuegos y lavaojos (H6); la oficina vidriada (H7) | dentro del presupuesto del hangar |
| 1:30–2:15 | Utilería de los puestos: calzas, escalera y conos (H3); gatos, carro, bandeja y cartel «EN MANTENIMIENTO» (H4); sombras de contacto | — |
| 2:15–3:00 | Atril de partida (elección de modo, leyenda, créditos); puntos de salto con fundido; caminar con choque simple (paredes, mesas, aviones) | se llega a cada zona en VR y en PC |
| 3:00–3:30 | Cierre: la ronda fija de §10 entera | — |

- **Reserva:** carteles de seguridad genéricos; sonido ambiente del hangar; más detalle en los tableros de herramientas.
- **Al cierre, Iván:** ok a la ronda.

**T5 ADELANTADA y HECHA dentro del bloque de la T1 (15/11/2026, 15:25–15:45; v=20261115d; sin publicar; en el Quest no se probó
nada).** Lo que quedó:
- `herramientas/taller_muebles.py` (Blender, con el `Malla` de `taller_hangar.py`) → `taller/muebles.glb` (5,6 k tri, 5 llamadas,
  0,5 MB; mismo marco que el hangar) y `taller/muebles_informe.json`. H6: 3 bancos de trabajo con su tablero de siluetas (en el del
  medio **falta una llave**: queda como gancho para el control de herramientas del modo mecánico, T8–T9), 2 cajoneras rojas con
  ruedas, 2 racks (parantes azules, largueros naranja, cajas), compresor de tanque horizontal, 2 ventiladores de tambor, matafuegos en
  las columnas y un lavaojos. H7: la oficina vidriada (marcos blancos, puerta, cielorraso, escritorio, silla) con el **pizarrón de
  los créditos**. H4: carro, bandeja y el cartel de pie «EN MANTENIMIENTO». H2: el atril. Sombras de contacto (cuadrados con una
  mancha en canvas) y 23 rectángulos de choque en `userData.choques`. Las calzas y los gatos van con los aviones (ver T6).
- `taller/paneles.js` `crearPanelAtril`: TALLER DE MOTORES · AURAV, **MODO PILOTO** (lleva a la mesa), **MODO MECÁNICO** (apagado:
  en preparación), IR A la mesa, el AT-802, el Cessna, los bancos y los créditos, y la leyenda al pie (0,88 × 0,48 m, letra de 2 cm).
- `taller/main.js`: los muebles colgados del hangar (vidrio, sombras, créditos y cartel en canvas); el choque al caminar contra la
  mesa y los muebles (se sale por el lado más cercano, con 25 cm de cuerpo); **saltos con fundido** (`DESTINOS`: partida, mesa,
  AT-802, Cessna, bancos, oficina) que ponen la CABEZA en el destino mirando hacia adelante, sin mover la cámara a la fuerza; los
  saltos también en la pausa de VR; **se arranca en la partida** (`?inicio=mesa` arranca en la mesa) y al entrar en VR se queda donde
  se estaba; carteles de seguridad genéricos (reserva: prohibido fumar, protección auditiva, salida, atención hélice; un atlas, una
  llamada); vistas 17 a 22 de `__ronda`.
- **Verificado en PC:** los saltos (a los bancos, a la partida, a la mesa); caminando, el banco y el atril frenan al alumno a 25 cm;
  `__taller.probarMandos()` con el gatillo simulado sobre el atril (IR A · BANCOS y MODO PILOTO) entre sus 21 pruebas: 21 de 21.
- **Hallazgos:** (1) las texturas de canvas sobre mallas del GLB salían dadas vuelta: con coordenadas de glTF va `flipY = false`;
  (2) un matafuego caía adentro del rack: a la derecha van en las columnas 1, 3 y 6; (3) la escalera adentro de la zona chocaba con el
  ala: se puso junto al capó cuando llegó el avión; (4) con el panel del navegador en otra pestaña el juego no avanza: las pruebas
  corren con `__taller.correr(t)`.
- Queda de la reserva: el sonido ambiente del hangar (`audio.js` no tiene; habría que sintetizarlo).
- Capturas: `Documents/aurav-cabina/capturas_taller/T5_muebles_partida_AT802.jpg`.
- **Ok de Iván a los muebles, el atril de partida y el AT-802 en su puesto: 15/11 («Quedan así»).**

**T6, tramo 1 ADELANTADO (15/11/2026, 15:45; mismas condiciones).** El AT-802 en H3: `juegos/at802.glb` (el mismo de los otros
juegos; mismo repo, no se copia) con la nariz al portón y las ruedas principales en (−10; −14,5) del hangar; calzas amarillas en las
tres ruedas, conos en las dos punteras, detrás de la cola y delante de la hélice, y la escalera de plataforma junto al capó. **Choque
con el avión:** sus triángulos que bajan de 1,9 m, rasterizados en planta en una grilla de 20 cm (frena en el ala, el fuselaje y la
cola; se desliza por el eje libre). **Presupuesto con toda la nave a la vista: 68 llamadas y 124,7 k tri** (tope: 75 y 200 k; con el
Cessna habrá que mirar las llamadas: quedan 7). Falta el Cessna y la reserva. **Iván (15/11): «Seguir sin él» por ahora:** el puesto del Cessna queda como está (el cartel «EN MANTENIMIENTO», el carro y la bandeja, sin avión) y el Cessna se suma después, cuando lo baje de Sketchfab a `Documents/aurav-cabina/taller_fuente/cessna/`.

### T6 — Las aeronaves (3 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:00 | AT-802: `juegos/at802.glb` en H3 con su utilería (es el mismo repo: no se copia); choque al caminar; vistas desde el piso y desde arriba | — |
| 1:00–2:30 | Cessna 172: si Iván ya lo bajó, `taller_cessna.py` (Decimate, texturas a 1024–2048, capó y rueda si vienen aparte, sobre gatos) → `cessna172.glb`; la placa del crédito, y el crédito también en el panel de créditos y en el README, con el enlace al modelo, la licencia (la versión de CC BY que diga la página) y «modificado: aligerado». Si todavía no lo bajó, el puesto queda armado con un marcador y se pasa a la reserva: no frena | ≤ 6 llamadas y ≤ 40 k tri; el crédito se lee desde 2 m |
| 2:30–3:00 | Cierre: presupuesto con todo junto en la peor vista; capturas de las dos aeronaves | ≤ 75 llamadas y ≤ 200 k tri |

- **Reserva:** el motor en holograma «dentro» del capó del AT-802 (para ver dónde va); algún `at802-lod.glb` de relleno, si el
  presupuesto deja.
- **Antes de esta etapa, Iván:** bajar el Cessna («FREE Cessna 172SP», NLM Group) de Sketchfab con su cuenta y dejarlo en
  `Documents/aurav-cabina/taller_fuente/cessna/`, fuera del repo.

### T7 — Modo piloto entero (3 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:15 | El camino entero: partida → mesa → estaciones → palancas → fallas → preguntas → resumen; textos revisados | — |
| 1:15–2:00 | La voz de las 8 frases y de los avisos (`voces.py` y `voces.ps1`, Sabina) y la turbina | cada frase con su WAV |
| 2:00–2:45 | Piloto de prueba por consola (como `herramientas/piloto_prueba.js`): recorrido, arranques normal, caliente y colgado, las 5 fallas y las preguntas | pasa entero sin errores |
| 2:45–3:00 | Cierre | — |

- **Reserva:** el resumen del final (estaciones vistas, aciertos); pulido en PC; tamaños de letra.
- **Al cierre, Iván:** el modo piloto entero en PC (y en el Quest, si se puede probar sin publicar: §10).

**T7, tramos 1 a 3 ADELANTADOS dentro del bloque de la T1 (15/11/2026, 15:45–15:50; sin publicar; en el Quest no se probó
nada).** Lo que quedó:
- **El camino del modo piloto** (`camino` en `taller/main.js`): estaciones vistas (también en el recorrido), fallas probadas por el
  alumno (la del recorrido no cuenta), arranque normal hecho (cuando llega a ralentí) y la mejor nota de las preguntas; el resumen
  sale al final de las preguntas y en la pausa. Se arranca en la partida (atril) → la mesa → estaciones, palancas, fallas → preguntas
  → resumen. Los textos son los del simulador (`content.js`, igual a la fuente) y los [AGREGADO] de las T2–T3.
- **La voz del tutor:** `herramientas/voces.py` suma las 8 frases de las estaciones y los 5 avisos de falla; `voces.ps1` generó sus
  13 WAV con la voz Sabina en `voz/` (sólo se sumaron entradas a `frases.json`: la cabina no cambia). Se dicen al elegir una estación
  (también en el recorrido) y cuando aparece la alerta de una falla.
- **Pausa sola al sacarse el casco** (el `visibilitychange` de la sesión de VR), como en los niveles de la cabina.
- **Piloto de prueba por consola:** `__taller.probarPiloto()` corre el motor con el mismo cuadro del juego: arranque normal (la
  condición pasa sola a ralentí bajo, Ng 60 %, ITT máxima 699 °C), caliente (ITT 1035 °C y alerta), colgado (Ng 24 %), pérdida de
  compresor (estampidos), ingestión (más ITT y menos torque que sin falla, a la misma palanca), sobretemperatura (942 °C), el
  recorrido entero (las 8 estaciones, la potencia sola y la alerta del caliente) y las 6 preguntas todas bien y todas mal: **15 de 15**.
  Deja el camino del alumno y el holograma como estaban.
- **Hallazgos:** (1) ARRANCAR con el motor en marcha no hace nada (como el escritorio): el piloto de prueba apaga antes; (2) las
  preguntas en z 0,1 quedaban detrás de la cara del holograma y el flujo tapaba «Otra vez»: van en z 0,2; (3) el resumen decía
  «Preguntas: sin hacer» debajo de «1 de 6 correctas»: en el panel de preguntas no va esa línea.
- Falta: el cierre de la etapa con Iván (el modo piloto entero en PC) y la reserva (pulido, tamaños de letra).

### T8 — Modo mecánico 1: banco y ubicar (3,5 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:30 | `taller_piezas.py`: las seis piezas a tamaño real con su `userData`, y el banco con bandejas | ≤ 8 llamadas y ≤ 10 k tri |
| 1:30–2:15 | `agregados.js`: el detector de virutas y el anillo de termocuplas de ITT con su arnés, con `tag` / `pieza` / punto de llamada; los nombres de pieza en la copia de `engine.js` | cada pieza del holograma tiene nombre |
| 2:15–3:00 | Agarrar, soltar y volver a la bandeja; acercar → se ilumina el lugar; soltar cerca → la copia a escala; error → se marca el lugar correcto | las seis, bien y mal puestas |
| 3:00–3:30 | Cierre | — |

- **Reserva:** el borrador de la tabla de inspección (adelanta T9); sonidos de agarrar y soltar.
- **Al cierre, Iván:** ok al banco y a la forma de ubicar.

**T8 ADELANTADA y HECHA dentro del bloque de la T1, con su reserva (15/11/2026, 15:50–15:56; sin publicar; en el Quest no se probó
nada).** Lo que quedó:
- `herramientas/taller_piezas.py` (Blender) → `taller/piezas.glb` (4,1 k tri, 7 llamadas, 0,37 MB; meta 8 y 10 k) y
  `piezas_informe.json`: el banco con 6 bandejas de espuma al costado derecho del alumno, de frente a la mesa, y las seis piezas a
  tamaño real (ignitor, inyector, álabe con su perfil torcido y raíz de pino, sector de la malla, detector de virutas, termocupla),
  cada una suelta con `userData {pieza, nombre, estacion, bandeja}`, un material y color por vértice (metal, cerámica, bronce,
  cobre). Medidas genéricas **[VERIFICAR]**, no del manual. El riel con los nombres lo dibuja el juego.
- `taller/agregados.js` (aparte: `engine.js` sigue igual a la fuente): el detector de virutas abajo en la caja reductora y el anillo
  de termocuplas de ITT entre las dos turbinas (8 sondas, arnés y bornera), con `tag` / `prim` / `pieza`, más `PARTS_AGREGADAS` y
  `LUGAR_PIEZA`. Todo [AGREGADO, VERIFICAR]. Los nombres de pieza de las mallas del motor se ponen desde afuera, por material y
  estación (malla, ignitor, inyector, álabe): no hizo falta tocar la copia de `engine.js`.
- **Ubicar** (`taller/main.js`): VR, grip a menos de 10 cm; PC, clic para tomar (sigue al mouse a 45 cm) y clic para dejar. A menos
  de 40 cm del holograma el lugar de la pieza titila; soltada a menos de 12 cm de su lugar, acierto y queda una copia a la escala del
  holograma (colgada de su raíz: se mueve con él); en otro lado del holograma, error y titila el lugar correcto 3 s; lejos, vuelve
  sola. `probarMandos` suma tres pruebas de ubicar: **24 de 24**.
- **Reserva (adelanta la T9):** `taller/mecanico.js` con el **borrador de la inspección** de las seis piezas (dónde está, qué se
  mira, qué se busca, qué queda para el manual) y las tareas del módulo 1, y **`taller/INSPECCION_BORRADOR.md`**, la misma tabla para
  quien valide, con tres preguntas. Todo [AGREGADO, VERIFICAR].
- **Ok de Iván al banco y a la forma de ubicar: 15/11 («Queda así»: el lugar titila al acercar la pieza; la variante más difícil, sin marca hasta soltar, quedó descartada).** Los sonidos de agarrar y soltar se hicieron en la reserva (bips sintetizados).

### T9 — Modo mecánico 2: identificar, inspeccionar y resultado (3 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:00 | Identificar: «señalá…» con el rayo (la pieza del triángulo que toca), acierto en verde, error con el nombre de lo señalado | todas las piezas con nombre |
| 1:00–2:00 | Inspección: el borrador [AGREGADO] / [VERIFICAR] en `taller/mecanico.js` y en una tabla para quien valide (pieza · qué se mira · qué se busca · qué queda para el manual); el panel de inspección | las seis piezas |
| 2:00–2:45 | Resultado por tarea (como el debrief de los niveles); el modo mecánico queda oculto para publicar hasta la validación (3b) | — |
| 2:45–3:00 | Cierre: capturas y la tabla lista para pasarla | — |

- **Reserva:** preguntas del modo mecánico (como las 6 del piloto); más tareas de identificar.
- **Al cierre, Iván:** pasarle la tabla a quien valide, cuando lo sepa.

**T9 ADELANTADA y HECHA EN LOCAL dentro del bloque de la T1 (15/11/2026, 15:57–16:01; no se publica hasta la validación de AAXOD;
en el Quest no se probó nada).** Lo que quedó, todo detrás de `?mecanico=1` (sin eso, el botón del atril sigue apagado):
- **Identificar:** la consigna en el cartel de arriba del holograma («IDENTIFICAR · 1 DE 4 · Señalá con el rayo el ignitor…»); el
  gatillo (VR) o el clic (PC) sobre el holograma responde con la primera malla con nombre de pieza a lo largo del rayo (el holograma
  es transparente; en el holograma junto, cada triángulo sabe de qué malla vino por `userData.rangos`): acierto en verde, o en rojo
  el nombre de lo señalado. `__taller.probarIdentificar()` reconoce las seis piezas desde el ojo del alumno.
- **Ubicar e inspeccionar:** las seis piezas en su lugar (T8); con una pieza en la mano, el panel de atrás del banco
  (`crearPanelMecanico`) muestra su tabla (qué se mira, qué se busca, qué queda para el manual) con el aviso del borrador.
- **Resultado** por tarea en el mismo panel (identificar n de 4 y sus errores, ubicar 6 de 6 y sus errores, inspeccionar las piezas
  vistas). `__taller.probarMecanico()`: **5 de 5**. Bips sintetizados al tomar, acertar, errar y devolver (reserva de la T8).
- **La tabla para quien valide:** `taller/INSPECCION_BORRADOR.md` (la misma de `taller/mecanico.js`), con tres preguntas.
- Falta: quién valida (decisión 3b) y su corrección; las preguntas del modo mecánico (reserva).

### T10 — Rendimiento, Quest y publicar (3 h + Iván)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:15 | Medición en la peor vista y ajustes (juntar lo que falte, bajar texturas); `?v=` en todo | ≤ 75 llamadas, ≤ 200 k tri y ≤ 12 MB |
| 1:15–2:00 | `prevuelo_pages.py` ampliado al taller; el botón «Taller de motores» en el menú del juego y el de volver (lo único que se toca del juego); la versión de la página | ningún archivo faltante |
| 2:00–2:45 | Guía para Iván: cómo probar en el Quest (con `adb reverse` o publicando) y qué mirar en el casco (fluidez, legibilidad, alcance, agarrar, mareo); `CLAUDE.md` y este plan al día | — |
| 2:45–3:00 | Cierre | — |

- **Publicar, sólo con su ok:** el push en primer plano con la cuenta Ivan-I-Aguilar y después mirar la página publicada (sin
  errores ni 404). Si nadie validó el modo mecánico, se publica con el modo piloto y el mecánico queda oculto (sólo en local).
- **Reserva:** el README del taller; los ajustes que salgan de su prueba.

**T10, tramos 1 a 3 ADELANTADOS en lo que no necesita a Iván (15/11/2026, 16:02–16:06; sin publicar).** Lo que quedó:
- **Rendimiento:** lo opaco con color por vértice de la nave y de los muebles se junta al cargar en una malla a doble cara (de 4
  llamadas a 1) y el AT-802 es un `THREE.LOD` (de lejos, más de 12 m, el `at802-lod.glb` de `juegos/`). **Peor vista, con todo a la
  vista: 68 llamadas y 72,6 k tri** (antes 75 y 125 k; tope 75 y 200 k: quedan 7 llamadas para el Cessna). Descarga ≈ 7,5 MB (los
  GLB 5,1 MB y three.js 2,2 MB; tope 12 MB).
- **`prevuelo_pages.py`** revisa también `taller.html` y los módulos de `taller/`: nada que arreglar. **El botón del juego no se
  agregó:** si se suma antes de que Iván decida publicar el taller, saldría con la próxima publicación de la cabina.
- **Guía para Iván:** `taller/PROBAR_EN_EL_QUEST.md` (servirlo desde la PC, abrirlo en el Quest por el cable con `adb reverse` [a
  probar], qué mirar en el casco y lo que desde la PC sólo se probó con los mandos simulados).
- **La ronda fija de §10 con un comando:** `await __rondaFija(n)` (n = 1..11; la 7, el Cessna, falta). Lámina:
  `Documents/aurav-cabina/capturas_taller/ronda_fija_15_11.jpg`.
- Falta, todo de Iván: probar en el Quest, el ok para publicar (y entonces el botón del juego y la versión de la página).

## 10. Verificación (en cada etapa)
**Automática, antes de mirar:** presupuesto (`renderer.info` y el informe de cada GLB); carga sin errores ni 404
(`prevuelo_pages.py`); el motor del holograma da las mismas cifras que el de la cabina (prueba en Node contra `vuelo.js`: si la
cabina cambia, avisa); los paneles y la leyenda alcanzados por rayos desde el ojo.

**Visual, ronda fija** con `__ronda(n)`, de día y las mismas cada vez [PROVISORIA]: 1 partida mirando hacia adentro · 2 mesa de
frente · 3 mesa de 3/4 desde la izquierda · 4 holograma de cerca con una estación aislada · 5 banco de componentes · 6 AT-802 de
3/4 delantero · 7 Cessna con su crédito · 8 bancos y herramientas · 9 portón desde adentro · 10 la nave entera desde el portón ·
11 techo. Se le mandan a Iván; él decide si quedó.

**Funcional:** el modo piloto por consola (T7) y el mecánico tarea por tarea (T8 y T9).

**En el Quest:** sólo Iván. Para probar sin publicar hay una vía (a probar): con el Quest en modo desarrollador y
`adb reverse tcp:8765 tcp:8765`, el navegador del Quest abre `http://localhost:8765/taller.html` servido por la PC (localhost
cuenta como seguro y WebXR anda). Si no, se publica, con su ok.

## 11. Riesgos y cómo se cubren
| Riesgo | Cómo se cubre |
|---|---|
| Que el holograma no dé en el Quest (relleno de capas aditivas) | juntar por cuerpo, partículas como puntos, holograma chico en la vista, se apaga de a poco con la cabeza adentro, medición en cada etapa |
| Paneles ilegibles en el casco | letra ≥ 1,5 cm a 1 m, rayos desde el ojo, capturas a resolución del Quest, prueba de Iván |
| Contornos que titilan (líneas de 1 px) | se miran en T1; si molestan, queda sólo el brillo de borde |
| Mareo al recorrer una nave de 60 m | puntos de salto con fundido, giro de a 30°, nunca mover la cámara del alumno |
| Un Cessna de Sketchfab pesado o sin piezas separadas | aligerarlo por script; si no trae el capó aparte, «en reparación» con gatos, carro y tapas de utilería |
| Contenido del modo mecánico equivocado | [AGREGADO] / [VERIFICAR] y validación de AAXOD antes de publicar |
| Dos modelos de motor con cifras distintas | decidido el 15/11: manda la cabina; una prueba en Node compara el holograma con `vuelo.js` |
| Licencia del exterior del AT-802 | decidida el 15/11: uso interno; si algún día se muestra afuera, el AT-802 se apaga con un parámetro |
| Que el taller se aparte del simulador de escritorio sin querer | copias con lo cambiado anotado arriba (las cifras del motor se apartan a propósito: decisión 5) |
| El Quest cachea | `?v=` en todo lo que cambie |
| Romper el juego publicado | página aparte (decidida el 15/11); del juego sólo se toca el botón de entrada |

Opcional (en la reserva de T6): el motor en holograma «dentro» del capó del AT-802 (para ver dónde va) y algún `at802-lod.glb` de
relleno.

## 12. Lo que falta saber
- **Qué Quest** usan Iván y los alumnos (2, 3 o 3S): fija el presupuesto.
- **El Cessna:** cuánto pesa de verdad (triángulos, texturas), si trae capó, hélice y ruedas separadas, y qué versión de CC BY
  tiene. Se sabe al bajarlo.
- **Quién de AAXOD valida** el modo mecánico (decisión 3b: Iván todavía no lo sabe, 15/11).
- **Las medidas del hangar** que le gusten a Iván (las de §4 son inventadas).
- **Cuándo llega el manual** del motor real (para cambiar el genérico).
- Si más adelante el taller tiene que **mandar resultados al aula virtual**, como los niveles (J5 de `PLAN_JUEGO.md`): en esta
  versión, no.

## 13. Decisiones de Iván (de a una; tomadas el 15/11, salvo la 3b y el ok al plan)
1. **Licencia del exterior del AT-802** (freeware de FSX, FSN / rikoooo). Hallazgo del 14/11 (`PLAN_AVION_JUEGOS.md` §3.5): los
   readme que tenemos no traen términos (el del Fireboss sólo lista archivos; el terrestre no trae readme). · 1 · el taller queda
   de uso interno, como la cabina (lo que rige hoy) · 2 · modelar un exterior propio en Blender, para poder mostrarlo afuera
   (trabajo grande, plan aparte; mientras tanto rige 1) · 3 · buscar los términos de la descarga o pedirle permiso al autor
   (mientras tanto rige 1) · 4 · otra. **Elegida por Iván el 15/11: 1 · uso interno, como la cabina.** El resto del taller
   (hangar, holograma, Cessna CC BY) no tiene esa traba: si algún día se quiere mostrar afuera, el AT-802 se puede apagar con un
   parámetro.
2. **¿Página nueva o modo dentro del juego?** · 1 · página nueva `taller.html` en este repo (propuesta: liviana, no toca el juego
   publicado; un botón del menú del juego lleva al taller y otro vuelve) · 2 · modo dentro del juego (bajar del avión y caminar
   hasta el hangar del aeródromo: más continuidad, pero más peso en el Quest y toca los niveles publicados) · 3 · las dos: primero
   la página, después la puerta desde el juego · 4 · otra. **Elegida por Iván el 15/11: 1 · página nueva.**
3. **Modo mecánico:** 3a, qué hace en el módulo 1 (· 1 · identificar · 2 · identificar y ubicar · 3 · las dos más inspección ·
   4 · otra) y 3b, **quién de AAXOD lo valida**. **3a elegida por Iván el 15/11: 3 · las tres (identificar, ubicar e
   inspeccionar).** **3b (15/11): todavía no se sabe; el borrador se arma igual y el modo mecánico no se publica hasta tener quien
   lo valide.**
4. **Piezas del banco en la primera versión:** · 1 · las cuatro del traspaso (ignitor, inyector, álabe, malla de admisión) · 2 ·
   esas más el detector de virutas y la termocupla de ITT · 3 · empezar con dos (ignitor e inyector) · 4 · otra. **Elegida por
   Iván el 15/11: 2 · seis piezas.**
5. **Qué modelo de motor manda.** Hoy no coinciden: en ralentí la cabina muestra Ng 60 % e ITT ~440 °C y el holograma Ng 52 % e
   ITT 545 °C; en el arranque colgado la cabina clava el Ng en 24 % y el holograma en 36 %. · 1 · cada uno con el suyo hasta tener
   el manual, y con el manual los dos pasan a las cifras reales (con un instructor); nada publicado cambia · 2 · manda la cabina:
   el holograma toma ya las cifras de `vuelo.js` y el alumno ve lo mismo en los dos (el simulador de escritorio queda como está) ·
   3 · manda el genérico: cambian la cabina publicada y los umbrales de los niveles · 4 · otra. **Elegida por Iván el 15/11: 2 ·
   manda la cabina.** La cabina no tiene ralentí alto: el holograma lo deja en 65 % [VERIFICAR] hasta el manual.
6. **El ok al plan**, con las cinco ya incorporadas y las etapas como bloques de 3 horas o más: · 1 · aprobado, se arranca por T1 ·
   2 · aprobado con cambios · 3 · todavía no · 4 · otra. **Aprobado por Iván el 15/11: 1 · aprobado, se arranca por T1.**

## 14. Cronograma (bloques de 3 horas o más)
| Etapa | Qué | Horas | Al cierre, Iván |
|---|---|---|---|
| T1 | Base y holograma en una sala gris | 3,5 | elige el «look» |
| T2 | Mesa, palancas, instrumentos y fallas | 3,5 | ok a la mesa |
| T3 | Estaciones, llamadas, preguntas y recorrido | 3,5 | ok al modo piloto en PC |
| T4 | La nave del hangar | 3,5 | ok a la nave y a las medidas |
| T5 | Zonas, muebles, partida y saltos | 3,5 | ok a la ronda |
| T6 | Las aeronaves | 3 | (antes: bajar el Cessna) |
| T7 | Modo piloto entero | 3 | prueba el modo piloto |
| T8 | Modo mecánico 1: banco y ubicar | 3,5 | ok al banco |
| T9 | Modo mecánico 2: identificar, inspeccionar y resultado | 3 | pasa la tabla a quien valide |
| T10 | Rendimiento, Quest y publicar | 3 | prueba en el Quest y decide si se publica |
| | **Total** | **≈ 33** | |

## 15. La dinámica nueva: recorrer el avión → «ver motor» → el motor a escala real (pedido de Iván, 16/11)
**Qué dijo Iván al mirarlo en la PC (16/11), tal cual:** «Ni bien entrás, ya se escucha el ruido de un motor encendido. No tiene
sentido porque dentro del hangar no pueden estar encendidos los motores; por ahí se puede utilizar como ayuda cuando se abra el
holograma del motor. Se me ocurrió cambiar un poco la dinámica: acercarse al avión, hacer tipo un recorrido de la aeronave, una
especie de familiarización, y sobre la turbina poder seleccionar que te dé la opción de ver motor. Y ahí sí, aparecés en el banco
de trabajo con el motor así como lo tenemos preparado. Trabajaría un poco más en el tamaño: manteniendo la escala del ser humano,
el avión y esa relación, que el motor lo puedas ver en escala y rotar con la mano en esa escala. Después uno lo achica o lo
agranda según lo que considere, pero la primera impresión tiene que ser impactante, a escala, a una buena distancia donde se pueda
contemplar todo desde un punto de vista.»

**Lo que cambia (y lo que no):** cambia la ENTRADA y la PRESENTACIÓN del motor. No cambian el motor, su contenido, la mesa con el
cuadrante, los paneles, las fallas, las preguntas, el banco de componentes ni la nave, que ya tienen el ok del 15/11.

| | Hoy | Con la dinámica nueva |
|---|---|---|
| Sonido | la turbina se oía desde la partida | **HECHO el 16/11:** el motor (y la voz) sólo se oyen junto al holograma: enteros a menos de 4 m, nada a más de 9 m |
| Entrada | atril → MODO PILOTO → la mesa | atril → **RECORRER EL AVIÓN** → el AT-802 → en el motor, **VER EL MOTOR** → el motor a escala real |
| El avión | de adorno, con calzas y conos | **familiarización:** puntos numerados alrededor del avión, cada uno con su tarjeta (nombre y una o dos líneas) |
| El motor al llegar | holograma al 35 % (66 cm) sobre la mesa | **a tamaño real** (1,90 m de largo), entero a la vista desde unos 3 m; se gira con la mano a esa escala |
| Tamaño | rueda o dos manos, de 20 % a tamaño real | igual, más dos botones: **TAMAÑO REAL** y **A LA MESA** (el 35 % de hoy) |

### 15.1 El motor a escala real (la primera impresión)
- **Dónde:** en el sector del taller, el motor flota a 1:1 sobre un aro de proyección en el piso (Ø 2,6 m), con el eje horizontal y
  el costado cortado hacia el alumno, centrado a 1,45 m de alto (de 1,04 a 1,86 m: se mira de frente, parado), 2,3 m detrás de la
  mesa. El alumno aparece donde está hoy (frente a la mesa): el motor queda a **3,2 m y entra entero** (ocupa unos 33° de ancho).
- **La mesa pasa a ser el tablero de mando:** el cuadrante, los botones, las lámparas y la leyenda quedan donde están, entre el
  alumno y el motor (la tapa, a 0,90 m, no tapa nada); los dos paneles, a los costados, como hoy. El cartel de la estación y las
  llamadas se agrandan con el motor.
- **Girarlo con la mano a esa escala:** de cerca, con el grip (como hoy: una mano lo lleva y lo gira, dos lo achican o lo
  agrandan); desde el lugar del alumno, apuntando con el rayo + grip: arrastrar a los costados lo gira como un plato y arriba o
  abajo lo inclina [PROVISORIO]. En PC, Shift + arrastrar, como hoy. Con la cabeza adentro se apaga de a poco (ya está).
- **Llega parado y en silencio** [PROVISORIO, a confirmar]: lo primero que hace el alumno es ARRANCAR, y ahí aparecen el sonido, las
  lámparas y la llama. Así el sonido «ayuda», como pidió Iván.
- **Lo que hay que rehacer:** la pose base y las del recorrido (hoy pensadas para el 35 % sobre la mesa), el lugar del cartel, de
  las llamadas y del aro, los umbrales de agarre, y las pruebas por consola (mandos, piloto, mecánico), que suponen el motor al 35 %.

### 15.2 La familiarización con el AT-802
- **Recorrido alrededor del avión**, en el orden de una inspección caminando: 8 puntos numerados [PROVISORIO], cada uno un disco
  con su número flotando junto a la parte y una marca en el piso que sugiere el camino. Al acercarse (a menos de 1,5 m) o al
  señalarlo (rayo + gatillo, o clic) se abre su **tarjeta**: el nombre y una o dos líneas. Un contador («3 de 8») y, al terminar,
  el resumen en el atril y en la pausa.
- **Los puntos** (salen de los anclajes del avión de `juegos/` más algunos a mano): 1 hélice · 2 **motor** (el capó) · 3 escapes y
  toma de aire · 4 tolva y boca de carga · 5 compuerta de descarga · 6 cabina · 7 ala, flaps y tren · 8 cola y rueda de cola.
- **Los textos:** un BORRADOR mío [AGREGADO, VERIFICAR], corto, con los números de «Números del avión» de `CLAUDE.md` (que ya están
  «a validar»); Iván los corrige o los dicta. Sin su visto, no se publican.
- **En el punto del motor:** el mismo holograma aparece **a tamaño real dentro del capó** (para ver dónde va y qué tamaño tiene al
  lado del avión y de una persona) y un botón **VER EL MOTOR**: fundido, y el alumno aparece frente al motor a escala real (15.1).
  Es UN solo holograma que cambia de lugar: no suma llamadas de dibujo. [PROVISORIO: si dentro del capó no se entiende, queda sólo
  el botón.]
- El atril: el botón principal pasa a ser **RECORRER EL AVIÓN**; «IR A» sigue igual (la mesa pasa a llamarse «EL MOTOR»).

### 15.2b Cada tarjeta con su pieza en holograma, «en las manos» (pedido de Iván, 16/11)
**Qué dijo Iván:** «Podríamos ir trabajando cada una de esas tarjetas (tolva, compuerta, escape, cabina, ala, tren, cola, hélice;
motor ya está), en la cual se pueda aplicar esto de ver esa pieza tipo en tus manos, en un holograma.»

- **Cómo se ve:** en la tarjeta de cada punto, un botón **VER EN HOLOGRAMA**. La pieza aparece flotando delante del alumno, a la
  altura del pecho y de un tamaño que entra entre las manos (unos 80 cm), con el mismo aspecto del motor; se agarra, se gira y se
  agranda o se achica con los mismos gestos (grip de cerca, dos manos, o el rayo; en PC, Shift + arrastrar y la rueda). CERRAR la
  devuelve al avión. El motor es el único que además se ve a escala real (15.1).
- **Un solo mecanismo para todas:** el holograma de una pieza es la geometría del avión de `juegos/at802.glb` recortada por una caja
  (en el marco del avión), con corte limpio en el sombreador, recentrada y escalada. Sólo existe mientras está abierta (≤ 5
  llamadas de dibujo). Lo que el modelo no trae se modela por script de Blender, como la cabina.
- **De dónde sale cada una** (lo que hoy trae el modelo: `exterior` en una sola malla, `cabina` y `helice` sueltas):

| Pieza | De dónde sale | Qué le falta para estar bien |
|---|---|---|
| Hélice | el nodo `helice` del modelo (5 palas y cono), girando | nada: es la primera |
| Motor | el holograma del motor (VER EL MOTOR, a escala real) | hecho |
| Escapes y toma de aire | los caños del modelo recortados + el motor con la estación 7 (escape) aislada | — |
| Ala, flaps y tren | recorte del exterior (un ala entera con su pata) | los flaps no se mueven en el modelo: para bajarlos hay que modelarlos |
| Cola y rueda de cola | recorte del exterior | los timones no se mueven en el modelo |
| Cabina | el nodo `cabina` (la cabina liviana) | más adelante, un botón «ir al simulador de cabina» |
| Tolva y boca de carga | el lomo del fuselaje del modelo + `taller/tolva.glb` (lo de arriba y la escala de la mirilla, con las fotos: T12) | **por dentro hay que modelarla** (paredes, fondo, boca): hacen falta fotos o un plano |
| Compuerta de descarga | `taller/compuerta.glb` (la panza, las dos hojas que abren, los rieles y la cañería de carga, con las fotos: T12) | **abierta y por dentro** hacen falta fotos o un plano (la posición abierta es provisoria) |

- **De a una, como pidió:** cada pieza es un trabajo chico con su recorte, su texto de tarjeta y su captura para Iván. Orden
  propuesto [PROVISORIO]: hélice → ala y tren → cola → escapes → cabina → tolva → compuerta (las dos últimas son las que más
  enseñan del avión hidrante y las que más trabajo llevan: van cuando haya con qué medirlas).
- **En el bloque T11** entra el mecanismo y la primera pieza (la hélice); las demás, en un bloque T12 de 3 horas o más.
- **Lo que no sale del modelo no se inventa a ojo:** la tolva por dentro y la compuerta se hacen con fotos o medidas de AAXOD (las
  fotos no van al repo), y sus textos quedan [VERIFICAR] hasta que Iván los corrija.

### 15.3 El bloque de trabajo (T11, 3 horas o más, como los otros)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:30 | El motor a escala real: aro de piso, pose base a 1:1, cartel y llamadas a esa escala, TAMAÑO REAL / A LA MESA, girar con el rayo, llega parado | desde el lugar del alumno entra entero; rayos desde el ojo libres al cartel y a los paneles |
| 1:30–2:45 | La familiarización: los 8 puntos con su disco y su tarjeta, la marca del camino, el contador, el motor dentro del capó y VER EL MOTOR | se recorren los 8 en PC y con los mandos simulados; el salto deja al alumno frente al motor |
| 2:45–3:30 | El camino nuevo: el atril, el resumen, las pruebas por consola al día, el presupuesto en la peor vista (tope 75 llamadas) | las pruebas pasan enteras |
| 3:30–4:00 | Cierre: la ronda de vistas (la llegada al motor, cada punto del avión), este plan y `CLAUDE.md` al día, commit local | — |

- **Reserva:** la voz de las tarjetas (Sabina); más puntos del avión; la llegada al motor con una entrada suave (aparece de a poco).
- **Lo que no se puede probar acá:** el casco. Justo ESTO es lo que más depende del Quest: si a 3,2 m el motor entero se ve
  «impactante» y nítido, y si girarlo con el rayo es cómodo. Las capturas de la PC no alcanzan para decidirlo.

**T11 HECHA el 16/11/2026 (bloque arrancado a las 20:38, con el ok de Iván: «Sí, en ese orden»; v=20261116a; sin publicar; en el
Quest no se probó nada).** Lo que quedó:
- **El motor a escala real** (`PRESENTACIONES` en `taller/main.js`): REAL, a 1:1 (1,90 m) sobre un aro de proyección en el piso,
  2,3 m detrás de la mesa, con su centro a 1,4 m del piso y apenas inclinado (10°) hacia el alumno, que lo ve entero desde su lugar a 3,25 m; y
  MESA, al 35 % sobre el proyector de la mesa. Botones **TAMAÑO REAL** y **A LA MESA** en el panel de estaciones (teclas E y M): el
  holograma vuela solo de un lugar al otro. El cartel y las llamadas se agrandan con la presentación. En VR, de lejos, el grip con el
  rayo sobre el holograma lo gira en su lugar (10° de la mano = 30° del motor); de cerca sigue el agarre con una y dos manos. **Llega
  parado y en silencio**, con el aviso «MOTOR PARADO · Apretá ARRANCAR…». Al llegar con VER EL MOTOR se enciende de a poco (2,2 s).
- **La familiarización** (`taller/familiarizacion.js`): ocho puntos (nueve desde que el tren va aparte: ver más abajo) alrededor del avión, en el orden de una vuelta que TERMINA en el
  motor: 1 hélice · 2 escapes y toma de aire · 3 tolva y boca de carga · 4 cabina · 5 cola y rueda de cola · 6 compuerta de
  descarga · 7 ala, flaps y tren · 8 motor. Cada uno: un disco numerado que mira al alumno (verde con tilde cuando se vio) con una
  línea a su parte, una marca en el piso donde pararse y una tarjeta (nombre, dos líneas, la leyenda) que se abre a menos de 1,9 m.
  SIGUIENTE salta con fundido al punto que sigue; tocar un disco o una marca del piso lleva a ese punto. El atril: **RECORRER EL
  AVIÓN** (primer punto); «IR A · EL MOTOR». El resumen cuenta los puntos vistos. Los textos son un borrador [AGREGADO, VERIFICAR].
- **El motor dentro del capó:** a menos de 9 m de la nariz del avión, el MISMO holograma va a tamaño real dentro del capó (su eje
  sobre el de la hélice, su cubo en el cubo de la hélice), parado, entero y como una **radiografía azul** que se ve a través de la
  chapa (`holo.rayos(on)`); VER EL MOTOR, en la tarjeta del punto 8, o alejarse más de 11 m, lo devuelve al taller.
- **Piezas en holograma «en las manos»** (`taller/piezaholo.js`, §15.2b): desde su tarjeta, a 0,95 m del alumno, girables y
  escalables (grip y dos manos; en PC, Shift + arrastrar y la rueda): la **hélice** (el nodo suelto, girando), la **cola**, el **ala
  con su pata** (inclinada 55°), los **escapes** (la nariz) y la **cabina**. Las cuatro últimas se recortan del exterior con una
  caja [PROVISORIA]. **Faltan la tolva por dentro y la compuerta:** no salen del modelo, esperan fotos o medidas.
- **Presupuesto (PC):** desde la partida y el portón, 44 llamadas y 66 k tri; junto al avión 44 y 124 k (45 y 127 k con la hélice
  abierta); frente al motor a escala real 38 y 51 k (47 y 53 k en marcha y con una estación); el puesto entero desde atrás, 61 y
  56 k, el peor (tope 75 y 200 k). Se juntaron los soportes de los paneles (de 6 llamadas a 1) y lo chico del puesto de trabajo no
  se dibuja a más de 14 m.
- **Pruebas por consola:** `__taller.probarRecorrido()` 18, y 27 desde el repaso de más abajo (los ocho puntos libres de choque y con su tarjeta, el motor en el capó
  con su cubo a 0 cm del de la hélice, la hélice que se abre, se agarra y se cierra, las otras cuatro piezas, VER EL MOTOR),
  `probarMandos()` 29 (5 nuevas: 1:1 y 1,9 m, centrado, entra entero, giro con el rayo, A LA MESA), `probarPiloto()` 15 y
  `probarMecanico()` 5: todas bien. Las pruebas dejan el motor, el camino y al alumno como los encontraron.
- **Hallazgos:** (1) la luz sumada del holograma no se ve sobre el capó blanco: en el capó va con mezcla normal, como una sombra
  azul; (2) con el corte activo, dentro del capó faltaba medio motor visto desde arriba: ahí va entero; (3) el ala de canto es una
  línea: inclinada; (4) la cabina, con tantas capas sumadas, daba un bloque blanco: brillo 0,28; (5) la escalera está del lado
  izquierdo del capó: el punto del motor va del derecho; (6) fuera del cuadro las matrices no se actualizan solas: la prueba que mide
  la caja del motor las actualiza antes; (7) las capturas del navegador salen un cuadro atrasadas si no se dibuja a mano
  (`__taller.medir()` o `__ronda(n)` dos veces); (8) un comando con comillas invertidas dentro de comillas dobles fue frenado por el
  control de seguridad del shell: las ediciones con texto de JavaScript van con la herramienta de edición o con un script en archivo.
- **Provisorio, a confirmar con Iván:** los textos de las tarjetas; que el motor llegue parado; la distancia (3,25 m) y la inclinación
  del motor a escala real; ver el motor dentro del capó; el orden de los puntos; las cajas de recorte de las piezas.
- **Repaso con el mouse en la PC (16/11, después del cierre; v=20261116b):** recorriendo el camino entero con clics de verdad
  (atril → RECORRER EL AVIÓN → tarjetas → VER EN HOLOGRAMA → CERRAR → SIGUIENTE → VER EL MOTOR → rueda → Enter) salieron y se
  corrigieron: (a) en una ventana angosta la tarjeta quedaba cortada a la derecha: ahora se llega a cada punto mirando al medio
  entre el disco y la tarjeta; (b) **dos tarjetas (tolva y compuerta) quedaban metidas en el ala**, la de la compuerta con
  SIGUIENTE tapado: todas van a 1,3 m del lugar del alumno y 24° al costado de la dirección al disco (se leen igual en todos los
  puntos), con su centro a 1,45 m, a la derecha salvo esas dos (`lado: −1`); **la prueba del recorrido ahora tira rayos desde el
  ojo, con la cabeza corrida ±8 cm, a las esquinas, al centro y a los botones de cada tarjeta y a cada disco** (8 pruebas nuevas:
  es la regla de «toda placa nueva se verifica con rayos desde el ojo», que con las tarjetas no se había cumplido); (c) la pieza
  en holograma se abría encimada con la tarjeta (en el casco, justo sobre el botón que el alumno acaba de tocar): ahora **la
  tarjeta se esconde mientras su pieza está abierta y la pieza lleva arriba su RÓTULO (nombre + CERRAR)**; (d) sobre el fuselaje
  blanco la pieza casi no se veía (la luz sumada no se ve sobre lo claro): lleva un **TELÓN** oscuro y difuso detrás, de cara al
  alumno; (e) en la PC la pieza se abre en el centro de la pantalla (en el casco sigue a 1,3 m, la altura de las manos); (f) el
  radio de las piezas recortadas se medía con los triángulos enteros que cruzan la caja (la cabina, de 0,9 m, daba 1,03 m de
  radio): ahora es el de la caja; (g) **el holograma del motor se agranda hasta el DOBLE del tamaño real** (`ESCALA_MAX`; antes el
  tope era 1:1 y no se podía «agrandar», que es lo que pidió Iván: «después uno lo achica o lo agranda según lo que considere»);
  (h) `rayosDesdeElOjo` contaba como tapa el nivel lejano y escondido del LOD del avión: ahora sólo cuenta lo que se ve.
  Pruebas después del repaso: recorrido 27, mandos 29, piloto 15, mecánico 5, identificar 6, todas bien y sin errores en consola.
  Junto al avión, la peor vista: 46 llamadas y 128 k tri (con la hélice o los escapes abiertos). La ronda fija (1 a 11), revisada.
- **El tren como punto propio (reserva del bloque, «más puntos del avión»; v=20261116c):** Iván nombró el tren aparte del ala
  («tolva, compuerta, escape, cabina, ala, tren, cola, hélice, motor»): el recorrido tiene ahora **NUEVE puntos** (1 hélice ·
  2 escapes y toma de aire · 3 tolva y boca de carga · 4 cabina · 5 cola y rueda de cola · 6 compuerta de descarga · 7 ala y
  flaps · 8 tren de aterrizaje · 9 motor). El punto 8 se para delante del ala derecha, mirando la rueda principal; su pieza en
  holograma es el tren principal derecho (rueda, pata de ballesta y carenado, hasta donde entra en la panza), recortado con una
  caja medida en el modelo; el ala quedó sola (su caja ya no toma la pata ni la rueda). El atlas de las marcas sirve para
  cualquier cantidad de puntos, y el rótulo de la pieza va justo arriba de lo que la pieza sube de verdad (con el radio de la
  esfera, mirando hacia abajo, se salía de la pantalla). Pruebas: recorrido 30 (9 puntos), mandos 29, piloto 15, mecánico 5.
  Sumar un punto es agregar su entrada en `PUNTOS` (y su recorte en `PIEZAS_HOLO` si tiene pieza).
- **Tolva y compuerta, primera versión «por fuera» (v=20261116d):** mirando el modelo desde abajo resultó que `juegos/at802.glb`
  SÍ trae la panza roja de la compuerta (cuelga bajo la tolva de x 0,1 a −2,4; baja hasta 0,78 m) y, claro, el tramo de fuselaje
  de la tolva (el lomo a 2,93 m, de x 2 a −1,75). Las dos tarjetas ya abren su holograma recortado del modelo, y el rótulo de la
  pieza dice lo que falta: «POR FUERA · EL INTERIOR, MÁS ADELANTE» y «POR FUERA · LAS HOJAS Y EL MECANISMO, MÁS ADELANTE»
  (`holoNota` en `PUNTOS`). **Las nueve tarjetas tienen pieza.** Pruebas: recorrido 32, mandos 29, piloto 15, mecánico 5.
- **HAY FOTOS para hacerlas bien (hallazgo del 16/11):** en `Documents/aurav-cabina/fotos/` (fuera del repo; las fotos no se
  publican) están las de Iván del avión blanco y rojo, del 24/9: `detalles/DETALLES IMPORTANTES/` (101 fotos, hoja de contactos
  `hoja_detalles.jpg`, numeradas de 0 a 100 en el orden de los archivos) y `general/AVION EN GENERAL/` (25, `hoja_general.jpg`).
  - *Compuerta:* 0 a 18 (la panza desde abajo y de costado; 12 y 13 = la hoja larga entre sus dos rieles de bulones, con el caño
    de venteo; 16 a 18 = la panza en V, la quilla y los caños), 37 y 38 (el caño de carga con sus acoples verdes y la válvula
    mariposa con su palanca), 22 a 29 (las bocas de carga con acople rápido, a los dos lados).
  - *Tolva, por arriba:* 32, 34, 69 a 72 y 95 a 100 (el lomo verde oliva: la tapa negra de dos hojas, la barra de trabas con sus
    manijas, la manija en U, la tapa roja redonda, la cúpula de venteo, las trabas naranjas), 81 y 82 (la tapa roja de cerca).
  - *Tolva, nivel:* 89 (la escala de la mirilla: 650 a 800 galones, es decir, la tolva es de 800 galones, unos 3.000 litros).
  - *Lo que NO hay:* el interior de la tolva (paredes, fondo, cómo desemboca en la compuerta) y la compuerta ABIERTA.
  Con eso la T12 puede modelar la compuerta por fuera con sus hojas, sus rieles y su cañería, y la tapa de la tolva, calcando
  proporciones contra el modelo (las medidas reales, [VERIFICAR]); el interior y la compuerta abierta piden fotos nuevas o un plano.
- Capturas: `Documents/aurav-cabina/capturas_taller/T11_dinamica_nueva.jpg`, del repaso `T11_repaso_pc.jpg` y de las piezas
  nuevas (tren, tolva y compuerta) `T11_tren.jpg`.

### 15.4 Lo que tiene que decir Iván (de a una; mientras tanto vale lo provisorio)
1. El ok a este plan (y por dónde arrancar). **Dado el 16/11: «Sí, en ese orden»** (primero el motor a escala real y el recorrido
   con las 8 tarjetas; después las piezas de a una, empezando por la hélice; la tolva y la compuerta, cuando haya fotos o medidas).
2. Los textos de las tarjetas: los corrige sobre mi borrador, los dicta o van sólo los nombres.
3. Si el motor llega parado (se arranca) o ya en marcha a ralentí.
4. Si quiere ver el motor dentro del capó antes de «ver motor».
5. El orden de las piezas en holograma (15.2b) y con qué se miden la tolva y la compuerta (fotos, plano o manual). **Hechas en la
   T11 las que salen del modelo** (hélice, cola, ala, tren, escapes, cabina, y la tolva y la compuerta por fuera). **Las fotos
   aparecieron el 16/11** (las de Iván del 24/9, §15.3): con ellas se puede hacer la T12 (15.5); falta su ok.
6. (16/11) Si el tren queda como punto propio (nueve puntos) o vuelve a ir con el ala.

### 15.5 La T12, propuesta: la compuerta y la tapa de la tolva, con las fotos (espera el ok de Iván)
**Qué cambia para el alumno:** al abrir la COMPUERTA en holograma ve lo que hay debajo del avión hidrante de verdad: la panza con
sus dos hojas largas, los rieles, el caño de venteo y la cañería de carga con sus bocas; y, si Iván quiere, las hojas se abren
y se cierran. Al abrir la TOLVA ve el lomo con su tapa, sus trabas y su venteo, y la escala de la mirilla.

- **De dónde sale cada cosa** (fotos de `Documents/aurav-cabina/fotos/detalles/`, números de `hoja_detalles.jpg`; no van al repo):

| Pieza | Qué se modela | Fotos | Lo que queda inventado o sin hacer |
|---|---|---|---|
| Compuerta | la panza (su forma y sus medidas salen del modelo: 2,5 m de largo, 1,1 de ancho, baja hasta 0,78 m), las dos hojas a lo largo con sus rieles de bulones, el caño de venteo | 0–18 (12 y 13, la hoja; 16–18, la panza en V) | cómo se ve ABIERTA y por dentro: sin foto, [PROVISORIO] |
| Cañería de carga | las dos bocas con acople rápido, los caños con sus acoples verdes, la válvula mariposa con su palanca | 22–29, 37, 38 | el recorrido exacto de los caños dentro de la panza |
| Tapa de la tolva | el lomo verde oliva, la tapa negra de dos hojas, la barra de trabas con sus manijas, la manija en U, la tapa roja redonda, la cúpula de venteo | 32, 34, 69–72, 81, 82, 95–100 | — |
| Nivel de la tolva | la escala de la mirilla, 650 a 800 galones | 89 | — |
| Interior de la tolva | paredes, fondo y la boca hacia la compuerta | no hay | un corte esquemático [AGREGADO] o esperar fotos: lo decide Iván |

- **Cómo:** dos scripts de Blender en segundo plano (`herramientas/taller_compuerta.py` → `taller/compuerta.glb`,
  `herramientas/taller_tolva.py` → `taller/tolva.glb`), geometría por vértices, pocos triángulos y sin texturas (se ven como
  holograma); las medidas grandes salen del modelo del avión y las proporciones de las fotos, todo [VERIFICAR]. `piezaholo.js`
  ya arma una pieza con cualquier malla: sólo hay que cargar el GLB la primera vez que se abre. Las hojas que abren serían
  dos mallas con su bisagra y un botón ABRIR / CERRAR en el rótulo de la pieza.
- **El bloque (3 horas o más):**

| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:00–0:20 | Mirar las fotos de cerca y medir la panza y el lomo en el modelo | un croquis con medidas en el plan |
| 0:20–1:20 | La compuerta: panza, hojas, rieles, venteo y cañería; render de control al lado de las fotos (fuera del repo) | se reconoce contra las fotos 12, 13 y 16 |
| 1:20–2:00 | En el taller: cargar el GLB, la pieza en holograma, las hojas que abren (si Iván quiere) | se abre y se cierra con el mouse y con los mandos simulados |
| 2:00–2:45 | La tapa de la tolva y la escala de la mirilla | se reconoce contra las fotos 70 y 98 |
| 2:45–3:15 | Pruebas por consola, presupuesto (tope 75 llamadas, 200 k triángulos), capturas | las pruebas pasan enteras |
| 3:15–3:30 | Cierre: plan y `CLAUDE.md` al día, commit local, lámina para Iván | — |

- **Reserva:** la voz de las tarjetas (cuando Iván apruebe los textos); el interior de la tolva en esquema.
- **Lo que tiene que decir Iván:** el ok; si las hojas se abren en el holograma; si del interior de la tolva va un esquema
  o se espera a tener fotos; y si puede sacar dos fotos más (la compuerta abierta y la tolva por dentro, por la tapa).
- **Lo que no se puede probar acá:** el casco, como siempre.

**T12 HECHA (16/11, la compuerta, 22:11–22:50; 21/11, la tapa de la tolva, 12:29–12:40; v=20261121a; con el ok de Iván: «Sí,
arrancá T12» y «Sí, seguí»; sin publicar; en el Quest no se probó nada).** Lo que quedó:
- **La COMPUERTA** (`herramientas/taller_compuerta.py` → `taller/compuerta.glb`, 3.804 triángulos, 0,39 MB, en el marco del avión):
  la panza en V con su proa redonda y su popa afinada, las **dos hojas** de 1,75 m (cada una de la quilla a su bisagra de afuera,
  0,33 m de ancho), el riel de la bisagra con sus 17 bulones, el listón dorado de la quilla con sus tornillos, los burletes claros
  de las puntas, el caño corto de venteo, y detrás la **cañería de carga**: dos bocas con acople rápido (una de cada lado, hacia
  atrás, abajo y afuera), cada una con su válvula de brida cuadrada y su palanca, el caño transversal, la T, los manguitos verdes
  con sus abrazaderas y el caño que entra por la popa. La envolvente (largo, ancho, hondura, pendiente de la quilla: 8,3°) se midió
  con rayos contra el modelo del avión; la forma y los detalles salen de las fotos 0–18, 22–29, 37 y 38.
- **Las hojas se abren:** `piezaholo.js` acepta PARTES MÓVILES (`moviles: [{fuentes, a, b, angulo}]`: cada una es una malla más que
  gira sobre su eje). Cada hoja trae en el modelo `userData.bisagra` = los dos extremos de su bisagra y el ángulo que la abre
  (78°). En el taller, bajo el rótulo de la pieza va el botón **ABRIR LAS HOJAS / CERRAR LAS HOJAS** (`accionPieza`, acción
  `pieza_hojas`), con la aclaración «ABIERTA: SIN FOTO · A VERIFICAR»: la posición abierta es [PROVISORIA] (giran hacia abajo y
  afuera, como una bodega).
- **El LOMO DE LA TOLVA** (`herramientas/taller_tolva.py` → `taller/tolva.glb`, 2.590 triángulos, 0,26 MB): sobre la superficie
  del lomo medida en el modelo (tabla `LOMO`), la tapa roja con su brida de doce bulones y su manija en T, el panel de adelante con
  su bisagra y sus dos trabas de palanca naranja, el panel negro antideslizante con sus remaches, la tapa negra levantada, la
  cúpula de venteo con sus dos trabas, la baranda de dos caños con sus cuatro soportes, la manija en U, la chapa de aluminio y la
  placa (fotos 32, 34, 69–72, 81, 82, 95–100). En el taller la tolva se ve como el lomo del fuselaje (recortado del avión de
  2,30 m para arriba: con el tramo entero, sus dos costados sumaban tanta luz que tapaban lo de arriba) con todo eso encima.
- **La ESCALA DE LA MIRILLA** (foto 89): sobre la pared de atrás de la tolva, rayas cada 25 galones de 650 a 800, con números de
  siete segmentos (son geometría: no hace falta textura). En el holograma lleva LUZ PROPIA (`userData.luz` en el modelo → atributo
  `aLuz` del sombreador), porque una cara vista de frente casi no brilla. La tolva llena son 800 galones, unos 3.000 litros.
- **Lo que NO se hizo:** el interior de la tolva (no hay fotos) y la compuerta abierta de verdad (tampoco). Los textos de las dos
  tarjetas siguen siendo el borrador.
- **Pruebas en la PC:** `probarRecorrido()` 33 (suma la compuerta: el gatillo simulado en su botón abre las hojas, el centro de cada
  hoja baja 8,8 cm, y las vuelve a cerrar), `probarMandos()` 29, `probarPiloto()` 15, `probarMecanico()` 5, identificar 6, sin
  errores en consola. Con el mouse de verdad: VER EN HOLOGRAMA, ABRIR LAS HOJAS y CERRAR, en las dos piezas.
- **Presupuesto:** junto al avión, hasta 46 llamadas (con la hélice) y 129 k triángulos (con la tolva); la compuerta abierta, 30
  llamadas y 120 k. `prevuelo_pages.py` ya cuenta los dos modelos (317 rutas).
- **Hallazgos:** (1) la chapa de la panza, puesta como contexto, de canto es un plano que encandila en el holograma: quedó en su
  propia malla (`compuerta_panza`) y el holograma la saltea; (2) la caja de una pieza larga e inclinada sube mucho más que la
  pieza: en la PC el rótulo se iba de la pantalla; ahora no pasa de 27° sobre el centro de la mirada; (3) una ruta armada con una
  plantilla no la ve `prevuelo_pages.py`: los modelos se nombran con la ruta entera; (4) el modelo del avión no trae nada arriba de
  la tolva (una franja gris y dos manijas): todo lo del lomo es del modelo nuevo.
- **Provisorio, a confirmar con Iván o con AAXOD:** que las hojas se abran en el holograma y cómo abren; todas las medidas chicas
  (ancho de la hoja, diámetro de los caños, dónde va el venteo, dónde va cada cosa del lomo: no hay ninguna foto de frente ni con
  una regla); para qué sirve cada tapa (no se afirma en ningún lado); dónde está la escala en la pared.
- Capturas: `Documents/aurav-cabina/capturas_taller/T12_compuerta_y_tolva.jpg`.

## 16. El curso de familiarización: cada pieza «como el motor», y una skill que haga todo el proceso (pedido de Iván, 21/11)
**Qué dijo Iván** al ver los hologramas de las piezas en la PC (21/11):
- «Los hologramas están logrados […] pero parece que muchos están un poco fijos; estaría bueno que con la mano los podamos mover e
  incluso ver su funcionamiento, como se hace con el motor.»
- «Pensémoslo como un curso / capacitación de familiarización con la aeronave.»
- «No me acuerdo con qué skill llegamos a esto [turbohelice.html]; después hicimos los hologramas: algo así para cada pieza.»
- «Y podríamos dejar una skill que haga todo el proceso, desde el despiece hasta el holograma, o actualizar la que ya está y
  renombrarla a un nombre que yo recuerde.»

**Lo que ya se hizo ese día (v=20261121b):** en la PC, arrastrar sobre la pieza la gira (antes hacía falta Shift y no se descubría);
la pieza gira sola, despacio; y su rótulo dice cómo se mueve (en el casco ya se agarraba con el grip y se agrandaba con las dos
manos: eso no se probó en el Quest). **La skill con que se hizo `turbohelice.html` es Teardown** (la revisó Nacho).

### 16.1 La idea: un curso, nueve lecciones, la misma forma en todas
**Qué cambia para el alumno:** el recorrido del avión pasa a ser un CURSO. Cada punto es una lección con los mismos cuatro pasos,
y el motor (que ya los tiene) es el modelo de las demás:

| Paso | Qué hace el alumno | Hoy |
|---|---|---|
| 1 · QUÉ ES | lee (y escucha) la tarjeta junto a la parte, en el avión | hecho (textos en borrador) |
| 2 · EN TUS MANOS | abre la pieza en holograma, la agarra, la gira, la agranda | hecho en las nueve |
| 3 · CÓMO FUNCIONA | la hace funcionar: mandos que la mueven, el flujo, el corte, el nombre de sus partes | sólo el motor (entero) y la compuerta (las hojas) |
| 4 · REPASO | dos o tres preguntas de la lección | sólo el motor (6 preguntas) |

Al terminar: el resumen de lo visto, de lo que hizo funcionar y del repaso (más adelante, constancia y envío al aula virtual: hoy
fuera de alcance).

### 16.2 El proceso, del despiece al holograma (lo que va a hacer la skill)
Es el mismo camino que siguió el motor, puesto por escrito para repetirlo con cada pieza:
1. **Referencias.** Nunca de la imaginación (regla 1 de Teardown): fotos del avión real (`Documents/aurav-cabina/fotos/`, fuera del
   repo), el manual de entrenamiento (PDF, fuera del repo), y medidas tomadas con rayos contra `juegos/at802.glb`.
2. **El despiece** (Teardown, como está): la máquina en una carpeta (la matemática con medidas reales y UNA entrada que mueve todo,
   la geometría hecha por código, el estudio, la consola, la película y la página en vivo) → una página de escritorio que se
   abre sin red, como `turbohelice.html`.
3. **Del despiece al holograma** (lo que hicieron la T1 a la T3 con el motor): la geometría marcada por parte y por estación se
   junta por cuerpo que se mueve y se dibuja con el sombreador del holograma; la matemática se usa TAL CUAL; la consola pasa a
   paneles 3D; los mandos, a palancas y botones para la mano y el mouse; las llamadas, a 3D; el recorrido guiado y las preguntas.
4. **En el curso:** la pieza entra como una lección del recorrido (tarjeta → holograma → funcionamiento → repaso), con la leyenda
   fija y todo lo no validado marcado [VERIFICAR].
5. **Verificación:** pruebas por consola con los mandos simulados, rayos desde el ojo a cada placa, presupuesto (75 llamadas,
   200 k triángulos), el camino entero con el mouse de verdad, capturas revisadas; el casco lo prueba Iván.

**La skill** junta Teardown (pasos 1 y 2) con los pasos 3 a 5 y con las reglas de AURAV (la leyenda, [VERIFICAR], las fotos nunca
al repo, nada se publica sin el ok). Va como skill local de Claude Code (`~/.claude/skills/<nombre>/`, como «fernando», «lichi» y
«graphify»), con el paquete de Teardown adentro (su kit, sus tres ejemplos, sus scripts), más la parte nueva del holograma y el
motor del taller como ejemplo resuelto. La de la cuenta de claude.ai («teardown») no se puede renombrar desde acá: queda un zip
listo para que Iván la reemplace si quiere. **El nombre lo eligió Iván el 21/11: «Despiece».**

**La skill quedó escrita ese día (primera versión):** `~/.claude/skills/despiece/` (en la carpeta de usuario de Iván, fuera de
este repo; Claude Code la toma sola cuando él dice «despiece», «holograma», «algo como el turbohélice»…). Trae `SKILL.md` (el
camino en cinco etapas: encargo, referencias y medidas, despiece, holograma, lección, y la verificación del cierre),
`references/` (`despiece-teardown.md` = la guía original de Teardown; `holograma.md` = cómo se lleva una máquina o una pieza a
VR, con lo que ya salió mal una vez; `leccion.md` = la forma de cada lección del curso; `aurav.md` = las reglas de la casa),
`teardown/` (el kit de Teardown tal cual, con su licencia MIT y la revisión de Nacho) y `holo/` (copia de los módulos del
holograma de este taller y de los dos scripts de Blender, para partir de ellos en otro proyecto). Teardown es de un tercero
(elvarofficial, MIT): va adentro sin cambios y con su atribución. **Su prueba de verdad es usarla con la primera pieza (la
hélice, T13)**: no se corrieron evaluaciones aparte porque cada corrida sería armar un simulador entero; sí se la dio a leer a
un agente sin contexto para ver si se entiende sola.

### 16.3 Qué funciona en cada lección, y con qué se cuenta (medido en el modelo el 21/11)
Las partes «sueltas» son islas de la malla del avión: se pueden mover sin cortar nada.

| Lección | Qué se ve funcionar | Con qué se maneja | Lo que ya está en el modelo | Lo que falta |
|---|---|---|---|---|
| Hélice | el paso variable y la bandera; gira con el motor | la palanca HÉLICE (la misma del motor) | las 5 palas vienen sueltas (460 a 654 triángulos cada una) y el cubo: cada pala gira sobre su eje | el mecanismo del cubo por dentro (gobernador, contrapesos): con el manual |
| Ala y flaps | los flaps que bajan; los alerones | botón FLAPS; el bastón | el flap (z 1,08 a 5,01) y el alerón (z 5,03 a 8,06) vienen sueltos | cuánto bajan de verdad [VERIFICAR] |
| Cola | el timón de profundidad, el de dirección, la rueda de cola que se traba | el bastón y los pedales | los dos timones de profundidad vienen sueltos; el de dirección está pegado a la deriva (se corta por su bisagra); la rueda de cola, suelta | recorridos [VERIFICAR] |
| Tren | la ballesta que cede al apoyar, la rueda que gira, el freno | botones ATERRIZAR y FRENAR | rueda, llanta, disco y pata vienen sueltas | cuánto cede la ballesta |
| Escapes y toma | por dónde entra el aire y por dónde salen los gases | botón FLUJO (como en el motor) | los caños; el flujo se dibuja con puntos | — (se enlaza con las estaciones 1 y 7 del motor) |
| Tolva | la carga, el nivel en la escala, la descarga | CARGAR y DESCARGAR | el lomo y la escala (T12) | el interior: sin fotos |
| Compuerta | las hojas (hecho), la descarga según la cobertura, la descarga de emergencia | el botón de las hojas; el nivel de cobertura | el modelo propio (T12) | abierta de verdad y el sistema por dentro: sin fotos, con el manual |
| Cabina | los mandos que mueven todo lo anterior | — | la cabina liviana | enlazarla con el simulador de cabina |
| Motor | hecho: 8 estaciones, 3 palancas, 5 fallas, recorrido y 6 preguntas | — | — | — |

### 16.4 Los bloques (3 horas o más cada uno; cada pieza, de a una)
| Bloque | Qué se hace | Listo cuando |
|---|---|---|
| T13 | **La skill** (escrita con el motor como ejemplo resuelto; `holograma.js` y `piezaholo.js` pasan a un módulo de «lección» que sirve para cualquier pieza) **y la primera lección completa, de muestra: la HÉLICE** (paso y bandera con la palanca HÉLICE, nombres de sus partes, corte, repaso) | la hélice cambia de paso con la palanca, en la PC y con los mandos simulados; la skill corre de punta a punta sobre ella |
| T14 | Ala y flaps, y la cola (las superficies de mando) | flaps, alerones y timones se mueven con sus mandos |
| T15 | Tren, y escapes y toma de aire | la ballesta cede y la rueda gira; el flujo se ve |
| T16 | Tolva y compuerta: carga, nivel, descarga | el nivel baja por la escala mientras la compuerta larga |
| T17 | El curso entero: orden, avance, repaso por lección, resumen final, voz; la cabina | se recorre de punta a punta y da el resumen |

Cada bloque cierra como los otros: pruebas, capturas revisadas, plan y `CLAUDE.md` al día, commit local, y lo que no se pudo probar.

### 16.5 Lo que tiene que decir Iván (de a una)
1. **El nombre de la skill.** Elegido el 21/11: «Despiece».
2. Si cada pieza lleva también su página de escritorio, como `turbohelice.html`, o va directo al taller (más rápido).
3. Por qué pieza se empieza (propuesta: la hélice, que se maneja con una palanca que ya está).
4. De dónde salen los contenidos de cada lección y quién los valida (el manual de entrenamiento, Bruno, AAXOD).
5. Si el curso lleva repaso con puntaje y resumen final.
- **Lo que no se puede probar acá:** el casco.

## Fuera de alcance (por ahora)
El motor real (hace falta el manual), constancia y envío al aula virtual, celular y modo cámara, manos animadas, el AT-802 con el
capó abierto y su motor de verdad, varios alumnos a la vez o un instructor en vivo, y el fotorrealismo (las fotos no van al repo).
Se pueden sumar después sin rehacer nada.
