/**
 * @file Product detail page. Fetches the full product, then composes the
 * gallery, the info/purchase panel (INR pricing, size selector, best-price CTA),
 * the cross-store comparison table, reviews, and a related-products rail. The
 * primary CTA validates the size selection before opening the best offer.
 */

import { html, toElement, raw, Disposer, delegate, emit } from '../utils/dom.js';
import { routeTo, QUERY_KEYS } from '../config/routes.js';
import { EVENTS, TIMINGS, TOAST_LEVEL } from '../config/constants.js';
import { categoryLabel } from '../config/categories.js';
import { getById, getByCategory, getAllFashion } from '../services/product-service.js';
import { getOffers, getBestOffer } from '../services/offers-service.js';
import { createGallery, createPriceTable, createSizeSelector } from '../components/product-detail.js';
import { createProductCard, wishJson } from '../components/product-card.js';
import { createRail } from '../components/rail.js';
import { skeletonBlock, skeletonRail } from '../components/skeleton.js';
import { usdToInr, formatInr, originalInr, roundPercent, formatDate } from '../utils/format.js';
import { withMinDuration } from '../utils/async.js';

const STAR_PATH = '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/>';
const HEART_PATH =
  '<path d="M12 21s-7.5-4.6-10-9.3C.2 8.1 1.7 4.5 5.2 4.5c2 0 3.3 1.2 4 2.3.7-1.1 2-2.3 4-2.3 3.5 0 5 3.6 3.2 7.2C19.5 16.4 12 21 12 21z"/>';
const RELATED_COUNT = 10;

/**
 * Render a star row for a rating value.
 * @param {number} rating
 * @returns {import('../utils/dom.js').RawHtml}
 */
