/**
 * @file Global wishlist interaction controller. One delegated listener handles
 * every `[data-wishlist-toggle]` heart in the app (cards, PDP), reading the
 * embedded `data-wish` snapshot so toggling needs no network call. It keeps all
 * heart buttons in sync with the store (including buttons rendered later) by
 * re-syncing on every WISHLIST_CHANGED event, and plays the heart-pop
 * animation on add. Initialised once at boot.
 */

import { STATE_CLASSES, EVENTS, TOAST_LEVEL } from '../config/constants.js';
import { delegate, emit } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/async.js';
import { wishlistStore } from '../state/wishlist-store.js';

/**
 * Reflect current wishlist membership onto every heart button in the DOM.
 */
function syncHearts() {
  document.querySelectorAll('[data-wishlist-toggle]').forEach((btn) => {
    const id = Number(btn.getAttribute('data-wishlist-toggle'));
    const wished = wishlistStore.isWished(id);
    btn.classList.toggle(STATE_CLASSES.ACTIVE, wished);
    btn.setAttribute('aria-pressed', String(wished));
    const label = wished ? 'Remove from wishlist' : 'Add to wishlist';
    if (btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', label);
  });
}

/**
 * Parse the embedded snapshot, tolerating a missing/corrupt attribute.
 * @param {HTMLElement} btn
 * @returns {import('../types.js').WishlistItem|null}
 */
function readSnapshot(btn) {
  const raw = btn.getAttribute('data-wish');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'number') return parsed;
  } catch {
    // fall through
  }
  return null;
}

/** Initialise the controller. Call once from bootstrap. */
export function initWishlistInteractions() {
  delegate(document.body, 'click', '[data-wishlist-toggle]', (event, btn) => {
    // The heart sits over/beside a card link — stop it from navigating.
    event.preventDefault();
    event.stopPropagation();

    const snapshot = readSnapshot(btn);
    if (!snapshot) return;

    const nowWished = wishlistStore.toggle(snapshot);

    if (nowWished && !prefersReducedMotion()) {
      btn.classList.remove(STATE_CLASSES.POPPING);
      void btn.offsetWidth; // restart animation
      btn.classList.add(STATE_CLASSES.POPPING);
      btn.addEventListener('animationend', () => btn.classList.remove(STATE_CLASSES.POPPING), { once: true });
    }

    emit(EVENTS.TOAST, {
      message: nowWished ? `Saved “${truncate(snapshot.title)}” to your closet` : 'Removed from your closet',
      level: nowWished ? TOAST_LEVEL.SUCCESS : TOAST_LEVEL.INFO,
    });
  });

  // Keep hearts in sync whenever the wishlist changes (from anywhere).
  document.addEventListener(EVENTS.WISHLIST_CHANGED, syncHearts);

  // Sync buttons that appear from later navigations/renders — but only when
  // heart buttons are actually added (ignore toasts, rail scrolls, etc.).
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (
          node instanceof Element &&
          (node.matches?.('[data-wishlist-toggle]') || node.querySelector?.('[data-wishlist-toggle]'))
        ) {
          syncHearts();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  syncHearts();

  // Prime the header badge with the persisted count on boot.
  emit(EVENTS.WISHLIST_CHANGED, { count: wishlistStore.count() });
}

/**
 * @param {string} text
 * @param {number} [max=40]
 * @returns {string}
 */
function truncate(text, max = 40) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
