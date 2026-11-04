# Etapa 1b — La cúpula nueva del AT-802 (plan detallado)

Decisión de Iván (3/11/2026): **B, rehacer la cúpula**: el FSN «se ve roto» (huecos en sierra en las
ventanillas traseras, caras que faltan, chapas-isla flotando) y su parabrisas es un paño único con los
parantes pintados. Este plan es el detalle de la etapa 1b de `PLAN_CABINA_NUEVA.md`. Iván lo aprueba
antes de modelar. Marco: el de la cabina (+x derecha del piloto, +y arriba, −z adelante; Blender = (x, −z, y)).

**Estado:** propuesto el 3/11, a la espera del ok de Iván.

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
| Plano del parabrisas FSN | z = 0,74 + 0,93·(y − 1,02) | medido 1/11 |
| Parantes del parabrisas REAL desde la 360 | a −17,5° y +22,6° del eje (≈ ±0,22 m en la base) | panorama (PROVISORIO: la asimetría de 5° es la cámara corrida ~2 cm o el yaw; se resuelve en 1b.0) |
| Ventanas del techo REALES | lon −110…−60 / +60…+100, lat 55–75 desde la cámara | panorama (PROVISORIO) |
| Ventana de puerta REAL (izq.) | lon −125…−55, lat −10…+45 desde la cámara | panorama (PROVISORIO) |
| Diferencias FSN ↔ real | paño central corrido ~6 cm; ventanas del techo 8–10 cm más afuera/atrás; puertas y techo con 2–3 cm | sup54_medidas |

Provisorio también: los diámetros de los caños (supongo 3,2 cm los largueros y arcos, 5 cm los parantes
del parabrisas y los postes de puerta; se miden en 1b.0 contra el ancho que ocupan en la 360) y la forma
exacta de las ventanillas traseras (no se ven desde el asiento: salen de las 360 de afuera, aproximadas).

## 3. Piezas (todas en `blender/cab_cupula.glb`, un solo script `herramientas/cab_cupula.py`)

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
| 1b.0 | Medición (§4): `cupula_puntos.json` + lámina; asimetría resuelta; 360 de afuera refinadas | Iván revisa la lámina de puntos sobre la foto y da el ok |
| 1b.1 | Corte del FSN (§5) + jaula J + parabrisas V1/V2 + faja T4 | 12 vistas sin dientes delante; chequeo de estanqueidad (§7) con el techo provisorio |
| 1b.2 | Techo T1/T2 con las ventanas V4, arcos y largueros | techo cerrado; forro sin sierra en los vanos (lección del 2/11) |
| 1b.3 | Puertas P + ventanas V3 + carenado T3 con ventanillas V5 + solapas S | estanqueidad total; 360 superpuesta de nuevo: iou ≥ 0,8 y mediana ≤ 1 cm en parantes y puertas |
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
4. Diámetro real de los caños si lo sabe (si no, se mide en la foto).
