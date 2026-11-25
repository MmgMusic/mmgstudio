// =========================================================
// DRAG & DROP — File d'attente (Queue) & Playlist
// Extrait de mmg-music-contents.js pour alléger le bundle principal.
// Toutes les variables globales (PlaybackQueue, currentPlayingItem, etc.)
// sont accessibles car ce script est chargé après mmg-music-contents.js.
// =========================================================

// Initialise le drag & drop pour la file d'attente (appelé depuis initializeApp)
function setupQueueDragAndDrop() {
    // Desktop Queue
    const desktopQueue = document.getElementById('queue-container');
    if (desktopQueue) {
        setupGenericDragAndDrop(desktopQueue, '.playlist-item', '.playlist-drag-handle', () => {
            const newOrder = Array.from(desktopQueue.querySelectorAll('.playlist-item:not(.currently-playing)'))
                .map(el => el.dataset.itemId);

            const currentPlayingIndexInUserQueue = currentPlayingItem ? PlaybackQueue.user.indexOf(currentPlayingItem.id) : -1;
            if (currentPlayingIndexInUserQueue > -1) {
                const historyAndCurrent = PlaybackQueue.user.slice(0, currentPlayingIndexInUserQueue + 1);
                PlaybackQueue.user = [...historyAndCurrent, ...newOrder];
            } else {
                PlaybackQueue.user = newOrder;
            }
            PlaybackQueue.syncSet();
        });
    }

    // Mobile Queue
    const mobileQueue = document.getElementById('mobile-queue-list');
    if (mobileQueue) {
        setupGenericDragAndDrop(mobileQueue, '.playlist-item-wrapper', '.mobile-queue-drag-handle', () => {
            const newOrder = Array.from(mobileQueue.querySelectorAll('.playlist-item-wrapper'))
                .map(wrapper => wrapper.querySelector('.playlist-item').dataset.itemId)
                .filter(id => id !== currentPlayingItem?.id);

            const currentPlayingIndexInUserQueue = currentPlayingItem ? PlaybackQueue.user.indexOf(currentPlayingItem.id) : -1;
            if (currentPlayingIndexInUserQueue > -1) {
                const historyAndCurrent = PlaybackQueue.user.slice(0, currentPlayingIndexInUserQueue + 1);
                PlaybackQueue.user = [...historyAndCurrent, ...newOrder];
            } else {
                PlaybackQueue.user = newOrder;
            }
            PlaybackQueue.syncSet();
        });
    }
}

function setupGenericDragAndDrop(container, itemSelector, handleSelector, onUpdate) {
    let draggedItem = null;

    const cleanup = () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            onUpdate();
        }
    };

    // --- MOUSE (Desktop) ---
    container.addEventListener('dragstart', e => {
        const item = e.target.closest(itemSelector);
        if (item && !item.classList.contains('currently-playing') && !item.querySelector('.currently-playing')) {
            draggedItem = item;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => item.classList.add('dragging'), 0);
        }
    });

    container.addEventListener('dragend', cleanup);

    container.addEventListener('drop', e => {
        e.preventDefault();
        cleanup();
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY, itemSelector);
        if (draggedItem) {
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        }
    });

    // --- TOUCH (Mobile) ---
    container.addEventListener('touchstart', e => {
        const handle = e.target.closest(handleSelector);
        if (!handle) return;

        const item = handle.closest(itemSelector);
        if (item && !item.classList.contains('currently-playing') && !item.querySelector('.currently-playing')) {
            e.preventDefault(); // Empêche le scroll
            e.stopPropagation(); // Empêche le conflit avec le swipe de fermeture du panneau
            draggedItem = item;
            item.classList.add('dragging');
        }
    }, { passive: false });

    container.addEventListener('touchmove', e => {
        if (!draggedItem) return;
        e.preventDefault();
        const touch = e.touches[0];
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetItem = elementUnder?.closest(itemSelector);

        if (targetItem && targetItem !== draggedItem && container.contains(targetItem)) {
            if (targetItem.classList.contains('currently-playing') || targetItem.querySelector('.currently-playing')) return;

            const rect = targetItem.getBoundingClientRect();
            const next = (touch.clientY - rect.top) / rect.height > 0.5;
            if (next) {
                container.insertBefore(draggedItem, targetItem.nextSibling);
            } else {
                container.insertBefore(draggedItem, targetItem);
            }
        }
    }, { passive: false });

    container.addEventListener('touchend', e => {
        if (draggedItem) {
            e.stopPropagation(); // Empêche le conflit avec le swipe de fermeture du panneau
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            onUpdate();
        }
    });
}
