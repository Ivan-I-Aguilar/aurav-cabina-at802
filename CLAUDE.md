# aurav-cabina-at802 — guía para Claude Code

Cabina del Air Tractor AT-802 en WebXR (Three.js r180, sin bundler) para AURAV, el proyecto de formación
aeronáutica de Iván. Uso interno de prueba (AAXOD). Se abre en el Quest desde GitHub Pages:
https://ivan-i-aguilar.github.io/aurav-cabina-at802/

## Cómo trabajar con Iván
- Castellano rioplatense, «vos». Respuestas **breves**. Una cosa por vez.
- Preguntas de a **una**, con opciones numeradas y siempre una opción abierta.
- Avanzar sin pedir permiso para cambios chicos; preguntar antes de rehacer algo grande.
- Él prueba en el **Meta Quest** y en Chrome. Nosotros no podemos probar en el casco: decirlo siempre que corresponda.
- **Antes de mostrar una captura, revisarla con ojo crítico** (pedido 25/10): si se ve algo raro —bulto, pieza flotante, hueco, algo que asoma— es un defecto: corregirlo SIN esperar a que Iván lo marque. Correr la ronda de vistas (adentro, esquinas, puerta) tras cada cambio.
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

## Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | UI de PC: barra, tutor, lista de tareas, panel de botones, HUD de prueba. |
| `main.js` | Arma la escena: `avion` (cuerpo que vuela, +x adelante) → `cabina` (GLB girado −90°, tren en el piso) + `jugador` (cámara / manos). Mapea controles→vuelo (`aplicarControles`, tabla `SW`), bastón de mando, manija roja `levDUMP`, radios, humo/luz de fuego, UI, recentrado VR, bucle con física a 120 Hz. |
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
| `cabina.glb` | Interior del Fire Boss convertido (6,8 MB). **No editar a mano: se regenera.** Al cargar el exterior: de TODAS sus mallas (salvo controles `sw/lev/pedal/palanca/varilla/puerta` y las ya interiores) queda sólo lo del habitáculo (ahí está la **butaca**, con la textura AT_01 del exterior) y la chapa de la cúpula como malla lisa (`m14_techo`, color 0xbabbba y rugosidad 0,8: el mismo blanco gris de la textura del fuselaje); al exterior se le saca la caja `CUPULA` (la cúpula la pone la cabina); `m9` (disco de hélice) se oculta. **m1 (tablero+cubretablero, 25/10):** no se recorta, se APLASTAN sus vértices al contorno del capó de fábrica (techo y≈1,12–1,16, semiancho 0,58/0,63; lo que estaba a y>1,3 se hunde a 1,02): entero por dentro, nada asoma por fuera. **m22 (vidrios/parantes viejos):** queda sólo lo de detrás del plano del parabrisas de fábrica (z > 0,74 + 0,93·(y−1,05)); m27 desaparece (la cúpula de fábrica pone vidrios y parantes). |
| `exterior.glb` | **AT-802 TERRESTRE real** (22-23/10, Lichi): sale del OBJ de Metasequoia en `Documentsurav-cabinasx
ar_terrestre\Air Tractor AT-802iles\AT802-4.obj` (familia FSN, tren de ballesta, ruedas y hélice de 5 palas de fábrica). Se regenera con `herramientas/exterior_terrestre2.py`: aplica la matriz del importador (¡clave!), orienta (deriva a −y, envergadura ±9,03), alinea (ruedas al piso −2, cúpula centrada en la nuestra), blanquea el AMARILLO de sus texturas conservando remaches y deja TAL CUAL la pintura AZUL de fábrica (franjas convergentes y deriva; decisión de Iván 24/10: «respetar el modelo base, pintado azul, sin volverse loco»), borra el «493» de la deriva (relleno con el azul de alrededor) y el «RESTRICTED» (quedaba espejado), pinta por geometría SOLO las ruedas (goma negra, medidas del modelo) y en textura las palas Hartzell negras con banda roja (cajas PALA/PALA_BANDA en at_01), borra su interior; su cúpula queda entera pero SIN sus vidrios en la zona de cabina (los vidrios y la vista interior los pone la cabina). **Todo a doble cara y SIN recalcular normales**: las normales del OBJ vienen mezcladas y el recálculo global dio vuelta chapas (alas/cúpula desaparecían según el ángulo). Suma el estribo. El atlas del OBJ comparte texels: NO hornear librea por posición ahí. Versión `V_EXT` en main.js. |
| `herramientas/` | Conversor y utilidades (ver abajo). `pedales_blender.py` regenera `blender/pedales.glb` (Blender en segundo plano). |
| `blender/` | Piezas animadas hechas en Blender (Lichi): `pedales.glb` + `.blend` + vistas previas. Los pedales originales se recortan de la cabina al cargar (`PEDAL_VIEJO` en main.js) y el clip `pedales_timon` (0 = timón izquierda, 1 s = derecha) sigue a la variable `pedal`. Recorrido ±0,2 rad (~11°), confirmado por Iván 22/10. |
| `TRASPASO.md` | Historia detallada de decisiones y números. Leerlo antes de tocar la conversión. |

