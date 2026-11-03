# TRASPASO · Cabina AT-802 (aurav-cabina-at802) — 16/10/2026

## Contexto
- Iván (AAXOD / AURAV) pidió «el STL o GLB más fiable de la cabina del AT-802». Es para uso interno. Se eligió el **AT-802 Fire Boss freeware de FSX** (Flight Sim Nation, descargado de rikoooo).
- Hablarle en castellano rioplatense con «vos». Respuestas BREVES. Una pregunta por vez, con opciones y siempre una opción abierta.

## Dónde está
- **Repo:** `Ivan-I-Aguilar/aurav-cabina-at802` (público, GitHub Pages en `main` / raíz).
- **Sitio:** https://ivan-i-aguilar.github.io/aurav-cabina-at802/
- **Clon en la PC de Iván:** `C:\Users\ivani\Documents\aurav-cabina-at802`
  - Git: `& 'C:\Program Files\Git\cmd\git.exe'`
  - Identidad: `-c user.name='Ivan I. Aguilar' -c user.email='aguivanig@gmail.com'`
- **Instalación FSX del Fire Boss:** `C:\Users\ivani\Documents\aurav-cabina\fsx\SimObjects\Airplanes\...`

## Archivos del repo
- **`index.html`, `main.js`**: visor Three.js con WebXR.
  - Vista del piloto: `OJO = (0, 1.15, 1.6)`; hacia adelante es −z.
  - En VR se mueve el avión para que el ojo quede a 1,2 m del piso.
  - Versión de imports: `?v=20261016b`. Subirla en cada cambio.
- **`cabina.glb`**: interior convertido (6,6 MB).
- **`herramientas/mdl2glb.py`**: convierte un MDL de FSX a GLB.
  - Uso: `python3 -I mdl2glb.py at802_intA.MDL <carpeta texture> salida.glb [carpeta_relojes]`
  - Formato MDLX:
    - TEXT: 64 B por textura.
    - MATE: 120 B por material.
    - INDE: índices uint16.
    - VERB/VERT: 32 B por vértice (pos, normal, uv).
    - PART: 9 int (tipo, nodo, material, vb, vOff, vCount, iOff, iCount, mouseRect).
  - SCEN/AMAP/TRAN se hornean como fila×matriz.
  - Se invierte z y el orden de los triángulos.
- **`herramientas/relojes.py`**: dibuja caras genéricas de instrumentos en las texturas dinámicas `$ATVC_01..04`. En FSX esas texturas las pintaba el panel en vivo. Detecta las islas UV (círculos → dial, rectángulos → display).
- **`herramientas/uvplot.py`**: grafica el mapa UV de una malla.
- Modelo fuente: `model/at802_intA.MDL` (interior según Model.cfg) y la carpeta `texture/`.

## Estado
- La cabina se ve bien desde el asiento: panel, palancas, comando, placas y consola de lanzamiento de agua.
- Los relojes ya no salen gris sólido. Ahora tienen caras **genéricas** (números 0–10 y agujas fijas): no son los instrumentos reales.
- **«Uno parece que sale del tablero»:** es el GPS (malla m13 / `$ATVC_04`). Flota delante de un hueco del panel donde se ven cables. Opciones: ocultarlo, moverlo o rellenar el hueco.
- El exterior (alas, capot) se ve gris. Faltan `AT_01_T` y `AT_02_T`, que están en las carpetas `texture.<matrícula>` (N6159F, EC-KRF, FSN) de la instalación.
- **No se probó en el Quest.**

## Próximo paso
1. Iván va a mandar **fotos reales del panel**: idealmente de frente y de cerca, con buena luz, además de las 360 que tiene en el Drive.
2. Recortar cada instrumento real y pegarlo en la isla UV que le corresponde en `relojes.py`. Para eso hay que hacer el mapa instrumento → posición 3D/UV con `uvplot.py` y un render de cerca del panel.
3. Decidir qué hacer con el GPS.
4. Opcional: textura exterior.

## Nota de licencia
Es freeware. Revisar el readme antes de cualquier uso fuera de lo interno.

## Actualización 16/10 (noche)
- Instrumentos dibujados a mano por tipo (`herramientas/relojes.py`, tabla `ASIG` por posición 3D): velocímetro, horizonte, altímetro, VSI, torque, ITT, hélice, Ng, fuel flow, reloj, y los chicos de la izquierda (combustible, aceite, volts, amps, hidráulico). Las agujas son fijas.
- Entorno: `escenario.js` + `tex/` + `autobomba.glb` + `aurav-plano-aereo.webp` copiados de aurav-sector. El avión mira a +x (pista); el GLB se gira −90° en `avion`. Ojo a 2,7 m del piso. En VR la cámara va dentro del grupo `jugador`.
- GPS (m13) oculto.
- Soporte del GPS recortado en la conversión (`CUT="23:-0.2,0.88,-0.98,0.28,1.14,-0.70"` al correr mdl2glb.py; coords del modelo, z sin invertir).
- `radios.js`: consola de radios derecha dibujada en canvas (GPS portátil, audio, GNS, COM/NAV, transponder). Posición/escala en main.js.
- Bastón de mando móvil: en la conversión las partes 65,66,127,128,129 salen como mallas `palanca_*` (`PALANCA="65,66,127,128,129"`). En main.js cuelgan de un pivote en la base (0.004, 0.22, 0.969), enderezado con `INCL_NEUTRA = -0.25`. En VR: gatillo o grip a < 25 cm del puño lo agarra; sigue la mano con tope ±0.3 rad y vuelve al centro al soltar. En PC: flechas. No mueve superficies del exterior (no hay alerones en el modelo interior).
- Comando completo de conversión: `PALANCA="65,66,127,128,129" CUT="23:-0.2,0.88,-0.98,0.28,1.14,-0.70" python3 -I herramientas/mdl2glb.py at802_intA.MDL texture cabina.glb relojes`

## 17/10
- Recentrado en VR: al entrar (12 cuadros después) y con el botón del joystick o A/X se lleva el casco exactamente al ojo del piloto, esté sentado o parado (`recentrar()` en main.js). Antes se restaba 1,2 m fijo y Iván «parecía parado en el asiento».
- Exterior: m14 y m15 (fuselaje/alas, sin textura AT_01_T/AT_02_T) pintados blanco en main.js. Se intentó encajar el `at802.glb` de aurav-sector alrededor de la cabina: las proporciones no coinciden (la maqueta tiene la cabina sobre el ala; el FSX la tiene detrás) y desde adentro se ven paredes. Descartado por ahora; si se quiere la franja bordó y el AUR-AV habría que generar las texturas AT_01_T/AT_02_T (UV desconocidas) o pedir las del instalador (`texture.N6159F`).
- Pedidos pendientes de Iván (17/10): procedimiento de puesta en marcha guiado; consola de radios derecha más real (la actual «está mal»); manipular switches, pedales, perillas y limpiaparabrisas (los switches son partes separadas de 42 vértices, mat 26 = palanquita y mat 34 = cuerpo; se pueden pivotar como el bastón).
- Consola de radios rehecha en 3D (`radios.js`): pedestal negro con equipos como cajas con bisel, pantallas y perillas; GPS en soporte arriba. Posición en main.js: (0.57, 0.86, 0.97), rot (0.08, −0.42, 0), escala 1.2.
- Controles manipulables (`controles.js`): 15 switches (`sw38…sw64`, palanquitas mat 34 del panel central) y 3 palancas del cuadrante izquierdo (`lev75` potencia, `lev77` hélice, `lev42` condición; a confirmar cuál es cuál). Se exportan con `MOVIL="sw:38,47,48,49,50,51,52,53,54,56,60,61,62,63,64;lev:75,77,42"`. Switch: pivote en la cara del panel, ±0.45 rad; palanca: pivote en la base, ángulo −0.9…0.15 (adelante negativo). VR: gatillo/grip a < 6 cm (switch) o < 10 cm (palanca), o pinchar la palanquita; PC: clic. `controles.alCambiar(nombre, valor)` es el gancho para la puesta en marcha. Los demás switches del panel están pintados en la textura (no son piezas). Pedales y limpiaparabrisas: todavía no (hay que recortarlos de la malla grande como el GPS).
- Comando de conversión actual: `MOVIL="sw:38,47,48,49,50,51,52,53,54,56,60,61,62,63,64;lev:75,77,42" PALANCA="65,66,127,128,129" CUT="23:-0.2,0.88,-0.98,0.28,1.14,-0.70" python3 -I herramientas/mdl2glb.py at802_intA.MDL texture cabina.glb relojes`

