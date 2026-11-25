/* Smart Finder integrated with the live MMG catalogue and player. */
(function () {
    'use strict';

    const FILTERS = {
        mood: {
            label: 'Mood', prompt: 'finderMoodPrompt', placeholder: 'mood',
            values: ['chill', 'energetic', 'dark', 'nostalgic', 'bright', 'epic'],
            labels: {
                chill: 'finderMoodChill', energetic: 'finderMoodEnergetic', dark: 'finderMoodDark',
                nostalgic: 'finderMoodNostalgic', bright: 'finderMoodBright', epic: 'finderMoodEpic'
            }
        },
        universe: {
            label: 'Universe', prompt: 'finderUniversePrompt', placeholder: 'universe',
            values: ['urban', 'club', 'digital', 'groove', 'organic'],
            labels: { urban: 'finderUniverseUrban', club: 'finderUniverseClub', digital: 'finderUniverseDigital', groove: 'finderUniverseGroove', organic: 'finderUniverseOrganic' }
        },
        bpm: {
            label: 'Tempo', prompt: null, placeholder: 'BPM',
            values: ['slow', 'moderate', 'fast', 'veryFast'],
            labels: { slow: 'finderBpmSlow', moderate: 'finderBpmModerate', fast: 'finderBpmFast', veryFast: 'finderBpmVeryFast' }
        },
        use: {
            label: 'Usage', prompt: 'finderUsagePrompt', placeholder: 'usage',
            values: ['voice', 'game', 'video', 'listening'],
            labels: {
                voice: 'finderUsageVoice', game: 'finderUsageGame', video: 'finderUsageVideo', listening: 'finderUsageListening'
            }
        }
    };

    const CURATED = {
        'wiikend sports loop me': ['adventure', 118, ['play', 'create']],
        'cheap cheep beach': ['chill', 102, ['relax', 'create']],
        'cheep cheep beach': ['chill', 102, ['relax', 'create']],
        'harvest': ['chill', 92, ['study', 'relax']],
        'woods of wonder': ['adventure', 96, ['play', 'study']],
        'spotimon night version': ['night', 88, ['relax', 'study']],
        'racing': ['hype', 150, ['move', 'play']],
        'kart 1': ['hype', 138, ['move', 'play']],
        'kong loop me': ['adventure', 124, ['play', 'move']],
        'spotimon jade version': ['nostalgic', 104, ['play', 'relax']],
        'spotimon radiant jade version': ['adventure', 112, ['play', 'create']],
        'space racer 2000': ['hype', 146, ['move', 'play']],
        'spooky mansion': ['night', 84, ['play', 'create']],
        'kart world loop me': ['hype', 142, ['move', 'play']],
        'super mmg bros underground': ['adventure', 128, ['play', 'move']],
        'startup chime mmg studio': ['chill', 90, ['create']],
        'menu breeze clicks': ['chill', 96, ['study', 'create']],
        'bonus unlocked': ['hype', 120, ['create', 'play']],
        'collection select': ['chill', 100, ['create', 'study']],
        'midnight double bass': ['night', 76, ['relax', 'study']],
        'velvet lounge': ['nostalgic', 82, ['relax', 'study']],
        'brass smoke': ['night', 88, ['relax', 'create']],
        'dusty vinyl 94 bpm': ['nostalgic', 94, ['study', 'create']],
        'subway jazz chop': ['nostalgic', 90, ['create', 'study']],
        'mpc 2000 groove': ['nostalgic', 96, ['create', 'move']],
        'midnight sp 1200': ['night', 92, ['study', 'relax']],
        'dark nights 140': ['night', 140, ['move', 'create']],
        'atmospheric sub': ['night', 70, ['relax', 'study']],
        'drill waves': ['hype', 142, ['move', 'create']],
        'neon highway 808': ['hype', 130, ['move', 'create']],
        'rainy window tape': ['chill', 78, ['study', 'relax']],
        'coffee cassette': ['chill', 84, ['study', 'relax']],
        'sunset mpc beat': ['chill', 88, ['relax', 'create']],
        'grimey street 90 bpm': ['hype', 90, ['create', 'move']],
        'hard kick snare': ['hype', 95, ['move', 'create']],
        'golden era rebirth': ['nostalgic', 92, ['create', 'study']]
    };

    const STATE = { mood: null, universe: null, bpm: null, use: null };
    let poolCache = [];
    let currentMatches = [];
    let picker = null;
    let returnFocus = null;
    let previousOverflow = '';
    let wheelLock = false;
    let finderBoardTimer = null;

    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const tx = (key, fallback, replacements) => {
        if (typeof getTranslation !== 'function') return fallback;
        const value = getTranslation(key, replacements);
        return !value || value === `[${key}]` ? fallback : value;
    };
    const taxonomy = window.MMGFinderTaxonomy;
    const tempoFor = bpm => taxonomy?.tempoFor(bpm) || (bpm < 85 ? 'slow' : bpm < 110 ? 'moderate' : bpm < 135 ? 'fast' : 'veryFast');

    function inferMetadata(item) {
        const curated = CURATED[normalize(item.title)];
        const tags = item.tags || [];
        const title = normalize(item.title);
        const fromTags = dimension => taxonomy?.fromTags(tags, dimension) || [];
        const legacyMood = { hype: 'energetic', night: 'dark', adventure: 'epic', chill: 'chill', nostalgic: 'nostalgic' };
        const moods = fromTags('moods');
        if (!moods.length) moods.push(legacyMood[curated?.[0]] || (/night|dark|spooky|midnight/.test(title) ? 'dark' : 'chill'));
        const universes = fromTags('universes');

        const rawBpm = Number(item.bpm || item.tempo || (title.match(/\b(\d{2,3})\s*bpm\b/) || [])[1]);
        const bpm = rawBpm > 0 ? rawBpm : curated?.[1] || ({ chill: 88, energetic: 126, dark: 82, nostalgic: 96, bright: 108, epic: 118 }[moods[0]]);
        const usages = fromTags('usages');
        if (!usages.length) {
            if (curated?.[2]?.includes('play')) usages.push('game');
            if (curated?.[2]?.some(value => ['study', 'relax'].includes(value))) usages.push('listening');
            if (curated?.[2]?.includes('create')) usages.push('video');
        }
        return { mood: moods[0], moods, universe: universes[0] || null, universes, bpm, usages };
    }

    function buildPool() {
        const source = (typeof allSearchableItems === 'object' && allSearchableItems) ? Object.values(allSearchableItems) : [];
        const unique = new Map();
        source.forEach(item => {
            if (!item || item.type !== 'title' || !item.id || !item.title) return;
            if (item.isUnlockable && Array.isArray(unlockedDreamSeasonTracks) && !unlockedDreamSeasonTracks.includes(item.id)) return;
            if (unique.has(item.id)) return;
            unique.set(item.id, { item, ...inferMetadata(item) });
        });
        poolCache = Array.from(unique.values());
        return poolCache;
    }

    function scoreTrack(track) {
        let score = 0;
        let maximum = 0;
        if (STATE.mood) {
            maximum += 3;
            if (track.moods.includes(STATE.mood)) score += 3;
        }
        if (STATE.universe) {
            maximum += 3;
            if (track.universes.includes(STATE.universe)) score += 3;
        }
        if (STATE.use) {
            maximum += 3;
            if (track.usages.includes(STATE.use)) score += 3;
        }
        if (STATE.bpm) {
            maximum += 3;
            const distance = Math.abs(FILTERS.bpm.values.indexOf(tempoFor(track.bpm)) - FILTERS.bpm.values.indexOf(STATE.bpm));
            score += distance === 0 ? 3 : distance === 1 ? 1 : 0;
        }
        return { score, percentage: maximum ? Math.round(score / maximum * 100) : 0 };
    }

    function labelFor(key, value) {
        const config = FILTERS[key];
        if (!value) return tx(config.prompt || '', config.placeholder);
        const labelKey = config.labels[value];
        const fallback = {
            mood: { chill: 'chill', energetic: 'énergique', dark: 'sombre', nostalgic: 'nostalgique', bright: 'lumineux', epic: 'épique' },
            universe: { urban: 'urbain', club: 'club', digital: 'Y2K / Digital', groove: 'groove', organic: 'organique' },
            bpm: { slow: 'lent', moderate: 'modéré', fast: 'rapide', veryFast: 'très rapide' },
            use: { voice: 'voix', game: 'jeu vidéo', video: 'vidéo', listening: 'écoute' }
        }[key][value];
        return tx(labelKey, fallback);
    }

    function makeResultCard(track, match) {
        const item = track.item;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'finder-result-card';
        card.dataset.finderItem = item.id;
        card.setAttribute('aria-label', `${tx('finderPlay', 'Play')} ${item.title}`);

        const art = document.createElement('span');
        art.className = 'finder-result-art';
        const image = document.createElement('img');
        image.src = typeof getCorrectImagePath === 'function' ? getCorrectImagePath(item, 'thumb') : item.image;
        image.alt = '';
        image.loading = 'lazy';
        image.onerror = () => {
            if (image.dataset.fullFallback || typeof getCorrectImagePath !== 'function') return;
            image.dataset.fullFallback = 'true';
            image.src = getCorrectImagePath(item, 'full');
        };
        art.appendChild(image);
        const score = document.createElement('span');
        score.className = 'finder-match-score';
        score.textContent = `${match.percentage}%`;
        art.appendChild(score);
        card.appendChild(art);

        const title = document.createElement('span');
        title.className = 'finder-result-title';
        title.textContent = item.title;
        card.appendChild(title);

        const meta = document.createElement('span');
        meta.className = 'finder-result-meta';
        const universe = document.createElement('b');
        universe.className = 'finder-result-universe';
        universe.textContent = item.profile === 'mmg-beats' ? 'Mmg Beats' : 'Mmg Music';
        meta.appendChild(universe);
        const shownMood = STATE.mood && track.moods.includes(STATE.mood) ? STATE.mood : track.mood;
        const shownUniverse = STATE.universe && track.universes.includes(STATE.universe) ? STATE.universe : track.universe;
        meta.append(` · ${track.bpm} BPM · ${labelFor('mood', shownMood)}${shownUniverse ? ` · ${labelFor('universe', shownUniverse)}` : ''}`);
        card.appendChild(meta);
        return card;
    }

    function renderResults() {
        const results = document.getElementById('finder-results');
        const status = document.getElementById('finder-results-status');
        if (!results || !status) return;
        results.replaceChildren();

        document.querySelectorAll('#finder-section .finder-choice').forEach(button => {
            const key = button.dataset.finderKey;
            const value = STATE[key];
            button.textContent = key === 'bpm' && value ? labelFor(key, value) : labelFor(key, value);
            button.dataset.selected = String(Boolean(value));
        });

        const source = poolCache.length ? poolCache : buildPool();
        const scored = source.map(track => ({ ...track, match: scoreTrack(track) })).sort((a, b) => b.match.score - a.match.score || a.item.title.localeCompare(b.item.title));
        const eligible = scored.filter(track => track.match.percentage >= 50);
        const requestedFilters = Object.values(STATE).filter(Boolean).length;
        const exact = requestedFilters
            ? eligible.filter(track => track.match.score === requestedFilters * 3)
            : [];
        const noFilters = !STATE.mood && !STATE.universe && !STATE.bpm && !STATE.use;
        let visible;
        if (noFilters) visible = [];
        else if (exact.length) visible = exact.slice(0, 12);
        else visible = eligible.slice(0, 4);

        currentMatches = visible;
        if (!source.length) {
            status.textContent = tx('finderChoosePrompt', 'Choose a mood, tempo, or use.');
            const empty = document.createElement('p');
            empty.className = 'finder-empty';
            empty.textContent = tx('finderNoResults', 'No tracks are available right now.');
            results.appendChild(empty);
            return;
        }
        if (noFilters) {
            status.textContent = tx('finderChoosePrompt', 'Choose a mood, tempo, or use.');
            return;
        }
        if (!visible.length) {
            status.textContent = tx('finderNoResults', 'No tracks match your criteria.');
            const empty = document.createElement('p');
            empty.className = 'finder-empty';
            empty.textContent = tx('finderNoResults', 'No tracks match your criteria.');
            results.appendChild(empty);
            return;
        }
        if (!exact.length) status.textContent = tx('finderNoMatch', 'No exact match; here are the closest tracks.');
        else status.textContent = tx(visible.length === 1 ? 'finderResultsOne' : 'finderResultsMany', visible.length === 1 ? '{count} track found' : '{count} tracks found', { count: exact.length });
        visible.forEach(track => results.appendChild(makeResultCard(track, track.match)));
    }

    function setFinderBoardValue(tile, value) {
        const reel = tile.querySelector('.home-finderboard-reel');
        if (!reel) return;
        reel.classList.remove('is-rolling');
        reel.style.transition = 'none';
        reel.style.transform = 'none';
        reel.replaceChildren();
        if (value) {
            const line = document.createElement('i');
            line.textContent = labelFor(tile.dataset.finderboardKey, value);
            reel.appendChild(line);
        }
        tile.dataset.currentValue = value || '';
    }

    function refreshFinderBoardLabels() {
        document.querySelectorAll('#home-finderboard-section .home-finderboard-tile').forEach(tile => {
            const key = tile.dataset.finderboardKey;
            const count = Math.max(...FILTERS[key].values.map(value => labelFor(key, value).length));
            tile.style.setProperty('--finderboard-count', count);
            setFinderBoardValue(tile, tile.dataset.currentValue ?? FILTERS[key].values[0]);
        });
        const board = document.querySelector('#home-finderboard-section .home-finderboard');
        if (board) board.setAttribute('aria-label', tx('finderBoardOpenLabel', 'Open Finder'));
    }

    function rollFinderBoardTile(tile, target, index) {
        const key = tile.dataset.finderboardKey;
        const values = FILTERS[key].values;
        const current = tile.dataset.currentValue || values[Math.floor(Math.random() * values.length)];
        if (target === current) target = values[(values.indexOf(target) + 1) % values.length];
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
            setFinderBoardValue(tile, target);
            return;
        }

        const sequence = [current];
        const hops = 4 + (index % 2);
        for (let step = 0; step < hops; step++) {
            let nextValue;
            do { nextValue = values[Math.floor(Math.random() * values.length)]; }
            while (nextValue === sequence[sequence.length - 1] || (step === hops - 1 && nextValue === target));
            sequence.push(nextValue);
        }
        sequence.push(target);

        const reel = tile.querySelector('.home-finderboard-reel');
        reel.replaceChildren(...sequence.map(value => {
            const line = document.createElement('i');
            line.textContent = labelFor(key, value);
            return line;
        }));
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';
        void reel.offsetWidth;
        const duration = 620;
        reel.classList.add('is-rolling');
        reel.style.transition = `transform ${duration}ms cubic-bezier(.16,.84,.28,1)`;
        reel.style.transform = `translateY(-${((sequence.length - 1) / sequence.length) * 100}%)`;
        window.setTimeout(() => {
            setFinderBoardValue(tile, target);
            tile.classList.add('is-found');
        }, duration + 60);
    }

    const waitForBoard = ms => new Promise(resolve => window.setTimeout(resolve, ms));

    async function runFinderBoardCycle(tiles) {
        const board = document.getElementById('home-finderboard-section');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        tiles.forEach(tile => { tile.classList.remove('is-found'); setFinderBoardValue(tile, ''); });
        if (reduceMotion) {
            tiles.forEach((tile, index) => {
                const values = FILTERS[tile.dataset.finderboardKey].values;
                setFinderBoardValue(tile, values[Math.floor(Math.random() * values.length)]);
            });
            await waitForBoard(5000);
            return;
        }
        for (const [index, tile] of tiles.entries()) {
            if (document.hidden || !board?.offsetParent) { await waitForBoard(1200); return; }
            const values = FILTERS[tile.dataset.finderboardKey].values;
            rollFinderBoardTile(tile, values[Math.floor(Math.random() * values.length)], index);
            await waitForBoard(950);
        }
        tiles.forEach(tile => tile.classList.add('is-found'));
        await waitForBoard(900);
        tiles.forEach(tile => tile.classList.remove('is-found'));
        await waitForBoard(1500);
    }

    function initFinderBoard() {
        const tiles = Array.from(document.querySelectorAll('#home-finderboard-section .home-finderboard-tile'));
        if (!tiles.length) return;
        if (finderBoardTimer) window.clearTimeout(finderBoardTimer);
        tiles.forEach(tile => { tile.classList.remove('is-found'); setFinderBoardValue(tile, ''); });
        refreshFinderBoardLabels();
        const cycle = async () => {
            await runFinderBoardCycle(tiles);
            finderBoardTimer = window.setTimeout(cycle, 0);
        };
        finderBoardTimer = window.setTimeout(cycle, 700);
    }

    function createPicker() {
        if (picker) return picker;
        picker = document.createElement('div');
        picker.className = 'finder-picker-overlay';
        picker.hidden = true;
        picker.innerHTML = `
            <section class="finder-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="finder-picker-title">
                <span class="finder-picker-grab" aria-hidden="true"></span>
                <div class="finder-picker-heading"><span id="finder-picker-title"></span><button type="button" class="finder-picker-close"></button></div>
                <div class="finder-picker-columns"></div>
            </section>`;
        const columns = picker.querySelector('.finder-picker-columns');
        Object.entries(FILTERS).forEach(([key, config]) => {
            const column = document.createElement('div');
            column.className = 'finder-picker-column';
            const label = document.createElement('span');
            label.className = 'finder-picker-label';
            label.textContent = tx(`finder${key[0].toUpperCase()}${key.slice(1)}Label`, config.label);
            const wheel = document.createElement('div');
            wheel.className = 'finder-picker-wheel';
            wheel.dataset.finderWheel = key;
            wheel.setAttribute('role', 'listbox');
            wheel.setAttribute('aria-label', label.textContent);
            const topSpacer = document.createElement('i');
            topSpacer.className = 'finder-wheel-spacer';
            wheel.appendChild(topSpacer);
            [null, ...config.values].forEach(value => {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'finder-wheel-option';
                option.dataset.value = value || '';
                option.setAttribute('role', 'option');
                option.textContent = value ? labelFor(key, value) : tx('finderAny', 'Any');
                wheel.appendChild(option);
            });
            const bottomSpacer = document.createElement('i');
            bottomSpacer.className = 'finder-wheel-spacer';
            wheel.appendChild(bottomSpacer);
            column.append(label, wheel);
            columns.appendChild(column);
        });
        document.body.appendChild(picker);

        picker.querySelector('.finder-picker-close').addEventListener('click', closePicker);
        picker.addEventListener('click', event => { if (event.target === picker) closePicker(); });
        picker.querySelectorAll('.finder-picker-wheel').forEach(wheel => {
            let scrollTimer;
            wheel.addEventListener('scroll', () => {
                if (wheelLock) return;
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => commitWheel(wheel), 90);
            }, { passive: true });
            wheel.addEventListener('click', event => {
                const option = event.target.closest('.finder-wheel-option');
                if (!option) return;
                const options = Array.from(wheel.querySelectorAll('.finder-wheel-option'));
                wheel.scrollTo({ top: options.indexOf(option) * 40, behavior: 'smooth' });
                STATE[wheel.dataset.finderWheel] = option.dataset.value || null;
                syncWheelOptions(wheel);
                renderResults();
            });
            wheel.addEventListener('keydown', event => {
                if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const options = Array.from(wheel.querySelectorAll('.finder-wheel-option'));
                let index = options.findIndex(option => (option.dataset.value || null) === STATE[wheel.dataset.finderWheel]);
                if (event.key === 'ArrowUp') index = Math.max(0, index - 1);
                if (event.key === 'ArrowDown') index = Math.min(options.length - 1, index + 1);
                if (event.key === 'Home') index = 0;
                if (event.key === 'End') index = options.length - 1;
                options[index]?.click();
            });
        });
        return picker;
    }

    function syncWheelOptions(wheel) {
        wheel.querySelectorAll('.finder-wheel-option').forEach(option => {
            const selected = (option.dataset.value || null) === STATE[wheel.dataset.finderWheel];
            option.setAttribute('aria-selected', String(selected));
            option.tabIndex = selected ? 0 : -1;
        });
    }

    function commitWheel(wheel) {
        const options = Array.from(wheel.querySelectorAll('.finder-wheel-option'));
        const index = Math.max(0, Math.min(options.length - 1, Math.round(wheel.scrollTop / 40)));
        const value = options[index]?.dataset.value || null;
        STATE[wheel.dataset.finderWheel] = value;
        syncWheelOptions(wheel);
        renderResults();
    }

    function openPicker(button) {
        const dialog = createPicker();
        returnFocus = button;
        dialog.querySelector('#finder-picker-title').textContent = tx('smartFinder', 'Smart Finder');
        dialog.querySelector('.finder-picker-close').textContent = tx('finderDone', 'OK');
        previousOverflow = document.body.style.overflow;
        wheelLock = true;
        dialog.hidden = false;
        document.body.style.overflow = 'hidden';
        dialog.querySelectorAll('.finder-picker-wheel').forEach(wheel => {
            const options = Array.from(wheel.querySelectorAll('.finder-wheel-option'));
            const index = Math.max(0, options.findIndex(option => (option.dataset.value || null) === STATE[wheel.dataset.finderWheel]));
            wheel.scrollTop = index * 40;
            syncWheelOptions(wheel);
        });
        setTimeout(() => { wheelLock = false; }, 180);
        dialog.querySelector('.finder-picker-close').focus();
    }

    function closePicker() {
        if (!picker || picker.hidden) return;
        picker.hidden = true;
        document.body.style.overflow = previousOverflow;
        returnFocus?.focus();
    }

    function surpriseMe() {
        const pool = poolCache.length ? poolCache : buildPool();
        if (!pool.length) return;
        const choice = pool[Math.floor(Math.random() * pool.length)];
        STATE.mood = choice.moods[Math.floor(Math.random() * choice.moods.length)] || choice.mood;
        STATE.universe = choice.universes[Math.floor(Math.random() * choice.universes.length)] || null;
        STATE.bpm = tempoFor(choice.bpm);
        STATE.use = choice.usages[Math.floor(Math.random() * choice.usages.length)] || null;
        renderResults();
    }

    function navigateToFinder() {
        if (typeof handleMenuNavigation === 'function') handleMenuNavigation('finder-section');
        else document.getElementById('finder-section')?.classList.remove('hidden');
    }

    function init() {
        createPicker();
        initFinderBoard();
        const surpriseIcon = document.getElementById('finder-surprise-icon');
        if (surpriseIcon && typeof window.useIcon === 'function') surpriseIcon.innerHTML = window.useIcon('shuffle', 18);
        document.getElementById('switch-finder')?.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (document.getElementById('switch-finder').classList.contains('active')) return;
            if (typeof playAudio === 'function' && typeof sounds !== 'undefined') playAudio(sounds.select);
            navigateToFinder();
        });
        document.querySelectorAll('[data-finder-open]').forEach(button => button.addEventListener('click', event => {
            event.preventDefault();
            if (typeof playAudio === 'function' && typeof sounds !== 'undefined') playAudio(sounds.select);
            navigateToFinder();
        }));
        document.querySelectorAll('[data-finder-open-collections]').forEach(link => link.addEventListener('click', event => {
            event.preventDefault();
            if (typeof handleMenuNavigation === 'function') handleMenuNavigation('contents-albums-section');
        }));
        document.querySelectorAll('#finder-section .finder-choice').forEach(button => button.addEventListener('click', () => openPicker(button)));
        document.getElementById('finder-surprise')?.addEventListener('click', surpriseMe);
        document.getElementById('finder-results')?.addEventListener('click', event => {
            const card = event.target.closest('[data-finder-item]');
            if (!card) return;
            const item = typeof findItemById === 'function' ? findItemById(card.dataset.finderItem) : null;
            if (!item || typeof playVideoWhenReady !== 'function') return;
            if (typeof playAudio === 'function' && typeof sounds !== 'undefined') playAudio(sounds.select);
            playVideoWhenReady(item, [], -1, 'titles', true);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && picker && !picker.hidden) closePicker();
        });
        window.addEventListener('resize', () => {
            if (!picker || picker.hidden) return;
            picker.querySelectorAll('.finder-picker-wheel').forEach(wheel => {
                const options = Array.from(wheel.querySelectorAll('.finder-wheel-option'));
                const index = Math.max(0, options.findIndex(option => (option.dataset.value || null) === STATE[wheel.dataset.finderWheel]));
                wheel.scrollTop = index * 40;
            });
        });
        renderResults();
    }

    function refreshForLanguage() {
        if (picker) {
            picker.querySelector('#finder-picker-title').textContent = tx('smartFinder', 'Smart Finder');
            picker.querySelector('.finder-picker-close').textContent = tx('finderDone', 'OK');
            picker.querySelectorAll('.finder-picker-wheel').forEach(wheel => {
                const key = wheel.dataset.finderWheel;
                const label = wheel.closest('.finder-picker-column').querySelector('.finder-picker-label');
                label.textContent = tx(`finder${key[0].toUpperCase()}${key.slice(1)}Label`, FILTERS[key].label);
                wheel.setAttribute('aria-label', label.textContent);
                wheel.querySelectorAll('.finder-wheel-option').forEach(option => {
                    const value = option.dataset.value || null;
                    option.textContent = value ? labelFor(key, value) : tx('finderAny', 'Any');
                });
            });
        }
        renderResults();
    }

    window.openSmartFinder = navigateToFinder;
    window.addEventListener('mmg:language-changed', refreshForLanguage);
    window.addEventListener('mmg:language-changed', refreshFinderBoardLabels);
    if (window.dataLoadedPromise && typeof window.dataLoadedPromise.then === 'function') {
        window.dataLoadedPromise.then(init).catch(error => console.error('[Finder] Could not initialize:', error));
    } else {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    }
})();
