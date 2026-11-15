# El AT-802 nuevo en los otros juegos de AURAV (plan, 14/11)

Pedido de Iván (11/11, pendiente 0b de `CLAUDE.md`): que el AT-802 de la cabina nueva (exterior y cabina) aparezca en los
otros juegos de AURAV, así se ve siempre el mismo avión. **Este plan espera el ok de Iván: todavía no se tocó ningún juego.**

## 1. Inventario (14/11, sin tocar nada)

Juegos encontrados en `Documents/` (los dos repos están al día con GitHub, sin cambios locales; ninguno tiene `CLAUDE.md`, sólo `README.md`):

| Juego | Repo | ¿Tiene AT-802? |
|---|---|---|
| **Señaleros de plataforma** (curso de Personal de Rampa) | `aurav-senales` | Sí: 1 avión que llega y sale + 4 estacionados |
| **Control del sector** (apoyo terrestre durante la carga, MOE Vol. I = el «MOE») | `aurav-sector` | Sí: 1 avión cargando con motor en marcha, que al final despega |
| Landing «Ponete el visor» | `aurav-landing` | No (Cessna) |
| «La vuelta al avión» (`aurav-prevuelo`) y `aurav` (360) | sólo zips / graphify | No (Cessna 172S) |

Los dos juegos con AT-802 usan **el mismo archivo** (`at802.glb`, idéntico byte a byte) y casi el mismo cargador (`at802glb.js`):

| | Señaleros | Sector |
|---|---|---|
| Archivo | `at802.glb` (principal) + `at802-lod.glb` (4 estacionados, clones quietos) | `at802.glb` (si falla, el avión de código `at802.js`) |
| Qué es | Modelo de simulador de la misma familia FSN que el nuestro (mismos materiales `mat02/mat08/mat22` y texturas `at_01..04`), repintado blanco con franja bordó y matrícula AUR-AV en la textura | ídem |
| Peso | 5,45 MB · 45.060 tri · 20 llamadas · 9 texturas JPEG hasta 2K (1,23 MB). LOD: 1,43 MB · 20.586 tri · 20 llamadas | 5,45 MB · 45.060 tri · 20 llamadas (+1 el disco) |
| Marco | +x nariz, +y arriba, +z derecha; origen en el piso entre las ruedas principales; actitud de 3 puntos horneada (6,97°) | ídem |
| Escala | 1:1 (envergadura 18,04 m) | ídem |
| Animaciones | Sólo la hélice: nodo `helice-eje` (posición e inclinación) → `helice`, que gira con `rotation.x += dt·45·rpm²`; disco translúcido (r 1,45) con rpm > 0,7. El avión rueda por trayectos (llegada, giro, parada en la barra, salida). Nada de superficies, puertas ni ruedas | Sólo la hélice (`rotation.x += dt·40` con motor). Al final rueda, gira a la pista, rota y despega (giro sobre el origen = las ruedas) |
| Anclajes que usa | `helice`, `disco` | `acople-carga-derecho` (punta de la manguera, marca de la válvula, adonde camina el apoyo), `cabina-piloto` (piloto oculto desde el 29/9 + el blanco de la «seña del piloto»), `helice` (sonido de turbina) |
| Constantes atadas al modelo | `NARIZ_X = 2,64` (marca S a 7 m de la nariz), `CALZAS` (ruedas en z ±1,45), `CONOS_DIAMANTE`, `PUNTA_ALA` (−0,8; −11,2), la barra de parada = las ruedas principales = el origen | `posAcople` (−3,52; 0,715; +0,525) + desvíos de la marca (+0,9 en z) y del apoyo (−0,35; +1,25) |
| Qué se ve del avión | Sólo de afuera: el jugador es el señalero, a 7 m de la nariz, y camina por la plataforma. El botón «Ver desde la cabina» (cámara en x −2,0 a 3 m) está en las fases de observar, que **no tienen acceso desde el 10/10** | Sólo de afuera, y de cerca: el ET va hasta la válvula debajo de la panza y se para junto a la puntera del ala |
| Materiales | El cargador pisa todo: roughness 0,42, metalness 0,05, doble cara, sombra en todas las mallas | ídem |
| Escena en PC (hoy) | 588 mallas, 312 k tri; por cuadro ~460 llamadas y ~425 k tri contando la pasada de sombras. **Los 5 aviones: 100 llamadas y 127 k tri** (y otro tanto en la sombra) | 231 mallas, 267 k tri; por cuadro ~200 llamadas y ~335 k tri. El avión: 21 llamadas y 45 k tri |
| Límite en el Quest | No hay presupuesto escrito; lo único que hay es «niebla por distancia (Quest)» (10/10). En el Quest no se midió nada | ídem |
| Caché | Los GLB se piden sin `?v=` (el Quest puede seguir mostrando el viejo) | ídem |