## 17/10 (tarde) — vuelo y emergencias
Pedido de Iván: «habría que volar y simular una emergencia… las 3 en consecuencia, que sea muy real».
- **`vuelo.js`**: modelo de vuelo simplificado del AT-802 (masa vacía 3200 kg + agua; S 37,25 m²; CL = 0,4 + 5,5α + 0,5·flaps; CD0 0,045; PT6 con Ng/torque/ITT/hélice; empuje ≤ 19,5 kN; tierra con rodadura, frenos, pedales, rotación a partir de 28 m/s; pérdida a 15°+2·flaps). Rota ~95–105 mph cargado, asciende ~1300 fpm, planea ~9:1 a 110 mph. Fuego: ITT +300, torque cae; se apaga a los 5 s de condición a corte + FIRE + ralentí; a los 45 s es fatal. Eventos: despegue, contacto, accidente, largado, tolva-vacia, vne, fuego-extinguido, fuego-incontrolado. `suelo(x,z)` = altura del terreno (escenario.alturaTerreno). Cifras a validar con el POH.
- **`instrumentos.js`** + `instrumentos.json` (de `herramientas/instrumentos.py`): agujas 3D sobre las caras del panel (las caras ahora se dibujan sin agujas: `SIN_AGUJAS=1 relojes.py`), horizonte artificial con disco animado, reloj con la hora real.
- **`mision.js`**: secuencia arranque → despegue → crucero → falla de motor (rearranque si hay altura, si no forzoso) → crucero → fuego (ralentí, corte, FIRE, largar, bandera, forzoso) → despegue con tolva llena → falla a 150 ft (nariz abajo, largar, de frente, flaps/corte/batería). Puntaje por fase con penalizaciones por demora; menú para empezar por cualquiera; «Vuelo libre».
- **`audio.js`**: turbina + hélice sintetizadas, campana de fuego, bocina de pérdida, voz (speechSynthesis es-AR).
- **`panelvr.js`**: panel de botones para VR (copiado de aurav-senales). Tablilla de texto (`hudVR`) fija a la derecha del panel.
- Mapeo de switches (`SW` en main.js): BATT sw62, ALTN sw64, GEN sw56, IGNTR sw53, START sw47 (vuelve solo al encender), FIRE sw60 (corte de combustible + extintor), F PUMP swFPUMP, HYD sw54, AVNC sw63, PITOT sw50, HOPR/FRDS/WIPER extraídos de la malla (`EXTRAER=...`). Palancas: lev75 potencia, lev77 hélice (atrás = bandera), lev42 condición (atrás = corte), levDUMP manija roja de largado (agregada, a la izquierda del asiento; tirar hacia atrás).
- Quest: joystick izq X = pedales, izq atrás = frenos; joystick der arriba/abajo = flaps; botón joystick o A/X = recentrar. PC: flechas, A/D, B, F, E, Esc.
- Terreno: valle plano a lo largo de la pista (`dRect` en escenario.js) para despegar y hacer forzosos; cielo de 1500 m que sigue al avión; niebla 200–1400.
- Probado sólo en simulación headless (piloto automático de prueba `window.__auto`, velocidad `window.__vel`) y carga en Chromium. **No probado en Quest.** El humo del fuego son sprites desde la nariz.
- Comando de conversión actual: `EXTRAER="swWIPER:34:-0.462,0.77,-0.95,-0.436,0.84,-0.86;swHOPR:34:-0.317,0.77,-0.95,-0.291,0.84,-0.86;swFRDS:34:-0.281,0.77,-0.95,-0.255,0.84,-0.86;swFPUMP:34:0.069,0.77,-0.95,0.095,0.84,-0.86" MOVIL="sw:38,47,48,49,50,51,52,53,54,56,60,61,62,63,64;lev:75,77,42" PALANCA="65,66,127,128,129" CUT="23:-0.2,0.88,-0.98,0.28,1.14,-0.70" python3 -I herramientas/mdl2glb.py at802_intA.MDL texture cabina.glb relojes` (con `SIN_AGUJAS=1 python3 herramientas/relojes.py cabina.glb relojes` antes y `python3 -I herramientas/instrumentos.py cabina.glb instrumentos.json` después).

## Historia de la cabina FSX y del exterior (18/10 – 2/11), movida desde CLAUDE.md el 2/11
Se movió acá al decidir rehacer la cabina de cero (`PLAN_CABINA_NUEVA.md`). Son los parches de la
cabina FSX y del exterior, con sus números y lecciones, copiados tal cual. Lo que sigue valiendo
quedó resumido en CLAUDE.md («Lecciones que siguen valiendo»).

### Filas originales de la tabla de archivos de CLAUDE.md

| Archivo | Qué es |
|---|---|
| `main.js` | Arma la escena: `avion` (cuerpo que vuela, +x adelante) → `cabina` (GLB girado −90°, tren en el piso) + `jugador` (cámara / manos). Mapea controles→vuelo (`aplicarControles`, tabla `SW`), bastón de mando, manija roja `levDUMP`, radios, humo/luz de fuego, UI, recentrado VR, bucle con física a 120 Hz. |
| `cabina.glb` | Interior del Fire Boss convertido (6,8 MB). **No editar a mano: se regenera.** Al cargar el exterior: de TODAS sus mallas (salvo controles `sw/lev/pedal/palanca/varilla/puerta` y las ya interiores) queda sólo lo del habitáculo (ahí está la **butaca**, con la textura AT_01 del exterior) y la chapa de la cúpula como malla lisa (`m14_techo`, color 0xbabbba y rugosidad 0,8: el mismo blanco gris de la textura del fuselaje); al exterior se le saca la caja `CUPULA` (la cúpula la pone la cabina); `m9` (disco de hélice) se oculta. **m1 (tablero+cubretablero, 25/10):** no se recorta, se APLASTAN sus vértices al contorno del capó de fábrica (techo y≈1,12–1,16, semiancho 0,58/0,63; lo que estaba a y>1,3 se hunde a 1,02): entero por dentro, nada asoma por fuera. **m22 (vidrios/parantes viejos):** queda sólo lo de detrás del plano del parabrisas de fábrica (z > 0,74 + 0,93·(y−1,05)); m27 desaparece (la cúpula de fábrica pone vidrios y parantes). |
| `herramientas/` | Conversor y utilidades (ver abajo). `pedales_blender.py` regenera `blender/pedales.glb` (Blender en segundo plano). |
| `blender/` | Piezas animadas hechas en Blender (Lichi): `pedales.glb` + `.blend` + vistas previas. Los pedales originales se recortan de la cabina al cargar (`PEDAL_VIEJO` en main.js) y el clip `pedales_timon` (0 = timón izquierda, 1 s = derecha) sigue a la variable `pedal`. Recorrido ±0,2 rad (~11°), confirmado por Iván 22/10. |
| `TRASPASO.md` | Historia detallada de decisiones y números. Leerlo antes de tocar la conversión. |

