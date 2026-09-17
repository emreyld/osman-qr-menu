/* Garson uygulaması — ekranlar ve akış.
   Veriye yalnızca Store üzerinden dokunur. */
(function () {
  "use strict";

  var view = "tables";      // tables | order | kitchen | report
  var currentOrder = null;  // adisyon id
  var zone = "";            // masa planı bölge süzgeci
  var picker = null;        // { q, cat }
  var MENU = [];
  var tickTimer = null;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = null;

  /* ---------- yardımcılar ---------- */
  function money(n) { return "₺" + (n || 0).toLocaleString("tr-TR"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dur(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 60) return m + " dk";
    return Math.floor(m / 60) + "s " + (m % 60) + "dk";
  }
  function clock(ts) {
    var d = new Date(ts);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function icon(p, s) {
    return '<svg viewBox="0 0 24 24" width="' + (s || 22) + '" height="' + (s || 22) + '" fill="none" ' +
      'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  var ICON = {
    tables: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    kitchen: '<path d="M5 9h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M3 9h18M8 5l1 4M16 5l-1 4"/>',
    report: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 19l-7-7 7-7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a1.6 1.6 0 0 0-1.5-1H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 4.6 1.6 1.6 0 0 0 8 3.1V3a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 4.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" transform="translate(1 1) scale(.92)"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>'
  };

  /* ---------- bildirim ---------- */
  var toastT = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, 1900);
  }

  /* ---------- açılır pencere ---------- */
  function modal(html, onMount) {
    var host = $("#modal");
    host.innerHTML = '<div class="bd" data-close></div><div class="card" role="dialog" aria-modal="true">' + html + "</div>";
    host.hidden = false;
    document.body.style.overflow = "hidden";
    host.onclick = function (e) { if (e.target.closest("[data-close]")) closeModal(); };
    if (onMount) onMount($(".card", host));
  }
  function closeModal() {
    var host = $("#modal");
    host.hidden = true; host.innerHTML = "";
    document.body.style.overflow = "";
  }

  /* ---------- durum hesapları ---------- */
  function pendingCount() {
    var n = 0;
    Store.openOrders().forEach(function (o) {
      o.items.forEach(function (li) { if (li.status === "sent") n++; });
    });
    return n;
  }
  function orderState(o) {
    var hasSent = o.items.some(function (li) { return li.status === "sent"; });
    var hasDraft = o.items.some(function (li) { return li.status === "draft"; });
    return { hasSent: hasSent, hasDraft: hasDraft };
  }

  /* ================= MASA PLANI ================= */
  function renderTables() {
    var open = Store.openOrders();
    var byTable = {};
    open.forEach(function (o) { byTable[o.tableId] = o; });
    var rep = Store.report(Store.dayStart(), Date.now() + 1);

    var zones = Store.zones();
    var tables = Store.tables().filter(function (t) { return !zone || t.zone === zone; });

    var h = '<header class="top"><div class="top-in">' +
      '<div class="ttl"><b>Masalar</b><span>' + esc(Store.settings().waiter) + ' · ' + open.length + ' açık adisyon</span></div>' +
      '<div class="act"><button class="iconbtn" id="btnSettings" aria-label="Ayarlar">' + icon(ICON.gear, 20) + '</button></div>' +
      '</div></header><div class="wrap">';

    h += '<div class="summary">' +
      '<div class="stat"><span class="cap">Açık masa</span><b class="num">' + open.length + '</b></div>' +
      '<div class="stat"><span class="cap">Mutfakta</span><b class="num">' + pendingCount() + '</b></div>' +
      '<div class="stat"><span class="cap">Bugün ciro</span><b class="num">' + money(rep.ciro) + '</b></div>' +
      '</div>';

    h += '<nav class="zones"><button type="button" data-zone="" aria-pressed="' + (zone === "") + '">Tümü</button>';
    zones.forEach(function (z) {
      h += '<button type="button" data-zone="' + esc(z) + '" aria-pressed="' + (zone === z) + '">' + esc(z) + "</button>";
    });
    h += "</nav>";

    h += '<div class="tgrid">';
    tables.forEach(function (t) {
      var o = byTable[t.id];
      var cls = "tcard", body;
      if (o) {
        var st = orderState(o);
        cls += st.hasSent ? " wait" : " busy";
        var tot = Store.totals(o);
        body = '<span class="nm">' + esc(t.name) + "</span>" +
          (st.hasSent ? '<span class="pill">mutfakta</span>' : '<span class="pill">' + o.guests + " kişi</span>") +
          '<span class="sub dur num">' + dur(Date.now() - o.openedAt) + "</span>" +
          '<span class="amt num">' + money(tot.total) + "</span>";
      } else {
        body = '<span class="nm">' + esc(t.name) + "</span>" +
          '<span class="sub" style="margin-top:auto">' + t.seats + " kişilik</span>" +
          '<span style="font-size:13px;font-weight:600;color:var(--muted)">Boş</span>';
      }
      h += '<button class="' + cls + '" type="button" data-table="' + esc(t.id) + '">' + body + "</button>";
    });
    h += "</div></div>";
    return h;
  }

  /* ================= ADİSYON ================= */
  function renderOrder() {
    var o = Store.order(currentOrder);
    if (!o) { view = "tables"; return renderTables(); }
    var t = Store.table(o.tableId);
    var tot = Store.totals(o);
    var st = orderState(o);
    var drafts = o.items.filter(function (li) { return li.status === "draft"; });

    var h = '<header class="top"><div class="top-in">' +
      '<button class="back" id="btnBack" aria-label="Geri">' + icon(ICON.back, 20) + "</button>" +
      '<div class="ttl"><b>Masa ' + esc(t ? t.name : o.tableId) + "</b>" +
      "<span>" + esc(t ? t.zone : "") + " · " + clock(o.openedAt) + " açıldı · " + dur(Date.now() - o.openedAt) + "</span></div>" +
      '<div class="act"><button class="iconbtn" id="btnCancel" aria-label="Adisyonu iptal et">' +
      icon('<path d="M6 6l12 12M18 6L6 18"/>', 19) + "</button></div>" +
      "</div></header><div class='wrap'>";

    h += '<div class="osum"><div class="g"><b>Kişi sayısı</b><span>Kişi başı ' +
      money(o.guests ? Math.round(tot.total / o.guests) : 0) + "</span></div>" +
      '<div class="stepper"><button type="button" data-guests="-1" aria-label="Azalt">−</button>' +
      '<span class="v num">' + o.guests + "</span>" +
      '<button type="button" data-guests="1" aria-label="Artır">+</button></div></div>';

    if (!o.items.length) {
      h += '<div class="empty"><b>Adisyon boş</b>Aşağıdaki düğmeden ürün ekle.</div>';
    } else {
      h += '<div class="lines">';
      o.items.forEach(function (li) {
        var stLabel = li.status === "draft" ? "yeni" : (li.status === "sent" ? "mutfakta" : "hazır");
        h += '<div class="line ' + li.status + '" data-lid="' + li.lid + '">' +
          '<span class="q num">' + li.qty + "</span>" +
          '<span class="nm">' + esc(li.name) + "</span>" +
          '<span class="pr num">' + money(li.price * li.qty) + "</span>" +
          '<span class="mt"><span class="st ' + li.status + '">' + stLabel + "</span>" +
          (li.note ? '<span class="note">' + esc(li.note) + "</span>" : "") +
          '<span class="num">' + money(li.price) + "</span>" +
          (li.status === "draft"
            ? '<button type="button" data-dec="' + li.lid + '" style="margin-inline-start:auto;font-weight:700;color:var(--bad)">− çıkar</button>'
            : "") +
          "</span></div>";
      });
      h += "</div>";
    }

    h += '<div style="height:10px"></div></div>';

    /* alt eylem çubuğu */
    h += '<div class="bar"><div class="bar-in">' +
      '<div class="tot"><span>' + (tot.discount ? "İndirimli toplam" : "Toplam") + '</span><b class="num">' + money(tot.total) + "</b></div>" +
      '<button class="btn ghost" id="btnAdd">' + icon(ICON.plus, 19) + " Ürün</button>" +
      (drafts.length
        ? '<button class="btn primary" id="btnSend">Mutfağa gönder (' + drafts.reduce(function (s, l) { return s + l.qty; }, 0) + ")</button>"
        : '<button class="btn primary" id="btnPay"' + (o.items.length ? "" : " disabled") + ">Hesap</button>") +
      "</div></div>";
    return h;
  }

  /* ================= MUTFAK ================= */
  function renderKitchen() {
    var tickets = [];
    Store.openOrders().forEach(function (o) {
      var items = o.items.filter(function (li) { return li.status === "sent"; });
      if (items.length) {
        tickets.push({ order: o, items: items, at: Math.min.apply(null, items.map(function (l) { return l.sentAt || Date.now(); })) });
      }
    });
    tickets.sort(function (a, b) { return a.at - b.at; });

    var h = '<header class="top"><div class="top-in">' +
      '<div class="ttl"><b>Mutfak</b><span>' + tickets.length + " açık fiş · " + pendingCount() + " ürün</span></div>" +
      "</div></header><div class='wrap'>";

    if (!tickets.length) {
      h += '<div class="empty"><b>Bekleyen sipariş yok</b>Garson mutfağa gönderdiğinde fişler burada belirir.</div></div>';
      return h;
    }

    h += '<div class="kgrid">';
    tickets.forEach(function (tk) {
      var t = Store.table(tk.order.tableId);
      var mins = Math.floor((Date.now() - tk.at) / 60000);
      h += '<article class="ticket' + (mins >= 15 ? " late" : "") + '">' +
        '<div class="th"><b>Masa ' + esc(t ? t.name : tk.order.tableId) + "</b>" +
        '<span style="font-size:12.5px;color:var(--muted)">' + esc(t ? t.zone : "") + " · " + clock(tk.at) + "</span>" +
        '<span class="ago num">' + mins + " dk</span></div><ul>";
      tk.items.forEach(function (li) {
        h += '<li><span class="q">' + li.qty + "×</span><span class=\"n\">" + esc(li.name) +
          (li.note ? "<em>" + esc(li.note) + "</em>" : "") + "</span>" +
          '<button type="button" data-ready="' + tk.order.id + "|" + li.lid + '">hazır</button></li>';
      });
      h += '</ul><div class="foot"><button class="btn primary wide" type="button" data-allready="' + tk.order.id + '">' +
        icon(ICON.check, 18) + " Tümü hazır</button></div></article>";
    });
    h += "</div></div>";
    return h;
  }

  /* ================= RAPOR ================= */
  function renderReport() {
    var from = Store.dayStart(), to = Date.now() + 1;
    var r = Store.report(from, to);
    var d = new Date(from);
    var gun = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });

    var h = '<header class="top"><div class="top-in">' +
      '<div class="ttl"><b>Gün sonu</b><span>' + esc(gun) + "</span></div>" +
      '<div class="act"><button class="iconbtn" id="btnDemo" aria-label="Deneme verisi">' +
      icon('<path d="M12 5v14M5 12h14"/>', 19) + "</button></div>" +
      "</div></header><div class='wrap'>";

    h += '<div class="rgrid">' +
      '<div class="stat wide"><span class="cap">Ciro</span><b class="num">' + money(r.ciro) + "</b></div>" +
      '<div class="stat"><span class="cap">Adisyon</span><b class="num">' + r.adisyon + "</b></div>" +
      '<div class="stat"><span class="cap">Kişi</span><b class="num">' + r.kisi + "</b></div>" +
      '<div class="stat"><span class="cap">Masa ortalaması</span><b class="num">' + money(r.masaOrt) + "</b></div>" +
      '<div class="stat"><span class="cap">Kişi başı</span><b class="num">' + money(r.kisiOrt) + "</b></div>" +
      "</div>";

    if (!r.adisyon) {
      h += '<div class="empty"><b>Bugün kapanmış adisyon yok</b>Hesap kapattıkça rapor dolar. Denemek için sağ üstteki + ile örnek gün oluşturabilirsin.</div></div>';
      return h;
    }

    /* saatlik */
    var hours = [], max = 0;
    for (var i = 8; i <= 23; i++) { var v = r.byHour[i] || 0; hours.push({ h: i, v: v }); if (v > max) max = v; }
    for (var j = 0; j <= 2; j++) { var v2 = r.byHour[j] || 0; hours.push({ h: j, v: v2 }); if (v2 > max) max = v2; }
    h += '<div class="panel"><h3>Saatlik ciro</h3><div class="hours">';
    hours.forEach(function (x) {
      var pct = max ? Math.round(x.v / max * 100) : 0;
      h += '<div class="h" title="' + x.h + ":00 — " + money(x.v) + '">' +
        '<i style="height:' + Math.max(pct, x.v ? 6 : 0) + '%"></i><span>' + x.h + "</span></div>";
    });
    h += "</div></div>";

    /* en çok satanlar */
    h += '<div class="panel"><h3>En çok ciro getiren ürünler</h3><div class="blist">';
    var top = r.items.slice(0, 8), mx = top.length ? top[0].tutar : 1;
    top.forEach(function (it) {
      h += '<div class="brow"><span class="n">' + esc(it.name) +
        ' <span style="color:var(--muted);font-weight:600">×' + it.qty + "</span></span>" +
        '<span class="v">' + money(it.tutar) + "</span>" +
        '<span class="track"><i style="width:' + Math.round(it.tutar / mx * 100) + '%"></i></span></div>';
    });
    h += "</div></div>";

    /* kategoriler */
    h += '<div class="panel"><h3>Kategoriler</h3><div class="blist">';
    var mc = r.cats.length ? r.cats[0].tutar : 1;
    r.cats.slice(0, 6).forEach(function (c) {
      h += '<div class="brow"><span class="n">' + esc(c.name) + "</span>" +
        '<span class="v">' + money(c.tutar) + "</span>" +
        '<span class="track"><i style="width:' + Math.round(c.tutar / mc * 100) + '%"></i></span></div>';
    });
    h += "</div></div>";

    /* ödeme */
    h += '<div class="panel"><h3>Ödeme türü</h3><div class="blist">';
    Object.keys(r.byPay).forEach(function (k) {
      h += '<div class="brow"><span class="n">' + esc(k) + "</span><span class=\"v\">" + money(r.byPay[k]) + "</span></div>";
    });
    h += "</div></div>";

    /* kapanan adisyonlar */
    h += '<div class="panel"><h3>Kapanan adisyonlar</h3><div class="blist">';
    r.list.slice(0, 12).forEach(function (o) {
      var t = Store.table(o.tableId);
      var tt = o.totals || Store.totals(o);
      h += '<div class="brow"><span class="n">Masa ' + esc(t ? t.name : o.tableId) +
        ' <span style="color:var(--muted);font-weight:600">' + clock(o.closedAt) + " · " + o.guests + " kişi</span></span>" +
        '<span class="v">' + money(tt.total) + "</span></div>";
    });
    h += "</div></div><div style='height:10px'></div></div>";
    return h;
  }

  /* ================= ÜRÜN SEÇİCİ ================= */
  function renderPicker() {
    if (!picker) return "";
    var o = Store.order(currentOrder);
    var q = (picker.q || "").trim().toLocaleLowerCase("tr");
    var list = MENU.filter(function (m) {
      if (picker.cat && m.cat !== picker.cat) return false;
      if (!q) return true;
      return (m.name + " " + (m.nameEn || "") + " " + m.catName).toLocaleLowerCase("tr").indexOf(q) >= 0;
    });
    var inBag = {};
    if (o) o.items.forEach(function (li) { inBag[li.mid] = (inBag[li.mid] || 0) + li.qty; });

    var h = '<div class="picker" id="picker"><div class="head"><div class="row1">' +
      '<div class="search">' + icon(ICON.search, 19) +
      '<input id="pq" type="search" placeholder="Ürün ara" autocomplete="off" value="' + esc(picker.q || "") + '"></div>' +
      '<button class="btn ghost" id="pClose" style="min-height:44px;padding:0 14px">Bitti</button>' +
      "</div><div class='cats'>" +
      '<button type="button" data-cat="" aria-pressed="' + (!picker.cat) + '">Tümü</button>';
    (window.MENU || []).forEach(function (c) {
      h += '<button type="button" data-cat="' + c.id + '" aria-pressed="' + (picker.cat === c.id) + '">' + esc(c.n.tr) + "</button>";
    });
    h += '</div></div><div class="body">';

    if (!list.length) h += '<div class="empty"><b>Sonuç yok</b>Başka bir kelime dene.</div>';
    list.forEach(function (m) {
      h += '<button class="mrow" type="button" data-mid="' + m.mid + '">' +
        '<span class="nm">' + esc(m.name) + "</span>" +
        '<span class="pr num">' + (m.price == null ? "fiyat sor" : money(m.price)) + "</span>" +
        '<span class="sub">' + esc(m.catName) + (m.desc ? " · " + esc(m.desc.slice(0, 48)) : "") + "</span>" +
        (inBag[m.mid] ? '<span class="inbag st ready num">' + inBag[m.mid] + "</span>" : "") +
        "</button>";
    });
    h += "</div></div>";
    return h;
  }

  /* ================= ÇİZ ================= */
  function render() {
    var html;
    if (view === "order") html = renderOrder();
    else if (view === "kitchen") html = renderKitchen();
    else if (view === "report") html = renderReport();
    else html = renderTables();

    app.innerHTML = html + renderPicker();

    /* alt sekme */
    var pend = pendingCount();
    var tabs = [
      ["tables", "Masalar", ICON.tables, 0],
      ["kitchen", "Mutfak", ICON.kitchen, pend],
      ["report", "Rapor", ICON.report, 0]
    ];
    var tb = $("#tabs");
    tb.innerHTML = tabs.map(function (t) {
      var sel = (view === t[0] || (view === "order" && t[0] === "tables"));
      return '<button type="button" data-tab="' + t[0] + '" aria-selected="' + sel + '">' +
        icon(t[2], 22) + "<span>" + t[1] + "</span>" +
        (t[3] ? '<span class="bdg num">' + t[3] + "</span>" : "") + "</button>";
    }).join("");

    /* alt çubuk varsa gövdeye pay bırak */
    document.body.style.paddingBottom = $(".bar") ? "calc(148px + env(safe-area-inset-bottom))" : "";

    if (picker) { var pq = $("#pq"); if (pq && picker.focus) { pq.focus(); picker.focus = false; } }
  }

  /* ================= EYLEMLER ================= */
  function openTableFlow(tableId) {
    var existing = Store.orderByTable(tableId);
    if (existing) { currentOrder = existing.id; view = "order"; render(); return; }
    var t = Store.table(tableId);
    var g = t.seats;
    modal(
      "<h3>Masa " + esc(t.name) + " açılıyor</h3>" +
      '<p class="lead">' + esc(t.zone) + " · " + t.seats + " kişilik</p>" +
      '<span class="cap" style="display:block;margin-bottom:7px">Kaç kişi?</span>' +
      '<div class="chips" id="gChips">' +
      [1, 2, 3, 4, 5, 6, 8, 10].map(function (n) {
        return '<button type="button" data-g="' + n + '" aria-pressed="' + (n === g) + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<div class="acts two"><button class="btn ghost" data-close type="button">Vazgeç</button>' +
      '<button class="btn primary" id="gOk" type="button">Masayı aç</button></div>',
      function (card) {
        card.querySelector("#gChips").onclick = function (e) {
          var b = e.target.closest("[data-g]"); if (!b) return;
          g = +b.dataset.g;
          Array.prototype.forEach.call(card.querySelectorAll("[data-g]"), function (x) {
            x.setAttribute("aria-pressed", +x.dataset.g === g);
          });
        };
        card.querySelector("#gOk").onclick = function () {
          Store.openTable(tableId, g).then(function (o) {
            closeModal(); currentOrder = o.id; view = "order"; render();
          });
        };
      }
    );
  }

  function addFlow(m) {
    if (m.price == null) {
      modal("<h3>" + esc(m.name) + "</h3><p class='lead'>Bu ürünün fiyatı günlük. Tutarı gir.</p>" +
        '<label class="field"><span>Fiyat (₺)</span><input id="mp" type="number" inputmode="numeric" min="0" step="10" value="0"></label>' +
        '<label class="field"><span>Not (isteğe bağlı)</span><input id="mn" type="text" placeholder="az pişmiş, acısız..."></label>' +
        '<div class="acts two"><button class="btn ghost" data-close type="button">Vazgeç</button>' +
        '<button class="btn primary" id="mok" type="button">Ekle</button></div>',
        function (card) {
          card.querySelector("#mok").onclick = function () {
            var p = +card.querySelector("#mp").value || 0;
            Store.addItem(currentOrder, m, 1, card.querySelector("#mn").value.trim(), p)
              .then(function () { closeModal(); toast(m.name + " eklendi"); render(); });
          };
        });
      return;
    }
    Store.addItem(currentOrder, m, 1, "").then(function () {
      toast(m.name + " eklendi");
      render();
    });
  }

  function noteFlow(m) {
    var qty = 1, note = "";
    modal("<h3>" + esc(m.name) + "</h3><p class='lead'>" + esc(m.catName) + " · " + money(m.price) + "</p>" +
      '<span class="cap" style="display:block;margin-bottom:7px">Adet</span>' +
      '<div class="chips" id="qChips">' + [1, 2, 3, 4, 5, 6].map(function (n) {
        return '<button type="button" data-q="' + n + '" aria-pressed="' + (n === 1) + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<label class="field" style="margin-top:14px"><span>Mutfak notu</span>' +
      '<input id="nn" type="text" placeholder="acısız, soğansız, az pişmiş..."></label>' +
      '<div class="acts two"><button class="btn ghost" data-close type="button">Vazgeç</button>' +
      '<button class="btn primary" id="nok" type="button">Ekle</button></div>',
      function (card) {
        card.querySelector("#qChips").onclick = function (e) {
          var b = e.target.closest("[data-q]"); if (!b) return;
          qty = +b.dataset.q;
          Array.prototype.forEach.call(card.querySelectorAll("[data-q]"), function (x) {
            x.setAttribute("aria-pressed", +x.dataset.q === qty);
          });
        };
        card.querySelector("#nok").onclick = function () {
          note = card.querySelector("#nn").value.trim();
          Store.addItem(currentOrder, m, qty, note).then(function () {
            closeModal(); toast(qty + "× " + m.name + " eklendi"); render();
          });
        };
      });
  }

  function payFlow() {
    var o = Store.order(currentOrder); if (!o) return;
    var disc = o.discount ? JSON.parse(JSON.stringify(o.discount)) : null;
    var pay = "kart";

    function body() {
      var tmp = JSON.parse(JSON.stringify(o)); tmp.discount = disc;
      var t = Store.totals(tmp);
      return "<h3>Hesap · Masa " + esc((Store.table(o.tableId) || {}).name || "") + "</h3>" +
        '<p class="lead">' + o.guests + " kişi · " + o.items.length + " kalem</p>" +
        '<div style="display:grid;gap:6px;margin-bottom:14px;font-size:15px">' +
        '<div style="display:flex;justify-content:space-between"><span>Ara toplam</span><b class="num">' + money(t.sub) + "</b></div>" +
        (t.discount ? '<div style="display:flex;justify-content:space-between;color:var(--bad)"><span>İndirim</span><b class="num">−' + money(t.discount) + "</b></div>" : "") +
        '<div style="display:flex;justify-content:space-between;font-size:20px;padding-top:7px;border-top:1px solid var(--line)"><span><b>Toplam</b></span><b class="num">' + money(t.total) + "</b></div>" +
        "</div>" +
        '<span class="cap" style="display:block;margin-bottom:7px">İndirim</span>' +
        '<div class="chips" id="dChips">' +
        '<button type="button" data-d="none" aria-pressed="' + (!disc) + '">Yok</button>' +
        '<button type="button" data-d="p10" aria-pressed="' + (!!disc && disc.type === "percent" && disc.value === 10) + '">%10</button>' +
        '<button type="button" data-d="p20" aria-pressed="' + (!!disc && disc.type === "percent" && disc.value === 20) + '">%20</button>' +
        '<button type="button" data-d="treat" aria-pressed="' + (!!disc && disc.type === "treat") + '">İkram</button>' +
        "</div>" +
        '<span class="cap" style="display:block;margin:14px 0 7px">Ödeme</span>' +
        '<div class="chips" id="pChips">' +
        ["kart", "nakit", "karma"].map(function (k) {
          return '<button type="button" data-p="' + k + '" aria-pressed="' + (pay === k) + '">' +
            k.charAt(0).toUpperCase() + k.slice(1) + "</button>";
        }).join("") + "</div>" +
        '<div class="acts two"><button class="btn ghost" data-close type="button">Vazgeç</button>' +
        '<button class="btn primary" id="payOk" type="button">Hesabı kapat</button></div>';
    }

    function mount(card) {
      card.querySelector("#dChips").onclick = function (e) {
        var b = e.target.closest("[data-d]"); if (!b) return;
        var v = b.dataset.d;
        disc = v === "none" ? null : (v === "treat" ? { type: "treat", value: 0 } : { type: "percent", value: +v.slice(1) });
        refresh();
      };
      card.querySelector("#pChips").onclick = function (e) {
        var b = e.target.closest("[data-p]"); if (!b) return;
        pay = b.dataset.p; refresh();
      };
      card.querySelector("#payOk").onclick = function () {
        Store.setDiscount(o.id, disc)
          .then(function () { return Store.closeOrder(o.id, pay); })
          .then(function () {
            closeModal(); toast("Masa kapatıldı"); currentOrder = null; view = "tables"; render();
          });
      };
    }
    function refresh() { modal(body(), mount); }
    refresh();
  }

  function settingsFlow() {
    var s = Store.settings();
    modal("<h3>Ayarlar</h3><p class='lead'>Deneme sürümü · veriler bu cihazda saklanır</p>" +
      '<label class="field"><span>Garson adı</span><input id="sw" type="text" value="' + esc(s.waiter) + '"></label>' +
      '<div class="acts"><button class="btn ghost" id="sDemo" type="button">Örnek gün oluştur</button>' +
      '<button class="btn danger" id="sWipe" type="button">Tüm verileri sil</button>' +
      '<button class="btn primary" id="sOk" type="button">Kaydet</button></div>',
      function (card) {
        card.querySelector("#sOk").onclick = function () {
          Store.saveSettings({ waiter: card.querySelector("#sw").value.trim() || "Garson" })
            .then(function () { closeModal(); render(); });
        };
        card.querySelector("#sDemo").onclick = function () {
          Store.seedDemo().then(function () { closeModal(); toast("Örnek gün oluşturuldu"); view = "report"; render(); });
        };
        card.querySelector("#sWipe").onclick = function () {
          if (!confirm("Bütün adisyonlar silinecek. Emin misin?")) return;
          Store.wipe().then(function () { closeModal(); currentOrder = null; view = "tables"; render(); });
        };
      });
  }

  /* ================= OLAYLAR ================= */
  function wire() {
    app.addEventListener("click", function (e) {
      var el;

      if ((el = e.target.closest("[data-table]"))) return openTableFlow(el.dataset.table);
      if ((el = e.target.closest("[data-zone]"))) { zone = el.dataset.zone; return render(); }
      if (e.target.closest("#btnSettings")) return settingsFlow();
      if (e.target.closest("#btnBack")) { view = "tables"; currentOrder = null; return render(); }
      if (e.target.closest("#btnAdd")) { picker = { q: "", cat: "", focus: true }; return render(); }
      if (e.target.closest("#btnSend")) {
        return Store.sendToKitchen(currentOrder).then(function (n) {
          toast(n ? "Mutfağa gönderildi" : "Gönderilecek yeni ürün yok"); render();
        });
      }
      if (e.target.closest("#btnPay")) return payFlow();
      if (e.target.closest("#btnCancel")) {
        var o = Store.order(currentOrder);
        if (o && o.items.length && !confirm("Adisyonda ürün var. Masa tamamen iptal edilsin mi?")) return;
        return Store.cancelOrder(currentOrder).then(function () {
          currentOrder = null; view = "tables"; toast("Masa iptal edildi"); render();
        });
      }
      if ((el = e.target.closest("[data-guests]"))) {
        var ord = Store.order(currentOrder);
        var g = Math.max(1, (ord.guests || 1) + (+el.dataset.guests));
        return Store.setGuests(currentOrder, g).then(render);
      }
      if ((el = e.target.closest("[data-dec]"))) {
        var order = Store.order(currentOrder);
        var li = order.items.filter(function (x) { return x.lid === el.dataset.dec; })[0];
        if (!li) return;
        return Store.setQty(currentOrder, li.lid, li.qty - 1).then(render);
      }

      /* mutfak */
      if ((el = e.target.closest("[data-ready]"))) {
        var p = el.dataset.ready.split("|");
        return Store.setItemStatus(p[0], p[1], "ready").then(render);
      }
      if ((el = e.target.closest("[data-allready]"))) {
        return Store.markTableReady(el.dataset.allready).then(function () { toast("Fiş kapatıldı"); render(); });
      }
      if (e.target.closest("#btnDemo")) {
        return Store.seedDemo().then(function () { toast("Örnek gün oluşturuldu"); render(); });
      }

      /* seçici */
      if (e.target.closest("#pClose")) { picker = null; return render(); }
      if ((el = e.target.closest("[data-cat]"))) { picker.cat = el.dataset.cat; return render(); }
      if ((el = e.target.closest("[data-mid]"))) {
        var m = MENU.filter(function (x) { return x.mid === el.dataset.mid; })[0];
        if (!m) return;
        if (e.target.closest(".inbag")) return;
        return addFlow(m);
      }
    });

    /* uzun basış → adet ve not */
    var pressT = null, pressed = null;
    app.addEventListener("pointerdown", function (e) {
      var el = e.target.closest("[data-mid]"); if (!el) return;
      pressed = el;
      pressT = setTimeout(function () {
        var m = MENU.filter(function (x) { return x.mid === pressed.dataset.mid; })[0];
        pressT = null; pressed = null;
        if (m && m.price != null) { if (navigator.vibrate) navigator.vibrate(12); noteFlow(m); }
      }, 480);
    });
    ["pointerup", "pointercancel", "pointermove", "scroll"].forEach(function (ev) {
      app.addEventListener(ev, function () { clearTimeout(pressT); pressT = null; }, true);
    });

    app.addEventListener("input", function (e) {
      if (e.target.id === "pq") {
        picker.q = e.target.value;
        var pos = e.target.selectionStart;
        render();
        var n = $("#pq"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} }
      }
    });

    $("#tabs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]"); if (!b) return;
      view = b.dataset.tab;
      if (view !== "order") currentOrder = null;
      picker = null;
      render();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!$("#modal").hidden) return closeModal();
      if (picker) { picker = null; return render(); }
    });
  }

  /* ================= AÇILIŞ ================= */
  function boot() {
    app = $("#app");
    Store.init().then(function () {
      MENU = Store.menu();
      wire();
      Store.onChange(function () { render(); });
      render();
      /* süreler akıp gitsin */
      tickTimer = setInterval(function () {
        if (view === "tables" || view === "kitchen" || view === "order") render();
      }, 30000);
    }).catch(function (err) {
      app.innerHTML = '<div class="wrap"><div class="empty"><b>Açılamadı</b>' + esc(err && err.message || err) + "</div></div>";
      console.error(err);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
