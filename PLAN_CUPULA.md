# Etapa 1b — La cúpula nueva del AT-802 (plan detallado)

Decisión de Iván (3/11/2026): **B, rehacer la cúpula**: el FSN «se ve roto» (huecos en sierra en las
ventanillas traseras, caras que faltan, chapas-isla flotando) y su parabrisas es un paño único con los
parantes pintados. Este plan es el detalle de la etapa 1b de `PLAN_CABINA_NUEVA.md`. Iván lo aprueba
antes de modelar. Marco: el de la cabina (+x derecha del piloto, +y arriba, −z adelante; Blender = (x, −z, y)).

**Estado:** aprobado por Iván el 3/11. **1b.0 (medición) HECHA el 5/11**: Iván vio la lámina y dio el ok para
modelar («Sí, arrancá»; §2b: lo medido, los hallazgos y lo que quedó sin resolver). **1b.1 (corte del FSN, jaula,
parabrisas y faja) HECHA el 7/11** con el ok de Iván a la ronda de vistas («Sí, seguí»). **1b.2 (techo con sus ventanas y forro):
modelo hecho el 7/11 (v=20261107a), falta el ok de Iván.** Sigue la 1b.3 (puertas, ventanillas traseras, carenado, solapas).

## 1. Qué es «la cúpula» y qué se conserva
- **Se rehace** todo lo que está POR ENCIMA del antepecho (y ≈ 0,93–0,95) entre el borde trasero del capó
  (z ≈ 0,65) y detrás del asiento (z ≈ 2,5): la jaula de caños, el parabrisas de 3 paños, el techo con sus
  dos ventanas, las dos puertas (marco, vidrio y panel) y el carenado trasero con sus ventanillas.
- **Se conserva** del FSN: toda la chapa por debajo del antepecho (calzó con la 360 con 2–3 cm), el capó,
  las alas, la cola, el tren, la hélice y la tolva. Se BORRA del FSN sólo la zona de cúpula (§5).
- **Expectativa:** geometría limpia con la distribución real y los caños a la vista, no fotorrealismo.
  Desde afuera, blanca lisa como el resto del exterior repintado (27/10); desde adentro, caños grises y
  forro gris (el forro del techo pasa a ser parte de la cúpula: reemplaza `techo.glb`).

## 2. Lo que ya sabemos (etapa 0) y lo que es provisorio
| Dato | Valor | De dónde |
|---|---|---|
| Punto de la 360 del asiento | (0,00; 1,16; 1,58), girada 13° a la izq., 6° arriba | calcado (iou 0,55) |
| Antepecho FSN (línea del vidrio) | y 0,95 en z 1,1–1,3; y 0,925 en z 1,4–1,8; x ±0,52–0,56 | casco_medido.json |
| Techo FSN (eje) | y 1,46 (z 1,2) · 1,62 (z 1,4) · 1,69 (z 1,6–2,0) · 1,63 (z 2,2) · 1,55 (z 2,4) | casco_medido.json |
| Ancho interior FSN | a y 0,5: 1,33 m (z 1,6) · a y 0,9: 1,20 m · a y 1,5: 0,76 m | casco_medido.json |
| Plano del parabrisas FSN | ~~z = 0,74 + 0,93·(y − 1,02)~~ **ESTABA MAL** (43°; el vidrio del FSN tiene 54,5° y el real 50,2°): ver §2b, plano W | medido 1/11, corregido 5/11 |
| Parantes del parabrisas REAL desde la 360 | a −17,5° y +22,6° del eje (≈ ±0,22 m en la base) | panorama (PROVISORIO: la asimetría de 5° es la cámara corrida ~2 cm o el yaw; se resuelve en 1b.0) |
| Ventanas del techo REALES | lon −110…−60 / +60…+100, lat 55–75 desde la cámara | panorama (PROVISORIO) |
| Ventana de puerta REAL (izq.) | lon −125…−55, lat −10…+45 desde la cámara | panorama (PROVISORIO) |
| Diferencias FSN ↔ real | paño central corrido ~6 cm; ventanas del techo 8–10 cm más afuera/atrás; ventanas de puerta: coinciden abajo y adelante, pero el FSN queda ~7 cm más bajo arriba y ~10 cm más corto en la esquina superior trasera (ambos lados; lo vio Iván el 3/11); techo con 2–3 cm | sup54_medidas + superposición |

