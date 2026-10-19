/**
 * js/mmg-music-ui-render.js
 * Handles all UI rendering for the Mmg Studio application.
 */

// CORRECTION : createGridViewCard et createListViewCard supprimÃ©s (jamais appelÃ©s)

function renderSidebarBranding(activeProfile) {
    const branding = document.getElementById('mmg-branding');
    if (!branding) return;

    const isMusic = activeProfile === 'mmg-music';
    branding.classList.toggle('is-music', isMusic);
    branding.classList.toggle('is-beats', !isMusic);

    const mmgModeName = document.getElementById('mmgModeName');
    const mmgSwitchPrompt = document.getElementById('mmgSwitchPrompt');
    const promptLabel = mmgSwitchPrompt ? mmgSwitchPrompt.querySelector('.mmg-prompt-label') : null;

    if (mmgModeName) {
        mmgModeName.textContent = isMusic ? 'Music' : 'Beats';
    }

    if (promptLabel) {
        const translationKey = isMusic ? 'switchToBeats' : 'switchToMusic';
        promptLabel.setAttribute('data-lang-key', translationKey);
        promptLabel.textContent = typeof getTranslation === 'function' ? getTranslation(translationKey) : (isMusic ? 'Switch to Beats' : 'Switch to Music');
    }
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
    const aboutTitle = document.getElementById('dashboard-about-title');

    if (aboutAvatar && aboutDesc) {
        aboutAvatar.src = avatarUrl;
        aboutDesc.textContent = getTranslation(aboutTextKey);
    }

    if (aboutTitle) {
        aboutTitle.textContent = activeProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';
    }

    const aboutCurrentArtist = document.getElementById('about-current-artist-name');
    if (aboutCurrentArtist) {
        aboutCurrentArtist.textContent = activeProfile === 'mmg-music' ? 'Mmg Music' : 'Mmg Beats';
        aboutCurrentArtist.classList.toggle('is-music', activeProfile === 'mmg-music');
        aboutCurrentArtist.classList.toggle('is-beats', activeProfile === 'mmg-beats');
    }

    const aboutSocialsContainer = document.getElementById('dashboard-about-socials');
    if (aboutSocialsContainer) {
        const socialLinks = siteData.projectData[activeProfile]?.socialLinks;
        if (socialLinks) {
            const socialBrandColors = {
                instagram: '#E4405F',
                spotify: '#1DB954',
                appleMusic: '#FA243C',
                deezer: '#A238FF',
                youtube: '#FF0033'
            };
            aboutSocialsContainer.innerHTML = Object.entries(socialLinks).map(([key, linkData]) => {
                const svgIcon = window.APP_ICONS[key] || '';
                return `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer" class="social-btn-small" title="${key}" style="--platform-color: ${socialBrandColors[key] || 'var(--active-color)'}">
                            ${svgIcon}
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
    const upcomingImage = upcomingData ? upcomingData.image : "assets/backgrounds/icons.svg";
    const upcomingTitle = upcomingData ? upcomingData.title : (getTranslation("noUpcomingTitle") || "No Upcoming Release");
    const upcomingButton = upcomingData
        ? `<button class="hero-button dashboard-card-button" data-link="upcoming-release-section" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.5); padding: 10px 24px; border-radius: 20px; font-weight: bold; font-size: 0.8rem; backdrop-filter: blur(5px);">${getTranslation('viewDetails')}</button>`
        : `<p style="font-size: 0.7rem; opacity: 0.6; margin-top: 10px;">${getTranslation("checkBackSoon") || "Stay tuned!"}</p>`;
    const formatCarouselTitle = (title) => {
        const idx = title.indexOf(' ');
        if (idx === -1) return `<span>${title}</span>`;
        return title.substring(0, idx) + ' <span>' + title.substring(idx + 1) + '</span>';
    };

    if (container) {
        // --- PC PREMIUM CAROUSEL ---
        container.className = 'pc-premium-carousel';
        const latestImage = getCorrectImagePath(latestItem, 'full');
        
        // Helper to retrieve track description from languages or item data
        const getTrackDesc = (item) => {
            if (!item) return '';
            const descFromLang = (typeof translations !== 'undefined' && currentLang && translations[currentLang]?.trackDescriptions?.[item.id])
                || (typeof translations !== 'undefined' && translations['en']?.trackDescriptions?.[item.id]);
            return descFromLang || item.description || item.subtitle || '';
        };

        const truncateDesc = (text, maxLen = 110) => {
            if (!text) return '';
            const trimmed = text.trim();
            if (trimmed.length <= maxLen) return trimmed;
            return trimmed.substring(0, maxLen).trim() + '...';
        };

        const fullLatestDesc = getTrackDesc(latestItem);
        const latestDesc = truncateDesc(fullLatestDesc, 120);

        const fullUpcomingDesc = upcomingData?.description 
            || (upcomingData?.descriptionKey ? getTranslation(upcomingData.descriptionKey) : '') 
            || getTrackDesc(upcomingData)
            || '';
        const upcomingDesc = truncateDesc(fullUpcomingDesc, 120);

        container.innerHTML = `
            <div class="pc-premium-carousel-container">
                <div id="pc-carousel-wrapper" class="pc-premium-slides-wrapper">
                    <div class="pc-premium-slide pc-premium-slide-clickable" data-youtube-id="${latestItem.youtube_id}" data-item-id="${latestItem.id}">
                        <div class="pc-premium-slide-bg" style="background-image: url('${latestImage}')"></div>
                        <div class="pc-premium-slide-overlay"></div>
                        <div class="pc-premium-slide-col-left">
                            <h2 class="pc-premium-slide-title" title="${latestItem.title}">${formatCarouselTitle(latestItem.title)}</h2>
                            ${latestDesc ? `<p class="pc-premium-slide-desc">${latestDesc}</p>` : ''}
                            <button class="pc-carousel-btn">${getTranslation('goToPage') || 'Go to page'}</button>
                        </div>
                        <div class="pc-premium-slide-col-right">
                            <div class="pc-premium-slide-visual-box">
                                <div class="pc-premium-slide-visual-bg" style="background-image: url('${latestImage}')"></div>
                            </div>
                        </div>
                    </div>
                    <div class="pc-premium-slide ${upcomingData ? 'pc-premium-slide-clickable' : ''}" ${upcomingData ? `data-link="upcoming-release-section"` : ''}>
                        <div class="pc-premium-slide-bg" style="background-image: url('${upcomingImage}')"></div>
                        <div class="pc-premium-slide-overlay"></div>
                        <div class="pc-premium-slide-col-left">
                            <h2 class="pc-premium-slide-title" title="${upcomingTitle}">${formatCarouselTitle(upcomingTitle)}</h2>
                            ${upcomingDesc ? `<p class="pc-premium-slide-desc">${upcomingDesc}</p>` : ''}
                            <button class="pc-carousel-btn">${getTranslation('goToPage') || 'Go to page'}</button>
                        </div>
                        <div class="pc-premium-slide-col-right">
                            <div class="pc-premium-slide-visual-box">
                                ${upcomingData
                ? `<div class="pc-premium-slide-visual-bg" style="background-image: url('${upcomingImage}')"></div>`
                : `<div class="pc-premium-slide-visual-placeholder"><p>${formatCarouselTitle(upcomingTitle)}</p></div>`}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dashboard-carousel-dots" aria-label="Carousel slides">
                    <button type="button" class="dashboard-carousel-dot is-active" aria-label="Latest Release" onclick="window.setDashboardCarouselSlide(0)"></button>
                    <button type="button" class="dashboard-carousel-dot" aria-label="Upcoming" onclick="window.setDashboardCarouselSlide(1)"></button>
                </div>
            </div>
        `;

        if (window.startPcCarouselAutoScroll) {
            window.startPcCarouselAutoScroll();
        }
    } else {
        // Restore common title for mobile
        const commonTitle = document.querySelector('.dashboard-common-title');
        if (commonTitle) commonTitle.style.display = 'block';

        // --- MOBILE ACCORDION ---
        container.className = 'hero-accordion';
        container.innerHTML = `
            <div id="panel-1" class="accordion-panel active" onclick="handleHeroClick(event, 'panel-1')">
                <div class="panel-bg" style="background-image: url('${getCorrectImagePath(latestItem, bgImageSize)}');"></div>
                <div class="panel-overlay"></div>
                <div class="panel-collapsed-label">
                    <span style="color: #3b82f6; font-size: 1rem; display: flex; align-items: center; justify-content: center; width: 24px; height: 10px; margin: 0 auto 5px;"></span> ${getTranslation('lastRelease').replace(' ', '<br>')}
                </div>
                <div class="panel-content">
                    <img src="${getCorrectImagePath(latestItem, 'thumb')}" class="panel-cover-img" alt="Cover">
                    <div class="panel-content-inner">
                        <div class="panel-tag">${getTranslation('lastRelease')}</div>
                        <h1 class="hero-title">${latestItem.title}</h1>
                        <button class="hero-button dashboard-card-button" data-youtube-id="${latestItem.youtube_id}" data-item-id="${latestItem.id}" style="background: white; color: black; border: none; padding: 10px 24px; border-radius: 20px; font-weight: bold; font-size: 0.8rem;">${getTranslation('listenNow')}</button>
                    </div>
                </div>
            </div>
            <div id="panel-2" class="accordion-panel" onclick="handleHeroClick(event, 'panel-2')">
                <div class="panel-bg" style="background-image: url('${upcomingImage}');"></div>
                <div class="panel-overlay"></div>
                <div class="panel-collapsed-label">
                    ${getTranslation('nextRelease').replace(' ', '<br>')}
                </div>
                <div class="panel-content">
                    <img src="${upcomingImage}" class="panel-cover-img" alt="Cover">
                    <div class="panel-content-inner">
                        <div class="panel-tag">${getTranslation('nextRelease')}</div>
                        <h1 class="hero-title">${upcomingTitle}</h1>
                        ${upcomingButton}
                    </div>
                </div>
            </div>
            <div class="accordion-dots">
                <div id="dot-1" class="accordion-dot active"></div>
                <div id="dot-2" class="accordion-dot"></div>
            </div>
        `;
        startHeroAccordionAutoScroll();
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
    const savedPlaylistTabs = Object.keys(savedPlaylists).map(nameKey => ({ id: nameKey, title: getTranslation(nameKey) || nameKey }));
    tabsContainer.innerHTML = [...tabs, ...savedPlaylistTabs].map(tab =>
        `<button class="playlist-tab-btn ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}" title="${tab.title}">${tab.title}</button>`
    ).join('');

    tabsContainer.classList.add('sliding-tabs');
    setTimeout(() => updateSlidingIndicator(tabsContainer), 0);

    let itemsToShow = [];

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
    }

    if (clearBtn) clearBtn.style.display = (activeTabId === 'current') ? 'flex' : 'none';

    const itemsAsObject = itemsToShow.reduce((acc, item) => {
        if (item) acc[item.id] = item;
        return acc;
    }, {});

    renderCards('library-container', itemsAsObject, 'title');

    const libraryContainer = document.getElementById('library-container');
    const globalView = ViewState.current;
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
    const container = document.querySelector('.news-grid-premium');
    if (!container) return;

    if (!newsData || Object.keys(newsData).length === 0) {
        container.innerHTML = '<p style="padding: 20px; opacity: 0.7;">Aucune actualité pour le moment.</p>';
        return;
    }

    // On ne garde que les 3 dernières actus pour la grid premium
    const latestNews = Object.entries(newsData).slice(0, 3);

    container.innerHTML = latestNews.map(([id, news]) => {
        const localized = news[currentLang] || news['fr'] || news['en'];
        const newsTitle = localized.title || localized.headline;
        const newsDate = localized.date || 'MARCH 2026';
        const newsImg = localized.image || 'assets/news-placeholder.jpg';
        const newsExcerpt = (localized.summary || localized.content || '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return `
            <article class="premium-card overflow-hidden flex flex-row items-center gap-3 group cursor-pointer clickable-news mockup-news-card" data-news-id="${id}">
                <div class="news-card-thumb-left">
                    <img src="${newsImg}" alt="${newsTitle}" class="news-thumb-img">
                </div>
                <div class="news-card-body flex-1 min-w-0">
                    <span class="mockup-news-date">${newsDate}</span>
                    <h3 class="news-card-title mockup-news-title">${newsTitle}</h3>
                    ${newsExcerpt ? `<p class="news-card-desc">${newsExcerpt}</p>` : ''}
                </div>
            </article>
        `;
    }).join('');
}

function scrollNews(direction) {
    const container = document.getElementById('newsScrollContainer');
    if (!container) return;
    const cardWidth = 300 + 14; // min-width + gap
    container.scrollBy({ left: direction === 'right' ? cardWidth : -cardWidth, behavior: 'smooth' });
}

function renderNewsDetailsPage(newsId) {
    const container = document.getElementById('news-details-content');
    if (!container) return;

    const newsEntry = newsData[newsId];
    if (!newsEntry) {
        container.innerHTML = '<p>Article non trouvÃ©.</p>';
        return;
    }

    const news = newsEntry[currentLang] || newsEntry['fr'] || newsEntry['en'];
    container.innerHTML = `
        <div class="news-article-view">
            <header class="news-article-header-left">
                <h2 class="news-article-title-large">${news.title}</h2>
                <div class="news-article-meta-below">
                    <span class="news-date-badge">${window.APP_ICONS.calendar} ${news.date}</span>
                </div>
            </header>
            
            <div class="news-article-featured-image-wrapper">
                <img src="${news.image}" alt="${news.title}" class="news-article-featured-img-full">
            </div>

            <main class="news-article-content-full">
                ${news.content.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')}
            </main>
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
                <div style="width: 48px; height: 48px; margin: 0 auto 20px; color: var(--active-color);">${window.APP_ICONS.clock}</div>
                <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 10px;">${getTranslation('noUpcomingTitle') || 'No Upcoming Release'}</h2>
                <p>${getTranslation('noUpcomingDesc') || 'Stay tuned for future releases!'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="upcoming-release-view">
            <div class="upcoming-release-cover">
                <img src="${upcomingData.image}" alt="${upcomingData.title}" width="300" height="300">
            </div>
            <div class="upcoming-release-content">
                <span class="upcoming-release-badge">
                    ${window.APP_ICONS.clock} ${getTranslation('upcomingBadge')}
                </span>
                <h2 class="upcoming-release-title">${upcomingData.title}</h2>
                <div class="upcoming-release-desc">
                    <p>${getTranslation(upcomingData.descriptionKey)}</p>
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
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; opacity: 0.5;">
                <p style="font-weight: 700; font-size: 0.9rem; margin-bottom: 5px;">${getTranslation('noRecommendedPlaylists') || 'No Recommended Playlists'}</p>
                <p style="font-size: 0.75rem;">${getTranslation('comingSoon') || 'Coming soon...'}</p>
            </div>
        `;
        return;
    }

    const isMobile = window.innerWidth <= 952;

    if (isMobile) {
        // Mobile layout: iOS style vertical list
        container.classList.remove('mockup-reco-grid');
        container.classList.remove('sleek-reco-list');
        container.style.cssText = ''; // clear any PC inline styles
        container.innerHTML = recommendedPlaylists.map(playlist => {
            const isSaved = savedPlaylists[playlist.nameKey] !== undefined;
            const playlistName = getTranslation(playlist.nameKey);
            const playlistSubtitle = getTranslation(playlist.subtitleKey);
            return `
                <div class="reco-list-item" data-item-id="${playlist.id}" data-playlist-name="${playlist.nameKey}">
                    <div class="reco-list-img ${playlist.cssClass}">${window.APP_ICONS[playlist.icon] || ''}</div>
                    <div class="reco-list-content">
                        <p class="reco-list-title">${playlistName}</p>
                        <p class="reco-list-subtitle">${playlistSubtitle}</p>
                    </div>
                    <div class="reco-list-action">
                        <span style="color: ${isSaved ? '#10b981' : 'inherit'}; display: flex;">${isSaved ? window.APP_ICONS.check : window.APP_ICONS.plus}</span>
                    </div>
                </div>`;
        }).join('');
    } else {
        // PC Layout: Sleek 2-column side by side grid
        container.classList.remove('mockup-reco-grid');
        container.classList.add('sleek-reco-list');

        // Force grid directly via style to bypass any CSS cascade conflicts
        container.style.cssText = 'display:grid !important; grid-template-columns:1fr 1fr; gap:6px 10px; padding:0; background:transparent; border:none; box-shadow:none;';

        const gradientClasses = ['grad-01', 'grad-02', 'grad-03', 'grad-04'];

        container.innerHTML = recommendedPlaylists.map((playlist, index) => {
            const isSaved = savedPlaylists[playlist.nameKey] !== undefined;
            const playlistName = getTranslation(playlist.nameKey);
            const playlistSubtitle = getTranslation(playlist.subtitleKey) || (playlist.author ? `${playlist.author} • 3:15` : 'Super Mmg Bros • 2:45');
            const gradClass = gradientClasses[index % gradientClasses.length];
            const numStr = String(index + 1).padStart(2, '0');

            return `
                <div class="sleek-reco-row group cursor-pointer" data-item-id="${playlist.id}" data-playlist-name="${playlist.nameKey}">
                    <div class="sleek-reco-left">
                        <div class="sleek-reco-num-badge ${gradClass}">
                            ${numStr}
                        </div>
                        <div class="sleek-reco-info">
                            <h4 class="sleek-reco-title" style="text-transform:none !important">${playlistName}</h4>
                            <p class="sleek-reco-subtitle">${playlistSubtitle}</p>
                        </div>
                    </div>
                    <div class="sleek-reco-right">
                        <div class="reco-list-action sleek-reco-add-btn" data-playlist-name="${playlist.nameKey}" style="cursor:pointer; display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; background:var(--t-surface-alt, #f1f5f9); color:${isSaved ? '#10b981' : 'var(--t-text, #64748b)'}; font-size:14px; font-weight:bold; transition:all 0.2s ease;">
                            <span style="display:flex;">${isSaved ? (window.APP_ICONS.check || '✓') : (window.APP_ICONS.plus || '+')}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // NOUVEAU : RÃ©-attache l'Ã©vÃ©nement de clic qui avait sautÃ© !
    container.removeEventListener('click', handleRecoPlaylistClick);
    container.addEventListener('click', handleRecoPlaylistClick);
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
                    <img src="${getCorrectImagePath(currentPlayingItem, 'thumb')}" alt="${currentPlayingItem.title}" width="48" height="48">
                    <div class="playlist-item-info">
                        <p class="playlist-item-title">${currentPlayingItem.title}</p>
                        <p class="playlist-item-subtitle">${currentPlayingItem.year || 'VidÃ©o'}</p>
                    </div>
                    <span class="currently-playing-indicator">${window.useIcon('volume', 18)}</span>
                </div>
            </div>
        </div>
    ` : '';

    const currentPlayingIndexInUserQueue = currentPlayingItem ? PlaybackQueue.user.indexOf(currentPlayingItem.id) : -1;
    const upcomingTracks = currentPlayingIndexInUserQueue > -1
        ? PlaybackQueue.user.slice(currentPlayingIndexInUserQueue + 1)
        : PlaybackQueue.user;

    html += upcomingTracks.map(itemId => {
        const item = findItemById(itemId);
        if (!item) return '';
        return `
            <div class="playlist-item-wrapper">
                <div class="playlist-item-delete-action" data-delete-id="${itemId}">${window.useIcon('trash', 22)}</div>
                <div class="playlist-item-content">
                    <div class="playlist-item" data-item-id="${itemId}">
                        <div class="mobile-queue-drag-handle">${window.useIcon('bars', 18)}</div>
                        <img src="${getCorrectImagePath(item, 'thumb')}" alt="${item.title}" width="48" height="48">
                        <div class="playlist-item-info">
                            <p class="playlist-item-title">${item.title}</p>
                            <p class="playlist-item-subtitle">${item.year || 'VidÃ©o'}</p>
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

    if (!container._delegated) {
        container._delegated = true;
        container.addEventListener('click', (e) => {
            const prompt = e.target.closest('.unlock-prompt');
            if (!prompt) return;

            const { action, tab } = prompt.dataset;
            if (typeof playAudio === 'function' && typeof sounds !== 'undefined' && sounds.select) {
                playAudio(sounds.select);
            }
            if (action === 'shop') {
                if (typeof closeOverlay === 'function') {
                    closeOverlay(null);
                }
                if (typeof handleMenuNavigation === 'function') {
                    handleMenuNavigation('shop-section', true, { type: 'shop', data: tab || 'themes' });
                }
                if (tab && typeof showShopTab === 'function') {
                    showShopTab(tab);
                }
            }
        });
    }

    let html = '';
    const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
    const hasLockedTracks = allUnlockableTracks.some(t => !unlockedDreamSeasonTracks.includes(t.id));

    if (userCoins >= COIN_COST_UNLOCK && hasLockedTracks) {
        html += `
            <div class="notification-item unlock-prompt" data-action="shop" data-tab="tracks">
                <div class="notification-details">
                    <h4>${getTranslation('unlockAvailableTitle')}</h4>
                    <p>${getTranslation('unlockTrackWithCoins', { COIN_COST_UNLOCK: COIN_COST_UNLOCK })}</p>
                </div>
                <i class="notification-arrow">${window.APP_ICONS.chevronRightSmall}</i>
            </div>
        `;
    }

    const backgroundsToBuy = siteData.shopItems?.backgrounds?.filter(bg => bg.cost > 0 && !purchasedShopItems.has(bg.id)) || [];
    const cheapestBackground = backgroundsToBuy.length > 0 ? backgroundsToBuy.reduce((prev, curr) => (prev.cost < curr.cost ? prev : curr)) : null;
    if (cheapestBackground && userCoins >= cheapestBackground.cost) {
        html += `
            <div class="notification-item unlock-prompt" data-action="shop" data-tab="backgrounds">
                <div class="notification-details">
                    <h4>${getTranslation('unlockAvailableTitle')}</h4>
                    <p>${getTranslation('unlockBackgroundWithCoins', { cost: cheapestBackground.cost })}</p>
                </div>
                <i class="notification-arrow">${window.APP_ICONS.chevronRightSmall}</i>
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

    loopButtons.forEach(btn => {
        if (!btn) return;
        btn.classList.toggle('active', isPlayerLooping);
        if (isPlayerLooping) {
            btn.querySelectorAll('animateTransform, animate').forEach(a => { if (a.beginElement) a.beginElement(); });
        }
    });

    shuffleButtons.forEach(btn => {
        if (!btn) return;
        btn.classList.toggle('active', isShuffleMode);
        if (isShuffleMode) {
            btn.querySelectorAll('animateTransform, animate').forEach(a => { if (a.beginElement) a.beginElement(); });
        }
    });
}

// --- PC PREMIUM CAROUSEL LOGIC ---
let pcCarouselInterval;
let currentPcCarouselSlide = 0;

function syncDashboardCarouselIndicators(index) {
    const activeIndex = index === 1 ? 1 : 0;
    document.getElementById('dashboard-carousel-last-label')?.classList.toggle('is-active', activeIndex === 0);
    document.getElementById('dashboard-carousel-next-label')?.classList.toggle('is-active', activeIndex === 1);
    document.querySelectorAll('.dashboard-carousel-dot').forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === activeIndex);
    });
}

window.setDashboardCarouselSlide = function (index, manual = true) {
    if (window.innerWidth <= 952 && document.getElementById(`panel-${index + 1}`)) {
        window.toggleAccordion(`panel-${index + 1}`, !manual);
    } else {
        window.goToPcCarouselSlide(index, manual);
    }
};

window.goToPcCarouselSlide = function (index, manual = true) {
    if (manual && typeof playAudio === 'function' && typeof sounds !== 'undefined' && sounds.select) {
        playAudio(sounds.select);
    }
    currentPcCarouselSlide = index;
    syncDashboardCarouselIndicators(currentPcCarouselSlide);

    const wrapper = document.getElementById('pc-carousel-wrapper');

    if (!wrapper) return;

    wrapper.style.transform = `translateX(-${currentPcCarouselSlide * 50}%)`;

    // Toggle label active/inactive state (both sets of labels)
    const labelLast = document.getElementById('pc-label-last');
    const labelNext = document.getElementById('pc-label-next');
    const labelLastDupes = document.querySelectorAll('.pc-label-last-dupe');
    const labelNextDupes = document.querySelectorAll('.pc-label-next-dupe');
    if (labelLast && labelNext) {
        if (currentPcCarouselSlide === 0) {
            labelLast.className = 'pc-carousel-label pc-carousel-label-active';
            labelNext.className = 'pc-carousel-label pc-carousel-label-inactive';
            labelLastDupes.forEach(el => el.className = 'pc-carousel-label pc-carousel-label-active pc-label-last-dupe');
            labelNextDupes.forEach(el => el.className = 'pc-carousel-label pc-carousel-label-inactive pc-label-next-dupe');
        } else {
            labelLast.className = 'pc-carousel-label pc-carousel-label-inactive';
            labelNext.className = 'pc-carousel-label pc-carousel-label-active';
            labelLastDupes.forEach(el => el.className = 'pc-carousel-label pc-carousel-label-inactive pc-label-last-dupe');
            labelNextDupes.forEach(el => el.className = 'pc-carousel-label pc-carousel-label-active pc-label-next-dupe');
        }
    }

    if (manual) {
        window.startPcCarouselAutoScroll();
    }
};

window.startPcCarouselAutoScroll = function () {
    if (pcCarouselInterval) clearInterval(pcCarouselInterval);
    pcCarouselInterval = setInterval(() => {
        const dashboard = document.getElementById('home-dashboard-section');
        if (document.hidden || (dashboard && dashboard.classList.contains('hidden'))) return;

        window.goToPcCarouselSlide((currentPcCarouselSlide + 1) % 2, false);
    }, 5000);
};
// ---------------------------------

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
    syncDashboardCarouselIndicators(Number(panelId.split('-')[1]) - 1);

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

    const card = e.target.closest('.card, .reco-card, .reco-list-item, .mockup-reco-item, .sleek-reco-row');
    if (!card) return;

    const playlistId = card.dataset.itemId;
    const saveBtnInCard = card.querySelector('.reco-list-action');
    const nameKey = card.dataset.playlistName || (saveBtnInCard ? saveBtnInCard.dataset.playlistName : null);
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
            showDialog(getTranslation('playlistRemoved') || "Playlist retirÃ©e");
        } else if (items.length > 0) {
            savedPlaylists[nameKey] = items.map(t => t.id);
            safeStorage.setItem('mmg-savedPlaylists', JSON.stringify(savedPlaylists));
            showDialog(getTranslation('playlistSaved') || "Playlist sauvegardÃ©e !");
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


function toggleSearch() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar) return;

    const isSearching = topBar.classList.toggle('searching');

    if (isSearching) {
        document.body.classList.add('scroll-locked');
        const input = document.getElementById('mobile-search-input');
        if (input) setTimeout(() => input.focus(), 50);

        const ac = new AbortController();
        toggleSearch._ac = ac;
        const { signal } = ac;

        const handleOutsideClick = (e) => {
            const headerSearch = document.querySelector('.header-search');
            const searchBtn = document.getElementById('mobile-search-btn');

            if (headerSearch && !headerSearch.contains(e.target) && (!searchBtn || !searchBtn.contains(e.target))) {
                if (topBar.classList.contains('searching')) toggleSearch();
                ac.abort();
            }
        };

        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick, { signal });
            document.addEventListener('touchstart', handleOutsideClick, { signal, passive: true });
        }, 150);
    } else {
        document.body.classList.remove('scroll-locked');
        if (toggleSearch._ac) {
            toggleSearch._ac.abort();
            toggleSearch._ac = null;
        }
        const input = document.getElementById('mobile-search-input');
        if (input) input.value = '';
    }
}



