// El PANEL DE LA LECCIÓN de una pieza (T13, 21/11/2026; PLAN_TALLER.md §16): lo que convierte la pieza en holograma en una lección
// «como el motor». Es el rótulo de la pieza (su nombre y CERRAR) con dos caras:
//  - FUNCIONAMIENTO: un botón por cada cosa que la pieza hace (los «estados» de lecciones.js), la frase del estado elegido, con
//    qué se maneja de verdad, las PALANCAS de la lección (una o dos mandos continuos: la pieza va a cualquier punto entre dos
//    estados), y abajo cómo se mueve la pieza y el botón REPASO;
//  - REPASO: las preguntas de la lección, de a una, con tres opciones; al final, el puntaje.
// Y los RÓTULOS DE LAS PARTES: hasta cinco nombres al costado de la pieza, cada uno con su línea al punto que señala (el mismo
// aspecto que las llamadas del motor).
import * as THREE from '../three.module.js';
import {crearPanel, pieLeyenda} from './paneles.js?v=20261122b';

const AZUL = '#082440';
const LIMA = '#c8e63a';
const ROJO = '#d6182b';
const VERDE = '#2f9e5b';

function envolver(g, t, ancho) {
  const lineas = [];
  let l = '';
  for (const p of String(t).split(' ')) {
    const prueba = l ? `${l} ${p}` : p;
    if (g.measureText(prueba).width > ancho && l) {
      lineas.push(l);
      l = p;
    } else l = prueba;
  }
  if (l) lineas.push(l);
  return lineas;
}

/** el repaso de una lección: las preguntas de a una; las opciones se mezclan siempre igual (la correcta es la primera del contenido) */
export function crearRepaso(preguntas) {
  const orden = preguntas.map((_, i) => [0, 1, 2].map((j) => (j + i * 2 + 1) % 3)); // en qué lugar va cada opción
  const e = {i: 0, puntaje: 0, elegida: null, fin: false, total: preguntas.length};
  return {
    estado: e,
    /** la pregunta actual, como está en el contenido ({q, a, muestra}) */
    actual() {
      return preguntas[e.i];
    },
    /** las tres opciones de la pregunta actual, en el orden en que se muestran: [{texto, correcta}] */
    opciones() {
      const p = preguntas[e.i];
      return orden[e.i].map((k) => ({texto: p.a[k], correcta: k === 0}));
    },
    /** elige la opción j (la que se muestra en el lugar j); sólo cuenta la primera vez. Devuelve si se tomó */
    elegir(j) {
      if (e.fin || e.elegida !== null || !(j >= 0 && j < 3)) return false;
      e.elegida = j;
      if (this.opciones()[j].correcta) e.puntaje++;
      return true;
    },
    siguiente() {
      if (e.elegida === null) return;
      e.elegida = null;
      if (e.i + 1 >= preguntas.length) e.fin = true;
      else e.i++;
    },
  };
}

/**
 * el panel: un crearPanel con pintar({titulo, nota, ayuda, leccion, estado, hover, repaso, vistos, mejor, palancas}); vistos = los
 * estados que el alumno ya puso (llevan una tilde), mejor = su mejor puntaje en el repaso (o null) y palancas = {id: {u, activa}} =
 * dónde está la perilla de cada palanca de la lección. «alto» es el de lo que cambia; con «leyenda» (la leyenda fija del taller)
 * se le suma abajo una franja con ella: mientras la pieza está abierta la tarjeta de su punto, que es la que la lleva, está
 * escondida, y en el casco la leyenda tiene que seguir a la vista
 */
