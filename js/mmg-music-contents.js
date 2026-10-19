
// =========================================================
// GLOBAL VARIABLES & STATE
// =========================================================

// Let siteData, newsData, allSearchableItems etc. be defined in mmg-data.js


let mediumPlayer;
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
let _playlistSet = new Set();
const PlaybackQueue = {
    context: [],
    user: [],
    _userSet: new Set(),
    index: -1,

    addToUser(id) {
        if (!this._userSet.has(id)) {
            this.user.push(id);
            this._userSet.add(id);
            if (typeof showDialog === 'function') showDialog(`"${findItemById(id).title}" ${getTranslation('addedToQueue')}`);
            if (typeof updateAllQueueViews === 'function') updateAllQueueViews();
            if (typeof playAudio === 'function') playAudio(sounds.select);
        }
    },

    removeFromUser(id) {
        if (this._userSet.has(id)) {
            this.user = this.user.filter(i => i !== id);
            this._userSet.delete(id);
            if (typeof showDialog === 'function') showDialog(`"${findItemById(id).title}" ${getTranslation('removedFromQueue')}`);
            if (typeof updateAllQueueViews === 'function') updateAllQueueViews();
        }
    },

    hasUser(id) {
        return this._userSet.has(id);
    },

    // Sync le Set si user[] est modifié directement (drag & drop)
    syncSet() {
        this._userSet = new Set(this.user);
    },

    clear() {
        this.user = [];
        this._userSet.clear();
        this.context = [];
        this.index = -1;
    }
}; let currentVolume = 100;
let sfxEnabled = true;
let currentLang = 'en'; // MODIFICATION: Langue par dÃ©faut
let currentNavigationContext = { playlist: [], index: -1 };
let currentViewContext = { type: 'menu', data: null }; // Pour re-render lors du changement de langue
let selectedContentsAlbumId = 'all';
let currentPlaybackContext = { type: 'none', name: '' }; // NOUVEAU: Pour suivre la source de la lecture
let notificationShownForThisState = false; // NOUVEAU: Variable manquante pour les notifications

// NOUVEAU: Mapping des sections alias vers les sections principales de navigation
const SECTION_ALIASES = {
    'albums-section': 'contents-albums-section',
    'titles-section': 'contents-section',
    'videos-section': 'contents-section',
    'video-list-section': 'contents-section',
    'video-clip-details-section': 'contents-section',
    'video-making-of-details-section': 'contents-section',
    'media-details-section': 'contents-section'
};

// NOUVEAU: Détermine l'ID de section principal pour le surlignage de la navigation
function getEffectiveNavSection(sectionId) {
    let effective = SECTION_ALIASES[sectionId] || sectionId;
    if (sectionId === 'contents-section' || sectionId === 'media-details-section') effective = 'contents-albums-section';
    return effective;
}

// NOUVEAU: Wrapper pour localStorage sÃ©curisÃ© (Ã©vite le crash en navigation privÃ©e)

// safeStorage is now in mmg-data.js


const ViewState = {
    _view: null,

    get current() {
        if (!this._view) {
            this._view = safeStorage.getItem('mmg-global-view') || 'grid';
        }
        return this._view;
    },

    set(view) {
        this._view = view;
        safeStorage.setItem('mmg-global-view', view);
    }
};

// NOUVEAU: Helper centralisÃ© pour obtenir le profil actif (Mmg Music ou Beats)


// getActiveProfile is now in mmg-data.js


// --- NOUVEAUX Ã‰TATS ---
let listenProgress = 0;
let previousListenProgress = 0;
let seekDetectedInCurrentPlay = false;

let userCoins = 0;
const COIN_COST_UNLOCK = 10;
let unlockedDreamSeasonTracks = [];
let lastLoginDate = null; // NOUVEAU: Pour le bonus quotidien
let loginStreak = 0; // NOUVEAU: Pour le bonus quotidien
let dailyBonusCompleted = false; // NOUVEAU: Pour finir le "jeu"
let coinsAtLastDismissal = -1; // NOUVEAU: Pour gÃ©rer la notification de dÃ©blocage (Option 2)

let purchasedShopItems = new Set(); // NOUVEAU: Pour suivre les thÃ¨mes/fonds achetÃ©s

// --- State for Tutorial ---



let readUpdateIds = new Set();

// --- PWA Installation State ---
let deferredPrompt = null;
let sfxLock = false; // NOUVEAU: Verrou pour empÃªcher les sons de se chevaucher
let warningDismissedInSession = false; // NOUVEAU: MÃ©morise si l'overlay PC a Ã©tÃ© fermÃ©

const UI = {
    miniPlayer: null,
    fullPlayer: null,
    playPauseBox: null,
    playerLikeBtn: null,
    songTitle: null,
    playerCover: null,
    mobileTitle: null,
    mobileArtist: null,
    mobileArt: null,
    miniTitle: null,
    miniArt: null,
    miniProgress: null,
    detailsSection: null,
    shopSection: null,
    searchInput: null,
    themeSwitch: null
};

const dom = {
    progressBar: null,
    currentTime: null,
    duration: null,
    mobileProgress: null,
    miniProgress: null,
    mobileCurrentTime: null,
    mobileDuration: null,
    mobileBottomNav: null,
    dailyBonusSection: null,
    coinCount: null,
    customDialog: null,
    dialogMessage: null,
    nextUpBanner: null,
    nextUpTitle: null,
    nextUpSource: null,
    mobileQueuePanel: null,
    mobileQueueList: null,
    artworkOverlay: null,
    artworkImg: null
};



// --- CONFIGURATIONS ET ICONES MODULE ---
const PLATFORM_CONFIG = {
    spotify: { get svg() { return window.APP_ICONS.spotify; }, base_url: 'https://open.spotify.com/album/', color: '#1DB954' },
    appleMusic: { get svg() { return window.APP_ICONS.appleMusic; }, base_url: 'https://music.apple.com/fr/album/', color: '#FA243C' },
    youtube: { get svg() { return window.APP_ICONS.youtube; }, base_url: 'https://www.youtube.com/watch?v=', color: '#FF0033' },
    deezer: { get svg() { return window.APP_ICONS.deezer; }, base_url: 'https://www.deezer.com/album/', color: '#A238FF' },
    amazonMusic: { get svg() { return window.APP_ICONS.amazonMusic; }, base_url: 'https://amazon.fr/music/player/albums/', color: '#25A9E0' },
    tidal: { get svg() { return window.APP_ICONS.tidal; }, base_url: 'https://tidal.com/browse/album/', color: '#111827' }
};

const SIDEBAR_ICON_MAP = {
    'home': 'house',
    'library': 'library',
    'shop': 'shopping-bag',
    'albums': 'disc-album',
    'albumsBeats': 'disc-album',
    'videos': 'tv',
    'about': 'info',
    'default': 'info'
};

// =========================================================
// SOUND & AUDIO ELEMENTS
// =========================================================
const sounds = {
    select: document.getElementById('select-sound'),
    back: document.getElementById('back-sound'),
    switchToWhite: document.getElementById('switch-to-white-sound'),
    switchToBlack: document.getElementById('switch-to-black-sound'),
    connecting: document.getElementById('connecting-sound'),
    achievementUnlocked: document.getElementById('achievement-unlocked-sound'),
    minimize: document.getElementById('minimize-sound'),
    maximize: document.getElementById('maximize-sound'),
    coin: document.getElementById('coin-sound'),
    blocked: document.getElementById('blocked-sound'),
    typingForwards: document.getElementById('typing-forwards-sound'),
    typingBackwards: document.getElementById('typing-backwards-sound'),
    notification: document.getElementById('notification-sound'),
    tags: document.getElementById('tags-sound'),
};

// =========================================================
// DATA LOADING
// =========================================================

// loadDataAndInitialize is now in mmg-data.js


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
    mediumPlayer = new YT.Player('medium-player-iframe', playerOptions);
    playerInitializationComplete = true;
    if (currentPlayingItem) loadAndPlayVideo(currentPlayingItem);
}

let _rafId = null;
let _lastTick = 0;

function startProgressTracking() {
    if (_rafId) return;
    const tick = (timestamp) => {
        if (timestamp - _lastTick >= 1000) {
            updateProgressBar();
            _lastTick = timestamp;
        }
        _rafId = requestAnimationFrame(tick);
    };
    _rafId = requestAnimationFrame(tick);
}

function stopProgressTracking() {
    if (_rafId) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
    }
}

function onPlayerReady(event) {
    setVolume(currentVolume);
    // setInterval retirÃ© d'ici
}

function setPlayPauseState(isPlaying) {
    [dom.playPauseBtn, dom.miniPlayPauseBtn, dom.mobilePlayPauseBtn].forEach(btn => {
        btn?.classList.toggle('is-playing', isPlaying);
    });
}

function onPlayerStateChange(event) {
    // Ignore events from the inactive player to prevent UI conflicts
    if (activePlayer && event.target !== activePlayer) {
        return;
    }

    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseBox = UI.playPauseBox;
    // NOUVEAU: ContrÃ´les du mini-lecteur mobile
    const miniPlayerPlayPauseBtn = document.getElementById('mini-player-play-pause-btn');
    const mobilePlayerPlayPauseBtn = document.getElementById('mobile-player-play-pause-btn');


    if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        playPauseBox.classList.remove('loading');
    } else if (event.data === YT.PlayerState.BUFFERING) {
        playPauseBox.classList.add('loading');
    }

    if (event.data === YT.PlayerState.ENDED) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
        const itemId = currentPlayingItem?.id; // DÃ©finir itemId ici pour qu'il soit disponible pour les achievements

        const finalProgress = activePlayer.getDuration() > 0 ? activePlayer.getCurrentTime() / activePlayer.getDuration() : 0;

        if (currentPlayingItem && isMusicTitle(currentPlayingItem) && !seekDetectedInCurrentPlay && finalProgress >= 0.95) {
            userCoins++;
            safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
            updateCoinDisplay();
            showDialog(getTranslation('coinObtained', { total: userCoins }));
            // CORRECTION : Met Ã  jour les notifications et le point rouge en temps rÃ©el Ã  chaque gain de piÃ¨ce.
            renderUpdateLog();
            updateNotificationDot();
            playAudio(sounds.coin);
            if (isPlayerLooping) updateAchievementProgress('loopMaster', itemId);
            if (currentPlayingItem.tags?.includes('playstation')) updateAchievementProgress('psPlayer', itemId);
            if (currentPlayingItem.tags?.includes('spotimon')) updateAchievementProgress('spotimonFan', itemId);
            const deviceType = (window.innerWidth <= 952 || /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ? 'mobile' : 'computer';
            updateAchievementProgress('dsExplorer', deviceType);
        }

        setPlayPauseState(false);

        updateMediaPositionState(); // Update one last time
        stopProgressTracking(); // NOUVEAU: on arrÃªte l'intervalle si terminÃ©

        // CORRECTION: Lancement automatique du titre suivant Ã  la fin du morceau
        playNextTrack(1, true, false, true); // promptUser = true pour forcer le clic (vues YouTube)

    } else if (event.data === YT.PlayerState.PLAYING) {
        startProgressTracking(); // NOUVEAU: on lance l'intervalle si en lecture
        setPlayPauseState(true);

        // NOUVEAU: Si la lecture commence (aprÃ¨s un clic manuel), on met Ã  jour toute l'interface
        if (currentPlayingItem) {
            updateMp3PlayerInfo(currentPlayingItem);
            updateLikeButtonUI(currentPlayingItem.id);
            updateMediaSession(currentPlayingItem);
            highlightPlayingCard(currentPlayingItem);
            const deviceType = (window.innerWidth <= 952 || /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ? 'mobile' : 'computer';
            updateAchievementProgress('dsExplorer', deviceType);
        }

        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";

        // NOUVEAU: Afficher le mini-player seulement quand on commence Ã  jouer
        const miniPlayer = UI.miniPlayer;
        if (miniPlayer && currentPlayingItem) {
            miniPlayer.classList.remove('hidden');
            document.body.classList.remove('mobile-player-hidden');
            document.documentElement.style.setProperty('--mobile-player-height', '66px');
        }

        if (isResumingFromOverlay) {
            isResumingFromOverlay = false;
            return;
        }

        updateMediaPositionState(); // Mettre Ã  jour l'Ã©tat pour la notification

    } else if (event.data === YT.PlayerState.PAUSED) {
        setPlayPauseState(false);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";

        stopProgressTracking(); // NOUVEAU: on arrÃªte l'intervalle si pause
        updateMediaPositionState(); // Mettre Ã  jour l'Ã©tat pour la notification
    }
}

function playVideoWhenReady(item, playlistIds = [], index = -1, playbackOriginType = 'titles', forceTempPlay = false, fromAutoplay = false, isSwipe = false, cueOnly = false) {
    if (!item) return;
    // CORRECTION: Ne pas dÃ©finir currentPlayingItem ici.
    // On le dÃ©finit uniquement si la lecture est confirmÃ©e, pour Ã©viter les faux positifs visuels quand l'autoplay est OFF.
    // La logique de la file d'attente est aussi dÃ©placÃ©e plus bas.


    // --- La lecture est confirmÃ©e, on met Ã  jour l'Ã©tat ---
    currentPlayingItem = item;

    // MODIFICATION: Si le titre vient de la file d'attente utilisateur, on le retire.
    const itemIndexInUserQueue = PlaybackQueue.user.indexOf(item.id);
    if (itemIndexInUserQueue > -1) {
        PlaybackQueue.user.splice(itemIndexInUserQueue, 1);
        PlaybackQueue.syncSet(); // CORRECTION : synchronise le Set interne après splice
        updateAllQueueViews();
    }

    // Determine PlaybackQueue.context and PlaybackQueue.index
    if (forceTempPlay) {
        // This is typically a single track play from its details page.
        PlaybackQueue.context = [item.id];
        PlaybackQueue.index = 0;
    } else if (playlistIds && playlistIds.length > 0) {
        PlaybackQueue.context = playlistIds;
        PlaybackQueue.index = index;
    } else { // Fallback for single track play not from a specific list
        const activeProfile = getActiveProfile();
        const albumId = item.albumId;
        if (albumId) {
            PlaybackQueue.context = Object.values(siteData.contentData[activeProfile].titles).filter(title => title.albumId === albumId).map(title => title.id);
            PlaybackQueue.index = PlaybackQueue.context.findIndex(id => id === item.id);
        } else {
            PlaybackQueue.context = [item.id]; // CORRECTION: Variable activePlaybackQueue n'existe pas
            PlaybackQueue.index = 0;
        }
    }

    // --- Determine currentPlaybackContext based on playbackOriginType ---
    // Prioritize specific origins, then fall back to more general ones.
    if (playbackOriginType === 'myPlaylist') {
        currentPlaybackContext = { type: 'playlist', name: 'Ma Playlist' };
    } else if (playbackOriginType === 'liked') {
        currentPlaybackContext = { type: 'liked', name: 'Titres LikÃ©s' };
    } else if (playbackOriginType === 'queue') {
        currentPlaybackContext = { type: 'selection', name: 'File d\'attente' };
    } else if (playbackOriginType === 'mmgPlaylist') {
        currentPlaybackContext = { type: 'mmgPlaylist', name: 'Mmg Playlists' };
    } else if (playbackOriginType === 'video') {
        currentPlaybackContext = { type: 'video', name: 'VidÃ©os' };
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
        showDialog("Chargement du lecteur vidÃ©o...");
        return;
    }
    loadAndPlayVideo(item, fromAutoplay, isSwipe, cueOnly); // isSwipe is the 3rd argument, not fromAutoplay
}

function loadAndPlayVideo(item, fromAutoplay = false, isSwipe = false, cueOnly = false) {
    const previousContext = { ...currentViewContext };
    const playPauseBox = UI.playPauseBox;
    if (playPauseBox) playPauseBox.classList.add('loading');
    unhighlightPlayingCard();
    currentPlayingItem = item;

    _switchActivePlayer(item, cueOnly);
    _updateCoverOverlay(item, cueOnly);

    if (!cueOnly) {
        _showPlaybackUI(item);
    } else {
        _updateCueUI(item);
    }

    _loadVideoInPlayer(item, cueOnly);
}

function _switchActivePlayer(item, cueOnly) {
    // Toutes les vidéos et musiques utilisent maintenant le même lecteur dans la page de détails
    activePlayer = mediumPlayer;

    if (!cueOnly) {
        // On s'assure que la page de détails (Musique ou Vidéo) est visible
        renderMusicTitleDetails(item, false, false, "", true); // skipPlayback=true car on est déjà dans playVideoWhenReady
    }
}

function _updateCoverOverlay(item, cueOnly) {
    const coverOverlay = document.getElementById('details-cover-overlay');
    const movablePlayer = document.getElementById('movable-player-container');
    if (coverOverlay) coverOverlay.classList.add('hidden');
    if (movablePlayer) movablePlayer.style.visibility = 'visible';
}

function _showPlaybackUI(item) {
    updateMp3PlayerInfo(item);
    updateLikeButtonUI(item.id);
    updateMediaSession(item);
    highlightPlayingCard(item);
    renderPlaylist();

    const miniPlayer = UI.miniPlayer;
    if (miniPlayer) {
        miniPlayer.classList.remove('hidden');
        if (!safeStorage.getItem('bubble-hint-shown')) {
            miniPlayer.classList.add('bubble-hint-anim');
            safeStorage.setItem('bubble-hint-shown', 'true');
            setTimeout(() => miniPlayer.classList.remove('bubble-hint-anim'), 1500);
        }
    }
    document.body.classList.remove('mobile-player-hidden');
    document.documentElement.style.setProperty('--mobile-player-height', '66px');
}

function _updateCueUI(item) {
    updateMp3PlayerInfo(item);
    updateLikeButtonUI(item.id);

    const detailsSection = UI.detailsSection;
    if (detailsSection && detailsSection.dataset.currentItemId === item.id) {
        const coverOverlay = document.getElementById('details-cover-overlay');
        const movablePlayer = document.getElementById('movable-player-container');
        if (coverOverlay) coverOverlay.classList.add('hidden');
        if (movablePlayer) movablePlayer.style.visibility = 'visible';
    }

    const miniPlayer = UI.miniPlayer;
    if (miniPlayer) miniPlayer.classList.add('hidden');
    document.body.classList.add('mobile-player-hidden');
}

function _loadVideoInPlayer(item, cueOnly) {
    if (!activePlayer || typeof activePlayer.loadVideoById !== 'function') return;

    const videoId = item.youtube_id || item.youtubeId;
    if (!videoId) {
        console.warn("[Player] No video ID found for item:", item.id);
        return;
    }

    const currentVideoUrl = activePlayer.getVideoUrl ? activePlayer.getVideoUrl() : '';
    const isSameVideo = currentVideoUrl.includes(videoId);

    if (cueOnly && isSameVideo) {
        return;
    }

    const playerParams = {
        videoId: videoId,
        startSeconds: item.startTime || 0
    };

    if (item.endTime) {
        playerParams.endSeconds = item.endTime;
    }

    if (cueOnly) {
        activePlayer.cueVideoById(playerParams);
    } else {
        activePlayer.loadVideoById(playerParams);
    }
}

