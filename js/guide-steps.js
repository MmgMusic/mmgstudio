/* Données structurées pour le système de guides interactifs */

window.GUIDE_STEPS = {
    // GUIDE 1 : Navigation et Interface (Version Finale)
    navigation: [
        {
            id: 'nav_intro',
            guideTitle: { fr: "Navigation & Interface", en: "Navigation & Interface" },
            targets: ['#mmg-branding', '#spotimon-profile-switch'],
            title: { fr: "Le Switch d'Univers", en: "Universe Switch" },
            content: {
                fr: "Basculez instantanément entre les univers MMG MUSIC et MMG BEATS en un clic.",
                en: "Instantly switch between MMG MUSIC and MMG BEATS universes with one click."
            },
            position: 'right',
            onEnter: () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (window.handleMenuNavigation) window.handleMenuNavigation('home-dashboard-section');
            }
        },
        {
            id: 'nav_exploration',
            targets: ['#sidebar-main-nav'],
            title: { fr: "Exploration", en: "Exploration" },
            content: {
                fr: "Votre menu principal pour explorer l'Accueil, les Albums, les Vidéos, la Boutique et votre Bibliothèque.",
                en: "Your main menu to explore Home, Albums, Videos, Shop, and your Library."
            },
            position: 'right'
        },
        {
            id: 'nav_search',
            targets: ['.search-bar'],
            title: { fr: "Recherche", en: "Search" },
            content: {
                fr: "Cherchez un titre, un album ou filtrez le contenu par tags (genre, ambiance...).",
                en: "Search for a track, album, or filter content by tags (genre, mood...)."
            },
            position: 'bottom'
        },
        {
            id: 'nav_icons_top',
            targets: ['#notifications-btn', '#top-bar-settings-btn'],
            title: { fr: "Paramètres & Notifs", en: "Settings & Notifs" },
            content: {
                fr: "Gérez vos réglages (thème, audio, langue) et consultez vos notifications ici.",
                en: "Manage your settings (theme, audio, language) and check your notifications here."
            },
            position: 'bottom'
        },
        {
            id: 'nav_player_full',
            targets: ['.bottom-ui-container'],
            title: { fr: "Lecteur & Options", en: "Player & Options" },
            content: {
                fr: "Contrôlez la lecture, le volume et accédez aux options avancées (file d'attente, partage) depuis cette barre.",
                en: "Control playback, volume, and access advanced options (queue, sharing) from this bar."
            },
            position: 'top'
        }
    ],

    // GUIDE 2 : Contenu et Pages (Version Finale PC)
    pages: [
        {
            id: 'page_home_hero',
            guideTitle: { fr: "Sections du Site", en: "Site Sections" },
            targets: ['.carousel-card', '#daily-bonus-section', '.upcoming-release-card'],
            title: { fr: "À la Une & Bonus", en: "Featured & Bonus" },
            content: {
                fr: "Retrouvez les sorties majeures, réclamez vos pièces quotidiennes et surveillez les sorties 'Coming Soon' !",
                en: "Find major releases, claim your daily coins, and watch for 'Coming Soon' releases!"
            },
            position: 'bottom',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('home-dashboard-section');
            }
        },
        {
            id: 'page_home_reco_news',
            targets: ['#playlist-reco-list', '.news-card-container'],
            title: { fr: "Playlists & News", en: "Playlists & News" },
            content: {
                fr: "Découvrez les playlists recommandées par Mmg (ambiances, styles) et les dernières news du site.",
                en: "Discover Mmg's recommended playlists (moods, styles) and the latest site news."
            },
            position: 'top'
        },
        {
            id: 'page_home_guides',
            targets: ['.dashboard-guide-section'],
            title: { fr: "Accès aux Guides", en: "Access to Guides" },
            content: {
                fr: "Besoin d'aide ? Les guides sont accessibles ici à tout moment sur la page d'accueil.",
                en: "Need help? Guides are accessible here at any time on the home page."
            },
            position: 'top'
        },
        {
            id: 'page_home_about',
            targets: ['.dashboard-about-section'],
            title: { fr: "À Propos & Réseaux", en: "About & Socials" },
            content: {
                fr: "Liens de streaming, réseaux sociaux et informations sur l'artiste. Vous pouvez aussi switcher de profil ici !",
                en: "Streaming links, social media, and artist info. You can also switch profiles here!"
            },
            position: 'top'
        },
        {
            id: 'page_albums',
            targets: ['#albums-section'],
            title: { fr: "Section Albums", en: "Albums Section" },
            content: {
                fr: "Explorez toute la discographie classée par albums et singles.",
                en: "Explore the entire discography sorted by albums and singles."
            },
            position: 'top',
            delay: 800,
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('albums-section');
            }
        },
        {
            id: 'page_track_details',
            targets: ['.music-info-panel'],
            title: { fr: "Page de Détails", en: "Details Page" },
            content: {
                fr: "En cliquant sur un titre, vous découvrez ses inspirations, ses tags et ses vidéos liées.",
                en: "By clicking on a track, you discover its inspirations, tags, and related videos."
            },
            position: 'top',
            delay: 1500, // Ajusté pour la séquence directe (1400ms)
            onEnter: () => {
                // 1. Navigation directe vers les titres de l'album (album2)
                if (window.handleMenuNavigation) {
                    window.handleMenuNavigation('titles-section', true, { type: 'titles', data: 'album2' });
                }

                setTimeout(() => {
                    // 2. Chercher le titre "La Rencontre" par son ID fiable
                    const targetTrack = document.querySelector('.card[data-item-id="title18"]');

                    if (targetTrack) {
                        // Scroll pour rendre visible
                        targetTrack.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        targetTrack.classList.add('guide-click-feedback');

                        setTimeout(() => {
                            targetTrack.classList.remove('guide-click-feedback');

                            // Cliquer sur le lien interne pour le listener délégué
                            const trackLink = targetTrack.querySelector('.card-link-wrapper');
                            if (trackLink) trackLink.click(); else targetTrack.click();

                            // Forcer l'affichage de la section détails
                            setTimeout(() => {
                                if (window.showSection) window.showSection('music-title-details-section');
                            }, 200);
                        }, 400);
                    }
                }, 800); // Temps de chargement des titres
            }
        },
        {
            id: 'page_videos',
            targets: ['#videos-section'],
            title: { fr: "Vidéos & Bonus", en: "Videos & Bonus" },
            content: {
                fr: "Clips officiels, Making-ofs et contenus bonus exclusifs.",
                en: "Official music videos, Making-ofs, and exclusive bonus content."
            },
            position: 'top',
            delay: 800,
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('videos-section');
            }
        },
        {
            id: 'page_library',
            targets: ['#library-section'],
            title: { fr: "Bibliothèque", en: "Library" },
            content: {
                fr: "Vos likes, les playlists Mmg Studio et vos propres listes enregistrées.",
                en: "Your likes, Mmg Studio playlists, and your own saved lists."
            },
            position: 'top',
            delay: 800,
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('library-section');
            }
        },
        {
            id: 'page_shop',
            targets: ['#shop-section'],
            title: { fr: "Boutique", en: "Shop" },
            content: {
                fr: "Débloquez des thèmes, fonds d'écran et morceaux bonus avec vos pièces.",
                en: "Unlock themes, wallpapers, and bonus tracks with your coins."
            },
            position: 'top',
            delay: 800,
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('shop-section');
            }
        }
    ],

    // Versions mobiles (Complètes et adaptées)
    navigation_mobile: [
        {
            id: 'nav_intro_mobile',
            guideTitle: { fr: "Navigation Mobile", en: "Mobile Navigation" },
            targets: ['#mobile-profile-switch'],
            title: { fr: "Switch de Profil", en: "Profile Switch" },
            content: {
                fr: "Basculez instantanément entre les univers MMG MUSIC et MMG BEATS en un clic.",
                en: "Instantly switch between MMG MUSIC and MMG BEATS universes with one click."
            },
            position: 'bottom',
            onEnter: () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (window.handleMenuNavigation) window.handleMenuNavigation('home-dashboard-section');
            }
        },
        {
            id: 'nav_mobile_bar',
            targets: ['#mobile-bottom-nav'],
            title: { fr: "Barre de Navigation", en: "Navigation Bar" },
            content: {
                fr: "Votre menu principal pour explorer l'Accueil, les Albums, les Vidéos, la Boutique et votre Bibliothèque.",
                en: "Your main menu to explore Home, Albums, Videos, Shop, and your Library."
            },
            position: 'top'
        },
        {
            id: 'nav_mobile_search',
            targets: ['#mobile-search-btn'],
            title: { fr: "Recherche", en: "Search" },
            content: {
                fr: "Cherchez un titre, un album ou filtrez le contenu par tags (genre, ambiance...).",
                en: "Search for a track, album, or filter content by tags (genre, mood...)."
            },
            position: 'bottom'
        },
        {
            id: 'nav_mobile_settings',
            targets: ['#mobile-settings-btn', '#mobile-notifications-btn'],
            title: { fr: "Paramètres & Notifs", en: "Settings & Notifs" },
            content: {
                fr: "Gérez vos réglages (thème, audio, langue) et consultez vos notifications ici.",
                en: "Manage your settings (theme, audio, language) and check your notifications here."
            },
            position: 'bottom'
        },
        {
            id: 'nav_mobile_player',
            targets: ['#mobile-mini-player'],
            title: { fr: "Mini Lecteur", en: "Mini Player" },
            content: {
                fr: "Le mini-lecteur apparaît ici. Appuyez pour l'agrandir en plein écran.",
                en: "The mini-player appears here. Tap to expand to full screen."
            },
            position: 'top',
            onEnter: () => {
                // Simuler l'affichage du mini-player pour le guide s'il est caché
                const miniPlayer = document.getElementById('mobile-mini-player');
                if (miniPlayer && miniPlayer.classList.contains('hidden')) {
                    miniPlayer.classList.remove('hidden');
                    document.body.classList.remove('mobile-player-hidden');
                    // Remplir avec des fausses données pour l'exemple si vide
                    const titleSpan = miniPlayer.querySelector('#mini-player-title span');
                    if (titleSpan && !titleSpan.textContent) titleSpan.textContent = "Mmg Studio Guide";
                }
            }
        },
        {
            id: 'nav_mobile_bubble',
            targets: ['#mobile-mini-player'],
            title: { fr: "Mode Bulle", en: "Bubble Mode" },
            content: {
                fr: "Astuce : Maintenez appuyé pour le transformer en bulle flottante. Maintenez à nouveau pour le remettre en place.",
                en: "Tip: Long press to turn it into a floating bubble. Long press again to dock it back."
            },
            position: 'top'
        }
    ],

    pages_mobile: [
        {
            id: 'page_intro_mobile',
            guideTitle: { fr: "Sections du Site", en: "Site Sections" },
            targets: ['.hero-section'],
            title: { fr: "À la Une", en: "Featured" },
            content: {
                fr: "Les dernières sorties et le bonus quotidien sont mis en avant ici.",
                en: "Latest releases and daily bonus are highlighted here."
            },
            position: 'bottom',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('home-dashboard-section');
            }
        },
        {
            id: 'page_mobile_reco',
            targets: ['.dashboard-split-row'],
            title: { fr: "Découvertes", en: "Discoveries" },
            content: {
                fr: "Playlists recommandées et actualités du studio.",
                en: "Recommended playlists and studio news."
            },
            position: 'top'
        },
        {
            id: 'page_mobile_about',
            targets: ['.dashboard-about-section'],
            title: { fr: "À Propos", en: "About" },
            content: {
                fr: "Infos sur l'artiste et liens vers les réseaux sociaux.",
                en: "Artist info and links to social media."
            },
            position: 'top'
        },
        {
            id: 'page_mobile_albums',
            targets: ['#mobile-bottom-nav a[data-link="albums-section"]'],
            title: { fr: "Albums", en: "Albums" },
            content: {
                fr: "Accédez à tous les albums et singles via cet onglet.",
                en: "Access all albums and singles via this tab."
            },
            position: 'top',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('albums-section');
            }
        },
        {
            id: 'page_mobile_details',
            targets: ['.music-info-panel'], // Cible la page détails
            title: { fr: "Détails du Titre", en: "Track Details" },
            content: {
                fr: "En cliquant sur un titre, vous accédez à cette vue : lecture, tags, liens streaming et vidéos associées.",
                en: "Clicking a track takes you to this view: playback, tags, streaming links, and related videos."
            },
            position: 'top',
            delay: 1500,
            onEnter: () => {
                // Navigation vers un album puis clic sur un titre pour ouvrir la vue détails
                if (window.handleMenuNavigation) {
                    window.handleMenuNavigation('titles-section', true, { type: 'titles', data: 'album2' });
                }
                setTimeout(() => {
                    const targetTrack = document.querySelector('.card[data-item-id="title18"]');
                    if (targetTrack) {
                        targetTrack.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetTrack.classList.add('guide-click-feedback');
                        setTimeout(() => {
                            targetTrack.classList.remove('guide-click-feedback');
                            // Sur mobile, le clic sur la carte ouvre les détails (géré dans mmg-music-contents.js)
                            targetTrack.click();
                        }, 400);
                    }
                }, 800);
            }
        },
        {
            id: 'page_mobile_videos',
            targets: ['#mobile-bottom-nav a[data-link="videos-section"]'],
            title: { fr: "Vidéos", en: "Videos" },
            content: {
                fr: "Retrouvez les clips et making-ofs ici.",
                en: "Find music videos and making-ofs here."
            },
            position: 'top',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('videos-section');
            }
        },
        {
            id: 'page_mobile_shop',
            targets: ['#mobile-bottom-nav a[data-link="shop-section"]'],
            title: { fr: "Boutique", en: "Shop" },
            content: {
                fr: "Utilisez vos pièces pour débloquer des thèmes et des bonus.",
                en: "Use your coins to unlock themes and bonuses."
            },
            position: 'top',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('shop-section');
            }
        },
        {
            id: 'page_mobile_library',
            targets: ['#mobile-bottom-nav a[data-link="library-section"]'],
            title: { fr: "Bibliothèque", en: "Library" },
            content: {
                fr: "Vos titres likés et playlists sauvegardées sont ici.",
                en: "Your liked tracks and saved playlists are here."
            },
            position: 'top',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('library-section');
            }
        }
    ]
};
