/**
 * @file Horizontal rail: a scroll-snap track with pointer drag-to-scroll and
 * inertial momentum, plus optional prev/next controls. A movement threshold
 * distinguishes a drag from a click so dragging never accidentally opens a card.
 * Returns a `{ el, track, destroy }` handle.
 */

import { html, toElement, raw, Disposer } from '../utils/dom.js';
import { STATE_CLASSES } from '../config/constants.js';
import { prefersReducedMotion } from '../utils/async.js';

const DRAG_THRESHOLD_PX = 8;
const MOMENTUM_FRICTION = 0.94;
const MOMENTUM_MIN_VELOCITY = 0.4;

const ARROW_LEFT = '<path d="M15 5l-7 7 7 7"/>';
const ARROW_RIGHT = '<path d="M9 5l7 7-7 7"/>';

/**
 * @param {string} pathMarkup
 * @param {string} label
 * @returns {import('../utils/dom.js').RawHtml}
 */
function arrow(pathMarkup, label) {
  return html`
    <button class="rail__nav" type="button" data-rail-dir="${label === 'Previous' ? 'prev' : 'next'}" aria-label="${label}">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${raw(pathMarkup)}</svg>
    </button>
  `;
}

/**
 * Create a rail.
 * @param {{ controls?: boolean, label?: string }} [options]
 * @returns {{ el: HTMLElement, track: HTMLElement, setItems: (nodes: Node[]) => void, destroy: () => void }}
 */
export function createRail(options = {}) {
  const disposer = new Disposer();
  const el = toElement(html`
    <div class="rail" role="group" aria-label="${options.label || 'Product carousel'}">
      ${options.controls ? arrow(ARROW_LEFT, 'Previous') : ''}
      <div class="rail__track" tabindex="0"></div>
      ${options.controls ? arrow(ARROW_RIGHT, 'Next') : ''}
    </div>
  `);
  const track = /** @type {HTMLElement} */ (el.querySelector('.rail__track'));

  // --- Drag-to-scroll with momentum ---------------------------------------
  let isPointerDown = false;
  let dragged = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let velocity = 0;
  let momentumFrame = 0;

  const stopMomentum = () => {
    if (momentumFrame) {
      cancelAnimationFrame(momentumFrame);
      momentumFrame = 0;
    }
  };

  const runMomentum = () => {
    if (Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) {
      stopMomentum();
      return;
    }
    track.scrollLeft -= velocity;
    velocity *= MOMENTUM_FRICTION;
    momentumFrame = requestAnimationFrame(runMomentum);
  };

  /** @param {PointerEvent} event */
  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    isPointerDown = true;
    dragged = false;
    startX = event.clientX;
    lastX = event.clientX;
    startScroll = track.scrollLeft;
    velocity = 0;
    stopMomentum();
  };

  /** @param {PointerEvent} event */
  const onPointerMove = (event) => {
    if (!isPointerDown) return;
    const dx = event.clientX - startX;
    if (!dragged && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      dragged = true;
      track.classList.add(STATE_CLASSES.DRAGGING);
      track.setPointerCapture?.(event.pointerId);
    }
    if (dragged) {
      track.scrollLeft = startScroll - dx;
      velocity = event.clientX - lastX;
      lastX = event.clientX;
    }
  };

  /** @param {PointerEvent} event */
  const onPointerUp = (event) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    if (dragged) {
      track.classList.remove(STATE_CLASSES.DRAGGING);
      track.releasePointerCapture?.(event.pointerId);
      if (!prefersReducedMotion()) runMomentum();
    }
  };

  // Suppress the click that follows a drag (capture phase, before it reaches links).
  const onClickCapture = (event) => {
    if (dragged) {
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    }
  };

  disposer.listen(track, 'pointerdown', onPointerDown);
  disposer.listen(window, 'pointermove', onPointerMove);
  disposer.listen(window, 'pointerup', onPointerUp);
  disposer.listen(track, 'click', onClickCapture, true);
  disposer.add(stopMomentum);

  // --- Prev/next controls --------------------------------------------------
  /** @type {(() => void)|null} */
  let updateNav = null;
  if (options.controls) {
    /** @param {'prev'|'next'} dir */
    const scrollByPage = (dir) => {
      const amount = track.clientWidth * 0.85;
      track.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };
    el.querySelectorAll('[data-rail-dir]').forEach((btn) => {
      disposer.listen(btn, 'click', () => scrollByPage(/** @type {'prev'|'next'} */ (btn.getAttribute('data-rail-dir'))));
    });
    updateNav = () => {
      const maxScroll = track.scrollWidth - track.clientWidth - 1;
      el.querySelector('[data-rail-dir="prev"]')?.toggleAttribute('disabled', track.scrollLeft <= 0);
      el.querySelector('[data-rail-dir="next"]')?.toggleAttribute('disabled', track.scrollLeft >= maxScroll);
    };
    disposer.listen(track, 'scroll', updateNav, { passive: true });
    requestAnimationFrame(updateNav); // defer initial state until laid out
  }

  return {
    el,
    track,
    /** @param {Node[]} nodes */
    setItems(nodes) {
      const wrapped = nodes.map((node) => {
        const item = document.createElement('div');
        item.className = 'rail__item';
        item.append(node);
        return item;
      });
      track.replaceChildren(...wrapped);
      if (updateNav) requestAnimationFrame(updateNav);
    },
    destroy: () => disposer.dispose(),
  };
}
