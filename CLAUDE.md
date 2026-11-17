# aurav-cabina-at802 — guía para Claude Code

Cabina del Air Tractor AT-802 en WebXR (Three.js r180, sin bundler) para AURAV, el proyecto de formación
aeronáutica de Iván. Uso interno de prueba (AAXOD). Se abre en el Quest desde GitHub Pages:
https://ivan-i-aguilar.github.io/aurav-cabina-at802/

**Ahora mismo (12/11): la cabina nueva de Blender está COMPLETA (etapas 0 a 6 de `PLAN_CABINA_NUEVA.md`) y es la
ÚNICA cabina del juego: la FSX (`cabina.glb`) y todos sus parches se sacaron el 11/11 (etapa 7). PUBLICADA el 12/11 junto con los
tres niveles del aula virtual (v=20261112e, con el ok de Iván).** Falta el ok de Iván a las vistas y su prueba en el Quest (de la
cabina nueva y de los niveles no se probó NADA en el casco). La historia de los parches de la cabina FSX y del exterior
(16/10 al 2/11) está en `TRASPASO.md`; los GLB retirados quedaron en git (hasta f051b6f) y en `Documents/aurav-cabina/retirados_11_11/`.

## Cómo trabajar con Iván
- Castellano rioplatense, «vos». Respuestas **breves**. Una cosa por vez.
- Preguntas de a **una**, con opciones numeradas y siempre una opción abierta.
- Avanzar sin pedir permiso para cambios chicos; preguntar antes de rehacer algo grande.
- Él prueba en el **Meta Quest** y en Chrome. Nosotros no podemos probar en el casco: decirlo siempre que corresponda.
- **Antes de mostrar una captura, revisarla con ojo crítico** (pedido 25/10): si se ve algo raro —bulto, pieza flotante, hueco, algo que asoma— es un defecto: corregirlo SIN esperar a que Iván lo marque. Correr la ronda de vistas (adentro, esquinas, puerta) tras cada cambio.
- **RONDA FIJA antes de decir «listo»** (2/11, crítica de Iván: «vos la ves hermosa pero siempre le falta
  un pedazo»): adentro — frente, vano izq., vano der., atrás, piso; afuera — 3/4 delantero izq. y der.
  desde arriba (cámara local elevada) y 3/4 trasero izq. y der. mirando POR las ventanas. Mirar SIEMPRE
  el mismo lado que la captura de Iván, y mandarle las vistas: él decide si quedó, no yo.
- **Trabajos grandes: primero un PLAN PROFUNDO escrito** (todas las piezas, etapas, verificación y lo
  que falta saber) y él lo aprueba antes de arrancar (pedido 2/11). Ejemplo: `PLAN_CABINA_NUEVA.md`.
- El modelo es freeware de FSX (Flight Sim Nation / rikoooo): no publicitar fuera de lo interno sin revisar el readme.

## Publicar
**REGLA (26/10, pedido de Iván): NO publicar hasta que él lo pida expresamente** («vamos a subir cuando me parezca»): acumular commits locales y pushear sólo con su ok.
El repo está en `C:\Users\ivani\Documents\aurav-cabina-at802` (Windows). Pages sirve `main` desde la raíz; tarda 1–2 min.
**Antes de subir (12/11):** `python -E -P -X utf8 herramientas/prevuelo_pages.py`. Pages distingue mayúsculas y sólo sirve lo que está
en git; el servidor local no: el script revisa que cada archivo que el juego nombra (módulos, GLB, texturas, el WAV de cada frase) esté
en git con el mismo nombre. Y después de subir, abrir la página publicada y mirar que no haya errores ni 404 en la consola.
```
git add -A
git -c user.name="Ivan I. Aguilar" -c user.email="aguivanig@gmail.com" commit -m "..."
git -c credential.https://github.com.username=Ivan-I-Aguilar push origin main
```
**Versión de la página:** `version.txt` y `VERSION_PAGINA` en index.html tienen que coincidir con el `?v=` de main.js; si el navegador guardó un index viejo, se recarga solo. **Siempre subir la versión** de los imports (`?v=AAAAMMDDx`) en `index.html` (main.js) y en `main.js` para cada módulo o
GLB que cambie: el Quest cachea agresivamente. Si Iván dice «no cargó / no cambió», casi siempre es caché.

## Estado (12/11)
- **Publicado el 12/11 (con el ok de Iván: «Sí, publicá»):** Pages sirve v=20261112e: la cabina nueva entera y los tres niveles
  (J0–J4), todos los commits del 31/10 al 12/11 subidos de una vez (push 6dbcbfb, v=20261112d). Lo publicado antes era v=20261028d
  (push 6433ea7 del 28/10), todavía la cabina FSX. Links: la raíz (práctica con el tutor) y `?nivel=1`, `?nivel=2`, `?nivel=3`.
  Verificado en la página publicada con el navegador de PC: la raíz y los tres niveles cargan sin errores ni archivos faltantes, y el
  nivel 2 arranca (orden por radio con sus WAV, checklist en la tablilla). Al verificar salió un error de texto y se subió corregido
  (v=20261112e): la pantalla de inicio del nivel 2 decía «volvé a aterrizar en la 36» y el checklist manda final a la pista 18.
  **En el Quest no se probó NADA.**
- **La cabina nueva, v=20261111d** (commits del 3/11 al 11/11; el último, la etapa 7: limpieza). En local se prueba
  en `http://localhost:8765/` a secas (ya no hace falta `?cabina=nueva`). En el Quest no se probó NADA de la cabina nueva.
- **Los niveles del aula virtual J0–J3 y el código de la J4 (12/11, v=20261112d, `PLAN_JUEGO.md` §7):** `?nivel=1`
  (puesta en marcha con fallas al azar), `?nivel=2` (misión de incendio: orden por radio, foco con humo, descarga medida, vuelta y
  aterrizaje) y `?nivel=3` (la misma misión con una emergencia sorpresa: falla de motor en vuelo con o sin rearranque, fuego, falla en el
  despegue a 150 ft, generador, compuerta trabada; momento y señales previas por semilla) completos en PC. Probados con
  `herramientas/piloto_prueba.js` (nivel 2, semilla 100001; nivel 3, una semilla por emergencia) y a mano (nivel 1).
- **J4 (12/11), para jugarlos DENTRO del casco:** botón «Empezar en VR» en la pantalla de inicio del nivel, el checklist en la tablilla
  (que se mudó al ala derecha del tablero: en el parante del parabrisas el parante le tapaba un tercio del texto), debrief en un panel de
  VR (resultado, barras, Repetir · Otra situación · Salir de VR), pausa de nivel y pausa automática si se saca el casco. **En el Quest no
  se probó NADA de esto ni de los niveles** (acá no hay VR): es lo primero que tiene que mirar Iván ahora que está publicado.
- Pendiente de Iván: el ok a las vistas de las etapas 3 a 6 (capturas mandadas el 11/11), confirmar con Bruno que el paso de
  FUEGO sea «manija FUEL a OFF» y el Quest (legibilidad de pantallas, alcance, ojo; los tres niveles entrando con «Empezar en VR»).
- **Rendimiento (11/11, Chrome en PC, ventana de 800 px, escena entera con el aeródromo):** 296 llamadas de dibujo, 191 k triángulos,
  43 texturas, 144 fps. La cabina nueva pone unos 15 k triángulos y ~70 llamadas (los controles son mallas sueltas). En el Quest, a medir.
- Historia por etapas (lo de abajo es el detalle de cada una; donde dice «SIN publicar» era cierto ese día: TODO se publicó el 12/11):
- **(viejo) Publicado:** Pages sirve v=20261028d (push 6433ea7 del 28/10, con el ok de Iván).
- **Local, SIN publicar:** los arreglos del 31/10 al 2/11 sobre la cabina FSX (v=20261102j, superados:
  no seguir parchando la cabina FSX) y la **etapa 0 de la cabina nueva, HECHA el 3/11 (v=20261103a)**:
  `herramientas/cab_comun.py` (casco medido, chequeador), `cab_calcar.py` / `cab_superponer.py` /
  `cab_render_pose.py` / `cab_plano.py` (calcado de las 360), `cabina_nueva.js` con `?cabina=nueva`,
  `__ronda(n)` y `__vista(...)`. Detalle y hallazgos en `PLAN_CABINA_NUEVA.md` §5 etapa 0.
- **Iván eligió copiar el avión BLANCO Y ROJO** (el de la 360 desde el asiento).
- **DECIDIDO (3/11): B, rehacer la cúpula** (etapa 1b del plan): todo lo que está por encima del
  antepecho, del cortafuegos a detrás del asiento (parabrisas de 3 paños, ventanas del techo, puertas y
  ventanillas traseras), calcado de la 360; se conserva la chapa del FSN bajo el antepecho (calza con
  2–3 cm; arriba no: las ventanas de puerta del FSN son 7–10 cm más chicas en la esquina superior
  trasera, el parabrisas está corrido 6 cm y las ventanas del techo 8–10 cm). Base: las superposiciones de la etapa 0 (`Documents/aurav-cabina/fotos/calcado_etapa0/`,
  fuera del repo). **Etapa 1b: plan en `PLAN_CUPULA.md`, aprobado por Iván el 3/11.**
