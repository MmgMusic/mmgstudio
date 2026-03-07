/**
 * js/mmg-music-ui-render.js
 * Handles all UI rendering for the Mmg Studio application.
 */

function renderSidebarNav(activeProfile, currentSectionId = null) {
    const navContainer = document.getElementById('sidebar-main-nav');
    if (!navContainer) return;

    if (!currentSectionId) {
        currentSectionId = document.querySelector('.page-section:not(.hidden)')?.id || 'home-dashboard-section';
    }

    const menuData = siteData.projectData[activeProfile];
    if (!menuData) return;

    navContainer.innerHTML = Object.entries(menuData)
        .filter(([key, item]) => item && item.link) // CORRECTION: Filter out nulls or items without links
        .map(([key, item]) => `
        <a href="#${item.link}" 
           class="sidebar-nav-link ${item.link === currentSectionId ? 'active' : ''}" 
           data-link="${item.link}">
            <i class="fas ${item.icon}"></i>
            <span>${getTranslation(item.langKey)}</span>
        </a>
    `).join('');

    renderSidebarBranding(activeProfile);
}

function renderSidebarBranding(activeProfile) {
    const mmgBranding = document.getElementById('mmg-branding');
    if (mmgBranding) {
        mmgBranding.classList.toggle('is-beats', activeProfile === 'mmg-beats');
        const title = mmgBranding.querySelector('.branding-title');
        const subtitle = mmgBranding.querySelector('.branding-subtitle');
        if (title) title.textContent = activeProfile === 'mmg-beats' ? 'MMG BEATS' : 'MMG MUSIC';
        if (subtitle) subtitle.textContent = activeProfile === 'mmg-beats' ? 'Control Core' : 'Control Core';
    }
}

function renderCards(containerId, items, type, animate = true) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentView = localStorage.getItem('mmg-global-view') || 'grid';
    container.classList.toggle('list-view', currentView === 'list');

    const profile = getActiveProfile();
    const itemsArray = Array.isArray(items) ? items : Object.values(items);

    if (itemsArray.length === 0) {
        container.innerHTML = `<p class="no-results" style="padding: 40px; text-align: center; width: 100%; opacity: 0.7;">${getTranslation('noResults')}</p>`;
        return;
    }

    container.innerHTML = itemsArray.map(item => {
        if (currentView === 'list') return createListViewCard(item, type, profile);
        return createGridViewCard(item, type, profile);
    }).join('');

    if (animate) {
        requestAnimationFrame(() => {
            container.querySelectorAll('.card').forEach((card, index) => {
                setTimeout(() => card.classList.add('visible'), index * 30);
            });
        });
    } else {
        container.querySelectorAll('.card').forEach(card => card.classList.add('visible'));
    }
}

function createGridViewCard(item, type, profile) {
    const isLocked = item.isUnlockable && !unlockedDreamSeasonTracks.includes(item.id);
    const isLiked = likedSongs.has(item.id);
    const title = item.title || getTranslation(item.langKey);
    const subtitle = type === 'album' ? getTranslation('album') : (item.subtitle || profile);

    return `
        <div class="card ${isLocked ? 'locked' : ''}" data-item-id="${item.id}" data-item-type="${type}">
            <div class="card-image-container">
                <img src="${getCorrectImagePath(item, 'thumb')}" alt="${title}" loading="lazy">
                ${isLocked ? `<div class="lock-overlay"><i class="fas fa-lock"></i></div>` : ''}
                <div class="card-play-btn"><i class="fas fa-play"></i></div>
            </div>
            <div class="card-info">
                <h4 class="card__title">${title}</h4>
                <p class="card__description">${subtitle}</p>
            </div>
            ${!isLocked ? `<button class="card-like-btn ${isLiked ? 'liked' : ''}"><i class="${isLiked ? 'fas' : 'far'} fa-heart"></i></button>` : ''}
        </div>
    `;
}