## 2. El avión nuevo, medido (14/11)

- `exterior_cupula.glb`: 2,32 MB · 54.688 tri · 30 llamadas (21 materiales en la malla grande + la válvula de carga y el estribo
  sueltos) · 5 texturas chicas (0,14 MB). Marco cabina (+x derecha, −z adelante, ruedas en y −2), **nivelado**: la actitud la pone el vuelo.
- `blender/cab_cupula.glb`: 0,21 MB · 7.136 tri · 5 llamadas.
- Cabina (cascarón, tablero, llaves, consola, radios, asiento, pedales, butaca): ~9.300 tri · 78 llamadas · ~0,85 MB. Las pantallas
  y los rótulos se dibujan en vivo (`pantallas.js`, `radios.js`): fuera del simulador no existen.
- Ruedas (medidas finas del 15/11, las del 14/11 eran aproximadas): las principales son cubiertas de radio 0,46 con centro en
  x ±1,422, z −0,818 (trocha 2,84 m entre centros); la de cola, radio 0,22 con centro en z 6,19. La tangente común a las dos da
  **3 puntos a 7,18°** (la cabina usa 7,2°) y el apoyo de las principales en z −0,761. Hélice: eje en x −0,0095, y 0,231, paralelo
  a z (0,04°); palas en z −3,37, radio 1,55; cono hasta z −3,78.
- Llevado al marco de los juegos viejos queda a pocos cm: puntas de ala ±9,01 (el viejo ±9,02), trocha 2,84 (calzas viejas en
  ±1,45), cola −7,80 (−7,86); la nariz queda 8 cm más adelante (x 2,72 contra 2,64) y el eje de la hélice 16 cm más adelante y
  5 cm más alto. Lo que depende de la nariz y de las ruedas se toma de los anclajes del GLB, no de constantes.

**Hallazgos que el plan tiene que resolver:**
1. **La hélice nueva no es una pieza:** viene pegada a la malla del exterior (materiales `pala` y `banda_pala` + el cono); en la
   cabina no gira. Los juegos necesitan un nodo `helice` que gire sobre su eje.
2. **Una sola válvula de carga:** la real de las fotos de AAXOD (27/10), centro-izquierda, 29 cm a la izquierda del eje, con la boca
   a 0,27 m del piso en 3 puntos. El juego de sector carga por la DERECHA (anclaje viejo en z +0,525, a 0,715 m de alto).
3. **Luces de punta de ala invertidas en el exterior nuevo:** verde a la izquierda y roja a la derecha (visto con capturas en la
   cabina publicada; va al revés: roja izquierda, verde derecha). El viejo de los juegos las tiene bien.
4. **Librea distinta:** el viejo es blanco con franja bordó (como el de AAXOD) y matrícula AUR-AV; el nuevo, blanco con franja y
   cola azules (las de fábrica del FSN, decisión del 24/10), compuerta y toma rojas, palas con banda roja y sin matrícula. Cambiar
   el color es un solo valor (la librea es un material, `azul_librea`).
5. **Peso en el Quest:** tal cual, el nuevo son 35 llamadas (113 con cabina) contra 20 del viejo; hay que juntar por material.
6. **Caché:** los juegos piden `./at802.glb` sin versión.

## 3. Propuesta

### 3.1 Un script que exporta el avión «para otros juegos» (conviene: sí)
`herramientas/avion_juegos.py` (Blender 5.2 en segundo plano, como los `cab_*.py`) → `juegos/at802.glb`, `juegos/at802-lod.glb` y
`juegos/at802_informe.json`. Una sola fuente: si la cabina cambia, se vuelve a correr y se copia a los juegos (cada juego sigue
teniendo su copia: no depende de otra página, como quieren sus README).

1. Carga `exterior_cupula.glb` + `cab_cupula.glb` y, para la variante con cabina, las piezas `cab_*` + pedales y butaca con los
   colores que hoy les pone `cabina_nueva.js` (pedales gris metal; butaca malla roja, arnés negro).
2. Separa la hélice (palas, bandas y cono) en `helice-eje` → `helice`, igual que el GLB viejo: `helice-eje` lleva la posición y la
   inclinación, y `helice` queda limpia para que `rotation.x` gire justo sobre el eje.
3. Corrige las luces de punta de ala (roja la izquierda, verde la derecha; el faro rojo de la panza queda rojo).
4. Pasa al marco de los juegos: +x nariz, +z derecha, origen en el piso entre las ruedas principales, 3 puntos horneados (7,14°).
5. Junta por material con colores por vértice: pintura, metal, goma, vidrio de la cúpula y vidrio del FSN → **~5 llamadas el avión
   entero** (+2 o 3 la cabina), sin texturas.
