
// =========================================================
// GLOBAL VARIABLES & STATE
// =========================================================
let siteData = {};
let allSearchableItems = {};

let largePlayer, mediumPlayer;
let activePlayer = null;
let currentPlayingItem = null;
let isPlayerLooping = false;
let isShuffleMode = false;
let pausedForOverlay = false;
let isResumingFromOverlay = false;
let playerInitializationComplete = false;
let likedSongs = new Set();
let achievements = {};
let savedPlaylists = {};
let currentPlaylist = [];
let contextPlaybackQueue = []; // File de lecture "cachée" basée sur le contexte (album, recherche...)
let userQueue = []; // File d'attente "visible" et gérée par l'utilisateur
let currentQueueIndex = -1; // Index dans la file de lecture de CONTEXTE

// MODIFICATION: Autoplay complètement retiré. La lecture se fait manuellement sur la page de détails.
let currentVolume = 100;
let sfxEnabled = true;
let currentLang = 'en'; // MODIFICATION: Langue par défaut
let currentNavigationContext = { playlist: [], index: -1 };
let currentViewContext = { type: 'menu', data: null }; // Pour re-render lors du changement de langue
let currentPlaybackContext = { type: 'none', name: '' }; // NOUVEAU: Pour suivre la source de la lecture
let notificationShownForThisState = false; // NOUVEAU: Variable manquante pour les notifications

const COIN_SVG = `<svg width="1em" height="1em" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="coin-icon-svg" style="display: inline-block; vertical-align: middle;"><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="8" /><path d="M 33.5 64 L 25 64 L 25 45 Q 25 41 27 38 Q 28.5 35 32 33.5 Q 35.5 32 39 32 Q 42 32 45 33.5 Q 48 35 50 38 Q 52 35 55 33.5 Q 58 32 61.5 32 Q 65.5 32 68.5 33.5 Q 71.5 35 73.5 38 Q 75 41 75 45 L 75 64 L 66.5 64 L 66.5 45 Q 66.5 42.5 65 41 Q 63.5 39.5 61 39.5 Q 58.5 39.5 57 41 Q 55.5 42.5 55.5 45 L 55.5 64 L 44.5 64 L 44.5 45 Q 44.5 42.5 43 41 Q 41.5 39.5 39 39.5 Q 36.5 39.5 35 41 Q 33.5 42.5 33.5 45 L 33.5 64 Z" fill="currentColor" /></svg>`;

// NOUVEAU: Wrapper pour localStorage sécurisé (évite le crash en navigation privée)
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

// NOUVEAU: Helper centralisé pour obtenir le profil actif (Mmg Music ou Beats)
function getActiveProfile() {
    return document.querySelector('.profile-tab.active')?.dataset.project || 'mmg-music';
}

// --- NOUVEAUX ÉTATS ---
let listenProgress = 0;
let previousListenProgress = 0;
let seekDetectedInCurrentPlay = false;

let userCoins = 0;
const COIN_COST_UNLOCK = 10;
let unlockedDreamSeasonTracks = [];
let lastLoginDate = null; // NOUVEAU: Pour le bonus quotidien
let loginStreak = 0; // NOUVEAU: Pour le bonus quotidien
let dailyBonusCompleted = false; // NOUVEAU: Pour finir le "jeu"
let coinsAtLastDismissal = -1; // NOUVEAU: Pour gérer la notification de déblocage (Option 2)

let purchasedShopItems = new Set(); // NOUVEAU: Pour suivre les thèmes/fonds achetés

// --- State for Tutorial ---


let titleScrollObserver = null;
let titleResizeObserver = null;
let readUpdateIds = new Set();

// --- PWA Installation State ---
let deferredPrompt = null;

let carouselInterval = null; // AJOUT: Variable globale pour le minuteur du carrousel

// =========================================================
// SOUND & AUDIO ELEMENTS
// =========================================================
const sounds = {
    select: document.getElementById('select-sound'),
    back: document.getElementById('back-sound'),
    hover: document.getElementById('hover-sound'),
    switchToWhite: document.getElementById('switch-to-white-sound'),
    switchToBlack: document.getElementById('switch-to-black-sound'),
    shop: document.getElementById('shop-sound'),
    connecting: document.getElementById('connecting-sound'),
    achievementUnlocked: document.getElementById('achievement-unlocked-sound'),
    minimize: document.getElementById('minimize-sound'),
    maximize: document.getElementById('maximize-sound'),
    coin: document.getElementById('coin-sound'),
    keepAlive: document.getElementById('keep-alive-sound'),
    blocked: document.getElementById('blocked-sound'),
};

// =========================================================
// DATA LOADING
// =========================================================
async function loadDataAndInitialize() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            // CORRECTION: Affiche une erreur plus visible si data.json ne charge pas
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        siteData = await response.json();

        // CORRECTION : Les données utilisateur sont maintenant initialisées APRÈS le chargement de siteData, mais AVANT l'initialisation de l'app.
        initUserData();

        Object.entries(siteData.contentData).forEach(([profileName, profile]) => {
            // CORRECTION: Vérifie que les sections existent avant d'essayer de les parcourir.
            // Utilise les nouveaux noms 'videos' et 'bonus'.
            if (profile.titles) Object.entries(profile.titles).forEach(([key, val]) => { val.id = key; val.profile = profileName; });
            if (profile.videos) Object.entries(profile.videos).forEach(([key, val]) => {
                val.id = key;
                val.type = 'video';
                val.profile = profileName;
            });
            if (profile.bonus) Object.entries(profile.bonus).forEach(([key, val]) => {
                val.id = key;
                val.type = 'bonus';
                val.profile = profileName;
            });
            if (profile.albums) Object.entries(profile.albums).forEach(([key, val]) => {
                val.id = key;
                val.type = 'album';
                val.profile = profileName;
            });
            Object.assign(allSearchableItems, profile.titles, profile.videos, profile.bonus, profile.albums);
        });

        initializeApp();

    } catch (error) {
        console.error("Could not load site data:", error);
        document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">Erreur de chargement des données. Veuillez réessayer.</h1>';
    }
}

// MODIFICATION: Lancement automatique de l'intro au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadDataAndInitialize();
});

// =========================================================
// YOUTUBE PLAYER & MEDIA SESSION
// =========================================================

window.onYouTubeIframeAPIReady = function () {
    const playerOptions = {
        height: '100%',
        width: '100%',
        playerVars: { 'playsinline': 1, 'autoplay': 0, 'controls': 1, 'modestbranding': 1, 'rel': 0, 'showinfo': 0, 'iv_load_policy': 3, 'fs': 1, 'disablekb': 1, 'origin': window.location.origin },
        events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
    };
    largePlayer = new YT.Player('large-player-iframe', playerOptions);
    mediumPlayer = new YT.Player('medium-player-iframe', playerOptions);
    playerInitializationComplete = true;
    if (currentPlayingItem) loadAndPlayVideo(currentPlayingItem);
}

function onPlayerReady(event) {
    setVolume(currentVolume);
    setInterval(updateProgressBar, 1000);
}

function onPlayerStateChange(event) {
    // Ignore events from the inactive player to prevent UI conflicts
    if (activePlayer && event.target !== activePlayer) {
        return;
    }

    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseBox = document.getElementById('play-pause-box');
    // NOUVEAU: Contrôles du mini-lecteur mobile
    const miniPlayerPlayPauseBtn = document.getElementById('mini-player-play-pause-btn');
    const mobilePlayerPlayPauseBtn = document.getElementById('mobile-player-play-pause-btn');


    if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        playPauseBox.classList.remove('loading');
    } else if (event.data === YT.PlayerState.BUFFERING) {
        playPauseBox.classList.add('loading');
    }

    if (event.data === YT.PlayerState.ENDED) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
        const itemId = currentPlayingItem?.id; // Définir itemId ici pour qu'il soit disponible pour les achievements

        const finalProgress = activePlayer.getDuration() > 0 ? activePlayer.getCurrentTime() / activePlayer.getDuration() : 0;

        if (currentPlayingItem && isMusicTitle(currentPlayingItem) && !seekDetectedInCurrentPlay && finalProgress >= 0.95) {
            userCoins++;
            safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
            updateCoinDisplay();
            showDialog(`+1 pièce ! Total : ${userCoins}`);
            // CORRECTION : Met à jour les notifications et le point rouge en temps réel à chaque gain de pièce.
            renderUpdateLog();
            updateNotificationDot();
            playAudio(sounds.coin);
            if (isPlayerLooping) updateAchievementProgress('loopMaster', itemId);
            if (currentPlayingItem.tags?.includes('retro')) updateAchievementProgress('retroPlayer', itemId);
            if (currentPlayingItem.tags?.includes('playstation')) updateAchievementProgress('psPlayer', itemId);
            if (currentPlayingItem.tags?.includes('spotimon')) updateAchievementProgress('spotimonFan', itemId);
            // NOUVEAU: Mission Double Screen
            if (currentPlayingItem.profile) updateAchievementProgress('doubleScreen', currentPlayingItem.profile);
        }

        if (sounds.keepAlive) {
            sounds.keepAlive.pause();
        }
        if (playPauseBtn) playPauseBtn.className = 'fas fa-play';
        if (miniPlayerPlayPauseBtn) miniPlayerPlayPauseBtn.className = 'fas fa-play';
        if (mobilePlayerPlayPauseBtn) mobilePlayerPlayPauseBtn.className = 'fas fa-play';

        updateMediaPositionState(); // Update one last time

        // CORRECTION: Lancement automatique du titre suivant à la fin du morceau
        playNextTrack(1, true, false, true); // promptUser = true pour forcer le clic (vues YouTube)

    } else if (event.data === YT.PlayerState.PLAYING) {
        if (playPauseBtn) playPauseBtn.className = 'fas fa-pause';
        if (miniPlayerPlayPauseBtn) miniPlayerPlayPauseBtn.className = 'fas fa-pause';
        if (mobilePlayerPlayPauseBtn) mobilePlayerPlayPauseBtn.className = 'fas fa-pause';

        // NOUVEAU: Si la lecture commence (après un clic manuel), on met à jour toute l'interface
        if (currentPlayingItem) {
            updateMp3PlayerInfo(currentPlayingItem);
            updateLikeButtonUI(currentPlayingItem.id);
            updateMediaSession(currentPlayingItem);
            highlightPlayingCard(currentPlayingItem);
        }

        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";

        // NOUVEAU: Afficher le mini-player seulement quand on commence à jouer
        const miniPlayer = document.getElementById('mobile-mini-player');
        if (miniPlayer && currentPlayingItem) {
            miniPlayer.classList.remove('hidden');
            document.body.classList.remove('mobile-player-hidden');
            document.documentElement.style.setProperty('--mobile-player-height', '66px');
        }

        if (isResumingFromOverlay) {
            isResumingFromOverlay = false;
            return;
        }

        updateMediaPositionState(); // Mettre à jour l'état pour la notification

    } else if (event.data === YT.PlayerState.PAUSED) {
        if (playPauseBtn) playPauseBtn.className = 'fas fa-play';
        if (miniPlayerPlayPauseBtn) miniPlayerPlayPauseBtn.className = 'fas fa-play';
        if (mobilePlayerPlayPauseBtn) mobilePlayerPlayPauseBtn.className = 'fas fa-play';
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
        if (sounds.keepAlive) {
            sounds.keepAlive.pause();
        }

        updateMediaPositionState(); // Mettre à jour l'état pour la notification
    }
}

function playVideoWhenReady(item, playlistIds = [], index = -1, playbackOriginType = 'titles', forceTempPlay = false, fromAutoplay = false, isSwipe = false, cueOnly = false) {
    if (!item) return;
    // CORRECTION: Ne pas définir currentPlayingItem ici.
    // On le définit uniquement si la lecture est confirmée, pour éviter les faux positifs visuels quand l'autoplay est OFF.
    // La logique de la file d'attente est aussi déplacée plus bas.


    // --- La lecture est confirmée, on met à jour l'état ---
    currentPlayingItem = item;

    // MODIFICATION: Si le titre vient de la file d'attente utilisateur, on le retire.
    const itemIndexInUserQueue = userQueue.indexOf(item.id);
    if (itemIndexInUserQueue > -1) {
        userQueue.splice(itemIndexInUserQueue, 1);
        updateAllQueueViews();
    }

    // Determine contextPlaybackQueue and currentQueueIndex
    if (forceTempPlay) {
        // This is typically a single track play from its details page.
        contextPlaybackQueue = [item.id];
        currentQueueIndex = 0;
    } else if (playlistIds && playlistIds.length > 0) {
        contextPlaybackQueue = playlistIds;
        currentQueueIndex = index;
    } else { // Fallback for single track play not from a specific list
        const activeProfile = getActiveProfile();
        const albumId = item.albumId;
        if (albumId) {
            contextPlaybackQueue = Object.values(siteData.contentData[activeProfile].titles).filter(title => title.albumId === albumId).map(title => title.id);
            currentQueueIndex = contextPlaybackQueue.findIndex(id => id === item.id);
        } else {
            contextPlaybackQueue = [item.id]; // CORRECTION: Variable activePlaybackQueue n'existe pas
            currentQueueIndex = 0;
        }
    }

    // --- Determine currentPlaybackContext based on playbackOriginType ---
    // Prioritize specific origins, then fall back to more general ones.
    if (playbackOriginType === 'myPlaylist') {
        currentPlaybackContext = { type: 'playlist', name: 'Ma Playlist' };
    } else if (playbackOriginType === 'liked') {
        currentPlaybackContext = { type: 'liked', name: 'Titres Likés' };
    } else if (playbackOriginType === 'queue') {
        currentPlaybackContext = { type: 'selection', name: 'File d\'attente' };
    } else if (playbackOriginType === 'mmgPlaylist') {
        currentPlaybackContext = { type: 'mmgPlaylist', name: 'Mmg Playlists' };
    } else if (playbackOriginType === 'video') {
        currentPlaybackContext = { type: 'video', name: 'Vidéos' };
    } else if (item.albumId && (playbackOriginType === 'titles' || playbackOriginType === 'search' || playbackOriginType === 'album')) {
        // If it's an album track, and not from a more specific origin (like playlist/liked/video)
        const activeProfile = getActiveProfile();
        const album = item.albumId ? siteData.contentData[getActiveProfile()].albums[item.albumId] : null;
        currentPlaybackContext = album ? { type: 'album', name: album.title } : { type: 'track', name: 'Titres' };
    } else if (playbackOriginType === 'search') {
        currentPlaybackContext = { type: 'search', name: 'Recherche' };
    } else { // Default to 'titles' for generic lists or single tracks
        currentPlaybackContext = { type: 'track', name: 'Titres' };
    }

    seekDetectedInCurrentPlay = false;
    previousListenProgress = 0;

    if (!playerInitializationComplete) {
        showDialog("Chargement du lecteur vidéo...");
        return;
    }
    loadAndPlayVideo(item, fromAutoplay, isSwipe, cueOnly); // isSwipe is the 3rd argument, not fromAutoplay
}

function loadAndPlayVideo(item, fromAutoplay = false, isSwipe = false, cueOnly = false) {
    // CORRECTION: Capturer le contexte actuel AVANT tout changement
    const previousContext = { ...currentViewContext };

    document.getElementById('play-pause-box').classList.add('loading');
    unhighlightPlayingCard();

    currentPlayingItem = item;
    const musicTitle = isMusicTitle(item);

    activePlayer = musicTitle ? mediumPlayer : largePlayer;
    const inactivePlayer = musicTitle ? largePlayer : mediumPlayer;
    if (inactivePlayer && typeof inactivePlayer.stopVideo === 'function') inactivePlayer.stopVideo();

    if (musicTitle) {
        // CORRECTION: S'assure que le contexte de la vue est bien "détails du titre"
        currentViewContext = { type: 'music-details', data: item.id };
    } else if (!cueOnly) {
        // NOUVEAU: Si c'est une vidéo (et pas juste un pré-chargement), on affiche le lecteur vidéo
        showSection('large-player-section');
    }

    // NOUVEAU: On s'assure que le vrai lecteur est visible et le masque caché quand on charge une vidéo
    const coverOverlay = document.getElementById('details-cover-overlay');
    const movablePlayer = document.getElementById('movable-player-container');
    if (coverOverlay) coverOverlay.classList.add('hidden');
    if (movablePlayer) movablePlayer.style.visibility = 'visible';

    // MODIFICATION: On ne met à jour l'interface globale que si on lance la lecture (pas en cueOnly)
    if (!cueOnly) {
        updateMp3PlayerInfo(item);
        updateLikeButtonUI(item.id);
        updateMediaSession(item);
        highlightPlayingCard(item);
        renderPlaylist();

        const miniPlayer = document.getElementById('mobile-mini-player');
        if (miniPlayer) miniPlayer.classList.remove('hidden');
        document.body.classList.remove('mobile-player-hidden');
        document.documentElement.style.setProperty('--mobile-player-height', '66px');

        // NOUVEAU: Indice visuel pour le Bubble Mode (une seule fois)
        if (!safeStorage.getItem('bubble-hint-shown')) {
            miniPlayer.classList.add('bubble-hint-anim');
            safeStorage.setItem('bubble-hint-shown', 'true');
            setTimeout(() => miniPlayer.classList.remove('bubble-hint-anim'), 1500);
        }
    } else {
        // En mode "Navigation" (Cue Only), on met à jour l'UI quand même pour que le mini-lecteur affiche le titre "à venir"
        updateMp3PlayerInfo(item);
        updateLikeButtonUI(item.id);

        const detailsSection = document.getElementById('music-title-details-section');
        if (detailsSection && detailsSection.dataset.currentItemId === item.id) {
            const coverOverlay = document.getElementById('details-cover-overlay');
            const movablePlayer = document.getElementById('movable-player-container');
            if (coverOverlay) coverOverlay.classList.add('hidden');
            if (movablePlayer) movablePlayer.style.visibility = 'visible';
        }

        // Si on est en mode "Navigation" (Cue Only), on cache le mini-lecteur
        const miniPlayer = document.getElementById('mobile-mini-player');
        if (miniPlayer) miniPlayer.classList.add('hidden');
        document.body.classList.add('mobile-player-hidden');
    }



    if (activePlayer && typeof (cueOnly ? activePlayer.cueVideoById : activePlayer.loadVideoById) === 'function') {
        // WORKAROUND: Si on veut juste "cue" (préparer) une vidéo déjà en cours de lecture, on n'envoie rien 
        // pour éviter de couper le morceau en plein milieu !
        const currentVideoUrl = activePlayer.getVideoUrl ? activePlayer.getVideoUrl() : '';
        const isSameVideo = currentVideoUrl.includes(item.youtube_id);

        if (cueOnly && isSameVideo) {
            // Déjà chargé et en train de jouer/pause, on ne touche à rien
            return;
        }

        const method = cueOnly ? 'cueVideoById' : 'loadVideoById';
        activePlayer[method](item.youtube_id, 0);
    }
}

/**
 * Mets à jour les métadonnées et les contrôles pour l'API Media Session.
 */
function updateMediaSession(item) {
    if (!('mediaSession' in navigator)) {
        return;
    }
    const activeProfile = getActiveProfile();
    const album = siteData.contentData[activeProfile].albums[item.albumId];

    navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: activeProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats',
        album: album ? album.title : 'Single',
        artwork: [{ src: getCorrectImagePath(item), sizes: '512x512', type: 'image/png' }]
    });

    navigator.mediaSession.playbackState = "playing";

    navigator.mediaSession.setActionHandler('play', () => { if (activePlayer) activePlayer.playVideo() });
    navigator.mediaSession.setActionHandler('pause', () => { if (activePlayer) activePlayer.pauseVideo() }); // Pause the active player

    navigator.mediaSession.setActionHandler('previoustrack', () => playNextTrack(-1, true));
    navigator.mediaSession.setActionHandler('nexttrack', () => playNextTrack(1, true));

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (activePlayer) activePlayer.seekTo(Math.max(0, activePlayer.getCurrentTime() - skipTime), true); // Correction pour ne pas aller en négatif
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (activePlayer) activePlayer.seekTo(Math.min(activePlayer.getDuration(), activePlayer.getCurrentTime() + skipTime), true); // Correction pour ne pas dépasser la durée
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in activePlayer) {
            activePlayer.fastSeek(details.seekTime);
            return;
        }
        if (activePlayer) activePlayer.seekTo(details.seekTime, true);
    });

    navigator.mediaSession.setActionHandler('stop', () => {
        if (activePlayer && typeof activePlayer.stopVideo === 'function') {
            activePlayer.stopVideo();
            currentPlayingItem = null;
            resetMiniPlayerUI();
        }
    });

    updateMediaPositionState(); // Initialisation
}

/**
 * Met à jour la position et la durée dans l'API Media Session pour la notification.
 * C'est crucial pour que l'OS considère le média comme actif.
 * @returns 
 * Met à jour la position et la durée dans l'API Media Session pour la notification.
 */
function updateMediaPositionState() {
    if (!('mediaSession' in navigator) || !activePlayer || typeof activePlayer.getDuration !== 'function') {
        return;
    }

    const duration = activePlayer.getDuration() || 0;
    const position = activePlayer.getCurrentTime() || 0;

    if (navigator.mediaSession.playbackState === 'playing' && !isNaN(duration) && isFinite(duration)) {
        try {
            navigator.mediaSession.setPositionState({
                duration: duration,
                playbackRate: activePlayer.getPlaybackRate(),
                position: position
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de setPositionState:', error);
        }
    }
}

// NOUVEAU: Fonctions pour surligner la carte en cours de lecture
function highlightPlayingCard(item) {
    unhighlightPlayingCard(); // Retire l'ancien surlignage
    if (!item) return;

    // CORRECTION: On cible toutes les sections visibles pour être sûr de trouver la carte,
    // car querySelector s'arrête au premier résultat (qui peut être la section en train de disparaître).
    const visibleSections = document.querySelectorAll('.page-section:not(.hidden)');

    visibleSections.forEach(section => {
        const cardElement = section.querySelector(`.card[data-item-id="${item.id}"]`);
        if (cardElement) {
            cardElement.classList.add('now-playing-card');
        }
    });
}

function unhighlightPlayingCard() {
    const highlightedCards = document.querySelectorAll('.card.now-playing-card');
    highlightedCards.forEach(card => card.classList.remove('now-playing-card'));
}

function findItemById(id) {
    return allSearchableItems[id] || null;
}

function isMusicTitle(item) {
    return item && item.albumId && item.year;
}

// =========================================================
// LIKES, PLAYLIST & ACHIEVEMENTS
// =========================================================
function initUserData() {
    const storedLikes = safeStorage.getItem('mmg-likedSongs');
    likedSongs = storedLikes ? new Set(JSON.parse(storedLikes)) : new Set();

    const storedPlaylist = safeStorage.getItem('mmg-playlist');
    currentPlaylist = storedPlaylist ? JSON.parse(storedPlaylist) : [];

    const storedSavedPlaylists = safeStorage.getItem('mmg-savedPlaylists');
    savedPlaylists = storedSavedPlaylists ? JSON.parse(storedSavedPlaylists) : {};

    const storedSfx = safeStorage.getItem('mmg-sfxEnabled');
    sfxEnabled = storedSfx !== null ? JSON.parse(storedSfx) : true;
    document.getElementById('sfx-switch').checked = sfxEnabled;

    const storedLang = safeStorage.getItem('mmg-lang');
    const browserLang = navigator.language.split('-')[0]; // 'fr-FR' -> 'fr'
    currentLang = storedLang || (translations[browserLang] ? browserLang : 'en'); // Use browser lang if available, else fallback to 'en'
    // CORRECTION : applyLanguage est maintenant appelé uniquement dans initializeApp,
    // une fois que l'on est sûr que `siteData` est chargé, pour éviter les erreurs.
    // On se contente de mettre à jour les boutons de langue ici.
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === currentLang));

    const storedReadUpdates = safeStorage.getItem('mmg-readUpdateIds');
    readUpdateIds = storedReadUpdates ? new Set(JSON.parse(storedReadUpdates)) : new Set();

    const storedAchievements = safeStorage.getItem('mmg-achievements');
    const defaultAchievements = {
        loopMaster: { unlocked: false, progress: {}, goal: 3, icon: "fa-sync-alt" },
        retroPlayer: { unlocked: false, progress: [], goal: 3, icon: "fa-gamepad" },
        patienceIsKey: { unlocked: false, progress: 0, goal: 1, icon: "fa-hourglass-end" },
        psPlayer: { unlocked: false, progress: [], goal: 2, icon: "fab fa-playstation" },
        spotimonFan: { unlocked: false, progress: [], goal: 7, icon: "fa-compact-disc" }, // NOUVEAU: Mission Spotimon
        pwaInstall: { unlocked: false, progress: 0, goal: 1, icon: "fa-mobile-alt" }, // NOUVEAU: Mission PWA
        doubleScreen: { unlocked: false, progress: [], goal: 2, icon: "fa-columns" }, // NOUVEAU: Mission DS
        dailyBonusMaster: { unlocked: false, progress: 0, goal: 1, icon: "fa-calendar-check" } // NOUVEAU: Mission Bonus Quotidien
    };
    achievements = storedAchievements ? JSON.parse(storedAchievements) : defaultAchievements;

    Object.keys(defaultAchievements).forEach(key => {
        if (!achievements[key]) {
            achievements[key] = defaultAchievements[key];
        }
    });

    // NOUVEAU: Réinitialiser la progression de la mission "Double Screen" à chaque session si non débloquée
    if (achievements.doubleScreen && !achievements.doubleScreen.unlocked) {
        achievements.doubleScreen.progress = [];
    }

    const storedCoins = safeStorage.getItem('mmg-userCoins');
    userCoins = storedCoins ? JSON.parse(storedCoins) : 0;

    const storedDismissal = safeStorage.getItem('mmg-coinsAtLastDismissal');
    coinsAtLastDismissal = storedDismissal ? parseInt(storedDismissal, 10) : -1;

    const storedUnlocked = safeStorage.getItem('mmg-unlockedTracks');
    try {
        unlockedDreamSeasonTracks = storedUnlocked ? JSON.parse(storedUnlocked) : [];
        if (!Array.isArray(unlockedDreamSeasonTracks)) {
            unlockedDreamSeasonTracks = [];
        }
    } catch (e) {
        console.error('Failed to parse unlocked tracks, resetting.', e);
        unlockedDreamSeasonTracks = [];
    }

    // NOUVEAU: Charger les articles de boutique achetés
    const storedPurchasedItems = safeStorage.getItem('mmg-purchasedItems');
    try {
        const parsedItems = storedPurchasedItems ? JSON.parse(storedPurchasedItems) : [];
        purchasedShopItems = new Set(parsedItems);
    } catch (e) {
        console.error('Failed to parse purchased items, resetting.', e);
        purchasedShopItems = new Set();
    }

    // NOUVEAU: Initialisation des données pour le bonus de connexion quotidien
    lastLoginDate = safeStorage.getItem('mmg-lastLoginDate') || null;
    loginStreak = parseInt(safeStorage.getItem('mmg-loginStreak') || '0', 10);
    dailyBonusCompleted = safeStorage.getItem('mmg-dailyBonusCompleted') === 'true';
}

// ... (le reste de la fonction initUserData)


function updateCoinDisplay() {
    const coinElement = document.getElementById('coin-count');
    if (coinElement) coinElement.textContent = userCoins;
}

function updateNotificationDot() {
    const dots = document.querySelectorAll('.notification-dot'); // Cible tous les points rouges
    if (dots.length === 0) return;

    // CORRECTION : S'assurer que siteData est chargé avant de continuer.
    if (!siteData || !siteData.shopItems) return;

    // --- Condition 1: L'utilisateur peut-il débloquer quelque chose ? ---
    // Titre exclusif
    const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
    const hasLockedTracks = allUnlockableTracks.some(t => !unlockedDreamSeasonTracks.includes(t.id));
    const canUnlockTrack = userCoins >= COIN_COST_UNLOCK && hasLockedTracks;

    // CORRECTION : Vérifier que shopItems.backgrounds existe avant de filtrer.
    const backgroundsToBuy = siteData.shopItems.backgrounds.filter(bg => bg.cost > 0 && !purchasedShopItems.has(bg.id));
    const cheapestBackground = backgroundsToBuy.length > 0 ? backgroundsToBuy.reduce((prev, curr) => (prev.cost < curr.cost ? prev : curr)) : null;
    const canUnlockBackground = cheapestBackground && userCoins >= cheapestBackground.cost;

    const canUnlockSomething = canUnlockTrack || canUnlockBackground;

    // NOUVEAU (Option 2): Vérifie si la notification de déblocage a été ignorée pour ce solde exact
    const isUnlockDismissed = userCoins === coinsAtLastDismissal;
    const showUnlockNotification = canUnlockSomething && !isUnlockDismissed;

    // --- Condition 2: Y a-t-il des messages non lus ? (RESTAURÉ) ---
    const hasUnreadUpdateLog = siteData.updateLog && siteData.updateLog.some(entry => !readUpdateIds.has(entry.id));
    const hasUnreadDevMessage = siteData.devMessages && siteData.devMessages.some(entry => !readUpdateIds.has(entry.id));
    const hasUnreadMessages = hasUnreadUpdateLog || hasUnreadDevMessage;

    const shouldShowDot = showUnlockNotification || hasUnreadMessages;
    dots.forEach(dot => dot.classList.toggle('hidden', !shouldShowDot));

    // NOUVEAU: Mettre à jour le badge de l'icône de l'application en même temps que le point rouge.
    updateAppBadge();

    // Mettre à jour l'état du bouton "Marquer comme lu"
    const markAsReadBtn = document.getElementById('mark-as-read-btn');
    if (markAsReadBtn) {
        // Le bouton est actif s'il y a des messages non lus OU une notif de déblocage active
        markAsReadBtn.disabled = !hasUnreadMessages && !showUnlockNotification;
    }
}

function updateAchievementProgress(id, value) {
    if (achievements[id].unlocked) return;
    const ach = achievements[id];
    let progressChanged = false;

    if (id === 'loopMaster') {
        ach.progress[value] = (ach.progress[value] || 0) + 1;
        if (ach.progress[value] >= ach.goal) {
            unlockAchievement(id);
        }
        progressChanged = true;
    } else if (id === 'retroPlayer' || id === 'psPlayer') {
        if (!ach.progress.includes(value)) {
            ach.progress.push(value); // Ajoute l'ID unique du titre
            if (ach.progress.length >= ach.goal) {
                unlockAchievement(id);
            }
            progressChanged = true;
        }
    } else if (id === 'patienceIsKey') {
        ach.progress++;
        if (ach.progress >= ach.goal) {
            unlockAchievement(id);
        }
        progressChanged = true;
    } else if (id === 'spotimonFan') {
        // CORRECTION: La logique pour la mission Spotimon est maintenant correcte.
        if (!ach.progress.includes(value)) {
            ach.progress.push(value);
            if (ach.progress.length >= ach.goal) {
                unlockAchievement(id);
            }
            // La progression n'est marquée comme changée que si un nouveau titre a été ajouté.
            progressChanged = true;
        }
    } else if (id === 'pwaInstall') {
        achievements[id].progress = 1;
        unlockAchievement(id);
        progressChanged = true;
    } else if (id === 'doubleScreen') {
        // value est le nom du profil ('mmg-music' ou 'mmg-beats')
        if (!ach.progress.includes(value)) {
            ach.progress.push(value);
            if (ach.progress.length >= ach.goal) {
                unlockAchievement(id);
            }
            progressChanged = true;
        }
    } else if (id === 'dailyBonusMaster') {
        achievements[id].progress = 1;
        unlockAchievement(id);
        progressChanged = true;
    }

    if (progressChanged) {
        safeStorage.setItem('mmg-achievements', JSON.stringify(achievements));
        // NOUVEAU: Vérifie si la boutique est ouverte et la met à jour dynamiquement.
        const shopSection = document.getElementById('shop-section');
        if (shopSection && !shopSection.classList.contains('hidden')) {
            // On redessine uniquement la liste des thèmes pour refléter la progression.
            renderShopItems(false); // Pas d'animation sur mise à jour progression
        }
    }
}

function unlockAchievement(id) {
    if (achievements[id].unlocked) return;
    achievements[id].unlocked = true;
    safeStorage.setItem('mmg-achievements', JSON.stringify(achievements));
    playAudio(sounds.achievementUnlocked, true);
    showDialog(`${getTranslation('achievementUnlocked')}: ${getTranslation(`achievement_${id}_title`)}!`);
    updateShopLocksAndSelection();
}

// NOUVEAU: Met à jour le badge de l'icône de l'application (PWA)
async function updateAppBadge() {
    const hasUnread = !document.querySelector('.notification-dot')?.classList.contains('hidden');
    const NOTIFICATION_TAG = 'mmgear-badge-notification'; // Un tag pour gérer la notification

    // --- 1. API Badging (le point sur l'icône) ---
    if ('setAppBadge' in navigator) {
        if (hasUnread) {
            navigator.setAppBadge(); // Affiche un point sur l'icône
        } else {
            navigator.clearAppBadge(); // Retire le point
            notificationShownForThisState = false; // Réinitialise le flag quand il n'y a plus rien de non lu
        }
    }

    // --- 2. Notification Locale (le message dans la barre de notif) ---
    if ('Notification' in window && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;

        if (hasUnread) {
            // On n'affiche la notification que si on ne l'a pas déjà fait pour cet "état non lu"
            if (!notificationShownForThisState) {
                if (Notification.permission === 'granted') {
                    // Affiche une notification normale (non silencieuse)
                    registration.showNotification('Mmg Studio', {
                        body: getTranslation('unreadContent'), // "Vous avez du contenu non lu."
                        tag: NOTIFICATION_TAG, // Un tag pour remplacer la notification précédente au lieu d'en empiler
                        icon: './assets/icons/icon-192.webp',
                        badge: './assets/icons/icon-192.webp', // Icône pour la barre de notif sur Android
                        vibrate: [100, 50, 100] // Une petite vibration
                        // 'silent: false' est le comportement par défaut, donc pas besoin de le spécifier
                    });
                    notificationShownForThisState = true; // On marque que la notification a été montrée
                }
            }
        } else {
            // Si plus rien de non lu, on retire la notification de la barre
            const notifications = await registration.getNotifications({ tag: NOTIFICATION_TAG });
            notifications.forEach(notification => notification.close());
            notificationShownForThisState = false; // Réinitialise le flag
        }
    }
}

function unlockAllAchievements() {
    Object.keys(achievements).forEach(id => {
        if (!achievements[id].unlocked) {
            achievements[id].unlocked = true;
        }
    });
    safeStorage.setItem('mmg-achievements', JSON.stringify(achievements));
    renderAchievements();
    updateShopLocksAndSelection();
}

