/* FlashZap Business - rotina de serviço mínima.
   Só existe para o navegador oferecer a instalação do app.
   Não guarda nada em cache: o app sempre abre na versão mais nova publicada. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* passa direto para a rede */ });
