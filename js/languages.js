/**
 * languages.js - Chargeur de langues à la demande
 */
const translations = {};
const LOADING_PROMISES = {};

/**
 * Charge un fichier de langue de manière asynchrone
 * @param {string} lang - 'fr' ou 'en'
 */
async function loadLanguage(lang) {
    // Si déjà chargé, on retourne immédiatement
    if (translations[lang]) return translations[lang];
    
    // Si un chargement est déjà en cours pour cette langue, on attend la même promesse
    if (LOADING_PROMISES[lang]) return LOADING_PROMISES[lang];

    LOADING_PROMISES[lang] = new Promise((resolve, reject) => {
        logger.log(`[Lang] Loading language: ${lang}...`);
        const script = document.createElement('script');
        script.src = `js/languages-${lang}.js?v=2.0`;
        script.async = true;
        
        script.onload = () => {
            // On récupère l'objet injecté dans window par le script chargé
            const key = `TRANSLATIONS_${lang.toUpperCase()}`;
            if (window[key]) {
                translations[lang] = window[key];
                logger.log(`[Lang] Language ${lang} loaded.`);
                resolve(translations[lang]);
            } else {
                reject(new Error(`Translations key ${key} not found after loading script.`));
            }
        };

        script.onerror = () => {
            reject(new Error(`Failed to load translation file: ${script.src}`));
        };

        document.head.appendChild(script);
    });

    return LOADING_PROMISES[lang];
}

// Initialise l'objet translations vide (sera rempli par loadLanguage)
window.translations = translations;
window.loadLanguage = loadLanguage;
