# Taller de motores · Modo mecánico · Tabla de inspección (BORRADOR)

**Para quien valide en AAXOD.** Borrador escrito con conocimiento general de turbohélices de la familia del PT6, **sin el manual**:
todo es **[AGREGADO]** (no viene del simulador) y **[VERIFICAR]**. Se corrige directamente en esta tabla (tachar, cambiar, sumar);
el modo mecánico del taller no se publica hasta tener esta validación (decisión 3b del `PLAN_TALLER.md`). Los límites, los valores y
los procedimientos quedan siempre para el manual del fabricante y el procedimiento de la empresa: la columna «Queda para el manual»
dice cuáles. Es la misma tabla que usa el juego (`taller/mecanico.js`).

> Material de referencia para entender el funcionamiento. No reemplaza el manual del fabricante, el procedimiento de la empresa ni la instrucción.

| Pieza | Dónde está | Qué se mira | Qué se busca | Queda para el manual |
|---|---|---|---|---|
| **Ignitor** | En la cámara de combustión: son dos, a los costados, de 4 y 8 en punto mirando desde atrás [VERIFICAR]. | La punta de encendido (electrodos y aislante cerámico) · la rosca y el asiento · el conector y el cable. | Desgaste o erosión de los electrodos · fisuras, astillas o carbón en el aislante · rosca dañada, conector flojo o con corrosión. | Los límites de desgaste, el intervalo de inspección y la prueba de chispa. |
| **Inyector de combustible** | Alrededor de la cámara de combustión, en el colector de combustible (catorce en este motor del simulador). | La punta y el orificio de salida · la vaina o protección térmica · las conexiones de entrada y sus sellos. | Carbón acumulado en la punta (coquización) · punta erosionada o dañada; fisuras en la vaina · pérdidas de combustible en las conexiones. | La prueba de caudal y del cono de pulverización en banco, la limpieza y los límites. |
| **Álabe de la turbina del compresor** | En el disco de la turbina del compresor, entre la cámara de combustión y la turbina libre. | El borde de ataque y el de fuga · la punta · la raíz y la plataforma. | Mellas, erosión o fisuras (sobre todo en el borde de fuga y en la raíz) · quemaduras, corrosión en caliente o pérdida del recubrimiento · punta rozada o doblada. | La inspección con boroscopio en el motor, los límites de daño admisible y qué hacer con cada hallazgo. |
| **Sector de la malla de admisión** | Alrededor de la entrada de aire, atrás del motor (la admisión es por atrás: el flujo va al revés). | Toda la superficie de la malla · el marco y su fijación. | Objetos extraños atrapados o restos (pájaros, hielo, suciedad) · alambres cortados, agujeros o deformaciones · fijaciones flojas o faltantes. | El daño admisible de la malla, la limpieza y cuándo se cambia. |
| **Detector de virutas** | Abajo en la caja reductora (puede haber otro en la caja de accesorios) [VERIFICAR]. | La punta magnética · el sello y la traba · el circuito de indicación. | Partículas metálicas en la punta: cuántas y de qué tipo (polvo fino, escamas, virutas) · sello dañado o pérdida de aceite · indicación falsa o falta de continuidad. | Qué hacer según el tipo y la cantidad de partículas (análisis, seguimiento o desmontaje) y la prueba del circuito. |
| **Termocupla de ITT** | En un anillo entre la turbina del compresor y la turbina libre: las sondas atraviesan la carcasa y un arnés las junta. | La punta de cada sonda · la bornera y sus bornes · el arnés y su aislación. | Sondas quemadas, dobladas o con la vaina fisurada · bornes flojos o con corrosión · arnés rozado o con la aislación dañada. | La prueba eléctrica del arnés (resistencia y aislación), la calibración y los valores. |

## Las tareas del módulo 1 (decisión 3a: identificar, ubicar e inspeccionar)
1. **Identificar:** «Señalá el ignitor / la malla de admisión / el detector de virutas / las termocuplas de ITT» con el rayo sobre el holograma.
2. **Ubicar:** llevar cada pieza del banco a su lugar en el holograma (hecho en la PC el 15/11; ver `PLAN_TALLER.md` §9, T8).
3. **Inspeccionar:** tomar cada pieza y repasar esta tabla.

## Preguntas para quien valide
- ¿Las seis piezas son las que conviene para empezar? ¿Falta alguna que se mire seguido en la línea (por ejemplo, el filtro de aceite o el de combustible)?
- ¿Los lugares del ignitor, del detector de virutas y del anillo de termocuplas son los del motor que se usa en AAXOD?
- ¿Hay algo de la columna «Qué se busca» que en la empresa se haga distinto o que no corresponda a un mecánico de línea?
