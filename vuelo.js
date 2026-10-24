// Modelo de vuelo simplificado del AT-802 (PT6A-67AG, 1350 shp). Unidades SI adentro; los instrumentos
// reciben mph / pies / fpm. Cifras de referencia del avión (a validar con el POH de AAXOD):
//   peso vacío ~6.500 lb, MTOW 16.000 lb, tolva 800 gal (~3.100 L), S = 37,25 m², b = 18 m,
//   Vr ~85 mph cargado, ascenso 110 mph, crucero 170 mph, Vne 220 mph, pérdida ~90 mph cargado / 75 vacío,
//   torque máx 100 %, ITT máx continua 800 °C, Ng 101 %, hélice 1700 rpm.
// Marco del avión: +x adelante (nariz), +y arriba, +z derecha. Posición en metros sobre el mundo del escenario.
import * as THREE from './three.module.js';

const G = 9.81, RHO = 1.2;
const S = 37.25, AR = 8.7, E_OSW = 0.75;
const M_VACIO = 3200;          // kg: célula + piloto + combustible típico (~7.000 lb)
const AGUA_MAX = 3100;         // kg (800 gal)
const P_MAX = 1007e3;          // W (1350 shp)
const T_ESTATICO = 19500;      // N a punto fijo con potencia máxima (hélice de 2,9 m)
export const MPH = 2.23694, FT = 3.28084, FPM = 196.85;

export class Vuelo {
  constructor() {
    this.pos = new THREE.Vector3(0, 0, 0);         // referencia: tren en el piso cuando pos.y = 0
    this.vel = new THREE.Vector3();                // m/s, mundo
    this.q = new THREE.Quaternion();               // actitud (marco avión → mundo)
    this.w = new THREE.Vector3();                  // velocidades angulares (rad/s) en marco avión: x alabeo, y guiñada, z cabeceo
    this.agua = 2400;                              // kg en la tolva
    this.enTierra = true; this.rumboInicial = 0;
    // mandos (0..1 ó −1..1)
    this.mando = { cabeceo: 0, alabeo: 0, pedal: 0, potencia: 0, helice: 1, condicion: 0, flaps: 0, frenos: 0 };
    // motor
    this.motor = { encendido: false, ng: 0, torque: 0, itt: 15, rpmHel: 0, ff: 0, oilp: 0, oilt: 20, falla: false, fuego: false, arrancador: false, ignicion: false, combustible: true, bateria: false, generador: false };
    this.alfa = 0; this.vIAS = 0; this.vs = 0; this.g = 1; this.perdida = false; this.estrellado = false;
    this.tiempo = 0; this.eventos = [];
  }
  get masa() { return M_VACIO + this.agua; }
  // orientación → cabeceo, alabeo, rumbo (rad)
  get euler() { const e = new THREE.Euler().setFromQuaternion(this.q, 'YZX'); return { rumbo: e.y, cabeceo: e.z, alabeo: e.x };   /* alabeo > 0 = ala derecha abajo */ }
  largarCarga(emergencia = true) { this.largando = emergencia ? 1.5 : 8; }   // segundos para vaciar

