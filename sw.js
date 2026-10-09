self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
self.addEventListener('push', (event) => {
  console.log('[Push Debug] Push event received', {
    time: new Date().toISOString(),
    hasData: Boolean(event.data),
  })
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {
      body: event.data ? event.data.text() : '',
    }
  }
  const title = data.title || 'Electrician Connect'
  const options = {
  body: data.body || '',
  tag: data.tag || `push-${Date.now()}-${Math.random()}`,
  renotify: true,
  requireInteraction: true,
  data: {
    url: data.url || '/',
  },
}
  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        console.log('[Push Debug] Notification displayed', {
          title,
          time: new Date().toISOString(),
        })
      })
      .catch((error) => {
        console.error(
          '[Push Debug] Notification display failed',
          error
        )
        throw error
      })
  )
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url =
    (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.navigate(url).catch(() => {})
            return client.focus()
          }
        }
        return self.clients.openWindow(url)
      })
  )
})
self.addEventListener('fetch', () => {})