function renderAchievements() {
    const container = document.getElementById('achievements-list');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(achievements).forEach(([id, ach]) => {
        let progressValue = 0;
        if (id === 'loopMaster') {
            progressValue = Math.max(0, ...Object.values(ach.progress).map(Number)) / ach.goal;
        } else if (id === 'retroPlayer' || id === 'psPlayer' || id === 'spotimonFan' || id === 'doubleScreen') { // NOUVEAU: Ajout de spotimonFan et doubleScreen
            progressValue = ach.progress.length / ach.goal;
        } else if (id === 'patienceIsKey') {
            progressValue = ach.progress / ach.goal;
        }
        progressValue = Math.min(1, progressValue) * 100;

        const iconHtml = ach.icon.startsWith('fab')
            ? `<i class="${ach.icon}"></i>`
            : `<i class="fas ${ach.icon}"></i>`;

        const item = document.createElement('div');
        item.className = `achievement-item ${ach.unlocked ? 'unlocked' : ''}`;
        item.innerHTML = `
                <div class="achievement-icon">${iconHtml}</div>
                <div class="achievement-details">
                    <h4>${getTranslation(`achievement_${id}_title`)}</h4>
                    <p>${getTranslation(`achievement_${id}_desc`)}</p>
                    ${!ach.unlocked ? `
                    <div class="achievement-progress-bar">
                        <div class="achievement-progress-fill" style="width: ${progressValue}%"></div>
                    </div>` : ''}
                </div>
            `;
        container.appendChild(item);
    });
}

// NOUVEAU: Fonction pour vérifier si l'application est installée (mode standalone)
function checkPwaUnlock() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
        updateAchievementProgress('pwaInstall', 1);
    }
}



function toggleLike(itemId) {
    playAudio(sounds.select);
    if (likedSongs.has(itemId)) {
        likedSongs.delete(itemId);
    } else {
        likedSongs.add(itemId);
    }
    safeStorage.setItem('mmg-likedSongs', JSON.stringify([...likedSongs]));
    updateLikeButtonUI(itemId);

    // CORRECTION: Si on est dans la bibliothèque, on la met à jour
    // au lieu de toujours rediriger vers l'onglet "Likes".
    if (document.getElementById('library-section').classList.contains('hidden') === false) {
        // On trouve l'onglet actuellement actif et on le rafraîchit.
        const activeTab = document.querySelector('#library-tabs-container .playlist-tab-btn.active');
        renderLibraryPage(activeTab ? activeTab.dataset.tabId : 'liked');
    }
    // Mettre à jour dynamiquement les cartes du tableau de bord
    if (document.getElementById('home-dashboard-section').classList.contains('hidden') === false) {
        renderDashboard();
    }
}

function updateLikeButtonUI(itemId) {
    const playerLikeBtn = document.getElementById('player-like-btn');
    if (!playerLikeBtn || !currentPlayingItem || currentPlayingItem.id !== itemId) return;
    const isLiked = likedSongs.has(itemId);

    // NOUVEAU: Mettre à jour le bouton like du lecteur mobile
    const mobilePlayerLikeBtn = document.getElementById('mobile-player-like-btn');
    const miniPlayerLikeBtn = document.getElementById('mini-player-like-btn');

    const updateBtn = (btn) => {
        if (!btn) return;
        btn.classList.toggle('active', isLiked);
        btn.classList.toggle('fas', isLiked);
        btn.classList.toggle('far', !isLiked);
    };

    updateBtn(playerLikeBtn);
    updateBtn(mobilePlayerLikeBtn);
    updateBtn(miniPlayerLikeBtn);
}

function togglePlaylistItem(itemId) {
    const itemIndex = currentPlaylist.indexOf(itemId);

    if (itemIndex > -1) {
        currentPlaylist.splice(itemIndex, 1);
        showDialog(getTranslation("titleRemovedPlaylist"));
        playAudio(sounds.back);
    } else {
        currentPlaylist.push(itemId);
        showDialog(getTranslation("titleAddedPlaylist"));
        playAudio(sounds.select);
    }

    safeStorage.setItem('mmg-playlist', JSON.stringify(currentPlaylist));
    renderPlaylist();

    // CORRECTION : Si la bibliothèque est ouverte sur l'onglet "Ma playlist", on la rafraîchit.
    const librarySectionVisible = !document.getElementById('library-section').classList.contains('hidden');
    const myPlaylistTabActive = document.querySelector('#library-tabs-container .playlist-tab-btn[data-tab-id="current"]')?.classList.contains('active');
    if (librarySectionVisible && myPlaylistTabActive) {
        renderLibraryPage('current');
    }

    updatePlayerPlaylistButtonUI(itemId); // NOUVEAU: Mettre à jour l'icône du lecteur
}

// NOUVEAU: Logique pour la file d'attente
function addToQueue(itemId) {
    if (!userQueue.includes(itemId)) {
        userQueue.push(itemId);
        showDialog(`"${findItemById(itemId).title}" ${getTranslation('addedToQueue')}`);
        updateAllQueueViews(); // CORRECTION: Met à jour toutes les vues de la file d'attente
        playAudio(sounds.select);
    }
}

function playNext(itemId) {
    // Si rien ne joue, on lance la lecture depuis la file utilisateur
    if (!currentPlayingItem) {
        playVideoWhenReady(findItemById(itemId), [], -1, 'queue'); // Explicitly from queue
        return;
    }

    // Retire le titre s'il est déjà dans la file d'attente pour éviter les doublons
    const existingIndex = userQueue.indexOf(itemId);
    if (existingIndex > -1) {
        userQueue.splice(existingIndex, 1);
    }

    // Si le titre actuel est dans la file utilisateur, on insère après.
    const currentPlayingIndexInUserQueue = userQueue.indexOf(currentPlayingItem.id);
    if (currentPlayingIndexInUserQueue > -1) {
        userQueue.splice(currentPlayingIndexInUserQueue + 1, 0, itemId);
    } else {
        // Sinon, on l'ajoute simplement au début de la file d'attente à venir.
        // Cela signifie qu'il sera le prochain titre joué après celui en cours.
        userQueue.unshift(itemId);
    }

    showDialog(`"${findItemById(itemId).title}" ${getTranslation('playNext')}.`);
    updateAllQueueViews(); // CORRECTION: Met à jour toutes les vues de la file d'attente
    playAudio(sounds.select);
}

// NOUVEAU: Fonction pour afficher la file d'attente
function renderQueue() {
    const container = document.getElementById('queue-container');
    const subtitle = document.getElementById('queue-context-subtitle');
    if (!container || !subtitle) return;

    // La file d'attente visible est TOUJOURS la userQueue.
    // On affiche les titres qui viennent après celui en cours s'il est dans la userQueue,
    // sinon on affiche toute la userQueue.
    const currentPlayingIndexInUserQueue = currentPlayingItem ? userQueue.indexOf(currentPlayingItem.id) : -1;
    let upcomingTracks = [];

    if (currentPlayingIndexInUserQueue > -1) {
        // Si le titre en cours est dans la file utilisateur, on affiche ce qui suit
        upcomingTracks = userQueue.slice(currentPlayingIndexInUserQueue + 1);
    } else {
        // Sinon, on affiche toute la file utilisateur comme "à venir"
        upcomingTracks = userQueue;
    }

    // Mettre à jour le sous-titre de contexte
    let contextText = '';
    if (currentPlayingItem) {
        const prefix = getTranslation('nowPlayingFrom');
        switch (currentPlaybackContext.type) { // Use currentPlaybackContext to show where the current track is from
            case 'album':
            case 'playlist':
            case 'mmgPlaylist':
                contextText = `${prefix} <strong>${currentPlaybackContext.name}</strong>`;
                break;
            case 'liked':
                contextText = `${prefix} <strong>${getTranslation('likedTitles')}</strong>`;
                break;
            case 'search':
                contextText = `${prefix} <strong>${getTranslation('searchResults')}</strong>`;
                break;
            case 'video':
                contextText = `${prefix} <strong>${getTranslation('videos')}</strong>`;
                break;
            case 'selection': // Queue
                contextText = `${prefix} <strong>${getTranslation('queue')}</strong>`;
                break;
            default:
                contextText = `${prefix} <strong>${getTranslation('titles')}</strong>`;
                break;
        }
    }
    subtitle.innerHTML = contextText;

    if (upcomingTracks.length === 0) {
        container.innerHTML = `<p style="text-align: center; padding: 20px 0;">Aucun titre à venir.</p>`;
        return;
    }

    container.innerHTML = '';
    upcomingTracks.forEach((itemId, index) => {
        const item = findItemById(itemId);
        if (!item) return;

        const queueItem = document.createElement('div');
        queueItem.className = 'playlist-item queue-item'; // Réutilise le style de playlist-item
        queueItem.dataset.itemId = itemId;
        queueItem.draggable = true;
        // NOUVEAU: Ajout d'un index pour faciliter la réorganisation
        queueItem.dataset.index = index;

        const isCurrentlyPlaying = currentPlayingItem && currentPlayingItem.id === itemId;
        if (isCurrentlyPlaying) {
            queueItem.classList.add('currently-playing');
        }

        queueItem.innerHTML = `
                <i class="fas fa-bars playlist-drag-handle" title="Réorganiser"></i>
                <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}">
                <div class="playlist-item-info">
                    <p class="playlist-item-title">${item.title}</p>
                    <p class="playlist-item-subtitle">${item.year || 'Vidéo'}</p>
                </div>
                ${isCurrentlyPlaying ? '<span class="currently-playing-indicator"><i class="fas fa-volume-up"></i></span>' : ''}
            `;

        // Gestion du clic pour sauter à ce titre (facultatif mais pratique)
        queueItem.addEventListener('click', (e) => {
            if (!e.target.closest('.playlist-drag-handle')) {
                // On joue directement depuis la userQueue
                const itemToPlay = findItemById(itemId);
                const startIndex = userQueue.indexOf(itemId);
                playVideoWhenReady(itemToPlay, userQueue, startIndex, 'queue');
            }
        });
        container.appendChild(queueItem);
    });
}

function renderPlaylist(options = {}) {
    const { openRecommendedPlaylist = null } = options;

    const overlay = document.getElementById('playlist-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;

    const tabsContainer = document.getElementById('playlist-tabs-container');
    const headerActions = document.getElementById('playlist-header-actions');
    const listContainer = document.getElementById('playlist-container');
    const titleElement = document.getElementById('playlist-overlay-title');
    const clearBtn = document.getElementById('clear-playlist-btn');
    // CORRECTION: Ensure elements exist before continuing
    if (!overlay || !tabsContainer || !listContainer || !titleElement || !clearBtn) return;

    // 1. Rendre les onglets
    let tabsHtml = `<button class="playlist-tab-btn active" data-playlist-id="custom">Ma Playlist</button>`;
    tabsHtml += Object.keys(savedPlaylists).map(name =>
        `<button class="playlist-tab-btn" data-playlist-id="${name}">${name}</button>`
    ).join('');
    tabsContainer.innerHTML = tabsHtml;

    // 2. Déterminer la playlist active
    const activeTab = tabsContainer.querySelector('.playlist-tab-btn.active');
    const activePlaylistId = activeTab.dataset.playlistId;

    let itemsToShow = [];
    let isCustomPlaylist = false;

    if (activePlaylistId === 'custom') {
        itemsToShow = currentPlaylist;
        titleElement.textContent = "Ma Playlist";
        isCustomPlaylist = true;
    } else {
        itemsToShow = savedPlaylists[activePlaylistId] || [];
        titleElement.textContent = activePlaylistId;
        isCustomPlaylist = false;
    }

    // 3. Afficher/cacher le bouton de suppression
    clearBtn.style.display = isCustomPlaylist ? 'flex' : 'none';

    // 4. Rendre la liste des titres
    if (itemsToShow.length === 0) {
        listContainer.innerHTML = `<p>${getTranslation("playlistEmpty")}</p>`;
        return;
    }

    listContainer.innerHTML = '';
    itemsToShow.forEach((itemId, index) => {
        const item = findItemById(itemId);
        if (!item) return;

        const isCurrentlyPlaying = currentPlayingItem && currentPlayingItem.id === itemId;
        const playlistItem = document.createElement('div');
        playlistItem.className = `playlist-item ${isCurrentlyPlaying ? 'currently-playing' : ''}`;
        playlistItem.dataset.itemId = itemId;
        playlistItem.draggable = isCustomPlaylist; // Draggable only if it's the custom playlist

        const dragHandle = isCustomPlaylist ? '<i class="fas fa-bars playlist-drag-handle"></i>' : '<span class="playlist-drag-handle-placeholder"></span>';
        const deleteButton = isCustomPlaylist ? `<button class="playlist-item-delete" title="${getTranslation("deleteFromPlaylist")}"><i class="fas fa-trash-alt"></i></button>` : '';

        playlistItem.innerHTML = `
                ${dragHandle}
                <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}">
                <div class="playlist-item-info">
                    <p class="playlist-item-title">${item.title}</p>
                    <p class="playlist-item-subtitle">${item.year || 'Vidéo'}</p>
                </div>
                ${deleteButton}
                ${isCurrentlyPlaying ? '<span class="currently-playing-indicator"><i class="fas fa-volume-up"></i></span>' : ''}
            `;
        listContainer.appendChild(playlistItem);
    });
}

// =========================================================
// PWA INSTALLATION LOGIC
// =========================================================

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
});

function showPwaInstallPrompt(force = false) {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (force && isStandalone) {
        return;
    }

    if ((deferredPrompt || force) && !isStandalone) {
        const pwaOverlay = document.getElementById('pwa-install-overlay');
        if (pwaOverlay) {
            pwaOverlay.classList.remove('hidden');

            // Gestion de la visibilité du bouton d'installation
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) {
                installBtn.style.display = ''; // Toujours afficher le bouton pour éviter la confusion
            }
        }
    } else {

    }
}


// =========================================================
// UI & GENERAL FUNCTIONS
// =========================================================
function playAudio(audioElement, force = false) {
    if ((!sfxEnabled && !force) || !audioElement) return;

    audioElement.currentTime = 0;
    audioElement.play().catch(error => { });
}

/*
 * NOUVEAU: Met à jour la position de l'indicateur de glissement pour un conteneur d'onglets donné.
 * @param {HTMLElement} tabsContainer - Le conteneur des onglets (ex: .profile-switch).
 */
function updateSlidingIndicator(tabsContainer) {
    if (!tabsContainer || !tabsContainer.classList.contains('sliding-tabs')) return;

    const activeButton = tabsContainer.querySelector('.active');
    if (!activeButton) {
        // S'il n'y a pas de bouton actif, on cache l'indicateur
        tabsContainer.style.setProperty('--indicator-width', '0px');
        return;
    }

    const containerRect = tabsContainer.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    // Calcule la position 'left' de l'indicateur par rapport au conteneur
    const indicatorLeft = buttonRect.left - containerRect.left;
    const indicatorWidth = buttonRect.width;

    tabsContainer.style.setProperty('--indicator-left', `${indicatorLeft}px`);
    tabsContainer.style.setProperty('--indicator-width', `${indicatorWidth}px`);
}

function getTranslation(key, replacements = {}) {
    let translation = translations[currentLang][key] || translations['en'][key] || `[${key}]`;
    for (const placeholder in replacements) {
        translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return translation;
}

function applyLanguage(lang) {
    currentLang = lang;
    safeStorage.setItem('mmg-lang', lang);

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        const translation = getTranslation(key);
        if (el.placeholder) el.placeholder = translation;
        else el.textContent = translation;
    });

    document.querySelectorAll('[data-lang-title]').forEach(el => {
        const key = el.dataset.langTitle;
        el.title = getTranslation(key);
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // NOUVEAU: Force la mise à jour du bonus quotidien pour la traduction dynamique
    renderDailyBonusProgress();

    if (currentPlayingItem) {
        updateMp3PlayerInfo(currentPlayingItem);
    } else {
        resetMiniPlayerUI();
    }

    // Re-render la vue actuelle
    if (currentViewContext.type) {
        const activeProfile = document.querySelector('.profile-tab.active')?.dataset.project;
        const profileContent = siteData.contentData[activeProfile]; // Use profileContent
        switch (currentViewContext.type) {
            // NOUVEAU: Gère la traduction du tableau de bord (carrousel, etc.)
            case 'home': // CORRECTION: Utilise le type de contexte défini dans handleMenuNavigation
                renderDashboard();
                break;
            case 'titles':
                const titlesForAlbum = Object.fromEntries(Object.entries(profileContent.titles).filter(([_, title]) => title.albumId === currentViewContext.data));
                renderCards('titles-cards', titlesForAlbum, 'title', false); // Pas d'animation
                break;
            // NOUVEAU: Gère la traduction de la page de détails d'un titre.
            case 'music-details':
                const item = findItemById(currentViewContext.data);
                if (item) renderMusicTitleDetails(item);
                break;
            case 'liked':
                handleMenuNavigation('liked-titles-section', false); // La fonction gère déjà la traduction
                break;
            // NOUVEAU: Ajout du cas manquant pour la bibliothèque
            case 'library':
                handleMenuNavigation('library-section', false, currentViewContext); // CORRECTION: Passe l'objet de contexte complet
                break;
            case 'search':
                updateVisibleCards(currentViewContext.data, false); // Pas d'animation
                break;
            case 'albums':
                handleMenuNavigation('albums-section', false); // La fonction gère déjà la traduction
                break;
            // Ajouter d'autres cas si nécessaire
        }
    }

    // NOUVEAU: Met à jour le titre du header mobile immédiatement pour refléter la nouvelle langue
    const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id;
    if (currentSectionId) {
        updateMobileHeader(currentSectionId);
    }

    // Re-render les overlays ouverts qui nécessitent une traduction
    const shopSection = document.getElementById('shop-section');
    if (shopSection && !shopSection.classList.contains('hidden')) {
        renderShopPage(undefined, false); // Pas d'animation
    }
    // Ajouter d'autres overlays si nécessaire
}

function renderShopPage(activeTabId = 'themes', animate = true) { // Render shop page
    // Initialise les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    updateCoinDisplay();

    // D'abord on génère le contenu des grilles
    renderShopItems(animate);

    // Ensuite on génère les onglets et on affiche le bon
    renderShopTabs(activeTabId);
    showShopTab(activeTabId);

    // NOUVEAU: Applique la logique de défilement aux titres des produits de la boutique.
    setupTitleScrollObserver('.shop-product-title > span');
}

// NOUVEAU: Fonction pour générer les onglets de la boutique
function renderShopTabs(activeTabId) {
    const container = document.getElementById('shop-tabs-container');
    if (!container) return;

    // Vérifie s'il y a des titres à débloquer pour afficher l'onglet "Titres"
    const lockedTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable && !unlockedDreamSeasonTracks.includes(t.id));

    const tabs = [
        { id: 'themes', labelKey: 'shopThemes' },
        { id: 'backgrounds', labelKey: 'shopBackgrounds' }
    ];

    if (lockedTracks.length > 0) {
        tabs.push({ id: 'tracks', labelKey: 'titles' });
    }

    container.innerHTML = tabs.map(tab =>
        `<button class="playlist-tab-btn ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">${getTranslation(tab.labelKey)}</button>`
    ).join('');

    container.classList.add('sliding-tabs');
    setTimeout(() => updateSlidingIndicator(container), 0);

    container.querySelectorAll('.playlist-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playAudio(sounds.select);
            const tabId = btn.dataset.tabId;

            // Mise à jour visuelle des onglets
            container.querySelectorAll('.playlist-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateSlidingIndicator(container);

            // Affichage du contenu
            showShopTab(tabId);
        });
    });
}

