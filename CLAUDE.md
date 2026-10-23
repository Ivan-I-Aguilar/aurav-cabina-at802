# aurav-cabina-at802 — guía para Claude Code

Cabina del Air Tractor AT-802 en WebXR (Three.js r180, sin bundler) para AURAV, el proyecto de formación
aeronáutica de Iván. Uso interno de prueba (AAXOD). Se abre en el Quest desde GitHub Pages:
https://ivan-i-aguilar.github.io/aurav-cabina-at802/

## Cómo trabajar con Iván
- Castellano rioplatense, «vos». Respuestas **breves**. Una cosa por vez.
- Preguntas de a **una**, con opciones numeradas y siempre una opción abierta.
- Avanzar sin pedir permiso para cambios chicos; preguntar antes de rehacer algo grande.
- Él prueba en el **Meta Quest** y en Chrome. Nosotros no podemos probar en el casco: decirlo siempre que corresponda.
- El modelo es freeware de FSX (Flight Sim Nation / rikoooo): no publicitar fuera de lo interno sin revisar el readme.

## Publicar
El repo está en `C:\Users\ivani\Documents\aurav-cabina-at802` (Windows). Pages sirve `main` desde la raíz; tarda 1–2 min.
```
git add -A
git -c user.name="Ivan I. Aguilar" -c user.email="aguivanig@gmail.com" commit -m "..."
git push origin main
```
**Siempre subir la versión** de los imports (`?v=AAAAMMDDx`) en `index.html` (main.js) y en `main.js` para cada módulo o
GLB que cambie: el Quest cachea agresivamente. Si Iván dice «no cargó / no cambió», casi siempre es caché.

## Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | UI de PC: barra, tutor, lista de tareas, panel de botones, HUD de prueba. |
| `main.js` | Arma la escena: `avion` (cuerpo que vuela, +x adelante) → `cabina` (GLB girado −90°, tren en el piso) + `jugador` (cámara / manos). Mapea controles→vuelo (`aplicarControles`, tabla `SW`), bastón de mando, manija roja `levDUMP`, radios, humo/luz de fuego, UI, recentrado VR, bucle con física a 120 Hz. |
| `vuelo.js` | Modelo de vuelo + motor PT6 simplificados. Eventos: despegue, contacto, accidente, largado, tolva-vacia, vne, fuego-extinguido, fuego-incontrolado. `suelo(x,z)` = terreno. |
| `mision.js` | Fases: arranque → despegue → crucero → falla de motor → crucero → fuego → despegue con tolva llena → falla a 150 ft. Puntaje y observaciones. `menu()`, `empezar(desde)`. |
| `controles.js` | Switches (`sw*`) y palancas (`lev*`) del GLB con pivote; VR (gatillo/grip cerca, o pinchar) y clic en PC. |
| `instrumentos.js` + `instrumentos.json` | Agujas 3D y horizonte sobre las caras del panel. Escalas iguales a `herramientas/relojes.py`. |
| `radios.js` | Consola de radios derecha (pedestal 3D con canvas). |
| `audio.js` | Turbina/hélice sintetizadas, campana de fuego, bocina de pérdida. Voz: audios pregrabados `voz/<clave>.wav` (el Quest no tiene speechSynthesis); si falta la frase, voz del navegador. |
| `voz/` + `herramientas/voces.py` + `voces.ps1` | Frases del tutor → WAV con la voz Sabina de Windows. **Cada vez que cambie un texto de mision.js/main.js:** `python -I herramientas/voces.py` y `powershell -ExecutionPolicy Bypass -File herramientas/voces.ps1` (sólo genera las nuevas). Pronunciaciones en `PRONUNCIA`. |
| `panelvr.js` | Panel de botones para VR (igual que en aurav-senales). |
| `escenario.js`, `tex/`, `autobomba.glb` | Aeródromo de AURAV copiado de aurav-sector, con valle plano a lo largo de la pista (`dRect`) y `alturaTerreno`. |
| `cabina.glb` | Interior del Fire Boss convertido (6,8 MB). **No editar a mano: se regenera.** |
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
- **Inventario de piezas móviles sin función todavía** (esperando el manual de la cabina que consigue Iván): selector de combustible `swFUEL` (3 pos.: OFF · medio · BOTH), `swWRUD` (timón de agua), `swAUX`, panel FRDS: perillas `swK_FRDS1..3`, palanquitas `swFRDS_A..C`, `swFRDS_D` (AUTO/MAN/OFF, 3 pos.), compensador de timón `swK_TRIMTIMON` (7 pos.). Tipos en controles.js: switch, 3 posiciones (`SW3`), varias posiciones (`pos: [ángulos]`, `eje`), perilla giratoria (`perilla: paso`). La ventana es un **paño fijo**; la traba roja `swTRABA` es de la **puerta** (pendiente: modelar la puerta con el avión completo). Faltan: botón SALVO, perillas de los instrumentos.
- Consola izquierda (recortadas en la carga, `MANIJAS`): `swFUEL` selector de combustible (gira en el plano de la consola, eje y; BOTH = pose del modelo, OFF = +90°; OFF apaga el motor), `swWRUD` perilla del timón de agua, `swFLAPS`, `swAUX`. Los switches aceptan `piv`, `eje` y `ang: [apagado, encendido]`.
- **Switches de 3 posiciones** (arriba · medio · abajo): lista `SW3` en main.js → `controles.hacerTresPosiciones`. Estado 1 / 0 / −1; cada toque avanza arriba → medio → abajo → medio… Por ahora sólo `swFPUMP`. Para la simulación los extremos cuentan como encendido. **Pendiente con Bruno (piloto AAXOD):** cuáles switches son de 3 posiciones y qué hace cada una (ej. ON–OFF–AUTO, START–OFF–MOTOR para la barrida de motor).
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

