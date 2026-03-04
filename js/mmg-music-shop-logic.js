/**
 * js/mmg-music-shop-logic.js
 * Handles shop items, achievements, coin system, and daily bonus.
 */

// Icons used in shop
const COIN_SVG = `<svg width="1em" height="1em" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="coin-icon-svg" style="display: inline-block; vertical-align: middle;"><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="8" /><path d="M 33.5 64 L 25 64 L 25 45 Q 25 41 27 38 Q 28.5 35 32 33.5 Q 35.5 32 39 32 Q 42 32 45 33.5 Q 48 35 50 38 Q 52 35 55 33.5 Q 58 32 61.5 32 Q 65.5 32 68.5 33.5 Q 71.5 35 73.5 38 Q 75 41 75 45 L 75 64 L 66.5 64 L 66.5 45 Q 66.5 42.5 65 41 Q 63.5 39.5 61 39.5 Q 58.5 39.5 57 41 Q 55.5 42.5 55.5 45 L 55.5 64 L 44.5 64 L 44.5 45 Q 44.5 42.5 43 41 Q 41.5 39.5 39 39.5 Q 36.5 39.5 35 41 Q 33.5 42.5 33.5 45 L 33.5 64 Z" fill="currentColor" /></svg>`;
const GIFT_SVG = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gift-icon-svg"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>`;
const CHECK_SVG = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="check-icon-svg"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

function updateCoinDisplay() {
    const coinElement = document.getElementById('coin-count');
    if (coinElement) coinElement.textContent = userCoins;
}

function updateNotificationDot() {
    const dots = document.querySelectorAll('.notification-dot');
    if (dots.length === 0) return;

    if (!siteData || !siteData.shopItems) return;

    const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
    const hasLockedTracks = allUnlockableTracks.some(t => !unlockedDreamSeasonTracks.includes(t.id));

    let shouldShow = false;
    if (userCoins >= COIN_COST_UNLOCK && hasLockedTracks) {
        shouldShow = true;
    } else {
        const cheapestBackground = siteData.shopItems.backgrounds
            .filter(bg => !purchasedShopItems.has(bg.id))
            .sort((a, b) => a.cost - b.cost)[0];

        if (cheapestBackground && userCoins >= cheapestBackground.cost) {
            shouldShow = true;
        }
    }

    dots.forEach(dot => dot.classList.toggle('hidden', !shouldShow));
}

function updateAchievementProgress(id, value) {
    const ach = achievements[id];
    if (!ach || ach.unlocked) return;

    if (id === 'loopMaster') {
        ach.progress[value] = (ach.progress[value] || 0) + 1;
        if (ach.progress[value] >= ach.goal) unlockAchievement(id);
    } else if (id === 'retroPlayer' || id === 'psPlayer' || id === 'spotimonFan' || id === 'doubleScreen') {
        if (!ach.progress.includes(value)) {
            ach.progress.push(value);
            if (ach.progress.length >= ach.goal) unlockAchievement(id);
        }
    } else if (id === 'patienceIsKey' || id === 'pwaInstall' || id === 'dailyBonusMaster') {
        ach.progress += value;
        if (ach.progress >= ach.goal) unlockAchievement(id);
    }

    safeStorage.setItem('mmg-achievements', JSON.stringify(achievements));
}

function unlockAchievement(id) {
    if (achievements[id]) {
        achievements[id].unlocked = true;
        safeStorage.setItem('mmg-achievements', JSON.stringify(achievements));

        playAudio(sounds.achievementUnlocked);
        showDialog(`${getTranslation('achievementUnlocked')} : ${getTranslation('achievement_' + id + '_title')}`);

        if (id === 'dailyBonusMaster') {
            renderUpdateLog();
            updateNotificationDot();
        }
    }
}

function checkDailyBonus() {
    if (dailyBonusCompleted) return;
    const today = new Date().toISOString().split('T')[0];
    if (lastLoginDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastLoginDate === yesterdayStr) {
        loginStreak++;
    } else {
        loginStreak = 1;
    }

    if (loginStreak > 7) loginStreak = 1;
    safeStorage.setItem('mmg-loginStreak', loginStreak.toString());
}

function claimDailyBonus() {
    if (dailyBonusCompleted) return;
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
    } else if (loginStreak >= 7) {
        updateAchievementProgress('dailyBonusMaster', 1);
        const allUnlockableTracks = Object.values(allSearchableItems).filter(t => t.isUnlockable);
        const lockedTracks = allUnlockableTracks.filter(t => !unlockedDreamSeasonTracks.includes(t.id));

        if (lockedTracks.length > 0) {
            const trackToUnlock = lockedTracks[Math.floor(Math.random() * lockedTracks.length)];
            unlockedDreamSeasonTracks.push(trackToUnlock.id);
            safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));
            rewardMessage = getTranslation('dailyBonusUnlock', { title: trackToUnlock.title });
            playAudio(sounds.achievementUnlocked);
            unlockCardUI(trackToUnlock.id);

            if (lockedTracks.length === 1) {
                showDialog(getTranslation('dailyBonusAllTracksUnlocked'));
                dailyBonusCompleted = true;
                safeStorage.setItem('mmg-dailyBonusCompleted', 'true');
            }
        } else {
            dailyBonusCompleted = true;
            safeStorage.setItem('mmg-dailyBonusCompleted', 'true');
            rewardMessage = getTranslation('dailyBonusFinalTheme');
        }
        loginStreak = 0;
    }

    lastLoginDate = today;
    safeStorage.setItem('mmg-lastLoginDate', lastLoginDate);
    safeStorage.setItem('mmg-loginStreak', loginStreak.toString());
    safeStorage.setItem('mmg-userCoins', userCoins.toString());

    if (rewardMessage && !rewardMessage.includes('Super Listener')) {
        showDialog(rewardMessage);
    }

    updateCoinDisplay();
    updateNotificationDot();
    renderDailyBonusProgress();
}

function unlockCardUI(itemId, isShopItem = false) {
    const unlockedCards = document.querySelectorAll(`.card[data-item-id="${itemId}"], .shop-list-item[data-item-id="${itemId}"]`);

    unlockedCards.forEach(card => {
        card.classList.remove('locked');
        card.classList.remove('buyable');
        card.classList.add('card-unlocked-anim');

        const priceBadge = card.querySelector('.card-price-badge');
        if (priceBadge) priceBadge.remove();

        if (isShopItem) {
            card.dataset.theme = itemId;
            const iconContainer = card.querySelector('.fa-chevron-right');
            if (iconContainer) iconContainer.remove();
            const subtitle = card.querySelector('.shop-list-subtitle');
            if (subtitle) subtitle.innerHTML = '<span>Débloqué</span>';
            const lockOverlay = card.querySelector('.shop-list-img > div');
            if (lockOverlay) lockOverlay.remove();
        } else {
            const lockOverlayGrid = card.querySelector('.lock-overlay');
            if (lockOverlayGrid) lockOverlayGrid.remove();
            const lockOverlayList = card.querySelector('.list-view-lock-overlay');
            if (lockOverlayList) lockOverlayList.remove();
            const unlockText = card.querySelector('.list-view-unlock-text');
            if (unlockText) unlockText.remove();
        }

        setTimeout(() => {
            card.classList.remove('card-unlocked-anim');
        }, 1000);
    });
}