Provisorio también: los diámetros de los caños (supongo 3,2 cm los largueros y arcos, 5 cm los parantes
del parabrisas y los postes de puerta; se miden en 1b.0 contra el ancho que ocupan en la 360) y la forma
exacta de las ventanillas traseras (no se ven desde el asiento: salen de las 360 de afuera, aproximadas).

## 2b. Lo medido en la 1b.0 (5/11/2026): reemplaza lo PROVISORIO de la tabla de arriba
Todo está en `blender/calcado/cupula_puntos.json` (279 puntos, cada uno con su píxel de origen, su superficie y su
precisión; el bloque `simetrico` es lo que se modela: lado derecho, el izquierdo es su espejo) y dibujado en
`blender/calcado/cupula_plano.png` (tres vistas con cotas, sin foto). La lámina con foto para revisar,
`cupula_puntos.png`, queda fuera del repo (`Documents/aurav-cabina/fotos/calcado_etapa0/`).

| Qué | Valor (m, lado derecho; x a la derecha, y arriba, z hacia atrás) | Precisión |
|---|---|---|
| Cámara de la 360 del asiento | (-0,003; 1,159; 1,578), 12,2° a la izq., 5,6° arriba, alabeo -0,3° | simetría izq./der. 0,25 cm |
| Ventana de puerta (el marco visto desde el asiento) | adelante-abajo (0,601; 0,969; 1,068) · atrás-abajo (0,577; 0,913; 1,732) · atrás-arriba (0,364; 1,488; 1,896) · adelante-arriba (0,387; 1,496; 1,501); lados: abajo 66,6 · atrás 63,5 · arriba 39,5 · adelante 71,5 cm | ±1 cm vista desde el asiento; ±3,5 cm en x |
| Ojo de buey | centro (0,388; 1,436; 1,813); disco Ø 9,0 cm | ±1 cm |
| Plano W del parabrisas (la cara de ADENTRO: pasa por los ejes de los dos parantes) | z = 1,2057 + 1,1986·(y − 1,5), 50,2° desde la vertical (corregido el 5/11: el de la etapa 0 estaba mal). Medido con dos fotos: el parante derecho desde el asiento × la banda oscura del parante lejano vista desde la 360 del ala izquierda (0043). El vidrio y las tapas blancas van unos 4 cm MÁS AFUERA (rasgos exteriores a 4,7–5,7 cm de W en las 360 de afuera) | ±3 cm en posición (depende de la pose de la 0043); la pendiente, firme |
| Parante del parabrisas (eje) | tope (0,211; 1,523; 1,234) · donde lo tapa el tablero (0,234; 1,325; 0,996); bordes sobre W: hacia el centro x 0,207 → 0,181 y hacia el costado 0,260 → 0,240 (de abajo a arriba); ancho visible 5,2 a 5,9 cm; sección 5,6 × 4,1 cm; ejes a 42,1 cm arriba y 46,7 a la altura del tablero | ±1 cm |
| Paño central del parabrisas | 36,4 cm de ancho arriba; esquina superior (0,182; 1,523; 1,234) | ±1 cm (sobre W) |
| Paño lateral (CURVO: del parante da la vuelta hasta el poste de puerta) | esquinas de arriba (0,242; 1,513; 1,221) sobre W y (0,401; 1,486; 1,338) sobre el plano de la puerta; borde de arriba 20,0 cm; último punto visible abajo (0,574; 1,059; 0,989) | ±1,5 cm |
| Poste de puerta delantero · poste entre ventanas | 12,2 cm · 15,8 cm de ancho, vistos desde el asiento sobre el plano de la puerta | ±1,5 · ±3 cm |
| Ventana del techo | puntas (0,286; 1,668; 1,547) y (0,290; 1,649; 1,915): unos 37 × 13,5 cm; el techo real queda unos 5 cm POR FUERA del techo del FSN | ±2 a 3 cm, provisorio |
| Ventanilla trasera (desde afuera) | adelante-arriba (0,368; 1,480; 2,056) · atrás-arriba (0,376; 1,427; 2,785) · atrás-abajo (0,551; 0,954; 2,664) · adelante-abajo (0,563; 0,943; 1,915); lados: arriba 73,1 · atrás 51,8 · abajo 74,9 · adelante 58,8 cm | ±2 cm adelante, ±4 a 5 cm atrás, provisorio |
| Jaula del techo (nudos) | FR (0,334; 1,571; 1,438) · PR (0,203; 1,565; 1,321) · FC (0,000; 1,697; 1,483) · RR (0,303; 1,599; 2,035) · RC (0,000; 1,599; 2,035); caños de 3 a 4 cm | ±4 cm, provisorio |
| Antepecho | desde el asiento: y 0,969 (z 1,07) → 0,913 (z 1,73); por fuera queda en y 0,94 a 0,96 hasta z 2,66 | ±1 a 2 cm |

