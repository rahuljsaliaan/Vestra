/**
 * @file Skeleton placeholders shown while data loads, plus `swapIn` for a smooth
 * skeleton→content crossfade. Keeping these in one place ensures every loading
 * state uses the same shimmer treatment.
 */

import { html, toElement, toFragment } from '../utils/dom.js';
import { STATE_CLASSES } from '../config/constants.js';

/**
 * A single skeleton card.
 * @returns {import('../utils/dom.js').RawHtml}
 */
function skeletonCard() {
  return html`
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton--media"></div>
      <div class="skeleton skeleton--line" style="width: 70%"></div>
      <div class="skeleton skeleton--line" style="width: 40%"></div>
    </div>
  `;
}

/**
 * A grid of skeleton cards.
 * @param {number} count
 * @returns {HTMLElement}
 */
export function skeletonGrid(count) {
  const items = Array.from({ length: count }, () => skeletonCard());
  return toElement(html`<div class="card-grid" aria-hidden="true">${items}</div>`);
}

/**
 * A horizontal rail of skeleton cards.
 * @param {number} count
 * @returns {DocumentFragment}
 */
export function skeletonRail(count) {
  const items = Array.from({ length: count }, () => html`<div class="rail__item">${skeletonCard()}</div>`);
  return toFragment(html`${items}`);
}

/**
 * A block-level skeleton (for the PDP gallery / details).
 * @param {string} [modifier]
 * @returns {HTMLElement}
 */
export function skeletonBlock(modifier = '') {
  return toElement(html`<div class="skeleton skeleton--block ${modifier}" aria-hidden="true"></div>`);
}

/**
 * Crossfade real content in over a skeleton container: fade the container out,
 * replace its children, fade back in. Falls back to an instant swap when the
 * container isn't connected.
 * @param {HTMLElement} container
 * @param {Node} content
 */
export function swapIn(container, content) {
  container.classList.remove(STATE_CLASSES.LOADING);
  container.classList.add(STATE_CLASSES.LOADED);
  container.replaceChildren(content);
}