## Regenerar `cabina.glb` (sólo si hace falta tocar la geometría)
Fuente: `at802_intA.MDL` + carpeta `texture/` de la instalación FSX (`C:\Users\ivani\Documents\aurav-cabina\fsx\SimObjects\Airplanes\...`).
```
SIN_AGUJAS=1 python3 herramientas/relojes.py cabina.glb relojes          # caras de los relojes (PNG)
EXTRAER="swWIPER:34:-0.462,0.77,-0.95,-0.436,0.84,-0.86;swHOPR:34:-0.317,0.77,-0.95,-0.291,0.84,-0.86;swFRDS:34:-0.281,0.77,-0.95,-0.255,0.84,-0.86;swFPUMP:34:0.069,0.77,-0.95,0.095,0.84,-0.86" \
MOVIL="sw:38,47,48,49,50,51,52,53,54,56,60,61,62,63,64;lev:75,77,42" PALANCA="65,66,127,128,129" \
CUT="23:-0.2,0.88,-0.98,0.28,1.14,-0.70" python3 -I herramientas/mdl2glb.py at802_intA.MDL texture cabina.glb relojes
python3 -I herramientas/instrumentos.py cabina.glb instrumentos.json
```
Coordenadas de CUT/EXTRAER en el marco del MDL (z sin invertir: el GLB tiene z = −z_mdl). Partes y materiales: `LISTA=1` imprime el bbox de cada PART.
Marco del GLB (= `cabina`): +x derecha del piloto, +y arriba, −z adelante; ojo del piloto en (0, 1.38, 1.64) — subido el 22/10: con 1,15 el tablero tapaba el horizonte.

## Probar sin casco
- Servidor local: `python -m http.server 8765` en la carpeta del repo y abrir `http://localhost:8765/`.
- Teclado: flechas = bastón, A/D pedales, B frenos, F flaps, E largar carga, Esc menú, clic = switches/palancas.
- Ganchos de prueba en consola: `__vuelo`, `__controles`, `__mision`, `__vel = 4` (acelera la física), `__auto = {cabeceo: 8, alabeo: 0}` (piloto automático de prueba, en grados).
- Simulación headless sin navegador (rápida): un script Node que importe `vuelo.js` y `mision.js` con un `controles` falso (ver TRASPASO; había uno en `/tmp` de la sesión anterior, rehacerlo si hace falta).

