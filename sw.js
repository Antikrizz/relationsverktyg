// Service Worker — cachar appen för snabb start och offline-stöd
const CACHE_NAME = 'rv-v5'

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

// ACTIVATE: rensa gamla cache-versioner
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
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

  // Appfiler: cache-first med nätverksfallback
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
