/* Veri katmanı — şimdilik tarayıcıda (IndexedDB), sonra sunucuya taşınacak.
   Uygulamanın geri kalanı sadece Store üzerinden konuşur; kalıcılık değişince
   burası değişir, ekranlar değişmez. */
(function () {
  "use strict";

  var DB_NAME = "osman-pos";
  var DB_VER = 1;
  var db = null;
  var orders = [];                 // bellekteki tüm adisyonlar
  var settings = null;
  var listeners = [];
  var chan = ("BroadcastChannel" in window) ? new BroadcastChannel("osman-pos") : null;

  /* ---------- varsayılan masa düzeni ---------- */
  function defaultTables() {
    var t = [];
    for (var i = 1; i <= 12; i++) t.push({ id: "S" + i, name: String(i), zone: "Salon", seats: 4 });
    for (var j = 1; j <= 8; j++) t.push({ id: "B" + j, name: "B" + j, zone: "Bahçe", seats: 4 });
    for (var k = 1; k <= 6; k++) t.push({ id: "U" + k, name: "Ü" + k, zone: "Üst Kat", seats: 6 });
    return t;
  }

  var DEFAULTS = {
    tables: null,                  // açılışta doldurulur
    waiters: ["Ahmet", "Mehmet", "Ayşe"],
    waiter: "Ahmet",
    users: [],                     // hesaplar (bkz. auth.js)
    menuOverrides: {},             // { mid: {price, name, hidden} }
    customItems: [],               // işletmenin eklediği ürünler
    venue: "Osman Gourmet Beydağı",
    soldOut: [],                   // bugün tükenen ürünler (mid listesi)
    seq: { day: 0, n: 0 },         // günlük adisyon numarası
    kdv: 10
  };

  /* ---------- IndexedDB ---------- */
  function open() {
    return new Promise(function (res, rej) {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains("orders")) {
          var s = d.createObjectStore("orders", { keyPath: "id" });
          s.createIndex("status", "status");
          s.createIndex("openedAt", "openedAt");
        }
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "k" });
      };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }

  function tx(store, mode) { return db.transaction(store, mode).objectStore(store); }

  function put(store, val) {
    return new Promise(function (res, rej) {
      var r = tx(store, "readwrite").put(val);
      r.onsuccess = function () { res(val); };
      r.onerror = function () { rej(r.error); };
    });
  }

  function all(store) {
    return new Promise(function (res, rej) {
      var r = tx(store, "readonly").getAll();
      r.onsuccess = function () { res(r.result || []); };
      r.onerror = function () { rej(r.error); };
    });
  }

  function get(store, key) {
    return new Promise(function (res, rej) {
      var r = tx(store, "readonly").get(key);
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }

  /* ---------- yardımcılar ---------- */
  function uid(p) {
    return (p || "o") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function emit(reason) {
    listeners.forEach(function (fn) { try { fn(reason); } catch (e) { console.error(e); } });
  }

  function broadcast(reason) {
    emit(reason);
    if (chan) chan.postMessage({ reason: reason, at: Date.now() });
  }

  if (chan) {
    chan.onmessage = function () {
      /* başka sekme yazdı — belleği tazele */
      all("orders").then(function (rows) { orders = rows; emit("remote"); });
    };
  }

  function dayStart(ts) {
    var d = new Date(ts || Date.now());
    /* iş günü 06:00'da başlar — gece 02:00 kapanışı aynı güne yazılsın */
    if (d.getHours() < 6) d.setDate(d.getDate() - 1);
    d.setHours(6, 0, 0, 0);
    return d.getTime();
  }

  /* ---------- menü düzleştirme ---------- */
  function flatMenu(includeHidden) {
    var ov = (settings && settings.menuOverrides) || {};
    var out = [];
    (window.MENU || []).forEach(function (cat) {
      cat.items.forEach(function (it, i) {
        var mid = cat.id + "-" + i;
        var o = ov[mid] || {};
        if (o.hidden && !includeHidden) return;
        out.push({
          mid: mid, cat: cat.id, catName: cat.n.tr,
          name: o.name || it.i.tr,
          nameEn: it.i.en,
          desc: it.d ? it.d.tr : "",
          price: (o.price !== undefined && o.price !== null) ? o.price : it.p,
          basePrice: it.p,
          kcal: it.k,
          tags: it.t || [],
          hidden: !!o.hidden,
          edited: o.price !== undefined || !!o.name
        });
      });
    });
    ((settings && settings.customItems) || []).forEach(function (ci) {
      if (ci.hidden && !includeHidden) return;
      out.push({
        mid: ci.mid, cat: ci.cat, catName: ci.catName, name: ci.name,
        nameEn: "", desc: "", price: ci.price, basePrice: ci.price,
        kcal: ci.kcal || 0, tags: [], hidden: !!ci.hidden, custom: true
      });
    });
    return out;
  }

  /* ---------- hesaplama ----------
     Bir satırın üç değeri var:
       gross  = liste fiyatı × adet
       disc   = satıra uygulanan ikram / indirim
       net    = ödenecek tutar (iptal edilmişse 0)                         */
  function lineGross(li) { return (li.price || 0) * li.qty; }

  function lineDisc(li) {
    if (li.status === "void") return 0;
    var p = li.promo; if (!p) return 0;
    var g = lineGross(li);
    if (p.type === "treat") return Math.min(g, (li.price || 0) * (p.qty || li.qty));
    if (p.type === "percent") return Math.round(g * p.value / 100);
    if (p.type === "amount") return Math.min(p.value, g);
    return 0;
  }

  function lineTotal(li) {
    return li.status === "void" ? 0 : Math.max(0, lineGross(li) - lineDisc(li));
  }

  function totals(order) {
    var items = order.items || [];
    var gross = items.reduce(function (s, li) { return s + (li.status === "void" ? 0 : lineGross(li)); }, 0);
    var promo = items.reduce(function (s, li) { return s + lineDisc(li); }, 0);
    var sub = Math.max(0, gross - promo);          /* adisyon indirimi öncesi */
    var disc = 0;
    if (order.discount) {
      if (order.discount.type === "percent") disc = Math.round(sub * order.discount.value / 100);
      else if (order.discount.type === "amount") disc = Math.min(order.discount.value, sub);
      else if (order.discount.type === "treat") disc = sub;
    }
    return { gross: gross, promo: promo, sub: sub, discount: disc, total: Math.max(0, sub - disc) };
  }

  /* ---------- genel API ---------- */
  var Store = {

    init: function () {
      return open().then(function (d) {
        db = d;
        return Promise.all([all("orders"), get("meta", "settings")]);
      }).then(function (r) {
        orders = r[0] || [];
        settings = (r[1] && r[1].v) || null;
        if (!settings) {
          settings = JSON.parse(JSON.stringify(DEFAULTS));
          settings.tables = defaultTables();
          return put("meta", { k: "settings", v: settings });
        }
        if (!settings.tables || !settings.tables.length) settings.tables = defaultTables();
        if (!settings.waiters) settings.waiters = ["Ahmet", "Mehmet", "Ayşe"];
        if (!settings.users) settings.users = [];
        if (!settings.menuOverrides) settings.menuOverrides = {};
        if (!settings.customItems) settings.customItems = [];
        if (!settings.venue) settings.venue = "Osman Gourmet Beydağı";
        if (!settings.soldOut) settings.soldOut = [];
        if (!settings.seq) settings.seq = { day: 0, n: 0 };
      }).then(function () { return Store; });
    },

    onChange: function (fn) { listeners.push(fn); },

    settings: function () { return settings; },
    saveSettings: function (patch) {
      Object.assign(settings, patch);
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("settings"); });
    },

    tables: function () { return settings.tables; },
    zones: function () {
      var z = [];
      settings.tables.forEach(function (t) { if (z.indexOf(t.zone) < 0) z.push(t.zone); });
      return z;
    },
    table: function (id) {
      return settings.tables.filter(function (t) { return t.id === id; })[0];
    },

    menu: flatMenu,
    totals: totals,
    lineTotal: lineTotal,
    lineGross: lineGross,
    lineDisc: lineDisc,
    dayStart: dayStart,

    openOrders: function () {
      return orders.filter(function (o) { return o.status === "open"; });
    },

    orderByTable: function (tableId) {
      return orders.filter(function (o) { return o.status === "open" && o.tableId === tableId; })[0];
    },

    order: function (id) {
      return orders.filter(function (o) { return o.id === id; })[0];
    },

    nextNo: function () {
      var d = dayStart();
      if (settings.seq.day !== d) settings.seq = { day: d, n: 0 };
      settings.seq.n += 1;
      put("meta", { k: "settings", v: settings });
      return settings.seq.n;
    },

    openTable: function (tableId, guests, waiter) {
      var existing = Store.orderByTable(tableId);
      if (existing) return Promise.resolve(existing);
      var o = {
        id: uid("o"),
        no: Store.nextNo(),
        tableId: tableId,
        status: "open",
        openedAt: Date.now(),
        closedAt: null,
        waiter: waiter || settings.waiter,
        guests: guests || 2,
        items: [],
        discount: null,
        payment: null
      };
      orders.push(o);
      return put("orders", o).then(function () { broadcast("open"); return o; });
    },

    /* taslak satır ekle (henüz mutfağa gitmedi) */
    addItem: function (orderId, menuItem, qty, note, priceOverride) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var price = (priceOverride != null) ? priceOverride : menuItem.price;
      var same = o.items.filter(function (li) {
        return li.status === "draft" && li.mid === menuItem.mid && (li.note || "") === (note || "");
      })[0];
      if (same) same.qty += (qty || 1);
      else o.items.push({
        lid: uid("l"), mid: menuItem.mid, name: menuItem.name, catName: menuItem.catName,
        price: price, qty: qty || 1, note: note || "", status: "draft", sentAt: null
      });
      return put("orders", o).then(function () { broadcast("item"); return o; });
    },

    setQty: function (orderId, lid, qty) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var li = o.items.filter(function (x) { return x.lid === lid; })[0];
      if (!li) return Promise.resolve(o);
      if (qty <= 0) o.items = o.items.filter(function (x) { return x.lid !== lid; });
      else li.qty = qty;
      return put("orders", o).then(function () { broadcast("item"); return o; });
    },

    removeItem: function (orderId, lid) { return Store.setQty(orderId, lid, 0); },

    sendToKitchen: function (orderId) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var now = Date.now(), n = 0;
      o.items.forEach(function (li) {
        if (li.status === "draft") { li.status = "sent"; li.sentAt = now; n++; }
      });
      return put("orders", o).then(function () { broadcast("kitchen"); return n; });
    },

    setItemStatus: function (orderId, lid, status) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var li = o.items.filter(function (x) { return x.lid === lid; })[0];
      if (li) { li.status = status; if (status === "ready") li.readyAt = Date.now(); }
      return put("orders", o).then(function () { broadcast("kitchen"); return o; });
    },

    markServed: function (orderId, lid) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.items.forEach(function (li) {
        if (li.status === "ready" && (!lid || li.lid === lid)) { li.status = "served"; li.servedAt = Date.now(); }
      });
      return put("orders", o).then(function () { broadcast("served"); return o; });
    },

    readyCount: function (o) {
      return (o.items || []).filter(function (li) { return li.status === "ready"; })
        .reduce(function (s2, li) { return s2 + li.qty; }, 0);
    },

    readyTables: function () {
      return Store.openOrders().filter(function (o) { return Store.readyCount(o) > 0; });
    },

    /* ---------- masa yönetimi ---------- */
    saveTables: function (list) {
      settings.tables = list;
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("tables"); });
    },
    addTable: function (name, zone, seats) {
      var id = "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      settings.tables.push({ id: id, name: String(name), zone: zone, seats: +seats || 4 });
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("tables"); });
    },
    updateTable: function (id, patch) {
      var t = Store.table(id); if (!t) return Promise.resolve();
      if (patch.name !== undefined) t.name = String(patch.name);
      if (patch.zone !== undefined) t.zone = patch.zone;
      if (patch.seats !== undefined) t.seats = +patch.seats || 4;
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("tables"); });
    },
    removeTable: function (id) {
      if (Store.orderByTable(id)) return Promise.reject("masa açık, önce hesabı kapat");
      settings.tables = settings.tables.filter(function (t) { return t.id !== id; });
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("tables"); });
    },

    /* ---------- menü yönetimi ---------- */
    categories: function () {
      return (window.MENU || []).map(function (c) { return { id: c.id, name: c.n.tr }; });
    },
    menuAll: function () { return flatMenu(true); },
    setItemPrice: function (mid, price) {
      var ci = (settings.customItems || []).filter(function (x) { return x.mid === mid; })[0];
      if (ci) { ci.price = price; }
      else {
        settings.menuOverrides[mid] = settings.menuOverrides[mid] || {};
        settings.menuOverrides[mid].price = price;
      }
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("menu"); });
    },
    setItemHidden: function (mid, hidden) {
      var ci = (settings.customItems || []).filter(function (x) { return x.mid === mid; })[0];
      if (ci) { ci.hidden = !!hidden; }
      else {
        settings.menuOverrides[mid] = settings.menuOverrides[mid] || {};
        settings.menuOverrides[mid].hidden = !!hidden;
      }
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("menu"); });
    },
    resetItem: function (mid) {
      delete settings.menuOverrides[mid];
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("menu"); });
    },
    addItemToMenu: function (catId, name, price) {
      var cat = (window.MENU || []).filter(function (c) { return c.id === catId; })[0];
      settings.customItems.push({
        mid: "x_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        cat: catId, catName: cat ? cat.n.tr : catId,
        name: String(name).trim(), price: +price || 0, hidden: false
      });
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("menu"); });
    },
    removeCustomItem: function (mid) {
      settings.customItems = settings.customItems.filter(function (x) { return x.mid !== mid; });
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("menu"); });
    },

    /* ---------- tükenen ürün ---------- */
    isSoldOut: function (mid) { return settings.soldOut.indexOf(mid) >= 0; },
    toggleSoldOut: function (mid) {
      var i = settings.soldOut.indexOf(mid);
      if (i >= 0) settings.soldOut.splice(i, 1); else settings.soldOut.push(mid);
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("soldout"); });
    },
    clearSoldOut: function () {
      settings.soldOut = [];
      return put("meta", { k: "settings", v: settings }).then(function () { broadcast("soldout"); });
    },

    /* ---------- yedek ---------- */
    exportAll: function () {
      return { v: 1, at: Date.now(), settings: settings, orders: orders };
    },
    importAll: function (data) {
      if (!data || !data.orders) return Promise.reject("dosya tanınmadı");
      orders = data.orders;
      if (data.settings) settings = data.settings;
      var writes = orders.map(function (o) { return put("orders", o); });
      writes.push(put("meta", { k: "settings", v: settings }));
      return Promise.all(writes).then(function () { broadcast("import"); });
    },

    markTableReady: function (orderId) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.items.forEach(function (li) { if (li.status === "sent") { li.status = "ready"; li.readyAt = Date.now(); } });
      return put("orders", o).then(function () { broadcast("kitchen"); return o; });
    },

    setDiscount: function (orderId, discount) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.discount = discount;
      return put("orders", o).then(function () { broadcast("order"); return o; });
    },

    setGuests: function (orderId, guests) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.guests = guests;
      return put("orders", o).then(function () { broadcast("order"); return o; });
    },

    closeOrder: function (orderId, payment) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var t = totals(o);
      o.status = "closed";
      o.closedAt = Date.now();
      o.payment = payment;
      o.totals = t;
      return put("orders", o).then(function () { broadcast("close"); return o; });
    },

    cancelOrder: function (orderId) {
      var o = Store.order(orderId); if (!o) return Promise.resolve();
      orders = orders.filter(function (x) { return x.id !== orderId; });
      return new Promise(function (res, rej) {
        var r = tx("orders", "readwrite").delete(orderId);
        r.onsuccess = function () { broadcast("cancel"); res(); };
        r.onerror = function () { rej(r.error); };
      });
    },


    /* ---------- satır bazlı ikram / indirim ---------- */
    setPromo: function (orderId, lid, promo) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var li = o.items.filter(function (x) { return x.lid === lid; })[0];
      if (!li) return Promise.resolve(o);
      if (!promo) delete li.promo;
      else {
        if (promo.type === "treat") promo.qty = Math.min(promo.qty || li.qty, li.qty);
        li.promo = promo;
      }
      return put("orders", o).then(function () { broadcast("promo"); return o; });
    },

    /* ---------- kalem iptali (mutfağa gitmiş ürün) ---------- */
    voidItem: function (orderId, lid, reason) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var li = o.items.filter(function (x) { return x.lid === lid; })[0];
      if (li) { li.status = "void"; li.voidReason = reason || ""; li.voidAt = Date.now(); }
      return put("orders", o).then(function () { broadcast("void"); return o; });
    },

    /* ---------- masa taşıma ve birleştirme ---------- */
    moveOrder: function (orderId, toTableId) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      if (Store.orderByTable(toTableId)) return Promise.reject("hedef masa dolu");
      o.tableId = toTableId;
      return put("orders", o).then(function () { broadcast("move"); return o; });
    },

    mergeOrders: function (fromId, intoId) {
      var a = Store.order(fromId), b = Store.order(intoId);
      if (!a || !b) return Promise.reject("adisyon yok");
      b.items = b.items.concat(a.items);
      b.guests = (b.guests || 0) + (a.guests || 0);
      orders = orders.filter(function (x) { return x.id !== fromId; });
      return put("orders", b).then(function () {
        return new Promise(function (res, rej) {
          var r = tx("orders", "readwrite").delete(fromId);
          r.onsuccess = function () { broadcast("merge"); res(b); };
          r.onerror = function () { rej(r.error); };
        });
      });
    },

    /* ---------- yanlışlıkla kapatılanı geri al ---------- */
    reopenOrder: function (orderId) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      if (Store.orderByTable(o.tableId)) return Promise.reject("masa yeniden açılmış");
      o.status = "open"; o.closedAt = null; o.payment = null; delete o.totals;
      return put("orders", o).then(function () { broadcast("reopen"); return o; });
    },

    lastClosed: function () {
      var c = orders.filter(function (o) { return o.status === "closed"; })
        .sort(function (a, b) { return b.closedAt - a.closedAt; });
      return c[0];
    },

    /* ---------- servis notu ---------- */
    setNote: function (orderId, note) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.note = note;
      return put("orders", o).then(function () { broadcast("order"); return o; });
    },

    /* ---------- sık kullanılanlar: geçmişte en çok satanlar ---------- */
    favourites: function (limit) {
      limit = limit || 12;
      var since = Date.now() - 30 * 86400000;
      var count = {};
      orders.forEach(function (o) {
        if (o.status !== "closed" || o.closedAt < since) return;
        (o.items || []).forEach(function (li) {
          if (li.status === "void") return;
          count[li.mid] = (count[li.mid] || 0) + li.qty;
        });
      });
      var menu = flatMenu(), byMid = {};
      menu.forEach(function (m) { byMid[m.mid] = m; });
      var ranked = Object.keys(count)
        .sort(function (a, b) { return count[b] - count[a]; })
        .map(function (mid) { return byMid[mid]; })
        .filter(Boolean);
      /* geçmiş yoksa akıllı varsayılan: çok satan kategorilerden ilk ürünler */
      if (ranked.length < limit) {
        var seedCats = ["hot", "soft", "kebab", "salads", "pide", "desserts"];
        seedCats.forEach(function (c) {
          menu.filter(function (m) { return m.cat === c && m.price != null; })
            .slice(0, 3).forEach(function (m) {
              if (ranked.length < limit && ranked.indexOf(m) < 0 &&
                  !ranked.some(function (x) { return x.mid === m.mid; })) ranked.push(m);
            });
        });
      }
      return ranked.slice(0, limit);
    },

    /* ---------- gün gezinme ---------- */
    dayOffset: function (n) {
      return dayStart(Date.now() + (n || 0) * 86400000);
    },
    dayEnd: function (from) { return from + 86400000; },
    hasDay: function (from) {
      return orders.some(function (o) {
        return o.status === "closed" && o.closedAt >= from && o.closedAt < from + 86400000;
      });
    },

    /* ---------- rapor ---------- */
    closedBetween: function (from, to) {
      return orders.filter(function (o) {
        return o.status === "closed" && o.closedAt >= from && o.closedAt < to;
      });
    },

    report: function (from, to) {
      var list = Store.closedBetween(from, to);
      var ciro = 0, indirim = 0, ikram = 0, iptal = 0, kisi = 0;
      var byHour = {}, byItem = {}, byCat = {}, byPay = {}, byWaiter = {};
      list.forEach(function (o) {
        var t = o.totals || totals(o);
        ciro += t.total; indirim += t.discount; ikram += t.promo; kisi += (o.guests || 0);
        (o.items || []).forEach(function (li) { if (li.status === "void") iptal += lineGross(li); });
        var h = new Date(o.closedAt).getHours();
        byHour[h] = (byHour[h] || 0) + t.total;
        byPay[o.payment || "—"] = (byPay[o.payment || "—"] || 0) + t.total;
        var w = o.waiter || "—";
        if (!byWaiter[w]) byWaiter[w] = { name: w, adisyon: 0, tutar: 0, kisi: 0 };
        byWaiter[w].adisyon++; byWaiter[w].tutar += t.total; byWaiter[w].kisi += (o.guests || 0);
        (o.items || []).forEach(function (li) {
          if (li.status === "void") return;
          var k = li.name;
          if (!byItem[k]) byItem[k] = { name: li.name, catName: li.catName, qty: 0, tutar: 0 };
          byItem[k].qty += li.qty; byItem[k].tutar += lineTotal(li);
          if (!byCat[li.catName]) byCat[li.catName] = { name: li.catName, qty: 0, tutar: 0 };
          byCat[li.catName].qty += li.qty; byCat[li.catName].tutar += lineTotal(li);
        });
      });
      var arr = function (obj) {
        return Object.keys(obj).map(function (k) { return obj[k]; })
          .sort(function (a, b) { return b.tutar - a.tutar; });
      };
      return {
        adisyon: list.length,
        ciro: ciro,
        indirim: indirim,
        ikram: ikram,
        iptal: iptal,
        kisi: kisi,
        masaOrt: list.length ? Math.round(ciro / list.length) : 0,
        kisiOrt: kisi ? Math.round(ciro / kisi) : 0,
        byHour: byHour,
        byPay: byPay,
        waiters: Object.keys(byWaiter).map(function (k) { return byWaiter[k]; })
          .sort(function (a, b) { return b.tutar - a.tutar; }),
        items: arr(byItem),
        cats: arr(byCat),
        list: list.sort(function (a, b) { return b.closedAt - a.closedAt; })
      };
    },

    /* deneme verisi — boş ekran yerine gerçekçi bir gün */
    seedDemo: function () {
      var menu = flatMenu();
      var pick = function (catId) {
        var c = menu.filter(function (m) { return m.cat === catId && m.price; });
        return c[Math.floor(Math.random() * c.length)];
      };
      var base = dayStart();
      var writes = [];
      for (var i = 0; i < 9; i++) {
        var openedAt = base + (11 + Math.floor(Math.random() * 9)) * 3600000 + Math.floor(Math.random() * 3600000);
        var closedAt = openedAt + (35 + Math.floor(Math.random() * 60)) * 60000;
        if (closedAt > Date.now()) closedAt = Date.now() - 60000;
        var t = settings.tables[Math.floor(Math.random() * settings.tables.length)];
        var items = [];
        var cats = ["kebab", "salads", "soft", "desserts", "hot", "ottoman", "pide"];
        var n = 3 + Math.floor(Math.random() * 4);
        for (var j = 0; j < n; j++) {
          var m = pick(cats[Math.floor(Math.random() * cats.length)]);
          if (!m) continue;
          items.push({
            lid: uid("l"), mid: m.mid, name: m.name, catName: m.catName,
            price: m.price, qty: 1 + Math.floor(Math.random() * 2), note: "",
            status: "served", sentAt: openedAt + 120000
          });
        }
        var o = {
          id: uid("o"), no: i + 1, tableId: t.id, status: "closed",
          openedAt: openedAt, closedAt: closedAt,
          waiter: settings.waiters[i % settings.waiters.length],
          guests: 2 + Math.floor(Math.random() * 3), items: items,
          discount: null, payment: Math.random() < 0.65 ? "kart" : "nakit"
        };
        o.totals = totals(o);
        orders.push(o);
        writes.push(put("orders", o));
      }
      return Promise.all(writes).then(function () { broadcast("seed"); });
    },

    wipe: function () {
      orders = [];
      return new Promise(function (res, rej) {
        var r = tx("orders", "readwrite").clear();
        r.onsuccess = function () { broadcast("wipe"); res(); };
        r.onerror = function () { rej(r.error); };
      });
    }
  };

  window.Store = Store;
})();
