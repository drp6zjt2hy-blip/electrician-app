self.addEventListener('install', () => {
self.skipWaiting()
})


self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()

      // Restore the badge from the saved unread count, if supported.
      try {
        const cache = await caches.open('electricians-connect-badge')
        const response = await cache.match('/unread-count')
        const count = response ? Number(await response.text()) : 0

        if (count > 0 && self.registration.setAppBadge) {
          await self.registration.setAppBadge(count)
        } else if (self.registration.clearAppBadge) {
          await self.registration.clearAppBadge()
        }
      } catch (error) {
        console.log('[Badge] Could not restore app icon badge', error)
      }
    })()
  )
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

  const title = data.title || 'YAKA FIX'

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
    (async () => {
      await self.registration.showNotification(title, options)

      try {
        const cache = await caches.open('electricians-connect-badge')
        const response = await cache.match('/unread-count')
        const previousCount = response
          ? Number(await response.text()) || 0
          : 0

        const count = previousCount + 1

        await cache.put(
          '/unread-count',
          new Response(String(count), {
            headers: { 'Content-Type': 'text/plain' },
          })
        )

        if (self.registration.setAppBadge) {
          await self.registration.setAppBadge(count)
        }

        console.log('[Badge] App icon badge updated', { count })
      } catch (error) {
        console.log('[Badge] Could not update app icon badge', error)
      }
    })()
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

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SET_UNREAD_COUNT') return

  const count = Math.max(
    0,
    Math.floor(Number(event.data.count) || 0)
  )

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open('electricians-connect-badge')

        await cache.put(
          '/unread-count',
          new Response(String(count), {
            headers: { 'Content-Type': 'text/plain' },
          })
        )

        if (count > 0 && self.registration.setAppBadge) {
          await self.registration.setAppBadge(count)
        } else if (self.registration.clearAppBadge) {
          await self.registration.clearAppBadge()
        }
      } catch (error) {
        console.log('[Badge] Could not update app icon badge', error)
      }
    })()
  )
})