## Dónde quedamos (18/10)
- Publicada v=20261018k. Falta que Iván la pruebe en el Quest: voz pregrabada, rayo para accionar controles, F PUMP con palanquita, panel inferior, caja del horizonte, pausa (placa roja / B-Y).
- **Sin resolver:** Iván dice que «una palanca de la izquierda se rompe» al accionarla; en el navegador no se reproduce. Preguntarle cuál es (POWER blanca, perilla azul, gris o roja) y mirarla moviéndola.
- `levCOND` (perilla gris) y `swAUX` sin confirmar con Iván.

## Próximo gran paso: el avión completo (decidido 22/10)
- **Fuente completa conseguida (22/10):** `OneDrive\Desktop\AURAVir_tractor_43YXO.zip` (FSN AT802 empaquetado para MSFS) extraído en `Documentsurav-cabinasxir_tractor\SimObjects\AIRPLANES\Air Tractor Amphib\`: `model/at802_amp.MDL` (exterior anfibio), `at802_intA.MDL` (cabina), `texture/` + `texture.bare/` (sin pintar) + N6159F/EC-KRF/FSN, `sound/` (36 sonidos reales), `panel/Panel.cfg`, docs. Exterior convertido: `fsx/salida/exterior_bare.glb` (160 partes, 18,2 × 10,8 m). Requiere `pip install --user numpy pillow` para `mdl2glb.py`.
- Exterior = **modelo FSX original del Fire Boss** (mismo autor que la cabina: encaja perfecto y es fiel al AT-802). `Documentsurav-cabinaireboss.zip` está **incompleto** (111 de 203 MB; rikoooo cortó por límite de descargas): Iván lo vuelve a bajar a mano.
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
- `node --check` no detecta todos los errores de sintaxis de estos módulos: probar también `new Function(src sin imports)` o cargar la página.
- Panel inferior negro (`tapa` en main.js) tapa el hueco del soporte del GPS; el horizonte lleva una caja cilíndrica atrás.
- Nunca meter un comentario `//` en medio de una línea al hacer reemplazos de texto: ya se tragó código tres veces. Usar `/* */`.
- `controles.armar` asume mallas con transform identidad (posición horneada en la geometría); para agregar un control nuevo, trasladar la geometría (`geometry.translate`) y nombrarlo `sw…` o `lev…` antes de `armar`.
- Las caras de los relojes se dibujan **sin** agujas (`SIN_AGUJAS=1`); las agujas son mallas de `instrumentos.js`.
- El cielo es una esfera de 1500 m que sigue al avión; el terreno plano llega a ±1200 m y el pasto a ±1600 m. Las sierras empiezan a 300–650 m del aeródromo salvo el valle de la pista.
