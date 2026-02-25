/**
 * INTRO FINALE INTERACTIVE
 * Gère l'animation d'entrée et le passage au contenu principal.
 */
document.addEventListener('DOMContentLoaded', () => {
    const el = {
        music: document.getElementById('music-text'),
        beats: document.getElementById('beats-text'),
        studio: document.getElementById('studio-wrapper'),
        logo: document.getElementById('logo-box'),
        parts: document.getElementById('particles-container'),
        container: document.getElementById('intro-container'),
        scaler: document.getElementById('scene-scaler'),
        mainContent: document.getElementById('main-content-wrapper')
    };

    if (!el.container) return;

    const icons = [
        { svg: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', color: 'text-blue-500', angle: 0 },
        { svg: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>', color: 'text-purple-500', angle: 45 },
        { svg: '<rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M7 2v20M17 2v20M2 12h20"/>', color: 'text-red-500', angle: 90 },
        { svg: '<path d="M12 6v14M8 8v12M4 4v16M16 6l4 14"/>', color: 'text-emerald-500', angle: 135 },
        { svg: '<circle cx="12" cy="13" r="4"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>', color: 'text-pink-500', angle: 180 },
        { svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>', color: 'text-orange-500', angle: 225 },
        { svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', color: 'text-yellow-400', angle: 270 },
        { svg: '<path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/>', color: 'text-cyan-400', angle: 315 }
    ];

    let canEnter = false;
    let isExiting = false;

    function handleResize() {
        // Dézoome un peu plus sur PC pour éviter l'effet "plein écran" trop envahissant
        const baseWidth = 1200;
        const scale = Math.min(0.85, (window.innerWidth - 40) / baseWidth);
        if (el.scaler) el.scaler.style.transform = `scale(${scale})`;
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    function triggerExplosion() {
        const fragment = document.createDocumentFragment();
        icons.forEach((icon, i) => {
            const wrap = document.createElement('div');
            wrap.className = `particle-wrapper ${icon.color}`;
            wrap.style.setProperty('--angle', (icon.angle - 90) + 'deg');
            wrap.style.animationDelay = `${i * 0.04}s`;

            const inner = document.createElement('div');
            inner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>`;
            wrap.appendChild(inner);
            fragment.appendChild(wrap);

            setTimeout(() => inner.classList.add('is-floating'), 1500);
        });
        el.parts.appendChild(fragment);
        setTimeout(() => {
            canEnter = true;
            startApp();
        }, 2000);
    }

    function startApp() {
        if (!canEnter || isExiting) return;
        isExiting = true;

        // Animation de sortie
        el.container.style.opacity = '0';
        el.studio.style.transition = 'all 0.8s ease-in-out';
        el.studio.style.transform = 'translateY(15px) scale(1.1)';
        el.studio.style.filter = 'blur(12px)';
        document.querySelectorAll('.particle-wrapper').forEach(w => w.classList.add('exit-propulsion'));

        setTimeout(() => {
            el.container.style.display = 'none';
            if (el.mainContent) el.mainContent.style.opacity = '1';
            window.removeEventListener('resize', handleResize);
        }, 800);
    }

    // Démarrage de la séquence d'animation
    (async () => {
        await document.fonts.ready;
        el.container.style.opacity = '1';

        setTimeout(() => {
            el.logo.style.opacity = '1';
            el.logo.style.animation = 'physics-bounce 1.6s forwards var(--anim-bezier)';
        }, 400);

        setTimeout(() => {
            [el.music, el.beats].forEach(e => e.classList.remove('opacity-0'));
            el.music.style.transform = 'translateX(-260px)';
            el.beats.style.transform = 'translateX(260px)';
            el.music.style.filter = 'blur(0)';
            el.beats.style.filter = 'blur(0)';
        }, 2000);

        setTimeout(() => {
            const trans = "transform 0.5s var(--collision-bezier), opacity 0.3s ease-in, filter 0.3s";
            [el.music, el.beats].forEach(e => {
                e.style.transition = trans;
                e.style.transform = 'translateX(0) scale(1.4)';
                e.style.opacity = '0';
                e.style.filter = 'blur(15px)';
            });

            el.logo.style.animation = 'collision-flash 0.6s ease-out forwards';

            setTimeout(() => {
                el.studio.classList.remove('opacity-0', 'scale-50', 'blur-2xl');
                el.studio.classList.add('opacity-100', 'scale-100', 'blur-0');
                triggerExplosion();
            }, 80);
        }, 4400);
    })();
});