// NOUVEAU: Fonction pour afficher le contenu de l'onglet actif
function showShopTab(tabId) {
    ['themes-container', 'backgrounds-container', 'shop-tracks-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const targetId = tabId === 'tracks' ? 'shop-tracks-container' : `${tabId}-container`;
    const target = document.getElementById(targetId);
    if (target) target.classList.remove('hidden');
}

function renderShopItems(animate = true) {
    const themesContainer = document.getElementById('themes-container');
    const backgroundsContainer = document.getElementById('backgrounds-container');
    const tracksContainer = document.getElementById('shop-tracks-container'); // NOUVEAU
    if (!themesContainer || !backgroundsContainer || !siteData.shopItems) return;

    const { backgrounds, themes } = siteData.shopItems;

    // --- Filtre des thèmes pour cacher les thèmes secrets ---
    const visibleThemes = themes.filter(theme => !theme.isSecret);

    // --- Rendu des Fonds d'écran ---

    backgroundsContainer.innerHTML = backgrounds.map(item => {
        // NOUVEAU: Restriction du fond "Icons" au thème "Default"
        const currentUiTheme = safeStorage.getItem('ui-theme') || 'default';

        // NOUVEAU: Restriction pour tous les fonds d'écran si le thème n'est pas "default"
        // (Sauf si le fond est le fond par défaut lui-même)
        const isRestricted = currentUiTheme !== 'default' && item.id !== 'bg-default-theme';

        const isPurchased = item.id === 'bg-default-theme' || purchasedShopItems.has(item.id) || item.cost === 0;
        // CORRECTION: La valeur par défaut pour la sélection est maintenant 'bg-default-theme'.
        const selectedBg = safeStorage.getItem('bg-theme') || 'bg-default-theme';
        const isSelected = selectedBg === item.id;

        let statusBadge = '';
        let cardClasses = 'shop-product-card card';
        if (animate) cardClasses += ' animated';
        let actionHtml = '';

        if (isRestricted) {
            cardClasses += ' locked';
            // NOUVEAU: Badge "Default Theme Only"
            statusBadge = `<div class="card-status-badge locked" style="font-size: 0.6em;">DEFAULT THEME ONLY</div>`;
        } else if (isSelected) {
            cardClasses += ' selected';
            statusBadge = `<div class="card-status-badge active">ACTIVE</div>`;
        } else if (isPurchased) {
            // Débloqué et sélectionnable (pas de badge ou bouton nécessaire, la carte est cliquable)
        } else {
            // NOUVEAU: Prix sur la carte, PAS de bouton panier (clic sur la carte)
            // Ajout de l'icône de cadenas pour un look "Débloquer" plus clair
            statusBadge += `<div class="card-price-badge"><i class="fas fa-lock" style="font-size: 0.8em; opacity: 0.7;"></i> ${item.cost} ${COIN_SVG}</div>`;
            cardClasses += ' buyable'; // Marqueur pour le clic
        }

        // Utilise la clé de langue si elle existe, sinon le nom direct
        const itemName = item.nameKey ? getTranslation(item.nameKey) : item.name;

        return `
                <div class="${cardClasses}" data-item-id="${item.id}" data-theme="${isPurchased && !isRestricted ? item.id : ''}">
                    <div class="card-image-container">
                        <img src="${item.image}" alt="Aperçu de ${itemName}" class="card__image">
                        ${statusBadge}
                    </div>
                    <div class="card-info-container">
                        <div class="card__text">
                            <p class="card__title shop-product-title"><span>${itemName}</span></p>
                        </div>
                        ${actionHtml}
                    </div>
                </div>`;
    }).join('');

    // --- Rendu des Thèmes ---
    themesContainer.innerHTML = visibleThemes.map(item => {
        const isPurchased = purchasedShopItems.has(item.id);
        const isUnlocked = (!item.missionId && !item.isSpecialLock) || (item.missionId && achievements[item.missionId] && achievements[item.missionId].unlocked) || isPurchased;
        const isSelected = (safeStorage.getItem('ui-theme') || 'default') === item.id;
        const itemName = item.nameKey ? getTranslation(item.nameKey) : item.name;

        let currentProgress = 0;
        let goal = 1;
        let missionDesc = "";

        if (item.missionId) {
            const ach = achievements[item.missionId];
            goal = ach.goal || 1;
            if (item.missionId === 'loopMaster') {
                currentProgress = Math.max(0, ...Object.values(ach.progress).map(Number));
            } else if (['retroPlayer', 'psPlayer', 'spotimonFan', 'doubleScreen'].includes(item.missionId)) {
                currentProgress = ach.progress.length;
            } else if (ach.unlocked) {
                currentProgress = goal;
            } else if (ach.progress !== undefined && typeof ach.progress === 'number') {
                currentProgress = ach.progress;
            }
            missionDesc = getTranslation(`achievement_${item.missionId}_desc`);
        } else {
            currentProgress = 1;
            goal = 1;
            missionDesc = getTranslation('themeUnlocked');
        }

        const percentage = Math.min(100, Math.round((currentProgress / goal) * 100));

        let rowClasses = "theme-row-premium";
        if (isSelected) rowClasses += " selected";
        if (!isUnlocked) rowClasses += " locked";
        if (animate) rowClasses += " animated";

        return `
            <div class="${rowClasses}" data-item-id="${item.id}" data-theme="${isUnlocked ? item.id : ''}" data-mission-id="${item.missionId || ''}">
                <!-- Vignette à gauche -->
                <div class="theme-thumb-box" style="background-image: url('${item.image || 'assets/shopthemepreviews/Preview-default.webp'}');">
                    ${!isUnlocked ? `
                    <div class="lock-status">
                        <i data-lucide="lock"></i>
                    </div>` : ''}
                </div>

                <!-- Infos à droite -->
                <div class="theme-content">
                    <div class="theme-header">
                        <span class="theme-title">${itemName}</span>
                        <span class="progression-pct">${percentage}%</span>
                    </div>
                    
                    <p class="mission-text">${missionDesc}</p>
                    
                    <!-- Barre de progression -->
                    <div class="progress-container">
                        <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // --- NOUVEAU: Rendu des Titres Exclusifs (Bloqués) ---
    if (tracksContainer) {
        // CORRECTION: On vide d'abord le conteneur pour éviter que les anciens éléments restent si tout est débloqué
        tracksContainer.innerHTML = '';

        const lockedTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable && !unlockedDreamSeasonTracks.includes(t.id));

        if (lockedTracks.length > 0) {
            tracksContainer.innerHTML = lockedTracks.map(item => {
                let trackCardClasses = 'shop-product-card card locked buyable'; // Ajout de buyable
                if (animate) trackCardClasses += ' animated';
                // Suppression du bouton d'achat, la carte est cliquable
                return `
                    <div class="${trackCardClasses}" data-item-id="${item.id}"> <!-- ID du titre -->
                        <div class="card-image-container">
                            <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}" class="card__image">
                            <div class="card-price-badge"><i class="fas fa-lock" style="font-size: 0.8em; opacity: 0.7;"></i> ${COIN_COST_UNLOCK} ${COIN_SVG}</div>
                        </div>
                        <div class="card-info-container">
                            <div class="card__text">
                                <p class="card__title shop-product-title"><span>${item.title}</span></p>
                            </div>
                        </div>
                    </div>`;
            }).join('');
        }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}


// NOUVEAU: Met à jour la couleur de la barre de statut/navigation d'Android
// NOUVEAU: Met à jour la couleur de la barre de statut/navigation d'Android
function updateThemeColorMeta() {
    const isDark = document.body.classList.contains('dark-theme');
    const statusBarMeta = document.querySelector('meta[name="theme-color"]');
    const navBarMeta = document.querySelector('meta[name="navigation-bar-color"]');

    let themeColor = isDark ? '#1f2937' : '#ffffff';
    let navColor = isDark ? '#1f2937' : '#ffffff';

    if (document.body.classList.contains('theme-playstation')) {
        themeColor = '#002d5c'; /* Correspond à la Top Bar PS3 */
        navColor = '#002d5c';
    } else if (document.body.classList.contains('theme-music-studio')) {
        themeColor = '#3a4149'; /* Correspond au haut du rack VST */
        navColor = '#252a30'; /* Correspond au bas du rack VST */
    } else if (document.body.classList.contains('theme-spotimon')) {
        themeColor = '#000000'; /* Fond noir pur pour Spotimon */
        navColor = '#ffffff';
    } else if (document.body.classList.contains('theme-16bit')) {
        themeColor = '#cceeff'; /* Haut du dégradé Aero */
        navColor = '#ffffff';
    } else if (document.body.classList.contains('theme-ds')) {
        themeColor = '#e2e8f0';
        navColor = '#ffffff';
    } else if (document.body.classList.contains('theme-default-2')) {
        themeColor = '#ffffff';
        navColor = '#f8f9fa';
    }

    if (statusBarMeta) {
        statusBarMeta.setAttribute('content', themeColor);
    }

    if (navBarMeta) {
        navBarMeta.setAttribute('content', navColor);
    }
}

let activeOverlay = null;

function openOverlay(overlay, sound, keepMusicPlaying = false) {
    if (activeOverlay === overlay) return;

    if (!keepMusicPlaying) {
        pausedForOverlay = (activePlayer && typeof activePlayer.getPlayerState === 'function' && activePlayer.getPlayerState() === YT.PlayerState.PLAYING);
        if (pausedForOverlay) {
            activePlayer.pauseVideo();
        }
    }

    if (activeOverlay) { // If there's an active overlay, hide it
        activeOverlay.classList.add('hidden');
    }

    // NOUVEAU: Logique pour les panneaux inférieurs sur mobile
    const isMobile = window.innerWidth <= 952;
    const settingsCard = overlay.querySelector('.settings-card');

    activeOverlay = overlay;
    activeOverlay.classList.remove('hidden');

    if (isMobile && settingsCard) {
        // Force un reflow pour que la transition CSS s'applique
        void settingsCard.offsetWidth;
        settingsCard.style.transform = 'translateY(0)';
    }

    if (sound) playAudio(sound);

    if (overlay.id === 'settings-overlay') {
        updateViewSwitcherUI();
        // NOUVEAU: Génère les icônes Lucide si elles ne le sont pas encore
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    if (overlay.id === 'playlist-overlay') {
        renderPlaylist();
    }

    if (overlay.id === 'queue-overlay') {
        renderQueue();
    }

    if (overlay.id === 'wifi-overlay') {
        playAudio(sounds.connecting, true);
        sounds.connecting.onended = () => {
            if (activeOverlay && activeOverlay.id === 'wifi-overlay') { // If wifi overlay is active
                closeOverlay(sounds.back);
                updateAchievementProgress('patienceIsKey');
                showDialog(getTranslation("connectionSuccess"));
            }
        };
    }
}

function closeOverlay(sound) {
    if (!activeOverlay) return;

    // CORRECTION: Sauvegarder une référence à l'overlay actuel avant de le modifier.
    const overlayToClose = activeOverlay;

    // NOUVEAU: Logique d'animation de fermeture pour les panneaux
    const isMobile = window.innerWidth <= 952;
    const settingsCard = overlayToClose.querySelector('.settings-card');

    // CORRECTION: Applique l'animation de glissement uniquement aux panneaux, et non à toutes les modales sur mobile.
    if (isMobile && settingsCard && overlayToClose.id !== 'wifi-overlay' && overlayToClose.id !== 'purchase-confirm-overlay') {
        settingsCard.style.transform = 'translateY(100%)';
        // Attend la fin de l'animation avant de cacher l'overlay
        setTimeout(() => {
            overlayToClose.classList.add('hidden');
        }, 400); // Doit correspondre à la durée de la transition CSS
    } else {
        overlayToClose.classList.add('hidden');
    }

    // CORRECTION: Utiliser la référence sauvegardée (overlayToClose) pour les vérifications.
    const wasPlayerOptionsOverlay = overlayToClose.id === 'player-options-overlay';
    const keepMusicPlaying = overlayToClose.id === 'tags-filter-overlay' || (overlayToClose.id === 'tutorial-overlay' && !isTutorialActive);
    if (overlayToClose.id === 'wifi-overlay' && sounds.connecting) {
        sounds.connecting.pause();
        sounds.connecting.currentTime = 0;
        sounds.connecting.onended = null;
    }

    // CORRECTION: Réinitialiser la variable globale activeOverlay à la fin.
    activeOverlay = null;

    if (sound) playAudio(sound);

    if (!keepMusicPlaying) {
        if (pausedForOverlay) {
            if (activePlayer) {
                isResumingFromOverlay = true;
                activePlayer.playVideo();
            }
        }
    }
    pausedForOverlay = false;
}

/**
 * Récupère le chemin de l'image pour un élément, en choisissant la taille appropriée.
 * @param {object} item - L'objet de l'élément (titre, album, etc.).
 * @param {'thumb' | 'full'} size - La taille de l'image souhaitée ('thumb' pour la vignette, 'full' pour la taille réelle).
 * @returns {string} Le chemin de l'image.
 */
function getCorrectImagePath(item, size = 'full') {
    if (!item || !item.image) {
        return 'https://placehold.co/200x120/9E9E9E/FFFFFF?text=No+Image';
    }

    // CORRECTION: La logique est ajustée pour utiliser le sous-dossier /thumb/ ET le suffixe _thumb pour les vignettes.
    if (size === 'thumb') {
        const originalPath = item.image;
        const pathParts = originalPath.split('/');
        if (pathParts.length > 1) {
            const originalFilename = pathParts.pop(); // "Pochette-XYZ.webp"
            const basePath = pathParts.join('/');     // "assets/pochettes"

            const filenameParts = originalFilename.split('.');
            if (filenameParts.length > 1) {
                const name = filenameParts.slice(0, -1).join('.'); // "Pochette-XYZ"
                // Force l'extension .webp pour les miniatures
                const thumbFilename = `${name}_thumb.webp`;
                return `${basePath}/thumb/${thumbFilename}`;
            }
        }
    }
    return item.image; // Retourne l'image principale pour 'full' ou en cas d'échec
}

function renderCards(containerId, cardsData, cardType = 'generic', animate = true) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    // Réinitialiser les styles qui pourraient être ajoutés pour le message vide
    container.style.display = '';
    container.style.alignItems = '';
    container.style.justifyContent = '';
    container.style.height = '';

    // CORRECTION: Utiliser un DocumentFragment pour améliorer les performances de rendu et éviter les bugs d'affichage.
    const fragment = document.createDocumentFragment();

    // MODIFICATION: Affiche un message différent si la section est vide par design vs. pas de résultats de recherche.
    if (Object.keys(cardsData).length === 0) {
        const isSearchResult = containerId === 'search-results-cards';
        // CORRECTION: Vider les en-têtes de liste s'il n'y a pas de résultats
        const header = document.querySelector(`[data-header-for="${containerId}"]`);
        if (header) {
            header.innerHTML = '';
            header.classList.add('hidden');
        }

        const isLikedEmpty = containerId === 'liked-titles-cards';
        const emptyMessageKey = (isSearchResult || isLikedEmpty) ? 'noResults' : 'workInProgress';

        // Modifier le conteneur pour centrer le message
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.height = '100%';
        container.innerHTML = `<p style="font-size: 1.2em; opacity: 0.7; white-space: nowrap;">${getTranslation(emptyMessageKey)}</p>`;
        return;
    }

    // CORRECTION: On détermine la vue à utiliser en se basant sur le localStorage.
    // C'est la source de vérité unique pour le rendu.
    const globalView = localStorage.getItem('mmg-global-view') || 'grid';
    // CORRECTION: La vue "album" est toujours en grille.
    const isListView = cardType === 'album' ? false : globalView === 'list';

    // NOUVEAU: Gérer l'affichage de l'en-tête de la liste
    // On applique la traduction directement ici pour éviter les boucles d'appel.
    const header = document.querySelector(`[data-header-for="${containerId}"]`);
    if (header) {
        if (isListView) {
            header.classList.remove('hidden');
            header.innerHTML = `
                    <div class="whitespace-nowrap">#</div>
                    <div></div> <!-- CORRECTION: Ajout d'un div vide pour la colonne de l'image -->
                    <div class="whitespace-nowrap" data-lang-key="titles">${getTranslation('titles')}</div> 
                    <div class="whitespace-nowrap list-view-artist-col">${getTranslation('titleAndArtist').split(' & ')[1] || 'Artiste'}</div>
                    <div class="tags-column whitespace-nowrap list-view-tags-col" data-lang-key="tags">${getTranslation('tags')}</div>
                    <div class="hidden sm:block"></div>
                    <div class="hidden sm:block"></div>`;
        } else {
            header.innerHTML = '';
            header.classList.add('hidden');
        }
    }

    // Maintenant on applique la classe au conteneur en se basant sur la vue qu'on a décidé de rendre.
    container.classList.toggle('list-view', isListView);
    container.classList.toggle('titles-grid', !isListView);

    let delay = 0;

    Object.entries(cardsData).forEach(([key, item], index) => {
        const card = document.createElement('div');
        // MODIFICATION: Ajout des classes VST si le thème est actif
        let cardBaseClass = 'card';
        if (animate) cardBaseClass += ' animated';
        card.className = cardBaseClass;
        card.style.animationDelay = `${delay}s`;
        delay += 0.05;

        const itemId = item.id || key;
        card.dataset.itemId = itemId;

        const isUnlockableAlbum = cardType === 'album' && item.isUnlockableAlbum;
        const tracksInAlbum = isUnlockableAlbum ? Object.values(allSearchableItems).filter(t => t.albumId === item.id && t.isUnlockable) : [];
        const unlockedInAlbum = isUnlockableAlbum ? tracksInAlbum.filter(t => unlockedDreamSeasonTracks.includes(t.id)) : [];

        const isTrackLocked = item.isUnlockable && !unlockedDreamSeasonTracks.includes(itemId);
        const isAlbumLocked = isUnlockableAlbum && unlockedInAlbum.length < tracksInAlbum.length;
        const isLocked = isTrackLocked || isAlbumLocked;

        // NOUVEAU: Les titres verrouillés sont maintenant visibles dans les vues standards (albums, titres)
        // mais avec un état "locked" (géré plus bas).

        if (isLocked) {
            card.classList.add('locked');
            card.classList.add('buyable'); // NOUVEAU: Style Premium Locked (Flou + Sombre) pour TOUS les éléments verrouillés
        }

        // CORRECTION: Assigne une image de remplacement si l'image est nulle ou manquante (cas des playlists recommandées vides).
        // La fonction getCorrectImagePath est appelée uniquement si une image existe.
        // MODIFICATION: On charge la vignette par défaut pour les cartes.
        const imagePath = item.image ? getCorrectImagePath(item, 'thumb') : 'https://placehold.co/200x120/9E9E9E/FFFFFF?text=No+Image';
        const fullImagePath = getCorrectImagePath(item, 'full');
        const activeProfile = document.querySelector('.profile-tab.active')?.dataset.project;
        const translatedTitle = item.langKey ? getTranslation(item.langKey) : item.title;
        const isActionable = (cardType === 'title' || cardType === 'video' || (cardType === 'search' && item.type !== 'album')); // Actionable if it's a playable item
        const isLiked = likedSongs.has(itemId);
        const isInPlaylist = currentPlaylist.includes(itemId);
        const tagsSubtitle = (item.tags && item.tags.length > 0) ? `<p class="card__description">${item.tags.join(', ')}</p>` : '';
        const lockIconHtml = isLocked && cardType !== 'title' && !isAlbumLocked ? ' <i class="fas fa-lock" style="font-size: 0.8em; opacity: 0.7;"></i>' : '';
        const cardTextHtml = `<p class="card__title" title="${translatedTitle.replace(/"/g, '&quot;')}"><span>${translatedTitle}${lockIconHtml}</span></p>${tagsSubtitle}`;

        // NOUVEAU: Bouton d'options intégré à la pochette (comme les cadenas)
        const optionsButtonHtml = isActionable ? `<button class="card-options-badge clickable-icon card-menu-btn" data-item-id="${itemId}" title="${getTranslation('moreActions') || 'Plus d\'actions'}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>` : '';

        let datasetAttributes = ''; // Dataset attributes for the link
        if (cardType === 'title' || cardType === 'video' || cardType === 'search') {
            datasetAttributes = `data-youtube-id="${item.youtube_id}"`;
        } else if (cardType === 'album') {
            datasetAttributes = `data-album-id="${item.id}"`;
        }

        if (isListView && (cardType === 'title' || cardType === 'video' || cardType === 'search')) { // If it's a list view and a playable item
            // NOUVEAU: Structure HTML pour la vue en liste
            const activeProfileData = siteData.contentData[document.querySelector('.profile-tab.active')?.dataset.project || 'mmg-music'];
            const artistName = activeProfileData === siteData.contentData['mmg-music'] ? 'Mmg Music' : 'Mmg Beats'; // CORRECTION: Utilisation du nom de l'artiste pour le filtre
            const tagsHtml = (item.tags && item.tags.length > 0)
                ? `<span class="tag-item" data-action="filter-tag" data-tag="${item.tags[0]}">${item.tags[0]}</span>`
                : '';

            // NOUVEAU: Style Premium Locked pour la vue en liste (Cadenas + Prix)
            const lockIconHtmlList = isLocked ? `
                <div class="list-view-lock-overlay"><i class="fas fa-lock"></i></div>
                <div class="card-price-badge list-badge">
                    <i class="fas fa-lock" style="font-size: 0.8em; opacity: 0.7;"></i> 
                    ${isAlbumLocked ? (item.cost || (tracksInAlbum.length * COIN_COST_UNLOCK)) : COIN_COST_UNLOCK} ${COIN_SVG}
                </div>` : '';

            // CORRECTION: Retour à une structure HTML unique et stable pour la vue en liste.
            // MODIFICATION: Remplacement des boutons like/add par le menu trois points
            card.innerHTML = `
                        <div class="list-view-index-container">
                            <span class="list-view-index text-sub-text-color text-sm">${index + 1}</span>
                            <div class="list-view-equalizer">
                                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                            </div>
                        </div>
                        <div class="list-view-image-container">
                            <img src="${imagePath}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fullImagePath}'" alt="Pochette de ${translatedTitle}" class="list-view-item-image"/>
                            ${lockIconHtmlList}
                        </div>
                        <div class="list-view-title">
                            <span class="font-medium text-sm sm:text-base text-text-color">${translatedTitle}</span>
                            ${isAlbumLocked ? `
                                <span class="list-view-unlock-text">
                                    ${getTranslation(unlockedInAlbum.length > 1 ? 'trackToUnlock_many' : 'trackToUnlock_one', { count: tracksInAlbum.length - unlockedInAlbum.length })}
                                </span>
                            ` : ''}
                        </div> 
                        <div class="text-sub-text-color text-xs truncate items-center list-view-artist-col"><span>${artistName}</span></div>
                        <div class="tags-column text-sub-text-color text-xs items-center min-w-0 list-view-tags-col">${tagsHtml}</div>
                        <div class="flex items-center justify-center actions-col">
                            <button class="card-menu-btn clickable-icon" data-item-id="${itemId}" title="${getTranslation('moreActions') || 'Plus d\'actions'}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-icon lucide-ellipsis"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                            </button>
                        </div>
                    `;

            // CORRECTION: La gestion des clics est maintenant plus précise pour éviter les conflits.
            card.addEventListener('click', (e) => {
                const menuBtn = e.target.closest('.card-menu-btn');
                const filterAction = e.target.closest('[data-action="filter-tag"]');
                let isUnlockedNow = false; // NOUVEAU: Variable pour suivre si on vient de débloquer

                // CORRECTION: On vérifie l'état de verrouillage au moment du clic, pas à la création de l'écouteur.
                const isStillLocked = item.isUnlockable && !unlockedDreamSeasonTracks.includes(item.id);

                if (isStillLocked && !menuBtn && !filterAction) {
                    if (userCoins >= COIN_COST_UNLOCK) {
                        userCoins -= COIN_COST_UNLOCK;
                        unlockedDreamSeasonTracks.push(item.id);
                        safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
                        safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));

                        const activeProfile = getActiveProfile();
                        const album = siteData.contentData[activeProfile].albums[item.albumId];
                        showDialog(`${getTranslation('youUnlocked')} "${item.title}"! ${getTranslation('availableInAlbum', { albumTitle: album ? album.title : 'Albums' })}`);
                        playAudio(sounds.coin);
                        updateCoinDisplay();
                        unlockCardUI(item.id); // Appelle la fonction de mise à jour de l'UI
                        renderUpdateLog();
                        updateNotificationDot();
                        isUnlockedNow = true; // NOUVEAU: On indique que le déblocage a eu lieu
                    } else {
                        showDialog(getTranslation('needCoinsToUnlock', { COIN_COST_UNLOCK }));
                        playAudio(sounds.blocked);
                        return; // On arrête ici si pas assez de pièces
                    }
                }

                if (isAlbumLocked && !isUnlockedNow && !menuBtn && !filterAction) {
                    playAudio(sounds.blocked);
                    return;
                }

                if (menuBtn) {
                    e.stopPropagation(); // Empêche le clic de se propager à la carte
                    openCardMenu(e, itemId);
                } else if (filterAction) {
                    e.stopPropagation(); // Empêche le clic de se propager à la carte
                    const tag = filterAction.dataset.tag;
                    document.getElementById('search-input').value = ''; // Vide la recherche
                    // Coche le bon tag dans le filtre
                    document.querySelectorAll('#tags-filter-list input').forEach(cb => cb.checked = cb.value === tag.toLowerCase());
                    // Met à jour les cartes affichées
                    updateVisibleCards();
                } else {
                    // RETOUR À L'ANCIEN COMPORTEMENT : Ouvre la page de détails au lieu de lancer la musique direct.
                    renderMusicTitleDetails(item);
                    showSection('music-title-details-section');
                    currentViewContext = { type: 'music-details', data: item.id };
                }
            });

        } else {
            // Structure HTML existante pour la vue en grille
            const badgeHtml = item.loopable ? `<div class="card__badge">LOOP ME!</div>` : '';
            let cardImageHtml;
            let gridCardTextHtml;

            cardImageHtml = `<img class="card__image" loading="lazy" decoding="async" src="${imagePath}" onerror="this.onerror=null;this.src='${fullImagePath}'" alt="${translatedTitle.replace(/"/g, '&quot;')}">`;

            // CORRECTION: La logique de description est réorganisée pour éviter les écrasements et utiliser le fallback.
            let description = getTranslation('viewContent'); // Valeur par défaut
            switch (cardType) {
                case 'title':
                    // NOUVELLE LOGIQUE DE TRADUCTION :
                    // On cherche la description dans l'objet trackDescriptions. Si non trouvée, on prend celle de data.json.
                    description = translations[currentLang]?.trackDescriptions?.[item.id] || item.description || getTranslation('listenToTitle');
                    break;
                case 'album':
                    if (isUnlockableAlbum) {
                        const lockedCount = tracksInAlbum.length - unlockedInAlbum.length;
                        if (lockedCount > 0) {
                            const langKey = lockedCount === 1 ? 'trackToUnlock_one' : 'trackToUnlock_many';
                            card.classList.add('has-unlockable-text');
                            description = getTranslation(langKey, { count: lockedCount });
                        } else {
                            description = ''; // Ne plus afficher "Voir album"
                        }
                    } else {
                        description = ''; // Ne plus afficher "Voir album"
                    }
                    break;
                case 'video': description = getTranslation('videoLabel'); break;
                case 'bonus': description = getTranslation('videoMakingOf'); break;
                case 'search': // Search results can be albums, titles, or videos
                    if (item.type === 'album') description = '';
                    else if (item.year) description = getTranslation('musicTitle');
                    else if (item.type === 'bonus') description = getTranslation('videoMakingOf');
                    else description = getTranslation('videoLabel');
                    break;
            }
            gridCardTextHtml = `
                        <p class="card__title" title="${translatedTitle.replace(/"/g, '&quot;')}">
                        <span>${translatedTitle}</span>
                        </p>
                        <p class="card__description">${description}</p>
                    `;

            let lockOverlayHtml = '';
            if (isTrackLocked) {
                // Style Premium Locked : Pas de gros cadenas central, juste le badge de prix
                lockOverlayHtml = `<div class="card-price-badge"><i class="fas fa-lock" style="font-size: 0.8em; opacity: 0.7;"></i> ${COIN_COST_UNLOCK} ${COIN_SVG}</div>`;
            } else if (isAlbumLocked) {
                datasetAttributes = `data-unlock-album="${item.id}"`;
                // Pour un album bloqué, on affiche aussi le coût (si défini, sinon juste cadenas)
                const albumCost = item.cost || (tracksInAlbum.length * COIN_COST_UNLOCK);
                lockOverlayHtml = `<div class="card-price-badge"><i class="fas fa-lock" style="font-size: 0.8em; opacity: 0.7;"></i> ${albumCost} ${COIN_SVG}</div>`;
            }

            card.innerHTML = `
                        <a href="#" class="card-link-wrapper" ${datasetAttributes}>
                            <div class="card-image-container">
                                ${lockOverlayHtml}
                                ${badgeHtml}
                                ${cardImageHtml}
                                ${!isLocked ? optionsButtonHtml : ''}
                            </div>
                        </a>
                        <div class="card-info-container">
                            <div class="card__text">${gridCardTextHtml}</div>
                        </div>`;
        }

        // NOUVEAU: Logique pour le menu contextuel (clic droit / appui long)
        if (isActionable) {
            // NOUVEAU: Ajout de l'écouteur pour le bouton de menu en mode grille
            const menuBtn = card.querySelector('.card-menu-btn');
            if (menuBtn) {
                menuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openCardMenu(e, itemId);
                });
            }

            // Clic droit sur ordinateur (Garde la compatibilité mais utilise le nouveau menu)
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                openCardMenu(e, itemId); // Utilise maintenant le même menu que les 3 points
            });

            // Appui long sur mobile (Garde la compatibilité)
            let longPressTimer;
            let touchStartX = 0;
            let touchStartY = 0;

            card.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                longPressTimer = setTimeout(() => {
                    openCardMenu(e, itemId); // Utilise maintenant le même menu que les 3 points
                }, 500); // 500ms pour un appui long
            }, { passive: true });

            const clearLongPress = () => clearTimeout(longPressTimer);
            card.addEventListener('touchend', clearLongPress);
            card.addEventListener('touchcancel', clearLongPress);
            card.addEventListener('touchmove', (e) => {
                const touchEndX = e.touches[0].clientX;
                const touchEndY = e.touches[0].clientY;
                // Annule l'appui long si l'utilisateur commence à faire défiler
                if (Math.abs(touchEndX - touchStartX) > 10 || Math.abs(touchEndY - touchStartY) > 10) {
                    clearLongPress();
                }
            });
        }

        container.appendChild(card);
        fragment.appendChild(card); // Add to fragment
    });

    container.appendChild(fragment); // On ajoute toutes les cartes en une seule fois.

    // CORRECTION: La logique de défilement est maintenant unifiée et appelée pour TOUTES les vues (grille et liste)
    // directement depuis renderCards, ce qui garantit son application à chaque fois que des cartes sont affichées.
    if (isListView) {
        // En mode liste, on cible les <span> à l'intérieur des colonnes qui peuvent déborder.
        // NOUVEAU: Suppression de .channel-title et .channel-meta > span pour le thème VST
        const listSelectors = `#${containerId} .list-view-title > span, #${containerId} .list-view-artist-col > span, #${containerId} .recent-video-item-info .video-title > span`;
        setupTitleScrollObserver(listSelectors);
    } else {
        // En mode grille, on cible les <span> à l'intérieur des titres de carte standards.
        // NOUVEAU: Suppression de .cartridge-label > span pour le thème VST
        const gridSelector = `#${containerId} .card__title > span, #${containerId} .carousel-item-info h3 > span, #${containerId} .recent-video-item-info .video-title > span`;
        setupTitleScrollObserver(gridSelector);
    }
}

// NOUVEAU: Gestion du menu contextuel unifié
let activeCardMenu = null;

function openCardMenu(event, itemId) {
    // Ferme tout menu existant
    closeCardMenu();

    const item = findItemById(itemId);
    if (!item) return;

    const isLiked = likedSongs.has(itemId);
    const isInPlaylist = currentPlaylist.includes(itemId);
    const isMobile = window.innerWidth <= 952; // Seuil mobile
    const activeProfile = getActiveProfile();
    const artistName = siteData.contentData[activeProfile] === siteData.contentData['mmg-music'] ? 'Mmg Music' : 'Mmg Beats';

    if (isMobile) {
        // === VERSION MOBILE : PANNEAU GLISSANT (STYLE PARAMÈTRES) ===

        // NOUVEAU: Joue un son à l'ouverture du panneau
        playAudio(sounds.select);

        // Création de l'overlay principal (qui sert aussi de backdrop)
        const overlay = document.createElement('div');
        overlay.className = 'mobile-card-menu-overlay'; // Nouvelle classe pour le ciblage
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'transparent';
        overlay.style.zIndex = '1199'; // Juste en dessous du panneau
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        overlay.onclick = function (e) { if (e.target === this) closeCardMenu(); };
        document.body.appendChild(overlay);

        // Création du panneau qui utilise les styles de .settings-card
        const panel = document.createElement('div');
        // On combine les classes pour hériter du style de base et ajouter des styles spécifiques
        panel.className = 'settings-card mobile-card-menu-panel';

        // Contenu du panneau
        panel.innerHTML = `
            <div class="mobile-player-handle"></div>
            <button class="close-btn" onclick="closeCardMenu()"><i class="fas fa-times"></i></button>
            <div class="mobile-card-menu-header">
                <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}" class="mobile-card-menu-img">
                <div class="mobile-card-menu-info">
                    <h3 class="mobile-card-menu-title">${item.title}</h3>
                    <p class="mobile-card-menu-artist">${artistName}</p>
                </div>
            </div>
            <div class="mobile-card-menu-items">
                <button class="mobile-card-menu-item" onclick="handleMenuAction('like', '${itemId}', this)">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart ${isLiked ? 'active' : ''}"></i>
                    <span>${isLiked ? (getTranslation('removeLike') || 'Retirer') : (getTranslation('like') || 'Liker')}</span>
                </button>
                <button class="mobile-card-menu-item" onclick="handleMenuAction('playlist', '${itemId}', this)">
                    <i class="fas ${isInPlaylist ? 'fa-check' : 'fa-plus'} ${isInPlaylist ? 'added' : ''}"></i>
                    <span>${getTranslation('playlist') || 'Playlist'}</span>
                </button>
                <button class="mobile-card-menu-item" onclick="handleMenuAction('playNext', '${itemId}', this)">
                    <i class="fas fa-step-forward"></i>
                    <span>${getTranslation('playNext') || 'Suivant'}</span>
                </button>
                <button class="mobile-card-menu-item" onclick="handleMenuAction('queue', '${itemId}', this)">
                    <i class="fas fa-list-ul"></i>
                    <span>${getTranslation('addToQueue')}</span>
                </button>
                <button class="mobile-card-menu-item" onclick="handleMenuAction('share', '${itemId}', this)">
                    <i class="fas fa-share-alt"></i>
                    <span>${getTranslation('share') || 'Partager'}</span>
                </button>
            </div>
        `;

        // Le panneau est ajouté à l'intérieur de l'overlay
        overlay.appendChild(panel);
        activeCardMenu = { overlay, panel, isMobile: true };

        // Animation d'entrée
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });

    } else {
        // === VERSION DESKTOP : DROPDOWN CLASSIQUE ===

        const menu = document.createElement('div');
        menu.className = 'card-menu-dropdown';

        menu.innerHTML = `
            <button class="card-menu-item" onclick="handleMenuAction('like', '${itemId}', this)">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart ${isLiked ? 'active' : ''}"></i>
                <span>${isLiked ? getTranslation('removeLike') : getTranslation('like')}</span>
            </button>
            <button class="card-menu-item" onclick="handleMenuAction('playlist', '${itemId}', this)">
                <i class="fas ${isInPlaylist ? 'fa-check' : 'fa-plus'} ${isInPlaylist ? 'added' : ''}"></i>
                <span>${getTranslation('playlist')}</span>
            </button>
            <button class="card-menu-item" onclick="handleMenuAction('playNext', '${itemId}', this)">
                <i class="fas fa-step-forward"></i>
                <span>${getTranslation('playNext')}</span>
            </button>
            <button class="card-menu-item" onclick="handleMenuAction('queue', '${itemId}', this)">
                <i class="fas fa-list-ul"></i>
                <span>${getTranslation('addToQueue')}</span>
            </button>
        `;

        document.body.appendChild(menu);
        activeCardMenu = menu; // Pour desktop, c'est juste l'élément menu

        // Positionnement (Desktop uniquement)
        let x = event.clientX;
        let y = event.clientY;

        // Ajustement pour ne pas sortir de l'écran
        const menuRect = menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (x + menuRect.width > windowWidth) {
            x = windowWidth - menuRect.width - 10;
        }
        if (y + menuRect.height > windowHeight) {
            y = windowHeight - menuRect.height - 10;
        }

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // Animation d'entrée
        requestAnimationFrame(() => {
            menu.classList.add('visible');
        });

        // Fermeture au clic ailleurs
        setTimeout(() => {
            document.addEventListener('click', closeCardMenuOutside);
        }, 0);
    }
}

function closeCardMenu() {
    if (!activeCardMenu) return;

    if (activeCardMenu.isMobile) {
        // NOUVELLE VERSION MOBILE (style paramètres)
        const { overlay, panel } = activeCardMenu;

        // Lance les animations de sortie
        overlay.style.opacity = '0';
        panel.style.transform = 'translateY(100%)';

        // NOUVEAU: Joue un son à la fermeture du panneau
        playAudio(sounds.back);

        // Supprime l'élément du DOM après la transition
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            activeCardMenu = null;
        }, 400); // Doit correspondre à la durée de la transition CSS

    } else {
        // Version desktop
        if (activeCardMenu.parentNode) {
            document.body.removeChild(activeCardMenu);
        }
        activeCardMenu = null;
    }
}

function closeCardMenuOutside(event) {
    if (activeCardMenu && !activeCardMenu.isMobile && !activeCardMenu.contains(event.target)) {
        closeCardMenu();
    }
}

