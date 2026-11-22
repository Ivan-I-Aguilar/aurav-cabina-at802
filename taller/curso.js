// El CURSO de familiarización con el AT-802 (T17, 22/11/2026; PLAN_TALLER.md §16.4): lo que hace del recorrido del avión un curso.
// Cada punto es una LECCIÓN (qué es → en tus manos → cómo funciona → repaso) y acá va lo que las junta:
//  - el AVANCE de cada lección (qué vio el alumno, cómo le fue en el repaso, si quedó hecha) y el renglón que lo dice en la tarjeta;
//  - el RESUMEN («MI AVANCE»): una placa con las nueve lecciones, su avance y su repaso, de la que se puede ir a cualquiera;
//  - que el avance QUEDE GUARDADO en el aparato (localStorage), para seguir otro día; se borra con EMPEZAR DE NUEVO.
// No hay constancia ni envío al aula virtual (fuera de alcance por ahora).
import {crearPanel, pieLeyenda} from './paneles.js?v=20261122d';

const CLAVE = 'aurav_taller_curso';
const AZUL = '#082440';
const LIMA = '#c8e63a';
const ROJO = '#d6182b';
const VERDE = '#2f9e5b';
const GRIS = '#8fa3b8';

/**
 * el avance de una lección: leccion = su contenido (lecciones.js), av = lo anotado en el camino del alumno ({estados: Set,
 * repaso}). Devuelve {vistos, total (los estados con botón), repaso (su mejor puntaje, o null), preguntas, empezada, hecha}: una
 * lección queda HECHA cuando el alumno puso todos sus estados e hizo el repaso
 */
export function avanceDeLeccion(leccion, av) {
  const conBoton = leccion.estados.filter((e) => e.boton);
  const vistos = av ? conBoton.filter((e) => av.estados.has(e.id)).length : 0;
  const repaso = av ? av.repaso : null;
  return {vistos, total: conBoton.length, repaso, preguntas: leccion.preguntas.length, empezada: vistos > 0 || repaso !== null, hecha: vistos === conBoton.length && repaso !== null};
}

/** el renglón de avance de una lección, para su tarjeta: {texto, hecha, empezada} */
export function textoAvance(a) {
  if (!a) return {texto: '', hecha: false, empezada: false};
  if (a.hecha) return {texto: `LECCIÓN HECHA · repaso ${a.repaso} de ${a.preguntas}`, hecha: true, empezada: true};
  if (!a.empezada) return {texto: 'LECCIÓN SIN EMPEZAR', hecha: false, empezada: false};
  const falta = [];
  if (a.vistos < a.total) falta.push(`viste ${a.vistos} de ${a.total}`);
  falta.push(a.repaso === null ? 'falta el repaso' : `repaso ${a.repaso} de ${a.preguntas}`);
  return {texto: `EN CURSO · ${falta.join(' · ')}`, hecha: false, empezada: true};
}

/** lo guardado en el aparato (o null); clave: para las pruebas, que no tocan lo del alumno */
export function leerCurso(clave = CLAVE) {
  try {
    const d = JSON.parse(localStorage.getItem(clave));
    return d && d.v === 1 ? d : null;
  } catch {
    return null;
  }
}
export function guardarCurso(d, clave = CLAVE) {
  try {
    localStorage.setItem(clave, JSON.stringify({v: 1, ...d}));
    return true;
  } catch {
    return false; // sin lugar o sin permiso: el curso sigue andando, sólo que no se guarda
  }
}
export function borrarCurso(clave = CLAVE) {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* nada */
  }
}

/**
 * La placa del RESUMEN. pintar({filas, hover, confirmar}): filas = [{titulo, vistos, total, loVisto (texto), repaso, preguntas,
 * hecha, empezada, visitada}], una por lección, en el orden del recorrido; confirmar = se pidió EMPEZAR DE NUEVO y falta decir
 * que sí. Botones: 'res_cerrar', 'res_ir_<i>' (cada renglón lleva a su lección), 'res_borrar', 'res_borrar_si', 'res_borrar_no'.
 */
