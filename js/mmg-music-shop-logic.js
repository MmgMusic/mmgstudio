/**
 * js/mmg-music-shop-logic.js
 * Handles shop items, achievements, coin system, and daily bonus.
 */

// Helper : retourne la date du jour au format YYYY-MM-DD
function todayStr() {
    return new Date().toISOString().split('T')[0];
}

// Helper : retire un élément du DOM s'il existe
function removeEl(el) {
    if (el) el.remove();
}

// Les fonctions updateCoinDisplay, updateNotificationDot, 
// updateAchievementProgress et unlockAchievement sont gérées 
// par mmg-music-contents.js car elles nécessitent d'autres dépendances.

function checkDailyBonus() {
    if (dailyBonusCompleted) return;
    const today = todayStr();
    if (lastLoginDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    loginStreak = lastLoginDate === yesterday.toISOString().split('T')[0] ? loginStreak + 1 : 1;

    if (loginStreak > 7) loginStreak = 1;
    safeStorage.setItem('mmg-loginStreak', loginStreak.toString());
}

function claimDailyBonus() {
    if (dailyBonusCompleted) return;

    let rewardMessage = '';

    if (loginStreak < 7) {
        userCoins += loginStreak;
        const key = loginStreak === 1 ? 'dailyBonus_one' : 'dailyBonus_many';
        rewardMessage = getTranslation(key, { count: loginStreak, streak: loginStreak });
        playAudio(sounds.coin);
    } else {
        const lockedTracks = Object.values(allSearchableItems)
            .filter(t => t.isUnlockable && !unlockedDreamSeasonTracks.includes(t.id));

        if (lockedTracks.length > 0) {
            const track = lockedTracks[Math.floor(Math.random() * lockedTracks.length)];
            unlockedDreamSeasonTracks.push(track.id);
            safeStorage.setItem('mmg-unlockedTracks', JSON.stringify(unlockedDreamSeasonTracks));
            rewardMessage = getTranslation('dailyBonusUnlock', { title: track.title });
            playAudio(sounds.achievementUnlocked);
            unlockCardUI(track.id);

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

    lastLoginDate = todayStr();
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
    document.querySelectorAll(`.card[data-item-id="${itemId}"], .shop-list-item[data-item-id="${itemId}"]`)
        .forEach(card => {
            card.classList.remove('locked', 'buyable');
            card.classList.add('card-unlocked-anim');
            removeEl(card.querySelector('.card-price-badge'));

            if (isShopItem) {
                card.dataset.theme = itemId;
                removeEl(card.querySelector('.fa-chevron-right')); // Conservé si nécessaire pour d'autres thèmes
                removeEl(card.querySelector('.shop-list-img > div'));
                const subtitle = card.querySelector('.shop-list-subtitle');
                if (subtitle) subtitle.innerHTML = '<span>Débloqué</span>';
            } else {
                removeEl(card.querySelector('.lock-overlay'));
                removeEl(card.querySelector('.list-view-lock-overlay'));
                removeEl(card.querySelector('.list-view-unlock-text'));
            }

            setTimeout(() => card.classList.remove('card-unlocked-anim'), 1000);
        });
}