function stars(rating) {
  const rounded = Math.round(rating);
  return html`<span class="stars" aria-label="${rating.toFixed(1)} out of 5">
    ${Array.from({ length: 5 }, (_v, i) => html`<svg class="icon icon--xs ${i < rounded ? 'is-filled' : ''}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${raw(STAR_PATH)}</svg>`)}
  </span>`;
}

/**
 * @returns {import('../types.js').Page}
 */
export function createProductPage() {
  const disposer = new Disposer();
  /** @type {Array<{destroy: () => void}>} */
  const teardowns = [];

  return {
    async mount(root, ctx) {
      const id = ctx.params.id;

      // Loading scaffold.
      root.append(
        toElement(html`
          <div class="pdp">
            <a class="pdp__back" href="${routeTo.shop()}">← Back to shop</a>
            <div class="pdp__top" data-pdp-top>
              <div class="pdp__gallery-skeleton" style="aspect-ratio:4/5"></div>
            </div>
          </div>
        `),
      );
      const topSlot = /** @type {HTMLElement} */ (root.querySelector('[data-pdp-top]'));
      const galleryskel = topSlot.querySelector('.pdp__gallery-skeleton');
      if (galleryskel) galleryskel.replaceWith(skeletonBlock());

      /** @type {import('../types.js').Product} */
      let product;
      try {
        product = await withMinDuration(getById(id, { signal: ctx.signal }), TIMINGS.SKELETON_MIN_MS);
      } catch (err) {
        if (ctx.signal.aborted) return;
        root.replaceChildren(renderNotFound());
        return;
      }
      if (ctx.signal.aborted) return;

      document.title = `${product.title} — Outfit Buddy`;

      const priceInr = usdToInr(product.price);
      const discount = roundPercent(product.discountPercentage);
      const original = originalInr(priceInr, product.discountPercentage);
      const hasDiscount = discount > 0 && original > priceInr;
      const offers = getOffers(product);
      const best = getBestOffer(product);

      // Build sub-components.
      const gallery = createGallery(product);
      const sizeSelector = createSizeSelector(product);
      teardowns.push(gallery, sizeSelector);

      const container = /** @type {HTMLElement} */ (root.querySelector('.pdp'));
      const top = toElement(html`
        <div class="pdp__top" data-reveal>
          <div class="pdp__gallery" data-gallery-slot></div>
          <div class="pdp__info">
            <p class="pdp__brand">${product.brand || categoryLabel(product.category)}</p>
            <h1 class="pdp__title">${product.title}</h1>
            <div class="pdp__rating">
              ${stars(product.rating)}
              <span class="pdp__rating-count">${product.rating.toFixed(1)} · ${product.reviews.length} reviews</span>
            </div>

            <div class="pdp__price">
              <span class="pdp__price-now">${formatInr(priceInr)}</span>
              ${hasDiscount ? html`<span class="pdp__price-was">${formatInr(original)}</span><span class="pdp__price-off">${discount}% off</span>` : ''}
            </div>

            <div data-size-slot></div>

            <div class="pdp__buy">
              <div class="pdp__best">
                <span class="pdp__best-label">Best price</span>
                <span class="pdp__best-price">${formatInr(best.priceInr)}</span>
                <span class="pdp__best-store">on ${best.retailer.name}</span>
              </div>
              <div class="pdp__buy-actions">
                <button class="btn btn--primary btn--block" type="button" data-buy>Shop best price on ${best.retailer.name}</button>
                <button class="btn btn--ghost pdp__wishlist" type="button" data-wishlist-toggle="${product.id}" data-wish="${wishJson(product, priceInr)}" aria-pressed="false" aria-label="Save to wishlist">
                  <svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${raw(HEART_PATH)}</svg>
                  Save
                </button>
              </div>
            </div>

            <p class="pdp__desc">${product.description}</p>
            <dl class="pdp__facts">
              ${product.availabilityStatus ? html`<div><dt>Availability</dt><dd>${product.availabilityStatus}</dd></div>` : ''}
              ${product.returnPolicy ? html`<div><dt>Returns</dt><dd>${product.returnPolicy}</dd></div>` : ''}
              ${product.sku ? html`<div><dt>SKU</dt><dd>${product.sku}</dd></div>` : ''}
            </dl>
          </div>
        </div>
      `);
      // Replace the loading top with the real one.
      topSlot.replaceWith(top);
      top.querySelector('[data-gallery-slot]')?.append(gallery.el);
      top.querySelector('[data-size-slot]')?.append(sizeSelector.el);

      // Price comparison table.
      container.append(createPriceTable(offers));

      // Reviews.
      container.append(renderReviews(product));

      // Related rail.
      const relatedSection = toElement(html`
        <section class="rail-section" data-reveal>
          <header class="rail-section__head"><h2 class="rail-section__title">You may also like</h2>
          <a class="rail-section__link" href="${routeTo.shop({ [QUERY_KEYS.CATEGORY]: product.category })}">More ${categoryLabel(product.category)}</a></header>
          <div data-related-slot></div>
        </section>
      `);
      container.append(relatedSection);
      mountRelated(/** @type {HTMLElement} */ (relatedSection.querySelector('[data-related-slot]')), product, ctx.signal);

      // Primary CTA: validate size, then open best offer.
      disposer.add(
        delegate(container, 'click', '[data-buy]', () => {
          if (!sizeSelector.validate()) {
            emit(EVENTS.TOAST, { message: 'Choose a size to continue.', level: TOAST_LEVEL.INFO });
            return;
          }
          const size = sizeSelector.getSelected();
          emit(EVENTS.TOAST, { message: `Opening ${best.retailer.name}${size && size !== 'One size' ? ` · size ${size}` : ''}…`, level: TOAST_LEVEL.SUCCESS });
          window.open(best.url, '_blank', 'noopener,noreferrer');
        }),
      );
    },

    unmount() {
      teardowns.forEach((t) => t.destroy());
      disposer.dispose();
    },
  };

  /**
   * Load and render the related-products rail.
   * @param {HTMLElement} slot
   * @param {import('../types.js').Product} product
   * @param {AbortSignal} signal
   */
  async function mountRelated(slot, product, signal) {
    const rail = createRail({ controls: true, label: 'Related products' });
    teardowns.push(rail);
    rail.track.append(...Array.from(skeletonRail(6).childNodes));
    slot.replaceChildren(rail.el);
    try {
      let related = await getByCategory(product.category, { signal });
      related = related.filter((p) => p.id !== product.id);
      if (related.length < 3) {
        const all = await getAllFashion({ signal });
        related = all.filter((p) => p.id !== product.id).slice(0, RELATED_COUNT);
      }
      if (signal.aborted) return;
      rail.setItems(related.slice(0, RELATED_COUNT).map((p, index) => createProductCard(p, { index })));
    } catch {
      if (!signal.aborted) slot.replaceChildren();
    }
  }
}

/**
 * @param {import('../types.js').Product} product
 * @returns {HTMLElement}
 */
function renderReviews(product) {
  const reviews = product.reviews.slice(0, 6);
  if (reviews.length === 0) {
    return toElement(html`<section class="reviews" data-reveal><h2 class="reviews__title">Reviews</h2><p class="rail-empty">No reviews yet.</p></section>`);
  }
  return toElement(html`
    <section class="reviews" data-reveal>
      <h2 class="reviews__title">What shoppers say</h2>
      <div class="reviews__grid" data-reveal-group>
        ${reviews.map(
          (review) => html`
            <blockquote class="review" data-reveal>
              ${stars(review.rating)}
              <p class="review__comment">“${review.comment}”</p>
              <footer class="review__by">${review.reviewerName} · ${formatDate(review.date)}</footer>
            </blockquote>
          `,
        )}
      </div>
    </section>
  `);
}

/**
 * @returns {HTMLElement}
 */
function renderNotFound() {
  return toElement(html`
    <section class="notfound">
      <p class="notfound__code">Oops</p>
      <h1 class="notfound__title">We can't find that piece.</h1>
      <p class="notfound__body">It may have sold out or the link is off. Try the shop.</p>
      <a class="btn btn--primary" href="${routeTo.shop()}">Browse the shop</a>
    </section>
  `);
}
