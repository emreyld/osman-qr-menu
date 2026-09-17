/* Hesap mantığı testleri — sunucuya gitmeden, saf hesaplama tarafını sınar.
   Çalıştır: node test/smoke.js                                             */

const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "..") + "/";

/* --- tarayıcı taklidi (db.js'in ihtiyaç duyduğu kadarı) --- */
global.window = global;
global.navigator = { onLine: true };
global.document = { hidden: false, addEventListener() {} };
global.window.addEventListener = () => {};
global.setInterval = () => 0;
global.clearInterval = () => {};
const _ls = {};
global.localStorage = {
  getItem: k => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: k => { delete _ls[k]; }
};

let uid = 0;
global.Cloud = {
  uuid: () => "id-" + (++uid),
  online: () => false,           // testte sunucuya çıkma
  session: () => null,
  restore: () => null,
  select: () => Promise.resolve([]),
  upsert: () => Promise.resolve([]),
  update: () => Promise.resolve([]),
  remove: () => Promise.resolve([])
};
global.Auth = {
  current: () => ({ id: "u1", name: "Ahmet", role: "admin", active: true }),
  users: () => [{ id: "u1", name: "Ahmet" }],
  can: () => true
};

/* IndexedDB taklidi */
const stores = {};
function req(fn) {
  const r = {};
  setTimeout(() => {
    try { r.result = fn(); r.onsuccess && r.onsuccess(); }
    catch (e) { r.error = e; r.onerror && r.onerror(); }
  }, 0);
  return r;
}
function api(s) {
  return {
    put(v) { return req(() => { s.set(v.k, JSON.parse(JSON.stringify(v))); return v; }); },
    get(k) { return req(() => (s.has(k) ? JSON.parse(JSON.stringify(s.get(k))) : undefined)); },
    getAll() { return req(() => [...s.values()]); },
    clear() { return req(() => s.clear()); },
    delete(k) { return req(() => s.delete(k)); }
  };
}
global.indexedDB = {
  open() {
    const r = {};
    setTimeout(() => {
      const d = {
        objectStoreNames: { contains: n => !!stores[n] },
        createObjectStore(n) { stores[n] = new Map(); return { createIndex() {} }; },
        transaction() { return { objectStore: nm => api(stores[nm] || (stores[nm] = new Map())) }; }
      };
      r.onupgradeneeded && r.onupgradeneeded({ target: { result: d } });
      r.result = d; r.onsuccess && r.onsuccess();
    }, 0);
    return r;
  }
};

eval(fs.readFileSync(base + "app/db.js", "utf8"));

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "  OK  " : "  HATA") + "  " + m); };

/* --- deneme menüsü ve masalar (sunucudan gelmiş gibi) --- */
const MENU = {
  cay:    { mid: "m1", cat: "hot",   catName: "Sıcak İçecekler", name: "Çay", price: 75 },
  adana:  { mid: "m2", cat: "kebab", catName: "Kebap", name: "Acılı Adana Kebap", price: 850 },
  ayran:  { mid: "m3", cat: "soft",  catName: "Soğuk İçecekler", name: "Ayran", price: 190 },
  baklava:{ mid: "m4", cat: "dess",  catName: "Tatlılar", name: "Baklava", price: 450 }
};

