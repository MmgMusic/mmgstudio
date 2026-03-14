/**
 * js/mmg-music-shop-logic.js
 * Handles shop items, achievements, coin system, and daily bonus.
 */

// Icons used in shop
const COIN_SVG = `<svg width="1em" height="1em" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="coin-icon-svg" style="display:inline-block;vertical-align:middle"><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="8"/><path d="M33.5 64H25V45q0-4 2-7 1.5-3 5-4.5T39 32q3 0 6 1.5t5 4.5q2-3 5-4.5T61.5 32q4 0 7 1.5t5.5 4.5Q75 41 75 45v19h-8.5V45q0-2.5-1.5-4T61 39.5q-2.5 0-4 1.5T55.5 45v19h-11V45q0-2.5-1.5-4T39 39.5q-2.5 0-4 1.5T33.5 45v19Z" fill="currentColor"/></svg>`;
const GIFT_SVG = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gift-icon-svg"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`;
const CHECK_SVG = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="check-icon-svg"><polyline points="20 6 9 17 4 12"/></svg>`;

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
        updateAchievementProgress('dailyBonusMaster', 1);
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
                removeEl(card.querySelector('.fa-chevron-right'));
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