async function shareItem(itemId) {
    const item = findItemById(itemId);
    if (!item) return;

    const shareData = {
        title: `Mmg Studio - ${item.title}`,
        text: `Écoute "${item.title}" sur Mmg Studio !`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error('Erreur de partage:', err);
        }
    } else {
        navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${item.youtube_id}`).then(() => showDialog(getTranslation('linkCopied')))
            .catch(err => showDialog(getTranslation('copyFailed')));
    }
}

function handleMenuAction(action, itemId, buttonElement) {
    if (action === 'like') {
        toggleLike(itemId);
        if (buttonElement) {
            const isLiked = likedSongs.has(itemId);
            const icon = buttonElement.querySelector('i');
            const span = buttonElement.querySelector('span');
            icon.className = `${isLiked ? 'fas' : 'far'} fa-heart ${isLiked ? 'active' : ''}`;
            span.textContent = isLiked ? getTranslation('removeLike') : getTranslation('like'); // CORRECTION: Utilise removeLike pour la cohérence
        } // CORRECTION: Ne ferme plus le menu automatiquement
    } else if (action === 'playlist') {
        togglePlaylistItem(itemId);
        if (buttonElement) {
            const isInPlaylist = currentPlaylist.includes(itemId);
            const icon = buttonElement.querySelector('i');
            icon.className = `fas ${isInPlaylist ? 'fa-check' : 'fa-plus'} ${isInPlaylist ? 'added' : ''}`;
        } // CORRECTION: Ne ferme plus le menu automatiquement
    } else if (action === 'playlist') {
        togglePlaylistItem(itemId);
        const isInPlaylist = currentPlaylist.includes(itemId);
        if (buttonElement) {
            const icon = buttonElement.querySelector('i');
            const span = buttonElement.querySelector('span');
            icon.className = `fas ${isInPlaylist ? 'fa-check' : 'fa-plus'} ${isInPlaylist ? 'added' : ''}`;
            span.textContent = isInPlaylist ? getTranslation('removePlaylist') : getTranslation('addPlaylist');
        }
    } else if (action === 'playNext') {
        playNext(itemId);
        closeCardMenu();
    } else if (action === 'queue') {
        // NOUVEAU: Logique pour ajouter/retirer de la file d'attente
        const isInQueue = userQueue.includes(itemId);
        if (isInQueue) {
            removeFromQueue(itemId);
            playAudio(sounds.back);
        } else {
            addToQueue(itemId);
        }
        // Mettre à jour l'icône et le texte du bouton
        if (buttonElement) {
            const icon = buttonElement.querySelector('i');
            const span = buttonElement.querySelector('span');
            icon.className = `fas ${!isInQueue ? 'fa-check' : 'fa-list-ul'}`; // 'fa-check' si ajouté, 'fa-list-ul' si retiré
            span.textContent = !isInQueue ? getTranslation('removeFromQueue') : getTranslation('addToQueue'); // CORRECTION: Utilise les bonnes clés de traduction
        }
        // CORRECTION: Ne ferme plus le menu automatiquement
    } else if (action === 'share') {
        shareItem(itemId);
    }
}

function renderMusicTitleDetails(item, shouldPlay = false, isAutoTransition = false, sourceName = "") {
    document.getElementById('music-title-details-section').dataset.currentItemId = item.id;
    const activeProfile = getActiveProfile();
    const album = siteData.contentData[activeProfile].albums[item.albumId];

    if (isAutoTransition) {
        showNextUpBanner(item, sourceName || (currentPlaybackContext ? currentPlaybackContext.name : ""));
    }

    // GESTION DE L'AFFICHAGE (Lecture vs Navigation)
    const coverOverlay = document.getElementById('details-cover-overlay');
    const coverImage = document.getElementById('details-cover-image');
    const movablePlayer = document.getElementById('movable-player-container');

    // Est-ce que ce titre est déjà en cours de lecture ?
    const isAlreadyPlaying = currentPlayingItem && currentPlayingItem.id === item.id;

    if (shouldPlay || isAlreadyPlaying) {
        // CAS 1 : On veut jouer ce titre OU il joue déjà -> On montre le lecteur
        if (coverOverlay) coverOverlay.classList.add('hidden');
        if (movablePlayer) movablePlayer.style.visibility = 'visible';

        if (!isAlreadyPlaying) {
            loadAndPlayVideo(item, false, false, !shouldPlay);
        }
    } else {
        // CAS 2 : Navigation pure (Navigation manuelle ou transition après fin de morceau)

        // Est-ce qu'un morceau est déjà en cours de lecture ACTIVE ?
        // On ne veut pas couper la musique si l'utilisateur browse juste un autre titre.
        const isPlaying = activePlayer && typeof activePlayer.getPlayerState === 'function' &&
            (activePlayer.getPlayerState() === YT.PlayerState.PLAYING || activePlayer.getPlayerState() === YT.PlayerState.BUFFERING);

        if (!isPlaying || isAutoTransition) {
            // Si rien ne joue, OU si c'est une transition automatique entre deux morceaux, on pré-charge (cue).
            // Cela permet d'avoir le vrai bouton Play de YouTube pour compter les vues.
            if (coverOverlay) coverOverlay.classList.add('hidden');
            if (movablePlayer) movablePlayer.style.visibility = 'visible';

            // On pré-charge (cue) le morceau si on n'est pas déjà en train de le jouer
            if (!isAlreadyPlaying) {
                loadAndPlayVideo(item, false, false, true); // true = cueOnly
            }
        } else {
            // Si un morceau joue déjà et qu'on browse juste un autre, on montre l'overlay trompe-l'œil
            if (coverOverlay) {
                coverOverlay.classList.remove('hidden');
                if (coverImage) {
                    coverImage.src = `https://img.youtube.com/vi/${item.youtube_id}/maxresdefault.jpg`;
                    coverImage.onerror = function () { this.src = `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`; };
                }
            }
            if (movablePlayer) movablePlayer.style.visibility = 'hidden';
        }
    }

    document.getElementById('details-title').textContent = item.title;
    const albumSpan = document.getElementById('details-album');
    albumSpan.textContent = album ? album.title : getTranslation('unknown');
    albumSpan.parentElement.dataset.albumId = item.albumId;
    const yearSpan = document.getElementById('details-year');
    yearSpan.textContent = item.year || getTranslation('unknown');
    yearSpan.parentElement.dataset.year = item.year || '';

    const description = translations[currentLang]?.trackDescriptions?.[item.id] || item.description || '';
    document.getElementById('details-description').textContent = description;

    document.getElementById('details-tags').innerHTML = (item.tags || []).map(tag => `<span class="tag-item" data-action="filter-tag" data-tag="${tag}">${tag}</span>`).join('');

    const streamingContainer = document.getElementById('streaming-links');
    streamingContainer.innerHTML = '';
    if (item.streaming) {
        const platformConfig = {
            spotify: { icon: 'fab fa-spotify', base_url: 'https://open.spotify.com/album/' },
            appleMusic: { icon: 'fab fa-apple', base_url: 'https://music.apple.com/fr/album/' },
            youtube: { icon: 'fab fa-youtube', base_url: 'https://www.youtube.com/watch?v=' },
            deezer: { icon: 'fab fa-deezer', base_url: 'https://www.deezer.com/album/' },
            amazonMusic: { icon: 'fab fa-amazon', base_url: 'https://amazon.fr/music/player/albums/' },
            tidal: { icon: 'fas fa-record-vinyl', base_url: 'https://tidal.com/browse/album/' }
        };

        for (const [platform, id] of Object.entries(item.streaming)) {
            if (platformConfig[platform] && id && id.trim() !== '') {
                const link = document.createElement('a');
                link.href = platformConfig[platform].base_url + id;
                link.target = '_blank';
                link.title = `Écouter sur ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
                link.innerHTML = `<i class="${platformConfig[platform].icon}"></i>`;
                streamingContainer.appendChild(link);
            }
        }
    }
    renderAssociatedVideos(item);
    updatePlayerPlaylistButtonUI(item.id);
}

function renderAssociatedVideos(musicItem) {
    const activeProfile = getActiveProfile();
    const container = document.getElementById('associated-videos-container');
    container.innerHTML = '';

    const createVideoCard = (video, labelKey) => `
        <div class="associated-video-card card-link-wrapper" data-youtube-id="${video.youtube_id}" data-item-id="${video.id}">
            <img src="${getCorrectImagePath(video, 'thumb')}" alt="${getTranslation(labelKey)}" onerror="this.src='https://placehold.co/100x56/000/fff?text=Error';">
            <p>${getTranslation(labelKey)}</p>
        </div>
    `;

    const createGhostCard = (labelKey) => `
        <div class="associated-video-card card-link-wrapper ghost-card">
            <div class="ghost-image-placeholder">${getConstructionSvg()}</div>
            <p>${getTranslation(labelKey)}</p>
        </div>
    `;

    let hasMusicVideo = false;
    let hasMakingOf = false;
    let contentHtml = '';

    if (musicItem.associatedVideos && musicItem.associatedVideos.length > 0) {
        musicItem.associatedVideos.forEach(videoId => {
            const video = findItemById(videoId);
            if (video) {
                if (siteData.contentData[activeProfile].videos[videoId]) {
                    contentHtml += createVideoCard(video, 'videoClip');
                    hasMusicVideo = true;
                } else if (siteData.contentData[activeProfile].bonus[videoId]) {
                    contentHtml += createVideoCard(video, 'videoMakingOf');
                    hasMakingOf = true;
                }
            }
        });
    }

    // Ajouter le placeholder pour le clip s'il n'y en a pas
    if (!hasMusicVideo) {
        contentHtml += createGhostCard('videoClip');
    }

    // Ajouter le placeholder pour le making-of s'il n'y en a pas
    if (!hasMakingOf) {
        contentHtml += createGhostCard('videoMakingOf');
    }

    container.innerHTML = contentHtml;
}

function getConstructionSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-construction-icon lucide-construction"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>`;
}

function updateMp3PlayerInfo(item) {
    if (item && item.title) {
        // NOUVEAU: S'assure que le placeholder du thème DS est caché
        const fullPlayer = document.getElementById('mobile-full-player');
        if (fullPlayer) {
            fullPlayer.classList.remove('no-track-playing');
        }

        const desktopPlayerTitle = document.getElementById('song-title');
        desktopPlayerTitle.innerHTML = `<span>${item.title}</span>`; // On remet le span
        checkTitleOverflow(desktopPlayerTitle.querySelector('span')); // On vérifie le débordement
        // CORRECTION: Mettre à jour le lecteur mobile avec la logique de défilement
        const mobilePlayerTitle = document.getElementById('mobile-player-title');
        const mobilePlayerArtist = document.getElementById('mobile-player-artist');
        mobilePlayerTitle.querySelector('span').textContent = item.title;
        checkTitleOverflow(mobilePlayerTitle);

        const activeProfileData = siteData.contentData[document.querySelector('.profile-tab.active')?.dataset.project || 'mmg-music'];
        const artistName = activeProfileData === siteData.contentData['mmg-music'] ? 'Mmg Music' : 'Mmg Beats';
        mobilePlayerArtist.querySelector('span').textContent = artistName;
        checkTitleOverflow(mobilePlayerArtist);

        // MODIFICATION: Utiliser l'image pleine résolution pour tous les lecteurs.
        // NOUVEAU: Sur mobile, on utilise la vignette
        const imageSize = window.innerWidth <= 952 ? 'thumb' : 'full';
        const imageSrc = isMusicTitle(item)
            ? getCorrectImagePath(item, imageSize) // On charge la grande image ou la vignette selon l'appareil
            : `https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`; // Pour les vidéos, on garde l'image de YT
        document.getElementById('player-album-cover').src = imageSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3C/svg%3E";
        document.getElementById('mobile-player-album-art').src = imageSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3C/svg%3E";
        const miniPlayerTitle = document.getElementById('mini-player-title');
        const miniPlayerContext = document.getElementById('mini-player-context'); // Pour mobile
        const desktopPlayerContext = document.getElementById('desktop-player-context'); // Pour ordinateur

        if (miniPlayerTitle) {
            miniPlayerTitle.querySelector('span').textContent = item.title;
            miniPlayerTitle.parentElement.classList.remove('no-track'); // CORRECTION: Retire la classe de centrage
            checkTitleOverflow(miniPlayerTitle); // CORRECTION: Applique la logique de défilement
        }

        // CORRECTION: Le mini-lecteur utilise la vignette pour un chargement plus rapide, avec un fallback vers l'image complète.
        const miniPlayerArt = document.getElementById('mini-player-album-art');
        miniPlayerArt.src = isMusicTitle(item) ? getCorrectImagePath(item, 'thumb') : imageSrc;
        miniPlayerArt.onerror = () => { miniPlayerArt.onerror = null; miniPlayerArt.src = imageSrc; };
        // CORRECTION: Mettre à jour le contexte dans le mini-lecteur avec la nouvelle logique
        if (miniPlayerContext || desktopPlayerContext) {
            let contextText = ''; // Initialize contextText
            switch (currentPlaybackContext.type) {
                case 'album':
                case 'search':
                case 'track':
                    contextText = getTranslation('fromTitles');
                    break;
                case 'selection':
                    contextText = getTranslation('fromPlaybackQueue');
                    break;
                case 'playlist':
                    contextText = getTranslation('fromMyPlaylist'); // Utilise la clé spécifique pour "Ma Playlist"
                    break;
                case 'video':
                    contextText = getTranslation('fromVideos');
                    break;
                case 'liked':
                    contextText = getTranslation('fromLiked');
                    break;
                case 'mmgPlaylist':
                    contextText = getTranslation('fromMmgPlaylists');
                    break;
            }
            if (miniPlayerContext) miniPlayerContext.textContent = contextText;
            if (desktopPlayerContext) desktopPlayerContext.textContent = contextText;
        }

        // On s'assure que la pochette est de nouveau visible et opaque
        const miniAlbumArt = document.getElementById('mini-player-album-art');
        if (miniAlbumArt) miniAlbumArt.style.opacity = '1';
        updatePlayerPlaylistButtonUI(item.id); // NOUVEAU: Mettre à jour le bouton playlist du lecteur

        // NOUVEAU: S'assurer que les contrôles et l'image sont visibles
        const miniPlayerControls = document.getElementById('mini-player-controls');
        if (miniPlayerControls) miniPlayerControls.style.display = 'flex';
        const miniPlayerAlbumArt = document.getElementById('mini-player-album-art');
        if (miniPlayerAlbumArt) miniPlayerAlbumArt.style.display = 'block';



        updateLikeButtonUI(item.id);
    }
}

// NOUVEAU: Met à jour l'icône "Ajouter à la playlist" sur les lecteurs
function updatePlayerPlaylistButtonUI(itemId) {
    const desktopBtn = document.getElementById('player-add-to-playlist-btn');
    const mobileBtn = document.getElementById('mobile-player-add-to-playlist-btn');
    const buttons = [desktopBtn, mobileBtn].filter(Boolean); // Filtre les éléments non trouvés

    if (buttons.length === 0 || !currentPlayingItem || currentPlayingItem.id !== itemId) return;

    const isInPlaylist = currentPlaylist.includes(itemId);

    buttons.forEach(btn => {
        btn.classList.toggle('fa-plus', !isInPlaylist);
        btn.classList.toggle('fa-check', isInPlaylist);
        btn.classList.toggle('added', isInPlaylist); // 'added' peut avoir un style spécifique (ex: couleur)
        btn.title = getTranslation(isInPlaylist ? 'removePlaylist' : 'addPlaylist');
    });
}

function resetMiniPlayerUI() {
    // MODIFICATION: Le mini-lecteur se masque (se baisse) lorsqu'il n'y a pas de titre.
    const miniPlayer = document.getElementById('mobile-mini-player');

    if (miniPlayer) {
        // CORRECTION: On recache le lecteur s'il n'y a plus de titre.
        miniPlayer.classList.add('no-track-playing');
        document.body.classList.add('mobile-player-hidden');
        document.documentElement.style.setProperty('--mobile-player-height', '0px');
    }

    const fullPlayer = document.getElementById('mobile-full-player');
    if (fullPlayer) {
        fullPlayer.classList.add('no-track-playing');
        fullPlayer.classList.remove('active');
    }

    // Réinitialisation du lecteur de bureau
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('song-title').textContent = getTranslation('noTrackPlaying');
    document.getElementById('player-album-cover').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3C/svg%3E";

    // CORRECTION: Réinitialise le contenu du mini-lecteur mobile sans le cacher.
    const miniPlayerTitle = document.getElementById('mini-player-title');
    if (miniPlayerTitle) {
        miniPlayerTitle.querySelector('span').textContent = '';
        miniPlayerTitle.parentElement.classList.add('no-track');
    }
    document.getElementById('mini-player-album-art').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45'%3E%3C/svg%3E";
    document.getElementById('mini-player-progress-fill').style.width = '0%';

    const mobilePlayerTitle = document.getElementById('mobile-player-title');
    const mobilePlayerArtist = document.getElementById('mobile-player-artist');
    mobilePlayerTitle.querySelector('span').textContent = getTranslation('noTrackPlaying');
    mobilePlayerArtist.querySelector('span').textContent = ''; // CORRECTION: Affiche une chaîne vide au lieu de "..."
    mobilePlayerTitle.classList.remove('scrolling');
    mobilePlayerArtist.classList.remove('scrolling');

    document.getElementById('mobile-player-album-art').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3C/svg%3E";
    document.getElementById('mobile-player-progress-fill').style.width = '0%';
    document.getElementById('mobile-player-current-time').textContent = '0:00';
    document.getElementById('mobile-player-duration').textContent = '0:00';
    // Ensure buttons are in their default state
    document.getElementById('mobile-player-play-pause-btn').className = 'fas fa-play';
    // NOUVEAU: Retire le surlignage de la carte
    unhighlightPlayingCard();

    // NOUVEAU: Si on ferme une vidéo, on retourne à la page précédente
    if (currentPlayingItem && !isMusicTitle(currentPlayingItem)) {
        history.back();
    }
}

function updateProgressBar() {
    if (!activePlayer || typeof activePlayer.getDuration !== 'function' || !currentPlayingItem) return;

    const duration = activePlayer.getDuration();
    if (duration > 0) { // If duration is valid
        const currentTime = activePlayer.getCurrentTime();
        listenProgress = currentTime / duration;

        // MISE À JOUR: Affichage des temps
        document.getElementById('progress-fill').style.width = `${listenProgress * 100}%`;
        document.getElementById('current-time-display').textContent = formatTime(currentTime);
        document.getElementById('duration-display').textContent = formatTime(duration);

        if (previousListenProgress > 0) { // If there was previous progress
            // NOUVEAU: Mettre à jour la barre de progression mobile
            const mobileProgressBar = document.getElementById('mobile-player-progress-fill');
            if (mobileProgressBar) {
                mobileProgressBar.style.width = `${listenProgress * 100}%`;
            }
            const miniPlayerProgressBar = document.getElementById('mini-player-progress-fill');
            if (miniPlayerProgressBar) {
                miniPlayerProgressBar.style.width = `${listenProgress * 100}%`;
            }
            const mobileCurrentTime = document.getElementById('mobile-player-current-time');
            if (mobileCurrentTime) {
                mobileCurrentTime.textContent = formatTime(currentTime);
            }
            const mobileDuration = document.getElementById('mobile-player-duration');
            if (mobileDuration) {
                mobileDuration.textContent = formatTime(duration);
            }


            const progressDifference = listenProgress - previousListenProgress;
            const seekThreshold = 2 / duration;
            if (duration > 2 && Math.abs(progressDifference) > seekThreshold) {
                seekDetectedInCurrentPlay = true;
            }
        }
        previousListenProgress = listenProgress; // Update previous progress
    }
    updateMediaPositionState(); // Crucial pour la lecture en arrière-plan
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showSection(sectionId, updateHistory = true, previousContext = null) {
    const sectionsContainer = document.querySelector('.content-section-board');
    const currentSection = sectionsContainer.querySelector('.page-section:not(.hidden)');
    const nextSection = document.getElementById(sectionId);

    if (!nextSection || (currentSection && currentSection.id === sectionId)) {
        // CORRECTION: Même si la section ne change pas, on remonte en haut.
        // Useful if clicking the same menu link twice.
        const contentScroller = (currentSection || nextSection)?.querySelector('.page-content');
        if (contentScroller) contentScroller.scrollTop = 0;
        return;
    }

    const animationDuration = 200; // CORRECTION: Durée de l'animation de sortie réduite à 200ms

    // NOUVEAU: Retire le surlignage de la carte avant de naviguer
    unhighlightPlayingCard(); // Remove highlight before navigating

    // CORRECTION: Logique de transition simplifiée pour éviter le "saut" de layout.
    // On anime la sortie de l'ancienne section et l'entrée de la nouvelle en même temps.
    const contentScroller = nextSection.querySelector('.page-content');
    if (contentScroller) {
        contentScroller.scrollTop = 0;
        // NOUVEAU: Réinitialise l'état du header (transparent) au changement de section
        const header = document.querySelector('.top-bar');
        if (header) header.classList.remove('scrolled');
    }

    if (currentSection) {
        currentSection.classList.add('is-hiding');
        setTimeout(() => {
            currentSection.classList.add('hidden');
            currentSection.classList.remove('is-hiding');
        }, animationDuration);
    }

    nextSection.classList.remove('hidden');
    nextSection.querySelectorAll('.sliding-tabs').forEach(container => updateSlidingIndicator(container));

    if (updateHistory && (!history.state || history.state.section !== sectionId)) {
        const contextToSave = previousContext || { ...currentViewContext };
        history.replaceState({ ...history.state, context: contextToSave }, '', window.location.hash);
        const stateToPush = { section: sectionId, fromApp: true, context: null };
        history.pushState(stateToPush, '', '#' + sectionId);
    }

    highlightPlayingCard(currentPlayingItem);

    const activeProfile = getActiveProfile();
    if (activeProfile) {
        renderSidebarNav(activeProfile);
    }
}



function updateVisibleCards(customTitle = null, animate = true) {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const checkedTags = Array.from(document.querySelectorAll('#tags-filter-list input:checked')).map(cb => cb.value);

    // NOUVEAU: Mettre à jour le badge de filtre
    const filterBadge = document.getElementById('tags-filter-count');
    if (filterBadge) {
        filterBadge.textContent = checkedTags.length > 0 ? checkedTags.length : '';
        filterBadge.classList.toggle('hidden', checkedTags.length === 0);
    }

    // NOUVEAU: Gère l'indicateur de filtre persistant sur mobile
    const filterDotOnSearch = document.querySelector('.filter-dot-on-search');
    if (filterDotOnSearch) {
        // Affiche ou cache le point sur la loupe si des filtres sont actifs
        filterDotOnSearch.classList.toggle('hidden', checkedTags.length === 0);
    }

    if (query === '' && checkedTags.length === 0) {
        if (document.getElementById('tags-filter-overlay').classList.contains('hidden') && document.getElementById('search-results-section').classList.contains('hidden') === false) {
            resetToHome();
        }
        return;
    }

    const filteredResults = Object.fromEntries(Object.entries(allSearchableItems).filter(([key, item]) => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const tagTextMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(query));
        let albumTitleMatch = false; // Check for album title match
        if (item.albumId && siteData.contentData['mmg-music'].albums[item.albumId]) {
            albumTitleMatch = siteData.contentData['mmg-music'].albums[item.albumId].title.toLowerCase().includes(query);
        }

        const itemTags = (item.tags || []).map(t => t.toLowerCase());
        const tagsMatch = checkedTags.length === 0 || checkedTags.every(tag => itemTags.includes(tag));

        return (titleMatch || tagTextMatch || albumTitleMatch) && tagsMatch;
    })); // Filter items based on query and tags

    const isPlaying = currentPlayingItem && activePlayer && typeof activePlayer.getPlayerState === 'function' &&
        (activePlayer.getPlayerState() === YT.PlayerState.PLAYING || activePlayer.getPlayerState() === YT.PlayerState.PAUSED);

    // NOUVEAU: Logique pour un titre de recherche plus descriptif
    let titleParts = [];
    if (query) {
        titleParts.push(`${getTranslation('searchFor')}: "${query}"`);
    }
    if (checkedTags.length > 0) {
        const tagsString = checkedTags.map(t => `"${t}"`).join(', ');
        titleParts.push(`${getTranslation('contentWithTag')}: ${tagsString}`);
    }

    let titleToSet = titleParts.join(' & ');
    if (!titleToSet) titleToSet = getTranslation('searchResults');

    document.getElementById('search-results-title').innerHTML = titleToSet; // Use innerHTML for quotes
    currentViewContext = { type: 'search', data: customTitle };
    showSection('search-results-section', true, false);
    renderCards('search-results-cards', filteredResults, 'search', animate);
}

function setupTagFilters() {
    const tagsToExclude = new Set(['snow', 'western', 'desert', 'dream']);
    const allTags = new Set(Object.values(allSearchableItems).flatMap(item => item.tags || []).filter(tag => !tagsToExclude.has(tag)));

    const container = document.getElementById('tags-filter-list');
    container.innerHTML = '';
    Array.from(allTags).sort().forEach(tag => {
        const tagId = `tag-${tag.toLowerCase().replace(/\s/g, '-')}`;
        const tagDiv = document.createElement('div');
        tagDiv.className = 'tag-filter-item';
        tagDiv.innerHTML = `<input type="checkbox" id="${tagId}" value="${tag.toLowerCase()}"><label for="${tagId}">${tag}</label>`;
        container.appendChild(tagDiv);
    });
}

function showDialog(message) {
    const dialog = document.getElementById('custom-dialog');
    dialog.querySelector('p').textContent = message;
    dialog.classList.remove('hidden');
    setTimeout(() => dialog.classList.add('hidden'), 4000);
}

// NOUVEAU: Affiche une bannière élégante pour indiquer le titre suivant lors d'une transition
function showNextUpBanner(item, sourceName) {
    const banner = document.getElementById('next-up-banner');
    const title = document.getElementById('next-up-banner-title');
    const source = document.getElementById('next-up-banner-source');

    if (!banner || !item) return;

    title.textContent = item.title;

    // Traduction de la source si nécessaire
    let sourceText = sourceName;
    if (sourceName === 'queue') sourceText = getTranslation('fromPlaybackQueue');
    else if (sourceName === 'playlist') sourceText = getTranslation('fromMyPlaylist');

    source.textContent = sourceText || "";

    banner.classList.remove('active');
    void banner.offsetWidth; // Force reflow
    banner.classList.add('active');

    // Auto-hide après 4 secondes
    setTimeout(() => {
        banner.classList.remove('active');
    }, 4000);
}

// CORRECTION: La logique d'application des thèmes est entièrement revue pour être plus robuste.
function applyTheme(themeName) {
    const isBgTheme = siteData.shopItems.backgrounds.some(bg => bg.id === themeName);

    const { themes, backgrounds } = siteData.shopItems;

    if (isBgTheme) {
        // 1. Sauvegarder la préférence de l'utilisateur pour le fond
        safeStorage.setItem('bg-theme', themeName);

        // 2. Retirer tous les anciens thèmes d'arrière-plan pour repartir de zéro
        backgrounds.forEach(bg => document.body.classList.remove(bg.id));

        // 3. Appliquer le nouveau thème (sauf si c'est le défaut, qui n'a pas de classe)
        if (themeName !== 'default-bg') {
            document.body.classList.add(themeName);
        }

    } else { // C'est un thème d'interface
        // 1. Retirer tous les anciens thèmes d'interface
        themes.forEach(theme => document.body.classList.remove(theme.id));
        // 2. Ajouter le nouveau thème (sauf si c'est le défaut)

        // NOUVEAU: Désactiver le switch de thème (clair/foncé) si ce n'est pas le thème par défaut
        const themeSwitch = document.getElementById('theme-switch');
        if (themeSwitch) {
            const isDefault = themeName === 'default';
            themeSwitch.disabled = !isDefault;
            themeSwitch.parentElement.classList.toggle('disabled-state', !isDefault);
        }

        if (themeName !== 'default') {
            document.body.classList.add(themeName);
        }

        // NOUVEAU: Si on change de thème et que le fond est "Icons", on le retire car il est incompatible
        if (themeName !== 'default' && safeStorage.getItem('bg-theme') === 'bg-icons') {
            document.body.classList.remove('bg-icons');
            safeStorage.setItem('bg-theme', 'bg-default-theme'); // Reset to default bg
        }

        // NOUVEAU: Gestion du layout DS
        if (themeName === 'theme-ds') {
            enableDSLayout();
        } else {
            disableDSLayout();
        }
        // 3. Sauvegarder la préférence
        safeStorage.setItem('ui-theme', themeName);
    }

    // 4. Mettre à jour l'état visuel des boutons dans la boutique
    // CORRECTION: On redessine toute la boutique pour garantir que l'ancien élément est bien désélectionné visuellement.
    renderShopItems(false); // Pas d'animation sur changement de thème

    // NOUVEAU: Met à jour la progression du bonus quotidien pour s'adapter au nouveau thème
    renderDailyBonusProgress();
    updateThemeColorMeta();
}

// === LOGIQUE DU THÈME DS ===
function enableDSLayout() {
    // 1. Créer le wrapper DS s'il n'existe pas
    let dsWrapper = document.getElementById('ds-console-wrapper');
    if (!dsWrapper) {
        dsWrapper = document.createElement('div');
        dsWrapper.id = 'ds-console-wrapper';
        dsWrapper.innerHTML = `
            <div id="ds-top-screen" class="ds-screen">
                <div class="glass-shine"></div>
                <div id="ds-player-container"></div>
            </div>
            <div class="ds-hinge">
                <div></div> <!-- Espace vide pour la mise en page -->
                <div class="ds-hinge-logo">Mmg Studio DS</div>
                <div class="ds-hinge-indicators">
                    <div class="indicator-line"></div>
                    <div class="indicator-line"></div>
                </div>
            </div>
            <div id="ds-bottom-screen" class="ds-screen">
                <div id="ds-header-container"></div>
                <div id="ds-content-container"></div>
                <div id="ds-nav-container"></div>
            </div>
        `;
        document.body.appendChild(dsWrapper);
    }

    // 2. Déplacer les éléments dans le châssis DS
    const fullPlayer = document.getElementById('mobile-full-player');
    const mainWrapper = document.getElementById('main-content-wrapper');
    const bottomNav = document.getElementById('mobile-bottom-nav');

    if (fullPlayer) document.getElementById('ds-player-container').appendChild(fullPlayer);
    if (mainWrapper) document.getElementById('ds-content-container').appendChild(mainWrapper);
    if (bottomNav) document.getElementById('ds-nav-container').appendChild(bottomNav);

    // 3. Ajustements spécifiques
    document.body.classList.add('ds-active');

    // Si pas de musique, afficher le logo placeholder
    if (!currentPlayingItem) {
        if (fullPlayer) fullPlayer.classList.add('no-track-playing');
        // On pourrait injecter un logo ici si besoin
    }
}

function disableDSLayout() {
    const dsWrapper = document.getElementById('ds-console-wrapper');
    if (!dsWrapper) return;

    // 1. Remettre les éléments à leur place d'origine
    const fullPlayer = document.getElementById('mobile-full-player');
    const mainWrapper = document.getElementById('main-content-wrapper');
    const bottomNav = document.getElementById('mobile-bottom-nav');

    // Le mini-player et la nav retournent au body (fixed)
    if (fullPlayer) document.body.appendChild(fullPlayer);
    if (bottomNav) document.body.appendChild(bottomNav);

    // Le wrapper principal retourne au body (avant les scripts ou overlays)
    // CORRECTION: On l'insère avant le footer desktop pour respecter l'ordre du DOM.
    // L'ancienne méthode provoquait une erreur car .animation-bg-area est un enfant de mainWrapper.
    const desktopFooter = document.querySelector('.bottom-ui-container');
    if (mainWrapper) {
        // Si le footer existe, on insère avant, sinon on ajoute à la fin (équivalent à appendChild)
        document.body.insertBefore(mainWrapper, desktopFooter || null);
    }

    // 2. Nettoyer
    dsWrapper.remove();
    document.body.classList.remove('ds-active');

    // Rétablir l'état caché du mini-player si nécessaire
    // (Le full player est géré par la classe .active, pas .hidden, donc on le laisse tranquille)
}

function updateShopLocksAndSelection() {
    const currentUiTheme = safeStorage.getItem('ui-theme') || 'default';
    const currentBgTheme = safeStorage.getItem('bg-theme') || 'bg-1';

    // CORRECTION: Cible tous les boutons d'action des thèmes et arrière-plans
    document.querySelectorAll('.shop-list-item-action .theme-buy-btn, .shop-product-card .theme-buy-btn, .shop-product-card .shop-buy-btn').forEach(btn => {
        const achievementId = btn.dataset.achievement;
        const themeId = btn.dataset.theme;

        if (!themeId) {
            return; // Skip this button if it doesn't have a theme id.
        }

        btn.disabled = false;
        btn.classList.remove('locked', 'selected');

        if (achievementId && achievements[achievementId] && !achievements[achievementId].unlocked) {
            btn.classList.add('locked');
            // CORRECTION: Utilisation du SVG du cadenas pour une taille de bouton cohérente.
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
            btn.disabled = true;
        } else {
            // CORRECTION: La logique est unifiée pour utiliser des icônes SVG pour tous les états, garantissant une taille de bouton cohérente.
            // La détection de la sélection est plus fiable.
            const isSelected = (siteData.shopItems.backgrounds.some(bg => bg.id === themeId) && themeId === currentBgTheme) || (siteData.shopItems.themes.some(t => t.id === themeId) && themeId === currentUiTheme);
            const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
            const circleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>`;

            if (isSelected) {
                btn.classList.add('selected');
                btn.innerHTML = checkIcon;
                btn.disabled = true;
            } else if (!btn.classList.contains('shop-buy-btn')) {
                // Pour un thème débloqué mais non sélectionné, on affiche un cercle.
                btn.innerHTML = circleIcon;
            }
        }
    });
}

function updateViewSwitcherUI() {
    const currentView = safeStorage.getItem('mmg-global-view') || 'grid';
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === currentView);
    });
}

function refreshCurrentView() {
    const visibleSection = document.querySelector('.page-section:not(.hidden)');
    if (visibleSection) {
        handleMenuNavigation(visibleSection.id, false);
    }
}

// CORRECTION: Définition de la fonction manquante
function applyInitialTheme() {
    const savedTheme = safeStorage.getItem('mmg-theme') || 'light';
    let savedUiTheme = safeStorage.getItem('ui-theme') || 'default'; // Thème d'UI par défaut
    const savedBgTheme = safeStorage.getItem('bg-theme') || 'bg-1'; // NOUVEAU: Fond par défaut

    // NOUVEAU: Force le thème par défaut si DS est sélectionné sur PC au chargement
    if (savedUiTheme === 'theme-ds' && window.innerWidth > 952) {
        savedUiTheme = 'default';
        safeStorage.setItem('ui-theme', 'default');
    }

    document.getElementById('theme-switch').checked = savedTheme === 'dark';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');

    // Appliquer le thème d'UI
    if (savedUiTheme !== 'default') { document.body.classList.add(savedUiTheme); }

    // NOUVEAU: Désactiver le switch de thème au chargement si ce n'est pas le thème par défaut
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        const isDefault = savedUiTheme === 'default';
        themeSwitch.disabled = !isDefault;
        themeSwitch.parentElement.classList.toggle('disabled-state', !isDefault);
    }

    // Appliquer le thème de fond
    if (savedBgTheme !== 'bg-default-theme') {
        document.body.classList.add(savedBgTheme);
    }
    // Activer le layout DS si nécessaire au démarrage
    if (savedUiTheme === 'theme-ds') {
        enableDSLayout();
    }

    // NOUVEAU: Appliquer la couleur des barres système au démarrage
    updateThemeColorMeta();
}

function resetToHome(playSelectSound = true) {
    if (playSelectSound) playAudio(sounds.select);
    handleMenuNavigation('home-dashboard-section');
}

function renderSidebarNav(activeProfile) {
    const navContainer = document.getElementById('sidebar-main-nav');
    if (!navContainer) return;

    const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id || 'home-dashboard-section'; // Get current section ID

    // CORRECTION: Utilisation des icônes Lucide pour la cohérence avec la version mobile.
    const iconMap = {
        'albums': 'disc-album',
        'albumsBeats': 'disc-album',
        'videos': 'tv',
        'about': 'info',
        'library': 'library',
        'shop': 'shopping-bag',
        'home': 'house'
    };

    // Séparer les liens du profil et le lien "À propos"
    const profileData = Object.values(siteData.projectData[activeProfile] || {}).filter(item => item.link);
    const aboutItem = profileData.find(item => item.langKey === 'about');
    const otherProfileItems = profileData.filter(item => item.langKey !== 'about');

    const profileLinks = otherProfileItems.map(item => { // Map other profile items to links
        const isActive = item.link === currentSectionId;
        return `
                <a href="#" class="sidebar-nav-link ${isActive ? 'active' : ''}" data-link="${item.link}">
                    <i data-lucide="${iconMap[item.langKey] || 'help-circle'}"></i>
                    <span data-lang-key="${item.langKey}">${getTranslation(item.langKey) || item.title}</span>
                </a>`;
    }).join('');

    // Création du lien Accueil
    const homeIsActive = currentSectionId === 'home-dashboard-section';
    const homeLink = `
            <a href="#" class="sidebar-nav-link ${homeIsActive ? 'active' : ''}" data-link="home-dashboard-section">
                <i data-lucide="${iconMap['home']}"></i>
                <span data-lang-key="home">${getTranslation('home')}</span>
            </a>`;

    // Création des liens statiques (Bibliothèque, Boutique, À propos)
    const libraryIsActive = currentSectionId === 'library-section';
    const libraryLink = `
            <a href="#" class="sidebar-nav-link ${libraryIsActive ? 'active' : ''}" data-link="library-section">
                <i data-lucide="${iconMap['library']}"></i>
                <span data-lang-key="library">${getTranslation('library')}</span>
            </a>`;

    const shopIsActive = currentSectionId === 'shop-section';
    const shopLink = `
            <a href="#" class="sidebar-nav-link ${shopIsActive ? 'active' : ''}" data-link="shop-section">
                <i data-lucide="${iconMap['shop']}"></i>
                <span data-lang-key="shop">${getTranslation('shop')}</span>
            </a>`;

    // Assemble in correct order
    navContainer.innerHTML = homeLink + profileLinks + libraryLink + shopLink;

    // CORRECTION: Ré-initialise les icônes Lucide après avoir mis à jour le HTML.
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setVolume(volume, fromUI = false) {
    currentVolume = Math.max(0, Math.min(100, volume));
    // CORRECTION: Ajout de l'ID #volume-level-display pour le lecteur mobile
    document.querySelectorAll('.volume-level-display, #volume-level-display').forEach(el => el.textContent = currentVolume);

    const volumeFraction = currentVolume / 100;
    if (largePlayer?.setVolume) largePlayer.setVolume(currentVolume);
    if (mediumPlayer?.setVolume) mediumPlayer.setVolume(currentVolume);

    Object.values(sounds).forEach(sound => { if (sound) sound.volume = volumeFraction; }); // Set volume for all sounds

    if (fromUI) playAudio(sounds.hover);
}

function checkTitleOverflow(titleSpan) {
    // L'élément observé est maintenant le <span> lui-même.
    const container = titleSpan.parentElement; // Le conteneur est le parent du span (ex: .list-view-title ou .card__title)
    if (!container) return;

    container.classList.remove('scrolling');
    container.style.setProperty('--overflow-width', '0px');

    requestAnimationFrame(() => {
        const isOverflown = titleSpan.scrollWidth > container.clientWidth + 1;
        if (isOverflown) {
            const overflowAmount = titleSpan.scrollWidth - container.clientWidth; // Calculate overflow amount
            const duration = Math.max(3, (overflowAmount / 40) + 1);
            container.style.setProperty('--overflow-width', `-${overflowAmount + 10}px`);
            container.style.setProperty('--scroll-duration', `${duration}s`);
            container.classList.add('scrolling');
        }
    });
}

function setupTitleScrollObserver(containerSelector) {
    if (titleScrollObserver) titleScrollObserver.disconnect();
    const options = { root: document.querySelector('.content-section-board'), rootMargin: '0px', threshold: 0.8 };

    titleScrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                checkTitleOverflow(entry.target);
            } else {
                entry.target.classList.remove('scrolling');
            }
        });
    }, options);

    if (titleResizeObserver) titleResizeObserver.disconnect();
    titleResizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            checkTitleOverflow(entry.target); // Re-check overflow on resize
        }
    });

    const titlesToObserve = document.querySelectorAll(containerSelector);
    titlesToObserve.forEach(title => {
        titleScrollObserver.observe(title);
        titleResizeObserver.observe(title);
    });
}

// =========================================================
// DAILY LOGIN BONUS
// =========================================================

// NOUVEAU: Fonction pour vérifier si un bonus est disponible (sans l'attribuer)
function checkDailyBonus() {
    if (dailyBonusCompleted) {

        return;
    }

    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    if (lastLoginDate === today) {

        return; // Bonus déjà reçu
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastLoginDate === yesterdayStr) {
        // La série continue
        loginStreak++;
    } else {
        // La série est brisée ou c'est la première connexion
        loginStreak = 1;
    }

    // La série est plafonnée à 7 jours
    if (loginStreak > 7) {
        loginStreak = 1;
    }

    // Sauvegarder la série mise à jour (mais pas la date de connexion)
    safeStorage.setItem('mmg-loginStreak', loginStreak.toString());
}

// NOUVEAU: Fonction pour réclamer le bonus quotidien (appelée par le bouton)
function claimDailyBonus() {
    if (dailyBonusCompleted) {

        return;
    }

    const today = new Date().toISOString().split('T')[0];

    if (lastLoginDate === today) {

        showDialog(getTranslation('dailyBonusAlreadyClaimed'));
        return;
    }

    let rewardMessage = '';
    let rewardCoins = 0;

    if (loginStreak < 7) {
        rewardCoins = loginStreak;
        userCoins += rewardCoins;
        rewardMessage = getTranslation('dailyBonus', { count: rewardCoins, streak: loginStreak });
        playAudio(sounds.coin);
    } else if (loginStreak >= 7) { // C'est le 7ème jour !
        // Débloquer le succès pour le thème Default 2
        updateAchievementProgress('dailyBonusMaster', 1);

        const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
        const lockedTracks = allUnlockableTracks.filter(t => !unlockedDreamSeasonTracks.includes(t.id));

        if (lockedTracks.length > 0) {
            // Cas normal : on débloque un titre
            const trackToUnlock = lockedTracks[Math.floor(Math.random() * lockedTracks.length)];
            unlockedDreamSeasonTracks.push(trackToUnlock.id);
            safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));
            rewardMessage = getTranslation('dailyBonusUnlock', { title: trackToUnlock.title });
            playAudio(sounds.achievementUnlocked);
            unlockCardUI(trackToUnlock.id);

            if (lockedTracks.length === 1) {
                // C'était le dernier titre
                showDialog(getTranslation('dailyBonusAllTracksUnlocked'));
                // Marquer le jeu comme "fini"
                dailyBonusCompleted = true;
                safeStorage.setItem('mmg-dailyBonusCompleted', 'true');
            }
        } else {
            // Tout est déjà débloqué
            dailyBonusCompleted = true;
            safeStorage.setItem('mmg-dailyBonusCompleted', 'true');
            rewardMessage = getTranslation('dailyBonusFinalTheme');
        }

        // La série se réinitialise après le 7ème jour
        loginStreak = 0;
    } else { // C'est le 7ème jour !
    }

    // Sauvegarde de la date de connexion (marque le bonus comme récupéré)
    lastLoginDate = today;
    safeStorage.setItem('mmg-lastLoginDate', lastLoginDate);
    safeStorage.setItem('mmg-loginStreak', loginStreak.toString());
    safeStorage.setItem('mmg-userCoins', userCoins.toString());

    // Affichage du message (sauf pour le cas final géré par showBigDialog)
    if (rewardMessage && !rewardMessage.includes('Super Listener')) {
        showDialog(rewardMessage);
    }

    updateCoinDisplay();
    updateNotificationDot();

    // Mettre à jour l'affichage du bonus quotidien
    renderDailyBonusProgress();
}

// NOUVEAU: Fonction pour afficher la progression du bonus quotidien
function renderDailyBonusProgress() {
    const section = document.getElementById('daily-bonus-section');

    if (!section) return;

    // Si le "jeu" du bonus est terminé, on cache toute la section
    if (dailyBonusCompleted) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');

    // Vérifier si un bonus est disponible aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const bonusAvailable = lastLoginDate !== today;

    // NOUVEAU: Option 3 - Design "Liste Native" pour Mobile
    if (window.innerWidth <= 952) {
        const isClaimed = !bonusAvailable;

        // Classes dynamiques pour l'état Actif vs Récupéré
        const containerClass = isClaimed
            ? 'reco-card daily-bonus-list-item claimed'
            : 'reco-card daily-bonus-list-item active';

        const iconHtml = isClaimed
            ? '<i class="fas fa-check"></i>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gift"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>';

        // Style de l'icône : Blanc sur fond transparent si actif, Gris si récupéré
        const iconContainerStyle = isClaimed
            ? 'background: transparent; color: #94a3b8; width: 24px; height: 24px; font-size: 0.9rem;'
            : 'background: #eff6ff; color: #3b82f6;'; // Fond bleu très clair, icône bleue

        const titleText = isClaimed ? 'Bonus récupéré' : getTranslation('dailyBonusTitle');
        const subtitleText = isClaimed ? '' : `Réclamer +${loginStreak >= 7 ? 'Bonus' : loginStreak} Pièces`;

        const html = `
            <div class="${containerClass}" id="daily-bonus-card" style="border-bottom: none;">
                <div class="reco-image-container" style="${iconContainerStyle}">
                    ${iconHtml}
                </div>
                <div class="reco-info">
                    <p class="reco-title" style="${isClaimed ? 'font-size: 0.8rem; color: #94a3b8;' : ''}">${titleText}</p>
                    ${!isClaimed ? `<p class="reco-subtitle" style="text-transform: none; color: #94a3b8;">${subtitleText}</p>` : ''}
                </div>
                ${!isClaimed ? `
                <div class="bonus-badge" style="background: #f1f5f9; padding: 4px 10px; border-radius: 20px; color: #1e293b; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;">
                    <i class="fas fa-coins"></i> +${loginStreak}
                </div>` : ''}
            </div>
        `;
        section.innerHTML = html;
        section.style.padding = '0'; // Retire le padding du conteneur pour que la carte prenne toute la place

        // Ajout de l'événement de clic sur toute la carte
        const card = document.getElementById('daily-bonus-card');
        if (card && bonusAvailable) {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                playAudio(sounds.coin);
                claimDailyBonus();
            });
        }
    } else {
        // === DESIGN DESKTOP (Carte classique avec détails) ===
        section.style.padding = ''; // Rétablit le padding par défaut

        // Génération des pilules
        let pillsHtml = '';
        for (let i = 1; i <= 7; i++) {
            let pillClass = 'reward-pill';
            if (i < loginStreak) {
                pillClass += ' completed';
            } else if (i === loginStreak) {
                // Si bonus dispo, c'est le jour actif. Si déjà pris, c'est completed.
                pillClass += bonusAvailable ? ' active' : ' completed';
            }
            pillsHtml += `<div class="${pillClass}"></div>`;
        }

        // Texte du bouton
        const buttonText = bonusAvailable ? getTranslation('claimBonus') : getTranslation('dailyBonusAlreadyClaimed');

        // NOUVEAU: Détermination de la récompense affichée
        const isSpecialDay = loginStreak >= 7;
        const rewardAmount = isSpecialDay ? "" : `+${loginStreak}`;
        const rewardIconHtml = isSpecialDay ? '<i class="fas fa-compact-disc"></i>' : COIN_SVG;
        // TRADUCTION
        const rewardLabel = isSpecialDay ? getTranslation('dailyBonusExclusiveTrack') : getTranslation('dailyBonusCoins');
        const rewardSubtext = bonusAvailable ? getTranslation('dailyBonusToWin') : getTranslation('dailyBonusReceived');

        const html = `
            <div class="daily-bonus-header">
                <div>
                    <h3 class="daily-bonus-title">${getTranslation('dailyBonusTitle')}</h3>
                    <p class="daily-bonus-subtitle">${getTranslation('dailyBonusStreak')} ${loginStreak} / 7</p>
                </div>
                <div class="daily-bonus-reward-box">
                    <span class="reward-amount">${rewardAmount}</span>
                    ${rewardIconHtml}
                </div>
            </div>

            <div class="daily-bonus-content">
                <p class="daily-bonus-info">${rewardSubtext} <strong>${rewardLabel}</strong></p>
                <div class="daily-bonus-pills">
                    ${pillsHtml}
                </div>
                <button id="claim-bonus-btn" class="daily-bonus-action-btn" ${!bonusAvailable ? 'disabled' : ''}>
                    ${buttonText}
                </button>
            </div>
        `;

        section.innerHTML = html;
    }

    // Réattacher l'événement au nouveau bouton
    const newBtn = document.getElementById('claim-bonus-btn');
    if (newBtn && bonusAvailable) {
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playAudio(sounds.select);
            claimDailyBonus();
        });
    }

}



// =========================================================
// INITIALIZATION
// =========================================================
function initializeApp() {
    document.body.style.cursor = '';

    // NOUVEAU: S'assure que le conteneur des profils a la classe pour l'indicateur
    const profileSwitch = document.querySelector('.profile-switch');
    if (profileSwitch) profileSwitch.classList.add('sliding-tabs');

    // CORRECTION: Rendre la sidebar immédiatement pour éviter le flash de contenu vide.
    const activeProfile = getActiveProfile(); // Get active profile
    renderSidebarNav(activeProfile);

    // NOUVEAU: Initialiser l'état du switcher Spotimon
    const spotimonSwitch = document.getElementById('spotimon-profile-switch');
    if (spotimonSwitch) {
        spotimonSwitch.classList.toggle('is-beats', activeProfile === 'mmg-beats');
    }

    // NOUVEAU: Rendre le bonus quotidien
    renderDailyBonusProgress();

    resetMiniPlayerUI();
    setupTagFilters();
    renderUpdateLog();

    // CORRECTION : La traduction complète est appliquée ici, une fois que tout est prêt.
    applyLanguage(currentLang);

    // NOUVEAU: Vérifier et attribuer le bonus de connexion quotidien
    checkDailyBonus();

    // NOUVEAU: Vérifier si l'application est installée pour débloquer le thème Android
    checkPwaUnlock();

    applyInitialTheme();

    setVolume(100);
    setupEventListeners();

    const initialSectionId = window.location.hash.substring(1);
    let sectionToLoad = 'home-dashboard-section';

    // --- HISTORY TRAP SETUP --- // Setup history trap
    // 1. Replace the current history entry with a "trap" entry. This is the page we will prevent the user from reaching.
    // CORRECTION: Toujours rediriger vers le tableau de bord au rechargement.
    history.replaceState({ section: 'home-dashboard-section', fromApp: true, isTrap: true }, '', '#home-dashboard-section');

    // 2. Push the actual main menu state on top of the trap. This is the page the user will see and be returned to.
    history.pushState({ section: 'home-dashboard-section', fromApp: true }, '', '#home-dashboard-section');

    sectionToLoad = 'home-dashboard-section';

    // Final and unique call to update notifications
    updateNotificationDot();

    // CORRECTION : Le rendu des notifications est appelé ici, après que tout le reste soit prêt.
    renderUpdateLog();

    // NOUVEAU: Positionne tous les indicateurs au chargement
    document.querySelectorAll('.sliding-tabs').forEach(container => updateSlidingIndicator(container));
    // CORRECTION: Affiche l'invite d'installation PWA après un court délai

    // CORRECTION: Synchroniser l'apparition des barres du bas avec le contenu principal (après l'intro)
    const mainContent = document.getElementById('main-content-wrapper');
    if (mainContent) {
        const observer = new MutationObserver((mutations) => {
            // Dès que l'opacité du contenu change (fin de l'intro), on affiche les barres
            if (window.getComputedStyle(mainContent).opacity > 0.1) {
                const bottomBars = document.querySelectorAll('.bottom-ui-container, .mobile-bottom-nav');
                bottomBars.forEach(bar => {
                    bar.style.opacity = '1';
                });
                observer.disconnect(); // On arrête d'observer une fois fait
            }
        });

        // On observe les changements d'attributs (style/class) sur le wrapper principal
        observer.observe(mainContent, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // NOUVEAU: Initialiser le drag & drop pour la file d'attente
    setupQueueDragAndDrop();

    // NOUVEAU: Injecter le bouton de fermeture dans le splash screen du guide s'il n'existe pas
    // (Solution de secours car js/guides.js n'est pas modifiable directement ici)
    const guideSplashObserver = new MutationObserver(() => {
        const splash = document.getElementById('guide-splash');
        if (splash && !splash.querySelector('.splash-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'splash-close-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.onclick = () => {
                splash.classList.remove('active');
                const overlay = document.getElementById('guide-overlay');
                if (overlay) overlay.classList.remove('active');
            };
            splash.appendChild(closeBtn);
        }
    });
    guideSplashObserver.observe(document.body, { childList: true, subtree: true });

    // pour ne pas être intrusive dès le départ.
    setTimeout(showPwaInstallPrompt, 5000);

    handleMenuNavigation(sectionToLoad, false); // This will show the correct section without adding to history.

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(function (registration) {

        }).catch(function (err) {
            console.error('Échec de l\'enregistrement du Service Worker:', err);
        });
        window.addEventListener('load', () => {
            // Listener for messages from the Service Worker // Add message listener
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.action) {

                    switch (event.data.action) {
                        case 'play':
                            if (activePlayer) activePlayer.playVideo();
                            break;
                        case 'pause':
                            if (activePlayer) activePlayer.pauseVideo();
                            break;
                        case 'nexttrack':
                            playNextTrack(1, true);
                            break;
                        case 'previoustrack':
                            playNextTrack(-1, true);
                            break;
                        case 'stop':
                            if (activePlayer && typeof activePlayer.stopVideo === 'function') activePlayer.stopVideo();
                    }
                }
            });
        });
    }
}

// =========================================================
// EVENT LISTENERS & NAVIGATION LOGIC
// =========================================================
const playNextTrack = (direction = 1, forcePlay = false, isSwipe = false, promptUser = false) => {
    if (!forcePlay && !promptUser) playAudio(sounds.select);
    let nextItem; // Next item to play
    let nextIndex;
    let nextItemId;
    let playbackSource = 'context'; // Par défaut, on utilise la file de contexte

    // 1. Priorité à la file d'attente utilisateur (userQueue)
    const currentPlayingIndexInUserQueue = currentPlayingItem ? userQueue.indexOf(currentPlayingItem.id) : -1;

    if (currentPlayingIndexInUserQueue > -1 && userQueue.length > 1) {
        // Le titre actuel est dans la file utilisateur, on joue le suivant de cette file
        nextIndex = (currentPlayingIndexInUserQueue + direction + userQueue.length) % userQueue.length;
        nextItemId = userQueue[nextIndex];
        playbackSource = 'user';
    } else if (userQueue.length > 0) {
        // Le titre actuel n'est PAS dans la file utilisateur, mais la file utilisateur n'est pas vide.
        // On joue le premier titre de la file utilisateur.
        nextItemId = userQueue[0];
        nextIndex = 0;
        playbackSource = 'user';
    } else {
        // 2. Fallback: la file de lecture de contexte (contextPlaybackQueue)
        if (contextPlaybackQueue.length === 0 || currentQueueIndex === -1) {
            return;
        }
        nextIndex = (currentQueueIndex + direction + contextPlaybackQueue.length) % contextPlaybackQueue.length;
        nextItemId = contextPlaybackQueue[nextIndex];
    }

    const currentQueue = playbackSource === 'user' ? userQueue : contextPlaybackQueue;

    // Logique de lecture aléatoire (s'applique à la file en cours d'utilisation)
    if (isShuffleMode && forcePlay) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * currentQueue.length);
        } while (currentQueue.length > 1 && randomIndex === (playbackSource === 'user' ? currentPlayingIndexInUserQueue : currentQueueIndex));
        nextIndex = randomIndex;
        nextItemId = currentQueue[nextIndex];
    }

    nextItem = findItemById(nextItemId);

    if (nextItem) {
        if (promptUser) {
            // SOLUTION SIMPLE: On ferme le lecteur mobile et on va sur la page de détails
            const mobilePlayer = document.getElementById('mobile-full-player');
            if (mobilePlayer) mobilePlayer.classList.remove('active');

            // NOUVEAU: On force la mise à jour de l'état global (index, retrait de la file, etc.)
            // Cela évite que les titres s'accumulent dans la queue sans avancer.
            const originType = playbackSource === 'user' ? 'queue' : (currentPlaybackContext ? currentPlaybackContext.type : 'titles');
            const sourceForBanner = playbackSource === 'user' ? 'queue' : (currentPlaybackContext ? currentPlaybackContext.name : "");

            // playVideoWhenReady avec cueOnly=true met à jour les index et pré-charge le morceau sans autoplay.
            playVideoWhenReady(nextItem, currentQueue, nextIndex, originType, false, true, isSwipe, true);

            if (isMusicTitle(nextItem)) {
                renderMusicTitleDetails(nextItem, false, true, sourceForBanner); // false = Cue only, true = isAutoTransition
                showSection('music-title-details-section');
            }
            // Note: Pour les vidéos, playVideoWhenReady s'occupe déjà de l'affichage via loadAndPlayVideo.
        } else if (forcePlay) {
            // Si on joue depuis la userQueue, le type de contexte est 'queue'
            const originType = playbackSource === 'user' ? 'queue' : currentPlaybackContext.type;
            playVideoWhenReady(nextItem, currentQueue, nextIndex, originType, false, true, isSwipe);
        } else {
            renderMusicTitleDetails(nextItem);
            showSection('music-title-details-section');
        }
    }
};

function setupEventListeners() {
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playAudio(sounds.back); // Play back sound
            if (isTutorialActive || document.getElementById('home-dashboard-section').classList.contains('hidden') === false) return;

            // NOUVEAU: Si on est dans la bibliothèque, on retourne à l'accueil.
            const librarySection = document.getElementById('library-section');
            if (librarySection && !librarySection.classList.contains('hidden')) {
                resetToHome(false); // false pour ne pas jouer le son 'select' en plus
                return;
            }

            // NOUVEAU: Gère la fermeture de l'overlay de la pochette avec le bouton retour
            if (!document.getElementById('artwork-overlay').classList.contains('hidden')) {
                document.getElementById('artwork-overlay').classList.add('hidden');
                // L'événement popstate qui suit va nettoyer l'historique
                return;
            }

            window.history.back();
        });
    }

    // NOUVEAU: Gestion du scroll pour le header transparent/solide
    const header = document.querySelector('.top-bar');
    const scrollContainers = document.querySelectorAll('.page-content');

    scrollContainers.forEach(container => {
        container.addEventListener('scroll', () => {
            if (container.scrollTop > 20) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    });

    // NOUVEAU: Gestionnaire pour le bouton de recherche mobile
    const mobileSearchBtn = document.getElementById('mobile-search-btn');
    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playAudio(sounds.select);
            const searchBar = document.querySelector('.search-bar');
            searchBar.classList.toggle('visible');
            // Si la barre devient visible, on met le focus sur l'input
            if (searchBar.classList.contains('visible')) {
                document.getElementById('search-input').focus();
            }
        });
    }

    // NOUVEAU: Gestionnaire pour le nouveau switcher de profil "Studio"
    const mmgBranding = document.getElementById('mmg-branding');
    if (mmgBranding) {
        mmgBranding.addEventListener('click', () => {
            const isCurrentlyMusic = mmgBranding.classList.contains('is-music');
            const targetProfile = isCurrentlyMusic ? 'mmg-beats' : 'mmg-music';

            // Simule un clic sur le bouton de l'ancien switcher (qui est maintenant caché)
            // pour réutiliser toute la logique de changement de profil existante.
            const targetTab = document.querySelector(`.profile-tab[data-project="${targetProfile}"]`);
            if (targetTab) {
                targetTab.click();
            }
        });
    }

    // NOUVEAU: Gestionnaire pour le switcher Spotimon (MMG Control Core)
    const spotimonLens = document.getElementById('spotimon-lens-btn');
    if (spotimonLens) {
        spotimonLens.addEventListener('click', () => {
            const parent = document.getElementById('spotimon-profile-switch');
            const isBeats = parent.classList.contains('is-beats');
            const targetProfile = isBeats ? 'mmg-music' : 'mmg-beats'; // Bascule vers l'autre profil
            const targetTab = document.querySelector(`.profile-tab[data-project="${targetProfile}"]`);
            if (targetTab) targetTab.click();
        });
    }

    // NOUVEAU: Gestionnaire pour le bouton switch dans la section À propos
    const aboutSwitchBtn = document.getElementById('about-switch-profile-btn');
    if (aboutSwitchBtn) {
        aboutSwitchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // On utilise le même mécanisme que le branding block
            const mmgBranding = document.getElementById('mmg-branding');
            if (mmgBranding) {
                mmgBranding.click();
            }
            // Petit feedback sonore
            playAudio(sounds.select);
        });
    }

    // NOUVEAU: Gestionnaire pour le switch de profil mobile
    const mobileProfileSwitch = document.getElementById('mobile-profile-switch');
    if (mobileProfileSwitch) {
        mobileProfileSwitch.addEventListener('click', (e) => {
            const button = e.target.closest('.profile-switch-btn'); // Get the clicked button
            if (!button || button.classList.contains('active')) return;

            // Simule un clic sur l'onglet de profil correspondant dans la sidebar (qui est cachée)
            const targetProfile = button.dataset.project;
            const desktopTab = document.querySelector(`.profile-tab[data-project="${targetProfile}"]`);
            if (desktopTab) {
                desktopTab.click();
                // Mettre à jour l'état visuel du switch mobile
                document.querySelectorAll('#mobile-profile-switch .profile-switch-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                // NOUVEAU: Met à jour l'indicateur du profil après le clic
                setTimeout(() => updateSlidingIndicator(document.querySelector('.profile-switch')), 0);
            }
        });
    }

    // NOUVEAU: Gestionnaire pour le bouton Paramètres de la top bar (PC)
    const topBarSettingsBtn = document.getElementById('top-bar-settings-btn');
    if (topBarSettingsBtn) {
        topBarSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openOverlay(document.getElementById('settings-overlay'), sounds.select, true);
        });
    }

    // NOUVEAU: Gestionnaire pour le bouton d'orientation
    const orientationBtn = document.getElementById('orientation-btn');
    if (orientationBtn) {
        orientationBtn.addEventListener('click', async () => {
            playAudio(sounds.select);
            try {
                if (screen.orientation && screen.orientation.lock) {
                    if (screen.orientation.type.startsWith('portrait')) {
                        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
                        await screen.orientation.lock('landscape');
                    } else {
                        screen.orientation.unlock();
                        if (document.fullscreenElement) await document.exitFullscreen();
                    }
                } else {
                    showDialog("Rotation non supportée.");
                }
            } catch (err) {
                console.error(err);
                showDialog("Impossible de changer l'orientation.");
            }
        });
    }

    document.getElementById('library-tabs-container').addEventListener('click', (e) => {
        const tab = e.target.closest('.playlist-tab-btn');
        if (tab && !tab.classList.contains('active')) {
            const tabId = tab.dataset.tabId;
            playAudio(sounds.hover);
            currentViewContext = { type: 'library', data: tabId };
            history.replaceState({ ...history.state, context: currentViewContext }, '', window.location.hash);
            renderLibraryPage(tabId);
        }
    });

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.isTrap) {
            history.forward();
            return; // If it's a trap, go forward
        }
        // NOUVEAU: Gère la fermeture de l'overlay de la pochette via le bouton retour du navigateur/téléphone
        if (event.state && event.state.overlay === 'artwork') {
            document.getElementById('artwork-overlay').classList.add('hidden');
            // NOUVEAU: Restaure les couleurs des barres système
            updateThemeColorMeta();
            return;
        }

        // CORRECTION: La logique est simplifiée. On passe l'état complet à handleMenuNavigation.
        const sectionId = event.state?.section || 'home-dashboard-section';
        const context = event.state?.context || null;
        handleMenuNavigation(sectionId, false, context);
    });


    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const previousProfile = getActiveProfile();
            const activeProfile = tab.dataset.project;

            // NOUVEAU: Mettre à jour l'état visuel du nouveau switcher "Studio"
            const mmgBranding = document.getElementById('mmg-branding');
            if (mmgBranding) {
                if (activeProfile === 'mmg-music') {
                    mmgBranding.classList.add('is-music');
                    mmgBranding.classList.remove('is-beats');
                } else {
                    mmgBranding.classList.add('is-beats');
                    mmgBranding.classList.remove('is-music');
                }
            }

            // NOUVEAU: Mettre à jour l'état visuel du switcher Spotimon
            const spotimonSwitch = document.getElementById('spotimon-profile-switch');
            if (spotimonSwitch) {
                spotimonSwitch.classList.toggle('is-beats', activeProfile === 'mmg-beats');
            }

            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (!previousProfile || previousProfile === activeProfile) { // If no change or error
                return; // Pas de changement ou erreur, on ne fait rien.
            }

            // Logique de navigation intelligente
            const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id || 'home-dashboard-section';
            let sectionToLoad = 'home-dashboard-section';
            const commonSections = ['library-section', 'shop-section']; // Sections qui existent pour les deux profils

            if (commonSections.includes(currentSectionId)) { // If on a common section, stay there.
                sectionToLoad = currentSectionId;
            }

            if (currentSectionId !== 'home-dashboard-section') {
                const prevItem = Object.values(siteData.projectData[previousProfile]).find(p => p.link === currentSectionId);
                if (prevItem) {
                    const equivalentSection = Object.values(siteData.projectData[activeProfile]).find(item => {
                        // Compare par langKey pour trouver l'équivalent (ex: 'videoClips') ou par le lien pour les sections communes
                        return item.langKey === prevItem.langKey || item.link === prevItem.link;
                    });

                    if (equivalentSection) {
                        sectionToLoad = equivalentSection.link;
                    }
                }
            }
            renderSidebarNav(activeProfile); // Update sidebar immediately
            handleMenuNavigation(sectionToLoad); // Navigue vers la section équivalente ou l'accueil
        });
    });

    // CORRECTION: L'écouteur est sur le body pour couvrir tous les éléments, même ceux déplacés (ex: thème DS)
    const mainWrapper = document.body;

    mainWrapper.addEventListener('click', (e) => { // Add click listener to main wrapper
        // ... (le reste du code de l'animation de clic)

        // CORRECTION: Ajout de TOUS les boutons du lecteur mobile (mini, plein écran, header) et de la barre de navigation à la liste des sélecteurs pour l'animation.
        const iconButton = e.target.closest('.top-bar-btn, .player-buttons > i, .controls-box, .player-right-controls > i, .mobile-player-controls > i, .mobile-player-play-box, .mobile-player-secondary-controls > i, .mobile-player-header-btn, .mini-player-controls > i, .mobile-nav-link');
        if (iconButton) {
            // Si c'est le bouton play/pause mobile, on anime l'icône à l'intérieur
            const targetForAnimation = iconButton.id === 'mobile-player-play-pause-box' ? iconButton.querySelector('i') : iconButton;

            iconButton.classList.remove('icon-pop'); // Reset animation class
            void iconButton.offsetWidth; // Trigger reflow
            iconButton.classList.add('icon-pop');
        }

        // CORRECTION: Gestion du clic sur les boutons de guide du tableau de bord pour un lancement direct.
        const guideButton = e.target.closest('.guide-choice-btn[data-guide]');
        if (guideButton) {
            e.preventDefault();
            const guideKey = guideButton.dataset.guide;

            // NOUVEAU: Si le bouton est dans l'overlay de sélection, on ferme l'overlay
            if (guideButton.closest('#guide-selection-overlay')) {
                closeOverlay(null);
            }

            // NOUVEAU: Lance le nouveau système de guides
            if (window.guideManager) {
                window.guideManager.start(guideKey);
            }
            return; // On arrête ici pour ne pas traiter d'autres clics
        }

        // NOUVEAU: Gestion du clic sur les actualités
        const newsItem = e.target.closest('.clickable-news');
        if (newsItem) {
            e.preventDefault();
            const newsId = newsItem.dataset.newsId;
            playAudio(sounds.select);
            handleMenuNavigation('news-details-section', true, { type: 'news', data: newsId });
            return;
        }

        const filterTagAction = e.target.closest('[data-action="filter-tag"]');
        if (filterTagAction) {
            e.preventDefault();
            e.stopPropagation(); // Stop event propagation
            const tag = filterTagAction.dataset.tag;
            document.getElementById('search-input').value = '';
            document.querySelectorAll('#tags-filter-list input').forEach(cb => cb.checked = false);
            const tagCheckbox = document.querySelector(`#tags-filter-list input[value="${tag.toLowerCase()}"]`);
            if (tagCheckbox) {
                tagCheckbox.checked = true;
            }
            updateVisibleCards();
            return;
        }

        const albumLink = e.target.closest('#details-album-link');
        if (albumLink) {
            e.preventDefault();
            e.stopPropagation();
            const albumId = albumLink.dataset.albumId;
            if (albumId) {
                playAudio(sounds.select);
                handleMenuNavigation('titles-section', true, { type: 'titles', data: albumId });
            }
            return;
        }

        const yearLink = e.target.closest('#details-year-link');
        if (yearLink) {
            e.preventDefault();
            e.stopPropagation(); // Stop event propagation
            const year = yearLink.dataset.year;
            if (year) {
                playAudio(sounds.select);
                document.getElementById('search-input').value = '';
                document.querySelectorAll('#tags-filter-list input').forEach(cb => cb.checked = false);

                const yearResults = Object.fromEntries(Object.entries(allSearchableItems).filter(([_, item]) => item.year === year));
                document.getElementById('search-results-title').textContent = year;
                renderCards('search-results-cards', yearResults, 'search');
                showSection('search-results-section');
            }
        }

        const associatedVideo = e.target.closest('.associated-video-card');
        if (associatedVideo) {
            e.preventDefault(); // CORRECTION: Moved here to be more specific
            const itemId = associatedVideo.dataset.itemId;
            const item = findItemById(itemId);
            if (item) {
                playAudio(sounds.select);
                showSection('large-player-section');
                playVideoWhenReady(item, [], -1, 'video', false, false, false, true); // Explicitly from video, cueOnly=true

            }
            return;
        }

        const link = e.target.closest('a.card-link-wrapper, .sidebar-nav-link, .dashboard-card-button, .carousel-item, .recent-video-item, .dashboard-about-card, .see-more-btn');
        if (!link) return; // If no link, return
        e.preventDefault();
        const { youtubeId, link: dataLink, albumId, unlockAlbum, itemId: linkItemId } = link.dataset || {};
        const cardElement = link.closest('.card, .carousel-item'); // CORRECTION: Inclut .carousel-item pour trouver l'ID
        let itemId = cardElement ? cardElement.dataset.itemId : linkItemId; // CORRECTION: Logique améliorée pour trouver l'ID

        // NOUVELLE LOGIQUE POUR LE CARROUSEL
        // Si on a cliqué sur un .carousel-item, on vérifie la cible exacte.
        if (link.classList.contains('carousel-item')) {
            const buttonClicked = e.target.closest('.dashboard-card-button');
            if (buttonClicked) {
                // Clic sur le bouton "Écouter" : on lance la lecture.
                itemId = buttonClicked.dataset.itemId; // On prend l'ID du bouton
                // La logique existante pour `youtubeId` plus bas s'en chargera.
            } else {
                // Clic ailleurs sur l'item : on navigue vers les détails.
                renderMusicTitleDetails(findItemById(itemId));
                showSection('music-title-details-section');
                return;
            }
        }

        // If it's a playable item (youtubeId)
        if (youtubeId) {
            const item = findItemById(itemId); // CORRECTION: Utilise la variable itemId fiabilisée
            if (!item) return;

            // CORRECTION: Logique d'achat de titre déplacée ici
            if (item.isUnlockable && !unlockedDreamSeasonTracks.includes(item.id)) {
                if (userCoins >= COIN_COST_UNLOCK) {
                    userCoins -= COIN_COST_UNLOCK;
                    unlockedDreamSeasonTracks.push(item.id);
                    safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
                    safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));

                    showDialog(`${getTranslation('youUnlocked')} "${item.title}"!`);
                    playAudio(sounds.coin);
                    updateCoinDisplay();
                    unlockCardUI(item.id); // NOUVEAU: Appelle la fonction de mise à jour de l'UI
                    renderUpdateLog();
                    updateNotificationDot();
                } else {
                    showDialog(getTranslation('needCoinsToUnlock', { COIN_COST_UNLOCK }));
                    playAudio(sounds.blocked);
                }
                return; // On arrête ici après la tentative d'achat

            }

            const activeProfile = getActiveProfile();
            let playlistIds = [];
            let startIndex = -1;

            if (isMusicTitle(item) && item.albumId) {
                const allAlbumTracks = Object.values(siteData.contentData[activeProfile].titles)
                    .filter(title => title.albumId === item.albumId);

                playlistIds = allAlbumTracks
                    .filter(track => !track.isUnlockable || unlockedDreamSeasonTracks.includes(track.id))
                    .map(title => title.id);

                startIndex = playlistIds.findIndex(id => id === item.id);

            } else {
                const parentContainer = cardElement?.parentElement;
                if (parentContainer) {
                    const allCardsInContainer = Array.from(parentContainer.querySelectorAll('.card:not(.locked)'));
                    playlistIds = allCardsInContainer
                        .map(card => card.dataset.itemId)
                        .filter(Boolean); // Filtre les IDs vides
                    startIndex = playlistIds.findIndex(pId => pId === item.id);
                }
            }

            currentNavigationContext = { playlist: playlistIds, index: startIndex };

            playAudio(sounds.select);

            // Determine playbackOriginType based on the current section and item type
            let playbackOriginType = 'titles'; // Default to 'titles'
            const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id;
            if (currentSectionId === 'library-section' && document.querySelector('#library-tabs-container .playlist-tab-btn[data-tab-id="liked"]')?.classList.contains('active')) {
                playbackOriginType = 'liked';
            } else if (item.type === 'video' || item.type === 'bonus') {
                playbackOriginType = 'video';
            } else if (currentSectionId === 'search-results-section') {
                playbackOriginType = 'search';
            } else if (item.albumId) {
                playbackOriginType = 'album'; // If it's an album track, and not from a more specific origin
            }
            if (isMusicTitle(item)) {
                // NAVIGATION SEULE : Ouvre la page de détails sans lancer la musique direct.
                renderMusicTitleDetails(item, false);
                showSection('music-title-details-section');
                currentViewContext = { type: 'music-details', data: item.id };

                // On met quand même à jour le contexte de navigation pour le bouton "Suivant"
                currentNavigationContext = { playlist: playlistIds, index: startIndex };
            } else {
                // Pour les vidéos/bonus, on lance direct comme avant
                // MODIFICATION: On affiche la section et on cue la vidéo pour compter la vue
                showSection('large-player-section');
                playVideoWhenReady(item, playlistIds, startIndex, playbackOriginType, false, false, false, true);
            }


        } else if (dataLink) {
            playAudio(sounds.select);
            // Si le clic vient de la sidebar, on gère la navigation
            if (e.target.closest('.sidebar-nav-link')) {
                handleMenuNavigation(dataLink);
            } else { // Sinon (clic sur une carte du menu principal), on navigue aussi
                handleMenuNavigation(dataLink);
            }
            // Mettre à jour la classe active dans la sidebar
            const activeProfile = getActiveProfile();
            renderSidebarNav(activeProfile);
            setTimeout(() => updateSlidingIndicator(document.querySelector('.profile-switch')), 0); // NOUVEAU: Met à jour l'indicateur après le clic
        } else if (albumId) {
            playAudio(sounds.select);
            const activeProfile = getActiveProfile();
            const titlesForAlbum = Object.fromEntries(Object.entries(siteData.contentData[activeProfile].titles).filter(([_, title]) => title.albumId === albumId));

            document.getElementById('titles-section-title').textContent = siteData.contentData[activeProfile].albums[albumId].title;
            currentViewContext = { type: 'titles', data: albumId }; // Set current view context
            renderCards('titles-cards', titlesForAlbum, 'title');
            showSection('titles-section');
        }
    });

    mainWrapper.addEventListener('mousedown', (e) => {
        const card = e.target.closest('.card');
        if (card) {
            const titleSpan = card.querySelector('.card__title.scrolling > span'); // Get scrolling title span
            if (titleSpan) {
                titleSpan.style.animationPlayState = 'paused';
            }
        }
    });
    mainWrapper.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.card');
        if (card) { // If card exists
            const titleSpan = card.querySelector('.card__title.scrolling > span');
            if (titleSpan) {
                titleSpan.style.animationPlayState = 'paused';
            }
        }
    }, { passive: true });

    const resumeScrolling = () => {
        document.querySelectorAll('.card__title.scrolling > span[style*="animation-play-state: paused"]').forEach(span => {
            span.style.animationPlayState = 'running';
        });
    };

    window.addEventListener('mouseup', resumeScrolling);
    window.addEventListener('touchend', resumeScrolling);

    const detailsAlbumLink = document.getElementById('details-album-link');
    if (detailsAlbumLink) {
        detailsAlbumLink.addEventListener('click', (e) => {
            e.preventDefault();
            const albumId = e.currentTarget.dataset.albumId;
            if (albumId) {
                playAudio(sounds.select);
                const activeProfile = getActiveProfile(); // Get active profile
                const titlesForAlbum = Object.fromEntries(Object.entries(siteData.contentData[activeProfile].titles).filter(([_, title]) => title.albumId === albumId));
                document.getElementById('titles-section-title').textContent = siteData.contentData[activeProfile].albums[albumId].title;
                currentViewContext = { type: 'titles', data: albumId };
                renderCards('titles-cards', titlesForAlbum, 'title');
                showSection('titles-section'); // Affiche la section
                setupTitleScrollObserver('titles-cards'); // Active le défilement pour cette section
            }
        });
    }

    // NOUVEAU: Agrandir la pochette depuis le lecteur mobile
    document.getElementById('mobile-player-album-art').addEventListener('click', (e) => {
        const fullPlayer = document.getElementById('mobile-full-player');
        const isDsTheme = document.body.classList.contains('theme-ds');

        if (fullPlayer.classList.contains('active') || isDsTheme) {
            // MODIFICATION: Si c'est un titre musical, on ouvre les détails (comme le mini-lecteur)
            if (currentPlayingItem && isMusicTitle(currentPlayingItem)) {
                playAudio(sounds.select);
                renderMusicTitleDetails(currentPlayingItem);
                showSection('music-title-details-section');
                currentViewContext = { type: 'music-details', data: currentPlayingItem.id };

                // Sur mobile standard, on ferme le lecteur pour voir la page en dessous
                if (fullPlayer.classList.contains('active')) {
                    fullPlayer.classList.remove('active');
                }
            } else {
                // Sinon (vidéo), on garde le zoom
                document.getElementById('artwork-overlay-img').src = e.target.src;
                artworkOverlay.classList.remove('hidden'); // Show artwork overlay
                // Ajoute un état à l'historique pour capturer le bouton retour
                history.pushState({ overlay: 'artwork' }, '');
            }
        }
    });

    const artworkOverlay = document.getElementById('artwork-overlay');
    const detailsAlbumArt = document.getElementById('details-album-art');
    if (detailsAlbumArt) {
        detailsAlbumArt.addEventListener('click', (e) => {
            document.getElementById('artwork-overlay-img').src = e.target.src;
            artworkOverlay.classList.remove('hidden'); // Show artwork overlay
            // Ajoute un état à l'historique pour capturer le bouton retour
            history.pushState({ overlay: 'artwork' }, '');
        });
    }
    artworkOverlay.addEventListener('click', (e) => {
        if (e.target.id === 'artwork-overlay') {
            artworkOverlay.classList.add('hidden');
            if (history.state && history.state.overlay === 'artwork') {
                history.back();
            }
        }
    });

    // NOUVEAU: Gestionnaire pour le clic sur l'overlay de couverture (Lancer la lecture)
    const detailsCoverOverlay = document.getElementById('details-cover-overlay');
    if (detailsCoverOverlay) {
        detailsCoverOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentItemId = document.getElementById('music-title-details-section').dataset.currentItemId;
            const item = findItemById(currentItemId);
            if (item) {
                playAudio(sounds.select);
                // On lance la lecture (CUE ONLY pour que l'utilisateur clique sur le vrai lecteur YouTube ensuite, ou lecture directe selon préférence)
                // Ici on lance direct car l'utilisateur a cliqué sur "Play"
                playVideoWhenReady(item, currentNavigationContext.playlist, currentNavigationContext.index, 'titles', false, false, false, false);
            }
        });
    }

    // NOUVEAU: Gère le clic sur le bouton d'options de la page de détails
    const detailsOptionsBtn = document.getElementById('details-options-btn');
    if (detailsOptionsBtn) {
        detailsOptionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentItemId = document.getElementById('music-title-details-section').dataset.currentItemId;
            if (currentItemId) openCardMenu(e, currentItemId);
        });
    }

    // NOUVEAU: Sécurité pour forcer la fermeture des guides et rendre la main au site
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.guide-close') || e.target.closest('.splash-close-btn')) {
            document.getElementById('guide-overlay')?.classList.remove('active');
            document.getElementById('guide-marker')?.classList.remove('active');
            document.getElementById('guide-splash')?.classList.remove('active');
            document.getElementById('guide-tooltip')?.classList.remove('visible');
        }
    });

    document.getElementById('player-album-cover').addEventListener('click', () => {
        if (currentPlayingItem) {
            playAudio(sounds.select);
            const sectionToShow = isMusicTitle(currentPlayingItem) ? 'music-title-details-section' : 'large-player-section'; // Determine section to show
            showSection(sectionToShow);
            if (isMusicTitle(currentPlayingItem)) {
                renderMusicTitleDetails(currentPlayingItem);
            }
        }
    });

    // NOUVEAU: Logique pour le bouton d'effacement de la recherche
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');

    searchInput.addEventListener('input', () => {
        searchClearBtn.classList.toggle('hidden', searchInput.value === '');
        updateVisibleCards();
    });

    searchClearBtn.addEventListener('click', () => {
        playAudio(sounds.back); // NOUVEAU: Son retour
        searchInput.value = '';
        searchClearBtn.classList.add('hidden');
        updateVisibleCards();
        searchInput.focus(); // Redonne le focus à la barre de recherche
    });

    document.getElementById('tags-filter-list').addEventListener('change', () => {
        playAudio(sounds.select); // NOUVEAU: Son select
        updateVisibleCards();
    });

    document.getElementById('theme-switch').addEventListener('change', (e) => {
        document.body.classList.toggle('dark-theme', e.target.checked);
        playAudio(e.target.checked ? sounds.switchToBlack : sounds.switchToWhite);
        safeStorage.setItem('mmg-theme', e.target.checked ? 'dark' : 'light'); // CORRECTION: Utilisation de la clé de stockage correcte.
        // CORRECTION: Mettre à jour la couleur des barres système AVANT d'appliquer les thèmes de la boutique pour éviter les conflits.
        updateThemeColorMeta();
        applyTheme(safeStorage.getItem('ui-theme') || 'default');
    });

    document.getElementById('sfx-switch').addEventListener('change', (e) => {
        sfxEnabled = e.target.checked;
        safeStorage.setItem('mmg-sfxEnabled', JSON.stringify(sfxEnabled));
    });

    // NOUVEAU: Gestionnaire pour les notifications
    const notifSwitch = document.getElementById('notifications-switch');
    if (notifSwitch) {
        // Initialiser l'état du switch
        if ('Notification' in window) {
            notifSwitch.checked = Notification.permission === 'granted';
        } else {
            notifSwitch.disabled = true;
        }

        notifSwitch.addEventListener('change', async (e) => {
            if (e.target.checked) {
                const permission = await Notification.requestPermission();
                e.target.checked = permission === 'granted';
                if (permission === 'granted') updateAppBadge(); // Tente d'afficher une notif si nécessaire
            }
        });
    }

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            applyLanguage(e.currentTarget.dataset.lang);
            playAudio(sounds.select);
        });
    });


    document.getElementById('play-pause-box').addEventListener('click', () => {
        if (!activePlayer || !currentPlayingItem) {
            if (currentPlaylist.length > 0) {
                const firstItem = findItemById(currentPlaylist[0]);
                if (firstItem) {
                    playVideoWhenReady(firstItem, currentPlaylist, 0, 'myPlaylist'); // Explicitly from my playlist
                }
            }
            return;
        }
        playAudio(sounds.select);
        const state = activePlayer.getPlayerState();

        // NOUVEAU: Pour compter les vues sur PC, si on clique sur Play alors que c'est cued, on affiche un message et on va sur les détails
        const isMobile = window.matchMedia('(max-width: 952px)').matches;
        if (!isMobile && isMusicTitle(currentPlayingItem) && (state === YT.PlayerState.CUED || state === -1)) {
            showDialog(getTranslation('playFromDetailsNeeded'));
            renderMusicTitleDetails(currentPlayingItem);
            showSection('music-title-details-section');
            return;
        }

        if (state === YT.PlayerState.PLAYING) activePlayer.pauseVideo();
        else activePlayer.playVideo(); // Play or pause video
    });
    // NOUVEAU: Contrôles du mini-lecteur mobile
    document.getElementById('mini-player-play-pause-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('play-pause-box').click();
    });
    document.getElementById('mini-player-like-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('player-like-btn').click();
    });
    // CORRECTION: La croix du mini-lecteur doit arrêter la lecture ET masquer le lecteur.
    document.getElementById('mini-player-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        // CORRECTION: On vérifie si c'est une vidéo AVANT de réinitialiser.
        const wasVideo = currentPlayingItem && !isMusicTitle(currentPlayingItem);

        if (activePlayer && typeof activePlayer.stopVideo === 'function') activePlayer.stopVideo(); // Arrête la lecture
        currentPlayingItem = null; // Clear current playing item
        resetMiniPlayerUI(); // Réinitialise l'UI et cache le lecteur

        // Si le contenu fermé était une vidéo, on retourne à la page précédente.
        if (wasVideo) {
            history.back();
        }
    });

    // NOUVEAU: Contrôles du lecteur mobile
    document.getElementById('mobile-player-play-pause-box').addEventListener('click', () => {
        playAudio(sounds.select);
        const state = activePlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) activePlayer.pauseVideo(); else activePlayer.playVideo(); // Play or pause video
    });

    document.getElementById('next-video-btn').addEventListener('click', () => playNextTrack(1, true)); // Force play on PC
    document.getElementById('prev-video-btn').addEventListener('click', () => playNextTrack(-1, true)); // Force play on PC

    // CORRECTION: Logique centralisée pour le bouton Loop
    document.getElementById('loop-btn').addEventListener('click', (e) => {
        isPlayerLooping = !isPlayerLooping;
        playAudio(sounds.select);
        if (isPlayerLooping) { // If looping, disable shuffle
            isShuffleMode = false;
        }
        updateLoopShuffleUI();
    });

    // CORRECTION: Logique centralisée pour le bouton Shuffle
    document.getElementById('shuffle-btn').addEventListener('click', (e) => {
        isShuffleMode = !isShuffleMode;
        playAudio(sounds.select);
        if (isShuffleMode) { // If shuffling, disable loop
            isPlayerLooping = false;
        }
        updateLoopShuffleUI();
    });

    // NOUVEAU: Écouteurs pour les boutons du lecteur mobile (Mode Prompt pour compter les vues)
    document.getElementById('mobile-player-next-btn').addEventListener('click', () => playNextTrack(1, false, false, true));
    document.getElementById('mobile-player-prev-btn').addEventListener('click', () => playNextTrack(-1, false, false, true));

    // NOUVEAU: Écouteurs pour les flèches de la page détails (Mobile)
    document.getElementById('details-next-arrow')?.addEventListener('click', () => playNextTrack(1, false, false, true));
    document.getElementById('details-prev-arrow')?.addEventListener('click', () => playNextTrack(-1, false, false, true));

    // CORRECTION: Mobile buttons now directly call centralized logic
    document.getElementById('mobile-player-loop-btn').addEventListener('click', () => {
        isPlayerLooping = !isPlayerLooping;
        if (isPlayerLooping) isShuffleMode = false; // If looping, disable shuffle
        playAudio(sounds.select);
        updateLoopShuffleUI();
    });
    document.getElementById('mobile-player-shuffle-btn').addEventListener('click', () => {
        isShuffleMode = !isShuffleMode;
        if (isShuffleMode) isPlayerLooping = false; // If shuffling, disable loop
        playAudio(sounds.select);
        updateLoopShuffleUI();
    });
    document.getElementById('mobile-player-like-btn').addEventListener('click', () => document.getElementById('player-like-btn').click());
    // CORRECTION: The playlist button on the large mobile player now directly opens the overlay.
    document.getElementById('mobile-player-add-to-playlist-btn').addEventListener('click', (e) => {
        // NOUVEAU: Logique pour ajouter/retirer de la playlist
        if (currentPlayingItem) {
            togglePlaylistItem(currentPlayingItem.id);
        }
    });
    // CORRECTION: Le bouton 'options' a été retiré, on attache l'événement au bouton 'share'
    document.getElementById('mobile-player-queue-btn').addEventListener('click', (e) => {
        e.preventDefault();
        openMobileQueuePanel();
    });

    // NOUVEAU: Logique pour le panneau de file d'attente mobile
    const mobileQueuePanel = document.getElementById('mobile-queue-panel');
    const mobileQueueBackdrop = document.getElementById('mobile-queue-panel-backdrop');

    // CORRECTION: La fonction est modifiée pour forcer l'animation de glissement.
    function openMobileQueuePanel() {
        renderMobileQueue();
        // 1. On rend les éléments visibles mais le panneau est toujours en bas.
        mobileQueuePanel.classList.remove('hidden');
        mobileQueueBackdrop.classList.remove('hidden');
        // 2. On attend le prochain "tick" du navigateur pour appliquer la transformation.
        requestAnimationFrame(() => {
            mobileQueuePanel.style.transform = 'translateY(0)';
        });
        playAudio(sounds.select);
    }

    // CORRECTION: La fonction est modifiée pour forcer l'animation de glissement vers le bas.
    function closeMobileQueuePanel() {
        // 1. On lance l'animation de fermeture.
        mobileQueuePanel.style.transform = 'translateY(100%)';
        mobileQueueBackdrop.classList.add('fading-out'); // Bonus: fondu pour l'arrière-plan
        playAudio(sounds.back);
        // 2. On attend la fin de l'animation pour cacher les éléments.
        setTimeout(() => {
            mobileQueuePanel.classList.add('hidden');
            mobileQueueBackdrop.classList.add('hidden');
            mobileQueueBackdrop.classList.remove('fading-out'); // Nettoyage
        }, 400); // Doit correspondre à la durée de la transition CSS
    }

    mobileQueueBackdrop.addEventListener('click', closeMobileQueuePanel);

    // NOUVEAU: Gestion du swipe vers le bas pour fermer le panneau
    let queuePanelTouchStartY = 0;
    mobileQueuePanel.addEventListener('touchstart', e => {
        // On ne ferme pas si on scrolle dans la liste (sauf si on est tout en haut)
        const scrollable = e.target.closest('.mobile-queue-list');
        if (scrollable && scrollable.scrollTop > 0) {
            queuePanelTouchStartY = 0;
            return;
        }
        queuePanelTouchStartY = e.touches[0].clientY;
    }, { passive: true });
    mobileQueuePanel.addEventListener('touchend', e => {
        const touchEndY = e.changedTouches[0].clientY;
        if (queuePanelTouchStartY > 0 && touchEndY > queuePanelTouchStartY + 75) { // Swipe vers le bas de 75px
            closeMobileQueuePanel();
        }
        queuePanelTouchStartY = 0; // Reset pour éviter les conflits
    });

    // NOUVEAU: Logique pour le swipe-to-delete dans la file d'attente mobile
    let queueTouchStartX = 0;
    let queueTouchCurrentX = 0;
    let swipedItem = null;
    const SWIPE_THRESHOLD = -80; // Distance en px pour révéler le bouton

    document.getElementById('mobile-queue-list').addEventListener('touchstart', (e) => {
        const itemContent = e.target.closest('.playlist-item-content');
        if (itemContent && !itemContent.closest('.currently-playing')) {
            // Réinitialiser tout autre élément ouvert
            const currentlySwiped = document.querySelector('.playlist-item-content[style*="transform"]');
            if (currentlySwiped && currentlySwiped !== itemContent) {
                currentlySwiped.style.transform = 'translateX(0)';
            }

            swipedItem = itemContent;
            queueTouchStartX = e.touches[0].clientX;
            swipedItem.style.transition = 'none'; // Désactive la transition pendant le swipe
        }
    }, { passive: true });

    document.getElementById('mobile-queue-list').addEventListener('touchmove', (e) => {
        if (!swipedItem) return;
        queueTouchCurrentX = e.touches[0].clientX;
        const diffX = queueTouchCurrentX - queueTouchStartX;
        // On ne swipe que vers la gauche, et pas plus que la taille du bouton
        if (diffX < 0 && diffX > SWIPE_THRESHOLD - 20) {
            swipedItem.style.transform = `translateX(${diffX}px)`;
        }
    }, { passive: true });

    document.getElementById('mobile-queue-list').addEventListener('touchend', (e) => {
        if (!swipedItem) return;
        const diffX = queueTouchCurrentX - queueTouchStartX;
        swipedItem.style.transition = 'transform 0.3s ease-out'; // Réactive la transition

        if (diffX < SWIPE_THRESHOLD / 2) { // Si on a dépassé la moitié du chemin
            swipedItem.style.transform = `translateX(${SWIPE_THRESHOLD}px)`;
        } else { // Sinon, on revient à la position initiale
            swipedItem.style.transform = 'translateX(0)';
        }
        swipedItem = null; // Réinitialise pour le prochain swipe
        queueTouchStartX = 0;
        queueTouchCurrentX = 0;
    });

    document.getElementById('mobile-player-share-btn').addEventListener('click', () => document.getElementById('share-btn').click());




    const shareFunction = async () => {
        if (!currentPlayingItem) return;

        const shareData = {
            title: `Mmg Studio - ${currentPlayingItem.title}`,
            text: `Écoute "${currentPlayingItem.title}" sur Mmg Studio !`, // Share text
            url: window.location.href // Partage l'URL actuelle de l'application
        };

        // Utilise l'API de partage native si disponible (mobile)
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Erreur de partage:', err);
            }
        } else { // Fallback for desktop browsers
            navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${currentPlayingItem.youtube_id}`).then(() => showDialog(getTranslation('linkCopied')))
                .catch(err => showDialog(getTranslation('copyFailed')));
        }
    };
    document.getElementById('share-btn').addEventListener('click', shareFunction);
    document.getElementById('overlay-share-btn').addEventListener('click', shareFunction);


    document.getElementById('player-like-btn').addEventListener('click', (e) => {
        if (currentPlayingItem) toggleLike(currentPlayingItem.id);
    }); // Toggle like for current playing item
    // NOUVEAU: Barre de progression mobile
    document.getElementById('mobile-player-progress-bar').addEventListener('click', (e) => {
        playAudio(sounds.hover); // NOUVEAU: Son discret
        if (activePlayer && typeof activePlayer.getDuration === 'function') {
            const rect = e.currentTarget.getBoundingClientRect();
            activePlayer.seekTo(((e.clientX - rect.left) / rect.width) * activePlayer.getDuration(), true);
        }
    });

    document.getElementById('progress-bar').addEventListener('click', (e) => {
        playAudio(sounds.hover); // NOUVEAU: Son discret
        if (activePlayer && typeof activePlayer.getDuration === 'function') {
            const rect = e.currentTarget.getBoundingClientRect();
            activePlayer.seekTo(((e.clientX - rect.left) / rect.width) * activePlayer.getDuration(), true);
            seekDetectedInCurrentPlay = true;
        }
    }); // Seek in progress bar

    // CORRECTION: Vérifier l'existence des éléments avant d'ajouter des écouteurs.
    // Ces éléments n'existent pas sur mobile et causaient une erreur.
    // CORRECTION: Consolidation des boutons de volume (PC & Mobile)
    document.querySelectorAll('#volume-up-btn, #mobile-volume-up-btn').forEach(btn => {
        btn.addEventListener('click', () => setVolume(currentVolume + 10, true));
    });
    document.querySelectorAll('#volume-down-btn, #mobile-volume-down-btn').forEach(btn => {
        btn.addEventListener('click', () => setVolume(currentVolume - 10, true));
    });

    document.getElementById('temp-play-btn')?.addEventListener('click', () => {
        const musicSection = document.getElementById('music-title-details-section');
        const currentItemId = musicSection.dataset.currentItemId;
        if (currentItemId) {
            const itemToPlay = findItemById(currentItemId);
            if (itemToPlay) {
                playAudio(sounds.select);
                playVideoWhenReady(itemToPlay, [], -1, 'titles', false); // Explicitly from titles
            }
        }
    });

    const allOverlays = document.querySelectorAll('#settings-overlay, #wifi-overlay, #tags-filter-overlay, #playlist-overlay, #guide-selection-overlay, #player-options-overlay, #tutorial-overlay, #notifications-overlay, #reco-playlist-options-overlay, #queue-overlay, #mobile-queue-panel-backdrop, #purchase-confirm-overlay');


    document.getElementById('settings-overlay').addEventListener('click', (e) => {
        const viewSwitchBtn = e.target.closest('.view-switch-btn');
        if (viewSwitchBtn) {
            const newView = viewSwitchBtn.dataset.view;
            const currentView = safeStorage.getItem('mmg-global-view') || 'grid';
            if (newView !== currentView) {
                safeStorage.setItem('mmg-global-view', newView);
                playAudio(sounds.select);
                updateViewSwitcherUI();
                refreshCurrentView();
            }
        }
    });

    document.getElementById('wifi-btn-settings').addEventListener('click', (e) => { e.preventDefault(); openOverlay(document.getElementById('wifi-overlay'), null); });
    document.getElementById('tags-filter-btn').addEventListener('click', (e) => { e.preventDefault(); openOverlay(document.getElementById('tags-filter-overlay'), sounds.select, true); });
    // NOUVEAU: Le bouton playlist du lecteur de bureau ajoute/retire le titre
    document.getElementById('player-add-to-playlist-btn').addEventListener('click', (e) => {
        if (currentPlayingItem) {
            togglePlaylistItem(currentPlayingItem.id);
        }
    });
    document.getElementById('queue-btn').addEventListener('click', (e) => { // Open queue overlay
        e.preventDefault();
        openOverlay(document.getElementById('queue-overlay'), sounds.select, true);
    });
    document.getElementById('notifications-btn').addEventListener('click', (e) => {
        e.preventDefault();
        openOverlay(document.getElementById('notifications-overlay'), sounds.select, true);
    });
    document.getElementById('mobile-notifications-btn').addEventListener('click', (e) => {
        e.preventDefault(); openOverlay(document.getElementById('notifications-overlay'), sounds.select, true);
    });

    // RESTAURÉ: Gestionnaire pour le bouton "Marquer comme lu"
    document.getElementById('mark-as-read-btn')?.addEventListener('click', () => {
        playAudio(sounds.select);

        // Marque tous les messages (logs et dev) comme lus
        const allMessageIds = [
            ...(siteData.updateLog || []).map(m => m.id),
            ...(siteData.devMessages || []).map(m => m.id)
        ];
        allMessageIds.forEach(id => readUpdateIds.add(id));
        safeStorage.setItem('mmg-readUpdateIds', JSON.stringify([...readUpdateIds]));

        // NOUVEAU (Option 2): Enregistre le solde actuel pour masquer la notif de déblocage jusqu'au prochain gain
        coinsAtLastDismissal = userCoins;
        safeStorage.setItem('mmg-coinsAtLastDismissal', userCoins.toString());

        updateNotificationDot();
    });

    const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
    if (mobileSettingsBtn) mobileSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openOverlay(document.getElementById('settings-overlay'), sounds.select, true);
    });

    // NOUVEAU: Écouteur pour le bouton d'installation PWA dans les paramètres
    const settingsInstallBtn = document.getElementById('settings-install-btn');
    if (settingsInstallBtn) {
        settingsInstallBtn.addEventListener('click', () => {
            closeOverlay(null); // NOUVEAU: Ferme les paramètres pour voir l'overlay PWA
            showPwaInstallPrompt(true); // Force l'affichage lors du clic manuel
        });
    }


    allOverlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeOverlay(sounds.back);
            }
        }); // Close overlay on click outside
        overlay.querySelector('.close-btn')?.addEventListener('click', () => {
            closeOverlay(sounds.back);
        });
    });



    document.getElementById('cheat-code-btn').addEventListener('click', () => {
        const input = document.getElementById('cheat-code-input');
        const code = input.value.toLowerCase();
        let shopNeedsUpdate = false;

        if (code === 'gameshark') { // If cheat code is gameshark
            unlockAllAchievements();

            input.value = '';
            showDialog(getTranslation('allAchievementsUnlocked'));
            playAudio(sounds.achievementUnlocked);
            shopNeedsUpdate = true;
        } else if (code === 'musicleaks') {
            const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
            unlockedDreamSeasonTracks = allUnlockableTracks.map(t => t.id);
            safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));
            input.value = '';
            showDialog(getTranslation('allSongsUnlocked'));
            playAudio(sounds.achievementUnlocked);
            shopNeedsUpdate = true; // CORRECTION: Force la mise à jour de la boutique
        } else if (code === 'money10') {
            userCoins += 10;
            safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
            updateCoinDisplay();
            input.value = '';
            showDialog('+10 pièces !');
            playAudio(sounds.coin);
            // Mettre à jour les notifications au cas où un déblocage serait possible
            renderUpdateLog();

            updateNotificationDot();
        } else if (code === 'resetdaily') {
            safeStorage.removeItem('mmg-lastLoginDate');
            lastLoginDate = null;
            input.value = '';
            showDialog('Bonus quotidien réinitialisé. Actualisez la page.');
            playAudio(sounds.select);
        }
        else {
            showDialog(getTranslation('incorrectCode'));
            playAudio(sounds.blocked);
        }

        // CORRECTION: Met à jour la boutique si elle est ouverte après une action.
        if (shopNeedsUpdate && !document.getElementById('shop-section').classList.contains('hidden')) {
            renderShopPage();
        }
    });

    // NOUVEAU: Logique pour avertir les utilisateurs PC en mode mobile
    const desktopWarningOverlay = document.getElementById('desktop-warning-overlay');
    const mobileMediaQuery = window.matchMedia('(max-width: 952px)');

    function checkDesktopMobileMode() {
        // On vérifie si l'utilisateur a une souris (pointer: fine) et non un écran tactile (pointer: coarse)
        const isLikelyDesktop = !window.matchMedia('(pointer: coarse)').matches;

        if (isLikelyDesktop && mobileMediaQuery.matches) {
            // Si c'est un PC ET que la vue est mobile, on affiche l'overlay
            desktopWarningOverlay.classList.remove('hidden');
        } else {
            // Sinon, on le cache
            desktopWarningOverlay.classList.add('hidden');
        }
    }

    // Écoute les changements de taille de la fenêtre pour activer/désactiver le mode
    mobileMediaQuery.addEventListener('change', checkDesktopMobileMode);

    // NOUVEAU: Gère le clic sur le bouton de fermeture de l'avertissement
    document.getElementById('close-desktop-warning-btn').addEventListener('click', () => {
        desktopWarningOverlay.classList.add('hidden');
        warningDismissedInSession = true; // Mémorise que l'overlay a été fermé pour cette session
        playAudio(sounds.back); // Joue un son de fermeture
    });

    // Vérifie une première fois au chargement
    checkDesktopMobileMode();

    let draggedItem = null;
    const playlistContainer = document.getElementById('playlist-container');

    playlistContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.playlist-item-delete');
        if (deleteBtn) {
            const itemElement = deleteBtn.closest('.playlist-item'); // Get the item element
            const itemId = itemElement.dataset.itemId;
            const index = currentPlaylist.findIndex(id => id === itemId);
            if (index > -1) {
                currentPlaylist.splice(index, 1);
                safeStorage.setItem('mmg-playlist', JSON.stringify(currentPlaylist));
                renderPlaylist();
                playAudio(sounds.back);
            }
        } else {
            const itemElement = e.target.closest('.playlist-item');
            if (itemElement) {
                const item = findItemById(itemElement.dataset.itemId);
                if (item) { // If item exists
                    playVideoWhenReady(item, [], -1, true);
                }
            }
        }
    });

    document.getElementById('playlist-tabs-container').addEventListener('click', e => {
        const tab = e.target.closest('.playlist-tab-btn');
        if (tab) {
            document.querySelectorAll('.playlist-tab-btn').forEach(t => t.classList.remove('active')); // Remove active class from all tabs
            tab.classList.add('active');
            playAudio(sounds.hover);
            renderPlaylist();
        }
    });

    // MODIFICATION: Gestion du clic sur les playlists recommandées pour ouvrir un menu d'options
    document.getElementById('playlist-reco-list').addEventListener('click', handleRecoPlaylistClick);
    const allRecosContainer = document.getElementById('all-recommended-playlists-cards');
    if (allRecosContainer) allRecosContainer.addEventListener('click', handleRecoPlaylistClick);


    document.querySelector('#reco-playlist-options-overlay .playlist-options-actions')?.addEventListener('click', e => {
        const button = e.target.closest('.playlist-action-btn');
        if (button) {
            const action = button.dataset.action;
            const { name: playlistName, ids: itemIds } = JSON.parse(e.currentTarget.dataset.recoPlaylist || '{}');

            closeOverlay(sounds.select); // Close options overlay

            if (action === 'play') {
                const firstItem = findItemById(itemIds[0]);
                if (firstItem) playVideoWhenReady(firstItem, itemIds, 0);
            } else if (action === 'save') {
                if (savedPlaylists[playlistName]) {
                    showDialog(`La playlist "${playlistName}" existe déjà.`);
                    return;
                }
                savedPlaylists[playlistName] = itemIds;
                safeStorage.setItem('mmg-savedPlaylists', JSON.stringify(savedPlaylists));
                showDialog(getTranslation('playlistSaved'));
                if (!document.getElementById('library-section').classList.contains('hidden')) renderLibraryPage('current'); // If library section is visible, render current playlist
            }
        }
    });

    playlistContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('playlist-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        } // If item is a playlist item, set it as dragged item
    });

    playlistContainer.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    playlistContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(playlistContainer, e.clientY);
        if (draggedItem) { // If there's a dragged item
            if (afterElement == null) {
                playlistContainer.appendChild(draggedItem);
            } else {
                playlistContainer.insertBefore(draggedItem, afterElement);
            }
        }
    });

    playlistContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        const newPlaylistOrder = Array.from(playlistContainer.querySelectorAll('.playlist-item'))
            .map(item => item.dataset.itemId);

        currentPlaylist = newPlaylistOrder;

        if (currentPlayingItem) {
            currentQueueIndex = currentPlaylist.findIndex(id => id === currentPlayingItem.id);
        }

        safeStorage.setItem('mmg-playlist', JSON.stringify(currentPlaylist)); // Save new playlist order
        renderPlaylist();
    });

    document.getElementById('clear-playlist-btn').addEventListener('click', () => {
        currentPlaylist = [];
        currentQueueIndex = -1;
        safeStorage.setItem('mmg-playlist', JSON.stringify(currentPlaylist));
        renderPlaylist();
        showDialog(getTranslation("playlistCleared")); // Show playlist cleared dialog
        playAudio(sounds.back);
    });




    // NOUVEAU: Gestion du swipe pour la bibliothèque mobile
    const librarySection = document.getElementById('library-section');
    if (librarySection) {
        let libraryTouchStartX = 0;
        let libraryTouchStartY = 0;
        librarySection.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                libraryTouchStartX = e.touches[0].clientX; // Get touch start X
                libraryTouchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        librarySection.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const swipeDistance = touchEndX - libraryTouchStartX;
                const swipeVerticalDistance = Math.abs(touchEndY - libraryTouchStartY);
                const swipeThreshold = 50; // 50px de swipe pour changer d'onglet

                // CORRECTION: Ignore le swipe s'il est principalement vertical (pour permettre le scroll)
                if (swipeVerticalDistance > Math.abs(swipeDistance)) {
                    return;
                }

                if (Math.abs(swipeDistance) > swipeThreshold) {
                    const tabs = Array.from(document.querySelectorAll('#library-tabs-container .playlist-tab-btn'));
                    const activeIndex = tabs.findIndex(tab => tab.classList.contains('active')); // Find active tab index
                    let newIndex = activeIndex;

                    if (swipeDistance < 0) { // Swipe vers la gauche
                        newIndex = Math.min(tabs.length - 1, activeIndex + 1);
                    } else { // Swipe vers la droite
                        newIndex = Math.max(0, activeIndex - 1);
                    }

                    if (newIndex !== activeIndex) {
                        playAudio(sounds.hover);
                        renderLibraryPage(tabs[newIndex].dataset.tabId);

                        // NOUVEAU: Ajoute une animation de transition
                        const listContainer = document.getElementById('library-container');
                        if (listContainer) {
                            listContainer.classList.remove('fade-in-right', 'fade-in-left');
                            // Force le reflow pour que l'animation puisse se rejouer
                            void listContainer.offsetWidth;
                            if (swipeDistance < 0) { // Swipe vers la gauche
                                listContainer.classList.add('fade-in-right');
                            } else { // Swipe vers la droite
                                listContainer.classList.add('fade-in-left');
                            }
                        }
                    }
                }
            }
        }, { passive: true });
    }

    // NOUVEAU: Gestion du swipe pour la section Vidéos (Clips / Making-ofs)
    const videosSection = document.getElementById('videos-section');
    if (videosSection) {
        let videosTouchStartX = 0;
        let videosTouchStartY = 0;
        videosSection.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                videosTouchStartX = e.touches[0].clientX;
                videosTouchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        videosSection.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const swipeDistance = touchEndX - videosTouchStartX;
                const swipeVerticalDistance = Math.abs(touchEndY - videosTouchStartY);
                const swipeThreshold = 50;

                if (swipeVerticalDistance > Math.abs(swipeDistance)) return;

                if (Math.abs(swipeDistance) > swipeThreshold) {
                    const tabs = Array.from(document.querySelectorAll('#videos-tabs-container .playlist-tab-btn'));
                    const activeIndex = tabs.findIndex(tab => tab.classList.contains('active'));
                    let newIndex = activeIndex;

                    if (swipeDistance < 0) newIndex = Math.min(tabs.length - 1, activeIndex + 1);
                    else newIndex = Math.max(0, activeIndex - 1);

                    if (newIndex !== activeIndex) {
                        playAudio(sounds.hover);
                        tabs[newIndex].click(); // Simule un clic sur le nouvel onglet
                    }
                }
            }
        }, { passive: true });
    }


    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const previousProfile = getActiveProfile();
            const activeProfile = tab.dataset.project;

            // Mettre à jour l'état visuel des onglets (bureau et mobile)
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active')); // Remove active class from all tabs
            tab.classList.add('active');
            document.querySelectorAll('#mobile-profile-switch .profile-switch-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.project === activeProfile);
            });

            setTimeout(() => updateSlidingIndicator(document.querySelector('.profile-switch')), 0); // NOUVEAU: Met à jour l'indicateur après le clic

            if (!previousProfile || previousProfile === activeProfile) {
                return; // Pas de changement ou erreur, on ne fait rien.
            }

            // Logique de navigation intelligente
            const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id || 'home-dashboard-section';
            let sectionToLoad = 'home-dashboard-section';
            const commonSections = ['library-section']; // Sections qui existent pour les deux profils

            if (commonSections.includes(currentSectionId)) {
                sectionToLoad = currentSectionId;
            } else if (currentSectionId !== 'home-dashboard-section') {
                const prevItem = Object.values(siteData.projectData[previousProfile]).find(p => p.link === currentSectionId);
                if (prevItem) {
                    const equivalentSection = Object.values(siteData.projectData[activeProfile]).find(item => {
                        return item.langKey === prevItem.langKey || item.link === prevItem.link; // Find equivalent section
                    });
                    if (equivalentSection) sectionToLoad = equivalentSection.link;
                }
            }
            renderSidebarNav(activeProfile);
            handleMenuNavigation(sectionToLoad);
            renderSocials(); // NOUVEAU: Mettre à jour les réseaux sociaux lors du changement de profil
        });
    });

    // NOUVEAU: S'assurer que tous les indicateurs se mettent à jour si la taille de la fenêtre change
    window.addEventListener('resize', () => {
        document.querySelectorAll('.sliding-tabs').forEach(container => updateSlidingIndicator(container));

        // NOUVEAU: Désactive le thème DS si on passe sur PC via redimensionnement
        if (safeStorage.getItem('ui-theme') === 'theme-ds' && window.innerWidth > 952) {
            applyTheme('default');
        }
        // NOUVEAU: Met à jour l'état du bouton dans la boutique (Mobile Only)
        const shopSection = document.getElementById('shop-section');
        if (shopSection && !shopSection.classList.contains('hidden')) {
            renderShopItems();
        }
        renderDailyBonusProgress(); // NOUVEAU: Met à jour le widget bonus selon la taille d'écran
    });

    // NOUVEAU: Logique pour le lecteur mobile
    const mobilePlayer = document.getElementById('mobile-full-player');

    // NOUVEAU: Observer pour cacher la barre de navigation quand le lecteur est ouvert
    if (mobilePlayer) {
        const playerObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    document.body.classList.add('mobile-player-active');
                } else {
                    document.body.classList.remove('mobile-player-active');
                }
            });
        });
        playerObserver.observe(mobilePlayer, { attributes: true, attributeFilter: ['class'] });
    }

    // --- NOUVELLE LOGIQUE D'INTERACTION POUR LE MINI-LECTEUR ---
    const miniPlayer = document.getElementById('mobile-mini-player');
    let touchStartX = 0;
    let touchStartY = 0;

    miniPlayer.addEventListener('touchstart', (e) => {
        // On ne démarre le swipe que si on ne touche pas un contrôle
        if (e.target.closest('.mini-player-controls')) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    miniPlayer.addEventListener('touchend', (e) => {
        if (touchStartY === 0) return; // Le swipe n'a pas commencé sur la bonne zone

        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchEndY - touchStartY;

        // Réinitialisation
        touchStartX = 0;
        touchStartY = 0;
    });


    // CORRECTION: Le swipe VERTICAL pour fermer le lecteur est géré séparément sur le conteneur principal.
    let playerCloseTouchStartY = 0;
    mobilePlayer.addEventListener('touchstart', (e) => {
        // On ne démarre le swipe que si on ne touche pas un slider
        // CORRECTION: La zone de la barre de progression est aussi exclue
        if (!e.target.closest('.mobile-player-volume-wrapper') && !e.target.closest('.mobile-player-progress')) {
            playerCloseTouchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    mobilePlayer.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        if (playerCloseTouchStartY > 0 && touchEndY > playerCloseTouchStartY + 75) { // Swipe vers le bas de 75px
            mobilePlayer.classList.remove('active');
            playAudio(sounds.back);
        }
        playerCloseTouchStartY = 0; // Réinitialise
    });

    // === NOUVELLE LOGIQUE POUR LE MODE BULLE (APPUIS LONG) ===
    let isDragging = false;
    let offsetX, offsetY;
    let longPressTimer;
    let isLongPress = false;
    let revertToBarTimer; // NOUVEAU: Timer pour revenir en mode barre
    let isRevertingToBar = false; // NOUVEAU: Flag pour l'action de retour

    // Initialisation du mode au chargement
    if (safeStorage.getItem('mmg-player-mode') === 'bubble') {
        miniPlayer.classList.add('bubble-mode');
    }
    // CORRECTION: La position est restaurée APRÈS avoir ajouté la classe bubble-mode.
    // Cela garantit que les styles de la bulle sont déjà appliqués.
    // Initialisation de la position de la bulle
    const savedBubblePosition = safeStorage.getItem('mmg-bubble-position');
    if (savedBubblePosition) {
        const { top, left } = JSON.parse(savedBubblePosition);
        if (miniPlayer.classList.contains('bubble-mode')) {
            miniPlayer.style.top = top;
            miniPlayer.style.left = left;
            miniPlayer.style.right = 'auto';
            miniPlayer.style.bottom = 'auto';
        }
    }

    const onDragStart = (e) => {
        const touch = e.touches[0];
        isLongPress = false;
        isRevertingToBar = false; // NOUVEAU: Réinitialise le flag

        if (miniPlayer.classList.contains('bubble-mode')) {
            const rect = miniPlayer.getBoundingClientRect();

            // CORRECTION: On définit top/left AVANT de réinitialiser bottom/right pour éviter que la bulle ne "saute".
            miniPlayer.style.top = `${rect.top}px`;
            miniPlayer.style.left = `${rect.left}px`;
            miniPlayer.style.bottom = 'auto';
            miniPlayer.style.right = 'auto';

            isDragging = true;

            miniPlayer.style.transition = 'none';
            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;
            // Affiche les contrôles pendant le drag
            miniPlayer.querySelector('.mini-player-controls').classList.add('visible');

            // NOUVEAU: Démarre le timer pour revenir en mode barre sur appui long
            revertToBarTimer = setTimeout(() => {
                isRevertingToBar = true;
            }, 500);
        } else {
            // Démarre le timer pour l'appui long
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                playAudio(sounds.minimize);
                miniPlayer.classList.add('bubble-mode');
                safeStorage.setItem('mmg-player-mode', 'bubble');
            }, 500); // 500ms pour un appui long
        }
    };

    const onDragMove = (e) => {
        // Si on bouge le doigt, ce n'est pas un appui long
        clearTimeout(longPressTimer);
        clearTimeout(revertToBarTimer); // NOUVEAU: Annule aussi le retour en barre

        if (!isDragging) return;
        e.preventDefault(); // Empêche le scroll de la page

        const touch = e.touches[0];
        let newX = touch.clientX - offsetX;
        let newY = touch.clientY - offsetY;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const bubbleSize = 65;
        // CORRECTION: Calcule la hauteur de la barre de navigation pour empêcher la bulle de passer dessous.
        const navBar = document.getElementById('mobile-bottom-nav');
        const navBarHeight = navBar ? navBar.offsetHeight : 60; // 60px par défaut si non trouvée

        newX = Math.max(5, Math.min(newX, screenWidth - bubbleSize - 5));
        newY = Math.max(5, Math.min(newY, screenHeight - bubbleSize - navBarHeight - 5));

        // CORRECTION: On utilise top/left au lieu de transform pour la cohérence.
        miniPlayer.style.left = `${newX}px`;
        miniPlayer.style.top = `${newY}px`;
    };

    const onDragEnd = (e) => {
        clearTimeout(longPressTimer);
        clearTimeout(revertToBarTimer); // NOUVEAU: Annule le timer à la fin du toucher

        // CORRECTION: La logique de fin de drag est simplifiée.
        // NOUVEAU: On vérifie si on était en train de glisser ET qu'on ne voulait pas revenir en barre
        if (isDragging && !isRevertingToBar) {
            // On était en train de glisser la bulle
            miniPlayer.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            const rect = miniPlayer.getBoundingClientRect();
            const screenWidth = window.innerWidth;

            let finalX;
            if (rect.left + (rect.width / 2) < screenWidth / 2) {
                miniPlayer.style.left = '15px';
                finalX = '15px';
            } else {
                miniPlayer.style.left = `${screenWidth - rect.width - 15}px`;
                finalX = `${screenWidth - rect.width - 15}px`;
            }
            const finalY = rect.top;

            // Sauvegarde la position pour le prochain rechargement
            // CORRECTION: On sauvegarde la position top/left calculée.
            safeStorage.setItem('mmg-bubble-position', JSON.stringify({ top: `${finalY}px`, left: finalX }));

            // Cache les contrôles après un délai
            setTimeout(() => {
                miniPlayer.querySelector('.mini-player-controls').classList.remove('visible');
            }, 2000);

        } else if (isRevertingToBar) {
            // NOUVEAU: L'appui long sur la bulle est terminé, on revient en mode barre
            miniPlayer.classList.remove('bubble-mode');
            safeStorage.setItem('mmg-player-mode', 'bar');
            playAudio(sounds.maximize);

            // Réinitialise les styles inline pour que le CSS reprenne le contrôle
            miniPlayer.style.top = '';
            miniPlayer.style.left = '';
            miniPlayer.style.right = '';
            miniPlayer.style.bottom = '';
            miniPlayer.style.transition = '';

        } else if (isLongPress) {
            // L'appui long vient de se terminer, on ne fait rien de plus.
        }

        isDragging = false;
        isRevertingToBar = false; // NOUVEAU: Réinitialise le flag
        isLongPress = false;
    };

    miniPlayer.addEventListener('touchstart', onDragStart, { passive: true });
    miniPlayer.addEventListener('touchmove', onDragMove, { passive: false });
    miniPlayer.addEventListener('touchend', onDragEnd, { passive: true });

    // NOUVEAU: Ouvrir le lecteur plein écran en cliquant sur le mini-lecteur

    // NOUVEAU: Gestion du swipe vers le bas pour fermer l'overlay de la pochette
    let artworkTouchStartY = 0; // Artwork touch start Y
    artworkOverlay.addEventListener('touchstart', (e) => {
        artworkTouchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    artworkOverlay.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].screenY;
        if (touchEndY > artworkTouchStartY + 50) { // Swipe vers le bas de 50px
            artworkOverlay.classList.add('hidden'); // Hide artwork overlay
            // NOUVEAU: Restaure les couleurs des barres système
            updateThemeColorMeta();
            playAudio(sounds.back);
            // Si l'état de l'historique est celui de l'overlay, on revient en arrière pour le nettoyer
            if (history.state && history.state.overlay === 'artwork') {
                history.back();
            }
        }
    }, { passive: true });

    // NOUVEAU: Ouvrir le lecteur plein écran en cliquant sur le mini-lecteur
    // CORRECTION: La logique dépend maintenant de la zone cliquée (pochette ou reste).
    miniPlayer.addEventListener('click', (e) => {
        if (!currentPlayingItem) return;

        // Si le clic est sur un bouton de contrôle, on ne fait rien.
        if (e.target.closest('.mini-player-controls') || e.target.closest('.mini-player-like-btn')) {
            return;
        }

        // Si on est en mode bulle, un clic simple ouvre le grand lecteur
        if (miniPlayer.classList.contains('bubble-mode')) {
            // Si l'utilisateur a juste fait un appui long, on ne veut pas ouvrir le lecteur
            if (isLongPress) {
                isLongPress = false; // Reset flag
                return;
            }
            if (isMusicTitle(currentPlayingItem)) {
                mobilePlayer.classList.add('active');
                playAudio(sounds.maximize);
            } else {
                showSection('large-player-section');
            }
            return; // On arrête ici pour ne pas exécuter l'autre logique
        }

        // CORRECTION: Rétablissement de la logique de clic différenciée
        const clickedOnArt = e.target.closest('#mini-player-album-art');

        if (clickedOnArt) {
            // Clic sur la pochette : on va vers les détails du titre.
            playAudio(sounds.select);
            if (isMusicTitle(currentPlayingItem)) {
                renderMusicTitleDetails(currentPlayingItem);
                showSection('music-title-details-section');
                // CORRECTION: Mettre à jour le contexte de la vue
                currentViewContext = { type: 'music-details', data: currentPlayingItem.id };
            } else {
                // Pour une vidéo, on affiche le grand lecteur (comportement par défaut)
                showSection('large-player-section');
            }
        } else {
            // Clic sur le reste du mini-lecteur : on ouvre le grand lecteur mobile.
            if (isMusicTitle(currentPlayingItem)) {
                mobilePlayer.classList.add('active');
                playAudio(sounds.maximize);
            } else {
                showSection('large-player-section');
            }
        }
    });

    // NOUVEAU: Gestion des liens de la barre de nav mobile
    document.getElementById('mobile-bottom-nav').addEventListener('click', (e) => {
        const navLink = e.target.closest('.mobile-nav-link[data-link]');
        if (navLink) {
            e.preventDefault();
            handleMenuNavigation(navLink.dataset.link);
        }
    });

    // NOUVEAU: Gestion du clic sur le conteneur vidéo pour play/pause (car iframe non cliquable)
    const playerContainer = document.querySelector('.player-container');
    if (playerContainer) {
        playerContainer.addEventListener('click', (e) => {
            if (e.target.closest('button')) return; // Ignorer les boutons (fullscreen, etc.)

            if (largePlayer && typeof largePlayer.getPlayerState === 'function') {
                const state = largePlayer.getPlayerState();
                if (state === YT.PlayerState.PLAYING) {
                    largePlayer.pauseVideo();
                } else {
                    largePlayer.playVideo();
                }
            }
        });
    }

    function toggleFullScreen(element) {
        if (!document.fullscreenElement) {
            if (element.requestFullscreen) { // Request fullscreen
                element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        } else { // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    // NOUVEAU: Logique pour le bouton de sortie du plein écran
    document.getElementById('exit-fullscreen-btn').addEventListener('click', () => {
        if (document.fullscreenElement) toggleFullScreen();
    });

    document.getElementById('fullscreen-btn').addEventListener('click', () => {
        // CORRECTION: On cible le conteneur parent pour que les boutons (quitter, etc.) restent visibles par-dessus la vidéo
        const container = document.querySelector('.player-container');
        if (container) toggleFullScreen(container);
    });

    // CORRECTION: Logique de swipe vers le bas pour quitter le plein écran sur mobile.
    // Cette logique est plus robuste car elle s'attache à l'élément qui est réellement en plein écran.
    let swipeDownTouchStartY = 0; // Variable pour stocker la position Y de départ du toucher

    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            swipeDownTouchStartY = e.touches[0].clientY;
        }
    };

    const handleTouchEnd = (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchEndY - swipeDownTouchStartY;
        const swipeThreshold = 75; // Seuil de 75px pour valider le swipe

        if (swipeDistance > swipeThreshold) {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    document.addEventListener('fullscreenchange', () => {
        const fullscreenElement = document.fullscreenElement;
        const exitBtn = document.getElementById('exit-fullscreen-btn');

        // Gère la visibilité du bouton de sortie
        if (exitBtn) {
            exitBtn.classList.toggle('visible', !!fullscreenElement);
        }

        if (fullscreenElement) {
            // On est entré en plein écran, on attache les écouteurs.
            fullscreenElement.addEventListener('touchstart', handleTouchStart, { passive: true });
            fullscreenElement.addEventListener('touchend', handleTouchEnd, { passive: true });
        } else {
            // On a quitté le plein écran, on nettoie les écouteurs pour éviter les problèmes.
            // (On ne peut pas cibler l'ancien élément, mais ce n'est pas grave car il n'est plus en plein écran)
        }
    });

    // PWA Install Button Listeners
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    const pwaDismissBtn = document.getElementById('pwa-dismiss-btn');
    const pwaOverlay = document.getElementById('pwa-install-overlay');

    pwaInstallBtn.addEventListener('click', async () => {
        playAudio(sounds.select); // NOUVEAU: Son select
        if (!deferredPrompt) {
            // NOUVEAU: Feedback si l'installation automatique n'est pas disponible (ex: iOS ou déjà installé)
            showDialog("Installation auto indisponible. Utilisez le menu du navigateur.");
            return;
        } // If no deferred prompt, return
        pwaOverlay.classList.add('hidden');
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        // We've used the prompt & can't use it again.
        deferredPrompt = null;
    });

    pwaDismissBtn.addEventListener('click', () => {
        playAudio(sounds.back); // NOUVEAU: Son retour
        pwaOverlay.classList.add('hidden'); // Hide PWA overlay
    });

    // NOUVEAU: Gestion du swipe vers le bas pour fermer les panneaux mobiles
    document.querySelectorAll('.settings-card').forEach(panel => {
        let panelTouchStartY = 0;
        const overlay = panel.closest('.overlay');

        panel.addEventListener('touchstart', e => {
            // On ne démarre le swipe que si on ne touche pas une zone qui peut défiler
            const scrollableArea = e.target.closest('[class*="container"], [class*="list"]');
            if (scrollableArea && scrollableArea.scrollHeight > scrollableArea.clientHeight) {
                // Si on touche une zone scrollable qui n'est pas en haut, on ne commence pas le swipe
                if (scrollableArea.scrollTop > 0) {
                    panelTouchStartY = 0; // Reset
                    return;
                }
            }
            panelTouchStartY = e.touches[0].clientY;
        }, { passive: true });

        panel.addEventListener('touchend', e => {
            const touchEndY = e.changedTouches[0].clientY;
            if (panelTouchStartY > 0 && touchEndY > panelTouchStartY + 75) { // Swipe vers le bas de 75px
                closeOverlay(sounds.back);
            }
            panelTouchStartY = 0; // Réinitialise
        });
    });


    // NOUVEAU: Gestion du swipe pour retour en arrière sur mobile (style iOS)
    const mainContent = document.getElementById('main-content-wrapper'); // Get main content wrapper
    let swipeBackTouchStartX = 0;
    let swipeBackTouchStartY = 0;
    let isSwipingBack = false;
    const swipeTriggerArea = 50; // Zone de déclenchement en pixels depuis le bord gauche
    const swipeThreshold = 100; // Distance minimale pour valider le swipe

    mainContent.addEventListener('touchstart', (e) => {
        // On ne déclenche que si le toucher commence sur le bord gauche et qu'il n'y a qu'un seul doigt
        if (e.touches[0].clientX < swipeTriggerArea && e.touches.length === 1) {
            swipeBackTouchStartX = e.touches[0].clientX; // Get touch start X
            swipeBackTouchStartY = e.touches[0].clientY;
            isSwipingBack = true;
            // On désactive la transition pour un suivi direct du doigt
            mainContent.style.transition = 'none';
        }
    }, { passive: true });

    mainContent.addEventListener('touchmove', (e) => {
        if (!isSwipingBack) return;

        const touchMoveX = e.touches[0].clientX; // Get touch move X
        const diffX = touchMoveX - swipeBackTouchStartX;

        // On ne bouge que si le swipe est vers la droite
        if (diffX > 0) {
            // Applique une transformation pour le feedback visuel, avec une résistance pour un effet naturel
            mainContent.style.transform = `translateX(${Math.pow(diffX, 0.85)}px)`;
        }
    }, { passive: true });

    mainContent.addEventListener('touchend', (e) => {
        if (!isSwipingBack) return;

        const diffX = e.changedTouches[0].clientX - swipeBackTouchStartX;
        const diffY = Math.abs(e.changedTouches[0].clientY - swipeBackTouchStartY); // Calculate vertical difference

        mainContent.style.transition = 'transform 0.3s ease-out';

        if (diffX > swipeThreshold && diffY < swipeThreshold) { // Swipe vers la droite validé
            window.history.back();
        }
        mainContent.style.transform = 'translateX(0)';
        isSwipingBack = false;
    });

    // NOUVEAU: Gestion du swipe pour les onglets de la boutique sur mobile
    const shopSection = document.getElementById('shop-section');
    if (shopSection) {
        let shopTouchStartX = 0;
        let shopTouchStartY = 0;
        shopSection.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                shopTouchStartX = e.touches[0].clientX;
                shopTouchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        shopSection.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const swipeDistance = touchEndX - shopTouchStartX;
                const swipeVerticalDistance = Math.abs(touchEndY - shopTouchStartY);

                if (swipeVerticalDistance > Math.abs(swipeDistance) || Math.abs(swipeDistance) < 50) {
                    return; // Ignore les swipes verticaux ou trop courts
                }

                // CORRECTION: Cible le bon conteneur d'onglets (#shop-tabs-container)
                const tabs = Array.from(document.querySelectorAll('#shop-tabs-container .playlist-tab-btn'));
                const activeIndex = tabs.findIndex(tab => tab.classList.contains('active'));
                let newIndex = activeIndex;

                if (swipeDistance < 0 && activeIndex < tabs.length - 1) newIndex++; // Swipe gauche
                else if (swipeDistance > 0 && activeIndex > 0) newIndex--; // Swipe droit

                if (newIndex !== activeIndex) {
                    tabs[newIndex].click(); // Simule un clic pour utiliser la logique existante
                }
            }
        }, { passive: true });
    }

    // NOUVEAU: Gère le clic sur un thème verrouillé pour montrer la mission correspondante
    const themesContainer = document.getElementById('themes-container');
    if (themesContainer) {
        themesContainer.addEventListener('click', (e) => {
            const lockedThemeCard = e.target.closest('.theme-row-premium.locked');
            // On ne gère que les clics sur les cartes verrouillées, et pas sur leurs boutons d'action.
            if (!lockedThemeCard || e.target.closest('button')) return;

            const missionId = lockedThemeCard.dataset.missionId;
            if (!missionId) return;

            e.preventDefault();
            e.stopPropagation();
            playAudio(sounds.blocked);
            const missionName = getTranslation(`achievement_${missionId}_title`);
            showDialog(`${getTranslation('finishMission')} "${missionName}"`);

            // Bascule l'affichage de l'overlay au clic (pour mobile)
            document.querySelectorAll('.theme-row-premium.active').forEach(c => {
                if (c !== lockedThemeCard) c.classList.remove('active');
            });
            lockedThemeCard.classList.toggle('active');

            if (lockedThemeCard.classList.contains('active')) {
                playAudio(sounds.select);
            }
        });
    }
}

// CORRECTION: La logique de la boutique est dans un écouteur global pour garantir qu'elle fonctionne partout.
// Elle est placée ici, en dehors de `setupEventListeners` pour éviter les conflits.
document.body.addEventListener('click', (e) => {
    const card = e.target.closest('.shop-product-card, .shop-list-item, .theme-row-premium');
    const selectBtn = e.target.closest('.theme-buy-btn');
    const buyBtn = e.target.closest('.shop-buy-btn');

    // NOUVEAU: Si on ne clique sur aucun élément de boutique, on arrête tout de suite.
    // Cela corrige le crash "itemId is not defined" lors du clic sur d'autres éléments (ex: PWA install, View More).
    if (!card && !selectBtn && !buyBtn) return;

    // Détermine l'action en fonction de ce qui a été cliqué
    let actionTarget = null;
    if (selectBtn) {
        actionTarget = selectBtn;
    } else if (buyBtn) {
        actionTarget = buyBtn;
    } else if (card) {
        // Si on clique sur la carte (et pas sur un bouton), on trouve l'action à faire.
        // On exclut les cartes de mission verrouillées pour ne pas les sélectionner par erreur.
        if (!card.classList.contains('locked') || card.querySelector('.shop-buy-btn')) {
            actionTarget = card.querySelector('.theme-buy-btn, .shop-buy-btn');
        }
    }

    // Récupération sécurisée de l'ID
    const itemId = buyBtn?.dataset.itemId || actionTarget?.dataset.itemId || card?.dataset.itemId;
    if (!itemId) return;

    // NOUVEAU: Gère la sélection d'un thème ou d'un arrière-plan en cliquant sur la carte
    // On vérifie si la carte a un attribut data-theme (ce qui signifie qu'elle est débloquée et sélectionnable)
    if (card && card.dataset.theme && !card.classList.contains('locked') && !card.classList.contains('selected') && !e.target.closest('.shop-buy-btn') && !card.classList.contains('mobile-only')) {
        const themeToApply = card.dataset.theme;
        applyTheme(themeToApply);
        playAudio(sounds.select);
        return;
    }

    // Gère le clic sur un thème verrouillé (soit le bouton, soit la carte)
    if (selectBtn && selectBtn.classList.contains('locked')) {
        e.preventDefault();
        e.stopPropagation();
        const achievementId = selectBtn?.dataset.achievement;
        if (achievementId) {
            const missionName = getTranslation(`achievement_${achievementId}_title`);
            showDialog(`${getTranslation('finishMission')} "${missionName}"`);
        }
        playAudio(sounds.blocked);
        return;
    }

    // MODIFICATION: Gère l'achat via le bouton (s'il existe encore) ou via le clic sur une carte "buyable"
    const isBuyable = card && card.classList.contains('buyable');

    if (buyBtn || (actionTarget && actionTarget.classList.contains('shop-buy-btn')) || isBuyable) {
        // CORRECTION: Logique d'achat simplifiée au maximum.
        e.preventDefault();
        e.stopPropagation();

        // Cas 1: Arrière-plan
        const bgItem = siteData.shopItems.backgrounds.find(b => b.id === itemId);
        if (bgItem) {
            // 1. Vérifier si l'utilisateur a assez de pièces.
            if (userCoins >= bgItem.cost) {
                // 2. Si oui, effectuer l'achat.
                userCoins -= bgItem.cost;
                purchasedShopItems.add(bgItem.id);
                safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
                safeStorage.setItem('mmg-purchasedItems', JSON.stringify([...purchasedShopItems]));

                playAudio(sounds.coin);
                showDialog(getTranslation('purchaseSuccess'));
                updateCoinDisplay();
                unlockCardUI(bgItem.id, true); // NOUVEAU: Appelle la fonction de mise à jour de l'UI pour la boutique

                // Mettre à jour les notifications au cas où un autre déblocage ne serait plus possible
                renderUpdateLog();
                updateNotificationDot();

            } else {
                // 3. Si non, afficher un message d'erreur.
                showDialog(getTranslation('notEnoughCoins'));
                playAudio(sounds.blocked);
            }
            return;
        }

        // Cas 2: Titre musical (Track)
        const trackItem = findItemById(itemId);
        if (trackItem && trackItem.isUnlockable) {
            // On réutilise la logique d'achat de titre existante
            if (userCoins >= COIN_COST_UNLOCK) {
                userCoins -= COIN_COST_UNLOCK;
                unlockedDreamSeasonTracks.push(itemId);
                safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
                safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));

                playAudio(sounds.coin);
                const activeProfile = getActiveProfile();
                const album = siteData.contentData[activeProfile].albums[trackItem.albumId];
                showDialog(`${getTranslation('youUnlocked')} "${trackItem.title}"! ${getTranslation('availableInAlbum', { albumTitle: album ? album.title : 'Albums' })}`);
                updateCoinDisplay();

                // Mise à jour de l'UI : on retire la carte de la boutique
                renderShopItems(false); // Pas d'animation après achat

                renderUpdateLog();
                updateNotificationDot();
            } else {
                showDialog(getTranslation('notEnoughCoins'));
                playAudio(sounds.blocked);
            }
            return;
        }
        return;
    }

    // Gère la sélection d'un thème ou d'un arrière-plan débloqué/acheté
    if (actionTarget && !actionTarget.classList.contains('locked') && !actionTarget.classList.contains('selected')) {
        e.preventDefault();
        e.stopPropagation();
        const themeToApply = actionTarget.dataset.theme;
        if (themeToApply) {
            applyTheme(themeToApply);
            playAudio(sounds.select);
        }
    }
});

// NOUVEAU: Fonction pour mettre à jour l'UI d'une carte après un déblocage/achat
function unlockCardUI(itemId, isShopItem = false) {
    const unlockedCards = document.querySelectorAll(`.card[data-item-id="${itemId}"]`);

    unlockedCards.forEach(card => {
        card.classList.remove('locked');
        card.classList.remove('buyable'); // CORRECTION: Retire la classe buyable
        card.classList.add('card-unlocked-anim'); // Ajoute la classe pour l'animation

        // CORRECTION: Retire le badge de prix s'il existe
        const priceBadge = card.querySelector('.card-price-badge');
        if (priceBadge) priceBadge.remove();

        // CORRECTION: Rend la carte sélectionnable immédiatement (pour thèmes/fonds)
        if (isShopItem) {
            card.dataset.theme = itemId; // Ajoute l'attribut data-theme pour permettre la sélection au clic
        }

        if (isShopItem) {
            // Logique spécifique à la boutique
            const buyButton = card.querySelector('.shop-buy-btn');
            const cardInfo = card.querySelector('.card-info-container');
            if (buyButton && cardInfo) {
                // Crée le nouveau bouton "Sélectionner"
                const selectButton = document.createElement('button');
                selectButton.className = 'theme-buy-btn';
                selectButton.dataset.theme = itemId;
                selectButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>`;

                // Remplace l'ancien bouton par le nouveau
                buyButton.replaceWith(selectButton);
            }
        } else {
            // Logique pour les cartes de titre (grille et liste)
            const lockOverlayGrid = card.querySelector('.lock-overlay');
            if (lockOverlayGrid) lockOverlayGrid.remove();

            const lockOverlayList = card.querySelector('.list-view-lock-overlay');
            if (lockOverlayList) lockOverlayList.remove();

            // Retire le texte "morceaux à débloquer" en mode liste
            const unlockText = card.querySelector('.list-view-unlock-text');
            if (unlockText) unlockText.remove();
        }

        // Retire la classe d'animation après qu'elle soit terminée pour ne pas la rejouer
        setTimeout(() => {
            card.classList.remove('card-unlocked-anim');
        }, 1000); // Durée de l'animation
    });
}



