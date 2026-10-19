// =========================================================
// MMG UI CONTROLS MODULE — Overlays, Menus et Interactions
// =========================================================

let activeOverlay = null;
let activeCardMenu = null;

// --- GESTION DES OVERLAYS ---

function openOverlay(overlay, sound, keepMusicPlaying = false) {
    if (activeOverlay === overlay) return;

    if (!keepMusicPlaying) {
        pausedForOverlay = (activePlayer && typeof activePlayer.getPlayerState === 'function' && activePlayer.getPlayerState() === YT.PlayerState.PLAYING);
        if (pausedForOverlay) {
            activePlayer.pauseVideo();
        }
    }

    if (activeOverlay) {
        activeOverlay.classList.add('hidden');
    }

    const isMobile = window.innerWidth <= 952;
    const settingsCard = overlay.querySelector('.settings-card');

    activeOverlay = overlay;
    
    // NOUVEAU: On prépare l'opacité pour la transition
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s ease';
    overlay.style.pointerEvents = '';
    overlay.classList.remove('hidden');

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        if (isMobile && settingsCard) {
            void settingsCard.offsetWidth;
            settingsCard.style.transform = 'translateY(0)';
        }
    });

    if (sound) playAudio(sound);

    if (overlay.id === 'settings-overlay') {
        updateViewSwitcherUI();
    }

    if (overlay.id === 'notifications-overlay') {
        renderUpdateLog();
    }

    if (overlay.id === 'playlist-overlay') {
        renderPlaylist();
    }

    if (overlay.id === 'queue-overlay') {
        renderQueue();
    }

    if (overlay.id === 'wifi-overlay') {
        if (sounds.connecting && !sounds.connecting.getAttribute('src')) {
            sounds.connecting.src = 'assets/sounds/connecting.ogg';
            sounds.connecting.load();
        }
        playAudio(sounds.connecting, true);
        sounds.connecting.onended = () => {
            if (activeOverlay && activeOverlay.id === 'wifi-overlay') {
                closeOverlay(sounds.back);
                if (typeof updateAchievementProgress === 'function') updateAchievementProgress('patienceIsKey');
                showDialog(getTranslation("connectionSuccess"));
            }
        };
    }
}

function closeOverlay(sound) {
    if (document.body.classList.contains('guide-active')) return;
    if (!activeOverlay) return;

    const overlayToClose = activeOverlay;
    overlayToClose.style.pointerEvents = 'none';
    const isMobile = window.innerWidth <= 952;
    const settingsCard = overlayToClose.querySelector('.settings-card');

    if (isMobile && settingsCard && overlayToClose.id !== 'wifi-overlay' && overlayToClose.id !== 'purchase-confirm-overlay') {
        settingsCard.style.transform = 'translateY(100%)';
        overlayToClose.style.opacity = '0';
        setTimeout(() => {
            overlayToClose.classList.add('hidden');
            overlayToClose.style.pointerEvents = '';
        }, 400);
    } else {
        overlayToClose.style.opacity = '0';
        setTimeout(() => {
            overlayToClose.classList.add('hidden');
            overlayToClose.style.pointerEvents = '';
        }, 400);
    }

    const keepMusicPlaying = overlayToClose.id === 'tags-filter-overlay' || (overlayToClose.id === 'tutorial-overlay' && (typeof isTutorialActive === 'undefined' || !isTutorialActive));
    
    if (overlayToClose.id === 'wifi-overlay' && sounds.connecting) {
        sounds.connecting.pause();
        sounds.connecting.currentTime = 0;
        sounds.connecting.onended = null;
    }

    activeOverlay = null;
    if (sound) playAudio(sound);

    if (!keepMusicPlaying && pausedForOverlay) {
        if (activePlayer) {
            isResumingFromOverlay = true;
            activePlayer.playVideo();
        }
    }
    pausedForOverlay = false;
}

window.closeAllOverlays = function () {
    const overlays = document.querySelectorAll('.overlay, [id$="-overlay"]');
    overlays.forEach(overlay => {
        overlay.classList.add('hidden');
    });
    activeOverlay = null;
};

// --- MENUS CONTEXTUELS (CARD MENU) ---