/**
 * Mets Ã  jour les mÃ©tadonnÃ©es et les contrÃ´les pour l'API Media Session.
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

    navigator.mediaSession.setActionHandler('previoustrack', () => playNextTrack(-1, false, false, true));
    navigator.mediaSession.setActionHandler('nexttrack', () => playNextTrack(1, false, false, true));

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (activePlayer) activePlayer.seekTo(Math.max(0, activePlayer.getCurrentTime() - skipTime), true); // Correction pour ne pas aller en nÃ©gatif
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (activePlayer) activePlayer.seekTo(Math.min(activePlayer.getDuration(), activePlayer.getCurrentTime() + skipTime), true); // Correction pour ne pas dÃ©passer la durÃ©e
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
 * Met Ã  jour la position et la durÃ©e dans l'API Media Session pour la notification.
 * C'est crucial pour que l'OS considÃ¨re le mÃ©dia comme actif.
 * @returns 
 * Met Ã  jour la position et la durÃ©e dans l'API Media Session pour la notification.
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
            logger.error('Erreur lors de la mise Ã  jour de setPositionState:', error);
        }
    }
}

// NOUVEAU: Fonctions pour surligner la carte en cours de lecture
function highlightPlayingCard(item) {
    unhighlightPlayingCard(); // Retire l'ancien surlignage
    if (!item) return;

    // CORRECTION: On cible toutes les sections visibles pour Ãªtre sÃ»r de trouver la carte,
    // car querySelector s'arrÃªte au premier rÃ©sultat (qui peut Ãªtre la section en train de disparaÃ®tre).
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
    return allItemsMap.get(id) || null;
}

function isMusicTitle(item) {
    if (!item) return false;
    // Un titre musical est identifié par son type 'title' 
    // et possède généralement un albumId et une année.
    return item.type === 'title' || (item.albumId && item.year && item.type !== 'video' && item.type !== 'bonus');
}


// =========================================================
// LIKES, PLAYLIST & ACHIEVEMENTS
// =========================================================
function initUserData() {
    const storedLikes = safeStorage.getItem('mmg-likedSongs');
    likedSongs = storedLikes ? new Set(JSON.parse(storedLikes)) : new Set();

    const storedPlaylist = safeStorage.getItem('mmg-playlist');
    currentPlaylist = storedPlaylist ? JSON.parse(storedPlaylist) : [];
    _playlistSet = new Set(currentPlaylist);

    const storedSavedPlaylists = safeStorage.getItem('mmg-savedPlaylists');
    savedPlaylists = storedSavedPlaylists ? JSON.parse(storedSavedPlaylists) : {};

    const storedSfx = safeStorage.getItem('mmg-sfxEnabled');
    sfxEnabled = storedSfx !== null ? JSON.parse(storedSfx) : true;
    document.getElementById('sfx-switch').checked = sfxEnabled;

    const storedLang = safeStorage.getItem('mmg-lang');
    const browserLang = navigator.language.split('-')[0]; // 'fr-FR' -> 'fr'
    // On vérifie les langues supportées directement car l'objet translations est vide au démarrage
    currentLang = storedLang || (['fr', 'en'].includes(browserLang) ? browserLang : 'en');
    // On se contente de mettre à jour les boutons de langue ici.
    document.querySelectorAll('.lang-btn, .lang-option').forEach(btn => {
        const val = btn.dataset.lang || btn.dataset.value;
        btn.classList.toggle('active', val === currentLang);
    });

    const storedReadUpdates = safeStorage.getItem('mmg-readUpdateIds');
    readUpdateIds = storedReadUpdates ? new Set(JSON.parse(storedReadUpdates)) : new Set();

    const storedAchievements = safeStorage.getItem('mmg-achievements');
    const defaultAchievements = siteData.achievements || {};
    achievements = storedAchievements ? JSON.parse(storedAchievements) : JSON.parse(JSON.stringify(defaultAchievements));

    Object.keys(defaultAchievements).forEach(key => {
        if (!achievements[key]) {
            achievements[key] = JSON.parse(JSON.stringify(defaultAchievements[key]));
        }
    });


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
        logger.error('Failed to parse unlocked tracks, resetting.', e);
        unlockedDreamSeasonTracks = [];
    }

    // NOUVEAU: Charger les articles de boutique achetÃ©s
    const storedPurchasedItems = safeStorage.getItem('mmg-purchasedItems');
    try {
        const parsedItems = storedPurchasedItems ? JSON.parse(storedPurchasedItems) : [];
        purchasedShopItems = new Set(parsedItems);
        if (purchasedShopItems.has('bg-fond2')) {
            purchasedShopItems.add('bg-boxes');
            safeStorage.setItem('mmg-purchasedItems', JSON.stringify([...purchasedShopItems]));
        }
    } catch (e) {
        logger.error('Failed to parse purchased items, resetting.', e);
        purchasedShopItems = new Set();
    }

    // NOUVEAU: Initialisation des donnÃ©es pour le bonus de connexion quotidien
    lastLoginDate = safeStorage.getItem('mmg-lastLoginDate') || null;
    loginStreak = parseInt(safeStorage.getItem('mmg-loginStreak') || '0', 10);
    dailyBonusCompleted = safeStorage.getItem('mmg-dailyBonusCompleted') === 'true';
}

let _lastDisplayedCoins = -1;
function updateCoinDisplay() {
    if (userCoins === _lastDisplayedCoins) return;
    _lastDisplayedCoins = userCoins;
    if (dom.coinCount) dom.coinCount.textContent = userCoins;
    // Sync topbar pill coin count (PC)
    const topbarCoin = document.getElementById('topbar-coin-count');
    if (topbarCoin) topbarCoin.textContent = userCoins;
}

function updateNotificationDot() {
    const dots = document.querySelectorAll('.notification-dot'); // Cible tous les points rouges
    if (dots.length === 0) return;

    // CORRECTION : S'assurer que siteData est chargÃ© avant de continuer.
    if (!siteData || !siteData.shopItems) return;

    // --- Condition 1: L'utilisateur peut-il dÃ©bloquer quelque chose ? ---
    // Titre exclusif
    const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
    const hasLockedTracks = allUnlockableTracks.some(t => !unlockedDreamSeasonTracks.includes(t.id));
    const canUnlockTrack = userCoins >= COIN_COST_UNLOCK && hasLockedTracks;

    // CORRECTION : VÃ©rifier que shopItems.backgrounds existe avant de filtrer.
    const backgroundsToBuy = siteData.shopItems.backgrounds.filter(bg => bg.cost > 0 && !purchasedShopItems.has(bg.id));
    const cheapestBackground = backgroundsToBuy.length > 0 ? backgroundsToBuy.reduce((prev, curr) => (prev.cost < curr.cost ? prev : curr)) : null;
    const canUnlockBackground = cheapestBackground && userCoins >= cheapestBackground.cost;

    const canUnlockSomething = canUnlockTrack || canUnlockBackground;

    // MODIFICATION: Le point rouge apparaÃ®t uniquement si on peut dÃ©bloquer quelque chose
    // ET que l'utilisateur n'a pas dÃ©jÃ  "ignorÃ©" cette notification (Option 2)
    const shouldShowDot = canUnlockSomething && (userCoins > coinsAtLastDismissal);

    // NOUVEAU: DÃ©tecter si l'Ã©tat du point rouge change pour jouer le son de notification.
    // C'est le seul endroit oÃ¹ ce son doit Ãªtre jouÃ©.
    const isCurrentlyHidden = dots.length > 0 && dots[0].classList.contains('hidden');
    if (shouldShowDot && isCurrentlyHidden) {
        playAudio(sounds.notification);

        // NOUVEAU: Fait vibrer la cloche automatiquement quand une notif arrive
        [dom.bellIconPc, dom.bellIconMobile].forEach(icon => {
            icon?.querySelectorAll('animateTransform').forEach(a => a.beginElement && a.beginElement());
        });
    }

    // On cache ou montre les points sur TOUS les Ã©lÃ©ments concernÃ©s
    dots.forEach(dot => {
        if (shouldShowDot) {
            dot.classList.remove('hidden');
        } else {
            dot.classList.add('hidden');
        }
    });

    // NOUVEAU: Mettre Ã  jour le badge de l'icÃ´ne de l'application en mÃªme temps que le point rouge.
    updateAppBadge();

    // Mettre Ã  jour l'Ã©tat du bouton "Marquer comme lu" (il sert ici de bouton "Ignorer")
    const markAsReadBtn = document.getElementById('mark-as-read-btn');
    if (markAsReadBtn) {
        markAsReadBtn.disabled = !shouldShowDot;
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
    } else if (id === 'psPlayer') {
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
            // La progression n'est marquÃ©e comme changÃ©e que si un nouveau titre a Ã©tÃ© ajoutÃ©.
            progressChanged = true;
        }
    } else if (id === 'pwaInstall') {
        achievements[id].progress = 1;
        unlockAchievement(id);
        progressChanged = true;
    } else if (id === 'dsExplorer') {
        if (typeof ach.progress !== 'object' || ach.progress === null || Array.isArray(ach.progress)) {
            ach.progress = { computer: false, mobile: false };
        }
        if (value === 'computer' || value === 'mobile') {
            if (!ach.progress[value]) {
                ach.progress[value] = true;
                progressChanged = true;
                const count = (ach.progress.computer ? 1 : 0) + (ach.progress.mobile ? 1 : 0);
                if (count >= ach.goal) {
                    unlockAchievement(id);
                }
            }
        }
    }

    if (progressChanged) {
        safeStorage.setItem('mmg-achievements', JSON.stringify(achievements));
        // NOUVEAU: VÃ©rifie si la boutique est ouverte et la met Ã  jour dynamiquement.
        const shopSection = UI.shopSection;
        if (shopSection && !shopSection.classList.contains('hidden')) {
            // On redessine uniquement la liste des thÃ¨mes pour reflÃ©ter la progression.
            renderShopItems(false); // Pas d'animation sur mise Ã  jour progression
        }
    }
}

function unlockAchievement(id) {
    if (achievements[id].unlocked) return;
    achievements[id].unlocked = true;
    safeStorage.setItem('mmg-achievements', JSON.stringify(achievements));
    playAudio(sounds.achievementUnlocked, true);
    showDialog(`${getTranslation('achievementUnlocked')}: ${getTranslation(`achievement_${id}_title`)}!`);
    // CORRECTION : rafraîchit la boutique si ouverte, au lieu de l'ancienne fonction cassée
    if (UI.shopSection && !UI.shopSection.classList.contains('hidden')) renderShopItems(false);
}

// NOUVEAU: Met Ã  jour le badge de l'icÃ´ne de l'application (PWA)
async function updateAppBadge() {
    const hasUnread = !document.querySelector('.notification-dot')?.classList.contains('hidden');
    const NOTIFICATION_TAG = 'mmgear-badge-notification'; // Un tag pour gÃ©rer la notification

    // --- 1. API Badging (le point sur l'icÃ´ne) ---
    if ('setAppBadge' in navigator) {
        if (hasUnread) {
            navigator.setAppBadge(); // Affiche un point sur l'icÃ´ne
        } else {
            navigator.clearAppBadge(); // Retire le point
            notificationShownForThisState = false; // RÃ©initialise le flag quand il n'y a plus rien de non lu
        }
    }

    // --- 2. Notification Locale (le message dans la barre de notif) ---
    if ('Notification' in window && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;

        if (hasUnread) {
            // On n'affiche la notification que si on ne l'a pas dÃ©jÃ  fait pour cet "Ã©tat non lu"
            if (!notificationShownForThisState) {
                if (Notification.permission === 'granted') {
                    // Affiche une notification normale (non silencieuse)
                    registration.showNotification('Mmg Studio', {
                        body: getTranslation('unreadContent'), // "Vous avez du contenu non lu."
                        tag: NOTIFICATION_TAG, // Un tag pour remplacer la notification prÃ©cÃ©dente au lieu d'en empiler
                        icon: './assets/icons/icon-192.webp',
                        badge: './assets/icons/icon-192.webp', // IcÃ´ne pour la barre de notif sur Android
                        vibrate: [100, 50, 100] // Une petite vibration
                        // 'silent: false' est le comportement par dÃ©faut, donc pas besoin de le spÃ©cifier
                    });
                    notificationShownForThisState = true; // On marque que la notification a Ã©tÃ© montrÃ©e
                }
            }
        } else {
            // Si plus rien de non lu, on retire la notification de la barre
            const notifications = await registration.getNotifications({ tag: NOTIFICATION_TAG });
            notifications.forEach(notification => notification.close());
            notificationShownForThisState = false; // RÃ©initialise le flag
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
    if (UI.shopSection && !UI.shopSection.classList.contains('hidden')) renderShopItems(false);
}

function renderAchievements() {
    const container = document.getElementById('achievements-list');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(achievements).forEach(([id, ach]) => {
        let progressValue = 0;
        if (id === 'loopMaster') {
            progressValue = Math.max(0, ...Object.values(ach.progress).map(Number)) / ach.goal;
        } else if (id === 'psPlayer' || id === 'spotimonFan') {
            progressValue = ach.progress.length / ach.goal;
        } else if (id === 'dsExplorer') {
            const count = (ach.progress?.computer ? 1 : 0) + (ach.progress?.mobile ? 1 : 0);
            progressValue = count / ach.goal;
        } else if (id === 'patienceIsKey') {
            progressValue = ach.progress / ach.goal;
        }
        progressValue = Math.min(1, progressValue) * 100;

        const iconHtml = `<div class="achievement-icon-svg">${window.APP_ICONS[ach.icon] || (ach.icon.startsWith('fab') ? `<i class="${ach.icon}"></i>` : window.APP_ICONS.star)}</div>`;

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

// NOUVEAU: Fonction pour vÃ©rifier si l'application est installÃ©e (mode standalone)
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

    // CORRECTION: Si on est dans la bibliothÃ¨que, on la met Ã  jour
    // au lieu de toujours rediriger vers l'onglet "Likes".
    if (document.getElementById('library-section').classList.contains('hidden') === false) {
        // On trouve l'onglet actuellement actif et on le rafraÃ®chit.
        const activeTab = document.querySelector('#library-tabs-container .playlist-tab-btn.active');
        renderLibraryPage(activeTab ? activeTab.dataset.tabId : 'liked');
    }
    // Mettre Ã  jour dynamiquement les cartes du tableau de bord
    if (document.getElementById('home-dashboard-section').classList.contains('hidden') === false) {
        renderDashboard();
    }
}

function updateLikeButtonUI(itemId) {
    const playerLikeBtn = UI.playerLikeBtn;
    if (!playerLikeBtn || !currentPlayingItem || currentPlayingItem.id !== itemId) return;
    const isLiked = likedSongs.has(itemId);

    // NOUVEAU: Mettre Ã  jour le bouton like du lecteur mobile
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
    if (_playlistSet.has(itemId)) {
        // Suppression via filter pour plus de robustesse
        currentPlaylist = currentPlaylist.filter(id => id !== itemId);
        _playlistSet.delete(itemId);

        // NOUVEAU: Mise à jour de la file de lecture si on est dans le contexte Playlist
        // Cela évite de naviguer vers des titres supprimés avec Prev/Next
        if (currentPlaybackContext.type === 'playlist') {
            PlaybackQueue.context = [...currentPlaylist];
            if (currentPlayingItem) {
                PlaybackQueue.index = currentPlaylist.indexOf(currentPlayingItem.id);
            }
        }

        showDialog(getTranslation("titleRemovedPlaylist")); // Le son de notification est déjà joué par showDialog
    } else {
        currentPlaylist.push(itemId);
        _playlistSet.add(itemId);

        // NOUVEAU: Mise à jour de la file de lecture si on est dans le contexte Playlist
        if (currentPlaybackContext.type === 'playlist') {
            PlaybackQueue.context = [...currentPlaylist];
            if (currentPlayingItem) {
                PlaybackQueue.index = currentPlaylist.indexOf(currentPlayingItem.id);
            }
        }

        showDialog(getTranslation("titleAddedPlaylist")); // Le son de notification est déjà joué par showDialog
    }

    safeStorage.setItem('mmg-playlist', JSON.stringify(currentPlaylist));
    renderPlaylist();

    // CORRECTION : Si la bibliothèque est ouverte sur l'onglet "Ma playlist", on la rafraîchit.
    const librarySection = document.getElementById('library-section');
    const librarySectionVisible = librarySection && !librarySection.classList.contains('hidden');
    const myPlaylistTabActive = document.querySelector('#library-tabs-container .playlist-tab-btn[data-tab-id="current"]')?.classList.contains('active');
    if (librarySectionVisible && myPlaylistTabActive) {
        renderLibraryPage('current');
    }

    updatePlayerPlaylistButtonUI(itemId); // NOUVEAU: Mettre à jour l'icône du lecteur
}

// NOUVEAU: Logique pour la file d'attente
function addToQueue(itemId) {
    PlaybackQueue.addToUser(itemId);
}

function playNext(itemId) {
    // Si rien ne joue, on lance la lecture depuis la file utilisateur
    if (!currentPlayingItem) {
        playVideoWhenReady(findItemById(itemId), [], -1, 'queue'); // Explicitly from queue
        return;
    }

    // Retire le titre s'il est dÃ©jÃ  dans la file d'attente pour Ã©viter les doublons
    const existingIndex = PlaybackQueue.user.indexOf(itemId);
    if (existingIndex > -1) {
        PlaybackQueue.user.splice(existingIndex, 1);
    }

    // Si le titre actuel est dans la file utilisateur, on insÃ¨re aprÃ¨s.
    const currentPlayingIndexInUserQueue = PlaybackQueue.user.indexOf(currentPlayingItem.id);
    if (currentPlayingIndexInUserQueue > -1) {
        PlaybackQueue.user.splice(currentPlayingIndexInUserQueue + 1, 0, itemId);
    } else {
        // Sinon, on l'ajoute simplement au dÃ©but de la file d'attente Ã  venir.
        // Cela signifie qu'il sera le prochain titre jouÃ© aprÃ¨s celui en cours.
        PlaybackQueue.user.unshift(itemId);
    }

    PlaybackQueue.syncSet();
    showDialog(`"${findItemById(itemId).title}" ${getTranslation('playNext')}.`);
    updateAllQueueViews(); // CORRECTION: Met Ã  jour toutes les vues de la file d'attente
    playAudio(sounds.select);
}

// NOUVEAU: Fonction pour afficher la file d'attente
function renderQueue() {
    const container = document.getElementById('queue-container');
    const subtitle = document.getElementById('queue-context-subtitle');
    if (!container || !subtitle) return;

    // La file d'attente visible est TOUJOURS la PlaybackQueue.user.
    // On affiche les titres qui viennent aprÃ¨s celui en cours s'il est dans la PlaybackQueue.user,
    // sinon on affiche toute la PlaybackQueue.user.
    const currentPlayingIndexInUserQueue = currentPlayingItem ? PlaybackQueue.user.indexOf(currentPlayingItem.id) : -1;
    let upcomingTracks = [];

    if (currentPlayingIndexInUserQueue > -1) {
        // Si le titre en cours est dans la file utilisateur, on affiche ce qui suit
        upcomingTracks = PlaybackQueue.user.slice(currentPlayingIndexInUserQueue + 1);
    } else {
        // Sinon, on affiche toute la file utilisateur comme "Ã  venir"
        upcomingTracks = PlaybackQueue.user;
    }

    // Mettre Ã  jour le sous-titre de contexte
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
        container.innerHTML = `<p style="text-align: center; padding: 20px 0;">Aucun titre Ã  venir.</p>`;
        return;
    }

    container.innerHTML = '';
    upcomingTracks.forEach((itemId, index) => {
        const item = findItemById(itemId);
        if (!item) return;

        const queueItem = document.createElement('div');
        queueItem.className = 'playlist-item queue-item'; // RÃ©utilise le style de playlist-item
        queueItem.dataset.itemId = itemId;
        queueItem.draggable = true;
        // NOUVEAU: Ajout d'un index pour faciliter la rÃ©organisation
        queueItem.dataset.index = index;

        const isCurrentlyPlaying = currentPlayingItem && currentPlayingItem.id === itemId;
        if (isCurrentlyPlaying) {
            queueItem.classList.add('currently-playing');
        }

        queueItem.innerHTML = `
                <div class="playlist-drag-handle" title="RÃ©organiser">${window.APP_ICONS.bars}</div>
                <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}">
                <div class="playlist-item-info">
                    <p class="playlist-item-title">${item.title}</p>
                    <p class="playlist-item-subtitle">${item.year || 'VidÃ©o'}</p>
                </div>
                ${isCurrentlyPlaying ? `<span class="currently-playing-indicator">${window.APP_ICONS.volume}</span>` : `<button class="queue-item-delete-btn" data-delete-id="${itemId}" title="Retirer" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:8px;opacity:0.6;transition:opacity .2s;">${window.APP_ICONS.trash}</button>`}
            `;

        // Gestion du clic pour sauter Ã  ce titre (facultatif mais pratique)
        queueItem.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.queue-item-delete-btn');
            if (delBtn) {
                e.stopPropagation();
                removeFromQueue(delBtn.dataset.deleteId);
                playAudio(sounds.back);
                return;
            }
            if (!e.target.closest('.playlist-drag-handle')) {
                // On joue directement depuis la PlaybackQueue.user
                const itemToPlay = findItemById(itemId);
                const startIndex = PlaybackQueue.user.indexOf(itemId);
                playVideoWhenReady(itemToPlay, PlaybackQueue.user, startIndex, 'queue');
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
    let tabsHtml = `<button class="playlist-tab-btn active" data-playlist-id="custom">${getTranslation('myPlaylist') || 'Ma Playlist'}</button>`;
    tabsHtml += Object.keys(savedPlaylists).map(name =>
        `<button class="playlist-tab-btn" data-playlist-id="${name}">${name}</button>`
    ).join('');
    tabsContainer.innerHTML = tabsHtml;

    // 2. DÃ©terminer la playlist active
    const activeTab = tabsContainer.querySelector('.playlist-tab-btn.active');
    const activePlaylistId = activeTab.dataset.playlistId;

    let itemsToShow = [];
    let isCustomPlaylist = false;

    if (activePlaylistId === 'custom') {
        itemsToShow = currentPlaylist;
        titleElement.textContent = getTranslation('myPlaylist') || 'Ma Playlist';
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

        const dragHandle = isCustomPlaylist ? `<div class="playlist-drag-handle">${window.APP_ICONS.bars}</div>` : '<span class="playlist-drag-handle-placeholder"></span>';
        const deleteButton = isCustomPlaylist ? `<button class="playlist-item-delete" title="${getTranslation("deleteFromPlaylist")}">${window.APP_ICONS.trash}</button>` : '';

        playlistItem.innerHTML = `
                ${dragHandle}
                <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}">
                <div class="playlist-item-info">
                    <p class="playlist-item-title">${item.title}</p>
                    <p class="playlist-item-subtitle">${item.year || 'VidÃ©o'}</p>
                </div>
                ${deleteButton}
                ${isCurrentlyPlaying ? `<span class="currently-playing-indicator">${window.APP_ICONS.volume}</span>` : ''}
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

            // Gestion de la visibilitÃ© du bouton d'installation
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) {
                installBtn.style.display = ''; // Toujours afficher le bouton pour Ã©viter la confusion
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

    // NOUVEAU: Chargement à la demande si pas encore chargé (preload="none")
    if (audioElement.readyState === 0 && audioElement.src) {
        audioElement.load();
    }

    // NOUVEAU: Verrou pour empêcher les sons de se chevaucher (sauf si forcé)
    if (sfxLock && !force) return;

    sfxLock = true;
    audioElement.currentTime = 0;
    audioElement.play().catch(error => {
        sfxLock = false; // LibÃ¨re le verrou si la lecture Ã©choue
    });

    // LibÃ¨re le verrou aprÃ¨s une courte durÃ©e.
    // Assez court pour permettre des clics rapides, assez long pour Ã©viter les doublons dans le mÃªme Ã©vÃ©nement.
    setTimeout(() => {
        sfxLock = false;
    }, 50); // 50ms lock
}

/*
 * NOUVEAU: Met Ã  jour la position de l'indicateur de glissement pour un conteneur d'onglets donnÃ©.
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
    // Sécurité: si la langue n'est pas encore chargée, on tente de fallback sur 'en' ou on affiche la clé
    const langData = translations[currentLang] || translations['en'];
    if (!langData) return `[${key}]`;

    let translation = langData[key] || (translations['en'] ? translations['en'][key] : null) || `[${key}]`;
    for (const placeholder in replacements) {
        translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    // NOUVEAU: Interpolation centrale du SVG de la piÃ¨ce pour alleger languages.js
    if (translation.includes('{COIN_SVG}')) {
        translation = translation.replace('{COIN_SVG}', COIN_SVG);
    }
    return translation;
}

async function applyLanguage(lang) {
    if (typeof loadLanguage === 'function') {
        await loadLanguage(lang);
    }
    currentLang = lang;
    safeStorage.setItem('mmg-lang', lang);

    // 1. Mettre Ã  jour les Ã©lÃ©ments statiques (data-lang-key)
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const t = getTranslation(el.dataset.langKey);
        if (!t) return;
        if (el.tagName === 'INPUT') {
            if (el.placeholder !== t) el.placeholder = t;
        } else {
            if (el.textContent !== t) el.textContent = t;
        }
    });

    // 2. Mettre Ã  jour les bulles d'aide (data-lang-title)
    document.querySelectorAll('[data-lang-title]').forEach(el => {
        const t = getTranslation(el.dataset.langTitle);
        if (t && el.title !== t) el.title = t;
    });

    // 3. Mise Ã  jour des indicateurs visuels (boutons de langue)
    document.querySelectorAll('.lang-btn, .lang-option').forEach(el => {
        const val = el.dataset.lang || el.dataset.value;
        el.classList.toggle('active', val === lang);
    });

    // 4. Re-rendre les composants dynamiques visibles si nÃ©cessaire
    const visibleSection = document.querySelector('.page-section:not(.hidden)');
    const visibleSectionId = visibleSection ? visibleSection.id : null;
    const sectionsNeedingFullRerender = ['home-dashboard-section', 'shop-section', 'media-details-section', 'search-results-section', 'contents-section', 'upcoming-release-section'];

    if (visibleSectionId && sectionsNeedingFullRerender.includes(visibleSectionId)) {
        handleMenuNavigation(visibleSectionId, false);
    }

    // Mise Ã  jour des infos de lecture
    if (typeof currentPlayingItem !== 'undefined' && currentPlayingItem) {
        if (typeof updateMp3PlayerInfo === 'function') updateMp3PlayerInfo(currentPlayingItem);
    } else {
        if (typeof resetMiniPlayerUI === 'function') resetMiniPlayerUI();
    }

    // NOUVEAU: Met Ã  jour le titre du header mobile immÃ©diatement pour reflÃ©ter la nouvelle langue
    const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id;
    if (currentSectionId) {
        updateMobileHeader(currentSectionId);
    }

    // Re-render les overlays ouverts qui nÃ©cessitent une traduction
    const shopSection = UI.shopSection;
    if (shopSection && !shopSection.classList.contains('hidden')) {
        renderShopPage(undefined, false); // Pas d'animation
    }
    // Ajouter d'autres overlays si nÃ©cessaire
}


// =========================================================
// Shop Render — extrait dans js/mmg-shop.js
// =========================================================
// NOUVEAU: Met Ã  jour la couleur de la barre de statut/navigation d'Android
// NOUVEAU: Met Ã  jour la couleur de la barre de statut/navigation d'Android
function updateThemeColorMeta(forceIntro = false) {
    const isDark = document.body.classList.contains('dark-theme');
    const introContainer = document.getElementById('intro-container');
    const isIntroVisible = forceIntro || (introContainer && introContainer.style.display !== 'none' && introContainer.style.opacity !== '0');

    const statusBarMeta = document.querySelector('meta[name="theme-color"]');
    const navBarMeta = document.querySelector('meta[name="navigation-bar-color"]');
    const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');

    let themeColor = '#ffffff';
    let navColor = '#ffffff';

    if (isIntroVisible) {
        // Pendant l'intro, tout doit Ãªtre blanc pur
        themeColor = '#ffffff';
        navColor = '#ffffff';
    } else if (isDark) {
        // Mode Sombre (Default/Default 2)
        themeColor = '#121212';
        navColor = '#121212';
    } else {
        // Mode Clair et ThÃ¨mes SpÃ©ciaux
        if (document.body.classList.contains('theme-spotimon')) {
            themeColor = '#f4f3f3'; // Top Bar Spotimon (couleur du header mobile)
            navColor = '#111111';   // Bottom Bar Spotimon
        } else if (document.body.classList.contains('theme-16bit')) {
            themeColor = '#f6fcfe'; // Frutiger Aero (couleur du header mobile)
            navColor = '#ebf8ff';   // Frutiger Aero (bas)
        } else if (document.body.classList.contains('theme-ds')) {
            themeColor = '#ececec'; // Nintendo DS Top Header
            navColor = '#f8f8f8';   // Nintendo DS Bottom Bar
        } else {
            // ThÃ¨me Default : header blanc solide
            themeColor = '#ffffff';
            navColor = '#ffffff';
        }
    }

    if (statusBarMeta) statusBarMeta.setAttribute('content', themeColor);
    if (navBarMeta) navBarMeta.setAttribute('content', navColor);
    if (colorSchemeMeta) {
        colorSchemeMeta.setAttribute('content', isDark ? 'dark' : 'light');
    }
}


// activeOverlay and closeAllOverlays moved to mmg-ui-controls.js


/**
 * RÃ©cupÃ¨re le chemin de l'image pour un Ã©lÃ©ment, en choisissant la taille appropriÃ©e.
 * @param {object} item - L'objet de l'Ã©lÃ©ment (titre, album, etc.).
 * @param {'thumb' | 'full'} size - La taille de l'image souhaitÃ©e ('thumb' pour la vignette, 'full' pour la taille rÃ©elle).
 * @returns {string} Le chemin de l'image.
 */
function getCorrectImagePath(item, size = 'thumb') {
    if (!item?.image) return 'https://placehold.co/200x120/9E9E9E/FFFFFF?text=No+Image';

    const cacheKey = `${item.id}:${size}`;
    if (_imagePathCache.has(cacheKey)) return _imagePathCache.get(cacheKey);

    let result = item.image;
    if (size === 'thumb') {
        const originalPath = item.image;
        const pathParts = originalPath.split('/');
        if (pathParts.length > 1) {
            const originalFilename = pathParts.pop(); // "Pochette-XYZ.webp"
            const basePath = pathParts.join('/');     // "assets/pochettes"
            const filenameParts = originalFilename.split('.');
            if (filenameParts.length > 1) {
                const name = filenameParts.slice(0, -1).join('.'); // "Pochette-XYZ"
                result = `${basePath}/thumb/${name}_thumb.webp`;
            }
        }
    }

    _imagePathCache.set(cacheKey, result);
    return result;
}

// Vider si on recharge les données :
function clearImageCache() { _imagePathCache.clear(); }

