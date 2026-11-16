# Taller de motores · Cómo probarlo en el Quest (sin publicar)

Guía para Iván (T10 del `PLAN_TALLER.md`, escrita el 15/11/2026). El taller **no está publicado**: se prueba desde la PC.

## 1. Servirlo desde la PC
En la carpeta del repo:

```bash
python servidor.py 8766
```

En la PC se abre `http://localhost:8766/taller.html` (arranca en la partida; `?inicio=mesa` arranca en la mesa).

## 2. Abrirlo en el Quest sin publicar: dos caminos [ninguno probado todavía]
WebXR sólo anda en una página «segura»: `localhost` cuenta como segura, una IP de la red de la casa no. Hay dos formas de
arreglarlo sin publicar. La primera vez conviene probar la A, que no pide instalar nada.

### A. Sin cable, por el Wi-Fi (un ajuste en el navegador del Quest)
1. La PC y el Quest en el **mismo Wi-Fi**. El servidor del paso 1 corriendo.
2. La dirección de la PC en la red: en la PC, `ipconfig` → «Dirección IPv4» del Wi-Fi (el 16/11 era `192.168.1.21`; puede cambiar).
3. En el **navegador del Quest**, escribir en la barra `chrome://flags`, buscar **insecure origins** y, en «Insecure origins treated
   as secure», escribir `http://192.168.1.21:8766` (con la dirección del paso 2), elegir **Enabled** y tocar **Relaunch**.
4. Abrir `http://192.168.1.21:8766/taller.html` → botón **Entrar en VR**.
- Si la página no carga: la primera vez Windows pregunta si deja pasar a Python por el firewall; hay que decir que sí para redes
  privadas (eso lo decide Iván, no Claude).
- Si la página carga pero no aparece «Entrar en VR», el ajuste del paso 3 no quedó puesto (revisar que la dirección sea la misma).

### B. Por el cable, con `adb reverse` (el `localhost` del Quest pasa a ser el de la PC)
Pide tres cosas la primera vez; después es un solo comando.
1. **Modo desarrollador en el Quest** (lo hace Iván, una sola vez): hace falta una cuenta de desarrollador de Meta, que es gratis
   (en developers.meta.com se crea una «organización»; puede pedir verificar la cuenta). Después, en la app **Meta Horizon** del
   celular: el casco → Configuración del casco → **Modo desarrollador** → activar, y reiniciar el casco. [Los nombres del menú
   cambian según la versión de la app.]
2. **`adb` en la PC** (una sola vez): viene en las «platform-tools» de Android, de Google. El 16/11 no estaba instalado; Claude lo
   puede bajar si Iván le da permiso.
3. **El cable USB** (que sea de datos) entre el Quest y la PC; adentro del casco aparece «¿Permitir depuración por USB?»: aceptar
   (conviene tildar «Permitir siempre desde esta computadora»).
4. En la PC (hay que repetirlo cada vez que se vuelve a enchufar el cable):

```bash
adb reverse tcp:8766 tcp:8766
```

5. En el navegador del Quest: `http://localhost:8766/taller.html` → botón **Entrar en VR**.

Si ninguno de los dos anda, la otra vía es publicarlo (sólo con tu ok): queda en GitHub Pages, como la cabina.

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
