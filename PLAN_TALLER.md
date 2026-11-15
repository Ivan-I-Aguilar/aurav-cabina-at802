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

Medidas propuestas [PROVISORIO: inventadas, se ajustan mirando las vistas]: nave de **40 m de luz × 60 m de fondo** (2.400 m²,
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
  naranja). Falta que Iván elija el look.

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
- **Pregunta para Iván:** el TORQUE se pone rojo desde 85 % porque así son los arcos del MVP-50 de la cabina (verde 0–85, rojo
  85–100): a plena potencia se ve rojo, en el taller y en la cabina. ¿Está bien así o se corrige en los dos?

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

### T5 — Zonas, muebles, partida y saltos (3,5 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:30 | Muebles livianos por script: bancos de trabajo, tableros de herramientas con siluetas, cajoneras rojas, estanterías, compresor, ventiladores, matafuegos y lavaojos (H6); la oficina vidriada (H7) | dentro del presupuesto del hangar |
| 1:30–2:15 | Utilería de los puestos: calzas, escalera y conos (H3); gatos, carro, bandeja y cartel «EN MANTENIMIENTO» (H4); sombras de contacto | — |
| 2:15–3:00 | Atril de partida (elección de modo, leyenda, créditos); puntos de salto con fundido; caminar con choque simple (paredes, mesas, aviones) | se llega a cada zona en VR y en PC |
| 3:00–3:30 | Cierre: la ronda fija de §10 entera | — |

- **Reserva:** carteles de seguridad genéricos; sonido ambiente del hangar; más detalle en los tableros de herramientas.
- **Al cierre, Iván:** ok a la ronda.

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

### T8 — Modo mecánico 1: banco y ubicar (3,5 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:30 | `taller_piezas.py`: las seis piezas a tamaño real con su `userData`, y el banco con bandejas | ≤ 8 llamadas y ≤ 10 k tri |
| 1:30–2:15 | `agregados.js`: el detector de virutas y el anillo de termocuplas de ITT con su arnés, con `tag` / `pieza` / punto de llamada; los nombres de pieza en la copia de `engine.js` | cada pieza del holograma tiene nombre |
| 2:15–3:00 | Agarrar, soltar y volver a la bandeja; acercar → se ilumina el lugar; soltar cerca → la copia a escala; error → se marca el lugar correcto | las seis, bien y mal puestas |
| 3:00–3:30 | Cierre | — |

- **Reserva:** el borrador de la tabla de inspección (adelanta T9); sonidos de agarrar y soltar.
- **Al cierre, Iván:** ok al banco y a la forma de ubicar.

### T9 — Modo mecánico 2: identificar, inspeccionar y resultado (3 h)
| Tramo | Qué se hace | Listo cuando |
|---|---|---|
| 0:15–1:00 | Identificar: «señalá…» con el rayo (la pieza del triángulo que toca), acierto en verde, error con el nombre de lo señalado | todas las piezas con nombre |
| 1:00–2:00 | Inspección: el borrador [AGREGADO] / [VERIFICAR] en `taller/mecanico.js` y en una tabla para quien valide (pieza · qué se mira · qué se busca · qué queda para el manual); el panel de inspección | las seis piezas |
| 2:00–2:45 | Resultado por tarea (como el debrief de los niveles); el modo mecánico queda oculto para publicar hasta la validación (3b) | — |
| 2:45–3:00 | Cierre: capturas y la tabla lista para pasarla | — |

- **Reserva:** preguntas del modo mecánico (como las 6 del piloto); más tareas de identificar.
- **Al cierre, Iván:** pasarle la tabla a quien valide, cuando lo sepa.

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

## Fuera de alcance (por ahora)
El motor real (hace falta el manual), constancia y envío al aula virtual, celular y modo cámara, manos animadas, el AT-802 con el
capó abierto y su motor de verdad, varios alumnos a la vez o un instructor en vivo, y el fotorrealismo (las fotos no van al repo).
Se pueden sumar después sin rehacer nada.
