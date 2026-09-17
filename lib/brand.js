/* Marka ve süsleme kitaplığı — Osman Gourmet Beydağı
   Logo kilidi, İznik/kilim motifleri, bordürler, yemek çizimleri.
   Hepsi currentColor kullanır; her tasarım kendi rengini verir. */
(function () {

  function svg(vb, body, attrs) {
    return '<svg viewBox="' + vb + '" ' + (attrs || "") + ' aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ---------------------------------------------------------------
     1. LOGO — basılı menüdeki kilidin birebir kurgusu
     .lk-orn (çatal+spatula+kıvrımlar) SVG, yazılar HTML.
     Her tasarım .lk-* sınıflarını kendi CSS'inde biçimlendirir.
  --------------------------------------------------------------- */

  /* Çapraz çatal + spatula, iki yanda kıvrım */
  function crest(h) {
    var body =
      /* sol kıvrım */
      '<path d="M46 44C36 40 25 41 19 47c-6 6-5 15 2 18 6 3 13-1 13-8 0-5-4-8-8-6" ' +
        'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M21 65c-7 2-11 7-11 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="10" cy="80" r="2.6" fill="currentColor"/>' +
      /* sağ kıvrım */
      '<path d="M114 44c10-4 21-3 27 3 6 6 5 15-2 18-6 3-13-1-13-8 0-5 4-8 8-6" ' +
        'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M139 65c7 2 11 7 11 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="150" cy="80" r="2.6" fill="currentColor"/>' +
      /* çatal — soldan sağ üste */
      '<g fill="currentColor">' +
        '<path d="M63.6 84.8 60.4 82.2 92.9 42.4 96.1 45z"/>' +
        '<path d="M94 43.4c2.6-4.4 3.6-9.2 3.1-13.8l3.6.1c.8 3.8.4 7.6-1 11.2z"/>' +
        '<path d="M100.6 29.7c.4-3.4 1.8-6.6 4-9.4l2.8 1.8c-1.6 2.4-2.6 5-3 7.7z"/>' +
        '<path d="M104.5 32.9c1-3.3 2.9-6.3 5.6-8.7l2.4 2.3c-2 2-3.4 4.4-4.2 7z"/>' +
        '<path d="M107.9 36.7c1.6-3 4-5.6 7-7.4l1.9 2.7c-2.3 1.5-4.1 3.5-5.3 5.9z"/>' +
      '</g>' +
      /* spatula — sağdan sol üste */
      '<g fill="currentColor">' +
        '<path d="M96.4 84.8 99.6 82.2 67.1 42.4 63.9 45z"/>' +
        '<path d="M65.8 43.2c-4.6-5.9-6.2-12-4.4-16.6 1.9-4.7 7-6.2 10.9-3.2 4 3.1 5.1 9.3 2.6 15.1z" />' +
        '<path d="M66.3 30.6c1.2 2.6 2.9 5 5 7.2" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1.4"/>' +
      '</g>';
    return svg("0 0 160 92", body, 'class="lk-crest" height="' + (h || 46) + '"');
  }

  /* Tam logo kilidi */
  function lockup(opts) {
    opts = opts || {};
    var h = opts.crest || 46;
    return '<span class="lk">' +
      (opts.noCrest ? "" : '<span class="lk-orn">' + crest(h) + '</span>') +
      '<span class="lk-word">' +
        '<span class="lk-main">OSMAN</span>' +
        '<span class="lk-stack"><i>GOURME</i><i>BEYDAĞI</i></span>' +
      '</span>' +
      (opts.noSince ? "" : '<span class="lk-since"><i></i>SINCE 2008<i></i></span>') +
      (opts.noSub ? "" : '<span class="lk-sub">MEZZE · KEBAB · TURKISH PITA</span>') +
      '</span>';
  }

  /* ---------------------------------------------------------------
     2. İZNİK MOTİFLERİ — 100×100 kutu, doldurulabilir
  --------------------------------------------------------------- */
  var M = {
    /* Lale — İznik'in imza motifi */
    tulip: '<path d="M50 96C26 84 16 62 20 42c2-11 8-18 12-25l4-7 3 9c1 4 1 8-1 12 4-5 9-8 12-15 3 7 8 10 12 15-2-4-2-8-1-12l3-9 4 7c4 7 10 14 12 25 4 20-6 42-30 54Z"/>' +
           '<path d="M50 14v70M36 26c-3 14-4 30-2 44M64 26c3 14 4 30 2 44" fill="none" stroke="currentColor" stroke-width="2.2" stroke-opacity=".38" stroke-linecap="round"/>',

    /* Karanfil — yelpaze, dişli üst kenar */
    carnation: '<path d="M50 98C36 86 27 70 24 52L18 28l12 11-3-19 12 12-2-20 11 14 2-16 2 16 11-14-2 20 12-12-3 19 12-11-6 24c-3 18-12 34-26 46Z"/>' +
               '<path d="M50 40v52M36 44c2 14 6 26 14 36M64 44c-2 14-6 26-14 36" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity=".35" stroke-linecap="round"/>',

    /* Rumi — yarık yaprak kıvrımı */
    rumi: '<path d="M8 92C10 56 28 28 60 15c14-6 28-2 33 9 5 10-2 21-13 21-8 0-13-6-11-13 2-6 10-7 13-2" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>' +
          '<path d="M24 88C28 60 42 38 64 29" fill="none" stroke="currentColor" stroke-width="3" stroke-opacity=".5" stroke-linecap="round"/>',

    /* Saz yaprağı — uzun, dişli, kıvrımlı */
    saz: '<path d="M4 96C22 70 40 44 64 26 76 17 88 11 97 10c-3 11-10 24-21 38C62 68 36 86 4 96Z"/>' +
         '<path d="M6 94C26 74 48 52 70 34M20 78l-4 12M34 64l-5 12M48 50l-6 12M62 37l-6 11" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity=".4" stroke-linecap="round"/>',

    /* Penç / hatayi — açılmış gonca */
    bud: '<path d="M50 94C30 82 22 62 26 44c3-13 13-22 24-28 11 6 21 15 24 28 4 18-4 38-24 50Z"/>' +
         '<path d="M50 20v70M34 40c0 18 6 34 16 46M66 40c0 18-6 34-16 46" fill="none" stroke="currentColor" stroke-width="2.2" stroke-opacity=".38"/>',

    /* Kilim: elibelinde */
    eli: '<path d="M50 12 38 24v10l-14 8v14l14-6v12l-12 14h24l-12-14V50l14 6V42l-14-8V24z"/>' +
         '<path d="M50 12 62 24v10l14 8v14l-14-6v12l12 14H50" fill="currentColor"/>',

    /* Kilim: koçboynuzu */
    horn: '<path d="M50 84V40c0-14-8-22-18-22-8 0-14 5-14 12 0 6 4 10 10 10 4 0 7-3 7-6" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M50 40c0-14 8-22 18-22 8 0 14 5 14 12 0 6-4 10-10 10-4 0-7-3-7-6" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>'
  };

  function motif(name, size, cls) {
    return svg("0 0 100 100", M[name] || M.tulip,
      'width="' + size + '" height="' + size + '" fill="currentColor"' + (cls ? ' class="' + cls + '"' : ""));
  }

  /* Işınsal gül — n yapraklı, döndürülerek üretilir */
  function rosette(n, size) {
    n = n || 8;
    var petals = "";
    for (var i = 0; i < n; i++) {
      petals += '<path d="M50 50C44 38 44 22 50 8c6 14 6 30 0 42Z" transform="rotate(' + (360 / n * i) + ' 50 50)"/>';
    }
    return svg("0 0 100 100",
      petals + '<circle cx="50" cy="50" r="7" fill="currentColor"/>' +
      '<circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity=".5"/>',
      'width="' + size + '" height="' + size + '" fill="currentColor"');
  }

  /* ---------------------------------------------------------------
     3. BORDÜRLER — yatay şerit, genişliğe göre tekrar eder
  --------------------------------------------------------------- */
  function band(kind, h, cls) {
    var id = "bd" + Math.random().toString(36).slice(2, 8);
    var tile = {
      /* kıvrım dalga */
      rumi: '<path d="M0 12c6 0 6-8 12-8s6 8 12 8 6-8 12-8 6 8 12 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
            '<circle cx="12" cy="4" r="1.3"/><circle cx="36" cy="4" r="1.3"/>',
      /* çini zikzak + yıldız */
      tile: '<path d="M0 16 8 6l8 10 8-10 8 10 8-10 8 10" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
            '<path d="M8 20l1.6 3.4 3.4 1.6-3.4 1.6L8 30l-1.6-3.4L3 25l3.4-1.6z"/>' +
            '<path d="M32 20l1.6 3.4 3.4 1.6-3.4 1.6L32 30l-1.6-3.4L27 25l3.4-1.6z"/>',
      /* kilim elmas */
      kilim: '<path d="M12 4 20 16 12 28 4 16z" fill="none" stroke="currentColor" stroke-width="2"/>' +
             '<path d="M12 10 16 16l-4 6-4-6z"/>' +
             '<path d="M24 16h12M0 16h0" fill="none" stroke="currentColor" stroke-width="2"/>' +
             '<path d="M36 4 44 16l-8 12-8-12z" fill="none" stroke="currentColor" stroke-width="2"/>',
      /* ince nokta-çizgi */
      thin: '<path d="M0 8h16M24 8h24M56 8h16" fill="none" stroke="currentColor" stroke-width="1"/>' +
            '<circle cx="20" cy="8" r="2"/><circle cx="52" cy="8" r="2"/>'
    }[kind] || "";
    var w = { rumi: 48, tile: 48, kilim: 48, thin: 72 }[kind] || 48;
    return '<svg class="' + (cls || "band") + '" height="' + h + '" width="100%" preserveAspectRatio="none xMidYMid" ' +
      'viewBox="0 0 ' + w + ' 32" aria-hidden="true" focusable="false" fill="currentColor" ' +
      'style="display:block">' +
      '<defs><pattern id="' + id + '" width="' + w + '" height="32" patternUnits="userSpaceOnUse">' + tile + '</pattern></defs>' +
      '<rect width="100%" height="32" fill="url(#' + id + ')"/></svg>';
  }

  /* Tekrarlı zemin deseni — data URI olarak CSS background-image için */
  function ground(kind, color, opacity) {
    var c = encodeURIComponent(color);
    var art = {
      tulip: '<path d="M30 54C18 48 13 37 15 27c1-6 4-9 6-13l2-4 2 5c0 2 0 4-1 6 2-3 5-4 6-8 2 4 4 5 6 8-1-2-1-4-1-6l2-5 2 4c2 4 5 7 6 13 2 10-3 21-15 27Z"/>',
      star: '<path d="M30 10l3.2 6.8L40 20l-6.8 3.2L30 30l-3.2-6.8L20 20l6.8-3.2z"/><circle cx="8" cy="48" r="2"/><circle cx="52" cy="48" r="2"/>',
      lattice: '<path d="M0 30 30 0l30 30-30 30z" fill="none" stroke="' + color + '" stroke-width="1.2"/>',
      dots: '<circle cx="10" cy="10" r="1.6"/><circle cx="30" cy="30" r="1.6"/><circle cx="50" cy="10" r="1.6"/><circle cx="10" cy="50" r="1.6"/><circle cx="50" cy="50" r="1.6"/>'
    }[kind] || "";
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="' + color + '" opacity="' + (opacity || .1) + '">' + art + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(s).replace(/'/g, "%27") + '")';
  }

  /* ---------------------------------------------------------------
     4. YEMEK ÇİZİMLERİ — düz, iki renkli, kalın konturlu
     currentColor kontur; --fill değişkeni dolgu.
  --------------------------------------------------------------- */
  var D = {
    skewer: '<path d="M6 74 86 22" class="st"/><path d="M26 66c-4-6-2-13 5-16s14 0 16 6-2 13-9 15-9-1-12-5z" class="fl"/>' +
            '<path d="M44 55c-4-6-2-13 5-16s14 0 16 6-2 13-9 15-9-1-12-5z" class="fl"/>' +
            '<path d="M62 44c-4-6-2-13 5-16s14 0 16 6-2 13-9 15-9-1-12-5z" class="fl"/>',
    pide: '<path d="M8 50c8-14 24-22 42-22s34 8 42 22c-8 14-24 22-42 22S16 64 8 50z" class="fl"/>' +
          '<path d="M30 40l6 20M46 36l6 28M62 40l5 20" class="st"/>',
    fish: '<path d="M6 50c14-18 32-24 48-20 8 2 14 7 22 14-8 7-14 12-22 14-16 4-34-2-48-8z" class="fl"/>' +
          '<circle cx="60" cy="44" r="3" class="dot"/><path d="M6 50c4-6 4-14 4-18M6 50c4 6 4 14 4 18" class="st"/>' +
          '<path d="M30 42c6 4 6 12 0 16" class="st"/>',
    tea: '<path d="M32 22h36l-6 34a14 14 0 0 1-24 0z" class="fl"/><path d="M26 82h48" class="st"/>' +
         '<path d="M50 22v42" class="st"/><path d="M38 12c0 4 4 4 4 8M58 10c0 4 4 4 4 8" class="st"/>',
    cup: '<path d="M18 34h44v20a22 22 0 0 1-44 0z" class="fl"/><path d="M62 38h10a9 9 0 0 1 0 18h-10" class="st"/>' +
         '<path d="M10 82h60" class="st"/><path d="M32 16c0 5 4 5 4 10M48 14c0 5 4 5 4 10" class="st"/>',
    glass: '<path d="M18 22h64L54 54v22" class="fl"/><path d="M36 76h36" class="st"/><circle cx="70" cy="32" r="5" class="dot"/>',
    dessert: '<circle cx="50" cy="52" r="28" class="fl"/><path d="M28 40c12 6 32 6 44 0M28 64c12-6 32-6 44 0" class="st"/>' +
             '<path d="M50 24c-6 0-9 4-9 8h18c0-4-3-8-9-8z" class="st"/>',
    salad: '<path d="M16 46h68c0 18-14 30-34 30S16 64 16 46z" class="fl"/>' +
           '<path d="M30 42c2-10 10-16 20-16s18 6 20 16" class="st"/><circle cx="40" cy="36" r="4" class="dot"/><circle cx="60" cy="34" r="4" class="dot"/>',
    steak: '<path d="M14 50c0-18 16-28 34-28s38 10 38 26-18 30-38 30S14 66 14 50z" class="fl"/>' +
           '<circle cx="42" cy="50" r="11" class="st"/>',
    wrap: '<path d="M28 14l40 12-10 60-34-12z" class="fl"/><path d="M32 32l24 7M32 48l20 6M32 64l18 5" class="st"/>',
    pot: '<path d="M18 38h64v22a22 22 0 0 1-22 22H40a22 22 0 0 1-22-22z" class="fl"/>' +
         '<path d="M10 38h80M34 22l4 14M62 20l-3 16" class="st"/>',
    bottle: '<path d="M40 12h20v14l8 12v48a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V38l8-12z" class="fl"/><path d="M32 54h36" class="st"/>'
  };

  function dish(name, size, cls) {
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" ' +
      'class="dish ' + (cls || "") + '" aria-hidden="true" focusable="false">' + (D[name] || D.pide) + '</svg>';
  }

  var DISH_FOR = {
    breakfast: "cup", salads: "salad", kebab: "skewer", ottoman: "pot", casserole: "pot",
    steaks: "steak", seafood: "fish", pide: "pide", wraps: "wrap", pasta: "salad",
    desserts: "dessert", hot: "tea", soft: "glass", mocktails: "glass", cocktails: "glass",
    beer: "bottle", spirits: "bottle"
  };

  var MOTIF_FOR = {
    breakfast: "bud", salads: "saz", kebab: "carnation", ottoman: "tulip", casserole: "bud",
    steaks: "carnation", seafood: "saz", pide: "rosette", wraps: "rumi", pasta: "saz",
    desserts: "tulip", hot: "bud", soft: "rumi", mocktails: "bud", cocktails: "tulip",
    beer: "carnation", spirits: "rumi"
  };

  window.Brand = {
    lockup: lockup, crest: crest,
    motif: motif, rosette: rosette, band: band, ground: ground,
    dish: dish, dishFor: function (id) { return DISH_FOR[id] || "pide"; },
    motifFor: function (id) { return MOTIF_FOR[id] || "tulip"; }
  };
})();
