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
  let iV = 0, mira = 1000, errFijo = null;   /* mira: cuántos metros de terreno adelante se tienen en cuenta; errFijo: error de altura (ft) dado desde afuera (la pasada, referida a la cota del foco) */
  const terreno = (x, z) => M.obtener.terreno(x, z);
  const aglAdelante = () => {   /* altura sobre lo más alto del terreno en los próximos 700 m de la trayectoria (ft): no chocar la loma de adelante */
    let mx = terreno(V.pos.x, V.pos.z); const vh = Math.max(1, Math.hypot(V.vel.x, V.vel.z));
    for (let s = 100; s <= mira; s += 100) mx = Math.max(mx, terreno(V.pos.x + V.vel.x * s / vh, V.pos.z + V.vel.z * s / vh));
    return (V.pos.y - mx) * 3.281;
  };
  const volar = (hdg, altFt, vMph, cabMax = 10, alabMax = 25, cabMin = -6, potMax = 1, vyCmd = null) => {
    const alabeo = clamp(wrap(hdg - rumbo()) * 1.2, -alabMax, alabMax);
    /* en ruta: altura sobre lo más alto de adelante; en la final (vyCmd): el variómetro que lleva al punto de toque */
    const err = vyCmd != null ? 0 : errFijo != null ? errFijo : altFt - aglAdelante();   /* por debajo de lo pedido (loma adelante) reacciona el doble */
    const cabeceo = vyCmd == null ? clamp(2 + err * (err > 0 || errFijo != null ? 0.04 : 0.02) - V.vel.y * 1.5, cabMin, cabMax) : clamp(2 + (vyCmd - V.vel.y) * 4, cabMin, cabMax);
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
  let fase = 'orden', dPrev = Infinity, tDescarga = null, reloj, flareHdg = 180;
  const paso = () => M.pasos?.[M.i]?.texto || '(terminado)';
  /* ---- nivel 3: las emergencias. El piloto hace lo que dice el checklist de cada una (como lo haría el alumno) y, sin motor, planea al
     punto más cercano del valle de la pista y aterriza de frente. compuerta y generador no cortan la misión: resuelve y sigue. ---- */
  let emFase = null, emT = 0, emPaso = 0;
  const planear = (vObj = 105, rumboFijo = null) => {   /* sin motor: nariz por velocidad, rumbo al valle (o el fijo que se pida), flare a 25 ft */
    lev('levPOT', 0.15);
    const px = clamp(V.pos.x, -250, 300), pz = clamp(V.pos.z, -4200, 500), dentro = px === V.pos.x && pz === V.pos.z;
    const hdg = rumboFijo != null ? rumboFijo : dentro ? rumbo() : rumboA({ x: px + (px - V.pos.x) * 0.3, z: pz + (pz - V.pos.z) * 0.3 });
    if (M.alt < 25) { if (fase !== 'flare') { fase = 'flare'; flareHdg = rumbo(); anotar(`flare forzoso a ${V.vIAS.toFixed(0)} mph, x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)}`); } const vyCmd = M.alt > 12 ? -1.5 : -0.8; window.__auto = { cabeceo: clamp(3 + (vyCmd - V.vel.y) * 4, -2, 9), alabeo: clamp(wrap(flareHdg - rumbo()) * 1.2, -5, 5) }; return; }
    window.__auto = { cabeceo: clamp(-3 + (V.vIAS - vObj) * 0.25, -12, 4), alabeo: clamp(wrap(hdg - rumbo()) * 1.2, -20, 20) };
  };
  const manejarEmergencia = () => {   /* true: la emergencia lleva el avión; false: la misión sigue y el piloto también */
    const m = V.motor, tE = (M.registro?.t ?? 0) - emT;
    if (emFase === 'compuerta') { if (V.agua > 0 && V.largando == null) lev('levEDUMP', -0.9); return false; }
    if (emFase === 'generador') { if (emPaso === 0) { poner('swGEN', false); emPaso = 1; } else if (emPaso === 1) { poner('swGEN', true); emPaso = 2; anotar(`GEN reset (${m.fallaGen ? 'no volvió' : 'volvió'})`); } return false; }
    if (V.enTierra && emPaso > 0) { if (fase !== 'tierra') { fase = 'tierra'; tecla('b'); window.__auto = null; anotar(`toque forzoso: x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)}, ${V.vIAS.toFixed(0)} mph`); } return false; }
    if (emFase === 'fuego') {   /* ralentí, corte, FUEL OFF, carga, bandera; después planeo al valle */
      if (emPaso === 0) { lev('levPOT', 0.15); emPaso = 1; } else if (emPaso === 1) { lev('levCOND', 0.1); emPaso = 2; } else if (emPaso === 2) { poner('swFUEL', 0); emPaso = 3; }
      else if (emPaso === 3) { lev('levEDUMP', -0.9); emPaso = 4; } else if (emPaso === 4) { lev('levHEL', 0.1); emPaso = 5; }
      if (M.alt < 80) lev('levCOND', 0.1); if (M.alt < 40) poner('swBATT', false); if (emPaso >= 5 && V.vIAS < 112) flapsA(1);
      planear(); return true;
    }
    if (emFase === 'fallaDespegue') {   /* nariz abajo, carga afuera, de frente, flaps, corte y batería antes de tocar */
      if (emPaso === 0) { lev('levEDUMP', -0.9); lev('levPOT', 0.15); emPaso = 1; } if (V.vIAS < 112) flapsA(1); if (M.alt < 80) lev('levCOND', 0.1); if (M.alt < 40) poner('swBATT', false);
      planear(100, 360); return true;   /* de frente por el eje de la pista: el valle sigue 3 km al norte */
    }
    if (emFase === 'falla') {   /* planeo, carga, bandera, rearranque (corte → Ng < 30 → ignición y start → condición); si no arranca, forzoso */
      if (emPaso === 0) { lev('levEDUMP', -0.9); lev('levPOT', 0.15); emPaso = 1; } else if (emPaso === 1) { lev('levHEL', 0.1); emPaso = 2; } else if (emPaso === 2) { lev('levCOND', 0.1); emPaso = 3; }
      else if (emPaso === 3 && m.ng < 30) { poner('swIGN', 1); poner('swSTART', true); emPaso = 4; anotar(`rearranque a ${M.alt.toFixed(0)} ft: ignición y start`); }
      else if (emPaso === 4 && m.ng > 13) { lev('levCOND', -0.9); emPaso = 5; }
      else if (emPaso === 5 && m.encendido) { lev('levHEL', -0.9); poner('swIGN', 0); emPaso = 6; anotar('motor en marcha de nuevo'); }
      if (emPaso >= 6 && m.encendido) { volar(rumbo(), 800, 120); return M.fase !== 'mision'; }   /* trepa hasta que la misión se retoma; entonces el piloto sigue con lo suyo */
      if (M.fase === 'forzoso' || (emPaso >= 4 && tE > 40 && !m.encendido)) { if (M.alt < 80) lev('levCOND', 0.1); if (M.alt < 40) poner('swBATT', false); if (V.vIAS < 112) flapsA(1); }
      planear(); return true;
    }
    return false;
  };
  const tic = () => {
    try {
      if (M.fase === 'resultado' || V.estrellado) { anotar(V.estrellado ? 'ACCIDENTE' : 'misión cerrada: ' + paso()); return parar(); }
      const E = M.emergencia;
      if (op.emergencias !== false && E && E.estado === 'disparada') {
        if (!emFase) { emFase = E.tipo; emT = M.registro?.t ?? 0; emPaso = 0; anotar(`EMERGENCIA: ${E.tipo} (misión en fase ${M.fase}, ${M.alt.toFixed(0)} ft, x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)})`); }
        if (manejarEmergencia()) return;
      } else if (emFase && E && E.estado === 'resuelta') { anotar('emergencia resuelta: ' + emFase + '; sigue la misión'); emFase = null; }
      if (fase === 'tierra') { if (V.vIAS < 3) { tecla(null); anotar('detenido'); parar(); } return; }
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
        if (op.abortarConSenales && V.enTierra && V.vIAS > 40 && V.motor.oilp < 80) { lev('levPOT', 0.15); tecla('b'); fase = 'tierra'; anotar(`aborta el despegue: aceite ${V.motor.oilp.toFixed(0)} psi a ${V.vIAS.toFixed(0)} mph`); return; }   /* nivel 3: leyó las señales */
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
        const altObj = d < 800 ? op.aglDescarga : cerca ? Math.max(op.aglDescarga, 300) : crucero;   /* la pasada baja a 150 ft recién en los últimos 800 m: antes, 300 sobre las lomas */
        /* la pasada (últimos 1700 m): la altura se refiere a la COTA DEL FOCO (150 ft por encima de donde va a caer el agua), con un piso de
           20 m sobre lo más alto de los próximos 400 m, y se lleva con el variómetro (hasta −6 m/s y los últimos metros de a poco): con
           «altura sobre lo más alto de adelante» y la ley de cabeceo por error de altura, llegaba 15 a 45 m alto y largaba fuera de la ventana */
        let vyPasada = null;
        if (d < 1700 && I?.pos) { mira = 400; const piso = V.pos.y - aglAdelante() / 3.281 + 20, yObj = Math.max(I.pos.y + op.aglDescarga / 3.281, piso); vyPasada = clamp((yObj - V.pos.y) * 0.25, -6, 4); }
        else mira = 1000;
        volar(rumboA(foco), altObj, cerca || vyPasada != null ? op.vDescarga : 130, 10, 25, -9, 1, vyPasada);
        const tc = Math.sqrt(2 * Math.max(5, I?.pos ? V.pos.y - I.pos.y : M.alt / 3.281) / 9.8), lead = V.vIAS * 0.447 * tc + 40;   /* el agua cae tc segundos (desde la altura sobre el foco): se larga lead metros antes */
        if (cerca && d < lead && d <= dPrev) { tocar(op.modo === 'gate' ? 'swFRDS_GATE' : 'swSALVO'); tDescarga = M.t; fase = 'largando'; anotar(`${op.modo.toUpperCase()} a ${d.toFixed(0)} m del foco, ${M.alt.toFixed(0)} ft, ${V.vIAS.toFixed(0)} mph`); }
        dPrev = d; return;
      }
      if (fase === 'largando') {   /* sigue derecho y nivelado hasta que la misión evaluó la descarga */
        volar(rumboA({ x: V.pos.x + V.vel.x * 100, z: V.pos.z + V.vel.z * 100 }), op.aglDescarga, op.vDescarga);
        mira = 1000; errFijo = null; if (M.descargas?.length || M.t - tDescarga > 20) { anotar('descarga evaluada: ' + JSON.stringify(M.descargas?.[M.descargas.length - 1] || null)); fase = op.aterrizar ? 'vuelta' : 'crucero'; }
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
        const dT = Math.max(150, TOQUE.z - 350 - V.pos.z), vh = Math.max(20, Math.hypot(V.vel.x, V.vel.z));   /* se apunta 350 m antes del toque (pasado el umbral norte): el flare flota unos 600 m */
        const vyCmd = clamp(-(M.alt / 3.281) * vh / dT, -7, -0.5);   /* el descenso que llega justo al punto de toque (3° si viene bien; más si viene alto) */
        if (vyCmd < -3 && iV > 0) iV = 0;
        volar(hdg, 0, 100, V.vIAS < 92 ? 2 : 6, 20, V.vIAS > 110 ? -1 : -9, V.vIAS < 95 ? 1 : clamp(0.6 + (vyCmd + 2.3) * 0.15, 0.05, 0.6), vyCmd);   /* alto: potencia afuera y nariz abajo, sin pasar de 110 mph (flota y se va larga) ni bajar de 95 (se cae) */
        if (M.alt < 18) { fase = 'flare'; flareHdg = 180; anotar(`flare a ${V.vIAS.toFixed(0)} mph, x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)}`); }
        else if ((V.pos.z > -1150 && M.alt > 250) || V.pos.z > 0 || Math.abs(V.pos.x - 30) > 400) { fase = 'vuelta'; flapsA(0); anotar(`motor y al aire: final mal armada (x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)}, ${M.alt.toFixed(0)} ft); otro circuito`); }
        return;
      }
      if (fase === 'flare') {   /* motor al ralentí y el descenso a −0,8 m/s hasta tocar (con la nariz fija flotaba 800 m y se iba de pista) */
        const vyCmd = M.alt > 8 ? -2 : -1; window.__auto = { cabeceo: clamp(3 + (vyCmd - V.vel.y) * 4, -2, 9), alabeo: clamp(wrap(flareHdg - rumbo()) * 1.2, -5, 5) }; lev('levPOT', 0.15);
        if (V.enTierra) { fase = 'tierra'; tecla('b'); window.__auto = null; anotar(`toque: x ${V.pos.x.toFixed(0)}, z ${V.pos.z.toFixed(0)}, ${V.vIAS.toFixed(0)} mph`); }
        return;
      }
    } catch (err) { anotar('ERROR ' + err.message); parar(); }
  };
  const parar = () => { clearInterval(reloj); tecla(null); window.__auto = null; fase = 'parado'; };
  const estado = () => ({ fase, t: +(M.t || 0).toFixed(0), pos: [V.pos.x, V.pos.y, V.pos.z].map(n => +n.toFixed(0)), agl: +M.alt.toFixed(0), rumbo: +rumbo().toFixed(0), ias: +V.vIAS.toFixed(0), vy: +V.vel.y.toFixed(1),
    agua: +V.agua.toFixed(0), flaps: V.mando.flaps, paso: paso(), dFoco: foco ? +dist(foco).toFixed(0) : null, descargas: M.descargas, misionFase: M.fase, emergencia: M.emergencia && { tipo: M.emergencia.tipo, estado: M.emergencia.estado, piloto: emFase, paso: emPaso }, motor: { enc: V.motor.encendido, ng: +V.motor.ng.toFixed(0), fuego: V.motor.fuego, gen: V.motor.generador, fallaGen: V.motor.fallaGen }, log: log.slice(-6) });
  window.__vel = op.vel; reloj = setInterval(tic, 100); anotar(`piloto de prueba: ${op.modo}, vel ×${op.vel}, foco ${foco ? `${foco.x.toFixed(0)}, ${foco.z.toFixed(0)}` : 'no hay'}`);
  return { estado, parar, log };
}
