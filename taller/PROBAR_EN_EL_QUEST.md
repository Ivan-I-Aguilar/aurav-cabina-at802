# Taller de motores · Cómo probarlo en el Quest (sin publicar)

Guía para Iván (T10 del `PLAN_TALLER.md`, escrita el 15/11/2026). El taller **no está publicado**: se prueba desde la PC.

## 1. Servirlo desde la PC
En la carpeta del repo:

```bash
python servidor.py 8766
```

En la PC se abre `http://localhost:8766/taller.html` (arranca en la partida; `?inicio=mesa` arranca en la mesa).

## 2. Abrirlo en el Quest por el cable (sin publicar) [a probar]
WebXR sólo anda en una página «segura»: `localhost` cuenta como segura, una IP de la red de la casa no. Por eso se usa el cable USB
y `adb reverse`, que hace que el `localhost` del Quest sea el de la PC:

1. El Quest en **modo desarrollador** (app Meta Horizon en el celular → el casco → Modo desarrollador).
2. En la PC, las **platform-tools de Android** (traen `adb`). Con el cable conectado, aceptar en el casco «Permitir depuración USB».
3. En la PC:

```bash
adb reverse tcp:8766 tcp:8766
```

4. En el navegador del Quest: `http://localhost:8766/taller.html` → botón **Entrar en VR**.

Si no anda, la otra vía es publicarlo (sólo con tu ok): queda en GitHub Pages, como la cabina.

## 3. Qué mirar en el casco
- **Fluidez:** que no tironee en ningún lugar (en la mesa, mirando la nave entera desde el portón, junto al AT-802). En la PC, la peor
  vista da 68 llamadas y 73 k triángulos (tope del plan: 75 y 200 k); el número que manda es el del casco.
- **Mareo:** caminar con el joystick izquierdo, girar de a 30° con el derecho, y los saltos con fundido del atril y de la pausa.
- **Legibilidad:** el atril, los paneles de la mesa (instrumentos, estaciones), el cartel de arriba del holograma, las preguntas, el
  riel del banco, el pizarrón de los créditos y la leyenda.
- **Alcance y agarre:** las tres palancas con el grip (adelante = más), el holograma con una mano (llevarlo y girarlo) y con las dos
  (agrandarlo hasta tamaño real), y meter la cabeza adentro (tiene que apagarse de a poco).
- **El gatillo con el rayo:** botones de los paneles, ARRANCAR y A RALENTÍ de la mesa, el atril.
- **La pausa:** B o Y abre el menú (Seguir · Motor a ralentí · ir a la mesa, la partida, el AT-802, el Cessna, los bancos · Salir de
  VR); sacarse el casco tiene que pausar solo.
- **La voz:** la frase de cada estación y el aviso de cada falla (el audio arranca con el primer gesto).
- **Modo mecánico (borrador, sin validar):** sólo con `?mecanico=1`: `http://localhost:8766/taller.html?mecanico=1` → atril → MODO
  MECÁNICO. Agarrar las piezas del banco (son de tamaño real: chicas), llevarlas al holograma, señalar con el rayo.

## 4. Lo que no se pudo probar desde la PC
Todo lo de arriba que dice «grip», «gatillo», «joystick», «B o Y», «sacarse el casco» y la fluidez real: en la PC se probó con los
mandos simulados por código (`__taller.probarMandos()`, 24 pruebas) y el piloto de prueba (`__taller.probarPiloto()`, 15), pero eso
no reemplaza ponerse el casco.