function updateMobileHeader(sectionId) {
    const titleElement = document.getElementById('mobile-header-title');
    if (!titleElement) return;

    const staticSectionTitles = {
        'home-dashboard-section': getTranslation('home'),
        'albums-section': getTranslation('albums'),
        'videos-section': getTranslation('videos'),
        'shop-section': getTranslation('shop'),
        'library-section': getTranslation('library'),
        'about-section': getTranslation('about'),
    };

    let title = "";

    if (sectionId === 'music-title-details-section') {
        title = getTranslation('albums');
    } else if (sectionId === 'large-player-section') {
        title = getTranslation('videos');
    } else if (staticSectionTitles.hasOwnProperty(sectionId)) {
        title = staticSectionTitles[sectionId] || "";
    } else if (sectionId === 'titles-section') {
        title = getTranslation('albums');
    } else if (sectionId === 'search-results-section') {
        title = document.getElementById('search-results-title')?.textContent || '';
    }

    titleElement.textContent = title;
}

// NOUVEAU: Fonction pour retirer un titre de la file d'attente
function removeFromQueue(itemId) {
    const itemIndex = userQueue.indexOf(itemId);
    if (itemIndex > -1) {
        userQueue.splice(itemIndex, 1);
        updateAllQueueViews(); // CORRECTION: Met à jour toutes les vues de la file d'attente
    }
}