6. Anclajes como nodos vacíos: `acople-carga`, `acople-carga-derecho`, `cabina-piloto`, `ojo-piloto`, `nariz`, `rueda-izq`,
   `rueda-der`, `rueda-cola`, `puntera-izq`, `puntera-der`; `extras` con versión y medidas.
7. **LOD** para los estacionados: sin cabina, simplificado a ~15 k tri, vidrios más oscuros (para que no se vea el hueco), 3–4 llamadas, < 1 MB.
8. Chequeos automáticos: las tres ruedas apoyan en y = 0 (±5 mm); la hélice es simétrica alrededor de su eje (no cabecea al
   girar); envergadura, largo y alto; triángulos, llamadas y MB; anclajes presentes. Vistas de prueba con Eevee.

Peso estimado:

| | Viejo | Nuevo |
|---|---|---|
| Avión principal | 5,45 MB · 45 k tri · 20 llamadas | ~3 MB · ~71 k tri (con cabina) · ~8 llamadas |
| Estacionado (LOD) | 1,43 MB · 20,6 k tri · 20 llamadas | < 1 MB · ~15 k tri · 3–4 llamadas |
| Señaleros, los 5 aviones | 127 k tri · 100 llamadas | ~131 k tri · ~24 llamadas |
| Sector, el avión | 45 k tri · 21 llamadas | ~71 k tri · ~9 llamadas |

### 3.2 Qué variante va en cada juego
- **Señaleros:** el que llega y sale, **con cabina liviana** (de frente se mira el parabrisas, y si vuelve «Ver desde la cabina» ya
  tiene cabina); los 4 estacionados, **LOD**.
- **Sector:** **con cabina liviana** (el ET anda pegado al avión y por las ventanas se ve la misma cabina del simulador). Alternativa:
  sólo exterior (9 k tri y 2 llamadas menos).
- Cabina liviana = las piezas `cab_*` juntas por material, quietas, sin pantallas vivas (vidrio oscuro) y sin rótulos.

### 3.3 Cambios en cada juego

**Señaleros (`aurav-senales`):**
- `at802.glb` y `at802-lod.glb` ← `juegos/`; las URL con `?v=`.
- `at802glb.js`: anclajes del GLB (si no están, las constantes de hoy); no pisar los materiales del avión nuevo (sólo sombra);
  vidrios con `depthWrite` apagado como en la cabina; sin sombra en vidrios ni cabina; disco de hélice r 1,55.
- `plataforma.js`: `CALZAS` a las ruedas nuevas (z ±1,46, radio 0,46); `NARIZ_X` del GLB (2,63); los conos del diamante se verifican
  (no deberían cambiar); el LOD sin pisar materiales.
- `main.js`: «Ver desde la cabina» en `ojo-piloto` (x −2,89; 3,04 m) aunque hoy no tenga acceso; subir los `?v=`.
- README: de dónde sale el avión.
- **Verificación (capturas a Iván):** llegada (giro y parada en la barra), desde la marca S, calzas y conos de cerca de los dos lados,
  los 4 estacionados, la hélice girando (dos cuadros), salida, el compañero en la punta del ala sin chocar el ala, consola sin errores
  ni 404, llamadas y triángulos antes y después.

**Sector (`aurav-sector`):**
- `at802.glb` ← `juegos/at802.glb` (con `?v=`); `at802glb.js` igual al de señaleros (quedan iguales los dos).
- La válvula de carga, según decida Iván (pregunta 3); la marca de la válvula y el punto del apoyo se corren para que nadie quede
  dentro del fuselaje.
- `cabina-piloto` al asiento nuevo (el piloto sigue oculto; el blanco de la seña queda en la cabina).
- El despegue: verificar que rota sobre las ruedas y que no se hunde la cola.
- `?v=` y README.
- **Verificación (capturas a Iván):** la carga con motor (hélice y disco), la manguera en la boca de cerca y del lado de la carga, el
  ET en la válvula y en la puntera, la zona roja contra la hélice, el despegue (rotación y vuelo), consola, llamadas y triángulos.

### 3.4 Etapas
- **A. Script y GLB** (`aurav-cabina-at802`): vistas Eevee + informe → capturas a Iván → commit local.
- **B. Señaleros:** reemplazo, ajustes y verificación → capturas → commit local en `aurav-senales`.
- **C. Sector:** reemplazo, válvula y verificación → capturas → commit local en `aurav-sector`.
- **D. Publicar, sólo con el ok de Iván:** push de cada repo con la cuenta Ivan-I-Aguilar y mirar las páginas publicadas (consola sin
  errores ni 404).
- **E. Iván en el Quest:** que se vea bien de cerca, la hélice, y si baja la fluidez. Acá no hay Quest: no se prueba nada en el casco.

