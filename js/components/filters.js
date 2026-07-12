/**
 * @file Shop filter panel. Presentational + input validation only: it renders
 * category chips, an INR price range, a rating threshold, a brand select and an
 * on-sale toggle, and reports changes as a partial-filters patch via `onChange`.
 * It holds no data-loading logic.
 */

import { html, toElement, Disposer, delegate } from '../utils/dom.js';
import { STATE_CLASSES } from '../config/constants.js';
import { CATEGORIES } from '../config/categories.js';
import { formatInr } from '../utils/format.js';
import { clampInt } from '../utils/validate.js';

const RATING_CHOICES = Object.freeze([
  { value: 0, label: 'Any' },
  { value: 3, label: '3★+' },
  { value: 4, label: '4★+' },
  { value: 4.5, label: '4.5★+' },
]);

const MAX_PRICE_INPUT = 500000;

/**
 * @param {Object} opts
 * @param {import('../services/catalog.js').CatalogFilters} opts.filters
 * @param {{ brands: string[], priceMin: number, priceMax: number }} opts.facets
 * @param {(patch: Partial<import('../services/catalog.js').CatalogFilters>) => void} opts.onChange
 * @param {() => void} opts.onClear
 * @returns {{ el: HTMLElement, update: (f: any, facets: any) => void, destroy: () => void }}
 */
export function createFilters({ filters, facets, onChange, onClear }) {
  const disposer = new Disposer();

  const el = toElement(html`
    <aside class="filters" aria-label="Product filters">
      <div class="filters__header">
        <h2 class="filters__title">Filter</h2>
        <button class="filters__clear" type="button" data-action="clear">Clear all</button>
      </div>

      <fieldset class="filters__group">
        <legend class="filters__legend">Category</legend>
        <div class="chips" data-group="category">
          <button class="chip" type="button" data-category="" aria-pressed="${String(filters.category === '')}">All</button>
          ${CATEGORIES.map(
            (cat) => html`<button class="chip" type="button" data-category="${cat.slug}" aria-pressed="${String(filters.category === cat.slug)}">${cat.label}</button>`,
          )}
        </div>
      </fieldset>

      <fieldset class="filters__group">
        <legend class="filters__legend">Price (₹)</legend>
        <div class="filters__price">
          <label class="filters__price-field">
            <span class="visually-hidden">Minimum price</span>
            <input type="number" inputmode="numeric" min="0" max="${MAX_PRICE_INPUT}" step="100" name="minPrice" placeholder="Min" value="${filters.minPrice ?? ''}" />
          </label>
          <span class="filters__price-sep" aria-hidden="true">–</span>
          <label class="filters__price-field">
            <span class="visually-hidden">Maximum price</span>
            <input type="number" inputmode="numeric" min="0" max="${MAX_PRICE_INPUT}" step="100" name="maxPrice" placeholder="Max" value="${filters.maxPrice ?? ''}" />
          </label>
        </div>
        <p class="filters__hint" data-price-hint>Range: ${formatInr(facets.priceMin)} – ${formatInr(facets.priceMax)}</p>
      </fieldset>

      <fieldset class="filters__group">
        <legend class="filters__legend">Rating</legend>
        <div class="chips" data-group="rating">
          ${RATING_CHOICES.map(
            (r) => html`<button class="chip" type="button" data-rating="${r.value}" aria-pressed="${String(filters.minRating === r.value)}">${r.label}</button>`,
          )}
        </div>
      </fieldset>

      <fieldset class="filters__group" data-brand-group>
        <legend class="filters__legend">Brand</legend>
        <label class="filters__select">
          <span class="visually-hidden">Brand</span>
          <select name="brand">
            <option value="">All brands</option>
            ${facets.brands.map((b) => html`<option value="${b}" ${b === filters.brand ? 'selected' : ''}>${b}</option>`)}
          </select>
        </label>
      </fieldset>

      <fieldset class="filters__group">
        <label class="filters__toggle">
          <input type="checkbox" name="onSale" ${filters.onSale ? 'checked' : ''} />
          <span>On sale only</span>
        </label>
      </fieldset>
    </aside>
  `);

  // --- Category chips -------------------------------------------------------
  disposer.add(
    delegate(el, 'click', '[data-category]', (_event, matched) => {
      onChange({ category: matched.getAttribute('data-category') || '' });
    }),
  );

  // --- Rating chips ---------------------------------------------------------
  disposer.add(
    delegate(el, 'click', '[data-rating]', (_event, matched) => {
      onChange({ minRating: Number(matched.getAttribute('data-rating')) });
    }),
  );

  // --- Price inputs ---------------------------------------------------------
  /** @param {HTMLInputElement} input @returns {number|null} */
  const readPrice = (input) => {
    if (input.value.trim() === '') return null;
    return clampInt(input.value, 0, MAX_PRICE_INPUT, 0);
  };
  disposer.add(
    delegate(el, 'change', 'input[name="minPrice"], input[name="maxPrice"]', () => {
      const minInput = /** @type {HTMLInputElement} */ (el.querySelector('input[name="minPrice"]'));
      const maxInput = /** @type {HTMLInputElement} */ (el.querySelector('input[name="maxPrice"]'));
      let minPrice = readPrice(minInput);
      let maxPrice = readPrice(maxInput);
      // Keep min ≤ max: if inverted, swap.
      if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
        [minPrice, maxPrice] = [maxPrice, minPrice];
        minInput.value = String(minPrice);
        maxInput.value = String(maxPrice);
      }
      onChange({ minPrice, maxPrice });
    }),
  );

  // --- Brand + on-sale ------------------------------------------------------
  disposer.add(
    delegate(el, 'change', 'select[name="brand"]', (_event, matched) => {
      onChange({ brand: /** @type {HTMLSelectElement} */ (matched).value });
    }),
  );
  disposer.add(
    delegate(el, 'change', 'input[name="onSale"]', (_event, matched) => {
      onChange({ onSale: /** @type {HTMLInputElement} */ (matched).checked });
    }),
  );

  // --- Clear ----------------------------------------------------------------
  disposer.add(delegate(el, 'click', '[data-action="clear"]', () => onClear()));

  /**
   * Reflect a filter/facet state into the chips' pressed attributes and the
   * brand list (facets change when the dataset changes).
   * @param {import('../services/catalog.js').CatalogFilters} nextFilters
   * @param {{ brands: string[], priceMin: number, priceMax: number }} nextFacets
   */
  function update(nextFilters, nextFacets) {
    el.querySelectorAll('[data-category]').forEach((chip) => {
      chip.setAttribute('aria-pressed', String((chip.getAttribute('data-category') || '') === nextFilters.category));
    });
    el.querySelectorAll('[data-rating]').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(Number(chip.getAttribute('data-rating')) === nextFilters.minRating));
    });
    const brandSelect = /** @type {HTMLSelectElement} */ (el.querySelector('select[name="brand"]'));
    if (brandSelect) {
      const current = nextFilters.brand;
      brandSelect.replaceChildren(
        toElement(html`<option value="">All brands</option>`),
        ...nextFacets.brands.map((b) => toElement(html`<option value="${b}" ${b === current ? 'selected' : ''}>${b}</option>`)),
      );
      brandSelect.value = current;
    }
    const hint = el.querySelector('[data-price-hint]');
    if (hint) hint.textContent = `Range: ${formatInr(nextFacets.priceMin)} – ${formatInr(nextFacets.priceMax)}`;
  }

  return { el, update, destroy: () => disposer.dispose() };
}