// NOUVEAU: Fonction centralisée pour mettre à jour toutes les vues de la file d'attente
function updateAllQueueViews() {

    // 2. Overlay de la file d'attente (desktop)
    const queueOverlay = document.getElementById('queue-overlay');
    if (queueOverlay && !queueOverlay.classList.contains('hidden')) {
        renderQueue();
    }

    // 3. Panneau de la file d'attente (mobile)
    const mobileQueuePanel = document.getElementById('mobile-queue-panel');
    if (mobileQueuePanel && !mobileQueuePanel.classList.contains('hidden')) {
        renderMobileQueue();
    }
}

// CORRECTION: La fonction est déplacée ici pour être accessible globalement dans le script.
const renderVideosPage = (activeTabId = 'clips') => {
    const tabsContainer = document.getElementById('videos-tabs-container');
    const titleElement = document.getElementById('videos-section-title');
    if (!tabsContainer || !titleElement) return;

    // Récupère le profil actif à chaque appel pour être toujours à jour.
    const activeProfile = getActiveProfile();
    const profileContent = siteData.contentData[activeProfile];

    const tabs = [
        { id: 'clips', title: getTranslation('videos'), data: profileContent.videos, type: 'video' },
        { id: 'makingofs', title: getTranslation('bonus'), data: profileContent.bonus, type: 'bonus' }
    ];

    tabsContainer.innerHTML = tabs.map(tab =>
        `<button class="playlist-tab-btn ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">${tab.title}</button>`
    ).join('');

    // NOUVEAU: Ajout de la classe pour l'indicateur et mise à jour
    tabsContainer.classList.add('sliding-tabs');
    setTimeout(() => updateSlidingIndicator(tabsContainer), 0);

    const activeTab = tabs.find(tab => tab.id === activeTabId);
    const activeTabData = activeTab?.data || {};
    const cardType = activeTab?.type || 'video';
    titleElement.textContent = activeTab?.title || getTranslation('videos');

    renderCards('videos-cards', activeTabData, cardType);

    tabsContainer.querySelectorAll('.playlist-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            playAudio(sounds.select);
            renderVideosPage(tab.dataset.tabId);
        });
    });

    currentViewContext = { type: 'videos', data: activeTabId };
};

