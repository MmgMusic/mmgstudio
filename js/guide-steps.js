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
            id: 'page_home_featured',
            guideTitle: { fr: "Sections du Site", en: "Site Sections" },
            targets: ['.hero-section'],
            title: { fr: "1. À la Une", en: "1. Featured" },
            content: {
                fr: "Retrouvez les sorties majeures et les promotions du moment dans ce carrousel interactif.",
                en: "Find major releases and current promotions in this interactive carousel."
            },
            position: 'bottom',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('home-dashboard-section');
            }
        },
        {
            id: 'page_home_bonus',
            targets: ['#daily-bonus-section'],
            title: { fr: "2. Bonus Quotidien", en: "2. Daily Bonus" },
            content: {
                fr: "Connectez-vous chaque jour pour réclamer vos pièces gratuites et augmenter votre série !",
                en: "Log in every day to claim your free coins and increase your streak!"
            },
            position: 'top',
        },
        {
            id: 'page_home_news',
            targets: ['.news-section'],
            title: { fr: "3. Actualités", en: "3. News" },
            content: {
                fr: "Suivez les dernières annonces, les nouveaux clips et les mises à jour de Mmg Studio.",
                en: "Follow the latest announcements, new music videos, and Mmg Studio updates."
            },
            position: 'top',
        },
        {
            id: 'page_home_playlists',
            targets: ['.playlists-section'],
            title: { fr: "4. Playlists Recommandées", en: "4. Recommended Playlists" },
            content: {
                fr: "Découvrez des sélections thématiques pour explorer les univers Music et Beats selon vos envies.",
                en: "Discover thematic selections to explore Music and Beats universes based on your moods."
            },
            position: 'top',
        },
        {
            id: 'page_home_guides',
            targets: ['.dashboard-guide-section'],
            title: { fr: "5. Guides & Tutoriels", en: "5. Guides & Tutorials" },
            content: {
                fr: "Accédez à tout moment à ces guides interactifs pour approfondir votre connaissance du site.",
                en: "Access these interactive guides at any time to deepen your knowledge of the site."
            },
            position: 'top',
        },
        {
            id: 'page_home_about',
            targets: ['.dashboard-about-section'],
            title: { fr: "6. À Propos & Socials", en: "6. About & Socials" },
            content: {
                fr: "Informations sur Mmg, liens de streaming externes et réseaux sociaux officiels.",
                en: "About Mmg, external streaming links, and official social media."
            },
            position: 'top',
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

                window.guideManager.setGuideTimeout(() => {
                    // 2. Chercher le titre "La Rencontre" par son ID fiable
                    const targetTrack = document.querySelector('.card[data-item-id="title18"]');

                    if (targetTrack) {
                        // Scroll pour rendre visible
                        targetTrack.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        targetTrack.classList.add('guide-click-feedback');

                        window.guideManager.setGuideTimeout(() => {
                            targetTrack.classList.remove('guide-click-feedback');

                            // Cliquer sur le lien interne pour le listener délégué
                            const trackLink = targetTrack.querySelector('.card-link-wrapper');
                            if (trackLink) trackLink.click(); else targetTrack.click();

                            // Forcer l'affichage de la section détails
                            window.guideManager.setGuideTimeout(() => {
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

    // GUIDE 3 : Astuces & Secrets (Nouveau)
    tips: [
        {
            id: 'tip_coins',
            guideTitle: { fr: "Astuces & Secrets", en: "Tips & Secrets" },
            targets: ['.shop-coin-counter'],
            title: { fr: "Gagnez des Pièces", en: "Earn Coins" },
            content: {
                fr: "Écoutez un titre jusqu'au bout (95%) pour gagner 1 pièce. Utilisez-les pour débloquer du contenu exclusif !",
                en: "Listen to a track until the end (95%) to earn 1 coin. Use them to unlock exclusive content!"
            },
            position: 'bottom',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('shop-section');
            }
        },
        {
            id: 'tip_context',
            targets: ['.card'],
            title: { fr: "Menu Rapide", en: "Quick Menu" },
            content: {
                fr: "Faites un clic droit (PC) ou un appui long (Mobile) sur une carte (en mode Grille ou Liste) pour accéder aux options : Like, Playlist, File d'attente...",
                en: "Right-click (PC) or long press (Mobile) on a card (in Grid or List mode) to access options: Like, Playlist, Queue..."
            },
            position: 'top',
            delay: 800,
            onEnter: () => {
                if (window.closeAllOverlays) window.closeAllOverlays();
                if (window.handleMenuNavigation) window.handleMenuNavigation('titles-section', true, { type: 'titles', data: 'album1' });
            }
        },
        {
            id: 'tip_queue',
            targets: ['#queue-btn'],
            title: { fr: "Maîtrisez la File d'Attente", en: "Master the Queue" },
            content: {
                fr: "Ouvrez la file d'attente pour réorganiser vos titres par glisser-déposer.",
                en: "Open the queue to reorder tracks via drag & drop."
            },
            position: 'top'
        },
        {
            id: 'tip_player_click',
            targets: ['#player-album-cover'],
            title: { fr: "Retour au Contenu", en: "Back to Content" },
            content: {
                fr: "Cliquez sur la pochette du lecteur pour revenir instantanément à la page du contenu en cours (Titre ou Vidéo).",
                en: "Click on the player artwork to instantly return to the current content page (Track or Video)."
            },
            position: 'top',
            onEnter: () => {
                if (window.closeAllOverlays) window.closeAllOverlays();
            }
        },
        {
            id: 'tip_view',
            targets: ['.view-switcher-settings'],
            title: { fr: "Grille ou Liste ?", en: "Grid or List?" },
            content: {
                fr: "Préférez-vous voir les pochettes en grand ou une liste compacte ? Changez d'affichage ici.",
                en: "Do you prefer big covers or a compact list? Switch views here."
            },
            position: 'left',
            onEnter: () => {
                if (window.openOverlay && document.getElementById('settings-overlay')) {
                    window.openOverlay(document.getElementById('settings-overlay'), null, true);
                }
            }
        },
        {
            id: 'tip_secrets',
            targets: ['.cheat-code-section'],
            title: { fr: "Codes Secrets", en: "Secret Codes" },
            content: {
                fr: "Des codes secrets sont cachés un peu partout... Entrez-les dans les paramètres pour débloquer des bonus !",
                en: "Secret codes are hidden everywhere... Enter them in settings to unlock bonuses!"
            },
            position: 'left',
            onEnter: () => {
                if (window.openOverlay && document.getElementById('settings-overlay')) {
                    window.openOverlay(document.getElementById('settings-overlay'), null, true);
                }
            }
        },
        {
            id: 'tip_pwa',
            targets: ['#settings-install-btn'],
            title: { fr: "Installez l'App", en: "Install the App" },
            content: {
                fr: "Installez Mmg Studio comme une application native pour une meilleure expérience et pour débloquer le thème 'Music Studio' !",
                en: "Install Mmg Studio as a native app for a better experience and to unlock the 'Music Studio' theme!"
            },
            position: 'top',
            onEnter: () => {
                if (window.openOverlay && document.getElementById('settings-overlay')) {
                    window.openOverlay(document.getElementById('settings-overlay'), null, true);
                }
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
            id: 'nav_mobile_player_art',
            targets: ['#mini-player-album-art'],
            title: { fr: "Retour au Titre", en: "Back to Track" },
            content: {
                fr: "Touchez la pochette pour revenir à la page du titre en cours.",
                en: "Tap the artwork to return to the current track page."
            },
            position: 'top',
            onEnter: () => {
                if (window.closeAllOverlays) window.closeAllOverlays();
                // Simuler l'affichage du mini-player pour le guide s'il est caché
                const miniPlayer = document.getElementById('mobile-mini-player');
                if (miniPlayer) {
                    miniPlayer.classList.remove('hidden');
                    miniPlayer.classList.remove('no-track-playing');
                    miniPlayer.classList.add('active');
                    miniPlayer.style.display = 'flex';
                    miniPlayer.style.opacity = '1';
                    miniPlayer.style.transform = 'translateY(0)';
                    miniPlayer.style.pointerEvents = 'auto';

                    document.body.classList.remove('mobile-player-hidden');
                    // Remplir avec des fausses données pour l'exemple si vide
                    const titleSpan = miniPlayer.querySelector('#mini-player-title span');
                    if (titleSpan && (!titleSpan.textContent || titleSpan.textContent.includes('Titre'))) {
                        titleSpan.textContent = "Mmg Studio Guide";
                    }
                }
            }
        },
        {
            id: 'nav_mobile_player_expand',
            targets: ['.mini-player-info'],
            title: { fr: "Ouvrir le Lecteur", en: "Open Player" },
            content: {
                fr: "Touchez le texte pour ouvrir le lecteur plein écran.",
                en: "Tap the text to open the full screen player."
            },
            position: 'top'
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
            id: 'page_mobile_featured',
            guideTitle: { fr: "Sections du Site", en: "Site Sections" },
            targets: ['.hero-section'],
            title: { fr: "À la Une", en: "Featured" },
            content: {
                fr: "Les dernières sorties et les annonces importantes sont mises en avant ici.",
                en: "Latest releases and important announcements are highlighted here."
            },
            position: 'bottom',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('home-dashboard-section');
            }
        },
        {
            id: 'page_mobile_bonus',
            targets: ['#daily-bonus-section'],
            title: { fr: "Bonus Quotidien", en: "Daily Bonus" },
            content: {
                fr: "Revenez chaque jour pour récupérer des pièces gratuites !",
                en: "Come back every day to collect free coins!"
            },
            position: 'top'
        },
        {
            id: 'page_mobile_news',
            targets: ['.news-section'],
            title: { fr: "Actualités", en: "News" },
            content: {
                fr: "Toutes les nouveautés du studio en un coup d'œil.",
                en: "All studio news at a glance."
            },
            position: 'top'
        },
        {
            id: 'page_mobile_playlists',
            targets: ['.playlists-section'],
            title: { fr: "Playlists", en: "Playlists" },
            content: {
                fr: "Des sélections thématiques pour découvrir notre univers.",
                en: "Thematic selections to discover our universe."
            },
            position: 'top'
        },
        {
            id: 'page_mobile_guides',
            targets: ['.dashboard-guide-section'],
            title: { fr: "Guides", en: "Guides" },
            content: {
                fr: "Besoin d'aide ? Retrouvez tous les tutoriels ici.",
                en: "Need help? Find all tutorials here."
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
                window.guideManager.setGuideTimeout(() => {
                    const targetTrack = document.querySelector('.card[data-item-id="title18"]');
                    if (targetTrack) {
                        targetTrack.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetTrack.classList.add('guide-click-feedback');
                        window.guideManager.setGuideTimeout(() => {
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
    ],

    tips_mobile: [
        {
            id: 'tip_coins_mobile',
            guideTitle: { fr: "Astuces & Secrets", en: "Tips & Secrets" },
            targets: ['.shop-coin-counter'],
            title: { fr: "Gagnez des Pièces", en: "Earn Coins" },
            content: {
                fr: "Écoutez un titre jusqu'au bout (95%) pour gagner 1 pièce.",
                en: "Listen to a track until the end (95%) to earn 1 coin."
            },
            position: 'bottom',
            onEnter: () => {
                if (window.handleMenuNavigation) window.handleMenuNavigation('shop-section');
            }
        },
        {
            id: 'tip_context_mobile',
            targets: ['.card'],
            title: { fr: "Menu Rapide", en: "Quick Menu" },
            content: {
                fr: "Maintenez appuyé sur une carte (Grille ou Liste) pour voir les options : Like, Playlist, File d'attente...",
                en: "Long press on a card (Grid or List) to see options: Like, Playlist, Queue..."
            },
            position: 'top',
            delay: 800,
            onEnter: () => {
                if (window.closeAllOverlays) window.closeAllOverlays();
                if (window.handleMenuNavigation) window.handleMenuNavigation('titles-section', true, { type: 'titles', data: 'album1' });
            }
        },
        {
            id: 'tip_queue_mobile',
            targets: ['#mobile-player-queue-btn'],
            title: { fr: "File d'Attente", en: "Queue" },
            content: {
                fr: "Gérez votre file d'attente ici (glisser pour organiser, swipe pour supprimer).",
                en: "Manage your queue here (drag to reorder, swipe to delete)."
            },
            position: 'top',
            onEnter: () => {
                const mobilePlayer = document.getElementById('mobile-full-player');
                if (mobilePlayer) mobilePlayer.classList.add('active');
            }
        },
        {
            id: 'tip_view_mobile',
            targets: ['.view-switcher-settings'],
            title: { fr: "Grille ou Liste ?", en: "Grid or List?" },
            content: {
                fr: "Changez l'affichage dans les paramètres pour voir vos titres en liste ou en grille.",
                en: "Change the view in settings to see your tracks as a list or grid."
            },
            position: 'top',
            onEnter: () => {
                const mobilePlayer = document.getElementById('mobile-full-player');
                if (mobilePlayer) mobilePlayer.classList.remove('active');
                if (window.openOverlay && document.getElementById('settings-overlay')) {
                    window.openOverlay(document.getElementById('settings-overlay'), null, true);
                }
            }
        },
        {
            id: 'tip_secrets_mobile',
            targets: ['.cheat-code-section'],
            title: { fr: "Codes Secrets", en: "Secret Codes" },
            content: {
                fr: "Des codes secrets sont cachés un peu partout... Entrez-les ici !",
                en: "Secret codes are hidden everywhere... Enter them here!"
            },
            position: 'top',
            onEnter: () => {
                if (window.openOverlay && document.getElementById('settings-overlay')) {
                    window.openOverlay(document.getElementById('settings-overlay'), null, true);
                }
            }
        },
        {
            id: 'tip_pwa_mobile',
            targets: ['#settings-install-btn'],
            title: { fr: "Installez l'App", en: "Install the App" },
            content: {
                fr: "Installez l'app depuis les paramètres pour débloquer le thème 'Music Studio' !",
                en: "Install the app from settings to unlock the 'Music Studio' theme!"
            },
            position: 'top',
            onEnter: () => {
                if (window.openOverlay && document.getElementById('settings-overlay')) {
                    window.openOverlay(document.getElementById('settings-overlay'), null, true);
                }
            }
        }
    ]
};