**Hallazgos (cambian cosas de este plan):**
1. **La asimetría de los parantes no existía.** En la etapa 0 se tomó el limpiaparabrisas por el parante
   izquierdo. Con los bordes bien leídos, la cámara estaba girada 12,2° (no 13,0°) y a 3 mm del eje, y
   parantes y puertas quedan espejo con 0,25 cm.
2. **La cámara 360 tiene DOS lentes** (costuras en lon ±90° de la foto): la trasera mira desde otra pupila (±1,1 cm)
   y su imagen está girada 0,25° alrededor del eje (medido con el hangar) y 0,78° alrededor de la vertical (sale
   de la simetría; sin confirmar). Con la cabina a 50 cm es hasta 1 cm. Corregido en `cab_foto360.py`.
3. **La jaula del techo no es de 3 arcos y 2 largueros** (J5/J6 de §3): es un arco delantero de poste a poste
   (z 1,44 a 1,48), dos diagonales cortas del arco a la cabeza de cada parante, una **V** que va del centro del arco
   delantero a los dos nudos traseros, y un **marco trasero** (arco + travesaño recto) en z 2,04, sobre el poste
   entre la puerta y la ventanilla trasera. Del centro del travesaño bajan dos caños hacia atrás y afuera (su
   extremo lo tapa el asiento). Las ventanas del techo quedan entre la V y el dintel de cada puerta.
4. **La ventanilla trasera es grande (73 × 55 cm) y llega a z ≈ 2,8** (el plan cortaba el FSN en z 2,55): detrás
   del piloto hay más cabina. El FSN ahí ya se angosta: hay que rehacer el carenado hasta z ≈ 2,9. Es más
   alcance que el aprobado: **lo decide Iván.**
5. **El techo real queda unos 5 cm por fuera del techo del FSN** (ventanas del techo trianguladas desde afuera).
6. **Sin resolver con fotos:** (a) el ancho de la cabina sale del FSN (plano de la puerta: convergencia
   3,7°, caída 19,3°); la forma de la ventana de puerta vista de adentro y de afuera difiere 1,9 cm rms
   (3 cm en la esquina de abajo atrás) y cerraría mejor (1,1 cm) con 8,2° y 13,3°, que corre las esquinas
   hasta 5 cm en x. Se define con **3 medidas de cinta**: de puerta a puerta en el antepecho, adelante y atrás
   de la puerta, y en el borde de arriba. (b) La altura de la cámara, su avance y su cabeceo son los del calcado
   de la etapa 0 (±2 cm, ±2°). (c) La altura de los caños del techo (se apoyaron en el techo del FSN + 2,5 cm).
7. **No se ve desde el asiento:** la base del parabrisas (la tapa el tablero), el lado derecho del arco
   delantero (reflejo) y el extremo de los dos caños traseros. Se completa por simetría o prolongando.
8. **(5/11, al modelar) El plano del parabrisas de la etapa 0 estaba mal** (43°; el vidrio del FSN tiene 54,5°):
   el real, con dos fotos, es W: z = 1,2057 + 1,1986·(y − 1,5) (50,2°). Lo que se ve desde el asiento son las caras
   de ADENTRO de la estructura (W y el plano de la puerta); el vidrio y las tapas blancas van unos 4 cm más afuera
   (en las 360 de afuera los rasgos exteriores quedan 4,7–5,7 cm por fuera de W; el techo, +5 cm). Los paños
   laterales son CURVOS: del parante dan la vuelta hasta el poste de puerta y por abajo siguen el borde del capó.