export function crearPanelResumen({leyenda, ancho = 0.96, alto = 0.69} = {}) {
  const p = crearPanel({ancho, alto, px: 1536, nombre: 'panel-resumen', transparente: true});
  const {g, W, H} = p;
  const M = 36;
  const PIE = 100;
  const boton = (id, x, y, w, h, texto, {lleno = false, sobre = false, color = LIMA, tam = 30} = {}) => {
    p.botones.push({id, x, y, w, h});
    g.beginPath();
    g.roundRect(x, y, w, h, 14);
    g.fillStyle = lleno ? (sobre && color === ROJO ? '#b81426' : sobre && color === LIMA ? '#e4f77a' : color) : sobre ? '#17467a' : '#0f335a';
    g.fill();
    if (!lleno) {
      g.lineWidth = 3;
      g.strokeStyle = color;
      g.stroke();
    }
    g.fillStyle = lleno ? (color === LIMA ? AZUL : '#ffffff') : color === LIMA ? LIMA : '#ffffff';
    g.font = `bold ${tam}px Arial`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(texto, x + w / 2, y + h / 2 + 2, w - 24);
  };
  return {
    ...p,
    ancho,
    alto,
    pintar({filas, hover = null, confirmar = false}) {
      p.botones.length = 0;
      g.clearRect(0, 0, W, H);
      g.save();
      g.beginPath();
      g.roundRect(0, 0, W, H, 30);
      g.clip();
      g.fillStyle = AZUL;
      g.fillRect(0, 0, W, H);
      pieLeyenda(g, W, H - PIE, PIE, leyenda, 29);
      g.restore();
      // arriba: el título, cuántas van, y CERRAR
      const hechas = filas.filter((f) => f.hecha).length;
      const bien = filas.reduce((s, f) => s + (f.repaso ?? 0), 0);
      const preguntas = filas.reduce((s, f) => s + f.preguntas, 0);
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillStyle = LIMA;
      g.font = 'bold 48px Arial';
      g.fillText('MI AVANCE · CURSO DEL AT-802', M, 56);
      g.fillStyle = hechas === filas.length ? '#7fe0a3' : '#ffffff';
      g.font = 'bold 32px Arial';
      g.fillText(hechas === filas.length ? `CURSO COMPLETO · ${filas.length} lecciones · repasos: ${bien} de ${preguntas}` : `Lecciones hechas: ${hechas} de ${filas.length} · repasos: ${bien} de ${preguntas} respuestas bien`, M, 110, W - 2 * M - 270);
      boton('res_cerrar', W - 240 - 24, 24, 240, 100, 'CERRAR', {lleno: true, color: ROJO, sobre: hover === 'res_cerrar', tam: 40});
      // un renglón por lección: su número, su nombre, lo que vio, el repaso y cómo va. Cada uno lleva a su lección
      const y0 = 160;
      const alto1 = (H - PIE - y0 - 96) / filas.length;
      filas.forEach((f, i) => {
        const y = y0 + i * alto1;
        const id = `res_ir_${i}`;
        p.botones.push({id, x: M - 10, y: y + 2, w: W - 2 * M + 20, h: alto1 - 4});
        g.beginPath();
        g.roundRect(M - 10, y + 2, W - 2 * M + 20, alto1 - 4, 10);
        g.fillStyle = hover === id ? '#17467a' : i % 2 ? '#0c2d50' : '#0a2848';
        g.fill();
        const cy = y + alto1 / 2;
        g.beginPath();
        g.arc(M + 24, cy, 22, 0, Math.PI * 2);
        g.fillStyle = f.hecha ? VERDE : f.empezada ? LIMA : '#31506f';
        g.fill();
        g.fillStyle = f.hecha ? '#ffffff' : f.empezada ? AZUL : '#b7c6d6';
        g.font = 'bold 26px Arial';
        g.textAlign = 'center';
        g.fillText(f.hecha ? '✓' : String(i + 1), M + 24, cy + 2);
        g.textAlign = 'left';
        g.fillStyle = '#ffffff';
        g.font = 'bold 32px Arial';
        g.fillText(f.titulo, M + 62, cy + 1, 420);
        /* letra de 30 px = 1,9 cm: con la placa a 1,2 m, algo más de 1,5 cm por metro (la medida para leer en el casco) */
        g.fillStyle = '#9fe3ff';
        g.font = '30px Arial';
        g.fillText(f.loVisto, M + 464, cy + 1, 440);
        g.fillStyle = f.repaso === null ? GRIS : '#ffffff';
        g.fillText(f.repaso === null ? 'repaso: falta' : `repaso: ${f.repaso} de ${f.preguntas}`, M + 946, cy + 1, 240);
        g.textAlign = 'right';
        g.font = 'bold 30px Arial';
        g.fillStyle = f.hecha ? '#7fe0a3' : f.empezada ? LIMA : GRIS;
        g.fillText(f.hecha ? 'HECHA' : f.empezada ? 'EN CURSO' : f.visitada ? 'SIN EMPEZAR' : 'SIN VER', W - M - 6, cy + 1);
      });
      // abajo: cómo se usa, y EMPEZAR DE NUEVO (pide que se le diga que sí)
      const yb = H - PIE - 80;
      g.textAlign = 'left';
      g.fillStyle = GRIS;
      g.font = 'bold 29px Arial';
      if (!confirmar) {
        g.fillText('TOCÁ UNA LECCIÓN PARA IR A ELLA', M, yb + 15, W - 2 * M - 340);
        g.fillText('EL AVANCE QUEDA GUARDADO EN ESTE APARATO', M, yb + 50, W - 2 * M - 340);
        boton('res_borrar', W - M - 310, yb, 310, 62, 'EMPEZAR DE NUEVO', {sobre: hover === 'res_borrar', tam: 29});
      } else {
        g.fillStyle = '#ff9aa5';
        g.fillText('¿BORRAR TODO EL AVANCE DE ESTE APARATO?', M, yb + 32, W - 2 * M - 520);
        boton('res_borrar_si', W - M - 490, yb, 250, 62, 'SÍ, BORRAR', {lleno: true, color: ROJO, sobre: hover === 'res_borrar_si', tam: 29});
        boton('res_borrar_no', W - M - 220, yb, 220, 62, 'NO', {sobre: hover === 'res_borrar_no', tam: 29});
      }
      p.pintado();
    },
  };
}