- **1b.0 (medición de la cúpula) HECHA el 5/11**, sin cambios en el juego (sigue v=20261103a):
  `blender/calcado/cupula_puntos.json` (279 puntos; el bloque `simetrico` es lo que se modela) y
  `cupula_plano.png`. La lámina con foto (`cupula_puntos.png`, en `Documents/aurav-cabina/fotos/calcado_etapa0/`)
  la vio Iván y dio el ok (5/11): **sigue la 1b.1** (corte del FSN, jaula, parabrisas y faja). Lo medido, los hallazgos y lo que quedó sin resolver
  están en `PLAN_CUPULA.md` §2b: la asimetría de los parantes era un error de lectura (cámara a 12,2°, no 13°);
  la jaula del techo es un arco delantero + una V + un marco trasero; la ventanilla trasera llega a z 2,8 (más
  carenado que rehacer: lo decide Iván); el ancho de la cabina sale del FSN y queda con ±3 cm hasta tener 3
  medidas de cinta (de puerta a puerta en el antepecho adelante y atrás, y arriba).
- **1b.1 (corte del FSN, jaula, parabrisas de 3 paños, faja y techo provisorio) HECHA el 7/11, v=20261105a,
  SIN publicar**, con el ok de Iván a la ronda («Sí, seguí»): `herramientas/cab_cortar_fsn.py` → `exterior_cupula.glb`
  (el FSN sin cúpula, corte recto en el antepecho y 0,93) y `herramientas/cab_cupula.py` → `blender/cab_cupula.glb`
  (2622 triángulos, 5 llamadas); `cabina_nueva.js` los carga con `?cabina=nueva`. **Sigue la 1b.2** (techo con sus
  ventanas, arcos, largueros y forro). Dos hallazgos que valen para todo lo que siga (`PLAN_CUPULA.md` §2b.8–9):
  el plano del parabrisas de la etapa 0 estaba mal (el real es W: z = 1,2057 + 1,1986·(y − 1,5), 50° desde la
  vertical; ya corregido en `cab_comun.z_parabrisas`); y lo que se ve desde el asiento son las caras de ADENTRO
  (W y el plano de la puerta): el vidrio y las tapas blancas van 4 cm más afuera, y como la cámara mira los
  parantes de costado, sus caras laterales van sobre el plano cámara–borde («abanico»): a escuadra se veían 3 cm
  más anchos que en la foto. Lo verifica el chequeo «silueta desde la cámara de la 360» de `cab_cupula.py`.
- **1b.2 (techo con sus dos ventanas y forro) HECHA el 7/11, v=20261107a, SIN publicar, con el ok de Iván.** Chapa triangulada sobre la bóveda medida (pasa por el plano de la ventana medido desde afuera) con las
  ventanas recortadas (mismos vértices: sin rendija), flanco hasta 3 cm sobre la ventana de puerta, forro a 7 mm y canto
  oscuro en cada ventana; caños a la vista. 4888 triángulos, 5 llamadas.
- **1b.3 (puertas cerradas con su ventana y el ojo de buey + carenado trasero liso, zócalo y parche) HECHA el 7/11,
  v=20261107a, SIN publicar, con el ok de Iván («está muy bien el techo»). La cúpula (1b) está completa salvo la 1b.4 (Quest),
  que espera a que Iván pida publicar.**
- **Etapa 1 (cascarón) MODELO HECHO el 7/11, v=20261107b, SIN publicar; falta el ok de Iván:** `herramientas/cab_cascaron.py`
  → `blender/cab_cascaron.glb`: piso (y 0,26), paredes (el casco 1,5 cm adentro), pared de la tolva (z 0,60, cromato) con la
  mirilla en vivo (`agua_tolva` escalada con `vuelo.agua` en `cabina_nueva.js`), forro del antepecho, mamparo (z 2,42) y un
  tablero provisorio oscuro hasta la faja. Pared de la tolva, piso y mamparo son los números de referencia del plan (el FSN
  no los tiene): se afinan con las fotos en las etapas 2 y 6. Iván (7/11): «no va ventanilla atrás, es todo fuselaje»: lo medido como ventanilla
  trasera se descarta. Con eso la cúpula queda CERRADA sobre el antepecho: 0 de 20.000 rayos escapan de 0° a 90° todo
  alrededor. 6486 triángulos, 5 llamadas, 0,20 MB. Sigue la 1b.4 (Quest) y después la etapa 1 (cascarón). Las líneas finas
  y la franja azul que se ven adentro son el casco de referencia y el interior del FSN: se van con el cascarón.
- **Etapa 2a (chapa del tablero) HECHA el 8/11, v=20261108a, SIN publicar; falta el ok de Iván:** `herramientas/cab_tablero.py`
  → `blender/cab_tablero.glb`: chapa vertical en z 0,96 medida en la 360 del asiento CON LA POSE (`cab_foto360.rayo`; las vistas
  planas de `vista360.py` no corrigen los 5,6° de cabeceo de la cámara y daban todo 6 cm más bajo), borde de arriba plano en
  y 1,333 con hombros hasta el vidrio lateral, borde de abajo escalonado (1,095 en el centro = lo alto de la pared de la tolva,
  que subió de 1,02; 0,87 a la izquierda para el FRDS; 0,95 a la derecha), huecos de anemómetro y altímetro (EN VIVO con
  `Instrumentos`, por `userData.tablero` de la chapa), G5 / Garmin de rumbo / MVP-50 como vidrio oscuro (2b), tapas ciegas,
  anunciadores apagados, `swFPUMP` con guarda roja, soporte del Garmin, perillas y la REPISA hasta la pared de la tolva (sin
  visera: el borde de arriba queda a 1,7 cm del vidrio). La mirilla del cascarón pasó a lo medido (x ±0,25, y 0,83–1,00).
- **Etapa 2b (pantallas en vivo) HECHA el 8/11, v=20261108b, SIN publicar; falta el ok de Iván:** `pantallas.js`: G5 de actitud,
  Garmin de rumbo (HSI) y MVP-50 en canvas sobre el tablero (se apagan sin batería; G5/HSI a 30 Hz, MVP a 5 Hz) y los cuatro
  anunciadores (MASTER WARN titila con fuego; CAUTION con generador fuera o ITT > 850; ARMED con la llave FRDS; LOW FUEL sólo en
  el test). Tablilla del tutor prendida al parante derecho del parabrisas y placa MENÚ sobre el ala derecha del tablero. Hasta
  las etapas 3 y 4, `aplicarControles` / `reiniciarAvion` no pisan motor ni mando cuando falta la llave o la palanca: las
  misiones corren en la cabina nueva. Con eso la etapa 2 está completa salvo la legibilidad en el Quest. Detalle en `PLAN_CABINA_NUEVA.md`, etapa 2.
- **Etapa 3 (FRDS, SALVO y paneles de llaves) HECHA el 8–11/11, v=20261108c, SIN publicar; falta el ok de Iván:**
  `herramientas/cab_llaves.py` → `blender/cab_llaves.glb` (2230 tris, 32 llamadas, 21 controles): placa FRDS GEN III con 6 llaves y
  display en vivo (pantalla `frds`), CB + FRDS POWER, placa y botón MANUAL SALVO, y los dos paneles bajos inclinados 40° que cuelgan
  bajo el tablero (y 0,912 · z 0,90, 11 cm; la profundidad sale de las fotos del amarillo, no de la 360) con sus filas LANDING/WORKING
  LIGHTS · DISPERSAL/MISC · FLIGHT LIGHTS/GYROS/FLAPS · ENGINE OPERATION, y una repisa que baja hasta la pared de la tolva bajo la
  mirilla. Los rótulos NO van en el GLB: cada placa lleva `userData.panel` (JSON) y `pantallas.js` (`Rotulos`) los dibuja en canvas.
  main.js: tabla `SW` nueva (`swBATT` MASTER, `swGEN`, `swIGN` 3 pos., `swSTART`, `swPITOT`, `swWIPER`, `swLDG_L`, `swSTRBNAV`,
  `swPULSE`, `swARMED`, `swFRDS`; AVNC va PROVISORIAMENTE con el MASTER hasta el rack; FIRE espera la manija FUEL de la etapa 4).
  cabina_nueva.js: llaves momentáneas que vuelven solas (SALVO larga todo; GATE larga los galones pedidos con el caudal del nivel de
  cobertura). Probado el 11/11: puesta en marcha completa con el tutor marcando cada llave (100/100, emulando la palanca de condición),
  GATE y SALVO. Detalle en `PLAN_CABINA_NUEVA.md`, etapa 3.
- **Etapa 4 (pared izquierda) HECHA el 11/11, v=20261111a, SIN publicar (tanda autónoma aprobada por Iván; falta su ok a las
  vistas):** `herramientas/cab_consola.py` → `blender/cab_consola.glb`: consola negra sobre la pared izquierda (tope y 0,68, hasta
  x −0,40, z 1,00–1,80), panel en la pared con la manija FUEL (`swFUEL`: OFF · MAIN; en la cabina nueva hace de «FIRE» para la misión,
  `Mision.fuegoConFuel`, a confirmar con Bruno) y la perilla TURN TO LO…, cuadrante con `levCOND / levHEL / levPOT` (eje común en
  y 0,52 · z 1,45, pivote en la base, UN material por palanca: con dos, el GLB las parte en levX_1/_2), dial RUDDER TRIM
  (`swK_TRIMTIMON`), volante de trim de profundidad (`swK_TRIMPROF`) y llave AILERON TRIM (`swTRIMALERON`) que ya suman al mando,
  y la E-DUMP naranja (`levEDUMP`) en el piso. Probado: puesta en marcha con las palancas reales y la emergencia de fuego entera.
  Detalle en `PLAN_CABINA_NUEVA.md`, etapa 4.
