/**
 * js/icons.js
 * Dictionnaire centralisé des icônes SVG pour optimiser le poids et la maintenance.
 */
const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.logger = {
    log: IS_DEV ? console.log.bind(console) : () => { },
    warn: IS_DEV ? console.warn.bind(console) : () => { },
    error: IS_DEV ? console.error.bind(console) : () => { },
};

window.APP_ICONS = {
    spotify: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.492 17.31c-.216.353-.673.464-1.023.248-2.812-1.718-6.352-2.106-10.52-1.153-.404.093-.812-.16-.906-.563-.093-.403.16-.81.562-.905 4.567-1.045 8.48-.6 11.636 1.328.35.215.462.67.25 1.025zm1.464-3.262c-.272.443-.848.583-1.293.31-3.22-1.977-8.125-2.55-11.93-1.397-.502.152-1.03-.133-1.183-.634-.153-.502.132-1.032.634-1.185 4.35-1.32 9.75-.668 13.41 1.58.443.272.585.848.312 1.293zm.126-3.41c-3.86-2.292-10.237-2.504-13.903-1.39-.593.18-1.223-.153-1.403-.746-.18-.593.153-1.223.746-1.403 4.22-1.282 11.264-1.03 15.666 1.583.532.316.706 1.002.39 1.533-.316.532-1.002.705-1.534.39l-.062-.037z"/></svg>`,
    youtube: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505a3.017 3.017 0 0 0-2.122 2.136C0 8.055 0 12 0 12s0 3.945.501 5.814a3.017 3.017 0 0 0 2.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.945 24 12 24 12s0-3.945-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    appleMusic: `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25"/></svg>`,
    tidal: `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4l-4 4-4-4-4 4 4 4 4-4 4 4-4 4 4 4 4-4-4-4 4-4zm4 4l4-4 4 4-4 4z"/></svg>`,
    amazonMusic: `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M1.04 17.52q.1-.16.32-.02a21.3 21.3 0 0 0 10.88 2.9a21.5 21.5 0 0 0 7.74-1.46q.1-.04.29-.12t.27-.12a.356.356 0 0 1 .47.12q.17.24-.11.44q-.36.26-.92.6a15 15 0 0 1-3.84 1.58A16.2 16.2 0 0 1 12 22a16 16 0 0 1-5.9-1.09a16.3 16.3 0 0 1-4.98-3.07a.27.27 0 0 1-.12-.2a.2.2 0 0 1 .04-.12m6.02-5.7a4.04 4.04 0 0 1 .68-2.36A4.2 4.2 0 0 1 9.6 7.98a10 10 0 0 1 2.66-.66q.54-.06 1.76-.16v-.34a3.56 3.56 0 0 0-.28-1.72a1.5 1.5 0 0 0-1.32-.6h-.16a2.2 2.2 0 0 0-1.14.42a1.64 1.64 0 0 0-.62 1a.51.51 0 0 1-.4.46L7.8 6.1q-.34-.08-.34-.36a.6.6 0 0 1 .02-.14a3.83 3.83 0 0 1 1.67-2.64A6.27 6.27 0 0 1 12.26 2h.5a5.05 5.05 0 0 1 3.56 1.18a4 4 0 0 1 .37.43a4 4 0 0 1 .27.41a2 2 0 0 1 .18.52q.08.34.12.47a3 3 0 0 1 .06.56q.02.43.02.51v4.84a2.9 2.9 0 0 0 .15.95a2.5 2.5 0 0 0 .29.62q.14.19.46.61a.6.6 0 0 1 .12.32a.35.35 0 0 1-.16.28q-1.66 1.44-1.8 1.56a.56.56 0 0 1-.58.04q-.28-.24-.49-.46t-.3-.32a5 5 0 0 1-.29-.39q-.2-.29-.28-.39a4.9 4.9 0 0 1-2.2 1.52a6 6 0 0 1-1.68.2a3.5 3.5 0 0 1-2.53-.95a3.55 3.55 0 0 1-.99-2.69m3.44-.4a1.9 1.9 0 0 0 .39 1.25a1.3 1.3 0 0 0 1.05.47a1 1 0 0 0 .17-.02a1 1 0 0 1 .15-.02a2.03 2.03 0 0 0 1.3-1.08a3.1 3.1 0 0 0 .33-.83a4 4 0 0 0 .12-.73q.01-.28.01-.92v-.5a7.3 7.3 0 0 0-1.76.16a2.144 2.144 0 0 0-1.76 2.22m8.4 6.44a.6.6 0 0 1 .12-.16a3.1 3.1 0 0 1 .96-.46a6.5 6.5 0 0 1 1.48-.22a1.2 1.2 0 0 1 .38.02q.9.08 1.08.3a.66.66 0 0 1 .08.36v.14a4.6 4.6 0 0 1-.38 1.65a3.84 3.84 0 0 1-1.06 1.53a.3.3 0 0 1-.18.08a.2.2 0 0 1-.08-.02q-.12-.06-.06-.22a7.6 7.6 0 0 0 .74-2.42a.5.5 0 0 0-.08-.32q-.2-.24-1.12-.24q-.34 0-.8.04q-.5.06-.92.12a.23.23 0 0 1-.16-.04a.065.065 0 0 1-.02-.08a.2.2 0 0 1 .02-.06"/></svg>`,
    deezer: `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18.774 5.051c.185-1.072.457-1.747.757-1.748.561 0 1.015 2.341 1.015 5.228s-.455 5.229-1.016 5.229c-.23 0-.443-.4-.614-1.064-.27 2.439-.831 4.115-1.48 4.115-.5 0-.953-1.007-1.256-2.594-.207 3.018-.727 5.161-1.334 5.161-.381 0-.73-.848-.987-2.231C13.55 20 12.834 22 12 22s-1.551-2-1.86-4.853c-.255 1.383-.6 2.231-.986 2.231-.609 0-1.128-2.142-1.335-5.161-.3 1.587-.752 2.594-1.256 2.594-.649 0-1.21-1.676-1.481-4.115-.169.668-.382 1.064-.613 1.064-.562 0-1.017-2.34-1.017-5.229S3.908 3.3 4.471 3.3c.3 0 .57.676.758 1.748C5.527 3.2 6.014 2 6.564 2c.653 0 1.219 1.7 1.487 4.168.262-1.8.658-2.941 1.1-2.941.624 0 1.154 2.252 1.351 5.393C10.874 7.01 11.41 6 12 6s1.128 1.011 1.5 2.62c.2-3.141.727-5.393 1.351-5.393.444 0 .84 1.145 1.1 2.941C16.219 3.7 16.785 2 17.439 2c.547 0 1.035 1.2 1.335 3.051m-16.2 5.3C2.258 10.355 2 9.31 2 8.017s.258-2.337.576-2.337.578 1.044.578 2.337-.254 2.338-.578 2.338Zm18.848 0c-.32 0-.577-1.045-.577-2.338s.257-2.337.577-2.337S22 6.724 22 8.017s-.258 2.338-.576 2.338Z"/></svg>`,
    instagram: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
    play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16a1 1 0 0 0 1.524.852l13-8a1 1 0 0 0 0-1.704l-13-8A1 1 0 0 0 6 4"/></svg>`,
    pause: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m8 0h-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2"/></svg>`,
    playOutline: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
    pauseOutline: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="8" width="1.5" height="8"/><rect x="13.5" y="8" width="1.5" height="8"/></svg>`,
    prev: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m19.496 4.136l-12 7a1 1 0 0 0 0 1.728l12 7A1 1 0 0 0 21 19V5a1 1 0 0 0-1.504-.864"><animateTransform class="draw" attributeName="transform" type="translate" values="0 0; -2 0; 0 0" dur="0.3s" begin="indefinite"/></path><path d="M4 4a1 1 0 0 1 .993.883L5 5v14a1 1 0 0 1-1.993.117L3 19V5a1 1 0 0 1 1-1"/></svg>`,
    next: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14a1 1 0 0 0 1.504.864l12-7a1 1 0 0 0 0-1.728l-12-7A1 1 0 0 0 3 5"><animateTransform class="draw" attributeName="transform" type="translate" values="0 0; 2 0; 0 0" dur="0.3s" begin="indefinite"/></path><path d="M20 4a1 1 0 0 1 .993.883L21 5v14a1 1 0 0 1-1.993.117L19 19V5a1 1 0 0 1 1-1"/></svg>`,
    shuffle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" stroke-dasharray="20" stroke-dashoffset="0"><animate class="draw" attributeName="stroke-dashoffset" values="20;0" dur="0.4s" begin="indefinite"/></path><path d="m18 2 4 4-4 4" stroke-dasharray="20" stroke-dashoffset="0"><animate class="draw" attributeName="stroke-dashoffset" values="20;0" dur="0.4s" begin="indefinite"/></path><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" stroke-dasharray="40" stroke-dashoffset="0"><animate class="draw" attributeName="stroke-dashoffset" values="40;0" dur="0.5s" begin="indefinite"/></path><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" stroke-dasharray="20" stroke-dashoffset="0"><animate class="draw" attributeName="stroke-dashoffset" values="20;0" dur="0.4s" begin="indefinite"/></path><path d="m18 14 4 4-4 4" stroke-dasharray="20" stroke-dashoffset="0"><animate class="draw" attributeName="stroke-dashoffset" values="20;0" dur="0.4s" begin="indefinite"/></path></svg>`,
    loop: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12V9a3 3 0 0 1 3-3h13m-3-3l3 3l-3 3m3 3v3a3 3 0 0 1-3 3H4m3 3l-3-3l3-3"><animateTransform class="draw" attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.5s" begin="indefinite"/></path></svg>`,
    chevronDown: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9l6 6l6-6"/></svg>`,
    chevronRight: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-12 9 6"/></svg>`,
    chevronRightSmall: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
    chevronLeftSmall: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
    search: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"><animateTransform class="draw" attributeName="transform" type="translate" values="0 0; 2 2; 0 0" dur="0.3s" begin="indefinite"/></path></svg>`,
    tag: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"><animate class="draw" attributeName="r" values=".5; 2; .5" dur="0.5s" begin="indefinite"/></circle></svg>`,
    bell: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"><animateTransform class="draw" attributeName="transform" type="rotate" values="0 12 8; 15 12 8; -15 12 8; 0 12 8" dur="0.5s" begin="indefinite"/></path></svg>`,
    lock: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 22h12c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5S7 4.24 7 7v2H6c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2M9 7c0-1.65 1.35-3 3-3s3 1.35 3 3v2H9z"/></svg>`,
    heart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    heartFilled: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    star: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    clock: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    calendar: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    volume: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path fill="none" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path fill="none" d="M3 6h18"/><path fill="none" d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    bars: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    close: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    stepForward: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>`,
    list: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    share: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    check: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    plus: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    arrowLeft: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
    arrowRight: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    checkCircle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    ellipsis: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
    "fa-sun": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
    "fa-microchip": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
    expand: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 3 6 6M9 21l-6-6M21 3v6M3 21v-6M15 3h6M9 21H3"/></svg>`,
    compress: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 6-6 6M6 18l6-6M12 6v6M12 18v-6M18 6h-6M6 18h6"/></svg>`,
    monitor: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
    exchange: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
    bolt: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 L3 14 H12 L11 22 L21 10 H12 L13 2 Z"/></svg>`,
    phone: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
    unlock: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
    save: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    grid: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
    house: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"><animateTransform attributeName="transform" type="scale" values="1 1;0.9 1.1;1.1 0.9;1 1" dur="0.4s" begin="indefinite" transform-origin="12 15" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/></path></svg>`,
    'disc-album': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><g><circle cx="12" cy="12" r="5"/><path d="M12 12h.01"/><animateTransform attributeName="transform" type="translate" values="0 0;20 0;20 0;-20 0;0 0" dur="0.6s" begin="indefinite" calcMode="array" keyTimes="0;0.3;0.31;0.32;1"/><animate attributeName="opacity" values="1;0;0;0;1" dur="0.6s" begin="indefinite" keyTimes="0;0.3;0.31;0.69;0.7"/></g></svg>`,
    tv: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2-5 5-5-5"><animateTransform attributeName="transform" type="rotate" values="0 12 7;15 12 7;-15 12 7;0 12 7" dur="0.4s" begin="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"/></path><rect width="20" height="15" x="2" y="7" rx="2"/></svg>`,
    'shopping-bag': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8zM3.103 6.034h17.794"><animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0" dur="0.3s" begin="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/></path><path d="M16 10a4 4 0 0 1-8 0"><animateTransform attributeName="transform" type="scale" values="1 1;1 1.25;1 1" dur="0.4s" begin="indefinite" transform-origin="12 10" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/></path></svg>`,
    library: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 6 4 14"><animateTransform attributeName="transform" type="rotate" values="0 18 20;10 18 20;0 18 20" dur="0.4s" begin="indefinite" delay="0.15s"/></path><path d="M12 6v14"><animateTransform attributeName="transform" type="rotate" values="0 12 20;15 12 20;0 12 20" dur="0.4s" begin="indefinite" delay="0.1s"/></path><path d="M8 8v12"><animateTransform attributeName="transform" type="rotate" values="0 8 20;20 8 20;0 8 20" dur="0.4s" begin="indefinite" delay="0.05s"/></path><path d="M4 4v16"><animateTransform attributeName="transform" type="rotate" values="0 4 20;25 4 20;0 4 20" dur="0.4s" begin="indefinite"/></path></svg>`,
    monitor: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
    info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

// Standalone SVG constants for Bonus system (exposed globally to avoid ReferenceError)
window.COIN_SVG = `<svg width="1em" height="1em" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="coin-icon-svg" style="display:inline-block;vertical-align:middle"><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="8"/><path d="M33.5 64H25V45q0-4 2-7 1.5-3 5-4.5T39 32q3 0 6 1.5t5 4.5q2-3 5-4.5T61.5 32q4 0 7 1.5t5.5 4.5Q75 41 75 45v19h-8.5V45q0-2.5-1.5-4T61 39.5q-2.5 0-4 1.5T55.5 45v19h-11V45q0-2.5-1.5-4T39 39.5q-2.5 0-4 1.5T33.5 45v19Z" fill="currentColor"/></svg>`;
window.GIFT_SVG = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gift-icon-svg"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`;
window.CHECK_SVG = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="check-icon-svg"><polyline points="20 6 9 17 4 12"/></svg>`;

/**
 * window.useIcon
 * Retourne une balise <svg> utilisant le sprite injectÃ© dans le body.
 * Chantier 11 : Optimisation via <use>.
 */
window.ANIMATED_ICONS = new Set(['bell', 'search', 'tag', 'shuffle', 'loop', 'prev', 'next', 'stepForward', 'disc-album', 'tv', 'shopping-bag', 'library', 'house']);

window.useIcon = (id, size = 24, className = "") => {
    // Si l'icône est animée, on l'injecte en entier au lieu d'utiliser <use>
    // car beginElement() ne fonctionne pas sur les instances de <use>.
    if (window.ANIMATED_ICONS.has(id) && window.APP_ICONS[id]) {
        return window.APP_ICONS[id].replace('<svg ', `<svg width="${size}" height="${size}" class="${className}" `);
    }
    return `<svg width="${size}" height="${size}" class="${className}" style="display:inline-block; vertical-align:middle;"><use href="#icon-${id}"/></svg>`;
};

/**
 * Initialise le sprite SVG dans le body.
 */
function initializeSvgSprite() {
    if (document.getElementById('app-svg-sprite')) return;
    let spriteContent = '<svg id="app-svg-sprite" xmlns="http://www.w3.org/2000/svg" style="display:none">';
    for (const [key, svgString] of Object.entries(window.APP_ICONS)) {
        const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";
        // On conserve les attributs de l'original (fill, stroke, stroke-width...)
        // mais on les place sur un <g> interne car <symbol> ne supporte pas tout.
        const content = svgString
            .replace(/<svg([^>]*)>/, '<g$1>')
            .replace(/<\/svg>/, '</g>')
            .replace(/width="[^"]*"/g, '')  // Supprime width/height pour éviter les conflits
            .replace(/height="[^"]*"/g, '')
            .replace(/viewBox="[^"]*"/g, '');
        
        spriteContent += `<symbol id="icon-${key}" viewBox="${viewBox}">${content}</symbol>`;
    }
    spriteContent += '</svg>';
    document.body.insertAdjacentHTML('afterbegin', spriteContent);
}

// FA Mapping for Auto-Replacement
window.FA_TO_SVG_MAP = {
    'fa-heart': 'heart',
    'fa-plus': 'plus',
    'fa-check': 'check',
    'fa-times': 'close',
    'fa-bars': 'bars',
    'fa-trash-alt': 'trash',
    'fa-trash': 'trash',
    'fa-share-alt': 'share',
    'fa-list-ul': 'list',
    'fa-step-forward': 'stepForward',
    'fa-volume-up': 'volume',
    'fa-expand': 'expand',
    'fa-compress': 'compress',
    'fa-chevron-down': 'chevronDown',
    'fa-chevron-right': 'chevronRightSmall',
    'fa-chevron-left': 'chevronLeftSmall',
    'fa-arrow-left': 'arrowLeft',
    'fa-arrow-right': 'arrowRight',
    'fa-desktop': 'house',
    'fa-exchange-alt': 'exchange',
    'fa-play-circle': 'play',
    'fa-play': 'play',
    'fa-bolt': 'bolt',
    'fa-bell': 'bell',
    'fa-mobile-alt': 'phone',
    'fa-unlock-alt': 'unlock',
    'fa-th-large': 'grid',
    'fa-list': 'list',
    'fa-save': 'save',
    'fa-check-circle': 'checkCircle',
    'fa-ellipsis-h': 'ellipsis',
    'fa-level-up-alt': 'next'
};

document.addEventListener('DOMContentLoaded', () => {
    initializeSvgSprite();
    const replaceIcons = () => {
        document.querySelectorAll('i[class*="fa-"]').forEach(icon => {
            const classes = Array.from(icon.classList);
            const faClass = classes.find(c => c.startsWith('fa-'));
            if (faClass && window.FA_TO_SVG_MAP[faClass]) {
                const svgName = window.FA_TO_SVG_MAP[faClass];
                const span = document.createElement('span');
                Array.from(icon.attributes).forEach(attr => span.setAttribute(attr.name, attr.value));
                span.className = icon.className.replace('fas', 'svg-icon').replace('far', 'svg-icon').replace('fab', 'svg-icon');
                span.innerHTML = window.useIcon(svgName, 24);
                icon.parentNode.replaceChild(span, icon);
            }
        });
    };
    replaceIcons();
    const observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.addedNodes.length > 0)) replaceIcons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
});