// NOUVEAU: Gère l'affichage de la liste des vidéos et des onglets (Clips / Making-ofs)
function renderVideoList(albumId, activeTab = 'clips') {
    const activeProfile = getActiveProfile();
    const profileContent = siteData.contentData[activeProfile];
    const albumTitle = profileContent.albums[albumId]?.title || getTranslation('videos');
    document.getElementById('video-list-title').textContent = `${albumTitle} (${getTranslation('videos')})`;

    // Configuration des onglets glissants
    const container = document.getElementById('video-tabs-container');
    if (container) {
        container.dataset.currentAlbumId = albumId; // Update current album ID

        container.querySelectorAll('.playlist-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === activeTab);
        });
        requestAnimationFrame(() => updateSlidingIndicator(container));

        if (!container.dataset.bound) {
            container.dataset.bound = 'true';
            container.querySelectorAll('.playlist-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    playAudio(sounds.select);
                    const currentAlbumId = container.dataset.currentAlbumId;
                    renderVideoList(currentAlbumId, btn.dataset.tab);
                    if (currentViewContext && currentViewContext.type === 'video-list') {
                        currentViewContext.tab = btn.dataset.tab;
                    }
                });
            });
        }
    }

    // Filtrer les vidéos en fonction de l'onglet actif
    let albumVideos = {};
    if (activeTab === 'clips') {
        albumVideos = Object.fromEntries(Object.entries(profileContent.videos).filter(([id, v]) => {
            const isLocked = v.isUnlockable && !unlockedDreamSeasonTracks.includes(id);
            return v.albumId === albumId && !isLocked;
        }));
    } else if (activeTab === 'making-ofs') {
        albumVideos = Object.fromEntries(Object.entries(profileContent.bonus).filter(([id, v]) => {
            const isLocked = v.isUnlockable && !unlockedDreamSeasonTracks.includes(id);
            return v.albumId === albumId && !isLocked;
        }));
    }

    renderCards('video-list-cards', albumVideos, 'video');
}
function renderCards(containerId, cardsData, cardType = 'generic', animate = true) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.style.display = '';
    container.style.alignItems = '';
    container.style.justifyContent = '';
    container.style.height = '';

    const fragment = document.createDocumentFragment();

    if (Object.keys(cardsData).length === 0) {
        const isSearchResult = containerId === 'search-results-cards';
        const header = document.querySelector(`[data-header-for="${containerId}"]`);
        if (header) {
            header.innerHTML = '';
            header.classList.add('hidden');
        }

        const isLikedEmpty = containerId === 'liked-titles-cards';
        const emptyMessageKey = (isSearchResult || isLikedEmpty) ? 'noResults' : 'workInProgress';

        container.classList.add('empty-state-centered');
        container.classList.remove('hidden');
        container.innerHTML = `<p style="font-size: 1.2em; opacity: 0.7; white-space: nowrap;">${getTranslation(emptyMessageKey)}</p>`;
        return;
    }

    container.classList.remove('empty-state-centered');

    const globalView = ViewState.current;
    const isListView = cardType === 'album' ? false : globalView === 'list';

    const activeProfile = getActiveProfile();
    const activeProfileData = siteData.contentData[activeProfile];
    const artistName = activeProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';
    const unlockedSet = new Set(unlockedDreamSeasonTracks);

    const header = document.querySelector(`[data-header-for="${containerId}"]`);
    if (header) {
        if (isListView) {
            header.classList.remove('hidden');
            header.classList.toggle('media-list-header', cardType === 'title');
            header.innerHTML = cardType === 'title' ? `
                    <div class="whitespace-nowrap">#</div>
                    <div class="whitespace-nowrap" data-lang-key="titleMusicColumn">${getTranslation('titleMusicColumn')}</div>
                    <div class="whitespace-nowrap" data-lang-key="clipColumn">${getTranslation('clipColumn')}</div>
                    <div class="whitespace-nowrap" data-lang-key="makingOfColumn">${getTranslation('makingOfColumn')}</div>
                    <div class="whitespace-nowrap" data-lang-key="genreColumn">${getTranslation('genreColumn')}</div>
                    <div class="whitespace-nowrap" data-lang-key="actionsColumn">${getTranslation('actionsColumn')}</div>` : `
                    <div class="whitespace-nowrap">#</div>
                    <div></div>
                    <div class="whitespace-nowrap" data-lang-key="titles">${getTranslation('titles')}</div>
                    <div class="tags-column whitespace-nowrap list-view-tags-col" data-lang-key="tags">${getTranslation('tags')}</div>
                    <div class="flex items-center justify-center"></div>`;
        } else {
            header.innerHTML = '';
            header.classList.add('hidden');
        }
    }

    container.classList.toggle('list-view', isListView);
    container.classList.toggle('titles-grid', !isListView);

    let delay = 0;
    const MAX_ANIM_DELAY = 0.5; // CORRECTION : cap à ~10 cartes × 0.05s
    const ellipsisIcon = window.useIcon('ellipsis');
    const lockIcon = window.useIcon('lock', 14);

    Object.entries(cardsData).forEach(([key, item], index) => {
        const itemId = item.id || key;
        const isUnlockableAlbum = cardType === 'album' && item.isUnlockableAlbum;

        let tracksInAlbum = [];
        let unlockedInAlbum = [];
        if (isUnlockableAlbum) {
            tracksInAlbum = Object.values(allSearchableItems).filter(t => t.albumId === itemId && t.isUnlockable);
            unlockedInAlbum = tracksInAlbum.filter(t => unlockedSet.has(t.id));
        }

        const isTrackLocked = item.isUnlockable && !unlockedSet.has(itemId);
        const isAlbumLocked = isUnlockableAlbum && unlockedInAlbum.length < tracksInAlbum.length;
        const isLocked = isTrackLocked || isAlbumLocked;

        if (isLocked) return;

        const isVideo = cardType === 'video' || cardType === 'bonus' ||
            (cardType === 'search' && (item.type === 'video' || item.type === 'bonus')) ||
            containerId === 'video-albums-cards';

        const card = document.createElement('div');
        card.className = `card${animate ? ' animated' : ''}${isVideo ? ' video-card' : ''}`;
        const hasGridTrackMedia = !isListView && containerId === 'media-cards' && cardType === 'title';
        if (hasGridTrackMedia) card.classList.add('has-grid-track-media');
        card.style.animationDelay = `${Math.min(delay, MAX_ANIM_DELAY)}s`;
        delay += 0.05;
        card.dataset.itemId = itemId;

        const imagePath = item.image ? getCorrectImagePath(item, 'thumb') : 'https://placehold.co/200x120/9E9E9E/FFFFFF?text=No+Image';
        const fullImagePath = getCorrectImagePath(item, 'full');
        const translatedTitle = item.langKey ? getTranslation(item.langKey) : item.title;
        const isActionable = (cardType === 'title' || cardType === 'video' || (cardType === 'search' && item.type !== 'album'));

        const tagsHtml = (item.tags && item.tags.length > 0) ? item.tags.map(t => `<span class="card-tag-clickable" data-action="filter-tag" data-tag="${t}">${t}</span>`).join(', ') : '';
        const tagsSubtitle = tagsHtml ? `<p class="card__description">${tagsHtml}</p>` : '';
        const lockIconHtml = isLocked && cardType !== 'title' && !isAlbumLocked ? ` <span class="lock-icon-inline">${lockIcon}</span>` : '';
        const cardTextHtml = `<p class="card__title" title="${translatedTitle.replace(/"/g, '&quot;')}"><span>${translatedTitle}${lockIconHtml}</span></p>${tagsSubtitle}`;
        const optionsButtonHtml = isActionable ? `<button class="card-options-badge clickable-icon card-menu-btn" data-item-id="${itemId}" title="${getTranslation('moreActions')}">${ellipsisIcon}</button>` : '';

        let datasetAttributes = '';
        if (cardType === 'title' || cardType === 'video' || cardType === 'search') {
            datasetAttributes = `data-youtube-id="${item.youtube_id}"`;
        } else if (cardType === 'album') {
            datasetAttributes = `data-album-id="${itemId}"`;
        }

        if (isListView && cardType === 'title') {
            const mobileTag = item.tags?.[0];
            const mobileTagHtml = mobileTag ? `<button type="button" class="mobile-track-tag" data-action="filter-tag" data-tag="${String(mobileTag).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" title="${getTranslation('filterByTag') || 'Filter by tag'}: ${String(mobileTag).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}">${mobileTag}</button>` : '';
            const relatedItems = (type) => {
                const linked = (item.associatedVideos || [])
                    .map(id => findItemById(id))
                    .filter(media => media && media.type === type && (!media.isUnlockable || unlockedSet.has(media.id)));
                const linkedByTrack = Object.values(activeProfileData[type === 'bonus' ? 'bonus' : 'videos'] || {})
                    .filter(media => (media.associatedTrackId === itemId || media.trackId === itemId || media.parentTrackId === itemId)
                        && (!media.isUnlockable || unlockedSet.has(media.id)));
                return [...linked, ...linkedByTrack].filter((media, i, all) => all.findIndex(other => other.id === media.id) === i);
            };
            const mediaButtons = (items, langKey) => items.length ? items.map(media => {
                const mediaLabel = String(getTranslation(langKey) || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const mediaTitle = String(media.title || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<button type="button" class="associated-media-thumb" data-associated-item-id="${media.id}"
                    title="${mediaLabel}: ${mediaTitle}" aria-label="${mediaLabel}: ${mediaTitle}">
                    <img src="${getCorrectImagePath(media, 'thumb')}" alt="" loading="lazy">
                    <span class="associated-media-label" data-lang-key="${langKey}">${getTranslation(langKey)}</span>
                </button>`;
            }).join('') : `<button type="button" class="associated-media-placeholder" title="${getTranslation(langKey)}" aria-label="${getTranslation(langKey)}"><span class="construction-icon">${getConstructionSvg()}</span><span class="associated-media-placeholder-label" data-lang-key="${langKey}">${getTranslation(langKey)}</span></button>`;
            const clips = relatedItems('video');
            const makingOfs = relatedItems('bonus');
            const lockIconHtmlList = isLocked ? `
                <div class="list-view-lock-overlay">${window.useIcon('lock', 24)}</div>
                <div class="card-price-badge list-badge"><span style="opacity: 0.7;">${window.useIcon('lock', 12)}</span>
                    ${isAlbumLocked ? (item.cost || (tracksInAlbum.length * COIN_COST_UNLOCK)) : COIN_COST_UNLOCK} ${COIN_SVG}
                </div>` : '';

            card.innerHTML = `
                <div class="list-view-index-container">
                    <span class="list-view-index text-sub-text-color text-sm">${index + 1}</span>
                </div>
                <div class="media-track-info">
                    <div class="list-view-image-container">
                        <img src="${imagePath}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fullImagePath}'" alt="Pochette de ${translatedTitle}" class="list-view-item-image"/>
                        <div class="list-view-equalizer" aria-hidden="true"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>
                        ${lockIconHtmlList}
                    </div>
                    <div class="list-view-title">
                        <span class="font-medium text-sm sm:text-base text-text-color">${translatedTitle}</span>
                        <span class="text-xs opacity-60"><span class="track-number-mobile">#${index + 1}</span><span class="mobile-track-separator">•</span> ${artistName}</span>
                    </div>
                </div>
                ${mobileTagHtml}
                <div class="associated-media-cell" data-media-kind="clip">${mediaButtons(clips, 'videoClip')}</div>
                <div class="associated-media-cell" data-media-kind="making-of">${mediaButtons(makingOfs, 'videoMakingOf')}</div>
                <div class="tags-column text-sub-text-color text-xs items-center min-w-0 list-view-tags-col" style="display:flex;align-items:center;justify-content:flex-start;overflow:hidden;white-space:nowrap;">
                    ${(item.tags || []).map(t => `<span class="card-tag-clickable" data-action="filter-tag" data-tag="${t}">${t}</span>`).join(' · ')}
                </div>
                <div class="flex items-center justify-center actions-col">
                    <button class="card-menu-btn clickable-icon" data-item-id="${itemId}" title="${getTranslation('moreActions')}">${ellipsisIcon}</button>
                </div>`;
        } else if (isListView && (cardType === 'video' || cardType === 'bonus' || cardType === 'search')) {
            const lockIconHtmlList = isLocked ? `
                <div class="list-view-lock-overlay">${window.useIcon('lock', 24)}</div>
                <div class="card-price-badge list-badge">
                    <span style="opacity: 0.7;">${window.useIcon('lock', 12)}</span> 
                    ${isAlbumLocked ? (item.cost || (tracksInAlbum.length * COIN_COST_UNLOCK)) : COIN_COST_UNLOCK} ${COIN_SVG}
                </div>` : '';

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
                <div class="list-view-title" style="display: flex; flex-direction: column; justify-content: center;">
                    <span class="font-medium text-sm sm:text-base text-text-color">${translatedTitle}</span>
                    <span class="text-xs opacity-60">${isLocked ? getTranslation('buyToUnlock') : artistName}</span>
                    ${isAlbumLocked ? `
                        <span class="list-view-unlock-text">
                            ${getTranslation(unlockedInAlbum.length > 1 ? 'trackToUnlock_many' : 'trackToUnlock_one', { count: tracksInAlbum.length - unlockedInAlbum.length })}
                        </span>
                    ` : ''}
                </div> 
                <div class="tags-column text-sub-text-color text-xs items-center min-w-0 list-view-tags-col pc-only" style="display: flex; align-items: center; justify-content: flex-start; overflow: hidden; white-space: nowrap;">
                    ${(item.tags && item.tags.length > 0) ? item.tags.map(t => `<span class="card-tag-clickable" data-action="filter-tag" data-tag="${t}">${t}</span>`).join(' \u2022 ') : ''}
                </div>
                <div class="flex items-center justify-center actions-col">
                    <button class="card-menu-btn clickable-icon" data-item-id="${itemId}" title="${getTranslation('moreActions')}">
                        ${ellipsisIcon}
                    </button>
                </div>`;
        } else {
            const badgeHtml = item.loopable ? `<div class="card__badge">LOOP ME!</div>` : '';
            const missingTrackMedia = containerId === 'media-cards' && cardType === 'title'
                ? getMissingTrackMediaKinds(item, activeProfileData, unlockedSet)
                : [];
            const missingTrackMediaHtml = missingTrackMedia.length ? `<div class="track-missing-media">${missingTrackMedia.map(langKey => `
                <button type="button" class="track-missing-media-item" title="${getTranslation(langKey)}" aria-label="${getTranslation(langKey)}"><span class="construction-icon">${getConstructionSvg()}</span><span data-lang-key="${langKey}">${getTranslation(langKey)}</span></button>
            `).join('')}</div>` : '';
            const gridTrackMediaHtml = hasGridTrackMedia ? ['video', 'bonus'].map(type => {
                const langKey = type === 'video' ? 'videoClip' : 'videoMakingOf';
                const related = [
                    ...(item.associatedVideos || []).map(findItemById).filter(media => media?.type === type),
                    ...Object.values(activeProfileData[type === 'bonus' ? 'bonus' : 'videos'] || {})
                        .filter(media => media.associatedTrackId === itemId || media.trackId === itemId || media.parentTrackId === itemId)
                ].filter((media, index, all) => media && (!media.isUnlockable || unlockedSet.has(media.id))
                    && all.findIndex(other => other?.id === media.id) === index);
                const media = related[0];
                const mediaVisual = media
                    ? `<button type="button" class="associated-media-thumb grid-track-media-thumb" data-associated-item-id="${media.id}" title="${getTranslation(langKey)}: ${media.title || ''}" aria-label="${getTranslation(langKey)}: ${media.title || ''}"><img src="${getCorrectImagePath(media, 'thumb')}" alt="" loading="lazy"></button>`
                    : `<span class="grid-track-media-placeholder" aria-hidden="true">${getConstructionSvg()}</span>`;
                return `<div class="grid-track-media-row" data-media-kind="${type}">${mediaVisual}<span class="grid-track-media-label" data-lang-key="${langKey}">${getTranslation(langKey)}</span></div>`;
            }).join('') : '';
            let description = getTranslation('viewContent');
            switch (cardType) {
                case 'title':
                    description = translations[currentLang]?.trackDescriptions?.[itemId] || getTranslation('listenToTitle');
                    break;
                case 'album':
                    if (isUnlockableAlbum) {
                        const lockedCount = tracksInAlbum.length - unlockedInAlbum.length;
                        if (lockedCount > 0) {
                            card.classList.add('has-unlockable-text');
                            description = getTranslation(lockedCount === 1 ? 'trackToUnlock_one' : 'trackToUnlock_many', { count: lockedCount });
                        } else description = '';
                    } else description = '';
                    break;
                case 'video':
                    const vAlbum = item.albumId && activeProfileData?.albums?.[item.albumId];
                    description = vAlbum ? vAlbum.title : getTranslation('videoLabel');
                    break;
                case 'bonus': description = getTranslation('videoMakingOf'); break;
                case 'search':
                    if (item.type === 'album') description = '';
                    else if (item.year) description = getTranslation('musicTitle');
                    else if (item.type === 'bonus') description = getTranslation('videoMakingOf');
                    else description = getTranslation('videoLabel');
                    break;
            }

            let lockOverlayHtml = '';
            if (isTrackLocked) {
                lockOverlayHtml = `<div class="card-price-badge"><span>${window.useIcon('lock', 12)}</span> ${COIN_COST_UNLOCK} ${COIN_SVG}</div>`;
            } else if (isAlbumLocked) {
                datasetAttributes = `data-unlock-album="${itemId}"`;
                const albumCost = item.cost || (tracksInAlbum.length * COIN_COST_UNLOCK);
                lockOverlayHtml = `<div class="card-price-badge"><span>${window.useIcon('lock', 12)}</span> ${albumCost} ${COIN_SVG}</div>`;
            }

            const videoPlayOverlayHtml = (isVideo && !isLocked) ? `<div class="video-play-overlay"><div class="video-play-badge"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18.7 3H5.3C4 3 3 4 3 5.3v13.4C3 20 4 21 5.3 21h13.4c1.3 0 2.3-1 2.3-2.3V5.3C21 4 20 3 18.7 3m.8 15.7c0 .4-.4.8-.8.8H5.3c-.4 0-.8-.4-.8-.8V5.3c0-.4.4-.8.8-.8h13.4c.4 0 .8.4.8.8zM10 15l5-3l-5-3z"/></svg></div></div>` : '';

            card.innerHTML = `
                <a href="#" class="card-link-wrapper" ${datasetAttributes}>
                    <div class="card-image-container">
                        ${badgeHtml}
                        <img class="card__image" loading="lazy" decoding="async" src="${imagePath}" onerror="this.onerror=null;this.src='${fullImagePath}'" alt="${translatedTitle.replace(/"/g, '&quot;')}">
                        ${videoPlayOverlayHtml}
                        ${!isLocked ? optionsButtonHtml : ''}
                        ${lockOverlayHtml}
                    </div>
                </a>
                <div class="card-info-container">
                    <div class="card__text">
                        <p class="card__title" title="${translatedTitle.replace(/"/g, '&quot;')}"><span>${translatedTitle}</span></p>
                        ${gridTrackMediaHtml ? '' : (tagsSubtitle || `<p class="card__description">${description}</p>`)}
                    </div>
                    ${gridTrackMediaHtml || missingTrackMediaHtml}
                </div>`;
        }

        // Contextmenu, appui long et bouton menu : dÃ©lÃ©guÃ©s au conteneur (voir aprÃ¨s le forEach).

        fragment.appendChild(card);
    });

    container.appendChild(fragment); // Insertion unique et optimisÃ©e dans le DOM.

    // â”€â”€â”€ DÃ‰LÃ‰GATION D'Ã‰VÃ‰NEMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Un seul Ã©couteur par conteneur remplace N Ã©couteurs par carte.
    // AbortController permet de nettoyer proprement les anciens Ã©couteurs Ã  chaque re-render.
    if (container._delegationController) container._delegationController.abort();
    container._delegationController = new AbortController();
    const { signal: _sig } = container._delegationController;

    container.addEventListener('click', (e) => {
        if (!e.target.closest('.associated-media-placeholder, .track-missing-media-item')) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        playAudio(sounds.blocked);
    }, { signal: _sig, capture: true });

    // --- Clic en mode LISTE ---
    if (isListView) {
        container.addEventListener('click', (e) => {
            if (e.target.closest('.associated-media-thumb[data-associated-item-id]')) {
                e.preventDefault();
                return;
            }
            const card = e.target.closest('.card[data-item-id]');
            if (!card) return;
            const itemId = card.dataset.itemId;
            const item = findItemById(itemId);
            if (!item) return;

            const menuBtn = e.target.closest('.card-menu-btn');
            const filterAction = e.target.closest('[data-action="filter-tag"]');
            let isUnlockedNow = false;
            const isStillLocked = item.isUnlockable && !unlockedDreamSeasonTracks.includes(item.id);

            if (isStillLocked && !menuBtn && !filterAction) {
                if (userCoins >= COIN_COST_UNLOCK) {
                    userCoins -= COIN_COST_UNLOCK;
                    unlockedDreamSeasonTracks.push(item.id);
                    safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
                    safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));
                    showDialog(`${getTranslation('youUnlocked')} "${item.title}"!`);
                    playAudio(sounds.coin);
                    updateCoinDisplay();
                    unlockCardUI(item.id);
                    renderUpdateLog();
                    updateNotificationDot();
                    isUnlockedNow = true;
                } else {
                    showDialog(getTranslation('needCoinsToUnlock', { COIN_COST_UNLOCK }));
                    playAudio(sounds.blocked);
                    return;
                }
            }

            if (menuBtn) {
                e.stopPropagation();
                openCardMenu(e, itemId);
            } else if (filterAction) {
                e.stopPropagation();
                const tag = filterAction.dataset.tag.toLowerCase();
                UI.searchInput.value = '';
                document.querySelectorAll('#tags-filter-list input').forEach(cb => cb.checked = false);
                const tagCheckbox = document.querySelector(`#tags-filter-list input[value="${tag}"]`);
                if (tagCheckbox) tagCheckbox.checked = true;
                updateVisibleCards(null, true, tagCheckbox ? null : tag);
            } else {
                playAudio(sounds.select);
                renderMusicTitleDetails(item);
                currentViewContext = { type: 'music-details', data: item.id };
            }
        }, { signal: _sig });
    }

    // --- Bouton menu 3-points (grille) ---
    container.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('.card-menu-btn');
        if (!menuBtn) return;
        const card = menuBtn.closest('.card[data-item-id]') || menuBtn;
        const itemId = menuBtn.dataset.itemId || card.dataset.itemId;
        if (!itemId) return;
        e.preventDefault();
        e.stopPropagation();
        openCardMenu(e, itemId);
    }, { signal: _sig });

    // --- Clic droit (ordinateur) ---
    container.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.card[data-item-id]');
        if (!card || !card.querySelector('.card-menu-btn')) return; // ignorer albums non-actionnables
        e.preventDefault();
        playAudio(sounds.select);
        openCardMenu(e, card.dataset.itemId);
    }, { signal: _sig });

    // --- Appui long (mobile) ---
    let _lpTimer = null, _lpSX = 0, _lpSY = 0;
    container.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.card[data-item-id]');
        if (!card || !card.querySelector('.card-menu-btn')) return;
        _lpSX = e.touches[0].clientX;
        _lpSY = e.touches[0].clientY;
        _lpTimer = setTimeout(() => { _lpTimer = null; openCardMenu(e, card.dataset.itemId); }, 500);
    }, { signal: _sig, passive: true });

    const _clearLP = () => { if (_lpTimer) { clearTimeout(_lpTimer); _lpTimer = null; } };
    container.addEventListener('touchend', _clearLP, { signal: _sig, passive: true });
    container.addEventListener('touchcancel', _clearLP, { signal: _sig, passive: true });
    container.addEventListener('touchmove', (e) => {
        if (!_lpTimer) return;
        if (Math.abs(e.touches[0].clientX - _lpSX) > 10 || Math.abs(e.touches[0].clientY - _lpSY) > 10) _clearLP();
    }, { signal: _sig, passive: true });
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    // CORRECTION: La logique de dÃ©filement est maintenant unifiÃ©e et appelÃ©e pour TOUTES les vues (grille et liste)
    // directement depuis renderCards, ce qui garantit son application Ã  chaque fois que des cartes sont affichÃ©es.
    if (isListView) {
        // En mode liste, on cible les <span> Ã  l'intÃ©rieur des colonnes qui peuvent dÃ©border.
        const listSelectors = `#${containerId} .list-view-title > span, #${containerId} .list-view-artist-col > span`;
        TitleScroller.observe(listSelectors);
    } else {
        // En mode grille, on cible les <span> Ã  l'intÃ©rieur des titres de carte standards.
        const gridSelector = `#${containerId} .card__title > span`;
        TitleScroller.observe(gridSelector);
    }
}

// NOUVEAU: Gestion du menu contextuel unifiÃ©

// activeCardMenu moved to mmg-ui-controls.js



// Card menu and sharing functions moved to mmg-ui-controls.js


function syncMobileDetailsTitleOrder() {
    const section = document.getElementById('media-details-section');
    const titleWrapper = section?.querySelector('.details-title-wrapper');
    const titleRow = section?.querySelector('.details-title-row');
    const shareButton = section?.querySelector('#details-share-btn');
    const detailsGrid = section?.querySelector('.music-details-grid');
    const infoPanel = section?.querySelector('.music-info-panel');
    const mediaInfos = section?.querySelector('.media-infos');
    const metadataRow = section?.querySelector('.details-metadata-row');
    const streamingRow = section?.querySelector('.details-streaming-row');
    if (!titleWrapper || !titleRow || !shareButton || !detailsGrid || !infoPanel || !mediaInfos || !metadataRow || !streamingRow) return;

    if (window.innerWidth <= 952) {
        metadataRow.insertBefore(titleWrapper, metadataRow.firstChild);
        streamingRow.appendChild(shareButton);
    } else {
        infoPanel.insertBefore(titleWrapper, mediaInfos);
        const activeType = section.dataset.activeDetailsType;
        if (activeType === 'video' || activeType === 'bonus') streamingRow.appendChild(shareButton);
        else titleRow.appendChild(shareButton);
    }
}

function syncDetailsTitleScrolling() {
    const title = document.getElementById('details-title');
    const container = title?.closest('.details-title-scroll-container');
    if (!title || !container) return;

    title.classList.remove('is-scrolling');
    title.style.removeProperty('--scroll-dist');
    title.style.removeProperty('--scroll-duration');
    title.style.whiteSpace = 'nowrap';

    const overflow = title.scrollWidth - container.clientWidth;
    if (overflow > 1) {
        title.style.textAlign = 'left';
        title.style.setProperty('--scroll-dist', `-${overflow + 30}px`);
        title.style.setProperty('--scroll-duration', `${Math.max(5, Math.min(20, overflow / 50))}s`);
        title.classList.add('is-scrolling');
    } else {
        title.style.removeProperty('white-space');
        title.style.removeProperty('text-align');
    }
}

