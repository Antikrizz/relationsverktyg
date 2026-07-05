// Service Worker — cachar appen för snabb start och offline-stöd
const CACHE_NAME = 'rv-v9'

// Dessa filer cachas vid installation — appen funkar utan internet efter första besöket
const CACHE_FILES = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icon.svg'
]

// INSTALL: hämta och cacha alla appfiler
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  )
  // Aktivera direkt utan att vänta på att gamla flikar stängs
  self.skipWaiting()
})

// ACTIVATE: rensa gamla cache-versioner och meddela alla öppna flikar att ladda om
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' })))
  )
})

// PUSH: visar notis när servern skickar en påminnelse
self.addEventListener('push', evt => {
  const data = evt.data?.json() || {}
  evt.waitUntil(
    self.registration.showNotification(data.title || '🩷 Relationsverktyg', {
      body: data.body || 'Dags för veckans incheckning!',
      icon: './icon.svg',
      badge: './icon.svg',
    })
  )
})

// Öppnar appen när användaren trycker på notisen
self.addEventListener('notificationclick', evt => {
  evt.notification.close()
  // scope pekar alltid på appens faktiska URL, oavsett var den hostas
  evt.waitUntil(clients.openWindow(self.registration.scope))
})

// FETCH: cache-first för appfiler, nätverket för Supabase-anrop
self.addEventListener('fetch', evt => {
  const url = evt.request.url

  // Supabase och CDN-anrop går alltid mot nätverket — cacha dem inte
  if (url.includes('supabase.co') || url.includes('esm.sh')) {
    evt.respondWith(
      fetch(evt.request).catch(() =>
        // Vid offline: returnera 503 så appen kan visa felmeddelande
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    )
    return
  }

  // Själva sidan (navigering): nätverk först så nya versioner syns direkt,
  // cachen används bara som offline-fallback. Slipper cache-versionsbumpar.
  if (evt.request.mode === 'navigate') {
    evt.respondWith(
      fetch(evt.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone()
          caches.open(CACHE_NAME).then(c => c.put(evt.request, clone))
        }
        return resp
      }).catch(() =>
        caches.match(evt.request).then(cached => cached || caches.match('./index.html'))
      )
    )
    return
  }

  // Övriga appfiler: cache-first med nätverksfallback
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached
      return fetch(evt.request).then(resp => {
        // Cacha lyckade svar för framtida offline-bruk
        if (resp.ok) {
          const clone = resp.clone()
          caches.open(CACHE_NAME).then(c => c.put(evt.request, clone))
        }
        return resp
      })
    })
  )
})
