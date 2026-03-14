// Ce fichier permet à votre site de fonctionner hors ligne en mettant en cache les ressources.

const STATIC_CACHE_NAME = 'mmg-studio-static-v3';
const DYNAMIC_CACHE_NAME = 'mmg-studio-dynamic-v3';

// Fichiers essentiels de l'application à mettre en cache immédiatement.
const STATIC_ASSETS = [
    './',
    './index.html',

    './manifest.json',
    './css/common.css',
    './css/mobile.css',
    './css/computer.css',
    './js/mmg-music-contents.js',

    './js/languages.js',
    './data.json',
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
    // Polices Font Awesome locales
    './css/font-awesome.custom.min.css',
    './webfonts/fa-brands-400.woff2',
    './webfonts/fa-regular-400.woff2',
    './webfonts/fa-solid-900.woff2',
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
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// Interception des requêtes réseau.
// Stratégie : Réseau d'abord, puis cache en cas d'échec, SAUF pour les contenus statiques lourds (Cache d'abord)
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Stratégie "Cache d'abord" pour les polices, images, sons et librairies CDN qui ne changent pas.
    const isStaticAsset = url.hostname === 'cdn.jsdelivr.net' || 
                          url.pathname.match(/\.(woff2|webp|png|jpg|jpeg|ogg|mp3|cur)$/i);

    if (isStaticAsset) {
        event.respondWith(
            caches.match(event.request).then(response => {
                // Retourne le cache s'il correspond, sinon requête réseau et sauvegarde dans DYNAMIC_CACHE
                return response || fetch(event.request).then(res => {
                    return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(event.request.url, res.clone());
                        return res;
                    });
                });
            })
        );
    } else {
        // Stratégie "Réseau d'abord" pour le contenu de l'application (HTML, JSON, JS, CSS)
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return fetch(event.request).then(response => {
                    if (response.status === 200) {
                        cache.put(event.request.url, response.clone());
                    }
                    return response;
                }).catch(() => caches.match(event.request));
            })
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