let O;
Store.init()
  .then(() => {
    /* masayı elle kur — sunucu yok */
    Store.saveTables([{ id: "t1", name: "3", zone: "Salon", seats: 4 }]);
    ok(Store.tables().length === 1, "masa tanımlandı");
    return Store.openTable("t1", 4, "Ahmet");
  })
  .then(o => {
    O = o;
    ok(o.status === "open" && o.no === 1, "masa açıldı, adisyon no " + o.no);
    ok(Store.orderByTable("t1").id === o.id, "masa → adisyon eşleşmesi");
    return Store.addItem(o.id, MENU.adana, 2, "acısız");
  })
  .then(o => {
    ok(o.items.length === 1 && o.items[0].qty === 2, "2 adet eklendi");
    ok(Store.totals(o).gross === 1700, "ara toplam 1700 (" + Store.totals(o).gross + ")");
    return Store.addItem(o.id, MENU.adana, 1, "acısız");
  })
  .then(o => {
    ok(o.items.length === 1 && o.items[0].qty === 3, "aynı ürün + aynı not birleşti");
    return Store.addItem(o.id, MENU.cay, 3, "");
  })
  .then(o => {
    ok(Store.totals(o).gross === 2775, "ara toplam 2775 (" + Store.totals(o).gross + ")");
    return Store.sendToKitchen(o.id);
  })
  .then(n => {
    ok(n === 2, "mutfağa 2 kalem gitti");
    const o = Store.order(O.id);
    ok(o.items.every(l => l.status === "sent"), "kalemler mutfakta");
    return Store.addItem(o.id, MENU.baklava, 1, "");
  })
  .then(o => {
    ok(o.items.filter(l => l.status === "draft").length === 1, "sonradan eklenen taslak kaldı");
    return Store.sendToKitchen(o.id);
  })
  .then(n => { ok(n === 1, "yalnızca yeni kalem gönderildi"); return Store.markTableReady(O.id); })
  .then(o => {
    ok(o.items.every(l => l.status === "ready"), "hepsi hazır");
    ok(Store.readyCount(o) === 7, "hazır adet 7 (" + Store.readyCount(o) + ")");
    ok(Store.readyTables().length === 1, "hazır masa listesi");
    return Store.markServed(o.id);
  })
  .then(o => {
    ok(o.items.every(l => l.status === "served"), "servis edildi");
    ok(Store.readyTables().length === 0, "hazır uyarısı düştü");
    const cay = o.items.find(l => l.mid === "m1");
    return Store.setPromo(o.id, cay.lid, { type: "treat", qty: 1 });
  })
  .then(o => {
    const t = Store.totals(o);
    ok(t.promo === 75 && t.total === 3150, "1 çay ikram → 3150 (" + t.total + ")");
    const cay = o.items.find(l => l.mid === "m1");
    return Store.setPromo(o.id, cay.lid, { type: "percent", value: 20 });
  })
  .then(o => {
    ok(Store.totals(o).promo === 45, "%20 satır indirimi 45 (" + Store.totals(o).promo + ")");
    const bak = o.items.find(l => l.mid === "m4");
    return Store.setPromo(o.id, bak.lid, { type: "amount", value: 100 });
  })
  .then(o => {
    const t = Store.totals(o);
    ok(t.gross === 3225 && t.promo === 145 && t.total === 3080, "tutar indirimi → 3080 (" + t.total + ")");
    return Store.setDiscount(o.id, { type: "percent", value: 10 });
  })
  .then(o => {
    const t = Store.totals(o);
    ok(t.sub === 3080 && t.discount === 308 && t.total === 2772, "üstüne %10 → 2772 (" + t.total + ")");
    return Store.setDiscount(o.id, null);
  })
  .then(o => {
    const bak = o.items.find(l => l.mid === "m4");
    return Store.voidItem(o.id, bak.lid, "Müşteri vazgeçti");
  })
  .then(o => {
    const t = Store.totals(o);
    ok(t.gross === 2775 && t.total === 2730, "iptal edilen kalem düştü (" + t.total + ")");
    return Store.closeOrder(o.id, "kart");
  })
  .then(o => {
    ok(o.status === "closed" && o.totals.total === 2730, "hesap kapandı 2730");
    ok(Store.openOrders().length === 0, "açık adisyon kalmadı");
    const r = Store.report(Store.dayStart(), Date.now() + 1);
    ok(r.adisyon === 1 && r.ciro === 2730, "rapor ciro " + r.ciro);
    ok(r.ikram === 45, "rapor ikram 45 (" + r.ikram + ")");
    ok(r.iptal === 450, "rapor iptal 450 (" + r.iptal + ")");
    ok(r.kisiOrt === 683, "kişi başı 683 (" + r.kisiOrt + ")");
    ok(r.waiters.length === 1 && r.waiters[0].name === "Ahmet", "garson kırılımı");
    ok(r.items.length === 2, "iptal edilen ürün raporda yok");
    return Store.openTable("t1", 2, "Ahmet");
  })
  .then(o => {
    ok(o.no === 2, "ikinci adisyon no 2 (" + o.no + ")");
    ok(Store.pending() > 0, "kuyrukta bekleyen kayıt var (çevrimdışı)");
    console.log("\n  " + pass + " geçti, " + fail + " kaldı");
    process.exit(fail ? 1 : 0);
  })
  .catch(e => { console.log("  PATLADI:", e); process.exit(1); });