- **Etapa 5 (radios) HECHA el 11/11, v=20261111b, SIN publicar (tanda autónoma):** consola compacta del blanco y rojo:
  `herramientas/cab_radios.py` → `blender/cab_radios.glb` (caja sobre la pared derecha + bloque inclinado con la cara de los equipos,
  `userData.radios`) y `radios.js` `crearRadiosEn` (PAC24, COM, XPDR, FM en canvas + la llave `swAVNC` horneada en el marco de la
  cabina; `SW.AVNC = 'swAVNC'`). Detalle en `PLAN_CABINA_NUEVA.md`, etapa 5.
- **Etapa 6 (bastón, pedales, asiento) PRIMERA VERSIÓN el 11/11, v=20261111c, SIN publicar (tanda autónoma):**
  `herramientas/cab_asiento.py` → `blender/cab_asiento.glb` (bastón `palanca_*` desde PIVOTE (0; 0,28; 1,15), fuelle, antideslizantes,
  varillaje rojo); `pedales.glb` y `butaca.glb` de Lichi cargados por `cabina_nueva.js` (la butaca recoloreada a malla roja y arnés
  negro; el asiento de malla de verdad queda para después). **Con esto `?cabina=nueva` tiene todas las zonas (etapas 1 a 6); falta la
  etapa 7** (limpieza del código viejo, rendimiento, Quest y publicar), que espera a Iván. Detalle en `PLAN_CABINA_NUEVA.md`, etapa 6.
- **Lección (7/11): toda fila que llega al borde de otra chapa pasa por los VÉRTICES de ese borde y termina 2–3 mm por
  debajo** (`solapa_techo`): un remuestreo uniforme cortaba la esquina del nudo FR y dejaba un hueco de 1,6 cm por donde
  se colaban rayos. El chequeo de estanqueidad (0°–90°, 20.000 rayos) es el que los encuentra.
- **El FSN está roto del lado IZQUIERDO debajo del antepecho** (z 1,95–2,35, hasta y 0,65: no hay chapa; el derecho está sano)
  y tiene pintada una franja oscura (burlete) justo debajo del corte: lo tapan `zocalo_*` (10 cm, S1) y `parche_izq` en
  `cab_cupula.py`. Para mirar un detalle de afuera de cerca: `await __desde([x, y, z], [hx, hy, hz], hfov°)` (a pie).
- La cámara de la 360 estuvo 22 cm más abajo que el ojo del juego (altura de pecho): el ojo (1,38) es
  razonable; se vuelve a mirar con el asiento nuevo (etapa 6).

## Cabina nueva de cero (decidida el 2/11)
- Iván: «¿y si se hace una cabina de 0 por Blender? lo que tenemos no sé si se puede arreglar, siempre
  le falta un pedazo». Respuesta: SÍ. La cabina FSX era OTRA configuración del 802, y sus restos
  causaron casi todos los «un paso adelante, dos atrás».
- **PLAN COMPLETO en `PLAN_CABINA_NUEVA.md`** (2/11, Iván pidió «un plan profundo de todas las
  creaciones y etapas» antes de arrancar): etapas 0 a 7, más la 1b si hay que rehacer la sección de
  cabina del fuselaje (0 base, ronda automática `__ronda(1..12)` y 360 superpuesta · 1 cascarón ·
  2 tablero de vidrio · 3 FRDS, SALVO y llaves con re-cableado · 4 pared izquierda · 5 radios ·
  6 asiento, pedales y bastón · 7 limpieza y Quest), inventario real por zonas (A–H), medidas y escala,
  técnica (scripts `cab_*.py`, controles con propiedades → `userData`, pantallas en canvas), chequeos
  automáticos, fotos que faltan y decisiones pendientes. Marcar cada etapa HECHA con fecha y versión.
- **FOTO 360 DESDE EL ASIENTO (2/11, la mejor referencia para medir):** `Documents/aurav-cabina/fotos/
  vr360/VR 360 VARIAS ALTURAS/DSCN0054.JPG` (también en el Drive de Iván, carpeta AT8T; el conector de
  Drive NO baja más de 10 MB: usar la copia local). Nikon KeyMission 360, equirectangular 7744×3872
  (0,05°/px), 24/9/2026, avión BLANCO Y ROJO de AAXOD (las 4 fotos del 2/11 son de uno AMARILLO: MISMO
  tablero; radios distintas: rack alto en el amarillo, consola compacta en el blanco y rojo). La
  manija naranja «DUMP» junto al cuadrante es el E-DUMP. DSCN0001–0052: 360 alrededor y debajo del
  avión a varias alturas (0040–0051, la cúpula de cerca desde afuera). Pillow está con `--user`:
  correr Python con `-E -P`, no `-I`. Vista plana desde la 360: `python -E -P herramientas/vista360.py
  foto.jpg salida.jpg yaw pitch hfov ancho alto` (yaw 0 = tablero, negativo = izquierda; pitch
  negativo = abajo). MÉTODO («calcada»): la 360 de fondo en Blender y la cámara en el punto de la
  toma; primero se ubica ese punto alineando parantes, marcos y jaula del FSN.
- **INTEGRACIÓN CON EL FUSELAJE (recordatorio de Iván 2/11: «al final hay que integrarla al ya
  existente o recrear el fuselaje»):** se decide en la etapa 0 superponiendo las 360 con el FSN:
  A = integrar al FSN (cascarón medido contra su chapa) si coincide con ≤ 2 cm; B = rehacer SÓLO la
  sección de cabina del fuselaje (cúpula, marcos, vidrios, puertas, chapa del cortafuegos a detrás
  del asiento) con dos cortes planos. El avión entero no hace falta.
- Fotos comunes del avión amarillo (NO al repo público): `Documents/aurav-cabina/fotos/cabina_real/`
  (tablero izq. con el FRDS, tablero der. con las llaves, consola izq. con el cuadrante y los trims,
  rack de radios der.). El inventario completo, zona por zona, está en el plan (§3).
- Expectativa honesta: geometría simple y limpia con la distribución real, no fotorrealista.

## Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | UI de PC: barra, tutor, lista de tareas, panel de botones, HUD de prueba. |
| `main.js` | Arma la escena: `avion` (cuerpo que vuela, +x adelante) → `cabina` (marco glTF girado −90°, tren en el piso) + `jugador` (cámara / manos). Llama a `cargarCabinaNueva`, mapea controles→vuelo (`aplicarControles`, tabla `SW`), bastón (grupo `palanca` desde PIVOTE con las mallas `palanca_*` del GLB), humo, UI, recentrado VR, ronda de prueba (`__ronda`, `__vista`, `__sonda`, `__desde`), bucle con física a 120 Hz. Desde el 11/11 ya no tiene nada de la cabina FSX (de 1136 líneas a 500). |
| `vuelo.js` | Modelo de vuelo + motor PT6 simplificados. Eventos: despegue, contacto, accidente, largado, tolva-vacia, vne, fuego-extinguido, fuego-incontrolado. `suelo(x,z)` = terreno. |
| `mision.js` | Fases: arranque → despegue → crucero → falla de motor → crucero → fuego → despegue con tolva llena → falla a 150 ft. Puntaje y observaciones. `menu()`, `empezar(desde)`. |
| `controles.js` | Switches (`sw*`) y palancas (`lev*`) del GLB con pivote; VR (gatillo/grip cerca, o pinchar) y clic en PC. |
| `instrumentos.js` | Agujas 3D y carátulas dibujadas en vivo (`CARAS`) + biseles para el anemómetro y el altímetro (los centros vienen en `userData.tablero` de la chapa del tablero; `instrumentos.json` se retiró el 11/11). Escalas iguales a `herramientas/relojes.py`. |
| `radios.js` | Consola de radios derecha: `crearRadios()` el pedestal 3D con canvas de la cabina vieja; `crearRadiosEn(datos, cabina)` (etapa 5) los equipos sobre la cara del bloque de `blender/cab_radios.glb` más la llave MASTER AVIONICS `swAVNC`. |
| `audio.js` | Turbina/hélice sintetizadas, campana de fuego, bocina de pérdida. Voz: audios pregrabados `voz/<clave>.wav` (el Quest no tiene speechSynthesis); si falta la frase, voz del navegador. |
| `voz/` + `herramientas/voces.py` + `voces.ps1` | Frases del tutor → WAV con la voz Sabina de Windows. **Cada vez que cambie un texto de mision.js/main.js:** `python -I herramientas/voces.py` y `powershell -ExecutionPolicy Bypass -File herramientas/voces.ps1` (sólo genera las nuevas). Pronunciaciones en `PRONUNCIA`. |
| `apie.js` | Modo a pie (22/10): caminar alrededor del avión (VR: joystick izq. camina, der. gira 30°; PC: WASD/flechas + mouse; celular: joystick en pantalla + arrastrar para mirar + tocar), colisión simple con fuselaje y hélice, cartel «SUBIR» junto al estribo (izquierda, bajo la cabina) → animación estribo → raíz del ala → asiento (en VR: fundido). «Bajar del avión» / «Volver a la cabina» en la pausa; «Recorrer el avión (a pie)» en el menú. |
| (celular) | **Modo cámara** (botón `#ar`, Android/Chrome con WebXR AR): el teléfono es una cámara dentro de la escena con 6 grados de libertad (caminás de verdad); botón `#entorno` alterna **pista virtual / lugar real** (en lugar real se oculta el entorno; renderer con `alpha`). **Escala** (`#escala`, `aplicarEscalaCamara`): el jugador se agranda k veces (1:5 por defecto; 1:10, 1:20, real). `cuidarSeguimiento`: compensa saltos de >12 cm por cuadro y avisa si el seguimiento se pierde (`emulatedPosition`) → el avión se ve como maqueta a altura de mesa y tus pasos rinden k veces; al subir a la cabina vuelve a 1. Pensado para usarlo dentro de una casa. Tocar la pantalla = gatillo (subir, switches). **Giroscopio** (botón `#giro`, cualquier celular incl. iPhone): mirar moviendo el teléfono; para desplazarse, joystick a la **derecha**. No probado en celular real. |
| `panelvr.js` | Panel de botones para VR (igual que en aurav-senales). Desde la J4 (12/11) también dibuja el debrief de los niveles: `subtitulo` + `colorSubtitulo` (APROBADO · 97 / 100) y `barras` (las competencias). En el juego se muestra con `mostrarPanelVR` (main.js), que lo deja pegado al avión. |
| `escenario.js`, `tex/`, `autobomba.glb` | Aeródromo de AURAV copiado de aurav-sector, con valle plano a lo largo de la pista (`dRect`) y `alturaTerreno`. |
| `exterior.glb` | **AT-802 TERRESTRE real** (22-23/10, Lichi): sale del OBJ de Metasequoia en `Documents\aurav-cabina\fsx\rar_terrestre\Air Tractor AT-802\files\AT802-4.obj` (familia FSN, tren de ballesta, ruedas y hélice de 5 palas de fábrica). Se regenera con `herramientas/exterior_terrestre2.py`: aplica la matriz del importador (¡clave!), orienta (deriva a −y, envergadura ±9,03), alinea (ruedas al piso −2, cúpula centrada en la nuestra), blanquea el AMARILLO de sus texturas conservando remaches y deja TAL CUAL la pintura AZUL de fábrica (franjas convergentes y deriva; decisión de Iván 24/10: «respetar el modelo base, pintado azul, sin volverse loco»), borra el «493» de la deriva (relleno con el azul de alrededor) y el «RESTRICTED» (quedaba espejado), pinta por geometría SOLO las ruedas (goma negra, medidas del modelo) y en textura las palas Hartzell negras con banda roja (cajas PALA/PALA_BANDA en at_01), borra su interior; su cúpula queda entera pero SIN sus vidrios en la zona de cabina (los vidrios y la vista interior los pone la cabina). **Todo a doble cara y SIN recalcular normales**: las normales del OBJ vienen mezcladas y el recálculo global dio vuelta chapas (alas/cúpula desaparecían según el ángulo). Suma el estribo. El atlas del OBJ comparte texels: NO hornear librea por posición ahí. Versión `V_EXT` en main.js. (Después, 27/10: repintado liso total con la franja y la cola azules por geometría; ver TRASPASO.) |
| `herramientas/` | `exterior_terrestre2.py` (regenera el exterior), scripts de Blender `*_blender.py`, `vista360.py` (vista plana desde una foto 360), `voces.py` / `voces.ps1`, `mapa_cabina.md` (notas del manual) y los de la cabina FSX vieja (`mdl2glb.py`, `relojes.py`, `instrumentos.py`). |
| `herramientas/cab_*.py` | **Cabina nueva** (etapa 0, 3/11). `cab_comun.py`: lo común (marco cabina ↔ Blender, prismas por vértices, materiales, `Casco` = exterior.glb con BVH y rayos, `medir_casco` → `blender/casco_medido.json`, `Panorama` para calcar fotos 360, `control()` con propiedades → userData, `exportar()` con `export_extras`, `vista()` Eevee, `chequear()` = los 6 chequeos del plan; corrido directo mide el casco y prueba el chequeador). `cab_calcar.py` (pose de una 360 contra el FSN: `-- carpeta [--foto 54] [--afuera]`), `cab_superponer.py` (superposiciones y medidas en cm, Pillow), `cab_render_pose.py` (el FSN visto desde la pose), `cab_plano.py` (plano del casco). Poses y medidas en `blender/calcado/`; las imágenes con foto, FUERA del repo en `Documents/aurav-cabina/fotos/calcado_etapa0/`. |
| `herramientas/cab_cupula_*.py`, `cab_foto360.py`, `cab_borde360.py`, `cab_costura360.py` | **Medición de la cúpula** (1b.0, 5/11). `cab_cupula_marcas.py`: todo lo leído en las tres 360 (asiento y dos de afuera) y su afinado → `blender/calcado/marcas54.json` y `marcas_afuera.json`. `cab_borde360.py`: afina un borde recto en una 360 (arco de círculo máximo, escalón marco→vidrio por tramos, 1–2 px). `cab_foto360.py`: geometría de la KeyMission 360 (dos lentes, rayos, proyección) y de planos y rectas, sin Blender. `cab_cupula_puntos.py` (Blender): marcas → puntos 3D (`--ajustar`: pose de la cámara por simetría) → `cupula_puntos.json`. `cab_cupula_afuera.py` (Blender): ajuste conjunto de las dos 360 de afuera (ventanillas traseras, techo) → `cupula_afuera.json`. `cab_cupula_lamina.py`: lámina con foto (fuera del repo) y `cupula_plano.png`. `cab_costura360.py`: desalineación de las dos lentes medida con el hangar. Orden y comandos en `PLAN_CUPULA.md` §2b. |
| `herramientas/cab_cortar_fsn.py`, `exterior_cupula.glb` | **Corte del FSN** (1b.1, 5/11), sin Blender: lee `exterior.glb`, PARTE sobre los planos y 0,93 (antepecho), z 0,76 (capó) y z 2,55 (carenado) los triángulos que los cruzan (borde recto, ningún vértice se mueve) y borra lo que queda dentro de la caja de la cúpula más todo el vidrio mat22 de la zona; recorta sólo la punta del cable deflector (mat08). Imprime caras por material y verifica «SIN DIENTES». `python -E -P -X utf8 herramientas/cab_cortar_fsn.py`. |
| `herramientas/cab_cupula.py`, `blender/cab_cupula.glb` | **La cúpula nueva** (1b.1, 5/11; Blender): parantes del parabrisas, cabezal, postes de puerta A y B, 3 paños (central plano, laterales CURVOS: superficie reglada entre el borde del capó y el borde de arriba), faja, largueros del antepecho, jaula del techo (arco delantero, diagonales, V, marco trasero) y techo provisorio con forro. Todo por vértices y medido con rayos contra `exterior_cupula.glb`. Las caras de parantes y postes van sobre el plano cámara–borde («abanico»). Chequeos propios: vidrio contra caño, estanqueidad del frente (20.000 rayos) y silueta desde la cámara de la 360; `-- --vistas <carpeta>` renderiza con Eevee. Une por material (5 llamadas) y escribe `blender/cab_cupula_informe.json`. |
| `herramientas/cab_cascaron.py`, `blender/cab_cascaron.glb` | **El cascarón** (etapa 1, 7/11; Blender): piso, paredes medidas con rayos contra `exterior_cupula.glb` (1,5 cm adentro; el lado roto del FSN toma el otro reflejado), pared de la tolva con la mirilla (cajón abierto, vidrio y placa `agua_tolva` con `userData.nivel`), forro del antepecho y mamparo medido contra `blender/cab_cupula.glb`. Importa los ayudantes de `cab_cupula.py`. |
| `herramientas/cab_tablero.py`, `blender/cab_tablero.glb` | **El tablero superior** (etapa 2a, 8/11; Blender): chapa plana en z 0,96 triangulada con `delaunay_2d_cdt` (contorno medido, huecos de relojes y pantallas), fondos de relojes, tapas, marcos y vidrios de pantallas, anunciadores, `swFPUMP` + guarda, soporte Garmin, perillas y la repisa hasta la pared de la tolva (ancho medido con rayos, `x_pared`). Escribe `userData.tablero` (centros) en la chapa y `blender/cab_tablero_informe.json`. Medidas con `cab_foto360.rayo` y la pose de `cupula_puntos.json`. |
| `cabina_nueva.js` | Carga la cabina nueva con `?cabina=nueva`: `PIEZAS = ['cab_cupula', 'cab_cascaron', 'cab_tablero']`; el exterior es `exterior_cupula.glb`; devuelve `actualizar(vuelo, dt, { controles, SW })` (mirilla, pantallas y anunciadores), `instrumentos` (anemómetro y altímetro, con la clase `Instrumentos` que main.js le pasa), `pantallas` y `tablero` (el `userData.tablero` de la chapa). Con `?cabina=vieja` (o nada) sigue la FSX con sus parches. |
| `pantallas.js` | **Pantallas en vivo del tablero nuevo** (2b, 8/11): clase `Pantallas(raiz, tablero)` con G5 de actitud, HSI de rumbo, MVP-50 y el display del FRDS dibujados en canvas (escalas iguales a `instrumentos.js`), más los cuatro anunciadores con textura apagada/prendida; `actualizar(dt, estado)` con lecturas, rumbo, batería, fuego, frds, etc. Y la clase `Rotulos(raiz)` (etapa 3): dibuja en un canvas transparente los títulos, recuadros y rótulos de cada placa que trae `userData.panel`. |
| `herramientas/cab_asiento.py`, `blender/cab_asiento.glb` | **Bastón, piso y varillaje** (etapa 6, 11/11; Blender): caña cromada, empuñadura y botón como mallas `palanca_*` (main.js las gira desde PIVOTE), fuelle, parches antideslizantes, varillas rojas. |
| `herramientas/cab_radios.py`, `blender/cab_radios.glb` | **Consola de radios compacta** (etapa 5, 11/11; Blender): caja sobre la pared derecha y bloque inclinado con la cara de los equipos (`userData.radios`); los equipos los dibuja `radios.js`. |
| `herramientas/cab_consola.py`, `blender/cab_consola.glb` | **La pared izquierda** (etapa 4, 11/11; Blender): consola, panel de pared, cuadrante (3 palancas `lev…` de un solo material), FUEL, trims (dial, volante, llave), E-DUMP; placas con `userData.panel` para los rótulos. Importa `Marco`, `llave` y `aro` de `cab_llaves.py`. |
| `herramientas/cab_llaves.py`, `blender/cab_llaves.glb` | **FRDS GEN III, MANUAL SALVO y paneles de llaves bajos** (etapa 3, 8–11/11; Blender): placas, llaves (`llave()`: tuerca + palanca `sw…` con pivote en la base), breakers, display, repisa baja; marco local `Marco(o, u, v, n)` para las placas inclinadas; cada placa escribe `userData.panel` (JSON con marco, títulos y piezas) para los rótulos del juego. Tabla `FILAS` = qué va en cada fila (tipo, nombre del control, rótulo, textos arriba/abajo). |
| `blender/` | Los GLB de la cabina nueva (`cab_*.glb`, uno por zona, con su `*_informe.json`) y las piezas de Lichi que siguen en uso: `pedales.glb` (clip `pedales_timon`: 0 = timón izquierda, 1 s = derecha; sigue a la variable `pedal`; recorrido ±0,2 rad, confirmado por Iván 22/10) y `butaca.glb` (recoloreada en el juego a malla roja y arnés negro hasta tener el asiento de malla). `marco_ventana.glb` y `techo.glb` (parches de la FSX) se retiraron el 11/11. |
| `servidor.py` | Servidor local sin caché (puerto 8765). |
| `TRASPASO.md` | Historia detallada de decisiones y números, incluida toda la saga de parches de la cabina FSX y del exterior (16/10 al 2/11). |
| `PLAN_CABINA_NUEVA.md` | Plan de la cabina nueva de cero (2/11): etapas, piezas por zona, técnica, verificación. Marcar cada etapa HECHA con fecha y versión. |
| `PLAN_CUPULA.md` | Plan detallado de la etapa 1b (3/11): la cúpula nueva (jaula, 3 paños de parabrisas, techo con ventanas, puertas, carenado), medidas desde la 360, corte del FSN, etapas 1b.0–1b.4 y verificación. |
| `taller.html`, `taller/` | **Taller de motores en VR** (bloque del 15/11: T1 a T5, T8 y T9 hechas en local, T6, T7 y T10 en parte; sin publicar; `PLAN_TALLER.md` §9): `piezas.glb` (de `herramientas/taller_piezas.py`: el banco de componentes y las seis piezas a tamaño real, [VERIFICAR]), `agregados.js` (detector de virutas y termocuplas de ITT sumados al holograma sin tocar `engine.js`), `mecanico.js` + `INSPECCION_BORRADOR.md` (el borrador de la inspección para quien valide: no se publica sin la validación de AAXOD), `PROBAR_EN_EL_QUEST.md` (guía para Iván), `muebles.glb` (de `herramientas/taller_muebles.py`: bancos con tableros de siluetas, cajoneras, racks, compresor, ventiladores, matafuegos, lavaojos, oficina con el pizarrón de los créditos, utilería de los puestos, el atril; choques en `userData.choques`), el AT-802 de `juegos/at802.glb` en su puesto (choque por grilla de sus triángulos bajos), `hangar.glb` (de `herramientas/taller_hangar.py`, Blender: la nave de 40 × 60 m con piso, chapa, arcos calados, portón, luces y afuera, luz horneada en colores por vértice; el juego le pone la chapa acanalada y los agujeros por textura y la corre +45 m en z), `mesa.glb` (de `herramientas/taller_mesa.py`, Blender: mesa y cuadrante con `levPLA / levPROP / levCL`, botones y lámparas; rótulos en `userData.cuadrante`), `paneles.js` (placas de canvas: INSTRUMENTOS + FALLAS, ESTACIONES + VISTA, las 6 preguntas, el cartel de estación y alerta, los rótulos del cuadrante), `llamadas.js` (las llamadas a las piezas en 3D), `recorrido.js` (el guion de `tour.js` y las poses del holograma), `main.js` (la nave, o la sala gris si no carga; mesa, caminar con límites, palancas con `controles.js`, lógica de `live.js`, sonido de `audio.js`, pausa de `panelvr.js`, ganchos), `motor.js` (el modelo del simulador de escritorio con las cifras de la cabina), `content.js` y `engine.js` (copias del simulador: la primera idéntica, la segunda con sólo los imports cambiados), `holograma.js` (el motor de `engine.js` dibujado como holograma: 8 cuerpos que giran, sombreador aditivo, aislar y cortar por uniforms, flujo como puntos, proyector). `herramientas/taller_prueba_motor.mjs` compara `taller/motor.js` con `vuelo.js` (tiene que dar cero). |
| `PLAN_TALLER.md` | **Taller de motores del AT-802 en VR** (plan del 15/11, aprobado por Iván ese día): hangar ficticio de AURAV, mesa holográfica con el motor del simulador de turbohélice de escritorio (`content.js` tal cual, `motor.js` con las cifras de la cabina, `engine.js` con materiales de holograma), banco de seis piezas, modos piloto y mecánico, 10 etapas de 3 horas o más cada una (T1–T10, unas 33 h), presupuesto del Quest y las 5 decisiones de Iván. |
| `PLAN_JUEGO.md` | **El juego en tres niveles independientes** para el aula virtual de AURAV (aprobado por Iván el 11/11): 1 puesta en marcha con fallas al azar · 2 misión de incendio · 3 salida con emergencia sorpresa; semilla, registrador, devolución al instructor, constancia y JSON del resultado. J0–J3 hechas el 12/11 (§7); quedan J4 (debrief en VR, Quest) y J5 (POST al aula). |
| `escenario_azar.js`, `registro.js`, `debrief.js`, `constancia.js` | **Niveles (12/11):** la semilla → situación (`generar`, mulberry32), el registrador de la partida (los movimientos seguidos de una misma palanca se funden en un renglón; nombres legibles en `NOMBRES_CONTROL`), la rúbrica + pantalla de resultado + JSON (`localStorage` `aurav_cabina_resultados`) y la constancia con el logo de AAXOD (`aaxod-logo.png`). Links: `?nivel=1[&semilla=S][&alumno=N]`. Semillas de prueba del nivel 1: 100001 normal · 100000 hot start · 100008 hung start · 100002 batería baja. |
| `incendio.js` | **Foco de incendio del nivel 2 (12/11):** frente de llamas (sprites aditivos que titilan), resplandor, columna de humo que nace oscura y se aclara al subir, inclinada por el viento, parche quemado; `poner(x, z, y, viento)`, `controlar(k)` (humo → vapor), `actualizar(dt)`. Unas 32 llamadas de dibujo sólo en los niveles 2 y 3. Referencia: los videos de Iván del 11/11 (`Desktop/WAN_referencias/seedance_prueba*.mp4`, fuera del repo). |
| `herramientas/piloto_prueba.js` | **Piloto de prueba de los niveles 2 y 3 (12/11):** vuela la misión solo desde la consola (palancas y llaves como el alumno + `__auto` para el bastón): despegue, ida, descarga en la ventana, circuito por el este, final a la 18 y aterrizaje; en el nivel 3 resuelve las cinco emergencias según su checklist (sin motor planea al valle y aterriza de frente; `abortarConSenales: true` aborta el despegue si lee las señales). En focos con lomas larga alto (sigue el terreno de adelante). Ver «Probar sin casco». |

