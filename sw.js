/* FlashZap Business - rotina de serviço.
   Guarda uma cópia do app neste aparelho para ele abrir em obra com sinal ruim ou sem sinal.
   Com internet, sempre usa a versão mais nova publicada (e atualiza a cópia).
   Só mexe nos arquivos do próprio app; Firebase, WhatsApp e fontes passam direto para a rede. */
var CACHE = 'flashzap-app-v1';
var ARQUIVOS = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
var ESPERA_REDE = 4000; /* ms: com sinal muito fraco, abre a cópia guardada */

function chave(req) {
  var u = new URL(req.url);
  if (req.mode === 'navigate' || u.pathname.slice(-1) === '/') return new URL('index.html', self.registration.scope).href;
  return u.origin + u.pathname;
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ARQUIVOS.map(function (a) {
        return fetch(a, { cache: 'reload' }).then(function (r) { if (r.ok) return c.put(new URL(a, self.registration.scope).href, r); }).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin !== self.location.origin) return; /* Firebase, fontes, WhatsApp: direto na rede */
  var k = chave(req);
  e.respondWith(
    new Promise(function (resolve) {
      var respondeu = false;
      function daCopia() {
        return caches.open(CACHE).then(function (c) { return c.match(k); });
      }
      var timer = setTimeout(function () {
        daCopia().then(function (r) { if (r && !respondeu) { respondeu = true; resolve(r); } });
      }, ESPERA_REDE);
      fetch(req).then(function (r) {
        clearTimeout(timer);
        if (r && r.ok && r.type === 'basic') {
          var copia = r.clone();
          caches.open(CACHE).then(function (c) { c.put(k, copia); });
        }
        if (!respondeu) { respondeu = true; resolve(r); }
      }).catch(function () {
        clearTimeout(timer);
        daCopia().then(function (r) {
          if (respondeu) return;
          respondeu = true;
          resolve(r || new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
        });
      });
    })
  );
});
