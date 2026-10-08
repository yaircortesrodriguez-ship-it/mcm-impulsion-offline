const CACHE_NAME='mcm-impulsion-pwa-v2-3';
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
    event.respondWith((async()=>{
      // Sin conexión: ir directo al shell local para evitar la pantalla
      // "No tienes conexión" de Android/Chrome.
      if(self.navigator && self.navigator.onLine===false){
        return (
          await caches.match(INDEX,{ignoreSearch:true}) ||
          await caches.match(BASE,{ignoreSearch:true})
        );
      }

      try{
        const response=await fetch(request);

        if(response&&response.ok){
          const copy=response.clone();
          const cache=await caches.open(CACHE_NAME);
          await cache.put(INDEX,copy);
        }

        return response;
      }catch(e){
        return (
          await caches.match(request,{ignoreSearch:true}) ||
          await caches.match(INDEX,{ignoreSearch:true}) ||
          await caches.match(BASE,{ignoreSearch:true})
        );
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(request,{ignoreSearch:true});
    if(cached) return cached;

    try{
      const response=await fetch(request);

      if(response&&response.ok){
        const copy=response.clone();
        const cache=await caches.open(CACHE_NAME);
        await cache.put(request,copy);
      }

      return response;
    }catch(e){
      return caches.match(request,{ignoreSearch:true});
    }
  })());
});
