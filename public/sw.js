self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request).catch(() => {
      if (!('caches' in self)) return new Response('Offline', { status: 503 })
      return caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 }))
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => new URL(item.url).origin === self.location.origin)
      if (client) {
        client.navigate(url)
        return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'AgriConnect update', {
      body: payload.body || 'You have a new AgriConnect notification.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/notifications' },
      tag: payload.tag || `agriconnect-${Date.now()}`,
    }),
  )
})
