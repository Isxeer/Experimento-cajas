/* =========================================================
   Juego de las Cajas de Inversión — lógica del experimento
   ========================================================= */
(() => {
  'use strict';

  // ---------- Parámetros del experimento (editar aquí) ----------
  const CONFIG = {
    puntajeInicial: 50,
    totalRondas: 15,
    rondasFase1: 3,

    // Fase 1: ganancias "normales" (ambos grupos)
    gananciaNormalMin: 3,
    gananciaNormalMax: 6,

    // Fase 1: Grupo Experimental
    expRonda1Azul: 15,        // Ronda 1: Caja Azul da ganancia alta
    expRonda2Perdida: -30,    // Ronda 2: Caja Azul da pérdida masiva + estímulo aversivo
    // Ronda 2 con elección forzada a Caja Azul. Se aplica a AMBOS grupos para que
    // la única diferencia entre ellos sea el resultado (pérdida + estímulo).
    forzarAzulRonda2: true,

    // Fase 2 (rondas 4-15): reglas informadas
    azulProbGanar: 0.7,
    azulGanancia: 10,
    azulPerdida: -5,
    rojaProbGanar: 0.9,
    rojaGanancia: 4,
    rojaPerdida: -1,

    // Anti doble clic / tiempos de interfaz
    pausaAntesDeRondaMs: 700,   // cajas bloqueadas antes de habilitarse
    bloqueoBotonSiguienteMs: 450,
    duracionAversivoMs: 2600,
    lecturaMinimaTransicionSeg: 10,

    // CSV (punto y coma + coma decimal = abre bien en Excel en español)
    csvSeparador: ';',
    csvDecimal: ',',
    claveAlmacenamiento: 'cajasInversion_sesiones_v1',

    // Envío automático a Google Apps Script al terminar
    urlServidor: 'https://script.google.com/macros/s/AKfycbyBI0klOw2Kh1yU1iXbeKv3GoU40EDcT6ji1ZDPiQVTeAdylfk5T-ahEkEHqpemZy1z/exec',
  };

  // ---------- Utilidades ----------
  const $ = (id) => document.getElementById(id);

  function aleatorio() {
    // Uniforme en [0, 1) con generador criptográfico
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  const entero = (min, max) => min + Math.floor(aleatorio() * (max - min + 1));
  const fase = (r) => (r <= CONFIG.rondasFase1 ? 1 : 2);
  const esForzada = (r) => CONFIG.forzarAzulRonda2 && r === 2;
  const conSigno = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  const promedio = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach((p) => p.classList.toggle('activa', p.id === id));
    window.scrollTo(0, 0);
  }

  // ---------- Estado ----------
  const estado = {
    id: '',
    grupo: '',
    fecha: '',
    puntaje: 0,
    ronda: 0,
    registros: [],
    bloqueado: true,
    tInicio: 0,
    pulsacion: null,   // { caja, t } capturado en pointerdown para mayor precisión
    enCurso: false,
    audio: null,
    resumen: null,
  };

  const cajaAzul = $('caja-azul');
  const cajaRoja = $('caja-roja');
  const btnSiguiente = $('btn-siguiente');

  // =========================================================
  // 1. INICIO
  // =========================================================
  $('txt-puntaje-inicial').textContent = CONFIG.puntajeInicial;

  function validarInicio() {
    $('btn-comenzar').disabled = !($('input-id').value.trim() && $('chk-consentimiento').checked);
  }
  $('input-id').addEventListener('input', validarInicio);
  $('chk-consentimiento').addEventListener('change', validarInicio);

  // Panel oculto del docente: 5 toques rápidos en el título o Ctrl+Shift+G
  let toques = 0;
  let ultimoToque = 0;
  $('titulo').addEventListener('click', () => {
    const ahora = Date.now();
    toques = ahora - ultimoToque < 800 ? toques + 1 : 1;
    ultimoToque = ahora;
    if (toques >= 5) { toques = 0; alternarAdmin(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g' && $('pantalla-inicio').classList.contains('activa')) {
      e.preventDefault();
      alternarAdmin();
    }
  });
  function alternarAdmin() {
    $('panel-admin').hidden = !$('panel-admin').hidden;
    actualizarContadorGuardadas();
  }

  function resolverGrupo() {
    const sel = $('sel-grupo').value;
    const url = (new URLSearchParams(location.search).get('grupo') || '').toLowerCase();
    let g;
    if (sel === 'control' || sel === 'experimental') g = sel;
    else if (url === 'control' || url === 'experimental') g = url;
    else g = aleatorio() < 0.5 ? 'control' : 'experimental';
    return g === 'control' ? 'Control' : 'Experimental';
  }

  $('form-inicio').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = $('btn-comenzar');
    if (btn.disabled) return;
    btn.disabled = true;

    iniciarAudio(); // requiere gesto del usuario (políticas de autoplay)

    estado.id = $('input-id').value.trim().slice(0, 40);
    estado.grupo = resolverGrupo();
    estado.fecha = new Date().toISOString();
    estado.puntaje = CONFIG.puntajeInicial;
    estado.registros = [];
    estado.ronda = 1;
    estado.enCurso = true;
    estado.resumen = null;

    mostrarPantalla('pantalla-juego');
    iniciarRonda();
  });

  // Advertencia si intentan recargar o cerrar a mitad del experimento
  window.addEventListener('beforeunload', (e) => {
    if (estado.enCurso) { e.preventDefault(); e.returnValue = ''; }
  });

  // =========================================================
  // AUDIO (Web Audio API, sin archivos externos)
  // =========================================================
  function iniciarAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!estado.audio) estado.audio = new AC();
      const ctx = estado.audio;
      // Buffer silencioso para "desbloquear" el audio en iOS/Android
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      if (ctx.state === 'suspended') ctx.resume();
    } catch (_) { /* sin audio */ }
  }

  function sonarBuzzer() {
    const ctx = estado.audio;
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime + 0.03;

      const maestro = ctx.createGain();
      maestro.gain.value = 0.45;
      const compresor = ctx.createDynamicsCompressor();
      maestro.connect(compresor);
      compresor.connect(ctx.destination);

      // Tres pulsos de buzzer: ondas cuadradas desafinadas (batido áspero) + armónico sierra
      const pulsos = [[0, 0.42], [0.55, 0.42], [1.1, 1.0]];
      const voces = [
        { f: 98, tipo: 'square', vol: 0.5 },
        { f: 104, tipo: 'square', vol: 0.5 },
        { f: 196, tipo: 'sawtooth', vol: 0.3 },
      ];
      for (const [ini, dur] of pulsos) {
        for (const v of voces) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = v.tipo;
          o.frequency.setValueAtTime(v.f, t0 + ini);
          g.gain.setValueAtTime(0, t0 + ini);
          g.gain.linearRampToValueAtTime(v.vol, t0 + ini + 0.012);
          g.gain.setValueAtTime(v.vol, t0 + ini + dur - 0.04);
          g.gain.linearRampToValueAtTime(0, t0 + ini + dur);
          o.connect(g);
          g.connect(maestro);
          o.start(t0 + ini);
          o.stop(t0 + ini + dur + 0.02);
        }
      }
    } catch (_) { /* sin audio */ }
  }

  function estimuloAversivo(puntos) {
    return new Promise((resolve) => {
      const alerta = $('alerta');
      $('alerta-puntos').textContent = conSigno(puntos) + ' PUNTOS';
      alerta.classList.remove('oculto', 'activa');
      alerta.setAttribute('aria-hidden', 'false');
      void alerta.offsetWidth; // reinicia la animación
      alerta.classList.add('activa');
      document.body.classList.add('sacudir');
      sonarBuzzer();
      if (navigator.vibrate) { try { navigator.vibrate([400, 150, 400, 150, 900]); } catch (_) {} }

      setTimeout(() => {
        alerta.classList.remove('activa');
        alerta.classList.add('oculto');
        alerta.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('sacudir');
        resolve();
      }, CONFIG.duracionAversivoMs);
    });
  }

  // =========================================================
  // 2 y 4. RONDAS
  // =========================================================
  function actualizarHUD() {
    const r = estado.ronda;
    $('hud-ronda').textContent = r;
    $('hud-fase').textContent = fase(r) === 1 ? 'Fase 1' : 'Fase 2';
    $('hud-puntaje').textContent = estado.puntaje;
    $('barra-progreso').style.width = ((r - 1) / CONFIG.totalRondas) * 100 + '%';
  }

  function iniciarRonda() {
    const r = estado.ronda;
    estado.bloqueado = true;
    estado.pulsacion = null;

    actualizarHUD();
    $('resultado').classList.add('oculto');
    $('reglas-f2').hidden = fase(r) !== 2;

    for (const b of [cajaAzul, cajaRoja]) {
      b.disabled = true;
      b.classList.remove('elegida', 'descartada', 'temblor');
    }

    const estadoTxt = $('estado');
    estadoTxt.classList.remove('listo');
    estadoTxt.textContent = 'Preparando ronda…';

    setTimeout(() => {
      // En la ronda forzada la Caja Roja se ve normal, pero elegir() la ignora y la hace temblar
      cajaAzul.disabled = false;
      cajaRoja.disabled = false;
      estadoTxt.textContent = 'Elige una caja';
      estadoTxt.classList.add('listo');
      // Doble rAF: el cronómetro parte cuando las cajas ya están pintadas en pantalla
      requestAnimationFrame(() => requestAnimationFrame(() => {
        estado.tInicio = performance.now();
        estado.bloqueado = false;
      }));
    }, CONFIG.pausaAntesDeRondaMs);
  }

  // pointerdown: captura el instante exacto del toque (más preciso que click).
  // click: confirma la elección (evita elegir por accidente al hacer scroll en celular).
  for (const b of [cajaAzul, cajaRoja]) {
    b.addEventListener('pointerdown', () => {
      if (!estado.bloqueado && !b.disabled && !cajaNoElegible(b.dataset.caja)) {
        estado.pulsacion = { caja: b.dataset.caja, t: performance.now() };
      }
    });
    b.addEventListener('click', () => elegir(b.dataset.caja));
  }

  function calcularResultado(r, caja) {
    if (fase(r) === 1) {
      if (estado.grupo === 'Experimental') {
        if (r === 1 && caja === 'Azul') return { puntos: CONFIG.expRonda1Azul, aversivo: false };
        if (r === 2 && caja === 'Azul') return { puntos: CONFIG.expRonda2Perdida, aversivo: true };
      }
      return { puntos: entero(CONFIG.gananciaNormalMin, CONFIG.gananciaNormalMax), aversivo: false };
    }
    if (caja === 'Roja') {
      return {
        puntos: aleatorio() < CONFIG.rojaProbGanar ? CONFIG.rojaGanancia : CONFIG.rojaPerdida,
        aversivo: false,
      };
    }
    return {
      puntos: aleatorio() < CONFIG.azulProbGanar ? CONFIG.azulGanancia : CONFIG.azulPerdida,
      aversivo: false,
    };
  }

  const cajaNoElegible = (caja) => caja === 'Roja' && esForzada(estado.ronda);

  function temblar(boton) {
    boton.classList.remove('temblor');
    void boton.offsetWidth; // reinicia la animación si se vuelve a tocar
    boton.classList.add('temblor');
  }
  cajaRoja.addEventListener('animationend', () => cajaRoja.classList.remove('temblor'));

  async function elegir(caja) {
    if (estado.bloqueado) return;
    if (cajaNoElegible(caja)) { temblar(cajaRoja); return; }
    estado.bloqueado = true; // bloquea inmediatamente cualquier segundo clic

    const ahora = performance.now();
    const p = estado.pulsacion;
    const tFin = p && p.caja === caja && p.t >= estado.tInicio ? p.t : ahora;
    const tr = Math.max(0, (tFin - estado.tInicio) / 1000);

    cajaAzul.disabled = true;
    cajaRoja.disabled = true;
    const elegida = caja === 'Azul' ? cajaAzul : cajaRoja;
    const otra = caja === 'Azul' ? cajaRoja : cajaAzul;
    elegida.classList.add('elegida');
    otra.classList.add('descartada');
    $('estado').classList.remove('listo');
    $('estado').textContent = 'Abriendo la ' + (caja === 'Azul' ? 'Caja Azul' : 'Caja Roja') + '…';

    const r = estado.ronda;
    const { puntos, aversivo } = calcularResultado(r, caja);
    estado.puntaje += puntos;

    estado.registros.push({
      ronda: r,
      fase: fase(r),
      caja,
      puntos,
      acumulado: estado.puntaje,
      tr,
      forzada: esForzada(r),
    });

    if (aversivo) {
      await estimuloAversivo(puntos);
    } else {
      await new Promise((res) => setTimeout(res, 350));
    }
    mostrarResultado(caja, puntos);
    if (puntos < 0 && !aversivo) destelloPerdida();
  }

  // Destello rojo translúcido para hacer más visible cualquier pérdida de puntos
  const flashPerdida = $('flash-perdida');
  function destelloPerdida() {
    flashPerdida.classList.remove('activa');
    void flashPerdida.offsetWidth; // reinicia la animación
    flashPerdida.classList.add('activa');
  }
  flashPerdida.addEventListener('animationend', () => flashPerdida.classList.remove('activa'));

  function mostrarResultado(caja, puntos) {
    const r = estado.ronda;
    $('hud-puntaje').textContent = estado.puntaje;
    $('estado').textContent = '';

    $('resultado-texto').textContent = 'Elegiste la ' + (caja === 'Azul' ? 'Caja Azul' : 'Caja Roja');
    const elPuntos = $('resultado-puntos');
    elPuntos.textContent = conSigno(puntos) + ' puntos';
    elPuntos.className = 'resultado-puntos ' + (puntos >= 0 ? 'pos' : 'neg');

    btnSiguiente.textContent =
      r === CONFIG.totalRondas ? 'Ver resultados'
        : r === CONFIG.rondasFase1 ? 'Continuar'
          : 'Siguiente ronda';
    btnSiguiente.disabled = true;
    $('resultado').classList.remove('oculto');

    // Pequeña espera antes de habilitar para evitar doble clic accidental
    setTimeout(() => { btnSiguiente.disabled = false; }, CONFIG.bloqueoBotonSiguienteMs);
  }

  btnSiguiente.addEventListener('click', () => {
    if (btnSiguiente.disabled) return;
    btnSiguiente.disabled = true;

    if (estado.ronda === CONFIG.totalRondas) {
      finalizar();
    } else if (estado.ronda === CONFIG.rondasFase1) {
      iniciarTransicion();
    } else {
      estado.ronda += 1;
      iniciarRonda();
    }
  });

  // =========================================================
  // 3. TRANSICIÓN
  // =========================================================
  let temporizadorTransicion = null;

  function iniciarTransicion() {
    const chk = $('chk-leido');
    const btn = $('btn-fase2');
    chk.checked = false;
    chk.disabled = true;
    btn.disabled = true;
    let restante = CONFIG.lecturaMinimaTransicionSeg;
    btn.innerHTML = 'Lee con atención… <span id="txt-cuenta">' + restante + '</span>';

    mostrarPantalla('pantalla-transicion');

    clearInterval(temporizadorTransicion);
    temporizadorTransicion = setInterval(() => {
      restante -= 1;
      if (restante > 0) {
        $('txt-cuenta').textContent = restante;
      } else {
        clearInterval(temporizadorTransicion);
        chk.disabled = false;
        btn.textContent = 'Comenzar Fase 2';
        btn.disabled = !chk.checked;
      }
    }, 1000);
  }

  $('chk-leido').addEventListener('change', (e) => {
    $('btn-fase2').disabled = !e.target.checked;
  });

  $('btn-fase2').addEventListener('click', () => {
    const btn = $('btn-fase2');
    if (btn.disabled) return;
    btn.disabled = true;
    estado.ronda = CONFIG.rondasFase1 + 1;
    mostrarPantalla('pantalla-juego');
    iniciarRonda();
  });

  // =========================================================
  // 5. FINAL
  // =========================================================
  function calcularResumen(registros) {
    const f2 = registros.filter((x) => x.fase === 2);
    const azules = f2.filter((x) => x.caja === 'Azul').length;
    const ultimo = registros[registros.length - 1];
    return {
      puntajeFinal: ultimo ? ultimo.acumulado : CONFIG.puntajeInicial,
      pctAzulF2: f2.length ? (azules / f2.length) * 100 : 0,
      trPromF2: promedio(f2.map((x) => x.tr)),
    };
  }

  const DEBRIEF_COMUN = `
    <p>Este juego no buscaba medir qué tan bueno eres invirtiendo. El objetivo real era estudiar
    <b>cómo una experiencia negativa del pasado puede influir en nuestras decisiones futuras</b>, incluso
    cuando sabemos que las reglas cambiaron.</p>
    <p>En la Fase 2 la elección matemáticamente más conveniente era la <b>Caja Azul</b>: su valor esperado es
    0,7 × 10 + 0,3 × (−5) = <b>5,5 puntos por ronda</b>, frente a 0,9 × 4 + 0,1 × (−1) = <b>3,5 puntos</b>
    de la Caja Roja. Aun así, muchas personas prefieren la opción que casi nunca pierde. Esto se relaciona con la <b>aversión a la pérdida</b>
    y con el <b>condicionamiento aversivo</b>, en el que participan estructuras cerebrales como la
    <b>amígdala</b> (asociada al miedo) y la <b>corteza prefrontal</b> (asociada al razonamiento y la planificación).</p>`;

  const DEBRIEF_EXPERIMENTAL = `
    <p>Tú formaste parte del <b>Grupo Experimental</b>. <b>La pérdida de −30 puntos en la Ronda 2 fue programada
    intencionalmente</b>, al igual que la alarma, el sonido y el parpadeo rojo. No fue un error tuyo ni del sistema:
    ocurría siempre, sin importar lo que hicieras. Lo usamos para crear un "recuerdo negativo" asociado a la Caja Azul
    y comparar tus decisiones posteriores con las del Grupo Control, que no vivió ese evento.</p>`;

  const DEBRIEF_CONTROL = `
    <p>Tú formaste parte del <b>Grupo Control</b>: en tus primeras rondas ambas cajas daban ganancias normales.
    Otras personas (Grupo Experimental) vivieron en la Ronda 2 una <b>pérdida de −30 puntos programada
    intencionalmente</b>, acompañada de una alarma y un parpadeo rojo. Comparar ambos grupos nos permite ver
    si ese evento cambia la forma de decidir cuando las reglas ya son otras.</p>`;

  const DEBRIEF_CIERRE = `
    <p>Tus datos son anónimos y solo se usarán con fines educativos. Si sentiste alguna incomodidad, es completamente
    normal: conversa con tu docente si lo necesitas. <b>Por favor, no le cuentes a tus compañeros el objetivo del
    juego</b> hasta que todos hayan participado, para no afectar los resultados.</p>`;

  // ---------- Envío al servidor (Google Apps Script) ----------
  function construirFilaResumen(res) {
    const elecciones = estado.registros
      .slice()
      .sort((a, b) => a.ronda - b.ronda)
      .map((x) => x.caja); // 15 elecciones, ronda 1 a 15
    const tiemposF2 = estado.registros
      .filter((x) => x.fase === 2)
      .sort((a, b) => a.ronda - b.ronda)
      .map((x) => x.tr.toFixed(3))
      .join(' | '); // 12 tiempos de la Fase 2
    return [
      estado.fecha,
      estado.id,
      estado.grupo,
      res.puntajeFinal,
      Number(res.pctAzulF2.toFixed(2)),
      Number(res.trPromF2.toFixed(3)),
      ...elecciones,
      tiemposF2,
    ];
  }

  async function enviarAlServidor(res) {
    const txt = $('estado-envio');
    const btnReintentar = $('btn-reintentar');
    btnReintentar.hidden = true;
    txt.className = 'estado-envio';
    txt.textContent = 'Guardando resultados en el servidor...';

    if (!navigator.onLine) {
      txt.className = 'estado-envio error';
      txt.textContent = '⚠️ Sin conexión a internet. Conéctate y reintenta, o descarga el CSV como respaldo.';
      btnReintentar.hidden = false;
      return;
    }

    try {
      // Petición "simple" (text/plain, sin preflight) en modo CORS para poder leer la respuesta.
      const resp = await fetch(CONFIG.urlServidor, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ filaResumen: construirFilaResumen(res) }),
      });
      if (resp.ok) {
        txt.className = 'estado-envio ok';
        txt.textContent = '✅ Resultados registrados correctamente';
      } else {
        txt.className = 'estado-envio error';
        txt.textContent = '⚠️ El servidor respondió con un error (' + resp.status + '). Reintenta o descarga el CSV como respaldo.';
        btnReintentar.hidden = false;
      }
    } catch (_) {
      // Con conexión, un fallo aquí suele ser que el servidor procesó el envío pero no permitió
      // leer la respuesta (CORS). No se ofrece reintentar para no duplicar la fila en la planilla.
      txt.className = 'estado-envio';
      txt.textContent = 'Resultados enviados, pero no se pudo confirmar su registro. Descarga el CSV como respaldo.';
    }
  }

  $('btn-reintentar').addEventListener('click', () => {
    if (estado.resumen) enviarAlServidor(estado.resumen);
  });

  function finalizar() {
    estado.enCurso = false;
    $('barra-progreso').style.width = '100%';
    const res = calcularResumen(estado.registros);
    estado.resumen = res;
    enviarAlServidor(res); // envío automático (no bloquea la pantalla final)

    $('m-puntaje').textContent = res.puntajeFinal;
    $('m-azul').textContent = res.pctAzulF2.toFixed(1).replace('.', ',') + '%';
    $('m-tr').textContent = res.trPromF2.toFixed(2).replace('.', ',') + ' s';
    $('m-id').textContent = estado.id;
    $('m-grupo').textContent = estado.grupo;
    $('debriefing').innerHTML =
      DEBRIEF_COMUN +
      (estado.grupo === 'Experimental' ? DEBRIEF_EXPERIMENTAL : DEBRIEF_CONTROL) +
      DEBRIEF_CIERRE;

    guardarSesion();
    $('btn-csv').disabled = false;
    mostrarPantalla('pantalla-final');
  }

  // =========================================================
  // CSV
  // =========================================================
  const COLUMNAS = [
    'ID', 'Grupo', 'Ronda', 'Fase', 'Caja Elegida', 'Puntos Obtenidos', 'Puntaje Acumulado',
    'Tiempo de Reaccion (s)', 'Eleccion Forzada', 'Pct Azul Fase 2', 'TR Promedio Fase 2 (s)', 'Fecha',
  ];

  function num(n, dec) {
    if (n === '' || n === null || n === undefined) return '';
    const s = typeof dec === 'number' ? Number(n).toFixed(dec) : String(n);
    return s.replace('.', CONFIG.csvDecimal);
  }

  function celda(v) {
    const s = String(v ?? '');
    return /["\n\r]/.test(s) || s.includes(CONFIG.csvSeparador) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function filasSesion(s) {
    const res = s.resumen || calcularResumen(s.registros);
    const filas = s.registros.map((x) => [
      s.id, s.grupo, x.ronda, x.fase, x.caja, num(x.puntos), num(x.acumulado),
      num(x.tr, 3), x.forzada ? 'Si' : 'No', '', '', s.fecha,
    ]);
    filas.push([
      s.id, s.grupo, 'RESUMEN', '', '',
      num(res.puntajeFinal - CONFIG.puntajeInicial), // puntos netos obtenidos en el juego
      num(res.puntajeFinal),                          // puntaje total final
      '',                                             // TR por ronda: no aplica en el resumen
      '', num(res.pctAzulF2, 2), num(res.trPromF2, 3), s.fecha,
    ]);
    return filas;
  }

  function construirCSV(sesiones) {
    const filas = [COLUMNAS];
    for (const s of sesiones) filas.push(...filasSesion(s));
    return filas.map((f) => f.map(celda).join(CONFIG.csvSeparador)).join('\r\n');
  }

  function descargar(nombre, texto) {
    const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const nombreSeguro = (s) => s.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'participante';
  const sello = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

  $('btn-csv').addEventListener('click', () => {
    const sesion = { id: estado.id, grupo: estado.grupo, fecha: estado.fecha, registros: estado.registros, resumen: estado.resumen };
    descargar(
      'cajas_' + nombreSeguro(estado.id) + '_' + estado.grupo + '_' + sello() + '.csv',
      construirCSV([sesion]),
    );
  });

  // ---------- Respaldo local (por si se olvida descargar) ----------
  function leerGuardadas() {
    try { return JSON.parse(localStorage.getItem(CONFIG.claveAlmacenamiento)) || []; } catch (_) { return []; }
  }
  function guardarSesion() {
    try {
      const todas = leerGuardadas();
      todas.push({ id: estado.id, grupo: estado.grupo, fecha: estado.fecha, registros: estado.registros, resumen: estado.resumen });
      localStorage.setItem(CONFIG.claveAlmacenamiento, JSON.stringify(todas));
    } catch (_) { /* almacenamiento no disponible */ }
  }
  function actualizarContadorGuardadas() {
    $('txt-guardadas').textContent = leerGuardadas().length;
  }

  $('btn-descargar-todo').addEventListener('click', () => {
    const todas = leerGuardadas();
    if (!todas.length) { alert('No hay sesiones guardadas en este dispositivo.'); return; }
    descargar('cajas_TODAS_' + sello() + '.csv', construirCSV(todas));
  });
  $('btn-borrar-todo').addEventListener('click', () => {
    if (!confirm('¿Borrar todas las sesiones guardadas en este dispositivo? Esta acción no se puede deshacer.')) return;
    try { localStorage.removeItem(CONFIG.claveAlmacenamiento); } catch (_) {}
    actualizarContadorGuardadas();
  });

  // ---------- Nuevo participante ----------
  $('btn-nuevo').addEventListener('click', () => {
    $('input-id').value = '';
    $('chk-consentimiento').checked = false;
    $('btn-comenzar').disabled = true;
    $('sel-grupo').value = 'aleatorio';
    $('panel-admin').hidden = true;
    $('barra-progreso').style.width = '0';
    mostrarPantalla('pantalla-inicio');
  });
})();
