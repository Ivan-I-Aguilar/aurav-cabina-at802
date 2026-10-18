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
