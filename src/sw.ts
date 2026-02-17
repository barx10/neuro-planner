/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Take control immediately
self.skipWaiting()
clientsClaim()

// Workbox precaching (vite-plugin-pwa injects the manifest)
precacheAndRoute(self.__WB_MANIFEST)

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title, body, icon, tag } = data

  event.waitUntil(
    self.registration.showNotification(title || 'Neurominder', {
      body: body || '',
      icon: icon || '/icon.png',
      badge: '/icon.png',
      tag: tag || 'neuro-planner',
      data: { vibrate: [100, 50, 100] },
    })
  )
})

// Notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow('/')
    })
  )
})