### Regenerar `cabina.glb` (sólo si hace falta tocar la geometría)
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

### Mapeo de la cabina
- **MANUAL CONSEGUIDO (26/10):** `Desktop/AURAV/AT-802-802A_Pilot_Training_Course.pdf` (77 págs., NO subirlo al repo). El mapeo completo está en `herramientas/mapa_cabina.md`. Claves: `swFUEL` es MAIN·OFF (2 posiciones, no 3); `swWRUD` es la TRABA DE RUEDA DE COLA (no timón de agua); `sw53` IGNTR es de 3 posiciones (ON · OFF · CONTINUO); `levCOND` confirmado 3 posiciones (corte · ground idle · flight); la manija roja quitada era el E-DUMP neumático (restituir); HECHOS (26/10, `crearExtrasManual` en main.js): brújula whiskey sobre la joroba del tablero (tarjeta cilíndrica que gira con el rumbo; signo a validar en vuelo), anunciador de 5 celdas bajo el GPS (LOW VOLT y GEN OUT cableadas a batería/generador; FUEL FILT, AIR FILT y BETA apagadas hasta modelar filtros y reversa) y manija roja E-DUMP en la consola izquierda (palanca `levEDUMP`: adelante = tolva a cero). HECHO el push-to-test (botón `swTEST` junto al anunciador: prende las 5 celdas 1,8 s y se suelta solo) y la REVERSA (26/10): `levPOT` viaja hasta 0,42 detrás del ralentí (0,17–0,42 = beta), `c.reversa` da empuje negativo (hasta 35 % del estático, con motor andando) y la luz BETA sigue a `vuelo.enBeta`. Quedan FUEL FILT y AIR FILT sin lógica (sólo test). El PANEL DE LLAVES también se reconstruyó (26/10): placa al plano del tablero con rótulos dibujados (diccionario ROTULOS en crearExtrasManual, escalonados en dos alturas) y las palanquitas corridas al frente (sus pivotes se mueven en z); el panel viejo queda tapado detrás. El tablero flotaba DELANTE del panel de switches (captura de Iván 26/10) → REHECHO como ESTRUCTURA ÚNICA (26/10, video de Iván: «el tablero es una sola cosa»): tres paños ALTOS (y 0,70–1,25, x −0,615..0,605) con relojes arriba, llaves abajo con rótulos, FRDS integrado en el paño izquierdo, placards, GPS, tapa superior (glareshield), repisas y mejillas FrontSide; m1 y m18 ocultos del todo; las llaves y perillas se corren a su paño (pivotes en z). Recentrado VR al subir ahora a 72 cuadros (se caía «arriba del techo»). Exterior (video 26/10): palas negras parejas con banda roja, escapes a metal oscuro (mat21), parche del 493 por CLONADO de la franja de arriba (el plano se notaba), COMPUERTA ROJA bajo la tolva (reglamentación). Ajustes posteriores (26/10): los extras se crean DESPUÉS de crearTablero (antes no veían sus planos y el subpanel FRDS no se creaba); la placa de llaves termina en x 0,50 (no atraviesa el pedestal de radios) y baja a y 0,715; el cuerpo del swWIPER se recorta a 3 cm de fondo; SUBPANEL FRDS propio en el plano del ala izquierda (placa «FRDS GEN II» con pantallita dibujada) con sus perillas y palanquitas corridas al frente (quedaban tapadas por el ala). Texto original del inventario:
- **Inventario de piezas móviles sin función todavía** (ya con manual, ver mapa_cabina.md): selector de combustible `swFUEL` (3 pos.: OFF · medio · BOTH), `swWRUD` (timón de agua), `swAUX`, panel FRDS: perillas `swK_FRDS1..3`, palanquitas `swFRDS_A..C`, `swFRDS_D` (AUTO/MAN/OFF, 3 pos.), compensador de timón `swK_TRIMTIMON` (7 pos.). Tipos en controles.js: switch, 3 posiciones (`SW3`), varias posiciones (`pos: [ángulos]`, `eje`), perilla giratoria (`perilla: paso`). La ventana es un **paño fijo** de la puerta. **Puerta que abre: SUPRIMIDA** (decisión de Iván 24/10: prioridad = fidelidad del modelo; se entra con fundido a negro, `apie.js`). La cúpula del terrestre queda entera de fábrica, vidrios incluidos (mat22 con tinte 25 %). La traba roja `swTRABA` sigue siendo manipulable, hoy sin función. (Viejo: `blender/puerta.glb` (Lichi: marco, vidrio 6 mm, bisagras, manija; clip `puerta_abrir`, bisagra en el borde de arriba del vidrio). `crearPuerta` saca el vidrio lateral original (triángulos de `m27` con las 6 esquinas `VIDRIO`) — ya no se carga.) Faltan: botón SALVO, perillas de los instrumentos.
- Consola izquierda (recortadas en la carga, `MANIJAS`): `swFUEL` VÁLVULA de combustible (26/10, manual: 2 posiciones MAIN = pose del modelo · OFF = +90°; en OFF se corta el motor), `swWRUD` TRABA DE RUEDA DE COLA (accionada = cola libre, giro en tierra 2,6 en vez de 1,2), `swFLAPS`, `swAUX` (candidata: Prop Overspeed Test). Los switches aceptan `piv`, `eje` y `ang: [apagado, encendido]`.
- **Switches de 3 posiciones** (arriba · medio · abajo): lista `SW3` en main.js → `controles.hacerTresPosiciones`. Estado 1 / 0 / −1; cada toque avanza arriba → medio → abajo → medio… Por ahora sólo `swFPUMP`. Para la simulación los extremos cuentan como encendido. RESUELTO con el manual (26/10): `sw53` IGNTR es de 3 posiciones (ON · OFF · CONTINUO; los extremos encienden). Faltan por decidir las del A/C (si algún día se agregan).
- Switches del panel central (los únicos que son piezas): BATT `sw62`, ALTN `sw64`, GEN `sw56`, IGNTR `sw53`, START `sw47` (vuelve solo al encender), FIRE `sw60` (corte de combustible + extintor), F PUMP `swFPUMP`, HYD `sw54`, AVNC `sw63`, PITOT `sw50`, luces `sw52/49/61/51/48`, HOPR/FRDS/WIPER `swHOPR/swFRDS/swWIPER`, SPARE `sw38`.
- Palancas: se recortan **en tiempo de carga** de las mallas grandes (`MANIJAS` + `recortarManija` en main.js): `levPOT` manija POWER blanca (m16), `levHEL` perilla azul + varilla amarilla (m16+m23, atrás = bandera), `levCOND` perilla gris (m2+m6, atrás = corte; **a confirmar**). La manija roja agregada (`levDUMP`) **se sacó** (22/10): la descarga es el botón del mango del bastón (en VR: con el bastón agarrado, el otro botón; en PC: E). `levHEL` incluye mango negro y punta gris (antes quedaban quietos). Adelante = ángulo negativo (`−0.9`), atrás `0.15`; `escala` achica el recorrido visual y `pivY` fija el pivote. Las `lev75/77/42` de la conversión eran varillitas del mecanismo (quedan fijas como `varilla*`).
- Procedimientos: puesta en marcha y despegue siguen el **checklist normal de AAXOD** (CHECK LIST 802 NORM ed2 Rev01, propiedad de Nueva Frontera SpA: no subirlo al repo público). El tutor marca con un aro amarillo el control de cada paso (`ui.marcar`, `marca` en el paso o inferido de `listo`).
- VR: cualquier switch o palanca se acciona también **apuntándolo con el rayo + gatillo** (`controles.impacto`, tolerante a 2,5 cm). `swFLAPS` y `swAUX` (consola izquierda, m34) se recortan en la carga como las manijas; FLAPS cicla 0°/10°/20°. Las piezas de `EXTRAER` venían con todo el buffer de vértices: se compactan con `toNonIndexed` antes de `armar`. El audio se reanuda en cada gesto (el Quest lo suspende al entrar en VR).
- Quest: joystick izquierdo X = pedales, atrás = frenos; derecho arriba/abajo = flaps; botón del joystick o A/X = recentrar al ojo del piloto; B/Y o la placa roja «MENÚ · SALIR» (debajo de la tablilla) = pausa con Seguir / Menú / Salir de VR. En PC: Esc o «Menú».

