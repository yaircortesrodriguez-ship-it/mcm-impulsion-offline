const CACHE_NAME='mcm-impulsion-pwa-v2-2';
const BASE='/mcm-impulsion-offline/';
const INDEX=BASE+'index.html';

const APP_SHELL=[
  BASE,
  INDEX,
  BASE+'manifest.webmanifest',
  BASE+'icon-192.png',
  BASE+'icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key!==CACHE_NAME)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);

  if(url.origin!==self.location.origin) return;
  if(request.method!=='GET') return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          if(response&&response.ok){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put(INDEX,copy));
          }
          return response;
        })
        .catch(async()=>{
          return (
            await caches.match(request) ||
            await caches.match(INDEX) ||
            await caches.match(BASE)
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      if(cached) return cached;

      return fetch(request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
        }
        return response;
      });
    })
  );
});
