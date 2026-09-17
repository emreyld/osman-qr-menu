/* Garson uygulaması — ekranlar ve akış.
   Veriye yalnızca Store üzerinden dokunur. */
(function () {
  "use strict";

  var view = "tables";      // tables | order | kitchen | report
  var currentOrder = null;
  var zone = "";
  var picker = null;        // { q, cat, focus }
  var reportDay = 0;        // 0 = bugün, -1 = dün ...
  var undoInfo = null;      // { id, tableName, at }
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
    more: '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M12 3v13M8 7l4-4 4 4"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'
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

  function promoLabel(li) {
    var p = li.promo; if (!p) return "";
    if (p.type === "treat") return (p.qty && p.qty < li.qty) ? p.qty + " adet ikram" : "ikram";
    if (p.type === "percent") return "%" + p.value + " indirim";
    return money(p.value) + " indirim";
  }

  /* ---------- durum ---------- */
  function live(o) { return (o.items || []).filter(function (li) { return li.status !== "void"; }); }
  function pendingCount() {
    var n = 0;
    Store.openOrders().forEach(function (o) {
      o.items.forEach(function (li) { if (li.status === "sent") n++; });
    });
    return n;
  }
  function orderState(o) {
    return {
      hasSent: o.items.some(function (li) { return li.status === "sent"; }),
      hasDraft: o.items.some(function (li) { return li.status === "draft"; })
    };
  }
  function draftSummary(o) {
    var d = o.items.filter(function (li) { return li.status === "draft"; });
    return {
      count: d.reduce(function (s, l) { return s + l.qty; }, 0),
      total: d.reduce(function (s, l) { return s + l.price * l.qty; }, 0)
    };
  }

  /* ================= MASA PLANI ================= */
  function renderTables() {
    var open = Store.openOrders();
    var byTable = {};
    open.forEach(function (o) { byTable[o.tableId] = o; });
    var rep = Store.report(Store.dayStart(), Date.now() + 1);

    var h = '<header class="top"><div class="top-in">' +
      '<div class="ttl"><b>Masalar</b><span>' + esc(Store.settings().waiter) + " · " + open.length + " açık adisyon</span></div>" +
      '<div class="act"><button class="iconbtn" id="btnSettings" aria-label="Ayarlar">' +
      icon('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>', 20) +
      "</button></div></div></header><div class='wrap'>";

    /* geri alma şeridi */
    if (undoInfo && Date.now() - undoInfo.at < 120000) {
      h += '<div class="undo"><span>Masa ' + esc(undoInfo.tableName) + " kapatıldı</span>" +
        '<button type="button" id="btnUndo">' + icon(ICON.undo, 17) + " Geri al</button></div>";
    }

    h += '<div class="summary">' +
      '<div class="stat"><span class="cap">Açık masa</span><b class="num">' + open.length + "</b></div>" +
      '<div class="stat"><span class="cap">Mutfakta</span><b class="num">' + pendingCount() + "</b></div>" +
      '<div class="stat"><span class="cap">Bugün ciro</span><b class="num">' + money(rep.ciro) + "</b></div>" +
      "</div>";

    h += '<nav class="zones"><button type="button" data-zone="" aria-pressed="' + (zone === "") + '">Tümü</button>';
    Store.zones().forEach(function (z) {
      h += '<button type="button" data-zone="' + esc(z) + '" aria-pressed="' + (zone === z) + '">' + esc(z) + "</button>";
    });
    h += "</nav>";

    h += '<div class="tgrid">';
    Store.tables().filter(function (t) { return !zone || t.zone === zone; }).forEach(function (t) {
      var o = byTable[t.id], cls = "tcard", body;
      if (o) {
        var st = orderState(o);
        cls += st.hasSent ? " wait" : " busy";
        var tot = Store.totals(o);
        var n = live(o).reduce(function (s, l) { return s + l.qty; }, 0);
        body = '<span class="nm">' + esc(t.name) + "</span>" +
          '<span class="pill">' + (st.hasSent ? "mutfakta" : o.guests + " kişi") + "</span>" +
          '<span class="sub dur num">' + dur(Date.now() - o.openedAt) + " · " + n + " ürün</span>" +
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
    var ds = draftSummary(o);

    var h = '<header class="top"><div class="top-in">' +
      '<button class="back" id="btnBack" aria-label="Geri">' + icon(ICON.back, 20) + "</button>" +
      '<div class="ttl"><b>Masa ' + esc(t ? t.name : o.tableId) + "</b>" +
      "<span>" + esc(t ? t.zone : "") + " · " + clock(o.openedAt) + " · " + dur(Date.now() - o.openedAt) + "</span></div>" +
      '<div class="act"><button class="iconbtn" id="btnMore" aria-label="Diğer işlemler">' + icon(ICON.more, 19) + "</button></div>" +
      "</div></header><div class='wrap'>";

    if (o.note) h += '<div class="notebar">' + esc(o.note) + "</div>";

    h += '<div class="osum"><div class="g"><b>' + o.guests + ' kişi</b><span>Kişi başı ' +
      money(o.guests ? Math.round(tot.total / o.guests) : 0) + "</span></div>" +
      '<div class="stepper"><button type="button" data-guests="-1" aria-label="Azalt">−</button>' +
      '<span class="v num">' + o.guests + "</span>" +
      '<button type="button" data-guests="1" aria-label="Artır">+</button></div></div>';

    if (!o.items.length) {
      h += '<div class="empty"><b>Adisyon boş</b>Aşağıdaki <b style="display:inline">Ürün</b> düğmesinden başla.</div>';
    } else {
      h += '<div class="lines">';
      o.items.forEach(function (li) {
        var lbl = { draft: "yeni", sent: "mutfakta", ready: "hazır", void: "iptal" }[li.status];
        var gross = Store.lineGross(li), d = Store.lineDisc(li), net = Store.lineTotal(li);
        h += '<div class="line ' + li.status + (d ? " promo" : "") + '" data-lid="' + li.lid + '">' +
          '<span class="q num">' + li.qty + "</span>" +
          '<span class="nm">' + esc(li.name) + "</span>" +
          '<span class="pr num">' + (d ? '<s>' + money(gross) + "</s> " : "") +
          money(li.status === "void" ? 0 : net) + "</span>" +
          '<span class="mt"><span class="st ' + li.status + '">' + lbl + "</span>" +
          (li.promo ? '<span class="st gift">' + promoLabel(li) + "</span>" : "") +
          (li.note ? '<span class="note">' + esc(li.note) + "</span>" : "") +
          (li.voidReason ? '<span class="note">' + esc(li.voidReason) + "</span>" : "") +
          '<span class="num">' + money(li.price) + "</span></span>";

        var acts = "";
        if (li.status !== "void") {
          acts += '<button class="mini alt" type="button" data-promo="' + li.lid + '">' +
            (li.promo ? "İkram düzenle" : "İkram / indirim") + "</button>";
        }
        if (li.status === "draft") {
          acts += '<span class="stepper sm">' +
            '<button type="button" data-q="' + li.lid + '|-1" aria-label="Azalt">−</button>' +
            '<span class="v num">' + li.qty + "</span>" +
            '<button type="button" data-q="' + li.lid + '|1" aria-label="Artır">+</button></span>';
        } else if (li.status === "sent" || li.status === "ready") {
          acts += '<button class="mini" type="button" data-void="' + li.lid + '">İptal et</button>';
        }
        if (acts) h += '<span class="rowact">' + acts + "</span>";
        h += "</div>";
      });
      h += "</div>";
    }

    h += "<div style='height:10px'></div></div>";

    h += '<div class="bar"><div class="bar-in">' +
      '<div class="tot"><span>' + (tot.discount ? "İndirimli toplam" : "Toplam") + '</span><b class="num">' + money(tot.total) + "</b></div>" +
      '<button class="btn ghost" id="btnAdd">' + icon(ICON.plus, 19) + " Ürün</button>" +
      (ds.count
        ? '<button class="btn primary" id="btnSend">Mutfağa (' + ds.count + ")</button>"
        : '<button class="btn primary" id="btnPay"' + (live(o).length ? "" : " disabled") + ">Hesap</button>") +
      "</div></div>";
    return h;
  }

  /* ================= MUTFAK ================= */
  function renderKitchen() {
    var tickets = [];
    Store.openOrders().forEach(function (o) {
      var items = o.items.filter(function (li) { return li.status === "sent"; });
      if (items.length) tickets.push({
        order: o, items: items,
        at: Math.min.apply(null, items.map(function (l) { return l.sentAt || Date.now(); }))
      });
    });
    tickets.sort(function (a, b) { return a.at - b.at; });

    var h = '<header class="top"><div class="top-in">' +
      '<div class="ttl"><b>Mutfak</b><span>' + tickets.length + " açık fiş · " + pendingCount() + " ürün</span></div>" +
      "</div></header><div class='wrap'>";

    if (!tickets.length) {
      return h + '<div class="empty"><b>Bekleyen sipariş yok</b>Garson mutfağa gönderdiğinde fişler burada belirir.</div></div>';
    }

    h += '<div class="kgrid">';
    tickets.forEach(function (tk) {
      var t = Store.table(tk.order.tableId);
      var mins = Math.floor((Date.now() - tk.at) / 60000);
      h += '<article class="ticket' + (mins >= 15 ? " late" : "") + '">' +
        '<div class="th"><b>Masa ' + esc(t ? t.name : tk.order.tableId) + "</b>" +
        '<span style="font-size:12.5px;color:var(--muted)">' + esc(t ? t.zone : "") + " · " + clock(tk.at) + "</span>" +
        '<span class="ago num">' + mins + " dk</span></div>" +
        (tk.order.note ? '<p class="knote">' + esc(tk.order.note) + "</p>" : "") + "<ul>";
      tk.items.forEach(function (li) {
        h += '<li><span class="q">' + li.qty + '×</span><span class="n">' + esc(li.name) +
          (li.note ? "<em>" + esc(li.note) + "</em>" : "") + "</span>" +
          '<button type="button" data-ready="' + tk.order.id + "|" + li.lid + '">hazır</button></li>';
      });
      h += '</ul><div class="foot"><button class="btn primary wide" type="button" data-allready="' + tk.order.id + '">' +
        icon(ICON.check, 18) + " Tümü hazır</button></div></article>";
    });
    return h + "</div></div>";
  }

  /* ================= RAPOR ================= */
  function reportText(r, gun) {
    var L = [];
    L.push("OSMAN GOURMET BEYDAĞI");
    L.push(gun);
    L.push("");
    L.push("Ciro: " + money(r.ciro));
    L.push("Adisyon: " + r.adisyon + "  ·  Kişi: " + r.kisi);
    L.push("Masa ort.: " + money(r.masaOrt) + "  ·  Kişi başı: " + money(r.kisiOrt));
    if (r.ikram) L.push("Ürün ikramı: " + money(r.ikram));
    if (r.indirim) L.push("Adisyon indirimi: " + money(r.indirim));
    if (r.iptal) L.push("İptal edilen: " + money(r.iptal));
    L.push("");
    L.push("EN ÇOK SATANLAR");
    r.items.slice(0, 5).forEach(function (it, i) {
      L.push((i + 1) + ". " + it.name + " — " + it.qty + " adet, " + money(it.tutar));
    });
    L.push("");
    L.push("ÖDEME");
    Object.keys(r.byPay).forEach(function (k) { L.push(k + ": " + money(r.byPay[k])); });
    return L.join("\n");
  }

  function renderReport() {
    var from = Store.dayOffset(reportDay), to = from + 86400000;
    var r = Store.report(from, to);
    var d = new Date(from);
    var gun = reportDay === 0 ? "Bugün · " + d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })
      : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });

    var h = '<header class="top"><div class="top-in">' +
      '<button class="back" id="dayPrev" aria-label="Önceki gün">' + icon(ICON.back, 20) + "</button>" +
      '<div class="ttl"><b>Gün sonu</b><span>' + esc(gun) + "</span></div>" +
      '<div class="act">' +
      '<button class="iconbtn" id="dayNext" aria-label="Sonraki gün"' + (reportDay >= 0 ? " disabled" : "") + ">" +
      icon('<path d="M9 5l7 7-7 7"/>', 20) + "</button>" +
      '<button class="iconbtn" id="btnShare" aria-label="Özeti paylaş">' + icon(ICON.share, 19) + "</button>" +
      "</div></div></header><div class='wrap'>";

    h += '<div class="rgrid">' +
      '<div class="stat wide"><span class="cap">Ciro</span><b class="num">' + money(r.ciro) + "</b></div>" +
      '<div class="stat"><span class="cap">Adisyon</span><b class="num">' + r.adisyon + "</b></div>" +
      '<div class="stat"><span class="cap">Kişi</span><b class="num">' + r.kisi + "</b></div>" +
      '<div class="stat"><span class="cap">Masa ortalaması</span><b class="num">' + money(r.masaOrt) + "</b></div>" +
      '<div class="stat"><span class="cap">Kişi başı</span><b class="num">' + money(r.kisiOrt) + "</b></div>" +
      (r.ikram ? '<div class="stat warn"><span class="cap">Ürün ikramı</span><b class="num">' + money(r.ikram) + "</b></div>" : "") +
      (r.indirim ? '<div class="stat warn"><span class="cap">Adisyon indirimi</span><b class="num">' + money(r.indirim) + "</b></div>" : "") +
      (r.iptal ? '<div class="stat bad"><span class="cap">İptal edilen</span><b class="num">' + money(r.iptal) + "</b></div>" : "") +
      "</div>";

    if (!r.adisyon) {
      return h + '<div class="empty"><b>Bu gün kapanmış adisyon yok</b>' +
        (reportDay === 0 ? "Hesap kapattıkça rapor dolar. Ayarlardan örnek gün oluşturabilirsin." : "Başka bir güne bak.") +
        "</div></div>";
    }

    var hours = [], max = 0, i;
    for (i = 8; i <= 23; i++) { var v = r.byHour[i] || 0; hours.push({ h: i, v: v }); if (v > max) max = v; }
    for (i = 0; i <= 2; i++) { var v2 = r.byHour[i] || 0; hours.push({ h: i, v: v2 }); if (v2 > max) max = v2; }
    h += '<div class="panel"><h3>Saatlik ciro</h3><div class="hours">';
    hours.forEach(function (x) {
      var pct = max ? Math.round(x.v / max * 100) : 0;
      h += '<div class="h" title="' + x.h + ":00 — " + money(x.v) + '">' +
        '<i style="height:' + Math.max(pct, x.v ? 6 : 0) + '%"></i><span>' + x.h + "</span></div>";
    });
    h += "</div></div>";

    h += '<div class="panel"><h3>En çok ciro getiren ürünler</h3><div class="blist">';
    var top = r.items.slice(0, 8), mx = top.length ? top[0].tutar : 1;
    top.forEach(function (it) {
      h += '<div class="brow"><span class="n">' + esc(it.name) +
        ' <span style="color:var(--muted);font-weight:600">×' + it.qty + "</span></span>" +
        '<span class="v">' + money(it.tutar) + "</span>" +
        '<span class="track"><i style="width:' + Math.round(it.tutar / mx * 100) + '%"></i></span></div>';
    });
    h += "</div></div>";

    h += '<div class="panel"><h3>Kategoriler</h3><div class="blist">';
    var mc = r.cats.length ? r.cats[0].tutar : 1;
    r.cats.slice(0, 6).forEach(function (c) {
      h += '<div class="brow"><span class="n">' + esc(c.name) + "</span>" +
        '<span class="v">' + money(c.tutar) + "</span>" +
        '<span class="track"><i style="width:' + Math.round(c.tutar / mc * 100) + '%"></i></span></div>';
    });
    h += "</div></div>";

    h += '<div class="panel"><h3>Ödeme türü</h3><div class="blist">';
    Object.keys(r.byPay).forEach(function (k) {
      h += '<div class="brow"><span class="n">' + esc(k) + '</span><span class="v">' + money(r.byPay[k]) + "</span></div>";
    });
    h += "</div></div>";

    h += '<div class="panel"><h3>Kapanan adisyonlar</h3><div class="blist">';
    r.list.slice(0, 14).forEach(function (o) {
      var t = Store.table(o.tableId);
      var tt = o.totals || Store.totals(o);
      h += '<div class="brow"><span class="n">Masa ' + esc(t ? t.name : o.tableId) +
        ' <span style="color:var(--muted);font-weight:600">' + clock(o.closedAt) + " · " + o.guests + " kişi</span></span>" +
        '<span class="v">' + money(tt.total) + "</span></div>";
    });
    return h + "</div></div><div style='height:10px'></div></div>";
  }

  /* ================= ÜRÜN SEÇİCİ ================= */
  function renderPicker() {
    if (!picker) return "";
    var o = Store.order(currentOrder);
    var q = (picker.q || "").trim().toLocaleLowerCase("tr");
    var showFav = !q && !picker.cat;

    var list = MENU.filter(function (m) {
      if (picker.cat && m.cat !== picker.cat) return false;
      if (!q) return true;
      return (m.name + " " + (m.nameEn || "") + " " + m.catName).toLocaleLowerCase("tr").indexOf(q) >= 0;
    });
    var inBag = {};
    if (o) o.items.forEach(function (li) {
      if (li.status === "draft") inBag[li.mid] = (inBag[li.mid] || 0) + li.qty;
    });

    var h = '<div class="picker" id="picker"><div class="head"><div class="row1">' +
      '<div class="search">' + icon(ICON.search, 19) +
      '<input id="pq" type="search" placeholder="Ürün ara" autocomplete="off" value="' + esc(picker.q || "") + '"></div>' +
      '<button class="btn ghost" id="pClose" style="min-height:44px;padding:0 14px">Bitti</button>' +
      '</div><div class="cats">' +
      '<button type="button" data-cat="" aria-pressed="' + (!picker.cat) + '">Sık</button>';
    (window.MENU || []).forEach(function (c) {
      h += '<button type="button" data-cat="' + c.id + '" aria-pressed="' + (picker.cat === c.id) + '">' + esc(c.n.tr) + "</button>";
    });
    h += '</div></div><div class="body">';

    if (showFav) {
      var fav = Store.favourites(12);
      h += '<div class="favwrap"><p class="cap favh">' + icon(ICON.star, 13) + " Sık kullanılanlar</p><div class=\"favs\">";
      fav.forEach(function (m) {
        h += '<button class="fav" type="button" data-mid="' + m.mid + '">' +
          '<span class="fn">' + esc(m.name) + "</span>" +
          '<span class="fp num">' + money(m.price) + "</span>" +
          (inBag[m.mid] ? '<span class="fq num">' + inBag[m.mid] + "</span>" : "") + "</button>";
      });
      h += '</div><p class="cap favh" style="margin-top:16px">Tüm menü</p></div>';
    }

    if (!list.length) h += '<div class="empty"><b>Sonuç yok</b>Başka bir kelime dene.</div>';
    list.forEach(function (m) {
      h += '<div class="mrow' + (inBag[m.mid] ? " has" : "") + '" data-mid="' + m.mid + '">' +
        '<button class="mmain" type="button" data-mid="' + m.mid + '">' +
        '<span class="nm">' + esc(m.name) + "</span>" +
        '<span class="sub">' + esc(m.catName) + (m.desc ? " · " + esc(m.desc.slice(0, 46)) : "") + "</span>" +
        "</button>" +
        '<span class="mpr num">' + (m.price == null ? "fiyat sor" : money(m.price)) + "</span>" +
        (inBag[m.mid]
          ? '<span class="stepper sm"><button type="button" data-mq="' + m.mid + '|-1" aria-label="Azalt">−</button>' +
            '<span class="v num">' + inBag[m.mid] + "</span>" +
            '<button type="button" data-mq="' + m.mid + '|1" aria-label="Artır">+</button></span>'
          : '<button class="addbtn" type="button" data-mid="' + m.mid + '" aria-label="Ekle">' + icon(ICON.plus, 18) + "</button>") +
        "</div>";
    });
    h += "</div>";

    var ds = o ? draftSummary(o) : { count: 0, total: 0 };
    h += '<div class="pbar"><div class="bar-in">' +
      '<div class="tot"><span>' + (ds.count ? ds.count + " yeni ürün" : "Henüz ürün seçilmedi") + "</span>" +
      '<b class="num">' + money(ds.total) + "</b></div>" +
      '<button class="btn primary" id="pSend"' + (ds.count ? "" : " disabled") + ">Mutfağa gönder</button>" +
      "</div></div></div>";
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

    var pend = pendingCount();
    $("#tabs").innerHTML = [
      ["tables", "Masalar", ICON.tables, 0],
      ["kitchen", "Mutfak", ICON.kitchen, pend],
      ["report", "Rapor", ICON.report, 0]
    ].map(function (t) {
      var sel = (view === t[0] || (view === "order" && t[0] === "tables"));
      return '<button type="button" data-tab="' + t[0] + '" aria-selected="' + sel + '">' +
        icon(t[2], 22) + "<span>" + t[1] + "</span>" +
        (t[3] ? '<span class="bdg num">' + t[3] + "</span>" : "") + "</button>";
    }).join("");

    document.body.style.paddingBottom = $(".bar") ? "calc(148px + env(safe-area-inset-bottom))" : "";

    if (picker && picker.focus) { var pq = $("#pq"); if (pq) { pq.focus(); picker.focus = false; } }
  }

  /* ================= AKIŞLAR ================= */
  function openTableFlow(tableId) {
    var existing = Store.orderByTable(tableId);
    if (existing) { currentOrder = existing.id; view = "order"; render(); return; }
    var t = Store.table(tableId);
    var g = t.seats;
    modal(
      "<h3>Masa " + esc(t.name) + "</h3><p class='lead'>" + esc(t.zone) + " · " + t.seats + " kişilik</p>" +
      '<span class="cap" style="display:block;margin-bottom:7px">Kaç kişi?</span>' +
      '<div class="chips" id="gChips">' + [1, 2, 3, 4, 5, 6, 8, 10].map(function (n) {
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
            closeModal(); currentOrder = o.id; view = "order";
            picker = { q: "", cat: "", focus: false };   /* masayı açınca doğrudan menü */
            render();
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
            Store.addItem(currentOrder, m, 1, card.querySelector("#mn").value.trim(), +card.querySelector("#mp").value || 0)
              .then(function () { closeModal(); toast(m.name + " eklendi"); render(); });
          };
        });
      return;
    }
    Store.addItem(currentOrder, m, 1, "").then(function () { toast(m.name + " eklendi"); render(); });
  }

  function noteFlow(m) {
    var qty = 1;
    modal("<h3>" + esc(m.name) + "</h3><p class='lead'>" + esc(m.catName) + " · " + money(m.price) + "</p>" +
      '<span class="cap" style="display:block;margin-bottom:7px">Adet</span>' +
      '<div class="chips" id="qChips">' + [1, 2, 3, 4, 5, 6].map(function (n) {
        return '<button type="button" data-q="' + n + '" aria-pressed="' + (n === 1) + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<span class="cap" style="display:block;margin:14px 0 7px">Sık notlar</span>' +
      '<div class="chips" id="nChips">' + ["acısız", "acılı", "soğansız", "az pişmiş", "iyi pişmiş", "servis sonra"].map(function (n) {
        return '<button type="button" data-n="' + n + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<label class="field" style="margin-top:14px"><span>Mutfak notu</span>' +
      '<input id="nn" type="text" placeholder="serbest yaz"></label>' +
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
        card.querySelector("#nChips").onclick = function (e) {
          var b = e.target.closest("[data-n]"); if (!b) return;
          var inp = card.querySelector("#nn");
          inp.value = inp.value ? inp.value + ", " + b.dataset.n : b.dataset.n;
        };
        card.querySelector("#nok").onclick = function () {
          Store.addItem(currentOrder, m, qty, card.querySelector("#nn").value.trim()).then(function () {
            closeModal(); toast(qty + "× " + m.name + " eklendi"); render();
          });
        };
      });
  }

  function promoFlow(lid) {
    var o = Store.order(currentOrder);
    var li = o.items.filter(function (x) { return x.lid === lid; })[0];
    if (!li) return;
    var giftQty = (li.promo && li.promo.type === "treat") ? li.promo.qty : li.qty;

    function body() {
      var g = Store.lineGross(li), d = Store.lineDisc(li);
      return "<h3>" + esc(li.name) + "</h3>" +
        "<p class='lead'>" + li.qty + " adet · " + money(li.price) + " · toplam " + money(g) +
        (d ? " → <b>" + money(g - d) + "</b>" : "") + "</p>" +

        '<span class="cap" style="display:block;margin-bottom:7px">İkram (ücretsiz)</span>' +
        '<div class="giftrow">' +
        '<div class="stepper"><button type="button" id="gMinus">−</button>' +
        '<span class="v num" id="gVal">' + giftQty + "</span>" +
        '<button type="button" id="gPlus">+</button></div>' +
        '<span class="gl">' + li.qty + " adetten kaçı ikram?</span>" +
        '<button class="btn primary" id="gDo" type="button">İkram et</button></div>' +

        '<span class="cap" style="display:block;margin:16px 0 7px">Satıra indirim</span>' +
        '<div class="chips" id="pcChips">' +
        [10, 20, 50].map(function (v) {
          var on = li.promo && li.promo.type === "percent" && li.promo.value === v;
          return '<button type="button" data-pc="' + v + '" aria-pressed="' + !!on + '">%' + v + "</button>";
        }).join("") + "</div>" +
        '<div class="amtrow"><input id="pAmt" type="number" inputmode="numeric" min="0" step="10" placeholder="Tutar (₺)">' +
        '<button class="btn ghost" id="pAmtOk" type="button">Uygula</button></div>' +

        '<div class="acts two" style="margin-top:18px">' +
        (li.promo ? '<button class="btn danger" id="pClear" type="button">Kaldır</button>'
                  : '<button class="btn ghost" data-close type="button">Vazgeç</button>') +
        '<button class="btn ghost" data-close type="button">Kapat</button></div>';
    }

    function mount(card) {
      var val = card.querySelector("#gVal");
      card.querySelector("#gMinus").onclick = function () {
        giftQty = Math.max(1, giftQty - 1); val.textContent = giftQty;
      };
      card.querySelector("#gPlus").onclick = function () {
        giftQty = Math.min(li.qty, giftQty + 1); val.textContent = giftQty;
      };
      card.querySelector("#gDo").onclick = function () {
        Store.setPromo(currentOrder, lid, { type: "treat", qty: giftQty }).then(function () {
          closeModal(); toast(giftQty + " adet ikram edildi"); render();
        });
      };
      card.querySelector("#pcChips").onclick = function (e) {
        var b = e.target.closest("[data-pc]"); if (!b) return;
        Store.setPromo(currentOrder, lid, { type: "percent", value: +b.dataset.pc }).then(function () {
          closeModal(); toast("%" + b.dataset.pc + " indirim uygulandı"); render();
        });
      };
      card.querySelector("#pAmtOk").onclick = function () {
        var v = +card.querySelector("#pAmt").value || 0;
        if (v <= 0) return toast("Tutar gir");
        Store.setPromo(currentOrder, lid, { type: "amount", value: v }).then(function () {
          closeModal(); toast(money(v) + " indirim uygulandı"); render();
        });
      };
      var clr = card.querySelector("#pClear");
      if (clr) clr.onclick = function () {
        Store.setPromo(currentOrder, lid, null).then(function () {
          closeModal(); toast("İkram kaldırıldı"); render();
        });
      };
    }
    modal(body(), mount);
  }

  function voidFlow(lid) {
    var o = Store.order(currentOrder);
    var li = o.items.filter(function (x) { return x.lid === lid; })[0];
    if (!li) return;
    modal("<h3>" + esc(li.name) + " iptal</h3>" +
      "<p class='lead'>Bu ürün mutfağa gitti. İptal sebebi kayda geçer.</p>" +
      '<div class="chips" id="rChips">' + ["Yanlış girildi", "Müşteri vazgeçti", "Mutfak yapamadı"].map(function (r) {
        return '<button type="button" data-r="' + esc(r) + '">' + esc(r) + "</button>";
      }).join("") + "</div>" +
      '<div class="acts two"><button class="btn ghost" data-close type="button">Vazgeç</button>' +
      '<button class="btn danger" id="vok" type="button" disabled>İptal et</button></div>',
      function (card) {
        var reason = "";
        card.querySelector("#rChips").onclick = function (e) {
          var b = e.target.closest("[data-r]"); if (!b) return;
          reason = b.dataset.r;
          Array.prototype.forEach.call(card.querySelectorAll("[data-r]"), function (x) {
            x.setAttribute("aria-pressed", x.dataset.r === reason);
          });
          card.querySelector("#vok").disabled = false;
        };
        card.querySelector("#vok").onclick = function () {
          Store.voidItem(currentOrder, lid, reason).then(function () {
            closeModal(); toast("Ürün iptal edildi"); render();
          });
        };
      });
  }

  function moreFlow() {
    var o = Store.order(currentOrder);
    var t = Store.table(o.tableId);
    modal("<h3>Masa " + esc(t.name) + "</h3><p class='lead'>Adisyon işlemleri</p>" +
      '<div class="acts">' +
      '<button class="btn ghost" id="aMove" type="button">Masayı taşı</button>' +
      '<button class="btn ghost" id="aMerge" type="button">Başka masayla birleştir</button>' +
      '<button class="btn ghost" id="aNote" type="button">Servis notu' + (o.note ? " (var)" : "") + "</button>" +
      '<button class="btn ghost" id="aBill" type="button">Adisyon fişi</button>' +
      '<button class="btn danger" id="aCancel" type="button">Adisyonu iptal et</button>' +
      "</div>",
      function (card) {
        card.querySelector("#aMove").onclick = function () { closeModal(); moveFlow(); };
        card.querySelector("#aMerge").onclick = function () { closeModal(); mergeFlow(); };
        card.querySelector("#aNote").onclick = function () { closeModal(); noteOrderFlow(); };
        card.querySelector("#aBill").onclick = function () { closeModal(); billFlow(); };
        card.querySelector("#aCancel").onclick = function () {
          if (live(o).length && !confirm("Adisyonda ürün var. Masa tamamen iptal edilsin mi?")) return;
          Store.cancelOrder(o.id).then(function () {
            closeModal(); currentOrder = null; view = "tables"; toast("Masa iptal edildi"); render();
          });
        };
      });
  }

  function moveFlow() {
    var o = Store.order(currentOrder);
    var free = Store.tables().filter(function (t) { return t.id !== o.tableId && !Store.orderByTable(t.id); });
    modal("<h3>Masayı taşı</h3><p class='lead'>Adisyon hangi masaya gitsin?</p>" +
      '<div class="chips grid" id="tChips">' + free.map(function (t) {
        return '<button type="button" data-t="' + t.id + '">' + esc(t.name) + "<em>" + esc(t.zone) + "</em></button>";
      }).join("") + "</div>" +
      '<div class="acts"><button class="btn ghost" data-close type="button">Vazgeç</button></div>',
      function (card) {
        card.querySelector("#tChips").onclick = function (e) {
          var b = e.target.closest("[data-t]"); if (!b) return;
          Store.moveOrder(o.id, b.dataset.t).then(function () {
            closeModal(); toast("Masa taşındı"); render();
          }).catch(function (m) { toast(m); });
        };
      });
  }

  function mergeFlow() {
    var o = Store.order(currentOrder);
    var others = Store.openOrders().filter(function (x) { return x.id !== o.id; });
    if (!others.length) { toast("Birleştirilecek başka açık masa yok"); return; }
    modal("<h3>Masaları birleştir</h3><p class='lead'>Bu masanın adisyonu seçtiğin masaya aktarılır.</p>" +
      '<div class="chips grid" id="mChips">' + others.map(function (x) {
        var t = Store.table(x.tableId);
        return '<button type="button" data-o="' + x.id + '">' + esc(t ? t.name : x.tableId) +
          "<em>" + money(Store.totals(x).total) + "</em></button>";
      }).join("") + "</div>" +
      '<div class="acts"><button class="btn ghost" data-close type="button">Vazgeç</button></div>',
      function (card) {
        card.querySelector("#mChips").onclick = function (e) {
          var b = e.target.closest("[data-o]"); if (!b) return;
          Store.mergeOrders(o.id, b.dataset.o).then(function (into) {
            closeModal(); currentOrder = into.id; toast("Adisyonlar birleştirildi"); render();
          });
        };
      });
  }

  function noteOrderFlow() {
    var o = Store.order(currentOrder);
    modal("<h3>Servis notu</h3><p class='lead'>Mutfak fişinde de görünür.</p>" +
      '<label class="field"><span>Not</span><input id="on" type="text" value="' + esc(o.note || "") +
      '" placeholder="doğum günü, alerji, acele..."></label>' +
      '<div class="acts two"><button class="btn ghost" data-close type="button">Vazgeç</button>' +
      '<button class="btn primary" id="onok" type="button">Kaydet</button></div>',
      function (card) {
        card.querySelector("#onok").onclick = function () {
          Store.setNote(o.id, card.querySelector("#on").value.trim()).then(function () {
            closeModal(); render();
          });
        };
      });
  }

  function billHTML(o) {
    var t = Store.totals(o), tb = Store.table(o.tableId);
    var rows = live(o).map(function (li) {
      var d = Store.lineDisc(li);
      return '<tr><td class="q num">' + li.qty + "</td><td>" + esc(li.name) +
        (li.note ? "<em>" + esc(li.note) + "</em>" : "") +
        (d ? "<em>" + promoLabel(li) + " −" + money(d) + "</em>" : "") + "</td>" +
        '<td class="num">' + money(Store.lineTotal(li)) + "</td></tr>";
    }).join("");
    return '<div class="bill" id="bill">' +
      '<div class="bh"><b>OSMAN GOURMET BEYDAĞI</b><span>Binbirdirek, Klodfarer Cd. No:27/B · Fatih</span>' +
      "<span>(0212) 638 34 44</span></div>" +
      '<div class="bmeta"><span>Masa ' + esc(tb ? tb.name : o.tableId) + "</span><span>" + o.guests + " kişi</span>" +
      "<span>" + clock(o.openedAt) + " – " + clock(Date.now()) + "</span><span>" + esc(o.waiter) + "</span></div>" +
      "<table>" + rows + "</table>" +
      '<div class="btot">' +
      (t.promo ? '<div><span>Ürünler</span><b class="num">' + money(t.gross) + "</b></div>" +
                 '<div><span>İkram / indirim</span><b class="num">−' + money(t.promo) + "</b></div>" : "") +
      '<div><span>Ara toplam</span><b class="num">' + money(t.sub) + "</b></div>" +
      (t.discount ? "<div><span>İndirim</span><b class=\"num\">−" + money(t.discount) + "</b></div>" : "") +
      '<div class="big"><span>TOPLAM</span><b class="num">' + money(t.total) + "</b></div>" +
      (o.guests > 1 ? "<div><span>Kişi başı</span><b class=\"num\">" + money(Math.round(t.total / o.guests)) + "</b></div>" : "") +
      "</div><p class='bfoot'>Afiyet olsun · Teşekkür ederiz</p></div>";
  }

  function billFlow() {
    var o = Store.order(currentOrder);
    modal(billHTML(o) +
      '<div class="acts two noprint"><button class="btn ghost" data-close type="button">Kapat</button>' +
      '<button class="btn primary" id="bPrint" type="button">' + icon(ICON.print, 18) + " Yazdır</button></div>",
      function (card) {
        card.querySelector("#bPrint").onclick = function () { window.print(); };
      });
  }

  function payFlow() {
    var o = Store.order(currentOrder);
    if (!o) return;
    var disc = o.discount ? JSON.parse(JSON.stringify(o.discount)) : null;
    var pay = "kart";

    function body() {
      var tmp = JSON.parse(JSON.stringify(o)); tmp.discount = disc;
      var t = Store.totals(tmp);
      var per = o.guests ? Math.round(t.total / o.guests) : t.total;
      return "<h3>Hesap · Masa " + esc((Store.table(o.tableId) || {}).name || "") + "</h3>" +
        '<p class="lead">' + o.guests + " kişi · " + live(o).length + " kalem</p>" +
        '<div class="paysum">' +
        '<div><span>Ürünler</span><b class="num">' + money(t.gross) + "</b></div>" +
        (t.promo ? '<div class="neg"><span>Ürün ikramı / indirimi</span><b class="num">−' + money(t.promo) + "</b></div>" : "") +
        (t.promo ? '<div><span>Ara toplam</span><b class="num">' + money(t.sub) + "</b></div>" : "") +
        (t.discount ? '<div class="neg"><span>İndirim</span><b class="num">−' + money(t.discount) + "</b></div>" : "") +
        '<div class="big"><span>Toplam</span><b class="num">' + money(t.total) + "</b></div>" +
        (o.guests > 1 ? '<div class="per"><span>Kişi başı (' + o.guests + ")</span><b class=\"num\">" + money(per) + "</b></div>" : "") +
        "</div>" +
        '<span class="cap" style="display:block;margin-bottom:7px">İndirim</span>' +
        '<div class="chips" id="dChips">' +
        '<button type="button" data-d="none" aria-pressed="' + (!disc) + '">Yok</button>' +
        '<button type="button" data-d="p10" aria-pressed="' + (!!disc && disc.type === "percent" && disc.value === 10) + '">%10</button>' +
        '<button type="button" data-d="p20" aria-pressed="' + (!!disc && disc.type === "percent" && disc.value === 20) + '">%20</button>' +
        '<button type="button" data-d="treat" aria-pressed="' + (!!disc && disc.type === "treat") + '">İkram</button>' +
        "</div>" +
        '<span class="cap" style="display:block;margin:14px 0 7px">Ödeme</span>' +
        '<div class="chips" id="pChips">' + ["kart", "nakit", "karma"].map(function (k) {
          return '<button type="button" data-p="' + k + '" aria-pressed="' + (pay === k) + '">' +
            k.charAt(0).toUpperCase() + k.slice(1) + "</button>";
        }).join("") + "</div>" +
        '<div class="acts two"><button class="btn ghost" id="payBill" type="button">Fiş</button>' +
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
      card.querySelector("#payBill").onclick = function () {
        Store.setDiscount(o.id, disc).then(function () { closeModal(); billFlow(); });
      };
      card.querySelector("#payOk").onclick = function () {
        var tb = Store.table(o.tableId);
        Store.setDiscount(o.id, disc)
          .then(function () { return Store.closeOrder(o.id, pay); })
          .then(function () {
            undoInfo = { id: o.id, tableName: tb ? tb.name : o.tableId, at: Date.now() };
            closeModal(); toast("Masa kapatıldı"); currentOrder = null; view = "tables"; render();
          });
      };
    }
    function refresh() { modal(body(), mount); }
    refresh();
  }

  function shareReport() {
    var from = Store.dayOffset(reportDay);
    var r = Store.report(from, from + 86400000);
    var d = new Date(from);
    var gun = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
    var txt = reportText(r, gun);
    if (navigator.share) {
      navigator.share({ title: "Gün sonu raporu", text: txt }).catch(function () {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(function () { toast("Rapor panoya kopyalandı"); });
      return;
    }
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
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
          Store.seedDemo().then(function () { closeModal(); toast("Örnek gün oluşturuldu"); view = "report"; reportDay = 0; render(); });
        };
        card.querySelector("#sWipe").onclick = function () {
          if (!confirm("Bütün adisyonlar silinecek. Emin misin?")) return;
          Store.wipe().then(function () { closeModal(); undoInfo = null; currentOrder = null; view = "tables"; render(); });
        };
      });
  }

  /* ================= OLAYLAR ================= */
  function wire() {
    app.addEventListener("click", function (e) {
      var el;

      /* masa planı */
      if ((el = e.target.closest("[data-table]"))) return openTableFlow(el.dataset.table);
      if ((el = e.target.closest("[data-zone]"))) { zone = el.dataset.zone; return render(); }
      if (e.target.closest("#btnSettings")) return settingsFlow();
      if (e.target.closest("#btnUndo")) {
        return Store.reopenOrder(undoInfo.id).then(function (o) {
          undoInfo = null; currentOrder = o.id; view = "order"; toast("Adisyon geri alındı"); render();
        }).catch(function (m) { toast(m); undoInfo = null; render(); });
      }

      /* adisyon */
      if (e.target.closest("#btnBack")) { view = "tables"; currentOrder = null; return render(); }
      if (e.target.closest("#btnMore")) return moreFlow();
      if (e.target.closest("#btnAdd")) { picker = { q: "", cat: "", focus: false }; return render(); }
      if (e.target.closest("#btnSend") || e.target.closest("#pSend")) {
        return Store.sendToKitchen(currentOrder).then(function (n) {
          picker = null; toast(n + " kalem mutfağa gönderildi"); render();
        });
      }
      if (e.target.closest("#btnPay")) return payFlow();
      if ((el = e.target.closest("[data-guests]"))) {
        var ord = Store.order(currentOrder);
        return Store.setGuests(currentOrder, Math.max(1, (ord.guests || 1) + (+el.dataset.guests))).then(render);
      }
      if ((el = e.target.closest("[data-q]")) && el.dataset.q.indexOf("|") > 0) {
        var p = el.dataset.q.split("|");
        var order = Store.order(currentOrder);
        var li = order.items.filter(function (x) { return x.lid === p[0]; })[0];
        if (!li) return;
        return Store.setQty(currentOrder, li.lid, li.qty + (+p[1])).then(render);
      }
      if ((el = e.target.closest("[data-promo]"))) return promoFlow(el.dataset.promo);
      if ((el = e.target.closest("[data-void]"))) return voidFlow(el.dataset.void);

      /* mutfak */
      if ((el = e.target.closest("[data-ready]"))) {
        var kp = el.dataset.ready.split("|");
        return Store.setItemStatus(kp[0], kp[1], "ready").then(render);
      }
      if ((el = e.target.closest("[data-allready]"))) {
        return Store.markTableReady(el.dataset.allready).then(function () { toast("Fiş kapatıldı"); render(); });
      }

      /* rapor */
      if (e.target.closest("#dayPrev")) { reportDay--; return render(); }
      if (e.target.closest("#dayNext")) { if (reportDay < 0) reportDay++; return render(); }
      if (e.target.closest("#btnShare")) return shareReport();

      /* seçici */
      if (e.target.closest("#pClose")) { picker = null; return render(); }
      if ((el = e.target.closest("[data-cat]"))) { picker.cat = el.dataset.cat; picker.q = ""; return render(); }
      if ((el = e.target.closest("[data-mq]"))) {
        var mp = el.dataset.mq.split("|");
        var o2 = Store.order(currentOrder);
        var line = o2.items.filter(function (x) { return x.status === "draft" && x.mid === mp[0]; }).pop();
        if (!line) return;
        return Store.setQty(currentOrder, line.lid, line.qty + (+mp[1])).then(render);
      }
      if ((el = e.target.closest("[data-mid]"))) {
        var m = MENU.filter(function (x) { return x.mid === el.dataset.mid; })[0];
        if (m) return addFlow(m);
      }
    });

    /* uzun basış → adet ve not */
    var pressT = null, pressed = null;
    app.addEventListener("pointerdown", function (e) {
      var el = e.target.closest("[data-mid]"); if (!el) return;
      pressed = el.dataset.mid;
      pressT = setTimeout(function () {
        var m = MENU.filter(function (x) { return x.mid === pressed; })[0];
        pressT = null;
        if (m && m.price != null) { if (navigator.vibrate) navigator.vibrate(12); noteFlow(m); }
      }, 460);
    });
    ["pointerup", "pointercancel", "pointermove"].forEach(function (ev) {
      app.addEventListener(ev, function () { clearTimeout(pressT); pressT = null; }, true);
    });
    app.addEventListener("scroll", function () { clearTimeout(pressT); pressT = null; }, true);

    app.addEventListener("input", function (e) {
      if (e.target.id !== "pq") return;
      picker.q = e.target.value;
      var pos = e.target.selectionStart;
      render();
      var n = $("#pq");
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} }
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
      tickTimer = setInterval(function () {
        if (view !== "report" && !picker && $("#modal").hidden) render();
      }, 30000);
    }).catch(function (err) {
      app.innerHTML = '<div class="wrap"><div class="empty"><b>Açılamadı</b>' + esc(err && err.message || err) + "</div></div>";
      console.error(err);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
