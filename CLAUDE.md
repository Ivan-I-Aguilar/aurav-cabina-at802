# aurav-cabina-at802 — guía para Claude Code

Cabina del Air Tractor AT-802 en WebXR (Three.js r180, sin bundler) para AURAV, el proyecto de formación
aeronáutica de Iván. Uso interno de prueba (AAXOD). Se abre en el Quest desde GitHub Pages:
https://ivan-i-aguilar.github.io/aurav-cabina-at802/

**Ahora mismo (2/11): se rehace la cabina de cero en Blender, según `PLAN_CABINA_NUEVA.md`.** Leerlo
antes de tocar cualquier cosa de la cabina. La historia de los parches de la cabina FSX y del exterior
(16/10 al 2/11) está en `TRASPASO.md`.

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
```
git add -A
git -c user.name="Ivan I. Aguilar" -c user.email="aguivanig@gmail.com" commit -m "..."
git push origin main
```
**Versión de la página:** `version.txt` y `VERSION_PAGINA` en index.html tienen que coincidir con el `?v=` de main.js; si el navegador guardó un index viejo, se recarga solo. **Siempre subir la versión** de los imports (`?v=AAAAMMDDx`) en `index.html` (main.js) y en `main.js` para cada módulo o
GLB que cambie: el Quest cachea agresivamente. Si Iván dice «no cargó / no cambió», casi siempre es caché.

