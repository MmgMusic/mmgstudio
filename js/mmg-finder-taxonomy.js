/* Editable vocabulary bridge: real catalogue tags -> Smart Finder choices. */
(function () {
    'use strict';

    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    const taxonomy = {
        universes: {
            urban: ['rap', 'trap', 'drill', 'lo-fi', 'lofi', 'boom bap'],
            club: ['house', 'dnb', 'drum & bass', 'big beat', 'techno'],
            digital: ['frutiger aero', 'synthwave', 'ambient'],
            groove: ['funk', 'disco', 'soul', 'r&b'],
            organic: ['jazz', 'blues', 'classical', 'classique', 'orchestral']
        },
        moods: {
            chill: ['chill', 'calm', 'lo-fi', 'lofi', 'ambient'],
            energetic: ['energetic', 'dance', 'racing', 'trap', 'drill', 'drum & bass', 'dnb', 'battle'],
            dark: ['dark', 'mysterious', 'tension', 'cave'],
            nostalgic: ['nostalgic', 'nostalgia', 'retro', 'playstation', 'chiptune', 'waltz'],
            bright: ['bright', 'fresh', 'sunny', 'frutiger aero', 'underwater', 'snow', 'pop'],
            epic: ['epic', 'cinematic', 'movie', 'orchestral', 'western', 'ethnic']
        },
        usages: {
            voice: ['rap', 'trap', 'drill', 'boom bap', 'vocal', 'vocals', 'voice', 'chant', 'song'],
            game: ['game', 'gaming', 'video game', 'playstation', 'spotimon', 'racing', 'battle'],
            video: ['video', 'youtube', 'movie', 'cinematic', 'promo', 'intro'],
            listening: ['listening', 'focus', 'study', 'relax', 'chill', 'ambient', 'lo-fi', 'lofi']
        },
        tempo: [
            { id: 'slow', min: 0, max: 85 },
            { id: 'moderate', min: 85, max: 110 },
            { id: 'fast', min: 110, max: 135 },
            { id: 'veryFast', min: 135, max: Infinity }
        ],
    };

    taxonomy.normalize = normalize;
    taxonomy.fromTags = function (tags, dimension) {
        const groups = taxonomy[dimension] || {};
        const normalizedTags = (tags || []).map(normalize);
        return Object.entries(groups).filter(([, aliases]) => {
            const normalizedAliases = aliases.map(normalize);
            return normalizedTags.some(tag => tag && normalizedAliases.some(alias => tag === alias || tag.includes(alias) || alias.includes(tag)));
        }).map(([id]) => id);
    };
    taxonomy.tempoFor = function (bpm) {
        const value = Number(bpm);
        return taxonomy.tempo.find(range => value >= range.min && value < range.max)?.id || null;
    };

    window.MMGFinderTaxonomy = taxonomy;
})();
