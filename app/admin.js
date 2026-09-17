/* Yönetim paneli — yalnızca işletme sahibi (admin) görür.
   Personel, masalar, menü, işletme bilgisi ve veri işlemleri. */
(function () {
  "use strict";

  var sub = null;          // null | staff | tables | menu
  var menuQ = "";

  function U() { return window.UI; }

  function head(title, note) {
    var u = U();
    return '<header class="top"><div class="top-in">' +
      (sub ? '<button class="iconbtn" id="admBack" aria-label="Geri">' + u.ic(u.I.back, 21) + "</button>" : "") +
      '<div class="ttl"><b>' + u.esc(title) + "</b></div>" +
      '<button class="iconbtn" id="admLogout" aria-label="Çıkış yap">' +
      u.ic('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>', 21) +
      "</button></div></header><div class='wrap'>" +
      '<div class="bigtitle"><h1>' + u.esc(title) + "</h1>" + (note ? "<p>" + u.esc(note) + "</p>" : "") + "</div>";
  }

  /* ---------------- ana panel ---------------- */
  function panel() {
    var u = U();
    var me = Auth.current();
    var staff = Auth.staff();
    var tables = Store.tables();
    var zones = Store.zones();
    var all = Store.menuAll();
    var hidden = all.filter(function (m) { return m.hidden; }).length;
    var edited = all.filter(function (m) { return m.edited; }).length;
    var rep = Store.report(Store.dayStart(), Date.now() + 1);

    var h = head("Yönetim", me ? me.name + " · işletme sahibi" : "");

    h += '<div class="hero"><span>Bugünkü ciro</span><b class="num">' + u.money(rep.ciro) + "</b></div>";

    h += '<div class="rows">' +
      row("staff", "Personel", staff.length + " garson hesabı",
        '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>') +
      row("tables", "Masalar", tables.length + " masa · " + zones.length + " bölge",
        '<rect x="3" y="4" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="4" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>') +
      row("menu", "Menü", all.length + " ürün" + (edited ? " · " + edited + " fiyat değişti" : "") + (hidden ? " · " + hidden + " gizli" : ""),
        '<path d="M4 5h16M4 12h16M4 19h10"/>') +
      row("venue", "İşletme bilgisi", Store.settings().venue || "—",
        '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M10 21v-6h4v6"/>') +
      row("data", "Veri ve yedek", "Yedek al, geri yükle, sıfırla",
        '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>') +
      "</div>";

    if (rep.waiters.length) {
      h += '<div class="panel"><h3>Bugün kim ne sattı</h3><div class="blist">';
      var mw = rep.waiters[0].tutar || 1;
      rep.waiters.forEach(function (w) {
        h += '<div class="brow"><span class="n">' + u.esc(w.name) +
          ' <span class="sm">' + w.adisyon + " adisyon · " + w.kisi + " kişi</span></span>" +
          '<span class="v num">' + u.money(w.tutar) + "</span>" +
          '<span class="track"><i style="width:' + Math.round(w.tutar / mw * 100) + '%"></i></span></div>';
      });
      h += "</div></div>";
    }

    return h + "<div style='height:8px'></div></div>";
  }

  function row(key, title, note, path) {
    var u = U();
    return '<button class="arow" type="button" data-adm="' + key + '">' +
      '<span class="ai">' + u.ic(path, 21) + "</span>" +
      '<span class="at"><b>' + u.esc(title) + "</b><span>" + u.esc(note) + "</span></span>" +
      '<span class="ac">' + u.ic(u.I.fwd, 18) + "</span></button>";
  }

  /* ---------------- personel ---------------- */
  function staffView() {
    var u = U();
    var h = head("Personel", "Garson hesapları ve yetkileri");
    var list = Auth.users();

    h += '<div class="rows">';
    list.forEach(function (x) {
      var tags = [];
      if (x.role === "admin") tags.push("yönetici");
      if (!x.active) tags.push("kapalı");
      if (x.role === "waiter") {
        if (Auth.can.call(null) === undefined) { /* noop */ }
      }
      h += '<button class="arow" type="button" data-staff="' + x.id + '">' +
        '<span class="ai' + (x.role === "admin" ? " adm" : "") + '">' + u.esc((x.name || "?").charAt(0).toUpperCase()) + "</span>" +
        '<span class="at"><b>' + u.esc(x.name) + (tags.length ? ' <span class="pill2">' + tags.join(" · ") + "</span>" : "") + "</b>" +
        "<span>@" + u.esc(x.username) + "</span></span>" +
        '<span class="ac">' + u.ic(u.I.fwd, 18) + "</span></button>";
    });
    h += "</div>";
    h += '<div class="acts"><button class="btn go big" id="staffAdd" type="button">+ Personel ekle</button></div>';
    return h + "<div style='height:8px'></div></div>";
  }

  function staffAddFlow() {
    var u = U();
    u.sheet("<h3>Personel ekle</h3><p class='lead'>Garson bu bilgilerle giriş yapacak</p>" +
      '<label class="field"><input id="sn" type="text" placeholder="Adı Soyadı" autocomplete="off"></label>' +
      '<label class="field"><input id="su" type="text" placeholder="kullanıcı adı" autocomplete="off" autocapitalize="none"></label>' +
      '<label class="field"><input id="sp" type="text" placeholder="parola (en az 4 karakter)" autocomplete="off"></label>' +
      '<div class="acts"><button class="btn go big" id="sok" type="button">Hesabı oluştur</button></div>',
      function (c) {
        c.querySelector("#sok").onclick = function () {
          Auth.create({
            name: c.querySelector("#sn").value,
            username: c.querySelector("#su").value,
            password: c.querySelector("#sp").value,
            role: "waiter"
          }).then(function (x) {
            u.closeSheet();
            u.toast(x.name + " eklendi");
            u.render();
          }).catch(function (m) { u.toast(m); });
        };
      });
  }

  function staffEditFlow(id) {
    var u = U();
    var x = Auth.user(id);
    if (!x) return;
    var me = Auth.current();
    var labels = Auth.permLabels();
    var perms = JSON.parse(JSON.stringify(x.perms || Auth.defaultPerms(x.role)));

    var body = "<h3>" + u.esc(x.name) + "</h3><p class='lead'>@" + u.esc(x.username) +
      " · " + (x.role === "admin" ? "işletme sahibi" : "garson") + "</p>";

    if (x.role === "waiter") {
      body += '<p class="cap">Yetkiler</p><div class="toggles" id="pg">' +
        Object.keys(labels).map(function (k) {
          return '<button class="tg" type="button" data-p="' + k + '" aria-pressed="' + !!perms[k] + '">' +
            '<span>' + u.esc(labels[k]) + "</span><i></i></button>";
        }).join("") + "</div>";
    }

    body += '<div class="acts">' +
      '<button class="btn plain" id="sPw" type="button">Parolayı değiştir</button>' +
      (x.id !== me.id
        ? '<button class="btn plain" id="sAct" type="button">' + (x.active ? "Hesabı kapat" : "Hesabı aç") + "</button>" +
          '<button class="btn danger" id="sDel" type="button">Hesabı sil</button>'
        : '<p class="lead" style="text-align:center;margin-top:6px">Kendi hesabın</p>') +
      "</div>";

    u.sheet(body, function (c) {
      var pg = c.querySelector("#pg");
      if (pg) pg.onclick = function (e) {
        var b = e.target.closest("[data-p]"); if (!b) return;
        var k = b.dataset.p;
        perms[k] = !perms[k];
        b.setAttribute("aria-pressed", perms[k]);
        Auth.update(id, { perms: perms });
      };
      c.querySelector("#sPw").onclick = function () {
        var pw = prompt("Yeni parola (en az 4 karakter)");
        if (!pw) return;
        Auth.setPassword(id, pw).then(function () { u.closeSheet(); u.toast("Parola değişti"); })
          .catch(function (m) { u.toast(m); });
      };
      var act = c.querySelector("#sAct");
      if (act) act.onclick = function () {
        Auth.update(id, { active: !x.active }).then(function () { u.closeSheet(); u.render(); });
      };
      var del = c.querySelector("#sDel");
      if (del) del.onclick = function () {
        if (!confirm(x.name + " hesabı silinecek. Emin misin?")) return;
        Auth.remove(id).then(function () { u.closeSheet(); u.toast("Silindi"); u.render(); })
          .catch(function (m) { u.toast(m); });
      };
    });
  }

  /* ---------------- masalar ---------------- */
  function tablesView() {
    var u = U();
    var h = head("Masalar", "Kaç masa, hangi bölgede, kaç kişilik");
    Store.zones().forEach(function (z) {
      var list = Store.tables().filter(function (t) { return t.zone === z; });
      h += '<div class="panel"><h3>' + u.esc(z) + " · " + list.length + " masa</h3><div class=\"tpick\">";
      list.forEach(function (t) {
        h += '<button type="button" data-tbl="' + t.id + '"><b>' + u.esc(t.name) + "</b><span>" + t.seats + " kişi</span></button>";
      });
      h += "</div></div>";
    });
    h += '<div class="acts"><button class="btn go big" id="tblAdd" type="button">+ Masa ekle</button></div>';
    return h + "<div style='height:8px'></div></div>";
  }

  function tableAddFlow() {
    var u = U();
    var zones = Store.zones();
    var zone = zones[0] || "Salon";
    u.sheet("<h3>Masa ekle</h3>" +
      '<label class="field"><input id="tn" type="text" placeholder="Masa adı / numarası"></label>' +
      '<p class="cap">Bölge</p><div class="chips" id="tz">' +
      zones.map(function (z) {
        return '<button type="button" data-z="' + u.esc(z) + '" aria-pressed="' + (z === zone) + '">' + u.esc(z) + "</button>";
      }).join("") +
      '<button type="button" data-z="__new" >+ Yeni bölge</button></div>' +
      '<p class="cap">Kaç kişilik</p><div class="chips big" id="ts">' +
      [2, 4, 6, 8, 10].map(function (n) {
        return '<button type="button" data-s="' + n + '" aria-pressed="' + (n === 4) + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<div class="acts"><button class="btn go big" id="tok" type="button">Ekle</button></div>',
      function (c) {
        var seats = 4;
        c.querySelector("#tz").onclick = function (e) {
          var b = e.target.closest("[data-z]"); if (!b) return;
          if (b.dataset.z === "__new") {
            var n = prompt("Bölge adı (Salon, Bahçe, Teras...)");
            if (!n || !n.trim()) return;
            zone = n.trim();
            b.textContent = zone;
          } else zone = b.dataset.z;
          Array.prototype.forEach.call(c.querySelectorAll("#tz [data-z]"), function (x) {
            x.setAttribute("aria-pressed", x.dataset.z === zone || x.textContent === zone);
          });
        };
        c.querySelector("#ts").onclick = function (e) {
          var b = e.target.closest("[data-s]"); if (!b) return;
          seats = +b.dataset.s;
          Array.prototype.forEach.call(c.querySelectorAll("[data-s]"), function (x) {
            x.setAttribute("aria-pressed", +x.dataset.s === seats);
          });
        };
        c.querySelector("#tok").onclick = function () {
          var nm = c.querySelector("#tn").value.trim();
          if (!nm) return u.toast("Masa adı gir");
          Store.addTable(nm, zone, seats).then(function () { u.closeSheet(); u.toast("Masa eklendi"); u.render(); });
        };
      });
  }

  function tableEditFlow(id) {
    var u = U();
    var t = Store.table(id); if (!t) return;
    var seats = t.seats;
    u.sheet("<h3>Masa " + u.esc(t.name) + "</h3><p class='lead'>" + u.esc(t.zone) + "</p>" +
      '<label class="field"><input id="en" type="text" value="' + u.esc(t.name) + '"></label>' +
      '<p class="cap">Kaç kişilik</p><div class="chips big" id="es">' +
      [2, 4, 6, 8, 10].map(function (n) {
        return '<button type="button" data-s="' + n + '" aria-pressed="' + (n === seats) + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<div class="acts"><button class="btn go big" id="eok" type="button">Kaydet</button>' +
      '<button class="btn danger" id="edel" type="button">Masayı sil</button></div>',
      function (c) {
        c.querySelector("#es").onclick = function (e) {
          var b = e.target.closest("[data-s]"); if (!b) return;
          seats = +b.dataset.s;
          Array.prototype.forEach.call(c.querySelectorAll("[data-s]"), function (x) {
            x.setAttribute("aria-pressed", +x.dataset.s === seats);
          });
        };
        c.querySelector("#eok").onclick = function () {
          Store.updateTable(id, { name: c.querySelector("#en").value.trim() || t.name, seats: seats })
            .then(function () { u.closeSheet(); u.render(); });
        };
        c.querySelector("#edel").onclick = function () {
          if (!confirm("Masa silinecek. Emin misin?")) return;
          Store.removeTable(id).then(function () { u.closeSheet(); u.toast("Silindi"); u.render(); })
            .catch(function (m) { u.toast(m); });
        };
      });
  }

  /* ---------------- menü ---------------- */
  function menuView() {
    var u = U();
    var h = head("Menü", "Fiyatları değiştir, ürün gizle veya ekle");
    var q = menuQ.trim().toLocaleLowerCase("tr");
    var list = Store.menuAll().filter(function (m) {
      return !q || (m.name + " " + m.catName).toLocaleLowerCase("tr").indexOf(q) >= 0;
    });

    h += '<div class="search adminsearch">' + u.ic(u.I.search, 20) +
      '<input id="mq" type="search" placeholder="Ürün ara" value="' + u.esc(menuQ) + '" autocomplete="off"></div>';

    h += '<div class="rows" style="margin-top:10px">';
    list.slice(0, 200).forEach(function (m) {
      h += '<button class="arow mitem' + (m.hidden ? " off" : "") + '" type="button" data-mitem="' + m.mid + '">' +
        '<span class="at"><b>' + u.esc(m.name) + (m.custom ? ' <span class="pill2">eklendi</span>' : "") +
        (m.hidden ? ' <span class="pill2">gizli</span>' : "") + "</b>" +
        "<span>" + u.esc(m.catName) + "</span></span>" +
        '<span class="mp num' + (m.edited ? " ed" : "") + '">' +
        (m.price == null ? "günün fiyatı" : u.money(m.price)) + "</span></button>";
    });
    h += "</div>";
    h += '<div class="acts"><button class="btn go big" id="menuAdd" type="button">+ Ürün ekle</button></div>';
    return h + "<div style='height:8px'></div></div>";
  }

  function menuItemFlow(mid) {
    var u = U();
    var m = Store.menuAll().filter(function (x) { return x.mid === mid; })[0];
    if (!m) return;
    u.sheet("<h3>" + u.esc(m.name) + "</h3><p class='lead'>" + u.esc(m.catName) +
      (m.edited && m.basePrice != null ? " · liste fiyatı " + u.money(m.basePrice) : "") + "</p>" +
      '<label class="field"><span class="cap" style="margin:0 0 6px">Fiyat (₺)</span>' +
      '<input id="mpx" type="number" inputmode="numeric" min="0" step="5" value="' + (m.price == null ? "" : m.price) + '"></label>' +
      '<div class="acts"><button class="btn go big" id="mok" type="button">Fiyatı kaydet</button>' +
      '<button class="btn plain" id="mhide" type="button">' + (m.hidden ? "Menüye geri koy" : "Menüden gizle") + "</button>" +
      (m.custom
        ? '<button class="btn danger" id="mdel" type="button">Ürünü sil</button>'
        : (m.edited ? '<button class="btn plain" id="mres" type="button">Liste fiyatına dön</button>' : "")) +
      "</div>",
      function (c) {
        c.querySelector("#mok").onclick = function () {
          var v = c.querySelector("#mpx").value;
          Store.setItemPrice(mid, v === "" ? null : +v).then(function () {
            u.closeSheet(); u.toast("Fiyat güncellendi"); u.render();
          });
        };
        c.querySelector("#mhide").onclick = function () {
          Store.setItemHidden(mid, !m.hidden).then(function () { u.closeSheet(); u.render(); });
        };
        var d = c.querySelector("#mdel");
        if (d) d.onclick = function () {
          Store.removeCustomItem(mid).then(function () { u.closeSheet(); u.toast("Silindi"); u.render(); });
        };
        var r = c.querySelector("#mres");
        if (r) r.onclick = function () {
          Store.resetItem(mid).then(function () { u.closeSheet(); u.render(); });
        };
      });
  }

  function menuAddFlow() {
    var u = U();
    var cats = Store.categories();
    var cat = cats[0] ? cats[0].id : "";
    u.sheet("<h3>Ürün ekle</h3><p class='lead'>Menüde ve garson ekranında görünür</p>" +
      '<label class="field"><input id="an" type="text" placeholder="Ürün adı"></label>' +
      '<label class="field"><input id="ap" type="number" inputmode="numeric" min="0" step="5" placeholder="Fiyat ₺"></label>' +
      '<p class="cap">Kategori</p><div class="chips" id="ac">' +
      cats.map(function (c2) {
        return '<button type="button" data-c="' + c2.id + '" aria-pressed="' + (c2.id === cat) + '">' + u.esc(c2.name) + "</button>";
      }).join("") + "</div>" +
      '<div class="acts"><button class="btn go big" id="aok" type="button">Ekle</button></div>',
      function (c) {
        c.querySelector("#ac").onclick = function (e) {
          var b = e.target.closest("[data-c]"); if (!b) return;
          cat = b.dataset.c;
          Array.prototype.forEach.call(c.querySelectorAll("[data-c]"), function (x) {
            x.setAttribute("aria-pressed", x.dataset.c === cat);
          });
        };
        c.querySelector("#aok").onclick = function () {
          var n = c.querySelector("#an").value.trim();
          var p = +c.querySelector("#ap").value || 0;
          if (!n) return u.toast("Ürün adı gir");
          Store.addItemToMenu(cat, n, p).then(function () { u.closeSheet(); u.toast(n + " eklendi"); u.render(); });
        };
      });
  }

  /* ---------------- işletme ve veri ---------------- */
  function venueFlow() {
    var u = U();
    var s = Store.settings();
    u.sheet("<h3>İşletme bilgisi</h3><p class='lead'>Fişte ve raporda görünür</p>" +
      '<label class="field"><input id="vn" type="text" value="' + u.esc(s.venue || "") + '" placeholder="İşletme adı"></label>' +
      '<label class="field"><span class="cap" style="margin:0 0 6px">KDV oranı (%)</span>' +
      '<input id="vk" type="number" inputmode="numeric" min="0" max="30" value="' + (s.kdv || 0) + '"></label>' +
      '<div class="acts"><button class="btn go big" id="vok" type="button">Kaydet</button></div>',
      function (c) {
        c.querySelector("#vok").onclick = function () {
          Store.saveSettings({
            venue: c.querySelector("#vn").value.trim() || "İşletme",
            kdv: +c.querySelector("#vk").value || 0
          }).then(function () { u.closeSheet(); u.toast("Kaydedildi"); u.render(); });
        };
      });
  }

  window.Admin = {
    get sub() { return sub; },
    set sub(v) { sub = v; },

    render: function () {
      if (sub === "staff") return staffView();
      if (sub === "tables") return tablesView();
      if (sub === "menu") return menuView();
      return panel();
    },

    /* app.js'in tıklama yönlendiricisi buraya danışır */
    handle: function (e) {
      var u = U(), el;
      if (e.target.closest("#admBack")) { sub = null; u.render(); return true; }
      if (e.target.closest("#admLogout")) {
        if (confirm("Çıkış yapılsın mı?")) { Auth.logout(); }
        return true;
      }
      if ((el = e.target.closest("[data-adm]"))) {
        var k = el.dataset.adm;
        if (k === "venue") { venueFlow(); return true; }
        if (k === "data") { u.dataFlow(); return true; }
        sub = k; u.render(); return true;
      }
      if (e.target.closest("#staffAdd")) { staffAddFlow(); return true; }
      if ((el = e.target.closest("[data-staff]"))) { staffEditFlow(el.dataset.staff); return true; }
      if (e.target.closest("#tblAdd")) { tableAddFlow(); return true; }
      if ((el = e.target.closest("[data-tbl]"))) { tableEditFlow(el.dataset.tbl); return true; }
      if (e.target.closest("#menuAdd")) { menuAddFlow(); return true; }
      if ((el = e.target.closest("[data-mitem]"))) { menuItemFlow(el.dataset.mitem); return true; }
      return false;
    },

    input: function (e) {
      if (e.target.id !== "mq") return false;
      menuQ = e.target.value;
      var pos = e.target.selectionStart;
      U().render();
      var n = document.querySelector("#mq");
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} }
      return true;
    },

    reset: function () { sub = null; menuQ = ""; }
  };
})();
