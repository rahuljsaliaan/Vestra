/**
 * @file Home page. A kinetic editorial hero, a marquee strip, a "Trending"
 * rail, a couple of curated category rails, an (optional) personalized "For You"
 * rail, and an editorial teaser into the Edits. Rails load independently with
 * skeletons → content and their own error/empty states, so one slow request
 * never blocks the rest of the page.
 */

import { html, toElement, Disposer, setContent } from '../utils/dom.js';
import { routeTo, QUERY_KEYS } from '../config/routes.js';
import { findCategory } from '../config/categories.js';
import { TIMINGS } from '../config/constants.js';
import { getAllFashion, getByCategory } from '../services/product-service.js';
import { createProductCard } from '../components/product-card.js';
import { createRail } from '../components/rail.js';
import { skeletonRail } from '../components/skeleton.js';
import { withMinDuration } from '../utils/async.js';
import { buildForYouRail } from '../services/personalization.js';
import { userStore } from '../state/user-store.js';
import { wishlistStore } from '../state/wishlist-store.js';

const RAIL_SKELETON_COUNT = 6;
const TRENDING_COUNT = 12;

/** Curated categories highlighted on the home page. */
const FEATURED_CATEGORY_SLUGS = ['womens-dresses', 'mens-shirts', 'sunglasses'];

const MARQUEE_WORDS = ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Tata CLiQ', 'One closet', 'Best price, always'];

/**
 * @returns {import('../types.js').Page}
 */
