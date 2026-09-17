/* Garson uygulaması.
   Kural: her ekranda tek bir büyük yapılacak iş olsun, renk durumu anlatsın. */
(function () {
  "use strict";

  var view = "tables";
  var currentOrder = null;
  var zone = "";
  var picker = null;
  var reportDay = 0;
  var undoInfo = null;
  var MENU = [];
  var installEvt = null;
  var hideInstall = false;

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
    return Math.floor(m / 60) + " sa " + (m % 60) + " dk";
  }
  function clock(ts) {
    var d = new Date(ts);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function ic(p, s) {
    return '<svg viewBox="0 0 24 24" width="' + (s || 24) + '" height="' + (s || 24) + '" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  }
  var I = {
    tables: '<rect x="3" y="4" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="4" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    kitchen: '<path d="M5 9h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M3 9h18M8 4.5l1 4.5M16 4.5l-1 4.5"/>',
    report: '<path d="M4 20V11M10 20V4M16 20v-6M22 20H2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 19l-7-7 7-7"/>',
    fwd: '<path d="M9 5l7 7-7 7"/>',
    more: '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-2 8-2 8h16s-2-1-2-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    person: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
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
    toastT = setTimeout(function () { t.hidden = true; }, 1800);
  }

  /* ---------- alt sayfa ---------- */
  function sheet(html, onMount) {
    var host = $("#modal");
    host.innerHTML = '<div class="bd" data-close></div><div class="card" role="dialog" aria-modal="true">' +
      '<div class="grab"></div>' + html + "</div>";
    host.hidden = false;
    document.body.style.overflow = "hidden";
    host.onclick = function (e) { if (e.target.closest("[data-close]")) closeSheet(); };
    if (onMount) onMount($(".card", host));
  }
  function closeSheet() {
    var host = $("#modal");
    host.hidden = true; host.innerHTML = "";
    document.body.style.overflow = "";
  }

  function standalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  /* servis sırasında ekran kendi kendine kapanmasın */
  var wake = null;
  function keepAwake(on) {
    if (!("wakeLock" in navigator)) return;
    if (on && !wake) {
      navigator.wakeLock.request("screen").then(function (w) {
        wake = w;
        w.addEventListener("release", function () { wake = null; });
      }).catch(function () {});
    } else if (!on && wake) {
      try { wake.release(); } catch (e) {}
      wake = null;
    }
  }

  /* ---------- durum ---------- */
  function live(o) { return (o.items || []).filter(function (li) { return li.status !== "void"; }); }
  function count(o, st) {
    return (o.items || []).filter(function (li) { return li.status === st; })
      .reduce(function (s, li) { return s + li.qty; }, 0);
  }
  function pendingCount() {
    return Store.openOrders().reduce(function (s, o) { return s + count(o, "sent"); }, 0);
  }
  function promoLabel(li) {
    var p = li.promo; if (!p) return "";
    if (p.type === "treat") return (p.qty && p.qty < li.qty) ? p.qty + " adet ikram" : "İKRAM";
    if (p.type === "percent") return "%" + p.value + " indirim";
    return money(p.value) + " indirim";
  }
  function tableState(o) {
    if (!o) return "bos";
    if (count(o, "ready")) return "hazir";
    if (count(o, "sent")) return "mutfak";
    return "dolu";
  }
  var STATE_TEXT = { bos: "Boş", dolu: "Serviste", mutfak: "Mutfakta", hazir: "HAZIR" };

  /* ================= MASALAR ================= */
  function renderTables() {
    var open = Store.openOrders();
    var byTable = {};
    open.forEach(function (o) { byTable[o.tableId] = o; });
    var rep = Store.report(Store.dayStart(), Date.now() + 1);

    var h = '<header class="top"><div class="top-in">' +
      '<div class="ttl"><b>Masalar</b></div>' +
      '<button class="who" id="btnWho">' + ic(I.person, 18) + "<span>" + esc(Store.settings().waiter) + "</span></button>" +
      '<button class="iconbtn" id="btnSettings" aria-label="Ayarlar">' + ic(I.gear, 21) + "</button>" +
      "</div></header><div class='wrap'>";

    if (!navigator.onLine) {
      h += '<div class="strip off">' + ic(I.bell, 19) +
        "<span><b>Çevrimdışı</b> — kayıtlar cihazda tutuluyor</span></div>";
    }
    if (!hideInstall && !standalone()) {
      if (installEvt) {
        h += '<div class="strip" id="instStrip">' + ic(I.plus, 19) +
          "<span><b>Ana ekrana ekle</b> — tam ekran açılır</span>" +
          '<button class="x" id="instX" aria-label="Kapat">×</button></div>';
      } else if (isIOS()) {
        h += '<div class="strip" id="instStrip">' + ic(I.share, 19) +
          "<span>Paylaş → <b>Ana Ekrana Ekle</b> dersen uygulama gibi açılır</span>" +
          '<button class="x" id="instX" aria-label="Kapat">×</button></div>';
      }
    }

    Store.readyTables().forEach(function (o) {
      var t = Store.table(o.tableId);
      h += '<button class="alert" type="button" data-goto="' + o.id + '">' +
        '<span class="ab">' + ic(I.bell, 22) + "</span>" +
        '<span class="at"><b>Masa ' + esc(t ? t.name : o.tableId) + " hazır</b>" +
        "<span>" + Store.readyCount(o) + " ürün mutfaktan çıktı</span></span>" +
        '<span class="ag">' + ic(I.fwd, 20) + "</span></button>";
    });

    if (undoInfo && Date.now() - undoInfo.at < 120000) {
      h += '<div class="undo"><span>Masa ' + esc(undoInfo.tableName) + " kapatıldı</span>" +
        '<button type="button" id="btnUndo">' + ic(I.undo, 17) + " Geri al</button></div>";
    }

    h += '<div class="summary">' +
      '<div class="stat"><b class="num">' + open.length + '</b><span>açık masa</span></div>' +
      '<div class="stat"><b class="num">' + pendingCount() + '</b><span>mutfakta</span></div>' +
      '<div class="stat"><b class="num">' + money(rep.ciro) + '</b><span>bugün</span></div>' +
      "</div>";

    h += '<nav class="zones"><button type="button" data-zone="" aria-pressed="' + (zone === "") + '">Hepsi</button>';
    Store.zones().forEach(function (z) {
      h += '<button type="button" data-zone="' + esc(z) + '" aria-pressed="' + (zone === z) + '">' + esc(z) + "</button>";
    });
    h += "</nav>";

    h += '<div class="tgrid">';
    Store.tables().filter(function (t) { return !zone || t.zone === zone; }).forEach(function (t) {
      var o = byTable[t.id], st = tableState(o);
      h += '<button class="tcard ' + st + '" type="button" data-table="' + esc(t.id) + '">' +
        '<span class="tn">' + esc(t.name) + "</span>" +
        '<span class="ts">' + STATE_TEXT[st] + "</span>" +
        (o ? '<span class="tm num">' + money(Store.totals(o).total) + "</span>"
           : '<span class="tm none">' + t.seats + " kişilik</span>") +
        "</button>";
    });
    return h + "</div></div>";
  }

  /* ================= ADİSYON ================= */
  function renderOrder() {
    var o = Store.order(currentOrder);
    if (!o) { view = "tables"; return renderTables(); }
    var t = Store.table(o.tableId);
    var tot = Store.totals(o);
    var nDraft = count(o, "draft"), nReady = count(o, "ready");

    var h = '<header class="top"><div class="top-in">' +
      '<button class="iconbtn" id="btnBack" aria-label="Geri">' + ic(I.back, 21) + "</button>" +
      '<div class="ttl"><b>Masa ' + esc(t ? t.name : o.tableId) + "</b>" +
      "<span>" + (o.no ? "Adisyon " + o.no + " · " : "") + dur(Date.now() - o.openedAt) + " · " + esc(o.waiter) + "</span></div>" +
      '<button class="iconbtn" id="btnMore" aria-label="Diğer işlemler">' + ic(I.more, 21) + "</button>" +
      "</div></header><div class='wrap'>";

    if (o.note) h += '<div class="notebar">' + esc(o.note) + "</div>";

    h += '<div class="guests"><span>Kişi</span>' +
      '<div class="stepper"><button type="button" data-guests="-1" aria-label="Azalt">−</button>' +
      '<b class="num">' + o.guests + "</b>" +
      '<button type="button" data-guests="1" aria-label="Artır">+</button></div>' +
      '<span class="per num">' + money(o.guests ? Math.round(tot.total / o.guests) : 0) + " / kişi</span></div>";

    if (!o.items.length) {
      h += '<div class="empty"><b>Adisyon boş</b><span>Aşağıdaki yeşil + düğmesinden ürün ekle</span></div>';
    } else {
      h += '<div class="lines">';
      o.items.forEach(function (li) {
        var d = Store.lineDisc(li);
        h += '<button class="line ' + li.status + '" type="button" data-lid="' + li.lid + '">' +
          '<span class="q num">' + li.qty + "</span>" +
          '<span class="body"><span class="nm">' + esc(li.name) + "</span>" +
          '<span class="tags">' +
          (li.status === "draft" ? '<span class="tag blue">yeni</span>' : "") +
          (li.status === "sent" ? '<span class="tag amber">mutfakta</span>' : "") +
          (li.status === "ready" ? '<span class="tag hot">HAZIR</span>' : "") +
          (li.status === "served" ? '<span class="tag done">serviste</span>' : "") +
          (li.status === "void" ? '<span class="tag red">iptal</span>' : "") +
          (li.promo ? '<span class="tag green">' + promoLabel(li) + "</span>" : "") +
          (li.note ? '<span class="tag note">' + esc(li.note) + "</span>" : "") +
          (li.voidReason ? '<span class="tag note">' + esc(li.voidReason) + "</span>" : "") +
          "</span></span>" +
          '<span class="pr num">' + (d ? "<s>" + money(Store.lineGross(li)) + "</s>" : "") +
          "<b>" + money(li.status === "void" ? 0 : Store.lineTotal(li)) + "</b></span>" +
          "</button>";
      });
      h += "</div>";
    }

    h += "<div style='height:8px'></div></div>";

    var primary;
    if (nDraft) primary = '<button class="btn go big" id="btnSend">Mutfağa gönder · ' + nDraft + "</button>";
    else if (nReady) primary = '<button class="btn hot big" id="btnServe">Servis ettim · ' + nReady + "</button>";
    else primary = '<button class="btn go big" id="btnPay"' + (live(o).length ? "" : " disabled") + ">Hesap</button>";

    h += '<div class="bar two"><div class="bar-in">' +
      '<div class="row1">' +
        '<div class="tot"><span>Toplam</span><b class="num">' + money(tot.total) + "</b></div>" +
        '<button class="btn add" id="btnAdd">' + ic(I.plus, 20) + " Ürün ekle</button>" +
      "</div>" +
      '<div class="row2">' +
        '<button class="btn sq" id="btnBack2" aria-label="Masalara dön">' + ic(I.back, 22) + "</button>" +
        primary +
      "</div></div></div>";
    return h;
  }

  /* ================= MUTFAK ================= */
  function renderKitchen() {
    var tickets = [];
    Store.openOrders().forEach(function (o) {
      var items = o.items.filter(function (li) { return li.status === "sent"; });
      if (items.length) tickets.push({
        o: o, items: items,
        at: Math.min.apply(null, items.map(function (l) { return l.sentAt || Date.now(); }))
      });
    });
    tickets.sort(function (a, b) { return a.at - b.at; });

    var h = '<header class="top"><div class="top-in"><div class="ttl"><b>Mutfak</b>' +
      "<span>" + tickets.length + " fiş bekliyor</span></div></div></header><div class='wrap'>";

    if (!tickets.length) {
      return h + '<div class="empty"><b>Sipariş yok</b><span>Garson gönderdiğinde fiş burada belirir</span></div></div>';
    }

    h += '<div class="kgrid">';
    tickets.forEach(function (tk) {
      var t = Store.table(tk.o.tableId);
      var mins = Math.floor((Date.now() - tk.at) / 60000);
      h += '<article class="ticket' + (mins >= 15 ? " late" : "") + '">' +
        '<div class="th"><b>Masa ' + esc(t ? t.name : tk.o.tableId) + "</b>" +
        '<span class="ago num">' + mins + " dk</span></div>" +
        '<p class="tsub">' + esc(t ? t.zone : "") + " · " + clock(tk.at) + " · " + esc(tk.o.waiter) + "</p>" +
        (tk.o.note ? '<p class="knote">' + esc(tk.o.note) + "</p>" : "") + "<ul>";
      tk.items.forEach(function (li) {
        h += "<li><b>" + li.qty + "</b><span>" + esc(li.name) +
          (li.note ? "<em>" + esc(li.note) + "</em>" : "") + "</span></li>";
      });
      h += "</ul><button class='btn go wide' type='button' data-allready='" + tk.o.id + "'>" +
        ic(I.check, 20) + " Hazır</button></article>";
    });
    return h + "</div></div>";
  }

  /* ================= GÜN SONU ================= */
  function reportText(r, gun, acik) {
    var L = ["OSMAN GOURMET BEYDAĞI", gun, ""];
    L.push("Ciro: " + money(r.ciro));
    L.push("Adisyon: " + r.adisyon + "  ·  Kişi: " + r.kisi);
    L.push("Masa ort.: " + money(r.masaOrt) + "  ·  Kişi başı: " + money(r.kisiOrt));
    if (r.ikram) L.push("Ürün ikramı: " + money(r.ikram));
    if (r.indirim) L.push("Adisyon indirimi: " + money(r.indirim));
    if (r.iptal) L.push("İptal edilen: " + money(r.iptal));
    if (r.waiters.length > 1) {
      L.push("", "GARSONLAR");
      r.waiters.forEach(function (w) { L.push(w.name + ": " + money(w.tutar) + " (" + w.adisyon + " adisyon)"); });
    }
    L.push("", "EN ÇOK SATANLAR");
    r.items.slice(0, 5).forEach(function (it, i) {
      L.push((i + 1) + ". " + it.name + " — " + it.qty + " adet, " + money(it.tutar));
    });
    L.push("", "ÖDEME");
    Object.keys(r.byPay).forEach(function (k) { L.push(k + ": " + money(r.byPay[k])); });
    if (acik) L.push("", "UYARI: " + acik + " masa hâlâ açık.");
    return L.join("\n");
  }

  function renderReport() {
    var from = Store.dayOffset(reportDay);
    var r = Store.report(from, from + 86400000);
    var d = new Date(from);
    var gun = reportDay === 0 ? "Bugün, " + d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })
      : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
    var acik = reportDay === 0 ? Store.openOrders().length : 0;

    var h = '<header class="top"><div class="top-in">' +
      '<button class="iconbtn" id="dayPrev" aria-label="Önceki gün">' + ic(I.back, 21) + "</button>" +
      '<div class="ttl"><b>Gün sonu</b><span>' + esc(gun) + "</span></div>" +
      '<button class="iconbtn" id="dayNext" aria-label="Sonraki gün"' + (reportDay >= 0 ? " disabled" : "") + ">" + ic(I.fwd, 21) + "</button>" +
      '<button class="iconbtn" id="btnShare" aria-label="Paylaş">' + ic(I.share, 20) + "</button>" +
      "</div></header><div class='wrap'>";

    if (acik) h += '<div class="warnbar">' + acik + " masa hâlâ açık — ciroya dahil değil</div>";

    h += '<div class="hero"><span>Ciro</span><b class="num">' + money(r.ciro) + "</b></div>";

    h += '<div class="rgrid">' +
      '<div class="stat"><b class="num">' + r.adisyon + '</b><span>adisyon</span></div>' +
      '<div class="stat"><b class="num">' + r.kisi + '</b><span>kişi</span></div>' +
      '<div class="stat"><b class="num">' + money(r.masaOrt) + '</b><span>masa ort.</span></div>' +
      '<div class="stat"><b class="num">' + money(r.kisiOrt) + '</b><span>kişi başı</span></div>' +
      (r.ikram ? '<div class="stat warn"><b class="num">' + money(r.ikram) + '</b><span>ürün ikramı</span></div>' : "") +
      (r.indirim ? '<div class="stat warn"><b class="num">' + money(r.indirim) + '</b><span>adisyon indirimi</span></div>' : "") +
      (r.iptal ? '<div class="stat bad"><b class="num">' + money(r.iptal) + '</b><span>iptal edilen</span></div>' : "") +
      "</div>";

    if (!r.adisyon) {
      return h + '<div class="empty"><b>Kapanmış adisyon yok</b><span>' +
        (reportDay === 0 ? "Hesap kapattıkça burası dolar" : "Başka bir güne bak") + "</span></div></div>";
    }

    if (r.waiters.length > 1) {
      h += '<div class="panel"><h3>Garsonlar</h3><div class="blist">';
      var mw = r.waiters[0].tutar || 1;
      r.waiters.forEach(function (w) {
        h += '<div class="brow"><span class="n">' + esc(w.name) +
          ' <span class="sm">' + w.adisyon + " adisyon</span></span>" +
          '<span class="v num">' + money(w.tutar) + "</span>" +
          '<span class="track"><i style="width:' + Math.round(w.tutar / mw * 100) + '%"></i></span></div>';
      });
      h += "</div></div>";
    }

    var hours = [], max = 0, i;
    for (i = 8; i <= 23; i++) { var v = r.byHour[i] || 0; hours.push({ h: i, v: v }); if (v > max) max = v; }
    for (i = 0; i <= 2; i++) { var v2 = r.byHour[i] || 0; hours.push({ h: i, v: v2 }); if (v2 > max) max = v2; }
    h += '<div class="panel"><h3>Saatlik ciro</h3><div class="hours">';
    hours.forEach(function (x) {
      h += '<div class="h"><i style="height:' + Math.max(max ? Math.round(x.v / max * 100) : 0, x.v ? 8 : 0) + '%"></i>' +
        "<span>" + x.h + "</span></div>";
    });
    h += "</div></div>";

    h += '<div class="panel"><h3>En çok satanlar</h3><div class="blist">';
    var top = r.items.slice(0, 8), mx = top.length ? top[0].tutar : 1;
    top.forEach(function (it) {
      h += '<div class="brow"><span class="n">' + esc(it.name) + ' <span class="sm">×' + it.qty + "</span></span>" +
        '<span class="v num">' + money(it.tutar) + "</span>" +
        '<span class="track"><i style="width:' + Math.round(it.tutar / mx * 100) + '%"></i></span></div>';
    });
    h += "</div></div>";

    h += '<div class="panel"><h3>Ödeme</h3><div class="blist">';
    Object.keys(r.byPay).forEach(function (k) {
      h += '<div class="brow"><span class="n">' + esc(k) + '</span><span class="v num">' + money(r.byPay[k]) + "</span></div>";
    });
    h += "</div></div>";

    h += '<div class="panel"><h3>Kapanan adisyonlar</h3><div class="blist">';
    r.list.slice(0, 14).forEach(function (o) {
      var t = Store.table(o.tableId);
      var tt = o.totals || Store.totals(o);
      h += '<div class="brow"><span class="n">Masa ' + esc(t ? t.name : o.tableId) +
        ' <span class="sm">' + clock(o.closedAt) + " · " + o.guests + " kişi · " + esc(o.waiter || "") + "</span></span>" +
        '<span class="v num">' + money(tt.total) + "</span></div>";
    });
    return h + "</div></div><div style='height:8px'></div></div>";
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
    var bag = {};
    if (o) o.items.forEach(function (li) {
      if (li.status === "draft") bag[li.mid] = (bag[li.mid] || 0) + li.qty;
    });

    var h = '<div class="picker"><div class="phead"><div class="prow">' +
      '<div class="search">' + ic(I.search, 20) +
      '<input id="pq" type="search" placeholder="Ürün ara" autocomplete="off" value="' + esc(picker.q || "") + '"></div>' +
      '<button class="btn plain" id="pClose">Bitti</button></div>' +
      '<div class="cats"><button type="button" data-cat="" aria-pressed="' + (!picker.cat) + '">★ Sık</button>';
    (window.MENU || []).forEach(function (c) {
      h += '<button type="button" data-cat="' + c.id + '" aria-pressed="' + (picker.cat === c.id) + '">' + esc(c.n.tr) + "</button>";
    });
    h += '</div></div><div class="pbody">';

    if (showFav) {
      h += '<div class="favs">';
      Store.favourites(10).forEach(function (m) {
        var out = Store.isSoldOut(m.mid);
        h += '<button class="fav' + (out ? " out" : "") + '" type="button" data-mid="' + m.mid + '">' +
          '<span class="fn">' + esc(m.name) + "</span>" +
          '<span class="fp num">' + (out ? "BİTTİ" : money(m.price)) + "</span>" +
          (bag[m.mid] ? '<span class="fq num">' + bag[m.mid] + "</span>" : "") + "</button>";
      });
      h += "</div><p class='sect'>Tüm menü</p>";
    }

    if (!list.length) h += '<div class="empty"><b>Sonuç yok</b><span>Başka bir kelime dene</span></div>';
    list.forEach(function (m) {
      var out = Store.isSoldOut(m.mid);
      h += '<div class="mrow' + (bag[m.mid] ? " has" : "") + (out ? " out" : "") + '">' +
        '<button class="mmain" type="button" data-mid="' + m.mid + '">' +
        '<span class="nm">' + esc(m.name) + "</span>" +
        '<span class="sub">' + esc(m.catName) + "</span></button>" +
        '<span class="mpr num">' + (out ? "BİTTİ" : (m.price == null ? "fiyat sor" : money(m.price))) + "</span>" +
        (bag[m.mid]
          ? '<span class="stepper sm"><button type="button" data-mq="' + m.mid + '|-1" aria-label="Azalt">−</button>' +
            '<b class="num">' + bag[m.mid] + "</b>" +
            '<button type="button" data-mq="' + m.mid + '|1" aria-label="Artır">+</button></span>'
          : '<button class="addbtn" type="button" data-mid="' + m.mid + '" aria-label="Ekle">' + ic(I.plus, 22) + "</button>") +
        "</div>";
    });
    h += "</div>";

    var n = o ? count(o, "draft") : 0;
    var tl = o ? o.items.filter(function (l) { return l.status === "draft"; })
      .reduce(function (s, l) { return s + l.price * l.qty; }, 0) : 0;
    h += '<div class="bar"><div class="bar-in">' +
      '<div class="tot"><span>' + (n ? n + " ürün seçildi" : "Ürün seç") + '</span><b class="num">' + money(tl) + "</b></div>" +
      '<button class="btn go big" id="pSend"' + (n ? "" : " disabled") + ">Mutfağa gönder</button>" +
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

    var pend = pendingCount(), rdy = Store.readyTables().length;
    $("#tabs").innerHTML = [
      ["tables", "Masalar", I.tables, rdy],
      ["kitchen", "Mutfak", I.kitchen, pend],
      ["report", "Gün sonu", I.report, 0]
    ].map(function (t) {
      var sel = (view === t[0] || (view === "order" && t[0] === "tables"));
      return '<button type="button" data-tab="' + t[0] + '" aria-selected="' + sel + '">' +
        ic(t[2], 24) + "<span>" + t[1] + "</span>" +
        (t[3] ? '<span class="bdg num">' + t[3] + "</span>" : "") + "</button>";
    }).join("");

    document.body.classList.toggle("hasbar", !!$(".bar"));
    keepAwake(view === "order" || view === "kitchen" || !!picker);
    if (picker && picker.focus) { var el = $("#pq"); if (el) { el.focus(); picker.focus = false; } }
  }

  /* ================= AKIŞLAR ================= */
  function whoFlow() {
    var s = Store.settings();
    sheet("<h3>Kim servis ediyor?</h3><p class='lead'>Açtığın masalar bu isme yazılır</p>" +
      '<div class="chips big" id="wChips">' + s.waiters.map(function (w) {
        return '<button type="button" data-w="' + esc(w) + '" aria-pressed="' + (w === s.waiter) + '">' + esc(w) + "</button>";
      }).join("") + "</div>" +
      '<div class="acts"><button class="btn plain" id="wAdd" type="button">+ Garson ekle</button></div>',
      function (c) {
        c.querySelector("#wChips").onclick = function (e) {
          var b = e.target.closest("[data-w]"); if (!b) return;
          Store.saveSettings({ waiter: b.dataset.w }).then(function () { closeSheet(); render(); });
        };
        c.querySelector("#wAdd").onclick = function () {
          var n = prompt("Garson adı");
          if (!n || !n.trim()) return;
          var ws = s.waiters.slice(); ws.push(n.trim());
          Store.saveSettings({ waiters: ws, waiter: n.trim() }).then(function () { closeSheet(); render(); });
        };
      });
  }

  function openTableFlow(tableId) {
    var ex = Store.orderByTable(tableId);
    if (ex) { currentOrder = ex.id; view = "order"; render(); return; }
    var t = Store.table(tableId), g = t.seats;
    sheet("<h3>Masa " + esc(t.name) + "</h3><p class='lead'>" + esc(t.zone) + " · kaç kişi geldi?</p>" +
      '<div class="chips big" id="gChips">' + [1, 2, 3, 4, 5, 6, 8, 10].map(function (n) {
        return '<button type="button" data-g="' + n + '" aria-pressed="' + (n === g) + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<div class="acts"><button class="btn go big" id="gOk" type="button">Masayı aç</button></div>',
      function (c) {
        c.querySelector("#gChips").onclick = function (e) {
          var b = e.target.closest("[data-g]"); if (!b) return;
          g = +b.dataset.g;
          Array.prototype.forEach.call(c.querySelectorAll("[data-g]"), function (x) {
            x.setAttribute("aria-pressed", +x.dataset.g === g);
          });
        };
        c.querySelector("#gOk").onclick = function () {
          Store.openTable(tableId, g).then(function (o) {
            closeSheet(); currentOrder = o.id; view = "order";
            picker = { q: "", cat: "", focus: false };
            render();
          });
        };
      });
  }

  function addItem(m) {
    if (Store.isSoldOut(m.mid)) return toast(m.name + " bugün yok");
    if (m.price == null) {
      sheet("<h3>" + esc(m.name) + "</h3><p class='lead'>Günün fiyatı — tutarı gir</p>" +
        '<label class="field"><input id="mp" type="number" inputmode="numeric" min="0" step="10" value="0"></label>' +
        '<div class="acts"><button class="btn go big" id="mok" type="button">Ekle</button></div>',
        function (c) {
          c.querySelector("#mok").onclick = function () {
            Store.addItem(currentOrder, m, 1, "", +c.querySelector("#mp").value || 0)
              .then(function () { closeSheet(); toast(m.name + " eklendi"); render(); });
          };
        });
      return;
    }
    Store.addItem(currentOrder, m, 1, "").then(function () { toast(m.name + " eklendi"); render(); });
  }

  function itemOptions(m) {
    var qty = 1;
    var out = Store.isSoldOut(m.mid);
    sheet("<h3>" + esc(m.name) + "</h3><p class='lead'>" + esc(m.catName) +
      (m.price != null ? " · " + money(m.price) : "") + "</p>" +
      '<p class="cap">Adet</p><div class="chips big" id="qChips">' + [1, 2, 3, 4, 5, 6].map(function (n) {
        return '<button type="button" data-q="' + n + '" aria-pressed="' + (n === 1) + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<p class="cap">Mutfak notu</p><div class="chips" id="nChips">' +
      ["acısız", "acılı", "soğansız", "az pişmiş", "iyi pişmiş", "servis sonra"].map(function (n) {
        return '<button type="button" data-n="' + n + '">' + n + "</button>";
      }).join("") + "</div>" +
      '<label class="field"><input id="nn" type="text" placeholder="veya serbest yaz"></label>' +
      '<div class="acts"><button class="btn go big" id="nok" type="button">Ekle</button>' +
      '<button class="btn plain" id="so" type="button">' +
      (out ? "Tekrar var olarak işaretle" : "Bu ürün bugün bitti") + "</button></div>",
      function (c) {
        c.querySelector("#qChips").onclick = function (e) {
          var b = e.target.closest("[data-q]"); if (!b) return;
          qty = +b.dataset.q;
          Array.prototype.forEach.call(c.querySelectorAll("[data-q]"), function (x) {
            x.setAttribute("aria-pressed", +x.dataset.q === qty);
          });
        };
        c.querySelector("#nChips").onclick = function (e) {
          var b = e.target.closest("[data-n]"); if (!b) return;
          var i = c.querySelector("#nn");
          i.value = i.value ? i.value + ", " + b.dataset.n : b.dataset.n;
        };
        c.querySelector("#nok").onclick = function () {
          Store.addItem(currentOrder, m, qty, c.querySelector("#nn").value.trim()).then(function () {
            closeSheet(); toast(qty + "× " + m.name); render();
          });
        };
        c.querySelector("#so").onclick = function () {
          Store.toggleSoldOut(m.mid).then(function () {
            closeSheet(); toast(out ? m.name + " tekrar var" : m.name + " bitti"); render();
          });
        };
      });
  }

  /* satıra dokununca bütün işlemler tek yerde */
  function lineFlow(lid) {
    var o = Store.order(currentOrder);
    var li = o.items.filter(function (x) { return x.lid === lid; })[0];
    if (!li) return;
    var d = Store.lineDisc(li);

    var acts = "";
    if (li.status === "ready") {
      acts += '<button class="btn hot big" id="aServe" type="button">' + ic(I.check, 20) + " Servis ettim</button>";
    }
    if (li.status === "draft") {
      acts += '<div class="qrow"><span>Adet</span><div class="stepper big">' +
        '<button type="button" id="qm">−</button><b class="num">' + li.qty + "</b>" +
        '<button type="button" id="qp">+</button></div></div>';
    }
    acts += '<button class="btn plain" id="aPromo" type="button">' +
      (li.promo ? "İkramı / indirimi değiştir" : "İkram et veya indirim uygula") + "</button>";
    if (li.status === "draft") {
      acts += '<button class="btn danger" id="aDel" type="button">Satırı sil</button>';
    } else if (li.status !== "void") {
      acts += '<button class="btn danger" id="aVoid" type="button">İptal et</button>';
    }

    sheet("<h3>" + esc(li.name) + "</h3><p class='lead'>" + li.qty + " adet · " + money(li.price) +
      (d ? " · " + promoLabel(li) : "") + "</p>" +
      (li.note ? '<p class="notebar sm">' + esc(li.note) + "</p>" : "") +
      '<div class="acts">' + acts + "</div>",
      function (c) {
        var s = c.querySelector("#aServe");
        if (s) s.onclick = function () {
          Store.markServed(o.id, lid).then(function () { closeSheet(); toast("Servis edildi"); render(); });
        };
        var qm = c.querySelector("#qm");
        if (qm) {
          qm.onclick = function () { Store.setQty(o.id, lid, li.qty - 1).then(function () { closeSheet(); render(); }); };
          c.querySelector("#qp").onclick = function () { Store.setQty(o.id, lid, li.qty + 1).then(function () { closeSheet(); render(); }); };
        }
        c.querySelector("#aPromo").onclick = function () { closeSheet(); promoFlow(lid); };
        var del = c.querySelector("#aDel");
        if (del) del.onclick = function () { Store.removeItem(o.id, lid).then(function () { closeSheet(); render(); }); };
        var vd = c.querySelector("#aVoid");
        if (vd) vd.onclick = function () { closeSheet(); voidFlow(lid); };
      });
  }

  function promoFlow(lid) {
    var o = Store.order(currentOrder);
    var li = o.items.filter(function (x) { return x.lid === lid; })[0];
    if (!li) return;
    var gq = (li.promo && li.promo.type === "treat") ? li.promo.qty : li.qty;

    sheet("<h3>İkram / indirim</h3><p class='lead'>" + esc(li.name) + " · " + li.qty + " adet · " +
      money(Store.lineGross(li)) + "</p>" +
      '<p class="cap">Ücretsiz ver</p>' +
      '<div class="giftrow"><div class="stepper big"><button type="button" id="gm">−</button>' +
      '<b class="num" id="gv">' + gq + '</b><button type="button" id="gp">+</button></div>' +
      '<button class="btn go" id="gDo" type="button">İkram et</button></div>' +
      '<p class="cap">Veya indirim</p><div class="chips big" id="pc">' +
      [10, 20, 50].map(function (v) { return '<button type="button" data-pc="' + v + '">%' + v + "</button>"; }).join("") +
      "</div>" +
      '<div class="amtrow"><input id="pAmt" type="number" inputmode="numeric" min="0" step="10" placeholder="Tutar ₺">' +
      '<button class="btn plain" id="pAmtOk" type="button">Uygula</button></div>' +
      (li.promo ? '<div class="acts"><button class="btn danger" id="pClr" type="button">İkramı kaldır</button></div>' : ""),
      function (c) {
        var v = c.querySelector("#gv");
        c.querySelector("#gm").onclick = function () { gq = Math.max(1, gq - 1); v.textContent = gq; };
        c.querySelector("#gp").onclick = function () { gq = Math.min(li.qty, gq + 1); v.textContent = gq; };
        c.querySelector("#gDo").onclick = function () {
          Store.setPromo(o.id, lid, { type: "treat", qty: gq }).then(function () {
            closeSheet(); toast(gq + " adet ikram"); render();
          });
        };
        c.querySelector("#pc").onclick = function (e) {
          var b = e.target.closest("[data-pc]"); if (!b) return;
          Store.setPromo(o.id, lid, { type: "percent", value: +b.dataset.pc }).then(function () {
            closeSheet(); toast("%" + b.dataset.pc + " indirim"); render();
          });
        };
        c.querySelector("#pAmtOk").onclick = function () {
          var a = +c.querySelector("#pAmt").value || 0;
          if (a <= 0) return toast("Tutar gir");
          Store.setPromo(o.id, lid, { type: "amount", value: a }).then(function () {
            closeSheet(); toast(money(a) + " indirim"); render();
          });
        };
        var clr = c.querySelector("#pClr");
        if (clr) clr.onclick = function () {
          Store.setPromo(o.id, lid, null).then(function () { closeSheet(); toast("Kaldırıldı"); render(); });
        };
      });
  }

  function voidFlow(lid) {
    var o = Store.order(currentOrder);
    var li = o.items.filter(function (x) { return x.lid === lid; })[0];
    if (!li) return;
    sheet("<h3>" + esc(li.name) + " iptal</h3><p class='lead'>Sebebi kayda geçer, gün sonunda görünür</p>" +
      '<div class="acts" id="rActs">' +
      ["Yanlış girildi", "Müşteri vazgeçti", "Mutfak yapamadı"].map(function (r) {
        return '<button class="btn plain" type="button" data-r="' + esc(r) + '">' + esc(r) + "</button>";
      }).join("") + "</div>",
      function (c) {
        c.querySelector("#rActs").onclick = function (e) {
          var b = e.target.closest("[data-r]"); if (!b) return;
          Store.voidItem(o.id, lid, b.dataset.r).then(function () {
            closeSheet(); toast("İptal edildi"); render();
          });
        };
      });
  }

  function moreFlow() {
    var o = Store.order(currentOrder);
    var t = Store.table(o.tableId);
    sheet("<h3>Masa " + esc(t.name) + "</h3><p class='lead'>Adisyon " + (o.no || "") + "</p>" +
      '<div class="acts">' +
      '<button class="btn plain" id="aBill" type="button">Adisyon fişi</button>' +
      '<button class="btn plain" id="aNote" type="button">Servis notu' + (o.note ? " ✓" : "") + "</button>" +
      '<button class="btn plain" id="aMove" type="button">Masayı taşı</button>' +
      '<button class="btn plain" id="aMerge" type="button">Başka masayla birleştir</button>' +
      '<button class="btn danger" id="aCancel" type="button">Adisyonu iptal et</button></div>',
      function (c) {
        c.querySelector("#aBill").onclick = function () { closeSheet(); billFlow(); };
        c.querySelector("#aNote").onclick = function () { closeSheet(); noteFlow(); };
        c.querySelector("#aMove").onclick = function () { closeSheet(); moveFlow(); };
        c.querySelector("#aMerge").onclick = function () { closeSheet(); mergeFlow(); };
        c.querySelector("#aCancel").onclick = function () {
          if (live(o).length && !confirm("Adisyonda ürün var. Masa tamamen iptal edilsin mi?")) return;
          Store.cancelOrder(o.id).then(function () {
            closeSheet(); currentOrder = null; view = "tables"; toast("İptal edildi"); render();
          });
        };
      });
  }

  function moveFlow() {
    var o = Store.order(currentOrder);
    var free = Store.tables().filter(function (t) { return t.id !== o.tableId && !Store.orderByTable(t.id); });
    sheet("<h3>Masayı taşı</h3><p class='lead'>Hangi masaya?</p>" +
      '<div class="tpick" id="tp">' + free.map(function (t) {
        return '<button type="button" data-t="' + t.id + '"><b>' + esc(t.name) + "</b><span>" + esc(t.zone) + "</span></button>";
      }).join("") + "</div>",
      function (c) {
        c.querySelector("#tp").onclick = function (e) {
          var b = e.target.closest("[data-t]"); if (!b) return;
          Store.moveOrder(o.id, b.dataset.t).then(function () { closeSheet(); toast("Taşındı"); render(); })
            .catch(function (m) { toast(m); });
        };
      });
  }

  function mergeFlow() {
    var o = Store.order(currentOrder);
    var others = Store.openOrders().filter(function (x) { return x.id !== o.id; });
    if (!others.length) return toast("Başka açık masa yok");
    sheet("<h3>Birleştir</h3><p class='lead'>Bu adisyon seçtiğin masaya aktarılır</p>" +
      '<div class="tpick" id="mp">' + others.map(function (x) {
        var t = Store.table(x.tableId);
        return '<button type="button" data-o="' + x.id + '"><b>' + esc(t ? t.name : x.tableId) +
          "</b><span>" + money(Store.totals(x).total) + "</span></button>";
      }).join("") + "</div>",
      function (c) {
        c.querySelector("#mp").onclick = function (e) {
          var b = e.target.closest("[data-o]"); if (!b) return;
          Store.mergeOrders(o.id, b.dataset.o).then(function (into) {
            closeSheet(); currentOrder = into.id; toast("Birleştirildi"); render();
          });
        };
      });
  }

  function noteFlow() {
    var o = Store.order(currentOrder);
    sheet("<h3>Servis notu</h3><p class='lead'>Mutfak fişinde de görünür</p>" +
      '<label class="field"><input id="on" type="text" value="' + esc(o.note || "") +
      '" placeholder="doğum günü, alerji, acele..."></label>' +
      '<div class="acts"><button class="btn go big" id="ok" type="button">Kaydet</button></div>',
      function (c) {
        c.querySelector("#ok").onclick = function () {
          Store.setNote(o.id, c.querySelector("#on").value.trim()).then(function () { closeSheet(); render(); });
        };
      });
  }

  function billHTML(o) {
    var t = Store.totals(o), tb = Store.table(o.tableId);
    var kdv = Store.settings().kdv || 0;
    var matrah = kdv ? Math.round(t.total / (1 + kdv / 100)) : t.total;
    var rows = live(o).map(function (li) {
      var d = Store.lineDisc(li);
      return '<tr><td class="q num">' + li.qty + "</td><td>" + esc(li.name) +
        (li.note ? "<em>" + esc(li.note) + "</em>" : "") +
        (d ? "<em>" + promoLabel(li) + " −" + money(d) + "</em>" : "") + "</td>" +
        '<td class="num">' + money(Store.lineTotal(li)) + "</td></tr>";
    }).join("");
    return '<div class="bill" id="bill"><div class="bh"><b>OSMAN GOURMET BEYDAĞI</b>' +
      "<span>Binbirdirek, Klodfarer Cd. No:27/B · Fatih</span><span>(0212) 638 34 44</span></div>" +
      '<div class="bmeta"><span>Adisyon ' + (o.no || "-") + "</span><span>Masa " + esc(tb ? tb.name : o.tableId) + "</span>" +
      "<span>" + o.guests + " kişi</span><span>" + clock(o.openedAt) + "–" + clock(Date.now()) + "</span>" +
      "<span>" + esc(o.waiter) + "</span></div><table>" + rows + "</table>" +
      '<div class="btot">' +
      (t.promo ? "<div><span>Ürünler</span><b class=\"num\">" + money(t.gross) + "</b></div>" +
                 "<div><span>İkram / indirim</span><b class=\"num\">−" + money(t.promo) + "</b></div>" : "") +
      (t.discount ? "<div><span>Adisyon indirimi</span><b class=\"num\">−" + money(t.discount) + "</b></div>" : "") +
      '<div class="big"><span>TOPLAM</span><b class="num">' + money(t.total) + "</b></div>" +
      (kdv ? '<div class="fine"><span>Matrah</span><b class="num">' + money(matrah) + "</b></div>" +
             '<div class="fine"><span>KDV %' + kdv + " (fiyata dahil)</span><b class=\"num\">" + money(t.total - matrah) + "</b></div>" : "") +
      (o.guests > 1 ? '<div class="per"><span>Kişi başı</span><b class="num">' + money(Math.round(t.total / o.guests)) + "</b></div>" : "") +
      "</div><p class='bfoot'>Afiyet olsun</p></div>";
  }

  function billFlow() {
    sheet(billHTML(Store.order(currentOrder)) +
      '<div class="acts noprint"><button class="btn go big" id="bp" type="button">' + ic(I.print, 20) + " Yazdır</button></div>",
      function (c) { c.querySelector("#bp").onclick = function () { window.print(); }; });
  }

  function payFlow() {
    var o = Store.order(currentOrder);
    if (!o) return;
    var disc = o.discount ? JSON.parse(JSON.stringify(o.discount)) : null;

    function body() {
      var tmp = JSON.parse(JSON.stringify(o)); tmp.discount = disc;
      var t = Store.totals(tmp);
      return "<h3>Hesap</h3><p class='lead'>Masa " + esc((Store.table(o.tableId) || {}).name || "") +
        " · " + o.guests + " kişi</p>" +
        '<div class="paybig"><span>Ödenecek</span><b class="num">' + money(t.total) + "</b>" +
        (o.guests > 1 ? '<span class="pp num">kişi başı ' + money(Math.round(t.total / o.guests)) + "</span>" : "") +
        "</div>" +
        (t.promo || t.discount
          ? '<div class="paysum">' +
            '<div><span>Ürünler</span><b class="num">' + money(t.gross) + "</b></div>" +
            (t.promo ? '<div class="neg"><span>Ürün ikramı</span><b class="num">−' + money(t.promo) + "</b></div>" : "") +
            (t.discount ? '<div class="neg"><span>Adisyon indirimi</span><b class="num">−' + money(t.discount) + "</b></div>" : "") +
            "</div>" : "") +
        '<p class="cap">Tüm adisyona indirim</p><div class="chips big" id="dc">' +
        '<button type="button" data-d="none" aria-pressed="' + (!disc) + '">Yok</button>' +
        '<button type="button" data-d="p10" aria-pressed="' + (!!disc && disc.type === "percent" && disc.value === 10) + '">%10</button>' +
        '<button type="button" data-d="p20" aria-pressed="' + (!!disc && disc.type === "percent" && disc.value === 20) + '">%20</button>' +
        '<button type="button" data-d="treat" aria-pressed="' + (!!disc && disc.type === "treat") + '">Tamamen ikram</button></div>' +
        '<p class="cap">Nasıl ödedi?</p><div class="acts" id="pc">' +
        '<button class="btn go big" type="button" data-p="kart">Kart ile kapat</button>' +
        '<button class="btn go big" type="button" data-p="nakit">Nakit ile kapat</button>' +
        '<button class="btn plain" type="button" data-p="karma">Karma ödeme</button>' +
        '<button class="btn plain" id="pBill" type="button">Önce fişi göster</button></div>';
    }

    function mount(c) {
      c.querySelector("#dc").onclick = function (e) {
        var b = e.target.closest("[data-d]"); if (!b) return;
        var v = b.dataset.d;
        disc = v === "none" ? null : (v === "treat" ? { type: "treat", value: 0 } : { type: "percent", value: +v.slice(1) });
        sheet(body(), mount);
      };
      c.querySelector("#pBill").onclick = function () {
        Store.setDiscount(o.id, disc).then(function () { closeSheet(); billFlow(); });
      };
      c.querySelector("#pc").onclick = function (e) {
        var b = e.target.closest("[data-p]"); if (!b) return;
        var tb = Store.table(o.tableId);
        Store.setDiscount(o.id, disc)
          .then(function () { return Store.closeOrder(o.id, b.dataset.p); })
          .then(function () {
            undoInfo = { id: o.id, tableName: tb ? tb.name : o.tableId, at: Date.now() };
            closeSheet(); toast("Masa kapatıldı"); currentOrder = null; view = "tables"; render();
          });
      };
    }
    sheet(body(), mount);
  }

  function shareReport() {
    var from = Store.dayOffset(reportDay);
    var r = Store.report(from, from + 86400000);
    var d = new Date(from);
    var txt = reportText(r, d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" }),
      reportDay === 0 ? Store.openOrders().length : 0);
    if (navigator.share) return navigator.share({ title: "Gün sonu", text: txt }).catch(function () {});
    if (navigator.clipboard) return navigator.clipboard.writeText(txt).then(function () { toast("Panoya kopyalandı"); });
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
  }

  function settingsFlow() {
    var s = Store.settings();
    sheet("<h3>Ayarlar</h3><p class='lead'>Veriler bu cihazda tutuluyor</p>" +
      '<div class="acts">' +
      '<button class="btn plain" id="sOut" type="button">Tükenen ürünler (' + s.soldOut.length + ")</button>" +
      '<button class="btn plain" id="sBackup" type="button">Yedek al</button>' +
      '<button class="btn plain" id="sRestore" type="button">Yedekten geri yükle</button>' +
      '<button class="btn plain" id="sDemo" type="button">Örnek gün oluştur</button>' +
      '<button class="btn danger" id="sWipe" type="button">Tüm verileri sil</button></div>' +
      '<input id="fileIn" type="file" accept="application/json" hidden>',
      function (c) {
        c.querySelector("#sOut").onclick = function () { closeSheet(); soldOutFlow(); };
        c.querySelector("#sBackup").onclick = function () {
          var data = JSON.stringify(Store.exportAll(), null, 2);
          var a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
          a.download = "osman-yedek-" + new Date().toISOString().slice(0, 10) + ".json";
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
          toast("Yedek indirildi");
        };
        var f = c.querySelector("#fileIn");
        c.querySelector("#sRestore").onclick = function () { f.click(); };
        f.onchange = function () {
          var file = f.files[0]; if (!file) return;
          var rd = new FileReader();
          rd.onload = function () {
            try {
              Store.importAll(JSON.parse(rd.result)).then(function () {
                closeSheet(); toast("Yedek yüklendi"); view = "tables"; render();
              });
            } catch (e) { toast("Dosya okunamadı"); }
          };
          rd.readAsText(file);
        };
        c.querySelector("#sDemo").onclick = function () {
          Store.seedDemo().then(function () { closeSheet(); toast("Örnek gün hazır"); view = "report"; reportDay = 0; render(); });
        };
        c.querySelector("#sWipe").onclick = function () {
          if (!confirm("Bütün adisyonlar silinecek. Emin misin?")) return;
          Store.wipe().then(function () { closeSheet(); undoInfo = null; currentOrder = null; view = "tables"; render(); });
        };
      });
  }

  function soldOutFlow() {
    var s = Store.settings();
    var names = s.soldOut.map(function (mid) {
      return MENU.filter(function (x) { return x.mid === mid; })[0];
    }).filter(Boolean);
    sheet("<h3>Tükenen ürünler</h3><p class='lead'>Menüde BİTTİ görünür, sipariş girilemez</p>" +
      (names.length
        ? '<div class="acts" id="soList">' + names.map(function (m) {
            return '<button class="btn plain" type="button" data-so="' + m.mid + '">' + esc(m.name) + " · kaldır</button>";
          }).join("") + "</div>" +
          '<div class="acts"><button class="btn plain" id="soAll" type="button">Hepsini tekrar var yap</button></div>'
        : '<div class="empty"><b>Liste boş</b><span>Menüde bir ürüne uzun bas, “bugün bitti” de</span></div>'),
      function (c) {
        var l = c.querySelector("#soList");
        if (l) l.onclick = function (e) {
          var b = e.target.closest("[data-so]"); if (!b) return;
          Store.toggleSoldOut(b.dataset.so).then(function () { closeSheet(); render(); });
        };
        var a = c.querySelector("#soAll");
        if (a) a.onclick = function () { Store.clearSoldOut().then(function () { closeSheet(); render(); }); };
      });
  }

  /* ================= OLAYLAR ================= */
  function wire() {
    app.addEventListener("click", function (e) {
      var el;
      if ((el = e.target.closest("[data-goto]"))) {
        currentOrder = el.dataset.goto; view = "order"; return render();
      }
      if ((el = e.target.closest("[data-table]"))) return openTableFlow(el.dataset.table);
      if ((el = e.target.closest("[data-zone]"))) { zone = el.dataset.zone; return render(); }
      if (e.target.closest("#instX")) {
        hideInstall = true;
        try { localStorage.setItem("osman-hide-install", "1"); } catch (x) {}
        return render();
      }
      if (e.target.closest("#instStrip")) {
        if (installEvt) {
          installEvt.prompt();
          installEvt.userChoice.then(function () { installEvt = null; render(); });
        }
        return;
      }
      if (e.target.closest("#btnWho")) return whoFlow();
      if (e.target.closest("#btnSettings")) return settingsFlow();
      if (e.target.closest("#btnUndo")) {
        return Store.reopenOrder(undoInfo.id).then(function (o) {
          undoInfo = null; currentOrder = o.id; view = "order"; toast("Geri alındı"); render();
        }).catch(function (m) { toast(m); undoInfo = null; render(); });
      }
      if (e.target.closest("#btnBack") || e.target.closest("#btnBack2")) {
        view = "tables"; currentOrder = null; return render();
      }
      if (e.target.closest("#btnMore")) return moreFlow();
      if (e.target.closest("#btnAdd")) { picker = { q: "", cat: "", focus: false }; return render(); }
      if (e.target.closest("#btnSend") || e.target.closest("#pSend")) {
        return Store.sendToKitchen(currentOrder).then(function (n) {
          picker = null; toast(n + " kalem mutfağa gitti"); render();
        });
      }
      if (e.target.closest("#btnServe")) {
        return Store.markServed(currentOrder).then(function () { toast("Servis edildi"); render(); });
      }
      if (e.target.closest("#btnPay")) return payFlow();
      if ((el = e.target.closest("[data-guests]"))) {
        var o = Store.order(currentOrder);
        return Store.setGuests(currentOrder, Math.max(1, (o.guests || 1) + (+el.dataset.guests))).then(render);
      }
      if ((el = e.target.closest("[data-allready]"))) {
        return Store.markTableReady(el.dataset.allready).then(function () { toast("Hazır"); render(); });
      }
      if (e.target.closest("#dayPrev")) { reportDay--; return render(); }
      if (e.target.closest("#dayNext")) { if (reportDay < 0) reportDay++; return render(); }
      if (e.target.closest("#btnShare")) return shareReport();

      if (e.target.closest("#pClose")) { picker = null; return render(); }
      if ((el = e.target.closest("[data-cat]"))) { picker.cat = el.dataset.cat; picker.q = ""; return render(); }
      if ((el = e.target.closest("[data-mq]"))) {
        var mp = el.dataset.mq.split("|");
        var ord = Store.order(currentOrder);
        var line = ord.items.filter(function (x) { return x.status === "draft" && x.mid === mp[0]; }).pop();
        if (!line) return;
        return Store.setQty(currentOrder, line.lid, line.qty + (+mp[1])).then(render);
      }
      if ((el = e.target.closest("[data-mid]"))) {
        var m = MENU.filter(function (x) { return x.mid === el.dataset.mid; })[0];
        if (m) return addItem(m);
      }
      if ((el = e.target.closest("[data-lid]"))) return lineFlow(el.dataset.lid);
    });

    var pt = null, pm = null;
    app.addEventListener("pointerdown", function (e) {
      var el = e.target.closest("[data-mid]"); if (!el) return;
      pm = el.dataset.mid;
      pt = setTimeout(function () {
        var m = MENU.filter(function (x) { return x.mid === pm; })[0];
        pt = null;
        if (m) { if (navigator.vibrate) navigator.vibrate(12); itemOptions(m); }
      }, 450);
    });
    ["pointerup", "pointercancel", "pointermove"].forEach(function (ev) {
      app.addEventListener(ev, function () { clearTimeout(pt); pt = null; }, true);
    });
    app.addEventListener("scroll", function () { clearTimeout(pt); pt = null; }, true);

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
      if (!$("#modal").hidden) return closeSheet();
      if (picker) { picker = null; return render(); }
    });
  }

  /* ================= AÇILIŞ ================= */
  function boot() {
    app = $("#app");
    try { hideInstall = localStorage.getItem("osman-hide-install") === "1"; } catch (e) {}

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); installEvt = e; if (app.innerHTML) render();
    });
    window.addEventListener("appinstalled", function () { installEvt = null; hideInstall = true; render(); });
    window.addEventListener("online", function () { toast("Bağlantı geri geldi"); render(); });
    window.addEventListener("offline", function () { toast("Çevrimdışısın — kayıtlar cihazda"); render(); });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { keepAwake(view === "order" || view === "kitchen" || !!picker); render(); }
    });

    Store.init().then(function () {
      MENU = Store.menu();
      wire();
      Store.onChange(function () { render(); });
      render();
      setInterval(function () {
        if (view !== "report" && !picker && $("#modal").hidden) render();
      }, 30000);
    }).catch(function (err) {
      app.innerHTML = '<div class="wrap"><div class="empty"><b>Açılamadı</b><span>' +
        esc(err && err.message || err) + "</span></div></div>";
      console.error(err);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