### Herramienta disponible: Blender + MCP (proponerla cuando sirva)
Iván tiene Blender 5.2 conectado a **Claude Code** con el complemento oficial de Blender Lab (`bl_ext.BlenderLab.mcp`, arranca solo en localhost:9876): las herramientas `mcp__Blender__*` ejecutan Python en su Blender abierto. Así se modelan piezas y se exportan a GLB directo a esta carpeta. No usar a la vez el botón «Connect to Claude» del otro complemento (ahujasid, mismo puerto). Previews con Eevee (placa de 6 GB).
**Ofrecerla** cuando haga falta una pieza que el modelo FSX no trae o trae mal: pedales móviles, perillas, palancas que «se rompen», panel inferior real (en vez de la tapa negra), palanquitas de switches, exterior con librea AUR-AV. Se modela aparte y se carga como GLB encima de `cabina.glb`.

### Cabina NUEVA DE CERO (propuesta de Iván, 2/11) — referencia: la cabina REAL de AAXOD
Iván: «¿y si se hace una cabina de 0 por Blender? lo que tenemos no sé si se puede arreglar, siempre
le falta un pedazo». Respuesta: SÍ — el INTERIOR entero de cero en Blender con las fotos reales; el
exterior (FSN) no se toca. La cabina FSX que veníamos parchando es OTRA configuración del 802 y sus
restos causaron casi todos los «un paso adelante, dos atrás». Falta el ok de Iván para arrancar.
Fotos (NO subirlas al repo público): `Documents/aurav-cabina/fotos/cabina_real/` — tablero izq. (FRDS),
tablero der. (llaves), consola izq. (cuadrante y trims), rack de radios der. Lo que muestran:
- **Tablero casi «de vidrio»**: monitor de motor (pantalla rectangular), anemómetro y altímetro
  analógicos, Garmin G5 (horizonte digital) y un Garmin debajo; varios huecos redondos VACÍOS (nada de
  la pared de ~20 relojes del FSX). Arriba-izq.: anunciadores MASTER WARN · MASTER CAUTION · LOW FUEL
  · ARMED y la llave FUEL BOOST PUMP. El ala izquierda (más baja) lleva el FRDS GEN III (GATE
  CLOSE/OPEN, MODE AUTO/MANUAL, ARMED, FOAM SET/INJECT, GALLONS TO DUMP, COVERAGE LEVEL, pantallita con
  perilla) y el botón rojo grande MANUAL SALVO «PRESS TO DUMP HOPPER». A la derecha: soporte vacío de
  Garmin portátil, placa de pérdida en virajes, perillas UPPER/LOWER PANEL LIGHTS. Borde superior en
  CURVA continua: no hay glareshield plano.
- **Llaves ABAJO**, en dos paneles inclinados con filas de breakers y llaves rotuladas: LANDING/WORKING
  LIGHTS y DISPERSAL SYSTEMS/MISC (izq.); FLIGHT LIGHTS/GYROS/FLAPS y ENGINE OPERATION (der., con una
  llave de guarda roja). Placa PARK BRAKE OPERATION. (Pedir a Iván fotos de cerca: no todos los
  rótulos se leen.)
- **Bajo el tablero**: pared trasera de la TOLVA en amarillo cromato, con la MIRILLA horizontal y la
  escala vertical «FLIGHT 580…400» (galones) entre los pedales.
- **Cuadrante en la PARED izquierda**, bajo la ventana (no pedestal): POWER (manija plateada), PROP
  (perilla azul), CONDITION (perilla roja); arriba manija roja FUEL y una perilla «TURN TO …»;
  AILERON TRIM y DOWN FLAPS/OFF; abajo volante del compensador con cadena y dial RUDDER TRIM (NOSE
  LEFT/RIGHT · TAKEOFF/CLIMB/CRUISE).
- **Derecha**: rack de radios alto, negro, de marco abierto (PAC24, COM, XPDR, Kenwood, Motorola,
  sirena; jacks MIC/PHONES), bandeja abajo y PULL FOR FRESH AIR. No hay consola de breakers.
- **Asiento de malla ROJA**, arnés negro; piso y paredes GRISES con antideslizante negro; pedales con
  placa AIR TRACTOR; palanca cromada con empuñadura negra multifunción y, a su izquierda, otra palanca
  gris de puño negro y tapa roja (función a confirmar).

### Dónde quedamos (28/10)
- **PUBLICADO 28/10 con el ok de Iván** («eso sigue bien, subilo así, después seguimos con los detalles»):
  push f4d459a→6433ea7, Pages verificado sirviendo v=20261028d. La regla de NO publicar sin su ok sigue
  vigente para lo que venga. Próximo: los «detalles» que marque Iván (probablemente del Quest), y los
  pendientes ya anotados (pelos verificados sólo desde adentro; pedales lejos; orden de palancas).