  pasoMotor(dt) {
    const m = this.motor, c = this.mando;
    // batería / generador alimentan los instrumentos eléctricos
    m.volt = m.generador && m.ng > 50 ? 28 : m.bateria ? 24 : 0;
    // arranque: con batería, arrancador sube Ng; con combustible (condición adelante) e ignición, enciende a Ng > 12 %
    const girandoArrancador = m.arrancador && m.bateria && !m.falla && !m.encendido;
    if (girandoArrancador) m.ng = Math.min(m.ng + dt * 3, 25);
    const combustible = c.condicion > 0.3 && m.combustible && !m.cortado && !m.extintor;   /* el switch FIRE cierra el combustible */
    if (!m.encendido && combustible && m.ignicion && m.ng > 12 && !m.falla) { m.encendido = true; this.evento('motor-encendido'); }
    if (m.encendido && (!combustible || m.falla)) { m.encendido = false; this.evento('motor-apagado'); }
    // Ng objetivo según potencia; torque sigue a Ng
    const ngObj = m.encendido ? 60 + 41 * c.potencia : 0;
    if (m.encendido) m.ng += (ngObj - m.ng) * Math.min(1, dt / 1.6);
    else if (!girandoArrancador) m.ng = Math.max(0, m.ng - dt * 3);   /* sin arrancador ni motor, se frena solo */
    // fuego: se apaga a los 5 s de cortar combustible (condición a corte + FIRE) con potencia a ralentí; si dura 45 s, es fatal
    if (m.fuego) {
      const cortado = !m.encendido && m.extintor && c.condicion < 0.1 && c.potencia < 0.15;
      m.tApagando = cortado ? (m.tApagando || 0) + dt : 0;
      if (m.tApagando > 5) { m.fuego = false; this.evento('fuego-extinguido'); }
      else if (this.tiempoFuego > 45 && !m.fuegoFatal) { m.fuegoFatal = true; this.evento('fuego-incontrolado'); }
    }
    const torqueObj = m.encendido ? Math.max(0, (m.ng - 58) / 43) * 100 * (m.fuego ? Math.max(0.3, 1 - this.tiempoFuego * 0.05) : 1) : 0;
    m.torque += (torqueObj - m.torque) * Math.min(1, dt / 1.2);
    // ITT: sube con torque; en el arranque pico breve; con fuego se dispara
    const ittObj = m.encendido ? 420 + 3.8 * m.torque + (m.fuego ? 300 : 0) : (m.arrancador && m.ng > 8 ? 200 : 15);
    m.itt += (ittObj - m.itt) * Math.min(1, dt / (m.encendido ? 2.5 : 6));
    if (m.encendido && this.arranqueReciente > 0) { m.itt = Math.max(m.itt, 700 - (3 - this.arranqueReciente) * 80); }
    this.arranqueReciente = m.encendido ? Math.max(0, (this.arranqueReciente ?? 3) - dt) : 3;
    // hélice: palanca adelante 1700 rpm, atrás bandera; sin motor queda en molinete salvo bandera
    const rpmObj = c.helice < 0.15 ? 0 : (m.encendido ? 1000 + 700 * Math.min(1, m.ng / 85) * c.helice : Math.min(1400, this.vIAS * 9) * c.helice);
    m.rpmHel += (rpmObj - m.rpmHel) * Math.min(1, dt / 2);
    m.ff = m.encendido ? 90 + 5 * m.torque : 0;
    m.oilp += ((m.ng > 20 ? 95 : 0) - m.oilp) * Math.min(1, dt / 2); m.oilt += ((m.encendido ? 75 : 20) - m.oilt) * Math.min(1, dt / 30);
    if (m.fuego) this.tiempoFuego = (this.tiempoFuego || 0) + dt;
    // empuje: potencia de eje por rendimiento de hélice, limitado a punto fijo; en bandera o apagado, nada
    const pot = P_MAX * m.torque / 100 * Math.min(1, m.rpmHel / 1500);
    const v = Math.max(this.vel.length(), 1);
    this.empuje = c.helice < 0.15 ? 0 : Math.min(T_ESTATICO * m.torque / 100, 0.82 * pot / v);
  }

