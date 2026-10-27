/* Auguri KYRIOS — disegno della scena "carta ritagliata a strati".
   Tutto è una funzione del tempo t (secondi): disegnaFotogramma(ctx, t, opz).
   Tela 1080x1920. Fascia 40%-60% dell'altezza libera da scritte (tasto ▶ del telefono). */
(function () {
  'use strict';
  var W = 1080, H = 1920;
  var PAL = {
    crema: '#fbf3e6', pesca: '#f7d6c0', corallo: '#ee9a7c', lampone: '#c4495f',
    prugna: '#7a3a5e', ottanio: '#2b6467', ottanioScuro: '#1c474b', senape: '#e8b04a',
    rosa: '#f4b5ad', panna: '#fff6ea', bordeaux: '#7a2335', menta: '#9fd0c2'
  };
  var CONF_COL = ['#c4495f', '#e8b04a', '#2b6467', '#f4b5ad', '#ee9a7c', '#9fd0c2', '#fff6ea', '#7a3a5e'];

  /* ---------- utilità ---------- */
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.max(a, Math.min(b, x)); }
  function eOut(x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); }
  function eInOut(x) { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eBack(x) { x = clamp(x); var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function tela(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function scurisci(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    return 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')';
  }

  var grana = null;
  function getGrana() {
    if (grana) return grana;
    var c = tela(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256), r = rng(7);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = r(), chiaro = v > .5;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = chiaro ? 255 : 70;
      d.data[i + 3] = Math.floor(Math.abs(v - .5) * 2 * 26);
    }
    x.putImageData(d, 0, 0);
    for (var k = 0; k < 50; k++) {
      x.strokeStyle = r() > .5 ? 'rgba(255,255,255,.12)' : 'rgba(90,60,40,.07)';
      x.lineWidth = r() * 1.2 + .3; x.beginPath();
      var sx = r() * 256, sy = r() * 256; x.moveTo(sx, sy);
      x.quadraticCurveTo(sx + r() * 40 - 20, sy + r() * 40 - 20, sx + r() * 60 - 30, sy + r() * 60 - 30); x.stroke();
    }
    grana = c; return c;
  }
  function applicaGrana(ctx, w, h) {
    ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = ctx.createPattern(getGrana(), 'repeat'); ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  /* forma di carta: ombra portata + luce dall'alto + bordo di taglio chiaro */
  function carta(ctx, p, colore, b, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = o.ombra || 'rgba(70,28,20,.30)';
    ctx.shadowBlur = o.blur === undefined ? 22 : o.blur;
    ctx.shadowOffsetY = o.dy === undefined ? 10 : o.dy;
    ctx.fillStyle = colore; ctx.fill(p); ctx.restore();
    if (b) {
      ctx.save(); ctx.clip(p);
      var g = ctx.createLinearGradient(0, b[1], 0, b[1] + b[3]);
      g.addColorStop(0, 'rgba(255,255,255,.20)'); g.addColorStop(.3, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,10,10,.10)');
      ctx.fillStyle = g; ctx.fillRect(b[0], b[1], b[2], b[3]);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.stroke(p);
      ctx.restore();
    }
  }
  function onda(y0, amp, onde, fase, x0, x1, fondo) {
    var p = new Path2D(); p.moveTo(x0, fondo);
    for (var x = x0; x <= x1; x += 6) {
      var u = (x - x0) / (x1 - x0);
      p.lineTo(x, y0 + Math.sin(u * Math.PI * onde + fase) * amp + Math.sin(u * Math.PI * onde * 2.3 + fase * 1.7) * amp * .3);
    }
    p.lineTo(x1, fondo); p.closePath(); return p;
  }
  function rrect(x, y, w, h, r) {
    var p = new Path2D(); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p;
  }
  function stella(p, cx, cy, R, r, punte, rot) {
    for (var i = 0; i < punte * 2; i++) {
      var a = rot + i * Math.PI / punte - Math.PI / 2, rr = i % 2 ? r : R;
      if (i) p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    p.closePath(); return p;
  }
  function cuore(p, cx, cy, s) {
    p.moveTo(cx, cy + s * .35);
    p.bezierCurveTo(cx - s * 1.1, cy - s * .35, cx - s * .45, cy - s * 1.05, cx, cy - s * .45);
    p.bezierCurveTo(cx + s * .45, cy - s * 1.05, cx + s * 1.1, cy - s * .35, cx, cy + s * .35);
    p.closePath(); return p;
  }

  /* ---------- strati statici (preparati una volta) ---------- */
  var M = 120; // margine per la parallasse
  var STRATI = null, CACHE_STRATI = {};
  var CANDELE = [370, 455, 540, 625, 710];
  var CANDELA_TOP = 1445, STOPPINO = 1433;
  /* stili: «festa» tutto disegnato a strati; «fiori» con l'immagine di Gemini (sfondo2) */
  var STILI = {
    festa: { candele: [370, 455, 540, 625, 710], stoppino: 1433, fiammaK: 1, nome: [1158, 1364], festoni: true, aloneK: 1, petali: false, fondo: ['#fdf3e7', '#f3d6c4'],
      conf: CONF_COL, frase: '#7a2335', fregio: '#c99a3c', cuore: '#c4495f', firma: '#8a3b2c', stelle: ['#e8b04a', '#c4495f'], alone: [540, 1400] },
    fiori: { candele: null, stoppino: 0, fiammaK: 1.2, nome: [1156, 1396], festoni: false, aloneK: .5, petali: true, fondo: ['#fbf7ee', '#efe3cf'],
      conf: ['#f2a48f', '#9cb59a', '#f6c3b5', '#b7c9a8', '#e9866f', '#d8b25a', '#f3d9c4'], frase: '#8a3a2b', fregio: '#c7a04a', cuore: '#e07a64', firma: '#8a3a2b', stelle: ['#d4ab52', '#e9866f'], alone: [540, 1330] }
  };
  var ST = STILI.festa, NOME_STILE = 'festa';
  // posizione dell'immagine di Gemini (768x1376) sulla tela
  var IMG_S = 1.12, IMG_SX = 1.12, IMG_DX = (W - 768 * 1.12) / 2, IMG_DY = 440, IMG_TAGLIO = 760; // riga dell'immagine dove si separa la torta
  var FIAMME_IMG = [[341, 926], [383, 918], [425.5, 925]];

  function strato(top, alt, prof, disegna) {
    var c = tela(W + 2 * M, alt), x = c.getContext('2d');
    x.translate(M, -top); disegna(x); x.setTransform(1, 0, 0, 1, 0, 0);
    applicaGrana(x, c.width, c.height);
    return { c: c, top: top, prof: prof };
  }

  function usaStile(nome, img) {
    NOME_STILE = STILI[nome] ? nome : 'festa'; ST = STILI[NOME_STILE];
    if (!CACHE_STRATI[NOME_STILE]) CACHE_STRATI[NOME_STILE] = NOME_STILE === 'fiori' && img ? preparaFiori(img) : preparaStrati(null);
    STRATI = CACHE_STRATI[NOME_STILE];
    if (NOME_STILE === 'fiori') { ST.candele = FIAMME_IMG.map(function (f) { return IMG_DX + f[0] * IMG_SX; }); ST.stoppino = IMG_DY + 926 * IMG_S; ST.alone = [540, ST.stoppino - 70]; }
    NOME_TOP = ST.nome[0]; NOME_BOT = ST.nome[1];
  }
  function preparaFiori(img) {
    var s = [], sc = 768 / img.width; // l'immagine può arrivare in altre misure: si normalizza a 768 di larghezza
    var S = IMG_S * sc, iw = img.width * S, ih = img.height * S, dx2 = IMG_DX + iw;
    // fondo crema fermo (parte alta dell'immagine, sfumata in basso)
    var c0 = tela(W, H), x0 = c0.getContext('2d');
    var g = x0.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f7f2e6'); g.addColorStop(.5, '#f3ead9'); g.addColorStop(1, '#efe3cf');
    x0.fillStyle = g; x0.fillRect(0, 0, W, H);
    var parte = tela(W, H), xp = parte.getContext('2d');
    xp.drawImage(img, IMG_DX, IMG_DY, iw, ih);
    xp.drawImage(img, 0, 0, 2, img.height, 0, IMG_DY, IMG_DX + 1, ih);                     // bordi allungati ai lati
    xp.drawImage(img, img.width - 2, 0, 2, img.height, dx2 - 1, IMG_DY, W - dx2 + 1, ih);
    xp.drawImage(img, 0, 0, img.width, 3, 0, 0, W, IMG_DY + 2); // la riga più alta dell'immagine, allungata fino in cima
    xp.globalCompositeOperation = 'destination-in';
    var m = xp.createLinearGradient(0, 0, 0, H), y1 = 1, y2 = IMG_DY + (IMG_TAGLIO - 80) * IMG_S, y3 = IMG_DY + IMG_TAGLIO * IMG_S;
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(y1 / H, 'rgba(0,0,0,1)'); m.addColorStop(y2 / H, 'rgba(0,0,0,1)'); m.addColorStop(Math.min(1, y3 / H), 'rgba(0,0,0,0)');
    xp.fillStyle = m; xp.fillRect(0, 0, W, H);
    var rc = (IMG_TAGLIO - 90) / sc; // riga crema sopra la corona, allungata fino in fondo (sotto la torta che si muove)
    x0.drawImage(img, 0, rc, img.width, 2, 0, IMG_DY + (IMG_TAGLIO - 90) * IMG_S, W, H);
    x0.drawImage(parte, 0, 0); applicaGrana(x0, W, H);
    s.push({ c: c0, top: 0, prof: 0, fisso: true });
    // torta e corona: strato che si muove
    var top = Math.floor(IMG_DY + (IMG_TAGLIO - 80) * IMG_S), alt = H + 80 - top;
    var c1 = tela(W + 2 * M, alt), x1 = c1.getContext('2d');
    x1.drawImage(img, M + IMG_DX, IMG_DY - top, iw, ih);
    x1.drawImage(img, 0, 0, 2, img.height, 0, IMG_DY - top, M + IMG_DX + 1, ih);                       // bordi allungati
    x1.drawImage(img, img.width - 2, 0, 2, img.height, M + dx2 - 1, IMG_DY - top, c1.width - (M + dx2) + 1, ih);
    x1.globalCompositeOperation = 'destination-in';
    var m1 = x1.createLinearGradient(0, 0, 0, alt); m1.addColorStop(0, 'rgba(0,0,0,0)'); m1.addColorStop(80 * IMG_S / alt, 'rgba(0,0,0,1)'); m1.addColorStop(1, 'rgba(0,0,0,1)');
    x1.fillStyle = m1; x1.fillRect(0, 0, c1.width, alt);
    s.push({ c: c1, top: top, prof: 1, torta: true });
    return s;
  }
  function preparaStrati(sfondoImg) {
    var s = [];
    // 0 cielo
    var cielo = tela(W, H), cx = cielo.getContext('2d');
    if (sfondoImg) {
      var sc = Math.max(W / sfondoImg.width, H / sfondoImg.height), iw = sfondoImg.width * sc, ih = sfondoImg.height * sc;
      cx.drawImage(sfondoImg, (W - iw) / 2, (H - ih) / 2, iw, ih);
    } else {
      var g = cx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#fdf6ea'); g.addColorStop(.35, '#fbeedd'); g.addColorStop(.62, '#f6d2bd'); g.addColorStop(1, '#efb9a3');
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      // sole di carta a cerchi concentrici dietro al centro
      var anelli = ['#f9e3cf', '#f7dac4', '#f5d0b9', '#f3c6ae', '#f1bca4'];
      for (var i = 0; i < anelli.length; i++) {
        var p = new Path2D(); p.arc(540, 1130, 660 - i * 110, 0, Math.PI * 2);
        carta(cx, p, anelli[i], null, { blur: 30, dy: 6, ombra: 'rgba(120,60,40,.12)' });
      }
    }
    applicaGrana(cx, W, H);
    s.push({ c: cielo, top: 0, prof: 0, fisso: true });

    // 1 nuvole
    s.push(strato(760, 420, .25, function (x) {
      [[200, 990, 1], [880, 920, .85], [560, 860, .55]].forEach(function (n, k) {
        var p = new Path2D(), cx0 = n[0], cy0 = n[1], k2 = n[2];
        [[-110, 10, 70], [-40, -35, 90], [50, -20, 80], [120, 15, 60], [0, 20, 75]].forEach(function (c) {
          p.moveTo(cx0 + c[0] * k2 + c[2] * k2, cy0 + c[1] * k2); p.arc(cx0 + c[0] * k2, cy0 + c[1] * k2, c[2] * k2, 0, Math.PI * 2);
        });
        carta(x, p, k === 2 ? '#fbe6d6' : PAL.panna, [cx0 - 200, cy0 - 140, 400, 260], { blur: 18, dy: 8, ombra: 'rgba(140,70,50,.22)' });
      });
    }));
    // 2 colline lontane
    s.push(strato(940, 1040, .4, function (x) {
      carta(x, onda(1030, 42, 3.2, .4, -M, W + M, H + 60), PAL.corallo, [-M, 960, W + 2 * M, 1000]);
    }));
    // 3 colline medie
    s.push(strato(1010, 970, .55, function (x) {
      carta(x, onda(1095, 36, 2.6, 2.1, -M, W + M, H + 60), PAL.prugna, [-M, 1040, W + 2 * M, 900]);
    }));
    // 4 colline vicine (dietro al nome: scure, così l'oro si legge)
    s.push(strato(1080, 900, .72, function (x) {
      carta(x, onda(1150, 26, 2.2, 4.0, -M, W + M, H + 60), PAL.ottanio, [-M, 1110, W + 2 * M, 820]);
      var r = rng(31); // puntini di carta
      for (var i = 0; i < 26; i++) {
        var px = r() * (W + 2 * M) - M, py = 1230 + r() * 560;
        if (px > 230 && px < 850 && py > 1440) continue;
        var p = new Path2D(); p.arc(px, py, 3 + r() * 5, 0, 7);
        x.fillStyle = 'rgba(255,240,220,' + (.25 + r() * .35) + ')'; x.fill(p);
      }
    }));
    // 5 collina davanti (ai lati della torta)
    s.push(strato(1560, 360, .88, function (x) {
      carta(x, onda(1700, 70, 1.6, 3.4, -M, W + M, H + 60), PAL.ottanioScuro, [-M, 1600, W + 2 * M, 380]);
    }));
    // 6 torta
    var tor = strato(1380, 540, 1, disegnaTorta); tor.torta = true; s.push(tor);
    // 7 primo piano
    s.push(strato(1820, 100, 1.25, function (x) {
      carta(x, onda(1880, 12, 9, .3, -M, W + M, H + 40), PAL.senape, [-M, 1860, W + 2 * M, 80]);
      carta(x, onda(1902, 9, 13, 1.7, -M, W + M, H + 40), PAL.rosa, [-M, 1890, W + 2 * M, 60]);
    }));
    return s;
  }

  function disegnaTorta(x) {
    var cx = 540;
    var piatto = new Path2D(); piatto.ellipse(cx, 1884, 450, 30, 0, 0, 7);
    carta(x, piatto, '#d9a441', [cx - 450, 1854, 900, 60]);
    var piani = [
      { w: 800, y: 1745, h: 135, col: PAL.rosa, gl: PAL.panna, deco: PAL.lampone },
      { w: 620, y: 1625, h: 122, col: PAL.panna, gl: PAL.lampone, deco: PAL.ottanio },
      { w: 440, y: 1520, h: 107, col: '#f7c9a8', gl: PAL.panna, deco: PAL.lampone }
    ];
    piani.forEach(function (pi, k) {
      var x0 = cx - pi.w / 2, corpo = rrect(x0, pi.y, pi.w, pi.h, 18);
      carta(x, corpo, pi.col, [x0, pi.y, pi.w, pi.h], { blur: 26, dy: 12 });
      // glassa che cola
      var gl = new Path2D(), n = Math.round(pi.w / 52), r = rng(11 + k);
      gl.moveTo(x0 - 6, pi.y + 14); gl.arcTo(x0 - 6, pi.y - 8, x0 + 20, pi.y - 8, 18); gl.lineTo(x0 + pi.w - 20, pi.y - 8);
      gl.arcTo(x0 + pi.w + 6, pi.y - 8, x0 + pi.w + 6, pi.y + 14, 18);
      var passo = (pi.w + 12) / n;
      for (var i = n - 1; i >= 0; i--) {
        var xa = x0 - 6 + i * passo, len = 18 + r() * 34;
        gl.lineTo(xa + passo, pi.y + 14);
        gl.bezierCurveTo(xa + passo, pi.y + 14 + len, xa + passo * .55, pi.y + 14 + len + 10, xa + passo * .5, pi.y + 14 + len * .6);
        gl.bezierCurveTo(xa + passo * .45, pi.y + 14 + len * .3, xa, pi.y + 30, xa, pi.y + 14);
      }
      gl.closePath();
      carta(x, gl, pi.gl, [x0 - 6, pi.y - 8, pi.w + 12, 80], { blur: 10, dy: 5 });
      // decorazioni
      if (k === 0) {
        var nastro = new Path2D(); nastro.rect(x0, pi.y + 78, pi.w, 30);
        carta(x, nastro, PAL.lampone, [x0, pi.y + 78, pi.w, 30], { blur: 8, dy: 4 });
        // fiocco
        var fy = pi.y + 93, f = new Path2D();
        f.moveTo(cx, fy); f.bezierCurveTo(cx - 90, fy - 70, cx - 110, fy + 40, cx, fy);
        f.moveTo(cx, fy); f.bezierCurveTo(cx + 90, fy - 70, cx + 110, fy + 40, cx, fy);
        var code = new Path2D(); code.moveTo(cx - 8, fy); code.lineTo(cx - 60, fy + 70); code.lineTo(cx - 34, fy + 62); code.lineTo(cx - 24, fy + 84); code.lineTo(cx + 4, fy + 6);
        code.moveTo(cx + 8, fy); code.lineTo(cx + 58, fy + 66); code.lineTo(cx + 32, fy + 60); code.lineTo(cx + 26, fy + 82); code.lineTo(cx - 4, fy + 6);
        carta(x, code, '#a83a50', [cx - 70, fy, 140, 90], { blur: 8, dy: 4 });
        carta(x, f, PAL.lampone, [cx - 110, fy - 70, 220, 110], { blur: 10, dy: 5 });
        var nodo = new Path2D(); nodo.ellipse(cx, fy, 18, 16, 0, 0, 7);
        carta(x, nodo, '#a83a50', [cx - 18, fy - 16, 36, 32], { blur: 4, dy: 2 });
        for (var d = 0; d < 9; d++) {
          var dx = x0 + 50 + d * (pi.w - 100) / 8; if (Math.abs(dx - cx) < 110) continue;
          var cu = cuore(new Path2D(), dx, pi.y + 54, 13);
          carta(x, cu, PAL.panna, null, { blur: 3, dy: 2 });
        }
      } else if (k === 1) {
        for (var e = 0; e < 13; e++) {
          var ex = x0 + 24 + e * (pi.w - 48) / 12, sp = new Path2D(); sp.arc(ex, pi.y + pi.h - 4, 22, Math.PI, 0);
          carta(x, sp, PAL.menta, null, { blur: 3, dy: 2 });
        }
        for (var e2 = 0; e2 < 7; e2++) {
          var st = stella(new Path2D(), x0 + 70 + e2 * (pi.w - 140) / 6, pi.y + 62, 15, 7, 5, 0);
          carta(x, st, PAL.senape, null, { blur: 3, dy: 2 });
        }
      } else {
        for (var q = 0; q < 6; q++) {
          var pp = new Path2D(); pp.arc(x0 + 55 + q * (pi.w - 110) / 5, pi.y + 68, 10, 0, 7);
          carta(x, pp, pi.deco, null, { blur: 3, dy: 2 });
        }
      }
    });
    // candeline
    var colori = [PAL.ottanio, PAL.lampone, PAL.senape, PAL.lampone, PAL.ottanio];
    CANDELE.forEach(function (px, i) {
      var cw = 24, ch = 1520 - CANDELA_TOP + 6, c = rrect(px - cw / 2, CANDELA_TOP, cw, ch, 6);
      carta(x, c, PAL.panna, [px - cw / 2, CANDELA_TOP, cw, ch], { blur: 8, dy: 4 });
      x.save(); x.clip(c); x.strokeStyle = colori[i]; x.lineWidth = 8;
      for (var yy = CANDELA_TOP - 20; yy < 1530; yy += 22) { x.beginPath(); x.moveTo(px - 20, yy + 16); x.lineTo(px + 20, yy - 4); x.stroke(); }
      x.restore();
      x.strokeStyle = '#3b2a20'; x.lineWidth = 4; x.lineCap = 'round';
      x.beginPath(); x.moveTo(px, CANDELA_TOP + 2); x.quadraticCurveTo(px + 3, STOPPINO + 6, px + 1, STOPPINO); x.stroke();
    });
  }

  /* ---------- testi ---------- */
  var FONT_NOME = '"GreatVibesKY", cursive';
  var FONT_FRASE = '"CormorantKY", Georgia, serif';
  var cacheFrase = {}, cacheNome = {};
  var NOME_TOP = 1158, NOME_BOT = 1378; // fascia del nome (sopra la torta, sotto il 60%)

  function layoutFrase(ctx, testo) {
    if (cacheFrase[testo]) return cacheFrase[testo];
    var parole = testo.trim().split(/\s+/).filter(Boolean), maxW = 900, maxH = 330, ris = null;
    if (!parole.length) parole = [''];
    function largh(s, size) { ctx.font = 'italic 600 ' + size + 'px ' + FONT_FRASE; return ctx.measureText(s).width; }
    function miglioreDivisione(n, size) { // righe bilanciate
      var best = null;
      (function prova(start, righe) {
        if (righe.length === n - 1) {
          var r = righe.concat([parole.slice(start).join(' ')]);
          if (r[r.length - 1] === '' && parole.length) return;
          var m = Math.max.apply(null, r.map(function (s) { return largh(s, size); }));
          if (!best || m < best.m) best = { m: m, righe: r };
          return;
        }
        for (var i = start + 1; i < parole.length; i++) prova(i, righe.concat([parole.slice(start, i).join(' ')]));
      })(0, []);
      return best;
    }
    for (var size = 150; size >= 44 && !ris; size -= 4) {
      for (var n = 1; n <= Math.min(4, parole.length); n++) {
        if (n * size * 1.06 > maxH) break;
        var b = miglioreDivisione(n, size);
        if (b && b.m <= maxW) { ris = { size: size, righe: b.righe }; break; }
      }
    }
    if (!ris) ris = { size: 44, righe: [testo] };
    // posizioni lettera per lettera
    ctx.font = 'italic 600 ' + ris.size + 'px ' + FONT_FRASE;
    var lh = ris.size * 1.06, altTot = lh * ris.righe.length, y0 = 400 - altTot / 2 + ris.size * .78;
    ris.lettere = []; ris.basso = y0 + (ris.righe.length - 1) * lh + ris.size * .3;
    ris.righe.forEach(function (riga, j) {
      var w = ctx.measureText(riga).width, x0 = 540 - w / 2;
      for (var i = 0; i < riga.length; i++) {
        ris.lettere.push({ ch: riga[i], x: x0 + ctx.measureText(riga.slice(0, i)).width, y: y0 + j * lh });
      }
    });
    cacheFrase[testo] = ris; return ris;
  }

  function misura(x, testo, size) {
    x.font = size + 'px ' + FONT_NOME; var m = x.measureText(testo || ' ');
    var l = m.actualBoundingBoxLeft || 0, r = m.actualBoundingBoxRight || m.width;
    return { l: l, r: r, w: l + r, asc: m.actualBoundingBoxAscent || size * .7, desc: m.actualBoundingBoxDescent || size * .2 };
  }
  function rigaNome(testo, size, base) { // base = baseline sulla pagina
    var c = tela(W, 600), x = c.getContext('2d'), m = misura(x, testo, size);
    var sx = 540 - m.w / 2 + m.l;
    x.font = size + 'px ' + FONT_NOME; x.lineJoin = 'round';
    var lw = Math.max(6, size * .07);
    x.save(); x.shadowColor = 'rgba(45,22,0,.55)'; x.shadowBlur = 26; x.shadowOffsetY = 6;
    x.lineWidth = lw * 1.5; x.strokeStyle = 'rgba(58,31,5,.55)'; x.strokeText(testo, sx, 300); x.restore();
    x.lineWidth = lw; x.strokeStyle = '#3a1f05'; x.strokeText(testo, sx, 300);
    var g = x.createLinearGradient(0, 300 - m.asc, 0, 300 + m.desc);
    g.addColorStop(0, '#ffe7a0'); g.addColorStop(.35, '#ebb64e'); g.addColorStop(.62, '#b0741c'); g.addColorStop(.85, '#d9a542'); g.addColorStop(1, '#f0cc6e');
    x.fillStyle = g; x.fillText(testo, sx, 300);
    return { c: c, yPag: base - 300, sx: sx - m.l - 10, ex: sx + m.r + 10, top: 300 - m.asc, bot: 300 + m.desc };
  }
  function preparaNome(nome) {
    var chiave = NOME_STILE + '|' + nome; if (cacheNome[chiave]) return cacheNome[chiave];
    var x = tela(10, 10).getContext('2d'), maxW = W - 2 * 84, maxH = NOME_BOT - NOME_TOP, mid = (NOME_TOP + NOME_BOT) / 2;
    // una riga
    var s1 = 246, m1;
    for (; s1 > 50; s1 -= 4) { m1 = misura(x, nome, s1); if (m1.w <= maxW && m1.asc + m1.desc <= maxH) break; }
    var righe, size;
    // due righe, se una sola riga viene troppo piccola e ci sono più parole
    var parole = nome.trim().split(/\s+/), best = null;
    if (s1 < 180 && parole.length > 1) {
      for (var k = 1; k < parole.length; k++) {
        var a = parole.slice(0, k).join(' '), b = parole.slice(k).join(' '), bonus = /,$/.test(a) || /^(e|ed)$/i.test(parole[k]) ? 1 : 0;
        for (var s2 = 230; s2 > 50; s2 -= 4) {
          var ma = misura(x, a, s2), mb = misura(x, b, s2), lh = s2 * .74;
          var alt = ma.asc + lh + mb.desc;
          if (Math.max(ma.w, mb.w) <= maxW && alt <= maxH) {
            var punti = s2 + bonus * 6; if (!best || punti > best.punti) best = { size: s2, punti: punti, a: a, b: b, ma: ma, mb: mb, lh: lh };
            break;
          }
        }
      }
    }
    if (best && (best.size > s1 * 1.06 || (s1 < 150 && best.size >= s1 * .96))) {
      size = best.size;
      var alt2 = best.ma.asc + best.lh + best.mb.desc, b1 = mid - alt2 / 2 + best.ma.asc;
      righe = [rigaNome(best.a, size, b1), rigaNome(best.b, size, b1 + best.lh)];
    } else {
      size = s1;
      // una riga sola: appoggiata in basso, vicino alla torta (ma mai sopra il 60%)
      righe = [rigaNome(nome, size, Math.max(NOME_TOP + m1.asc, NOME_BOT - m1.desc - 6))];
    }
    var tot = 0; righe.forEach(function (r) { r.w = r.ex - r.sx; tot += r.w; });
    var acc = 0; righe.forEach(function (r) { r.p0 = acc / tot; acc += r.w; r.p1 = acc / tot; });
    var N = { righe: righe, size: size, lucc: [] };
    N.top = Math.min.apply(null, righe.map(function (r) { return r.yPag + r.top; }));
    N.bot = Math.max.apply(null, righe.map(function (r) { return r.yPag + r.bot; }));
    N.sx = Math.min.apply(null, righe.map(function (r) { return r.sx; }));
    N.ex = Math.max.apply(null, righe.map(function (r) { return r.ex; }));
    var rr = rng(nome.length * 97 + 5);
    for (var i = 0; i < 14; i++) { var R = righe[i % righe.length];
      N.lucc.push({ x: R.sx + 20 + rr() * (R.w - 40), y: R.yPag + (i % 2 ? R.top + rr() * (R.bot - R.top) * .2 : R.bot - rr() * (R.bot - R.top) * .2), f: rr() * 6.28, v: 1.2 + rr() * 1.6, s: 10 + rr() * 14 }); }
    // punta della penna: posizione in funzione del progresso
    N.punta = function (p) {
      for (var j = 0; j < righe.length; j++) { var r = righe[j];
        if (p <= r.p1 || j === righe.length - 1) { var q = clamp((p - r.p0) / (r.p1 - r.p0)); return { x: r.sx + r.w * q, y: r.yPag + (r.top + r.bot) / 2, h: r.bot - r.top }; } }
    };
    cacheNome[chiave] = N; return N;
  }

  var tmpNome = null;
  function disegnaRiga(ctx, R, prog, lucePos, alfa) {
    if (prog <= 0) return;
    var testa = R.sx + R.w * prog, morb = 46, y = R.yPag;
    if (prog >= 1) testa = W + morb;
    var wpieno = Math.max(0, Math.min(W, testa - morb));
    if (wpieno > 0) ctx.drawImage(R.c, 0, 0, wpieno, R.c.height, 0, y, wpieno, R.c.height);
    for (var i = 0; i < 8 && prog < 1; i++) {
      var xa = Math.max(0, testa - morb + i * morb / 8), w = morb / 8 + 1;
      if (xa >= W) break;
      ctx.globalAlpha = alfa * (1 - i / 8);
      ctx.drawImage(R.c, xa, 0, w, R.c.height, xa, y, w, R.c.height);
    }
    ctx.globalAlpha = alfa;
    if (lucePos !== null && lucePos > -0.2 && lucePos < 1.2 && prog >= 1) {
      if (!tmpNome) tmpNome = tela(W, 600);
      var tx = tmpNome.getContext('2d'); tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, W, 600);
      tx.drawImage(R.c, 0, 0); tx.globalCompositeOperation = 'source-atop';
      var cxl = R.sx + R.w * lucePos, g = tx.createLinearGradient(cxl - 45, 0, cxl + 45, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,246,215,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      tx.fillStyle = g; tx.fillRect(cxl - 45, 0, 90, 600);
      ctx.drawImage(tmpNome, 0, y);
    }
  }
  function disegnaNome(ctx, N, prog, lucePos, alfa) {
    if (alfa <= 0 || prog <= 0) return;
    ctx.save(); ctx.globalAlpha = alfa;
    for (var j = 0; j < N.righe.length; j++) {
      var R = N.righe[j], pr = clamp((prog - R.p0) / (R.p1 - R.p0));
      disegnaRiga(ctx, R, pr, lucePos === null ? null : lucePos - j * .25, alfa);
    }
    ctx.restore();
  }

  function scintilla(ctx, x, y, s, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = clamp(a); ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, s * 1.6);
    g.addColorStop(0, 'rgba(255,240,190,.9)'); g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#fffbe8'; ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s * .9, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s * .9, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
    ctx.restore();
  }

  /* ---------- elementi animati ---------- */
  function fiamma(ctx, x, y, t, i, k) {
    if (k <= 0) return;
    var fl = 1 + .09 * Math.sin(t * 13 + i * 1.7) + .06 * Math.sin(t * 23.3 + i * 2.9) + .04 * Math.sin(t * 41 + i);
    var h = 50 * fl * k, w = 15 * k, lean = Math.sin(t * 3.1 + i) * 4 + Math.sin(t * 7.3 + i * 2) * 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var rad = 95 * k * (0.92 + .08 * fl), g = ctx.createRadialGradient(x, y - 18, 0, x, y - 18, rad);
    g.addColorStop(0, 'rgba(255,200,110,.55)'); g.addColorStop(.4, 'rgba(255,160,70,.18)'); g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - 18 - rad, rad * 2, rad * 2);
    ctx.restore();
    ctx.save();
    var p = new Path2D(); p.moveTo(x, y + 4);
    p.bezierCurveTo(x - w, y - 2, x - w * .9, y - h * .55, x + lean, y - h);
    p.bezierCurveTo(x + w * .9, y - h * .55, x + w, y - 2, x, y + 4);
    var gf = ctx.createLinearGradient(x, y + 4, x, y - h);
    gf.addColorStop(0, '#ff8a2a'); gf.addColorStop(.35, '#ffc23d'); gf.addColorStop(.8, '#fff1b0'); gf.addColorStop(1, '#fffbe6');
    ctx.fillStyle = gf; ctx.shadowColor = 'rgba(255,170,60,.9)'; ctx.shadowBlur = 18; ctx.fill(p);
    var core = new Path2D(); core.ellipse(x + lean * .2, y - h * .22, w * .32, h * .22, 0, 0, 7);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(80,120,255,.45)'; ctx.fill(core);
    ctx.restore();
  }

  function festoni(ctx, t, dyStrato) {
    var cols = [PAL.lampone, PAL.senape, PAL.ottanio, PAL.rosa, PAL.corallo, PAL.menta];
    var sag = 70 + Math.sin(t * 1.1) * 5, y0 = 34 + dyStrato;
    function yr(x) { var u = (x - 540) / 600; return y0 + sag * (1 - u * u); }
    ctx.save(); ctx.strokeStyle = '#8a6a50'; ctx.lineWidth = 3; ctx.beginPath();
    for (var x = -40; x <= W + 40; x += 20) { if (x === -40) ctx.moveTo(x, yr(x)); else ctx.lineTo(x, yr(x)); }
    ctx.stroke();
    var n = 0;
    for (var fx = -10; fx <= W + 10; fx += 92, n++) {
      var y = yr(fx), a = Math.sin(t * 1.7 + n * .8) * .09, col = cols[n % cols.length];
      ctx.save(); ctx.translate(fx, y + 2); ctx.rotate(a);
      var p = new Path2D(); p.moveTo(-34, 0); p.lineTo(34, 0); p.lineTo(0, 74); p.closePath();
      ctx.shadowColor = 'rgba(70,28,20,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6;
      ctx.fillStyle = col; ctx.fill(p); ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.lineTo(28, 10); ctx.lineTo(-28, 10); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function stellePendenti(ctx, t, dy) {
    [[118, 820, 0, ST.stelle[0]], [962, 930, 1.9, ST.stelle[1]]].forEach(function (s) {
      var ang = Math.sin(t * 1.3 + s[2]) * .06, lx = s[0] + Math.sin(ang) * s[1], ly = Math.cos(ang) * s[1] + dy;
      ctx.save(); ctx.strokeStyle = 'rgba(120,90,70,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s[0], -10); ctx.lineTo(lx, ly - 40); ctx.stroke();
      ctx.translate(lx, ly); var sc = Math.cos(t * 1.1 + s[2] * 2); ctx.scale(Math.max(.3, Math.abs(sc)), 1);
      var p = stella(new Path2D(), 0, 0, 44, 20, 5, 0);
      ctx.shadowColor = 'rgba(70,28,20,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
      ctx.fillStyle = sc < 0 ? scurisci(s[3], .82) : s[3]; ctx.fill(p);
      ctx.restore();
    });
  }

  var CONF = (function () {
    var r = rng(2026), a = [];
    for (var i = 0; i < 70; i++) a.push({ x: r() * W, v: 110 + r() * 150, dl: r() * 7, amp: 20 + r() * 50, fr: .6 + r() * 1.4,
      fase: r() * 6.28, s: 12 + r() * 16, rot: r() * 6.28, vr: (r() - .5) * 5, vf: 2 + r() * 5, ci: i, forma: i % 5 });
    return a;
  })();
  var SCOPPIO = (function () {
    var r = rng(77), a = [];
    for (var i = 0; i < 80; i++) { var lato = i % 2 ? 1 : -1;
      a.push({ lato: lato, vx: (260 + r() * 640), vy: -(900 + r() * 700), s: 12 + r() * 14, rot: r() * 6, vr: (r() - .5) * 9, vf: 3 + r() * 6, ci: i, forma: i % 5, dl: r() * .25 }); }
    return a;
  })();
  function pezzo(ctx, x, y, p, t, alfa) {
    var flip = Math.cos(t * p.vf + p.rot);
    ctx.save(); ctx.globalAlpha = alfa; ctx.translate(x, y); ctx.rotate(p.rot + t * p.vr);
    ctx.scale(1, Math.max(.18, Math.abs(flip)));
    var col = ST.conf[p.ci % ST.conf.length];
    if (ST.petali && p.forma === 2) col = '#d8b25a';
    ctx.fillStyle = flip < 0 ? scurisci(col, .8) : col;
    var s = p.s, q = new Path2D();
    if (ST.petali && p.forma !== 2) { // petalo di carta con la sua nervatura
      s *= 1.25; q.moveTo(0, -s * .62); q.quadraticCurveTo(s * .48, -s * .1, 0, s * .62); q.quadraticCurveTo(-s * .48, -s * .1, 0, -s * .62);
      ctx.fill(q); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -s * .45); ctx.lineTo(0, s * .45); ctx.stroke();
      ctx.restore(); return;
    }
    if (p.forma === 0 || p.forma === 3) q.rect(-s / 2, -s * .32, s, s * .64);
    else if (p.forma === 1) q.arc(0, 0, s * .45, 0, 7);
    else if (p.forma === 2) stella(q, 0, 0, s * .6, s * .27, 5, 0);
    else cuore(q, 0, s * .1, s * .5);
    ctx.fill(q); ctx.restore();
  }
  function coriandoli(ctx, t, start, alfa, fisso) {
    for (var i = 0; i < CONF.length; i++) {
      var p = CONF[i], tau = fisso ? (p.dl + 9.7) : (t - start - p.dl);
      if (tau < 0) continue;
      var y = -60 + (tau * p.v) % (H + 120), x = p.x + Math.sin(tau * p.fr + p.fase) * p.amp;
      if (fisso && ((y > 150 && y < 720) || (y > 1120 && y < 1420))) continue;
      pezzo(ctx, x, y, p, fisso ? 3 + i : t, alfa);
    }
  }
  function scoppio(ctx, t0, t) {
    var tau0 = t - t0; if (tau0 < 0 || tau0 > 3.2) return;
    for (var i = 0; i < SCOPPIO.length; i++) {
      var p = SCOPPIO[i], tau = tau0 - p.dl; if (tau < 0) continue;
      var x0 = p.lato < 0 ? -20 : W + 20, x = x0 - p.lato * p.vx * tau * Math.exp(-tau * .6), y = 1350 + p.vy * tau + 0.5 * 1300 * tau * tau;
      if (y > H + 40) continue;
      pezzo(ctx, x, y, p, t, clamp(3.2 - tau0));
    }
  }

  /* ---------- fotogramma ---------- */
  var COPERTINA_T = 12.4, sbuffi = [];
  /* opz: {nome, frase, firma, durataMusica T, copertina:bool} */
  function disegnaFotogramma(ctx, t, opz) {
    if (!STRATI) return;
    var cop = !!opz.copertina || t < 0.6, T = opz.durataMusica || 20, tv = COPERTINA_T + (opz.copertina ? 0 : t);
    var fr = layoutFrase(ctx, opz.frase || ''), N = preparaNome(opz.nome || '');
    var Dtot = opz.durata || T, fineScena = opz.logo && LOGO ? Dtot - 3 : Dtot, tFirma = fineScena - 2.6;
    // --- tempi ---
    var fase0 = !cop && t < 0.6;             // copertina ferma
    var usc = cop ? 0 : eInOut((t - 0.6) / 0.8); // dissolvenza
    var testoCop = cop ? 1 : (1 - eInOut((t - 0.6) / 0.7));
    var lenNome = Math.max(1, (opz.nome || '').length);
    var durNome = Math.min(3.4, 1.5 + lenNome * .12), tNome = 4.4;
    var progNome = cop ? 1 : clamp((t - tNome) / durNome);
    var fineNome = tNome + durNome;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // strati con parallasse
    for (var i = 0; i < STRATI.length; i++) {
      var s = STRATI[i];
      if (s.fisso) {
        var z = 1.03 + .025 * Math.sin(tv * .25);
        ctx.save(); ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-540, -960); ctx.drawImage(s.c, 0, 0); ctx.restore();
        continue;
      }
      var affondo;
      if (cop) affondo = 0;
      else if (t < 1.4) affondo = usc;
      else affondo = 1 - eBack((t - 1.4 - .11 * i) / 1.05);
      var dx = Math.sin(tv * .45 + i * .7) * 9 * s.prof, dy = Math.sin(tv * .33 + i) * 6 * s.prof + affondo * 90 * s.prof;
      ctx.drawImage(s.c, -M + dx, s.top + dy);
      if (s.torta) { // fiamme sopra la torta
        var accese = 0; sbuffi = [];
        for (var c = 0; c < ST.candele.length; c++) {
          var k;
          if (cop || fase0) k = 1;
          else {
            var ti = 1.5 + c * (ST.candele.length > 1 ? 1.2 / (ST.candele.length - 1) : 0);
            k = t < ti ? 1 - eInOut((t - 0.6) / 0.6) : eBack((t - ti) / .35);
            sbuffi.push([ST.candele[c] + dx, ST.stoppino + dy - 18, t - ti]);
          }
          accese += k;
          fiamma(ctx, ST.candele[c] + dx, ST.stoppino + dy, tv, c, k * ST.fiammaK);
        }
        // alone caldo
        if (accese > 0) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          var pul = .16 + .03 * Math.sin(tv * 5.3) + .02 * Math.sin(tv * 9.1), rad = 420;
          var ax = ST.alone[0], ay = ST.alone[1], g = ctx.createRadialGradient(ax + dx, ay + dy, 0, ax + dx, ay + dy, rad);
          g.addColorStop(0, 'rgba(255,190,100,' + (pul * ST.aloneK * accese / ST.candele.length) + ')'); g.addColorStop(1, 'rgba(255,170,80,0)');
          ctx.fillStyle = g; ctx.fillRect(ax - rad + dx, ay - rad + dy, rad * 2, rad * 2); ctx.restore();
        }
      }
    }
    // sbuffi di scintille quando si riaccendono le candeline
    for (var sb = 0; sb < sbuffi.length; sb++) {
      var S0 = sbuffi[sb], tau = S0[2];
      if (tau < 0 || tau > .8) continue;
      var pr = eOut(tau / .8);
      for (var j = 0; j < 12; j++) {
        var an = j / 12 * 6.283 + sb, dist = pr * (55 + (j % 3) * 22);
        var px = S0[0] + Math.cos(an) * dist, py = S0[1] + Math.sin(an) * dist * .8 - pr * 20, rr = (j % 3 ? 6 : 10) * (1 - tau / .8) + 1;
        ctx.save(); ctx.globalAlpha = 1 - tau / .8; ctx.fillStyle = j % 2 ? '#e3a63a' : '#f6c75a';
        ctx.shadowColor = 'rgba(200,120,20,.6)'; ctx.shadowBlur = 8;
        ctx.fill(stella(new Path2D(), px, py, rr * 1.4, rr * .6, 4, an)); ctx.restore();
      }
      scintilla(ctx, S0[0], S0[1], 30 * (1 - tau / .8), 1 - tau / .8);
    }
    // stelle appese e festoni
    var dyAlto = cop ? 0 : (t < 1.4 ? -usc * 40 : -(1 - eBack((t - 1.6) / 1)) * 40);
    stellePendenti(ctx, tv, dyAlto);
    if (ST.festoni) festoni(ctx, tv, dyAlto);

    // coriandoli
    if (cop || fase0) coriandoli(ctx, 0, 0, 1, true);
    else {
      if (t < 1.4) coriandoli(ctx, 0, 0, 1 - eInOut((t - 0.6) / 0.6), true);
      coriandoli(ctx, t, 2.2, 1, false);
      scoppio(ctx, tFirma - .3, t);
    }

    // frase
    ctx.save();
    ctx.font = 'italic 600 ' + fr.size + 'px ' + FONT_FRASE; ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(90,20,20,.32)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6; ctx.fillStyle = ST.frase;
    for (var l = 0; l < fr.lettere.length; l++) {
      var L = fr.lettere[l], a, oy = 0;
      if (cop || fase0) a = 1;
      else if (t < 2.8) a = testoCop;
      else { var pl = (t - 3.0 - l * .045) / .55; a = eOut(pl); oy = (1 - eOut(pl)) * 34; }
      if (a <= 0) continue;
      ctx.globalAlpha = a; ctx.fillText(L.ch, L.x, L.y + oy);
    }
    ctx.restore();
    // fregio sotto la frase
    var fp = cop ? 1 : (t < 2.8 ? testoCop : eOut((t - 3.6) / 1));
    if (fp > 0) {
      var fy = Math.min(fr.basso + 44, 700), lw = 170 * fp;
      ctx.save(); ctx.globalAlpha = Math.min(1, fp * 1.5); ctx.strokeStyle = ST.fregio; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(540 - 34, fy); ctx.lineTo(540 - 34 - lw, fy); ctx.moveTo(540 + 34, fy); ctx.lineTo(540 + 34 + lw, fy); ctx.stroke();
      var cu = cuore(new Path2D(), 540, fy + 6, 22); ctx.shadowColor = 'rgba(90,20,20,.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
      ctx.fillStyle = ST.cuore; ctx.fill(cu); ctx.restore();
    }

    // nome
    var alfaNome = (cop || fase0) ? 1 : (t < 2.8 ? testoCop : 1);
    var progN = (cop || fase0) ? 1 : (t < 2.8 ? 1 : progNome);
    var luce = null;
    if (!cop && t >= fineNome + .5) luce = ((t - fineNome - .5) % 5.5) / 1.2 - .1;
    disegnaNome(ctx, N, progN, luce, alfaNome);
    // scintille: alla punta mentre scrive, poi qua e là
    if (!cop && !fase0 && t >= tNome && t < fineNome + .7) {
      for (var e = 0; e < 14; e++) {
        var te = t - e * .05; if (te < tNome) continue;
        var P = N.punta(clamp((te - tNome) / durNome)), age = e * .05, hy = P.y + Math.sin(te * 9) * P.h * .25;
        scintilla(ctx, P.x - age * 30, hy + age * 120, (e ? 9 : 26) * (1 - age), e ? .8 - age : (t < fineNome ? 1 : 1 - (t - fineNome) / .7));
      }
    }
    if (cop || t >= fineNome) {
      for (var q = 0; q < N.lucc.length; q++) {
        var sp = N.lucc[q], tw = Math.sin(tv * sp.v + sp.f);
        scintilla(ctx, sp.x, sp.y, sp.s * Math.max(0, tw) * (cop ? .7 : 1), tw * (cop ? .6 : clamp((t - fineNome) / .8)));
      }
    }
    // firma finale, grande e centrata sotto la frase
    if (!cop && opz.firma && t > tFirma) {
      var fa = eOut((t - tFirma) / 1.1), fyF = Math.min(fr.basso + 205, 735);
      ctx.save(); ctx.font = '128px ' + FONT_NOME; ctx.textAlign = 'center';
      var wF = ctx.measureText('Fulvio').width;
      ctx.beginPath(); ctx.rect(540 - wF / 2 - 30, fyF - 140, (wF + 60) * fa, 200); ctx.clip(); // si scrive da sinistra
      ctx.shadowColor = 'rgba(60,20,10,.3)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
      ctx.fillStyle = ST.firma; ctx.fillText('Fulvio', 540, fyF);
      ctx.restore();
    }
    // chiusura col logo KYRIOS
    if (!cop && opz.logo && LOGO && t > fineScena) disegnaChiusura(ctx, t - fineScena, tv);
  }

  var LOGO = null;
  function impostaLogo(img) {
    if (!img) { LOGO = null; return; }
    var D = 600, c = tela(D + 80, D + 80), x = c.getContext('2d'), r = D / 2, cx = (D + 80) / 2;
    x.save(); x.shadowColor = 'rgba(60,30,10,.35)'; x.shadowBlur = 34; x.shadowOffsetY = 14;
    x.beginPath(); x.arc(cx, cx, r, 0, 7); x.fillStyle = '#fffaf0'; x.fill(); x.restore();
    x.save(); x.beginPath(); x.arc(cx, cx, r - 12, 0, 7); x.clip();
    var sc = Math.max((D - 24) / img.width, (D - 24) / img.height);
    x.drawImage(img, cx - img.width * sc / 2, cx - img.height * sc / 2, img.width * sc, img.height * sc); x.restore();
    var g = x.createLinearGradient(0, cx - r, 0, cx + r); g.addColorStop(0, '#f3d27a'); g.addColorStop(.5, '#b9852a'); g.addColorStop(1, '#efc866');
    x.lineWidth = 12; x.strokeStyle = g; x.beginPath(); x.arc(cx, cx, r - 6, 0, 7); x.stroke();
    LOGO = c;
  }
  function disegnaChiusura(ctx, u, tv) {
    var a = eInOut(u / .6);
    ctx.save(); ctx.globalAlpha = a;
    var g = ctx.createRadialGradient(540, 860, 80, 540, 960, 1150); g.addColorStop(0, ST.fondo[0]); g.addColorStop(1, ST.fondo[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); applicaGrana(ctx, W, H);
    ctx.restore();
    var k = eBack((u - .25) / .8);
    if (k > 0) {
      var d = LOGO.width * (.82 + .18 * k);
      ctx.save(); ctx.globalAlpha = clamp((u - .25) / .4);
      ctx.drawImage(LOGO, 540 - d / 2, 860 - d / 2, d, d);
      // riflesso che gira sull'anello
      var an = tv * 1.6, rr = (LOGO.width - 80) / 2 * (d / LOGO.width) - 6;
      scintilla(ctx, 540 + Math.cos(an) * rr, 860 + Math.sin(an) * rr, 22, .9);
      ctx.restore();
    }
    var tA = clamp((u - .8) / .6);
    if (tA > 0) {
      ctx.save(); ctx.globalAlpha = tA; ctx.textAlign = 'center'; ctx.fillStyle = ST.frase;
      var sz = 58; ctx.font = '700 ' + sz + 'px "CinzelKY", serif';
      while (ctx.measureText('Comunità KYRIOS — Lecce').width > 900 && sz > 30) { sz -= 2; ctx.font = '700 ' + sz + 'px "CinzelKY", serif'; }
      ctx.shadowColor = 'rgba(90,30,20,.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      ctx.fillText('Comunità KYRIOS — Lecce', 540, 1270 + (1 - eOut(tA)) * 24);
      ctx.restore();
    }
    for (var i = 0; i < 10; i++) {
      var an2 = i / 10 * 6.283 + tv * .3, tw = Math.sin(tv * 2.3 + i * 1.7);
      scintilla(ctx, 540 + Math.cos(an2) * 380, 860 + Math.sin(an2) * 380, 14 * Math.max(0, tw), tw * clamp((u - .6) / .5));
    }
  }

  window.ScenaAuguri = {
    W: W, H: H, usaStile: usaStile, impostaLogo: impostaLogo, stili: Object.keys(STILI), disegnaFotogramma: disegnaFotogramma,
    svuotaCache: function () { cacheFrase = {}; cacheNome = {}; },
    fasciaNome: function (nome) { var N = preparaNome(nome); return { top: N.top, bot: N.bot, sx: N.sx, ex: N.ex, size: N.size, righe: N.righe.length }; },
    fasciaFrase: function (ctx, f) { var r = layoutFrase(ctx, f); return { size: r.size, righe: r.righe, basso: r.basso }; }
  };
})();