function openCardMenu(event, itemId) {
    closeCardMenu();
    const item = findItemById(itemId);
    if (!item) return;

    const isLiked = likedSongs.has(itemId);
    const isInPlaylist = typeof _playlistSet !== 'undefined' ? _playlistSet.has(itemId) : false;
    const isMobile = window.innerWidth <= 952;
    const activeProfile = getActiveProfile();
    const artistName = activeProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';

    if (isMobile) {
        playAudio(sounds.select);
        const overlay = document.createElement('div');
        overlay.className = 'mobile-card-menu-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'transparent';
        overlay.style.backdropFilter = 'blur(3px)';
        overlay.style.webkitBackdropFilter = 'blur(3px)';
        overlay.style.zIndex = '2000';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.pointerEvents = 'auto';

        overlay.onclick = function (e) {
            if (e.target === this) closeCardMenu();
        };

        const panel = document.createElement('div');
        panel.className = 'settings-card mobile-card-menu-panel';
        panel.style.transform = 'translateY(100%)';
        panel.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        panel.style.pointerEvents = 'auto';

        panel.innerHTML = `
            <div class="mobile-player-handle"></div>
            <button class="close-btn" onclick="closeCardMenu()">${window.APP_ICONS.close}</button>
            <div class="mobile-card-menu-header">
                <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}" class="mobile-card-menu-img">
                <div class="mobile-card-menu-info">
                    <h3 class="mobile-card-menu-title">${item.title}</h3>
                    <p class="mobile-card-menu-artist">${artistName}</p>
                </div>
            </div>
            <div class="mobile-card-menu-items">
                <button class="mobile-card-menu-item" onclick="event.stopPropagation(); handleMenuAction('like', '${itemId}', this)">
                    <span class="icon-span ${isLiked ? 'active' : ''}">${isLiked ? window.APP_ICONS.heartFilled : window.APP_ICONS.heart}</span>
                    <span>${isLiked ? (getTranslation('removeLike') || 'Retirer') : (getTranslation('like') || 'Liker')}</span>
                </button>
                <button class="mobile-card-menu-item" onclick="event.stopPropagation(); handleMenuAction('playlist', '${itemId}', this)">
                    <span class="icon-span ${isInPlaylist ? 'added' : ''}">${isInPlaylist ? window.APP_ICONS.check : window.APP_ICONS.plus}</span>
                    <span>${getTranslation('playlist') || 'Playlist'}</span>
                </button>
                <button class="mobile-card-menu-item" onclick="event.stopPropagation(); handleMenuAction('playNext', '${itemId}', this)">
                    <span class="icon-span">${window.APP_ICONS.next}</span>
                    <span>${getTranslation('playNext') || 'Suivant'}</span>
                </button>
                <button class="mobile-card-menu-item" onclick="event.stopPropagation(); handleMenuAction('queue', '${itemId}', this)">
                    <span class="icon-span">${window.APP_ICONS.list}</span>
                    <span>${getTranslation('queue')}</span>
                </button>
                <button class="mobile-card-menu-item" onclick="event.stopPropagation(); handleMenuAction('share', '${itemId}', this)">
                    <span class="icon-span">${window.APP_ICONS.share}</span>
                    <span>${getTranslation('share') || 'Partager'}</span>
                </button>
            </div>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        activeCardMenu = { overlay, panel, isMobile: true };

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });

    } else {
        const menu = document.createElement('div');
        menu.className = 'card-menu-dropdown';

        menu.innerHTML = `
            <button class="card-menu-item" onclick="handleMenuAction('like', '${itemId}', this)">
                <span class="icon-span ${isLiked ? 'active' : ''}">${isLiked ? window.APP_ICONS.heartFilled : window.APP_ICONS.heart}</span>
                <span>${isLiked ? getTranslation('removeLike') : getTranslation('like')}</span>
            </button>
            <button class="card-menu-item" onclick="handleMenuAction('playlist', '${itemId}', this)">
                <span class="icon-span ${isInPlaylist ? 'added' : ''}">${isInPlaylist ? window.APP_ICONS.check : window.APP_ICONS.plus}</span>
                <span>${getTranslation('playlist')}</span>
            </button>
            <button class="card-menu-item" onclick="handleMenuAction('playNext', '${itemId}', this)">
                <span class="icon-span">${window.APP_ICONS.next}</span>
                <span>${getTranslation('playNext')}</span>
            </button>
            <button class="card-menu-item" onclick="handleMenuAction('queue', '${itemId}', this)">
                <span class="icon-span">${window.APP_ICONS.list}</span>
                <span>${getTranslation('addToQueue')}</span>
            </button>
        `;

        document.body.appendChild(menu);
        activeCardMenu = menu;

        let x = event.clientX;
        let y = event.clientY;
        const menuRect = menu.getBoundingClientRect();
        if (x + menuRect.width > window.innerWidth) x = window.innerWidth - menuRect.width - 10;
        if (y + menuRect.height > window.innerHeight) y = window.innerHeight - menuRect.height - 10;

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        requestAnimationFrame(() => {
            menu.classList.add('visible');
        });

        setTimeout(() => {
            document.addEventListener('click', closeCardMenuOutside);
        }, 0);
    }
}

function closeCardMenu() {
    if (!activeCardMenu) return;

    if (activeCardMenu.isMobile) {
        const { overlay, panel } = activeCardMenu;
        if (overlay) {
            overlay.style.opacity = '0';
            panel.style.transform = 'translateY(100%)';
            playAudio(sounds.back);
            setTimeout(() => {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (activeCardMenu && activeCardMenu.overlay === overlay) activeCardMenu = null;
            }, 400);
        }
    } else {
        if (activeCardMenu && activeCardMenu.parentNode) activeCardMenu.parentNode.removeChild(activeCardMenu);
        activeCardMenu = null;
        document.removeEventListener('click', closeCardMenuOutside);
    }
}

function closeCardMenuOutside(event) {
    if (activeCardMenu && !activeCardMenu.isMobile) {
        if (!activeCardMenu.contains(event.target)) closeCardMenu();
    }
}

function handleMenuAction(action, itemId, buttonElement) {
    const item = findItemById(itemId);
    if (!item) return;

    if (action === 'like') {
        toggleLike(itemId);
        if (buttonElement) {
            const isLiked = likedSongs.has(itemId);
            const iconSpan = buttonElement.querySelector('.icon-span');
            const textSpan = buttonElement.querySelector('span:not(.icon-span)');
            if (iconSpan) {
                iconSpan.innerHTML = isLiked ? window.APP_ICONS.heartFilled : window.APP_ICONS.heart;
                iconSpan.classList.toggle('active', isLiked);
            }
            if (textSpan) textSpan.textContent = isLiked ? getTranslation('removeLike') : getTranslation('like');
        }
    } else if (action === 'playlist') {
        togglePlaylistItem(itemId);
        if (buttonElement) {
            const isInPlaylist = _playlistSet.has(itemId);
            const iconSpan = buttonElement.querySelector('.icon-span');
            const textSpan = buttonElement.querySelector('span:not(.icon-span)');
            if (iconSpan) {
                iconSpan.innerHTML = isInPlaylist ? window.APP_ICONS.check : window.APP_ICONS.plus;
                iconSpan.classList.toggle('added', isInPlaylist);
            }
            if (textSpan) textSpan.textContent = isInPlaylist ? (getTranslation('removePlaylist') || 'Retirer') : (getTranslation('playlist') || 'Playlist');
        }
    } else if (action === 'playNext') {
        playNext(itemId);
        if (typeof renderMusicTitleDetails === 'function') renderMusicTitleDetails(item);
        showSection('media-details-section');
        closeCardMenu();
    } else if (action === 'queue') {
        const isInQueue = PlaybackQueue.hasUser(itemId);
        if (isInQueue) {
            removeFromQueue(itemId);
            playAudio(sounds.back);
        } else {
            addToQueue(itemId);
        }
        if (buttonElement) {
            const iconSpan = buttonElement.querySelector('.icon-span');
            const textSpan = buttonElement.querySelector('span:not(.icon-span)');
            const nowInQueue = PlaybackQueue.hasUser(itemId);
            if (iconSpan) iconSpan.innerHTML = nowInQueue ? window.APP_ICONS.check : window.APP_ICONS.list;
            if (textSpan) textSpan.textContent = nowInQueue ? getTranslation('removeFromQueue') : getTranslation('queue');
        }
    } else if (action === 'share') {
        playAudio(sounds.select);
        shareItem(itemId);
    }
}

// --- CHEAT CODES ---

function setupCheatCodeListener() {
    const cheatBtn = document.getElementById('cheat-code-btn');
    if (!cheatBtn) return;
    
    cheatBtn.addEventListener('click', () => {
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
            shopNeedsUpdate = true;
        } else if (code === 'resetdaily') {
            safeStorage.removeItem('mmg-lastLoginDate');
            lastLoginDate = null;
            input.value = '';
            showDialog('Bonus quotidien réinitialisé. Actualisez la page.');
            playAudio(sounds.select);
        } else if (code === 'testupdate') {
            const mockRegistration = { waiting: { postMessage: (msg) => { if (msg.type === 'SKIP_WAITING') window.location.reload(); } } };
            if (typeof showUpdateNotification === 'function') showUpdateNotification(mockRegistration);
            input.value = '';
        } else {
            showDialog(getTranslation('incorrectCode'), false);
            playAudio(sounds.blocked);
        }

        if (shopNeedsUpdate && !UI.shopSection.classList.contains('hidden')) {
            if (typeof renderShopPage === 'function') renderShopPage();
        }
    });
}

// --- PARTAGE ---

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
            if (typeof logger !== 'undefined') logger.error('Erreur de partage:', err);
        }
    } else {
        navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${item.youtube_id}`)
            .then(() => showDialog(getTranslation('linkCopied')))
            .catch(err => showDialog(getTranslation('copyFailed')));
    }
}

