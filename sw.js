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

const title = data.title || 'Electricians Connect'

const options = {
  body: data.body || '',
  tag: data.tag || `push-${Date.now()}`,
  renotify: Boolean(data.tag),
  requireInteraction: true,
  data: {
    url: data.url || '/electrician-app/',
  },
}

event.waitUntil(
  self.registration.showNotification(title, options)
    .then(() => {
      console.log('[Push Debug] Notification displayed', {
        title,
        time: new Date().toISOString(),
      })
    })
    .catch((error) => {
      console.error('[Push Debug] Notification display failed', error)
      throw error
    })
)
})

self.addEventListener('notificationclick', (event) => {
event.notification.close()

const appBase = '/electrician-app/'
const rawUrl = event.notification.data?.url || appBase

let targetUrl

try {
const candidate = new URL(rawUrl, self.location.origin)

if (candidate.origin !== self.location.origin) {
  targetUrl = new URL(appBase, self.location.origin)
} else {
  let pathname = candidate.pathname
  if (
    pathname !== '/electrician-app' &&
    !pathname.startsWith(appBase)
  ) {
    pathname = `${appBase}${pathname.replace(/^\/+/, '')}`
  } else if (pathname === '/electrician-app') {
    pathname = appBase
  }
  targetUrl = new URL(
    `${pathname}${candidate.search}${candidate.hash}`,
    self.location.origin
  )
}

} catch {
targetUrl = new URL(appBase, self.location.origin)
}

event.waitUntil(
(async () => {
const windows = await self.clients.matchAll({
type: 'window',
includeUncontrolled: true,
})

  for (const client of windows) {
    try {
      const clientUrl = new URL(client.url)
      if (
        clientUrl.origin === self.location.origin &&
        clientUrl.pathname.startsWith(appBase)
      ) {
        await client.navigate(targetUrl.href)
        return client.focus()
      }
    } catch (error) {
      console.warn(
        '[Push Debug] Could not navigate existing tab',
        error
      )
    }
  }
  return self.clients.openWindow(targetUrl.href)
})()

)
})