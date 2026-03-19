/* Système de gestion des guides interactifs */

class GuideManager {
    constructor() {
        this.currentGuide = null;
        this.currentIndex = 0;
        this.overlay = null;
        this.tooltip = null;
        this.activeElement = null;
        this.syncRequestId = null;
        this.timeouts = []; // Tracking timeouts

        // Initialisation sécurisée
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.boot());
        } else {
            this.boot();
        }
    }

    boot() {
        this.init();
        this.setupTriggers();

        // === BLOQUEUR DE CLICS EN PHASE DE CAPTURE ===
        // S'exécute AVANT que les éléments du site reçoivent le clic.
        // N'autorise QUE les clics dans l'UI du guide (tooltip et splash).
        // e.isTrusted = false pour les .click() programmatiques (onEnter) -> laissés passer.
        this._clickBlocker = (e) => {
            if (!document.body.classList.contains('guide-active')) return;
            if (!e.isTrusted) return; // Autorise les clics programmatiques des callbacks onEnter
            const isInsideGuideUI = !!e.target.closest('#guide-tooltip, #guide-splash');
            if (!isInsideGuideUI) {
                e.stopPropagation();
                e.preventDefault();
            }
        };
        document.addEventListener('click', this._clickBlocker, true);
        document.addEventListener('touchstart', this._clickBlocker, { capture: true, passive: false });
        document.addEventListener('mousedown', this._clickBlocker, true); // Sécurité supplémentaire PC

        // Gestion du redimensionnement
        window.addEventListener('resize', () => {
            if (this.currentGuide && this.activeElement) {
                this.repositionTooltip();
            }
        });
    }

    init() {
        // Création de l'overlay s'il n'existe pas OU s'il est détaché du DOM
        this.overlay = document.getElementById('guide-overlay');
        if (!this.overlay || !document.body.contains(this.overlay)) {
            if (!this.overlay) {
                this.overlay = document.createElement('div');
                this.overlay.id = 'guide-overlay';
            }
            document.body.appendChild(this.overlay);
        }

        // Création du tooltip s'il n'existe pas OU s'il est détaché du DOM
        this.tooltip = document.getElementById('guide-tooltip');
        if (!this.tooltip || !document.body.contains(this.tooltip)) {
            if (!this.tooltip) {
                this.tooltip = document.createElement('div');
                this.tooltip.id = 'guide-tooltip';
                this.tooltip.innerHTML = `
                    <div class="guide-header">
                        <span class="guide-badge">GUIDE</span>
                        <div class="guide-progress"></div>
                        <button class="guide-close" title="Fermer"><i class="fas fa-times"></i></button>
                    </div>
                    <h3 class="guide-title"></h3>
                    <p class="guide-content"></p>
                    <div class="guide-footer">
                        <button class="guide-btn guide-btn-prev" title="Précédent"><i class="fas fa-arrow-left"></i></button>
                        <div class="guide-nav-buttons">
                            <button class="guide-btn guide-btn-next" title="Suivant"><i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>
                `;
            }
            document.body.appendChild(this.tooltip);

            // Listeners internes
            this.tooltip.querySelector('.guide-close').addEventListener('click', () => { this.playUISound(); this.stop(); });
            this.tooltip.querySelector('.guide-btn-prev').addEventListener('click', () => { this.playUISound(); this.prevStep(); });
            this.tooltip.querySelector('.guide-btn-next').addEventListener('click', () => { this.playUISound(); this.nextStep(); });

            // La fermeture via le bouton (×) est la seule option
            // (clic sur l'overlay ne ferme plus le guide depuis le fix de blocage)
        }

        // Création du splash screen s'il n'existe pas
        this.splash = document.getElementById('guide-splash');
        if (!this.splash || !document.body.contains(this.splash)) {
            if (!this.splash) {
                this.splash = document.createElement('div');
                this.splash.id = 'guide-splash';
            }
            document.body.appendChild(this.splash);
        }

        // Création du marqueur HUD
        this.marker = document.getElementById('guide-marker');
        if (!this.marker || !document.body.contains(this.marker)) {
            if (!this.marker) {
                this.marker = document.createElement('div');
                this.marker.id = 'guide-marker';
                this.marker.innerHTML = ''; // NOUVEAU: Plus de coins, juste le spotlight
            }
            document.body.appendChild(this.marker);
        }
    }

    playUISound() {
        if (typeof playAudio === 'function' && typeof sounds !== 'undefined' && sounds.select) {
            playAudio(sounds.select);
        } else {
            const selectSound = document.getElementById('select-sound');
            if (selectSound) {
                selectSound.currentTime = 0;
                selectSound.play().catch(() => { });
            }
        }
    }

    setupTriggers() {
        document.body.addEventListener('click', (e) => {
            // NOUVEAU: On n'écoute que les boutons [data-guide] qui ne sont pas déjà gérés par mmg-music-contents.js 
            // pour éviter le double lancement.
            const btn = e.target.closest('[data-guide]:not(.guide-choice-btn)');
            if (btn) {
                const guideKey = btn.getAttribute('data-guide');
                this.start(guideKey);
            }
        });
    }

    start(guideKey) {
        this.init(); // S'assure que tout existe et est dans le DOM

        // Reset de sécurité pour s'assurer que les éléments de guide ne sont pas bloqués par des styles inline
        [this.overlay, this.splash, this.tooltip, this.marker].forEach(el => {
            if (el) {
                el.style.pointerEvents = '';
                el.style.visibility = '';
                el.style.display = '';
                el.style.opacity = '';
            }
        });

        const isMobile = window.innerWidth <= 952 || document.body.classList.contains('is-mobile');
        const guideToLoad = (isMobile && GUIDE_STEPS[guideKey + '_mobile']) ? guideKey + '_mobile' : guideKey;

        if (typeof GUIDE_STEPS === 'undefined' || !GUIDE_STEPS[guideToLoad]) {
            console.error("Guide introuvable:", guideToLoad);
            return;
        }

        // CORRECTION: Bloque les interactions sur le site pendant le guide
        document.body.classList.add('tutorial-active-body', 'guide-active');
        document.documentElement.classList.add('guide-active');

        this.currentGuide = GUIDE_STEPS[guideToLoad];
        this.currentIndex = 0;
        this.showSplash(guideToLoad);
    }

    showSplash(guideKey) {
        const lang = this.getCurrentLanguage();
        const guideData = GUIDE_STEPS[guideKey];
        const title = guideData[0]?.guideTitle ? guideData[0].guideTitle[lang] : (lang === 'fr' ? 'Chargement du Guide...' : 'Loading Guide...');

        // NOUVEAU: Logique pour choisir la bonne description
        let descKey = 'guide_desc_nav'; // Par défaut pour le guide de navigation
        if (guideKey.startsWith('pages')) {
            descKey = 'guide_desc_pages'; // Description pour le guide des pages
        }
        const description = this.getTranslation(descKey);

        this.splash.innerHTML = `
            <div class="splash-content">
                <div class="splash-badge">GUIDE</div>
                <h1 class="splash-title">${title}</h1>
                <p class="splash-desc">${description}</p>
                <button class="splash-start-btn auto">${lang === 'fr' ? "C'est parti" : "Let's go"}</button>
            </div>
        `;

        this.overlay.classList.add('active');
        this.splash.classList.add('active');

        this.splash.querySelector('.splash-start-btn').onclick = () => {
            this.playUISound();
            this.startGuide();
        };
    }

    startGuide() {
        this.splash.classList.remove('active');
        this.setGuideTimeout(() => {
            this.tooltip.classList.add('visible');
            this.startSync();
            this.showStep(0);
        }, 300);
    }

    showFinish() {
        this.stopSync();
        this.removeHighlight();
        this.tooltip.classList.remove('visible');

        const lang = this.getCurrentLanguage();
        this.splash.innerHTML = `
            <div class="splash-content">
                <div class="finish-icon"><i class="fas fa-check-circle"></i></div>
                <h1 class="splash-title">${lang === 'fr' ? 'C\'est tout bon !' : 'All set!'}</h1>
                <p class="splash-desc">${lang === 'fr' ? "Vous connaissez les bases. Bonne écoute&nbsp;!" : "You know the basics. Enjoy the music!"}</p>
                <button class="splash-start-btn auto">${lang === 'fr' ? "Super" : "Great"}</button>
            </div>
        `;
        this.splash.classList.add('active');
        this.splash.querySelector('.splash-start-btn').onclick = () => { this.playUISound(); this.stop(); };
    }

    stop() {
        this.clearTimeouts(); // Arrête TOUT ce qui est en cours (timeouts suivis)
        this.stopSync();

        // Cacher tous les éléments du guide (Via CSS uniquement pour éviter les conflits d'inline styles)
        if (this.overlay) this.overlay.classList.remove('active');
        if (this.tooltip) this.tooltip.classList.remove('visible');
        if (this.splash) this.splash.classList.remove('active');
        if (this.marker) this.marker.classList.remove('active');

        this.removeHighlight();
        this.currentGuide = null;
        this.currentIndex = 0;

        // DÉBLOCAGE NUCLÉAIRE DU SITE
        const body = document.body;
        const html = document.documentElement;

        // Classes à nettoyer sur TOUT le monde (body et html)
        const tutorialClasses = ['tutorial-active-body', 'guide-active', 'scroll-locked'];
        tutorialClasses.forEach(cls => {
            body.classList.remove(cls);
            html.classList.remove(cls);
        });

        // Reset des styles inline sur les conteneurs de base
        const forceEnable = (el) => {
            if (!el) return;
            el.style.pointerEvents = ''; // Reset au lieu de force 'auto' pour laisser le CSS agir
            el.style.userSelect = '';
            el.style.overflow = '';
            el.style.opacity = '1'; // NOUVEAU: Force à 1 au lieu de reset (évite le conflit avec l'anti-flicker d'index.html)
            el.classList.remove('guide-blur', 'guide-dimmed', 'hidden');
        };

        forceEnable(body);
        forceEnable(html);
        forceEnable(document.getElementById('main-content-wrapper'));
        forceEnable(document.getElementById('main-area'));
        forceEnable(document.getElementById('mobile-mini-player'));
        forceEnable(document.getElementById('mobile-bottom-nav'));
        forceEnable(document.getElementById('mp3-player-container'));

        // Fermer les overlays de secours via la fonction globale si elle existe
        if (typeof window.closeAllOverlays === 'function') {
            window.closeAllOverlays();
        }

        // Fermer spécifiquement le lecteur mobile plein écran
        const mobilePlayer = document.getElementById('mobile-full-player');
        if (mobilePlayer) mobilePlayer.classList.remove('active');

        // Nettoyage des highlights résiduels
        document.querySelectorAll('.guide-highlighted, .guide-click-feedback').forEach(el => {
            el.classList.remove('guide-highlighted', 'guide-click-feedback');
        });

        // Force le navigateur à rafraîchir le rendu après un court instant pour être sûr que tout est cliquable
        requestAnimationFrame(() => {
            body.style.pointerEvents = 'auto';
            html.style.pointerEvents = 'auto';
            // Supprime les styles inline après avoir forcé 'auto' pour laisser le CSS propre
            this.setGuideTimeout(() => {
                body.style.pointerEvents = '';
                html.style.pointerEvents = '';
            }, 100);
        });
    }

    // NOUVEAU: Gestionnaire de timeouts pour éviter les bugs en navigation arrière
    setGuideTimeout(fn, delay) {
        const t = setTimeout(fn, delay);
        this.timeouts.push(t);
        return t;
    }

    clearTimeouts() {
        this.timeouts.forEach(t => clearTimeout(t));
        this.timeouts = [];
    }

    startSync() {
        this.stopSync();
        const syncLoop = () => {
            if (this.activeElement && this.currentGuide && this.tooltip.classList.contains('visible')) {
                this.syncPositions();
            }
            this.syncRequestId = requestAnimationFrame(syncLoop);
        };
        this.syncRequestId = requestAnimationFrame(syncLoop);
    }

    stopSync() {
        if (this.syncRequestId) {
            cancelAnimationFrame(this.syncRequestId);
            this.syncRequestId = null;
        }
    }

    showStep(index) {
        if (!this.currentGuide || index < 0 || index >= this.currentGuide.length) {
            this.stop();
            return;
        }

        this.clearTimeouts(); // NOUVEAU: Nettoie les délais de l'étape précédente
        this.currentIndex = index;
        const step = this.currentGuide[index];
        const lang = this.getCurrentLanguage();

        // 1. Mise à jour du contenu
        this.tooltip.querySelector('.guide-title').textContent = step.title[lang] || step.title['fr'];
        this.tooltip.querySelector('.guide-content').textContent = step.content[lang] || step.content['fr'];

        // 2. Gestion des boutons
        const prevBtn = this.tooltip.querySelector('.guide-btn-prev');
        const nextBtn = this.tooltip.querySelector('.guide-btn-next');

        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';

        const isLastStep = index === this.currentGuide.length - 1;

        if (isLastStep) {
            nextBtn.innerHTML = '<i class="fas fa-check"></i>';
            nextBtn.classList.add('finish-btn');
            nextBtn.setAttribute('title', lang === 'fr' ? 'Terminer' : 'Finish');
        } else {
            nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
            nextBtn.classList.remove('finish-btn');
            nextBtn.setAttribute('title', lang === 'fr' ? 'Suivant' : 'Next');
        }

        // 3. Mise à jour des points de progression
        const progressContainer = this.tooltip.querySelector('.guide-progress');
        progressContainer.innerHTML = '';
        this.currentGuide.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = `guide-dot ${i === index ? 'active' : ''}`;
            progressContainer.appendChild(dot);
        });

        // 4. Exécution du callback onEnter
        if (step.onEnter && typeof step.onEnter === 'function') {
            try {
                step.onEnter();
            } catch (e) {
                console.error('Erreur dans onEnter:', e);
            }
        }

        // 5. Ciblage et Positionnement
        this.removeHighlight();
        const delay = step.delay || 500;

        this.setGuideTimeout(() => {
            this.findAndHighlightTarget(step);
        }, delay);
    }

    findAndHighlightTarget(step) {
        this.removeHighlight();
        const visibleElements = [];

        for (const selector of step.targets) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = el.offsetParent !== null || el.classList.contains('fixed') || getComputedStyle(el).display !== 'none';
                // NOUVEAU: On ignore les conteneurs trop grands pour l'encadrement (ex: sections entières)
                const isTooLarge = rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8;
                if (el && isVisible && rect.width > 0 && !isTooLarge) {
                    visibleElements.push(el);
                }
            });
        }

        if (visibleElements.length > 0) {
            visibleElements.forEach(el => el.classList.add('guide-highlighted'));

            const primaryTarget = visibleElements[0];
            this.activeElement = primaryTarget;

            // Scroll vers la cible principale
            primaryTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

            this.syncPositions();

            this.setGuideTimeout(() => {
                this.positionTooltip(primaryTarget, step.position);
                this.syncPositions();
            }, 600);

        } else {
            // NOUVEAU: Si pas de cible précise (ou cible trop grande), on affiche le tooltip au centre sans encadrement
            this.tooltip.style.top = '50%';
            this.tooltip.style.left = '50%';
            this.tooltip.style.transform = 'translate(-50%, -50%)';
            this.activeElement = null;
            if (this.marker) this.marker.classList.remove('active');
        }
    }

    removeHighlight() {
        document.querySelectorAll('.guide-highlighted').forEach(el => {
            el.classList.remove('guide-highlighted');
        });
        if (this.marker) this.marker.classList.remove('active');
        this.activeElement = null;
    }

    syncPositions() {
        if (!this.activeElement || !this.currentGuide) return;

        const step = this.currentGuide[this.currentIndex];
        const visibleElements = [];

        for (const selector of step.targets) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = el.offsetParent !== null || el.classList.contains('fixed') || getComputedStyle(el).display !== 'none';
                if (isVisible && rect.width > 0) visibleElements.push(el);
            });
        }

        if (visibleElements.length > 0) {
            let minTop = Infinity, minLeft = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
            visibleElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                minTop = Math.min(minTop, rect.top);
                minLeft = Math.min(minLeft, rect.left);
                maxRight = Math.max(maxRight, rect.right);
                maxBottom = Math.max(maxBottom, rect.bottom);
            });

            this.updateMarkerFromRect({
                top: minTop,
                left: minLeft,
                width: maxRight - minLeft,
                height: maxBottom - minTop
            });

            this.positionTooltip(visibleElements[0], step.position);
        }
    }

    updateMarkerFromRect(rect) {
        if (!this.marker || !rect) return;
        const offset = 2; // Marge réduite pour un encadré serré sur l'élément
        this.marker.style.width = `${rect.width + (offset * 2)}px`;
        this.marker.style.height = `${rect.height + (offset * 2)}px`;
        this.marker.style.top = `${rect.top - offset}px`;
        this.marker.style.left = `${rect.left - offset}px`;
        this.marker.classList.add('active');
    }

    resetOverlayMask() { }

    positionTooltip(target, positionPreference) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const margin = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top, left;

        if (rect.height > viewportHeight * 0.5) {
            top = (viewportHeight - tooltipRect.height) / 2;
            left = (viewportWidth - tooltipRect.width) / 2;
        } else {
            top = rect.bottom + margin;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

            if (top + tooltipRect.height > viewportHeight - margin) {
                top = rect.top - tooltipRect.height - margin;
            }

            if (top < margin) {
                if (rect.right + tooltipRect.width + margin < viewportWidth) {
                    left = rect.right + margin;
                    top = Math.max(margin, Math.min(rect.top, viewportHeight - tooltipRect.height - margin));
                } else if (rect.left - tooltipRect.width - margin > 0) {
                    left = rect.left - tooltipRect.width - margin;
                    top = Math.max(margin, Math.min(rect.top, viewportHeight - tooltipRect.height - margin));
                } else {
                    top = margin;
                    left = (viewportWidth - tooltipRect.width) / 2;
                }
            }

            if (left < margin) left = margin;
            if (left + tooltipRect.width > viewportWidth - margin) {
                left = viewportWidth - tooltipRect.width - margin;
            }
        }

        top = Math.max(margin, Math.min(top, viewportHeight - tooltipRect.height - margin));
        left = Math.max(margin, Math.min(left, viewportWidth - tooltipRect.width - margin));

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.transform = 'none';
    }

    repositionTooltip() {
        if (this.activeElement && this.currentGuide) {
            this.syncPositions();
        }
    }

    nextStep() {
        if (!this.currentGuide) return;
        if (this.currentIndex < this.currentGuide.length - 1) {
            this.showStep(this.currentIndex + 1);
        } else {
            this.showFinish();
        }
    }

    prevStep() {
        if (!this.currentGuide) return;
        if (this.currentIndex > 0) {
            this.showStep(this.currentIndex - 1);
        }
    }

    getCurrentLanguage() {
        return localStorage.getItem('userLanguage') || 'fr';
    }

    getTranslation(key) {
        const lang = this.getCurrentLanguage();
        return translations[lang][key] || translations['en'][key] || `[${key}]`;
    }
}

// Instance globale
window.guideManager = new GuideManager();