## Mapeo de la cabina
- **MANUAL CONSEGUIDO (26/10):** `Desktop/AURAV/AT-802-802A_Pilot_Training_Course.pdf` (77 págs., NO subirlo al repo). El mapeo completo está en `herramientas/mapa_cabina.md`. Claves: `swFUEL` es MAIN·OFF (2 posiciones, no 3); `swWRUD` es la TRABA DE RUEDA DE COLA (no timón de agua); `sw53` IGNTR es de 3 posiciones (ON · OFF · CONTINUO); `levCOND` confirmado 3 posiciones (corte · ground idle · flight); la manija roja quitada era el E-DUMP neumático (restituir); HECHOS (26/10, `crearExtrasManual` en main.js): brújula whiskey sobre la joroba del tablero (tarjeta cilíndrica que gira con el rumbo; signo a validar en vuelo), anunciador de 5 celdas bajo el GPS (LOW VOLT y GEN OUT cableadas a batería/generador; FUEL FILT, AIR FILT y BETA apagadas hasta modelar filtros y reversa) y manija roja E-DUMP en la consola izquierda (palanca `levEDUMP`: adelante = tolva a cero). HECHO el push-to-test (botón `swTEST` junto al anunciador: prende las 5 celdas 1,8 s y se suelta solo) y la REVERSA (26/10): `levPOT` viaja hasta 0,42 detrás del ralentí (0,17–0,42 = beta), `c.reversa` da empuje negativo (hasta 35 % del estático, con motor andando) y la luz BETA sigue a `vuelo.enBeta`. Quedan FUEL FILT y AIR FILT sin lógica (sólo test). El PANEL DE LLAVES también se reconstruyó (26/10): placa al plano del tablero con rótulos dibujados (diccionario ROTULOS en crearExtrasManual, escalonados en dos alturas) y las palanquitas corridas al frente (sus pivotes se mueven en z); el panel viejo queda tapado detrás. El tablero flotaba DELANTE del panel de switches (captura de Iván 26/10) → REHECHO como ESTRUCTURA ÚNICA (26/10, video de Iván: «el tablero es una sola cosa»): tres paños ALTOS (y 0,70–1,25, x −0,615..0,605) con relojes arriba, llaves abajo con rótulos, FRDS integrado en el paño izquierdo, placards, GPS, tapa superior (glareshield), repisas y mejillas FrontSide; m1 y m18 ocultos del todo; las llaves y perillas se corren a su paño (pivotes en z). Recentrado VR al subir ahora a 72 cuadros (se caía «arriba del techo»). Exterior (video 26/10): palas negras parejas con banda roja, escapes a metal oscuro (mat21), parche del 493 por CLONADO de la franja de arriba (el plano se notaba), COMPUERTA ROJA bajo la tolva (reglamentación). Ajustes posteriores (26/10): los extras se crean DESPUÉS de crearTablero (antes no veían sus planos y el subpanel FRDS no se creaba); la placa de llaves termina en x 0,50 (no atraviesa el pedestal de radios) y baja a y 0,715; el cuerpo del swWIPER se recorta a 3 cm de fondo; SUBPANEL FRDS propio en el plano del ala izquierda (placa «FRDS GEN II» con pantallita dibujada) con sus perillas y palanquitas corridas al frente (quedaban tapadas por el ala). Texto original del inventario:
- **Inventario de piezas móviles sin función todavía** (ya con manual, ver mapa_cabina.md): selector de combustible `swFUEL` (3 pos.: OFF · medio · BOTH), `swWRUD` (timón de agua), `swAUX`, panel FRDS: perillas `swK_FRDS1..3`, palanquitas `swFRDS_A..C`, `swFRDS_D` (AUTO/MAN/OFF, 3 pos.), compensador de timón `swK_TRIMTIMON` (7 pos.). Tipos en controles.js: switch, 3 posiciones (`SW3`), varias posiciones (`pos: [ángulos]`, `eje`), perilla giratoria (`perilla: paso`). La ventana es un **paño fijo** de la puerta. **Puerta que abre: SUPRIMIDA** (decisión de Iván 24/10: prioridad = fidelidad del modelo; se entra con fundido a negro, `apie.js`). La cúpula del terrestre queda entera de fábrica, vidrios incluidos (mat22 con tinte 25 %). La traba roja `swTRABA` sigue siendo manipulable, hoy sin función. (Viejo: `blender/puerta.glb` (Lichi: marco, vidrio 6 mm, bisagras, manija; clip `puerta_abrir`, bisagra en el borde de arriba del vidrio). `crearPuerta` saca el vidrio lateral original (triángulos de `m27` con las 6 esquinas `VIDRIO`) — ya no se carga.) Faltan: botón SALVO, perillas de los instrumentos.
- Consola izquierda (recortadas en la carga, `MANIJAS`): `swFUEL` VÁLVULA de combustible (26/10, manual: 2 posiciones MAIN = pose del modelo · OFF = +90°; en OFF se corta el motor), `swWRUD` TRABA DE RUEDA DE COLA (accionada = cola libre, giro en tierra 2,6 en vez de 1,2), `swFLAPS`, `swAUX` (candidata: Prop Overspeed Test). Los switches aceptan `piv`, `eje` y `ang: [apagado, encendido]`.
- **Switches de 3 posiciones** (arriba · medio · abajo): lista `SW3` en main.js → `controles.hacerTresPosiciones`. Estado 1 / 0 / −1; cada toque avanza arriba → medio → abajo → medio… Por ahora sólo `swFPUMP`. Para la simulación los extremos cuentan como encendido. RESUELTO con el manual (26/10): `sw53` IGNTR es de 3 posiciones (ON · OFF · CONTINUO; los extremos encienden). Faltan por decidir las del A/C (si algún día se agregan).
- Switches del panel central (los únicos que son piezas): BATT `sw62`, ALTN `sw64`, GEN `sw56`, IGNTR `sw53`, START `sw47` (vuelve solo al encender), FIRE `sw60` (corte de combustible + extintor), F PUMP `swFPUMP`, HYD `sw54`, AVNC `sw63`, PITOT `sw50`, luces `sw52/49/61/51/48`, HOPR/FRDS/WIPER `swHOPR/swFRDS/swWIPER`, SPARE `sw38`.
- Palancas: se recortan **en tiempo de carga** de las mallas grandes (`MANIJAS` + `recortarManija` en main.js): `levPOT` manija POWER blanca (m16), `levHEL` perilla azul + varilla amarilla (m16+m23, atrás = bandera), `levCOND` perilla gris (m2+m6, atrás = corte; **a confirmar**). La manija roja agregada (`levDUMP`) **se sacó** (22/10): la descarga es el botón del mango del bastón (en VR: con el bastón agarrado, el otro botón; en PC: E). `levHEL` incluye mango negro y punta gris (antes quedaban quietos). Adelante = ángulo negativo (`−0.9`), atrás `0.15`; `escala` achica el recorrido visual y `pivY` fija el pivote. Las `lev75/77/42` de la conversión eran varillitas del mecanismo (quedan fijas como `varilla*`).
- Procedimientos: puesta en marcha y despegue siguen el **checklist normal de AAXOD** (CHECK LIST 802 NORM ed2 Rev01, propiedad de Nueva Frontera SpA: no subirlo al repo público). El tutor marca con un aro amarillo el control de cada paso (`ui.marcar`, `marca` en el paso o inferido de `listo`).
- VR: cualquier switch o palanca se acciona también **apuntándolo con el rayo + gatillo** (`controles.impacto`, tolerante a 2,5 cm). `swFLAPS` y `swAUX` (consola izquierda, m34) se recortan en la carga como las manijas; FLAPS cicla 0°/10°/20°. Las piezas de `EXTRAER` venían con todo el buffer de vértices: se compactan con `toNonIndexed` antes de `armar`. El audio se reanuda en cada gesto (el Quest lo suspende al entrar en VR).
- Quest: joystick izquierdo X = pedales, atrás = frenos; derecho arriba/abajo = flaps; botón del joystick o A/X = recentrar al ojo del piloto; B/Y o la placa roja «MENÚ · SALIR» (debajo de la tablilla) = pausa con Seguir / Menú / Salir de VR. En PC: Esc o «Menú».

