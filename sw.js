self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open("zamereni-cache-v3").then(function(cache) {
      return cache.addAll([
        "./index.html",
        "./style.css",
        "./js/main.js",
        "./js/ui_dynamicSections.js",
        "./js/autofill.js",
        "./js/form_draft.js",
        "./js/offline_queue.js",
        "./js/json_import_export.js",
        "./js/csv_export.js",
        "./js/pdf_generator.js",
        "./js/deeplink.js",
        "./manifest.json",
        "./icon-192.png",
        "./icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});