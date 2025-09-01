// frontend/sw.js - Versão com limpeza de cache automática

// PASSO 1: Mudei o nome do cache. Isto sinaliza ao navegador que há uma nova versão.
const CACHE_NAME = 'cuidado-para-idosos-v3'; 
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/images/logo-192.png',
  '/images/logo-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// PASSO 2: Adicionei um evento 'activate' para limpar os caches antigos.
// Esta é a parte mais importante da correção.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: a limpar cache antigo', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto e a guardar ficheiros da nova versão...');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

