
const CACHE_NAME = 'para-mi-flaco-offline-v3';

const FILES = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './cc/Foto1.jpg',
  './cc/Foto2.jpg',
  './cc/Foto3.jpg',
  './cc/Foto4.jpg',
  './cc/Foto5.jpg',
  './cc/Foto6.jpg',
  './cc/Foto7.jpg',
  './cc/Foto8.jpg',
  './cc/Foto9.jpg',
  './cc/Foto10.jpg',
  './cc/Foto11.jpg',
  './cc/alien.png',
  './cc/cupon.png',
  './cc/dormir.png',
  './cc/extranes.png',
  './cc/feliz.png',
  './cc/hambre.png',
  './cc/pesado.png',
  './cc/triste.png',
  './cc/mi_abrazo.mp4'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith('para-mi-flaco-offline-') &&
          key !== CACHE_NAME
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(
      new URL('./', self.location.href).pathname
    )
  ) return;

  if (request.method !== 'GET') return;

  if (request.headers.has('range')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(new Request(url.href));

      if (!cached) return fetch(request);

      const bytes = await cached.arrayBuffer();
      const total = bytes.byteLength;

      const m = /^bytes=(\d*)-(\d*)$/.exec(
        request.headers.get('range') || ''
      );

      if (!m || (!m[1] && !m[2])) return cached;

      let start, end;

      if (m[1] === '') {
        const suffix = Number(m[2]);

        if (!suffix) {
          return new Response(null, {
            status: 416,
            headers: {
              'Content-Range': `bytes */${total}`
            }
          });
        }

        start = Math.max(total - suffix, 0);
        end = total - 1;
      } else {
        start = Number(m[1]);
        end = m[2]
          ? Math.min(Number(m[2]), total - 1)
          : total - 1;
      }

      if (start >= total || end < start) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${total}`
          }
        });
      }

      const mime =
        cached.headers.get('Content-Type') ||
        'application/octet-stream';

      return new Response(bytes.slice(start, end + 1), {
        status: 206,
        statusText: 'Partial Content',
        headers: {
          'Content-Type': mime,
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Content-Length': String(end - start + 1),
          'Accept-Ranges': 'bytes'
        }
      });
    })());

    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    const cached = await cache.match(request, {
      ignoreSearch: true
    });

    if (cached) return cached;

    return fetch(request);
  })());
});
