/**
 * @file Scroll-reveal engine. A single shared IntersectionObserver reveals any
 * element carrying `[data-reveal]` as it enters the viewport, plus a
 * MutationObserver so elements added by page navigations are picked up
 * automatically. Staggering is done in CSS via a `--reveal-index` set here on
 * the children of `[data-reveal-group]`. Fully inert under reduced motion.
 */

import { STATE_CLASSES } from '../config/constants.js';
import { prefersReducedMotion } from '../utils/async.js';

const REVEAL_ATTR = 'data-reveal';
const GROUP_ATTR = 'data-reveal-group';
const STAGGER_CAP = 12;

/** @type {IntersectionObserver|null} */
let observer = null;
/** @type {MutationObserver|null} */
let mutationObserver = null;

/**
 * Reveal an element immediately (used for reduced motion and as the IO callback).
 * @param {Element} node
 */
function reveal(node) {
  node.classList.add(STATE_CLASSES.REVEALED);
}

/**
 * Assign staggered `--reveal-index` to a group's direct children so their
 * reveal transitions cascade.
 * @param {Element} group
 */
function applyStagger(group) {
  Array.from(group.children).forEach((child, index) => {
    if (child instanceof HTMLElement) {
      child.style.setProperty('--reveal-index', String(Math.min(index, STAGGER_CAP)));
    }
  });
}

/**
 * Begin observing an element (and stagger it if it's a group).
 * @param {Element} node
 */
function observe(node) {
  if (node.hasAttribute(GROUP_ATTR)) applyStagger(node);
  if (!node.hasAttribute(REVEAL_ATTR)) return;
  if (prefersReducedMotion() || !observer) {
    reveal(node);
    return;
  }
  observer.observe(node);
}

/**
 * Scan a subtree for reveal targets and groups, and start observing them.
 * @param {ParentNode} root
 */
export function scanReveals(root) {
  if (root instanceof Element) {
    if (root.hasAttribute(GROUP_ATTR)) applyStagger(root);
    if (root.hasAttribute(REVEAL_ATTR)) observe(root);
  }
  root.querySelectorAll(`[${GROUP_ATTR}]`).forEach(applyStagger);
  root.querySelectorAll(`[${REVEAL_ATTR}]`).forEach(observe);
}

/**
 * Initialise the shared observers. Call once at boot.
 * @param {HTMLElement} watchRoot The container whose subtree mutations to watch.
 */
export function initReveal(watchRoot) {
  if (!prefersReducedMotion() && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
  }

  // Watch for nodes added by navigations / async renders.
  mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) scanReveals(node);
      });
    }
  });
  mutationObserver.observe(watchRoot, { childList: true, subtree: true });

  // Initial scan of anything already present.
  scanReveals(watchRoot);
}
