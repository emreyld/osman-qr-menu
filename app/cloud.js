/* Supabase bağlantısı — ince bir REST ve oturum katmanı.
   Hazır kitaplık yüklemiyoruz: hem dosya küçük kalsın hem çevrimdışı önbelleğe
   girebilsin diye her şey buradan, fetch ile yapılıyor. */
(function () {
  "use strict";

  var CFG = {
    url: "https://iigvcvlgcnitzpijzcwr.supabase.co",
    key: "sb_publishable_DFYPZi7q-lpZpBTMoVxPgg_xSuryC7L",
    venueSlug: "osman",
    emailDomain: "osman.pos"     // kullanıcı adı + bu alan = giriş e-postası
  };

  var SKEY = "osman-cloud-session";
  var sess = null;               // { access_token, refresh_token, expires_at, user }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SKEY);
      if (raw) sess = JSON.parse(raw);
    } catch (e) {}
    return sess;
  }
  function saveSession(s) {
    sess = s;
    try {
      if (s) localStorage.setItem(SKEY, JSON.stringify(s));
      else localStorage.removeItem(SKEY);
    } catch (e) {}
  }

  function bearer() { return (sess && sess.access_token) || CFG.key; }

  function headers(extra) {
    var h = {
      "apikey": CFG.key,
      "Authorization": "Bearer " + bearer(),
      "Content-Type": "application/json"
    };
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  /* ---------- hata metinleri ---------- */
  function niceError(status, body) {
    var msg = (body && (body.message || body.msg || body.error_description || body.error)) || "";
    if (status === 401 || /invalid login/i.test(msg)) return "Kullanıcı adı veya parola hatalı";
    if (/katılım kodu/i.test(msg)) return "Katılım kodu hatalı";
    if (/işletme bulunamadı/i.test(msg)) return "İşletme bulunamadı";
    if (/duplicate key|already registered|already exists/i.test(msg)) return "Bu kullanıcı adı zaten var";
    if (/violates row-level security|permission denied/i.test(msg)) return "Bu işlem için yetkin yok";
    if (/password/i.test(msg) && /least|short/i.test(msg)) return "Parola en az 6 karakter olmalı";
    return msg || ("Sunucu hatası (" + status + ")");
  }

  function req(path, opts) {
    opts = opts || {};
    return fetch(CFG.url + path, {
      method: opts.method || "GET",
      headers: headers(opts.headers),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
        if (!res.ok) {
          var err = new Error(niceError(res.status, data));
          err.status = res.status; err.body = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* oturum süresi dolduysa tazele, sonra isteği yap */
  function withAuth(fn) {
    if (!sess) return fn();
    var now = Math.floor(Date.now() / 1000);
    if (sess.expires_at && sess.expires_at - now > 60) return fn();
    return Cloud.refresh().then(fn, fn);
  }

  var Cloud = {
    cfg: CFG,

    online: function () { return navigator.onLine !== false; },
    session: function () { return sess; },
    userId: function () { return sess && sess.user && sess.user.id; },

    /* ---------- oturum ---------- */
    restore: function () { return loadSession(); },

    signIn: function (username, password) {
      var email = String(username || "").trim().toLowerCase() + "@" + CFG.emailDomain;
      return req("/auth/v1/token?grant_type=password", {
        method: "POST", body: { email: email, password: password }
      }).then(function (d) {
        saveSession({
          access_token: d.access_token, refresh_token: d.refresh_token,
          expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + (d.expires_in || 3600)),
          user: d.user
        });
        return d.user;
      });
    },

    signUp: function (opts) {
      var email = String(opts.username || "").trim().toLowerCase() + "@" + CFG.emailDomain;
      return req("/auth/v1/signup", {
        method: "POST",
        body: {
          email: email, password: opts.password,
          data: {
            venue_slug: CFG.venueSlug,
            join_code: opts.joinCode,
            username: String(opts.username).trim().toLowerCase(),
            name: opts.name || opts.username,
            perms: opts.perms || {}
          }
        }
      });
    },

    refresh: function () {
      if (!sess || !sess.refresh_token) return Promise.reject(new Error("oturum yok"));
      return req("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", body: { refresh_token: sess.refresh_token }
      }).then(function (d) {
        saveSession({
          access_token: d.access_token, refresh_token: d.refresh_token,
          expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + (d.expires_in || 3600)),
          user: d.user || (sess && sess.user)
        });
        return d;
      }).catch(function (e) { saveSession(null); throw e; });
    },

    signOut: function () {
      var had = !!sess;
      saveSession(null);
      if (had && Cloud.online()) req("/auth/v1/logout", { method: "POST" }).catch(function () {});
      return Promise.resolve();
    },

    changePassword: function (pw) {
      return withAuth(function () {
        return req("/auth/v1/user", { method: "PUT", body: { password: pw } });
      });
    },

    /* ---------- veri ---------- */
    select: function (table, query) {
      return withAuth(function () {
        return req("/rest/v1/" + table + (query ? "?" + query : ""));
      });
    },

    insert: function (table, rows) {
      return withAuth(function () {
        return req("/rest/v1/" + table, {
          method: "POST", body: rows,
          headers: { "Prefer": "return=representation" }
        });
      });
    },

    upsert: function (table, rows) {
      return withAuth(function () {
        return req("/rest/v1/" + table, {
          method: "POST", body: rows,
          headers: { "Prefer": "resolution=merge-duplicates,return=representation" }
        });
      });
    },

    update: function (table, query, patch) {
      return withAuth(function () {
        return req("/rest/v1/" + table + "?" + query, {
          method: "PATCH", body: patch,
          headers: { "Prefer": "return=representation" }
        });
      });
    },

    remove: function (table, query) {
      return withAuth(function () {
        return req("/rest/v1/" + table + "?" + query, {
          method: "DELETE",
          headers: { "Prefer": "return=representation" }
        });
      });
    },

    uuid: function () {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        return (c === "x" ? r : ((r & 0x3) | 0x8)).toString(16);
      });
    }
  };

  window.Cloud = Cloud;
})();
