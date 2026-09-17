// Minimal IndexedDB taklidi — db.js'in kullandigi kadari
global.window = global;
const stores = {};
function req(fn){ const r={}; setTimeout(()=>{ try{ r.result=fn(); r.onsuccess&&r.onsuccess(); }catch(e){ r.error=e; r.onerror&&r.onerror(); } },0); return r; }
function api(s){ return {
  put(v){ return req(()=>{ s.data.set(v[s.keyPath], JSON.parse(JSON.stringify(v))); return v; }); },
  getAll(){ return req(()=> [...s.data.values()].map(x=>JSON.parse(JSON.stringify(x)))); },
  get(k){ return req(()=> s.data.has(k)?JSON.parse(JSON.stringify(s.data.get(k))):undefined); },
  clear(){ return req(()=>{ s.data.clear(); }); },
  delete(k){ return req(()=>{ s.data.delete(k); }); }
};}
global.indexedDB = { open(){
  const r={};
  setTimeout(()=>{
    const db={
      objectStoreNames:{contains:n=>!!stores[n]},
      createObjectStore(n,o){ stores[n]={keyPath:o.keyPath,data:new Map()}; return {createIndex(){}} },
      transaction(n){ return {objectStore:nm=>api(stores[nm])} }
    };
    r.onupgradeneeded&&r.onupgradeneeded({target:{result:db}});
    r.result=db; r.onsuccess&&r.onsuccess();
  },0);
  return r;
}};

const fs=require('fs');
const base=require('path').join(__dirname,'..')+'/';
eval(fs.readFileSync(base+'data/menu-data.js','utf8'));
eval(fs.readFileSync(base+'app/db.js','utf8'));

let pass=0, fail=0;
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  OK  ':'  HATA')+'  '+m); };
let O;

Store.init()
 .then(()=>{
   ok(Store.tables().length===26,'26 masa tanimli');
   ok(Store.menu().length===123,'123 urun yuklendi ('+Store.menu().length+')');
   ok(Store.zones().join(',')==='Salon,Bahçe,Üst Kat','bolgeler: '+Store.zones().join(', '));
   return Store.openTable('S3',4);
 })
 .then(o=>{ O=o;
   ok(!!o.id && o.status==='open','masa S3 acildi');
   ok(Store.orderByTable('S3').id===o.id,'masa -> adisyon eslesmesi');
   const m=Store.menu().find(x=>x.name==='Acılı Adana Kebap');
   ok(!!m && m.price===850,'Acili Adana Kebap 850 TL');
   return Store.addItem(o.id,m,2,'acisiz olsun');
 })
 .then(o=>{
   ok(o.items.length===1 && o.items[0].qty===2,'2 adet eklendi');
   ok(o.items[0].note==='acisiz olsun','mutfak notu kaydedildi');
   ok(Store.totals(o).sub===1700,'ara toplam 1700 ('+Store.totals(o).sub+')');
   const m2=Store.menu().find(x=>x.name==='Ayran');
   return Store.addItem(o.id,m2,3,'');
 })
 .then(o=>{
   ok(Store.totals(o).sub===2270,'ara toplam 2270 ('+Store.totals(o).sub+')');
   const m=Store.menu().find(x=>x.name==='Acılı Adana Kebap');
   return Store.addItem(o.id,m,1,'acisiz olsun');
 })
 .then(o=>{
   ok(o.items.length===2 && o.items[0].qty===3,'ayni urun+ayni not birlesti (qty 3)');
   return Store.sendToKitchen(o.id);
 })
 .then(n=>{
   ok(n===2,'mutfaga 2 kalem gitti');
   const o=Store.order(O.id);
   ok(o.items.every(l=>l.status==='sent'),'kalemler mutfakta');
   return Store.addItem(o.id,Store.menu().find(x=>x.name==='Baklava'),1,'');
 })
 .then(o=>{
   ok(o.items.filter(l=>l.status==='draft').length===1,'sonradan eklenen kalem taslak kaldi');
   return Store.sendToKitchen(o.id);
 })
 .then(n=>{ ok(n===1,'sadece yeni kalem mutfaga gitti'); return Store.markTableReady(O.id); })
 .then(o=>{
   ok(o.items.every(l=>l.status==='ready'),'hepsi hazir');
   return Store.setDiscount(o.id,{type:'percent',value:10});
 })
 .then(o=>{
   const t=Store.totals(o);
   ok(t.sub===3570,'ara toplam 3570 ('+t.sub+')');
   ok(t.discount===357 && t.total===3213,'%10 indirim -> '+t.total);
   return Store.setDiscount(o.id,{type:'treat',value:0});
 })
 .then(o=>{ ok(Store.totals(o).total===0,'ikram -> 0'); return Store.setDiscount(o.id,null); })
 .then(o=>Store.closeOrder(o.id,'kart'))
 .then(o=>{
   ok(o.status==='closed' && o.totals.total===3570,'hesap kapandi 3570');
   ok(Store.openOrders().length===0,'acik adisyon kalmadi');
   const r=Store.report(Store.dayStart(),Date.now()+1);
   ok(r.adisyon===1 && r.ciro===3570,'rapor: 1 adisyon / '+r.ciro);
   ok(r.kisiOrt===893,'kisi basi 893 ('+r.kisiOrt+')');
   ok(r.items.length===3,'3 cesit urun raporda');
   ok(r.items[0].name==='Acılı Adana Kebap','en cok ciro: '+r.items[0].name);
   ok(r.byPay.kart===3570,'kart ile 3570');
   return Store.wipe();
 })
 .then(()=>{
   ok(Store.report(Store.dayStart(),Date.now()+1).adisyon===0,'temizlendi');
   console.log('\n  '+pass+' gecti, '+fail+' kaldi');
   process.exit(fail?1:0);
 })
 .catch(e=>{ console.log('  PATLADI:',e); process.exit(1); });
