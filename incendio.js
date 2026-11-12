// Foco de incendio en el terreno (nivel 2, PLAN_JUEGO.md): un FRENTE de llamas (lenguas naranjas aditivas que titilan, unos 80 m
// atravesados al viento), resplandor en el pie, una columna de humo con sprites que nacen oscuros y densos sobre el fuego y se van aclarando
// y ensanchando al subir (gris pardo arriba, se ve desde varios km), inclinada por el viento, y un parche quemado. Referencia: los dos videos
// que mandó Iván el 11/11 (Seedance): columna gris oscura al pie y parda arriba, llamas bajas y anchas en línea sobre la ladera.
// controlar(k) lo apaga en la medida k (0 a 1): menos llamas, humo blanco y ralo (vapor); apagado del todo queda un hilo de vapor.
// Todo en el marco del mundo (escena), como el humo del capot de main.js. Unas 32 llamadas de dibujo (sprites) sólo en los niveles 2 y 3.
import * as THREE from './three.module.js';

function radial(paradas, tam = 128) {   /* degradé radial suave: [[pos, 'rgba(…)'], …] */
  const cv = document.createElement('canvas'); cv.width = cv.height = tam; const c = cv.getContext('2d');
  const g = c.createRadialGradient(tam / 2, tam / 2, tam * 0.03, tam / 2, tam / 2, tam * 0.48); for (const [p, col] of paradas) g.addColorStop(p, col);
  c.fillStyle = g; c.fillRect(0, 0, tam, tam); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function llama() {   /* mata de llamas, más ancha que alta: cinco lenguas de distinta altura sobre una base amarilla casi blanca, rojo que se deshace arriba, bordes blandos */
  const W = 128, H = 96, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, H, 0, 0); g.addColorStop(0, 'rgba(255,248,200,1)'); g.addColorStop(0.22, 'rgba(255,205,70,1)'); g.addColorStop(0.5, 'rgba(255,125,20,0.9)'); g.addColorStop(0.82, 'rgba(205,45,5,0.35)'); g.addColorStop(1, 'rgba(100,10,0,0)');
  c.fillStyle = g;
  const lengua = (x0, w, tope) => { c.beginPath(); c.moveTo(x0 - w / 2, H); c.quadraticCurveTo(x0 - w * 0.6, H * (0.5 + tope * 0.45), x0 + w * 0.08, H * tope); c.quadraticCurveTo(x0 + w * 0.6, H * (0.5 + tope * 0.45), x0 + w / 2, H); c.closePath(); c.fill(); };
  for (const [x, w, tope] of [[0.12, 0.3, 0.45], [0.3, 0.34, 0.2], [0.5, 0.42, 0.03], [0.68, 0.32, 0.3], [0.87, 0.28, 0.5]]) lengua(x * W, w * W, tope);
  c.globalCompositeOperation = 'destination-in'; c.save(); c.translate(W / 2, H * 0.88); c.scale(1, 0.75);
  const r = c.createRadialGradient(0, 0, 3, 0, 0, W * 0.56); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.7, 'rgba(0,0,0,0.9)'); r.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = r; c.fillRect(-W, -H * 3, 2 * W, 6 * H); c.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const OSCURO = new THREE.Color(0x2e2a27), MEDIO = new THREE.Color(0x6f655e), CLARO = new THREE.Color(0xa39a91), VAPOR = new THREE.Color(0xe6e6e6);