function renderMusicTitleDetails(item, shouldPlay = false, isAutoTransition = false, sourceName = "", skipPlayback = false) {
    const isVideo = item.type === 'video' || item.type === 'bonus';

    // 1. REVERSION: Toujours utiliser la même section pour éviter de déplacer l'iframe YouTube (ce qui cause l'erreur de lecture)
    const targetSectionId = 'media-details-section';
    const targetSection = document.getElementById(targetSectionId);
    // On marque le type actuel pour la gestion de la navigation/header
    targetSection.dataset.activeDetailsType = item.type;
    syncMobileDetailsTitleOrder();

    // Gestion du Cinema Mode (YouTube style) pour les clips principaux
    const detailsGrid = targetSection.querySelector('.music-details-grid');
    if (detailsGrid) {
        if (item.type === 'video') {
            detailsGrid.classList.add('cinema-mode');
        } else {
            detailsGrid.classList.remove('cinema-mode');
        }
    }

    // On s'assure que le contenu partagé est bien visible
    const sharedContent = document.getElementById('details-shared-content');
    if (sharedContent) sharedContent.style.display = 'block';

    // Mise à jour de UI.detailsSection et de l'ID courant
    UI.detailsSection = targetSection;
    UI.detailsSection.dataset.currentItemId = item.id;

    const activeProfile = getActiveProfile();
    const itemProfile = item.profile || activeProfile;
    const detailsArtist = document.getElementById('details-artist');
    if (detailsArtist) {
        detailsArtist.textContent = itemProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';
        detailsArtist.dataset.profile = itemProfile;
    }
    const album = item.albumId ? siteData.contentData[itemProfile].albums[item.albumId] : null;

    // 2. Mise à jour de l'UI (Titres, Labels, Boutons)
    const detailsTitle = document.getElementById('details-title');
    if (detailsTitle) {
        detailsTitle.textContent = item.title;
        setTimeout(syncDetailsTitleScrolling, 600);
    }

    const inspirationsTitle = targetSection.querySelector('.details-inspirations-section > .metadata-label');
    if (inspirationsTitle) {
        const labelKey = isVideo ? 'videoDescription' : 'inspirations';
        inspirationsTitle.textContent = getTranslation(labelKey);
        inspirationsTitle.setAttribute('data-lang-key', labelKey);
    }

    // On stocke le type pour le CSS
    targetSection.setAttribute('data-details-type', isVideo ? 'video' : 'title');

    const associatedTitle = document.querySelector('.associated-videos-panel .metadata-label');
    if (associatedTitle) {
        associatedTitle.textContent = getTranslation('associatedContent');
        associatedTitle.setAttribute('data-lang-key', 'associatedContent');
    }

    // 3. Gestion des Pills (Métadonnées)
    const albumSpan = document.getElementById('details-album');
    const yearSpan = document.getElementById('details-year');
    const parentTrackLink = document.getElementById('details-parent-track-link');

    // On montre Album et Année pour tout le monde (Musique et Vidéos)
    albumSpan.parentElement.style.display = 'inline-flex';
    yearSpan.parentElement.style.display = 'inline-flex';
    parentTrackLink.style.display = 'none';

    albumSpan.textContent = album ? album.title : getTranslation('unknown');
    albumSpan.parentElement.dataset.albumId = item.albumId;
    albumSpan.parentElement.dataset.itemType = item.type; // Stocke le type (title, video, bonus)

    yearSpan.textContent = item.year || getTranslation('unknown');
    yearSpan.parentElement.dataset.year = item.year || '';
    yearSpan.parentElement.dataset.itemType = item.type;

    if (isVideo) {
        parentTrack = Object.values(allSearchableItems).find(t =>
            t.type === 'title' && t.associatedVideos?.includes(item.id)
        );
    }

    // 4. Description, Tags et Liens de streaming
    const description = translations[currentLang]?.trackDescriptions?.[item.id] || '';
    document.getElementById('details-description').textContent = description;

    let tagsToDisplay = item.tags || [];
    if (tagsToDisplay.length === 0 && isVideo && parentTrack) {
        tagsToDisplay = parentTrack.tags || [];
    }
    const tagsContainer = document.getElementById('details-tags');
    tagsContainer.innerHTML = '';
    tagsToDisplay.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-item';
        span.textContent = tag;
        span.setAttribute('data-action', 'filter-tag');
        span.setAttribute('data-tag', tag);
        tagsContainer.appendChild(span);
    });

    const streamingRow = targetSection.querySelector('.details-streaming-row');
    if (streamingRow) streamingRow.style.display = 'flex';

    streamingRow?.querySelectorAll(':scope > a.streaming-link').forEach(link => link.remove());
    const streamingEntries = isVideo
        ? (item.youtube_id ? [['youtube', item.youtube_id]] : [])
        : Object.entries(item.streaming || {});
    streamingEntries.forEach(([platform, id]) => {
            const config = PLATFORM_CONFIG[platform];
            if (config && id) {
                const a = document.createElement('a');
                a.href = id.startsWith('http') ? id : config.base_url + id;
                a.target = '_blank';
                a.className = 'streaming-link';
                a.dataset.platform = platform;
                a.style.setProperty('--platform-color', config.color);
                a.title = `Écouter sur ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
                a.innerHTML = config.svg;
                streamingRow?.appendChild(a);
            }
    });
    streamingRow?.appendChild(document.getElementById('details-share-btn'));

    // 5. Contenu associé et File d'attente
    renderAssociatedContent(item);
    updatePlayerPlaylistButtonUI(item.id);

    // 6. Affichage de la section
    showSection(targetSectionId);

    // 7. Si on demande d'ignorer la logique de lecture (déjà gérée par l'appelant)
    if (skipPlayback) return;

    // 8. GESTION DE LA LECTURE
    const coverOverlay = document.getElementById('details-cover-overlay');
    const coverImage = document.getElementById('details-cover-image');
    const movablePlayer = document.getElementById('movable-player-container');
    const isAlreadyPlaying = currentPlayingItem && currentPlayingItem.id === item.id;

    if (shouldPlay || isAlreadyPlaying) {
        // CAS 1 : On veut jouer ce titre OU il joue dÃ©jÃ  -> On montre le lecteur
        if (coverOverlay) coverOverlay.classList.add('hidden');
        if (movablePlayer) movablePlayer.style.visibility = 'visible';

        if (!isAlreadyPlaying) {
            loadAndPlayVideo(item, false, false, !shouldPlay);
        }
    } else {
        // CAS 2 : Navigation pure (Navigation manuelle ou transition aprÃ¨s fin de morceau)

        // Est-ce qu'un morceau est déjà en cours de lecture ACTIVE ?
        // On ne veut pas couper la musique si l'utilisateur browse juste un autre titre.
        const isPlaying = activePlayer && typeof activePlayer.getPlayerState === 'function' &&
            (activePlayer.getPlayerState() === YT.PlayerState.PLAYING || activePlayer.getPlayerState() === YT.PlayerState.BUFFERING);

        // NOUVEAU: Si c'est une vidéo, on force l'affichage du player car on vient pour la regarder.
        if (!isPlaying || isAutoTransition) {
            // Si rien ne joue, OU si c'est une transition automatique entre deux morceaux, on pré-charge (cue).
            if (coverOverlay) coverOverlay.classList.add('hidden');
            if (movablePlayer) movablePlayer.style.visibility = 'visible';

            if (!isAlreadyPlaying) {
                loadAndPlayVideo(item, false, false, true); // true = cueOnly
            }
        } else {
            // Si un morceau joue déjà et qu'on browse juste un autre titre, on montre l'overlay trompe-l'œil
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
}

function renderAssociatedContent(currentItem) {
    const container = document.getElementById('associated-videos-container');
    if (!container) return;
    container.innerHTML = '';

    const activeProfile = getActiveProfile();
    const profileData = siteData.contentData[activeProfile];

    const createGhostCard = (labelKey) => `
        <div class="associated-video-card card-link-wrapper ghost-card">
            <div class="ghost-image-placeholder">${getConstructionSvg()}</div>
            <p>${getTranslation(labelKey)}</p>
        </div>
    `;

    const createRealCard = (item, label) => `
        <div class="associated-video-card card-link-wrapper" 
             data-youtube-id="${item.youtube_id}" 
             data-item-id="${item.id}">
            <div class="associated-video-thumb-box">
                <img src="${getCorrectImagePath(item, 'thumb')}" 
                     alt="${label}" 
                     onerror="this.onerror=null;this.src='https://placehold.co/100x56/000/fff?text=Error';">
                <div class="video-play-badge-mini">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18.7 3H5.3C4 3 3 4 3 5.3v13.4C3 20 4 21 5.3 21h13.4c1.3 0 2.3-1 2.3-2.3V5.3C21 4 20 3 18.7 3m.8 15.7c0 .4-.4.8-.8.8H5.3c-.4 0-.8-.4-.8-.8V5.3c0-.4.4-.8.8-.8h13.4c.4 0 .8.4.8.8zM10 15l5-3l-5-3z"/></svg>
                </div>
            </div>
            <p>${label}</p>
        </div>
    `;

    let parentTrack = null;
    if (currentItem.type === 'title') {
        parentTrack = currentItem;
    } else {
        parentTrack = Object.values(allSearchableItems).find(t =>
            t.type === 'title' && t.associatedVideos?.includes(currentItem.id)
        );
    }

    if (!parentTrack) {
        container.innerHTML = `<p style="opacity:0.5; font-size:0.8rem;">Aucun contenu lié.</p>`;
        return;
    }

    let clipVideo = null;
    let makingOfVideo = null;

    if (parentTrack.associatedVideos) {
        parentTrack.associatedVideos.forEach(vId => {
            const v = findItemById(vId);
            if (v) {
                if (profileData.videos && profileData.videos[v.id]) {
                    clipVideo = v;
                } else if (profileData.bonus && profileData.bonus[v.id]) {
                    makingOfVideo = v;
                }
            }
        });
    }

    let contentHtml = '';

    if (currentItem.type !== 'title') {
        contentHtml += createRealCard(parentTrack, getTranslation('music'));
    }

    if (!clipVideo || clipVideo.id !== currentItem.id) {
        if (clipVideo) {
            contentHtml += createRealCard(clipVideo, getTranslation('videoClip'));
        } else {
            contentHtml += createGhostCard('videoClip');
        }
    }

    if (!makingOfVideo || makingOfVideo.id !== currentItem.id) {
        if (makingOfVideo) {
            contentHtml += createRealCard(makingOfVideo, getTranslation('videoMakingOf'));
        } else {
            contentHtml += createGhostCard('videoMakingOf');
        }
    }

    container.innerHTML = contentHtml;
}

function getConstructionSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-construction-icon lucide-construction"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>`;
}

function getMissingTrackMediaKinds(track, profileData, unlockedSet) {
    const related = { video: [], bonus: [] };
    (track.associatedVideos || []).forEach(id => {
        const media = findItemById(id);
        if (media && related[media.type] && (!media.isUnlockable || unlockedSet.has(media.id))) related[media.type].push(media);
    });
    Object.entries(profileData.videos || {}).forEach(([id, media]) => {
        if ((media.associatedTrackId === track.id || media.trackId === track.id || media.parentTrackId === track.id)
            && (!media.isUnlockable || unlockedSet.has(media.id))) related.video.push({ ...media, id: media.id || id });
    });
    Object.entries(profileData.bonus || {}).forEach(([id, media]) => {
        if ((media.associatedTrackId === track.id || media.trackId === track.id || media.parentTrackId === track.id)
            && (!media.isUnlockable || unlockedSet.has(media.id))) related.bonus.push({ ...media, id: media.id || id });
    });
    return [
        ...(!related.video.length ? ['videoClip'] : []),
        ...(!related.bonus.length ? ['videoMakingOf'] : [])
    ];
}

function updateMp3PlayerInfo(item) {
    if (item && item.title) {
        // NOUVEAU: S'assure que le placeholder du thÃ¨me DS est cachÃ©
        const fullPlayer = UI.fullPlayer;
        if (fullPlayer) {
            fullPlayer.classList.remove('no-track-playing');
        }

        const desktopPlayerTitle = UI.songTitle;
        desktopPlayerTitle.innerHTML = `<span>${item.title}</span>`; // On remet le span
        TitleScroller.check(desktopPlayerTitle.querySelector('span')); // On vÃ©rifie le dÃ©bordement
        // CORRECTION: Mettre Ã  jour le lecteur mobile avec la logique de dÃ©filement
        const mobilePlayerTitle = UI.mobileTitle;
        const mobilePlayerArtist = UI.mobileArtist;
        if (mobilePlayerTitle && mobilePlayerTitle.querySelector('span')) {
            mobilePlayerTitle.querySelector('span').textContent = item.title;
            // NOUVEAU: Petit dÃ©lai pour s'assurer que le texte est bien rendu avant de mesurer
            requestAnimationFrame(() => TitleScroller.check(mobilePlayerTitle.querySelector('span')));
        }

        if (mobilePlayerArtist && mobilePlayerArtist.querySelector('span')) {
            const activeProfileData = siteData.contentData[getActiveProfile()];
            const artistName = activeProfileData === siteData.contentData['mmg-music'] ? 'Mmg Music' : 'Mmg Beats';
            mobilePlayerArtist.querySelector('span').textContent = artistName;
            requestAnimationFrame(() => TitleScroller.check(mobilePlayerArtist.querySelector('span')));
        }

        // MODIFICATION: Utiliser l'image pleine rÃ©solution pour tous les lecteurs.
        // NOUVEAU: Sur mobile, on utilise la vignette
        const imageSize = window.innerWidth <= 952 ? 'thumb' : 'full';
        const imageSrc = isMusicTitle(item)
            ? getCorrectImagePath(item, imageSize) // On charge la grande image ou la vignette selon l'appareil
            : `https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`; // Pour les vidÃ©os, on garde l'image de YT
        UI.playerCover.src = imageSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3C/svg%3E";
        UI.mobileArt.src = imageSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3C/svg%3E";
        const miniPlayerTitle = UI.miniTitle;
        const miniPlayerContext = document.getElementById('mini-player-context'); // Pour mobile
        const desktopPlayerContext = document.getElementById('desktop-player-context'); // Pour ordinateur

        if (miniPlayerTitle) {
            miniPlayerTitle.querySelector('span').textContent = item.title;
            miniPlayerTitle.parentElement.classList.remove('no-track'); // CORRECTION: Retire la classe de centrage
            TitleScroller.check(miniPlayerTitle); // CORRECTION: Applique la logique de dÃ©filement
        }

        // CORRECTION: Le mini-lecteur utilise la vignette pour un chargement plus rapide, avec un fallback vers l'image complÃ¨te.
        const miniPlayerArt = UI.miniArt;
        miniPlayerArt.src = isMusicTitle(item) ? getCorrectImagePath(item, 'thumb') : imageSrc;
        miniPlayerArt.onerror = () => { miniPlayerArt.onerror = null; miniPlayerArt.src = imageSrc; };
        // CORRECTION: Mettre Ã  jour le contexte dans le mini-lecteur avec la nouvelle logique
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
                    contextText = getTranslation('fromMyPlaylist'); // Utilise la clÃ© spÃ©cifique pour "Ma Playlist"
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
        const miniAlbumArt = UI.miniArt;
        if (miniAlbumArt) miniAlbumArt.style.opacity = '1';
        updatePlayerPlaylistButtonUI(item.id); // NOUVEAU: Mettre Ã  jour le bouton playlist du lecteur

        // NOUVEAU: S'assurer que les contrÃ´les et l'image sont visibles via classList
        const miniPlayerControls = document.getElementById('mini-player-controls');
        if (miniPlayerControls) miniPlayerControls.classList.remove('hidden');
        const miniPlayerAlbumArt = UI.miniArt;
        if (miniPlayerAlbumArt) miniPlayerAlbumArt.classList.remove('hidden');



        updateLikeButtonUI(item.id);
    }
}

// NOUVEAU: Met Ã  jour l'icÃ´ne "Ajouter Ã  la playlist" sur les lecteurs
function updatePlayerPlaylistButtonUI(itemId) {
    const desktopBtn = document.getElementById('player-add-to-playlist-btn');
    const mobileBtn = document.getElementById('mobile-player-add-to-playlist-btn');
    const buttons = [desktopBtn, mobileBtn].filter(Boolean); // Filtre les Ã©lÃ©ments non trouvÃ©s

    if (buttons.length === 0 || !currentPlayingItem || currentPlayingItem.id !== itemId) return;

    const isInPlaylist = _playlistSet.has(itemId);

    buttons.forEach(btn => {
        btn.innerHTML = isInPlaylist ? window.APP_ICONS.check : window.APP_ICONS.plus;
        btn.classList.toggle('added', isInPlaylist); // 'added' peut avoir un style spÃ©cifique (ex: couleur)
        btn.title = getTranslation(isInPlaylist ? 'removePlaylist' : 'addPlaylist');
    });
}

function resetProgressBars() {
    const fills = [dom.progressBar, dom.miniProgress, dom.mobileProgress];
    fills.forEach(el => {
        if (!el) return;
        el.style.width = '0%';
        el.style.transition = ''; // Retire toute transition inline pour un reset immédiat
    });

    const timeEls = [
        [dom.currentTime, '0:00'],
        [dom.duration, '0:00'],
        [dom.mobileCurrentTime, '0:00'],
        [dom.mobileDuration, '0:00'],
    ];
    timeEls.forEach(([el, val]) => {
        if (el && el.textContent !== val) el.textContent = val;
    });
}

function resetMiniPlayerUI() {
    // MODIFICATION: Le mini-lecteur se masque (se baisse) lorsqu'il n'y a pas de titre.
    const miniPlayer = UI.miniPlayer;

    if (miniPlayer) {
        // CORRECTION: On recache le lecteur s'il n'y a plus de titre.
        miniPlayer.classList.add('no-track-playing');
        document.body.classList.add('mobile-player-hidden');
        document.documentElement.style.setProperty('--mobile-player-height', '0px');
    }

    const fullPlayer = UI.fullPlayer;
    if (fullPlayer) {
        fullPlayer.classList.add('no-track-playing');
        fullPlayer.classList.remove('active');
    }

    // RÃ©initialisation du lecteur de bureau
    resetProgressBars();
    UI.songTitle.textContent = getTranslation('noTrackPlaying');
    UI.playerCover.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3C/svg%3E";

    // CORRECTION: RÃ©initialise le contenu du mini-lecteur mobile sans le cacher.
    const miniPlayerTitle = UI.miniTitle;
    if (miniPlayerTitle) {
        miniPlayerTitle.querySelector('span').textContent = '';
        miniPlayerTitle.parentElement.classList.add('no-track');
    }
    UI.miniArt.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45'%3E%3C/svg%3E";

    const mobilePlayerTitle = UI.mobileTitle;
    const mobilePlayerArtist = UI.mobileArtist;
    mobilePlayerTitle.querySelector('span').textContent = getTranslation('noTrackPlaying');
    mobilePlayerArtist.querySelector('span').textContent = ''; // CORRECTION: Affiche une chaÃ®ne vide au lieu de "..."
    mobilePlayerTitle.classList.remove('scrolling');
    mobilePlayerArtist.classList.remove('scrolling');

    UI.mobileArt.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3C/svg%3E";
    // Ensure buttons are in their default state
    setPlayPauseState(false);
    // NOUVEAU: Retire le surlignage de la carte
    unhighlightPlayingCard();

    // NOUVEAU: Si on ferme une vidÃ©o, on retourne Ã  la page prÃ©cÃ©dente
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

        // Utilisation du cache DOM pour Ã©viter les lookups rÃ©pÃ©titifs (1x par seconde)
        if (dom.progressBar) dom.progressBar.style.width = `${listenProgress * 100}%`;
        if (dom.currentTime) dom.currentTime.textContent = formatTime(currentTime);
        if (dom.duration) dom.duration.textContent = formatTime(duration);

        // Mobile / Mini controls
        if (dom.mobileProgress) dom.mobileProgress.style.width = `${listenProgress * 100}%`;
        if (dom.miniProgress) dom.miniProgress.style.width = `${listenProgress * 100}%`;
        if (dom.mobileCurrentTime) dom.mobileCurrentTime.textContent = formatTime(currentTime);
        if (dom.mobileDuration) dom.mobileDuration.textContent = formatTime(duration);

        if (previousListenProgress > 0) { // If there was previous progress
            const progressDifference = listenProgress - previousListenProgress;
            const seekThreshold = 2 / duration;
            if (duration > 2 && Math.abs(progressDifference) > seekThreshold) {
                seekDetectedInCurrentPlay = true;
            }
        }
        previousListenProgress = listenProgress; // Update previous progress
    }
    updateMediaPositionState(); // Crucial pour la lecture en arriÃ¨re-plan
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
        // CORRECTION: MÃªme si la section ne change pas, on remonte en haut.
        // Useful if clicking the same menu link twice.
        const contentScroller = (currentSection || nextSection)?.querySelector('.page-content');
        if (contentScroller) contentScroller.scrollTop = 0;
        return;
    }

    const animationDuration = 200; // CORRECTION: DurÃ©e de l'animation de sortie rÃ©duite Ã  200ms

    // NOUVEAU: Retire le surlignage de la carte avant de naviguer
    unhighlightPlayingCard(); // Remove highlight before navigating

    // CORRECTION: Logique de transition simplifiÃ©e pour Ã©viter le "saut" de layout.
    // On anime la sortie de l'ancienne section et l'entrÃ©e de la nouvelle en mÃªme temps.
    const contentScroller = nextSection.querySelector('.page-content');
    if (contentScroller) {
        contentScroller.scrollTop = 0;
        // NOUVEAU: RÃ©initialise l'Ã©tat du header (transparent) au changement de section
        const header = document.querySelector('.top-bar');
        if (header) header.classList.remove('scrolled');
    }

    if (currentSection) {
        currentSection.classList.add('hidden');
        currentSection.classList.remove('is-hiding');
    }

    nextSection.classList.remove('hidden');
    nextSection.querySelectorAll('.sliding-tabs').forEach(container => updateSlidingIndicator(container));

    if (updateHistory) {
        const currentContextStr = JSON.stringify(currentViewContext);
        const historyContextStr = history.state ? JSON.stringify(history.state.context) : null;
        const isNewSection = !history.state || history.state.section !== sectionId;
        const isNewContext = currentContextStr !== historyContextStr;

        if (isNewSection || isNewContext) {
            // Mettre Ã  jour l'entrÃ©e actuelle de l'historique avec son vrai contexte avant de la quitter
            const contextToSave = previousContext || (history.state ? history.state.context : { ...currentViewContext });
            history.replaceState({ ...history.state, context: contextToSave }, '', window.location.hash);

            // Pousser la nouvelle entrÃ©e avec le nouveau contexte
            const stateToPush = { section: sectionId, fromApp: true, context: { ...currentViewContext } };
            history.pushState(stateToPush, '', '#' + sectionId);
        } else {
            // MÃªme section et mÃªme contexte, on s'assure juste que l'Ã©tat actuel est synchronisÃ©
            history.replaceState({ ...history.state, context: { ...currentViewContext } }, '', window.location.hash);
        }
    }

    highlightPlayingCard(currentPlayingItem);

    const activeProfile = getActiveProfile();
    if (activeProfile) {
        renderSidebarNav(activeProfile, sectionId); // CORRECTION: Passe l'ID de la section active

        // CORRECTION: Déclenche l'animation du bouton de la sidebar PC dès le 1er clic !
        const activePCButton = document.querySelector(`#sidebar-main-nav .deck-key.active`);
        if (activePCButton) {
            const anims = activePCButton.querySelectorAll('animateTransform, animate');
            if (anims) anims.forEach(a => { if (a.beginElement) a.beginElement(); });
        }
    }

    // NOUVEAU: Mise à jour du surlignage de la navigation mobile (centralisé ici)
    const effectiveLink = getEffectiveNavSection(sectionId);
    document.querySelectorAll('#mobile-bottom-nav .mobile-nav-link').forEach(link => {
        const isActive = link.dataset.link === effectiveLink;
        link.classList.toggle('active', isActive);
        if (isActive) {
            const anims = link.querySelectorAll('animateTransform, animate');
            if (anims) anims.forEach(a => { if (a.beginElement) a.beginElement(); });
        }
    });
}