## Números del avión (a validar con el POH y los pilotos de AAXOD)
Masa vacía+piloto+combustible 3200 kg, tolva hasta 3100 kg; S 37,25 m², b 18 m; CL = 0,4 + 5,5α + 0,5·flaps, CD0 0,045; pérdida 15°+2·flaps;
potencia 1350 shp, empuje estático ≤ 19,5 kN; rota ~95–105 mph cargado, asciende ~1300 fpm, planea ~9:1 a 110 mph; Vne 220 mph;
ITT crucero ~420+3,8·torque °C, pico de arranque ~700; Ng ralentí 60 %; hélice 1700 rpm. Fuego: se apaga 5 s después de ralentí + condición a corte + FIRE; a los 45 s es fatal.

## Herramienta disponible: Blender + MCP (proponerla cuando sirva)
Iván tiene Blender 5.2 conectado a **Claude Code** con el complemento oficial de Blender Lab (`bl_ext.BlenderLab.mcp`, arranca solo en localhost:9876): las herramientas `mcp__Blender__*` ejecutan Python en su Blender abierto. Así se modelan piezas y se exportan a GLB directo a esta carpeta. No usar a la vez el botón «Connect to Claude» del otro complemento (ahujasid, mismo puerto). Previews con Eevee (placa de 6 GB).
**Ofrecerla** cuando haga falta una pieza que el modelo FSX no trae o trae mal: pedales móviles, perillas, palancas que «se rompen», panel inferior real (en vez de la tapa negra), palanquitas de switches, exterior con librea AUR-AV. Se modela aparte y se carga como GLB encima de `cabina.glb`.

