/**
 * @file Outfit card — renders one recommended look: its coordinated pieces
 * (each links to the product page and to the best in-store deal), the styling
 * rationale + weather note, and outfit-level actions ("Get inspired" to a
 * fashion-inspiration page, and "Save this look" which the stylist page wires
 * to the wishlist). Presentational; save-look is delegated by the page.
 */

import { html, toElement, raw } from '../utils/dom.js';
import { routeTo } from '../config/routes.js';
import { getBestOffer } from '../services/offers-service.js';
import { usdToInr, formatInr } from '../utils/format.js';
import { INSPIRATION_SOURCE } from '../config/inspiration.js';

const EXTERNAL_PATH = '<path d="M7 17L17 7M17 7H9M17 7v8"/>';
const HEART_PATH =
  '<path d="M12 21s-7.5-4.6-10-9.3C.2 8.1 1.7 4.5 5.2 4.5c2 0 3.3 1.2 4 2.3.7-1.1 2-2.3 4-2.3 3.5 0 5 3.6 3.2 7.2C19.5 16.4 12 21 12 21z"/>';

/**
 * @param {import('../services/outfit-service.js').OutfitSlot} slot
 * @returns {import('../utils/dom.js').RawHtml}
 */
function renderSlot(slot) {
  const { product, role } = slot;
  const priceInr = usdToInr(product.price);
  const best = getBestOffer(product);
  return html`
    <div class="oc-item">
      <a class="oc-item__media" href="${routeTo.product(product.id)}" aria-label="${role.label}: ${product.title}">
        <img src="${product.thumbnail}" alt="${product.title}" loading="lazy" decoding="async" />
        <span class="oc-item__role">${role.label}</span>
      </a>
      <a class="oc-item__title" href="${routeTo.product(product.id)}">${product.title}</a>
      <div class="oc-item__foot">
        <span class="oc-item__price">${formatInr(priceInr)}</span>
        <a class="oc-item__shop" href="${best.url}" target="_blank" rel="noopener noreferrer" aria-label="Shop ${product.title} on ${best.retailer.name}">
          Shop
          <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${raw(EXTERNAL_PATH)}</svg>
        </a>
      </div>
    </div>
  `;
}

/**
 * Create an outfit card element.
 * @param {import('../services/outfit-service.js').Outfit} outfit
 * @param {number} index Position in the results, used by save-look delegation.
 * @returns {HTMLElement}
 */
export function createOutfitCard(outfit, index) {
  return toElement(html`
    <article class="outfit-card" data-reveal="scale" data-outfit-card="${index}">
      <header class="outfit-card__head">
        <p class="outfit-card__rationale">${outfit.rationale}</p>
        <span class="outfit-card__total">Look total · ${formatInr(outfit.totalInr)}</span>
      </header>
      <div class="outfit-card__items">${outfit.slots.map(renderSlot)}</div>
      ${outfit.note ? html`<p class="outfit-card__note">${outfit.note}</p>` : ''}
      <div class="outfit-card__actions">
        <button class="btn btn--primary outfit-card__save" type="button" data-save-look="${index}">
          <svg class="icon icon--sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${raw(HEART_PATH)}</svg>
          Save this look
        </button>
        <a class="btn btn--ghost" href="${outfit.inspireUrl}" target="_blank" rel="noopener noreferrer">
          Get inspired on ${INSPIRATION_SOURCE}
          <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${raw(EXTERNAL_PATH)}</svg>
        </a>
      </div>
    </article>
  `);
}
