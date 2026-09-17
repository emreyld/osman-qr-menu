/* Ortak çekirdek: dil, arama, biçimlendirme, logo.
   Her tasarım kendi görünümünü yazar; mantık burada tek yerde durur. */
(function () {
  var LS_KEY = "osman-menu-lang";
  var listeners = [];

  function detect() {
    try { var s = localStorage.getItem(LS_KEY); if (s && window.UI[s]) return s; } catch (e) {}
    var n = (navigator.language || "tr").slice(0, 2).toLowerCase();
    return window.UI[n] ? n : "tr";
  }

  var Q = {
    lang: "tr",

    init: function () {
      window.MENU.forEach(function (cat) {
        cat.items.forEach(function (it, i) { it._id = cat.id + "-" + i; it._cat = cat; });
      });
      Q.lang = detect();
      Q.apply();
      return Q;
    },

    apply: function () {
      var meta = window.LANGS.filter(function (l) { return l.code === Q.lang; })[0] || window.LANGS[0];
      document.documentElement.lang = meta.code;
      document.documentElement.dir = meta.dir;
    },

    setLang: function (code) {
      if (!window.UI[code]) return;
      Q.lang = code;
      try { localStorage.setItem(LS_KEY, code); } catch (e) {}
      Q.apply();
      listeners.forEach(function (fn) { fn(code); });
    },

    onLang: function (fn) { listeners.push(fn); },

    /* UI metni */
    t: function (key) { return (window.UI[Q.lang] || window.UI.tr)[key] || key; },

    /* Çok dilli alan */
    L: function (obj) { return obj ? (obj[Q.lang] || obj.tr) : ""; },

    price: function (p) {
      if (p === null || p === undefined) return Q.t("marketPrice");
      return "₺" + p.toLocaleString("tr-TR");
    },

    priceNumber: function (p) {
      if (p === null || p === undefined) return null;
      return p.toLocaleString("tr-TR");
    },

    tag: function (key) { return Q.L(window.TAGS[key]); },
    allergen: function (key) { return Q.L(window.ALLERGENS[key]); },

    /* Arama: 4 dilde isim + açıklama üzerinde çalışır */
    search: function (query) {
      var q = (query || "").trim().toLocaleLowerCase("tr");
      if (!q) return window.MENU;
      return window.MENU.map(function (cat) {
        var hits = cat.items.filter(function (it) {
          var hay = [];
          window.LANGS.forEach(function (l) {
            if (it.i[l.code]) hay.push(it.i[l.code]);
            if (it.d && it.d[l.code]) hay.push(it.d[l.code]);
          });
          hay.push(Q.L(cat.n));
          return hay.join(" ").toLocaleLowerCase("tr").indexOf(q) !== -1;
        });
        return hits.length ? { id: cat.id, icon: cat.icon, n: cat.n, items: hits } : null;
      }).filter(Boolean);
    },

    find: function (id) {
      var found = null;
      window.MENU.forEach(function (cat) {
        cat.items.forEach(function (it) { if (it._id === id) found = it; });
      });
      return found;
    },

    count: function () {
      return window.MENU.reduce(function (n, c) { return n + c.items.length; }, 0);
    },

    esc: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    },

    /* Marka işareti — currentColor kullanır, her tasarım kendi rengini verir */
    mark: function (size) {
      var s = size || 48;
      return '<svg viewBox="0 0 120 84" width="' + s + '" height="' + (s * 0.7) + '" fill="none" ' +
        'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        /* çatal */
        '<path d="M44 74 L74 22"/>' +
        '<path d="M74 22 c3-6 9-9 13-8 l-9 16z" fill="currentColor" stroke="none"/>' +
        '<path d="M78 14 l-5 9M84 17 l-5 9"/>' +
        /* spatula */
        '<path d="M76 74 L46 22"/>' +
        '<path d="M46 22 c-4-7-3-13 2-15 5-2 9 3 8 10z" fill="currentColor" stroke="none"/>' +
        /* sol kıvrım */
        '<path d="M34 40 c-9-1-14 4-13 10 1 5 8 7 11 3 3-4-1-8-5-6"/>' +
        '<path d="M21 50 c-6 2-9 6-8 10"/>' +
        /* sağ kıvrım */
        '<path d="M86 40 c9-1 14 4 13 10-1 5-8 7-11 3-3-4 1-8 5-6"/>' +
        '<path d="M99 50 c6 2 9 6 8 10"/>' +
        '</svg>';
    },

    /* Küçük kategori simgeleri */
    icon: function (name, size) {
      var s = size || 20;
      var p = {
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        leaf: '<path d="M4 20c0-8 6-14 16-15 1 10-5 16-13 16H4z"/><path d="M9 15c2-3 5-5 8-6"/>',
        flame: '<path d="M12 22c4 0 7-3 7-7 0-5-5-6-4-13-4 2-6 6-6 9 0-1-1-3-2-4-1 2-2 4-2 8 0 4 3 7 7 7z"/>',
        crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"/>',
        pot: '<path d="M5 9h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z"/><path d="M3 9h18M8 5l1 4M16 5l-1 4"/>',
        steak: '<path d="M4 12c0-5 4-8 9-8s8 3 8 7-4 8-9 8-8-3-8-7z"/><circle cx="11" cy="12" r="3"/>',
        fish: '<path d="M3 12c4-5 9-6 13-4 2 1 3 2 5 4-2 2-3 3-5 4-4 2-9 1-13-4z"/><circle cx="16" cy="11" r="1"/><path d="M3 12c1-2 1-4 1-5M3 12c1 2 1 4 1 5"/>',
        pide: '<path d="M2 12c3-4 7-6 10-6s7 2 10 6c-3 4-7 6-10 6s-7-2-10-6z"/><path d="M8 10l2 4M12 9l2 6M16 10l1 4"/>',
        wrap: '<path d="M7 3l10 4-3 14-8-3z"/><path d="M8 8l6 2M8 12l5 2"/>',
        pasta: '<path d="M4 18h16"/><path d="M5 18c0-6 3-10 7-10s7 4 7 10"/><path d="M8 18c0-4 2-6 4-6M12 18c0-4 2-6 4-6"/>',
        dessert: '<path d="M5 11h14l-2 9H7l-2-9z"/><path d="M8 11c0-3 2-5 4-5s4 2 4 5"/><circle cx="12" cy="4" r="1.5"/>',
        coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 2v3M12 2v3"/>',
        glass: '<path d="M7 3h10l-1 8a4 4 0 0 1-8 0L7 3z"/><path d="M12 15v6M9 21h6"/>',
        mocktail: '<path d="M4 5h16l-8 8-8-8z"/><path d="M12 13v7M8 20h8"/><circle cx="17" cy="7" r="1.5"/>',
        cocktail: '<path d="M4 5h16l-8 8-8-8z"/><path d="M12 13v7M8 20h8"/><path d="M15 5l4-3"/>',
        beer: '<path d="M6 7h10v13H6z"/><path d="M16 10h3v6h-3"/><path d="M6 7c0-2 2-3 4-3s2 1 3 1 3 0 3 2"/>',
        bottle: '<path d="M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3z"/><path d="M8 13h8"/>'
      }[name] || '<circle cx="12" cy="12" r="8"/>';
      return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
        'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
    }
  };

  window.Q = Q;
})();