## Dónde quedamos (27/10)
- **Tanda «sigue mal» (27/10, noche 2, v=20261027t): cuatro culpables reales encontrados.** (1) La BRÚJULA
  flotaba en el aire sobre el cubretablero (geométricamente adentro, pero sin soporte): ahora va MONTADA al
  parante central del parabrisas con un soporte (caja 1,33/1,085 + bracket en 1,046; tarjeta 1,304/1,118).
  (2) La MEJILLA a doble cara se veía como PLACA NEGRA flotante por el vano de la puerta → FrontSide chica
  (0,20×0,30). (3) El fallback de m14 (butaca) en cuerina oscura pintaba TODAS las chapas de m14 y se veían
  placas negras por vano y vidrio → m14 va chapa clara 0xc6c6c0. (4) El MAMPARO asomaba como cresta por el
  lomo: el perfil estaba medido en banda ancha; perfil FINO a z 2,24-2,36 MENOS 2 cm, mamparo a z 2,33
  (tope 1,69). También: mat21 pierde TODOS sus nodos de textura (exhaust.dds quedaba en otro canal y el tubo
  se veía BRONCE; V_EXT 20261027r). MÉTODO que destrabó todo: medir vértices world→cabina por caja en el
  navegador e identificar la malla por nombre/material/color, en vez de adivinar por captura.
- **«Sigue sobresaliendo» (27/10, noche, v=20261027o): RESUELTO con medición en vivo.** Un chequeo por
  vértices contra el plano del parabrisas (z = 0,74 + 0,93·(y−1,02)) encontró 4 piezas AFUERA: la esquina
  del paño central 6 mm (el d0 calculado de los relojes era menor al supuesto → ahora `d0 =
  Math.max(d0c + 0.010, 0.955)`, CLAMP explícito), su marco 16 mm, la ESQUINA INTERNA de las tapas
  glareshield laterales 25 mm (el barrido las hunde → `zPie` lleva +0,055 si f.lado) y la tablilla hudVR
  24 mm (movida a (0,33, 1,29, 1,13)). Verificación: el mismo chequeo da CERO violaciones y la vista de la
  captura de Iván quedó limpia. MÉTODO para «sobresale»: medir vértices world→local contra el plano del
  vidrio en el navegador, no confiar en d0 teórico.
- **Mamparo trasero DEFINITIVO (27/10, noche, v=20261027n):** ShapeGeometry con la FORMA del fuselaje
  (perfil medido a z 2,3-2,5: tope y 1,78, hombros 0,48-0,54, base ±0,66-0,68) en z 2,37, FrontSide,
  `name='mamparo'`. OJO TRAMPA: toda malla agregada a `g.scene` con transform (position/rotation) la OCULTA
  el recorte general del exterior-then (usa coordenadas LOCALES): hay que sumarla al regex de exentos
  (`sw|lev|pedal|palanca|puerta|mamparo`). Por eso las dos versiones anteriores del mamparo nunca se vieron.
  Tope al RAS del perfil: con 2,10 asomaba sobre el lomo visto desde afuera (el plano es FrontSide pero de
  frente se ve). Al mirar atrás desde el asiento se ven los CINTURONES azules del respaldo de la butaca:
  no confundirlos con el túnel de cola.
