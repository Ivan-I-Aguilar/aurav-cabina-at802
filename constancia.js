// Constancia de la práctica en la cabina del AT-802, con el logo de AAXOD (adaptada de la de aurav-senales, 11/11/2026).
// Se dibuja en un canvas (1600×1130): en PC se descarga como PNG; en VR se puede mostrar como cartel 3D (mesh).
// Documenta la práctica en un simulador de demostración y no acredita habilitación. El código de verificación es el FNV-1a de
// «alumno|nivel|semilla|fecha|nota|A/N» (debrief.js): el instructor lo puede recomputar.
import * as THREE from './three.module.js';

const NEGRO = '#1a1a14', BORDO = '#7a1230', GRIS = '#55606a', TINTA = '#1d2d3d', VERDE = '#1f7a3f';

function envolver(g, texto, ancho) {
  const out = []; let linea = '';
  for (const p of String(texto).split(' ')) { const t = linea ? linea + ' ' + p : p; if (g.measureText(t).width > ancho && linea) { out.push(linea); linea = p; } else linea = t; }
  if (linea) out.push(linea); return out;
}

export class Constancia {
  constructor() {
    this.W = 1600; this.H = 1130;
    this.cv = document.createElement('canvas'); this.cv.width = this.W; this.cv.height = this.H;
    this.g = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.13), new THREE.MeshBasicMaterial({ map: this.tex, depthTest: false, fog: false, toneMapped: false }));
    this.mesh.renderOrder = 9; this.mesh.name = 'constancia'; this.mesh.visible = false;
    this.logo = null; const img = new Image(); img.onload = () => { this.logo = img; if (this.datos) this.dibujar(this.datos); }; img.src = './aaxod-logo.png';
    this.datos = null;
  }
  // datos: el resultado de debrief.js ({ alumno, titulo, nivel, semilla, escenario, fecha, nota, aprobado, competencias, observaciones, codigo })
  dibujar(datos) {
    this.datos = datos;
    const { g, W, H } = this;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.lineWidth = 10; g.strokeStyle = NEGRO; g.strokeRect(28, 28, W - 56, H - 56);
    g.lineWidth = 3; g.strokeStyle = BORDO; g.strokeRect(48, 48, W - 96, H - 96);
    if (this.logo) { const lh = 210, lw = lh * this.logo.width / this.logo.height; g.drawImage(this.logo, W - 100 - lw, 90, lw, lh); }
    g.textBaseline = 'alphabetic'; g.fillStyle = GRIS; g.font = '600 28px Arial'; g.fillText('CURSO DE PILOTOS AT-802  ·  PRÁCTICA EN SIMULADOR DE CABINA', 90, 150);
    g.fillStyle = NEGRO; g.font = 'bold 76px Arial'; g.fillText('Constancia', 90, 240);
    g.fillStyle = TINTA; g.font = '36px Arial'; g.fillText(datos.titulo || 'Cabina AT-802', 90, 296);
    g.fillStyle = GRIS; g.font = '30px Arial'; g.fillText('Se deja constancia de que', 90, 400);
    g.fillStyle = NEGRO; g.font = 'bold 64px Arial'; g.fillText((datos.alumno || '').trim() || 'Alumno/a', 90, 475);
    g.fillStyle = TINTA; g.font = '32px Arial';
    const intro = `completó la práctica «${datos.titulo}» en la cabina virtual del Air Tractor AT-802 (situación ${datos.escenario}), con resultado ${datos.aprobado ? 'APROBADO' : 'NO APROBADO'} y nota ${datos.nota} / 100.`;
    let y = 535; for (const l of envolver(g, intro, W - 180)) { g.fillText(l, 90, y); y += 42; }
    y += 18; const x0 = 90, w = W - 180;
    g.fillStyle = '#eef0f2'; g.fillRect(x0, y, w, 54); g.fillStyle = GRIS; g.font = '600 28px Arial'; g.fillText('COMPETENCIA', x0 + 24, y + 37); g.fillText('NOTA', x0 + w - 200, y + 37); y += 54;
    const nombres = { procedimientos: 'Procedimientos (checklist completo y en orden)', reaccion: 'Reacción ante la falla', control: 'Control del avión y parámetros', decision: 'Decisión' };
    for (const k in nombres) {
      const n = datos.competencias?.[k] ?? 0;
      g.fillStyle = TINTA; g.font = '32px Arial'; g.fillText(nombres[k], x0 + 24, y + 40);
      g.fillStyle = n >= 70 ? VERDE : BORDO; g.font = 'bold 34px Arial'; g.fillText(`${n} / 100`, x0 + w - 200, y + 40);
      g.strokeStyle = '#d5dade'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y + 60); g.lineTo(x0 + w, y + 60); g.stroke(); y += 60;
    }
    g.fillStyle = NEGRO; g.font = 'bold 34px Arial'; g.fillText('Nota final', x0 + 24, y + 44); g.fillStyle = datos.aprobado ? VERDE : BORDO; g.fillText(`${datos.nota} / 100`, x0 + w - 200, y + 44); y += 70;
    g.fillStyle = GRIS; g.font = '28px Arial'; g.fillText(`Fecha: ${datos.fecha}   ·   Semilla: ${datos.semilla}   ·   Código de verificación: ${datos.codigo}`, 90, Math.max(y + 40, H - 160));
    g.font = 'italic 24px Arial'; g.fillStyle = '#6b7680';
    const pie = 'Procedimientos según el checklist normal de AAXOD (CHECK LIST 802 NORM) y el Pilot Training Course de Air Tractor, a validar con los instructores. Documenta la práctica en un simulador de demostración y no acredita habilitación.';
    y = H - 108; for (const l of envolver(g, pie, W - 180)) { g.fillText(l, 90, y); y += 30; }
    this.tex.needsUpdate = true;
  }
  mostrar(datos) { this.dibujar(datos); this.mesh.visible = true; }
  ocultar() { this.mesh.visible = false; }
  descargar(nombreArchivo = 'constancia-cabina-at802.png') {
    this.cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombreArchivo; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png');
  }
}
