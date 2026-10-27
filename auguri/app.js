/* Auguri KYRIOS — interfaccia, registrazione del video, condivisione. */
(function () {
  'use strict';
  var S = window.ScenaAuguri;
  var $ = function (id) { return document.getElementById(id); };
  var tela = $('tela'), ctx = tela.getContext('2d');
  var campoNome = $('nome'), campoFrase = $('frase'), campoFirma = $('firma');
  var FRASE_BASE = 'Auguri di un buon compleanno';
  var SFONDO_FIORI = 'img/sfondo-fiori.jpg'; // immagine di Gemini per lo stile «Fiori»
  var immagineFiori = null;
  var MUSICA = 'musica/musica.mp3';
  var CODA = 2;                // secondi dopo la fine della musica

  var stato = { pronto: false, musicaBuf: null, durata: 20, registrando: false, video: null, copertina: null, tipo: '', estensione: 'mp4', nomeFile: '', testoWa: '' };
  var IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* ---------- testo ---------- */
  var PICCOLE = { e: 1, ed: 1, di: 1, da: 1, del: 1, della: 1, la: 1, il: 1, lo: 1, a: 1 };
  function nomeBello(s) {
    s = (s || '').replace(/\s+/g, ' ').trim();
    return s.split(' ').map(function (p, i) {
      if (!p) return p;
      if (i > 0 && PICCOLE[p.toLowerCase()]) return p.toLowerCase();
      return p.charAt(0).toLocaleUpperCase('it') + p.slice(1);
    }).join(' ');
  }
  function nomePerFile(s) { return s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'Auguri'; }
  var stile = 'fiori';
  function applicaStile() { S.usaStile(stile === 'fiori' && immagineFiori ? 'fiori' : 'festa', immagineFiori); }
  function scegliStile(nuovo, silenzioso) {
    if (stato.registrando) return;
    stile = nuovo === 'fiori' && immagineFiori ? 'fiori' : 'festa';
    Array.prototype.forEach.call(document.querySelectorAll('[data-stile]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-stile') === stile ? 'true' : 'false'); });
    try { localStorage.setItem('auguri-stile', stile); } catch (e) {}
    if (!silenzioso) { applicaStile(); aggiornaAnteprima(); }
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-stile]'), function (b) { b.addEventListener('click', function () { scegliStile(b.getAttribute('data-stile')); }); });
  function opzioni(copertina) {
    var n = nomeBello(campoNome.value);
    return { nome: n || 'Nome', frase: (campoFrase.value.trim() || FRASE_BASE), firma: campoFirma.checked, durataMusica: stato.durata, copertina: copertina };
  }

  /* ---------- messaggi ---------- */
  function messaggio(testo, tipo) {
    var m = $('msg'); m.className = 'messaggio' + (testo ? ' mostra ' + (tipo || 'avviso') : ''); m.textContent = testo || '';
  }

  /* ---------- caricamento ---------- */
  function caricaImmagine(src) {
    return new Promise(function (ok) { if (!src) return ok(null); var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
  }
  function caricaFont() {
    var lista = [
      new FontFace('GreatVibesKY', 'url(font/GreatVibes-Regular.woff2)'),
      new FontFace('CormorantKY', 'url(font/CormorantGaramond-Italic-VF.woff2)', { style: 'italic', weight: '300 700' })
    ];
    return Promise.all(lista.map(function (f) { return f.load().then(function (ff) { document.fonts.add(ff); }).catch(function () {}); }));
  }
  function avvio() {
    $('crea').disabled = true;
    Promise.all([
      caricaFont(),
      caricaImmagine(SFONDO_FIORI),
      fetch(MUSICA).then(function (r) { if (!r.ok) throw new Error('musica'); return r.arrayBuffer(); }).catch(function () { return null; })
    ]).then(function (r) {
      stato.musicaBuf = r[2];
      immagineFiori = r[1];
      if (!immagineFiori) { var tf = document.querySelector('[data-stile=fiori]'); if (tf) tf.classList.add('nascosto'); scegliStile('festa', true); }
      try { var ss = localStorage.getItem('auguri-stile'); if (ss) scegliStile(ss, true); } catch (e) {}
      applicaStile();
      if (stato.musicaBuf) leggiDurata(stato.musicaBuf.slice(0));
      stato.pronto = true; $('crea').disabled = false;
      disegnaCopertina();
    });
  }
  function leggiDurata(buf) {
    try {
      var C = window.AudioContext || window.webkitAudioContext, c = new C();
      c.decodeAudioData(buf, function (b) { stato.durata = b.duration; c.close && c.close(); }, function () { c.close && c.close(); });
    } catch (e) { /* resta 20 s */ }
  }

  /* ---------- anteprima ---------- */
  var attesa = null;
  function disegnaCopertina() {
    if (!stato.pronto || stato.registrando) return;
    S.disegnaFotogramma(ctx, 0, opzioni(true));
  }
  function aggiornaAnteprima() {
    if (stato.video) mostraTela();
    clearTimeout(attesa); attesa = setTimeout(disegnaCopertina, 90);
  }
  campoNome.addEventListener('input', function () { messaggio(''); aggiornaAnteprima(); });
  campoFrase.addEventListener('input', aggiornaAnteprima);
  campoFirma.addEventListener('change', aggiornaAnteprima);
  [campoNome, campoFrase].forEach(function (c) { c.addEventListener('keydown', function (e) { if (e.key === 'Enter') c.blur(); }); });

  function mostraTela() {
    $('video').classList.add('nascosto'); $('video').pause && $('video').pause();
    tela.classList.remove('nascosto'); $('didascalia').textContent = 'Anteprima della copertina';
  }

  /* ---------- formato ---------- */
  var FORMATI = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  function scegliFormato(supporta) {
    supporta = supporta || function (t) { return window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); };
    for (var i = 0; i < FORMATI.length; i++) if (supporta(FORMATI[i])) return FORMATI[i];
    return '';
  }
  window.__scegliFormato = scegliFormato;

  /* ---------- creazione ---------- */
  var wakeLock = null;
  function creaVideo() {
    if (!stato.pronto || stato.registrando) return;
    var nomeScritto = campoNome.value.replace(/\s+/g, ' ').trim();
    if (!nomeScritto) { messaggio('Scrivi prima il nome, poi premi «Crea il video».', 'avviso'); campoNome.focus(); return; }
    if (!window.MediaRecorder || !tela.captureStream) {
      messaggio('Questo browser non sa creare video. Aggiorna Chrome oppure crea il video dal computer.', 'errore'); return;
    }
    if (!stato.musicaBuf) { messaggio('Non riesco a caricare la musica. Controlla la connessione e ricarica la pagina.', 'errore'); return; }

    // l'audio va avviato subito, dentro il tocco (serve per iPhone)
    var C = window.AudioContext || window.webkitAudioContext, actx = new C();
    if (actx.resume) actx.resume();
    // sblocco iOS: un suono muto
    try { var b0 = actx.createBuffer(1, 1, 22050), s0 = actx.createBufferSource(); s0.buffer = b0; s0.connect(actx.destination); s0.start(0); } catch (e) {}

    applicaStile();
    var op = opzioni(false);
    stato.registrando = true; stato.video = null;
    mostraTela();
    $('crea').disabled = true; $('risultato').classList.remove('mostra'); messaggio('');
    $('avanzamento').classList.add('mostra'); $('barra').style.width = '0%'; $('mancano').textContent = '';
    $('didascalia').textContent = 'Il video si sta registrando…';
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});

    stato.nomeFile = 'Auguri - ' + nomePerFile(nomeBello(nomeScritto));
    stato.testoWa = op.frase + ', ' + nomeScritto + '!';

    decodifica(actx, stato.musicaBuf.slice(0)).then(function (buf) {
      stato.durata = buf.duration; op.durataMusica = buf.duration;
      // copertina in PNG (stessa immagine del primo fotogramma)
      S.disegnaFotogramma(ctx, 0, opzioni(true));
      var copPromessa = new Promise(function (ok) { tela.toBlob(function (b) { ok(b); }, 'image/png'); });
      return copPromessa.then(function (cop) { stato.copertina = cop; return registra(actx, buf, op); });
    }).then(function (ris) {
      stato.video = ris.blob; stato.tipo = ris.tipo; stato.estensione = /mp4/.test(ris.tipo) ? 'mp4' : 'webm';
      fine(true);
      if (stato.estensione !== 'mp4') messaggio('Questo browser non sa fare l’MP4: aggiorna Chrome oppure crea il video dal computer. Il video si può salvare lo stesso, ma WhatsApp potrebbe non accettarlo.', 'avviso');
      else if (ris.blob.size > 10 * 1024 * 1024) messaggio('Il video pesa più di 10 MB: per lo stato di WhatsApp potrebbe essere troppo grande.', 'avviso');
    }).catch(function (e) {
      fine(false);
      messaggio(e && e.message === 'uscito' ? 'Sei uscito dalla pagina e il video si è interrotto. Premi di nuovo «Crea il video» e resta qui fino alla fine.'
        : 'Qualcosa non ha funzionato nella creazione del video. Riprova; se succede ancora, crea il video dal computer con Chrome.', 'errore');
      if (window.console && e && e.message !== 'uscito') console.warn(e);
    }).then(function () { try { actx.close(); } catch (e) {} });
  }

  function decodifica(actx, buf) {
    return new Promise(function (ok, ko) {
      var p = actx.decodeAudioData(buf, ok, ko);
      if (p && p.then) p.then(ok, ko);
    });
  }

  function registra(actx, buf, op) {
    return new Promise(function (ok, ko) {
      var T = buf.duration, D = T + CODA, tipo = scegliFormato();
      var flusso = tela.captureStream(30);
      var dest = actx.createMediaStreamDestination();
      var guadagno = actx.createGain(), src = actx.createBufferSource();
      src.buffer = buf; src.connect(guadagno); guadagno.connect(dest); guadagno.connect(actx.destination);
      var tracce = dest.stream.getAudioTracks(); if (tracce[0]) flusso.addTrack(tracce[0]);
      // bitrate calcolato per restare sotto 10 MB
      var vbps = Math.max(1500000, Math.min(5000000, Math.floor((9.4 * 1024 * 1024 * 8) / D - 128000)));
      var o = { videoBitsPerSecond: vbps, audioBitsPerSecond: 128000 }; if (tipo) o.mimeType = tipo;
      var rec;
      try { rec = new MediaRecorder(flusso, o); } catch (e) { try { rec = new MediaRecorder(flusso); } catch (e2) { return ko(e2); } }
      var pezzi = [], interrotto = false, t0 = 0, finito = false;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) pezzi.push(e.data); };
      rec.onerror = function (e) { if (!finito) { finito = true; ko(e.error || new Error('registrazione')); } };
      rec.onstop = function () {
        flusso.getTracks().forEach(function (tr) { tr.stop(); });
        document.removeEventListener('visibilitychange', sullaVisibilita);
        if (finito) return; finito = true;
        if (interrotto) return ko(new Error('uscito'));
        var t = rec.mimeType || tipo || (pezzi[0] && pezzi[0].type) || 'video/webm';
        ok({ blob: new Blob(pezzi, { type: t.split(';')[0] }), tipo: t });
      };
      function sullaVisibilita() { if (document.hidden && rec.state === 'recording') { interrotto = true; try { src.stop(); } catch (e) {} rec.stop(); } }
      document.addEventListener('visibilitychange', sullaVisibilita);

      // 1) la copertina completa è già sulla tela → 2) si avvia la registrazione → 3) parte l'animazione
      S.disegnaFotogramma(ctx, 0, op);
      rec.start(1000);
      t0 = actx.currentTime + 0.05;
      try { src.start(t0); } catch (e) { src.start(0); }
      guadagno.gain.setValueAtTime(1, t0 + Math.max(0, T - 1.5));
      guadagno.gain.linearRampToValueAtTime(0, t0 + T);
      var ultimoSec = -1;
      (function ciclo() {
        if (finito || interrotto) return;
        var t = Math.max(0, actx.currentTime - t0);
        S.disegnaFotogramma(ctx, t, op);
        $('barra').style.width = Math.min(100, t / D * 100).toFixed(1) + '%';
        var manca = Math.ceil(D - t);
        if (manca !== ultimoSec) { ultimoSec = manca; $('mancano').textContent = manca > 0 ? 'Mancano ' + manca + (manca === 1 ? ' secondo' : ' secondi') : 'Quasi pronto…'; }
        if (t >= D) { if (rec.state === 'recording') { rec.requestData && rec.requestData(); rec.stop(); } return; }
        requestAnimationFrame(ciclo);
      })();
    });
  }

  function fine(ok) {
    stato.registrando = false;
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
    $('crea').disabled = false; $('avanzamento').classList.remove('mostra');
    if (ok && stato.video) {
      var v = $('video'); if (v.src) URL.revokeObjectURL(v.src);
      v.src = URL.createObjectURL(stato.video); v.classList.remove('nascosto'); tela.classList.add('nascosto');
      $('didascalia').textContent = 'Il tuo video: premi ▶ per guardarlo';
      $('risultato').classList.add('mostra');
      setTimeout(function () { $('risultato').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    } else { mostraTela(); disegnaCopertina(); }
  }

  /* ---------- salva e condividi ---------- */
  function fileVideo() {
    var tipo = stato.estensione === 'mp4' ? 'video/mp4' : 'video/webm';
    return new File([stato.video], stato.nomeFile + '.' + stato.estensione, { type: tipo });
  }
  function scarica(blob, nome) {
    var a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = nome; a.rel = 'noopener'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 60000);
  }
  function puoCondividere(file) {
    try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] })); } catch (e) { return false; }
  }

  $('manda').addEventListener('click', function () {
    if (!stato.video) return;
    var f = fileVideo();
    if (puoCondividere(f)) {
      navigator.share({ files: [f], text: stato.testoWa }).then(function () {
        messaggio('Fatto! Se non hai visto WhatsApp nell’elenco, premi «Salva il video» e allegalo da WhatsApp.', 'ok');
      }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        // alcuni telefoni rifiutano file + testo insieme: riprovo solo col file
        navigator.share({ files: [f] }).catch(function (e2) { if (!e2 || e2.name !== 'AbortError') alComputer(f); });
      });
    } else alComputer(f);
  });
  function alComputer(f) {
    scarica(f, f.name);
    window.open('https://wa.me/?text=' + encodeURIComponent(stato.testoWa), '_blank', 'noopener');
    messaggio('Ho salvato il video nella cartella «Download». Si apre WhatsApp: scegli la persona, premi la graffetta e allega il file «' + f.name + '».', 'ok');
  }
  $('salvaVideo').addEventListener('click', function () {
    if (!stato.video) return;
    var f = fileVideo();
    if (IOS && puoCondividere(f)) {
      navigator.share({ files: [f] }).then(function () {}).catch(function (e) { if (!e || e.name !== 'AbortError') scarica(f, f.name); });
      messaggio('Nel menu che si apre scegli «Salva video»: lo trovi in Foto.', 'ok');
    } else { scarica(f, f.name); messaggio('Video salvato nella cartella «Download» con il nome «' + f.name + '».', 'ok'); }
  });
  $('salvaCopertina').addEventListener('click', function () {
    if (!stato.copertina) return;
    var nome = stato.nomeFile + ' - copertina.png', f = new File([stato.copertina], nome, { type: 'image/png' });
    if (IOS && puoCondividere(f)) {
      navigator.share({ files: [f] }).catch(function (e) { if (!e || e.name !== 'AbortError') scarica(f, nome); });
      messaggio('Nel menu che si apre scegli «Salva immagine»: la trovi in Foto.', 'ok');
    } else { scarica(f, nome); messaggio('Copertina salvata nella cartella «Download» con il nome «' + nome + '».', 'ok'); }
  });
  $('altro').addEventListener('click', function () {
    $('risultato').classList.remove('mostra'); messaggio(''); stato.video = null;
    campoNome.value = ''; mostraTela(); disegnaCopertina(); campoNome.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('crea').addEventListener('click', creaVideo);

  /* ---------- per le prove ---------- */
  window.__ultimoVideo = function () {
    if (!stato.video) return Promise.resolve(null);
    return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok({ tipo: stato.tipo, base64: String(r.result).split(',')[1] }); }; r.readAsDataURL(stato.video); });
  };
  window.__ultimaCopertina = function () {
    if (!stato.copertina) return Promise.resolve(null);
    return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1]); }; r.readAsDataURL(stato.copertina); });
  };
  window.__stato = stato;

  avvio();
})();