function updateVisibleCards(customTitle = null, animate = true, forcedTag = null) {
    const query = UI.searchInput.value.toLowerCase().trim();
    let checkedTags = Array.from(document.querySelectorAll('#tags-filter-list input:checked')).map(cb => cb.value);

    if (forcedTag && !checkedTags.includes(forcedTag)) {
        checkedTags.push(forcedTag);
    }

    // NOUVEAU: Mise Ã  jour des badges de filtre (Desktop & Mobile)
    const updateBadge = (id) => {
        const badge = document.getElementById(id);
        if (badge) {
            badge.textContent = checkedTags.length > 0 ? checkedTags.length : '';
            badge.classList.toggle('hidden', checkedTags.length === 0);
        }
    };
    updateBadge('tags-filter-count');
    updateBadge('mobile-tags-filter-count');

    // NOUVEAU: Plus de "pills" dans la barre de recherche mobile
    const mobileSearchTagsContainer = document.getElementById('mobile-search-tags-container');
    if (mobileSearchTagsContainer) {
        mobileSearchTagsContainer.innerHTML = '';
        const mobileInput = document.getElementById('mobile-search-input');
        if (mobileInput) {
            mobileInput.style.paddingLeft = ''; // Reset padding
        }
    }

    // NOUVEAU: GÃ¨re l'indicateur de filtre persistant sur mobile
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

    const filteredResults = Object.fromEntries(Object.entries(allSearchableItems).filter(([id, item]) => {
        const titleMatch = (item.title || "").toLowerCase().includes(query);
        const tagTextMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(query));
        let albumTitleMatch = false; // Check for album title match
        if (item.albumId && siteData.contentData['mmg-music'].albums[item.albumId]) {
            albumTitleMatch = siteData.contentData['mmg-music'].albums[item.albumId].title.toLowerCase().includes(query);
        }

        const itemTags = (item.tags || []).map(t => t.toLowerCase());
        const tagsMatch = checkedTags.length === 0 || checkedTags.every(tag => itemTags.includes(tag));

        // NOUVEAU: On cache les items verrouillÃ©s des rÃ©sultats de recherche hors shop
        const isLocked = item.isUnlockable && !unlockedDreamSeasonTracks.includes(id);

        return (titleMatch || tagTextMatch || albumTitleMatch) && tagsMatch && !isLocked;
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
    currentViewContext = { type: 'search', data: query }; // CORRECTION: Store query for restoration
    showSection('search-results-section', true);
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

// showDialog moved to mmg-ui-controls.js


// NOUVEAU: Affiche une banniÃ¨re Ã©lÃ©gante pour indiquer le titre suivant lors d'une transition
function showNextUpBanner(item, sourceName) {
    const banner = dom.nextUpBanner;
    const title = dom.nextUpTitle;
    const source = dom.nextUpSource;

    if (!banner || !item) return;

    title.textContent = item.title;

    // Traduction de la source si nÃ©cessaire
    let sourceText = sourceName;
    if (sourceName === 'queue') sourceText = getTranslation('fromPlaybackQueue');
    else if (sourceName === 'playlist') sourceText = getTranslation('fromMyPlaylist');

    source.textContent = sourceText || "";

    banner.classList.remove('active');
    void banner.offsetWidth; // Force reflow
    banner.classList.add('active');

    // Auto-hide aprÃ¨s 4 secondes
    setTimeout(() => {
        banner.classList.remove('active');
    }, 4000);
}

// NOUVEAU: Affiche un message dans la box custom (toast)
function showToast(message) {
    if (!dom.customDialog || !dom.dialogMessage) return;
    dom.dialogMessage.textContent = message;
    dom.customDialog.classList.remove('hidden');
    dom.customDialog.style.display = 'block'; // S'assure que le display n'est pas none
    setTimeout(() => {
        dom.customDialog.classList.add('hidden');
        setTimeout(() => { dom.customDialog.style.display = 'none'; }, 300);
    }, 3000);
}

// CORRECTION: La logique d'application des thÃ¨mes est entiÃ¨rement revue pour Ãªtre plus robuste.

// applyTheme and updateThemeColorMeta moved to mmg-ui-controls.js




// NOUVEAU: RÃ©initialise les filtres par tag.
function resetTagFilters() {
    // DÃ©coche toutes les cases de filtre de tags
    document.querySelectorAll('#tags-filter-list input:checked').forEach(cb => {
        cb.checked = false;
    });

    // Met Ã  jour les badges de compteur de filtre
    const updateBadge = (id) => {
        const badge = document.getElementById(id);
        if (badge) {
            badge.textContent = '';
            badge.classList.add('hidden');
        }
    };
    updateBadge('tags-filter-count');
    updateBadge('mobile-tags-filter-count');

    // Cache le point sur l'icÃ´ne de recherche mobile
    const filterDotOnSearch = document.querySelector('.filter-dot-on-search');
    if (filterDotOnSearch) {
        filterDotOnSearch.classList.add('hidden');
    }
}

function updateViewSwitcherUI() {
    const currentView = ViewState.current;
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
        if (btn.dataset.view === 'toggle') {
            const targetView = currentView === 'grid' ? 'list' : 'grid';
            btn.innerHTML = targetView === 'list'
                ? '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><rect width="18.5" height="4.17" x="2.75" y="2.75" rx="1.5"/><rect width="18.5" height="4.16" x="2.75" y="9.92" rx="1.5"/><rect width="18.5" height="4.17" x="2.75" y="17.08" rx="1.5"/></g></svg>'
                : '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></g></svg>';
            const label = getTranslation(targetView === 'list' ? 'switchToList' : 'switchToGrid');
            btn.setAttribute('aria-label', label);
            btn.title = label;
        } else {
            btn.classList.toggle('active', btn.dataset.view === currentView);
        }
    });
}

function refreshCurrentView() {
    const visibleSection = document.querySelector('.page-section:not(.hidden)');
    if (visibleSection) {
        handleMenuNavigation(visibleSection.id, false, { ...currentViewContext });
    }
}

// CORRECTION: DÃ©finition de la fonction manquante

// applyInitialTheme moved to mmg-ui-controls.js


function resetToHome(playSelectSound = true) {
    if (playSelectSound) playAudio(sounds.select);
    handleMenuNavigation('home-dashboard-section');
}

function renderSidebarNav(activeProfile, currentSectionId = null) {
    const navContainer = document.getElementById('sidebar-main-nav');
    if (!navContainer) return;

    if (!currentSectionId) {
        currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id || 'home-dashboard-section';
    }

    const effectiveSectionId = getEffectiveNavSection(currentSectionId);

    // Récupération des données de navigation depuis siteData
    const profileData = Object.values(siteData.projectData[activeProfile] || {}).filter(item => item && item.link);
    const otherProfileItems = profileData.filter(item => item.langKey !== 'about');

    const profileLinks = otherProfileItems.map(item => {
        const isActive = item.link === effectiveSectionId;
        const iconName = SIDEBAR_ICON_MAP[item.langKey] || SIDEBAR_ICON_MAP.default;
        const iconMarkup = item.langKey === 'contents'
            ? '<span class="contents-nav-logo" aria-hidden="true"></span>'
            : window.useIcon(iconName, 24);
        return `
                <button class="deck-key ${isActive ? 'active' : ''}" data-link="${item.link}" ${item.langKey === 'contents' ? 'onclick="openContentsPage()"' : ''}>
                    ${iconMarkup}
                    <span class="deck-button-label" data-lang-key="${item.langKey}">${getTranslation(item.langKey) || item.title}</span>
                </button>`;
    }).join('');

    // Création du lien Accueil
    const homeIsActive = effectiveSectionId === 'home-dashboard-section';
    const homeLink = `
            <button class="deck-key ${homeIsActive ? 'active' : ''}" data-link="home-dashboard-section">
                ${window.useIcon(SIDEBAR_ICON_MAP.home, 24)}
                <span class="deck-button-label" data-lang-key="home">${getTranslation('home')}</span>
            </button>`;

    // Création des liens statiques (Bibliothèque, Boutique)
    const libraryIsActive = effectiveSectionId === 'library-section';
    const libraryLink = `
            <button class="deck-key ${libraryIsActive ? 'active' : ''}" data-link="library-section">
                ${window.useIcon(SIDEBAR_ICON_MAP.library, 24)}
                <span class="deck-button-label" data-lang-key="library">${getTranslation('library')}</span>
            </button>`;

    const shopIsActive = effectiveSectionId === 'shop-section';
    const shopLink = `
            <button class="deck-key ${shopIsActive ? 'active' : ''}" data-link="shop-section">
                ${window.useIcon(SIDEBAR_ICON_MAP.shop, 24)}
                <span class="deck-button-label" data-lang-key="shop">${getTranslation('shop')}</span>
            </button>`;

    // Assemblage final
    navContainer.innerHTML = homeLink + profileLinks + shopLink + libraryLink;

    renderSidebarBranding(activeProfile);
}

function setVolume(volume, fromUI = false) {
    currentVolume = Math.max(0, Math.min(100, volume));
    // CORRECTION: Ajout de l'ID #volume-level-display pour le lecteur mobile
    document.querySelectorAll('.volume-level-display, #volume-level-display').forEach(el => el.textContent = currentVolume);

    const volumeFraction = currentVolume / 100;
    if (mediumPlayer?.setVolume) mediumPlayer.setVolume(currentVolume);

    Object.values(sounds).forEach(sound => { if (sound) sound.volume = volumeFraction; }); // Set volume for all sounds

    if (fromUI) playAudio(sounds.select);
}

const TitleScroller = {
    _io: null,
    _ro: null,
    _observed: new Set(),

    init() {
        const root = document.querySelector('.content-section-board');
        this._io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const span = entry.target;
                if (entry.isIntersecting) this.check(span);
                else span.parentElement?.classList.remove('scrolling');
            });
        }, { root, rootMargin: '0px', threshold: 0.8 });

        this._ro = new ResizeObserver(entries => {
            entries.forEach(e => this.check(e.target));
        });
    },

    check(span) {
        const container = span.parentElement;
        if (!container) return;
        container.classList.remove('scrolling');
        requestAnimationFrame(() => {
            if (span.scrollWidth > container.clientWidth + 15) {
                const overflow = span.scrollWidth - container.clientWidth;
                const duration = Math.max(3, overflow / 40 + 1);
                container.style.setProperty('--overflow-width', `-${overflow + 10}px`);
                container.style.setProperty('--scroll-duration', `${duration}s`);
                container.classList.add('scrolling');
            }
        });
    },

    // unobserve tout avant d'observer les nouveaux pour Ã©viter les fuites mÃ©moire
    observe(selector) {
        if (!this._io || !this._ro) return;
        this._observed.forEach(el => {
            this._io.unobserve(el);
            this._ro.unobserve(el);
        });
        this._observed.clear();

        document.querySelectorAll(selector).forEach(el => {
            this._io.observe(el);
            this._ro.observe(el);
            this._observed.add(el);
        });
    }
};

// =========================================================
// DAILY LOGIN BONUS
// =========================================================

// NOUVEAU: Fonction pour afficher la progression du bonus quotidien
function renderDailyBonusProgress() {
    const today = (typeof todayStr === 'function') ? todayStr() : new Date().toISOString().split('T')[0];
    const bonusAvailable = (typeof lastLoginDate !== 'undefined') ? (lastLoginDate !== today) : true;
    const isClaimed = !bonusAvailable;
    const streakCoins = Math.min((typeof loginStreak !== 'undefined' ? loginStreak : 1), 7);

    const sections = document.querySelectorAll('.daily-bonus-widget, .sidebar-daily-bonus-container');
    if (sections && sections.length > 0) {
        sections.forEach(section => {
        if (dailyBonusCompleted) {
            section.classList.add('hidden');
            return;
        }
        section.classList.remove('hidden');

        const isSidebar = section.classList.contains('sidebar-daily-bonus-container')
            && (window.innerWidth > 952 || section.closest('.sidebar'));

        const mobileContainerClass = isClaimed
            ? 'daily-bonus-list-item claimed'
            : 'daily-bonus-list-item active';

        const pcContainerClass = isClaimed
            ? 'bonus-sidebar-card claimed'
            : 'bonus-sidebar-card active';

        const iconHtml = window.GIFT_SVG || GIFT_SVG;
        const titleText = isClaimed
            ? getTranslation('bonusClaimed') || 'Bonus récupéré'
            : getTranslation('dailyBonusTitle');
        const coinWord = loginStreak === 1
            ? getTranslation('dailyBonusCoin')
            : getTranslation('dailyBonusCoins');
        const claimBtnText = getTranslation('claim') || 'Réclamer';
        const progressPct = Math.round((streakCoins / 7) * 100);

        // On rend le layout :
        if (isSidebar && section.id !== 'daily-bonus-section') {
            // — SIDEBAR / PC Dashboard Layout (Circular 7-segment ring around icon in Blue & Grey)
            const subtitleText = isClaimed ? '' : `+${streakCoins} ${coinWord}`;
            
            // Build 7 SVG circle segments around center icon (more separated traits)
            const ringSegmentsHtml = Array.from({length: 7}, (_, idx) => {
                const dayNum = idx + 1;
                const isActive = dayNum <= streakCoins;
                const offset = -(idx * 34.11);
                return `<circle cx="50" cy="50" r="38" 
                    fill="none" 
                    stroke-width="5.5" 
                    stroke-dasharray="21.11 217.65" 
                    stroke-dashoffset="${offset}" 
                    stroke-linecap="round"
                    transform="rotate(-90 50 50)" 
                    class="bonus-ring-segment ${isActive ? 'active' : 'inactive'}" />`;
            }).join('');

            section.innerHTML = `
                <div class="${pcContainerClass}" id="daily-bonus-card-${section.id}">
                    <p class="bonus-sidebar-label">${isClaimed ? (getTranslation('bonusClaimed') || 'BONUS RÉCUPÉRÉ') : 'DAILY BONUS'}</p>
                    
                    <div class="daily-bonus-circle-wrapper">
                        <svg class="daily-bonus-ring" viewBox="0 0 100 100">
                            ${ringSegmentsHtml}
                        </svg>
                        <div class="daily-bonus-center-icon">
                            ${iconHtml}
                        </div>
                    </div>

                    ${!isClaimed ? `
                    <button class="bonus-sidebar-btn">
                        +${streakCoins} ${coinWord}
                    </button>` : `<p class="bonus-sidebar-sub">Revenez demain !</p>`}
                </div>
            `;

        } else if (section.id === 'daily-bonus-section') {
            const inlineRingSegments = Array.from({ length: 7 }, (_, idx) => {
                const dayNum = idx + 1;
                const offset = -(idx * 34.11);
                return `<circle cx="50" cy="50" r="38" fill="none" stroke-width="5.5" stroke-dasharray="21.11 217.65" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 50 50)" class="bonus-ring-segment ${dayNum <= streakCoins ? 'active' : 'inactive'}" />`;
            }).join('');
            section.innerHTML = `
                <div class="daily-bonus-list-item ${isClaimed ? 'claimed' : 'active'}" id="daily-bonus-card-${section.id}">
                    <div class="reco-image-container daily-bonus-gift-circle">
                        <svg class="daily-bonus-inline-ring" viewBox="0 0 100 100" aria-hidden="true">${inlineRingSegments}</svg>
                        <span class="daily-bonus-gift-icon">${iconHtml}</span>
                    </div>
                    <div class="reco-info">
                        <p class="reco-title">${titleText}</p>
                    </div>
                    ${!isClaimed ? `<div class="daily-bonus-coin-reward">${COIN_SVG}<span>+${streakCoins} ${coinWord}</span></div>` : ''}
                </div>
            `;
        } else {
            // — DASHBOARD mobile : layout horizontal existant
            const subtitleText = isClaimed ? '' : `+${streakCoins} ${coinWord}`;
            section.innerHTML = `
                <div class="${mobileContainerClass}" id="daily-bonus-card-${section.id}">
                    <div class="reco-image-container">
                        ${iconHtml}
                    </div>
                    <div class="reco-info">
                        <p class="reco-title">${titleText}</p>
                        ${!isClaimed ? `<p class="reco-subtitle">${subtitleText}</p>` : ''}
                    </div>
                    ${!isClaimed ? `
                    <div class="bonus-badge">${COIN_SVG} +${streakCoins}</div>` : ''}
                </div>
            `;
        }

        section.style.padding = '0';

        const card = document.getElementById(`daily-bonus-card-${section.id}`);
        if (card && bonusAvailable) {
            card.onclick = (e) => {
                e.preventDefault();
                if (card.classList.contains('is-animating')) return;
                card.classList.add('is-animating');

                const circleWrapper = card.querySelector('.daily-bonus-circle-wrapper') || card;
                if (!card.classList.contains('daily-bonus-line') && !card.classList.contains('daily-bonus-list-item')) {
                    circleWrapper.classList.add('animate-claim');
                }

                setTimeout(() => {
                    claimDailyBonus();
                }, card.classList.contains('daily-bonus-line') ? 600 : 400);
            };
        }
    });
    }

    // Sync topbar bonus pill (PC)
    const topbarPill = document.getElementById('topbar-bonus-pill');
    if (topbarPill) {
        if (dailyBonusCompleted) {
            topbarPill.classList.add('hidden');
        } else {
            topbarPill.classList.remove('hidden');
            topbarPill.classList.toggle('claimed', !!isClaimed);
            topbarPill.classList.toggle('ready-to-claim', !isClaimed);
            topbarPill.title = isClaimed
                ? (getTranslation('bonusClaimed') || 'Bonus récupéré')
                : `${getTranslation('dailyBonusTitle') || 'Bonus quotidien'} (+${streakCoins})`;
        }
    }

    const topbarRing = document.getElementById('topbar-bonus-ring-svg');
    if (topbarRing) {
        topbarRing.innerHTML = Array.from({length: 7}, (_, idx) => {
            const dayNum = idx + 1;
            const isActive = dayNum <= streakCoins;
            const offset = -(idx * 34.11);
            return `<circle cx="50" cy="50" r="38" 
                fill="none" 
                stroke-width="7" 
                stroke-dasharray="21.11 217.65" 
                stroke-dashoffset="${offset}" 
                stroke-linecap="round"
                transform="rotate(-90 50 50)" 
                class="bonus-ring-segment ${isActive ? 'active' : 'inactive'}" />`;
        }).join('');
    }

    const topbarCenterIcon = document.getElementById('topbar-bonus-center-icon');
    if (topbarCenterIcon) {
        topbarCenterIcon.innerHTML = window.GIFT_SVG || GIFT_SVG;
    }

    const topbarLabel = document.getElementById('topbar-bonus-label');
    if (topbarLabel) {
        topbarLabel.textContent = isClaimed
            ? (getTranslation('bonusClaimed') || 'Bonus récupéré')
            : (getTranslation('dailyBonusTitle') || 'Daily Bonus');
    }

    const topbarBadge = document.getElementById('topbar-bonus-badge');
    if (topbarBadge) {
        if (isClaimed) {
            topbarBadge.textContent = '';
            topbarBadge.style.display = 'none';
            topbarBadge.classList.add('claimed');
        } else {
            topbarBadge.style.display = '';
            topbarBadge.textContent = `+${streakCoins}`;
            topbarBadge.classList.remove('claimed');
        }
    }
}




// =========================================================

// =========================================================
// INITIALIZATION
// =========================================================
async function initializeApp() {
    document.body.style.cursor = '';

    // NOUVEAU: Initialiser les rÃ©fÃ©rences DOM pour le cache
    UI.miniPlayer = document.getElementById('mobile-mini-player');
    UI.fullPlayer = document.getElementById('mobile-full-player');
    UI.playPauseBox = document.getElementById('play-pause-box');
    UI.playerLikeBtn = document.getElementById('player-like-btn');
    UI.songTitle = document.getElementById('song-title');
    UI.playerCover = document.getElementById('player-album-cover');
    UI.mobileTitle = document.getElementById('mobile-player-title');
    UI.mobileArtist = document.getElementById('mobile-player-artist');
    UI.mobileArt = document.getElementById('mobile-player-album-art');
    UI.miniTitle = document.getElementById('mini-player-title');
    UI.miniArt = document.getElementById('mini-player-album-art');
    UI.miniProgress = document.getElementById('mini-player-progress-fill');
    UI.detailsSection = document.getElementById('media-details-section');
    UI.shopSection = document.getElementById('shop-section');
    UI.searchInput = document.getElementById('search-input');
    UI.themeSwitch = document.getElementById('theme-switch');
    dom.progressBar = document.getElementById('progress-fill');
    dom.currentTime = document.getElementById('current-time-display');
    dom.duration = document.getElementById('duration-display');
    dom.mobileProgress = document.getElementById('mobile-player-progress-fill');
    dom.miniProgress = UI.miniProgress;
    dom.mobileCurrentTime = document.getElementById('mobile-player-current-time');
    dom.mobileDuration = document.getElementById('mobile-player-duration');

    dom.mobileBottomNav = document.getElementById('mobile-bottom-nav');
    dom.dailyBonusSection = document.getElementById('daily-bonus-section');
    dom.coinCount = document.getElementById('coin-count');

    // Topbar bonus pill (PC) - click to claim or notify
    const topbarPill = document.getElementById('topbar-bonus-pill');
    if (topbarPill) {
        const handlePillAction = (e) => {
            if (e) e.preventDefault();
            const today = (typeof todayStr === 'function') ? todayStr() : new Date().toISOString().split('T')[0];
            const isAvailable = (typeof lastLoginDate !== 'undefined') ? (lastLoginDate !== today) : true;
            if (isAvailable && !dailyBonusCompleted) {
                if (topbarPill.classList.contains('is-animating')) return;
                topbarPill.classList.add('is-animating');
                const circleWrapper = topbarPill.querySelector('.topbar-bonus-circle-wrapper') || topbarPill;
                circleWrapper.classList.add('animate-claim');

                setTimeout(() => {
                    topbarPill.classList.remove('is-animating');
                    if (circleWrapper) circleWrapper.classList.remove('animate-claim');
                    if (typeof claimDailyBonus === 'function') {
                        claimDailyBonus();
                    }
                }, 400);
            } else {
                if (typeof showDialog === 'function') {
                    showDialog(getTranslation('bonusClaimed') || 'Bonus déjà récupéré aujourd\'hui ! Revenez demain.');
                }
            }
        };

        topbarPill.addEventListener('click', handlePillAction);
        topbarPill.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                handlePillAction(e);
            }
        });
    }
    dom.customDialog = document.getElementById('custom-dialog');
    dom.dialogMessage = document.querySelector('#custom-dialog p');
    dom.nextUpBanner = document.getElementById('next-up-banner');
    dom.nextUpTitle = document.getElementById('next-up-banner-title');
    dom.nextUpSource = document.getElementById('next-up-banner-source');
    dom.mobileQueuePanel = document.getElementById('mobile-queue-panel');
    dom.mobileQueueList = document.getElementById('mobile-queue-list');
    dom.artworkOverlay = document.getElementById('artwork-overlay');
    dom.artworkImg = document.getElementById('artwork-overlay-img');

    dom.playPauseBtn = document.getElementById('play-pause-btn');
    dom.miniPlayPauseBtn = document.getElementById('mini-player-play-pause-btn');
    dom.mobilePlayPauseBtn = document.getElementById('mobile-player-play-pause-btn');
    dom.prevBtn = document.getElementById('prev-video-btn');
    dom.nextBtn = document.getElementById('next-video-btn');
    dom.miniPrevBtn = document.getElementById('mini-player-prev-btn');
    dom.miniNextBtn = document.getElementById('mini-player-next-btn');
    dom.shuffleBtn = document.getElementById('shuffle-btn');
    dom.loopBtn = document.getElementById('loop-btn');
    dom.mobilePrevBtn = document.getElementById('mobile-player-prev-btn');
    dom.mobileNextBtn = document.getElementById('mobile-player-next-btn');
    dom.mobileShuffleBtn = document.getElementById('mobile-player-shuffle-btn');
    dom.mobileLoopBtn = document.getElementById('mobile-player-loop-btn');
    dom.chevronDownBtn = document.querySelector('#mobile-full-player .header-btn');

    dom.searchIconPc = document.getElementById('search-icon-pc');
    dom.searchIconMobile = document.getElementById('search-icon-mobile');
    dom.searchIconMobileInner = document.getElementById('search-icon-mobile-inner');
    dom.tagIconPc = document.querySelector('#tags-filter-btn span:first-of-type');

    // Injection spÃ©cifique pour mobile pour garder le badge intact
    const mobileTagBtn = document.getElementById('mobile-search-tag-btn');
    if (mobileTagBtn) {
        const tagSpan = document.createElement('span');
        tagSpan.id = 'mobile-tag-icon-container';
        mobileTagBtn.prepend(tagSpan); // Ajoute l'icÃ´ne AVANT le badge du compteur
        dom.tagIconMobile = tagSpan;
    }

    dom.bellIconPc = document.querySelector('#notifications-btn span');
    dom.bellIconMobile = document.querySelector('#mobile-notifications-btn span');

    // Injection initiale des icÃ´nes
    if (dom.searchIconPc) dom.searchIconPc.innerHTML = window.useIcon('search', 22);
    if (dom.searchIconMobile) dom.searchIconMobile.innerHTML = window.useIcon('search', 20);
    if (dom.searchIconMobileInner) dom.searchIconMobileInner.innerHTML = window.useIcon('search', 18);
    if (dom.tagIconPc) dom.tagIconPc.innerHTML = window.useIcon('tag', 22);
    if (dom.tagIconMobile) dom.tagIconMobile.innerHTML = window.useIcon('tag', 18);
    if (dom.bellIconPc) dom.bellIconPc.innerHTML = window.useIcon('bell', 22);
    if (dom.bellIconMobile) dom.bellIconMobile.innerHTML = window.useIcon('bell', 20);

    // Injection initiale des icÃ´nes
    [dom.playPauseBtn, dom.miniPlayPauseBtn, dom.mobilePlayPauseBtn].forEach(btn => {
        if (!btn) return;
        const isMini = btn === dom.miniPlayPauseBtn;
        if (isMini) {
            btn.innerHTML = `
                <span class="icon-play"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l12 8-12 8V4z"/></svg></span>
                <span class="icon-pause"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5v14M15 5v14"/></svg></span>
            `;
        } else {
            btn.innerHTML = `
                <span class="icon-play">${window.APP_ICONS.play}</span>
                <span class="icon-pause">${window.APP_ICONS.pause}</span>
            `;
        }
        btn.classList.add('play-pause-icon');
    });
    if (dom.prevBtn) dom.prevBtn.innerHTML = window.APP_ICONS.prev;
    if (dom.nextBtn) dom.nextBtn.innerHTML = window.APP_ICONS.next;
    // Les boutons mini-player prev/next ont Ã©tÃ© supprimÃ©s
    if (dom.shuffleBtn) dom.shuffleBtn.innerHTML = window.APP_ICONS.shuffle;
    if (dom.loopBtn) dom.loopBtn.innerHTML = window.APP_ICONS.loop;
    if (dom.mobilePrevBtn) dom.mobilePrevBtn.innerHTML = window.APP_ICONS.prev;
    if (dom.mobileNextBtn) dom.mobileNextBtn.innerHTML = window.APP_ICONS.next;
    if (dom.mobileShuffleBtn) dom.mobileShuffleBtn.innerHTML = window.APP_ICONS.shuffle;
    if (dom.mobileLoopBtn) dom.mobileLoopBtn.innerHTML = window.APP_ICONS.loop;
    if (dom.chevronDownBtn) dom.chevronDownBtn.innerHTML = window.APP_ICONS.chevronDown;

    // NOUVEAU: S'assure que le conteneur des profils a la classe pour l'indicateur
    const profileSwitch = document.querySelector('.profile-switch');
    if (profileSwitch) profileSwitch.classList.add('sliding-tabs');

    // CORRECTION: Rendre la sidebar immÃ©diatement pour Ã©viter le flash de contenu vide.
    const activeProfile = getActiveProfile(); // Get active profile
    renderSidebarNav(activeProfile);

    // NOUVEAU: Initialiser l'Ã©tat du switcher Spotimon
    const spotimonSwitch = document.getElementById('spotimon-profile-switch');
    if (spotimonSwitch) {
        spotimonSwitch.classList.toggle('is-beats', activeProfile === 'mmg-beats');
    }

    // NOUVEAU: Rendre le bonus quotidien
    renderDailyBonusProgress();

    resetMiniPlayerUI();
    setupTagFilters();
    TitleScroller.init();
    renderUpdateLog();

    // CORRECTION : La traduction complÃ¨te est appliquÃ©e ici, une fois que tout est prÃªt.
    await applyLanguage(currentLang);

    // NOUVEAU: VÃ©rifier et attribuer le bonus de connexion quotidien
    checkDailyBonus();

    // NOUVEAU: VÃ©rifier si l'application est installÃ©e pour dÃ©bloquer le thÃ¨me Android
    checkPwaUnlock();

    // NOUVEAU: Initialiser les panneaux flottants


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

    // CORRECTION : Le rendu des notifications est appelÃ© ici, aprÃ¨s que tout le reste soit prÃªt.
    renderUpdateLog();

    // NOUVEAU: Positionne tous les indicateurs au chargement
    document.querySelectorAll('.sliding-tabs').forEach(container => updateSlidingIndicator(container));
    // CORRECTION: Affiche l'invite d'installation PWA aprÃ¨s un court dÃ©lai

    // CORRECTION: Synchroniser l'apparition des barres du bas avec le contenu principal (aprÃ¨s l'intro)
    const mainContent = document.getElementById('main-content-wrapper');
    if (mainContent) {
        const observer = new MutationObserver((mutations) => {
            // DÃ¨s que l'opacitÃ© du contenu change (fin de l'intro), on affiche les barres
            if (window.getComputedStyle(mainContent).opacity > 0.1) {
                const bottomBars = document.querySelectorAll('.bottom-ui-container, .mobile-bottom-nav, .mobile-mini-player, .mobile-full-player');
                bottomBars.forEach(bar => {
                    bar.style.opacity = '1';
                });
                observer.disconnect(); // On arrÃªte d'observer une fois fait
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
            closeBtn.innerHTML = window.APP_ICONS.close;
            closeBtn.onclick = () => {
                if (window.guideManager) {
                    window.guideManager.stop();
                } else {
                    splash.classList.remove('active');
                    const overlay = document.getElementById('guide-overlay');
                    if (overlay) overlay.classList.remove('active');
                    document.body.classList.remove('tutorial-active-body');
                }
            };
            splash.appendChild(closeBtn);
            guideSplashObserver.disconnect(); // FIX: on déconnecte dès que le bouton est injecté
        }
    });
    guideSplashObserver.observe(document.body, { childList: true, subtree: true });

    // pour ne pas Ãªtre intrusive dÃ¨s le dÃ©part.
    setTimeout(showPwaInstallPrompt, 5000);

    handleMenuNavigation(sectionToLoad, false); // This will show the correct section without adding to history.

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(function (registration) {

            // NOUVEAU: Gestion des mises Ã  jour
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Une nouvelle version est disponible et installÃ©e, on notifie l'utilisateur
                        showUpdateNotification(registration);
                    }
                });
            });
        }).catch(function (err) {
            logger.error('Ã‰chec de l\'enregistrement du Service Worker:', err);
        });

        // NOUVEAU: Recharger la page quand le nouveau SW prend le contrÃ´le (mais pas Ã  la premiÃ¨re visite)
        let refreshing;
        let isFirstRegistration = !navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing || isFirstRegistration) return;
            window.location.reload();
            refreshing = true;
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

    // NOUVEAU: DÃ©clenche l'animation de flÃ¨che (Next/Prev) immÃ©diatement pour le feedback visuel
    const btn = direction === 1 ? dom.nextBtn : dom.prevBtn;
    const mBtn = direction === 1 ? dom.mobileNextBtn : dom.mobilePrevBtn;
    [btn, mBtn].forEach(b => {
        if (b) b.querySelectorAll('animateTransform').forEach(a => {
            if (a.beginElement) a.beginElement();
        });
    });

    let nextItem; // Next item to play
    let nextIndex;
    let nextItemId;
    let playbackSource = 'context'; // Par dÃ©faut, on utilise la file de contexte

    // 1. PrioritÃ© Ã  la file d'attente utilisateur (PlaybackQueue.user)
    const currentPlayingIndexInUserQueue = currentPlayingItem ? PlaybackQueue.user.indexOf(currentPlayingItem.id) : -1;

    if (currentPlayingIndexInUserQueue > -1 && PlaybackQueue.user.length > 1) {
        // Le titre actuel est dans la file utilisateur, on joue le suivant de cette file
        nextIndex = (currentPlayingIndexInUserQueue + direction + PlaybackQueue.user.length) % PlaybackQueue.user.length;
        nextItemId = PlaybackQueue.user[nextIndex];
        playbackSource = 'user';
    } else if (PlaybackQueue.user.length > 0) {
        // Le titre actuel n'est PAS dans la file utilisateur, mais la file utilisateur n'est pas vide.
        // On joue le premier titre de la file utilisateur.
        nextItemId = PlaybackQueue.user[0];
        nextIndex = 0;
        playbackSource = 'user';
    } else {
        // 2. Fallback: la file de lecture de contexte (PlaybackQueue.context)
        if (PlaybackQueue.context.length === 0 || PlaybackQueue.index === -1) {
            return;
        }
        nextIndex = (PlaybackQueue.index + direction + PlaybackQueue.context.length) % PlaybackQueue.context.length;
        nextItemId = PlaybackQueue.context[nextIndex];
    }

    const currentQueue = playbackSource === 'user' ? PlaybackQueue.user : PlaybackQueue.context;

    // Logique de lecture alÃ©atoire (s'applique Ã  la file en cours d'utilisation)
    if (isShuffleMode && forcePlay) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * currentQueue.length);
        } while (currentQueue.length > 1 && randomIndex === (playbackSource === 'user' ? currentPlayingIndexInUserQueue : PlaybackQueue.index));
        nextIndex = randomIndex;
        nextItemId = currentQueue[randomIndex];
    }

    nextItem = findItemById(nextItemId);

    if (nextItem) {
        if (promptUser) {
            // SOLUTION SIMPLE: On ferme le lecteur mobile et on va sur la page de dÃ©tails
            const mobilePlayer = UI.fullPlayer;
            if (mobilePlayer) mobilePlayer.classList.remove('active');

            // NOUVEAU: On force la mise Ã  jour de l'Ã©tat global (index, retrait de la file, etc.)
            // Cela Ã©vite que les titres s'accumulent dans la queue sans avancer.
            const originType = playbackSource === 'user' ? 'queue' : (currentPlaybackContext ? currentPlaybackContext.type : 'titles');
            const sourceForBanner = playbackSource === 'user' ? 'queue' : (currentPlaybackContext ? currentPlaybackContext.name : "");

            // playVideoWhenReady avec cueOnly=true met Ã  jour les index et prÃ©-charge le morceau sans autoplay.
            playVideoWhenReady(nextItem, currentQueue, nextIndex, originType, false, true, isSwipe, true);

            if (isMusicTitle(nextItem)) {
                renderMusicTitleDetails(nextItem, false, true, sourceForBanner); // false = Cue only, true = isAutoTransition
            }

            // NOUVEAU: Afficher le message d'instruction car on a forcÃ© le mode Cue
            showToast(getTranslation('playFromDetailsNeeded'));
            // Note: Pour les vidÃ©os, playVideoWhenReady s'occupe dÃ©jÃ  de l'affichage via loadAndPlayVideo.
        } else if (forcePlay) {
            // Si on joue depuis la PlaybackQueue.user, le type de contexte est 'queue'
            const originType = playbackSource === 'user' ? 'queue' : currentPlaybackContext.type;
            playVideoWhenReady(nextItem, currentQueue, nextIndex, originType, false, true, isSwipe);
        } else {
            renderMusicTitleDetails(nextItem);
        }
    }
};

