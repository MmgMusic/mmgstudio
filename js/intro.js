document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        musicText: document.getElementById('music-text'),
        beatsText: document.getElementById('beats-text'),
        studioText: document.getElementById('studio-text'),
        logoBox: document.getElementById('logo-box'),
        logoWrapper: document.getElementById('logo-wrapper'),
        particles: document.getElementById('particles-container'),
        introContainer: document.getElementById('intro-container'),
        scaler: document.getElementById('scene-scaler'),
        // On cible le wrapper principal du site pour l'afficher à la fin
        mainContent: document.getElementById('main-content-wrapper') 
    };

    // Sécurité : si l'intro n'est pas dans la page, on arrête
    if (!elements.introContainer) return;

    function handleResize() {
        const baseWidth = 850;
        const screenWidth = window.innerWidth;
        const scale = Math.min(1, (screenWidth - 40) / baseWidth);
        if (elements.scaler) elements.scaler.style.transform = `scale(${scale})`;
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    const icons = [
        { svg: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', color: 'text-blue-500', angle: '0deg' },
        { svg: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/>', color: 'text-purple-500', angle: '45deg' },
        { svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7h4"/><path d="M3 12h18"/><path d="M3 17h4"/><path d="M17 12h4"/><path d="M17 17h4"/><path d="M17 7h4"/>', color: 'text-red-500', angle: '90deg' },
        { svg: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>', color: 'text-emerald-500', angle: '135deg' },
        { svg: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', color: 'text-pink-500', angle: '180deg' },
        { svg: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.5-.72 1.5-1.5 0-.39-.15-.74-.41-1.01-.26-.26-.44-.61-.44-1.04 0-.9 1.14-1.45 2.2-1.45H17c2.76 0 5-2.24 5-5 0-4.42-4.48-8-10-8z"/>', color: 'text-orange-500', angle: '225deg' },
        { svg: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>', color: 'text-yellow-400', angle: '270deg' },
        { svg: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275-1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>', color: 'text-cyan-400', angle: '315deg' }
    ];

    function triggerExplosion() {
        icons.forEach((icon, i) => {
            const div = document.createElement('div');
            div.className = `particle ${icon.color}`;
            div.style.setProperty('--angle', icon.angle);
            div.style.animationDelay = `${i * 0.05}s`;
            div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-lg">${icon.svg}</svg>`;
            elements.particles.appendChild(div);
        });
    }

    // Déclenchement séquentiel de l'animation
    setTimeout(() => {
        if (elements.musicText) {
            elements.musicText.classList.remove('opacity-0', 'translate-x-[-150vw]', 'blur-sm');
            elements.musicText.classList.add('opacity-100', 'translate-x-[-260px]', 'blur-0');
        }
        if (elements.beatsText) {
            elements.beatsText.classList.remove('opacity-0', 'translate-x-[150vw]', 'blur-sm');
            elements.beatsText.classList.add('opacity-100', 'translate-x-[260px]', 'blur-0');
        }
    }, 2000);

    setTimeout(() => {
        if (elements.musicText) {
            elements.musicText.style.transform = 'translateX(0) scale(1.5)';
            elements.musicText.style.filter = 'blur(40px)';
            elements.musicText.style.opacity = '0';
        }
        if (elements.beatsText) {
            elements.beatsText.style.transform = 'translateX(0) scale(1.5)';
            elements.beatsText.style.filter = 'blur(40px)';
            elements.beatsText.style.opacity = '0';
        }
        if (elements.logoBox) elements.logoBox.classList.add('animate-collision-flash');
        
        if (elements.studioText) {
            elements.studioText.classList.remove('opacity-0', 'scale-50', 'blur-2xl');
            elements.studioText.classList.add('opacity-100', 'scale-100', 'blur-0');
        }

        triggerExplosion();
    }, 4200);

    // NOUVEAU : On fait disparaître les éléments de l'intro un peu avant le fond blanc
    setTimeout(() => {
        const fadeOutElements = [elements.studioText, elements.logoWrapper, elements.particles];
        fadeOutElements.forEach(el => {
            if (el) {
                el.style.transition = 'opacity 0.5s ease-out';
                el.style.opacity = '0';
            }
        });
        // On prépare le contenu principal en arrière-plan (invisible car caché par le fond blanc)
        if (elements.mainContent) {
            elements.mainContent.style.opacity = '1';
        }
    }, 7800);

    setTimeout(() => {
        if (elements.introContainer) {
            elements.introContainer.style.transition = 'opacity 1s ease-out';
            elements.introContainer.style.opacity = '0';
        }
        setTimeout(() => {
            if (elements.introContainer) elements.introContainer.style.display = 'none';
            window.removeEventListener('resize', handleResize);
        }, 1000);
    }, 8500);
});