## Probar sin casco
- **Taller de motores (15/11):** `python servidor.py 8766` (configuración `taller` de `.claude/launch.json`) y abrir
  `http://localhost:8766/taller.html` (arranca en la partida; `?inicio=mesa` en la mesa; `?holo=0`: el motor con sus materiales originales; `?mecanico=1`: habilita el MODO MECÁNICO del atril, BORRADOR, sólo en local). Si el panel del navegador está en otra pestaña el juego no avanza: las pruebas corren con `correr(t)`. Antes de publicar, `prevuelo_pages.py` ya revisa el taller. Ganchos: `__taller` (`estacion(n)`,
  `falla('hot'|'hung'|'stall'|'fod'|'overtemp'|'none')`, `arrancar()`, `ralenti()`, `corte(v)`, `flujo(v)`, `correr(seg)` adelanta la
  simulación, `medir()` = llamadas, triángulos y lo del holograma, `hud(false)` para capturas limpias, `probarMandos()` = los mandos de VR simulados (24 pruebas: palancas, paneles, pausa, holograma, atril, ubicar), `probarPiloto()` (15: arranques, fallas, recorrido, preguntas), `probarMecanico()` (5), `probarIdentificar()` (las seis piezas), `saltar('mesa'|'partida'|'at802'|'cessna'|'bancos'|'oficina')`, `camino`, `ubicar`, `mecanico`), `__ronda(1..26)` (12 a 16: la nave; 17 a 22: muebles y partida; 23 y 24: el AT-802; 25 y 26: el banco), `__rondaFija(1..11)` (la ronda del plan §10) y
  `__vista(x, y, z, yaw°, pitch°, hfov°)`. Teclas en la ayuda (H). Prueba del motor contra la cabina: `node herramientas/taller_prueba_motor.mjs`.
  El simulador de escritorio para comparar: configuración `turbo-escritorio` (sirve `Documents/aurav-cabina/taller_fuente/`, fuera
  del repo) y abrir `/turbohelice.html` (`LIVE.takeOver(); LIVE.setStation(n)`).
