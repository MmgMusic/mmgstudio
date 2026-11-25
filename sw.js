// Ce fichier permet à votre site de fonctionner hors ligne en mettant en cache les ressources.

const BUILD = '2026-05b'; // à changer à chaque déploiement
const STATIC_CACHE_NAME = `mmg-static-${BUILD}`;
const DYNAMIC_CACHE_NAME = `mmg-dynamic-${BUILD}`;

// Fichiers essentiels de l'application à mettre en cache immédiatement.
const STATIC_ASSETS = [
    './',
    './index.html',

    './manifest.json',
    './css/common.css',
    './css/mobile.css',
    './css/computer.css',
    './js/mmg-music-contents.js',
    './js/mmg-shop.js',
    './js/mmg-dragdrop.js',

    './js/languages.js',
    './data.json',
    './news.json',
    // Cursors
    './assets/cursors/pointer.cur',
    './assets/cursors/link.cur',
    './assets/cursors/text.cur',
    // Son d'intro
    './assets/MMGEARIntroSFX.ogg',
    // Sons UI
    './assets/sounds/back.ogg',
    './assets/sounds/select.ogg',
    './assets/sounds/switch_towhite.ogg',
    './assets/sounds/switch_toblack.ogg',
    './assets/sounds/achievement.ogg',
    './assets/sounds/coin.ogg',
    // Images UI
    './assets/mmg-music-avatar.webp',
    './assets/mmg-beats-avatar.webp',
    // Icônes
    './assets/icons/icon-192.webp',
    './assets/icons/icon-512.webp',
    // Polices Locales
    './assets/fonts/PlusJakartaSans.woff2',
    './assets/fonts/MomoTrustDisplay.woff2',
    './assets/fonts/Inter.woff2',
    './assets/fonts/Saira.woff2'
];

// Installation du Service Worker et mise en cache des fichiers statiques.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// NOUVEAU: Écoute le message pour forcer l'activation (skipWaiting)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Activation du Service Worker et nettoyage des anciens caches.
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Nettoyage des anciens caches
            caches.keys().then(keyList => {
                return Promise.all(keyList.map(key => {
                    if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                        return caches.delete(key);
                    }
                }));
            }),
            // Activation du préchargement de la navigation (Navigation Preload)
            // Évite l'erreur "preload request was cancelled" et améliore les performances.
            self.registration.navigationPreload ? self.registration.navigationPreload.enable() : Promise.resolve()
        ]).then(() => self.clients.claim())
    );
});

// Interception des requêtes réseau.
// Stratégie : Réseau d'abord (avec Navigation Preload), puis cache en cas d'échec.
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Stratégie "Cache d'abord" pour les polices, images, sons et librairies CDN (ressources statiques lourdes).
    const isStaticAsset = url.hostname === 'cdn.jsdelivr.net' ||
        url.pathname.match(/\.(woff2|webp|png|jpg|jpeg|ogg|mp3|cur)$/i);

    if (isStaticAsset) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(res => {
                    if (res.status === 200) {
                        const resClone = res.clone();
                        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                            cache.put(event.request.url, resClone);
                        });
                    }
                    return res;
                });
            })
        );
    } else {
        // Stratégie "Réseau d'abord" avec support du Navigation Preload
        event.respondWith(
            (async () => {
                try {
                    // 1. Tenter d'utiliser la réponse préchargée (Navigation Preload)
                    const preloadResponse = await event.preloadResponse;
                    if (preloadResponse) {
                        // Mettre en cache dynamique pour les prochaines fois
                        const cache = await caches.open(DYNAMIC_CACHE_NAME);
                        cache.put(event.request, preloadResponse.clone());
                        return preloadResponse;
                    }

                    // 2. Sinon, faire la requête réseau habituelle
                    const networkResponse = await fetch(event.request);

                    // Mettre en cache si c'est un succès (HTML, JS, CSS, JSON)
                    if (networkResponse.status === 200) {
                        const cache = await caches.open(DYNAMIC_CACHE_NAME);
                        cache.put(event.request, networkResponse.clone());
                    }

                    return networkResponse;
                } catch (error) {
                    // 3. Fallback sur le cache en cas d'absence de réseau
                    const cachedResponse = await caches.match(event.request);
                    if (cachedResponse) return cachedResponse;

                    // Si rien n'est disponible, on laisse l'erreur se propager (ou on pourrait renvoyer une page offline)
                    throw error;
                }
            })()
        );
    }
});

// --- Gestion des Notifications Push ---
self.addEventListener('push', event => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { content: event.data.text() };
        }
    }

    const title = data.title || 'Mmg Music';
    const options = {
        body: data.content || data.body || 'Nouveau contenu disponible !',
        icon: './assets/icons/icon-192.webp',
        badge: './assets/icons/icon-192.webp',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './'
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