9. **Los bordes medidos son SILUETAS desde la cámara:** parantes y postes tienen fondo y la cámara los mira de
   costado, así que sus caras laterales se modelan sobre el plano que pasa por la cámara y por el borde («abanico»,
   `cab_cupula.py`); con caras a escuadra del paño, desde el asiento se veían 3 cm más anchos que en la foto (2 cm
   de vidrio tapado por lado). Lo verifica el chequeo «silueta desde la cámara de la 360» (±1,5 mm).

**Cómo se rehace** (unos 5 minutos; las fotos están en `Documents/aurav-cabina/fotos/vr360/VR 360 VARIAS ALTURAS/`):
```
python -E -P -X utf8 herramientas/cab_cupula_marcas.py "<carpeta de las fotos>"            (marcas54.json, marcas_afuera.json)
blender -b --factory-startup --python herramientas/cab_cupula_puntos.py -- --ajustar       (pose54.json por simetría)
blender -b --factory-startup --python herramientas/cab_cupula_afuera.py                    (cupula_afuera.json, pose50/43.json)
blender -b --factory-startup --python herramientas/cab_cupula_puntos.py                    (cupula_puntos.json completo)
python -E -P -X utf8 herramientas/cab_cupula_lamina.py "<carpeta de las fotos>" "<salida>" (lámina con foto y cupula_plano.png)
```

## 3. Piezas (todas en `blender/cab_cupula.glb`, un solo script `herramientas/cab_cupula.py`)
**Ojo (5/11):** J5 y J6 se rehacen según la jaula real (§2b.3) y el carenado trasero llega a z ≈ 2,9 si Iván lo
aprueba (§2b.4).

### J. Jaula de caños (gris, a la vista desde adentro; desde afuera queda bajo la chapa)
| Pieza | Qué es | Cómo se construye |
|---|---|---|
| J1 | 2 parantes del parabrisas (entre el paño central y los laterales) | tubos de la base (antepecho delantero) al arco del techo, calcados de la 360 |
| J2 | 2 postes delanteros de puerta (A) | tubos del antepecho al techo, siguiendo el borde delantero de la ventana de puerta |
| J3 | 2 postes traseros de puerta (B) | ídem por el borde trasero |
| J4 | 2 postes traseros del carenado (C) | detrás de las ventanillas traseras |
| J5 | arco delantero (sobre el parabrisas), arco central y arco trasero del techo | tubos curvos (polilínea de 8–12 tramos) siguiendo el techo medido |
| J6 | largueros del techo (2, de adelante a atrás, por los bordes de las ventanas del techo) | tubos |
| J7 | largueros del antepecho (2, uno por lado, donde se apoya el vidrio) | tubos que siguen la línea del antepecho medida |
Tubos: cilindros de 8 lados por tramo, unidos por esferas chicas en los codos (sin rotaciones euler: los
tramos se construyen por vértices a lo largo de la polilínea). Presupuesto: ≤ 4.000 triángulos.

### V. Vidrios (material `vidrio`: transparente, tinte gris muy leve, `depthWrite` false, renderOrder 2)
| Pieza | Qué es | Forma |
|---|---|---|
| V1 | paño central del parabrisas | cuadrilátero PLANO entre los dos parantes J1 (calcado) |
| V2 | 2 paños laterales del parabrisas | cuadriláteros planos entre J1 y J2 |
| V3 | 2 ventanas de puerta | polígono plano (trapecio con la esquina superior trasera redondeada), más el ojo de buey (anillo + disco de 6 cm) |
| V4 | 2 ventanas del techo | polígono de borde redondeado APOYADO en la superficie del techo (se proyecta sobre el arco) |
| V5 | 2 ventanillas traseras del carenado | cuadriláteros chicos, forma de las 360 de afuera (aproximada) |
Cada vidrio cierra EXACTO contra su caño: sus vértices se toman de los mismos puntos que los tubos
(nada de «a ojo»: lección de los vidrios en sierra).