export function crearPanelLeccion({ancho = 0.76, alto = 0.34, leyenda = ''} = {}) {
  const PX = 1216;
  const PIE = leyenda ? 86 : 0; // px de la franja de la leyenda
  const altoTotal = alto + (PIE * ancho) / PX;
  const p = crearPanel({ancho, alto: altoTotal, px: PX, nombre: 'rotulo-leccion', transparente: true});
  const {g, W} = p;
  const H = p.H - PIE; // el alto de lo que cambia
  const M = 30;
  const boton = (id, x, y, w, h, texto, {lleno = false, sobre = false, color = LIMA, tam = 30, alinear = 'center'} = {}) => {
    p.botones.push({id, x, y, w, h});
    g.beginPath();
    g.roundRect(x, y, w, h, 14);
    g.fillStyle = lleno ? (sobre && color === LIMA ? '#e4f77a' : sobre && color === ROJO ? '#b81426' : color) : sobre ? '#17467a' : '#0f335a';
    g.fill();
    if (!lleno) {
      g.lineWidth = 3;
      g.strokeStyle = color;
      g.stroke();
    }
    g.fillStyle = lleno ? (color === LIMA ? AZUL : '#ffffff') : color === LIMA ? LIMA : '#ffffff';
    g.font = `bold ${tam}px Arial`;
    g.textBaseline = 'middle';
    g.textAlign = alinear;
    g.fillText(texto, alinear === 'center' ? x + w / 2 : x + 22, y + h / 2 + 2, w - 28);
  };
  // Las PALANCAS de la lección (una o dos): cada una, una pista con su perilla, que el alumno toca o arrastra (el botón
  // 'lec_p_<id>': el lugar donde cae el rayo dice a dónde va). Arriba, los estados que recorre y sus marcas; en rojo, la zona de
  // la traba; abajo, cómo se llaman sus extremos. Con una sola, su nombre va a la izquierda de la pista; con dos, van lado a lado
  // y el nombre de cada una va abajo, entre los de sus extremos
  const dibujarPalanca = (leccion, pl, {u, activa}, sobre, x0, x1, sola) => {
    const y = 380;
    const largo = x1 - x0;
    const yt = y + 30; // la pista
    const ht = 30;
    p.botones.push({id: `lec_p_${pl.id}`, x: x0, y: y + 4, w: largo, h: 76});
    g.textBaseline = 'middle';
    if (sola) {
      g.textAlign = 'left';
      g.fillStyle = LIMA;
      g.font = 'bold 25px Arial';
      g.fillText(pl.rotulo, M, yt + 2, 250);
      g.fillStyle = '#8fa3b8';
      g.font = 'bold 20px Arial';
      g.fillText('TOCALA O ARRASTRALA', M, yt + 34, 250);
    }
    g.beginPath();
    g.roundRect(x0, yt, largo, ht, 15);
    g.fillStyle = sobre ? '#17467a' : '#0f335a';
    g.fill();
    if (pl.traba) {
      g.save();
      g.beginPath();
      g.roundRect(x0, yt, largo, ht, 15);
      g.clip();
      g.fillStyle = 'rgba(214,24,43,0.62)';
      g.fillRect(x0, yt, pl.traba * largo, ht);
      g.restore();
    }
    g.lineWidth = 3;
    g.strokeStyle = LIMA;
    g.beginPath();
    g.roundRect(x0, yt, largo, ht, 15);
    g.stroke();
    g.font = 'bold 20px Arial';
    g.fillStyle = '#9fe3ff';
    const ultimo = pl.puntos.length - 1;
    pl.puntos.forEach(([up, id, corto], i) => {
      const e = leccion.estados.find((x) => x.id === id);
      const x = x0 + up * largo;
      g.textAlign = i === 0 ? 'left' : i === ultimo ? 'right' : 'center';
      g.fillText(corto || (e && e.boton) || id, i === 0 ? x0 + 4 : i === ultimo ? x1 - 4 : x, y + 14);
      if (i > 0 && i < ultimo) g.fillRect(x - 1.5, yt - 5, 3, ht + 10);
    });
    g.textAlign = 'center';
    for (const [um, rot] of pl.marcas || []) {
      const x = x0 + um * largo;
      g.fillText(rot, x, y + 14);
      g.fillRect(x - 1, yt - 4, 2, ht + 8);
    }
    g.fillStyle = '#8fa3b8';
    g.font = 'bold 19px Arial';
    g.textAlign = 'left';
    g.fillText(`← ${pl.atras}`, x0 + 4, yt + ht + 17);
    g.textAlign = 'right';
    g.fillText(`${pl.adelante} →`, x1 - 4, yt + ht + 17);
    if (!sola) {
      g.textAlign = 'center';
      g.fillStyle = LIMA;
      g.font = 'bold 22px Arial';
      g.fillText(pl.rotulo, (x0 + x1) / 2, yt + ht + 17);
    }
    const xk = x0 + Math.min(1, Math.max(0, u)) * largo;
    g.beginPath();
    g.roundRect(xk - 15, yt - 12, 30, ht + 24, 10);
    g.fillStyle = activa ? LIMA : AZUL; // hueca cuando el estado de la pieza no es de la palanca (las partes, la reversa)
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = activa ? '#ffffff' : '#8fa3b8';
    g.stroke();
  };
  return {
    ...p,
    ancho,
    alto: altoTotal,
    pintar({titulo, nota = '', ayuda = '', leccion, estado, hover = null, repaso = null, vistos = null, mejor = null, palancas = {}}) {
      p.botones.length = 0;
      g.clearRect(0, 0, W, p.H);
      g.save();
      g.beginPath();
      g.roundRect(0, 0, W, p.H, 28);
      g.clip(); // la franja de la leyenda, con las esquinas redondeadas de la placa
      g.fillStyle = AZUL;
      g.fillRect(0, 0, W, p.H);
      if (PIE) pieLeyenda(g, W, H, PIE, leyenda, 24);
      g.restore();
      // arriba: el nombre de la pieza, lo que tiene de provisorio y CERRAR
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillStyle = LIMA;
      g.font = 'bold 46px Arial';
      g.fillText(titulo.toUpperCase(), M, 50, W - 2 * M - 260);
      g.fillStyle = '#8fa3b8';
      g.font = 'bold 24px Arial';
      g.fillText(nota ? nota.toUpperCase() : 'MATERIAL DE REFERENCIA · A VERIFICAR', M, 100, W - 2 * M - 260);
      boton('pieza_cerrar', W - 236 - 20, 20, 236, 100, 'CERRAR', {lleno: true, color: ROJO, sobre: hover === 'pieza_cerrar', tam: 40});
      if (!repaso) {
        // FUNCIONAMIENTO: un botón por cada estado que lo lleva, la frase del elegido, el mando de verdad y las palancas
        const conBoton = leccion.estados.filter((e) => e.boton);
        const n = conBoton.length;
        const bw = (W - 2 * M - (n - 1) * 12) / n;
        conBoton.forEach((e, i) => {
          const x = M + i * (bw + 12);
          boton(`lec_e_${e.id}`, x, 142, bw, 92, e.boton, {lleno: e.id === estado, sobre: hover === `lec_e_${e.id}`, tam: 29});
          if (vistos && vistos.has(e.id)) {
            // una tilde chica en la esquina: ese estado ya lo puso el alumno (lo que le falta ver queda a la vista)
            g.fillStyle = e.id === estado ? AZUL : LIMA;
            g.font = 'bold 24px Arial';
            g.textAlign = 'right';
            g.textBaseline = 'top';
            g.fillText('✓', x + bw - 9, 148);
          }
        });
        const e = leccion.estados.find((x) => x.id === estado) || conBoton[0];
        const pls = (leccion.palancas || []).slice(0, 2);
        const pl = pls.length > 0; // con palanca: dos renglones para la frase y uno para el mando; sin ella, tres y dos
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.fillStyle = '#ffffff';
        g.font = '31px Arial';
        envolver(g, e.texto, W - 2 * M)
          .slice(0, pl ? 2 : 3)
          .forEach((l, k) => g.fillText(l, M, (pl ? 272 : 276) + k * (pl ? 38 : 40)));
        g.fillStyle = '#9fe3ff';
        g.font = '25px Arial';
        if (pl) g.fillText(leccion.mando, M, 350, W - 2 * M);
        else
          envolver(g, leccion.mando, W - 2 * M)
            .slice(0, 2)
            .forEach((l, k) => g.fillText(l, M, 406 + k * 31));
        if (pls.length === 1) dibujarPalanca(leccion, pls[0], palancas[pls[0].id] || {u: 1, activa: false}, hover === `lec_p_${pls[0].id}`, M + 262, W - M - 16, true);
        else if (pls.length === 2) {
          const hueco = 48;
          const cada = (W - 2 * M - 16 - hueco) / 2;
          pls.forEach((q, i) => dibujarPalanca(leccion, q, palancas[q.id] || {u: 0.5, activa: false}, hover === `lec_p_${q.id}`, M + 8 + i * (cada + hueco), M + 8 + i * (cada + hueco) + cada, false));
        }
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.fillStyle = '#8fa3b8';
        g.font = 'bold 24px Arial';
        g.fillText(ayuda, M, H - 37, W - 2 * M - 290);
        const total = leccion.preguntas.length;
        boton('lec_repaso', W - M - 250, H - 68, 250, 56, mejor === null ? `REPASO (${total})` : `REPASO · ${mejor} DE ${total}`, {sobre: hover === 'lec_repaso', tam: 27});
      } else if (!repaso.estado.fin) {
        // REPASO: una pregunta y sus tres opciones
        const r = repaso.estado;
        g.textAlign = 'left';
        g.fillStyle = LIMA;
        g.font = 'bold 26px Arial';
        g.fillText(`REPASO · PREGUNTA ${r.i + 1} DE ${r.total}`, M, 158);
        g.fillStyle = '#ffffff';
        g.font = 'bold 32px Arial';
        envolver(g, repaso.actual().q, W - 2 * M)
          .slice(0, 2)
          .forEach((l, k) => g.fillText(l, M, 200 + k * 40));
        repaso.opciones().forEach((o, j) => {
          const elegida = r.elegida !== null;
          const color = elegida && o.correcta ? VERDE : elegida && r.elegida === j ? ROJO : LIMA;
          // respondida, las opciones dejan de ser botones (sólo se pintan)
          const antes = p.botones.length;
          boton(`lec_r_${j}`, M, 268 + j * 68, W - 2 * M, 58, o.texto, {lleno: elegida && (o.correcta || r.elegida === j), color, sobre: !elegida && hover === `lec_r_${j}`, tam: 28, alinear: 'left'});
          if (elegida) p.botones.length = antes;
        });
        if (r.elegida !== null) {
          const bien = repaso.opciones()[r.elegida].correcta;
          g.textAlign = 'left';
          g.fillStyle = bien ? '#7fe0a3' : '#ff9aa5';
          g.font = 'bold 28px Arial';
          g.fillText(bien ? '✓ Correcto. Mirá la pieza.' : '✗ La correcta está en verde. Mirá la pieza.', M, H - 40, W - 2 * M - 290);
          boton('lec_sig', W - M - 250, H - 68, 250, 56, r.i + 1 >= r.total ? 'VER EL RESULTADO' : 'SIGUIENTE →', {lleno: true, sobre: hover === 'lec_sig', tam: 27});
        } else {
          g.fillStyle = '#8fa3b8';
          g.font = 'bold 24px Arial';
          g.textAlign = 'left';
          g.fillText('Elegí una: después la pieza te lo muestra.', M, H - 37);
          boton('lec_volver', W - M - 250, H - 68, 250, 56, 'SALIR DEL REPASO', {sobre: hover === 'lec_volver', tam: 25});
        }
      } else {
        // el resultado del repaso
        const r = repaso.estado;
        g.textAlign = 'center';
        g.fillStyle = '#ffffff';
        g.font = 'bold 34px Arial';
        g.fillText('REPASO', W / 2, 180);
        g.fillStyle = r.puntaje === r.total ? '#7fe0a3' : LIMA;
        g.font = 'bold 110px Arial';
        g.fillText(`${r.puntaje} de ${r.total}`, W / 2, 285);
        g.fillStyle = '#9fe3ff';
        g.font = '28px Arial';
        g.fillText(r.puntaje === r.total ? 'Todas bien.' : 'Volvé a mover la pieza y probá de nuevo.', W / 2, 385);
        boton('lec_volver', W / 2 - 300, H - 96, 290, 64, 'VOLVER A LA PIEZA', {lleno: true, sobre: hover === 'lec_volver', tam: 27});
        boton('lec_repaso', W / 2 + 10, H - 96, 290, 64, 'OTRA VEZ', {sobre: hover === 'lec_repaso', tam: 27});
      }
      p.pintado();
    },
  };
}

