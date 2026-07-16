/**
 * @file Editorial "Edits" — a magazine-style index of curated stories and the
 * story detail spreads. Detail pages pull imagery and "shop the look" product
 * rails live from each look's category, with scroll parallax on the hero and
 * spread images and drag-to-scroll galleries. All motion respects reduced-motion.
 */

import { html, toElement, Disposer } from '../utils/dom.js';
import { routeTo, QUERY_KEYS } from '../config/routes.js';
import { EDITS, findStory, nextStory } from '../data/edits-content.js';
import { getByCategory } from '../services/product-service.js';
import { createProductCard } from '../components/product-card.js';
import { createRail } from '../components/rail.js';
import { skeletonBlock } from '../components/skeleton.js';
import { categoryLabel } from '../config/categories.js';
import { prefersReducedMotion } from '../utils/async.js';

const LOOK_RAIL_LABEL = 'Shop the look';

/**
 * Scroll parallax: translate `[data-parallax]` images by a fraction of their
 * distance from viewport centre. rAF-throttled; inert under reduced motion.
 * @param {HTMLElement} root
 * @param {Disposer} disposer
 */
function initParallax(root, disposer) {
  if (prefersReducedMotion()) return;
  const els = Array.from(root.querySelectorAll('[data-parallax]'));
  if (!els.length) return;
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight || 1;
    for (const el of els) {
      if (!(el instanceof HTMLElement)) continue;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) / vh;
      const strength = Number(el.getAttribute('data-parallax')) || 24;
      el.style.setProperty('--parallax', `${(-offset * strength).toFixed(1)}px`);
    }
    ticking = false;
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  disposer.listen(window, 'scroll', onScroll, { passive: true });
  disposer.listen(window, 'resize', onScroll);
  update();
}

/* ---------------------------------------------------------------- Index ---- */

/**
 * @returns {import('../types.js').Page}
 */
export function createEditsPage() {
  const disposer = new Disposer();

  return {
    async mount(root, ctx) {
      root.append(
        toElement(html`
          <div class="edits section" data-reveal>
            <header class="edits__head">
              <p class="eyebrow">The Edits</p>
              <h1 class="edits__title">Stories worth dressing for.</h1>
              <p class="edits__lede">Curated outfit edits with shop-the-look links straight into the catalog.</p>
            </header>
            <div class="edits__grid" data-reveal-group data-edits-grid></div>
          </div>
        `),
      );

      const grid = /** @type {HTMLElement} */ (root.querySelector('[data-edits-grid]'));
      // Placeholder cards while cover images resolve.
      EDITS.forEach(() => {
        const ph = toElement(html`<div class="edit-card"></div>`);
        ph.append(skeletonBlock('edit-card__media'));
        grid.append(ph);
      });

      try {
        const covers = await Promise.all(
          EDITS.map((story) => getByCategory(story.coverCategory, { signal: ctx.signal }).catch(() => [])),
        );
        if (ctx.signal.aborted) return;
        grid.replaceChildren(
          ...EDITS.map((story, index) => {
            const image = covers[index][0]?.images?.[0] || covers[index][0]?.thumbnail || '';
            return renderStoryCard(story, image);
          }),
        );
      } catch {
        if (!ctx.signal.aborted) {
          grid.replaceChildren(...EDITS.map((story) => renderStoryCard(story, '')));
        }
      }
    },
    unmount() {
      disposer.dispose();
    },
  };
}

/**
 * @param {import('../data/edits-content.js').EditStory} story
 * @param {string} image
 * @returns {HTMLElement}
 */
function renderStoryCard(story, image) {
  return toElement(html`
    <a class="edit-card" data-reveal="scale" href="${routeTo.editStory(story.slug)}">
      <div class="edit-card__media">
        ${image ? html`<img src="${image}" alt="${story.title}" loading="lazy" decoding="async" />` : ''}
      </div>
      <div class="edit-card__body">
        <p class="edit-card__eyebrow">Edit</p>
        <h2 class="edit-card__title">${story.title}</h2>
        <p class="edit-card__sub">${story.subtitle}</p>
      </div>
    </a>
  `);
}