export function createHomePage() {
  const disposer = new Disposer();
  /** @type {Array<{destroy: () => void}>} */
  const rails = [];

  /**
   * Mount a rail into `slot`: shows a skeleton, awaits the loader, then swaps in
   * product cards. Renders an empty/error message on failure.
   * @param {HTMLElement} slot
   * @param {() => Promise<import('../types.js').Product[]>} loader
   * @param {string} label
   * @param {AbortSignal} signal
   */
  async function mountRail(slot, loader, label, signal) {
    const rail = createRail({ controls: true, label });
    rails.push(rail);
    rail.track.append(...toArray(skeletonRail(RAIL_SKELETON_COUNT)));
    slot.replaceChildren(rail.el);
    try {
      const products = await withMinDuration(loader(), TIMINGS.SKELETON_MIN_MS);
      if (signal.aborted) return;
      if (products.length === 0) {
        slot.replaceChildren(emptyState('Nothing here yet — check back soon.'));
        return;
      }
      rail.setItems(products.map((p, index) => createProductCard(p, { index })));
    } catch (err) {
      if (signal.aborted) return;
      slot.replaceChildren(errorState(() => mountRail(slot, loader, label, signal)));
    }
  }

  return {
    async mount(root, ctx) {
      const profile = userStore.getQuizProfile();
      root.append(
        toElement(html`
          <div class="home">
            <section class="hero" data-reveal="fade">
              <p class="hero__eyebrow">One closet. Every store.</p>
              <h1 class="hero__title" data-kinetic>Dress like <em>the main character.</em></h1>
              <div class="hero__rule" aria-hidden="true"></div>
              <p class="hero__lede">
                Vestra curates India's best fashion stores in one place — then sends you straight to the
                cheapest checkout on Amazon, Flipkart, Myntra, Ajio and Tata CLiQ.
              </p>
              <div class="hero__cta">
                <a class="btn btn--primary" href="${routeTo.shop()}" data-magnetic>Explore the edit</a>
                <a class="btn btn--ghost" href="${routeTo.quiz()}">Take the style quiz</a>
              </div>
            </section>

            <div class="marquee" aria-hidden="true">
              <div class="marquee__track">
                ${[0, 1].map(
                  () => html`${MARQUEE_WORDS.map((word) => html`<span class="marquee__word">${word}</span><span class="marquee__dot">✦</span>`)}`,
                )}
              </div>
            </div>

            <section class="stats section" data-reveal-group aria-label="Why Vestra">
              <div class="stat" data-reveal><span class="stat__num" data-counter="5">0</span><span class="stat__label">Partner stores</span></div>
              <div class="stat" data-reveal><span class="stat__num" data-counter="10">0</span><span class="stat__label">Categories</span></div>
              <div class="stat" data-reveal><span class="stat__num" data-counter="100" data-counter-suffix="+">0</span><span class="stat__label">Curated pieces</span></div>
              <div class="stat" data-reveal><span class="stat__num" data-counter="1">0</span><span class="stat__label">Checkout, best price</span></div>
            </section>

            ${profile ? html`<section class="rail-section" data-reveal><header class="rail-section__head"><h2 class="rail-section__title">For you</h2><p class="rail-section__sub">Tuned to your style quiz.</p></header><div data-rail-slot="foryou"></div></section>` : ''}

            <section class="rail-section" data-reveal>
              <header class="rail-section__head">
                <h2 class="rail-section__title">Trending now</h2>
                <a class="rail-section__link" href="${routeTo.shop({ [QUERY_KEYS.SORT]: 'rating' })}">See all</a>
              </header>
              <div data-rail-slot="trending"></div>
            </section>

            ${FEATURED_CATEGORY_SLUGS.map((slug) => {
              const cat = findCategory(slug);
              return html`
                <section class="rail-section" data-reveal>
                  <header class="rail-section__head">
                    <h2 class="rail-section__title">${cat ? cat.label : slug}</h2>
                    <a class="rail-section__link" href="${routeTo.shop({ [QUERY_KEYS.CATEGORY]: slug })}">Shop ${cat ? cat.label : slug}</a>
                  </header>
                  <p class="rail-section__sub">${cat ? cat.blurb : ''}</p>
                  <div data-rail-slot="${slug}"></div>
                </section>
              `;
            })}

            <section class="editorial-teaser" data-reveal>
              <div class="editorial-teaser__inner">
                <p class="eyebrow">The Edits</p>
                <h2 class="editorial-teaser__title">Stories, not just products.</h2>
                <p class="editorial-teaser__body">Curated outfit edits with shop-the-look links — dressing ideas for weddings, work and everything between.</p>
                <a class="btn btn--ghost" href="${routeTo.edits()}">Read the Edits</a>
              </div>
            </section>
          </div>
        `),
      );

      // Kick off independent rail loads.
      const trendingSlot = root.querySelector('[data-rail-slot="trending"]');
      if (trendingSlot instanceof HTMLElement) {
        mountRail(
          trendingSlot,
          async () => {
            const all = await getAllFashion({ signal: ctx.signal });
            return [...all].sort((a, b) => b.rating - a.rating).slice(0, TRENDING_COUNT);
          },
          'Trending products',
          ctx.signal,
        );
      }

      if (profile) {
        const forYouSlot = root.querySelector('[data-rail-slot="foryou"]');
        if (forYouSlot instanceof HTMLElement) {
          mountRail(
            forYouSlot,
            async () => buildForYouRail(await getAllFashion({ signal: ctx.signal }), profile, { boostedCategories: wishlistStore.categorySet() }),
            'Recommended for you',
            ctx.signal,
          );
        }
      }

      for (const slug of FEATURED_CATEGORY_SLUGS) {
        const slot = root.querySelector(`[data-rail-slot="${slug}"]`);
        if (slot instanceof HTMLElement) {
          mountRail(slot, () => getByCategory(slug, { signal: ctx.signal }), `${slug} products`, ctx.signal);
        }
      }
    },
    unmount() {
      rails.forEach((r) => r.destroy());
      disposer.dispose();
    },
  };
}

/**
 * @param {DocumentFragment} fragment
 * @returns {Node[]}
 */
function toArray(fragment) {
  return Array.from(fragment.childNodes);
}

/**
 * @param {string} message
 * @returns {HTMLElement}
 */
function emptyState(message) {
  return toElement(html`<p class="rail-empty">${message}</p>`);
}

/**
 * @param {() => void} onRetry
 * @returns {HTMLElement}
 */
function errorState(onRetry) {
  const node = toElement(html`
    <div class="rail-error" role="alert">
      <p>Couldn't load these right now.</p>
      <button class="btn btn--ghost" type="button" data-retry>Try again</button>
    </div>
  `);
  const btn = node.querySelector('[data-retry]');
  if (btn) btn.addEventListener('click', onRetry, { once: true });
  return node;
}
