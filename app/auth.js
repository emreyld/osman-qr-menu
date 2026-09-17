/* Hesaplar, oturum ve yetkiler.

   ÖNEMLİ: bu sürümde hesaplar cihazda tutulur ve parola basit karmayla saklanır.
   Gerçek sistemde bu dosyanın yerini sunucu alacak (Supabase Auth + satır bazlı
   yetki). Uygulamanın geri kalanı yalnızca Auth üzerinden konuştuğu için o geçiş
   ekranları değiştirmeyecek. */
(function () {
  "use strict";

  var KEY_SESSION = "osman-session";
  var listeners = [];
  var session = null;      // { userId, at }
  var users = null;        // Store.settings().users

  /* ---------- yetkiler ---------- */
  var PERMS = {
    admin: {
      tables: true, order: true, close: true, discount: true, voidItem: true,
      report: true, manage: true, backup: true
    },
    waiter: {
      tables: true, order: true, close: true, discount: false, voidItem: false,
      report: false, manage: false, backup: false
    }
  };

  var PERM_LABEL = {
    close: "Hesap kapatabilir",
    discount: "İkram / indirim yapabilir",
    voidItem: "Mutfağa gitmiş ürünü iptal edebilir",
    report: "Gün sonu raporunu görebilir"
  };

  /* ---------- parola ---------- */
  /* Güvenli bağlamda SHA-256, değilse basit karma (yalnızca deneme sürümü için). */
  function hash(pw, salt) {
    var txt = salt + "::" + pw;
    if (window.crypto && window.crypto.subtle && window.isSecureContext) {
      var buf = new TextEncoder().encode(txt);
      return window.crypto.subtle.digest("SHA-256", buf).then(function (d) {
        return Array.prototype.map.call(new Uint8Array(d), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    var h = 5381;
    for (var i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) >>> 0;
    return Promise.resolve("w" + h.toString(16));
  }

  function salt() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function norm(u) { return String(u || "").trim().toLocaleLowerCase("tr"); }

  /* ---------- depolama ---------- */
  function load() {
    users = Store.settings().users || [];
  }
  function save() {
    return Store.saveSettings({ users: users });
  }
  function emit() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  var Auth = {
    onChange: function (fn) { listeners.push(fn); },

    init: function () {
      load();
      try {
        var raw = localStorage.getItem(KEY_SESSION);
        if (raw) {
          var s = JSON.parse(raw);
          if (s && Auth.user(s.userId)) session = s;
        }
      } catch (e) {}
      return Auth;
    },

    /* ilk açılışta hiç hesap yoksa kurulum ekranı gösterilir */
    needsSetup: function () { return !users || !users.length; },

    users: function () { return (users || []).slice(); },
    staff: function () {
      return (users || []).filter(function (u) { return u.role === "waiter"; });
    },
    user: function (id) {
      return (users || []).filter(function (u) { return u.id === id; })[0];
    },
    current: function () { return session ? Auth.user(session.userId) : null; },
    isAdmin: function () {
      var u = Auth.current();
      return !!u && u.role === "admin";
    },

    can: function (what) {
      var u = Auth.current();
      if (!u) return false;
      if (u.perms && Object.prototype.hasOwnProperty.call(u.perms, what)) return !!u.perms[what];
      return !!(PERMS[u.role] || {})[what];
    },

    permLabels: function () { return PERM_LABEL; },
    defaultPerms: function (role) { return JSON.parse(JSON.stringify(PERMS[role] || PERMS.waiter)); },

    /* ---------- hesap işlemleri ---------- */
    create: function (opts) {
      var un = norm(opts.username);
      if (!un) return Promise.reject("kullanıcı adı boş");
      if (!opts.password || opts.password.length < 4) return Promise.reject("parola en az 4 karakter olmalı");
      if ((users || []).some(function (u) { return u.username === un; })) return Promise.reject("bu kullanıcı adı zaten var");
      var s = salt();
      return hash(opts.password, s).then(function (h) {
        var u = {
          id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          username: un,
          name: (opts.name || opts.username).trim(),
          role: opts.role === "admin" ? "admin" : "waiter",
          salt: s, hash: h,
          perms: opts.perms || Auth.defaultPerms(opts.role),
          active: true,
          createdAt: Date.now()
        };
        users.push(u);
        return save().then(function () { emit(); return u; });
      });
    },

    update: function (id, patch) {
      var u = Auth.user(id);
      if (!u) return Promise.reject("hesap yok");
      if (patch.name !== undefined) u.name = String(patch.name).trim();
      if (patch.active !== undefined) u.active = !!patch.active;
      if (patch.perms !== undefined) u.perms = patch.perms;
      return save().then(function () { emit(); return u; });
    },

    setPassword: function (id, pw) {
      var u = Auth.user(id);
      if (!u) return Promise.reject("hesap yok");
      if (!pw || pw.length < 4) return Promise.reject("parola en az 4 karakter olmalı");
      var s = salt();
      return hash(pw, s).then(function (h) {
        u.salt = s; u.hash = h;
        return save().then(function () { emit(); return u; });
      });
    },

    remove: function (id) {
      var u = Auth.user(id);
      if (!u) return Promise.resolve();
      if (u.role === "admin" && users.filter(function (x) { return x.role === "admin"; }).length < 2) {
        return Promise.reject("son yönetici silinemez");
      }
      users = users.filter(function (x) { return x.id !== id; });
      if (session && session.userId === id) Auth.logout();
      return save().then(function () { emit(); });
    },

    /* ---------- oturum ---------- */
    login: function (username, password) {
      var un = norm(username);
      var u = (users || []).filter(function (x) { return x.username === un; })[0];
      if (!u) return Promise.reject("kullanıcı adı veya parola hatalı");
      if (!u.active) return Promise.reject("bu hesap kapalı");
      return hash(password, u.salt).then(function (h) {
        if (h !== u.hash) return Promise.reject("kullanıcı adı veya parola hatalı");
        session = { userId: u.id, at: Date.now() };
        try { localStorage.setItem(KEY_SESSION, JSON.stringify(session)); } catch (e) {}
        emit();
        return u;
      });
    },

    logout: function () {
      session = null;
      try { localStorage.removeItem(KEY_SESSION); } catch (e) {}
      emit();
    },

    /* ilk kurulum: işletme sahibinin hesabı */
    setup: function (opts) {
      return Auth.create({
        username: opts.username, password: opts.password,
        name: opts.name, role: "admin"
      }).then(function (u) {
        return Auth.login(opts.username, opts.password).then(function () { return u; });
      });
    }
  };

  window.Auth = Auth;
})();
