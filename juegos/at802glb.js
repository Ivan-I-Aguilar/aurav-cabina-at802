// Cargador del AT-802 de AURAV para cualquier juego Three.js / WebXR (copia de referencia, 15/11): COPIARLO al juego junto a
// at802.glb y at802-lod.glb (al lado de three.module.js y GLTFLoader.js del juego); no importarlo desde esta carpeta.
// El avión es el MISMO del simulador de cabina (exterior, cúpula y cabina liviana), exportado por herramientas/avion_juegos.py:
// +x nariz, +y arriba, +z derecha, origen en el piso en el apoyo de las ruedas principales, 3 puntos (7,18°), metros.
// Hélice en helice-eje → helice (gira con helice.rotation.x); anclajes como nodos del GLB (acople-carga, acople-carga-derecho,
// cabina-piloto, ojo-piloto, nariz, rueda-izq/der/cola, puntera-izq/der); medidas en userData.medidas. Ver juegos/LEEME.md.
// Lo usan aurav-senales y aurav-sector (sus copias tienen el ?v= de su GLTFLoader en el import).
// API: crearAT802GLB() → grupo con userData.ponerMotor(bool) / actualizar(dt); prepararAvion(raiz) para el LOD.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';   /* si el juego importa GLTFLoader con ?v=, poner la misma */

export const V_AVION = '20261115a';   // versión de los GLB del avión: subirla cada vez que cambien (el Quest cachea)

// Anclajes del GLB viejo de señaleros y sector (marco del avión, metros): sólo se crean si el GLB no los trae.
const ANCLAJES_VIEJOS = {
  'acople-carga': [-3.52, 0.715, -0.525],
  'acople-carga-derecho': [-3.52, 0.715, 0.525],
  'cabina-piloto': [-1.7, 1.78, 0],
};
const HELICE_VIEJA = { pos: [2.78, 2.16, 0], cabeceo: 0.10 };

// Hélice de código para un GLB sin nodo 'helice': 5 palas negras con puntas blancas.
function crearHelice() {
  const g = new THREE.Group(); g.name = 'helice';
  const negro = new THREE.MeshStandardMaterial({ color: 0x181b1d, roughness: 0.7 }), blanco = new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.6 });
  for (let i = 0; i < 5; i++) {
    const pala = new THREE.Group(); pala.rotation.x = i * Math.PI * 2 / 5;
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.25, 0.2), negro); hoja.position.y = 0.2 + 0.625; hoja.rotation.y = 0.45; pala.add(hoja);
    const punta = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.12, 0.2), blanco); punta.position.y = 1.39; punta.rotation.y = 0.45; pala.add(punta);
    g.add(pala);
  }
  return g;
}

// Materiales del avión nuevo: se respetan los del GLB (los mismos colores del simulador). Los vidrios no escriben
// profundidad y van después de lo opaco (como en la cabina) y no dan sombra; la cabina tampoco (está bajo la cúpula),
// pero la recibe. Sirve también para el LOD (at802-lod.glb).
export function prepararAvion(raiz) {
  const cabina = raiz.getObjectByName('cabina');
  raiz.traverse(o => {
    if (!o.isMesh) return; o.receiveShadow = true;
    let enCabina = false; for (let p = o; p; p = p.parent) if (p === cabina) { enCabina = true; break; }
    if (o.material.transparent) { o.material.depthWrite = false; o.renderOrder = 2; o.castShadow = false; } else o.castShadow = !enCabina;
  });
}
export const esAvionNuevo = raiz => raiz.getObjectByName('at802')?.userData?.origen === 'aurav-cabina-at802';

export async function crearAT802GLB({ url = `./at802.glb?v=${V_AVION}` } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const avion = new THREE.Group(); avion.name = 'AT-802';
  const modelo = gltf.scene; avion.add(modelo);
  const datos = modelo.getObjectByName('at802')?.userData || {};
  const nuevo = esAvionNuevo(modelo);
  if (nuevo) prepararAvion(modelo);
  else modelo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.roughness = 0.42; o.material.metalness = 0.05; o.material.side = THREE.DoubleSide; o.material.envMapIntensity = 0.9; } } });

  let helice = modelo.getObjectByName('helice');
  if (!helice) { helice = crearHelice(); helice.position.set(...HELICE_VIEJA.pos); helice.rotation.z = HELICE_VIEJA.cabeceo; avion.add(helice); }
  for (const [nombre, pos] of Object.entries(ANCLAJES_VIEJOS)) {
    if (modelo.getObjectByName(nombre)) continue;
    const a = new THREE.Object3D(); a.name = nombre; a.position.set(...pos); avion.add(a);
  }
  // disco de hélice en marcha (del radio de las palas)
  const disco = new THREE.Mesh(new THREE.CircleGeometry(datos.radioHelice || 1.45, 40), new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  disco.name = 'disco'; disco.visible = false; disco.renderOrder = 3;
  if (helice) { helice.add(disco); disco.rotation.y = Math.PI / 2; disco.position.set(0.05, 0, 0); }

  avion.userData.motor = false;
  avion.userData.ponerMotor = en => { avion.userData.motor = en; disco.visible = en; };
  avion.userData.actualizar = dt => { if (avion.userData.motor && helice) helice.rotation.x += dt * 40; };
  avion.userData.origen = nuevo ? 'cabina-at802' : 'simulador';
  avion.userData.medidas = datos.medidas || null;
  return avion;
}