- **REPINTADO LISO TOTAL** (decisión de Iván 27/10: «colores mentirosos pero liso»; la textura blanqueada se
  veía borrosa y moteada): las texturas at_01/02/04 se QUITAN de los materiales (color plano BLANCO 0.845,
  roughness 0.5) y la librea va por GEOMETRÍA con cortes bisect: franja azul z 0,04–0,20 + línea fina
  0,24–0,27 en los flancos (|normal.x|>0.35, sólo materiales de piel), cola azul desde y −4,85 (deriva Y
  timón; con −5,75 la deriva quedaba blanca), puntas de ala |x|>8,42; palas negras con banda roja por
  geometría (radio 1,16–1,30 del eje a z 0,3); blanquear() queda sin uso. mat21 escape: Base 0.03,
  metallic 0.2 (con 0.6 reflejaba DORADO). Rueda de cola: caja goma ampliada (−6,75..−5,85, |x|<0,18).
- **Sistema de carga REAL** (fotos del avión AAXOD en `Documents/aurav-cabina/fotos/detalles/`): se BORRÓ
  todo el conjunto de fábrica (acoples+patas+caños sueltos, islas mat08/mat30/mat05 chicas bajo la panza) y
  se construye con primitivas: codo de acero a la panza + FLEXIBLE VERDE con abrazaderas + tubo de carga
  colgando con boca (objetos carga_* en el script, mathutils to_track_quat). Centro-izquierda, detrás de la tolva.
- **Cabina (capturas de Iván 27/10):** tablero a d0+0.010 (con +0.019 el canto llegaba al vano de la puerta;
  OJO: la cúpula real llega a |x| 0,66 a y 0,9 — el canto queda adentro), paños laterales w 0,375/0,38 con
  bisel t 0,36, mejillas 0,26×0,36 a DOBLE CARA (pared lateral del tablero, se veía el canto crudo por el
  vano), perilla swK_FRDS1 +0,025 adentro; glareshield INCLINADO (del tope del paño al capó en y 1,12: la
  tapa horizontal atravesaba el parabrisas); E-DUMP al FONDO del pedestal (z 1,26: adelante quedaba
  incrustado contra el tablero); parante frontal izquierdo de m26 (cúpula interior) ESPEJADO contra el
  derecho (umbral 2 mm: estaba «salido» ~8 cm y luego con escalón); MAMPARO blanco detrás del asiento
  (1,5×2,3 en z 2,44: se veía el túnel de cola); ventilador+reloj de fábrica del rincón derecho BORRADOS
  (islas de piel del OBJ en el script + clamp m23/m12/m16/m21 en main.js: «un instrumento debajo de otro»);
  butaca sin atlas → cuerina gris (0x55524c).
- Todo verificado con ronda (exterior 4 lados, cola, panza, interior). Local SIN publicar, v=20261027i.
  OJO ronda: el juego tiene luz por hora real (anochece): capturar de día o considerar la luz.
- **Capturas de Iván del 27/10, resueltas (local, v=20261027b, SIN publicar):** (1) el TABLERO asomaba por
  fuera del parabrisas visto desde afuera-arriba → todo el tablero 2,5 cm atrás (`d0 + 0.019` en vez de
  `− 0.006`; el tope quedaba 8 mm DELANTE del vidrio) y el glareshield pasó de tapa horizontal de 22 cm (que
  ATRAVESABA el vidrio) a TAPA INCLINADA del tope del paño al pie del parabrisas (muere en el capó, y 1,12);
  (2) el ACOPLE de carga seguía «suelto»: las patas/soportes de fábrica (mat08 chicas + mat30, ~1500 caras) se
  BORRAN y el cilindro se EMPOTRA en el flanco (−0,14 x · +0,085 z): sólo asoma la boca; (3) los ESCAPES tenían
  el labio BLANCO: el anillo (mat15/mat10 en la caja del escape, 24 caras) pasa a mat21 oscuro; (4) la textura
  se veía «borrosa, con manchitas azules»: morfología sobre la máscara azul en `blanquear()` (apertura+cierre:
  mata motas ≤2 px y rellena huecos ≤4 px en las franjas) y el export ya NO baja las texturas a 1024 (quedan
  2048: el fuselaje se veía borroso en el Quest). exterior.glb pasó de 4,1 a 6,9 MB. Ronda verificada.
  **Pendiente de decisión de Iván:** si la textura de fábrica limpia alcanza o pasamos a REPINTADO liso total
  («colores mentirosos», como el ala y la compuerta) — eso borraría remaches y franjas de textura: la franja
  azul habría que rehacerla por geometría (bisect como la librea AURAV bordó vieja).