- Servidor local: **`python servidor.py`** en la carpeta del repo y abrir `http://localhost:8765/` (desde el 11/11 carga la
  cabina nueva sin parámetros; `?cabina=…` ya no hace nada).
  Manda `Cache-Control: no-store` en todo: cada F5 trae la última versión DE VERDAD. (Con
  `python -m http.server` pelado el navegador cacheaba index/main/GLB y se veían versiones viejas:
  así se perdió una hora el 1/11 con Iván viendo «vigas» de una build ya corregida.)
- Teclado: flechas = bastón, A/D pedales, B frenos, F flaps, E largar carga, Esc menú, clic = switches/palancas.
- Ganchos de prueba en consola: `__vuelo`, `__controles`, `__mision`, `__vel = 4` (acelera la física), `__auto = {cabeceo: 8, alabeo: 0}` (piloto automático de prueba, en grados).
- Simulación headless sin navegador (rápida): un script Node que importe `vuelo.js` y `mision.js` con un `controles` falso (ver TRASPASO; había uno en `/tmp` de la sesión anterior, rehacerlo si hace falta).
- **Ronda en el navegador (métodos que funcionan):** a pie con `__aPie.bajar()` / `subir()`; para
  ubicarse, `jugador.position.set(...)` + `jugador.rotation.y`, corrigiendo contra `__rumbo()` (antes,
  verificar `__aPie.modo`). `cam.position` es relativa al JUGADOR, no a la mirada; para mirar en
  picada se sube la cámara LOCAL (`cam.position.y` 3 a 4,5 + `cam.rotation.x`). `__mirar(dx, dy)` sólo
  anda en la cabina. La luz sigue la hora real: forzar luz de día antes de capturar. Si la pestaña del
  navegador queda de fondo, el juego va a ~1 fps (traerla al frente). Para saber QUÉ se ve en un
  píxel: proyectar los triángulos con `Vector3.project(cam)` (escalar: `innerWidth` no es el tamaño
  de la captura).
- **Ronda fija con un comando (3/11):** `await __ronda(n)` (n = 1..12, las vistas del plan §6; sin número
  las lista) deja la cámara puesta y dibujada; las de afuera bajan a pie solas y `__ronda(1)` vuelve al
  asiento. `await __vista(x, y, z, yaw°, pitch°, hfov°)` mira desde un punto cualquiera de la cabina
  (yaw positivo = derecha); sin argumentos vuelve al ojo. Sirve para comparar con una foto desde el
  mismo punto (la 360 se tomó en (0; 1,16; 1,58), girada 12,2° a la izquierda y 5,6° arriba). `__ronda(n)`
  siempre vuelve al ojo y al campo de 75° aunque antes se haya usado `__vista`. **`__sonda(u, v, n)` (5/11) dice
  QUÉ se ve en un punto de la pantalla** (u, v de 0 a 1 desde arriba a la izquierda: las primeras n mallas que
  cruza el rayo, con material, distancia y punto en el marco de la cabina): para revisar una captura sin
  adivinar qué pieza es cada mancha. El primer impacto suele ser la esfera del fundido, pegada a la cámara.
- Con el panel del navegador oculto el juego no dibuja (la ventana mide 0×0 y no hay `requestAnimationFrame`): desde el
  7/11 `__ronda`, `__vista` y `__sonda` igual andan (a los 250 ms dibujan un cuadro a mano y la cámara tiene un aspecto de
  repuesto), y las capturas del navegador salen igual; pero las vistas a pie quedan mal encuadradas y todo es más lento:
  mejor mostrar el panel (`show_pane preview`) antes de la ronda.
- **Piloto de prueba del nivel 2 (12/11):** con `?nivel=2&semilla=S` y la pantalla de inicio pasada,
  `const ap = await (await import('./herramientas/piloto_prueba.js?v=' + Date.now())).volarNivel2({ vel: 3 })`; `ap.estado()` dice fase,
  posición, altura, paso del checklist y lo anotado; `ap.parar()`. Opciones: `modo: 'gate'`, `aglDescarga`, `vDescarga`, `desvio` (m, para
  una descarga lejos), `aterrizar: false`. Una partida entera tarda unos 2 min reales a ×3. Las esperas dentro de `javascript_tool` no pueden
  pasar de 45 s (la herramienta corta): consultar `ap.estado()` de a 30 s.
- **Paneles de VR en PC (J4):** `__debriefVR()` muestra frente a la cámara el panel de VR del debrief (con un nivel terminado); la
  tablilla se ve siempre (es una malla de la cabina, `name = 'tablilla'`). «Empezar en VR», el rayo sobre los botones y la pausa al sacarse
  el casco sólo se pueden probar en el Quest.
- **Las capturas del panel del navegador pueden ser un RECORTE, no la ventana entera** (12/11: 800 × 600 de arriba a la izquierda de una
  ventana de 1024 × 768): antes de usar `__sonda(u, v)` con coordenadas sacadas de una captura, poner una marca HTML en un (u, v) conocido
  y mirar dónde cae (ese día: u ≈ x/1009, v ≈ y/757). Y si el panel no está a la vista el juego no avanza (no hay cuadros) hasta la
  primera captura.
- La barra del juego muestra la versión (vAAAAMMDDx): preguntarle a Iván cuál ve antes de diagnosticar.

## Controles y simulación (re-cableado el 8–11/11 con los nombres de la cabina nueva)
- **Tabla `SW` vigente (main.js):** BATT `swBATT` (MASTER, fila ENGINE OPERATION), GEN `swGEN`, IGNTR `swIGN` (3 posiciones: ON · OFF ·
  CONTINUOUS; los extremos encienden), START `swSTART` (vuelve solo al encender), FPUMP `swFPUMP` (tablero, 3 posiciones), AVNC `swAVNC`
  (MASTER AVIONICS del PAC24, radios), PITOT `swPITOT`, WIPER `swWIPER`, LDG `swLDG_L`, DOME `swWORK`, BCN `swPULSE`, NAV y STRB
  `swSTRBNAV`, HOPR `swFRDS` (FRDS POWER), FRDS `swARMED`. ALTN, HYD y SPARE no existen en el 802 (quedan en la tabla apuntando a nada).
  **FIRE = `swFUEL`** (manija FUEL: `pos` OFF · MAIN, estado 0 = OFF corta el combustible y hace de «FIRE» para la misión, `Mision.fuegoConFuel`;
  a confirmar con Bruno). Palancas `levPOT / levHEL / levCOND` (cuadrante) y `levEDUMP` (adelante = larga todo). Trims: `swK_TRIMTIMON`
  (dial, 7 posiciones), `swK_TRIMPROF` (volante, 11), `swTRIMALERON` (3, vuelve sola): suman al mando (`vuelo.mando.trim*`). FRDS:
  `swFRDS_GATE / MODE / FOAM / GAL / COV` y `swSALVO` (momentáneas, las maneja `cabina_nueva.js`). `swFLAPS` (panel bajo derecho) cicla
  0°/10°/20°. Las demás llaves de los paneles bajos se mueven pero no hacen nada (luces).
- **Nivel 3 (12/11):** en `vuelo.motor`: `senal` (señales previas: aceite que cae y torque que tiembla, ITT que sube, generador que parpadea),
  `fallaGen` ('fija' | 'recuperable': vuelve con GEN OFF→ON; `genSw` lo pone main.js), `carga` (batería 1 → 0 en ~8 min sin generador;
  `consumo` = luces, pitot, aviónica; a 0 V se apagan las pantallas), `falla` + `sinRearranque` (mecánica: no rearranca). `frds.trabada`
  (cabina_nueva.js): GATE y SALVO no abren y sale el evento `compuerta-trabada`. **La manija E-DUMP larga por `largarCarga(true)`** (1,5 s),
  así la misión la ve como descarga (antes ponía `agua = 0` de golpe y el nivel 2 decía «volvió sin largar»).
- (Lo de abajo es de la cabina FSX; vale sólo como historia del cableado.)
- **Manual** (26/10): `Desktop/AURAV/AT-802-802A_Pilot_Training_Course.pdf` (77 págs., NO subirlo al
  repo). Notas en `herramientas/mapa_cabina.md`.
