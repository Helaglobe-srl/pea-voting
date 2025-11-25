// minimal service worker for pwa installation
const CACHE_NAME = 'pea-voting-v2';

self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// minimal fetch handler (required for PWA)
self.addEventListener('fetch', function(event) {
  // let browser handle all requests normally
  return;
});