### Dónde quedamos (31/10)
- **Inspección crítica a pedido de Iván** («entrá a la cabina y decime qué está mal»): 6 hallazgos; aprobó
  arrancar por 1 y 2. **RESUELTOS (local, v=20261031g, SIN publicar):**
  (1) **haz de varillas amarillas** (rincón trasero derecho + horizontal cruzando la consola + varilla al
  piso): eran CABLES del mecanismo del EXTERIOR (mat08 cromo y mat02) → borrados POR CARA en
  `exterior_terrestre2.py` (franja y_s −2,45..−1,30, z_s 0,12..1,78; mat08 |x| 0,34–0,70, mat02 0,36–0,595;
  3116 caras). Queda un alambre gris fino en la pared derecha (menor, a propósito).
  (2) **mecanismo pedales/bastón de juguete**: pedales.glb entero a UN gris (matPed 0x3b3c40), `palanca_*`
  grafito 0x2c2d30, m32 gris; **TODAS las mallas `m\d+` de la cabina con textura FSX → clone sin map gris
  neutro 0x8c8c88** (el armazón rojo/amarillo era m23+m16 texturados; los controles sw/lev conservan su
  textura; swTRABA recupera rojo propio 0xb01414; m14/m15 quedan con su color claro); la varilla de levHEL
  se corta a y 0,67 (bajaba al piso). El ROJO que seguía apareciendo tras todo eso NO era de la cabina:
  era la **COMPUERTA ROJA de la tolva** (`AT802-4_17` del exterior, a y −0,5..−1 bajo el piso) vista por los
  HUECOS del piso de fábrica → **chapa de piso oscura `mamparo_piso`** (0,78×0,95 m en y 0,262, z 0,55–1,50;
  el nombre arranca con «mamparo» para quedar exento del recorte general).
  MÉTODO que la encontró: el scan por caja no daba nada rojo ahí → proyectar los triángulos de la escena a
  píxeles (`Vector3.project(cam)`, software-raycast) y mirar qué cae en el píxel rojo. OJO: `innerWidth`
  real ≠ tamaño de la captura del pane (746×630 vs 800×675): escalar los píxeles antes de comparar.
- **(3) cuadrante APILADO: RESUELTO (v=20261031j).** La caja apilada era el CUERPO del cuadrante de
  fábrica (m23, 667 tri, z 0,88–1,39, subía a y 0,958 sobre la tapa del pedestal): descartado por
  triángulo en el recorte general (`cuadranteViejo`: m23, x −0,60..−0,32, y>0,72, z 0,955..1,42).
  Al destaparse quedó a la vista que las perillas estaban TRAGADAS por las tapas nuevas → `mover()` en
  crearConsolas: levHEL −0,09 x / +0,25 y / +0,22 z (estaba hundida, adelantada y FUERA del canto
  interior), levCOND +0,16 y, levPOT dz −0,04 (colgaba del borde trasero). Las 3 + E-DUMP asoman ahora
  de sus ranuras rotuladas. MÉTODO: scan por caja sobre el pedestal (triángulos indexados) señaló m23
  como única malla con volumen ahí; bbox de cada palanca con `pv.traverse` para afinar los mover.
- **(4) bastón/brújula: HECHO (v=20261031k).** La brújula pasa del parante bajo (el bastón la tapaba y el
  soporte se veía «a la nada») a COLGADA del marco superior del parabrisas, como el 802 real: el arco pasa
  por y 1,54-1,69 / z 1,29-1,62 en x 0 (medido en vivo) → brazo (0, 1,575, 1,345), caja (0, 1,512, 1,375),
  tarjeta 1,486/1,408, fe z 1,433. Falta el visto de Iván en el Quest (de cerca se ve grande: es fiel al
  tamaño real, 7,8 cm a ~30 cm del ojo).
- **«Quedaron cosas destruidas» (aviso de Iván 31/10): DOS causas encontradas y corregidas (v=20261031l).**
  (a) El gris neutro de 31f pintaba también los VIDRIOS (m22/m26, transparentes): quedaban como chapas
  grises OPACAS por dentro y por fuera («se rompió el fuselaje») → los materiales con `transparent` quedan
  exentos del repintado. (b) Al borrar el cuerpo del cuadrante quedaron DESTAPADOS los triángulos-varilla
  del mecanismo de fábrica (m23/m16/m5, lados de hasta 1,1 m): PICOS blancos junto al umbral → descarte
  `agujaLat` en el recorte general (lado >25 cm, |x| 0,27-0,68, y 0,15-0,80, z 0,68-2,05, ambos lados).
  RONDA COMPLETA hecha (31/10): interior (frente/izq/atrás, consola, piso) y EXTERIOR a pie con teleport
  (perfiles izq/der, frente, atrás): fuselaje sano, franja y cola azules, palas con banda, compuerta roja.
  OJO MÉTODO ronda exterior: los drags sintéticos NO mueven la mirada a pie (apie rota al JUGADOR):
  teleport = jugador.position.set + jugador.rotation.y, corrigiendo contra __rumbo() (la cámara guarda
  yaw residual del modo cabina). `__aPie.bajar()`/`subir()` andan por consola. De noche (luz por hora
  real) forzar luces de nuevo al bajar.
- **CHAPA FALTANTE en el casco (captura 40 de Iván, RESUELTO en v=20261031m):** la rama mat02 del
  borrado LATERAL de cables («hasta |x| 0,595, la pared arranca en 0,60») se COMIÓ chapa real: el
  fuselaje se angosta atrás/arriba y baja de 0,595 → raja en el lomo, muesca en la franja azul,
  astillas, y desde el asiento se veía la PISTA alrededor del respaldo. Fix: el borrado por cara queda
  SOLO para mat08 (el haz cromo de cables; 1433 caras); el alambre fino mat02 de la pared se tolera.
  Verificado: 1659 caras de chapa de vuelta en la franja y el fuselaje cerrado mirando atrás.
  OJO REGLA: borrar POR CARA sobre mat02 (piel) es jugar con fuego: preferir mat específicos.
- **(5) asas flotantes + (parte de 6) butaca: HECHO (v=20261031r).** Las «asas» eran DOS manijas del
  OBJ del exterior (mat02) colgadas hacia adentro junto al respaldo, lado izquierdo: la de abajo
  (y 0,75-1,0, z 1,90-2,14) borrada POR CARA en cajita quirúrgica (x −0,56..−0,28: sin tocar la chapa,
  que arranca en |x|≈0,58; 32 caras) y la de arriba (densa, ~640 caras, junto a la ventanilla del
  carenado) por ISLA CONEXA CONTENIDA (la chapa conectada al casco no cae). BUTACA con color:
  `partirMat` en main.js (exterior-then, tras el fallback de m14) parte el índice en GRUPOS de material
  → cuerina gris oscura 0x4a4a46 en caja |x|<0,50, z 1,48-2,30, y 0,30-1,30. CINTURONES nuevos
  (los azules de fábrica ya no existen tras los recortes): 2 tiras `mamparo_cint` + `mamparo_hebilla`
  (hombros arriba separados, convergen abajo; 4 cm DELANTE del respaldo: es almohadillado, ondula
  z 1,86-1,94, y pegadas se hundían; rot.x 0,10 apenas). OJO cámara de prueba: `cam.position` es
  relativa al JUGADOR (no gira con la mirada): mirando atrás, alejarse del respaldo es z NEGATIVO.
- **«Cosas raras» (capturas 41-44 de Iván, RESUELTAS en v=20261101a):** (41) el borrado por islas de la
  manija alta se había llevado un TROZO de carenado suelto (tajo en zigzag) → caja de islas APRETADA al
  cluster de la manija (de 640 caras bajó a 32: sólo la manija); (42) quedaba la manija ESPEJO del lado
  derecho (0,55, 0,88, 1,87) → cajita por cara (79 caras) + bloque espejo de islas para la alta derecha
  (dio 0: no existía); (43) brújula tosca → caja 0,06×0,028×0,042 y brazo más finos; (44) el MAMPARO
  blanco asomaba sobre el respaldo y la butaca parecía mitad y mitad → `mamparo_respaldo`: respaldo
  ALTO de cuerina (0,60×0,52) en (0, 1,26, 2,30) delante del mamparo. Verificado adentro (ambos vanos,
  respaldo) y afuera (3/4 izquierdo: carenado entero, franja continua).
