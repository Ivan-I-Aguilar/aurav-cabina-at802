# Taller de motores · Cómo probarlo en el Quest

Guía para Iván (T10 del `PLAN_TALLER.md`, escrita el 15/11/2026). **Desde el 22/11 el taller está publicado** (v=20261122e): en
el navegador del Quest, `https://ivan-i-aguilar.github.io/aurav-cabina-at802/taller.html`, o desde la cabina: Menú → «Taller de
motores»; después, «Entrar en VR» arriba a la derecha. Es el camino más simple. Lo de abajo (servirlo desde la PC) queda para probar
cambios antes de publicarlos. El modo mecánico sólo se abre desde la PC (`?mecanico=1` en local), no en la página publicada.

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
- **La dinámica nueva (16/11), que es lo que más depende del casco:**
  - *El recorrido del avión:* atril → EMPEZAR EL CURSO → los nueve puntos. ¿Se leen los discos y las tarjetas? ¿Los saltos de
    SIGUIENTE marean? ¿Se llega bien tocando un disco o una marca del piso con el rayo?
  - *El motor dentro del capó:* junto al avión se ve como una radiografía azul. ¿Se entiende dónde va y qué tamaño tiene?
  - *VER EL MOTOR:* la primera impresión a escala real, a 3,2 m. ¿Impacta? ¿Entra entero en la vista? ¿Se ve nítido o empastado?
  - *Girarlo:* de cerca con el grip (una mano lo lleva, dos lo achican o lo agrandan) y de lejos con el rayo + grip (como un plato).
    Los botones TAMAÑO REAL y A LA MESA.
  - *Las piezas en holograma:* las nueve tarjetas tienen la suya. La compuerta trae un botón más, ABRIR LAS HOJAS (¿se le
    acierta con el rayo?, ¿se entiende cómo abren?); la tolva muestra su lomo y, atrás, la escala de la mirilla (¿se llega a leer
    agrandándola con las dos manos?). ¿El tamaño «entre
    las manos» está bien? ¿Se agarran? Al abrirse, la tarjeta se esconde y la pieza trae arriba un rótulo con CERRAR: ¿se le
    acierta con el rayo? ¿El fondo oscuro que lleva detrás ayuda o molesta?
  - *La lección de la hélice (T13, 21/11):* punto 1 → VER CÓMO FUNCIONA. La pieza se abre a la altura de la cintura (1,15 m) y
    su panel queda a la altura de los ojos. ¿Se lee el panel? ¿Se le acierta con el rayo a los cinco botones y a la PALANCA
    HÉLICE (con el gatillo apretado tiene que seguir al rayo)? ¿Se ve que las palas cambian de ángulo? ¿Las estelas del aire se
    entienden o molestan? En PARTES, ¿los tres nombres quedan a la vista, a la derecha de la pieza? El REPASO: tres preguntas
    con el gatillo; al responder, la pieza tiene que mostrar la respuesta.
  - *Las lecciones del ala y de la cola (T14, 22/11):* puntos 7 y 5 → VER CÓMO FUNCIONA. El ala son las DOS alas vistas desde
    atrás (1,5 m de punta a punta, a 95 cm): ¿resulta cómoda de mirar o conviene achicarla? ¿Se ve que los flaps bajan juntos y
    los alerones van opuestos? ¿Se entiende que la pieza se inclina, cabecea o gira como el avión? Cada panel trae DOS palancas
    lado a lado (FLAPS y BASTÓN; BASTÓN y PEDALES), de 34 cm cada pista: ¿se les acierta con el rayo y siguen al gatillo
    apretado? En PARTES, los nombres del ala van debajo de ella (de 0,87 a 1,07 m de alto): ¿se leen mirando hacia abajo?
  - *Las lecciones del tren y de la nariz (T15, 22/11):* puntos 8 y 2 → VER CÓMO FUNCIONA. El tren va de 0,8 a 1,5 m de alto,
    con un piso dibujado debajo: ¿se ve que la rueda gira (lleva tres marcas) y que el piso pasa a su paso? Con la palanca PESO,
    ¿se entiende que la pata cede y la rueda se abre? ¿El piso a 80 cm del suelo queda cómodo de mirar? La nariz trae el camino
    del aire: ¿se distinguen el celeste (el aire) y el naranja (los gases)? ¿Se sigue la vuelta que da el aire en el fondo del
    capó, o hay que girar la pieza para verla? ¿El capó, que va tenue, deja ver los chorros?
  - *Las lecciones de la tolva y de la compuerta (T16, 22/11):* puntos 3 y 6 → VER CÓMO FUNCIONA. La tolva va entera, de
    arriba abajo (de 0,5 a 1,5 m de alto), con el agua dibujada en azul: ¿se lee como agua? ¿Se ve subir y bajar el nivel, y
    que al llenarse deja de entrar y al vaciarse deja de caer? ¿Queda cómoda tan abajo? ¿Se alcanza a ver la escala, en la
    pared de atrás? Las dos palancas (VÁLVULA DE CARGA y COMPUERTA), ¿se aciertan con el rayo? En la compuerta: ¿se nota que
    con más cobertura las hojas abren más y cae más agua? ¿Molestan las cortinas al caer hacia los pies? En PARTES los nombres
    van a la IZQUIERDA de la pieza (a la derecha está el ala): ¿quedan a la vista?
  - *El curso y la lección de la cabina (T17, 22/11):* cada tarjeta dice «LECCIÓN n DE 9» y cómo va (sin empezar · en curso ·
    hecha), y trae el botón MI AVANCE, que también está en el atril: abre una placa con las nueve lecciones a 1,2 m (de 1,2 a
    1,9 m de alto). ¿Se lee su letra? ¿Se le acierta con el rayo a un renglón (te lleva a esa lección) y a CERRAR? Pedida desde
    el atril se acerca a medio metro y se achica: ¿queda cómoda tan cerca? El avance queda guardado en el casco: al volver a
    entrar, el atril tiene que decir SEGUIR EL CURSO. EMPEZAR DE NUEVO lo borra (pide confirmación): es lo que tiene que hacer
    cada alumno si el casco se comparte. La cabina (punto 4 → VER CÓMO FUNCIONA) se ve desde atrás, como el piloto, de 0,7 a
    1,4 m de alto: ¿se distinguen el bastón (va dibujado en grueso, con una bola en la empuñadura) y los pedales? ¿Se nota para
    dónde va el bastón contra la cruz de guía? **La voz del curso todavía no está grabada:** en el casco, las frases de las
    tarjetas y de las lecciones van a ser mudas (las del motor sí suenan).
