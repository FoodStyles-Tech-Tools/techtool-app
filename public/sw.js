self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.open("techtool-static-v1").then(async (cache) => {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (
          networkResponse.ok &&
          request.url.startsWith(self.location.origin) &&
          !request.url.includes("/api/")
        ) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return cachedResponse ?? Response.error();
      }
    })
  );
});