- **Tanda 1/11 (lista grande de Iván, resuelta en v=20261101i; tiene DEMO y necesita estabilidad):**
  cuadrado oscuro tras el asiento = mi «respaldo alto» → ELIMINADO (el mamparo queda blanco); cinturones
  caían DENTRO del respaldo (es una CÁSCARA HUECA abierta arriba) → tiras cortas en z 1,82, siempre
  delante; panel negro atravesando el pedestal = la MEJILLA que bajaba a 0,70 → 0,36×0,27 muriendo
  sobre la tapa; «líneas azules del avión» por el hueco paño-pared → placa de cierre `mamparo_pared_izq`;
  «fuselaje rajado sobre la ventana» = ASTILLAS del vidrio recortado de la cúpula (mat22) + caras de piel
  con la PUNTA colgando en el hueco (el centro ancla afuera: condición por VÉRTICE, lado >20 cm, franja
  z_s 1,00-1,26 — con 1,42 entraba el marco superior y se abría una RENDIJA en el techo); manija ESPEJO
  derecha borrada (cajita x≤0,555); el borrado de la manija alta con caja apretada (de 640 a 32 caras:
  el resto era un trozo de carenado que VOLVIÓ); mamparo CORTAFUEGOS (plano oscuro z 0,52) tapa el
  interior hueco del capó que se veía con la librea al revés; eje acodado de levCOND hundido bajo la
  tapa (clamp local z>0,92 → y 0,585).
  **REGLA NUEVA (1/11, tras dos agujeros autoinfligidos): NO BORRAR MÁS NADA del casco (mat02/mat22)
  por cajas o islas «generosas»: el OBJ está lleno de CHAPAS-ISLA sueltas que caen adentro. Sólo
  borrados con firma inequívoca (vértice en el AIRE del hueco + cara grande; isla diminuta <20 cm) y
  verificación inmediata; lo demás se TAPA con piezas nuevas (molduras, placas).**
- **Captura 45 de Iván («sobresale el tablero / agujereado tras la ventana»), RESUELTA en v=20261101k:**
  lo que sobresalía del capó eran los PANELES VIEJOS FSX (m22/m8/m3/m4…, hasta 36 cm DELANTE del plano
  del parabrisas; el recorte los salteaba por «pieza interior entera» y el gris claro de 31/10 los hizo
  visibles) → pasada nueva en el exterior-then: descarte por VÉRTICE de todo m\d+ delante del plano
  (margen 15 mm salva los parantes al ras). Verificado: CERO violaciones. OJO: al reindexar, NUNCA
  tocar o.visible salvo para apagar (la 1.ª versión re-ENCENDIÓ m1, oculta a propósito). El «agujero»
  tras la ventana = ventanillas del carenado SIN vidrio → placas tintadas `mamparo_ventanilla` ±0,40.
- **Tanda «todo eso está mal» (6 capturas de Iván, 1/11, resuelta en v=20261101l):** el patrón de fondo
  es que el OBJ tiene HUECOS REALES arriba (lomo entre tolva y parabrisas, cubretablero) y por ahí se ve
  el interior desde afuera. Fixes ADITIVOS: `mamparo_tapa_lomo` (chapa blanca horizontal y 1,128, x ±0,52,
  z 0,48-0,82) cierra el hueco del lomo; cortafuegos ACHICADO a 1,02×0,86 (asomaba por los hombros del
  capó y se veía como mancha negra: FrontSide asomado = hueco negro); `mamparo_pared_izq` achicada a
  0,18×0,42 (parecía una puerta negra gigante por el vano); `mamparo_ventanilla` a ±0,33 y 0,26×0,22
  (a ±0,40 el canto atravesaba el carenado: grieta + rectángulo negro); `mamparo_liston` (0,035×1,05×0,16
  en −0,585/1,35/2,21) tapa el haz de alambres del parante (no se pueden borrar); `mamparo_faldon` ×2
  (0,245×0,32×0,67 bajo cada consola) cierran el hueco consola-piso por el que se veía la franja azul.
  MÉTODO NUEVO ronda exterior en picada: a pie, elevar la cámara LOCAL (cam.position.y 3-4,5 +
  cam.rotation.x) — el clamp del terreno sólo pisa al jugador, no a la cámara. El ESCAPE negro de la
  captura G era el escape legítimo del PT6 visto en ángulo: no era defecto.
- **Capturas 46-48 (1/11, «cada mejora empeora otra cosa»), resueltas en v=20261101o:** la TAPA DEL
  LOMO se ELIMINÓ (sobresalía del perfil como una aleta y se veía flotando dentro de la cúpula: el
  lomo real es más bajo que y 1,128; el hueco del lomo SE TOLERA, cortafuegos y glareshield tapan lo
  grueso); los dientes del canto trasero (vértices en (−0,53, 0,97, 2,13), fuera de las cajas) se
  taparon DE RAÍZ con `mamparo_riel` ×2: moldura blanca (0,055×0,11×0,92 en ±0,582/0,965/1,85) sobre
  TODO el borde inferior del vano, como el riel de la ventana corrediza real — perseguir cada diente
  era interminable; el listón del parante ya tapaba el haz. Verificado: canto recto y prolijo.
- **Saga de molduras (1/11, noche): TODAS ELIMINADAS (v=20261101s).** Listón, riel/burlete y
  ventanillas tintadas: cada pieza RECTA puesta sobre el casco CURVO/ondulado flota o asoma desde
  algún ángulo (viga de la 49-50, estante, parche negro). LECCIÓN FINAL: sobre el casco no van
  piezas postizas rectas; los defectos finos del canto (dientes chicos) y el mazo de alambres del
  parante se toleran (existen en el avión real) o se emparejan EN EL SCRIPT otro día con calma.
  También: `servidor.py` (no-store) reemplaza al http.server pelado, y el index chequea version.txt
  cada 10 s (la pestaña abierta se recarga SOLA con cada build: se acabó el «sigue igual» por caché).
  OJO VERIFICACIÓN: mirar SIEMPRE el MISMO lado que la captura de Iván (una vez se validó el lado
  derecho cuando sus fotos eran del izquierdo y el defecto «seguía igual»).
- **NUEVO MÉTODO (1/11, decisión de Iván: «probemos por Blender»): las piezas problemáticas se
  REEMPLAZAN con modelado en Blender headless, no se parchan más.** Primera pieza: **BUTACA NUEVA**
  (`herramientas/butaca_blender.py` → `blender/butaca.glb`, v=20261101u): asiento de UNA pieza
  (banqueta, respaldo alto inclinado, apoyacabeza, base, rieles) + arnés integrado (2 hombros + 2
  cintura + hebilla), todo PRISMAS POR VÉRTICES en coords glTF (b(v)=(x,−z,y)) — CERO rotaciones
  euler: dos intentos con rotation+apply dieron piezas volteadas bajo el piso o desplazadas. El
  script importa cabina.glb de referencia, RENDERIZA previews (butaca_*.png: verlas ANTES de
  integrar) y exporta sólo la butaca. En main.js: se carga como pedales.glb (butaca_nueva, hija de
  `cabina`: fuera del alcance del recorte) y la vieja se descarta (`butacaVieja`: m14 |x|<0,42,
  y 0,33-1,10, z 1,47-2,12 — caja JUSTA: con z 2,30 se comía piso y chapas traseras). Las tiras
  y cuerina parciales viejas se eliminaron. OJO: mirando atrás desde el ojo la nuca queda contra el
  respaldo (normal); la «pista alrededor del respaldo» con cámara corrida son los VANOS (normal).