function handleMenuNavigation(dataLink, updateHistory = true, context = null) {
    // CORRECTION: Capturer le contexte actuel AVANT tout changement pour le passer à showSection
    const previousContext = { ...currentViewContext };

    // CORRECTION: Utiliser le contexte actuel si aucun contexte n'est fourni (pour le rafraîchissement de la vue)
    const effectiveContext = context || currentViewContext;

    // CORRECTION DÉFINITIVE: La source de vérité pour l'onglet actif est le `context` passé en argument.
    // S'il n'y a pas de contexte, on affiche l'onglet par défaut ('liked').
    const activeTabForLibrary = (dataLink === 'library-section' && effectiveContext?.type === 'library')
        ? effectiveContext.data
        : 'liked'; // Fallback par défaut

    const activeProfile = getActiveProfile();

    // NOUVEAU: Réinitialise la position de défilement en haut de la page à chaque navigation.
    const contentBoard = document.querySelector('.content-section-board');
    if (contentBoard) {
        contentBoard.scrollTop = 0;
    }

    // NOUVEAU: Mettre à jour le header mobile avec le titre de la section
    updateMobileHeader(dataLink);

    const profileContent = siteData.contentData[activeProfile];

    // CORRECTION: Détermine dynamiquement la source des données en fonction du profil actif.
    const getSectionData = (link) => {
        const profileMenu = siteData.projectData[activeProfile];
        const menuItem = Object.values(profileMenu).find(item => item.link === link);
        if (!menuItem) return null;
        // La langKey (ex: 'albums', 'albumsBeats') correspond à la clé dans contentData.
        return profileContent[menuItem.langKey];
    };

    // CORRECTION: La section 'bonus' est fusionnée dans 'videos'.
    const sections = {
        'albums-section': { data: getSectionData('albums-section') || profileContent.albums, type: 'album', container: 'albums-cards' }
    };

    if (!document.getElementById(dataLink)) {
        currentViewContext = { type: 'home', data: null };
        dataLink = 'home-dashboard-section'; // Fallback to home
    }

    if (dataLink === 'home-dashboard-section') {
        currentViewContext = { type: 'home', data: null };
        // Le HTML est déjà dans la page, on a juste besoin de le mettre à jour.
        renderDashboard();
    } else if (dataLink === 'liked-titles-section') {
        // CORRECTION: Redirige l'ancien lien "liked-titles-section" vers la nouvelle bibliothèque
        handleMenuNavigation('library-section', updateHistory);
        return; // Arrêter l'exécution ici
    } else if (dataLink === 'library-section') {
        // CORRECTION DÉFINITIVE : On met à jour le contexte de la vue actuelle AVANT d'appeler render/show. C'est cet état qui sera sauvegardé dans l'historique.
        currentViewContext = { type: 'library', data: activeTabForLibrary };
        renderLibraryPage(activeTabForLibrary); // Affiche la bibliothèque avec l'onglet spécifié
        // NOUVEAU: Ajout de la gestion de la page boutique
        const shopSection = document.getElementById('shop-section');
        if (shopSection && !shopSection.classList.contains('hidden')) {
            renderShopPage();
        }

    } else if (dataLink === 'shop-section') {
        currentViewContext = { type: 'shop', data: null };
        renderShopPage();
    } else if (dataLink === 'videos-section') {
        // CORRECTION: Gère la navigation vers la section vidéo unifiée.
        // Si un contexte d'onglet est fourni (ex: retour en arrière), on l'utilise, sinon on affiche l'onglet par défaut.
        const activeTabForVideos = (effectiveContext?.type === 'videos') ? effectiveContext.data : 'clips';
        renderVideosPage(activeTabForVideos);
    } else if (dataLink === 'titles-section') {
        // CORRECTION: Gestion explicite de la section titres pour le rafraîchissement de la vue
        // CORRECTION DÉFINITIVE: On utilise le contexte de l'historique pour restaurer la vue.
        // C'est la clé pour que le bouton de changement de vue (grille/liste) refonctionne.
        // On met à jour la variable globale `currentViewContext` pour que le reste de l'app soit au courant.
        currentViewContext = effectiveContext;

        // On utilise ensuite ce contexte restauré pour afficher les bons titres.
        if (effectiveContext && effectiveContext.type === 'titles' && effectiveContext.data) {
            const albumId = effectiveContext.data;
            const titlesForAlbum = Object.fromEntries(Object.entries(siteData.contentData[activeProfile].titles).filter(([_, title]) => title.albumId === albumId));
            renderCards('titles-cards', titlesForAlbum, 'title');
            // CORRECTION: On met à jour currentViewContext dans tous les cas pour que le refresh fonctionne
            currentViewContext = { type: 'titles', data: albumId };
        } else {
            // Fallback si le contexte est perdu ou invalide, on recharge l'album par défaut du profil
            const defaultAlbumId = activeProfile === 'mmg-music' ? 'album1' : 'album_beats_1'; // IDs d'albums par défaut
            const titlesForAlbum = Object.fromEntries(Object.entries(siteData.contentData[activeProfile].titles).filter(([_, title]) => title.albumId === defaultAlbumId));
            renderCards('titles-cards', titlesForAlbum, 'title');
            currentViewContext = { type: 'titles', data: defaultAlbumId };
        }

        // NOUVEAU: Appliquer la vue globale (liste/grille) sauvegardée
        const globalView = localStorage.getItem('mmg-global-view') || 'grid';
        const container = document.getElementById('titles-cards');
        if (container) {
            const isListView = globalView === 'list';
            container.classList.toggle('list-view', isListView);
            container.classList.toggle('titles-grid', !isListView);
        }
    } else if (dataLink === 'search-results-section') {
        // CORRECTION: Rafraîchir les résultats de recherche
        updateVisibleCards(effectiveContext?.data);
    } else if (sections[dataLink]) { // Handle other generic sections
        currentViewContext = { type: sections[dataLink].type, data: null };
        const cardType = sections[dataLink].type;
        const containerId = sections[dataLink].container;
        renderCards(containerId, sections[dataLink].data, cardType);
    } else if (dataLink === 'recommended-playlists-section') {
        // NOUVEAU: Gestion de la page "Toutes les playlists recommandées"
        currentViewContext = { type: 'recommended-playlists', data: null };
        renderAllRecommendedPlaylistsPage();
    } else if (dataLink === 'upcoming-release-section') {
        // NOUVEAU: Page Prochaine Sortie
        currentViewContext = { type: 'upcoming', data: null };
        renderUpcomingReleasePage();
    } else if (dataLink === 'news-details-section') {
        // NOUVEAU: Page Détails News
        const newsId = effectiveContext?.data;
        currentViewContext = { type: 'news', data: newsId };
        renderNewsDetailsPage(newsId);
    }

    // NOUVEAU: Retire le surlignage de la carte avant de naviguer
    unhighlightPlayingCard();
    showSection(dataLink, updateHistory, previousContext);

    // NOUVEAU: Mettre à jour l'état actif de la barre de nav mobile
    document.querySelectorAll('#mobile-bottom-nav .mobile-nav-link, #sidebar-main-nav .sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.link === dataLink);
    });

    // CORRECTION: Réappliquer le surlignage si on est resté sur la même section (ex: changement de vue)
    // car showSection retourne tôt dans ce cas et ne rappelle pas highlightPlayingCard.
    if (currentPlayingItem) {
        highlightPlayingCard(currentPlayingItem);
    }
}