/* --------------------------------------------------------------- Detail ---- */

/**
 * @returns {import('../types.js').Page}
 */
export function createEditStoryPage() {
  const disposer = new Disposer();
  /** @type {Array<{destroy: () => void}>} */
  const rails = [];

  return {
    async mount(root, ctx) {
      const story = findStory(ctx.params.slug);
      if (!story) {
        root.append(renderMissing());
        return;
      }
      document.title = `${story.title} — The Edits — Outfit Buddy`;

      root.append(
        toElement(html`
          <article class="edit">
            <header class="edit-hero" data-parallax="40">
              <div class="edit-hero__media" data-hero-media></div>
              <div class="edit-hero__overlay">
                <p class="edit-hero__eyebrow">The Edits</p>
                <h1 class="edit-hero__title">${story.title}</h1>
                <p class="edit-hero__sub">${story.subtitle}</p>
              </div>
            </header>
            <div class="edit-intro section--narrow" data-reveal>
              <p class="edit-intro__text">${story.intro}</p>
            </div>
            <div data-looks></div>
            <footer class="edit-next section" data-reveal>
              <a class="edit-next__link" href="${routeTo.editStory(nextStory(story.slug).slug)}">
                <span class="eyebrow">Keep reading</span>
                <span class="edit-next__title">${nextStory(story.slug).title} →</span>
              </a>
            </footer>
          </article>
        `),
      );

      const looksSlot = /** @type {HTMLElement} */ (root.querySelector('[data-looks]'));

      // Load cover + every look category in parallel.
      const [cover, ...lookLists] = await Promise.all([
        getByCategory(story.coverCategory, { signal: ctx.signal }).catch(() => []),
        ...story.looks.map((look) => getByCategory(look.category, { signal: ctx.signal }).catch(() => [])),
      ]);
      if (ctx.signal.aborted) return;

      // Hero image.
      const heroMedia = root.querySelector('[data-hero-media]');
      const coverImage = cover[0]?.images?.[0] || cover[0]?.thumbnail;
      if (heroMedia && coverImage) {
        heroMedia.append(toElement(html`<img src="${coverImage}" alt="${story.title}" decoding="async" />`));
      }

      // Look spreads.
      story.looks.forEach((look, index) => {
        const products = lookLists[index] || [];
        const spreadImage = products[0]?.images?.[0] || products[0]?.thumbnail || '';
        const spread = toElement(html`
          <section class="look look--${index % 2 === 0 ? 'a' : 'b'}" data-reveal>
            <div class="look__media" data-parallax="30">
              ${spreadImage ? html`<img src="${spreadImage}" alt="${look.title}" loading="lazy" decoding="async" />` : ''}
            </div>
            <div class="look__text">
              <p class="eyebrow">${categoryLabel(look.category)}</p>
              <h2 class="look__title">${look.title}</h2>
              <p class="look__copy">${look.copy}</p>
              <a class="btn btn--ghost" href="${routeTo.shop({ [QUERY_KEYS.CATEGORY]: look.category })}">Shop this edit</a>
            </div>
          </section>
        `);
        looksSlot.append(spread);

        if (products.length) {
          const rail = createRail({ controls: true, label: `${LOOK_RAIL_LABEL}: ${look.title}` });
          rails.push(rail);
          rail.setItems(products.map((product, i) => createProductCard(product, { index: i })));
          const railWrap = toElement(html`<div class="look__rail section"><p class="look__rail-label">${LOOK_RAIL_LABEL}</p></div>`);
          railWrap.append(rail.el);
          looksSlot.append(railWrap);
        }
      });

      initParallax(root, disposer);
    },
    unmount() {
      rails.forEach((r) => r.destroy());
      disposer.dispose();
    },
  };
}

/**
 * @returns {HTMLElement}
 */
function renderMissing() {
  return toElement(html`
    <section class="notfound">
      <p class="notfound__code">Edit</p>
      <h1 class="notfound__title">This story has moved on.</h1>
      <p class="notfound__body">Browse the rest of the Edits instead.</p>
      <a class="btn btn--primary" href="${routeTo.edits()}">All Edits</a>
    </section>
  `);
}
