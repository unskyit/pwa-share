self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                const files = formData.getAll('pdf_files');
                await saveFilesToIndexedDB(files);
                
                // Redirect to the UI with the trigger flag
                return Response.redirect('./?shared=true', 303);
            } catch (err) {
                return Response.redirect('./', 303);
            }
        })());
    } else {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    }
});

function saveFilesToIndexedDB(files) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SharedFilesDB', 1);
        request.onupgradeneeded = e => e.target.result.createObjectStore('files', { autoIncrement: true });
        request.onsuccess = e => {
            const tx = e.target.result.transaction('files', 'readwrite');
            const store = tx.objectStore('files');
            store.clear();
            files.forEach(f => store.add(f));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
    });
}
