// sw.js — Service Worker لنظام الحضور
// شبكة أولاً (Network First) للصفحة الرئيسية عشان البيانات تفضل محدّثة
// كاش للملفات الثابتة (الأيقونات والمانيفست) لتشغيل أسرع ودعم التثبيت

const CACHE_NAME = 'attendance-cache-v2'; // غيّر الرقم هنا (v3, v4...) مع كل تحديث مهم تنزله، عشان يفرض على الأجهزة تحديث فوري
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));
    }).then(function(){
      return self.clients.claim();
    }).then(function(){
      // إجبار كل الصفحات المفتوحة على إعادة التحميل فور تفعيل النسخة الجديدة
      return self.clients.matchAll({type:'window'}).then(function(clients){
        clients.forEach(function(client){ client.navigate(client.url); });
      });
    })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;

  // الصفحة نفسها: شبكة أولاً، fallback للكاش لو مفيش انترنت
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request, {cache:'no-store'}).then(function(res){
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){cache.put(e.request, resClone);});
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(c){return c || caches.match('./index.html');});
      })
    );
    return;
  }

  // باقي الملفات: كاش أولاً، ثم الشبكة
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(res){
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){cache.put(e.request, resClone);});
        return res;
      }).catch(function(){return cached;});
    })
  );
});