export function crearIncendio(escena) {
  const g = new THREE.Group(); g.name = 'incendio'; g.visible = false; escena.add(g);
  const texHumo = radial([[0, 'rgba(255,255,255,0.9)'], [0.55, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]), texLlama = llama();
  const texBrillo = radial([[0, 'rgba(255,170,60,0.9)'], [0.5, 'rgba(255,110,30,0.35)'], [1, 'rgba(255,80,20,0)']]);
  const N = 36, humos = [], NL = 8, llamas = [], tmpC = new THREE.Color();
  for (let i = 0; i < N; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHumo, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 })); sp.userData.t = i / N; sp.userData.v = 0.85 + Math.random() * 0.3; g.add(sp); humos.push(sp); }
  for (let i = 0; i < NL; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLlama, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 })); sp.userData.fase = Math.random() * 6.28; sp.userData.s = (i - (NL - 1) / 2) / ((NL - 1) / 2); sp.userData.k = 0.6 + Math.random() * 0.7; g.add(sp); llamas.push(sp); }
  const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 })); brillo.scale.set(150, 40, 1); brillo.position.y = 5; g.add(brillo);
  const quemado = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0x241f1b, roughness: 1 })); quemado.rotation.x = -Math.PI / 2; quemado.position.y = 0.6; g.add(quemado);
  const estado = { pos: null, intensidad: 1, viento: { dir: 0, kt: 0 }, t: 0, frente: new THREE.Vector3(1, 0, 0), deriva: new THREE.Vector3() };
  const orientar = () => {   /* el frente de llamas atravesado al viento; el humo deriva a sotavento (el viento sopla DE dir) */
    const a = estado.viento.dir * Math.PI / 180; estado.deriva.set(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(estado.viento.kt * 0.5); estado.frente.set(Math.cos(a), 0, Math.sin(a));
    quemado.scale.set(55, 38, 1); quemado.rotation.set(-Math.PI / 2, 0, -a);
    for (const sp of llamas) { const s = sp.userData.s * 55 + (Math.random() - 0.5) * 14, q = (Math.random() - 0.5) * 14;   /* a lo largo del frente, con el borde quebrado */
      sp.position.set(estado.frente.x * s - estado.frente.z * q, 0, estado.frente.z * s + estado.frente.x * q); }
  };
  return {
    get pos() { return estado.pos; },
    poner(x, z, y, viento) { estado.pos = { x, y, z }; estado.viento = viento || estado.viento; estado.intensidad = 1; estado.t = 0; g.position.set(x, y, z); g.visible = true; orientar(); for (const sp of humos) sp.userData.t = Math.random(); },
    quitar() { g.visible = false; estado.pos = null; },
    controlar(k) { estado.intensidad = Math.max(0, estado.intensidad - k); },
    get intensidad() { return estado.intensidad; },
    actualizar(dt) {
      if (!estado.pos) return; estado.t += dt; const I = estado.intensidad, vapor = I < 0.6, tt = estado.t;
      const altura = 160 + 260 * I, dur = 24, d = estado.deriva;
      for (const sp of humos) {   /* nace oscuro y denso sobre el fuego, sube, se corre con el viento, se ensancha y se aclara */
        sp.userData.t += dt / dur * sp.userData.v; if (sp.userData.t > 1) { sp.userData.t = 0; sp.userData.jx = (Math.random() - 0.5) * 1.6; sp.userData.jz = (Math.random() - 0.5) * 1.6; }
        const t = sp.userData.t, jx = sp.userData.jx || 0, jz = sp.userData.jz || 0, sube = 1 - Math.pow(1 - t, 1.4);
        sp.position.set(d.x * t * dur * 0.8 + jx * t * dur, 6 + sube * altura, d.z * t * dur * 0.8 + jz * t * dur);
        const k = 34 + t * (130 + 90 * I); sp.scale.set(k, k, 1);
        if (vapor) tmpC.copy(VAPOR); else if (t < 0.4) tmpC.copy(OSCURO).lerp(MEDIO, t / 0.4); else tmpC.copy(MEDIO).lerp(CLARO, (t - 0.4) / 0.6);
        sp.material.color.copy(tmpC); sp.material.opacity = (vapor ? 0.1 + 0.15 * I : 0.45 + 0.4 * I) * Math.pow(1 - t, 0.6) * Math.min(1, t * 25);
      }
      const nLlamas = Math.round(NL * Math.min(1, I * 1.3)); let i = 0;
      for (const sp of llamas) {   /* lenguas de distinto tamaño que titilan cada una a su ritmo; al controlarlo se apagan de a una */
        const viva = i++ < nLlamas; sp.visible = viva; if (!viva) continue; const f = Math.sin(tt * 9 + sp.userData.fase) * 0.5 + Math.sin(tt * 23 + sp.userData.fase * 2) * 0.3, kk = sp.userData.k;
        const w = (18 + 10 * I) * kk * (1 + 0.08 * Math.sin(tt * 7 + sp.userData.fase)), h = w * 0.75 * (1 + 0.25 * f); sp.scale.set(w, h, 1); sp.position.y = h * 0.45; sp.material.opacity = 0.65 + 0.25 * f;
      }
      brillo.visible = I > 0.05; brillo.material.opacity = (0.3 + 0.2 * Math.sin(tt * 11)) * I;
    },
  };
}