## Estado (3/11)
- **Publicado:** Pages sirve v=20261028d (push 6433ea7 del 28/10, con el ok de Iván).
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
  fuera del repo). **Sigue: la etapa 1b, con su plan detallado en `PLAN_CUPULA.md` (3/11), que Iván
  tiene que aprobar antes de modelar.** Arranca por la medición (1b.0: `cupula_puntos.json` y lámina).
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
| `main.js` | Arma la escena: `avion` (cuerpo que vuela, +x adelante) → `cabina` (GLB girado −90°, tren en el piso) + `jugador` (cámara / manos). Mapea controles→vuelo (`aplicarControles`, tabla `SW`), bastón de mando, manija E-DUMP `levEDUMP`, radios, humo/luz de fuego, UI, recentrado VR, bucle con física a 120 Hz. Hoy también sostiene la cabina FSX con sus parches de carga (recorte general, mamparos, faldones), que la cabina nueva elimina. |
| `vuelo.js` | Modelo de vuelo + motor PT6 simplificados. Eventos: despegue, contacto, accidente, largado, tolva-vacia, vne, fuego-extinguido, fuego-incontrolado. `suelo(x,z)` = terreno. |
| `mision.js` | Fases: arranque → despegue → crucero → falla de motor → crucero → fuego → despegue con tolva llena → falla a 150 ft. Puntaje y observaciones. `menu()`, `empezar(desde)`. |
| `controles.js` | Switches (`sw*`) y palancas (`lev*`) del GLB con pivote; VR (gatillo/grip cerca, o pinchar) y clic en PC. |
| `instrumentos.js` + `instrumentos.json` | Agujas 3D, horizonte y (25/10) carátulas dibujadas en vivo (`CARAS`) + biseles: el tablero nuevo no trae caras pintadas. Escalas iguales a `herramientas/relojes.py`. |
| `radios.js` | Consola de radios derecha (pedestal 3D con canvas). |
| `audio.js` | Turbina/hélice sintetizadas, campana de fuego, bocina de pérdida. Voz: audios pregrabados `voz/<clave>.wav` (el Quest no tiene speechSynthesis); si falta la frase, voz del navegador. |
| `voz/` + `herramientas/voces.py` + `voces.ps1` | Frases del tutor → WAV con la voz Sabina de Windows. **Cada vez que cambie un texto de mision.js/main.js:** `python -I herramientas/voces.py` y `powershell -ExecutionPolicy Bypass -File herramientas/voces.ps1` (sólo genera las nuevas). Pronunciaciones en `PRONUNCIA`. |
| `apie.js` | Modo a pie (22/10): caminar alrededor del avión (VR: joystick izq. camina, der. gira 30°; PC: WASD/flechas + mouse; celular: joystick en pantalla + arrastrar para mirar + tocar), colisión simple con fuselaje y hélice, cartel «SUBIR» junto al estribo (izquierda, bajo la cabina) → animación estribo → raíz del ala → asiento (en VR: fundido). «Bajar del avión» / «Volver a la cabina» en la pausa; «Recorrer el avión (a pie)» en el menú. |
| (celular) | **Modo cámara** (botón `#ar`, Android/Chrome con WebXR AR): el teléfono es una cámara dentro de la escena con 6 grados de libertad (caminás de verdad); botón `#entorno` alterna **pista virtual / lugar real** (en lugar real se oculta el entorno; renderer con `alpha`). **Escala** (`#escala`, `aplicarEscalaCamara`): el jugador se agranda k veces (1:5 por defecto; 1:10, 1:20, real). `cuidarSeguimiento`: compensa saltos de >12 cm por cuadro y avisa si el seguimiento se pierde (`emulatedPosition`) → el avión se ve como maqueta a altura de mesa y tus pasos rinden k veces; al subir a la cabina vuelve a 1. Pensado para usarlo dentro de una casa. Tocar la pantalla = gatillo (subir, switches). **Giroscopio** (botón `#giro`, cualquier celular incl. iPhone): mirar moviendo el teléfono; para desplazarse, joystick a la **derecha**. No probado en celular real. |
| `panelvr.js` | Panel de botones para VR (igual que en aurav-senales). |
| `escenario.js`, `tex/`, `autobomba.glb` | Aeródromo de AURAV copiado de aurav-sector, con valle plano a lo largo de la pista (`dRect`) y `alturaTerreno`. |
| `cabina.glb` | Interior del Fire Boss de FSX convertido (7 MB). **Se reemplaza por la cabina nueva** (`PLAN_CABINA_NUEVA.md`): no seguir parchándolo. Cómo se regeneraba y toda su historia: `TRASPASO.md`. |
| `exterior.glb` | **AT-802 TERRESTRE real** (22-23/10, Lichi): sale del OBJ de Metasequoia en `Documents\aurav-cabina\fsx\rar_terrestre\Air Tractor AT-802\files\AT802-4.obj` (familia FSN, tren de ballesta, ruedas y hélice de 5 palas de fábrica). Se regenera con `herramientas/exterior_terrestre2.py`: aplica la matriz del importador (¡clave!), orienta (deriva a −y, envergadura ±9,03), alinea (ruedas al piso −2, cúpula centrada en la nuestra), blanquea el AMARILLO de sus texturas conservando remaches y deja TAL CUAL la pintura AZUL de fábrica (franjas convergentes y deriva; decisión de Iván 24/10: «respetar el modelo base, pintado azul, sin volverse loco»), borra el «493» de la deriva (relleno con el azul de alrededor) y el «RESTRICTED» (quedaba espejado), pinta por geometría SOLO las ruedas (goma negra, medidas del modelo) y en textura las palas Hartzell negras con banda roja (cajas PALA/PALA_BANDA en at_01), borra su interior; su cúpula queda entera pero SIN sus vidrios en la zona de cabina (los vidrios y la vista interior los pone la cabina). **Todo a doble cara y SIN recalcular normales**: las normales del OBJ vienen mezcladas y el recálculo global dio vuelta chapas (alas/cúpula desaparecían según el ángulo). Suma el estribo. El atlas del OBJ comparte texels: NO hornear librea por posición ahí. Versión `V_EXT` en main.js. (Después, 27/10: repintado liso total con la franja y la cola azules por geometría; ver TRASPASO.) |
| `herramientas/` | `exterior_terrestre2.py` (regenera el exterior), scripts de Blender `*_blender.py`, `vista360.py` (vista plana desde una foto 360), `voces.py` / `voces.ps1`, `mapa_cabina.md` (notas del manual) y los de la cabina FSX vieja (`mdl2glb.py`, `relojes.py`, `instrumentos.py`). |
| `herramientas/cab_*.py` | **Cabina nueva** (etapa 0, 3/11). `cab_comun.py`: lo común (marco cabina ↔ Blender, prismas por vértices, materiales, `Casco` = exterior.glb con BVH y rayos, `medir_casco` → `blender/casco_medido.json`, `Panorama` para calcar fotos 360, `control()` con propiedades → userData, `exportar()` con `export_extras`, `vista()` Eevee, `chequear()` = los 6 chequeos del plan; corrido directo mide el casco y prueba el chequeador). `cab_calcar.py` (pose de una 360 contra el FSN: `-- carpeta [--foto 54] [--afuera]`), `cab_superponer.py` (superposiciones y medidas en cm, Pillow), `cab_render_pose.py` (el FSN visto desde la pose), `cab_plano.py` (plano del casco). Poses y medidas en `blender/calcado/`; las imágenes con foto, FUERA del repo en `Documents/aurav-cabina/fotos/calcado_etapa0/`. |
| `cabina_nueva.js` | Carga la cabina nueva con `?cabina=nueva` (exterior + GLB por zona `blender/cab_*.glb` según `PIEZAS`, hoy vacía, + las líneas del casco medido y el ojo). Con `?cabina=vieja` (o nada) sigue la FSX con sus parches. |
| `blender/` | Piezas hechas en Blender por scripts (Lichi): `pedales.glb` (clip `pedales_timon`: 0 = timón izquierda, 1 s = derecha; sigue a la variable `pedal`; recorrido ±0,2 rad, confirmado por Iván 22/10), y `butaca.glb`, `marco_ventana.glb` y `techo.glb`, parches provisorios hasta la cabina nueva. |
| `servidor.py` | Servidor local sin caché (puerto 8765). |
| `TRASPASO.md` | Historia detallada de decisiones y números, incluida toda la saga de parches de la cabina FSX y del exterior (16/10 al 2/11). |
| `PLAN_CABINA_NUEVA.md` | Plan de la cabina nueva de cero (2/11): etapas, piezas por zona, técnica, verificación. Marcar cada etapa HECHA con fecha y versión. |
| `PLAN_CUPULA.md` | Plan detallado de la etapa 1b (3/11): la cúpula nueva (jaula, 3 paños de parabrisas, techo con ventanas, puertas, carenado), medidas desde la 360, corte del FSN, etapas 1b.0–1b.4 y verificación. |

