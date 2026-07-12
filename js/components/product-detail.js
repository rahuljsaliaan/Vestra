/**
 * @file Product-detail sub-components: an image gallery (thumb switching +
 * hover zoom), the cross-store price-comparison table (best-price badge +
 * validated outbound links), and a size selector with client-side validation.
 * All are presentational factories returning `{ el, ... }`.
 */

import { html, toElement, raw, Disposer, delegate } from '../utils/dom.js';
import { STATE_CLASSES } from '../config/constants.js';
import { CATEGORY_GROUP, findCategory } from '../config/categories.js';
import { formatInr, deliveryPhrase } from '../utils/format.js';

const STAR_PATH = '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/>';
const EXTERNAL_PATH = '<path d="M7 17L17 7M17 7H9M17 7v8"/>';

/** Size sets by category group. 'One size' groups skip size validation. @readonly */
const SIZE_GUIDE = Object.freeze({
  clothing: ['XS', 'S', 'M', 'L', 'XL'],
  shoes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
  oneSize: ['One size'],
});

/**
 * Resolve the appropriate size set for a product's category.
 * @param {import('../types.js').Product} product
 * @returns {{ sizes: string[], requiresSelection: boolean, label: string }}
 */
export function resolveSizes(product) {
  const category = findCategory(product.category);
  const slug = product.category;
  if (slug.includes('shoes')) return { sizes: SIZE_GUIDE.shoes, requiresSelection: true, label: 'Select size' };
  const isApparel = slug === 'tops' || slug.includes('shirts') || slug.includes('dresses');
  if (isApparel) return { sizes: SIZE_GUIDE.clothing, requiresSelection: true, label: 'Select size' };
  // Accessories / watches / jewellery / bags / sunglasses.
  return { sizes: SIZE_GUIDE.oneSize, requiresSelection: false, label: category?.group === CATEGORY_GROUP.ACCESSORIES ? 'Size' : 'Size' };
}

/**
 * Image gallery with thumbnail switching and hover zoom.
 * @param {import('../types.js').Product} product
 * @returns {{ el: HTMLElement, destroy: () => void }}
 */
export function createGallery(product) {
  const disposer = new Disposer();
  const images = product.images.length ? product.images : [product.thumbnail];

  const el = toElement(html`
    <div class="gallery">
      <div class="gallery__main" data-zoom>
        <img class="gallery__img" src="${images[0]}" alt="${product.title}" decoding="async" />
      </div>
      ${images.length > 1
        ? html`<div class="gallery__thumbs" role="tablist" aria-label="Product images">
            ${images.map(
              (src, index) => html`
                <button class="gallery__thumb ${index === 0 ? STATE_CLASSES.ACTIVE : ''}" type="button" role="tab" data-thumb="${index}" aria-selected="${String(index === 0)}">
                  <img src="${src}" alt="View ${index + 1}" loading="lazy" decoding="async" />
                </button>
              `,
            )}
          </div>`
        : ''}
    </div>
  `);

  const mainImg = /** @type {HTMLImageElement} */ (el.querySelector('.gallery__img'));
  const markLoaded = () => mainImg.classList.add(STATE_CLASSES.LOADED);
  if (mainImg.complete && mainImg.naturalWidth > 0) markLoaded();
  else mainImg.addEventListener('load', markLoaded, { once: true });

  // Thumbnail switching (crossfade).
  disposer.add(
    delegate(el, 'click', '[data-thumb]', (_event, matched) => {
      const index = Number(matched.getAttribute('data-thumb'));
      mainImg.classList.remove(STATE_CLASSES.LOADED);
      mainImg.src = images[index];
      mainImg.addEventListener('load', markLoaded, { once: true });
      el.querySelectorAll('[data-thumb]').forEach((thumb) => {
        const active = thumb === matched;
        thumb.classList.toggle(STATE_CLASSES.ACTIVE, active);
        thumb.setAttribute('aria-selected', String(active));
      });
    }),
  );

  // Hover zoom: track pointer to set transform-origin.
  const zoomBox = el.querySelector('[data-zoom]');
  if (zoomBox instanceof HTMLElement) {
    disposer.listen(zoomBox, 'pointermove', (event) => {
      const rect = zoomBox.getBoundingClientRect();
      const x = ((/** @type {PointerEvent} */ (event).clientX - rect.left) / rect.width) * 100;
      const y = ((/** @type {PointerEvent} */ (event).clientY - rect.top) / rect.height) * 100;
      mainImg.style.transformOrigin = `${x}% ${y}%`;
    });
    disposer.listen(zoomBox, 'pointerenter', () => zoomBox.classList.add(STATE_CLASSES.ACTIVE));
    disposer.listen(zoomBox, 'pointerleave', () => zoomBox.classList.remove(STATE_CLASSES.ACTIVE));
  }

  return { el, destroy: () => disposer.dispose() };
}

