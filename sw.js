/* Servis çalışanı — uygulamanın çevrimdışı da açılmasını sağlar.
   Restoranın interneti giderse garson sipariş almaya devam edebilmeli.
   Depo kökünde durur ki hem /app/ hem /data/ kapsama girsin. */

var VERSION = "osman-pos-v3";
var BASE = new URL("./", self.location).pathname;      // örn. /osman-qr-menu/

var SHELL = [
  BASE + "app/",
  BASE + "app/index.html",
  BASE + "app/style.css",
  BASE + "app/app.js",
  BASE + "app/db.js",
  BASE + "app/manifest.webmanifest",
  BASE + "app/icon-192.png",
  BASE + "app/icon-512.png",
  BASE + "app/apple-touch-icon.png",
  BASE + "data/menu-data.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Ağ önce, olmazsa önbellek.
   Böylece güncelleme hemen gelir ama internet yoksa uygulama yine açılır. */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match(BASE + "app/index.html");
        return new Response("", { status: 504, statusText: "cevrimdisi" });
      });
    })
  );
});
