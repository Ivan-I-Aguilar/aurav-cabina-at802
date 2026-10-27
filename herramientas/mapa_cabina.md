# Mapa de cabina del AT-802 (del Pilot Training Course de Air Tractor, rev. 2017)

Notas propias del manual (`Desktop/AURAV/AT-802-802A_Pilot_Training_Course.pdf`, 77 págs.) para darle
función real a cada control del juego. El manual NO va al repo.

## Palancas del cuadrante (lado izquierdo)
| Nuestra | Real | Posiciones / función |
|---|---|---|
| `levPOT` (blanca) | **Power** | Adelante = potencia. Reversa: apretar el **seguro del pulgar** y tirar atrás del tope de ralentí (enciende **luz BETA**). No moverla a reversa con motor parado (rompe el varillaje). |
| `levHEL` (azul) | **Prop** | Adelante = RPM alta (1700). Atrás del todo = **bandera** (F). Crucero 1425–1550. |
| `levCOND` (gris) | **Start / Condition** | **CONFIRMADO 3 posiciones**: atrás = corte de combustible (C) · medio = ralentí de tierra (GROUND, 56–58 % Ng) · adelante = vuelo (FLIGHT, 68–70 % Ng; también para rodar, así la hélice no queda en arco amarillo). |
| Perilla de fricción | Friction knob | Ajusta la dureza de las palancas (crucero). |

## Combustible
- **Válvula de combustible** (`swFUEL`): **SOLO 2 posiciones: MAIN y OFF** (no se puede elegir tanque;
  los dos alimentan un colector común). Está delante del cuadrante. → corregir las 3 posiciones actuales.
- **Bomba eléctrica (boost)** (`swFPUMP`): ON antes del arranque hasta ver ≥ 5 psi, después OFF;
  queda de respaldo de la bomba mecánica. (La ficha de 3 posiciones nuestra puede quedar ON·OFF·AUTO
  si Bruno lo usa así, pero el manual la trata como ON/OFF.)
- 2 tanques de ala de 127 gal (254 total, 250 usables); medio tanque NO es media aguja.
- Luz de aviso **FUEL FILTER** (filtro del cortafuegos tapado).

## Eléctrico (panel inferior)
- **Master/Battery**: LLAVE que gira 90° a la derecha (3 baterías de 24 V). (`sw62` BATT)
- **Start** (`sw47`): momentáneo, vuelve solo a OFF ✓ (sostener hasta 56 % Ng en arranque real).
- **Ignitor** (`sw53`): **3 POSICIONES**: arriba = ON (enciende sólo con el start activado) ·
  centro = OFF · abajo = CONTINUO (turbulencia fuerte, riesgo de apagado). → pasarlo a `SW3`.
- **Generator** (`sw56`): ON tras el arranque (se apaga la luz GEN OUT).
- **Prop Overspeed Test**: switch con guarda; prueba el gobernador de sobrevelocidad (Np 1550 ± 60).
  → candidato para `swAUX` o pieza nueva.
- **Voltímetro** en el panel inferior; luz de **bajo voltaje** en el superior. Mín. 24 V para arranque.
- Breakers a ambos lados del panel inferior.

## FRDS (panel izquierdo) — confirma lo que armamos
- Toggles fijos: **ARMED** (arriba = armado, luz verde) · **MODE** (normalmente AUTO) · **HYD POWER**.
- Momentáneos (con resorte): **FOAM** · **LAMP TEST** · **GATE** (apertura/cierre manual de compuertas).
- Luces: **LOW PRES** (apagada = ok) · **GATE CLOSED** (verde) · **ARMED** (verde).
- Perilla giratoria izquierda: girar = cambia el valor; **apretar = cicla el cursor** entre
  Coverage Level y Gallons to Dump (el resto de la pantalla es indicación).
- El disparo es el **gatillo del bastón** ✓ (como ya lo tenemos).
- Hidráulico 3000 psi; recarga ~18 s tras una descarga; 2 descargas por acumulador lleno.
- **E-DUMP** (emergencia, neumático ≥ 50–60 psi): manija con **botón rojo**; apretar y empujar
  ADELANTE = salvo total; rearmar atrás + cerrar compuertas con el toggle GATE.
  → la manija roja que sacamos (`levDUMP`) ERA esto: restituirla como manija E-DUMP sobre la consola izquierda.

## Otros controles (lado izquierdo / piso)
- **Traba de rueda de cola**: palanca IZQUIERDA: adelante = trabada (despegue/aterrizaje/rodaje recto),
  atrás = libre (giros cerrados). → nuestro `swWRUD` («water rudder» del Fire Boss) pasa a ser esta traba.
- **Freno de estacionamiento**: pisar pedales + tirar palanca; se suelta pisando de nuevo.
- **Flaps** (`swFLAPS`): toggle detrás del cuadrante; recorrido continuo 0–30°; marcas cada 10° sobre
  el flap izquierdo. Despegue cargado = 10°; go-around = 20°.
- **Trim**: rueda de elevador y rueda de trim de timón a la izquierda (`swK_TRIMTIMON` ✓, banda verde);
  trim de alerón eléctrico.
- **Limpiaparabrisas** (`swWIPER`): con **reóstato de velocidad variable** en el panel inferior izq.; Vww 144 kt.
- **Aire acondicionado**: master 3 pos (BLOWER ONLY · OFF · AIR COND) + blower 3 pos (HIGH·MED·LOW).
- **Calefacción**: cable al costado izquierdo del asiento. **Aire alternativo del motor**: manija T en el
  piso a la derecha. **Aire fresco**: palanca pared trasera derecha.
- **Matafuegos**: en el piso a la derecha del asiento ✓ (lo del juego va bien ahí).

## Instrumentos que DEBERÍA tener la cabina
Ya tenemos: ASI (mph) · altímetro · horizonte (digital en el real) · torque · ITT · Np · Ng · fuel flow ·
2 de combustible · presión/temp de aceite · voltímetro · hyd · suction · reloj.
**Faltan (pendientes):**
- **Brújula** (whiskey) sobre el panel inferior, frente a la ventanilla de la tolva.
- **Luz BETA** (reversa activada) — importante para la lógica del power lever.
- **Panel anunciador** (upper panel): LOW VOLTAGE · FUEL FILTER · AIR FILTER · GEN OUT; con **push-to-test**.
- Manómetro de **E-Dump** (neumático) abajo a la izquierda, junto al acelerador.
- (Opcional) turn & bank eléctrico; MVP-50 digital si quisiéramos modernizar.

## Datos útiles para vuelo.js / misión
- Arranque real: boost ON (5 psi) → start sostenido → ignición a 12 % Ng → condition a GROUND a 18 % Ng →
  soltar start ≥ 56 % Ng → generador ON → condition a FLIGHT. ITT máx. de arranque 1000 °C.
- Despegue: 1500 lb-ft y 1700 RPM contra frenos, potencia progresiva. Rotación suave, tren adelante.
- Trepada: 122 mph a 12.500 lb / 135 mph a 16.000 lb; Np 1550 en trepada, 1425 crucero.
- Aproximación: full flap 107 mph (12.500 lb) / 121 mph (16.000 lb); viento cruzado máx. demostrado 20 kt.
- Apagado: 1 min estabilizado en ralentí antes del corte; bandera primero, corte después; trabar bastón.