/**
 * Cross-store price-comparison table.
 * @param {import('../types.js').Offer[]} offers
 * @returns {HTMLElement}
 */
export function createPriceTable(offers) {
  return toElement(html`
    <section class="pricetable" aria-label="Price comparison across stores">
      <header class="pricetable__head">
        <h2 class="pricetable__title">Compare across stores</h2>
        <p class="pricetable__sub">Live-style pricing across India's top fashion stores. Vestra sends you to the best deal.</p>
      </header>
      <ul class="pricetable__list">
        ${offers.map(
          (offer) => html`
            <li class="offer ${offer.isBestPrice ? 'offer--best' : ''} ${offer.inStock ? '' : 'offer--oos'}">
              <div class="offer__store">
                <span class="offer__dot" style="background:${offer.retailer.color}" aria-hidden="true"></span>
                <span class="offer__name">${offer.retailer.name}</span>
                ${offer.isBestPrice ? html`<span class="offer__badge">Best price</span>` : ''}
              </div>
              <div class="offer__price-col">
                <span class="offer__price">${formatInr(offer.priceInr)}</span>
                <span class="offer__meta">${offer.inStock ? deliveryPhrase(offer.deliveryDays) : 'Currently unavailable'}</span>
                ${offer.blurb ? html`<span class="offer__blurb">${offer.blurb}</span>` : ''}
              </div>
              <div class="offer__action">
                ${offer.inStock
                  ? html`<a class="btn ${offer.isBestPrice ? 'btn--primary' : 'btn--ghost'}" href="${offer.url}" target="_blank" rel="noopener noreferrer">
                      Buy on ${offer.retailer.name}
                      <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${raw(EXTERNAL_PATH)}</svg>
                    </a>`
                  : html`<button class="btn btn--ghost" type="button" disabled>Out of stock</button>`}
              </div>
            </li>
          `,
        )}
      </ul>
    </section>
  `);
}

/**
 * Size selector with validation. `validate()` returns true when a size is
 * chosen (or none is required) and otherwise surfaces an inline error.
 * @param {import('../types.js').Product} product
 * @returns {{ el: HTMLElement, validate: () => boolean, getSelected: () => string|null, destroy: () => void }}
 */
export function createSizeSelector(product) {
  const disposer = new Disposer();
  const { sizes, requiresSelection, label } = resolveSizes(product);
  let selected = requiresSelection ? null : sizes[0];

  const el = toElement(html`
    <div class="sizes" data-required="${String(requiresSelection)}">
      <div class="sizes__head">
        <span class="sizes__label">${label}</span>
        <a class="sizes__guide" href="#/shop">Size guide</a>
      </div>
      <div class="chips" role="group" aria-label="${label}">
        ${sizes.map(
          (size, index) => html`<button class="chip" type="button" data-size="${size}" aria-pressed="${String(!requiresSelection && index === 0)}">${size}</button>`,
        )}
      </div>
      <p class="sizes__error ${STATE_CLASSES.HIDDEN}" data-size-error role="alert">Please select a size first.</p>
    </div>
  `);

  disposer.add(
    delegate(el, 'click', '[data-size]', (_event, matched) => {
      selected = matched.getAttribute('data-size');
      el.querySelectorAll('[data-size]').forEach((chip) => chip.setAttribute('aria-pressed', String(chip === matched)));
      el.querySelector('[data-size-error]')?.classList.add(STATE_CLASSES.HIDDEN);
    }),
  );

  return {
    el,
    validate() {
      if (!requiresSelection || selected) return true;
      el.querySelector('[data-size-error]')?.classList.remove(STATE_CLASSES.HIDDEN);
      return false;
    },
    getSelected: () => selected,
    destroy: () => disposer.dispose(),
  };
}
