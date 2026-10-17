// Consola de radios del lado derecho (el Fire Boss de FSX no la trae). Dibujada en canvas sobre una caja,
// siguiendo la foto del panel real: GPS portátil arriba, panel de audio, GNS con pantalla, COM/NAV y transponder.
import * as THREE from './three.module.js';

export function crearRadios() {
  const W = 512, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#17181a'; c.fillRect(0, 0, W, H);
  const texto = (t, x, y, s, col = '#e8e8e8', al = 'left') => { c.fillStyle = col; c.font = `${s}px Arial`; c.textAlign = al; c.textBaseline = 'middle'; c.fillText(t, x, y); };
  const perilla = (x, y, r, col = '#555') => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = '#999'; c.lineWidth = 2; c.stroke(); c.strokeStyle = '#ddd'; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - r * 0.8); c.stroke(); };
  const boton = (x, y, w, h, t = '') => { c.fillStyle = '#3a3b3e'; c.fillRect(x, y, w, h); c.strokeStyle = '#111'; c.strokeRect(x, y, w, h); if (t) texto(t, x + w / 2, y + h / 2, 11, '#ddd', 'center'); };
  const unidad = (y, h, col = '#222326') => { c.fillStyle = col; c.fillRect(14, y, W - 28, h); c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeRect(14, y, W - 28, h); c.fillStyle = '#777'; for (const x of [26, W - 26]) for (const yy of [y + 10, y + h - 10]) { c.beginPath(); c.arc(x, yy, 4, 0, 7); c.fill(); } };
  // GPS portátil
  unidad(16, 190, '#4a4c50'); c.fillStyle = '#2a2c2e'; c.fillRect(40, 30, 200, 160); c.fillStyle = '#9fd18a'; c.fillRect(50, 40, 180, 140);
  c.strokeStyle = '#3d5f32'; c.lineWidth = 2; c.beginPath(); c.moveTo(60, 170); c.lineTo(120, 90); c.lineTo(210, 60); c.stroke(); texto('GS 0  TRK 180°', 60, 55, 13, '#1d3a16'); texto('AURAV', 60, 165, 13, '#1d3a16');
  for (let i = 0; i < 12; i++) boton(270 + (i % 4) * 54, 60 + Math.floor(i / 4) * 42, 44, 32, ['MENU', 'NRST', 'D→', 'ENT', 'PWR', 'CLR', 'IN', 'OUT', '▲', '▼', '◄', '►'][i]);
  // panel de audio
  unidad(224, 90); for (let i = 0; i < 8; i++) { boton(34 + i * 56, 240, 44, 28, ['COM1', 'COM2', 'NAV1', 'NAV2', 'ADF', 'DME', 'MKR', 'SPKR'][i]); c.fillStyle = i < 2 ? '#3fd35a' : '#333'; c.fillRect(44 + i * 56, 278, 24, 6); } perilla(470, 268, 16);
  // GNS: COM/VLOC + pantalla
  unidad(330, 230); c.fillStyle = '#090c0f'; c.fillRect(150, 345, 260, 200); c.fillStyle = '#0c1a14'; c.fillRect(156, 351, 248, 188);
  texto('118.100', 165, 372, 24, '#8fe3ff'); texto('121.500', 300, 372, 24, '#ffd37a'); texto('112.30', 165, 404, 22, '#8fe3ff'); texto('110.90', 300, 404, 22, '#ffd37a');
  c.strokeStyle = '#2d6b4a'; c.lineWidth = 2; c.strokeRect(166, 420, 228, 108); c.strokeStyle = '#4c9c6f'; c.beginPath(); c.moveTo(180, 520); c.lineTo(230, 470); c.lineTo(300, 480); c.lineTo(380, 430); c.stroke(); texto('MAP', 176, 434, 12, '#9bd8b2');
  perilla(70, 380, 22); perilla(70, 380, 11, '#333'); perilla(70, 480, 22); perilla(70, 480, 11, '#333'); perilla(460, 420, 22); perilla(460, 420, 11, '#333');
  for (let i = 0; i < 6; i++) boton(150 + i * 44, 550, 36, 14, '');
  // COM/NAV
  unidad(576, 110); c.fillStyle = '#090c0f'; c.fillRect(100, 592, 330, 76); texto('COM  122.800', 115, 612, 22, '#ff9d3a'); texto('NAV  114.50', 115, 648, 22, '#ff9d3a'); texto('STBY 123.450', 300, 612, 16, '#ff9d3a'); texto('STBY 109.30', 300, 648, 16, '#ff9d3a');
  perilla(56, 631, 24); perilla(462, 631, 24);
  // transponder
  unidad(702, 90); c.fillStyle = '#090c0f'; c.fillRect(120, 716, 190, 60); texto('7000', 140, 746, 32, '#ff9d3a'); texto('ALT', 265, 746, 16, '#ff9d3a');
  for (let i = 0; i < 4; i++) boton(330 + i * 36, 724, 28, 44, String(i)); perilla(60, 746, 24); texto('IDENT', 450, 746, 12, '#ccc', 'center');
  // placas de abajo
  unidad(808, 196); const pl = ['ADF', 'DME', 'COM1', 'COM2', 'ATC', 'FAN', 'INT'];
  pl.forEach((t, i) => { c.fillStyle = '#d7c79a'; c.fillRect(300, 826 + i * 25, 70, 18); texto(t, 335, 835 + i * 25, 11, '#222', 'center'); c.fillStyle = '#111'; c.beginPath(); c.arc(260, 835 + i * 25, 6, 0, 7); c.fill(); });
  texto('AURAV', 120, 900, 14, '#8a8a8a', 'center');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const g = new THREE.Group(); g.name = 'radios';
  const caja = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.34, 0.2), new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.7 }));
  caja.position.z = -0.1; g.add(caja);
  const cara = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.34), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  cara.position.z = 0.002; g.add(cara);
  return g;
}