### T. Techo y chapa
| Pieza | Qué es | Cómo |
|---|---|---|
| T1 | chapa exterior del techo, del arco delantero al trasero, con los recortes de V4 | superficie por franjas entre los arcos J5 (cuadrícula 5 cm), blanca |
| T2 | forro interior del techo (gris), 1,2 cm por debajo de T1, mismos recortes | misma cuadrícula desplazada hacia adentro (reemplaza `techo.glb`) |
| T3 | mejillas: la chapa entre el techo y el antepecho que NO es vidrio (el ángulo sobre el poste C, el marco alrededor de las ventanillas traseras) | polígonos planos o por franjas, blancos afuera / grises adentro |
| T4 | faja de apoyo del parabrisas: la chapa entre el borde trasero del capó y la base de V1/V2 (el «hombro» del capó donde muere el vidrio) | franja medida contra el capó del FSN con rayos |
| T5 | cierre superior del cortafuegos: NO va acá (es H3 del cascarón, etapa 1); la cúpula sólo tiene que cerrar contra él sin dejar rendija | — |

### P. Puertas (no abren: decisión del 24/10)
| Pieza | Qué es | Cómo |
|---|---|---|
| P1 | marco de cada puerta (tubo perimetral por dentro de J2–J3 y el antepecho) | tubos finos (2,5 cm) |
| P2 | panel exterior de la puerta sobre el antepecho (blanco) y panel interior (oscuro, con lugar para la placa CATEGORÍA RESTRINGIDA y la manija roja, que van en la etapa 1 / rótulos) | dos polígonos planos separados 3 cm |
| P3 | bisagras y manija exterior | decorativas chicas (opcional, al final) |

### S. Costura con el FSN (§5)
| Pieza | Qué es |
|---|---|
| S1 | solapa de 3 cm hacia abajo del antepecho, por fuera, en todo el perímetro del corte: tapa el borde dentado que deja el FSN al borrar triángulos enteros |
| S2 | ídem contra el capó (adelante) y contra el carenado (atrás) |

## 4. Medidas: de dónde sale cada punto (1b.0, antes de modelar)
1. **La 360 del asiento manda** en todo lo que se ve desde el asiento: parantes, postes, arcos,
   ventanas de puerta, ventanas del techo, línea del antepecho. Para cada punto: píxel en la foto
   (7744×3872, 0,05°/px; se marca sobre recortes ampliados, con cuadrícula) → dirección en el marco de
   la cabina (con la pose de la etapa 0) → punto 3D cortando esa dirección con la superficie que le toca:
   - parantes y postes: el plano vertical que pasa por su base y su tope (dos direcciones por caño, la
     base en el antepecho medido y el tope en el techo medido);
   - vidrios: el plano de su marco;
   - arcos y ventanas del techo: la bóveda del techo medida (casco_medido.json) ajustada a lo que la
     foto muestra (si el techo real está más alto o más bajo, se corrige la bóveda, no la foto).
   Precisión esperada: ±1 cm en lo que está a menos de 1 m; ±2 cm en lo demás.
2. **Primero se resuelve la asimetría** de los parantes (−17,5° / +22,6°): se prueba la cámara corrida
   2 cm a la derecha y/o 2,5° de yaw, y se elige lo que deja simétricos los dos parantes Y las dos
   puertas a la vez. Queda anotado en `blender/calcado/pose54.json`.
3. **Las 360 de afuera** (0043 sobre el ala izq., 0050 sobre el ala der., 0044/0045 de frente) dan la
   forma exterior: ventanillas traseras, borde del techo y de las puertas por fuera, posición de las
   ventanas del techo vistas desde arriba. Pose aproximada (mediana 6 cm): se refina marcando a mano
   6–8 puntos conocidos (esquinas del parabrisas, puntas de ala, rueda) con `cab_calcar.py`. Vale ±3 cm:
   suficiente para las ventanillas traseras (no se ven desde el asiento).
4. **Catálogo / manual:** nada publicado sobre la jaula; los diámetros se miden en la foto.
5. **Salida:** `blender/calcado/cupula_puntos.json` con cada punto (nombre, 3D, de qué foto y píxel
   salió, precisión) y una lámina `cupula_puntos.png` sobre la 360 para que Iván la revise.

