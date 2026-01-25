/**
 * Met à jour la visibilité du bouton "Lancer la chanson" sur la page de détails.
 */
function updateDetailsPlayButtonState() {
    const btn = document.getElementById('details-play-btn');
    if (!btn) return;

    // Si on est en train de jouer, on peut cacher le bouton ou changer son texte
    if (window.activePlayer && typeof window.activePlayer.getPlayerState === 'function') {
        const state = window.activePlayer.getPlayerState();
        if (state === 1) { // 1 = PLAYING
            btn.classList.add('hidden');
        } else {
            btn.classList.remove('hidden');
        }
    } else {
        btn.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Configurer le listener du bouton Play
    const playBtn = document.getElementById('details-play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (window.activePlayer && typeof window.activePlayer.playVideo === 'function') {
                window.activePlayer.playVideo();
            }
            if (window.playAudio && window.sounds && window.sounds.select) {
                window.playAudio(window.sounds.select);
            }
        });
    }
});