// --- DIALOGUES ---

function showDialog(message, playSound = false) {
    if (!dom.customDialog || !dom.dialogMessage) return;
    if (message.includes('<')) dom.dialogMessage.innerHTML = message;
    else dom.dialogMessage.textContent = message;
    if (playSound) playAudio(sounds.notification);
    dom.customDialog.classList.remove('hidden');
    clearTimeout(showDialog._timeout);
    showDialog._timeout = setTimeout(() => dom.customDialog.classList.add('hidden'), 4000);
}

// --- THÈMES ---

function applyTheme(themeName) {
    const isBgTheme = siteData.shopItems.backgrounds.some(bg => bg.id === themeName);
    const { themes, backgrounds } = siteData.shopItems;

    if (isBgTheme) {
        safeStorage.setItem('bg-theme', themeName);
        backgrounds.forEach(bg => document.body.classList.remove(bg.id));
        if (themeName !== 'bg-default-theme') {
            document.body.classList.add(themeName);
        }
    } else {
        themes.forEach(theme => document.body.classList.remove(theme.id));
        document.body.classList.remove('ds-css');
        const themeSwitch = UI.themeSwitch;
        const isDefaultTheme = themeName === 'default';

        if (!isDefaultTheme) {
            document.body.classList.remove('dark-theme');
            if (themeSwitch) themeSwitch.checked = false;
            safeStorage.setItem('mmg-theme', 'light');
        }

        if (themeSwitch) {
            themeSwitch.disabled = !isDefaultTheme;
            themeSwitch.parentElement.classList.toggle('disabled-state', !isDefaultTheme);
        }

        if (themeName !== 'default') {
            document.body.classList.add(themeName);
            if (themeName === 'theme-ds') {
                document.body.classList.add('ds-css');
            }
        }

        if (!isDefaultTheme && safeStorage.getItem('bg-theme') !== 'bg-default-theme') {
            backgrounds.forEach(bg => document.body.classList.remove(bg.id));
            safeStorage.setItem('bg-theme', 'bg-default-theme');
        }

        safeStorage.setItem('ui-theme', themeName);
    }

    if (typeof renderShopItems === 'function') renderShopItems(false);
    updateThemeColorMeta();
}

