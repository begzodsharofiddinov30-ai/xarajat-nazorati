// Service worker: ilovani telefonga o'rnatish va internet yo'q paytda ham ochish uchun.
// Bu fayl to'g'ridan-to'g'ri ishlatilmaydi: build paytida vite.config.js dagi plagin VERSION va PRECACHE ni
// haqiqiy qiymatlar bilan almashtirib, dist/sw.js ni yaratadi. Shuning uchun har deploy'da sw.js o'zgaradi
// va brauzer yangi versiyani o'zi topadi.
// API javoblari (shaxsiy moliyaviy ma'lumotlar) hech qachon keshlanmaydi.

const VERSION = '__SW_VERSION__';
const PRECACHE = ['__SW_PRECACHE__'];
const SHELL = `xn-shell-${VERSION}`;
const RUNTIME = 'xn-runtime';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Eski versiyalar keshi o'chiriladi; runtime keshi (shriftlar) ham tozalanadi, kerak bo'lsa qayta yuklanadi.
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Foydalanuvchi "Yangilash" ni bosganda kutib turgan yangi versiya darhol ishga tushadi.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // Avval tarmoq: internet bo'lsa doim eng yangi versiya ochiladi, bo'lmasa keshdagi ilova.
    event.respondWith(fetch(request).catch(() => caches.match('/index.html', { cacheName: SHELL })));
    return;
  }

  // assets/ dagi fayllar nomida hash bor, ular o'zgarmaydi: avval kesh, keyin tarmoq.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && url.pathname.startsWith('/assets/')) {
            const copy = res.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
