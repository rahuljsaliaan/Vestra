/**
 * @file Product card factory. Presentational: given a Product it renders the
 * image (with lazy load + opacity crossfade), INR price with struck-through
 * original + discount tag, rating, and a wishlist heart. It reads wishlist
 * state via an injected predicate and marks the heart with `data-wishlist-toggle`
 * so a single global controller (see wishlist-interactions) handles the click.
 */

import { html, toElement, raw } from '../utils/dom.js';
import { STATE_CLASSES } from '../config/constants.js';
import { routeTo } from '../config/routes.js';
import { categoryLabel } from '../config/categories.js';
import { usdToInr, formatInr, originalInr, roundPercent } from '../utils/format.js';

const HEART_PATH =
  '<path d="M12 21s-7.5-4.6-10-9.3C.2 8.1 1.7 4.5 5.2 4.5c2 0 3.3 1.2 4 2.3.7-1.1 2-2.3 4-2.3 3.5 0 5 3.6 3.2 7.2C19.5 16.4 12 21 12 21z"/>';
const STAR_PATH = '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/>';

/**
 * Serialise the minimal wishlist snapshot for embedding in a heart button.
 * The interactions controller reads this so toggling needs no re-fetch.
 * @param {import('../types.js').Product} product
 * @param {number} priceInr
 * @returns {string}
 */
export function wishJson(product, priceInr) {
  return JSON.stringify({
    id: product.id,
    title: product.title,
    thumbnail: product.thumbnail,
    category: product.category,
    priceInr,
  });
}

/**
 * Build a wishlist heart button.
 * @param {import('../types.js').Product} product
 * @param {number} priceInr
 * @param {boolean} wished
 * @returns {import('../utils/dom.js').RawHtml}
 */
function heartButton(product, priceInr, wished) {
  return html`
    <button
      class="card__heart ${wished ? STATE_CLASSES.ACTIVE : ''}"
      type="button"
      data-wishlist-toggle="${product.id}"
      data-wish="${wishJson(product, priceInr)}"
      aria-pressed="${String(wished)}"
      aria-label="${wished ? 'Remove from wishlist' : 'Add to wishlist'}"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${raw(HEART_PATH)}</svg>
      <span class="card__heart-burst" aria-hidden="true"></span>
    </button>
  `;
}

/**
 * Create a product card element.
 * @param {import('../types.js').Product} product
 * @param {{ isWished?: (id:number) => boolean, index?: number }} [options]
 * @returns {HTMLElement}
 */
export function createProductCard(product, options = {}) {
  const wished = options.isWished ? options.isWished(product.id) : false;
  const priceInr = usdToInr(product.price);
  const discount = roundPercent(product.discountPercentage);
  const original = originalInr(priceInr, product.discountPercentage);
  const hasDiscount = discount > 0 && original > priceInr;
  const ratingText = product.rating ? product.rating.toFixed(1) : '—';

  const card = toElement(html`
    <article class="card" data-reveal="scale" data-product-id="${product.id}">
      <a class="card__link" href="${routeTo.product(product.id)}" aria-label="${product.title}">
        <div class="card__media">
          ${hasDiscount ? html`<span class="card__tag">${discount}% off</span>` : ''}
          <img
            class="card__img"
            src="${product.thumbnail}"
            alt="${product.title}"
            loading="lazy"
            decoding="async"
            width="400"
            height="500"
          />
        </div>
        <div class="card__body">
          <p class="card__brand">${product.brand || categoryLabel(product.category)}</p>
          <h3 class="card__title">${product.title}</h3>
          <div class="card__meta">
            <span class="card__price">${formatInr(priceInr)}</span>
            ${hasDiscount ? html`<span class="card__price-was">${formatInr(original)}</span>` : ''}
            <span class="card__rating">
              <svg class="icon icon--xs" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${raw(STAR_PATH)}</svg>
              ${ratingText}
            </span>
          </div>
        </div>
      </a>
      ${heartButton(product, priceInr, wished)}
    </article>
  `);

  // Crossfade the image in once it decodes (or is cached).
  const img = card.querySelector('.card__img');
  if (img instanceof HTMLImageElement) {
    const markLoaded = () => img.classList.add(STATE_CLASSES.LOADED);
    if (img.complete && img.naturalWidth > 0) markLoaded();
    else {
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', () => card.classList.add(STATE_CLASSES.ERROR), { once: true });
    }
  }

  return card;
}
