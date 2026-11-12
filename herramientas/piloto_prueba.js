// Piloto de prueba del nivel 2 (12/11): vuela la misión de incendio solo, desde la consola del navegador, para probar el nivel sin casco
// ni manos (PLAN_JUEGO.md, J2). Mueve las palancas y las llaves de la cabina nueva como las movería el alumno (quedan en el registro
// igual que un toque real) y lleva el bastón con el piloto automático de prueba de main.js (window.__auto). No toca la misión.
// Uso, con el nivel 2 ya empezado (la pantalla de inicio pasada):
//   const ap = await (await import('./herramientas/piloto_prueba.js?v=' + Date.now())).volarNivel2({ vel: 3 });
//   ap.estado()   → fase del piloto, posición, altura, rumbo, velocidad, el paso del checklist y lo anotado;   ap.parar()
// Opciones: vel (factor de __vel), modo 'salvo' | 'gate' (cómo larga), aglDescarga (ft) y vDescarga (mph) de la pasada, desvio (m: cuánto
// se corre del foco, para probar una descarga lejos), alturaCrucero (ft), aterrizar: false (después de largar se queda en crucero).
export function volarNivel2(o = {}) {
  const V = window.__vuelo, M = window.__mision, C = window.__controles, I = window.__incendio;
  if (!V || !M || !C) throw new Error('faltan los ganchos __vuelo / __mision / __controles (main.js)');
  const op = { vel: 3, modo: 'salvo', aglDescarga: 150, vDescarga: 120, desvio: 0, alturaCrucero: 1000, aterrizar: true, ...o };
  const log = [], anotar = t => { log.push(`${(M.t || 0).toFixed(0)} s · ${t}`); console.log('[piloto]', log[log.length - 1]); };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), wrap = a => ((a + 180) % 360 + 360) % 360 - 180;
  const rumbo = () => ((90 - V.euler.rumbo * 180 / Math.PI) % 360 + 360) % 360;
  const rumboA = p => ((Math.atan2(p.x - V.pos.x, -(p.z - V.pos.z)) * 180 / Math.PI) % 360 + 360) % 360;
  const dist = p => Math.hypot(p.x - V.pos.x, p.z - V.pos.z);
  /* la cabina: palancas por ángulo (adelante = −0,9), llaves por estado; todo pasa por alCambiar para que quede en el registro */
  const lev = (n, ang) => { const p = C.palancas.find(x => x.nombre === n); if (!p || Math.abs(p.ang - ang) < 1e-3) return; p.ang = ang; C._aplicarPalanca(p); C.alCambiar?.(n, ang); };
  const sw = n => C.switches.find(x => x.nombre === n);
  const poner = (n, estado) => { const s = sw(n); if (!s || s.estado === estado) return; s.estado = estado; C._aplicarSwitch(s); C.alCambiar?.(n, estado); };
  const tocar = n => { const s = sw(n); if (s) C.alternar(s); };
  const flapsA = f => { if (Math.abs(V.mando.flaps - f) > 0.01) tocar('swFLAPS'); };   /* cicla 0 → 10° → 20° → 0: un toque por tic hasta llegar */
  let teclaAbajo = null; const tecla = k => { if (k === teclaAbajo) return; if (teclaAbajo) dispatchEvent(new KeyboardEvent('keyup', { key: teclaAbajo })); if (k) dispatchEvent(new KeyboardEvent('keydown', { key: k })); teclaAbajo = k; };
  /* leyes de control: rumbo → alabeo; altura sobre el terreno (ft) y variómetro → cabeceo; velocidad (mph) → potencia */
  let iV = 0;
  const terreno = (x, z) => M.obtener.terreno(x, z);
  const aglAdelante = () => {   /* altura sobre lo más alto del terreno en los próximos 700 m de la trayectoria (ft): no chocar la loma de adelante */
    let mx = terreno(V.pos.x, V.pos.z); const vh = Math.max(1, Math.hypot(V.vel.x, V.vel.z));
    for (let s = 100; s <= 700; s += 100) mx = Math.max(mx, terreno(V.pos.x + V.vel.x * s / vh, V.pos.z + V.vel.z * s / vh));
    return (V.pos.y - mx) * 3.281;
  };
  const volar = (hdg, altFt, vMph, cabMax = 10, alabMax = 25, cabMin = -6, potMax = 1, vyCmd = null) => {
    const alabeo = clamp(wrap(hdg - rumbo()) * 1.2, -alabMax, alabMax);
    /* en ruta: altura sobre lo más alto de adelante; en la final (vyCmd): el variómetro que lleva al punto de toque */
    const cabeceo = vyCmd == null ? clamp(2 + (altFt - aglAdelante()) * 0.02 - V.vel.y * 1.5, cabMin, cabMax) : clamp(2 + (vyCmd - V.vel.y) * 4, cabMin, cabMax);
    iV = clamp(iV + (vMph - V.vIAS) * 0.0006, -0.3, 0.3);
    const pot = clamp(0.45 + (vMph - V.vIAS) * 0.02 + cabeceo * 0.035 + iV, 0, potMax);
    lev('levPOT', 0.15 - 1.05 * pot); window.__auto = { cabeceo, alabeo };
  };
  const e = M.escenario, foco0 = I?.pos ? { x: I.pos.x, z: I.pos.z } : null;
  const foco = foco0 && op.desvio ? { x: foco0.x + op.desvio, z: foco0.z } : foco0;   /* el blanco del piloto (corrido si se pide fallar) */
  /* circuito de vuelta: tramo con el viento al este de la pista (x 1080, hacia el norte) hasta la altura de APROX, viraje de 180° a la
     izquierda (radio ≈ 525 m a 25° y 110 mph: termina justo en el eje) y final a la 18 bajando por el valle del norte; toque pasado el umbral */
  const VIENTO1 = { x: 1080, z: -1500 }, VIENTO2 = { x: 1080, z: -3700 }, APROX = { x: 30, z: -3700 }, TOQUE = { x: 30, z: -950 };   /* el tramo con el viento va sobre lomas: se llega alto a la final, por eso es larga (2,7 km) */
  const pesado = (3200 + (e?.carga ?? V.agua)) * 2.20462 > 12500;
  const crucero = foco0 ? clamp(Math.hypot(foco0.x - 30, foco0.z - 100) * 0.14, 500, op.alturaCrucero) : op.alturaCrucero;   /* con el foco cerca no da para subir a 1000 ft y volver a bajar */
  let fase = 'orden', dPrev = Infinity, tDescarga = null, reloj;
  const paso = () => M.pasos?.[M.i]?.texto || '(terminado)';
  const tic = () => {
    try {
      if (M.fase === 'resultado' || V.estrellado) { anotar(V.estrellado ? 'ACCIDENTE' : 'misión cerrada: ' + paso()); return parar(); }
      if (fase === 'orden') { if ((M.t || 0) > 7) { fase = 'config'; anotar('orden recibida; configuro'); } return; }
      if (fase === 'config') {   /* una cosa por tic, en el orden del checklist */
        if (M.lev('levHEL') < 0.8) return lev('levHEL', -0.9);
        if (M.lev('levCOND') < 0.8) return lev('levCOND', -0.9);
        if (!sw('swFRDS')?.estado) return poner('swFRDS', true);
        if (!sw('swARMED')?.estado) return poner('swARMED', true);
        if (M.frds && e && M.frds.cobertura !== e.cobertura) { const s = sw('swFRDS_COV'); if (s && !s.estado) poner('swFRDS_COV', M.frds.cobertura > e.cobertura ? -1 : 1); return; }
        if (Math.abs(V.mando.flaps - (pesado ? 0.5 : 0)) > 0.01) return flapsA(pesado ? 0.5 : 0);
        fase = 'despegue'; anotar(`listo: flaps ${V.mando.flaps}, cobertura ${M.frds?.cobertura}; potencia`); return;
      }
      if (fase === 'despegue') {
        lev('levPOT', -0.9);
        const err = wrap(360 - rumbo()) + clamp((30 - V.pos.x) * 0.3, -8, 8); tecla(err > 1 ? 'd' : err < -1 ? 'a' : null);   /* pedales por teclado */
        window.__auto = V.vIAS > 92 ? { cabeceo: 9, alabeo: 0 } : null;
        if (!V.enTierra && M.alt > 60) { tecla(null); fase = 'ida'; anotar(`en el aire, rotó a ${M.vRot?.toFixed(0)} mph, desvío máx. ${M.maxDesvio?.toFixed(1)} m`); }
        return;
      }
      if (fase === 'ida') {
        if (!foco) { fase = 'crucero'; return; }
        const d = dist(foco), cerca = d < 900 + (crucero - op.aglDescarga) * 3.3;   /* bajar a unos 5 m/s a 120 mph: 3,3 m por cada ft */
        if (M.alt > 300) flapsA(0);
        volar(rumboA(foco), cerca ? op.aglDescarga : crucero, cerca ? op.vDescarga : 130, 10, 25, -8);
        const tc = Math.sqrt(2 * Math.max(5, M.alt / 3.281) / 9.8), lead = V.vIAS * 0.447 * tc + 40;   /* el agua cae tc segundos: se larga lead metros antes */
        if (cerca && d < lead && d <= dPrev) { tocar(op.modo === 'gate' ? 'swFRDS_GATE' : 'swSALVO'); tDescarga = M.t; fase = 'largando'; anotar(`${op.modo.toUpperCase()} a ${d.toFixed(0)} m del foco, ${M.alt.toFixed(0)} ft, ${V.vIAS.toFixed(0)} mph`); }
        dPrev = d; return;
      }
      if (fase === 'largando') {   /* sigue derecho y nivelado hasta que la misión evaluó la descarga */
        volar(rumboA({ x: V.pos.x + V.vel.x * 100, z: V.pos.z + V.vel.z * 100 }), op.aglDescarga, op.vDescarga);
        if (M.descargas?.length || M.t - tDescarga > 20) { anotar('descarga evaluada: ' + JSON.stringify(M.descargas?.[M.descargas.length - 1] || null)); fase = op.aterrizar ? 'vuelta' : 'crucero'; }
        return;
      }
      if (fase === 'crucero') { volar(rumboA(VIENTO1), crucero, 130); return; }
      if (fase === 'vuelta') {   /* al punto de entrada del tramo con el viento, bajando a 600 ft */
        volar(rumboA(VIENTO1), 600, 130);
        if (dist(VIENTO1) < 400) { fase = 'viento'; anotar(`tramo con el viento: ${M.alt.toFixed(0)} ft`); }
        return;
      }
      if (fase === 'viento') {   /* hacia el norte sobre x 1080 hasta la altura del punto de aproximación */
        volar(360 - clamp((V.pos.x - VIENTO2.x) * 0.08 + V.vel.x * 0.8, -30, 30), 500, 110);   /* al este del tramo, rumbo menor (hacia el oeste) */
        if (V.pos.z < VIENTO2.z) { fase = 'viraje'; anotar(`viraje a final: ${M.alt.toFixed(0)} ft, x ${V.pos.x.toFixed(0)}`); }
        return;
      }
      if (fase === 'viraje') {   /* 180° a la izquierda con 25°: termina sobre el eje con rumbo 180 */
        volar(wrap(rumbo() - 40) , 450, 105, 6, 25);
        if (Math.abs(wrap(180 - rumbo())) < 25) { fase = 'final'; anotar(`final: ${M.alt.toFixed(0)} ft, x ${V.pos.x.toFixed(0)}, a ${dist(TOQUE).toFixed(0)} m del toque`); }
        return;
      }
      if (fase === 'final') {
        const hdg = 180 + clamp((V.pos.x - 30) * 0.08 + V.vel.x * 0.8, -30, 30);   /* eje de pista: al este del eje, más rumbo (hacia el oeste) */
        if (V.vIAS < 112) flapsA(1);
        const dT = Math.max(150, TOQUE.z - 200 - V.pos.z), vh = Math.max(20, Math.hypot(V.vel.x, V.vel.z));   /* se apunta 200 m antes del toque: el flare lo corre */
        const vyCmd = clamp(-(M.alt / 3.281) * vh / dT, -7, -0.5);   /* el descenso que llega justo al punto de toque (3° si viene bien; más si viene alto) */
        if (vyCmd < -3 && iV > 0) iV = 0;
        volar(hdg, 0, 100, V.vIAS < 92 ? 2 : 6, 20, V.vIAS > 110 ? -1 : -9, V.vIAS < 95 ? 1 : clamp(0.6 + (vyCmd + 2.3) * 0.15, 0.05, 0.6), vyCmd);   /* alto: potencia afuera y nariz abajo, sin pasar de 110 mph (flota y se va larga) ni bajar de 95 (se cae) */
        if (M.alt < 25) { fase = 'flare'; anotar(`flare a ${V.vIAS.toFixed(0)} mph, x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)}`); }
        else if ((V.pos.z > -1150 && M.alt > 250) || V.pos.z > 0 || Math.abs(V.pos.x - 30) > 400) { fase = 'vuelta'; flapsA(0); anotar(`motor y al aire: final mal armada (x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)}, ${M.alt.toFixed(0)} ft); otro circuito`); }
        return;
      }
      if (fase === 'flare') {   /* motor al ralentí y el descenso a −0,8 m/s hasta tocar (con la nariz fija flotaba 800 m y se iba de pista) */
        const vyCmd = M.alt > 12 ? -1.5 : -0.8; window.__auto = { cabeceo: clamp(3 + (vyCmd - V.vel.y) * 4, -2, 9), alabeo: clamp(wrap(180 - rumbo()) * 1.2, -5, 5) }; lev('levPOT', 0.15);
        if (V.enTierra) { fase = 'tierra'; tecla('b'); window.__auto = null; anotar(`toque: x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)}, ${V.vIAS.toFixed(0)} mph`); }
        return;
      }
      if (fase === 'tierra') { if (V.vIAS < 3) { tecla(null); anotar('detenido'); parar(); } return; }
    } catch (err) { anotar('ERROR ' + err.message); parar(); }
  };
  const parar = () => { clearInterval(reloj); tecla(null); window.__auto = null; fase = 'parado'; };
  const estado = () => ({ fase, t: +(M.t || 0).toFixed(0), pos: [V.pos.x, V.pos.y, V.pos.z].map(n => +n.toFixed(0)), agl: +M.alt.toFixed(0), rumbo: +rumbo().toFixed(0), ias: +V.vIAS.toFixed(0), vy: +V.vel.y.toFixed(1),
    agua: +V.agua.toFixed(0), flaps: V.mando.flaps, paso: paso(), dFoco: foco ? +dist(foco).toFixed(0) : null, descargas: M.descargas, misionFase: M.fase, log: log.slice(-6) });
  window.__vel = op.vel; reloj = setInterval(tic, 100); anotar(`piloto de prueba: ${op.modo}, vel ×${op.vel}, foco ${foco ? `${foco.x.toFixed(0)}, ${foco.z.toFixed(0)}` : 'no hay'}`);
  return { estado, parar, log };
}
