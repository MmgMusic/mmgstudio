// js/main.js — Point d'entrée Vite
//
// On importe les CSS normalement (Vite les gère très bien).
// Pour les JS, on garde le chargement classique via des scripts
// non-module pour éviter les problèmes de scope entre fichiers.
// C'est la solution la plus simple sans modifier tous tes fichiers JS.

// ── CSS ──────────────────────────────────────────────────────
// Les CSS sans media query sont importés normalement via Vite.
// mobile.css et computer.css doivent garder leur media query —
// on les injecte manuellement comme dans l'index.html original.

import '../css/common.css';
import '../css/backgrounds.css';
import '../css/guides.css';
import '../css/intro.css';
import '../css/font-awesome.custom.min.css';
import '../css/default-2-theme.css';
import '../css/frutiger-aero-theme.css';
import '../css/music-studio-theme.css';
import '../css/ps3-theme.css';
import '../css/spotimon-theme.css';

// mobile.css et computer.css avec leurs media queries respectives
function injectConditionalCSS(href, media) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = media;
    document.head.appendChild(link);
}

injectConditionalCSS('/css/mobile.css', '(max-width: 952px)');
injectConditionalCSS('/css/computer.css', '(min-width: 953px)');

// ── JS — chargement dans le bon ordre ────────────────────────
// On utilise des imports dynamiques classiques pour que toutes
// les variables restent accessibles globalement entre les fichiers,
// exactement comme avant avec les balises <script> dans le HTML.

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Si déjà chargé, on passe directement
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Impossible de charger : ${src}`));
    document.head.appendChild(script);
  });
}

// Chargement séquentiel — l'ordre est important !
async function loadAllScripts() {
  const scripts = [
    '/js/languages.js',
    '/js/guide-steps.js',
    '/js/guides.js',
    '/js/mmg-music-shop-logic.js',
    '/js/mmg-music-ui-render.js',
    '/js/accessibility.js',
    '/js/intro.js',
    '/js/mmg-music-contents.js',
  ];

  for (const src of scripts) {
    await loadScript(src);
  }
}

loadAllScripts().catch(err => console.error('Erreur chargement scripts :', err));
