// =========================================================
// MMG DATA MODULE — Gestion des données et du chargement
// =========================================================

let siteData = {};
let allSearchableItems = {};
let allItemsMap = new Map();
const _imagePathCache = new Map();
let newsData = {};

// Wrapper pour localStorage sécurisé
const safeStorage = {
    getItem: (key) => {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    setItem: (key, value) => {
        try { localStorage.setItem(key, value); } catch (e) { }
    },
    removeItem: (key) => {
        try { localStorage.removeItem(key); } catch (e) { }
    }
};

// Helper centralisé pour obtenir le profil actif
function getActiveProfile() {
    const activeMobileBtn = document.querySelector('#mobile-profile-switch .profile-switch-btn.active');
    if (activeMobileBtn) return activeMobileBtn.dataset.project;

    const branding = document.getElementById('mmg-branding');
    if (branding && branding.classList.contains('is-beats')) return 'mmg-beats';

    return 'mmg-music';
}

function findItemById(id) {
    if (!id) return null;
    return allItemsMap.get(id) || null;
}

function getCorrectImagePath(item, size = 'thumb') {
    if (!item?.image) return 'https://placehold.co/200x120/9E9E9E/FFFFFF?text=No+Image';

    const cacheKey = `${item.id}:${size}`;
    if (_imagePathCache.has(cacheKey)) return _imagePathCache.get(cacheKey);

    let result = item.image;
    if (size === 'thumb') {
        const originalPath = item.image;
        const pathParts = originalPath.split('/');
        if (pathParts.length > 1) {
            const originalFilename = pathParts.pop();
            const basePath = pathParts.join('/');
            const filenameParts = originalFilename.split('.');
            if (filenameParts.length > 1) {
                const name = filenameParts.slice(0, -1).join('.');
                result = `${basePath}/thumb/${name}_thumb.webp`;
            }
        }
    }

    _imagePathCache.set(cacheKey, result);
    return result;
}

function clearImageCache() {
    _imagePathCache.clear();
}

function initUserData() {
    // Initialisation des préférences utilisateur depuis le localStorage
    const savedTheme = safeStorage.getItem('mmg-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (typeof UI !== 'undefined' && UI.themeSwitch) UI.themeSwitch.checked = true;
    }

    const savedLang = safeStorage.getItem('mmg-lang');
    if (savedLang && typeof currentLang !== 'undefined') currentLang = savedLang;

    const savedLikes = safeStorage.getItem('mmg-likedSongs');
    if (savedLikes && typeof likedSongs !== 'undefined') likedSongs = new Set(JSON.parse(savedLikes));

    const savedUnlocked = safeStorage.getItem('mmg-unlockedTracks');
    if (savedUnlocked && typeof unlockedDreamSeasonTracks !== 'undefined') unlockedDreamSeasonTracks = JSON.parse(savedUnlocked);

    const savedCoins = safeStorage.getItem('mmg-userCoins');
    if (savedCoins && typeof userCoins !== 'undefined') userCoins = parseInt(savedCoins);

    const savedPurchased = safeStorage.getItem('mmg-purchasedItems');
    if (savedPurchased && typeof purchasedShopItems !== 'undefined') purchasedShopItems = new Set(JSON.parse(savedPurchased));
    
    // Login streak & bonus (logique simplifiée pour l'extraction)
    const lastLogin = safeStorage.getItem('mmg-lastLoginDate');
    if (lastLogin && typeof lastLoginDate !== 'undefined') lastLoginDate = lastLogin;
}

async function loadDataAndInitialize() {
    try {
        clearImageCache();
        const [siteResponse, newsResponse] = await Promise.all([
            fetch('data.json?v=2.1'),
            fetch('news.json')
        ]);

        if (!siteResponse.ok) throw new Error(`HTTP error loading data! status: ${siteResponse.status}`);
        if (!newsResponse.ok) throw new Error(`HTTP error loading news! status: ${newsResponse.status}`);

        siteData = await siteResponse.json();
        newsData = await newsResponse.json();

        // --- NOUVEAU: Preload Intelligent du LCP (Largest Contentful Paint) ---
        try {
            const activeProfile = getActiveProfile();
            const allTitles = Object.entries(siteData.contentData[activeProfile].titles)
                .map(([id, title]) => { title.id = id; return title; });
            
            // On trouve le titre le plus récent (LCP probable)
            const latestItem = allTitles.sort((a, b) => new Date(b.year, 0, 1) - new Date(a.year, 0, 1))[0];
            if (latestItem) {
                const bgImageSize = window.innerWidth <= 952 ? 'thumb' : 'full';
                const lcpImageUrl = getCorrectImagePath(latestItem, bgImageSize);
                
                if (lcpImageUrl) {
                    const link = document.createElement('link');
                    link.rel = 'preload';
                    link.as = 'image';
                    link.href = lcpImageUrl;
                    link.fetchPriority = 'high';
                    document.head.appendChild(link);
                    if (typeof logger !== 'undefined') logger.log(`[LCP] Preloading hero image: ${lcpImageUrl}`);
                }
            }
        } catch (e) {
            console.warn("LCP Preload failed:", e);
        }

        initUserData();

        Object.entries(siteData.contentData).forEach(([profileName, profile]) => {
            if (profile.titles) Object.entries(profile.titles).forEach(([key, val]) => { 
                val.id = key; val.profile = profileName; val.type = 'title'; 
            });
            if (profile.videos) Object.entries(profile.videos).forEach(([key, val]) => {
                val.id = key; val.type = 'video'; val.profile = profileName;
            });
            if (profile.bonus) Object.entries(profile.bonus).forEach(([key, val]) => {
                val.id = key; val.type = 'bonus'; val.profile = profileName;
            });
            if (profile.albums) Object.entries(profile.albums).forEach(([key, val]) => {
                val.id = key; val.type = 'album'; val.profile = profileName;
            });
            Object.assign(allSearchableItems, profile.titles, profile.videos, profile.bonus, profile.albums);
        });
        
        allItemsMap = new Map(Object.entries(allSearchableItems));


    } catch (error) {
        if (typeof logger !== 'undefined') logger.error("Could not load site data:", error);
        else console.error("Could not load site data:", error);
        document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">Erreur de chargement des données. Veuillez réessayer.</h1>';
    }
}

// Déclenche le chargement immédiatement
window.dataLoadedPromise = loadDataAndInitialize();

