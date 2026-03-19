/**
 * js/accessibility.js
 * Gère la navigation au clavier (Tab, Entrée, Flèches) pour l'ensemble du site.
 */

class AccessibilityManager {
    constructor() {
        this.interactiveSelectors = [
            'div.card',
            '.sidebar-nav-link',
            '.top-bar-btn',
            '.dashboard-card-button',
            '.hero-button',
            '.social-btn-small',
            '.tag-item',
            '.playlist-item',
            '.queue-item',
            '.shop-item',
            '.profile-switch-btn',
            '.news-item',
            '.card-like-btn',
            '.list-view-card',
            '.accordion-panel',
            '.clickable-icon',
            '.player-controls i',
            '.mini-player-controls i',
            '.mobile-player-controls i',
            '#play-pause-box',
            '.volume-slider-container',
            '.reco-list-item',
            '.reco-list-action',
            '.mobile-nav-link',
            '.header-btn',
            '.close-btn',
            '.guide-choice-btn',
            '.search-bar',
            '.overlay-close-btn',
            '[id^="mobile-player-"] i',
            '.playlist-tab-btn',
            '.playlist-action-btn',
            '.reco-card',
            '.clickable-news',
            '.associated-video-card',
            '.settings-item',
            '.toggle-switch',
            '.mobile-profile-switch .profile-switch-btn',
            '#mmg-branding'
        ];

        this.init();
    }

    init() {
        // 1. Observer les changements du DOM pour ajouter tabindex="0" aux nouveaux éléments
        this.observer = new MutationObserver((mutations) => {
            // Optimisation : on ne rafraîchit que si des éléments ont été ajoutés
            const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
            if (hasNewNodes) this.refreshFocusableElements();
        });

        this.observer.observe(document.body, { childList: true, subtree: true });

        // 2. Événements globaux du clavier
        document.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));

        // Initialisation immédiate
        this.refreshFocusableElements();
    }

    refreshFocusableElements() {
        this.interactiveSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // NOUVEAU: Ignorer les éléments invisibles (display: none, etc.)
                if (el.offsetWidth === 0 && el.offsetHeight === 0) return;

                if (!el.hasAttribute('tabindex')) {
                    el.setAttribute('tabindex', '0');
                    // On ajoute un rôle ARIA pour le lecteur d'écran
                    if (!el.hasAttribute('role')) {
                        el.setAttribute('role', 'button');
                    }
                }
            });
        });
    }

    handleGlobalKeyDown(e) {
        const activeEl = document.activeElement;
        if (!activeEl || activeEl === document.body) return;

        // Entrée ou Espace pour cliquer
        if (e.key === 'Enter' || e.key === ' ') {
            // Dans les champs de saisie, on laisse le comportement par défaut
            if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') return;

            // Touche Entrée :
            // Le navigateur gère déjà Entrée pour <button> et <a> (s'il y a un href)
            // Cependant, beaucoup de vos <a> ont href="#" ou pas de href du tout.
            // On ne simule le clic que si ce n'est pas un bouton/lien natif qui gère ENTER.
            if (e.key === 'Enter' && (activeEl.tagName === 'BUTTON' || (activeEl.tagName === 'A' && activeEl.getAttribute('href') && activeEl.getAttribute('href') !== '#'))) {
                return;
            }

            e.preventDefault();

            // Simule un clic de souris complet
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            activeEl.dispatchEvent(clickEvent);

            // Son de sélection
            if (window.playAudio && window.sounds && window.sounds.select) {
                window.playAudio(window.sounds.select);
            }
        }

        // Navigation spatiale (Flèches)
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            // On active la navigation spatiale sur les cartes, les items de liste et les boutons de navigation
            const isSpatialCandidate = activeEl.classList.contains('card') ||
                activeEl.closest('.card, .reco-list-item, .playlist-item, .sidebar-nav-link, .tag-item');

            if (isSpatialCandidate) {
                this.handleSpatialNavigation(e);
            }
        }
    }

    handleSpatialNavigation(e) {
        const activeEl = document.activeElement;
        // On ne gère la navigation spatiale que si on est sur une carte ou un item de grille
        if (!activeEl.classList.contains('card') && !activeEl.closest('.card')) return;

        e.preventDefault();
        const rect = activeEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const allFocusable = Array.from(document.querySelectorAll('[tabindex="0"], button, a'))
            .filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && el !== activeEl;
            });

        let bestMatch = null;
        let minDistance = Infinity;

        allFocusable.forEach(el => {
            const r = el.getBoundingClientRect();
            const cX = r.left + r.width / 2;
            const cY = r.top + r.height / 2;

            let isCorrectDirection = false;
            switch (e.key) {
                case 'ArrowUp': isCorrectDirection = cY < centerY - 10; break;
                case 'ArrowDown': isCorrectDirection = cY > centerY + 10; break;
                case 'ArrowLeft': isCorrectDirection = cX < centerX - 10; break;
                case 'ArrowRight': isCorrectDirection = cX > centerX + 10; break;
            }

            if (isCorrectDirection) {
                // Distance euclidienne pondérée (on privilégie l'axe de la direction)
                const dx = cX - centerX;
                const dy = cY - centerY;
                const distance = e.key.includes('ArrowLeft') || e.key.includes('ArrowRight')
                    ? Math.abs(dx) + Math.abs(dy) * 2
                    : Math.abs(dy) + Math.abs(dx) * 2;

                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = el;
                }
            }
        });

        if (bestMatch) {
            bestMatch.focus();
            bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    window.accessibilityManager = new AccessibilityManager();
});