## 5. Cómo se corta el FSN (`herramientas/cab_cortar_fsn.py` → `exterior_cupula.glb`)
- Entrada `exterior.glb`; salida un archivo NUEVO `exterior_cupula.glb` que carga sólo `?cabina=nueva`.
  `exterior.glb` queda intacto para `?cabina=vieja` hasta la etapa 7 (ahí se reemplaza).
- Se borran **triángulos enteros** (nunca se aplastan vértices) cuyo centro cae en la zona de cúpula:
  z entre 0,55 y 2,55, y por encima de (antepecho(z) − 0,02), más TODO el vidrio mat22 en esa z. El
  carenado trasero se corta hasta z 2,55 y por encima de la línea de la ventanilla; detrás, la cola
  sigue entera.
- Firma inequívoca y verificación en el acto (regla del 1/11): se imprime cuántas caras se borran por
  material y se renderiza desde las 12 vistas; nada «generoso».
- El borde dentado que queda lo tapan las solapas S1/S2 (3 cm) y los largueros J7.
- Las chapas-isla sueltas que estén dentro de la cabina (el triángulo flotante de la captura de Iván,
  el haz de alambres del parante trasero izq.) se borran con la misma regla si están enteras dentro de la
  zona; si no, las tapa el cascarón (etapa 1).

## 6. Etapas de la 1b (cada una deja el juego andando con `?cabina=nueva`)
| Paso | Qué | Lista cuando |
|---|---|---|
| 1b.0 | Medición (§4): `cupula_puntos.json` + lámina; asimetría resuelta; 360 de afuera refinadas | Iván revisa la lámina de puntos sobre la foto y da el ok. **HECHA el 5/11/2026** (sin cambios en el juego: sigue v=20261103a), con el ok de Iván a la lámina |
| 1b.1 | Corte del FSN (§5) + jaula J + parabrisas V1/V2 + faja T4 | 12 vistas sin dientes delante; chequeo de estanqueidad (§7) con el techo provisorio. **HECHA el 7/11/2026 (v=20261105a, sin publicar), con el ok de Iván a la ronda («Sí, seguí»).** `cab_cortar_fsn.py` → `exterior_cupula.glb` (corte recto en y 0,93, z 0,76 a 2,55) y `cab_cupula.py` → `blender/cab_cupula.glb` (2622 triángulos, 5 llamadas, 0,07 MB; chequeos: nada flotando, nada coplanar, vidrio contra caño ≤ 13 mm, estanqueidad 0 de 20.000 rayos, silueta desde la 360 ±1,5 mm). Provisorio: techo liso, zona trasera y vanos de puerta abiertos. Hallazgos en §2b.8–9 |
| 1b.2 | Techo T1/T2 con las ventanas V4, arcos y largueros | techo cerrado; forro sin sierra en los vanos (lección del 2/11). **MODELO HECHO el 7/11/2026 (v=20261107a, sin publicar); falta el ok de Iván a las vistas.** La chapa se triangula (Delaunay con los contornos como restricción) sobre la bóveda: arcos medidos + 4,1 cm (ajustado para que pase por el plano de la ventana medido desde afuera) y el carenado del FSN en z 2,56, más el flanco de cada lado hasta 3 cm por encima de la ventana de puerta; las dos ventanas son los mismos triángulos del hueco (contorno medido desde el asiento, redondeado; vidrio 1 mm hundido), el forro va a 7 mm con un canto oscuro en cada ventana. 4888 triángulos, 5 llamadas, 0,13 MB; estanqueidad del techo 0 de 20.000 rayos (de 50° a 90° de altura, hasta que estén las puertas). El larguero FR–RR pasa por debajo del tercio exterior de la ventana: desde el asiento su silueta coincide con el borde exterior que se marcó en la foto (es lo que se ve). Los caños quedan a la vista, 3 a 5 cm por debajo del forro |
| 1b.3 | Puertas P + ventanas V3 + carenado T3 con ventanillas V5 + solapas S | estanqueidad total; 360 superpuesta de nuevo: iou ≥ 0,8 y mediana ≤ 1 cm en parantes y puertas. **Puertas HECHAS el 7/11/2026 (v=20261107a, sin publicar; falta el ok de Iván a las vistas):** cerradas (24/10): piel blanca a 9,4 mm por fuera del plano D (donde estaban las tapas de los postes), forro oscuro a 4 mm sólo entre los postes (que quedan a la vista), vidrio entre los dos, canto alrededor del hueco; el hueco es el marco medido desde el asiento con la esquina de arriba atrás redondeada (r 8 cm) y el borde de abajo 1 cm sobre el cinturón; cada contorno sobre los rayos de la cámara a su profundidad (desde afuera el vidrio se ve un poco más grande, como en las 360). Ojo de buey: anillo oscuro Ø 7–9 cm. Todo abultado hacia la chapa del FSN en el pie. Los flancos del techo pasaron a grillas regladas (de la línea FR–RR a la piel). 6212 triángulos, 5 llamadas. **Falta:** la ventanilla trasera con su carenado (decisión de §9.6) y las solapas si hicieran falta; después bajar el chequeo del techo a 0° |
| 1b.4 | Quest: Iván mira desde el asiento y por los vanos; ajuste de tinte y grosores | ok de Iván |
Sesiones: 2 a 3. Después sigue la etapa 1 (cascarón), que ya se mide contra la cúpula nueva arriba y
contra el FSN abajo.

