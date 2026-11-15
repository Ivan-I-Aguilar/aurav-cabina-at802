# El AT-802 de AURAV para cualquier juego

Es el **mismo avión del simulador de cabina** (exterior, cúpula y cabina), listo para juegos Three.js / WebXR que corren en el
Quest y en la PC. Ya lo usan *Señaleros de plataforma* (`aurav-senales`) y *Control del sector* (`aurav-sector`). Para que se
vea siempre la misma aeronave, **todo juego nuevo de AURAV con el AT-802 («AT8T») usa estos archivos**, no otro modelo.

## Qué copiar al juego (se copian, no se enlazan a este repo)
| Archivo | Qué es |
|---|---|
| `at802.glb` | El avión completo con cabina liviana: 2,5 MB · 71 k triángulos · 9 llamadas de dibujo. Para el avión que se ve de cerca. |
| `at802-lod.glb` | Versión liviana sin cabina (vidrios oscuros): 0,9 MB · 15 k triángulos · 5 llamadas. Para aviones de fondo o estacionados. |
| `at802glb.js` | El cargador (`crearAT802GLB`, `prepararAvion`). Va junto a `three.module.js` y `GLTFLoader.js` del juego. |

`at802_informe.json` tiene todas las medidas y anclajes; `ver.html` es un visor para mirarlo (servir este repo y abrir
`/juegos/ver.html`).

## Marco y escala
- Metros, tamaño real: envergadura 18,06 m, largo 10,51 m, alto 4,07 m.
- **+x nariz, +y arriba, +z derecha.** Origen en el piso, en el apoyo de las ruedas principales (entre las dos).
- Ya viene en actitud de tres puntos (7,18°): las tres ruedas apoyan en y = 0. Para que mire a otro lado se gira el grupo
  en y (`rotation.y = Math.PI / 2` → la nariz mira a −z).

## Uso
```js
import { crearAT802GLB, prepararAvion, V_AVION } from './at802glb.js?v=20261115a';
const avion = await crearAT802GLB();          // carga ./at802.glb?v=…
escena.add(avion);
avion.userData.ponerMotor(true);              // hélice girando + disco
// en el bucle de animación:
avion.userData.actualizar(dt);

// un avión de fondo, liviano:
const g = await new GLTFLoader().loadAsync(`./at802-lod.glb?v=${V_AVION}`); prepararAvion(g.scene); escena.add(g.scene);
```
- **Hélice:** nodo `helice` (gira con `rotation.x`, ya está alineado con el eje); el disco `disco` aparece con el motor.
- **Anclajes** (nodos vacíos; `avion.getObjectByName(nombre).getWorldPosition(v)`): `acople-carga` y `acople-carga-derecho`
  (boca de la válvula de carga), `cabina-piloto` (asiento), `ojo-piloto` (vista del piloto), `nariz`, `rueda-izq`, `rueda-der`,
  `rueda-cola`, `puntera-izq`, `puntera-der`.
- **Medidas:** `avion.userData.medidas` (nariz, cola, trocha, radio de la hélice, actitud).
- El nodo `cabina` se puede ocultar si no hace falta (9 k triángulos menos).
- Las luces de las sombras de los juegos de AURAV usan `sol.shadow.bias = -0.0005` (con menos, la chapa blanca se raya).

## Reglas
- Siempre con `?v=` en la URL del GLB y del cargador, y subirla cuando cambien: **el Quest cachea**.
- No editar el GLB dentro del juego. Si hace falta otra variante (otra librea, otro nombre de archivo), se regenera en este repo:
  `python -E -P -X utf8 herramientas/avion_juegos.py [--librea azul|bordo] [--nombre at802]` (el LOD lo hace Blender 5.2
  solo) y se vuelve a copiar. La librea elegida por Iván (15/11) es la **azul**, como la cabina.
- Uso interno: el exterior sale de un modelo freeware de simulador (familia FSN); no publicitarlo fuera de lo interno.
- Plan y decisiones: `PLAN_AVION_JUEGOS.md` en la raíz de este repo.