- **Tabla `SW` en main.js** (nombre lógico → malla): BATT `sw62`, ALTN `sw64`, GEN `sw56`, IGNTR `sw53`
  (3 posiciones: ON · OFF · CONTINUO; los extremos encienden), START `sw47` (vuelve solo al encender),
  FIRE `sw60` (corte de combustible + extintor), F PUMP `swFPUMP` (3 posiciones), HYD `sw54`, AVNC
  `sw63`, PITOT `sw50`, luces `sw52/49/61/51/48`, HOPR/FRDS/WIPER `swHOPR/swFRDS/swWIPER`, SPARE `sw38`.
  `mision.js` pregunta `sw('BATT')` y `lev('levPOT')`: al re-cablear cambia la tabla, no la misión.
- Otros controles: `swFUEL` válvula MAIN · OFF (en OFF se corta el motor); `swWRUD` traba de la rueda
  de cola (accionada = cola libre); `swFLAPS` cicla 0°/10°/20°; `swK_TRIMTIMON` (7 posiciones);
  `levEDUMP` adelante = tolva a cero; `swTEST` push-to-test del anunciador (se suelta solo).
- **Palancas:** adelante = ángulo negativo (−0,9), atrás 0,15. `levPOT` sigue hasta 0,42 detrás del
  ralentí (0,17–0,42 = beta: `c.reversa` da empuje negativo y la luz BETA sigue a `vuelo.enBeta`);
  `levHEL` atrás = bandera; `levCOND` 3 posiciones (corte · ground idle · flight).
- **`controles.js`:** tipos switch, 3 posiciones (`SW3` → `hacerTresPosiciones`; estado 1 / 0 / −1),
  varias posiciones (`pos`, `eje`) y perilla (`perilla: paso`). Lee de `userData`: `piv`, `pivBase`,
  `pivY`, `eje`, `ang`, `pos`, `perilla`, `suave`.
- **La tablilla (`hudVR`, main.js; J4, 12/11):** un plano de 31 × 19 cm recostado sobre el ALA DERECHA del tablero y vuelto hacia el ojo
  (posición (0,305; 1,135; z_cara + 0,07), giro YXZ −0,25 / −0,2). Dos vistas: MENSAJE (lo que dicta el tutor en la práctica; la torre y
  los avisos en los niveles) y CHECKLIST (sólo en los niveles: fase y «paso i/n», la orden de vuelo fija —`ui.orden`—, el próximo paso en
  grande y los que siguen). Con el checklist activo un mensaje dura 7 s. La placa roja MENÚ · SALIR cuelga de su borde de abajo. Antes
  (8/11) iba prendida al parante derecho del parabrisas y el parante le tapaba un tercio del texto: **toda placa nueva se verifica con rayos
  desde el ojo (0; 1,38; 1,64) y con la cabeza corrida ±8 cm antes de darla por buena.**
- **Tutor:** marca con un aro amarillo el control de cada paso (`ui.marcar`; `marca` en el paso o
  inferido de `listo`). Los procedimientos siguen el **checklist normal de AAXOD** (CHECK LIST 802 NORM
  ed2 Rev01, propiedad de Nueva Frontera SpA: NO subirlo al repo público).
- **Niveles en VR (J4):** se entra con «Empezar en VR» desde la pantalla de inicio (`entrarVR()`: tiene que llamarse desde un clic); al
  cerrar, a los 3 s el mundo se detiene (`congelado`) y sale el panel del debrief; B/Y o la placa roja = pausa (Seguir · Empezar de nuevo ·
  Salir de VR); si la sesión de VR termina con el nivel en curso, queda en pausa.
- **VR:** cualquier switch o palanca se acciona también apuntándolo con el rayo + gatillo
  (`controles.impacto`, tolerancia 2,5 cm); agarre a menos de 6 cm (switches) o 10 cm (palancas). El
  audio se reanuda en cada gesto (el Quest lo suspende al entrar en VR).
- Quest: joystick izquierdo X = pedales, atrás = frenos; derecho arriba/abajo = flaps; botón del joystick o A/X = recentrar al ojo del piloto; B/Y o la placa roja «MENÚ · SALIR» (debajo de la tablilla) = pausa con Seguir / Menú / Salir de VR. En PC: Esc o «Menú».
- **Puerta que abre: SUPRIMIDA** (decisión de Iván 24/10): se entra con fundido a negro (`apie.js`).

## Números del avión (a validar con el POH y los pilotos de AAXOD)
Masa vacía+piloto+combustible 3200 kg, tolva hasta 3100 kg; S 37,25 m², b 18 m; CL = 0,4 + 5,5α + 0,5·flaps, CD0 0,045; pérdida 15°+2·flaps;
potencia 1350 shp, empuje estático ≤ 19,5 kN; rota ~95–105 mph cargado, asciende ~1300 fpm, planea ~9:1 a 110 mph; Vne 220 mph;
ITT crucero ~420+3,8·torque °C, pico de arranque ~700; Ng ralentí 60 %; hélice 1700 rpm. Fuego: se apaga 5 s después de ralentí + condición a corte + FIRE; a los 45 s es fatal.

## Blender
- Se trabaja con Blender 5.2 EN SEGUNDO PLANO, con scripts que quedan en el repo:
  `"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python herramientas/<script>.py`.
  Así salieron los pedales, la butaca, el antepecho y el techo (`blender/*.glb`), y así va la cabina nueva.
- Reglas: geometría por vértices (prismas), sin rotaciones euler (dos intentos dieron piezas volteadas);
  conversión glTF → Blender `b(v) = (x, −z, y)`; renders de prueba con Eevee ANTES de integrar; lo que
  sigue al casco se mide con rayos contra `exterior.glb` (método de `techo_blender.py`).
- Opcional: el complemento Blender Lab (MCP, `localhost:9876`) ejecuta Python en el Blender abierto de
  Iván; el 1/11 no estaba conectado. No usar a la vez el botón «Connect to Claude» del otro
  complemento (ahujasid, mismo puerto).

## Lecciones que siguen valiendo (de la saga de parches; detalle en TRASPASO.md)
- **Exterior FSN:** normales mezcladas → todo a doble cara y nunca recalcular normales. Está lleno de
  chapas-isla sueltas que caen hacia adentro: NO borrar del casco (mat02 piel, mat22 vidrio) con cajas
  o islas «generosas»; sólo con una firma inequívoca y verificando en el acto. Los vidrios dobles se
  distinguen con un rayo radial (BVH), no por la normal.
- **Sobre el casco curvo no van piezas rectas** (molduras, listones, tapas): flotan o asoman desde algún
  ángulo. Lo que toca la chapa se mide con rayos.
- **Toda pieza interior cerca de un hueco del casco se ve desde afuera:** bordes lejos de las ventanas.
- **Nunca aplastar vértices de mallas grandes por caja** (estira triángulos por todo el cockpit):
  descartar triángulos enteros.
- **Al repintar, dejar afuera los materiales transparentes** (los vidrios quedaban opacos); al ocultar,
  sólo `visible = false` (nunca volver a prender algo al reindexar).
- **Leer la 360 siempre con la pose** (`cab_foto360.rayo` + `pose` de `cupula_puntos.json`): la cámara estaba 5,6° inclinada
  hacia arriba y las vistas planas de `vista360.py` no lo corrigen (el tablero salió 6 cm más bajo el 8/11 hasta proyectar bien).
- **Medir, no adivinar:** vértices contra el plano del parabrisas; triángulos proyectados a píxeles
  para saber qué se ve.
- **Verificar el MISMO lado que la captura de Iván** y mandarle las vistas.

## Pendientes (en orden)
0. **El juego por niveles (`PLAN_JUEGO.md`):** de la J4 queda lo de Iván: probar los tres niveles en el Quest (entrar con «Empezar en VR»,
   leer la tablilla del ala derecha, el debrief en el casco, la pausa; publicado el 12/11) y lo que salga de esa prueba; después J5 (POST al aula cuando exista). Y
   las preguntas de §5 (límites de arranque, ventana de descarga y coberturas, emergencias que quieren, umbral, Bruno). J0–J3 y el código de
   la J4, hechos el 12/11.
0b. **Pedido de Iván (11/11): el mismo AT-802 (exterior y cabina nueva) en los otros juegos de AURAV** (rampa/señaleros `aurav-senales`,
   apoyos terrestres «MOE», …) para que se vea siempre la misma aeronave: tarea aparte, después de los niveles.
   **Plan escrito el 14/11: `PLAN_AVION_JUEGOS.md`** (inventario: sólo `aurav-senales` y `aurav-sector` —el del MOE— tienen AT-802, el
   mismo `at802.glb` de simulador; script `herramientas/avion_juegos.py` que exporta el avión al marco de esos juegos con hélice que
   gira y LOD; variantes y decisiones). **Aprobado por Iván el 15/11 («sí, cabina y exterior»).** Etapa A HECHA el 15/11:
   `python -E -P -X utf8 herramientas/avion_juegos.py [--librea azul|bordo]` → `juegos/at802.glb` (2,5 MB, 71 k tri, 9 llamadas,
   con cabina liviana y hélice en `helice-eje` → `helice`) y `juegos/at802-lod.glb` (0,9 MB, 15 k tri; lo simplifica Blender con
   `herramientas/avion_juegos_lod.py`); visor `juegos/ver.html` (`__ver('…')`). **Etapas B (señaleros) y C (sector) HECHAS el
   15/11**, commits locales sin publicar; librea azul (elegida por Iván). **Para un juego nuevo con el AT-802: `juegos/LEEME.md`.**
   Válvula de sector: la real, centro-izquierda (Iván: «así está bien»). Sin matrícula (Iván, 16/11). Falta: publicar y el Quest. Detalle en el plan
   §5. Hallazgo de paso: en el
   exterior del simulador las luces de punta de ala están invertidas (verde a la izquierda, roja a la derecha; el GLB de los juegos
   ya las trae bien; en la cabina queda por corregir).
