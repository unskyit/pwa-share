self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Intercept the OS Share Intent
    if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
        event.respondWith((async () => {
            try {
                // Read the incoming files from the OS
                const formData = await event.request.formData();
                const files = formData.getAll('pdf_files');
                
                // Hand them off to IndexedDB so the frontend can retrieve them
                await saveFilesToIndexedDB(files);
                
                // Redirect back to index.html and append a trigger flag
                return Response.redirect('./?shared=true', 303);
            } catch (err) {
                console.error("Share target interception failed:", err);
                return Response.redirect('./', 303);
            }
        })());
    } else {
        // Standard passthrough for normal page loads
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    }
});

function saveFilesToIndexedDB(files) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SharedFilesDB', 1);
        
        request.onupgradeneeded = e => {
            e.target.result.createObjectStore('files', { autoIncrement: true });
        };
        
        request.onsuccess = e => {
            const db = e.target.result;
            const tx = db.transaction('files', 'readwrite');
            const store = tx.objectStore('files');
            
            store.clear(); // Clear out any stale files
            files.forEach(f => store.add(f));
            
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}
