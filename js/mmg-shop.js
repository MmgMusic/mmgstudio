// =========================================================
// SHOP — Rendu & Listeners
// Extrait de mmg-music-contents.js pour alléger le bundle principal.
// Toutes les variables globales (siteData, sounds, etc.) sont
// accessibles car ce script est chargé après mmg-music-contents.js.
// =========================================================

function renderShopPage(activeTabId = 'themes', animate = true) {
    if (typeof lucide !== 'undefined') {
        // lucide.createIcons(); retiré
    }
    updateCoinDisplay();

    // D'abord on génère le contenu des grilles
    renderShopItems(animate);

    // Ensuite on génère les onglets et on affiche le bon
    renderShopTabs(activeTabId);
    showShopTab(activeTabId);

    // Applique la logique de défilement aux titres des produits de la boutique.
    TitleScroller.observe('.shop-product-title > span');
}

// Fonction pour générer les onglets de la boutique
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
    requestAnimationFrame(() => updateSlidingIndicator(container));

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

            // Maintient le contexte
            if (currentViewContext && currentViewContext.type === 'shop') {
                currentViewContext.data = tabId;
            }
        });
    });
}

// Fonction pour afficher le contenu de l'onglet actif
window.showShopTab = function (tabId) {
    ['themes-container', 'backgrounds-container', 'shop-tracks-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const targetId = tabId === 'tracks' ? 'shop-tracks-container' : `${tabId}-container`;
    const target = document.getElementById(targetId);
    if (target) target.classList.remove('hidden');

    // Met à jour l'état actif des onglets (pour la navigation depuis les notifications)
    const tabsContainer = document.getElementById('shop-tabs-container');
    if (tabsContainer) {
        tabsContainer.querySelectorAll('.playlist-tab-btn').forEach(btn => {
            if (btn.dataset.tabId === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        updateSlidingIndicator(tabsContainer);
    }
}

function renderShopItems(animate = true) {
    const themesContainer = document.getElementById('themes-container');
    const backgroundsContainer = document.getElementById('backgrounds-container');
    const tracksContainer = document.getElementById('shop-tracks-container');
    if (!themesContainer || !backgroundsContainer || !siteData.shopItems) return;

    const { backgrounds, themes } = siteData.shopItems;

    // --- Filtre des thèmes pour cacher les thèmes secrets ---
    const visibleThemes = themes.filter(theme => !theme.isSecret);

    // --- Rendu des Fonds d'écran ---
    backgroundsContainer.innerHTML = backgrounds.map(item => {
        const currentUiTheme = safeStorage.getItem('ui-theme') || 'default';
        const isRestricted = currentUiTheme !== 'default' && item.id !== 'bg-default-theme';
        const isPurchased = item.id === 'bg-default-theme' || purchasedShopItems.has(item.id) || item.cost === 0;
        const selectedBg = safeStorage.getItem('bg-theme') || 'bg-default-theme';
        const isSelected = selectedBg === item.id;

        let subtitle = '';
        let rightIcon = '';
        let itemClasses = 'shop-list-item';
        if (animate) itemClasses += ' animated';

        if (isRestricted) {
            itemClasses += ' locked';
            subtitle = `<span style="color: #ef4444; font-weight: 700; font-size: 0.75em;">DEFAULT THEMES ONLY</span>`;
            rightIcon = ``;
        } else if (isSelected) {
            itemClasses += ' selected';
            subtitle = `<span class="shop-item-status-text" style="color: var(--active-color); font-weight:600;">${getTranslation('themeUnlocked')}</span>`;
            rightIcon = `<span style="color: var(--active-color); width: 20px; height: 20px; display: flex;">${window.APP_ICONS.check}</span>`;
        } else if (isPurchased) {
            subtitle = `<span class="shop-item-status-text" style="color: var(--text-muted);">${getTranslation('themeUnlocked')}</span>`;
            rightIcon = ``;
        } else {
            itemClasses += ' buyable';
            subtitle = `<span>${getTranslation('buyToUnlock')}</span>`;
            rightIcon = `<span class="shop-item-price-badge" style="display:flex; align-items:center; gap:3px; font-weight:700; font-size:0.85em; color: var(--active-color); white-space:nowrap; flex-shrink:0;">${item.cost} ${COIN_SVG}</span>`;
        }

        const itemName = item.nameKey ? getTranslation(item.nameKey) : item.name;

        return `
            <div class="${itemClasses}" data-item-id="${item.id}" data-theme="${isPurchased && !isRestricted ? item.id : ''}">
                <div class="shop-list-img" style="position: relative;">
                    <img src="${item.image}" alt="${itemName}" width="60" height="60" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    ${!isPurchased && !isRestricted ? `
                    <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; border-radius:inherit;">
                        <span style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">${window.APP_ICONS.lock}</span>
                    </div>` : ''}
                </div>
                <div class="shop-list-content">
                    <p class="shop-list-title">${itemName}</p>
                    <p class="shop-list-subtitle">${subtitle}</p>
                </div>
                <div class="shop-list-actions">
                    ${rightIcon}
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
            } else if (['psPlayer', 'spotimonFan'].includes(item.missionId)) {
                currentProgress = ach.progress.length;
            } else if (item.missionId === 'dsExplorer') {
                currentProgress = (ach.progress?.computer ? 1 : 0) + (ach.progress?.mobile ? 1 : 0);
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

        let itemClasses = "shop-list-item";
        if (isSelected) itemClasses += " selected";
        if (!isUnlocked) itemClasses += " locked";
        if (animate) itemClasses += " animated";

        let subtitle = '';
        let rightIcon = '';

        if (isSelected) {
            subtitle = `<span class="shop-item-status-text selected">${getTranslation('themeUnlocked')}</span>`;
            rightIcon = `<span style="color: var(--active-color); width: 20px; height: 20px; display: flex;">${window.APP_ICONS.check}</span>`;
        } else if (isUnlocked) {
            subtitle = `<span class="shop-item-status-text unlocked">${getTranslation('themeUnlocked')}</span>`;
            rightIcon = ``;
        } else {
            subtitle = `<span>${missionDesc} (${currentProgress}/${goal})</span>`;
            rightIcon = ``;
        }

        return `
            <div class="${itemClasses}" data-item-id="${item.id}" data-theme="${isUnlocked ? item.id : ''}" data-mission-id="${item.missionId || ''}">
                <div class="shop-list-img" style="position: relative;">
                    <img src="${item.image || 'assets/shopthemepreviews/Preview-default.webp'}" alt="${itemName}" width="60" height="60" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    ${!isUnlocked ? `
                    <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; border-radius:inherit;">
                        <span style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">${window.APP_ICONS.lock}</span>
                    </div>` : ''}
                </div>
                <div class="shop-list-content">
                    <p class="shop-list-title">${itemName}</p>
                    <p class="shop-list-subtitle">${subtitle}</p>
                </div>
                <div class="shop-list-actions">
                    ${rightIcon}
                </div>
            </div>
        `;
    }).join('');

    // --- Rendu des Titres Exclusifs (Bloqués) ---
    if (tracksContainer) {
        tracksContainer.innerHTML = '';

        const lockedTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable && !unlockedDreamSeasonTracks.includes(t.id));

        if (lockedTracks.length > 0) {
            const tracksByAlbum = {};
            lockedTracks.forEach(track => {
                const albumId = track.albumId;
                if (!tracksByAlbum[albumId]) tracksByAlbum[albumId] = [];
                tracksByAlbum[albumId].push(track);
            });

            let html = '';
            for (const [albumId, tracks] of Object.entries(tracksByAlbum)) {
                let albumTitle = 'Album';
                const profileId = tracks[0].profile;
                const artistName = profileId === 'mmg-beats' ? 'Mmg Beats' : 'Mmg Music';

                for (const profile of Object.values(siteData.contentData)) {
                    if (profile.albums && profile.albums[albumId]) {
                        albumTitle = profile.albums[albumId].title;
                        break;
                    }
                }

                html += `<div class="section-header-simple" style="margin-top: 20px; margin-bottom: 10px;">
                            <h3 class="section-title" style="margin: 0; display: flex; align-items: center; gap: 8px;">
                                ${albumTitle}
                                <span style="opacity: 0.5;">${artistName}</span>
                            </h3>
                         </div>`;

                html += `<div class="shop-list-container">`;

                html += tracks.map(item => {
                    const itemArtistName = item.profile === 'mmg-beats' ? 'Mmg Beats' : 'Mmg Music';
                    return `
                    <div class="shop-list-item locked buyable ${animate ? 'animated' : ''}" data-item-id="${item.id}">
                        <div class="shop-list-img" style="position: relative;">
                            <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}" width="60" height="60" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; border-radius:inherit;">
                                <span style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">${window.APP_ICONS.lock}</span>
                            </div>
                        </div>
                        <div class="shop-list-content">
                            <p class="shop-list-title">${item.title}</p>
                            <p class="shop-list-subtitle">${getTranslation('buyToUnlock')}</p>
                        </div>
                        <div class="shop-list-actions">
                            <span class="shop-item-price-badge" style="display:flex; align-items:center; gap:3px; font-weight:700; font-size:0.85em; color: var(--active-color); white-space:nowrap; flex-shrink:0;">${COIN_COST_UNLOCK} ${COIN_SVG}</span>
                        </div>
                    </div>`;
                }).join('');

                html += `</div>`;
            }
            tracksContainer.innerHTML = html;
        }
    }
}

// =========================================================
// SHOP LISTENERS
// =========================================================

function setupShopListeners() {
    // Swipe entre onglets boutique
    const shopSection = UI.shopSection;
    if (shopSection) {
        let shopTouchStartX = 0, shopTouchStartY = 0;
        shopSection.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) { shopTouchStartX = e.touches[0].clientX; shopTouchStartY = e.touches[0].clientY; }
        }, { passive: true });
        shopSection.addEventListener('touchend', (e) => {
            if (e.changedTouches.length !== 1) return;
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const swipeDistance = touchEndX - shopTouchStartX;
            if (Math.abs(touchEndY - shopTouchStartY) > Math.abs(swipeDistance) || Math.abs(swipeDistance) < 50) return;
            const tabs = Array.from(document.querySelectorAll('#shop-tabs-container .playlist-tab-btn'));
            const activeIndex = tabs.findIndex(tab => tab.classList.contains('active'));
            let newIndex = activeIndex;
            if (swipeDistance < 0 && activeIndex < tabs.length - 1) newIndex++;
            else if (swipeDistance > 0 && activeIndex > 0) newIndex--;
            if (newIndex !== activeIndex) tabs[newIndex].click();
        }, { passive: true });
    }

    // Thèmes verrouillés
    const themesContainer = document.getElementById('themes-container');
    if (themesContainer) {
        themesContainer.addEventListener('click', (e) => {
            const lockedThemeCard = e.target.closest('.theme-row-premium.locked, .shop-list-item.locked');
            if (!lockedThemeCard || e.target.closest('button')) return;
            const missionId = lockedThemeCard.dataset.missionId;
            if (!missionId) return;
            e.preventDefault();
            e.stopPropagation();
            playAudio(sounds.blocked);
            const missionName = getTranslation(`achievement_${missionId}_title`);
            showDialog(`${getTranslation('finishMission')} "${missionName}"`);
            document.querySelectorAll('.theme-row-premium.active').forEach(c => {
                if (c !== lockedThemeCard) c.classList.remove('active');
            });
            lockedThemeCard.classList.toggle('active');
            if (lockedThemeCard.classList.contains('active')) playAudio(sounds.select);
        });
    }
}

// Logique de la boutique dans un écouteur global pour garantir qu'elle fonctionne partout.
document.body.addEventListener('click', (e) => {
    const card = e.target.closest('.shop-product-card, .shop-list-item, .theme-row-premium');
    const selectBtn = e.target.closest('.theme-buy-btn');
    const buyBtn = e.target.closest('.shop-buy-btn');

    if (!card && !selectBtn && !buyBtn) return;

    let actionTarget = null;
    if (selectBtn) {
        actionTarget = selectBtn;
    } else if (buyBtn) {
        actionTarget = buyBtn;
    } else if (card) {
        if (!card.classList.contains('locked') || card.querySelector('.shop-buy-btn')) {
            actionTarget = card.querySelector('.theme-buy-btn, .shop-buy-btn');
        }
    }

    const itemId = buyBtn?.dataset.itemId || actionTarget?.dataset.itemId || card?.dataset.itemId;
    if (!itemId) return;

    if (card && card.dataset.theme && !card.classList.contains('locked') && !card.classList.contains('selected') && !e.target.closest('.shop-buy-btn') && !card.classList.contains('mobile-only')) {
        const themeToApply = card.dataset.theme;
        applyTheme(themeToApply);
        playAudio(sounds.select);
        return;
    }

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

    const isBuyable = card && card.classList.contains('buyable');

    if (buyBtn || (actionTarget && actionTarget.classList.contains('shop-buy-btn')) || isBuyable) {
        e.preventDefault();
        e.stopPropagation();

        // Cas 1: Arrière-plan
        const bgItem = siteData.shopItems.backgrounds.find(b => b.id === itemId);
        if (bgItem) {
            if (userCoins >= bgItem.cost) {
                userCoins -= bgItem.cost;
                purchasedShopItems.add(bgItem.id);
                safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
                safeStorage.setItem('mmg-purchasedItems', JSON.stringify([...purchasedShopItems]));
                playAudio(sounds.coin);
                showDialog(getTranslation('purchaseSuccess'));
                updateCoinDisplay();
                unlockCardUI(bgItem.id, true);
                renderShopItems(false);
                renderUpdateLog();
                updateNotificationDot();
            } else {
                showDialog(getTranslation('notEnoughCoins'));
                playAudio(sounds.blocked);
            }
            return;
        }

        // Cas 2: Titre musical (Track)
        const trackItem = findItemById(itemId);
        if (trackItem && trackItem.isUnlockable) {
            if (userCoins >= COIN_COST_UNLOCK) {
                userCoins -= COIN_COST_UNLOCK;
                unlockedDreamSeasonTracks.push(itemId);
                safeStorage.setItem('mmg-userCoins', JSON.stringify(userCoins));
                safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));
                playAudio(sounds.coin);
                showDialog(`${getTranslation('youUnlocked')} "${trackItem.title}"!`);
                updateCoinDisplay();
                renderShopItems(false);
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
