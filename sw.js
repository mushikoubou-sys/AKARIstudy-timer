const CACHE='mikabu-timer-v6';
const ASSETS=['./','./index.html','./styles.css','./app.js','./firebase-config.js','./cloud-sync.js','./manifest.webmanifest','./assets/mikabu-mascot.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{if(event.request.method==='GET')event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())))});