// NOUVEAU: Fonction de changement d'état visuel du profil sans déclencher de navigation
function performProfileStateSwitch(targetProfile) {
    // Mise à jour de l'état actif dans le switch mobile (fallback)
    document.querySelectorAll('#mobile-profile-switch .profile-switch-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.project === targetProfile);
    });
    requestAnimationFrame(() => updateSlidingIndicator(document.getElementById('mobile-profile-switch')));

    // Mise à jour de la branding console
    renderSidebarBranding(targetProfile);

    // Mise à jour du bouton "À propos"
    const aboutSwitchBtn = document.getElementById('about-switch-profile-btn');
    if (aboutSwitchBtn) {
        const translationKey = targetProfile === 'mmg-music' ? 'switchToBeats' : 'switchToMusic';
        const switchText = aboutSwitchBtn.querySelector('.switch-text');
        if (switchText) {
            switchText.setAttribute('data-lang-key', translationKey);
            switchText.textContent = typeof getTranslation === 'function' ? getTranslation(translationKey) : `Switch to ${targetProfile === 'mmg-music' ? 'Beats' : 'Music'}`;
        }
    }

    const aboutCurrentArtist = document.getElementById('about-current-artist-name');
    if (aboutCurrentArtist) {
        aboutCurrentArtist.textContent = targetProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';
        aboutCurrentArtist.classList.toggle('is-music', targetProfile === 'mmg-music');
        aboutCurrentArtist.classList.toggle('is-beats', targetProfile === 'mmg-beats');
    }

    // Mise à jour du titre de la carte À propos
    const aboutTitle = document.querySelector('.about-card-title');
    if (aboutTitle) {
        aboutTitle.textContent = targetProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';
    }

    renderSidebarNav(targetProfile);
}

// NOUVEAU: Fonction centralisée pour changer de profil
function switchProfile(targetProfile) {
    const previousProfile = getActiveProfile();
    if (previousProfile === targetProfile) return;

    performProfileStateSwitch(targetProfile);

    // Navigation intelligente
    const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id || 'home-dashboard-section';
    let sectionToLoad = 'home-dashboard-section';
    const commonSections = ['library-section', 'shop-section'];

    if (commonSections.includes(currentSectionId)) {
        sectionToLoad = currentSectionId;
    } else if (currentSectionId !== 'home-dashboard-section') {
        if (siteData.projectData && siteData.projectData[previousProfile]) {
            const prevItem = Object.values(siteData.projectData[previousProfile]).find(p => p && p.link === currentSectionId);
            if (prevItem) {
                const equivalentSection = Object.values(siteData.projectData[targetProfile]).find(item => {
                    return item && (item.langKey === prevItem.langKey || item.link === prevItem.link);
                });
                if (equivalentSection) sectionToLoad = equivalentSection.link;
            }
        }
    }

    handleMenuNavigation(sectionToLoad);
}



// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FONCTIONS HISSÃ‰ES AU NIVEAU MODULE
// (Ã©taient des fonctions locales dans setupEventListeners)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function navigateDetailsInAlbum(direction) {
    const section = UI.detailsSection;
    if (!section) return;
    const currentId = section.dataset.currentItemId;
    if (!currentId) return;
    const currentItem = findItemById(currentId);
    if (!currentItem || !currentItem.albumId) return;
    const activeProfile = currentItem.profile || getActiveProfile();
    const allTitles = siteData.contentData[activeProfile]?.titles;
    if (!allTitles) return;
    const albumTracks = Object.values(allTitles)
        .filter(t => t.albumId === currentItem.albumId)
        .sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });
    const currentIndex = albumTracks.findIndex(t => t.id === currentId);
    if (currentIndex === -1) return;
    const nextItem = albumTracks[(currentIndex + direction + albumTracks.length) % albumTracks.length];
    if (nextItem) {
        playAudio(sounds.select);
        renderMusicTitleDetails(nextItem, false);
    }
}

function openMobileQueuePanel() {
    const mobileQueuePanel = dom.mobileQueuePanel;
    const mobileQueueBackdrop = document.getElementById('mobile-queue-panel-backdrop');
    renderMobileQueue();
    mobileQueuePanel.classList.remove('hidden');
    mobileQueueBackdrop.classList.remove('hidden');

    // NOUVEAU: On force un reflow puis on active la transition
    void mobileQueueBackdrop.offsetWidth;
    mobileQueueBackdrop.classList.add('active');

    requestAnimationFrame(() => {
        mobileQueuePanel.style.transform = 'translateY(0)';
    });
    playAudio(sounds.select);
}

function closeMobileQueuePanel() {
    const mobileQueuePanel = dom.mobileQueuePanel;
    const mobileQueueBackdrop = document.getElementById('mobile-queue-panel-backdrop');

    mobileQueuePanel.style.transform = 'translateY(100%)';

    // NOUVEAU: Transition de sortie pour le flou
    if (mobileQueueBackdrop) {
        mobileQueueBackdrop.classList.remove('active');
    }

    playAudio(sounds.back);
    setTimeout(() => {
        mobileQueuePanel.classList.add('hidden');
        if (mobileQueueBackdrop) mobileQueueBackdrop.classList.add('hidden');
    }, 400);
}

function checkDesktopMobileMode() {
    const desktopWarningOverlay = document.getElementById('desktop-warning-overlay');
    if (!desktopWarningOverlay || warningDismissedInSession) return;

    const mobileMediaQuery = window.matchMedia('(max-width: 952px)');
    const isLikelyDesktop = !window.matchMedia('(pointer: coarse)').matches;
    if (isLikelyDesktop && mobileMediaQuery.matches) {
        desktopWarningOverlay.classList.remove('hidden');
    } else {
        desktopWarningOverlay.classList.add('hidden');
    }
}

function toggleFullScreen(element) {
    if (!document.fullscreenElement) {
        if (element.requestFullscreen) element.requestFullscreen();
        else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
        else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
        else if (element.msRequestFullscreen) element.msRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ORCHESTRATEUR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function setupEventListeners() {
    setupNavigationListeners();
    setupSearchListeners();
    setupPlayerListeners();
    setupMiniPlayerListeners();
    setupFullPlayerListeners();
    setupOverlayListeners();
    setupShopListeners();
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. NAVIGATION â€” back, profil, sidebar, cartes, resize
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function setupNavigationListeners() {
    // â”€â”€ Bouton retour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playAudio(sounds.back);
            if (isTutorialActive || document.getElementById('home-dashboard-section').classList.contains('hidden') === false) return;
            const librarySection = document.getElementById('library-section');
            if (librarySection && !librarySection.classList.contains('hidden')) {
                resetToHome(false);
                return;
            }
            if (!UI.artworkOverlay.classList.contains('hidden')) {
                UI.artworkOverlay.classList.add('hidden');
                return;
            }
            window.history.back();
        });
    }

    // â”€â”€ Header transparent au scroll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const header = document.querySelector('.top-bar');
    document.querySelectorAll('.page-content').forEach(container => {
        container.addEventListener('scroll', () => {
            if (!header) return;
            header.classList.toggle('scrolled', container.scrollTop > 20);
        });
    });

    // NOTE: #mmg-branding has inline onclick in HTML — no JS addEventListener needed (avoids double-fire).

    const spotimonLens = document.getElementById('spotimon-lens-btn');
    if (spotimonLens) {
        spotimonLens.addEventListener('click', () => {
            playAudio(sounds.select);
            const isBeats = document.getElementById('spotimon-profile-switch').classList.contains('is-beats');
            switchProfile(isBeats ? 'mmg-music' : 'mmg-beats');
        });
    }

    const aboutSwitchBtn = document.getElementById('about-switch-profile-btn');
    if (aboutSwitchBtn) {
        aboutSwitchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const activeProfile = getActiveProfile();
            switchProfile(activeProfile === 'mmg-music' ? 'mmg-beats' : 'mmg-music');
            playAudio(sounds.select);
        });
    }

    const mobileProfileSwitch = document.getElementById('mobile-profile-switch');
    if (mobileProfileSwitch) {
        const activateMobileProfileButton = (button, e) => {
            if (!button || button.classList.contains('active')) return;
            e?.preventDefault();
            e?.stopPropagation();
            playAudio(sounds.select);
            switchProfile(button.dataset.project);
        };
        mobileProfileSwitch.addEventListener('click', (e) => {
            activateMobileProfileButton(e.target.closest('.profile-switch-btn'), e);
        });
        mobileProfileSwitch.addEventListener('touchend', (e) => {
            const button = e.target.closest('.profile-switch-btn');
            if (!button || button.classList.contains('active')) return;
            activateMobileProfileButton(button, e);
        }, { passive: false });
    }

    // â”€â”€ Bouton paramÃ¨tres top-bar PC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const topBarSettingsBtn = document.getElementById('top-bar-settings-btn');
    if (topBarSettingsBtn) {
        topBarSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openOverlay(document.getElementById('settings-overlay'), sounds.select, true);
        });
    }

    // â”€â”€ Onglets bibliothÃ¨que â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    document.getElementById('library-tabs-container').addEventListener('click', (e) => {
        const tab = e.target.closest('.playlist-tab-btn');
        if (tab && !tab.classList.contains('active')) {
            const tabId = tab.dataset.tabId;
            playAudio(sounds.select);
            currentViewContext = { type: 'library', data: tabId };
            history.replaceState({ ...history.state, context: currentViewContext }, '', window.location.hash);
            renderLibraryPage(tabId);
        }
    });

    // â”€â”€ Historique navigateur (popstate) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.isTrap) { history.forward(); return; }
        if (event.state && event.state.overlay === 'artwork') {
            UI.artworkOverlay.classList.add('hidden');
            updateThemeColorMeta();
            return;
        }
        const sectionId = event.state?.section || 'home-dashboard-section';
        const context = event.state?.context || null;
        handleMenuNavigation(sectionId, false, context);
    });

    // â”€â”€ DÃ©lÃ©gation globale : cartes, guides, news, tags â”€â”€â”€
    const mainWrapper = document.body;

    mainWrapper.addEventListener('click', (e) => {
        const associatedMediaButton = e.target.closest('.associated-media-thumb[data-associated-item-id]');
        if (associatedMediaButton) {
            e.preventDefault();
            e.stopPropagation();
            const mediaItem = findItemById(associatedMediaButton.dataset.associatedItemId);
            if (mediaItem) {
                playAudio(sounds.select);
                currentNavigationContext = { playlist: [], index: -1 };
                playVideoWhenReady(mediaItem, [], -1, 'video', false, false, false, true);
                currentViewContext = { type: 'music-details', data: mediaItem.id };
                renderMusicTitleDetails(mediaItem, false);
            }
            return;
        }

        // Animation icônes boutons (cloche, loupe, tag, loop, shuffle, etc.)
        const iconButton = e.target.closest('.top-bar-btn, .clickable-icon, .controls-box, .player-buttons > .svg-icon, .player-right-controls > .svg-icon, .mobile-player-controls > .svg-icon, .mobile-player-play-box, .mobile-player-secondary-controls > .svg-icon, .mobile-player-header-btn, .mini-player-controls > .svg-icon, .mobile-nav-link, .playlist-tab-btn, .associated-video-card, .card-menu-btn, [data-action="filter-tag"], .search-tag-btn, .sidebar-nav-link, .deck-key');
        if (iconButton) {
            iconButton.classList.remove('icon-pop');
            void iconButton.offsetWidth;
            iconButton.classList.add('icon-pop');

            // Déclenchement de l'animation SVG si présente (cloche, loupe, tag, etc.)
            const icon = iconButton.querySelector('i, .svg-icon, svg');
            if (icon) {
                const anims = icon.querySelectorAll('animateTransform, animate');
                if (anims && anims.length > 0) {
                    anims.forEach(a => { if (a.beginElement) a.beginElement(); });
                }
            }
        }

        // Boutons de guide
        const guideButton = e.target.closest('.guide-choice-btn[data-guide]');
        if (guideButton) {
            e.preventDefault();
            playAudio(sounds.select);
            const guideKey = guideButton.dataset.guide;
            if (guideButton.closest('#guide-selection-overlay')) closeOverlay(null);
            if (window.guideManager) window.guideManager.start(guideKey);
            return;
        }

        // Clic sur actualitÃ©
        const newsItem = e.target.closest('.clickable-news');
        if (newsItem) {
            e.preventDefault();
            playAudio(sounds.select);
            handleMenuNavigation('news-details-section', true, { type: 'news', data: newsItem.dataset.newsId });
            return;
        }

        // Filtre par tag
        const filterTagAction = e.target.closest('[data-action="filter-tag"]');
        if (filterTagAction) {
            e.preventDefault();
            e.stopPropagation();
            playAudio(sounds.select);
            const tag = filterTagAction.dataset.tag.toLowerCase();

            // On vide la recherche textuelle
            UI.searchInput.value = '';

            // On décoche tout
            document.querySelectorAll('#tags-filter-list input').forEach(cb => cb.checked = false);

            // On cherche la checkbox correspondante
            const tagCheckbox = document.querySelector(`#tags-filter-list input[value="${tag}"]`);
            if (tagCheckbox) {
                tagCheckbox.checked = true;
            } else {
                // Si le tag n'est pas dans la liste (ex: exclu), on le force via un paramètre ou on l'ajoute ?
                // Pour l'instant on va modifier updateVisibleCards pour accepter un tag forcé si besoin.
            }

            // On déclenche le filtrage avec le tag forcé si la checkbox n'existe pas
            updateVisibleCards(null, true, tagCheckbox ? null : tag);
            return;
        }

        // Lien vers album depuis la page détails
        const albumLink = e.target.closest('#details-album-link');
        if (albumLink) {
            e.preventDefault();
            e.stopPropagation();
            const albumId = albumLink.dataset.albumId;
            const itemType = albumLink.dataset.itemType;
            if (albumId) {
                playAudio(sounds.select);

                // NOUVEAU : Détecter et basculer le profil si l'album appartient à l'autre univers
                let targetProfile = getActiveProfile();
                if (siteData.contentData['mmg-music']?.albums?.[albumId]) {
                    targetProfile = 'mmg-music';
                } else if (siteData.contentData['mmg-beats']?.albums?.[albumId]) {
                    targetProfile = 'mmg-beats';
                }

                if (targetProfile !== getActiveProfile()) {
                    switchProfile(targetProfile);
                }

                if (itemType === 'video' || itemType === 'bonus') {
                    handleMenuNavigation('video-list-section', true, { type: 'video-list', data: albumId });
                } else {
                    handleMenuNavigation('contents-albums-section', true);
                }
            }
            return;
        }

        // Filtre par année
        const yearLink = e.target.closest('#details-year-link');
        if (yearLink) {
            e.preventDefault();
            e.stopPropagation();
            const year = yearLink.dataset.year;
            const itemType = yearLink.dataset.itemType;
            if (year) {
                playAudio(sounds.select);
                UI.searchInput.value = '';
                document.querySelectorAll('#tags-filter-list input').forEach(cb => cb.checked = false);

                // Si on vient d'une vidéo, on filtre par année ET par type vidéo
                const isVideo = itemType === 'video' || itemType === 'bonus';
                const yearResults = Object.fromEntries(Object.entries(allSearchableItems).filter(([_, item]) => {
                    const matchesYear = item.year === year;
                    if (isVideo) {
                        return matchesYear && (item.type === 'video' || item.type === 'bonus');
                    }
                    return matchesYear;
                }));

                const titleSuffix = isVideo ? ` (${getTranslation('videos')})` : '';
                document.getElementById('search-results-title').textContent = year + titleSuffix;
                renderCards('search-results-cards', yearResults, isVideo ? 'video' : 'search');
                showSection('search-results-section');
            }
        }

        const artistLink = e.target.closest('#details-artist');
        if (artistLink) {
            e.preventDefault();
            e.stopPropagation();
            const profile = artistLink.dataset.profile;
            if (profile) {
                playAudio(sounds.select);
                const artistResults = Object.fromEntries(Object.entries(allSearchableItems).filter(([id, item]) =>
                    item.profile === profile && !(item.isUnlockable && !unlockedDreamSeasonTracks.includes(id))
                ));
                document.getElementById('search-results-title').textContent = artistLink.textContent;
                renderCards('search-results-cards', artistResults, 'search');
                showSection('search-results-section');
            }
            return;
        }

        // VidÃ©o associÃ©e
        const associatedVideo = e.target.closest('.associated-video-card');
        if (associatedVideo) {
            e.preventDefault();
            if (associatedVideo.classList.contains('ghost-card')) {
                playAudio(sounds.blocked);
                return;
            }
            const item = findItemById(associatedVideo.dataset.itemId);
            if (item) {
                playAudio(sounds.select);
                renderMusicTitleDetails(item);
            }
            return;
        }

        // Liens de cartes / sidebar / carousel pc
        const link = e.target.closest('a.card-link-wrapper, .sidebar-nav-link, .dashboard-card-button, .deck-key, .pc-premium-slide-clickable');
        if (!link) return;
        e.preventDefault();
        const { youtubeId, link: dataLink, albumId, itemId: linkItemId } = link.dataset || {};
        const cardElement = link.closest('.card');
        let itemId = cardElement ? cardElement.dataset.itemId : linkItemId;

        if (youtubeId) {
            const item = findItemById(itemId);
            if (!item) return;

            // Titre verrouillÃ© â†’ achat
            if (item.isUnlockable && !unlockedDreamSeasonTracks.includes(item.id)) {
                if (userCoins >= COIN_COST_UNLOCK) {
                    userCoins -= COIN_COST_UNLOCK;
                    unlockedDreamSeasonTracks.push(item.id);
                    safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
                    safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));
                    showDialog(`${getTranslation('youUnlocked')} "${item.title}"!`);
                    playAudio(sounds.coin);
                    updateCoinDisplay();
                    unlockCardUI(item.id);
                    renderUpdateLog();
                    updateNotificationDot();
                } else {
                    showDialog(getTranslation('needCoinsToUnlock', { COIN_COST_UNLOCK }));
                    playAudio(sounds.blocked);
                }
                return;
            }

            const activeProfile = getActiveProfile();
            let playlistIds = [];
            let startIndex = -1;

            // DÉTERMINATION DU CONTEXTE DE NAVIGATION (Style Spotify)
            // On privilégie la liste actuellement affichée dans le conteneur parent
            const parentContainer = cardElement?.parentElement;
            if (parentContainer && parentContainer.classList.contains('titles-grid') || parentContainer?.classList.contains('list-view')) {
                const allCardsInContainer = Array.from(parentContainer.querySelectorAll('.card:not(.locked)'));
                playlistIds = allCardsInContainer.map(card => card.dataset.itemId).filter(Boolean);
                startIndex = playlistIds.findIndex(pId => pId === item.id);
            }

            // Fallback : Si on n'a pas trouvé de liste parente (ex: depuis le dashboard), on utilise l'album
            if (playlistIds.length <= 1 && isMusicTitle(item) && item.albumId) {
                const itemProfile = item.profile || activeProfile;
                const allAlbumTracks = Object.values(siteData.contentData[itemProfile]?.titles || {})
                    .filter(title => title.albumId === item.albumId);
                playlistIds = allAlbumTracks
                    .filter(track => !track.isUnlockable || unlockedDreamSeasonTracks.includes(track.id))
                    .sort((a, b) => (parseInt(a.id.replace(/\D/g, '')) || 0) - (parseInt(b.id.replace(/\D/g, '')) || 0))
                    .map(title => title.id);
                startIndex = playlistIds.findIndex(id => id === item.id);
            }

            currentNavigationContext = { playlist: playlistIds, index: startIndex };
            playAudio(sounds.select);

            // Détermination de l'origine (pour les statistiques et l'affichage)
            let playbackOriginType = 'titles';
            const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id;
            if (currentSectionId === 'library-section') {
                const activeTab = document.querySelector('#library-tabs-container .playlist-tab-btn.active')?.dataset.tabId;
                if (activeTab === 'liked') playbackOriginType = 'liked';
                else if (activeTab === 'current') playbackOriginType = 'myPlaylist';
            } else if (item.type === 'video' || item.type === 'bonus') {
                playbackOriginType = 'video';
            } else if (currentSectionId === 'search-results-section') {
                playbackOriginType = 'search';
            } else if (item.albumId) {
                playbackOriginType = 'album';
            }

            // Tout passe par la page de détails maintenant
            playVideoWhenReady(item, playlistIds, startIndex, playbackOriginType, false, false, false, true);
            currentViewContext = { type: 'music-details', data: item.id };
            renderMusicTitleDetails(item, false);

        } else if (dataLink) {
            playAudio(sounds.select);
            handleMenuNavigation(dataLink);
            requestAnimationFrame(() => updateSlidingIndicator(document.querySelector('.profile-switch')));
        } else if (albumId) {
            playAudio(sounds.select);
            const card = e.target.closest('.card');
            if (card && card.parentElement && card.parentElement.id === 'contents-albums-cards') {
                handleMenuNavigation('contents-section', true, { type: 'contents-album', data: albumId });
                return;
            }
            if (card && card.parentElement && card.parentElement.id === 'video-albums-cards') {
                handleMenuNavigation('video-list-section', true, { type: 'video-list', data: albumId });
                return;
            }
            handleMenuNavigation('contents-section', true, { type: 'contents-album', data: albumId });
        }
    });

    // Pause animation titre au press
    mainWrapper.addEventListener('mousedown', (e) => {
        const titleSpan = e.target.closest('.card')?.querySelector('.card__title.scrolling > span');
        if (titleSpan) titleSpan.style.animationPlayState = 'paused';
    });
    mainWrapper.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.card');
        if (card) {
            const titleSpan = card.querySelector('.card__title.scrolling > span');
            if (titleSpan) titleSpan.style.animationPlayState = 'paused';
            if (card.parentElement.id === 'video-albums-cards') {
                e.preventDefault();
                e.stopPropagation();
                playAudio(sounds.select);
                handleMenuNavigation('video-list-section', true, { type: 'video-list', data: card.dataset.itemId });
                return;
            }
        }
    }, { passive: false });

    const resumeScrolling = () => {
        document.querySelectorAll('.card__title.scrolling > span[style*="animation-play-state: paused"]')
            .forEach(span => { span.style.animationPlayState = 'running'; });
    };
    window.addEventListener('mouseup', resumeScrolling);
    window.addEventListener('touchend', resumeScrolling);



    // Navigation entre titres d'un album (flÃ¨ches dans la page dÃ©tails)
    document.getElementById('details-next-arrow')?.addEventListener('click', () => navigateDetailsInAlbum(1));
    document.getElementById('details-prev-arrow')?.addEventListener('click', () => navigateDetailsInAlbum(-1));

    // Onglets de profil (desktop)
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            playAudio(sounds.select);
            const previousProfile = getActiveProfile();
            const activeProfile = tab.dataset.project;
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('#mobile-profile-switch .profile-switch-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.project === activeProfile);
            });
            requestAnimationFrame(() => updateSlidingIndicator(document.querySelector('.profile-switch')));
            if (!previousProfile || previousProfile === activeProfile) return;
            const currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id || 'home-dashboard-section';
            let sectionToLoad = 'home-dashboard-section';
            const commonSections = ['library-section'];
            if (commonSections.includes(currentSectionId)) {
                sectionToLoad = currentSectionId;
            } else if (currentSectionId !== 'home-dashboard-section') {
                const prevItem = Object.values(siteData.projectData[previousProfile]).find(p => p.link === currentSectionId);
                if (prevItem) {
                    const equivalentSection = Object.values(siteData.projectData[activeProfile]).find(item => item.langKey === prevItem.langKey || item.link === prevItem.link);
                    if (equivalentSection) sectionToLoad = equivalentSection.link;
                }
            }
            renderSidebarNav(activeProfile);
            handleMenuNavigation(sectionToLoad);
        });
    });

    // Resize
    let lastWasPC = window.innerWidth > 952;
    window.addEventListener('resize', () => {
        const isMobileNow = window.innerWidth <= 952;
        const isPCNow = !isMobileNow;
        syncMobileDetailsTitleOrder();
        requestAnimationFrame(syncDetailsTitleScrolling);
        document.querySelectorAll('.sliding-tabs').forEach(container => updateSlidingIndicator(container));
        const shopSection = UI.shopSection;
        if (shopSection && !shopSection.classList.contains('hidden')) renderShopItems();
        renderDailyBonusProgress();
        if (isPCNow !== lastWasPC) {
            if (typeof renderHeroAccordion === 'function') renderHeroAccordion();
            if (typeof renderRecommendedPlaylists === 'function') renderRecommendedPlaylists();
        }
        if (isPCNow && !lastWasPC) {
            document.querySelectorAll('.settings-card').forEach(card => { card.style.transform = ''; });
        }
        lastWasPC = isPCNow;
    });

    // Barre de navigation mobile
    document.getElementById('mobile-bottom-nav').addEventListener('click', (e) => {
        const navLink = e.target.closest('.mobile-nav-link[data-link]');
        if (navLink) {
            e.preventDefault();
            playAudio(sounds.select);
            handleMenuNavigation(navLink.dataset.link);
        }
    });
}


// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
// 2. RECHERCHE â€” inputs, tags, sons de frappe
// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

function setupSearchListeners() {
    // Boutons de recherche mobile
    const mobileSearchBtn = document.getElementById('mobile-search-btn');
    const mobileSearchCancelBtn = document.getElementById('mobile-search-cancel-btn');
    const mobileSearchTagBtn = document.getElementById('mobile-search-tag-btn');

    if (mobileSearchBtn) {
        const triggerSearch = (e) => {
            e.preventDefault();
            e.stopPropagation();
            playAudio(sounds.select);
            toggleSearch();
        };
        mobileSearchBtn.addEventListener('click', triggerSearch);
        mobileSearchBtn.addEventListener('touchstart', triggerSearch, { passive: false });
    }

    if (mobileSearchTagBtn) {
        mobileSearchTagBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openOverlay(document.getElementById('tags-filter-overlay'), sounds.select, true);
        });
    }

    if (mobileSearchCancelBtn) {
        mobileSearchCancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            playAudio(sounds.back);
            toggleSearch();
        });
    }

    // Synchronisation input mobile â†” desktop
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const desktopSearchInput = UI.searchInput;
    if (mobileSearchInput && desktopSearchInput) {
        mobileSearchInput.addEventListener('input', () => {
            desktopSearchInput.value = mobileSearchInput.value;
            updateVisibleCards();
        });
        desktopSearchInput.addEventListener('input', () => {
            mobileSearchInput.value = desktopSearchInput.value;
        });
    }

    // Barre de recherche desktop : input + bouton clear
    const searchInput = UI.searchInput;
    const searchClearBtn = document.getElementById('search-clear-btn');

    searchInput.addEventListener('input', () => {
        searchClearBtn.classList.toggle('hidden', searchInput.value === '');
        updateVisibleCards();
    });

    searchClearBtn.addEventListener('click', () => {
        playAudio(sounds.back);
        searchInput.value = '';
        searchClearBtn.classList.add('hidden');
        updateVisibleCards();
        searchInput.focus();
    });

    // Sons de frappe
    document.querySelectorAll('#search-input, #mobile-search-input, #cheat-code-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.altKey || e.metaKey || (e.key.length > 1 && e.key !== 'Backspace')) return;
            playAudio(e.key === 'Backspace' ? sounds.typingBackwards : sounds.typingForwards);
        });
    });

    // Filtres par tags
    document.getElementById('tags-filter-list').addEventListener('change', (e) => {
        if (e.target.tagName === 'INPUT') {
            playAudio(e.target.checked ? sounds.tags : sounds.typingBackwards);
        }
        updateVisibleCards();
    });
}


// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
// 3. LECTEUR DESKTOP â€” contrÃ´les PC + plein Ã©cran
// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

function setupPlayerListeners() {
    // Play/Pause desktop
    UI.playPauseBox.addEventListener('click', () => {
        if (!activePlayer || !currentPlayingItem) return;

        // NOUVEAU: Bloquer le play si on est en train de browser un autre titre OU si le titre est juste mis en attente (CUED)
        const coverOverlay = document.getElementById('details-cover-overlay');
        const isBrowsing = coverOverlay && !coverOverlay.classList.contains('hidden');
        const isCued = activePlayer.getPlayerState() === 5; // 5 = YT.PlayerState.CUED

        if (isBrowsing || isCued) {
            showToast(getTranslation('playFromDetailsNeeded'));
            return;
        }

        playAudio(sounds.select);
        const state = activePlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) activePlayer.pauseVideo();
        else activePlayer.playVideo();
    });

    // Suivant / PrÃ©cÃ©dent desktop
    document.getElementById('next-video-btn')?.addEventListener('click', () => playNextTrack(1, false, false, true));
    document.getElementById('prev-video-btn')?.addEventListener('click', () => playNextTrack(-1, false, false, true));

    // Loop / Shuffle desktop
    document.getElementById('loop-btn').addEventListener('click', () => {
        isPlayerLooping = !isPlayerLooping;
        playAudio(sounds.select);
        if (isPlayerLooping) isShuffleMode = false;
        updateLoopShuffleUI();
    });

    document.getElementById('shuffle-btn').addEventListener('click', () => {
        isShuffleMode = !isShuffleMode;
        playAudio(sounds.select);
        if (isShuffleMode) isPlayerLooping = false;
        updateLoopShuffleUI();
    });

    // Like desktop
    UI.playerLikeBtn.addEventListener('click', () => {
        if (currentPlayingItem) {
            playAudio(sounds.select);
            toggleLike(currentPlayingItem.id);
        }
    });

    // Pochette desktop â†’ ouvre dÃ©tails
    UI.playerCover.addEventListener('click', () => {
        if (currentPlayingItem) {
            playAudio(sounds.select);
            showSection('media-details-section');
            renderMusicTitleDetails(currentPlayingItem);
        }
    });

    // Barre de progression desktop
    document.getElementById('progress-bar').addEventListener('click', (e) => {
        playAudio(sounds.select);
        if (activePlayer && typeof activePlayer.getDuration === 'function') {
            const rect = e.currentTarget.getBoundingClientRect();
            activePlayer.seekTo(((e.clientX - rect.left) / rect.width) * activePlayer.getDuration(), true);
            seekDetectedInCurrentPlay = true;
        }
    });

    // Volume (couvre PC + mobile via querySelectorAll)
    document.querySelectorAll('#volume-up-btn, #mobile-volume-up-btn').forEach(btn => {
        btn.addEventListener('click', () => setVolume(currentVolume + 10, true));
    });
    document.querySelectorAll('#volume-down-btn, #mobile-volume-down-btn').forEach(btn => {
        btn.addEventListener('click', () => setVolume(currentVolume - 10, true));
    });


    // Ajouter Ã  la playlist desktop
    document.getElementById('player-add-to-playlist-btn').addEventListener('click', () => {
        if (currentPlayingItem) togglePlaylistItem(currentPlayingItem.id);
    });

    // File d'attente desktop
    document.getElementById('queue-btn').addEventListener('click', (e) => {
        e.preventDefault();
        openOverlay(document.getElementById('queue-overlay'), sounds.select, true);
    });

    // Partage
    document.getElementById('share-btn').addEventListener('click', () => {
        playAudio(sounds.select);
        if (currentPlayingItem) shareItem(currentPlayingItem.id);
    });
    document.getElementById('overlay-share-btn').addEventListener('click', () => {
        playAudio(sounds.select);
        if (currentPlayingItem) shareItem(currentPlayingItem.id);
    });

    // Clic sur conteneur vidÃ©o pour play/pause
    // Les clics play/pause sur le lecteur sont gérés par YouTube directement ou par l'overlay de détails

    // Le mode plein écran est désormais géré par le bouton natif du lecteur YouTube (fs: 1)

    let swipeDownTouchStartY = 0;
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) swipeDownTouchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e) => {
        const swipeDistance = e.changedTouches[0].clientY - swipeDownTouchStartY;
        if (swipeDistance > 75 && document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    document.addEventListener('fullscreenchange', () => {
        const fullscreenElement = document.fullscreenElement;
        const exitBtn = document.getElementById('exit-fullscreen-btn');
        if (exitBtn) exitBtn.classList.toggle('visible', !!fullscreenElement);
        if (fullscreenElement) {
            fullscreenElement.addEventListener('touchstart', handleTouchStart, { passive: true });
            fullscreenElement.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    });
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 4. MINI-LECTEUR MOBILE â€” barre, bulle, swipes, artwork
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function setupMiniPlayerListeners() {
    const miniPlayer = UI.miniPlayer;
    const artworkOverlay = dom.artworkOverlay;
    const mobilePlayer = UI.fullPlayer;

    // Boutons de contrÃ´le du mini-lecteur
    document.getElementById('mini-player-play-pause-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        UI.playPauseBox.click();
    });
    document.getElementById('mini-player-like-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        UI.playerLikeBtn.click();
    });
    document.getElementById('mini-player-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        playAudio(sounds.back);
        const wasVideo = currentPlayingItem && !isMusicTitle(currentPlayingItem);
        if (activePlayer && typeof activePlayer.stopVideo === 'function') activePlayer.stopVideo();
        currentPlayingItem = null;
        resetMiniPlayerUI();
        if (wasVideo) history.back();
    });

    // Swipe direction sur mini-lecteur (pour ouverture lecteur complet)
    let touchStartX = 0;
    let touchStartY = 0;
    miniPlayer.addEventListener('touchstart', (e) => {
        if (e.target.closest('.mini-player-controls')) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    miniPlayer.addEventListener('touchend', () => {
        touchStartX = 0;
        touchStartY = 0;
    });

    // Mode bulle : drag & drop + appui long
    let isDragging = false;
    let offsetX, offsetY;
    let longPressTimer;
    let isLongPress = false;
    let revertToBarTimer;
    let isRevertingToBar = false;

    // Restauration de l'Ã©tat et position au chargement
    if (safeStorage.getItem('mmg-player-mode') === 'bubble') {
        miniPlayer.classList.add('bubble-mode');
    }
    const savedBubblePosition = safeStorage.getItem('mmg-bubble-position');
    if (savedBubblePosition && miniPlayer.classList.contains('bubble-mode')) {
        const { top, left } = JSON.parse(savedBubblePosition);
        miniPlayer.style.top = top;
        miniPlayer.style.left = left;
        miniPlayer.style.right = 'auto';
        miniPlayer.style.bottom = 'auto';
    }

    const onDragStart = (e) => {
        const touch = e.touches[0];
        isLongPress = false;
        isRevertingToBar = false;
        if (miniPlayer.classList.contains('bubble-mode')) {
            const rect = miniPlayer.getBoundingClientRect();
            miniPlayer.style.top = `${rect.top}px`;
            miniPlayer.style.left = `${rect.left}px`;
            miniPlayer.style.bottom = 'auto';
            miniPlayer.style.right = 'auto';
            isDragging = true;
            miniPlayer.style.transition = 'none';
            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;
            miniPlayer.querySelector('.mini-player-controls').classList.add('visible');
            revertToBarTimer = setTimeout(() => { isRevertingToBar = true; }, 500);
        } else {
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                playAudio(sounds.minimize);
                miniPlayer.classList.add('bubble-mode');
                safeStorage.setItem('mmg-player-mode', 'bubble');
            }, 500);
        }
    };

    const onDragMove = (e) => {
        clearTimeout(longPressTimer);
        clearTimeout(revertToBarTimer);
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        let newX = touch.clientX - offsetX;
        let newY = touch.clientY - offsetY;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const bubbleSize = 65;
        const navBar = document.getElementById('mobile-bottom-nav');
        const navBarHeight = navBar ? navBar.offsetHeight : 60;
        newX = Math.max(5, Math.min(newX, screenWidth - bubbleSize - 5));
        newY = Math.max(5, Math.min(newY, screenHeight - bubbleSize - navBarHeight - 5));
        miniPlayer.style.left = `${newX}px`;
        miniPlayer.style.top = `${newY}px`;
    };

    const onDragEnd = () => {
        clearTimeout(longPressTimer);
        clearTimeout(revertToBarTimer);
        if (isDragging && !isRevertingToBar) {
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
            safeStorage.setItem('mmg-bubble-position', JSON.stringify({ top: `${rect.top}px`, left: finalX }));
            setTimeout(() => {
                miniPlayer.querySelector('.mini-player-controls').classList.remove('visible');
            }, 2000);
        } else if (isRevertingToBar) {
            miniPlayer.classList.remove('bubble-mode');
            safeStorage.setItem('mmg-player-mode', 'bar');
            playAudio(sounds.maximize);
            miniPlayer.style.top = '';
            miniPlayer.style.left = '';
            miniPlayer.style.right = '';
            miniPlayer.style.bottom = '';
            miniPlayer.style.transition = '';
        }
        isDragging = false;
        isRevertingToBar = false;
        isLongPress = false;
    };

    miniPlayer.addEventListener('touchstart', onDragStart, { passive: true });
    miniPlayer.addEventListener('touchmove', onDragMove, { passive: false });
    miniPlayer.addEventListener('touchend', onDragEnd, { passive: true });

    // Clic sur le mini-lecteur â†’ ouvrir lecteur complet ou dÃ©tails
    miniPlayer.addEventListener('click', (e) => {
        if (!currentPlayingItem) return;
        if (e.target.closest('.mini-player-controls') || e.target.closest('.mini-player-like-btn')) return;

        if (miniPlayer.classList.contains('bubble-mode')) {
            if (isLongPress) { isLongPress = false; return; }
            if (isMusicTitle(currentPlayingItem)) {
                mobilePlayer.classList.add('active');
                playAudio(sounds.maximize);
                setTimeout(() => {
                    const t = UI.mobileTitle?.querySelector('span');
                    const a = UI.mobileArtist?.querySelector('span');
                    if (t) TitleScroller.check(t);
                    if (a) TitleScroller.check(a);
                }, 400);
            } else if (currentPlayingItem) {
                renderMusicTitleDetails(currentPlayingItem);
            }
            return;
        }

        if (e.target.closest('#mini-player-album-art')) {
            playAudio(sounds.select);
            if (isMusicTitle(currentPlayingItem)) {
                renderMusicTitleDetails(currentPlayingItem);
                currentViewContext = { type: 'music-details', data: currentPlayingItem.id };
            } else if (currentPlayingItem) {
                renderMusicTitleDetails(currentPlayingItem);
            }
        } else {
            if (isMusicTitle(currentPlayingItem)) {
                mobilePlayer.classList.add('active');
                playAudio(sounds.maximize);
                setTimeout(() => {
                    const t = UI.mobileTitle?.querySelector('span');
                    const a = UI.mobileArtist?.querySelector('span');
                    if (t) TitleScroller.check(t);
                    if (a) TitleScroller.check(a);
                }, 400);
            } else if (currentPlayingItem) {
                renderMusicTitleDetails(currentPlayingItem);
            }
        }
    });

    // Artwork overlay â€” swipe bas pour fermer
    artworkOverlay.addEventListener('touchstart', (e) => {
        artworkOverlay._touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    artworkOverlay.addEventListener('touchend', (e) => {
        if (e.changedTouches[0].screenY > artworkOverlay._touchStartY + 50) {
            artworkOverlay.classList.add('hidden');
            updateThemeColorMeta();
            playAudio(sounds.back);
            if (history.state && history.state.overlay === 'artwork') history.back();
        }
    }, { passive: true });

    // Artwork overlay â€” clic sur fond pour fermer
    artworkOverlay.addEventListener('click', (e) => {
        if (e.target.id === 'artwork-overlay') {
            artworkOverlay.classList.add('hidden');
            if (history.state && history.state.overlay === 'artwork') history.back();
        }
    });

    // Pochette dans la page dÃ©tails â†’ zoom artwork
    const detailsAlbumArt = document.getElementById('details-album-art');
    if (detailsAlbumArt) {
        detailsAlbumArt.addEventListener('click', (e) => {
            playAudio(sounds.select);
            dom.artworkImg.src = e.target.src;
            artworkOverlay.classList.remove('hidden');
            history.pushState({ overlay: 'artwork' }, '');
        });
    }

    // Overlay play depuis la page dÃ©tails
    const detailsCoverOverlay = document.getElementById('details-cover-overlay');
    if (detailsCoverOverlay) {
        detailsCoverOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentItemId = UI.detailsSection.dataset.currentItemId;
            const item = findItemById(currentItemId);
            if (item) {
                playAudio(sounds.select);
                playVideoWhenReady(item, currentNavigationContext.playlist, currentNavigationContext.index, 'titles', false, false, false, false);
            }
        });
    }

    // Bouton options depuis la page dÃ©tails
    const detailsOptionsBtn = document.getElementById('details-options-btn');
    if (detailsOptionsBtn) {
        detailsOptionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            playAudio(sounds.select);
            const currentItemId = UI.detailsSection.dataset.currentItemId;
            if (currentItemId) openCardMenu(e, currentItemId);
        });
    }

    const detailsShareBtn = document.getElementById('details-share-btn');
    if (detailsShareBtn) {
        detailsShareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentItemId = UI.detailsSection?.dataset.currentItemId;
            if (currentItemId) {
                playAudio(sounds.select);
                shareItem(currentItemId);
            }
        });
    }

    // Fermeture des guides (sÃ©curitÃ©)
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.guide-close') || e.target.closest('.splash-close-btn')) {
            if (window.guideManager) {
                window.guideManager.stop();
            } else {
                document.getElementById('guide-overlay')?.classList.remove('active');
                document.getElementById('guide-marker')?.classList.remove('active');
                document.getElementById('guide-splash')?.classList.remove('active');
                document.getElementById('guide-tooltip')?.classList.remove('visible');
                document.body.classList.remove('tutorial-active-body');
            }
        }
    });
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 5. LECTEUR PLEIN Ã‰CRAN MOBILE â€” contrÃ´les + file d'attente
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function setupFullPlayerListeners() {
    const mobilePlayer = UI.fullPlayer;
    const mobileQueuePanel = document.getElementById('mobile-queue-panel');
    const mobileQueueBackdrop = document.getElementById('mobile-queue-panel-backdrop');

    // Observer pour cacher la nav quand le lecteur est ouvert
    if (mobilePlayer) {
        const playerObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                document.body.classList.toggle('mobile-player-active', mutation.target.classList.contains('active'));
            });
        });
        playerObserver.observe(mobilePlayer, { attributes: true, attributeFilter: ['class'] });
    }

    // Swipe vers le bas pour fermer le lecteur mobile
    let playerCloseTouchStartY = 0;
    mobilePlayer.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.mobile-player-volume-wrapper') && !e.target.closest('.mobile-player-progress')) {
            playerCloseTouchStartY = e.touches[0].clientY;
        }
    }, { passive: true });
    mobilePlayer.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        if (playerCloseTouchStartY > 0 && touchEndY > playerCloseTouchStartY + 75) {
            mobilePlayer.classList.remove('active');
            playAudio(sounds.back);
        }
        playerCloseTouchStartY = 0;
    });

    // Play/Pause mobile
    document.getElementById('mobile-player-play-pause-box').addEventListener('click', () => {
        if (!activePlayer || !currentPlayingItem) return;

        // NOUVEAU: Bloquer le play si on est en train de browser un autre titre OU si le titre est juste mis en attente (CUED)
        const coverOverlay = document.getElementById('details-cover-overlay');
        const isBrowsing = coverOverlay && !coverOverlay.classList.contains('hidden');
        const isCued = activePlayer.getPlayerState() === 5; // 5 = YT.PlayerState.CUED

        if (isBrowsing || isCued) {
            showToast(getTranslation('playFromDetailsNeeded'));
            return;
        }

        playAudio(sounds.select);
        const state = activePlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) activePlayer.pauseVideo();
        else activePlayer.playVideo();
    });

    // Suivant / Précédent mobile
    document.getElementById('mobile-player-next-btn')?.addEventListener('click', () => playNextTrack(1, false, false, true));
    document.getElementById('mobile-player-prev-btn')?.addEventListener('click', () => playNextTrack(-1, false, false, true));

    // Suivant / Précédent mini player
    document.getElementById('mini-player-next-btn')?.addEventListener('click', (e) => {
        e.stopPropagation(); // Éviter d'ouvrir le lecteur plein écran
        playNextTrack(1, false, false, true);
    });
    document.getElementById('mini-player-prev-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        playNextTrack(-1, false, false, true);
    });

    // Loop / Shuffle mobile
    document.getElementById('mobile-player-loop-btn').addEventListener('click', () => {
        isPlayerLooping = !isPlayerLooping;
        if (isPlayerLooping) isShuffleMode = false;
        playAudio(sounds.select);
        updateLoopShuffleUI();
    });
    document.getElementById('mobile-player-shuffle-btn').addEventListener('click', () => {
        isShuffleMode = !isShuffleMode;
        if (isShuffleMode) isPlayerLooping = false;
        playAudio(sounds.select);
        updateLoopShuffleUI();
    });

    // Like / Playlist / Queue / Share mobile
    document.getElementById('mobile-player-like-btn').addEventListener('click', () => UI.playerLikeBtn.click());
    document.getElementById('mobile-player-add-to-playlist-btn').addEventListener('click', () => {
        if (currentPlayingItem) togglePlaylistItem(currentPlayingItem.id);
    });
    document.getElementById('mobile-player-queue-btn').addEventListener('click', (e) => {
        e.preventDefault();
        openMobileQueuePanel();
    });
    document.getElementById('mobile-player-share-btn').addEventListener('click', () => document.getElementById('share-btn').click());

    // Pochette dans lecteur mobile â†’ dÃ©tails ou artwork
    UI.mobileArt.addEventListener('click', (e) => {
        if (!mobilePlayer.classList.contains('active')) return;
        if (currentPlayingItem) {
            playAudio(sounds.select);
            renderMusicTitleDetails(currentPlayingItem);
            currentViewContext = { type: 'music-details', data: currentPlayingItem.id };
            if (mobilePlayer.classList.contains('active')) mobilePlayer.classList.remove('active');
        }
    });

    // Barre de progression mobile
    document.getElementById('mobile-player-progress-bar').addEventListener('click', (e) => {
        playAudio(sounds.select);
        if (activePlayer && typeof activePlayer.getDuration === 'function') {
            const rect = e.currentTarget.getBoundingClientRect();
            activePlayer.seekTo(((e.clientX - rect.left) / rect.width) * activePlayer.getDuration(), true);
        }
    });

    // Fermeture panneau queue mobile â€” backdrop + swipe
    mobileQueueBackdrop.addEventListener('click', closeMobileQueuePanel);

    let queuePanelTouchStartY = 0;
    mobileQueuePanel.addEventListener('touchstart', e => {
        const scrollable = e.target.closest('.mobile-queue-list');
        if (scrollable && scrollable.scrollTop > 0) { queuePanelTouchStartY = 0; return; }
        queuePanelTouchStartY = e.touches[0].clientY;
    }, { passive: true });
    mobileQueuePanel.addEventListener('touchend', e => {
        if (queuePanelTouchStartY > 0 && e.changedTouches[0].clientY > queuePanelTouchStartY + 75) {
            closeMobileQueuePanel();
        }
        queuePanelTouchStartY = 0;
    });

    // Swipe-to-delete dans la liste de queue mobile
    let queueTouchStartX = 0;
    let queueTouchCurrentX = 0;
    let swipedItem = null;
    const SWIPE_THRESHOLD = -80; // Négatif pour swiper vers la gauche

    document.getElementById('mobile-queue-list').addEventListener('touchstart', (e) => {
        const itemContent = e.target.closest('.playlist-item-content');
        if (itemContent && !itemContent.closest('.currently-playing')) {
            const currentlySwiped = document.querySelector('.playlist-item-content[style*="transform"]');
            if (currentlySwiped && currentlySwiped !== itemContent) currentlySwiped.style.transform = 'translateX(0)';
            swipedItem = itemContent;
            queueTouchStartX = e.touches[0].clientX;
            swipedItem.style.transition = 'none';
        }
    }, { passive: true });

    document.getElementById('mobile-queue-list').addEventListener('touchmove', (e) => {
        if (!swipedItem) return;
        queueTouchCurrentX = e.touches[0].clientX;
        const diffX = queueTouchCurrentX - queueTouchStartX;
        // Condition corrigée pour le mouvement vers la gauche
        if (diffX < 0 && diffX > SWIPE_THRESHOLD - 20) {
            swipedItem.style.transform = `translateX(${diffX}px)`;
        }
    }, { passive: true });

    document.getElementById('mobile-queue-list').addEventListener('touchend', () => {
        if (!swipedItem) return;
        const diffX = queueTouchCurrentX - queueTouchStartX;
        swipedItem.style.transition = 'transform 0.3s ease-out';
        // Calcul corrigé : si on swipe assez vers la gauche (diffX < -40), on ouvre
        swipedItem.style.transform = diffX < SWIPE_THRESHOLD / 2 ? `translateX(${SWIPE_THRESHOLD}px)` : 'translateX(0)';
        swipedItem = null;
        queueTouchStartX = 0;
        queueTouchCurrentX = 0;
    });

}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 6. OVERLAYS â€” paramÃ¨tres, playlist, bibliothÃ¨que, PWA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function setupOverlayListeners() {
    // ThÃ¨me sombre / SFX / Langue
    UI.themeSwitch.addEventListener('change', (e) => {
        document.body.classList.toggle('dark-theme', e.target.checked);
        playAudio(e.target.checked ? sounds.switchToBlack : sounds.switchToWhite);
        safeStorage.setItem('mmg-theme', e.target.checked ? 'dark' : 'light');
        updateThemeColorMeta();
        applyTheme(safeStorage.getItem('ui-theme') || 'default');
    });

    document.getElementById('sfx-switch').addEventListener('change', (e) => {
        sfxEnabled = e.target.checked;
        safeStorage.setItem('mmg-sfxEnabled', JSON.stringify(sfxEnabled));
        playAudio(sounds.select);
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await applyLanguage(e.currentTarget.dataset.lang);
            playAudio(sounds.select);
        });
    });

    // ParamÃ¨tres overlay â€” switcher vue grille/liste
    document.addEventListener('click', (e) => {
        const viewSwitchBtn = e.target.closest('.view-switch-btn');
        if (viewSwitchBtn) {
            const newView = viewSwitchBtn.dataset.view === 'toggle'
                ? (ViewState.current === 'grid' ? 'list' : 'grid')
                : viewSwitchBtn.dataset.view;
            const currentView = ViewState.current;
            if (newView !== currentView) {
                ViewState.set(newView);
                playAudio(sounds.select);
                updateViewSwitcherUI();
                refreshCurrentView();
            }
        }
    });

    // Boutons d'ouverture d'overlays
    document.getElementById('wifi-btn-settings')?.addEventListener('click', (e) => { e.preventDefault(); playAudio(sounds.select); openOverlay(document.getElementById('wifi-overlay'), null); });
    document.getElementById('tags-filter-btn')?.addEventListener('click', (e) => { e.preventDefault(); openOverlay(document.getElementById('tags-filter-overlay'), sounds.select, true); });
    document.getElementById('notifications-btn')?.addEventListener('click', (e) => { e.preventDefault(); openOverlay(document.getElementById('notifications-overlay'), sounds.select, true); });
    document.getElementById('mobile-notifications-btn')?.addEventListener('click', (e) => { e.preventDefault(); openOverlay(document.getElementById('notifications-overlay'), sounds.select, true); });

    document.getElementById('mark-as-read-btn')?.addEventListener('click', () => {
        playAudio(sounds.select);
        const allMessageIds = [
            ...(siteData.updateLog || []).map(m => m.id),
            ...(siteData.devMessages || []).map(m => m.id)
        ];
        allMessageIds.forEach(id => readUpdateIds.add(id));
        safeStorage.setItem('mmg-readUpdateIds', JSON.stringify([...readUpdateIds]));
        coinsAtLastDismissal = userCoins;
        safeStorage.setItem('mmg-coinsAtLastDismissal', userCoins.toString());
        updateNotificationDot();
    });

    const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
    if (mobileSettingsBtn) mobileSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openOverlay(document.getElementById('settings-overlay'), sounds.select, true);
    });

    const settingsInstallBtn = document.getElementById('settings-install-btn');
    if (settingsInstallBtn) {
        settingsInstallBtn.addEventListener('click', () => {
            playAudio(sounds.select);
            closeOverlay(null);
            showPwaInstallPrompt(true);
        });
    }

    // PWA Install Button Listeners
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    const pwaDismissBtn = document.getElementById('pwa-dismiss-btn');
    const pwaOverlay = document.getElementById('pwa-install-overlay');

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            playAudio(sounds.select);
            if (!deferredPrompt) {
                if (typeof showDialog === 'function') {
                    showDialog("Installation auto indisponible. Utilisez le menu du navigateur.");
                }
                if (pwaOverlay) pwaOverlay.classList.add('hidden');
                return;
            }
            if (pwaOverlay) pwaOverlay.classList.add('hidden');
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        });
    }

    if (pwaDismissBtn) {
        pwaDismissBtn.addEventListener('click', () => {
            playAudio(sounds.back);
            if (pwaOverlay) pwaOverlay.classList.add('hidden');
        });
    }

    // Fermeture des overlays au clic extÃ©rieur ou sur la croix
    const allOverlays = document.querySelectorAll('#settings-overlay, #wifi-overlay, #tags-filter-overlay, #playlist-overlay, #guide-selection-overlay, #player-options-overlay, #tutorial-overlay, #notifications-overlay, #reco-playlist-options-overlay, #queue-overlay, #mobile-queue-panel-backdrop, #purchase-confirm-overlay');
    allOverlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (document.body.classList.contains('guide-active')) { e.stopPropagation(); return; }
            if (e.target === overlay) closeOverlay(sounds.back);
        });
        overlay.querySelector('.close-btn')?.addEventListener('click', () => {
            if (document.body.classList.contains('guide-active')) return;
            closeOverlay(sounds.back);
        });
    });

    // Swipe bas pour fermer les panneaux (settings-card)
    document.querySelectorAll('.settings-card').forEach(panel => {
        let panelTouchStartY = 0;
        panel.addEventListener('touchstart', e => {
            const scrollableArea = e.target.closest('[class*="container"], [class*="list"]');
            if (scrollableArea && scrollableArea.scrollHeight > scrollableArea.clientHeight && scrollableArea.scrollTop > 0) {
                panelTouchStartY = 0; return;
            }
            panelTouchStartY = e.touches[0].clientY;
        }, { passive: true });
        panel.addEventListener('touchend', e => {
            if (panelTouchStartY > 0 && e.changedTouches[0].clientY > panelTouchStartY + 75) closeOverlay();
            panelTouchStartY = 0;
        });
    });

    // Vider la playlist (Unifié pour overlay et bibliothèque)
    const handleClearPlaylist = () => {
        currentPlaylist = [];
        _playlistSet.clear();

        // NOUVEAU: On invalide le contexte de lecture si on jouait depuis la playlist
        if (currentPlaybackContext.type === 'playlist') {
            PlaybackQueue.context = [];
        }
        PlaybackQueue.index = -1;
        safeStorage.removeItem('mmg-playlist');
        safeStorage.removeItem('mmg-savedPlaylists');
        savedPlaylists = {};
        renderPlaylist();
        showDialog(getTranslation('playlistCleared'));
    };

    // Boutons "Vider" dans l'overlay et la bibliothèque
    const clearBtns = document.querySelectorAll('#clear-playlist-btn, #library-clear-playlist-btn');
    clearBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', handleClearPlaylist);
    });

    // Cheat codes
    document.getElementById('cheat-code-btn').addEventListener('click', () => {
        const input = document.getElementById('cheat-code-input');
        const code = input.value.toLowerCase();
        let shopNeedsUpdate = false;

        if (code === 'gameshark') {
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
            shopNeedsUpdate = true;
        } else if (code === 'money10') {
            userCoins += 10;
            safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
            updateCoinDisplay();
            input.value = '';
            showDialog(getTranslation('coinsObtained', { count: 10, total: userCoins }));
            playAudio(sounds.coin);
            renderUpdateLog();
            updateNotificationDot();
        } else if (code === 'resetdaily') {
            safeStorage.removeItem('mmg-lastLoginDate');
            lastLoginDate = null;
            input.value = '';
            showDialog('Bonus quotidien réinitialisé. Actualisez la page.');
            playAudio(sounds.select);
        } else if (code === 'testupdate') {
            const mockRegistration = { waiting: { postMessage: (msg) => { if (msg.type === 'SKIP_WAITING') window.location.reload(); } } };
            showUpdateNotification(mockRegistration);
            input.value = '';
        } else {
            showDialog(getTranslation('incorrectCode'), false);
            playAudio(sounds.blocked);
        }

        if (shopNeedsUpdate && !UI.shopSection.classList.contains('hidden')) {
            renderShopPage();
        }
    });

    // Avertissement desktop en mode mobile
    const desktopWarningOverlay = document.getElementById('desktop-warning-overlay');
    const mobileMediaQuery = window.matchMedia('(max-width: 952px)');
    mobileMediaQuery.addEventListener('change', checkDesktopMobileMode);
    document.getElementById('close-desktop-warning-btn').addEventListener('click', () => {
        desktopWarningOverlay.classList.add('hidden');
        warningDismissedInSession = true;
        playAudio(sounds.back);
    });
    checkDesktopMobileMode();

    // Playlist â€” clic + drag & drop
    let draggedItem = null;
    const playlistContainer = document.getElementById('playlist-container');

    playlistContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.playlist-item-delete');
        if (deleteBtn) {
            const itemElement = deleteBtn.closest('.playlist-item');
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
                if (item) {
                    playAudio(sounds.select);
                    playVideoWhenReady(item, [], -1, true);
                }
            }
        }
    });

    playlistContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('playlist-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });
    playlistContainer.addEventListener('dragend', () => {
        if (draggedItem) { draggedItem.classList.remove('dragging'); draggedItem = null; }
    });
    playlistContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(playlistContainer, e.clientY);
        if (draggedItem) {
            if (afterElement == null) playlistContainer.appendChild(draggedItem);
            else playlistContainer.insertBefore(draggedItem, afterElement);
        }
    });
    playlistContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem) return;
        currentPlaylist = Array.from(playlistContainer.querySelectorAll('.playlist-item')).map(item => item.dataset.itemId);
        _playlistSet = new Set(currentPlaylist);
        if (currentPlayingItem) PlaybackQueue.index = currentPlaylist.findIndex(id => id === currentPlayingItem.id);
        safeStorage.setItem('mmg-playlist', JSON.stringify(currentPlaylist));
        renderPlaylist();
    });

    document.getElementById('playlist-tabs-container').addEventListener('click', e => {
        const tab = e.target.closest('.playlist-tab-btn');
        if (tab) {
            document.querySelectorAll('.playlist-tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            playAudio(sounds.select);
            renderPlaylist();
        }
    });

}

