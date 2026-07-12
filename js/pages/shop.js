/**
 * @file Shop page. Orchestrates data loading, client-side filtering/sorting and
 * pagination, keeping all state mirrored in the URL hash (shareable, reload-safe)
 * via the router's replaceQuery. Search is debounced; changing the search term
 * or category re-fetches the source dataset, while price/rating/brand/sale/sort
 * re-filter the already-loaded set without a network round-trip.
 */

import { html, toElement, Disposer, delegate } from '../utils/dom.js';
import { QUERY_KEYS, routeTo } from '../config/routes.js';
import { TIMINGS, PAGINATION } from '../config/constants.js';
import { isFashionCategory, findCategory } from '../config/categories.js';
import { sanitizeSearch, clampInt, oneOf } from '../utils/validate.js';
import { debounce, withMinDuration } from '../utils/async.js';
import { getAllFashion, getByCategory, search as searchProducts } from '../services/product-service.js';
import { applyCatalog, extractFacets, SORT, SORT_OPTIONS, SORT_IDS } from '../services/catalog.js';
import { createFilters } from '../components/filters.js';
import { createProductCard } from '../components/product-card.js';
import { skeletonGrid } from '../components/skeleton.js';

const DEFAULT_RATING = 0;

/**
 * Parse a price query param into an INR bound or null.
 * @param {string|null} value
 * @returns {number|null}
 */
function parsePrice(value) {
  if (value === null || value.trim() === '') return null;
  return clampInt(value, 0, 500000, 0);
}

/**
 * Read a full filter state from the URL query (validated).
 * @param {URLSearchParams} query
 * @returns {import('../services/catalog.js').CatalogFilters & { page: number }}
 */
function readFilters(query) {
  const categoryRaw = query.get(QUERY_KEYS.CATEGORY);
  const ratingRaw = parseFloat(query.get(QUERY_KEYS.MIN_RATING) || '0');
  return {
    search: sanitizeSearch(query.get(QUERY_KEYS.SEARCH) || ''),
    category: isFashionCategory(categoryRaw) ? categoryRaw : '',
    minPrice: parsePrice(query.get(QUERY_KEYS.MIN_PRICE)),
    maxPrice: parsePrice(query.get(QUERY_KEYS.MAX_PRICE)),
    minRating: Number.isFinite(ratingRaw) ? Math.min(5, Math.max(0, ratingRaw)) : DEFAULT_RATING,
    brand: query.get(QUERY_KEYS.BRAND) || '',
    onSale: query.get(QUERY_KEYS.ON_SALE) === '1',
    sort: oneOf(query.get(QUERY_KEYS.SORT), SORT_IDS, SORT.RELEVANCE),
    page: clampInt(query.get(QUERY_KEYS.PAGE), 1, 9999, 1),
  };
}

/**
 * Serialise filters to a query object, dropping defaults so URLs stay clean.
 * @param {import('../services/catalog.js').CatalogFilters & { page: number }} f
 * @returns {Record<string, string|number|undefined>}
 */
function toQuery(f) {
  return {
    [QUERY_KEYS.SEARCH]: f.search || undefined,
    [QUERY_KEYS.CATEGORY]: f.category || undefined,
    [QUERY_KEYS.MIN_PRICE]: f.minPrice ?? undefined,
    [QUERY_KEYS.MAX_PRICE]: f.maxPrice ?? undefined,
    [QUERY_KEYS.MIN_RATING]: f.minRating > 0 ? f.minRating : undefined,
    [QUERY_KEYS.BRAND]: f.brand || undefined,
    [QUERY_KEYS.ON_SALE]: f.onSale ? '1' : undefined,
    [QUERY_KEYS.SORT]: f.sort !== SORT.RELEVANCE ? f.sort : undefined,
    [QUERY_KEYS.PAGE]: f.page > 1 ? f.page : undefined,
  };
}

/**
 * The dataset "source" key — determines when a re-fetch is needed.
 * @param {import('../services/catalog.js').CatalogFilters} f
 * @returns {string}
 */
function sourceKey(f) {
  if (f.search) return `search:${f.search}`;
  if (f.category) return `cat:${f.category}`;
  return 'all';
}

/**
 * @returns {import('../types.js').Page}
 */