function createListViewCard(item, type, profile) {
    const isLocked = item.isUnlockable && !unlockedDreamSeasonTracks.includes(item.id);
    const isLiked = likedSongs.has(item.id);
    const title = item.title || getTranslation(item.langKey);
    const subtitle = item.subtitle || profile;

    return `
        <div class="card list-view-card ${isLocked ? 'locked' : ''}" data-item-id="${item.id}" data-item-type="${type}">
            <div class="list-view-img">
                <img src="${getCorrectImagePath(item, 'thumb')}" alt="${title}" loading="lazy">
                ${isLocked ? `<div class="list-view-lock-overlay"><i class="fas fa-lock"></i></div>` : ''}
            </div>
            <div class="list-view-info">
                <h4 class="card__title">${title}</h4>
                <p class="card__description">${subtitle}</p>
            </div>
            <div class="list-view-actions">
                ${!isLocked ? `<button class="list-view-like-btn ${isLiked ? 'liked' : ''}"><i class="${isLiked ? 'fas' : 'far'} fa-heart"></i></button>` : ''}
                <i class="fas fa-chevron-right list-view-arrow"></i>
            </div>
        </div>
    `;
}

function renderDashboard() {
    renderHeroAccordion();
    renderDailyBonusProgress();
    renderRecommendedPlaylists();
    renderNewsList();

    const activeProfile = getActiveProfile();
    const avatarUrl = activeProfile === 'mmg-music' ? 'assets/mmg-music-avatar.webp' : 'assets/mmg-beats-avatar.webp';
    const aboutTextKey = `about_${activeProfile.replace('-', '_')}`;

    const aboutAvatar = document.getElementById('dashboard-about-avatar');
    const aboutDesc = document.getElementById('dashboard-about-description');
    const aboutTitle = document.querySelector('.about-card-title');

    if (aboutAvatar && aboutDesc) {
        aboutAvatar.src = avatarUrl;
        aboutDesc.textContent = getTranslation(aboutTextKey);
    }

    if (aboutTitle) {
        aboutTitle.textContent = activeProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';
    }

    const aboutSwitchBtn = document.getElementById('about-switch-profile-btn');
    if (aboutSwitchBtn) {
        const targetProfileName = activeProfile === 'mmg-music' ? 'Beats' : 'Music';
        const switchText = aboutSwitchBtn.querySelector('.switch-text');
        if (switchText) switchText.textContent = `Switch to ${targetProfileName}`;
    }

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

function renderHeroAccordion() {
    const container = document.getElementById('hero-accordion-container');
    if (!container) return;

    const activeProfile = getActiveProfile();
    const allTitles = Object.entries(siteData.contentData[activeProfile].titles)
        .filter(([id, title]) => !title.isUnlockable || unlockedDreamSeasonTracks.includes(id))
        .map(([_, title]) => title);

    const latestItem = allTitles.sort((a, b) => new Date(b.year, 0, 1) - new Date(a.year, 0, 1))[0];
    const bgImageSize = window.innerWidth <= 952 ? 'thumb' : 'full';
    const upcomingData = siteData.projectData[activeProfile]?.upcoming;
    const upcomingImage = upcomingData ? upcomingData.image : "assets/backgrounds/Background 3.webp";
    const upcomingTitle = upcomingData ? upcomingData.title : (getTranslation("noUpcomingTitle") || "No Upcoming Release");
    const upcomingButton = upcomingData
        ? `<button class="hero-button dashboard-card-button" data-link="upcoming-release-section" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.5); padding: 10px 24px; border-radius: 20px; font-weight: bold; font-size: 0.8rem; backdrop-filter: blur(5px);">${getTranslation('viewDetails')}</button>`
        : `<p style="font-size: 0.7rem; opacity: 0.6; margin-top: 10px;">${getTranslation("checkBackSoon") || "Stay tuned!"}</p>`;

    container.innerHTML = `
        <div id="panel-1" class="accordion-panel active" onclick="handleHeroClick(event, 'panel-1')">
            <div class="panel-bg" style="background-image: url('${getCorrectImagePath(latestItem, bgImageSize)}');"></div>
            <div class="panel-overlay"></div>
            <div class="panel-collapsed-label">
                <i class="fas fa-star" style="color: #3b82f6; font-size: 1rem;"></i> ${getTranslation('lastRelease').replace(' ', '<br>')}
            </div>
            <div class="panel-content">
                <h1 class="hero-title">${latestItem.title}</h1>
                <button class="hero-button dashboard-card-button" data-youtube-id="${latestItem.youtube_id}" data-item-id="${latestItem.id}" style="background: white; color: black; border: none; padding: 10px 24px; border-radius: 20px; font-weight: bold; font-size: 0.8rem;">${getTranslation('listenNow')}</button>
            </div>
        </div>
        <div id="panel-2" class="accordion-panel" onclick="handleHeroClick(event, 'panel-2')">
            <div class="panel-bg" style="background-image: url('${upcomingImage}');"></div>
            <div class="panel-overlay"></div>
            <div class="panel-collapsed-label">
                <i class="fas fa-clock" style="color: #facc15; font-size: 1rem;"></i> ${getTranslation('nextRelease').replace(' ', '<br>')}
            </div>
            <div class="panel-content">
                <h1 class="hero-title">${upcomingTitle}</h1>
                ${upcomingButton}
            </div>
        </div>
        <div class="accordion-dots">
            <div id="dot-1" class="accordion-dot active"></div>
            <div id="dot-2" class="accordion-dot"></div>
        </div>
    `;
    startHeroAccordionAutoScroll();
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
    const savedPlaylistTabs = Object.keys(savedPlaylists).map(nameKey => ({ id: nameKey, title: getTranslation(nameKey) || nameKey }));
    tabsContainer.innerHTML = [...tabs, ...savedPlaylistTabs].map(tab =>
        `<button class="playlist-tab-btn ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}" title="${tab.title}">${tab.title}</button>`
    ).join('');

    tabsContainer.classList.add('sliding-tabs');
    setTimeout(() => updateSlidingIndicator(tabsContainer), 0);

    let itemsToShow = [];
    let isCustomPlaylist = false;

    if (activeTabId === 'liked') {
        itemsToShow = [...likedSongs].map(id => findItemById(id)).filter(item => {
            if (!item) return false;
            return !(item.isUnlockable && !unlockedDreamSeasonTracks.includes(item.id));
        });
        titleElement.textContent = getTranslation('likedTitles');
    } else if (activeTabId === 'current') {
        itemsToShow = currentPlaylist.map(id => findItemById(id)).filter(item => item !== null);
        titleElement.textContent = getTranslation('currentPlaylist');
    } else if (savedPlaylists[activeTabId]) {
        itemsToShow = savedPlaylists[activeTabId].map(id => findItemById(id)).filter(item => item !== null);
        titleElement.textContent = getTranslation(activeTabId) || activeTabId;
        isCustomPlaylist = true;
    }

    if (clearBtn) clearBtn.style.display = (activeTabId === 'current') ? 'flex' : 'none';

    const itemsAsObject = itemsToShow.reduce((acc, item) => {
        if (item) acc[item.id] = item;
        return acc;
    }, {});

    renderCards('library-container', itemsAsObject, 'title');

    const libraryContainer = document.getElementById('library-container');
    const globalView = localStorage.getItem('mmg-global-view') || 'grid';
    const isListView = globalView === 'list';
    libraryContainer.classList.toggle('titles-grid', !isListView);
    libraryContainer.classList.toggle('list-view', isListView);

    if (currentPlayingItem) highlightPlayingCard(currentPlayingItem);

    if (itemsToShow.length === 0) {
        let emptyMessageKey = 'noResults';
        if (activeTabId === 'liked') emptyMessageKey = 'noLikedTitles';
        else if (activeTabId === 'current') emptyMessageKey = 'playlistEmpty';
        libraryContainer.innerHTML = `<p style="font-size: 1.2em; opacity: 0.7; text-align: center; padding: 40px 20px; width: 100%;">${getTranslation(emptyMessageKey)}</p>`;
    }
}

function renderNewsList() {
    const container = document.querySelector('.news-scroll');
    if (!container) return;

    if (!newsData || Object.keys(newsData).length === 0) {
        container.innerHTML = '<p style="padding: 20px; opacity: 0.7;">Aucune actualité pour le moment.</p>';
        return;
    }

    container.innerHTML = Object.entries(newsData).map(([id, news]) => {
        const localized = news[currentLang] || news['fr'] || news['en'];
        return `
            <div class="news-item clickable-news" data-news-id="${id}">
                <div class="news-img" style="background-image: url('${localized.image}');"></div>
                <div class="news-body">
                    <h4 class="news-headline">${localized.headline}</h4>
                </div>
            </div>
        `;
    }).join('');
}

function renderNewsDetailsPage(newsId) {
    const container = document.getElementById('news-details-content');
    if (!container) return;

    const newsEntry = newsData[newsId];
    if (!newsEntry) {
        container.innerHTML = '<p>Article non trouvé.</p>';
        return;
    }

    const news = newsEntry[currentLang] || newsEntry['fr'] || newsEntry['en'];
    container.innerHTML = `
        <div class="news-article-view">
            <header class="news-article-header">
                <div class="news-article-header-image">
                    <img src="${news.image}" alt="${news.title}" class="news-article-img-header">
                </div>
                <div class="news-article-header-text">
                    <h2 class="news-article-title">${news.title}</h2>
                    <div class="news-article-meta">
                        <span class="news-date-badge"><i class="far fa-calendar-alt"></i> ${news.date}</span>
                    </div>
                </div>
            </header>
            <div class="news-article-body">
                <div class="news-article-content">${news.content.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')}</div>
            </div>
        </div>
    `;
}

function renderUpcomingReleasePage() {
    const container = document.getElementById('upcoming-release-content');
    if (!container) return;

    const activeProfile = getActiveProfile();
    const upcomingData = siteData.projectData[activeProfile]?.upcoming;

    if (!upcomingData) {
        container.innerHTML = `
            <div style="padding: 100px 20px; text-align: center; opacity: 0.7;">
                <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 20px; color: var(--active-color);"></i>
                <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 10px;">${getTranslation('noUpcomingTitle') || 'No Upcoming Release'}</h2>
                <p>${getTranslation('noUpcomingDesc') || 'Stay tuned for future releases!'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="upcoming-release-view">
            <div class="upcoming-release-cover">
                <img src="${upcomingData.image}" alt="${upcomingData.title}">
            </div>
            <div class="upcoming-release-content">
                <span class="upcoming-release-badge">
                    <i class="fas fa-clock"></i> SORTIE À VENIR
                </span>
                <h2 class="upcoming-release-title">${upcomingData.title}</h2>
                <div class="upcoming-release-desc">
                    <p>${getTranslation(upcomingData.descriptionKey)}</p>
                </div>
                <div class="upcoming-release-actions">
                    <button class="hero-button primary disabled" style="opacity: 0.5; cursor: not-allowed;" disabled>
                        ${getTranslation('comingSoon')}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderRecommendedPlaylists() {
    const container = document.getElementById('playlist-reco-list');
    if (!container) return;

    const activeProfile = getActiveProfile();
    const recommendedPlaylists = siteData.projectData[activeProfile]?.recommendedPlaylists || [];

    if (recommendedPlaylists.length === 0) {
        // CORRECTION: Si pas de playlists (ex: mmg-beats), on affiche un placeholder propre
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; opacity: 0.5;">
                <p style="font-weight: 700; font-size: 0.9rem; margin-bottom: 5px;">${getTranslation('noRecommendedPlaylists') || 'No Recommended Playlists'}</p>
                <p style="font-size: 0.75rem;">${getTranslation('comingSoon') || 'Coming soon...'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recommendedPlaylists.map(playlist => {
        const isSaved = savedPlaylists[playlist.nameKey] !== undefined; // CORRECTION: Use nameKey for storage consistency
        const playlistName = getTranslation(playlist.nameKey);
        const playlistSubtitle = getTranslation(playlist.subtitleKey);
        return `
            <div class="reco-list-item" data-item-id="${playlist.id}">
                <div class="reco-list-img ${playlist.cssClass}"><i class="fas ${playlist.icon}"></i></div>
                <div class="reco-list-content">
                    <p class="reco-list-title">${playlistName}</p>
                    <p class="reco-list-subtitle">${playlistSubtitle}</p>
                </div>
                <div class="reco-list-action" data-playlist-name="${playlist.nameKey}">
                    <i class="fas ${isSaved ? 'fa-check' : 'fa-plus'}" style="color: ${isSaved ? '#10b981' : 'inherit'};"></i>
                </div>
            </div>`;
    }).join('');
}

function renderMobileQueue() {
    const container = document.getElementById('mobile-queue-list');
    const contextNameEl = document.getElementById('mobile-queue-context-name');
    if (!container || !contextNameEl) return;

    let contextText = '';
    if (currentPlayingItem) {
        switch (currentPlaybackContext.type) {
            case 'album': case 'playlist': case 'mmgPlaylist': contextText = currentPlaybackContext.name; break;
            case 'liked': contextText = getTranslation('likedTitles'); break;
            case 'search': contextText = getTranslation('searchResults'); break;
            case 'video': contextText = getTranslation('videos'); break;
            case 'selection': contextText = getTranslation('queue'); break;
            default: contextText = getTranslation('titles'); break;
        }
    }
    contextNameEl.textContent = contextText;

    let html = currentPlayingItem ? `
        <div class="playlist-item-wrapper">
            <div class="playlist-item-content">
                <div class="playlist-item currently-playing" data-item-id="${currentPlayingItem.id}">
                    <span class="mobile-queue-drag-handle-placeholder"></span>
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

    html += userQueue.map(itemId => {
        const item = findItemById(itemId);
        if (!item) return '';
        return `
            <div class="playlist-item-wrapper">
                <div class="playlist-item-delete-action" data-delete-id="${itemId}"><i class="fas fa-trash-alt"></i></div>
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

    container.innerHTML = html;
    container.querySelectorAll('.playlist-item-delete-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromQueue(btn.dataset.deleteId);
            playAudio(sounds.back);
        });
    });
}

function renderUpdateLog() {
    const container = document.getElementById('update-log-entries');
    if (!container) return;

    let html = '';
    const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
    const hasLockedTracks = allUnlockableTracks.some(t => !unlockedDreamSeasonTracks.includes(t.id));

    if (userCoins >= COIN_COST_UNLOCK && hasLockedTracks) {
        html += `
            <div class="notification-item unlock-prompt" onclick="handleMenuNavigation('shop-section'); showShopTab('tracks'); closeOverlay(null);">
                <div class="notification-details">
                    <h4>${getTranslation('unlockAvailableTitle')}</h4>
                    <p>${getTranslation('unlockTrackWithCoins', { COIN_COST_UNLOCK: COIN_COST_UNLOCK })}</p>
                </div>
                <i class="fas fa-chevron-right notification-arrow"></i>
            </div>
        `;
    }

    const backgroundsToBuy = siteData.shopItems?.backgrounds?.filter(bg => bg.cost > 0 && !purchasedShopItems.has(bg.id)) || [];
    const cheapestBackground = backgroundsToBuy.length > 0 ? backgroundsToBuy.reduce((prev, curr) => (prev.cost < curr.cost ? prev : curr)) : null;
    if (cheapestBackground && userCoins >= cheapestBackground.cost) {
        html += `
            <div class="notification-item unlock-prompt" onclick="handleMenuNavigation('shop-section'); showShopTab('backgrounds'); closeOverlay(null);">
                <div class="notification-details">
                    <h4>${getTranslation('unlockAvailableTitle')}</h4>
                    <p>${getTranslation('unlockBackgroundWithCoins', { cost: cheapestBackground.cost })}</p>
                </div>
                <i class="fas fa-chevron-right notification-arrow"></i>
            </div>
        `;
    }
    container.innerHTML = html;
}

function getDragAfterElement(container, y, selector = '.playlist-item') {
    const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// =========================================================
// UI EVENT HANDLERS & HELPERS
// =========================================================

function updateLoopShuffleUI() {
    const loopButtons = [document.getElementById('loop-btn'), document.getElementById('mobile-player-loop-btn')];
    const shuffleButtons = [document.getElementById('shuffle-btn'), document.getElementById('mobile-player-shuffle-btn')];

    loopButtons.forEach(btn => btn?.classList.toggle('active', isPlayerLooping));
    shuffleButtons.forEach(btn => btn?.classList.toggle('active', isShuffleMode));
}

let heroAccordionInterval;
function startHeroAccordionAutoScroll() {
    if (heroAccordionInterval) clearInterval(heroAccordionInterval);
    heroAccordionInterval = setInterval(() => {
        const dashboard = document.getElementById('home-dashboard-section');
        if (document.hidden || (dashboard && dashboard.classList.contains('hidden'))) return;

        const panels = Array.from(document.querySelectorAll('.accordion-panel'));
        const activePanel = document.querySelector('.accordion-panel.active');
        if (activePanel && panels.length > 0) {
            const currentIndex = panels.indexOf(activePanel);
            const nextIndex = (currentIndex + 1) % panels.length;
            const nextPanel = panels[nextIndex];
            if (nextPanel) {
                window.toggleAccordion(nextPanel.id, true);
            }
        }
    }, 6000);
}

window.toggleAccordion = function (panelId, silent = false) {
    if (!silent) playAudio(sounds.select);
    document.querySelectorAll('.accordion-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');

    startHeroAccordionAutoScroll();

    const dotId = 'dot-' + panelId.split('-')[1];
    document.querySelectorAll('.accordion-dot').forEach(d => d.classList.remove('active'));
    const dot = document.getElementById(dotId);
    if (dot) dot.classList.add('active');

    startHeroAccordionAutoScroll();
};

window.handleHeroClick = function (event, panelId) {
    const panel = document.getElementById(panelId);
    if (event.target.closest('.hero-button')) return;

    if (panel.classList.contains('active')) {
        const btn = panel.querySelector('.hero-button');
        if (btn) btn.click();
    } else {
        window.toggleAccordion(panelId);
    }
};

function handleRecoPlaylistClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const card = e.target.closest('.card, .reco-card, .reco-list-item');
    if (!card) return;

    const playlistId = card.dataset.itemId;
    const saveBtnInCard = card.querySelector('.reco-list-action');
    const nameKey = saveBtnInCard ? saveBtnInCard.dataset.playlistName : null;
    const playlistName = nameKey ? getTranslation(nameKey) : 'Playlist';

    const activeProfile = getActiveProfile();
    const allTitles = Object.values(siteData.contentData[activeProfile]?.titles || {});
    let items = [];
    if (playlistId === 'chill') {
        items = allTitles.filter(t => t.tags && t.tags.some(tag => tag.toLowerCase() === 'chill'));
    } else if (playlistId === 'frutiger') {
        items = allTitles.filter(t => t.tags && t.tags.some(tag => tag.toLowerCase() === 'frutiger aero'));
    }

    const saveBtn = e.target.closest('.reco-list-action');
    if (saveBtn) {
        if (savedPlaylists[nameKey]) {
            delete savedPlaylists[nameKey];
            safeStorage.setItem('mmg-savedPlaylists', JSON.stringify(savedPlaylists));
            showDialog(getTranslation('titleRemovedPlaylist') || "Playlist retirée");
        } else if (items.length > 0) {
            savedPlaylists[nameKey] = items.map(t => t.id);
            safeStorage.setItem('mmg-savedPlaylists', JSON.stringify(savedPlaylists));
            showDialog(getTranslation('playlistSaved') || "Playlist sauvegardée !");
        }
        renderRecommendedPlaylists();
        return;
    }

    if (nameKey && !savedPlaylists[nameKey] && items.length > 0) {
        savedPlaylists[nameKey] = items.map(t => t.id);
        safeStorage.setItem('mmg-savedPlaylists', JSON.stringify(savedPlaylists));
        renderRecommendedPlaylists();
    }

    playAudio(sounds.select);
    handleMenuNavigation('library-section', true, { type: 'library', data: nameKey });
}

function savePlaylist(playlistName) {
    if (savedPlaylists[playlistName]) {
        delete savedPlaylists[playlistName];
        safeStorage.setItem('mmg-savedPlaylists', JSON.stringify(savedPlaylists));
        showDialog(getTranslation('titleRemovedPlaylist') || "Playlist retirée");
    } else {
        savedPlaylists[playlistName] = true;
        safeStorage.setItem('mmg-savedPlaylists', JSON.stringify(savedPlaylists));
        showDialog(getTranslation('playlistSaved') || "Playlist sauvegardée !");
        playAudio(sounds.select);
    }
    renderRecommendedPlaylists();
}

function toggleSearch() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar) return;

    const isSearching = topBar.classList.toggle('searching');

    if (isSearching) {
        document.body.classList.add('scroll-locked');
        const input = document.getElementById('mobile-search-input');
        if (input) setTimeout(() => input.focus(), 50);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        const handleOutsideClick = (e) => {
            const headerSearch = document.querySelector('.header-search');
            const searchBtn = document.getElementById('mobile-search-btn');

            if (headerSearch && !headerSearch.contains(e.target) && (!searchBtn || !searchBtn.contains(e.target))) {
                if (topBar.classList.contains('searching')) toggleSearch();
                document.removeEventListener('click', handleOutsideClick);
                document.removeEventListener('touchstart', handleOutsideClick);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
            document.addEventListener('touchstart', handleOutsideClick, { passive: true });
        }, 150);
    } else {
        document.body.classList.remove('scroll-locked');
        const input = document.getElementById('mobile-search-input');
        if (input) input.value = '';
    }
}