## 7. Verificación (además de los 6 chequeos de `cab_comun.chequear`)
1. **Estanqueidad:** 20.000 rayos desde el ojo y desde 4 puntos más de la cabina: ninguno sale al
   exterior sin atravesar un vidrio (0 escapes); se listan los que escapan con su dirección.
2. **Nada del FSN asoma:** ningún vértice del FSN que quede dentro de la zona de cúpula (sobre el antepecho).
3. **Vidrio contra caño:** cada vértice de vidrio a menos de 2 mm de su tubo.
4. **La 360 otra vez:** `cab_calcar.py --pose` + `cab_superponer.py` con `exterior_cupula.glb` +
   `cab_cupula.glb`: iou y medidas por zona; meta: mediana ≤ 1 cm, p90 ≤ 2,5 cm.
5. **Ronda de 12 vistas** (`__ronda`), de las que las de afuera miran la costura con el FSN.
6. **Presupuesto:** cúpula ≤ 12.000 triángulos, ≤ 8 llamadas, ≤ 0,4 MB.

## 8. Riesgos
| Riesgo | Cómo se cubre |
|---|---|
| Costura visible con el FSN (escalón o rendija) | solapas de 3 cm + largueros sobre la línea; vistas 8–12 de la ronda |
| Techo real más alto/bajo que el FSN | la bóveda se ajusta a la 360 en 1b.0 antes de modelar; el forro sale de la bóveda nueva |
| Parantes mal ubicados por la asimetría de la pose | se resuelve primero (§4.2) y se valida con las dos puertas |
| Ventanillas traseras sólo aproximadas | se marcan como provisorias; se corrigen si Iván saca una foto desde atrás |
| Rendimiento en el Quest (vidrios transparentes = overdraw) | 5 paños + 2 + 2 + 2: poco; los vidrios no se superponen entre sí |

## 9. Lo que falta saber (Iván)
1. Si el paño rojo del techo (¿parasol?) va o no (propongo que no, por ahora).
2. Una foto desde atrás del asiento (ventanillas traseras y mamparo) si la consigue; si no, va aproximado.
3. Tinte de los vidrios: casi incoloro (propuesto) o gris como en la foto.
4. Diámetro real de los caños si lo sabe (si no, se mide en la foto). (5/11: en la foto dan 3 a 4 cm.)
5. (5/11) Tres medidas de cinta del avión real: de puerta a puerta en el antepecho, adelante y atrás de la
   puerta, y en el borde de arriba de la puerta (definen el ancho de la cabina: §2b.6).
6. (5/11) Si se rehace el carenado hasta z ≈ 2,9 para que entre la ventanilla trasera entera (§2b.4).
7. (5/11) Qué hay detrás del piloto en este avión (¿segundo asiento?): se ve por la ventanilla trasera.