/**
 * Los rótulos de las partes: hasta «max», en una columna a la derecha de la pieza (vista desde el alumno), cada uno con su línea
 * y su punto. La columna se ubica con la recta que va del ojo a la pieza (no con la cabeza: en el casco no tiene que moverse
 * cuando el alumno mira para otro lado).
 */
export function crearRotulosPartes({escena, max = 5, ancho = 0.24, alto = 0.07} = {}) {
  const grupo = new THREE.Group();
  grupo.name = 'rotulos-partes';
  grupo.visible = false;
  escena.add(grupo);
  const etiquetas = [];
  for (let i = 0; i < max; i++) {
    const cv = document.createElement('canvas');
    cv.width = 640;
    cv.height = Math.round((640 * alto) / ancho);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const malla = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({map: tex, transparent: true, toneMapped: false, depthWrite: false}));
    malla.name = `rotulo-parte-${i}`;
    malla.renderOrder = 9;
    grupo.add(malla);
    etiquetas.push({malla, cv, tex, texto: ''});
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 6), 3).setUsage(THREE.DynamicDrawUsage));
  const lineas = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false}));
  lineas.renderOrder = 9;
  lineas.frustumCulled = false;
  grupo.add(lineas);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const puntos = new THREE.Points(pg, new THREE.PointsMaterial({color: ROJO, size: 0.018, sizeAttenuation: true, depthTest: false, transparent: true}));
  puntos.renderOrder = 10;
  puntos.frustumCulled = false;
  grupo.add(puntos);
  const der = new THREE.Vector3();
  const lado = new THREE.Vector3();
  const p0 = new THREE.Vector3();
  const pintar = (e, nombre, sub) => {
    if (e.texto === `${nombre}|${sub}`) return;
    e.texto = `${nombre}|${sub}`;
    const g = e.cv.getContext('2d');
    const {width: W, height: H} = e.cv;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.roundRect(0, 0, W, H, 12);
    g.fill();
    g.fillStyle = ROJO;
    g.fillRect(0, 0, 12, H);
    g.fillStyle = '#16181b';
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.font = 'bold 60px Arial, Helvetica, sans-serif';
    g.fillText(nombre, 34, 76, W - 54);
    g.fillStyle = '#6b7178';
    g.font = 'bold 40px Arial, Helvetica, sans-serif';
    g.fillText(sub.toUpperCase(), 34, 146, W - 54);
    e.tex.needsUpdate = true;
  };
  /** las posiciones (mundo) de los rótulos y de los puntos que señalan, para las pruebas: [{nombre, rotulo, punto}] */
  const estado = [];
  return {
    grupo,
    ancho,
    alto,
    estado,
    /**
     * partes: [{nombre, sub, punto: [x, y, z], repite}] en el marco de la pieza (o null para esconderlos). «repite: n» = la parte
     * está n veces alrededor del eje x de la pieza (las palas): se señala la que apunta hacia arriba.
     * pieza: {centro: Vector3 (mundo), radio (m), aMundo(Vector3) → Vector3 (mundo), lado, baja, ladoMax, escala}; ojo: dónde está
     * el alumno (mundo). lado (opcional): a cuánto del centro de la pieza va la columna (por omisión, pegada a su radio); baja
     * (opcional): cuánto más abajo que el centro (las piezas anchas y chatas la llevan debajo). escala (opcional): cuánto más
     * grandes van los rótulos (en la PC, cuando la pieza abre más lejos).
     * ladoMax (opcional): lo más lejos del centro de la pieza que puede ir la columna (en la PC, para que no se salga de la pantalla
     * cuando el alumno agranda la pieza).
     */
    actualizar(partes, pieza, ojo) {
      grupo.visible = !!(partes && partes.length && pieza);
      estado.length = 0;
      if (!grupo.visible) return;
      const {centro, radio} = pieza;
      der.set(-(centro.z - ojo.z), 0, centro.x - ojo.x).normalize(); // la derecha del alumno cuando mira la pieza
      // de las partes repetidas se señala la que apunta hacia arriba (y un poco a la derecha): sus puntos quedan separados de
      // los del centro de la pieza y las líneas no se enciman (la que apunta a la derecha se ve en escorzo)
      lado.copy(centro).addScaledVector(der, radio * 0.35);
      lado.y += radio;
      const lista = partes.slice(0, max).map((pt) => {
        let mejor = null;
        const n = pt.repite || 1;
        for (let k = 0; k < n; k++) {
          const a = (k * 2 * Math.PI) / n;
          const [x, y, z] = pt.punto;
          const w = pieza.aMundo(p0.set(x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)), new THREE.Vector3());
          if (!mejor || w.distanceToSquared(lado) < mejor.distanceToSquared(lado)) mejor = w;
        }
        return {nombre: pt.nombre, sub: pt.sub || '', mundo: mejor};
      });
      lista.sort((a, b) => b.mundo.y - a.mundo.y); // de arriba abajo, como los puntos que señalan: las líneas no se cruzan
      const L = lg.attributes.position.array;
      const P = pg.attributes.position.array;
      const esc = pieza.escala ?? 1;
      const paso = (alto + 0.03) * esc;
      lista.forEach((it, i) => {
        const e = etiquetas[i];
        pintar(e, it.nombre, it.sub);
        e.malla.scale.setScalar(esc);
        e.malla.position.copy(centro).addScaledVector(der, Math.min(pieza.lado ?? radio + 0.06 + (ancho * esc) / 2, pieza.ladoMax ?? Infinity));
        e.malla.position.y = centro.y - (pieza.baja || 0) + ((lista.length - 1) / 2 - i) * paso;
        e.malla.rotation.set(0, Math.atan2(ojo.x - e.malla.position.x, ojo.z - e.malla.position.z), 0);
        e.malla.visible = true;
        const borde = p0.copy(e.malla.position).addScaledVector(der, (-ancho * esc) / 2);
        L.set([borde.x, borde.y, borde.z, it.mundo.x, it.mundo.y, it.mundo.z], i * 6);
        P.set([it.mundo.x, it.mundo.y, it.mundo.z], i * 3);
        estado.push({nombre: it.nombre, rotulo: e.malla.position.clone(), punto: it.mundo});
      });
      for (let i = lista.length; i < max; i++) etiquetas[i].malla.visible = false;
      lg.attributes.position.needsUpdate = true;
      pg.attributes.position.needsUpdate = true;
      lg.setDrawRange(0, lista.length * 2);
      pg.setDrawRange(0, lista.length);
    },
  };
}
