/**
 * @file Home = the Outfit Buddy stylist. The user picks an occasion, confirms
 * the weather (auto-detected via Open-Meteo with a manual override), and sets
 * gender + style vibe (pre-filled from a saved style-quiz profile); "Style me"
 * assembles coordinated outfit recommendations. Each look links out to shop the
 * pieces and to a fashion-inspiration page, and can be saved to the wishlist as
 * a named collection. Below the recommender, browse rails and the Edits teaser
 * remain for exploring.
 */

import { html, toElement, Disposer, delegate, emit } from '../utils/dom.js';
import { routeTo, QUERY_KEYS } from '../config/routes.js';
import { TIMINGS, EVENTS, TOAST_LEVEL } from '../config/constants.js';
import { OCCASIONS, findOccasion, DEFAULT_OCCASION } from '../config/occasions.js';
import { WEATHER, findWeather, DEFAULT_WEATHER } from '../config/weather.js';
import { GENDERS, DEFAULT_GENDER, STYLE_VIBES, DEFAULT_VIBE } from '../config/style.js';
import { getAllFashion, getByCategory } from '../services/product-service.js';
import { buildOutfits } from '../services/outfit-service.js';
import { detectCurrentWeather } from '../services/weather-service.js';
import { buildForYouRail } from '../services/personalization.js';
import { createOutfitCard } from '../components/outfit-card.js';
import { createProductCard } from '../components/product-card.js';
import { createRail } from '../components/rail.js';
import { skeletonRail, skeletonGrid } from '../components/skeleton.js';
import { withMinDuration } from '../utils/async.js';
import { userStore } from '../state/user-store.js';
import { wishlistStore, buildSnapshot } from '../state/wishlist-store.js';

const RAIL_SKELETON_COUNT = 6;
const TRENDING_COUNT = 12;
const OUTFIT_COUNT = 4;

/**
 * Resolve the initial recommender brief: saved prefs win, else defaults, with
 * the vibe seeded from a completed style quiz when available.
 * @returns {{occasion:string, weather:string, gender:string, vibe:string}}
 */
function initialBrief() {
  const saved = userStore.getStylistPrefs();
  if (saved) return { ...saved };
  const profile = userStore.getQuizProfile();
  return {
    occasion: DEFAULT_OCCASION,
    weather: DEFAULT_WEATHER,
    gender: DEFAULT_GENDER,
    vibe: profile?.answers?.vibe || DEFAULT_VIBE,
  };
}

/**
 * @returns {import('../types.js').Page}
 */