function updateMobileHeader(sectionId) {
    const titleElement = document.getElementById('mobile-header-title');
    if (!titleElement) return;

    const staticSectionTitles = {
        'home-dashboard-section': getTranslation('home'),
        'contents-albums-section': getTranslation('albums'),
        'contents-section': getTranslation('contents'),
        'video-list-section': getTranslation('contents'),
        'shop-section': getTranslation('shop'),
        'library-section': getTranslation('library'),
        'about-section': getTranslation('about'),
        'upcoming-release-section': getTranslation('mobileUpcoming'),
        'news-details-section': getTranslation('news'),
    };

    let title = "";

    if (sectionId === 'media-details-section') {
        title = getTranslation('contents');
    } else if (staticSectionTitles.hasOwnProperty(sectionId)) {
        title = staticSectionTitles[sectionId] || "";
    } else if (sectionId === 'search-results-section') {
        title = document.getElementById('search-results-title')?.textContent || '';
    }

    titleElement.textContent = title;
}

// NOUVEAU: Fonction pour retirer un titre de la file d'attente
function removeFromQueue(itemId) {
    PlaybackQueue.removeFromUser(itemId);
}

// NOUVEAU: Fonction centralisÃ©e pour mettre Ã  jour toutes les vues de la file d'attente
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

function renderContentsAlbumFilter(profileContent, tracks) {
    const select = document.getElementById('contents-album-select');
    if (!select) return;
    select.setAttribute('aria-label', getTranslation('filterByAlbum'));

    const availableAlbumIds = new Set(Object.values(tracks).map(track => track.albumId).filter(Boolean));
    const albums = Object.entries(profileContent.albums || {}).filter(([id]) => availableAlbumIds.has(id));
    if (!availableAlbumIds.has(selectedContentsAlbumId)) {
        selectedContentsAlbumId = albums[0]?.[0] || '';
    }

    select.replaceChildren();
    albums.forEach(([id, album]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = album.langKey ? getTranslation(album.langKey) : album.title;
        select.appendChild(option);
    });

    select.value = selectedContentsAlbumId;
    select.onchange = () => {
        selectedContentsAlbumId = select.value;
        playAudio(sounds.select);
        handleMenuNavigation('contents-section', true, { type: 'contents-album', data: selectedContentsAlbumId });
    };

}

window.renderContentsAlbumSelectionPage = () => {
    const activeProfile = getActiveProfile();
    const profileContent = siteData.contentData[activeProfile];
    const tracks = profileContent.titles || {};
    const availableAlbumIds = new Set(Object.values(tracks).map(track => track.albumId).filter(Boolean));
    const albums = Object.fromEntries(Object.entries(profileContent.albums || {}).filter(([id]) => availableAlbumIds.has(id)));
    renderCards('contents-albums-cards', albums, 'album');
    currentViewContext = { type: 'contents', data: null };
};

window.renderContentsPage = () => {
    const container = document.getElementById('media-cards');
    if (!container) return;

    const activeProfile = getActiveProfile();
    const profileContent = siteData.contentData[activeProfile];
    const allTracks = Object.fromEntries(
        Object.entries(profileContent.titles || {}).filter(([id, track]) =>
            !track.isUnlockable || unlockedDreamSeasonTracks.includes(id)
        )
    );
    const detail = document.getElementById('contents-album-detail');
    const albumId = currentViewContext?.type === 'contents-album' ? currentViewContext.data : null;

    if (!albumId || !profileContent.albums?.[albumId]) {
        handleMenuNavigation('contents-albums-section', false, { type: 'contents', data: null });
        return;
    }

    if (detail) detail.classList.remove('hidden');
    const album = profileContent.albums[albumId];
    selectedContentsAlbumId = albumId;
    renderContentsAlbumFilter(profileContent, allTracks);
    const albumTitle = album.langKey ? getTranslation(album.langKey) : album.title;
    const titleElement = document.getElementById('contents-album-title');
    if (titleElement) titleElement.textContent = albumTitle;
    const tracks = Object.fromEntries(Object.entries(allTracks).filter(([, track]) => track.albumId === albumId));
    renderCards('media-cards', tracks, 'title');
    currentViewContext = { type: 'contents-album', data: albumId };
};

function handleMenuNavigation(dataLink, updateHistory = true, context = null) {
    if (dataLink === 'albums-section') {
        dataLink = 'contents-albums-section';
        context = { type: 'contents', data: null };
    } else if (dataLink === 'contents-section' && (!context || context.type !== 'contents-album')) {
        dataLink = 'contents-albums-section';
        context = { type: 'contents', data: null };
    } else if (dataLink === 'videos-section') {
        dataLink = 'contents-section';
    }
    if (dataLink === 'titles-section') {
        dataLink = 'contents-section';
        if (context?.type === 'titles') context = { type: 'contents-album', data: context.data };
    }
    // NOUVEAU: RÃ©initialiser les filtres par tag lors d'une navigation principale.
    // On ne le fait que si `updateHistory` est vrai, pour ne pas rÃ©initialiser
    // lors d'un simple rafraÃ®chissement de vue (ex: changement grille/liste).
    if (updateHistory) {
        resetTagFilters();
    }

    // CORRECTION: Capturer le contexte actuel AVANT tout changement pour le passer Ã  showSection
    const previousContext = { ...currentViewContext };

    // CORRECTION: Utiliser le contexte actuel si aucun contexte n'est fourni (pour le rafraÃ®chissement de la vue)
    const effectiveContext = context || currentViewContext;

    // CORRECTION DÉFINITIVE: La source de vérité pour l'onglet actif est le `context` passé en argument.
    // S'il n'y a pas de contexte, on affiche l'onglet par défaut ('liked').
    const activeTabForLibrary = (dataLink === 'library-section' && effectiveContext?.type === 'library')
        ? effectiveContext.data
        : 'liked'; // Fallback par défaut

    // NOUVEAU: Détecter et basculer automatiquement le profil si le contexte cible appartient à l'autre univers
    if (effectiveContext && effectiveContext.data) {
        const currentProfile = getActiveProfile();
        let targetProfile = currentProfile;
        const itemId = effectiveContext.data;
        if (effectiveContext.type === 'titles' || effectiveContext.type === 'video-list' || effectiveContext.type === 'contents-album') {
            if (siteData.contentData['mmg-music']?.albums?.[itemId]) targetProfile = 'mmg-music';
            else if (siteData.contentData['mmg-beats']?.albums?.[itemId]) targetProfile = 'mmg-beats';
        } else if (effectiveContext.type === 'music-details') {
            const item = findItemById(itemId);
            if (item && item.profile) targetProfile = item.profile;
        }
        if (targetProfile !== currentProfile) {
            performProfileStateSwitch(targetProfile);
        }
    }

    const activeProfile = getActiveProfile();

    // NOUVEAU: RÃ©initialise la position de dÃ©filement en haut de la page Ã  chaque navigation.
    const contentBoard = document.querySelector('.content-section-board');
    if (contentBoard) {
        contentBoard.scrollTop = 0;
    }

    // NOUVEAU: Mettre Ã  jour le header mobile avec le titre de la section
    updateMobileHeader(dataLink);

    const sections = {};

    if (!document.getElementById(dataLink)) {
        currentViewContext = { type: 'home', data: null };
        dataLink = 'home-dashboard-section'; // Fallback to home
    }

    if (dataLink === 'home-dashboard-section') {
        currentViewContext = { type: 'home', data: null };
        // Le HTML est dÃ©jÃ  dans la page, on a juste besoin de le mettre Ã  jour.
        renderDashboard();
    } else if (dataLink === 'liked-titles-section') {
        // CORRECTION: Redirige l'ancien lien "liked-titles-section" vers la nouvelle bibliothÃ¨que
        handleMenuNavigation('library-section', updateHistory);
        return; // ArrÃªter l'exÃ©cution ici
    } else if (dataLink === 'library-section') {
        // CORRECTION DÃ‰FINITIVE : On met Ã  jour le contexte de la vue actuelle AVANT d'appeler render/show. C'est cet Ã©tat qui sera sauvegardÃ© dans l'historique.
        currentViewContext = { type: 'library', data: activeTabForLibrary };
        renderLibraryPage(activeTabForLibrary); // Affiche la bibliothÃ¨que avec l'onglet spÃ©cifiÃ©
        // NOUVEAU: Ajout de la gestion de la page boutique
        const shopSection = UI.shopSection;
        if (shopSection && !shopSection.classList.contains('hidden')) {
            renderShopPage();
        }

    } else if (dataLink === 'shop-section') {
        const activeShopTab = (effectiveContext && effectiveContext.type === 'shop' && effectiveContext.data) ? effectiveContext.data : 'themes';
        currentViewContext = { type: 'shop', data: activeShopTab };
        renderShopPage(activeShopTab);
    } else if (dataLink === 'contents-albums-section') {
        currentViewContext = { type: 'contents', data: null };
        window.renderContentsAlbumSelectionPage();
    } else if (dataLink === 'contents-section') {
        // Render the unified Contents page.
        currentViewContext = effectiveContext?.type === 'contents-album'
            ? effectiveContext
            : { type: 'contents', data: null };
        renderContentsPage();
    } else if (dataLink === 'video-list-section') {
        // NOUVEAU: GÃ¨re la navigation vers la liste des vidÃ©os d'un album
        currentViewContext = effectiveContext;
        if (effectiveContext && effectiveContext.type === 'video-list' && effectiveContext.data) {
            renderVideoList(effectiveContext.data, effectiveContext.tab || 'clips');
        }
    } else if (dataLink === 'search-results-section') {
        // CORRECTION: RafraÃ®chir les rÃ©sultats de recherche
        updateVisibleCards(effectiveContext?.data);
    } else if (sections[dataLink]) { // Handle other generic sections
        currentViewContext = { type: sections[dataLink].type, data: null };
        const cardType = sections[dataLink].type;
        const containerId = sections[dataLink].container;
        renderCards(containerId, sections[dataLink].data, cardType);
    } else if (dataLink === 'recommended-playlists-section') {
        // NOUVEAU: Gestion de la page "Toutes les playlists recommandÃ©es"
        currentViewContext = { type: 'recommended-playlists', data: null };
        renderAllRecommendedPlaylistsPage();
    } else if (dataLink === 'upcoming-release-section') {
        // NOUVEAU: Page Prochaine Sortie
        currentViewContext = { type: 'upcoming', data: null };
        renderUpcomingReleasePage();
    } else if (dataLink === 'news-details-section') {
        // NOUVEAU: Page DÃ©tails News
        const newsId = effectiveContext?.data;
        currentViewContext = { type: 'news', data: newsId };
        renderNewsDetailsPage(newsId);
    } else if (['media-details-section', 'video-clip-details-section', 'video-making-of-details-section'].includes(dataLink)) {
        const itemId = effectiveContext?.data;
        if (itemId) {
            const item = findItemById(itemId);
            // On redirige toujours vers la section principale pour le DOM (évite erreur YouTube)
            if (item) renderMusicTitleDetails(item, false);
        }
        // Force la section réelle pour le DOM car les autres sont des alias vides
        dataLink = 'media-details-section';
    }

    unhighlightPlayingCard();
    showSection(dataLink, updateHistory, previousContext);

    // CORRECTION: RÃ©appliquer le surlignage si on est restÃ© sur la mÃªme section (ex: changement de vue)
    // car showSection retourne tÃ´t dans ce cas et ne rappelle pas highlightPlayingCard.
    if (currentPlayingItem) {
        highlightPlayingCard(currentPlayingItem);
    }
}
// Logic for mobile search listeners moved to setupEventListeners for reliability


// =========================================================
// Drag & Drop — extrait dans js/mmg-dragdrop.js
// =========================================================

// NOUVEAU: Affiche la notification de mise Ã  jour
function showUpdateNotification(registration) {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div style="display:flex; flex-direction:column;">
            <span style="font-weight:800; font-size:1rem;">${getTranslation('updateAvailableTitle') || 'Update available'}</span>
            <span style="font-size:0.8rem; opacity:0.8;">${getTranslation('updateAvailableDesc') || 'A new version of the site is ready.'}</span>
        </div>
        <button id="reload-btn">${getTranslation('updateAvailableButton') || 'Update'}</button>
    `;
    document.body.appendChild(notification);
    playAudio(sounds.notification);

    document.getElementById('reload-btn').addEventListener('click', () => {
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    });
}

// --- INITIALIZATION HANDSHAKE ---
// On attend que les données soient chargées (mmg-data.js) avant de lancer l'initialisation Core.
if (window.dataLoadedPromise) {
    window.dataLoadedPromise.then(() => {
        if (typeof initializeApp === 'function') {
            initializeApp();
        }
    }).catch(err => {
        console.error("Critical: Initialization failed after data load", err);
    });
} else {
    // Fallback si mmg-data.js n'a pas encore créé la promise (peu probable vu le load order)
    document.addEventListener('DOMContentLoaded', () => {
        if (window.dataLoadedPromise) {
            window.dataLoadedPromise.then(() => initializeApp());
        }
    });
}