## Probar sin casco
- Servidor local: **`python servidor.py`** en la carpeta del repo y abrir `http://localhost:8765/`.
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
  mismo punto (la 360 se tomó en (0; 1,16; 1,58), girada 13° a la izquierda y 6° arriba).
- La barra del juego muestra la versión (vAAAAMMDDx): preguntarle a Iván cuál ve antes de diagnosticar.

## Controles y simulación (lo vigente, hasta re-cablear la cabina nueva)
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
- **Tutor:** marca con un aro amarillo el control de cada paso (`ui.marcar`; `marca` en el paso o
  inferido de `listo`). Los procedimientos siguen el **checklist normal de AAXOD** (CHECK LIST 802 NORM
  ed2 Rev01, propiedad de Nueva Frontera SpA: NO subirlo al repo público).
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
- **Medir, no adivinar:** vértices contra el plano del parabrisas; triángulos proyectados a píxeles
  para saber qué se ve.
- **Verificar el MISMO lado que la captura de Iván** y mandarle las vistas.

## Pendientes (en orden)
1. La cabina nueva (`PLAN_CABINA_NUEVA.md`).
2. Probar en el Quest: altura del ojo, agarre de switches (6 cm) y palancas (10 cm), sensibilidad del bastón (`LIMITE = 0.3` rad → mando ±1), legibilidad de la tablilla `hudVR`.
3. Voz guía más completa, sonido ambiente y radio con torre (pedido 18/10).
4. Certificado final estilo AAXOD como en los otros juegos (`constancia.js` de aurav-senales).

## Trampas conocidas
- `git push` NUNCA en segundo plano: el gestor de credenciales de Windows necesita la terminal (falla con exit 128 «could not read Username»). Siempre en primer plano.
- `node --check` no detecta todos los errores de sintaxis de estos módulos: probar también `new Function(src sin imports)` o cargar la página.
- Nunca meter un comentario `//` en medio de una línea al hacer reemplazos de texto: ya se tragó código tres veces. Usar `/* */`.
- `controles.armar` asume mallas con transform identidad (posición horneada en la geometría); para agregar un control nuevo, trasladar la geometría (`geometry.translate`) y nombrarlo `sw…` o `lev…` antes de `armar`.
- El cielo es una esfera de 1500 m que sigue al avión; el terreno plano llega a ±1200 m y el pasto a ±1600 m. Las sierras empiezan a 300–650 m del aeródromo salvo el valle de la pista.
- Python: Pillow y numpy están instalados con `--user`; con `python -I` no aparecen: usar `python -E -P`.
- El conector de Google Drive no baja archivos de más de 10 MB: buscar primero la copia local.
- Al escribir rutas de Windows en estos archivos, cuidar las barras invertidas: `\a`, `\f` y `\r` se
  convirtieron alguna vez en caracteres de control y rompieron rutas (arreglado el 2/11).
