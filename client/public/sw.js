const CACHE_NAME = "flow40plus-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

// Stale-while-revalidate para assets estáticos same-origin (app shell, JS,
// CSS, ícones) — permite abrir o app offline depois da primeira visita.
// Chamadas de API ficam de fora de propósito: elas carregam sessão/dados
// dinâmicos via cookie, então servir uma resposta cacheada seria mostrar
// dado desatualizado ou (pior) uma 401 velha.
self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