export function createShopPage() {
  const disposer = new Disposer();
  /** @type {ReturnType<typeof createFilters>|null} */
  let filtersComp = null;

  /** @type {import('../services/catalog.js').CatalogFilters & { page: number }} */
  let filters;
  /** @type {import('../types.js').Product[]} */
  let dataset = [];
  let loadedKey = /** @type {string|null} */ (null);
  let facets = { brands: /** @type {string[]} */ ([]), priceMin: 0, priceMax: 0 };
  /** @type {AbortSignal} */
  let pageSignal;

  /** @type {HTMLElement} */
  let gridEl;
  /** @type {HTMLElement} */
  let countEl;
  /** @type {HTMLElement} */
  let pagerEl;

  /** Reflect current filters into the URL without triggering a navigation. */
  function syncUrl() {
    window.__vestraRouter?.replaceQuery(routeTo.shop(toQuery(filters)));
  }

  /**
   * Load the source dataset for the current filters (cached; skeleton shown).
   * @returns {Promise<boolean>} true on success.
   */
  async function ensureData() {
    const key = sourceKey(filters);
    if (key === loadedKey) return true;

    gridEl.replaceChildren(skeletonGrid(PAGINATION.PAGE_SIZE));
    try {
      /** @type {import('../types.js').Product[]} */
      let products;
      if (filters.search) products = await withMinDuration(searchProducts(filters.search, { signal: pageSignal }), TIMINGS.SKELETON_MIN_MS);
      else if (filters.category) products = await withMinDuration(getByCategory(filters.category, { signal: pageSignal }), TIMINGS.SKELETON_MIN_MS);
      else products = await withMinDuration(getAllFashion({ signal: pageSignal }), TIMINGS.SKELETON_MIN_MS);

      if (pageSignal.aborted) return false;
      dataset = products;
      loadedKey = key;
      facets = extractFacets(products);
      filtersComp?.update(filters, facets);
      return true;
    } catch (err) {
      if (pageSignal.aborted) return false;
      gridEl.replaceChildren(renderError(() => refresh({ refetch: true })));
      return false;
    }
  }

  /** Render the filtered/sorted/paginated grid + count + pager. */
  function renderResults() {
    const results = applyCatalog(dataset, filters);
    const totalPages = Math.max(1, Math.ceil(results.length / PAGINATION.PAGE_SIZE));
    if (filters.page > totalPages) filters.page = totalPages;
    const start = (filters.page - 1) * PAGINATION.PAGE_SIZE;
    const pageItems = results.slice(start, start + PAGINATION.PAGE_SIZE);

    countEl.textContent = results.length === 1 ? '1 piece' : `${results.length} pieces`;

    if (results.length === 0) {
      gridEl.replaceChildren(renderEmpty(() => clearAll()));
    } else {
      const grid = toElement(html`<div class="card-grid" data-reveal-group></div>`);
      pageItems.forEach((product, index) => grid.append(createProductCard(product, { index })));
      gridEl.replaceChildren(grid);
    }
    renderPager(totalPages);
  }

  /**
   * @param {number} totalPages
   */
  function renderPager(totalPages) {
    if (totalPages <= 1) {
      pagerEl.replaceChildren();
      return;
    }
    pagerEl.replaceChildren(
      toElement(html`
        <nav class="pager" aria-label="Pagination">
          <button class="btn btn--ghost" type="button" data-page="prev" ${filters.page <= 1 ? 'disabled' : ''}>Previous</button>
          <span class="pager__status">Page ${filters.page} of ${totalPages}</span>
          <button class="btn btn--ghost" type="button" data-page="next" ${filters.page >= totalPages ? 'disabled' : ''}>Next</button>
        </nav>
      `),
    );
  }

  /**
   * Apply a filter patch (from the panel/search/sort), reset to page 1, sync URL
   * and refresh. Re-fetches only when the data source changes.
   * @param {Partial<import('../services/catalog.js').CatalogFilters & {page:number}>} patch
   */
  function change(patch) {
    const prevKey = sourceKey(filters);
    filters = { ...filters, ...patch };
    if (patch.page === undefined) filters.page = 1; // any non-page change resets paging
    const refetch = sourceKey(filters) !== prevKey || loadedKey === null;
    syncUrl();
    refresh({ refetch });
  }

  /**
   * @param {{ refetch: boolean }} opts
   */
  async function refresh(opts) {
    if (opts.refetch) {
      const ok = await ensureData();
      if (!ok) return;
    }
    filtersComp?.update(filters, facets);
    renderResults();
  }

  function clearAll() {
    change({ search: '', category: '', minPrice: null, maxPrice: null, minRating: 0, brand: '', onSale: false, sort: SORT.RELEVANCE, page: 1 });
    const input = /** @type {HTMLInputElement} */ (document.querySelector('input[name="shop-search"]'));
    if (input) input.value = '';
  }

  return {
    async mount(root, ctx) {
      pageSignal = ctx.signal;
      filters = readFilters(ctx.query);

      const activeCategory = findCategory(filters.category);
      const heading = activeCategory ? activeCategory.label : filters.search ? `Results for “${filters.search}”` : 'The Vestra edit';

      root.append(
        toElement(html`
          <div class="shop">
            <header class="shop__header" data-reveal>
              <p class="eyebrow">Shop</p>
              <h1 class="shop__title" data-shop-title>${heading}</h1>
              <div class="shop__toolbar">
                <div class="shop__search">
                  <input type="search" name="shop-search" placeholder="Search dresses, shirts, sneakers…" value="${filters.search}" aria-label="Search products" />
                </div>
                <label class="shop__sort">
                  <span class="visually-hidden">Sort by</span>
                  <select name="sort">
                    ${SORT_OPTIONS.map((o) => html`<option value="${o.id}" ${o.id === filters.sort ? 'selected' : ''}>${o.label}</option>`)}
                  </select>
                </label>
              </div>
            </header>

            <div class="shop__layout">
              <div class="shop__aside" data-filters-slot></div>
              <div class="shop__results">
                <div class="shop__results-head">
                  <span class="shop__count" data-count aria-live="polite">Loading…</span>
                  <button class="shop__filters-toggle btn btn--ghost" type="button" data-toggle-filters aria-expanded="false">Filters</button>
                </div>
                <div class="shop__grid" data-grid></div>
                <div class="shop__pager" data-pager></div>
              </div>
            </div>
          </div>
        `),
      );

      gridEl = /** @type {HTMLElement} */ (root.querySelector('[data-grid]'));
      countEl = /** @type {HTMLElement} */ (root.querySelector('[data-count]'));
      pagerEl = /** @type {HTMLElement} */ (root.querySelector('[data-pager]'));

      // Filters panel
      filtersComp = createFilters({
        filters,
        facets,
        onChange: (patch) => change(patch),
        onClear: () => clearAll(),
      });
      const filtersSlot = root.querySelector('[data-filters-slot]');
      filtersSlot?.append(filtersComp.el);
      disposer.add(() => filtersComp?.destroy());

      // Search (debounced)
      const searchInput = /** @type {HTMLInputElement} */ (root.querySelector('input[name="shop-search"]'));
      const onSearch = debounce((value) => change({ search: sanitizeSearch(value) }), TIMINGS.SEARCH_DEBOUNCE_MS);
      disposer.listen(searchInput, 'input', () => onSearch(searchInput.value));
      disposer.add(() => onSearch.cancel());

      // Sort
      const sortSelect = /** @type {HTMLSelectElement} */ (root.querySelector('select[name="sort"]'));
      disposer.listen(sortSelect, 'change', () => change({ sort: oneOf(sortSelect.value, SORT_IDS, SORT.RELEVANCE) }));

      // Pager (delegated)
      disposer.add(
        delegate(root, 'click', '[data-page]', (_event, matched) => {
          const dir = matched.getAttribute('data-page');
          change({ page: dir === 'next' ? filters.page + 1 : Math.max(1, filters.page - 1) });
          root.querySelector('.shop__results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }),
      );

      // Mobile filters toggle
      const toggle = root.querySelector('[data-toggle-filters]');
      disposer.add(
        delegate(root, 'click', '[data-toggle-filters]', () => {
          const aside = root.querySelector('.shop__aside');
          const open = aside?.classList.toggle('is-open');
          toggle?.setAttribute('aria-expanded', String(!!open));
        }),
      );

      // Initial load
      await refresh({ refetch: true });
    },

    onQueryChange(ctx) {
      // External navigation changed the query (e.g. a nav category link).
      pageSignal = ctx.signal;
      filters = readFilters(ctx.query);
      const title = root_findTitle();
      const searchInput = /** @type {HTMLInputElement|null} */ (document.querySelector('input[name="shop-search"]'));
      if (searchInput) searchInput.value = filters.search;
      if (title) title.textContent = deriveHeading(filters);
      refresh({ refetch: true });
    },

    unmount() {
      disposer.dispose();
      filtersComp = null;
      dataset = [];
      loadedKey = null;
    },
  };
}

/** @returns {HTMLElement|null} */
function root_findTitle() {
  return document.querySelector('[data-shop-title]');
}

/**
 * @param {import('../services/catalog.js').CatalogFilters} filters
 * @returns {string}
 */
function deriveHeading(filters) {
  const cat = findCategory(filters.category);
  if (cat) return cat.label;
  if (filters.search) return `Results for “${filters.search}”`;
  return 'The Vestra edit';
}

/**
 * @param {() => void} onClear
 * @returns {HTMLElement}
 */
function renderEmpty(onClear) {
  const node = toElement(html`
    <div class="state-block" data-reveal>
      <h2 class="state-block__title">Nothing matches — yet.</h2>
      <p class="state-block__body">Try loosening a filter or clearing your search.</p>
      <button class="btn btn--primary" type="button" data-clear>Clear filters</button>
    </div>
  `);
  node.querySelector('[data-clear]')?.addEventListener('click', onClear, { once: true });
  return node;
}

/**
 * @param {() => void} onRetry
 * @returns {HTMLElement}
 */
function renderError(onRetry) {
  const node = toElement(html`
    <div class="state-block" role="alert" data-reveal>
      <h2 class="state-block__title">We couldn't load the catalog.</h2>
      <p class="state-block__body">Check your connection and try again.</p>
      <button class="btn btn--primary" type="button" data-retry>Retry</button>
    </div>
  `);
  node.querySelector('[data-retry]')?.addEventListener('click', onRetry, { once: true });
  return node;
}
