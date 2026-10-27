/* Auguri KYRIOS — interfaccia, registrazione del video, condivisione. */
(function () {
  'use strict';
  var S = window.ScenaAuguri;
  var $ = function (id) { return document.getElementById(id); };
  var tela = $('tela'), ctx = tela.getContext('2d');
  var campoNome = $('nome'), campoFrase = $('frase'), campoFirma = $('firma'), campoLogo = $('logo');
  var FRASE_BASE = 'Auguri di un buon compleanno';
  var SFONDO_FIORI = 'img/sfondo-fiori.jpg'; // immagine di Gemini per lo stile «Fiori»
  var immagineFiori = null;
  var MUSICA = 'musica/musica.mp3';
  var VOLUME = 0.85;           // picco intorno a -1 dB

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
    return { nome: n || 'Nome', frase: (campoFrase.value.trim() || FRASE_BASE), firma: campoFirma.checked, logo: campoLogo.checked, durataMusica: stato.durata, copertina: copertina };
  }

  /* ---------- messaggi ---------- */
  // messaggi dopo Salva/Manda: in un riquadro fisso sotto i bottoni, così non si sposta niente
  function msgRis(testo) { var m = $('msgRis'); m.textContent = testo || ''; m.classList.toggle('pieno', !!testo); }
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
      new FontFace('CormorantKY', 'url(font/CormorantGaramond-Italic-VF.woff2)', { style: 'italic', weight: '300 700' }),
      new FontFace('CinzelKY', 'url(font/Cinzel-VF.woff2)', { weight: '400 900' })
    ];
    return Promise.all(lista.map(function (f) { return f.load().then(function (ff) { document.fonts.add(ff); }).catch(function () {}); }));
  }
  function avvio() {
    $('crea').disabled = true;
    Promise.all([
      caricaFont(),
      caricaImmagine(SFONDO_FIORI),
      caricaImmagine('img/logo-kyrios.png'),
      fetch(MUSICA).then(function (r) { if (!r.ok) throw new Error('musica'); return r.arrayBuffer(); }).catch(function () { return null; })
    ]).then(function (r) {
      stato.musicaBuf = r[3];
      S.impostaLogo(r[2]);
      if (!r[2]) { campoLogo.checked = false; campoLogo.closest('label').classList.add('nascosto'); }
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
  campoNome.addEventListener('input', function () { messaggio(''); $('msgNome').classList.remove('mostra'); campoNome.classList.remove('manca'); aggiornaAnteprima(); });
  campoFrase.addEventListener('input', aggiornaAnteprima);
  campoFirma.addEventListener('change', aggiornaAnteprima);
  campoLogo.addEventListener('change', aggiornaAnteprima);
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
  var PROVA_VP9 = /[?&]prova=vp9/.test(location.search); // solo per le prove senza H.264
  var CODEC_AVC = ['avc1.640028', 'avc1.4D4028', 'avc1.42E028', 'avc1.42E032'];
  var FPS = 30;
  var wakeLock = null;

  // Sceglie come fare il video: WebCodecs (fotogramma per fotogramma) se c'è H.264 + audio, se no MediaRecorder.
  function scegliMotore(vbps) {
    if (!window.VideoEncoder || !window.AudioEncoder || !window.VideoFrame || !window.AudioData || !window.Mp4Muxer) return Promise.resolve(null);
    var lista = (PROVA_VP9 ? ['vp09.00.40.08'] : []).concat(CODEC_AVC);
    function provaVideo(i) {
      if (i >= lista.length) return Promise.resolve(null);
      var conf = { codec: lista[i], width: 1080, height: 1920, bitrate: vbps, framerate: FPS };
      if (/^avc1/.test(lista[i])) conf.avc = { format: 'avc' };
      return VideoEncoder.isConfigSupported(conf).then(function (r) { return r.supported ? conf : provaVideo(i + 1); }, function () { return provaVideo(i + 1); });
    }
    return provaVideo(0).then(function (vconf) {
      if (!vconf) return null;
      var aac = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 };
      var opus = { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 };
      return AudioEncoder.isConfigSupported(aac).then(function (r) { return r.supported ? aac : null; }, function () { return null; }).then(function (a) {
        if (a) return a;
        return AudioEncoder.isConfigSupported(opus).then(function (r) { return r.supported ? opus : null; }, function () { return null; });
      }).then(function (aconf) { return aconf ? { video: vconf, audio: aconf } : null; });
    });
  }
  window.__scegliMotore = function () { return scegliMotore(3000000).then(function (m) { return m ? { video: m.video.codec, audio: m.audio.codec } : 'MediaRecorder'; }); };

  function decodificaMusica() {
    var O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var c = new O(2, 48000, 48000), buf = stato.musicaBuf.slice(0);
    return new Promise(function (ok, ko) { var p = c.decodeAudioData(buf, ok, ko); if (p && p.then) p.then(ok, ko); });
  }

  function creaVideo() {
    if (!stato.pronto || stato.registrando) return;
    var nomeScritto = campoNome.value.replace(/\s+/g, ' ').trim();
    if (!nomeScritto) {
      var mn = $('msgNome'); mn.textContent = 'Scrivi qui il nome, poi premi «Crea il video».'; mn.classList.add('mostra');
      campoNome.classList.add('manca'); campoNome.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { campoNome.focus({ preventScroll: true }); }, 350); return;
    }
    if (!stato.musicaBuf) { messaggio('Non riesco a caricare la musica. Controlla la connessione e ricarica la pagina.', 'errore'); return; }

    // per il ripiego con MediaRecorder l'audio va acceso subito, dentro il tocco (iPhone)
    var C = window.AudioContext || window.webkitAudioContext, actx = null;
    try { actx = new C(); if (actx.resume) actx.resume(); var b0 = actx.createBuffer(1, 1, 22050), s0 = actx.createBufferSource(); s0.buffer = b0; s0.connect(actx.destination); s0.start(0); } catch (e) {}

    applicaStile();
    stato.registrando = true; stato.video = null;
    mostraTela(); msgRis('');
    $('crea').disabled = true; $('risultato').classList.remove('mostra'); messaggio('');
    $('avanzamento').classList.add('mostra'); $('barra').style.width = '0%'; $('mancano').textContent = ''; $('percento').textContent = '';
    $('didascalia').textContent = 'Il video si sta preparando…';
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});

    var op = opzioni(false);
    stato.nomeFile = 'Auguri - ' + nomePerFile(nomeBello(nomeScritto));
    stato.testoWa = op.frase + ', ' + nomeScritto + '!';

    decodificaMusica().then(function (buf) {
      var D = buf.duration; // video lungo quanto la musica (che ha già il suo finale)
      op.durataMusica = D; op.durata = D;
      var vbps = Math.max(1500000, Math.min(4500000, Math.floor((8.8 * 1024 * 1024 * 8) / D - 128000)));
      S.disegnaFotogramma(ctx, 0, opzioni(true));
      return new Promise(function (ok) { tela.toBlob(ok, 'image/png'); }).then(function (cop) {
        stato.copertina = cop;
        return scegliMotore(vbps);
      }).then(function (motore) {
        if (motore) {
          stato.motore = 'webcodecs ' + motore.video.codec + ' + ' + motore.audio.codec;
          $('avvisoPagina').textContent = 'Puoi aspettare qui: ci vuole meno di un minuto.';
          return codificaWebCodecs(buf, op, motore);
        }
        if (!window.MediaRecorder || !tela.captureStream || !actx) throw new Error('nessuno');
        stato.motore = 'mediarecorder';
        $('avvisoPagina').textContent = 'Resta su questa pagina e non cambiare app finché finisce.';
        return decodifica(actx, stato.musicaBuf.slice(0)).then(function (b2) { return registra(actx, b2, op, vbps); });
      });
    }).then(function (ris) {
      stato.video = ris.blob; stato.tipo = ris.tipo; stato.estensione = /mp4/.test(ris.tipo) ? 'mp4' : 'webm';
      fine(true);
      if (stato.estensione !== 'mp4') messaggio('Questo browser non sa fare l’MP4: aggiorna Chrome oppure crea il video dal computer. Il video si può salvare lo stesso, ma WhatsApp potrebbe non accettarlo.', 'avviso');
      else if (ris.blob.size > 10 * 1024 * 1024) messaggio('Il video pesa più di 10 MB: per lo stato di WhatsApp potrebbe essere troppo grande.', 'avviso');
    }).catch(function (e) {
      fine(false);
      var m = e && e.message;
      messaggio(m === 'uscito' ? 'Sei uscito dalla pagina e il video si è interrotto. Premi di nuovo «Crea il video» e resta qui fino alla fine.'
        : m === 'nessuno' ? 'Questo browser non sa creare video. Aggiorna Chrome oppure crea il video dal computer.'
        : 'Qualcosa non ha funzionato nella creazione del video. Riprova; se succede ancora, crea il video dal computer con Chrome.', 'errore');
      if (m !== 'uscito' && m !== 'nessuno' && window.console) console.warn(e);
    }).then(function () { try { actx && actx.close(); } catch (e) {} });
  }

  // pausa brevissima che funziona anche con la finestra dietro (i timer lì vengono rallentati)
  var canale = new MessageChannel(), attese = [];
  canale.port1.onmessage = function () { var f = attese.shift(); if (f) f(); };
  function respira() { return new Promise(function (ok) { attese.push(ok); canale.port2.postMessage(0); }); }

  function avanzamento(fr) {
    $('barra').style.width = (fr * 100).toFixed(1) + '%';
    $('percento').textContent = Math.floor(fr * 100) + '%';
  }

  function codificaWebCodecs(buf, op, motore) {
    var D = buf.duration, N = Math.round(D * FPS), errore = null;
    var aac = motore.audio.codec === 'mp4a.40.2', avc = /^avc1/.test(motore.video.codec);
    var target = new Mp4Muxer.ArrayBufferTarget();
    var muxer = new Mp4Muxer.Muxer({
      target: target, fastStart: 'in-memory', firstTimestampBehavior: 'offset',
      video: { codec: avc ? 'avc' : 'vp9', width: 1080, height: 1920, frameRate: FPS },
      audio: { codec: aac ? 'aac' : 'opus', numberOfChannels: 2, sampleRate: 48000 }
    });
    var venc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { errore = e; } });
    venc.configure(motore.video);
    var aenc = new AudioEncoder({ output: function (c, m) { muxer.addAudioChunk(c, m); }, error: function (e) { errore = e; } });
    aenc.configure(motore.audio);

    // audio: PCM della musica, volume a circa -1 dB e piccola sfumatura sugli ultimi 0,3 s
    var sr = buf.sampleRate, len = buf.length, ch = [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)];
    var BLOCCO = 1024, fadeN = Math.floor(sr * .3);
    for (var pos = 0; pos < len; pos += BLOCCO) {
      var n = Math.min(BLOCCO, len - pos), dati = new Float32Array(n * 2);
      for (var c = 0; c < 2; c++) for (var k = 0; k < n; k++) {
        var g = VOLUME, idx = pos + k; if (idx > len - fadeN) g *= (len - idx) / fadeN;
        dati[c * n + k] = ch[c][idx] * g;
      }
      var ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(pos / sr * 1e6), data: dati });
      aenc.encode(ad); ad.close();
    }

    var i = 0, durF = 1e6 / FPS;
    function passo() {
      if (errore) return Promise.reject(errore);
      if (i >= N) return Promise.all([venc.flush(), aenc.flush()]);
      var lotto = 0;
      while (i < N && lotto < 3 && venc.encodeQueueSize < 6) {
        S.disegnaFotogramma(ctx, i / FPS, op);
        var vf = new VideoFrame(tela, { timestamp: Math.round(i * durF), duration: Math.round(durF) });
        venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
        i++; lotto++;
      }
      avanzamento(i / N);
      return respira().then(passo);
    }
    return passo().then(function () {
      if (errore) throw errore;
      muxer.finalize(); venc.close(); aenc.close();
      return { blob: new Blob([target.buffer], { type: 'video/mp4' }), tipo: 'video/mp4;codecs=' + motore.video.codec + ',' + motore.audio.codec };
    });
  }

  function decodifica(actx, buf) {
    return new Promise(function (ok, ko) {
      var p = actx.decodeAudioData(buf, ok, ko);
      if (p && p.then) p.then(ok, ko);
    });
  }

  // ripiego: registrazione in tempo reale (iPhone vecchi senza WebCodecs)
  function registra(actx, buf, op, vbps) {
    return new Promise(function (ok, ko) {
      var D = buf.duration, tipo = scegliFormato();
      var flusso = tela.captureStream(30);
      var dest = actx.createMediaStreamDestination();
      var guadagno = actx.createGain(), src = actx.createBufferSource();
      src.buffer = buf; src.connect(guadagno); guadagno.connect(dest); guadagno.connect(actx.destination);
      var tracce = dest.stream.getAudioTracks(); if (tracce[0]) flusso.addTrack(tracce[0]);
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

      S.disegnaFotogramma(ctx, 0, op);   // la copertina completa è il primo fotogramma
      rec.start(1000);
      t0 = actx.currentTime + 0.05;
      guadagno.gain.setValueAtTime(VOLUME, 0);
      try { src.start(t0); } catch (e) { src.start(0); }
      (function ciclo() {
        if (finito || interrotto) return;
        var t = Math.max(0, actx.currentTime - t0);
        S.disegnaFotogramma(ctx, Math.min(t, D - .001), op);
        avanzamento(Math.min(1, t / D));
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
        msgRis('Fatto! Se non hai visto WhatsApp nell’elenco, premi «Salva il video» e allegalo da WhatsApp.');
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
    msgRis('Ho salvato il video nella cartella «Download». Si apre WhatsApp: scegli la persona, premi la graffetta e allega il file «' + f.name + '».');
  }
  $('salvaVideo').addEventListener('click', function () {
    if (!stato.video) return;
    var f = fileVideo();
    if (IOS && puoCondividere(f)) {
      navigator.share({ files: [f] }).then(function () {}).catch(function (e) { if (!e || e.name !== 'AbortError') scarica(f, f.name); });
      msgRis('Nel menu che si apre scegli «Salva video»: lo trovi in Foto.');
    } else { scarica(f, f.name); msgRis('Video salvato nella cartella «Download» con il nome «' + f.name + '».'); }
  });
  $('salvaCopertina').addEventListener('click', function () {
    if (!stato.copertina) return;
    var nome = stato.nomeFile + ' - copertina.png', f = new File([stato.copertina], nome, { type: 'image/png' });
    if (IOS && puoCondividere(f)) {
      navigator.share({ files: [f] }).catch(function (e) { if (!e || e.name !== 'AbortError') scarica(f, nome); });
      msgRis('Nel menu che si apre scegli «Salva immagine»: la trovi in Foto.');
    } else { scarica(f, nome); msgRis('Copertina salvata nella cartella «Download» con il nome «' + nome + '».'); }
  });
  $('altro').addEventListener('click', function () {
    $('risultato').classList.remove('mostra'); messaggio(''); msgRis(''); stato.video = null;
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