- **Tanda Blender 2 (1/11, con el ok de Iván al rumbo, v=20261101z):** (a) **ANTEPECHO de ventana**
  (`herramientas/marco_ventana_blender.py` → `blender/marco_ventana.glb`): cinta de 4,5×14 cm que
  tapa el canto dentado, construida MUESTREANDO la línea real del canto en exterior.glb (máximo de y
  por franja de z, ambos lados) → en X sigue la CURVA real del casco (por eso no flota como las
  molduras rectas) y en Y va RECTA por regresión + residuo máximo (seguir cada pico daba «crema
  batida»). OJO: NO extender el tramo delante de z 1,40 (el canto sube con el parante y la regresión
  levanta todo 10 cm); queda una lengüeta menor delante del inicio. Mismo blanco del casco (0.845).
  (b) **restos laterales**: los paneles viejos «un instrumento bajo otro» del sector izquierdo eran
  m16/m18/m22/m23/m26 apretados entre el paño nuevo y la pared → descarte `restoLateral` (|x|
  0,46-0,64, y 0,70-1,08, z 0,82-1,01, ambos lados; ahí no vive nada legítimo: controles = mallas
  aparte). Verificado en el juego: vano limpio con antepecho calzado y paño izquierdo sin dobles.
- **Tanda Blender 3 (2/11, v=20261102g):** el ANTEPECHO se recorta a z 1,40-2,18 y va casi todo
  ADENTRO (4 mm afuera): a z 2,30 el extremo atravesaba el marco trasero y asomaba por fuera
  (captura de Iván), y con la mitad del ancho afuera se veía una banda gruesa en el flanco.
  CIELORRASO `techo_blender.py` → `blender/techo.glb`: forro 1,2 cm bajo la bóveda real por RAYCAST
  por celda (muestrear vértices daba confeti: la cúpula tiene triángulos grandes); arranca DETRÁS
  del arco (z 1,55: a 1,05 el rayo pegaba en el VIDRIO y el forro tapaba el parabrisas) hasta el
  mamparo (2,52). DoubleSide + emisivo dominante al cargar (la cara inferior recibe la hemisférica
  verdosa del «suelo» y se veía oliva). MEJORA PARCIAL: bóveda central clara; los FLANCOS siguen
  oliva (el raycast horizontal desde el eje pega en la butaca antes que en la pared: 65 caras;
  rehacer otro día con rayos desde cerca de la pared). Exterior verificado limpio tras el recorte.
- **Tanda «desprolijo» (capturas 51+ de Iván, 2/11, v=20261102i): LA CAUSA RAÍZ de los vidrios.**
  El borrado del «paño interno duplicado» del vidrio de cúpula clasificaba por NORMAL, y las normales
  del OBJ vienen mezcladas → borraba MITAD del paño EXTERNO: vidrios agujereados con bordes en SIERRA
  (el zigzag «al lado de la ventana» de siempre). Criterio nuevo inmune a normales: BVHTree de las
  caras mat22 + rayo RADIAL desde cada cara; si pega en otro vidrio a <6 cm es la interna. Con el
  vidrio sano, el bloque «astillas de vidrio» pasó a comerse vidrio legítimo → DESACTIVADO (rama
  mat22 en False). Además: antepecho con x TAMBIÉN por regresión (el promedio móvil serpenteaba a la
  derecha); butaca v2 (banqueta +10 cm de fondo —Iván la vio «cortita»—, base 0,68×0,54 que tapa lo
  de abajo, correas de cintura sobre el cojín); `butacaVieja` ampliada a |x|<0,52 e y>0,27 (la
  estructura blanca vieja asomaba abajo y a los costados); `restoLateral` ampliado (y 0,52-1,08,
  z 0,80-1,06); `mamparo_faldon2` ×2 delante de las consolas (por ahí entraban las «líneas azules»).
  DECISIÓN (pregunta de Iván «¿reconstruir toda la cabina?»): NO —REVISADA el 2/11: ver «Cabina NUEVA DE CERO»—: tablero/consolas/controles/butaca
  ya son nuestros; lo que queda es limpiar la FRONTERA con el casco por zonas.
- **Captura 52 «igual» (2/11, v=20261102j): la sierra era MI CIELORRASO.** La proyección por píxel
  reveló que el zigzag «al lado de la ventana» visto desde AFUERA era el BORDE ESCALONADO del
  techo_forro (celdas de 4,5 cm) cayendo justo EN los huecos de las ventanas → el forro se recorta a
  la bóveda CENTRAL (|x|≤0,42) y los flancos del raycast quedan desactivados. Verificado desde
  afuera: sin sierra, interior ordenado. LECCIÓN: toda pieza interior nueva cerca de un HUECO del
  casco se ve desde afuera; mantener los bordes lejos de los huecos o taparlos con el marco.
- Pendientes menores: franja oscura chica en la ventana trasera del carenado (hueco legítimo, interior
  en sombra; evaluar vidrio-parche); flancos interiores oliva; lengüeta del dentado delante del
  antepecho (z<1,40); mazo de alambres del parante trasero izq (tolerado); la «garra» blanca sobre
  una perilla negra (sin ubicar; pedir dónde). Pages sigue en 20261028d (estable): lo del 31/10-2/11
  está LOCAL hasta que Iván pida subir.

### Dónde quedamos (27/10)
- **«Se rompió peor» (capturas 38-39, resuelto en v=20261028d):** la chapa blanca gigante entre el asiento
  y el tablero era m14 APLASTADO a una «mesa» a y 1,02 por el clamp de dientes, y el abanico amarillo eran
  las varillas del motor dobladas por el clamp de «pelos». REGLA DEFINITIVA: NADA de clamps de vértices
  sobre m14/m23/m34 (deforman en cadena); los únicos clamps que quedan son los chicos verificados
  (piecitas de consolas, correas del asiento, rincón derecho). Pelos y dientes se resuelven en el RECORTE
  GENERAL con la condición por VÉRTICE (`vertsOk`): el triángulo entero se descarta si algún vértice sale
  de rango (z 0,55-2,55, |x| anchoMax+0,06, y 1,14 — o 2,05 detrás de z 1,85 para no comerse el respaldo).
  Interior verificado sano desde el asiento. PENDIENTE: verificar los pelos desde AFUERA con luz de día.
- **«Pelos» del capó (capturas 36-37 de Iván, v=20261028c):** varillas del mecanismo del motor (m5/m34/
  m23/m26, cabina FSX) con triángulos tan largos que su CENTRO cae dentro del recorte y la punta asoma
  sobre el capó. Fix: bajar SOLO esas puntas (vértices y>1,07 con z<0,58 y |x|<0,6 → y 1,07). OJO: el primer
  intento (clamp global z<0,62→0,62) APLASTÓ TODO el interior delantero contra un plano («se rompió peor»,
  acordeón amarillo visible): los clamps van por caja CHICA y dirigida, jamás una condición global.
  La barra del juego ahora muestra la VERSIÓN (v20261028c) junto al título: pedirle siempre a Iván qué
  versión ve antes de diagnosticar.
