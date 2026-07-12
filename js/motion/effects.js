/**
 * @file Flourish effects layered onto stable DOM after a page mounts: a kinetic
 * word-by-word hero reveal, magnetic buttons that lean toward the cursor, and
 * count-up number animations. Each effect is opt-in via a data attribute and
 * every one is a no-op under prefers-reduced-motion. Effects attach their
 * listeners to the target element itself, so they are garbage-collected when a
 * navigation removes the element — no global cleanup needed.
 */

import { STATE_CLASSES, TIMINGS } from '../config/constants.js';
import { prefersReducedMotion } from '../utils/async.js';

const KINETIC_ATTR = 'data-kinetic';
const MAGNETIC_ATTR = 'data-magnetic';
const COUNTER_ATTR = 'data-counter';
const MAGNET_STRENGTH = 0.3;

/**
 * Wrap each word of a heading in animated spans, preserving inline elements
 * (e.g. the `<em>`), then trigger a staggered rise-in.
 * @param {HTMLElement} el
 */
function kineticReveal(el) {
  if (el.dataset.kineticDone === '1') return;
  el.dataset.kineticDone = '1';

  /** @type {HTMLElement[]} */
  const wordSpans = [];
  /** @param {Node} node @param {boolean} emphasised */
  const wrapWords = (node, emphasised) => {
    /** @type {Node[]} */
    const out = [];
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent || '').split(/(\s+)/);
      for (const part of parts) {
        if (part.trim() === '') {
          out.push(document.createTextNode(part));
          continue;
        }
        const word = document.createElement('span');
        word.className = 'kinetic-word';
        const inner = document.createElement('span');
        inner.className = 'kinetic-word__inner';
        if (emphasised) inner.style.fontStyle = 'italic';
        inner.textContent = part;
        word.append(inner);
        wordSpans.push(inner);
        out.push(word);
      }
    } else if (node instanceof HTMLElement) {
      // Recurse into inline elements (like <em>), keeping their styling.
      const clone = node.cloneNode(false);
      const emphasis = emphasised || node.tagName === 'EM';
      for (const child of Array.from(node.childNodes)) {
        for (const built of wrapWordsToArray(child, emphasis)) clone.append(built);
      }
      out.push(clone);
    }
    return out;
  };
  /** @param {Node} node @param {boolean} emphasised @returns {Node[]} */
  function wrapWordsToArray(node, emphasised) {
    return wrapWords(node, emphasised);
  }

  const built = [];
  for (const child of Array.from(el.childNodes)) {
    for (const node of wrapWords(child, false)) built.push(node);
  }
  el.replaceChildren(...built);

  wordSpans.forEach((span, index) => span.style.setProperty('--kinetic-index', String(index)));
  requestAnimationFrame(() => el.classList.add(STATE_CLASSES.REVEALED));
}

/**
 * Make a button lean toward the pointer while hovered.
 * @param {HTMLElement} el
 */
function magnetic(el) {
  if (el.dataset.magneticDone === '1') return;
  el.dataset.magneticDone = '1';
  el.addEventListener('pointermove', (event) => {
    const rect = el.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${dx * MAGNET_STRENGTH}px, ${dy * MAGNET_STRENGTH}px)`;
  });
  el.addEventListener('pointerleave', () => {
    el.style.transform = '';
  });
}

/**
 * Count a number up to its target when it scrolls into view.
 * @param {HTMLElement} el
 */
function counter(el) {
  if (el.dataset.counterDone === '1') return;
  el.dataset.counterDone = '1';
  const target = Number(el.getAttribute(COUNTER_ATTR)) || 0;
  const suffix = el.getAttribute('data-counter-suffix') || '';

  const run = () => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / TIMINGS.COUNTER_DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = `${Math.round(eased * target)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
  } else {
    el.textContent = `${target}${suffix}`;
  }
}

/**
 * Wire all effects within a freshly-mounted page. Safe to call repeatedly;
 * each element is processed once.
 * @param {HTMLElement} root
 */
export function initEffects(root) {
  if (prefersReducedMotion()) {
    // Ensure counters still show their final value.
    root.querySelectorAll(`[${COUNTER_ATTR}]`).forEach((el) => {
      if (el instanceof HTMLElement) {
        el.textContent = `${Number(el.getAttribute(COUNTER_ATTR)) || 0}${el.getAttribute('data-counter-suffix') || ''}`;
      }
    });
    return;
  }
  root.querySelectorAll(`[${KINETIC_ATTR}]`).forEach((el) => el instanceof HTMLElement && kineticReveal(el));
  root.querySelectorAll(`[${MAGNETIC_ATTR}]`).forEach((el) => el instanceof HTMLElement && magnetic(el));
  root.querySelectorAll(`[${COUNTER_ATTR}]`).forEach((el) => el instanceof HTMLElement && counter(el));
}