### 3.5 Lo que no se hace y los riesgos
- No se tocan la landing ni los juegos del Cessna. La cabina del simulador no se toca en este trabajo: si las luces de punta de ala
  y la librea se corrigen, allá va aparte (para que los tres juegos queden iguales).
- **Licencia:** el FSN es freeware de FSX; los readme no traen términos (el del Fireboss sólo lista archivos y el terrestre no trae
  readme). El avión de hoy en estos dos juegos ya es un modelo de simulador de la misma familia, así que la exposición no cambia:
  sigue siendo uso interno.
- Las normales del FSN vienen mezcladas: el LOD simplificado puede salir con manchas. Se mira en las capturas; si pasa, el LOD se
  hace sacando detalles en vez de simplificar la chapa.
- El Quest cachea: `?v=` en todos los módulos y GLB que cambien.

## 4. Decisiones de Iván (de a una)
1. **¿Aprobás el plan?** **Aprobado el 15/11: «sí, cabina y exterior»** (cabina liviana en el avión principal de los dos juegos, LOD
   en los estacionados).
2. **Librea:** 1 · azul, como la cabina hoy · 2 · bordó como el de AAXOD y los juegos viejos (y después la cabina igual) · 3 · otra.
3. **Válvula de carga en sector:** 1 · la real (centro-izquierda) y la manguera llega por debajo desde la derecha · 2 · una segunda
   válvula espejada a la derecha, como el viejo · 3 · pasar la carga al lado izquierdo · 4 · otra.
4. **Matrícula:** 1 · sin matrícula, como la cabina · 2 · AUR-AV pintada, como los viejos · 3 · otra.
5. **Publicar** cada repo: sólo con su ok expreso.

## 5. Avance
- **Etapa A HECHA el 15/11 (sin publicar):** `herramientas/avion_juegos.py` (numpy + Pillow, sin Blender) →
  `juegos/at802.glb` (2,5 MB · 71 k tri · 9 llamadas: exterior 58 k / 4, cabina 9,3 k / 4, hélice 3,9 k / 1) y, llamando a Blender
  (`herramientas/avion_juegos_lod.py`, Decimate), `juegos/at802-lod.glb` (0,9 MB · 15 k tri · 5 llamadas; vidrios opacos oscuros).
  Grupos de material: pintura, mate, metal y vidrio, con colores por vértice. Hélice = palas, bandas, cono (mat08), plato (mat10) y
  las 5 raíces blancas (mat02 delante del capó), en `helice-eje` → `helice`. Anclajes: `acople-carga` y `acople-carga-derecho` (los
  dos en la boca de la válvula real, hasta la pregunta 3), `cabina-piloto`, `ojo-piloto`, `nariz`, `rueda-izq/der/cola`,
  `puntera-izq/der`; medidas en los `extras` del nodo `at802`. Chequeos (todos bien): las tres cubiertas apoyan en y = 0 (a menos de
  0,6 mm), nada bajo el piso, los aros del cono centrados en el eje de giro (0,15 mm). Luces de punta de ala corregidas (roja izq.,
  verde der.). `--librea bordo` pinta la franja, la cola y las puntas con el bordó del avión viejo; `--nombre` cambia el nombre de
  salida para probar variantes. Visor: `juegos/ver.html` (mismas luces que los juegos; `__ver('…')` con 14 vistas, anclajes,
  hélice que gira, LOD al lado). Ronda mirada: 3/4 delanteros y traseros, frente desde la marca S, hélice quieta y girada, válvula,
  ruedas, cabina desde el ojo, por la ventana izquierda, puntas de ala, LOD de cerca: sin defectos.
- **Etapa B HECHA el 15/11 (señaleros; commit local bf01a05 en `aurav-senales`, sin publicar):** `at802.glb` y `at802-lod.glb`
  nuevos; `at802glb.js` usa los anclajes y los materiales del GLB (`prepararAvion`, `esAvionNuevo`; con un GLB viejo se arma como
  antes) y `V_AVION = '20261115a'` en las URL de los GLB; `plataforma.js`: `NARIZ_X` 2,72, calzas a ±0,38 del apoyo en z ±1,422,
  cono de la nariz a 4,2; `main.js`: «Ver desde la cabina» en `ojo-piloto`; versiones 20261115a; README. Probado en PC: sin errores;
  marca S, calzas de cerca, estacionados de lejos y de cerca, rodaje en la curva con la hélice, vista de cabina. Escena: 517 mallas
  (antes 588), 315 k tri (312 k), 196 con sombra (272). Con el panel del navegador oculto no se pudo medir por cuadro.
- **Falta:** la librea (pregunta 2), la etapa C (sector, después de la pregunta 3), publicar (con su ok) y el Quest.