function applyInitialTheme() {
    let savedTheme = safeStorage.getItem('mmg-theme') || 'light';
    let savedUiTheme = safeStorage.getItem('ui-theme') || 'default';
    let savedBgTheme = safeStorage.getItem('bg-theme') || 'bg-default-theme';
    if (savedBgTheme === 'bg-fond2') {
        savedBgTheme = 'bg-boxes';
        safeStorage.setItem('bg-theme', 'bg-boxes');
    }

    if (UI.themeSwitch) {
        UI.themeSwitch.checked = savedTheme === 'dark';
    }
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');

    if (savedUiTheme !== 'default') {
        document.body.classList.add(savedUiTheme);
        if (savedUiTheme === 'theme-ds') {
            document.body.classList.add('ds-css');
        }
    }

    const themeSwitch = UI.themeSwitch;
    if (themeSwitch) {
        const isDefault = savedUiTheme === 'default';
        themeSwitch.disabled = !isDefault;
        themeSwitch.parentElement.classList.toggle('disabled-state', !isDefault);
    }

    if (savedBgTheme !== 'bg-default-theme') {
        document.body.classList.add(savedBgTheme);
    }

    updateThemeColorMeta();
}

function updateThemeColorMeta() {
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const navBarMeta = document.querySelector('meta[name="theme-color"]');
    const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');

    const isDark = document.body.classList.contains('dark-theme');
    let themeColor = '#ffffff';
    let navColor = '#ffffff';

    if (isDark) {
        themeColor = '#000000';
        navColor = '#000000';
    } else {
        const currentUiTheme = safeStorage.getItem('ui-theme') || 'default';
        if (currentUiTheme === 'theme-aero') {
            themeColor = '#e3f2fd';
            navColor = '#e3f2fd';
        } else if (currentUiTheme === 'theme-glass') {
            themeColor = '#ffffff';
            navColor = '#ffffff';
        } else {
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