- **CONSOLAS LATERALES RECONSTRUIDAS** (pedido de Iván 26/10, hecho 27/10, local SIN publicar, v=20261026w):
  `crearConsolas()` en main.js (corre tras crearTablero/extras y ANTES de `new Instrumentos`): cajas oscuras
  de pared (±0,615) a muslo (±0,37), y 0,56–0,70 (tapa), z 0,96–1,63. Izquierda: PEDESTAL del cuadrante
  (z 0,96–1,33, tapa y 0,76) con 3 ranuras dibujadas y rotuladas (CONDITION·POWER·PROP con CUT/GRD/FLT,
  REV/IDLE/MAX, FTHR/MAX) + E-DUMP encima (movido a −0,575/0,762/1,04); tapa trasera y 0,70 con FLAPS,
  PROP O/S TEST, T/W LOCK, RUD TRIM rotulados y el **suction empotrado mirando arriba** (reubicado: la tapa
  lo tragaba). Derecha: consola portaequipos que ABRAZA el pedestal de radios + placa CIRCUIT BREAKERS
  dibujada; la «baulerita» (m20) se oculta (verificado: no abre huecos). Los pivotes armados se TRASLADAN
  (`mover('piv_…')`): levPOT +0,04 y, levHEL +0,08 y, levCOND +0,06/+0,18 (se junta con sus hermanas),
  FLAPS/AUX +0,045, TRIM +0,04, WRUD −0,05 (flotaba). Piecitas de fábrica que asomaban por las tapas se
  hunden por clamp de vértices en la carga (dos cajitas, lado derecho). Ronda hecha (picadas, frente,
  exterior ambos lados): limpio. Falta que Iván lo pruebe en el Quest. OJO para rondas futuras: si el panel
  del navegador queda de fondo, el juego corre a ~1 fps y los screenshots salen congelados (frontear el tab).
- Pendiente charla con Iván: pedales que «se ven lejos» (¿acercar asiento u ojo?); orden real de las palancas
  del cuadrante en x (el FSX trae COND afuera · POWER medio · PROP adentro; validar con Bruno/manual).

## Dónde quedamos (26/10, tarde)
- **Local SIN publicar, v=20261026u** (Pages sigue en 20261026r). Del video de Iván 26/10 quedaron resueltos y
  verificados con ronda de vistas en el navegador: paños laterales del tablero afinados con la altura (bisel
  paramétrico `t` en `forma()`: ya no asoman por el casco), **burbuja de la compuerta ENTERA roja** (por islas
  conexas contenidas en la caja del pod), **acoples de carga pegados al flanco** (mat08: 10 cm adentro + 6 cm
  arriba), **palas negras parejas con banda roja EN la punta** (tira completa v 0..0.292 pintada incondicional:
  el filtro «azul» conservaba el metal gastado y las moteaba; banda en v 0.250–0.284), brújula verificada desde
  afuera (queda detrás del vidrio, depthTest ok).
- Falta charlar (próxima etapa grande): reconstruir las consolas laterales como el tablero (la izquierda tapa el
  cuadrante de palancas, la «baulerita» derecha tapa las radios), pedales que se ven lejos.
- Sin resolver viejo (18/10): «una palanca de la izquierda se rompe» al accionarla; preguntar cuál.