- **Fluidez:** que no tironee en ningún lugar (frente al motor, mirando la nave entera desde el portón, junto al AT-802). En la PC, la
  peor vista da 61 llamadas y 56 k triángulos, y junto al avión 46 y 128 k (con una lección abierta: hélice 56 y 127 k, ala 50 y 92 k, cola 36 y 83 k, tren 41 y 124 k, nariz 39 y 129 k, tolva 41 y 133 k, compuerta 38 y 124 k, cabina 34 y 133 k; con MI AVANCE abierto, 44 y 124 k; tope del plan: 75 y 200 k); el número que manda es el
  del casco.
- **Mareo:** caminar con el joystick izquierdo, girar de a 30° con el derecho, y los saltos con fundido del atril y de la pausa.
- **Legibilidad:** el atril, los paneles de la mesa (instrumentos, estaciones), el cartel de arriba del holograma, las preguntas, el
  riel del banco, el pizarrón de los créditos y la leyenda.
- **Alcance y agarre:** las tres palancas con el grip (adelante = más), el holograma con una mano (llevarlo y girarlo) y con las dos
  (agrandarlo: llega al doble del tamaño real; ¿tironea cuando está grande y cerca?), y meter la cabeza adentro (tiene que apagarse de a poco).
- **El gatillo con el rayo:** botones de los paneles, ARRANCAR y A RALENTÍ de la mesa, el atril.
- **La pausa:** B o Y abre el menú (Seguir · Motor a ralentí · ir a la mesa, la partida, el AT-802, el Cessna, los bancos · Salir de
  VR); sacarse el casco tiene que pausar solo.
- **La voz:** la frase de cada estación y el aviso de cada falla (el audio arranca con el primer gesto). Las frases del curso
  (tarjetas y lecciones) no están grabadas: en el casco no suenan todavía.
- **Modo mecánico (borrador, sin validar):** sólo con `?mecanico=1`: `http://localhost:8766/taller.html?mecanico=1` → atril → MODO
  MECÁNICO. Agarrar las piezas del banco (son de tamaño real: chicas), llevarlas al holograma, señalar con el rayo.

## 4. Lo que no se pudo probar desde la PC
Todo lo de arriba que dice «grip», «gatillo», «joystick», «B o Y», «sacarse el casco» y la fluidez real: en la PC se probó con los
mandos simulados por código (`__taller.probarMandos()`, 29 pruebas), el piloto de prueba (`__taller.probarPiloto()`, 15) y el
recorrido del avión (`__taller.probarRecorrido()`, 129, con rayos desde el ojo a cada tarjeta y al panel de cada lección) y el
curso (`__taller.probarCurso()`, 9), pero eso no reemplaza ponerse el casco.
