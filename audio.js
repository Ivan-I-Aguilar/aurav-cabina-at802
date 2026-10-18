// Sonido sintetizado (sin archivos): motor PT6 (silbido de turbina + hélice), alarma de fuego, bocina de pérdida y voz.
export class Audio {
  constructor() { this.ctx = null; this.vozOn = true; }
  iniciar() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }   /* el Quest suspende el audio al entrar en VR: reanudar en cada gesto */ const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = 0.6; this.master.connect(C.destination);
    // turbina: ruido filtrado + tono agudo
    const buf = C.createBuffer(1, C.sampleRate * 2, C.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ruido = C.createBufferSource(); this.ruido.buffer = buf; this.ruido.loop = true;
    this.filtro = C.createBiquadFilter(); this.filtro.type = 'bandpass'; this.filtro.Q.value = 1.2; this.filtro.frequency.value = 600;
    this.gRuido = C.createGain(); this.gRuido.gain.value = 0; this.ruido.connect(this.filtro).connect(this.gRuido).connect(this.master); this.ruido.start();
    this.silbido = C.createOscillator(); this.silbido.type = 'sine'; this.silbido.frequency.value = 2000; this.gSilb = C.createGain(); this.gSilb.gain.value = 0; this.silbido.connect(this.gSilb).connect(this.master); this.silbido.start();
    // hélice: zumbido grave con batido de palas
    this.helice = C.createOscillator(); this.helice.type = 'sawtooth'; this.helice.frequency.value = 60; this.fHel = C.createBiquadFilter(); this.fHel.type = 'lowpass'; this.fHel.frequency.value = 300;
    this.gHel = C.createGain(); this.gHel.gain.value = 0; this.helice.connect(this.fHel).connect(this.gHel).connect(this.master); this.helice.start();
    // alarmas
    this.gAlarma = C.createGain(); this.gAlarma.gain.value = 0; this.alarma = C.createOscillator(); this.alarma.type = 'square'; this.alarma.frequency.value = 880; this.alarma.connect(this.gAlarma).connect(this.master); this.alarma.start();
    this.gBocina = C.createGain(); this.gBocina.gain.value = 0; this.bocina = C.createOscillator(); this.bocina.type = 'sawtooth'; this.bocina.frequency.value = 420; this.bocina.connect(this.gBocina).connect(this.master); this.bocina.start();
    this.t = 0; if (C.state !== 'running') C.resume();
  }
  // ng 0..100, rpm hélice, encendido, fuego, perdida (aviso), dt
  actualizar(dt, { ng = 0, rpm = 0, fuego = false, bocina = false, dentro = true }) {
    if (!this.ctx) return; const C = this.ctx, now = C.currentTime; this.t += dt;
    const k = dentro ? 0.6 : 1;
    this.gRuido.gain.setTargetAtTime(0.25 * k * Math.min(1, ng / 60), now, 0.2); this.filtro.frequency.setTargetAtTime(300 + ng * 12, now, 0.2);
    this.gSilb.gain.setTargetAtTime(0.03 * k * Math.max(0, (ng - 40) / 60), now, 0.3); this.silbido.frequency.setTargetAtTime(1200 + ng * 14, now, 0.3);
    const fh = Math.max(0, rpm / 60 * 5 / 2);   // 5 palas → frecuencia de paso de pala
    this.gHel.gain.setTargetAtTime(0.35 * k * Math.min(1, rpm / 800), now, 0.2); this.helice.frequency.setTargetAtTime(Math.max(20, fh), now, 0.2);
    this.gAlarma.gain.setTargetAtTime(fuego ? (Math.floor(this.t * 6) % 2 ? 0.12 : 0) : 0, now, 0.01);
    this.gBocina.gain.setTargetAtTime(bocina ? (Math.floor(this.t * 3) % 2 ? 0.15 : 0.05) : 0, now, 0.02);
  }
  golpe() { if (!this.ctx) return; const C = this.ctx; const o = C.createOscillator(); const g = C.createGain(); o.type = 'triangle'; o.frequency.value = 90; g.gain.setValueAtTime(0.8, C.currentTime); g.gain.exponentialRampToValueAtTime(0.001, C.currentTime + 0.6); o.connect(g).connect(this.master); o.start(); o.stop(C.currentTime + 0.6); }
  decir(texto) {
    if (!this.vozOn || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(texto); u.lang = 'es-AR'; u.rate = 1.05;
    const v = speechSynthesis.getVoices().find(v => /es[-_](AR|MX|US|419)/i.test(v.lang)) || speechSynthesis.getVoices().find(v => v.lang.startsWith('es')); if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
}
