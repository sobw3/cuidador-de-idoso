// frontend/sw.js - Service Worker Básico

const CACHE_NAME = 'cuidado-para-idosos-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://img.icons8.com/plasticine/192/pill.png',
  'https://img.icons8.com/plasticine/512/pill.png'
];

// Evento de instalação: abre o cache e adiciona os ficheiros
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de fetch: responde com os ficheiros do cache se estiverem disponíveis
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o ficheiro estiver no cache, retorna-o
        if (response) {
          return response;
        }
        // Senão, busca na rede
        return fetch(event.request);
      })
  );
});

