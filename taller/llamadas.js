// Las llamadas a las piezas, en 3D (T3, adelantada dentro del bloque de la T1, 15/11/2026; PLAN_TALLER.md §5): las 2–3 de cada
// estación (content.js: [clave de PARTS, nombre, sub]) como etiquetas de canvas en dos columnas a los costados del holograma, con una
// línea fina hasta su punto en el motor (PARTS de engine.js, en mm; sigue al holograma cuando gira o se agarra) y un punto rojo.
// El estilo es el de console.js: fondo blanco, filete rojo a la izquierda, nombre en negrita y debajo el subtítulo en versalitas.
// Las etiquetas miran siempre al alumno (sólo giran sobre la vertical).
import * as THREE from '../three.module.js';

const ROJO = '#d6182b';
const ANCHO = 0.2;
const ALTO = 0.056;
// columnas a ±0,42 m del centro y 12 cm hacia el alumno: a ±0,5 la columna izquierda tapaba el borde del panel de estaciones (15/11)
const COLUMNA = 0.42;
const ADELANTE = 0.12;

function etiqueta() {
  const W = 640;
  const H = Math.round((W * ALTO) / ANCHO);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, ALTO), new THREE.MeshBasicMaterial({map: tex, transparent: true, toneMapped: false, depthWrite: false}));
  malla.renderOrder = 8;
  let texto = '';
  return {
    malla,
    poner(nombre, sub) {
      if (texto === nombre + sub) return;
      texto = nombre + sub;
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath();
      g.roundRect(0, 0, W, H, 10);
      g.fill();
      g.fillStyle = ROJO;
      g.fillRect(0, 0, 10, H);
      g.fillStyle = '#16181b';
      g.textBaseline = 'alphabetic';
      g.font = 'bold 62px Arial, Helvetica, sans-serif';
      g.fillText(nombre, 30, 74, W - 50);
      g.fillStyle = '#80858c';
      g.font = 'bold 34px Arial, Helvetica, sans-serif';
      g.fillText(sub.toUpperCase(), 30, 136, W - 50);
      tex.needsUpdate = true;
    },
  };
}

/** escena: donde van; parts: PARTS de engine.js (mm, marco del motor); centro: el centro del holograma en la mesa */
export function crearLlamadas({escena, parts, centro}) {
  const grupo = new THREE.Group();
  grupo.name = 'llamadas';
  escena.add(grupo);
  const etiquetas = [0, 1, 2].map(() => {
    const e = etiqueta();
    grupo.add(e.malla);
    return e;
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const lineas = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color: 0x16181b, transparent: true, depthTest: false}));
  lineas.renderOrder = 9;
  lineas.frustumCulled = false;
  grupo.add(lineas);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const puntos = new THREE.Points(pg, new THREE.PointsMaterial({color: ROJO, size: 0.012, sizeAttenuation: true, depthTest: false, transparent: true}));
  puntos.renderOrder = 9;
  puntos.frustumCulled = false;
  grupo.add(puntos);
  const v = new THREE.Vector3();
  const cam = new THREE.Vector3();
  grupo.visible = false;
  return {
    grupo,
    /** estacion: la de content.js (o null); opacidad 0..1; raiz: la raíz del motor (eng.root); camara: para orientar las etiquetas;
     *  c y k (T11): el centro del holograma y cuánto se agrandan las etiquetas y sus columnas (1 en la mesa; 1/0,35 a tamaño real) */
    actualizar(estacion, opacidad, raiz, camara, c = centro, k = 1) {
      grupo.visible = !!(estacion && opacidad > 0.02);
      if (!grupo.visible) return;
      raiz.updateWorldMatrix(true, false);
      camara.getWorldPosition(cam);
      const items = estacion.calls.slice(0, 3).map(([clave, nombre, sub]) => ({nombre, sub, punto: raiz.localToWorld(v.set(...parts[clave])).clone()}));
      // dos columnas a los costados del holograma, cada una ordenada por altura, sin pisarse
      const cols = {izq: [], der: []};
      for (const it of items) (it.punto.x < c.x ? cols.izq : cols.der).push(it);
      puntos.material.size = 0.012 * k;
      const L = lg.attributes.position.array;
      const P = pg.attributes.position.array;
      let n = 0;
      for (const [lado, col] of Object.entries(cols)) {
        col.sort((a, b) => b.punto.y - a.punto.y);
        let y = c.y + 0.2 * k;
        for (const it of col) {
          y = Math.min(y, Math.max(c.y - 0.16 * k, it.punto.y + 0.05 * k));
          const x = c.x + (lado === 'izq' ? -COLUMNA : COLUMNA) * k;
          const z = c.z + ADELANTE * k;
          const e = etiquetas[n];
          e.poner(it.nombre, it.sub);
          e.malla.position.set(x, y, z);
          e.malla.scale.setScalar(k);
          e.malla.rotation.set(0, Math.atan2(cam.x - x, cam.z - z), 0);
          e.malla.material.opacity = opacidad;
          e.malla.visible = true;
          const borde = x + ((lado === 'izq' ? ANCHO : -ANCHO) / 2) * k;
          L.set([borde, y - (ALTO / 2 - 0.006) * k, z, it.punto.x, it.punto.y, it.punto.z], n * 6);
          P.set([it.punto.x, it.punto.y, it.punto.z], n * 3);
          y -= (ALTO + 0.018) * k;
          n++;
        }
      }
      for (let i = n; i < 3; i++) {
        etiquetas[i].malla.visible = false;
        L.fill(0, i * 6, i * 6 + 6);
        P.fill(0, i * 3, i * 3 + 3);
      }
      lg.attributes.position.needsUpdate = true;
      pg.attributes.position.needsUpdate = true;
      lg.setDrawRange(0, n * 2);
      pg.setDrawRange(0, n);
      lineas.material.opacity = 0.8 * opacidad;
      puntos.material.opacity = opacidad;
    },
  };
}