  paso(dt) {
    if (this.estrellado) return;
    this.tiempo += dt; const c = this.mando, m = this.motor;
    this.pasoMotor(dt);
    if (this.largando > 0 && this.agua > 0) { this.agua = Math.max(0, this.agua - AGUA_MAX / this.largando * dt); if (this.agua === 0) this.evento('tolva-vacia'); }
    // velocidad en marco avión
    const qi = this.q.clone().invert(); const vb = this.vel.clone().applyQuaternion(qi);
    const V = vb.length(); const alfa = V > 2 ? Math.atan2(-vb.y, vb.x) : 0; this.alfa = alfa;
    const beta = V > 2 ? Math.asin(THREE.MathUtils.clamp(vb.z / V, -1, 1)) : 0;
    // aerodinámica
    const flaps = c.flaps;   // 0..1 (0 / 10° / 20°)
    const alfaPerdida = THREE.MathUtils.degToRad(15 + 2 * flaps);
    let CL = 0.4 + 5.5 * alfa + 0.5 * flaps;
    this.perdida = alfa > alfaPerdida && V > 15;
    if (this.perdida) CL = Math.max(0.6, 1.9 - (alfa - alfaPerdida) * 3);
    CL = THREE.MathUtils.clamp(CL, -0.8, 2.0);
    const CD = 0.045 + CL * CL / (Math.PI * E_OSW * AR) + 0.03 * flaps + (m.rpmHel > 300 && !m.encendido && c.helice >= 0.15 ? 0.02 : 0) + (this.perdida ? 0.05 : 0);
    const qd = 0.5 * RHO * V * V;
    const L = qd * S * CL, D = qd * S * CD, Y = -qd * S * 0.4 * beta;
    // fuerzas en marco avión: sustentación ⟂ viento, resistencia ∥
    const ca = Math.cos(alfa), sa = Math.sin(alfa);
    const F = new THREE.Vector3(this.empuje - D * ca + L * sa, L * ca + D * sa, Y);
    // momentos → velocidades angulares (modelo de respuesta de primer orden, estable)
    const eficacia = THREE.MathUtils.clamp(V / 40, 0, 1);
    const wCab = (c.cabeceo * 1.5 - (alfa - 0.05) * 2.2) * eficacia;            // mando atrás = cabeceo arriba; estabilidad en alfa
    const wAla = (c.alabeo * 2.2 - this.w.x * 1.5) * eficacia;
    const wGui = (c.pedal * 0.8 - beta * 2.5) * eficacia;
    this.w.z += (wCab - this.w.z) * Math.min(1, dt * 3);
    this.w.x += wAla * dt * 3;
    this.w.y += (wGui - this.w.y) * Math.min(1, dt * 3);
    // viraje coordinado: la sustentación inclinada genera guiñada
    const eu = this.euler;
    if (!this.enTierra) this.w.y += -Math.sin(eu.alabeo) * G / Math.max(V, 20) * dt * 1.0;
    // tierra
    const aMundo = F.clone().applyQuaternion(this.q).divideScalar(this.masa); aMundo.y -= G;
    const suelo = this.suelo ? this.suelo(this.pos.x, this.pos.z) : 0;
    if (this.pos.y <= suelo + 0.001) {
      if (!this.enTierra) {   // toma de contacto (si estuvo realmente en el aire)
        const vv = -this.vel.y, bank = Math.abs(eu.alabeo);
        if (this.tiempoAire > 1.5) this.evento('contacto', { vv, bank, v: this.vIAS });
        if (vv > 3.5 || bank > 0.25 || suelo > 3) { this.estrellado = true; this.evento('accidente', { vv, bank, v: this.vIAS, terreno: suelo > 3 }); return; }
        this.enTierra = true;
      }
      this.pos.y = suelo; if (this.vel.y < 0) this.vel.y = 0;
      // sobre el piso: normal, rodadura, frenos, dirección con pedales; actitud de 3 puntos (cola baja) a baja velocidad
      if (aMundo.y < 0) aMundo.y = 0;
      const vh = Math.hypot(this.vel.x, this.vel.z);
      const fren = (0.03 + 0.45 * c.frenos) * G; if (vh > 0.1) { const k = Math.min(fren * dt, vh) / vh; this.vel.x -= this.vel.x * k; this.vel.z -= this.vel.z * k; }
      const cabTierra = THREE.MathUtils.degToRad(7.2) * THREE.MathUtils.clamp(1 - (vh - 20) / 15, 0, 1);   // actitud de 3 puntos del tren de fábrica (24/10); levanta la cola al acelerar
      const obj = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, eu.rumbo, cabTierra, 'YZX'));
      const rotando = c.cabeceo > 0.1 && vh > 28 && eu.cabeceo < THREE.MathUtils.degToRad(13);   // con velocidad, el timón de profundidad levanta la nariz
      if (!rotando && !(L > this.masa * G * 0.95)) { this.q.slerp(obj, Math.min(1, dt * 3)); this.w.set(0, 0, 0); }
      else { this.w.x = 0; this.w.y = 0; }
      // dirección: pedales giran el rumbo; la velocidad sigue al morro
      const dRumbo = -c.pedal * 1.2 * THREE.MathUtils.clamp(vh / 8, 0, 1) * dt; if (dRumbo) this.q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dRumbo));
      const fw = new THREE.Vector3(1, 0, 0).applyQuaternion(this.q); fw.y = 0; fw.normalize(); const vhv = new THREE.Vector3(this.vel.x, 0, this.vel.z); const vmag = vhv.length();
      vhv.lerp(fw.multiplyScalar(vmag), Math.min(1, dt * 4)); this.vel.x = vhv.x; this.vel.z = vhv.z;
      if (L > this.masa * G * 1.03 && c.cabeceo > 0.05) { this.enTierra = false; this.tiempoAire = 0; this.pos.y = 0.02; this.vel.y = Math.max(this.vel.y, 0.3); this.evento('despegue', { v: this.vIAS }); }
    } else { this.enTierra = false; this.tiempoAire = (this.tiempoAire || 0) + dt; }
    this.vel.addScaledVector(aMundo, dt);
    this.pos.addScaledVector(this.vel, dt);
    // integrar actitud
    if (!this.enTierra || this.vel.length() > 15) {
      const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.w.x * dt, this.w.y * dt, this.w.z * dt, 'XYZ'));
      this.q.multiply(dq).normalize();
    }
    if (this.pos.y < suelo) this.pos.y = suelo;
    this.vIAS = V * MPH; this.vs = this.vel.y * FPM; this.g = (L * ca) / (this.masa * G) || 1;
    if (this.vIAS > 230 && !this.avisoVne) { this.avisoVne = true; this.evento('vne'); }
  }
  evento(tipo, datos = {}) { this.eventos.push({ tipo, t: this.tiempo, ...datos }); this.alEvento?.(tipo, datos); }
  // valores para el panel
  lecturas(qnhAlt = 0) {
    const m = this.motor, e = this.euler;
    return { asi: this.vIAS, alt: this.pos.y * FT + qnhAlt, vsi: this.vs, torque: m.torque, itt: m.itt, prop: m.rpmHel, ng: m.ng, ff: m.ff,
      oilp: m.oilp, oilt: m.oilt, volt: m.volt, amp: m.volt > 0 ? 40 + (m.encendido ? 0 : 120 * (m.arrancador ? 1 : 0.2)) : 0, hyd: m.ng > 30 ? 2000 : 0, fuelp: m.encendido || m.bombaCombustible ? 25 : 0, suction: m.ng > 30 ? 5 : 0,
      cabeceo: e.cabeceo, alabeo: e.alabeo };
  }
}