0c. **Pedido de Iván (15/11): taller de motores del AT-802 en VR** (hangar ficticio de AURAV, el AT-802 de este repo, un Cessna 172
   en reparación y una mesa holográfica con el turbohélice genérico del simulador de escritorio del repo `aurav`; modos piloto y
   mecánico). **Plan escrito el 15/11: `PLAN_TALLER.md`**; espera el ok de Iván y sus decisiones (§13, de a una). Decididas el
   15/11: la 1 (uso interno, como la cabina), la 2 (página nueva, `taller.html`; del juego sólo se toca un botón del menú) y la 3a
   (el modo mecánico identifica, ubica e inspecciona; la inspección necesita la validación de AAXOD antes de publicar). La 3b
   (quién valida) está pendiente: Iván todavía no lo sabe; sin eso el modo mecánico no se publica. La 4: seis piezas en el banco
   (ignitor, inyector, álabe, malla, detector de virutas y termocupla de ITT; las dos últimas se suman al holograma). La 5: manda
   la cabina (el holograma toma las cifras de `vuelo.js`; el simulador de escritorio queda igual). **Etapas (pedido de Iván,
   15/11): 10 bloques de trabajo de 3 horas o más (T1–T10, unas 33 h), cada uno con tramos, reserva y cierre (§9 del plan); se
   larga con «arrancá T1».** **Plan APROBADO por Iván el 15/11. T1 HECHA ese día** (base y holograma en una sala gris) **y T2 y T3
   adelantadas y hechas en el mismo bloque** (mesa del GLB, cuadrante, panel de instrumentos y fallas, cartel; panel de estaciones y
   vista, llamadas 3D, las 6 preguntas, el recorrido con poses del holograma, agarrarlo) **y la T4** (la nave del hangar) **y la T5** (muebles, atril de partida con la elección de modo, saltos con fundido, choque al caminar), **la T8** (banco de componentes, piezas agregadas al holograma, ubicar) **y la T9 en local** (modo mecánico detrás de `?mecanico=1`), más el tramo 1 de la T6 (el AT-802 en su puesto) y los tramos 1 a 3 de la T7 (camino, voz, piloto de prueba) y de la T10 (rendimiento: peor vista 68 llamadas y 73 k tri; `prevuelo_pages.py`; la guía del Quest); detalle en el plan §9. **Look del holograma: A, celeste y ámbar (lo eligió Iván el 15/11).** **16/11: Iván lo miró en la PC y pidió cambiar la dinámica** (`PLAN_TALLER.md` §15, **espera su ok antes de armarla**): entrar recorriendo el AT-802 (familiarización con puntos y tarjetas), elegir «ver motor» en su motor y que el motor se presente A ESCALA REAL, entero a la vista desde unos 3 m, girándolo con la mano (después se achica o se agranda). Y cada tarjeta del recorrido (hélice, escapes, tolva, compuerta, cabina, ala y tren, cola) con su pieza «en las manos» en holograma, de a una (§15.2b: la hélice y la cabina vienen sueltas en `juegos/at802.glb`; el resto se recorta del exterior; la tolva por dentro y la compuerta hay que modelarlas con fotos o medidas). Ya hecho de ese pedido: el ruido del motor sólo se oye junto al holograma (en el hangar no hay motores en marcha). El Quest sin batería ese día: la prueba en el casco queda para después (guía con dos caminos, por Wi-Fi y por cable, en `taller/PROBAR_EN_EL_QUEST.md`; `adb` no está instalado). **Oks de Iván del 15/11 («Quedan así»):** la mesa, el cuadrante y los paneles; la nave con sus medidas; los muebles, el atril de partida y el AT-802 en su puesto; el banco y la forma de ubicar (el lugar titila al acercar la pieza); y el torque rojo desde 85 % queda así en el taller y en la cabina. **Lo que falta es de Iván:** probar el modo piloto entero en la PC; el Cessna queda para después (15/11, «Seguir sin él»: su puesto queda con el cartel, el carro y la bandeja; cuando lo baje de Sketchfab a `Documents/aurav-cabina/taller_fuente/cessna/`, se hace el resto de la T6); quién valida el modo mecánico (3b, con `taller/INSPECCION_BORRADOR.md`); probar en el Quest (`taller/PROBAR_EN_EL_QUEST.md`) y el ok para publicar (recién ahí el botón del menú del juego). Láminas en `Documents/aurav-cabina/capturas_taller/`. La fuente del simulador quedó FUERA del repo, en
   `Documents/aurav-cabina/taller_fuente/` (el zip y el traspaso, en `OneDrive/Desktop/AURAV/HOLOGRAMA/`). No se tocó el juego.
1. Etapa 7, lo que depende de Iván: su ok a las vistas de las etapas 3–6, Bruno (FUEGO = FUEL OFF), la prueba en el Quest (pantallas
   legibles, alcance de llaves y palancas, altura del ojo). Publicada el 12/11; lo que siga se vuelve a subir sólo con su ok (y subiendo
   `version.txt`, `VERSION_PAGINA` y los `?v=`).
2. Versión definitiva de la etapa 6: asiento de malla roja de verdad (`butaca_blender.py` nuevo), placa AIR TRACTOR de los pedales,
   conducto de aire. Y lo anotado como «queda» en cada etapa del plan (fotos de cerca para rótulos, traba de cola, freno de estacionamiento).
3. Probar en el Quest: altura del ojo, agarre de switches (6 cm) y palancas (10 cm), sensibilidad del bastón (`LIMITE = 0.3` rad → mando ±1), legibilidad de la tablilla `hudVR`.
3. Voz guía más completa, sonido ambiente y radio con torre (pedido 18/10).
4. Certificado final estilo AAXOD como en los otros juegos (`constancia.js` de aurav-senales).

## Trampas conocidas
- `git push` NUNCA en segundo plano: el gestor de credenciales de Windows necesita la terminal (falla con exit 128 «could not read Username»). Siempre en primer plano. **Y siempre indicando la cuenta (12/11):** en esta PC hay DOS cuentas de GitHub guardadas (Ivan-I-Aguilar, la de AURAV, y otra de Iván para otro proyecto); con `git push` a secas el gestor abre una ventana «Select an account» que queda escondida y el push se cuelga sin decir nada (así se perdieron 5 min al publicar el 12/11). Usar el comando de «Publicar» (`git -c credential.https://github.com.username=Ivan-I-Aguilar push origin main`). Si igual se cuelga, `Get-Process git-credential-manager | Select MainWindowTitle` (PowerShell) dice qué ventana está esperando; antes de reintentar, matar el árbol del push (`taskkill /PID <pid de git push> /T /F`).
- `node --check` no detecta todos los errores de sintaxis de estos módulos: probar también `new Function(src sin imports)` o cargar la página.
- Nunca meter un comentario `//` en medio de una línea al hacer reemplazos de texto: ya se tragó código tres veces. Usar `/* */`.
- `controles.armar` asume mallas con transform identidad (posición horneada en la geometría); para agregar un control nuevo, trasladar la geometría (`geometry.translate`) y nombrarlo `sw…` o `lev…` antes de `armar`. **Un control = UNA malla con UN material:** con dos materiales el exportador glTF parte la malla en `nombre_1` / `nombre_2` y `armar` ve dos controles (11/11, palancas del cuadrante). Al hornear geometría desde JS (la llave `swAVNC`) usar `grupo.matrix`, no `matrixWorld` (ésa mete el giro del GLB y la posición del avión).
- En los scripts de Blender, calcular los grupos a unir ANTES del primer `bpy.ops.object.join()`: los objetos unidos se borran y la lista `PIEZAS` queda con referencias muertas (`StructRNA … has been removed`).
- El cielo es una esfera de 1500 m que sigue al avión; el terreno plano llega a ±1200 m y el pasto a ±1600 m. Las sierras empiezan a 300–650 m del aeródromo salvo el valle de la pista.
- Python: Pillow y numpy están instalados con `--user`; con `python -I` no aparecen: usar `python -E -P`.
- El conector de Google Drive no baja archivos de más de 10 MB: buscar primero la copia local.
- **La cámara 360 (KeyMission) son DOS lentes** (costuras en lon ±90° de la foto): lo cercano se ve desde dos
  pupilas (±1,1 cm) y la imagen trasera está girada 0,25° (y 0,78° según la simetría). A 50 cm es hasta 1 cm:
  usar siempre `cab_foto360.rayo()` / `proyectar()`, no marcar a menos de 2° de la costura y partir ahí los bordes.
- **Al leer bordes en una 360, mirar el recorte ampliado antes de creerle a un perfil de luminancia:** el
  limpiaparabrisas pasó por parante en la etapa 0 y de ahí salió una «asimetría» de 5° que no existía.
- Al escribir rutas de Windows en estos archivos, cuidar las barras invertidas: `\a`, `\f` y `\r` se
  convirtieron alguna vez en caracteres de control y rompieron rutas (arreglado el 2/11).
