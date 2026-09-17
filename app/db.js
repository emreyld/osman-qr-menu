/* Veri katmanı — sunucu (Supabase) + cihazda önbellek.

   Çalışma mantığı: önce cihaz, sonra sunucu.
   Her yazma önce bellekte ve IndexedDB'de olur, sonra sunucuya gönderilir.
   İnternet yoksa gönderim kuyruğa (outbox) girer, bağlantı gelince akar.
   Böylece restoranın interneti kesilse de servis durmaz. */
(function () {
  "use strict";

  var DB_NAME = "osman-pos";
  var DB_VER = 2;
  var db = null;

  var orders = [];      // { ...order, items:[] }
  var tablesArr = [];
  var menuRows = [];
  var venue = null;
  var outbox = [];
  var listeners = [];
  var pollTimer = null;
  var flushing = false;
  var lastError = "";

  var chan = ("BroadcastChannel" in window) ? new BroadcastChannel("osman-pos") : null;

  /* ================= IndexedDB ================= */
  function open() {
    return new Promise(function (res, rej) {
      var r, done = false;
      try { r = indexedDB.open(DB_NAME, DB_VER); }
      catch (e) { return rej(new Error("Cihaz deposu açılamadı")); }

      r.onupgradeneeded = function (e) {
        var d = e.target.result;
        ["orders", "meta", "cache", "outbox"].forEach(function (n) {
          if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: "k" });
        });
      };
      r.onsuccess = function () { done = true; res(r.result); };
      r.onerror = function () { done = true; rej(r.error || new Error("Cihaz deposu hatası")); };
      r.onblocked = function () {
        rej(new Error("Uygulama başka bir sekmede açık. O sekmeyi kapatıp tekrar dene."));
      };
      /* hiçbir olay gelmezse takılı kalmasın */
      setTimeout(function () {
        if (!done) rej(new Error("Cihaz deposu yanıt vermedi"));
      }, 8000);
    });
  }
  function tx(store, mode) { return db.transaction(store, mode).objectStore(store); }
  function kvPut(store, k, v) {
    return new Promise(function (res, rej) {
      var r = tx(store, "readwrite").put({ k: k, v: v });
      r.onsuccess = function () { res(); }; r.onerror = function () { rej(r.error); };
    });
  }
  function kvGet(store, k) {
    return new Promise(function (res, rej) {
      var r = tx(store, "readonly").get(k);
      r.onsuccess = function () { res(r.result ? r.result.v : null); };
      r.onerror = function () { rej(r.error); };
    });
  }

  function persist() {
    if (!db) return Promise.resolve();
    return Promise.all([
      kvPut("cache", "orders", orders),
      kvPut("cache", "tables", tablesArr),
      kvPut("cache", "menu", menuRows),
      kvPut("cache", "venue", venue),
      kvPut("outbox", "queue", outbox)
    ]).catch(function () {});
  }

  /* ================= yardımcılar ================= */
  function emit(reason) {
    listeners.forEach(function (fn) { try { fn(reason); } catch (e) { console.error(e); } });
  }
  function changed(reason) {
    persist();
    emit(reason);
    if (chan) chan.postMessage({ reason: reason });
  }
  if (chan) chan.onmessage = function () { reloadFromCache().then(function () { emit("remote"); }); };

  function reloadFromCache() {
    if (!db) return Promise.resolve();
    return Promise.all([kvGet("cache", "orders"), kvGet("cache", "tables"),
                        kvGet("cache", "menu"), kvGet("cache", "venue")])
      .then(function (r) {
        if (r[0]) orders = r[0];
        if (r[1]) tablesArr = r[1];
        if (r[2]) menuRows = r[2];
        if (r[3]) venue = r[3];
      }).catch(function () {});
  }

  function dayStart(ts) {
    var d = new Date(ts || Date.now());
    if (d.getHours() < 6) d.setDate(d.getDate() - 1);
    d.setHours(6, 0, 0, 0);
    return d.getTime();
  }
  function iso(ms) { return ms ? new Date(ms).toISOString() : null; }
  function ms(s) { return s ? new Date(s).getTime() : null; }

  /* ================= kuyruk ================= */
  function queue(table, op, payload) {
    outbox.push({ id: Cloud.uuid(), t: table, op: op, p: payload, at: Date.now() });
    if (outbox.length > 800) outbox = outbox.slice(-800);
    flush();
  }

  function flush() {
    if (flushing || !outbox.length) return Promise.resolve();
    if (!Cloud.online() || !Cloud.session()) return Promise.resolve();
    flushing = true;

    var job = outbox[0];
    var p;
    if (job.op === "upsert") p = Cloud.upsert(job.t, [job.p]);
    else if (job.op === "delete") p = Cloud.remove(job.t, job.p);
    else if (job.op === "update") p = Cloud.update(job.t, job.p.q, job.p.body);
    else p = Promise.resolve();

    return p.then(function () {
      outbox.shift(); lastError = "";
    }).catch(function (e) {
      if (e && e.status && e.status >= 400 && e.status < 500) {
        /* sunucu reddetti (çoğunlukla yetki) — kuyruğu tıkamasın */
        outbox.shift();
        lastError = e.message || "İşlem sunucuda reddedildi";
        emit("error");
      }
      throw e;
    }).then(function () {
      flushing = false;
      persist();
      if (outbox.length) return flush();
    }, function () {
      flushing = false;
      persist();
    });
  }

  /* ================= satır dönüşümleri ================= */
  function orderRow(o) {
    return {
      id: o.id, venue_id: venue && venue.id, no: o.no, table_id: o.tableId,
      status: o.status, guests: o.guests, waiter_id: o.waiterId || null,
      waiter_name: o.waiter, note: o.note || null,
      discount: o.discount || null, payment: o.payment || null,
      totals: o.totals || null,
      opened_at: iso(o.openedAt), closed_at: iso(o.closedAt)
    };
  }
  function itemRow(o, li) {
    return {
      id: li.lid, order_id: o.id, venue_id: venue && venue.id,
      mid: li.mid, name: li.name, cat_name: li.catName || null,
      price: li.price, qty: li.qty, note: li.note || null, status: li.status,
      promo: li.promo || null, void_reason: li.voidReason || null,
      sent_at: iso(li.sentAt), ready_at: iso(li.readyAt), served_at: iso(li.servedAt)
    };
  }
  function fromRows(orow, irows) {
    return {
      id: orow.id, no: orow.no, tableId: orow.table_id, status: orow.status,
      guests: orow.guests, waiterId: orow.waiter_id, waiter: orow.waiter_name || "",
      note: orow.note || "", discount: orow.discount || null,
      payment: orow.payment || null, totals: orow.totals || null,
      openedAt: ms(orow.opened_at), closedAt: ms(orow.closed_at),
      items: (irows || []).map(function (r) {
        return {
          lid: r.id, mid: r.mid, name: r.name, catName: r.cat_name || "",
          price: +r.price, qty: r.qty, note: r.note || "", status: r.status,
          promo: r.promo || null, voidReason: r.void_reason || "",
          sentAt: ms(r.sent_at), readyAt: ms(r.ready_at), servedAt: ms(r.served_at)
        };
      }).sort(function (a, b) { return (a.sentAt || 0) - (b.sentAt || 0); })
    };
  }

  function saveOrder(o, reason) {
    queue("orders", "upsert", orderRow(o));
    changed(reason || "order");
    return Promise.resolve(o);
  }
  function saveItem(o, li, reason) {
    queue("orders", "upsert", orderRow(o));
    queue("order_items", "upsert", itemRow(o, li));
    changed(reason || "item");
    return Promise.resolve(o);
  }

  /* ================= sunucudan çek ================= */
  function pull() {
    if (!Cloud.online() || !Cloud.session()) return Promise.resolve();
    var from = new Date(dayStart() - 2 * 86400000).toISOString();
    return Promise.all([
      Cloud.select("tables", "select=*&order=sort.asc,name.asc"),
      Cloud.select("menu_items", "select=*&order=sort.asc"),
      Cloud.select("venues", "select=*&limit=1"),
      Cloud.select("orders", "select=*&or=(status.eq.open,closed_at.gte." + from + ")&order=opened_at.asc"),
      Cloud.select("order_items", "select=*&order=created_at.asc")
    ]).then(function (r) {
      tablesArr = (r[0] || []).map(function (t) {
        return { id: t.id, name: t.name, zone: t.zone, seats: t.seats, sort: t.sort };
      });
      menuRows = r[1] || [];
      venue = (r[2] || [])[0] || venue;

      var byOrder = {};
      (r[4] || []).forEach(function (it) {
        (byOrder[it.order_id] = byOrder[it.order_id] || []).push(it);
      });
      var fresh = (r[3] || []).map(function (o) { return fromRows(o, byOrder[o.id]); });

      /* kuyrukta bekleyen adisyonların yerel hali korunsun */
      var pending = {};
      outbox.forEach(function (j) {
        if (j.t === "orders" && j.p && j.p.id) pending[j.p.id] = true;
        if (j.t === "order_items" && j.p && j.p.order_id) pending[j.p.order_id] = true;
      });
      var keep = orders.filter(function (o) { return pending[o.id]; });
      orders = fresh.filter(function (o) { return !pending[o.id]; }).concat(keep);

      lastError = "";
      return persist();
    }).catch(function (e) {
      if (e && e.status === 401) lastError = "Oturum düştü, tekrar giriş yap";
      return null;
    });
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () {
      if (document.hidden || !Cloud.online() || !Cloud.session()) return;
      flush().then(pull).then(function () { emit("sync"); });
    }, 4000);
  }
  function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }

  /* ================= menü ================= */
  function flatMenu(includeHidden) {
    return menuRows.filter(function (m) { return includeHidden || !m.hidden; }).map(function (m) {
      return {
        mid: m.id, cat: m.cat_id, catName: m.cat_name, name: m.name,
        nameEn: m.name_en || "", desc: "",
        price: (m.price === null || m.price === undefined) ? null : +m.price,
        kcal: m.kcal || 0, tags: [], hidden: !!m.hidden, soldOut: !!m.sold_out
      };
    });
  }

  /* ================= hesaplama ================= */
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
    var sub = Math.max(0, gross - promo);
    var disc = 0;
    if (order.discount) {
      if (order.discount.type === "percent") disc = Math.round(sub * order.discount.value / 100);
      else if (order.discount.type === "amount") disc = Math.min(order.discount.value, sub);
      else if (order.discount.type === "treat") disc = sub;
    }
    return { gross: gross, promo: promo, sub: sub, discount: disc, total: Math.max(0, sub - disc) };
  }

  /* ================= genel API ================= */
  var Store = {

    init: function () {
      return open().then(function (d) {
        db = d;
        return Promise.all([reloadFromCache(), kvGet("outbox", "queue")]);
      }).then(function (r) {
        outbox = r[1] || [];
        /* sunucu yanıt vermezse açılışı bekletme — önbellekle başla */
        return Promise.race([
          pull(),
          new Promise(function (ok) { setTimeout(ok, 6000); })
        ]);
      }).then(function () {
        startPolling();
        window.addEventListener("online", function () { flush().then(pull).then(function () { emit("sync"); }); });
        document.addEventListener("visibilitychange", function () {
          if (!document.hidden) flush().then(pull).then(function () { emit("sync"); });
        });
        return Store;
      });
    },

    onChange: function (fn) { listeners.push(fn); },
    sync: function () { return flush().then(pull).then(function () { emit("sync"); }); },
    pending: function () { return outbox.length; },
    lastError: function () { return lastError; },
    online: function () { return Cloud.online(); },

    /* ---------- işletme ---------- */
    settings: function () {
      return {
        venue: (venue && venue.name) || "",
        kdv: (venue && venue.kdv) || 0,
        joinCode: (venue && venue.join_code) || "",
        soldOut: menuRows.filter(function (m) { return m.sold_out; }).map(function (m) { return m.id; }),
        tables: tablesArr,
        waiter: (Auth.current() || {}).name || ""
      };
    },
    saveSettings: function (patch) {
      if (!venue) return Promise.resolve();
      var body = {};
      if (patch.venue !== undefined) { body.name = patch.venue; venue.name = patch.venue; }
      if (patch.kdv !== undefined) { body.kdv = patch.kdv; venue.kdv = patch.kdv; }
      if (!Object.keys(body).length) return Promise.resolve();
      queue("venues", "update", { q: "id=eq." + venue.id, body: body });
      changed("settings");
      return Promise.resolve();
    },

    /* ---------- masalar ---------- */
    tables: function () { return tablesArr; },
    zones: function () {
      var z = [];
      tablesArr.forEach(function (t) { if (z.indexOf(t.zone) < 0) z.push(t.zone); });
      return z;
    },
    table: function (id) { return tablesArr.filter(function (t) { return t.id === id; })[0]; },

    addTable: function (name, zone, seats) {
      var t = {
        id: Cloud.uuid(), name: String(name), zone: zone, seats: +seats || 4,
        sort: (tablesArr.length ? Math.max.apply(null, tablesArr.map(function (x) { return x.sort || 0; })) : 0) + 10
      };
      tablesArr.push(t);
      queue("tables", "upsert", { id: t.id, venue_id: venue.id, name: t.name, zone: t.zone, seats: t.seats, sort: t.sort });
      changed("tables");
      return Promise.resolve();
    },
    updateTable: function (id, patch) {
      var t = Store.table(id); if (!t) return Promise.resolve();
      if (patch.name !== undefined) t.name = String(patch.name);
      if (patch.zone !== undefined) t.zone = patch.zone;
      if (patch.seats !== undefined) t.seats = +patch.seats || 4;
      queue("tables", "upsert", { id: t.id, venue_id: venue.id, name: t.name, zone: t.zone, seats: t.seats, sort: t.sort || 0 });
      changed("tables");
      return Promise.resolve();
    },
    removeTable: function (id) {
      if (Store.orderByTable(id)) return Promise.reject("Masa açık, önce hesabı kapat");
      tablesArr = tablesArr.filter(function (t) { return t.id !== id; });
      queue("tables", "delete", "id=eq." + id);
      changed("tables");
      return Promise.resolve();
    },
    saveTables: function (list) { tablesArr = list; changed("tables"); return Promise.resolve(); },

    /* ---------- menü ---------- */
    menu: function () { return flatMenu(false); },
    menuAll: function () { return flatMenu(true); },
    categories: function () {
      var seen = {}, out = [];
      menuRows.forEach(function (m) {
        if (!seen[m.cat_id]) { seen[m.cat_id] = 1; out.push({ id: m.cat_id, name: m.cat_name }); }
      });
      return out;
    },
    menuCategories: function () { return Store.categories(); },

    setItemPrice: function (mid, price) {
      var m = menuRows.filter(function (x) { return x.id === mid; })[0]; if (!m) return Promise.resolve();
      m.price = price;
      queue("menu_items", "update", { q: "id=eq." + mid, body: { price: price } });
      changed("menu"); return Promise.resolve();
    },
    setItemHidden: function (mid, hidden) {
      var m = menuRows.filter(function (x) { return x.id === mid; })[0]; if (!m) return Promise.resolve();
      m.hidden = !!hidden;
      queue("menu_items", "update", { q: "id=eq." + mid, body: { hidden: !!hidden } });
      changed("menu"); return Promise.resolve();
    },
    resetItem: function () { return Promise.resolve(); },
    addItemToMenu: function (catId, name, price) {
      var cat = Store.categories().filter(function (c) { return c.id === catId; })[0];
      var row = {
        id: Cloud.uuid(), venue_id: venue.id, cat_id: catId,
        cat_name: cat ? cat.name : catId, name: String(name).trim(),
        price: +price || 0, sort: 9999, hidden: false, sold_out: false
      };
      menuRows.push(row);
      queue("menu_items", "upsert", row);
      changed("menu"); return Promise.resolve();
    },
    removeCustomItem: function (mid) {
      menuRows = menuRows.filter(function (x) { return x.id !== mid; });
      queue("menu_items", "delete", "id=eq." + mid);
      changed("menu"); return Promise.resolve();
    },

    isSoldOut: function (mid) {
      var m = menuRows.filter(function (x) { return x.id === mid; })[0];
      return !!(m && m.sold_out);
    },
    toggleSoldOut: function (mid) {
      var m = menuRows.filter(function (x) { return x.id === mid; })[0]; if (!m) return Promise.resolve();
      m.sold_out = !m.sold_out;
      queue("menu_items", "update", { q: "id=eq." + mid, body: { sold_out: m.sold_out } });
      changed("menu"); return Promise.resolve();
    },
    clearSoldOut: function () {
      var ids = menuRows.filter(function (m) { return m.sold_out; }).map(function (m) { return m.id; });
      menuRows.forEach(function (m) { m.sold_out = false; });
      if (ids.length) queue("menu_items", "update", { q: "id=in.(" + ids.join(",") + ")", body: { sold_out: false } });
      changed("menu"); return Promise.resolve();
    },

    /* ---------- adisyon ---------- */
    menuItem: function (mid) { return flatMenu(true).filter(function (m) { return m.mid === mid; })[0]; },
    totals: totals, lineTotal: lineTotal, lineGross: lineGross, lineDisc: lineDisc,
    dayStart: dayStart,
    dayOffset: function (n) { return dayStart(Date.now() + (n || 0) * 86400000); },
    dayEnd: function (f) { return f + 86400000; },

    openOrders: function () { return orders.filter(function (o) { return o.status === "open"; }); },
    orderByTable: function (tid) {
      return orders.filter(function (o) { return o.status === "open" && o.tableId === tid; })[0];
    },
    order: function (id) { return orders.filter(function (o) { return o.id === id; })[0]; },

    nextNo: function () {
      var d = dayStart();
      var todays = orders.filter(function (o) { return o.openedAt >= d; });
      return todays.reduce(function (m, o) { return Math.max(m, o.no || 0); }, 0) + 1;
    },

    openTable: function (tableId, guests, waiterName) {
      var ex = Store.orderByTable(tableId);
      if (ex) return Promise.resolve(ex);
      var me = Auth.current() || {};
      var o = {
        id: Cloud.uuid(), no: Store.nextNo(), tableId: tableId, status: "open",
        openedAt: Date.now(), closedAt: null,
        waiterId: me.id || null, waiter: waiterName || me.name || "",
        guests: guests || 2, items: [], discount: null, payment: null, note: ""
      };
      orders.push(o);
      return saveOrder(o, "open").then(function () { return o; });
    },

    addItem: function (orderId, m, qty, note, priceOverride) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var price = (priceOverride != null) ? priceOverride : m.price;
      var same = o.items.filter(function (li) {
        return li.status === "draft" && li.mid === m.mid && (li.note || "") === (note || "");
      })[0];
      var li;
      if (same) { same.qty += (qty || 1); li = same; }
      else {
        li = {
          lid: Cloud.uuid(), mid: m.mid, name: m.name, catName: m.catName,
          price: price, qty: qty || 1, note: note || "", status: "draft", sentAt: null
        };
        o.items.push(li);
      }
      return saveItem(o, li).then(function () { return o; });
    },

    setQty: function (orderId, lid, qty) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var li = o.items.filter(function (x) { return x.lid === lid; })[0];
      if (!li) return Promise.resolve(o);
      if (qty <= 0) {
        o.items = o.items.filter(function (x) { return x.lid !== lid; });
        queue("order_items", "delete", "id=eq." + lid);
        changed("item");
        return Promise.resolve(o);
      }
      li.qty = qty;
      return saveItem(o, li).then(function () { return o; });
    },
    removeItem: function (orderId, lid) { return Store.setQty(orderId, lid, 0); },

    sendToKitchen: function (orderId) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var now = Date.now(), n = 0;
      o.items.forEach(function (li) {
        if (li.status === "draft") {
          li.status = "sent"; li.sentAt = now; n++;
          queue("order_items", "upsert", itemRow(o, li));
        }
      });
      changed("kitchen");
      return Promise.resolve(n);
    },

    setItemStatus: function (orderId, lid, status) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var li = o.items.filter(function (x) { return x.lid === lid; })[0];
      if (!li) return Promise.resolve(o);
      li.status = status;
      if (status === "ready") li.readyAt = Date.now();
      if (status === "served") li.servedAt = Date.now();
      return saveItem(o, li, "kitchen").then(function () { return o; });
    },

    markTableReady: function (orderId) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var now = Date.now();
      o.items.forEach(function (li) {
        if (li.status === "sent") {
          li.status = "ready"; li.readyAt = now;
          queue("order_items", "upsert", itemRow(o, li));
        }
      });
      changed("kitchen");
      return Promise.resolve(o);
    },

    markServed: function (orderId, lid) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var now = Date.now();
      o.items.forEach(function (li) {
        if (li.status === "ready" && (!lid || li.lid === lid)) {
          li.status = "served"; li.servedAt = now;
          queue("order_items", "upsert", itemRow(o, li));
        }
      });
      changed("served");
      return Promise.resolve(o);
    },

    readyCount: function (o) {
      return (o.items || []).filter(function (li) { return li.status === "ready"; })
        .reduce(function (s, li) { return s + li.qty; }, 0);
    },
    readyTables: function () {
      return Store.openOrders().filter(function (o) { return Store.readyCount(o) > 0; });
    },

    setPromo: function (orderId, lid, promo) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var li = o.items.filter(function (x) { return x.lid === lid; })[0];
      if (!li) return Promise.resolve(o);
      if (!promo) delete li.promo;
      else {
        if (promo.type === "treat") promo.qty = Math.min(promo.qty || li.qty, li.qty);
        li.promo = promo;
      }
      return saveItem(o, li, "promo").then(function () { return o; });
    },

    voidItem: function (orderId, lid, reason) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      var li = o.items.filter(function (x) { return x.lid === lid; })[0];
      if (!li) return Promise.resolve(o);
      li.status = "void"; li.voidReason = reason || "";
      return saveItem(o, li, "void").then(function () { return o; });
    },

    setDiscount: function (orderId, discount) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.discount = discount;
      return saveOrder(o);
    },
    setGuests: function (orderId, guests) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.guests = guests;
      return saveOrder(o);
    },
    setNote: function (orderId, note) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.note = note;
      return saveOrder(o);
    },

    closeOrder: function (orderId, payment) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      o.status = "closed"; o.closedAt = Date.now(); o.payment = payment; o.totals = totals(o);
      return saveOrder(o, "close").then(function () { return o; });
    },

    reopenOrder: function (orderId) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      if (Store.orderByTable(o.tableId)) return Promise.reject("Masa yeniden açılmış");
      o.status = "open"; o.closedAt = null; o.payment = null; o.totals = null;
      return saveOrder(o, "reopen").then(function () { return o; });
    },

    cancelOrder: function (orderId) {
      var o = Store.order(orderId); if (!o) return Promise.resolve();
      orders = orders.filter(function (x) { return x.id !== orderId; });
      queue("order_items", "delete", "order_id=eq." + orderId);
      queue("orders", "delete", "id=eq." + orderId);
      changed("cancel");
      return Promise.resolve();
    },

    lastClosed: function () {
      return orders.filter(function (o) { return o.status === "closed"; })
        .sort(function (a, b) { return b.closedAt - a.closedAt; })[0];
    },

    moveOrder: function (orderId, toTableId) {
      var o = Store.order(orderId); if (!o) return Promise.reject("adisyon yok");
      if (Store.orderByTable(toTableId)) return Promise.reject("Hedef masa dolu");
      o.tableId = toTableId;
      return saveOrder(o, "move");
    },

    mergeOrders: function (fromId, intoId) {
      var a = Store.order(fromId), b = Store.order(intoId);
      if (!a || !b) return Promise.reject("adisyon yok");
      a.items.forEach(function (li) {
        b.items.push(li);
        queue("order_items", "update", { q: "id=eq." + li.lid, body: { order_id: b.id } });
      });
      b.guests = (b.guests || 0) + (a.guests || 0);
      a.items = [];
      orders = orders.filter(function (x) { return x.id !== fromId; });
      queue("orders", "upsert", orderRow(b));
      queue("orders", "delete", "id=eq." + fromId);
      changed("merge");
      return Promise.resolve(b);
    },

    /* ---------- sık kullanılanlar ---------- */
    favourites: function (limit) {
      limit = limit || 10;
      var since = Date.now() - 30 * 86400000, count = {};
      orders.forEach(function (o) {
        if (o.status !== "closed" || o.closedAt < since) return;
        (o.items || []).forEach(function (li) {
          if (li.status === "void") return;
          count[li.mid] = (count[li.mid] || 0) + li.qty;
        });
      });
      var menu = flatMenu(false), byMid = {};
      menu.forEach(function (m) { byMid[m.mid] = m; });
      var ranked = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; })
        .map(function (mid) { return byMid[mid]; }).filter(Boolean);
      if (ranked.length < limit) {
        ["hot", "soft", "kebab", "salads", "pide", "desserts"].forEach(function (c) {
          menu.filter(function (m) { return m.cat === c && m.price != null && !m.soldOut; })
            .slice(0, 3).forEach(function (m) {
              if (ranked.length < limit && !ranked.some(function (x) { return x.mid === m.mid; })) ranked.push(m);
            });
        });
      }
      return ranked.slice(0, limit);
    },

    /* ---------- rapor ---------- */
    closedBetween: function (from, to) {
      return orders.filter(function (o) {
        return o.status === "closed" && o.closedAt >= from && o.closedAt < to;
      });
    },
    hasDay: function (from) { return Store.closedBetween(from, from + 86400000).length > 0; },

    report: function (from, to) {
      var list = Store.closedBetween(from, to);
      var ciro = 0, indirim = 0, ikram = 0, iptal = 0, kisi = 0;
      var byHour = {}, byItem = {}, byCat = {}, byPay = {}, byWaiter = {};
      list.forEach(function (o) {
        var t = o.totals || totals(o);
        ciro += t.total; indirim += t.discount || 0; ikram += t.promo || 0; kisi += (o.guests || 0);
        (o.items || []).forEach(function (li) { if (li.status === "void") iptal += lineGross(li); });
        var h = new Date(o.closedAt).getHours();
        byHour[h] = (byHour[h] || 0) + t.total;
        byPay[o.payment || "—"] = (byPay[o.payment || "—"] || 0) + t.total;
        var w = o.waiter || "—";
        if (!byWaiter[w]) byWaiter[w] = { name: w, adisyon: 0, tutar: 0, kisi: 0 };
        byWaiter[w].adisyon++; byWaiter[w].tutar += t.total; byWaiter[w].kisi += (o.guests || 0);
        (o.items || []).forEach(function (li) {
          if (li.status === "void") return;
          if (!byItem[li.name]) byItem[li.name] = { name: li.name, catName: li.catName, qty: 0, tutar: 0 };
          byItem[li.name].qty += li.qty; byItem[li.name].tutar += lineTotal(li);
          var c = li.catName || "—";
          if (!byCat[c]) byCat[c] = { name: c, qty: 0, tutar: 0 };
          byCat[c].qty += li.qty; byCat[c].tutar += lineTotal(li);
        });
      });
      var arr = function (obj) {
        return Object.keys(obj).map(function (k) { return obj[k]; })
          .sort(function (a, b) { return b.tutar - a.tutar; });
      };
      return {
        adisyon: list.length, ciro: ciro, indirim: indirim, ikram: ikram, iptal: iptal, kisi: kisi,
        masaOrt: list.length ? Math.round(ciro / list.length) : 0,
        kisiOrt: kisi ? Math.round(ciro / kisi) : 0,
        byHour: byHour, byPay: byPay,
        waiters: Object.keys(byWaiter).map(function (k) { return byWaiter[k]; })
          .sort(function (a, b) { return b.tutar - a.tutar; }),
        items: arr(byItem), cats: arr(byCat),
        list: list.slice().sort(function (a, b) { return b.closedAt - a.closedAt; })
      };
    },

    /* ---------- yedek / deneme ---------- */
    exportAll: function () {
      return { v: 2, at: Date.now(), venue: venue, tables: tablesArr, menu: menuRows, orders: orders };
    },
    importAll: function () {
      return Promise.reject("Sunucu sürümünde geri yükleme kapalı — kayıtlar zaten sunucuda");
    },

    seedDemo: function () {
      var menu = flatMenu(false).filter(function (m) { return m.price; });
      if (!menu.length || !tablesArr.length) return Promise.resolve();
      var base = dayStart(), me = Auth.current() || {};
      var names = Auth.users().map(function (u) { return u.name; });
      if (!names.length) names = [me.name || "Garson"];
      for (var i = 0; i < 8; i++) {
        var openedAt = base + (11 + Math.floor(Math.random() * 9)) * 3600000 + Math.floor(Math.random() * 3600000);
        var closedAt = Math.min(openedAt + (35 + Math.floor(Math.random() * 60)) * 60000, Date.now() - 60000);
        var t = tablesArr[Math.floor(Math.random() * tablesArr.length)];
        var o = {
          id: Cloud.uuid(), no: Store.nextNo() + i, tableId: t.id, status: "closed",
          openedAt: openedAt, closedAt: closedAt,
          waiterId: me.id || null, waiter: names[i % names.length],
          guests: 2 + Math.floor(Math.random() * 3), items: [],
          discount: null, payment: Math.random() < 0.65 ? "kart" : "nakit", note: ""
        };
        var n = 3 + Math.floor(Math.random() * 4);
        for (var j = 0; j < n; j++) {
          var m = menu[Math.floor(Math.random() * menu.length)];
          o.items.push({
            lid: Cloud.uuid(), mid: m.mid, name: m.name, catName: m.catName,
            price: m.price, qty: 1 + Math.floor(Math.random() * 2), note: "",
            status: "served", sentAt: openedAt + 120000, servedAt: openedAt + 900000
          });
        }
        o.totals = totals(o);
        orders.push(o);
        queue("orders", "upsert", orderRow(o));
        o.items.forEach(function (li) { queue("order_items", "upsert", itemRow(o, li)); });
      }
      changed("seed");
      return Promise.resolve();
    },

    wipe: function () {
      var ids = orders.map(function (o) { return o.id; });
      orders = [];
      if (ids.length) {
        queue("order_items", "delete", "order_id=in.(" + ids.join(",") + ")");
        queue("orders", "delete", "id=in.(" + ids.join(",") + ")");
      }
      changed("wipe");
      return Promise.resolve();
    }
  };

  window.Store = Store;
})();
