// Escenario: pista de tierra en el campo, cielo, arboleda, humo de incendio a lo lejos,
// y el diagrama de ángulos de aproximación del MOE 3.4 dibujado en el suelo.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js?v=20261006a';

const mat = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...e });

function texturaRuido(base, variacion, tam = 256, repetir = 40) {
  const cv = document.createElement('canvas'); cv.width = cv.height = tam; const g = cv.getContext('2d');
  const img = g.createImageData(tam, tam);
  const [r, gg, b] = base;
  for (let i = 0; i < tam * tam; i++) {
    const n = (Math.random() - 0.5) * variacion;
    img.data[i * 4] = r + n; img.data[i * 4 + 1] = gg + n; img.data[i * 4 + 2] = b + n * 0.7; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetir, repetir);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

function cielo() {
  // Gradiente + nubes procedurales (fbm barato) + halo del sol. Sin texturas: apto para el Quest.
  const g = new THREE.SphereGeometry(780, 40, 20);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { arriba: { value: new THREE.Color(0x3f7cc4) }, horizonte: { value: new THREE.Color(0xd3dfe0) }, sol: { value: new THREE.Vector3(-280, 150, -390).normalize() }, t: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 arriba, horizonte, sol; uniform float t; varying vec3 vP;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        float h = clamp(vP.y * 2.2, 0.0, 1.0);
        vec3 col = mix(horizonte, arriba, pow(h, 0.65));
        // nubes: proyección sobre un plano a altura fija
        if (vP.y > 0.02) { vec2 uv = vP.xz / (vP.y + 0.18) * 1.6 + vec2(t * 0.01, 0.0);
          float n = fbm(uv * 0.9); float nubes = smoothstep(0.56, 0.74, n) * smoothstep(0.02, 0.25, vP.y);
          vec3 cn = mix(vec3(0.78, 0.8, 0.83), vec3(1.0), smoothstep(0.55, 0.85, n));
          col = mix(col, cn, nubes * 0.9); }
        float s = max(dot(vP, sol), 0.0); col += vec3(1.0, 0.93, 0.78) * (pow(s, 180.0) * 0.9 + pow(s, 6.0) * 0.12);
        gl_FragColor = vec4(col, 1.0); }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.userData.actualizar = dt => { m.uniforms.t.value += dt; }; return mesh;
}

// Zonas del MOE 3.4 alrededor del avión (coordenadas del avión: +x nariz, z lateral).
export function crearZonas(radio = 11) {
  const g = new THREE.Group(); g.name = 'zonas';
  const zona = (desde, hasta, color, r = radio, r0 = 0) => {
    const geo = new THREE.RingGeometry(r0, r, 48, 1, desde, hasta - desde);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 1; g.add(m);
  };
  // En RingGeometry el ángulo 0 es +x del plano; tras rotar -90° en x, +y del plano pasa a -z del mundo.
  const d = THREE.MathUtils.degToRad;
  zona(d(-80), d(80), 0xe02020);                     // adelante: prohibido con motor encendido
  zona(d(80), d(100), 0xf07a1a); zona(d(-100), d(-80), 0xf07a1a); // a la altura del motor: solo personal autorizado
  zona(d(100), d(150), 0x2fbf4a); zona(d(-150), d(-100), 0x2fbf4a); // aproximación a la cabina
  zona(d(150), d(210), 0xf2c200);                    // atrás: precaución vientos fuertes
  // estela: franja amarilla tenue hasta 32 m detrás
  const est = new THREE.Mesh(new THREE.PlaneGeometry(21, 4.5), new THREE.MeshBasicMaterial({ color: 0xf2c200, transparent: true, opacity: 0.12, depthWrite: false }));
  est.rotation.x = -Math.PI / 2; est.position.set(-21.5, 0.021, 0); g.add(est);
  return g;
}

export function crearEscenario(escena) {
  // Plataforma, pista, hangares y paisaje portados de «La vuelta al avión» (aurav-prevuelo), para que
  // los dos juegos de AURAV compartan el mismo aeródromo. El avión queda estacionado en la plataforma
  // de hormigón, de frente a la pista.
  const skyMesh = cielo(); escena.add(skyMesh);
  escena.fog = new THREE.Fog(0xd3dfe0, 140, 800);
  const M = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.86, ...e });
  // Texturas CC0 de Poly Haven (1K, en ./tex): pasto con piedras, hormigón gastado, asfalto. Se cargan
  // de forma asíncrona; mientras tanto se ven los colores planos.
  const loader = new THREE.TextureLoader();
  const tex = (url, rep, { srgb = true } = {}) => { const t = loader.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const mats = {
    ground: M('#8b9670', { map: tex('./tex/pasto.jpg', 420), roughness: 0.95 }),
    concrete: M('#e4e1cf', { map: tex('./tex/hormigon.jpg', 13), normalMap: tex('./tex/hormigon_n.jpg', 13, { srgb: false }), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.8 }),
    asphalt: M('#9a9c98', { map: tex('./tex/asfalto.jpg', 300), normalMap: tex('./tex/asfalto_n.jpg', 300, { srgb: false }), normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.9 }),
    paint: M('#e9d49a'), white: M('#e5e5d2'), dark: M('#173247'), wall: M('#8a9caa'), roof: M('#143b59'), junta: M('#b7b7a4') };
  // el mapa de repetición del hormigón y el asfalto se ajusta por tamaño de cada losa (ver abajo)
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.receiveShadow = true; escena.add(b); return b; };
  const cartel = (texto, w = 2, h = 0.45, fg = '#f4f9ff', bg = '#082440') => {
    const cv = document.createElement('canvas'); cv.width = 768; cv.height = 160; const c = cv.getContext('2d');
    c.fillStyle = bg; c.fillRect(0, 0, 768, 160); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '600 46px Arial'; c.fillText(texto, 384, 80);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
  };
  const carteles = [];
  const marca = ancho => { const s = cartel('AURAV / PLANO AÉREO', ancho, ancho * 0.572, '#ffffff', '#082440'); carteles.push(s); return s; };

  // Piso: plano grande con variación de color por vértice a gran escala (rompe el tileado del pasto).
  { const gg = new THREE.PlaneGeometry(3200, 3200, 160, 160); const pa = gg.attributes.position, col = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); const n = 0.5 + 0.5 * Math.sin(x * 0.021 + 1.3) * Math.cos(y * 0.017 - 0.4) + 0.25 * Math.sin(x * 0.083 + y * 0.061); const v = 0.82 + 0.26 * THREE.MathUtils.clamp(n, 0, 1); col.set([v, v * 0.98, v * 0.9], i * 3); }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); mats.ground.vertexColors = true;
    const ground = new THREE.Mesh(gg, mats.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; escena.add(ground); }
  const losa = (w, d, x, y, z, m, metrosPorTile) => { const b = box(w, 0.06, d, x, y, z, m); const uv = b.geometry.attributes.uv; // cara superior = índice 2 de BoxGeometry (y+): vértices 8..11
    for (let i = 8; i < 12; i++) uv.setXY(i, uv.getX(i) * w / metrosPorTile, uv.getY(i) * d / metrosPorTile); return b; };
  mats.concrete.map.repeat.set(1, 1); mats.concrete.normalMap.repeat.set(1, 1); mats.asphalt.map.repeat.set(1, 1); mats.asphalt.normalMap.repeat.set(1, 1);
  losa(39, 46, -1, -0.025, 2, mats.concrete, 3.2);                    // plataforma de hormigón
  losa(18, 1300, 30, -0.012, -500, mats.asphalt, 7);                  // pista
  losa(33, 9, 11, -0.01, 15, mats.asphalt, 7);                        // calle de rodaje
  for (let z = -1100; z < 120; z += 23) box(0.18, 0.015, 7, 30, 0.034, z, mats.white);
  for (const x of [22, 38]) box(0.13, 0.015, 1280, x, 0.034, -510, mats.white);
  for (let x = 24; x <= 36; x += 2) box(0.8, 0.015, 12, x, 0.04, -12, mats.white);
  for (let x = -15; x < 18; x += 3) box(0.025, 0.006, 46, x, 0.015, 2, mats.junta);   // juntas del hormigón
  for (let z = -18; z < 24; z += 4) box(39, 0.006, 0.025, -1, 0.015, z, mats.junta);
  for (let i = 0; i < 3; i++) {                                       // hangares
    const x = -31 - i * 21, z = 18 + i * 5;
    box(18, 8, 20, x, 4, z, mats.wall).castShadow = true;
    box(18.6, 0.5, 20.6, x, 8, z, mats.roof);
    box(14, 6.3, 0.08, x, 3.2, z - 10.1, mats.dark);
    for (let p = -6; p <= 6; p += 2) box(0.06, 6.2, 0.1, x + p, 3.2, z - 10.18, mats.roof);
    const l = i === 0 ? marca(6) : cartel(`HANGAR 0${i + 1}`, 8, 0.95); l.position.set(x, i === 0 ? 6.4 : 7.1, z - 10.25); l.rotation.y = Math.PI; escena.add(l);
  }
  let seed = 721; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // Sierras: anillo de terreno con relieve (fbm) alrededor del aeródromo, plano hasta ~220 m, con textura de
  // pasto seco y color por altura/pendiente (verde abajo, ocre, roca gris arriba).
  { const S = 2400, seg = 150, tg = new THREE.PlaneGeometry(S, S, seg, seg), pa = tg.attributes.position, col = new Float32Array(pa.count * 3);
    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    const noise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v); };
    const fbm = (x, y) => { let a = 0.5, f = 1, t = 0; for (let i = 0; i < 5; i++) { t += a * noise(x * f, y * f); a *= 0.5; f *= 2.1; } return t; };
    const alt = (x, z) => { const r = Math.hypot(x, z - 60), lejos = THREE.MathUtils.smoothstep(r, 300, 650); const n = fbm(x * 0.0022 + 3.1, z * 0.0022 + 7.7); return lejos * (Math.pow(n, 1.6) * 150 + Math.max(0, n - 0.55) * 170); };
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = -pa.getY(i); const h = alt(x, z); pa.setZ(i, h);
      const dh = Math.hypot(alt(x + 6, z) - alt(x - 6, z), alt(x, z + 6) - alt(x, z - 6)) / 12; const th = THREE.MathUtils.clamp(h / 170, 0, 1);
      const c = new THREE.Color('#7c8f60').lerp(new THREE.Color('#9aa070'), th).lerp(new THREE.Color('#8f958f'), THREE.MathUtils.clamp(dh * 1.6 - 0.25, 0, 1) * 0.7 + th * th * 0.45);
      col.set([c.r, c.g, c.b], i * 3); }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
    const terreno = new THREE.Mesh(tg, M('#ffffff', { map: tex('./tex/sierra.jpg', 90), vertexColors: true, roughness: 0.95 })); terreno.rotation.x = -Math.PI / 2; terreno.position.y = -0.5; escena.add(terreno); }
  const o = new THREE.Object3D();
  // Árboles: pinos y árboles de copa redonda como planos cruzados con textura pintada por código (alpha).
  // Mucho más real que los conos y barato para el Quest (2 quads por árbol, una sola InstancedMesh por tipo).
  const texArbol = (tipo) => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const g = cv.getContext('2d'); g.clearRect(0, 0, 256, 512);
    let sd = tipo === 'pino' ? 11 : 29; const rn = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    // tronco
    g.fillStyle = '#5a4634'; g.beginPath(); g.moveTo(118, 512); g.lineTo(138, 512); g.lineTo(132, 300); g.lineTo(124, 300); g.closePath(); g.fill();
    if (tipo === 'pino') {
      for (let y = 470; y > 40; y -= 9) { const w = 8 + (y - 40) * 0.24 + rn() * 12; const t = (y - 40) / 430;
        for (let k = 0; k < 14; k++) { const x = 128 + (rn() - 0.5) * 2 * w, yy = y + (rn() - 0.5) * 14; const c = 0.30 + 0.16 * (1 - Math.abs(x - 128) / (w + 1)) + rn() * 0.08;
          g.fillStyle = `hsl(${112 + rn() * 18}, ${26 + rn() * 12}%, ${Math.round(c * 62 * (0.7 + 0.3 * (1 - t)))}%)`; g.beginPath(); g.ellipse(x, yy, 6 + rn() * 9, 3 + rn() * 4, (rn() - 0.5) * 0.8, 0, Math.PI * 2); g.fill(); } }
    } else {
      for (let k = 0; k < 420; k++) { const a = rn() * Math.PI * 2, r = Math.sqrt(rn()) * 100; const x = 128 + Math.cos(a) * r, y = 190 + Math.sin(a) * r * 0.9; const c = 0.28 + 0.2 * (1 - r / 100) + rn() * 0.1;
        g.fillStyle = `hsl(${84 + rn() * 26}, ${30 + rn() * 14}%, ${Math.round(c * 68)}%)`; g.beginPath(); g.ellipse(x, y, 9 + rn() * 12, 7 + rn() * 9, rn() * 3, 0, Math.PI * 2); g.fill(); }
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const geoCruz = (() => { const a = new THREE.PlaneGeometry(1, 2), b = a.clone().rotateY(Math.PI / 2); a.translate(0, 1, 0); b.translate(0, 1, 0);
    const g = new THREE.BufferGeometry(); const pos = [...a.attributes.position.array, ...b.attributes.position.array], uv = [...a.attributes.uv.array, ...b.attributes.uv.array], nor = [...a.attributes.normal.array, ...b.attributes.normal.array];
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex([...a.index.array, ...Array.from(b.index.array, i => i + 4)]); return g; })();
  const N = 150, tipos = ['pino', 'copa'];
  const arboles = tipos.map(tp => new THREE.InstancedMesh(geoCruz, new THREE.MeshStandardMaterial({ map: texArbol(tp), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95 }), N));
  const cnt = [0, 0];
  for (let i = 0; i < N * 2; i++) {
    const a = rnd() * Math.PI * 2, r = 70 + rnd() * 150; let x = Math.cos(a) * r; const z = Math.sin(a) * r; if (Math.abs(x - 30) < 22) x += x >= 30 ? 44 : -44;
    const tp = rnd() < 0.62 ? 0 : 1, h = tp === 0 ? 8 + rnd() * 8 : 6 + rnd() * 5;
    o.position.set(x, -0.1, z); o.rotation.set(0, rnd() * Math.PI, 0); o.scale.set(h * (tp === 0 ? 0.42 : 0.62), h * 0.5, h * (tp === 0 ? 0.42 : 0.62)); o.updateMatrix();
    if (cnt[tp] < N) { arboles[tp].setMatrixAt(cnt[tp], o.matrix); arboles[tp].setColorAt(cnt[tp], new THREE.Color().setHSL(0.25, 0.08, 0.6 + rnd() * 0.2)); cnt[tp]++; }
  }
  for (const [k, m] of arboles.entries()) { m.count = cnt[k]; m.castShadow = true; escena.add(m); }
  // Autobomba (Tripo, texto a 3D, 28/9) estacionada al costado del hangar 01, mirando a la plataforma
  new GLTFLoader().load('./autobomba.glb', gltf => { const m = gltf.scene; m.position.set(-27, 0, -4); m.rotation.y = Math.PI / 2 + 0.35; m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); m.name = 'autobomba'; escena.add(m); }, undefined, e => console.warn('autobomba.glb no cargó', e));
  // manga de viento
  { const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8, 12), mats.white); palo.position.set(44, 4, -20); escena.add(palo);
    const sock = new THREE.Group(); sock.position.set(44, 8, -20); sock.rotation.z = -Math.PI / 2.5;
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35 - i * 0.04, 0.39 - i * 0.04, 0.4, 12, 1, true), M(i % 2 ? '#eee6cb' : '#d78955', { side: THREE.DoubleSide })); m.position.y = i * 0.4; sock.add(m); } escena.add(sock); }
  // cartel AURAV en el borde de la plataforma (fuera del sector de carga)
  { const b = marca(3); b.position.set(-16, 1.8, -12); b.rotation.y = 0.8; escena.add(b); box(0.09, 1.6, 0.09, -16, 0.8, -12, mats.dark); }
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff1c5', fog: false })); sunDisc.position.set(-280, 150, -390); escena.add(sunDisc);
  // logo real si está el archivo (mismo que en «La vuelta al avión»)
  const img = new Image(); img.onload = () => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; for (const s of carteles) { s.material.map = t; s.material.needsUpdate = true; } }; img.src = './aurav-plano-aereo.webp';

  // columna de humo del incendio en el horizonte
  const humo = crearHumo(); humo.position.set(180, 0, -230); escena.add(humo);

  // luces (mismas que el primer juego)
  escena.add(new THREE.HemisphereLight(0xedf5ff, 0x797750, 1.6));
  const sol = new THREE.DirectionalLight(0xffdfac, 2.6);
  sol.position.set(-16, 30, -18); sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024); Object.assign(sol.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, far: 120 });
  sol.shadow.bias = -0.0005;
  escena.add(sol);

  return { actualizar: dt => { humo.userData.actualizar(dt); skyMesh.userData.actualizar(dt); } };
}