export function createHomePage() {
  const disposer = new Disposer();
  /** @type {Array<{destroy: () => void}>} */
  const rails = [];
  /** @type {import('../services/outfit-service.js').Outfit[]} */
  let currentOutfits = [];
  /** @type {import('../types.js').Product[]|null} */
  let pool = null;
  let seed = 0;
  let hasGenerated = false;
  const brief = initialBrief();

  /** @type {HTMLElement} */
  let resultsEl;
  /** @type {AbortSignal} */
  let pageSignal;

  /**
   * Render a group of choice chips.
   * @param {string} group data attribute value.
   * @param {ReadonlyArray<{id:string,label:string,emoji?:string}>} options
   * @param {string} selected
   * @returns {import('../utils/dom.js').RawHtml}
   */
  function chips(group, options, selected) {
    return html`${options.map(
      (opt) => html`<button class="chip" type="button" data-choice="${group}" data-value="${opt.id}" aria-pressed="${String(opt.id === selected)}">${opt.emoji ? html`<span aria-hidden="true">${opt.emoji}</span> ` : ''}${opt.label}</button>`,
    )}`;
  }

  /** Update pressed states for a choice group after a selection. */
  function syncChoice(root, group, value) {
    root.querySelectorAll(`[data-choice="${group}"]`).forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-value') === value));
    });
  }

  /** Ensure the fashion pool is loaded (cached). */
  async function ensurePool() {
    if (!pool) pool = await getAllFashion({ signal: pageSignal });
    return pool;
  }

  /** Generate outfits for the current brief + seed and render them. */
  async function generate() {
    hasGenerated = true;
    userStore.setStylistPrefs({ ...brief });
    resultsEl.replaceChildren(skeletonGrid(OUTFIT_COUNT));
    resultsEl.setAttribute('aria-busy', 'true');
    try {
      const loaded = await withMinDuration(ensurePool(), TIMINGS.SKELETON_MIN_MS);
      if (pageSignal.aborted) return;
      currentOutfits = buildOutfits({ pool: loaded, ...brief, count: OUTFIT_COUNT, seed });
      renderResults();
    } catch {
      if (pageSignal.aborted) return;
      resultsEl.replaceChildren(
        toElement(html`<div class="state-block" role="alert"><h2 class="state-block__title">Couldn't style you right now.</h2><p class="state-block__body">Check your connection and try again.</p><button class="btn btn--primary" type="button" data-restyle>Try again</button></div>`),
      );
    } finally {
      resultsEl.setAttribute('aria-busy', 'false');
    }
  }

  /** Render the current outfits (or an empty state). */
  function renderResults() {
    if (!currentOutfits.length) {
      resultsEl.replaceChildren(
        toElement(html`<div class="state-block"><h2 class="state-block__title">No looks for that combination.</h2><p class="state-block__body">Try a different occasion or “Surprise me”.</p></div>`),
      );
      return;
    }
    const occasion = findOccasion(brief.occasion);
    const wrap = toElement(html`
      <div class="stylist-results">
        <div class="stylist-results__head">
          <h2 class="stylist-results__title">${currentOutfits.length} looks for ${occasion ? occasion.label.toLowerCase() : 'you'}</h2>
          <button class="btn btn--ghost" type="button" data-shuffle>↻ Shuffle looks</button>
        </div>
        <div class="outfit-grid" data-reveal-group data-outfits></div>
      </div>
    `);
    const grid = /** @type {HTMLElement} */ (wrap.querySelector('[data-outfits]'));
    currentOutfits.forEach((outfit, index) => grid.append(createOutfitCard(outfit, index)));
    resultsEl.replaceChildren(wrap);
  }

  /** Save every piece of a look to the wishlist under an occasion collection. */
  function saveLook(index) {
    const outfit = currentOutfits[index];
    if (!outfit) return;
    const occasion = findOccasion(brief.occasion);
    const collectionName = `${occasion ? occasion.label : 'My'} looks`;
    const collectionId = wishlistStore.createCollection(collectionName);
    let added = 0;
    outfit.slots.forEach((slot) => {
      if (!wishlistStore.isWished(slot.product.id)) {
        wishlistStore.toggle(buildSnapshot(slot.product));
        added += 1;
      }
      if (collectionId) {
        const item = wishlistStore.getItems().find((i) => i.id === slot.product.id);
        if (item && !item.collectionIds.includes(collectionId)) {
          wishlistStore.toggleInCollection(slot.product.id, collectionId);
        }
      }
    });
    emit(EVENTS.TOAST, {
      message: added ? `Saved ${outfit.slots.length} pieces to “${collectionName}”` : `Look is already in “${collectionName}”`,
      level: TOAST_LEVEL.SUCCESS,
    });
  }

  /** Attempt weather auto-detection and reflect it (unless user overrode it). */
  async function autoDetectWeather(root) {
    if (userStore.getStylistPrefs()) return; // respect a saved choice
    const status = root.querySelector('[data-weather-status]');
    if (status) status.textContent = 'Detecting…';
    const result = await detectCurrentWeather({ signal: pageSignal });
    if (pageSignal.aborted) return;
    if (result) {
      brief.weather = result.conditionId;
      syncChoice(root, 'weather', brief.weather);
      const w = findWeather(result.conditionId);
      if (status) status.textContent = `Detected: ${w ? w.label : ''} · ${Math.round(result.tempC)}°C`;
      if (hasGenerated) generate();
    } else if (status) {
      status.textContent = 'Location off — pick manually.';
    }
  }

  return {
    async mount(root, ctx) {
      pageSignal = ctx.signal;

      root.append(
        toElement(html`
          <div class="home">
            <section class="hero hero--stylist" data-reveal="fade">
              <p class="hero__eyebrow">Outfit Buddy</p>
              <h1 class="hero__title" data-kinetic>Tell me the occasion. <em>I'll dress you.</em></h1>
              <div class="hero__rule" aria-hidden="true"></div>
              <p class="hero__lede">Pick an occasion, confirm the weather and your vibe — Outfit Buddy builds head-to-toe looks and links you straight to shop or get inspired.</p>
            </section>

            <section class="stylist section" data-reveal>
              <div class="stylist__panel">
                <fieldset class="stylist__group">
                  <legend class="stylist__legend">1 · Occasion</legend>
                  <div class="chips">${chips('occasion', OCCASIONS, brief.occasion)}</div>
                </fieldset>

                <fieldset class="stylist__group">
                  <legend class="stylist__legend">2 · Weather</legend>
                  <div class="chips">${chips('weather', WEATHER, brief.weather)}</div>
                  <div class="stylist__weather-row">
                    <button class="stylist__geo" type="button" data-geo>📍 Use my location</button>
                    <span class="stylist__weather-status" data-weather-status></span>
                  </div>
                </fieldset>

                <fieldset class="stylist__group">
                  <legend class="stylist__legend">3 · Who for</legend>
                  <div class="chips">${chips('gender', GENDERS, brief.gender)}</div>
                </fieldset>

                <fieldset class="stylist__group">
                  <legend class="stylist__legend">4 · Your vibe</legend>
                  <div class="chips">${chips('vibe', STYLE_VIBES, brief.vibe)}</div>
                  <p class="stylist__hint">Prefer more precision? <a href="${routeTo.quiz()}">Take the full style quiz →</a></p>
                </fieldset>

                <button class="btn btn--primary btn--block stylist__go" type="button" data-style-me data-magnetic>Style me ✦</button>
              </div>

              <div class="stylist__results" data-results aria-live="polite">
                <div class="stylist__placeholder">
                  <p>Your looks will appear here. Pick an occasion and hit <strong>Style me</strong>.</p>
                </div>
              </div>
            </section>

            <section class="rail-section" data-reveal>
              <header class="rail-section__head">
                <h2 class="rail-section__title">Trending now</h2>
                <a class="rail-section__link" href="${routeTo.shop({ [QUERY_KEYS.SORT]: 'rating' })}">See all</a>
              </header>
              <div data-rail-slot="trending"></div>
            </section>

            ${userStore.getQuizProfile() ? html`<section class="rail-section" data-reveal><header class="rail-section__head"><h2 class="rail-section__title">For you</h2></header><div data-rail-slot="foryou"></div></section>` : ''}

            <section class="editorial-teaser" data-reveal>
              <div class="editorial-teaser__inner">
                <p class="eyebrow">The Edits</p>
                <h2 class="editorial-teaser__title">Need ideas first?</h2>
                <p class="editorial-teaser__body">Browse curated outfit stories with shop-the-look links, then come back and let Outfit Buddy build your version.</p>
                <a class="btn btn--ghost" href="${routeTo.edits()}">Read the Edits</a>
              </div>
            </section>
          </div>
        `),
      );

      resultsEl = /** @type {HTMLElement} */ (root.querySelector('[data-results]'));

      // --- Choice groups (occasion / weather / gender / vibe) ---
      disposer.add(
        delegate(root, 'click', '[data-choice]', (_event, matched) => {
          const group = matched.getAttribute('data-choice');
          const value = matched.getAttribute('data-value');
          if (!group || !value) return;
          brief[group] = value;
          syncChoice(root, group, value);
          if (hasGenerated) {
            seed = 0;
            generate();
          }
        }),
      );

      // --- Style me / shuffle / restyle / save / geolocation ---
      disposer.add(delegate(root, 'click', '[data-style-me]', () => { seed = 0; generate(); }));
      disposer.add(delegate(root, 'click', '[data-shuffle]', () => { seed += 1; generate(); }));
      disposer.add(delegate(root, 'click', '[data-restyle]', () => generate()));
      disposer.add(delegate(root, 'click', '[data-save-look]', (_e, m) => saveLook(Number(m.getAttribute('data-save-look')))));
      disposer.add(
        delegate(root, 'click', '[data-geo]', () => {
          const status = root.querySelector('[data-weather-status]');
          if (status) status.textContent = 'Detecting…';
          detectCurrentWeather({ signal: pageSignal }).then((result) => {
            if (pageSignal.aborted) return;
            if (result) {
              brief.weather = result.conditionId;
              syncChoice(root, 'weather', brief.weather);
              const w = findWeather(result.conditionId);
              if (status) status.textContent = `Detected: ${w ? w.label : ''} · ${Math.round(result.tempC)}°C`;
              if (hasGenerated) { seed = 0; generate(); }
            } else {
              emit(EVENTS.TOAST, { message: 'Couldn’t detect the weather — pick it manually.', level: TOAST_LEVEL.INFO });
              if (status) status.textContent = 'Location off — pick manually.';
            }
          });
        }),
      );

      // Quietly try to auto-fill weather on first visit.
      autoDetectWeather(root);

      // --- Explore rails (kept from the storefront) ---
      const trendingSlot = root.querySelector('[data-rail-slot="trending"]');
      if (trendingSlot instanceof HTMLElement) {
        mountRail(trendingSlot, async () => {
          const all = await getAllFashion({ signal: ctx.signal });
          return [...all].sort((a, b) => b.rating - a.rating).slice(0, TRENDING_COUNT);
        }, 'Trending products', ctx.signal);
      }
      const profile = userStore.getQuizProfile();
      if (profile) {
        const forYouSlot = root.querySelector('[data-rail-slot="foryou"]');
        if (forYouSlot instanceof HTMLElement) {
          mountRail(forYouSlot, async () => buildForYouRail(await getAllFashion({ signal: ctx.signal }), profile, { boostedCategories: wishlistStore.categorySet() }), 'For you', ctx.signal);
        }
      }
    },
    unmount() {
      rails.forEach((r) => r.destroy());
      disposer.dispose();
    },
  };

  /**
   * Mount a browse rail with skeleton → content and an error retry.
   * @param {HTMLElement} slot
   * @param {() => Promise<import('../types.js').Product[]>} loader
   * @param {string} label
   * @param {AbortSignal} signal
   */
  async function mountRail(slot, loader, label, signal) {
    const rail = createRail({ controls: true, label });
    rails.push(rail);
    rail.track.append(...Array.from(skeletonRail(RAIL_SKELETON_COUNT).childNodes));
    slot.replaceChildren(rail.el);
    try {
      const products = await withMinDuration(loader(), TIMINGS.SKELETON_MIN_MS);
      if (signal.aborted) return;
      if (!products.length) {
        slot.replaceChildren(toElement(html`<p class="rail-empty">Nothing here yet.</p>`));
        return;
      }
      rail.setItems(products.map((p, index) => createProductCard(p, { index })));
    } catch {
      if (signal.aborted) return;
      const node = toElement(html`<div class="rail-error" role="alert"><p>Couldn't load these.</p><button class="btn btn--ghost" type="button" data-retry>Try again</button></div>`);
      node.querySelector('[data-retry]')?.addEventListener('click', () => mountRail(slot, loader, label, signal), { once: true });
      slot.replaceChildren(node);
    }
  }
}