function renderLibraryPage(activeTabId = 'liked') {
    const tabsContainer = document.getElementById('library-tabs-container');
    const titleElement = document.getElementById('library-section-title');
    const clearBtn = document.getElementById('library-clear-playlist-btn');

    if (!tabsContainer || !titleElement || !clearBtn) return;

    const tabs = [
        { id: 'liked', title: getTranslation('likedTitles') },
        { id: 'current', title: getTranslation('currentPlaylist') }
    ];
    const savedPlaylistTabs = Object.keys(savedPlaylists).map(name => ({ id: name, title: name }));
    tabsContainer.innerHTML = [...tabs, ...savedPlaylistTabs].map(tab =>
        `<button class="playlist-tab-btn ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}" title="${tab.title}">${tab.title}</button>`
    ).join('');

    // NOUVEAU: Ajout de la classe pour l'indicateur et mise à jour
    tabsContainer.classList.add('sliding-tabs');
    setTimeout(() => updateSlidingIndicator(tabsContainer), 0);

    let itemsToShow = [];
    let isCustomPlaylist = false;

    if (activeTabId === 'liked') {
        itemsToShow = [...likedSongs].map(id => findItemById(id)).filter(Boolean);
        titleElement.textContent = getTranslation('likedTitles'); // Titre de la section
        isCustomPlaylist = false;
    } else if (activeTabId === 'current') {
        itemsToShow = currentPlaylist.map(id => findItemById(id)).filter(Boolean);
        titleElement.textContent = getTranslation('currentPlaylist'); // Titre de la section
        isCustomPlaylist = true;
    } else { // C'est une playlist sauvegardée
        itemsToShow = (savedPlaylists[activeTabId] || []).map(id => findItemById(id)).filter(Boolean);
        titleElement.textContent = activeTabId; // Set title element text
        isCustomPlaylist = false; // On ne peut pas éditer les playlists sauvegardées pour l'instant
    }

    if (clearBtn) clearBtn.style.display = isCustomPlaylist ? 'flex' : 'none';

    const itemsAsObject = itemsToShow.reduce((acc, item) => {
        if (item) acc[item.id] = item;
        return acc;
    }, {});

    renderCards('library-container', itemsAsObject, 'title'); // The 'title' type displays title cards

    // CORRECTION : S'assure que le conteneur de la bibliothèque a les bonnes classes pour la vue grille/liste.
    const libraryContainer = document.getElementById('library-container');
    const globalView = localStorage.getItem('mmg-global-view') || 'grid';
    const isListView = globalView === 'list';
    libraryContainer.classList.toggle('titles-grid', !isListView);
    libraryContainer.classList.toggle('list-view', isListView);

    if (currentPlayingItem) highlightPlayingCard(currentPlayingItem);

    if (itemsToShow.length === 0) {
        const listContainer = document.getElementById('library-container');
        let emptyMessageKey = 'noResults';
        if (activeTabId === 'liked') {
            emptyMessageKey = 'noLikedTitles';
        } else if (activeTabId === 'current') {
            emptyMessageKey = 'playlistEmpty';
        }
        listContainer.innerHTML = `<p style="font-size: 1.2em; opacity: 0.7; text-align: center; padding: 40px 20px;">${getTranslation(emptyMessageKey)}</p>`;
        listContainer.style.display = 'flex';
        listContainer.style.alignItems = 'center';
    }



    clearBtn.onclick = () => {
        currentPlaylist = [];
        currentQueueIndex = -1;
        localStorage.setItem('mmg-playlist', JSON.stringify(currentPlaylist));
        renderLibraryPage('current'); // Re-render l'onglet de la playlist actuelle
        showDialog(getTranslation("playlistCleared")); // Show playlist cleared dialog
        playAudio(sounds.back);
    };
}

// CORRECTION: Déplacée ici pour être dans la portée globale
function updateLoopShuffleUI() {
    const loopButtons = [document.getElementById('loop-btn'), document.getElementById('mobile-player-loop-btn')];
    const shuffleButtons = [document.getElementById('shuffle-btn'), document.getElementById('mobile-player-shuffle-btn')];

    loopButtons.forEach(btn => btn?.classList.toggle('active', isPlayerLooping));
    shuffleButtons.forEach(btn => btn?.classList.toggle('active', isShuffleMode));
}

// NOUVEAU: Fonction pour afficher les liens des réseaux sociaux dynamiquement
function renderSocials() {
    const containers = document.querySelectorAll('.socials-render-target');
    if (containers.length === 0) return;

    const activeProfile = getActiveProfile();
    const socialLinks = siteData.projectData[activeProfile]?.socialLinks;

    if (!socialLinks) {
        containers.forEach(c => c.innerHTML = '');
        return;
    }

    // NOUVEAU: Configuration des icônes SVG et des noms pour chaque plateforme
    const platformConfig = {
        instagram: { name: 'Instagram', icon: 'fab fa-instagram' },
        spotify: { name: 'Spotify', icon: 'fab fa-spotify' },
        appleMusic: { name: 'Apple Music', icon: 'fab fa-apple' },
        deezer: { name: 'Deezer', icon: 'fab fa-deezer' }
    };

    const html = Object.entries(socialLinks).map(([key, linkData]) => {
        const config = platformConfig[key];
        if (!config) return '';
        // MODIFICATION: Utilise une icône Font Awesome au lieu d'un SVG inline
        return `
                <a href="${linkData.url}" target="_blank" rel="noopener noreferrer" class="Btn ${key}" title="${config.name}">
                    <i class="${config.icon}"></i>
                    <span class="text">${linkData.user}</span>
                </a>
            `;
    }).join('');

    containers.forEach(container => {
        container.innerHTML = html;
    });
}

// NOUVEAU: Fonction pour rendre la page de toutes les playlists recommandées
function renderAllRecommendedPlaylistsPage() {
    const container = document.getElementById('all-recommended-playlists-cards');
    if (!container) return;

    const recommendedPlaylists = [
        { id: 'chill', name: 'Chill Vibes', cssClass: 'reco-playlist-chill', subtitle: 'Détente & Relax' },
        { id: 'frutiger', name: 'Frutiger Aero', cssClass: 'reco-playlist-frutiger', subtitle: 'Nostalgie 2000' }
        // On pourrait en ajouter d'autres ici
    ];

    // On injecte le HTML directement comme pour le dashboard
    container.innerHTML = recommendedPlaylists.map(playlist => {
        return `
            <div class="reco-card" data-item-id="${playlist.id}">
                <div class="reco-image-container ${playlist.cssClass}"><i class="fas fa-music"></i></div>
                <div class="reco-info">
                    <p class="reco-title">${playlist.name}</p>
                    <p class="reco-subtitle">${playlist.subtitle}</p>
                </div>
                <button class="reco-add-btn"><i class="fas fa-plus"></i></button>
            </div>`;
    }).join('');
}

// NOUVEAU: Données des actualités (simulées pour l'exemple)
const newsData = {
    'lancement': {
        title: "Lancement officiel",
        date: "Octobre 2025",
        image: "assets/news/release.webp",
        content: "Nous sommes ravis d'annoncer le lancement officiel de Mmg Studio ! Explorez notre univers musical, découvrez nos albums et plongez dans nos créations visuelles. Merci de votre soutien !"
    },
    'studio': {
        title: "Nouveaux thèmes disponibles",
        date: "Novembre 2025",
        image: "assets/news/studio.webp",
        content: "La boutique s'agrandit ! Découvrez de nouveaux thèmes pour personnaliser votre interface. Frutiger Aero, Spotimon, et bien d'autres vous attendent. Collectez des pièces en écoutant de la musique pour les débloquer."
    },
    'event': {
        title: "Prochain tournoi de beats",
        date: "Décembre 2025",
        image: "assets/news/event.webp",
        content: "Préparez vos meilleures prods ! Le prochain tournoi de beatmaking Mmg Beats aura lieu très bientôt. Restez connectés pour plus d'informations sur les inscriptions et les prix à gagner."
    }
};

// NOUVEAU: Fonction pour rendre la page de détails d'une actualité
function renderNewsDetailsPage(newsId) {
    const container = document.getElementById('news-details-content');
    if (!container) return;

    const news = newsData[newsId];
    if (!news) {
        container.innerHTML = '<p>Article non trouvé.</p>';
        return;
    }

    container.innerHTML = `
        <div class="upcoming-page-card">
            <div class="upcoming-page-image">
                <img src="${news.image}" alt="${news.title}">
            </div>
            <div class="upcoming-page-info">
                <h2>${news.title}</h2>
                <p class="upcoming-date"><i class="far fa-calendar-alt"></i> ${news.date}</p>
                <p class="upcoming-desc" style="text-align: justify;">${news.content}</p>
            </div>
        </div>
    `;
}

// NOUVEAU: Fonction pour rendre la page "Prochaine Sortie"
function renderUpcomingReleasePage() {
    const container = document.getElementById('upcoming-release-content');
    if (!container) return;

    // Données simulées ou récupérées de data.json si disponible
    const upcomingData = {
        title: "Super Mmg Bros (Desert)",
        date: "2025",
        descriptionKey: "upcomingDesc",
        image: "assets/pochettes/Pochette-SuperMmgBros(Desert).webp"
    };

    container.innerHTML = `
        <div class="upcoming-page-card">
            <div class="upcoming-page-image">
                <img src="${upcomingData.image}" alt="${upcomingData.title}">
                <div class="upcoming-page-badge">${getTranslation('upcomingBadge')}</div>
            </div>
            <div class="upcoming-page-info">
                <h2>${upcomingData.title}</h2>
                <p class="upcoming-date"><i class="far fa-calendar-alt"></i> ${upcomingData.date}</p>
                <p class="upcoming-desc">${getTranslation(upcomingData.descriptionKey)}</p>
                <button class="daily-bonus-action-btn" disabled>${getTranslation('comingSoon')}</button>
            </div>
        </div>
    `;
}

function renderDashboard() { // Render dashboard sections
    renderHeroAccordion(); // NOUVEAU: Accordéon Hero
    renderDailyBonusProgress(); // NOUVEAU: Widget Bonus (Version complète)
    renderRecommendedPlaylists();
    renderSocials(); // CORRECTION: Appel manquant pour afficher les réseaux sociaux

    // CORRECTION: Remplit la nouvelle structure de la section À Propos
    const activeProfile = getActiveProfile();
    const avatarUrl = activeProfile === 'mmg-music' ? 'assets/mmg-music-avatar.webp' : 'assets/mmg-beats-avatar.webp';
    const aboutTextKey = `about_${activeProfile.replace('-', '_')}`;

    const aboutAvatar = document.getElementById('dashboard-about-avatar');
    const aboutDesc = document.getElementById('dashboard-about-description');
    // NOUVEAU: Cibler le titre de la carte À propos
    const aboutTitle = document.querySelector('.about-card-title');

    if (aboutAvatar && aboutDesc) {
        aboutAvatar.src = avatarUrl;
        aboutDesc.textContent = getTranslation(aboutTextKey);
    }

    if (aboutTitle) {
        aboutTitle.textContent = activeProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';
    }

    // NOUVEAU: Mise à jour du texte du bouton switch dans À propos
    const aboutSwitchBtn = document.getElementById('about-switch-profile-btn');
    if (aboutSwitchBtn) {
        const targetProfileName = activeProfile === 'mmg-music' ? 'Beats' : 'Music';
        const switchText = aboutSwitchBtn.querySelector('.switch-text');
        if (switchText) switchText.textContent = `Switch to ${targetProfileName}`;
    }

    // NOUVEAU: Génération des boutons sociaux dans la section À propos
    const aboutSocialsContainer = document.getElementById('dashboard-about-socials');
    if (aboutSocialsContainer) {
        const socialLinks = siteData.projectData[activeProfile]?.socialLinks;
        if (socialLinks) {
            const platformIcons = {
                instagram: 'fab fa-instagram',
                spotify: 'fab fa-spotify',
                appleMusic: 'fab fa-apple',
                deezer: 'fab fa-deezer',
                youtube: 'fab fa-youtube',
                twitter: 'fab fa-twitter'
            };

            aboutSocialsContainer.innerHTML = Object.entries(socialLinks).map(([key, linkData]) => {
                const iconClass = platformIcons[key] || 'fas fa-link';
                return `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer" class="social-btn-small" title="${key}">
                            <i class="${iconClass}" style="font-size: 14px;"></i>
                        </a>`;
            }).join('');
        }
    }
}

let heroAccordionInterval;

function startHeroAccordionAutoScroll() {
    if (heroAccordionInterval) clearInterval(heroAccordionInterval);
    heroAccordionInterval = setInterval(() => {
        const panels = Array.from(document.querySelectorAll('.accordion-panel'));
        const activePanel = document.querySelector('.accordion-panel.active');
        if (activePanel && panels.length > 0) {
            const currentIndex = panels.indexOf(activePanel);
            const nextIndex = (currentIndex + 1) % panels.length;
            const nextPanel = panels[nextIndex];
            if (nextPanel) {
                toggleAccordion(nextPanel.id);
            }
        }
    }, 6000);
}


function renderHeroAccordion() {
    const container = document.getElementById('hero-accordion-container');
    if (!container) return;

    const activeProfile = getActiveProfile(); // Get active profile
    const allTitles = Object.values(siteData.contentData[activeProfile].titles);
    // On prend le dernier titre sorti
    const latestItem = allTitles.sort((a, b) => new Date(b.year, 0, 1) - new Date(a.year, 0, 1))[0];
    const bgImageSize = window.innerWidth <= 952 ? 'thumb' : 'full';

    // On simule une prochaine sortie (statique pour l'instant, ou à récupérer des données si dispo)
    const upcomingTitle = "Super Mmg Bros (Desert)";
    const upcomingImage = "assets/pochettes/Pochette-SuperMmgBros(Desert).webp";

    container.innerHTML = `
        <!-- PANNEAU 1 : DERNIÈRE SORTIE (Actif par défaut) -->
        <div id="panel-1" class="accordion-panel active" onclick="toggleAccordion('panel-1')">
            <div class="panel-bg" style="background-image: url('${getCorrectImagePath(latestItem, bgImageSize)}');"></div>
            <div class="panel-overlay"></div>
            
            <!-- Label visible quand fermé -->
            <div class="panel-collapsed-label">
                <i class="fas fa-star" style="color: #3b82f6; font-size: 1rem;"></i> Dernière<br>Sortie
            </div>
            
            <!-- Contenu visible quand ouvert -->
            <div class="panel-content">
                <h1 class="hero-title" style="font-size: 0.95rem; color: white; text-transform: uppercase; font-weight: 900; margin-bottom: 8px; line-height: 1;">${latestItem.title}</h1>
                <button class="hero-button dashboard-card-button" data-youtube-id="${latestItem.youtube_id}" data-item-id="${latestItem.id}" style="background: white; color: black; border: none; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 0.6rem;">Écouter</button>
            </div>
        </div>

        <!-- PANNEAU 2 : PROCHAINE SORTIE -->
        <div id="panel-2" class="accordion-panel" onclick="toggleAccordion('panel-2')">
            <div class="panel-bg" style="background-image: url('${upcomingImage}');"></div>
            <div class="panel-overlay"></div>
            
            <!-- Label visible quand fermé -->
            <div class="panel-collapsed-label">
                <i class="fas fa-clock" style="color: #facc15; font-size: 1rem;"></i> Prochaine<br>Sortie
            </div>
            
            <!-- Contenu visible quand ouvert -->
            <div class="panel-content">
                <h1 class="hero-title" style="font-size: 0.95rem; color: white; text-transform: uppercase; font-weight: 900; margin-bottom: 8px; line-height: 1;">${upcomingTitle}</h1>
                <button class="hero-button dashboard-card-button" data-link="upcoming-release-section" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.5); padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 0.6rem; backdrop-filter: blur(5px);">${getTranslation('viewDetails')}</button>
            </div>
        </div>

        <!-- Indicateurs -->
        <div class="accordion-dots">
            <div id="dot-1" class="accordion-dot active"></div>
            <div id="dot-2" class="accordion-dot"></div>
        </div>
    `;
    startHeroAccordionAutoScroll();
}

// Fonction globale pour l'accordéon
window.toggleAccordion = function (panelId) {
    document.querySelectorAll('.accordion-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');

    // Reset timer on manual interaction
    startHeroAccordionAutoScroll();

    // Update dots
    const dotId = 'dot-' + panelId.split('-')[1];
    document.querySelectorAll('.accordion-dot').forEach(d => d.classList.remove('active'));
    const dot = document.getElementById(dotId);
    if (dot) dot.classList.add('active');

    // Reset timer on manual interaction
    startHeroAccordionAutoScroll();
};

// NOUVEAU: Render Daily Bonus Widget (hardcoded for now as in prototype)
function renderDailyBonusWidget() {
    const container = document.getElementById('daily-bonus-section');
    if (!container) return;

    // Utiliser les vraies données
    const isSpecialDay = loginStreak >= 7;
    const rewardAmount = isSpecialDay ? "Bonus" : `+${loginStreak || 1}`;
    const streakText = `${getTranslation('dailyBonusStreak')} ${loginStreak}/7`;

    // Vérifier si un bonus est disponible aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const bonusAvailable = lastLoginDate !== today && !dailyBonusCompleted;
    const buttonIcon = bonusAvailable ? '<i class="fas fa-check"></i>' : '<i class="fas fa-clock"></i>';
    const buttonClass = bonusAvailable ? 'bonus-btn' : 'bonus-btn disabled';

    container.innerHTML = `
        <div class="bonus-content">
            <div class="bonus-info">
                ${streakText} <span style="color: #cbd5e1; margin: 0 4px;">|</span> ${rewardAmount} ${COIN_SVG}
            </div>
        </div>
        <button class="${buttonClass}">${buttonIcon}</button>
    `;

    const btn = container.querySelector('.bonus-btn');
    if (btn && bonusAvailable) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            claimDailyBonus();
        });
    }
}

// NOUVEAU: Gestionnaire de clic pour les playlists recommandées
function handleRecoPlaylistClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const card = e.target.closest('.card, .reco-card');
    if (!card) return;

    const playlistId = card.dataset.itemId;
    // CORRECTION: Cible .bank-title pour le thème VST, ou les titres standards, ou le titre reco
    const titleEl = card.querySelector('.bank-title') || card.querySelector('.card__title span') || card.querySelector('.reco-title');
    const playlistName = titleEl ? titleEl.textContent : 'Playlist';

    if (!savedPlaylists[playlistName]) {
        const activeProfile = getActiveProfile();
        const allTitles = Object.values(siteData.contentData[activeProfile].titles);

        let items = [];
        // Liaison dynamique avec les tags du fichier data.json
        if (playlistId === 'chill') {
            items = allTitles.filter(title => title.tags && title.tags.some(t => t.toLowerCase() === 'chill'));
        } else if (playlistId === 'frutiger') {
            items = allTitles.filter(title => title.tags && title.tags.some(t => t.toLowerCase() === 'frutiger aero'));
        }

        if (items.length > 0) {
            savedPlaylists[playlistName] = items.map(item => item.id);
            safeStorage.setItem('mmg-savedPlaylists', JSON.stringify(savedPlaylists));
            showDialog(getTranslation('playlistSaved'));

            // NOUVEAU: Met à jour l'icône du bouton après la sauvegarde
            const addBtn = card.querySelector('.reco-add-btn');
            if (addBtn) {
                addBtn.classList.add('saved');
                const icon = addBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-plus');
                    icon.classList.add('fa-check');
                }
            }
        }
    }

    playAudio(sounds.select);
    handleMenuNavigation('library-section', true, { type: 'library', data: playlistName });
}

function renderRecommendedPlaylists() {
    const container = document.getElementById('playlist-reco-list');
    if (!container) return;

    const recommendedPlaylists = [
        { id: 'chill', name: 'Chill Vibes', cssClass: 'reco-playlist-chill', subtitle: 'Détente & Relax' },
        { id: 'frutiger', name: 'Frutiger Aero', cssClass: 'reco-playlist-frutiger', subtitle: 'Nostalgie 2000' }
    ];

    container.innerHTML = recommendedPlaylists.map(playlist => {
        // NOUVEAU: Vérifie si la playlist est déjà sauvegardée
        const isSaved = savedPlaylists[playlist.name] !== undefined;
        const iconClass = isSaved ? 'fa-check' : 'fa-plus';

        return `
            <div class="reco-card" data-item-id="${playlist.id}">
                <div class="reco-image-container ${playlist.cssClass}"><i class="fas fa-music"></i></div>
                <div class="reco-info">
                    <p class="reco-title">${playlist.name}</p>
                    <p class="reco-subtitle">${playlist.subtitle}</p>
                </div>
                <button class="reco-add-btn ${isSaved ? 'saved' : ''}"><i class="fas ${iconClass}"></i></button>
            </div>`;
    }).join('');
}

function setupCarousel() {
    const container = document.getElementById('dashboard-carousel-container');
    const dotsContainer = document.getElementById('dashboard-carousel-dots');
    if (!container || !dotsContainer) return;

    let currentSlide = 0;
    const slides = container.querySelectorAll('.carousel-item');
    const dots = dotsContainer.querySelectorAll('button');
    const totalSlides = slides.length;

    if (totalSlides <= 1) return; // No need for carousel if 1 or less slides

    // CORRECTION: Nettoyer l'ancien minuteur avant d'en créer un nouveau
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
    carouselInterval = setInterval(nextSlide, 5000);

    function showSlide(index) {
        currentSlide = (index + totalSlides) % totalSlides;
        const scrollPosition = currentSlide * container.offsetWidth; // Calculate scroll position
        container.scrollLeft = scrollPosition;
        updateDots();
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function updateDots() {
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide); // Toggle active class for dot
        });
    }

    function resetInterval() {
        clearInterval(carouselInterval);
        carouselInterval = setInterval(nextSlide, 5000);
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            resetInterval();
        });
    });

    // NOUVEAU: Handle dot updates on manual swipe on mobile.
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const newSlideIndex = Math.round(container.scrollLeft / container.offsetWidth);
            if (newSlideIndex !== currentSlide) {
                showSlide(newSlideIndex);
                resetInterval(); // Reset interval
            }
        }, 100); // Délai pour ne pas surcharger le navigateur pendant le scroll
    });
}

// NOUVEAU: Fonction dédiée pour rendre la file d'attente dans le panneau mobile
function renderMobileQueue() {
    const container = document.getElementById('mobile-queue-list');
    const contextNameEl = document.getElementById('mobile-queue-context-name');
    if (!container || !contextNameEl) return;

    // CORRECTION: La logique de file d'attente est simplifiée.
    // On affiche le titre en cours, puis TOUTE la userQueue.
    const currentPlayingIndexInUserQueue = currentPlayingItem ? userQueue.indexOf(currentPlayingItem.id) : -1;

    // CORRECTION: La liste "à venir" est simplement la userQueue. Le titre en cours est affiché
    // séparément et n'est pas dans la userQueue, donc pas besoin de filtrer.
    // La fonction playVideoWhenReady retire le titre de la userQueue avant de le jouer.
    const upcomingTracks = userQueue;

    // Mettre à jour le contexte
    let contextText = '';
    if (currentPlayingItem) {
        switch (currentPlaybackContext.type) {
            case 'album':
            case 'playlist':
            case 'mmgPlaylist':
                contextText = currentPlaybackContext.name;
                break;
            case 'liked': contextText = getTranslation('likedTitles'); break;
            case 'search': contextText = getTranslation('searchResults'); break;
            case 'video': contextText = getTranslation('videos'); break;
            case 'selection': contextText = getTranslation('queue'); break;
            default: contextText = getTranslation('titles'); break;
        }
    }
    contextNameEl.textContent = contextText;

    // Construire la liste
    let html = '';
    const nowPlayingItemHtml = currentPlayingItem ? `
            <div class="playlist-item-wrapper">
                <div class="playlist-item-content">
                    <div class="playlist-item currently-playing" data-item-id="${currentPlayingItem.id}">
                        <span class="mobile-queue-drag-handle-placeholder"></span> <!-- CORRECTION: Le titre en cours n'a pas de poignée -->
                        <img src="${getCorrectImagePath(currentPlayingItem, 'thumb')}" alt="${currentPlayingItem.title}">
                        <div class="playlist-item-info">
                            <p class="playlist-item-title">${currentPlayingItem.title}</p>
                            <p class="playlist-item-subtitle">${currentPlayingItem.year || 'Vidéo'}</p>
                        </div>
                        <span class="currently-playing-indicator"><i class="fas fa-volume-up"></i></span>
                    </div>
                </div>
            </div>
        ` : '';

    const upcomingItemsHtml = upcomingTracks.map(itemId => {
        const item = findItemById(itemId);
        if (!item) return '';
        // NOUVEAU: Structure avec wrapper pour le swipe
        return `
                <div class="playlist-item-wrapper">
                    <div class="playlist-item-delete-action" data-delete-id="${itemId}">
                        <i class="fas fa-trash-alt"></i>
                    </div>
                    <div class="playlist-item-content">
                        <div class="playlist-item" data-item-id="${itemId}">
                            <i class="fas fa-bars mobile-queue-drag-handle"></i>
                            <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}">
                            <div class="playlist-item-info">
                                <p class="playlist-item-title">${item.title}</p>
                                <p class="playlist-item-subtitle">${item.year || 'Vidéo'}</p>
                            </div>
                        </div>
                    </div>
                </div>`;
    }).join('');

    container.innerHTML = nowPlayingItemHtml + upcomingItemsHtml;

    // NOUVEAU: Ajouter les écouteurs pour les boutons supprimer
    container.querySelectorAll('.playlist-item-delete-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemIdToDelete = button.dataset.deleteId;
            const itemWrapper = button.closest('.playlist-item-wrapper');

            // Animation de suppression
            if (itemWrapper) {
                itemWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease';
                itemWrapper.style.transform = 'translateX(20px)';
                itemWrapper.style.opacity = '0';
                itemWrapper.style.maxHeight = '0px';
                setTimeout(() => removeFromQueue(itemIdToDelete), 300); // Supprime après l'animation
            } else {
                removeFromQueue(itemIdToDelete);
            }
            playAudio(sounds.back);
        });
    });
}

function renderUpdateLog() {
    const container = document.getElementById('update-log-entries');
    if (!container) return;

    let dynamicNotificationsHtml = '';

    // --- Logique pour la notification de déblocage de titre ---
    // CORRECTION : S'assurer que allSearchableItems est chargé.
    const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
    const hasLockedTracks = allUnlockableTracks.some(t => !unlockedDreamSeasonTracks.includes(t.id));
    if (userCoins >= COIN_COST_UNLOCK && hasLockedTracks) {
        dynamicNotificationsHtml += `
                <div class="notification-item unlock-prompt" data-link="albums-section">
                    <div class="notification-details">
                        <h4>${getTranslation('unlockAvailableTitle')}</h4>
                        <p>${getTranslation('unlockTrackWithCoins', { COIN_COST_UNLOCK: COIN_COST_UNLOCK })}</p>
                    </div>
                </div>
            `;
    }

    // --- Logique pour la notification de déblocage de fond d'écran ---
    // CORRECTION : Vérifier que siteData.shopItems.backgrounds existe avant de l'utiliser.
    const backgroundsToBuy = siteData.shopItems?.backgrounds?.filter(bg => bg.cost > 0 && !purchasedShopItems.has(bg.id)) || [];
    const cheapestBackground = backgroundsToBuy.length > 0 ? backgroundsToBuy.reduce((prev, curr) => (prev.cost < curr.cost ? prev : curr)) : null;
    if (cheapestBackground && userCoins >= cheapestBackground.cost) {
        dynamicNotificationsHtml += `
                <div class="notification-item unlock-prompt" data-link="shop-section">
                    <div class="notification-details">
                        <h4>${getTranslation('unlockAvailableTitle')}</h4>
                        <p>${getTranslation('unlockBackgroundWithCoins', { cost: cheapestBackground.cost })}</p>
                    </div>
                </div>
            `;
    }

    container.innerHTML = dynamicNotificationsHtml;
}

function getDragAfterElement(container, y, selector = '.playlist-item') {
    const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect(); // Get bounding box of child
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// NOUVEAU: Fonctions pour le Drag & Drop de la file d'attente (PC & Mobile)
function setupQueueDragAndDrop() {
    // Desktop Queue
    const desktopQueue = document.getElementById('queue-container');
    if (desktopQueue) {
        setupGenericDragAndDrop(desktopQueue, '.playlist-item', '.playlist-drag-handle', () => {
            const newOrder = Array.from(desktopQueue.querySelectorAll('.playlist-item:not(.currently-playing)'))
                .map(el => el.dataset.itemId);

            const currentPlayingIndexInUserQueue = currentPlayingItem ? userQueue.indexOf(currentPlayingItem.id) : -1;
            if (currentPlayingIndexInUserQueue > -1) {
                const historyAndCurrent = userQueue.slice(0, currentPlayingIndexInUserQueue + 1);
                userQueue = [...historyAndCurrent, ...newOrder];
            } else {
                userQueue = newOrder;
            }
        });
    }

    // Mobile Queue
    const mobileQueue = document.getElementById('mobile-queue-list');
    if (mobileQueue) {
        setupGenericDragAndDrop(mobileQueue, '.playlist-item-wrapper', '.mobile-queue-drag-handle', () => {
            const newOrder = Array.from(mobileQueue.querySelectorAll('.playlist-item-wrapper'))
                .map(wrapper => wrapper.querySelector('.playlist-item').dataset.itemId)
                .filter(id => id !== currentPlayingItem?.id);

            const currentPlayingIndexInUserQueue = currentPlayingItem ? userQueue.indexOf(currentPlayingItem.id) : -1;
            if (currentPlayingIndexInUserQueue > -1) {
                const historyAndCurrent = userQueue.slice(0, currentPlayingIndexInUserQueue + 1);
                userQueue = [...historyAndCurrent, ...newOrder];
            } else {
                userQueue = newOrder;
            }
        });
    }
}

function setupGenericDragAndDrop(container, itemSelector, handleSelector, onUpdate) {
    let draggedItem = null;

    const cleanup = () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            onUpdate();
        }
    };

    // --- MOUSE (Desktop) ---
    container.addEventListener('dragstart', e => {
        const item = e.target.closest(itemSelector);
        if (item && !item.classList.contains('currently-playing') && !item.querySelector('.currently-playing')) {
            draggedItem = item;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => item.classList.add('dragging'), 0);
        }
    });

    container.addEventListener('dragend', cleanup);

    container.addEventListener('drop', e => {
        e.preventDefault();
        cleanup();
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY, itemSelector);
        if (draggedItem) {
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        }
    });

    // --- TOUCH (Mobile) ---
    container.addEventListener('touchstart', e => {
        const handle = e.target.closest(handleSelector);
        if (!handle) return;

        const item = handle.closest(itemSelector);
        if (item && !item.classList.contains('currently-playing') && !item.querySelector('.currently-playing')) {
            e.preventDefault(); // Empêche le scroll
            e.stopPropagation(); // NOUVEAU: Empêche le conflit avec le swipe de fermeture du panneau
            draggedItem = item;
            item.classList.add('dragging');
        }
    }, { passive: false });

    container.addEventListener('touchmove', e => {
        if (!draggedItem) return;
        e.preventDefault();
        const touch = e.touches[0];
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetItem = elementUnder?.closest(itemSelector);

        if (targetItem && targetItem !== draggedItem && container.contains(targetItem)) {
            if (targetItem.classList.contains('currently-playing') || targetItem.querySelector('.currently-playing')) return;

            const rect = targetItem.getBoundingClientRect();
            const next = (touch.clientY - rect.top) / rect.height > 0.5;
            if (next) {
                container.insertBefore(draggedItem, targetItem.nextSibling);
            } else {
                container.insertBefore(draggedItem, targetItem);
            }
        }
    }, { passive: false });

    container.addEventListener('touchend', e => {
        if (draggedItem) {
            e.stopPropagation(); // NOUVEAU: Empêche le conflit avec le swipe de fermeture du panneau
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            onUpdate();
        }
    });
}
