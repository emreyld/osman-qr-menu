/* Hesaplar ve yetkiler — artık sunucuda (Supabase Auth + staff tablosu).
   Yetki denetimi asıl olarak veritabanında yapılır; buradaki kontroller
   yalnızca arayüzü sadeleştirmek içindir. */
(function () {
  "use strict";

  var listeners = [];
  var me = null;        // staff satırı
  var team = [];        // aynı işletmenin personeli
  var venue = null;     // venues satırı

  var PERM_LABEL = {
    close: "Hesap kapatabilir",
    discount: "İkram / indirim yapabilir",
    voidItem: "Mutfağa gitmiş ürünü iptal edebilir",
    report: "Gün sonu raporunu görebilir"
  };
  var DEFAULT_ON = { tables: true, order: true, close: true };

  function emit() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  function cacheKey() { return "osman-profile"; }
  function cacheWrite() {
    try {
      localStorage.setItem(cacheKey(), JSON.stringify({ me: me, team: team, venue: venue }));
    } catch (e) {}
  }
  function cacheRead() {
    try {
      var d = JSON.parse(localStorage.getItem(cacheKey()) || "null");
      if (d) { me = d.me; team = d.team || []; venue = d.venue; }
    } catch (e) {}
  }

  function pullProfile() {
    var uid = Cloud.userId();
    if (!uid) return Promise.resolve(null);
    return Promise.all([
      Cloud.select("staff", "select=*&order=role.asc,name.asc"),
      Cloud.select("venues", "select=*&limit=1")
    ]).then(function (r) {
      team = r[0] || [];
      venue = (r[1] || [])[0] || null;
      me = team.filter(function (s) { return s.id === uid; })[0] || null;
      cacheWrite();
      return me;
    });
  }

  var Auth = {
    onChange: function (fn) { listeners.push(fn); },

    init: function () {
      cacheRead();
      var s = Cloud.restore();
      if (!s) { me = null; team = []; return Promise.resolve(null); }
      if (!Cloud.online()) return Promise.resolve(me);      // çevrimdışı: önbellekteki profil
      return pullProfile().catch(function () { return me; });
    },

    refresh: function () { return pullProfile().then(function () { emit(); }); },

    /* işletmeyi biz kuruyoruz; uygulamada kurulum ekranı yok */
    needsSetup: function () { return false; },

    venue: function () { return venue; },
    current: function () { return me; },
    users: function () { return team.slice(); },
    staff: function () { return team.filter(function (s) { return s.role === "waiter"; }); },
    user: function (id) { return team.filter(function (s) { return s.id === id; })[0]; },
    isAdmin: function () { return !!me && me.role === "admin"; },

    can: function (what) {
      if (!me || !me.active) return false;
      if (me.role === "admin") return true;
      var p = me.perms || {};
      if (Object.prototype.hasOwnProperty.call(p, what)) return !!p[what];
      return !!DEFAULT_ON[what];
    },

    permLabels: function () { return PERM_LABEL; },
    defaultPerms: function () { return { close: true, discount: false, voidItem: false, report: false }; },

    /* ---------- oturum ---------- */
    login: function (username, password) {
      if (!Cloud.online()) return Promise.reject("İnternet yok — giriş için bağlantı gerekiyor");
      return Cloud.signIn(username, password)
        .then(pullProfile)
        .then(function (u) {
          if (!u) { Cloud.signOut(); throw "Bu hesap bu işletmeye tanımlı değil"; }
          if (!u.active) { Cloud.signOut(); throw "Bu hesap kapalı"; }
          emit();
          return u;
        })
        .catch(function (e) { throw (e && e.message) || e; });
    },

    logout: function () {
      return Cloud.signOut().then(function () {
        me = null; team = []; venue = null;
        try { localStorage.removeItem(cacheKey()); } catch (e) {}
        emit();
      });
    },

    /* ---------- personel yönetimi (yalnızca yönetici) ---------- */
    create: function (opts) {
      if (!Auth.isAdmin()) return Promise.reject("Yetkin yok");
      if (!venue || !venue.join_code) return Promise.reject("İşletme bilgisi okunamadı");
      var un = String(opts.username || "").trim().toLowerCase();
      if (!un) return Promise.reject("Kullanıcı adı boş");
      if (!opts.password || opts.password.length < 6) return Promise.reject("Parola en az 6 karakter olmalı");
      if (team.some(function (s) { return s.username === un; })) return Promise.reject("Bu kullanıcı adı zaten var");

      return Cloud.signUp({
        username: un, password: opts.password, name: opts.name || un,
        joinCode: venue.join_code, perms: opts.perms || Auth.defaultPerms()
      }).then(function () {
        return pullProfile();
      }).then(function () {
        emit();
        return team.filter(function (s) { return s.username === un; })[0];
      }).catch(function (e) { throw (e && e.message) || e; });
    },

    update: function (id, patch) {
      if (!Auth.isAdmin()) return Promise.reject("Yetkin yok");
      var body = {};
      if (patch.name !== undefined) body.name = String(patch.name).trim();
      if (patch.active !== undefined) body.active = !!patch.active;
      if (patch.perms !== undefined) body.perms = patch.perms;
      return Cloud.update("staff", "id=eq." + id, body)
        .then(function () { return pullProfile(); })
        .then(function () { emit(); })
        .catch(function (e) { throw (e && e.message) || e; });
    },

    /* Kendi parolanı değiştirebilirsin. Başkasınınkini sıfırlamak sunucu
       tarafında yönetici anahtarı ister — o yüzden burada engelli. */
    canResetOthers: function () { return false; },
    setPassword: function (id, pw) {
      if (!me || id !== me.id) {
        return Promise.reject("Parolayı ancak kişinin kendisi değiştirebilir");
      }
      if (!pw || pw.length < 6) return Promise.reject("Parola en az 6 karakter olmalı");
      return Cloud.changePassword(pw).catch(function (e) { throw (e && e.message) || e; });
    },

    remove: function (id) {
      if (!Auth.isAdmin()) return Promise.reject("Yetkin yok");
      if (me && id === me.id) return Promise.reject("Kendi hesabını silemezsin");
      return Cloud.remove("staff", "id=eq." + id)
        .then(function () { return pullProfile(); })
        .then(function () { emit(); })
        .catch(function (e) { throw (e && e.message) || e; });
    }
  };

  window.Auth = Auth;
})();