- **La caja oscura sobre el hombro izquierdo (captura 35 de Iván, v=20261027z): era el RESTO DEL PANEL
  VIEJO (m23, y 1,06-1,25 × z 0,72-0,90) que quedó DESTAPADO al eliminar la «tapa»** — la tapa negra
  ocultaba esos bultos de fábrica. Se resuelve DESCARTANDO sus triángulos en el recorte general
  (`restoPanel`: m23 con centro y>0,97, z 0,58-1,00, |x|<0,66). OJO LECCIÓN: para piezas 3D NUNCA aplastar
  vértices por caja (un intento previo estiró los triángulos como chicle por todo el cockpit: placas
  negras y varillas amarillas gigantes); aplastar sólo chapas continuas; piezas → descarte de triángulos.
  Escape negro confirmado (sin nodos de textura). Los paños del tablero NO eran el problema de la 35.
- **Tanda «sigue mal» 3 (27/10, noche, v=20261027x):** vistos desde afuera-arriba replicando la captura de
  Iván: (1) la «tapa» del panel inferior ELIMINADA (plano negro 1,0×0,31 delante del tablero: tapaba el panel
  VIEJO m1, hoy oculto); (2) m14 con fallback claro + DoubleSide + emisivo 0x191917 y APLASTADO de dientes
  del recorte (y>1,02→1,02 en |x|<0,68 z 0,55-1,95; |x|>0,50→0,50 en y>0,84 z 0,55-2,0); (3) las CORREAS
  SUELTAS del asiento (¡m23, no m14!: m23 superaba el límite de verts del scan y no aparecía) hundidas a
  y 0,60 en caja (−0,28..0,38 × y>0,76 × z 1,46..1,90); los cinturones azules del respaldo (z>2) quedan.
  La franja negra ancha tras el capó es el GLARESHIELD (negro como el real: no es defecto). OJO estado del
  juego entre recargas del pane: el click a «Recorrer» puede no entrar si el menú no cargó (poll hasta 10 s)
  y el modo puede quedar en cabina: verificar `__aPie.modo` antes de teletransportar.
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

### Dónde quedamos (26/10, tarde)
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

### Próximo gran paso: el avión completo (decidido 22/10)
- **Fuente completa conseguida (22/10):** `OneDrive\Desktop\AURAV\air_tractor_43YXO.zip` (FSN AT802 empaquetado para MSFS) extraído en `Documents\aurav-cabina\fsx\air_tractor\SimObjects\AIRPLANES\Air Tractor Amphib\`: `model/at802_amp.MDL` (exterior anfibio), `at802_intA.MDL` (cabina), `texture/` + `texture.bare/` (sin pintar) + N6159F/EC-KRF/FSN, `sound/` (36 sonidos reales), `panel/Panel.cfg`, docs. Exterior convertido: `fsx/salida/exterior_bare.glb` (160 partes, 18,2 × 10,8 m). Requiere `pip install --user numpy pillow` para `mdl2glb.py`.
- **Avance 22/10 (Lichi):** `fsx/salida/at802_terrestre_trabajo.blend` = exterior sin flotadores ni soportes (borrado por altura < −0,95 m y piezas sueltas bajo la panza fuera del centro). Tren terrestre hecho (colección `tren_terrestre`: patas de ballesta, ruedas Ø0,74 m con trocha 3 m bajo z=0, rueda de cola en z=6,3). **El piso queda a y = −2,0 en el marco de la cabina** (con 11° de nariz arriba apoyan las 3 ruedas): `ALTURA_CABINA` = 2,0 (hecho). Piloto (m23, PILOT_T) y discos de hélice (m12, PROP.BMP) sacados. **Librea AURAV** horneada por posición 3D en `fsx/salida/tex/aurav_at01/02/04.png` (franja bordó con línea fina, puntas rojas en alas y estabilizadores, parte alta del timón roja). Unido con la cabina en el juego (4,2 MB, ~35 mil triángulos). Falta: matrícula. (Caminar, estribo y puerta: hechos.) Ojo: la limpieza del interior del exterior se llevó la chapa de los costados; se recuperó del `exterior_bare.glb` (sólo |x| ≥ 0,55). El Fire Boss (con flotadores) se conserva en `exterior_bare.glb` como variante.
- (Viejo, superado por el OBJ terrestre) Exterior = modelo FSX del Fire Boss (mismo autor que la cabina: encaja perfecto y es fiel al AT-802). `Documents\aurav-cabina\fireboss.zip` está **incompleto** (111 de 203 MB; rikoooo cortó por límite de descargas): Iván lo vuelve a bajar a mano.
- Con el paquete completo: extraer el MDL exterior y las texturas (`texture.N6159F`), además de **panel.cfg, gauges XML y las definiciones de animación**, que dicen qué hace cada perilla y switch (para darles función).
- Lichi (Blender): unir exterior + cabina, librea AURAV (franja bordó, matrícula), **puerta** que abre con la traba roja (la ventana es fija), **estribos** para subir, tren. En el juego: caminar alrededor, subir y entrar a la cabina.

### Pendientes (en el orden que pidió Iván)
1. Probar en el Quest (el recentrado ya anda, 18/10): altura del ojo, distancia de agarre de switches (6 cm) y palancas (10 cm), sensibilidad del bastón (`LIMITE = 0.3` rad → mando ±1), legibilidad de la tablilla `hudVR`.
2. Limpiaparabrisas manipulable (los pedales ya se mueven, 22/10; falta probarlos en el Quest) (recortarlos de la malla grande con `EXTRAER`, como los switches).
3. Perillas (knobs) del panel.
4. Exterior con la librea AUR-AV (franja bordó y matrícula): generar las texturas `AT_01_T`/`AT_02_T` o conseguirlas de `texture.N6159F`. Encajar el `at802.glb` de aurav-sector no funcionó (proporciones distintas).
5. Instrumentos con fotos reales del panel cuando Iván las saque en AAXOD (pegarlas por isla UV en `relojes.py`).
6. Voz guía más completa, sonido ambiente y radio con torre (pedido 18/10).
7. Certificado final estilo AAXOD como en los otros juegos (`constancia.js` de aurav-senales).

### Trampas conocidas
- `git push` NUNCA en segundo plano: el gestor de credenciales de Windows necesita la terminal (falla con exit 128 «could not read Username»). Siempre en primer plano.
- `node --check` no detecta todos los errores de sintaxis de estos módulos: probar también `new Function(src sin imports)` o cargar la página.
- Panel inferior negro (`tapa` en main.js) tapa el hueco del soporte del GPS; el horizonte lleva una caja cilíndrica atrás.
- Nunca meter un comentario `//` en medio de una línea al hacer reemplazos de texto: ya se tragó código tres veces. Usar `/* */`.
- `controles.armar` asume mallas con transform identidad (posición horneada en la geometría); para agregar un control nuevo, trasladar la geometría (`geometry.translate`) y nombrarlo `sw…` o `lev…` antes de `armar`.
- Las caras de los relojes se dibujan **sin** agujas (`SIN_AGUJAS=1`); las agujas son mallas de `instrumentos.js`.
- El cielo es una esfera de 1500 m que sigue al avión; el terreno plano llega a ±1200 m y el pasto a ±1600 m. Las sierras empiezan a 300–650 m del aeródromo salvo el valle de la pista.