## Próximo gran paso: el avión completo (decidido 22/10)
- **Fuente completa conseguida (22/10):** `OneDrive\Desktop\AURAVir_tractor_43YXO.zip` (FSN AT802 empaquetado para MSFS) extraído en `Documentsurav-cabinasxir_tractor\SimObjects\AIRPLANES\Air Tractor Amphib\`: `model/at802_amp.MDL` (exterior anfibio), `at802_intA.MDL` (cabina), `texture/` + `texture.bare/` (sin pintar) + N6159F/EC-KRF/FSN, `sound/` (36 sonidos reales), `panel/Panel.cfg`, docs. Exterior convertido: `fsx/salida/exterior_bare.glb` (160 partes, 18,2 × 10,8 m). Requiere `pip install --user numpy pillow` para `mdl2glb.py`.
- **Avance 22/10 (Lichi):** `fsx/salida/at802_terrestre_trabajo.blend` = exterior sin flotadores ni soportes (borrado por altura < −0,95 m y piezas sueltas bajo la panza fuera del centro). Tren terrestre hecho (colección `tren_terrestre`: patas de ballesta, ruedas Ø0,74 m con trocha 3 m bajo z=0, rueda de cola en z=6,3). **El piso queda a y = −2,0 en el marco de la cabina** (con 11° de nariz arriba apoyan las 3 ruedas): `ALTURA_CABINA` = 2,0 (hecho). Piloto (m23, PILOT_T) y discos de hélice (m12, PROP.BMP) sacados. **Librea AURAV** horneada por posición 3D en `fsx/salida/tex/aurav_at01/02/04.png` (franja bordó con línea fina, puntas rojas en alas y estabilizadores, parte alta del timón roja). Unido con la cabina en el juego (4,2 MB, ~35 mil triángulos). Falta: matrícula. (Caminar, estribo y puerta: hechos.) Ojo: la limpieza del interior del exterior se llevó la chapa de los costados; se recuperó del `exterior_bare.glb` (sólo |x| ≥ 0,55). El Fire Boss (con flotadores) se conserva en `exterior_bare.glb` como variante.
- (Viejo, superado por el OBJ terrestre) Exterior = modelo FSX del Fire Boss (mismo autor que la cabina: encaja perfecto y es fiel al AT-802). `Documentsurav-cabinaireboss.zip` está **incompleto** (111 de 203 MB; rikoooo cortó por límite de descargas): Iván lo vuelve a bajar a mano.
- Con el paquete completo: extraer el MDL exterior y las texturas (`texture.N6159F`), además de **panel.cfg, gauges XML y las definiciones de animación**, que dicen qué hace cada perilla y switch (para darles función).
- Lichi (Blender): unir exterior + cabina, librea AURAV (franja bordó, matrícula), **puerta** que abre con la traba roja (la ventana es fija), **estribos** para subir, tren. En el juego: caminar alrededor, subir y entrar a la cabina.

## Pendientes (en el orden que pidió Iván)
1. Probar en el Quest (el recentrado ya anda, 18/10): altura del ojo, distancia de agarre de switches (6 cm) y palancas (10 cm), sensibilidad del bastón (`LIMITE = 0.3` rad → mando ±1), legibilidad de la tablilla `hudVR`.
2. Limpiaparabrisas manipulable (los pedales ya se mueven, 22/10; falta probarlos en el Quest) (recortarlos de la malla grande con `EXTRAER`, como los switches).
3. Perillas (knobs) del panel.
4. Exterior con la librea AUR-AV (franja bordó y matrícula): generar las texturas `AT_01_T`/`AT_02_T` o conseguirlas de `texture.N6159F`. Encajar el `at802.glb` de aurav-sector no funcionó (proporciones distintas).
5. Instrumentos con fotos reales del panel cuando Iván las saque en AAXOD (pegarlas por isla UV en `relojes.py`).
6. Voz guía más completa, sonido ambiente y radio con torre (pedido 18/10).
7. Certificado final estilo AAXOD como en los otros juegos (`constancia.js` de aurav-senales).

## Trampas conocidas
- `git push` NUNCA en segundo plano: el gestor de credenciales de Windows necesita la terminal (falla con exit 128 «could not read Username»). Siempre en primer plano.
- `node --check` no detecta todos los errores de sintaxis de estos módulos: probar también `new Function(src sin imports)` o cargar la página.
- Panel inferior negro (`tapa` en main.js) tapa el hueco del soporte del GPS; el horizonte lleva una caja cilíndrica atrás.
- Nunca meter un comentario `//` en medio de una línea al hacer reemplazos de texto: ya se tragó código tres veces. Usar `/* */`.
- `controles.armar` asume mallas con transform identidad (posición horneada en la geometría); para agregar un control nuevo, trasladar la geometría (`geometry.translate`) y nombrarlo `sw…` o `lev…` antes de `armar`.
- Las caras de los relojes se dibujan **sin** agujas (`SIN_AGUJAS=1`); las agujas son mallas de `instrumentos.js`.
- El cielo es una esfera de 1500 m que sigue al avión; el terreno plano llega a ±1200 m y el pasto a ±1600 m. Las sierras empiezan a 300–650 m del aeródromo salvo el valle de la pista.