function crearHumo() {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(120,112,104,0.9)'); gr.addColorStop(1, 'rgba(120,112,104,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  const bolas = [];
  for (let i = 0; i < 26; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    sp.userData.t = i / 26; g.add(sp); bolas.push(sp);
  }
  g.userData.actualizar = dt => {
    for (const b of bolas) {
      b.userData.t = (b.userData.t + dt * 0.02) % 1;
      const t = b.userData.t;
      b.position.set(t * 60 + Math.sin(t * 9) * 4, 5 + t * 110, Math.cos(t * 7) * 5);
      const k = 14 + t * 55; b.scale.set(k, k, 1);
      b.material.opacity = 0.75 * (1 - t);
    }
  };
  return g;
}

// Motobomba, tanque de agua y manguera hasta el acople del avión
export function crearEquipoCarga(desde, hasta) {
  const g = new THREE.Group(); g.name = 'equipo-carga';
  // tanque de agua (fuente a validar con AAXOD)
  const tanque = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.4, 28), mat(0x8e969c, { roughness: 0.6, metalness: 0.4 }));
  tanque.position.set(desde.x - 3.2, 0.7, desde.z + 0.6); g.add(tanque);
  // motobomba
  const mb = new THREE.Group(); mb.name = 'motobomba';
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.6), mat(0x2a2a2a)); base.position.y = 0.04; mb.add(base);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.36), mat(0xc0171d, { roughness: 0.5 })); motor.position.set(-0.12, 0.26, 0); mb.add(motor);
  const bomba = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 14), mat(0x777c80, { metalness: 0.6, roughness: 0.4 })); bomba.rotation.z = Math.PI / 2; bomba.position.set(0.22, 0.22, 0); mb.add(bomba);
  const marco = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 6, 16, Math.PI), mat(0x2a2a2a)); marco.position.set(0, 0.08, 0); marco.rotation.y = Math.PI / 2; mb.add(marco);
  mb.position.copy(desde); g.add(mb);
  // Motobomba de Tripo (texto a 3D, 28/9): reemplaza a la de cajas cuando carga; la boca de la bomba mira a +x.
  new GLTFLoader().load('./motobomba.glb', gltf => { const m = gltf.scene; m.position.copy(desde); m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); m.name = 'motobomba-glb'; g.add(m); mb.visible = false; }, undefined, e => console.warn('motobomba.glb no cargó', e));
  // manguera de aspiración (tanque → bomba) y de impulsión (bomba → acople)
  // Manguera: textura de trama (tejido) pintada por código, repetida a lo largo del tubo.
  const texManguera = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
    c.fillStyle = '#243f66'; c.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 256; x += 4) for (let y = 0; y < 64; y += 4) { const k = ((x / 4 + y / 4) % 2) ? 0.08 : -0.06; c.fillStyle = `rgba(${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${Math.abs(k)})`; c.fillRect(x, y, 4, 4); }
    c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 1; for (let x = -64; x < 320; x += 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 32, 64); c.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; })();
  const mManguera = new THREE.MeshStandardMaterial({ map: texManguera, roughness: 0.85 });
  const mAluminio = mat(0xb8bec4, { metalness: 0.75, roughness: 0.35 });
  const tubo = (pts, r) => { const c = new THREE.CatmullRomCurve3(pts); const L = c.getLength(); const mm = mManguera.clone(); mm.map = texManguera.clone(); mm.map.repeat.set(L / 0.6, 1); mm.map.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, Math.round(L * 6)), r, 10), mm); m.castShadow = true; g.add(m);
    // abrazaderas cada ~1,2 m y acoples camlock de aluminio en las puntas
    for (let u = 0.08; u < 0.97; u += 1.2 / L) { const p = c.getPointAt(u), tg = c.getTangentAt(u); const ab = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.008, r + 0.008, 0.03, 10), mAluminio); ab.position.copy(p); ab.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg); g.add(ab); }
    for (const u of [0, 1]) { const p = c.getPointAt(u), tg = c.getTangentAt(u); const ac = new THREE.Group(); ac.position.copy(p); ac.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg);
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.014, r + 0.014, 0.13, 12), mAluminio); ac.add(cuerpo);
      for (const sgn of [-1, 1]) { const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.075, 0.02), mAluminio); brazo.position.set(sgn * (r + 0.02), 0.01, 0); brazo.rotation.z = sgn * 0.5; ac.add(brazo); }
      const aro = new THREE.Mesh(new THREE.TorusGeometry(r + 0.016, 0.006, 6, 16), mAluminio); aro.rotation.x = Math.PI / 2; aro.position.y = 0.05; ac.add(aro); ac.name = 'acople'; g.add(ac); }
    return m; };
  tubo([new THREE.Vector3(desde.x - 1.7, 0.5, desde.z + 0.4), new THREE.Vector3(desde.x - 0.8, 0.1, desde.z + 0.2), new THREE.Vector3(desde.x + 0.35, 0.22, desde.z)], 0.045);
  const medio = new THREE.Vector3().lerpVectors(desde, hasta, 0.5);
  tubo([new THREE.Vector3(desde.x + 0.35, 0.22, desde.z), new THREE.Vector3(desde.x + 1.2, 0.09, desde.z - 0.3), new THREE.Vector3(medio.x, 0.09, medio.z + 0.4),
    new THREE.Vector3(hasta.x - 0.2, 0.1, hasta.z + 0.5), new THREE.Vector3(hasta.x, Math.max(0.2, hasta.y - 0.3), hasta.z + 0.12), hasta.clone()], 0.04).name = 'manguera-impulsion';
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
